import React, { useState } from 'react';
import axios from 'axios';

const BLOCKS_LIST = ['General', 'Kailash', 'Nilgiri', 'Aravalli', 'Sumeru', 'Vindhya', 'Himadri(i)', 'Himadri(L)', 'Sahyadri', 'Purvanchal'];
const SUBJECTS_LIST = ['TELUGU', 'ENGLISH', 'MATHS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'SOCIAL', 'COMPUTER'];
const GRADES_LIST = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

const INITIAL_ASSIGNMENT = { blockName: 'General', subject: 'PHYSICS', grades: [] };

function TeacherRegistration() {
  const [teacherName, setTeacherName] = useState('');
  const [assignments, setAssignments] = useState([INITIAL_ASSIGNMENT]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Styles
  const pageWrapperStyle = { minHeight: '100vh', background: '#f4f6f9', padding: '2.5rem 1rem', fontFamily: 'Segoe UI, sans-serif' };
  const containerStyle = { maxWidth: '800px', margin: '0 auto', padding: '2.5rem', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderTop: '6px solid #6c5ce7' };
  const fieldGroupStyle = { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.4rem' };
  const labelStyle = { color: '#2d3436', fontWeight: '700', fontSize: '0.95rem', borderLeft: '3px solid #00b894', paddingLeft: '8px' };
  const inputStyle = { padding: '0.75rem', borderRadius: '8px', border: '2px solid #dfe6e9', fontSize: '1rem', background: '#fff', outline: 'none' };
  const submitBtnStyle = { background: '#6c5ce7', color: '#fff', border: 'none', padding: '0.9rem', borderRadius: '8px', fontSize: '1.05rem', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '1.5rem', opacity: loading ? 0.7 : 1 };
  const successStyle = { background: '#55efc4', color: '#00b894', padding: '1rem', borderRadius: '8px', marginBottom: '1.2rem', fontWeight: '600' };

  // Handlers
  const handleAddAssignment = () => {
    setAssignments(prev => [...prev, { blockName: BLOCKS_LIST[0], subject: SUBJECTS_LIST[0], grades: [] }]);
  };

  const handleRemoveAssignment = (index) => {
    if (assignments.length === 1) {
      alert('You must have at least one block assignment.');
      return;
    }
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, field, value) => {
    setAssignments(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleGradeToggle = (index, grade) => {
    setAssignments(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const grades = item.grades.includes(grade)
          ? item.grades.filter(g => g !== grade)
          : [...item.grades, grade];
        return { ...item, grades };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!teacherName.trim()) {
      alert('Please enter the teacher name.');
      return;
    }

    // Validation: Require grades for every section
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].grades.length === 0) {
        alert(`Please select at least one grade for assignment row #${i + 1}`);
        return;
      }
    }

    // Validation: Check for identical Block + Subject pairs
    const pairs = assignments.map(a => `${a.blockName}-${a.subject}`);
    const hasDuplicates = new Set(pairs).size !== pairs.length;
    if (hasDuplicates) {
      alert('Duplicate block and subject combinations found. Please merge or adjust them.');
      return;
    }

    setLoading(true);
    try {
      // ✅ Dynamic environment resolution (Vercel vs Localhost)
      const apiHost = (
        import.meta.env.VITE_API_URL || 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5000'
          : 'https://physics-teachers-year-plan-tracking-1.onrender.com')
      ).replace(/\/+$/, '');
      
      await axios.post(`${apiHost}/api/teachers`, {
        teacherName: teacherName.trim(),
        assignments
      });

      setMessage('Teacher and multi-block assignments registered successfully!');
      setTeacherName('');
      setAssignments([INITIAL_ASSIGNMENT]);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Registration Error:', error.response || error);
      alert(`Failed to register teacher: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapperStyle}>
      <div style={containerStyle}>
        <h2 style={{ textAlign: 'center', color: '#2d3436', marginBottom: '1.5rem' }}>
          Teacher Multi-Block Registration
        </h2>

        {message && <div style={successStyle}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={fieldGroupStyle}>
            <label htmlFor="teacherName" style={labelStyle}>Teacher Name</label>
            <input
              id="teacherName"
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              style={inputStyle}
              placeholder="Enter teacher full name"
              required
            />
          </div>

          <hr style={{ margin: '2rem 0', border: '0', borderTop: '1px solid #dfe6e9' }} />

          <h3>Block & Subject Assignments</h3>
          <p style={{ color: '#636e72', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            If the teacher works in multiple blocks or teaches different subjects in different blocks, add a separate section below.
          </p>

          {assignments.map((assignment, index) => (
            <div
              key={index}
              style={{
                background: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid #dfe6e9',
                marginBottom: '1.5rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: '#0984e3' }}>Assignment Section #{index + 1}</h4>
                {assignments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(index)}
                    style={{ background: '#ff7675', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Block Dropdown */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Block Name</label>
                <select
                  value={assignment.blockName}
                  onChange={(e) => handleFieldChange(index, 'blockName', e.target.value)}
                  style={inputStyle}
                >
                  {BLOCKS_LIST.map((block) => (<option key={block} value={block}>{block}</option>))}
                </select>
              </div>

              {/* Subject Dropdown */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Subject</label>
                <select
                  value={assignment.subject}
                  onChange={(e) => handleFieldChange(index, 'subject', e.target.value)}
                  style={inputStyle}
                >
                  {SUBJECTS_LIST.map((subj) => (<option key={subj} value={subj}>{subj}</option>))}
                </select>
              </div>

              {/* Grades Checkboxes */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Grades for this Block</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginTop: '6px' }}>
                  {GRADES_LIST.map((g) => (
                    <label
                      key={g}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #dfe6e9',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignment.grades.includes(g)}
                        onChange={() => handleGradeToggle(index, g)}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddAssignment}
            style={{ background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginBottom: '1rem' }}
          >
            + Add Another Block Assignment
          </button>

          <button type="submit" style={submitBtnStyle} disabled={loading}>
            {loading ? 'Registering...' : 'Complete Registration & Assign All Plans'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TeacherRegistration;