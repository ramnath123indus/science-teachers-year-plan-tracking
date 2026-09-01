import express from 'express';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import MasterYearPlan from '../models/MasterYearPlan.js';

const router = express.Router();

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

    const fileBlockKey = cleanBlock.includes('kailash') ? 'kailash' : 'central';

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

    console.log(`✅ Successfully matched file: ${targetFile}`);

    const workbook = xlsx.readFile(path.join(targetDir, targetFile));
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const yearPlan = sheetData.map(row => ({
      month: String(row['MONTH'] || row['Month'] || '').trim().toUpperCase(),
      ncertSyllabus: String(row['NCERT SYLLABUS'] || row['Ncert Syllabus'] || '').trim() || 'Not Assigned',
      sec1: String(row['NCERT_SEC-1'] || row['SEC-1'] || '').trim() || 'Not Assigned',
      sec2: String(row['NCERT_SEC-2'] || row['SEC-2'] || '').trim() || 'Not Assigned',
      sec3: String(row['NCERT_SEC-3'] || row['SEC-3'] || '').trim() || 'Not Assigned',
      sec4: String(row['NCERT_SEC-4'] || row['SEC-4'] || '').trim() || 'Not Assigned',
      sec5: String(row['NCERT_SEC-5'] || row['SEC-5'] || '').trim() || 'Not Assigned',
      sec6: String(row['NCERT_SEC-6'] || row['SEC-6'] || '').trim() || 'Not Assigned',
      ncertStatus: String(row['NCERT_STATUS'] || row['NCERT STATUS'] || row['Ncert Status'] || '').trim() || 'Not Assigned',
      iitSyllabus: String(row['IIT SYLLABUS'] || row['Iit Syllabus'] || '').trim() || 'Not Assigned',
      iitSec1: String(row['IIT_SEC-1'] || row['IIT SEC-1'] || row['IIT-SEC1'] || '').trim() || 'Not Assigned',
      iitSec2: String(row['IIT_SEC-2'] || row['IIT SEC-2'] || row['IIT-SEC2'] || '').trim() || 'Not Assigned',
      iitSec3: String(row['IIT_SEC-3'] || row['IIT SEC-3'] || row['IIT-SEC3'] || '').trim() || 'Not Assigned',
      iitSec4: String(row['IIT_SEC-4'] || row['IIT SEC-4'] || row['IIT-SEC4'] || '').trim() || 'Not Assigned',
      iitStatus: String(row['IIT STATUS'] || row['IIT_STATUS'] || row['Iit Status'] || '').trim() || 'Not Assigned'
    })).filter(r => r.month && r.month !== 'UNDEFINED');

    return yearPlan.length > 0 ? yearPlan : null;
  } catch (err) {
    console.error('Error reading master Excel file:', err);
    return null;
  }
};

router.get('/submit', async (req, res) => {
  try {
    const blockName = req.query.blockName ? req.query.blockName.trim() : '';
    const subject = req.query.subject ? req.query.subject.trim() : '';
    const grade = req.query.grade ? String(req.query.grade).trim() : '';
    const teacherName = req.query.teacherName ? req.query.teacherName.trim() : '';

    console.log('📥 GET /api/master-plans/submit query received:', { blockName, subject, grade, teacherName });

    if (!blockName || !subject || !grade) {
      return res.status(400).json({ error: 'Please provide blockName, subject, and grade.' });
    }

    const query = { blockName, subject, grade };
    if (teacherName) {
      query.teacherName = teacherName;
    }

    let plan = await MasterYearPlan.findOne(query);

    if (!plan || !plan.yearPlan || plan.yearPlan.length === 0) {
      const excelYearPlan = getPlanFromExcel(blockName, subject, grade);
      if (excelYearPlan) {
        plan = {
          blockName,
          subject,
          grade,
          teacherName: teacherName || 'Unassigned',
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

    const updatedPlan = await MasterYearPlan.findOneAndUpdate(
      query,
      { blockName, subject, grade, teacherName, yearPlan },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ message: '✅ Teacher year plan saved successfully!', updatedPlan });
  } catch (err) {
    console.error('Error saving master plan:', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/update', handleSaveOrUpdate);
router.post('/submit', handleSaveOrUpdate);

export default router;