import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function TeacherYearPlanDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherObj, setSelectedTeacherObj] = useState(null);
  
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  const [yearPlan, setYearPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
        setTeachers(fetchedTeachers);
      })
      .catch(err => {
        console.error('Error fetching registered teachers:', err);
        setMessage('❌ Failed to load registered teachers from server.');
      });
  }, [apiHost]);

  // Fetch Year Plan data when all filters are selected
  useEffect(() => {
    if (selectedTeacherObj && selectedBlock && selectedSubject && selectedGrade) {
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();

      setLoading(true);
      setMessage('');

      const teacherParam = selectedTeacherObj.teacherName ? `&teacherName=${encodeURIComponent(selectedTeacherObj.teacherName)}` : '';

      axios.get(`${apiHost}/api/master-plans/submit?blockName=${encodeURIComponent(selectedBlock)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(gradeQuery)}${teacherParam}`)
        .then(res => {
          const fetchedPlan = res.data.yearPlan || res.data || [];
          const processedPlan = fetchedPlan.map(row => ({
            ...row,
            ncertStatus: row.ncertStatus && row.ncertStatus.trim() !== '' ? row.ncertStatus : 'Not Started',
            iitStatus: row.iitStatus && row.iitStatus.trim() !== '' ? row.iitStatus : 'Not Started',
            
            section1: row.section1 && row.section1.trim() !== '' ? row.section1 : 'Not Started',
            section2: row.section2 && row.section2.trim() !== '' ? row.section2 : 'Not Started',
            section3: row.section3 && row.section3.trim() !== '' ? row.section3 : 'Not Started',
            section4: row.section4 && row.section4.trim() !== '' ? row.section4 : 'Not Started',
            section5: row.section5 && row.section5.trim() !== '' ? row.section5 : 'Not Started',
            section6: row.section6 && row.section6.trim() !== '' ? row.section6 : 'Not Started',

            iitSection1: row.iitSection1 && row.iitSection1.trim() !== '' ? row.iitSection1 : 'Not Started',
            iitSection2: row.iitSection2 && row.iitSection2.trim() !== '' ? row.iitSection2 : 'Not Started',
            iitSection3: row.iitSection3 && row.iitSection3.trim() !== '' ? row.iitSection3 : 'Not Started'
          }));
          setYearPlan(processedPlan);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading plan:', err);
          setYearPlan([]);
          const serverErrorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
          setMessage(`❌ Year plan data not found or failed to load: ${serverErrorMsg}`);
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

  // --- ANALYTICS CALCULATIONS (NCERT Track) ---
  const totalEntries = yearPlan.length;

  const completedCount = yearPlan.filter(row => 
    row.ncertStatus && row.ncertStatus.trim().toUpperCase() === 'COMPLETED'
  ).length;

  const inProgressCount = yearPlan.filter(row => {
    const s = row.ncertStatus ? row.ncertStatus.trim().toUpperCase() : '';
    return s === 'IN PROCESS' || s === 'IN PROGRESS' || s === 'IN-PROGRESS';
  }).length;

  const pendingCount = totalEntries - (completedCount + inProgressCount);

  const completedPercentage = totalEntries > 0 ? Math.round((completedCount / totalEntries) * 100) : 0;
  const inProgressPercentage = totalEntries > 0 ? Math.round((inProgressCount / totalEntries) * 100) : 0;
  const pendingPercentage = totalEntries > 0 ? Math.round((pendingCount / totalEntries) * 100) : 0;

  const handleExportExcel = () => {
    if (!yearPlan.length) return;

    const exportData = yearPlan.map((row, idx) => ({
      '#': idx + 1,
      'MONTH': row.month || '',
      'NCERT SYLLABUS': row.ncertSyllabus || '',
      'NCERT_SEC-1': row.section1 || '',
      'NCERT_SEC-2': row.section2 || '',
      'NCERT_SEC-3': row.section3 || '',
      'NCERT_SEC-4': row.section4 || '',
      'NCERT_SEC-5': row.section5 || '',
      'NCERT_SEC-6': row.section6 || '',
      'NCERT_STATUS': row.ncertStatus || '',
      'IIT SYLLABUS': row.iitSyllabus || '',
      'IIT_SEC-1': row.iitSection1 || '',
      'IIT_SEC-2': row.iitSection2 || '',
      'IIT_SEC-3': row.iitSection3 || '',
      'IIT STATUS': row.iitStatus || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Year Plan');

    const fileName = `${selectedTeacherObj?.teacherName || 'Teacher'}_${selectedSubject}_${selectedGrade}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setMessage('📥 Year Plan exported to Excel successfully!');
  };

  const getBadgeStyle = (val) => {
    const upper = val ? val.trim().toUpperCase() : '';
    let bg = '#f5f5f5';
    let color = '#616161';

    if (upper === 'COMPLETED') {
      bg = '#e8f5e9';
      color = '#2e7d32';
    } else if (upper === 'IN PROCESS' || upper === 'IN PROGRESS') {
      bg = '#fffde7';
      color = '#f57f17';
    }

    return {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      background: bg,
      fontWeight: 'bold',
      color: color,
      fontSize: '0.75rem'
    };
  };

  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1700px', margin: '0 auto' }}>
      <h2>👀 Teacher Year Plan Dashboard (Dual Track Sections)</h2>

      {/* Filter Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dfe6e9' }}>
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

      {/* Teacher Profile Card */}
      {selectedTeacherObj && (
        <div style={{ background: '#e1f5fe', padding: '15px 20px', borderRadius: '8px', border: '1px solid #b3e5fc', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#0277bd' }}>👤 Teacher Profile: {selectedTeacherObj.teacherName}</h3>
            <p style={{ margin: '0 0 8px 0', color: '#01579b', fontSize: '0.9rem' }}>
              📧 <strong>Email:</strong> {selectedTeacherObj.email || 'N/A'} | 📞 <strong>Phone:</strong> {selectedTeacherObj.phone || 'N/A'}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#333' }}>Assigned Classes:</span>
              {assignmentsList.map((a, idx) => (
                <span key={idx} style={{ background: '#b3e5fc', color: '#01579b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                  {a.blockName} - {a.subject} ({a.grades?.join(', ')})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && <p>Loading year plan data...</p>}
      {message && <div style={{ background: message.includes('❌') ? '#f8d7da' : '#d4edda', color: message.includes('❌') ? '#721c24' : '#155724', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</div>}

      {yearPlan.length > 0 && (
        <div>
          {/* Analytics Summary Card */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #dfe6e9', marginBottom: '1.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#2d3436', fontSize: '1.1rem' }}>📈 NCERT Track Analytics & Progress Summary</h3>
              <button
                onClick={handleExportExcel}
                style={{ padding: '0.5rem 1.2rem', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                📥 Export to Excel
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: '#e8f5e9', padding: '12px 15px', borderRadius: '6px', borderLeft: '4px solid #2e7d32' }}>
                <span style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 'bold' }}>COMPLETED</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1b5e20' }}>{completedCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>({completedPercentage}%)</span></div>
              </div>

              <div style={{ background: '#fffde7', padding: '12px 15px', borderRadius: '6px', borderLeft: '4px solid #fbc02d' }}>
                <span style={{ fontSize: '0.85rem', color: '#f57f17', fontWeight: 'bold' }}>IN PROGRESS</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e65100' }}>{inProgressCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>({inProgressPercentage}%)</span></div>
              </div>

              <div style={{ background: '#f5f5f5', padding: '12px 15px', borderRadius: '6px', borderLeft: '4px solid #757575' }}>
                <span style={{ fontSize: '0.85rem', color: '#616161', fontWeight: 'bold' }}>PENDING / OTHER</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#212121' }}>{pendingCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>({pendingPercentage}%)</span></div>
              </div>
            </div>

            {/* Progress Bar Chart */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '5px' }}>
                <span>Overall NCERT Completion Distribution</span>
                <span>Total Entries: {totalEntries}</span>
              </div>
              
              <div style={{ display: 'flex', height: '18px', width: '100%', background: '#e0e0e0', borderRadius: '9px', overflow: 'hidden' }}>
                <div style={{ width: `${completedPercentage}%`, background: '#2e7d32', transition: 'width 0.4s ease' }} title={`Completed: ${completedCount}`}></div>
                <div style={{ width: `${inProgressPercentage}%`, background: '#fbc02d', transition: 'width 0.4s ease' }} title={`In Progress: ${inProgressCount}`}></div>
                <div style={{ width: `${pendingPercentage}%`, background: '#b0bec5', transition: 'width 0.4s ease' }} title={`Pending: ${pendingCount}`}></div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '0.8rem', color: '#555' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', background: '#2e7d32', display: 'inline-block', borderRadius: '2px' }}></span> Completed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', background: '#fbc02d', display: 'inline-block', borderRadius: '2px' }}></span> In Progress</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', background: '#b0bec5', display: 'inline-block', borderRadius: '2px' }}></span> Pending</span>
              </div>
            </div>
          </div>

          {/* Read-Only Table */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ background: '#2d3436', color: '#fff', textAlign: 'left', fontSize: '0.85rem' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>#</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Month</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT Syllabus</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_SEC-1</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_SEC-2</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_SEC-3</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_SEC-4</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_SEC-5</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_SEC-6</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT_STATUS</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT Syllabus</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-1</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-2</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-3</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT STATUS</th>
                </tr>
              </thead>
              <tbody>
                {yearPlan.map((row, index) => {
                  const statusVal = row.ncertStatus ? row.ncertStatus.trim().toUpperCase() : '';
                  let rowBg = 'transparent';
                  if (statusVal === 'COMPLETED') rowBg = '#f1f8e9';
                  if (statusVal.includes('PROGRESS') || statusVal.includes('PROCESS')) rowBg = '#fffde7';

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd', background: rowBg }}>
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f9f9f9', fontSize: '0.85rem' }}>{row.month || '-'}</td>
                      
                      {/* NCERT Syllabus */}
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '0.8rem' }}>{row.ncertSyllabus || '-'}</td>

                      {/* NCERT Sections 1 to 6 */}
                      {['section1', 'section2', 'section3', 'section4', 'section5', 'section6'].map((secField) => (
                        <td key={secField} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
                          <span style={getBadgeStyle(row[secField])}>
                            {row[secField] || 'Not Started'}
                          </span>
                        </td>
                      ))}

                      {/* NCERT Status */}
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <span style={getBadgeStyle(row.ncertStatus)}>
                          {row.ncertStatus || 'Not Started'}
                        </span>
                      </td>

                      {/* IIT Syllabus */}
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '0.8rem' }}>{row.iitSyllabus || '-'}</td>

                      {/* IIT Sections 1 to 3 */}
                      {['iitSection1', 'iitSection2', 'iitSection3'].map((secField) => (
                        <td key={secField} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
                          <span style={getBadgeStyle(row[secField])}>
                            {row[secField] || 'Not Started'}
                          </span>
                        </td>
                      ))}

                      {/* IIT Status */}
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <span style={getBadgeStyle(row.iitStatus)}>
                          {row.iitStatus || 'Not Started'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}