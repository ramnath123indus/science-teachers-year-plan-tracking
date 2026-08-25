import express from 'express';
import MasterYearPlan from '../models/MasterYearPlan.js'; // ✅ new correct import
const router = express.Router();

// @route   GET /api/master-plans/submit
// @desc    Get year plan entries for specific block, subject, grade, and optional teacher name
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

    const plan = await MasterPlan.findOne(query);

    if (!plan) {
      return res.status(404).json({ error: 'No master plan found for the specified criteria.' });
    }

    res.json(plan);
  } catch (err) {
    console.error('Error fetching master plan:', err);
    res.status(500).json({ error: 'Server error while fetching master plan.' });
  }
});

// @route   POST /api/master-plans/submit
// @desc    Create or update year plan entries including NCERT and IIT tracking fields
router.post('/submit', async (req, res) => {
  try {
    const { blockName, subject, grade, teacherName, yearPlan } = req.body;

    if (!blockName || !subject || !grade || !yearPlan) {
      return res.status(400).json({ error: 'Missing required fields (blockName, subject, grade, or yearPlan).' });
    }

    const query = { blockName, subject, grade };
    if (teacherName) {
      query.teacherName = teacherName;
    }

    // Ensure status fields are properly normalized
    const processedYearPlan = yearPlan.map(row => ({
      ...row,
      ncertStatus: row.ncertStatus || 'Not Started',
      iitStatus: row.iitStatus || 'Not Started',
      sec1: row.sec1 || 'Not Started',
      sec2: row.sec2 || 'Not Started',
      sec3: row.sec3 || 'Not Started',
      sec4: row.sec4 || 'Not Started',
      sec5: row.sec5 || 'Not Started',
      sec6: row.sec6 || 'Not Started',
      iit_sec1: row.iit_sec1 || 'Not Started',
      iit_sec2: row.iit_sec2 || 'Not Started',
      iit_sec3: row.iit_sec3 || 'Not Started',
      iit_sec4: row.iit_sec4 || 'Not Started'
    }));

    let masterPlan = await MasterPlan.findOne(query);

    if (masterPlan) {
      // Update existing record
      masterPlan.yearPlan = processedYearPlan;
      if (teacherName) masterPlan.teacherName = teacherName;
      await masterPlan.save();
    } else {
      // Create new record
      masterPlan = new MasterPlan({
        blockName,
        subject,
        grade,
        teacherName: teacherName || 'Unassigned',
        yearPlan: processedYearPlan
      });
      await masterPlan.save();
    }

    res.json({ message: '✅ Year plan and tracking status updated successfully!', masterPlan });
  } catch (err) {
    console.error('Error saving master plan:', err);
    res.status(500).json({ error: 'Server error while saving master plan.' });
  }
});

export default router;