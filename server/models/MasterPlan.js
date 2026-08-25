import mongoose from 'mongoose';

const MasterPlanSchema = new mongoose.Schema({
  blockName: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  teacherName: { type: String, default: 'Unassigned' },
  yearPlan: { type: Array, default: [] }
}, { timestamps: true });

const MasterPlan = mongoose.model('MasterPlan', MasterPlanSchema);

export default MasterPlan;