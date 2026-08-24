import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const STANDARD_MONTHS = [
  'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 
  'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL'
];

export default function UpdateTeacherYearPlan() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherObj, setSelectedTeacherObj] = useState(null);
  
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  const [yearPlan, setYearPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [mode, setMode] = useState('view');

  const apiHost = (
    import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://physics-teachers-year-plan-tracking-1.onrender.com')
  ).replace(/\/+$/, '');

  useEffect(() => {
    axios.get(`${apiHost}/api/teachers`)
      .then(res => {
        const fetchedTeachers = res.data.teachers || res.data || [];
        setTeachers(fetchedTeachers);
      })
      .catch(err => {
        console.error('Error fetching registered teachers:', err);
        setMessage('❌ Failed to load registered teachers from server.');
      });
  }, [apiHost]);

  useEffect(() => {
    if (selectedTeacherObj && selectedBlock && selectedSubject && selectedGrade) {
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();

      setLoading(true);
      setMessage('');

      const teacherParam = selectedTeacherObj.teacherName ? `&teacherName=${encodeURIComponent(selectedTeacherObj.teacherName)}` : '';

      axios.get(`${apiHost}/api/master-plans/submit?blockName=${encodeURIComponent(selectedBlock)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(gradeQuery)}${teacherParam}`)
        .then(res => {
          const fetchedPlan = res.data.yearPlan || res.data || [];
          
          const planMap = {};
          fetchedPlan.forEach(row => {
            if (row.month) {
              planMap[row.month.trim().toUpperCase()] = row;
            }
          });

          const processedPlan = STANDARD_MONTHS.map(monthName => {
            const existingRow = planMap[monthName] || {};
            return {
              ...existingRow,
              month: monthName,
              ncertSyllabus: existingRow.ncertSyllabus || '',
              assessments: existingRow.assessments || '',
              iitSyllabus: existingRow.iitSyllabus || '',
              status: existingRow.status && existingRow.status.trim() !== '' ? existingRow.status : 'NOT ASSIGNED',
              section1: existingRow.section1 && existingRow.section1.trim() !== '' ? existingRow.section1 : 'Not Started',
              section2: existingRow.section2 && existingRow.section2.trim() !== '' ? existingRow.section2 : 'Not Started',
              section3: existingRow.section3 && existingRow.section3.trim() !== '' ? existingRow.section3 : 'Not Started',
              section4: existingRow.section4 && existingRow.section4.trim() !== '' ? existingRow.section4 : 'Not Started',
              section5: existingRow.section5 && existingRow.section5.trim() !== '' ? existingRow.section5 : 'Not Started',
              section6: existingRow.section6 && existingRow.section6.trim() !== '' ? existingRow.section6 : 'Not Started'
            };
          });

          setYearPlan(processedPlan);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading plan:', err);
          const fallbackPlan = STANDARD_MONTHS.map(monthName => ({
            month: monthName,
            ncertSyllabus: '',
            assessments: '',
            iitSyllabus: '',
            status: 'NOT ASSIGNED',
            section1: 'Not Started',
            section2: 'Not Started',
            section3: 'Not Started',
            section4: 'Not Started',
            section5: 'Not Started',
            section6: 'Not Started'
          }));
          setYearPlan(fallbackPlan);
          setLoading(false);
        });
    } else {
      setYearPlan([]);
    }
  }, [apiHost, selectedTeacherObj, selectedBlock, selectedSubject, selectedGrade]);

  const handleTeacherChange = (e) => {
    const teacherName = e.target.value;
    const found = teachers.find(t => t.teacherName === teacherName);
    setSelectedTeacherObj(found || null);
    setSelectedBlock('');
    setSelectedSubject('');
    setSelectedGrade('');
    setYearPlan([]);
    setMessage('');
  };

  const handleBlockChange = (e) => {
    setSelectedBlock(e.target.value);
    setSelectedSubject('');
    setSelectedGrade('');
    setYearPlan([]);
    setMessage('');
  };

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
    setSelectedGrade('');
    setYearPlan([]);
    setMessage('');
  };

  const handleInputChange = (index, field, value) => {
    if (mode === 'view') return;
    const updated = [...yearPlan];
    updated[index][field] = value;
    setYearPlan(updated);
  };

  const handleSavePlan = async () => {
    if (!yearPlan.length) return;
    const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();

    setSaving(true);
    setMessage('');

    try {
      const payload = {
        teacherName: selectedTeacherObj?.teacherName || '',
        blockName: selectedBlock,
        subject: selectedSubject,
        grade: gradeQuery,
        yearPlan: yearPlan
      };

      await axios.post(`${apiHost}/api/master-plans/update`, payload);
      setMessage('✅ Year plan saved successfully!');
      setMode('view');
    } catch (err) {
      console.error('Error saving year plan:', err);
      const serverErrorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setMessage(`❌ Failed to save: ${serverErrorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (!yearPlan.length) return;

    const exportData = yearPlan.map((row, idx) => ({
      '#': idx + 1,
      'MONTH': row.month || '',
      'NCERT SYLLABUS': row.ncertSyllabus || '',
      'ASSESSMENTS': row.assessments || '',
      'IIT SYLLABUS': row.iitSyllabus || '',
      'SECTION-1': row.section1 || '',
      'SECTION-2': row.section2 || '',
      'SECTION-3': row.section3 || '',
      'SECTION-4': row.section4 || '',
      'SECTION-5': row.section5 || '',
      'SECTION-6': row.section6 || '',
      'STATUS': row.status || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'YearPlan');

    const fileName = `${selectedTeacherObj?.teacherName || 'Teacher'}_${selectedSubject}_${selectedGrade}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setMessage('📥 Year Plan exported to Excel successfully!');
  };

  const getDropdownStyle = (val) => {
    const upper = val ? val.trim().toUpperCase() : '';
    let bg = '#fff';
    let color = '#000';

    if (upper === 'COMPLETED') {
      bg = '#e8f5e9';
      color = '#2e7d32';
    } else if (upper.includes('PROCESS') || upper.includes('PROGRESS')) {
      bg = '#fffde7';
      color = '#f57f17';
    } else {
      bg = '#f5f5f5';
      color = '#616161';
    }

    return {
      width: '100%',
      padding: '6px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      background: bg,
      fontWeight: 'bold',
      color: color,
      fontSize: '0.85rem'
    };
  };

  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h2>📝 Teacher Year Plan Management (Excel Structure)</h2>

      {/* Selection Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dfe6e9' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Teacher Name:</label>
          <select value={selectedTeacherObj?.teacherName || ''} onChange={handleTeacherChange} style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option value="">Select Teacher</option>
            {teachers.map((t, i) => <option key={i} value={t.teacherName}>{t.teacherName}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Block Name:</label>
          <select value={selectedBlock} onChange={handleBlockChange} style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedTeacherObj}>
            <option value="">Select Block</option>
            {assignmentsList.map((a, i) => <option key={i} value={a.blockName}>{a.blockName}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Subject:</label>
          <select value={selectedSubject} onChange={handleSubjectChange} style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedBlock}>
            <option value="">Select Subject</option>
            {assignmentsList?.filter(a => a.blockName === selectedBlock)?.map((a, i) => <option key={i} value={a.subject}>{a.subject}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Grades:</label>
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedSubject}>
            <option value="">Select Grade</option>
            {assignmentsList?.filter(a => a.blockName === selectedBlock && a.subject === selectedSubject)?.[0]?.grades?.map((g, i) => <option key={i} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {selectedTeacherObj && (
        <div style={{ background: '#eef2f7', borderLeft: '5px solid #0984e3', padding: '12px 18px', borderRadius: '6px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Active Profile</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#2d3436' }}>
              👨‍🏫 Teacher: <span style={{ color: '#0984e3' }}>{selectedTeacherObj.teacherName}</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#444' }}>
              📚 Assigned Blocks: <b>{assignmentsList.length}</b> | Email: <b>{selectedTeacherObj.email || 'N/A'}</b>
            </span>
          </div>
        </div>
      )}

      {yearPlan.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem', background: '#edf2f7', padding: '10px 15px', borderRadius: '6px', gap: '10px' }}>
          <button onClick={() => setMode('view')} style={{ padding: '8px 16px', background: mode === 'view' ? '#2d3436' : '#fff', color: mode === 'view' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>👁️ View Mode</button>
          <button onClick={() => setMode('edit')} style={{ padding: '8px 16px', background: mode === 'edit' ? '#0984e3' : '#fff', color: mode === 'edit' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Edit Mode</button>
          <button onClick={handleExportExcel} style={{ padding: '8px 16px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Export to Excel</button>
        </div>
      )}

      {loading && <p>Loading year plan data...</p>}
      {message && <div style={{ background: message.includes('❌') ? '#f8d7da' : '#d4edda', color: message.includes('❌') ? '#721c24' : '#155724', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</div>}

      {yearPlan.length > 0 && (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ background: '#2d3436', color: '#fff', textAlign: 'left', fontSize: '0.9rem' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>#</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>MONTH</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>NCERT SYLLABUS</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>ASSESSMENTS</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>IIT SYLLABUS</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>SECTION-1</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>SECTION-2</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>SECTION-3</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>SECTION-4</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>SECTION-5</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>SECTION-6</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {yearPlan.map((row, index) => {
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                      
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f9f9f9' }}>
                        {row.month}
                      </td>

                      {/* NCERT Syllabus */}
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <input 
                          type="text" 
                          value={row.ncertSyllabus || ''} 
                          disabled={mode === 'view'}
                          onChange={(e) => handleInputChange(index, 'ncertSyllabus', e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.85rem', background: mode === 'view' ? '#f9f9f9' : '#fff' }}
                        />
                      </td>

                      {/* Assessments */}
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <input 
                          type="text" 
                          value={row.assessments || ''} 
                          disabled={mode === 'view'}
                          onChange={(e) => handleInputChange(index, 'assessments', e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.85rem', background: mode === 'view' ? '#f9f9f9' : '#fff' }}
                        />
                      </td>

                      {/* IIT Syllabus */}
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <input 
                          type="text" 
                          value={row.iitSyllabus || ''} 
                          disabled={mode === 'view'}
                          onChange={(e) => handleInputChange(index, 'iitSyllabus', e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.85rem', background: mode === 'view' ? '#f9f9f9' : '#fff' }}
                        />
                      </td>

                      {/* Sections 1 to 6 */}
                      {['section1', 'section2', 'section3', 'section4', 'section5', 'section6'].map((secField) => (
                        <td key={secField} style={{ padding: '6px', border: '1px solid #ddd' }}>
                          <select
                            value={row[secField] || 'Not Started'}
                            disabled={mode === 'view'}
                            onChange={(e) => handleInputChange(index, secField, e.target.value)}
                            style={getDropdownStyle(row[secField])}
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="IN PROCESS">IN PROCESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </td>
                      ))}

                      {/* Status */}
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <select
                          value={row.status || 'NOT ASSIGNED'}
                          disabled={mode === 'view'}
                          onChange={(e) => handleInputChange(index, 'status', e.target.value)}
                          style={getDropdownStyle(row.status)}
                        >
                          <option value="NOT ASSIGNED">NOT ASSIGNED</option>
                          <option value="IN PROCESS">IN PROCESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {mode === 'edit' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSavePlan}
                disabled={saving}
                style={{ padding: '12px 30px', background: '#0984e3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
              >
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}