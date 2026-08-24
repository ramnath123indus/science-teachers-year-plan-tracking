import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function TeacherDashboard({ teacherData, onNavigate }) {
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
          console.error('Error loading teacher plan:', err);
          setYearPlan([]);
          const serverErrorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
          setMessage(`❌ Year plan data not found: ${serverErrorMsg}`);
          setLoading(false);
        });
    }
  }, [apiHost, teacherData, selectedBlock, selectedSubject, selectedGrade]);

  // --- ANALYTICS CALCULATIONS (NCERT Track) ---
  const totalEntries = yearPlan.length;

  const ncertCompleted = yearPlan.filter(row => row.ncertStatus && row.ncertStatus.trim().toUpperCase() === 'COMPLETED').length;
  const ncertInProgress = yearPlan.filter(row => {
    const s = row.ncertStatus ? row.ncertStatus.trim().toUpperCase() : '';
    return s === 'IN PROCESS' || s === 'IN PROGRESS' || s === 'IN-PROGRESS';
  }).length;
  const ncertPending = totalEntries - (ncertCompleted + ncertInProgress);

  const ncertCompletedPct = totalEntries > 0 ? Math.round((ncertCompleted / totalEntries) * 100) : 0;
  const ncertInProgressPct = totalEntries > 0 ? Math.round((ncertInProgress / totalEntries) * 100) : 0;
  const ncertPendingPct = totalEntries > 0 ? Math.round((ncertPending / totalEntries) * 100) : 0;

  // --- ANALYTICS CALCULATIONS (IIT Track) ---
  const iitCompleted = yearPlan.filter(row => row.iitStatus && row.iitStatus.trim().toUpperCase() === 'COMPLETED').length;
  const iitInProgress = yearPlan.filter(row => {
    const s = row.iitStatus ? row.iitStatus.trim().toUpperCase() : '';
    return s === 'IN PROCESS' || s === 'IN PROGRESS' || s === 'IN-PROGRESS';
  }).length;
  const iitPending = totalEntries - (iitCompleted + iitInProgress);

  const iitCompletedPct = totalEntries > 0 ? Math.round((iitCompleted / totalEntries) * 100) : 0;
  const iitInProgressPct = totalEntries > 0 ? Math.round((iitInProgress / totalEntries) * 100) : 0;
  const iitPendingPct = totalEntries > 0 ? Math.round((iitPending / totalEntries) * 100) : 0;

  const handleExportExcel = () => {
    if (!yearPlan.length) return;

    const exportData = yearPlan.map((row, idx) => ({
      '#': idx + 1,
      'MONTH': row.month || '',
      'NCERT SYLLABUS': row.ncertSyllabus || '',
      'SEC-1': row.sec1 || '',
      'SEC-2': row.sec2 || '',
      'SEC-3': row.sec3 || '',
      'SEC-4': row.sec4 || '',
      'SEC-5': row.sec5 || '',
      'SEC-6': row.sec6 || '',
      'NCERT STATUS': row.ncertStatus || '',
      'IIT SYLLABUS': row.iitSyllabus || '',
      'IIT_SEC-1': row.iit_sec1 || '',
      'IIT_SEC-2': row.iit_sec2 || '',
      'IIT_SEC-3': row.iit_sec3 || '',
      'IIT_SEC-4': row.iit_sec4 || '',
      'IIT STATUS': row.iitStatus || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Year Plan');

    const fileName = `${teacherData?.teacherName || 'Teacher'}_${selectedSubject}_${selectedGrade}.xlsx`;
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

  const currentAssignment = assignmentsList.find(a => a.blockName === selectedBlock && a.subject === selectedSubject);
  const availableGrades = currentAssignment?.grades || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>👋 Welcome, {teacherData?.teacherName || 'Teacher'}!</h2>
          <p style={{ color: '#666', margin: '0' }}>Real-time dashboard tracking for both NCERT Status and IIT Status metrics.</p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('update')}
            style={{ padding: '0.7rem 1.4rem', background: '#0984e3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✏️ Go to Update Plan View
          </button>
        )}
      </div>

      {/* Class Selector Filters */}
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
      </div>

      {loading && <p>Loading curriculum tracking dashboard...</p>}
      {message && <div style={{ background: message.includes('❌') ? '#f8d7da' : '#d4edda', color: message.includes('❌') ? '#721c24' : '#155724', padding: '12px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</div>}

      {yearPlan.length > 0 && (
        <div>
          {/* Dual Tracking Analytics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '1.5rem' }}>
            
            {/* NCERT Status Summary Card */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #dfe6e9', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#2d3436', fontSize: '1.05rem' }}>📊 NCERT Status Tracking</h3>
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Total: {totalEntries}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #2e7d32' }}>
                  <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 'bold' }}>COMPLETED</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1b5e20' }}>{ncertCompleted} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({ncertCompletedPct}%)</span></div>
                </div>
                <div style={{ background: '#fffde7', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #fbc02d' }}>
                  <span style={{ fontSize: '0.75rem', color: '#f57f17', fontWeight: 'bold' }}>IN PROGRESS</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#e65100' }}>{ncertInProgress} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({ncertInProgressPct}%)</span></div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #757575' }}>
                  <span style={{ fontSize: '0.75rem', color: '#616161', fontWeight: 'bold' }}>PENDING</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#212121' }}>{ncertPending} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({ncertPendingPct}%)</span></div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', height: '14px', width: '100%', background: '#e0e0e0', borderRadius: '7px', overflow: 'hidden' }}>
                <div style={{ width: `${ncertCompletedPct}%`, background: '#2e7d32', transition: 'width 0.4s ease' }}></div>
                <div style={{ width: `${ncertInProgressPct}%`, background: '#fbc02d', transition: 'width 0.4s ease' }}></div>
                <div style={{ width: `${ncertPendingPct}%`, background: '#b0bec5', transition: 'width 0.4s ease' }}></div>
              </div>
            </div>

            {/* IIT Status Summary Card */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #dfe6e9', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#2d3436', fontSize: '1.05rem' }}>🚀 IIT Status Tracking</h3>
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Total: {totalEntries}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #2e7d32' }}>
                  <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 'bold' }}>COMPLETED</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1b5e20' }}>{iitCompleted} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({iitCompletedPct}%)</span></div>
                </div>
                <div style={{ background: '#fffde7', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #fbc02d' }}>
                  <span style={{ fontSize: '0.75rem', color: '#f57f17', fontWeight: 'bold' }}>IN PROGRESS</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#e65100' }}>{iitInProgress} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({iitInProgressPct}%)</span></div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #757575' }}>
                  <span style={{ fontSize: '0.75rem', color: '#616161', fontWeight: 'bold' }}>PENDING</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#212121' }}>{iitPending} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({iitPendingPct}%)</span></div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', height: '14px', width: '100%', background: '#e0e0e0', borderRadius: '7px', overflow: 'hidden' }}>
                <div style={{ width: `${iitCompletedPct}%`, background: '#2e7d32', transition: 'width 0.4s ease' }}></div>
                <div style={{ width: `${iitInProgressPct}%`, background: '#fbc02d', transition: 'width 0.4s ease' }}></div>
                <div style={{ width: `${iitPendingPct}%`, background: '#b0bec5', transition: 'width 0.4s ease' }}></div>
              </div>
            </div>

          </div>

          {/* Export Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={handleExportExcel}
              style={{ padding: '0.6rem 1.4rem', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
            >
              📥 Export to Excel
            </button>
          </div>

          {/* Full Curriculum Table */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ background: '#2d3436', color: '#fff', textAlign: 'left', fontSize: '0.85rem' }}>
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

                      {/* SEC-1 to SEC-6 */}
                      {['sec1', 'sec2', 'sec3', 'sec4', 'sec5', 'sec6'].map((secField) => (
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

                      {/* IIT_SEC-1 to IIT_SEC-4 */}
                      {['iit_sec1', 'iit_sec2', 'iit_sec3', 'iit_sec4'].map((secField) => (
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