import express from 'express';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import MasterYearPlan from '../models/MasterYearPlan.js';

const router = express.Router();

const cleanField = (val) => {
  if (val === undefined || val === null) return 'Not Assigned';
  const str = String(val).trim();
  return (str === '' || str.toLowerCase() === 'nan') ? 'Not Assigned' : str;
};

const getPlanFromExcel = (blockName, subject, grade) => {
  try {
    const folderPath = path.join(process.cwd(), 'server', 'master-excel-files');
    const fallbackPath = path.join(process.cwd(), 'master-excel-files');
    
    const targetDir = fs.existsSync(folderPath) ? folderPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);
    if (!targetDir) {
      console.log('⚠️ Master excel files directory not found!');
      return null;
    }

    const files = fs.readdirSync(targetDir);
    
    const cleanBlock = blockName.trim().toLowerCase();
    const cleanSubject = subject.trim().toLowerCase();
    const cleanGrade = String(grade).replace(/\D/g, '').trim();

    // Map Himadri(i) to use Kailash excel files
    const fileBlockKey = (cleanBlock.includes('kailash') || cleanBlock.includes('himadri(i)')) ? 'kailash' : 'central';

    const targetFile = files.find(file => {
      const f = file.trim().toLowerCase();
      const matchesBlock = f.includes(fileBlockKey);
      const matchesSubject = f.includes(cleanSubject);
      const matchesGrade = f.includes(cleanGrade);
      return matchesBlock && matchesSubject && matchesGrade;
    });

    if (!targetFile) {
      console.log(`⚠️ No file match found for -> Block: "${blockName}" (Key: "${fileBlockKey}"), Subject: "${subject}", Grade: "${grade}"`);
      return null;
    }

    const workbook = xlsx.readFile(path.join(targetDir, targetFile));
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const yearPlan = sheetData.map(row => {
      const monthVal = String(row['MONTH'] || row['Month'] || '').trim().toUpperCase();
      if (!monthVal || monthVal === 'UNDEFINED' || monthVal === 'NAN') return null;

      return {
        month: monthVal,
        ncertSyllabus: cleanField(row['NCERT SYLLABUS'] || row['Ncert Syllabus']),
        sec1: cleanField(row['NCERT_SEC-1'] || row['SEC-1']),
        sec2: cleanField(row['NCERT_SEC-2'] || row['SEC-2']),
        sec3: cleanField(row['NCERT_SEC-3'] || row['SEC-3']),
        sec4: cleanField(row['NCERT_SEC-4'] || row['SEC-4']),
        sec5: cleanField(row['NCERT_SEC-5'] || row['SEC-5']),
        sec6: cleanField(row['NCERT_SEC-6'] || row['SEC-6']),
        ncertStatus: cleanField(row['NCERT_STATUS'] || row['NCERT STATUS'] || row['Ncert Status']),
        iitSyllabus: cleanField(row['IIT SYLLABUS'] || row['Iit Syllabus']),
        iitSec1: cleanField(row['IIT_SEC-1'] || row['IIT SEC-1'] || row['IIT-SEC1']),
        iitSec2: cleanField(row['IIT_SEC-2'] || row['IIT SEC-2'] || row['IIT-SEC2']),
        iitSec3: cleanField(row['IIT_SEC-3'] || row['IIT SEC-3'] || row['IIT-SEC3']),
        iitSec4: cleanField(row['IIT_SEC-4'] || row['IIT SEC-4'] || row['IIT-SEC4']),
        iitStatus: cleanField(row['IIT STATUS'] || row['IIT_STATUS'] || row['Iit Status'])
      };
    }).filter(r => r !== null);

    return yearPlan.length > 0 ? yearPlan : null;
  } catch (err) {
    console.error('Error reading master Excel file:', err);
    return null;
  }
};

router.get('/submit', async (req, res) => {
  try {
    const rawBlockName = req.query.blockName ? req.query.blockName.trim() : '';
    const subject = req.query.subject ? req.query.subject.trim() : '';
    const grade = req.query.grade ? String(req.query.grade).trim() : '';
    const teacherName = req.query.teacherName ? req.query.teacherName.trim() : '';

    if (!rawBlockName || !subject || !grade || !teacherName) {
      return res.status(400).json({ error: 'Please provide blockName, subject, grade, and teacherName.' });
    }

    // 1. First, check if a dedicated plan exists for the exact requested block and teacher
    let query = { blockName: rawBlockName, subject, grade, teacherName };
    let plan = await MasterYearPlan.findOne(query);

    // 2. If Himadri(i) has no plan yet for this specific teacher, check if Kailash has a saved plan for THIS SAME teacher
    if ((!plan || !plan.yearPlan || plan.yearPlan.length === 0) && rawBlockName.toLowerCase() === 'himadri(i)') {
      const kailashPlan = await MasterYearPlan.findOne({ blockName: 'Kailash', subject, grade, teacherName });
      if (kailashPlan && kailashPlan.yearPlan && kailashPlan.yearPlan.length > 0) {
        plan = { ...kailashPlan.toObject(), blockName: 'Himadri(i)' };
      }
    }

    // 3. If still nothing found in DB, pull from Excel matching
    if (!plan || !plan.yearPlan || plan.yearPlan.length === 0) {
      const targetExcelBlock = rawBlockName.toLowerCase() === 'himadri(i)' ? 'Kailash' : rawBlockName;
      const excelYearPlan = getPlanFromExcel(targetExcelBlock, subject, grade);
      if (excelYearPlan) {
        plan = {
          blockName: rawBlockName,
          subject,
          grade,
          teacherName,
          yearPlan: excelYearPlan
        };
      }
    }

    res.json(plan || { yearPlan: [] });
  } catch (err) {
    console.error('Error fetching master plan:', err);
    res.status(500).json({ error: err.message });
  }
});

const handleSaveOrUpdate = async (req, res) => {
  try {
    const { blockName, subject, grade, teacherName, yearPlan } = req.body;

    if (!blockName || !subject || !grade || !yearPlan || !teacherName) {
      return res.status(400).json({ error: 'Missing required fields including teacherName.' });
    }

    const query = { blockName, subject, grade, teacherName };

    // Update or insert the primary block plan for this specific teacher without duplication
    const updatedPlan = await MasterYearPlan.findOneAndUpdate(
      query,
      { blockName, subject, grade, teacherName, yearPlan },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Synchronize between Kailash and Himadri(i) ONLY for this specific teacher
    if (blockName.toLowerCase() === 'kailash') {
      await MasterYearPlan.findOneAndUpdate(
        { blockName: 'Himadri(i)', subject, grade, teacherName },
        { blockName: 'Himadri(i)', subject, grade, teacherName, yearPlan },
        { upsert: true }
      );
    } else if (blockName.toLowerCase() === 'himadri(i)') {
      await MasterYearPlan.findOneAndUpdate(
        { blockName: 'Kailash', subject, grade, teacherName },
        { blockName: 'Kailash', subject, grade, teacherName, yearPlan },
        { upsert: true }
      );
    }

    res.json({ message: '✅ Teacher year plan saved and synchronized cleanly!', updatedPlan });
  } catch (err) {
    console.error('Error saving master plan:', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/update', handleSaveOrUpdate);
router.post('/submit', handleSaveOrUpdate);

export default router;