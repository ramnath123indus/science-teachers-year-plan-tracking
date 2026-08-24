import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const STANDARD_MONTHS = [
  'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 
  'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'
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
  
  // Mode State: 'view', 'edit'
  const [mode, setMode] = useState('view');

  // Dynamically uses VITE_API_URL environment variable, or falls back intelligently
  const apiHost = (
    import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://physics-teachers-year-plan-tracking-1.onrender.com')
  ).replace(/\/+$/, '');

  // Fetch registered teachers on mount
  useEffect(() => {
    axios.get(`${apiHost}/api/teachers`)
      .then(res => {
        const fetchedTeachers = res.data.teachers || res.data || [];
        console.log('📌 Fetched Teachers from API:', fetchedTeachers);
        setTeachers(fetchedTeachers);
      })
      .catch(err => {
        console.error('Error fetching registered teachers:', err);
        setMessage('❌ Failed to load registered teachers from server.');
      });
  }, [apiHost]);

  // Fetch Year Plan data when all filters are selected (with auto-padding for full 10 months)
  useEffect(() => {
    if (selectedTeacherObj && selectedBlock && selectedSubject && selectedGrade) {
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();

      setLoading(true);
      setMessage('');

      const teacherParam = selectedTeacherObj.teacherName ? `&teacherName=${encodeURIComponent(selectedTeacherObj.teacherName)}` : '';

      axios.get(`${apiHost}/api/master-plans/submit?blockName=${encodeURIComponent(selectedBlock)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(gradeQuery)}${teacherParam}`)
        .then(res => {
          const fetchedPlan = res.data.yearPlan || res.data || [];
          
          // Map fetched data by month for easy lookup
          const planMap = {};
          fetchedPlan.forEach(row => {
            if (row.month) {
              planMap[row.month.trim().toUpperCase()] = row;
            }
          });

          // Ensure all standard months exist so empty blocks don't truncate to 1 row
          const processedPlan = STANDARD_MONTHS.map(monthName => {
            const existingRow = planMap[monthName] || fetchedPlan[STANDARD_MONTHS.indexOf(monthName)] || {};
            return {
              ...existingRow,
              month: monthName,
              ncertSyllabus: existingRow.ncertSyllabus || '',
              assessments: existingRow.assessments || '',
              iitSyllabus: existingRow.iitSyllabus || '',
              status: existingRow.status && existingRow.status.trim() !== '' ? existingRow.status : 'NONE',
              section1: existingRow.section1 && existingRow.section1.trim() !== '' ? existingRow.section1 : 'NOT ASSIGNED',
              section2: existingRow.section2 && existingRow.section2.trim() !== '' ? existingRow.section2 : 'NOT ASSIGNED',
              section3: existingRow.section3 && existingRow.section3.trim() !== '' ? existingRow.section3 : 'NOT ASSIGNED',
              section4: existingRow.section4 && existingRow.section4.trim() !== '' ? existingRow.section4 : 'NOT ASSIGNED',
              section5: existingRow.section5 && existingRow.section5.trim() !== '' ? existingRow.section5 : 'NOT ASSIGNED',
              section6: existingRow.section6 && existingRow.section6.trim() !== '' ? existingRow.section6 : 'NOT ASSIGNED'
            };
          });

          setYearPlan(processedPlan);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading plan:', err);
          // Fallback: Generate a clean 10-month empty layout anyway
          const fallbackPlan = STANDARD_MONTHS.map(monthName => ({
            month: monthName,
            ncertSyllabus: '',
            assessments: '',
            iitSyllabus: '',
            status: 'NONE',
            section1: 'NOT ASSIGNED',
            section2: 'NOT ASSIGNED',
            section3: 'NOT ASSIGNED',
            section4: 'NOT ASSIGNED',
            section5: 'NOT ASSIGNED',
            section6: 'NOT ASSIGNED'
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
    console.log('📌 Selected Teacher Object:', found);
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

  // Save Year Plan Changes
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
      'Month': row.month || '',
      'NCERT Syllabus': row.ncertSyllabus || '',
      'Assessments': row.assessments || '',
      'IIT Syllabus': row.iitSyllabus || '',
      'Section-1': row.section1 || '',
      'Section-2': row.section2 || '',
      'Section-3': row.section3 || '',
      'Section-4': row.section4 || '',
      'Section-5': row.section5 || '',
      'Section-6': row.section6 || '',
      'Status': row.status || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Year Plan');

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
    } else if (upper === 'IN PROCESS' || upper === 'IN PROGRESS') {
      bg = '#fffde7';
      color = '#f57f17';
    } else if (upper === 'NONE' || upper === 'NOT ASSIGNED') {
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

  // Safe checks for assignments arrays
  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h2>📝 Teacher Year Plan Management</h2>

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
          <select 
            value={selectedBlock} 
            onChange={handleBlockChange} 
            style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }}
            disabled={!selectedTeacherObj}
          >
            <option value="">Select Block</option>
            {assignmentsList.map((a, i) => <option key={i} value={a.blockName}>{a.blockName}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Subject:</label>
          <select 
            value={selectedSubject} 
            onChange={handleSubjectChange} 
            style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }}
            disabled={!selectedBlock}
          >
            <option value="">Select Subject</option>
            {assignmentsList
              ?.filter(a => a.blockName === selectedBlock)
              ?.map((a, i) => <option key={i} value={a.subject}>{a.subject}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>Grades:</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)} 
            style={{ padding: '0.6rem', minWidth: '160px', borderRadius: '6px', border: '1px solid #ccc' }}
            disabled={!selectedSubject}
          >
            <option value="">Select Grade</option>
            {assignmentsList
              ?.filter(a => a.blockName === selectedBlock && a.subject === selectedSubject)
              ?.[0]?.grades?.map((g, i) => <option key={i} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Teacher Profile Info Banner */}
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
          <button
            onClick={() => setMode('view')}
            style={{ padding: '8px 16px', background: mode === 'view' ? '#2d3436' : '#fff', color: mode === 'view' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            👁️ View Mode
          </button>
          <button
            onClick={() => setMode('edit')}
            style={{ padding: '8px 16px', background: mode === 'edit' ? '#0984e3' : '#fff', color: mode === 'edit' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✏️ Edit Mode
          </button>
          <button
            onClick={handleExportExcel}
            style={{ padding: '8px 16px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📊 Export to Excel
          </button>
        </div>
      )}

      {loading && <p>Loading year plan data...</p>}
      {message && <div style={{ background: message.includes('❌') ? '#f8d7da' : '#d4edda', color: message.includes('❌') ? '#721c24' : '#155724', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</div>}

      {yearPlan.length > 0 && (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ background: '#2d3436', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>#</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Month</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>NCERT Syllabus</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Assessments</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>IIT Syllabus</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Section-1</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Section-2</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Section-3</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Section-4</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Section-5</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Section-6</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {yearPlan.map((row, index) => {
                  const statusVal = row.status ? row.status.trim().toUpperCase() : 'NONE';
                  let rowBg = 'transparent';
                  if (statusVal === 'COMPLETED') rowBg = '#f1f8e9';
                  if (statusVal.includes('PROGRESS')) rowBg = '#fffde7';

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd', background: rowBg }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                      
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f9f9f9' }}>
                        {row.month}
                      </td>

                      {['ncertSyllabus', 'assessments', 'iitSyllabus'].map((field) => (
                        <td key={field} style={{ padding: '6px', border: '1px solid #ddd' }}>
                          <input 
                            type="text" 
                            value={row[field] || ''} 
                            disabled={mode === 'view'}
                            onChange={(e) => handleInputChange(index, field, e.target.value)}
                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.85rem', background: mode === 'view' ? '#f9f9f9' : '#fff' }}
                          />
                        </td>
                      ))}

                      {['section1', 'section2', 'section3', 'section4', 'section5', 'section6'].map((secField) => (
                        <td key={secField} style={{ padding: '6px', border: '1px solid #ddd' }}>
                          <select
                            value={row[secField] || 'NOT ASSIGNED'}
                            disabled={mode === 'view'}
                            onChange={(e) => handleInputChange(index, secField, e.target.value)}
                            style={getDropdownStyle(row[secField])}
                          >
                            <option value="NOT ASSIGNED">NOT ASSIGNED</option>
                            <option value="IN PROCESS">IN PROCESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </td>
                      ))}

                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <select
                          value={row.status || 'NONE'}
                          disabled={mode === 'view'}
                          onChange={(e) => handleInputChange(index, 'status', e.target.value)}
                          style={getDropdownStyle(row.status)}
                        >
                          <option value="NONE">NONE</option>
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