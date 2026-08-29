import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import teacherRoutes from './routes/teacherRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import Teacher from './models/Teacher.js';
import authRoutes from './routes/authRoutes.js';
import masterPlanRoutes from './routes/masterPlanRoutes.js';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Configuration setup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Security check for DB Connection String
if (!MONGO_URI) {
  console.warn('⚠️ MONGO_URI is not defined in environment variables! Falling back to local default.');
}

const dbConnectionUri = MONGO_URI || 'mongodb://localhost:27017/school-planner';

// Middleware
app.use(cors());
app.use(express.json());

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  // 1. Check for Admin credentials
  if (username === 'admin' && password === 'admin123') {
    return res.json({
      role: 'admin',
      username: 'admin',
      message: 'Admin login successful'
    });
  }

  // 2. Check for Default Teacher credentials
  if (username === 'teacher' && password === 'teacher123') {
    return res.json({
      role: 'teacher',
      username: 'teacher',
      message: 'Teacher login successful'
    });
  }

  // 3. Check against teachers registered in your database (Manage Teachers)
  try {
    const teacherDoc = await Teacher.findOne({ teacherName: username });
    
    if (teacherDoc && password === 'teacher123') {
      return res.json({
        role: 'teacher',
        username: teacherDoc.teacherName,
        teacherId: teacherDoc._id,
        assignments: teacherDoc.assignments,
        message: 'Teacher login successful'
      });
    }
  } catch (err) {
    console.error('Database login error:', err);
  }

  // If credentials don't match anything
  return res.status(401).json({ error: 'Invalid username or password.' });
});

// Routes
app.use('/api/master-plans', masterPlanRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api', authRoutes);

// Root health-check route
app.get('/', (req, res) => {
  res.send('School Planner Backend is running successfully!');
});

// Database Connection & Server Startup Sequence
mongoose
  .connect(dbConnectionUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully');

    // 🔴 FORCE DROP OLD UNWANTED INDEXES
    try {
      await mongoose.connection.collection('teachers').dropIndex('name_1');
      console.log('🧹 Successfully dropped stale name_1 index!');
    } catch (err) {
      console.log('ℹ️ Index name_1 already dropped or does not exist.');
    }

    try {
      await mongoose.connection.collection('masteryearplans').dropIndex('blockName_1_subject_1_grade_1');
      console.log('🧹 Successfully dropped stale blockName_1_subject_1_grade_1 index!');
    } catch (err) {
      console.log('ℹ️ Index blockName_1_subject_1_grade_1 already dropped or does not exist.');
    }
    
    // Start listening only after DB connection & index cleanup succeed
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1); // Stop server process on critical DB failure
  });