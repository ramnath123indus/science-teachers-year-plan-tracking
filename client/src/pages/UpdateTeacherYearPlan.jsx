import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function UpdateTeacherYearPlan({ teacherData, onNavigate }) {
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  const [yearPlan, setYearPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Dynamically uses VITE_API_URL environment variable, or falls back intelligently
  const apiHost = (
    import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://physics-teachers-year-plan-tracking-1.onrender.com')
  ).replace(/\/+$/, '');

  const assignmentsList = teacherData?.assignments || [];

  // Automatically select first assignment defaults if available
  useEffect(() => {
    if (assignmentsList.length > 0 && !selectedBlock) {
      const first = assignmentsList[0];
      setSelectedBlock(first.blockName);
      setSelectedSubject(first.subject);
      if (first.grades && first.grades.length > 0) {
        setSelectedGrade(first.grades[0]);
      }
    }
  }, [assignmentsList, selectedBlock]);

  // Fetch Year Plan data when filters change
  useEffect(() => {
    if (teacherData?.teacherName && selectedBlock && selectedSubject && selectedGrade) {
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();

      setLoading(true);
      setMessage('');

      const teacherParam = `&teacherName=${encodeURIComponent(teacherData.teacherName)}`;

      axios.get(`${apiHost}/api/master-plans/submit?blockName=${encodeURIComponent(selectedBlock)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(gradeQuery)}${teacherParam}`)
        .then(res => {
          const fetchedPlan = res.data.yearPlan || res.data || [];
          const processedPlan = fetchedPlan.map(row => ({
            ...row,
            ncertStatus: row.ncertStatus && row.ncertStatus.trim() !== '' ? row.ncertStatus : 'Not Started',
            iitStatus: row.iitStatus && row.iitStatus.trim() !== '' ? row.iitStatus : 'Not Started',
            
            sec1: row.sec1 && row.sec1.trim() !== '' ? row.sec1 : 'Not Started',
            sec2: row.sec2 && row.sec2.trim() !== '' ? row.sec2 : 'Not Started',
            sec3: row.sec3 && row.sec3.trim() !== '' ? row.sec3 : 'Not Started',
            sec4: row.sec4 && row.sec4.trim() !== '' ? row.sec4 : 'Not Started',
            sec5: row.sec5 && row.sec5.trim() !== '' ? row.sec5 : 'Not Started',
            sec6: row.sec6 && row.sec6.trim() !== '' ? row.sec6 : 'Not Started',

            iit_sec1: row.iit_sec1 && row.iit_sec1.trim() !== '' ? row.iit_sec1 : 'Not Started',
            iit_sec2: row.iit_sec2 && row.iit_sec2.trim() !== '' ? row.iit_sec2 : 'Not Started',
            iit_sec3: row.iit_sec3 && row.iit_sec3.trim() !== '' ? row.iit_sec3 : 'Not Started',
            iit_sec4: row.iit_sec4 && row.iit_sec4.trim() !== '' ? row.iit_sec4 : 'Not Started'
          }));
          setYearPlan(processedPlan);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading year plan for editing:', err);
          setYearPlan([]);
          const serverErrorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
          setMessage(`❌ Year plan data not found: ${serverErrorMsg}`);
          setLoading(false);
        });
    }
  }, [apiHost, teacherData, selectedBlock, selectedSubject, selectedGrade]);

  const handleFieldChange = (index, field, value) => {
    const updated = [...yearPlan];
    updated[index][field] = value;
    setYearPlan(updated);
  };

  const handleSavePlan = () => {
    if (!selectedBlock || !selectedSubject || !selectedGrade) {
      setMessage('❌ Please select block, subject, and grade before saving.');
      return;
    }

    const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();
    setSaving(true);
    setMessage('');

    const payload = {
      blockName: selectedBlock,
      subject: selectedSubject,
      grade: gradeQuery,
      teacherName: teacherData?.teacherName || 'Teacher',
      yearPlan: yearPlan
    };

    axios.post(`${apiHost}/api/master-plans/submit`, payload)
      .then(res => {
        setSaving(false);
        setMessage('✅ Year plan and tracking statuses saved successfully!');
      })
      .catch(err => {
        console.error('Error saving year plan:', err);
        setSaving(false);
        const serverErrorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
        setMessage(`❌ Failed to save year plan: ${serverErrorMsg}`);
      });
  };

  const currentAssignment = assignmentsList.find(a => a.blockName === selectedBlock && a.subject === selectedSubject);
  const availableGrades = currentAssignment?.grades || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1800px', margin: '0 auto' }}>
      
      {/* Top Header & Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>✏️ Update Year Plan & Status Tracking</h2>
          <p style={{ color: '#666', margin: '0' }}>Modify syllabus topics, sub-sections, NCERT Status, and IIT Status.</p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('dashboard')}
            style={{ padding: '0.7rem 1.4rem', background: '#636e72', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📊 Back to Dashboard
          </button>
        )}
      </div>

      {/* Teacher Profile Details Banner (Email removed) */}
      <div style={{ background: '#eef2f7', borderLeft: '5px solid #0984e3', padding: '15px 20px', borderRadius: '6px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Logged-In Teacher Profile</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3436', marginTop: '2px' }}>
            👨‍🏫 {teacherData?.teacherName || 'Teacher Name Not Provided'}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Assigned Blocks</span>
          <span style={{ fontWeight: '600', color: '#333', fontSize: '0.9rem' }}>{assignmentsList.length} Block(s)</span>
        </div>
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dfe6e9' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Block Name:</label>
          <select 
            value={selectedBlock} 
            onChange={(e) => {
              setSelectedBlock(e.target.value);
              const firstSubj = assignmentsList.find(a => a.blockName === e.target.value)?.subject || '';
              setSelectedSubject(firstSubj);
            }} 
            style={{ padding: '0.6rem', minWidth: '180px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            {[...new Set(assignmentsList.map(a => a.blockName))].map((b, i) => (
              <option key={i} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Subject:</label>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            style={{ padding: '0.6rem', minWidth: '180px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            {assignmentsList
              .filter(a => a.blockName === selectedBlock)
              .map((a, i) => (
                <option key={i} value={a.subject}>{a.subject}</option>
              ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Grade:</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)} 
            style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            {availableGrades.map((g, i) => (
              <option key={i} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <button
            onClick={handleSavePlan}
            disabled={saving || yearPlan.length === 0}
            style={{ padding: '0.65rem 1.6rem', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {loading && <p>Loading year plan data...</p>}
      {message && <div style={{ background: message.includes('❌') ? '#f8d7da' : '#d4edda', color: message.includes('❌') ? '#721c24' : '#155724', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</div>}

      {yearPlan.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#2d3436', color: '#fff', textAlign: 'left', fontSize: '0.82rem' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>#</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Month</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT Syllabus</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-1</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-2</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-3</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-4</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-5</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-6</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT STATUS</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT Syllabus</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-1</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-2</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-3</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-4</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {yearPlan.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f9f9f9', fontSize: '0.85rem' }}>{row.month || '-'}</td>
                  
                  {/* NCERT Syllabus Input */}
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                    <input 
                      type="text" 
                      value={row.ncertSyllabus || ''} 
                      onChange={(e) => handleFieldChange(index, 'ncertSyllabus', e.target.value)}
                      style={{ width: '100%', padding: '5px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </td>

                  {/* SEC-1 to SEC-6 inputs */}
                  {['sec1', 'sec2', 'sec3', 'sec4', 'sec5', 'sec6'].map(sec => (
                    <td key={sec} style={{ padding: '4px', border: '1px solid #ddd' }}>
                      <select 
                        value={row[sec] || 'Not Started'} 
                        onChange={(e) => handleFieldChange(index, sec, e.target.value)}
                        style={{ width: '100%', padding: '5px', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  ))}

                  {/* NCERT Status Dropdown */}
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                    <select 
                      value={row.ncertStatus || 'Not Started'} 
                      onChange={(e) => handleFieldChange(index, 'ncertStatus', e.target.value)}
                      style={{ width: '100%', padding: '5px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ccc', borderRadius: '4px', background: row.ncertStatus === 'Completed' ? '#e8f5e9' : row.ncertStatus === 'In Progress' ? '#fffde7' : '#fff' }}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>

                  {/* IIT Syllabus Input */}
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                    <input 
                      type="text" 
                      value={row.iitSyllabus || ''} 
                      onChange={(e) => handleFieldChange(index, 'iitSyllabus', e.target.value)}
                      style={{ width: '100%', padding: '5px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </td>

                  {/* IIT_SEC-1 to IIT_SEC-4 inputs */}
                  {['iit_sec1', 'iit_sec2', 'iit_sec3', 'iit_sec4'].map(sec => (
                    <td key={sec} style={{ padding: '4px', border: '1px solid #ddd' }}>
                      <select 
                        value={row[sec] || 'Not Started'} 
                        onChange={(e) => handleFieldChange(index, sec, e.target.value)}
                        style={{ width: '100%', padding: '5px', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  ))}

                  {/* IIT Status Dropdown */}
                  <td style={{ padding: '4px', border: '1px solid #ddd' }}>
                    <select 
                      value={row.iitStatus || 'Not Started'} 
                      onChange={(e) => handleFieldChange(index, 'iitStatus', e.target.value)}
                      style={{ width: '100%', padding: '5px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ccc', borderRadius: '4px', background: row.iitStatus === 'Completed' ? '#e8f5e9' : row.iitStatus === 'In Progress' ? '#fffde7' : '#fff' }}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom Save Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              onClick={handleSavePlan}
              disabled={saving}
              style={{ padding: '0.75rem 2rem', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}