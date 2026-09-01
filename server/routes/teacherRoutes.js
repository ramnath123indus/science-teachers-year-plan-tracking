import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import Teacher from '../models/Teacher.js';

const router = express.Router();
const EXCEL_DIR = path.join(process.cwd(), 'server', 'master-excel-files');

// Configure multer for memory storage (for Excel uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to resolve physical file path safely
function getPhysicalExcelFilePath(blockName, subject, grade) {
  const gradeStr = grade.toString().replace('Grade ', '').trim();
  let fileName = '';

  if (blockName && blockName.toUpperCase() === 'KAILASH') {
    fileName = `KAILASH_${subject}_Grade ${gradeStr}.xlsx.xlsx`;
  } else {
    fileName = `General_${subject}_Grade ${gradeStr}.xlsx.xlsx`;
  }

  let filePath = path.join(EXCEL_DIR, fileName);

  // Fallback check if specific file doesn't exist
  if (!fs.existsSync(filePath)) {
    const fallbackName = `${blockName}_${subject}_Grade ${gradeStr}.xlsx.xlsx`;
    const fallbackPath = path.join(EXCEL_DIR, fallbackName);
    if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    }
  }

  return filePath;
}

// 1. Get all teachers (for dropdown select menu)
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find({});
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Register a new teacher & automatically attach physical Excel Master Year Plans
router.post('/', async (req, res) => {
  try {
    const { teacherName, assignments } = req.body;

    if (!teacherName) {
      return res.status(400).json({ error: 'Teacher name is required.' });
    }

    // 🛑 DUPLICATE CHECK: Prevent registering the same teacher name twice
    const existingTeacher = await Teacher.findOne({ 
      teacherName: { $regex: new RegExp(`^${teacherName.trim()}$`, 'i') } 
    });

    if (existingTeacher) {
      return res.status(400).json({ 
        error: `Teacher "${teacherName}" is already registered. Duplicate registrations are not allowed.` 
      });
    }

    const updatedAssignments = await Promise.all(
      (assignments || []).map(async (assignment) => {
        let compiledPlan = [];
        const blockName = assignment.blockName;
        const subject = assignment.subject;

        if (assignment.grades && assignment.grades.length > 0) {
          for (const grade of assignment.grades) {
            // Get physical file path safely based on Kailash vs General rule
            const filePath = getPhysicalExcelFilePath(blockName, subject, grade);

            if (fs.existsSync(filePath)) {
              try {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                // Map excel columns to schema format
                const sheetPlan = rawData.map((row) => ({
                  month: row['MONTH'] || row['Month'] || row['month'] || '',
                  ncertSyllabus: row['NCERT SYLLABUS'] || row['ncertSyllabus'] || '',
                  assessments: row['ASSESSMENTS'] || row['assessments'] || '',
                  iitSyllabus: row['IIT SYLLABUS'] || row['iitSyllabus'] || '',
                  section1: row['SECTION-1'] || row['section1'] || '',
                  section2: row['SECTION-2'] || row['section2'] || '',
                  section3: row['SECTION-3'] || row['section3'] || '',
                  section4: row['SECTION-4'] || row['section4'] || '',
                  section5: row['SECTION-5'] || row['section5'] || '',
                  section6: row['SECTION-6'] || row['section6'] || '',
                  status: row['STATUS'] || row['status'] || ''
                }));

                compiledPlan.push(...sheetPlan);
              } catch (readErr) {
                console.error(`Error reading file ${filePath}:`, readErr);
              }
            } else {
              console.warn(`Master Excel file not found on disk: ${filePath}. Skipping auto-population for this grade.`);
            }
          }
        }

        return {
          ...assignment,
          yearPlan: compiledPlan
        };
      })
    );

    const newTeacher = new Teacher({
      teacherName: teacherName.trim(),
      assignments: updatedAssignments
    });

    const savedTeacher = await newTeacher.save();
    res.status(201).json(savedTeacher);
  } catch (err) {
    console.error('Teacher Registration Error:', err);
    res.status(400).json({ error: err.message });
  }
});

// 3. Get specific teacher details by ID
router.get('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update teacher year plan and details by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(updatedTeacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Delete teacher by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTeacher = await Teacher.findByIdAndDelete(id);
    
    if (!deletedTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json({ message: '✅ Teacher deleted successfully' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.status(500).json({ error: 'Server error while deleting teacher' });
  }
});

// 6. Upload Excel Year Plan directly to a specific Teacher's assignment by ID
router.put('/:id/upload-plan', upload.single('file'), async (req, res) => {
  try {
    const { assignIdx } = req.body;
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel file.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const newYearPlan = rawData.map((row) => ({
      month: row['MONTH'] || row['Month'] || row['month'] || '',
      ncertSyllabus: row['NCERT SYLLABUS'] || row['ncertSyllabus'] || '',
      assessments: row['ASSESSMENTS'] || row['assessments'] || '',
      iitSyllabus: row['IIT SYLLABUS'] || row['iitSyllabus'] || '',
      section1: row['SECTION-1'] || row['section1'] || '',
      section2: row['SECTION-2'] || row['section2'] || '',
      section3: row['SECTION-3'] || row['section3'] || '',
      section4: row['SECTION-4'] || row['section4'] || '',
      section5: row['SECTION-5'] || row['section5'] || '',
      section6: row['SECTION-6'] || row['section6'] || '',
      status: row['STATUS'] || row['status'] || ''
    }));

    const targetIndex = parseInt(assignIdx, 10) || 0;

    if (teacher.assignments && teacher.assignments[targetIndex]) {
      teacher.assignments[targetIndex].yearPlan = newYearPlan;
      await teacher.save();
      res.json({ message: '✅ Teacher Year Plan updated successfully from Excel!', teacher });
    } else {
      res.status(400).json({ error: 'Invalid assignment index provided.' });
    }
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Failed to process teacher Excel file.' });
  }
});

export default router;