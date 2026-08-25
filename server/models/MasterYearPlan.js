import mongoose from 'mongoose';

const PlanItemSchema = new mongoose.Schema({
  month: { type: String, default: '' },
  ncertSyllabus: { type: String, default: '' },
  sec1: { type: String, default: 'Not Started' },
  sec2: { type: String, default: 'Not Started' },
  sec3: { type: String, default: 'Not Started' },
  sec4: { type: String, default: 'Not Started' },
  sec5: { type: String, default: 'Not Started' },
  sec6: { type: String, default: 'Not Started' },
  ncertStatus: { type: String, default: 'Not Started' },
  iitSyllabus: { type: String, default: '' },
  iitSec1: { type: String, default: 'Not Started' },
  iitSec2: { type: String, default: 'Not Started' },
  iitSec3: { type: String, default: 'Not Started' },
  iitSec4: { type: String, default: 'Not Started' },
  iitStatus: { type: String, default: 'Not Started' }
}, { _id: false });

const MasterYearPlanSchema = new mongoose.Schema({
  blockName: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  teacherName: { type: String, default: 'Unassigned' },
  yearPlan: [PlanItemSchema]
}, { timestamps: true });

// Ensures a unique combination of blockName, subject, and grade
MasterYearPlanSchema.index({ blockName: 1, subject: 1, grade: 1 }, { unique: true });

export default mongoose.model('MasterYearPlan', MasterYearPlanSchema);