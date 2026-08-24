import express from 'express';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const router = express.Router();

let EXCEL_DIR = path.join(process.cwd(), 'server', 'master-excel-files');
if (!fs.existsSync(EXCEL_DIR)) {
  EXCEL_DIR = path.join(process.cwd(), 'master-excel-files');
}

function getExistingExcelFilePath(blockName, subject, grade) {
  // Clean and format inputs safely
  const safeBlock = (blockName || 'General').toString().trim();
  const safeSubject = (subject || 'PHYSICS').toString().trim().toUpperCase();
  const safeGrade = (grade || '10').toString().replace(/^Grade\s*/i, '').trim();
  
  if (!fs.existsSync(EXCEL_DIR)) {
    fs.mkdirSync(EXCEL_DIR, { recursive: true });
  }

  // Create a unique filename for EVERY block
  const blockPrefix = safeBlock.toUpperCase() === 'GENERAL' || !safeBlock ? 'General' : safeBlock;
  const fileName = `${blockPrefix}_${safeSubject}_Grade ${safeGrade}.xlsx`;

  const filePath = path.join(EXCEL_DIR, fileName);

  // If the specific block file doesn't exist yet, copy the General template as a starting point
  if (!fs.existsSync(filePath) && blockPrefix !== 'General') {
    const generalPath = path.join(EXCEL_DIR, `General_${safeSubject}_Grade ${safeGrade}.xlsx`);
    if (fs.existsSync(generalPath)) {
      fs.copyFileSync(generalPath, filePath);
    }
  }

  return filePath;
}

// Helper to determine the correct 4th column header per subject
function getFourthColumnHeader(subject) {
  const upper = (subject || '').toUpperCase();
  if (upper === 'BIOLOGY') return 'NEET SYLLABUS';
  return 'IIT SYLLABUS'; 
}

router.get('/submit', (req, res) => {
  try {
    let { blockName, subject, grade } = req.query;

    blockName = blockName || 'General';
    subject = subject || 'PHYSICS';
    grade = grade || '10';

    const filePath = getExistingExcelFilePath(blockName, subject, grade);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Excel file not found on server.` });
    }

    const workbook = XLSX.readFile(filePath);
    const targetSheetName = workbook.SheetNames.includes('Year Plan') ? 'Year Plan' : workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName], { defval: '' });

    const fourthColHeader = getFourthColumnHeader(subject);

    const yearPlan = rawData.map((row, index) => ({
      id: index,
      month: row['MONTH'] || row['Month'] || '',
      
      ncertSyllabus: row['NCERT SYLLABUS'] || row['NCERT Syllabus'] || '',
      ncertStatus: row['NCERT STATUS'] || 'Not Started',
      
      // NCERT Block Section mappings (e.g. NCERT_K1, NCERT_K2, NCERT_K3)
      section1: row['NCERT_K1'] || row['SECTION-1'] || row['Section-1'] || 'Not Assigned',
      section2: row['NCERT_K2'] || row['SECTION-2'] || row['Section-2'] || 'Not Assigned',
      section3: row['NCERT_K3'] || row['SECTION-3'] || row['Section-3'] || 'Not Assigned',
      section4: row['NCERT_K4'] || row['SECTION-4'] || 'Not Assigned',
      section5: row['NCERT_K5'] || row['SECTION-5'] || 'Not Assigned',
      section6: row['NCERT_K6'] || row['SECTION-6'] || 'Not Assigned',

      iitSyllabus: row[fourthColHeader] || row['IIT SYLLABUS'] || row['NEET SYLLABUS'] || row['JEE SYLLABUS'] || '',
      iitStatus: row['IIT STATUS'] || 'Not Started',
      
      // IIT Block Section mappings (e.g. IIT_K1, IIT_K2, IIT_K3)
      iitSection1: row['IIT_K1'] || row['SEC-1'] || 'Not Assigned',
      iitSection2: row['IIT_K2'] || row['SEC-2'] || 'Not Assigned',
      iitSection3: row['IIT_K3'] || row['SEC-3'] || 'Not Assigned',
      iitSection4: row['IIT_K4'] || 'Not Assigned',
      iitSection5: row['IIT_K5'] || 'Not Assigned',
      iitSection6: row['IIT_K6'] || 'Not Assigned',

      status: row['NCERT STATUS'] || row['Status'] || 'Not Assigned'
    })).filter(row => row.month.toString().trim() !== '');

    res.json({ yearPlan });
  } catch (err) {
    console.error('Error reading excel file:', err);
    res.status(500).json({ error: 'Failed to read excel file from server' });
  }
});

router.post('/update', (req, res) => {
  const { blockName, subject, grade, yearPlan } = req.body;
  const filePath = getExistingExcelFilePath(blockName, subject, grade);

  try {
    const fourthColumnHeader = getFourthColumnHeader(subject);

    const sheetData = yearPlan.map(row => {
      const obj = {
        'MONTH': row.month || '',
        'NCERT SYLLABUS': row.ncertSyllabus || '',
        'NCERT_K1': row.section1 || 'Not Assigned',
        'NCERT_K2': row.section2 || 'Not Assigned',
        'NCERT_K3': row.section3 || 'Not Assigned',
        'NCERT STATUS': row.ncertStatus || 'Not Assigned'
      };
      
      obj[fourthColumnHeader] = row.iitSyllabus || '';

      obj['IIT_K1'] = row.iitSection1 || 'Not Assigned';
      obj['IIT_K2'] = row.iitSection2 || 'Not Assigned';
      obj['IIT_K3'] = row.iitSection3 || 'Not Assigned';
      obj['IIT STATUS'] = row.iitStatus || 'Not Assigned';

      return obj;
    });

    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.json_to_sheet(sheetData);

    const colWidths = [];
    const range = XLSX.utils.decode_range(newSheet['!ref']);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!newSheet[cellAddress]) continue;

        const cellVal = newSheet[cellAddress].v ? newSheet[cellAddress].v.toString() : '';
        const len = cellVal.length;
        if (!colWidths[C] || len > colWidths[C]) {
          colWidths[C] = len;
        }
      }
    }

    newSheet['!cols'] = colWidths.map(w => ({ wch: Math.max((w || 10) + 5, 22) }));

    XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Year Plan');
    
    XLSX.writeFile(newWorkbook, filePath);
    res.status(200).json({ success: true, message: 'Excel file updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;