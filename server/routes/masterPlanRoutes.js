import express from 'express';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import MasterYearPlan from '../models/MasterYearPlan.js';

const router = express.Router();

// Helper function to read from Excel files in server/master-excel-files folder
const getPlanFromExcel = (blockName, subject, grade) => {
  try {
    const folderPath = path.join(process.cwd(), 'server', 'master-excel-files');
    const fallbackPath = path.join(process.cwd(), 'master-excel-files');
    
    const targetDir = fs.existsSync(folderPath) ? folderPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);
    if (!targetDir) return null;

    const files = fs.readdirSync(targetDir);
    
    // Clean and normalize query inputs
    const cleanBlock = blockName.trim().toLowerCase();
    const cleanSubject = subject.trim().toLowerCase();
    const cleanGrade = String(grade).toLowerCase().replace('grade', '').trim();

    // Find file matching Block + Subject + Grade (e.g. General_BIOLOGY_Grade 8.xlsx or Kailash_PHYSICS_Grade 8.xlsx)
    const targetFile = files.find(file => {
      const f = file.toLowerCase();
      return f.includes(cleanBlock) && f.includes(cleanSubject) && f.includes(cleanGrade);
    });

    if (!targetFile) return null;

    const workbook = xlsx.readFile(path.join(targetDir, targetFile));
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Map Excel rows to your yearPlan schema structure with exact column header matches
    const yearPlan = sheetData.map(row => ({
      month: String(row['MONTH'] || row['Month'] || '').trim().toUpperCase(),
      ncertSyllabus: String(row['NCERT SYLLABUS'] || row['Ncert Syllabus'] || ''),
      sec1: String(row['NCERT_SEC-1'] || row['SEC-1'] || 'Not Started'),
      sec2: String(row['NCERT_SEC-2'] || row['SEC-2'] || 'Not Started'),
      sec3: String(row['NCERT_SEC-3'] || row['SEC-3'] || 'Not Started'),
      sec4: String(row['NCERT_SEC-4'] || row['SEC-4'] || 'Not Started'),
      sec5: String(row['NCERT_SEC-5'] || row['SEC-5'] || 'Not Started'),
      sec6: String(row['NCERT_SEC-6'] || row['SEC-6'] || 'Not Started'),
      ncertStatus: String(row['NCERT_STATUS'] || row['NCERT STATUS'] || 'Not Started'),
      iitSyllabus: String(row['IIT SYLLABUS'] || row['Iit Syllabus'] || ''),
      iitSec1: String(row['IIT_SEC-1'] || 'Not Started'),
      iitSec2: String(row['IIT_SEC-2'] || 'Not Started'),
      iitSec3: String(row['IIT_SEC-3'] || 'Not Started'),
      iitSec4: String(row['IIT_SEC-4'] || 'Not Started'),
      iitStatus: String(row['IIT STATUS'] || 'Not Started')
    })).filter(r => r.month && r.month !== 'UNDEFINED');

    return yearPlan.length > 0 ? yearPlan : null;
  } catch (err) {
    console.error('Error reading master Excel file:', err);
    return null;
  }
};

// @route   GET /api/master-plans/submit
// @desc    Get year plan entries for specific block, subject, grade, and teacher name
router.get('/submit', async (req, res) => {
  try {
    const { blockName, subject, grade, teacherName } = req.query;

    if (!blockName || !subject || !grade) {
      return res.status(400).json({ error: 'Please provide blockName, subject, and grade.' });
    }

    const query = { blockName, subject, grade };
    if (teacherName) {
      query.teacherName = teacherName;
    }

    // 1. Check MongoDB for this specific teacher + criteria
    let plan = await MasterYearPlan.findOne(query);

    // 2. If not found in DB, check master Excel files folder as a fallback
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

// @route   POST /api/master-plans/update & /submit
// @desc    Create or update teacher-specific year plan entries
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