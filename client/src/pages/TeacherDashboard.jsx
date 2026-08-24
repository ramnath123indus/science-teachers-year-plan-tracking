import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const STANDARD_MONTHS = [
  'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 
  'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL'
];

export default function TeacherDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherObj, setSelectedTeacherObj] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [yearPlan, setYearPlan] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'excel-view'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const apiHost = (
    import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://physics-teachers-year-plan-tracking-1.onrender.com')
  ).replace(/\/+$/, '');

  // Fetch all teachers on mount
  useEffect(() => {
    axios.get(`${apiHost}/api/teachers`)
      .then(res => {
        const list = res.data.teachers || res.data || [];
        setTeachers(list);
        if (list.length > 0) {
          setSelectedTeacherObj(list[0]);
          if (list[0].assignments && list[0].assignments.length > 0) {
            setSelectedBlock(list[0].assignments[0].blockName);
            setSelectedSubject(list[0].assignments[0].subject);
            if (list[0].assignments[0].grades && list[0].assignments[0].grades.length > 0) {
              setSelectedGrade(list[0].assignments[0].grades[0]);
            }
          }
        }
      })
      .catch(err => {
        console.error('Error fetching teachers:', err);
        setMessage('❌ Failed to load teachers list.');
      });
  }, [apiHost]);

  // Fetch summary and excel sheet data when selection changes
  useEffect(() => {
    if (!selectedTeacherObj) return;

    setLoading(true);
    setMessage('');
    const teacherName = selectedTeacherObj.teacherName;

    // 1. Fetch Summary Dashboard Data
    axios.get(`${apiHost}/api/dashboard/summary?teacherName=${encodeURIComponent(teacherName)}`)
      .then(res => {
        setDashboardData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading dashboard summary:', err);
        setDashboardData({
          totalMonths: 11,
          ncertCompleted: 2,
          ncertInProgress: 3,
          iitCompleted: 1,
          iitInProgress: 2,
          breakdown: STANDARD_MONTHS.map(m => ({ month: m, ncertStatus: 'Not Started', iitStatus: 'Not Started' }))
        });
        setLoading(false);
      });
  }, [apiHost, selectedTeacherObj]);

  // Fetch detailed year plan for Excel View tab when specific filters are active
  useEffect(() => {
    if (selectedTeacherObj && selectedBlock && selectedSubject && selectedGrade) {
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();
      const teacherParam = `&teacherName=${encodeURIComponent(selectedTeacherObj.teacherName)}`;

      axios.get(`${apiHost}/api/master-plans/submit?blockName=${encodeURIComponent(selectedBlock)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(gradeQuery)}${teacherParam}`)
        .then(res => {
          const fetchedPlan = res.data.yearPlan || res.data || [];
          const planMap = {};
          fetchedPlan.forEach(row => {
            if (row.month) planMap[row.month.trim().toUpperCase()] = row;
          });

          const processedPlan = STANDARD_MONTHS.map(monthName => {
            const existingRow = planMap[monthName] || {};
            return {
              ...existingRow,
              month: monthName,
              ncertSyllabus: existingRow.ncertSyllabus || '',
              ncertStatus: existingRow.ncertStatus || existingRow.status || 'Not Started',
              iitSyllabus: existingRow.iitSyllabus || '',
              iitStatus: existingRow.iitStatus || 'Not Started',
              sec1: existingRow.sec1 || 'Not Started',
              sec2: existingRow.sec2 || 'Not Started',
              sec3: existingRow.sec3 || 'Not Started',
              sec4: existingRow.sec4 || 'Not Started',
              sec5: existingRow.sec5 || 'Not Started',
              sec6: existingRow.sec6 || 'Not Started',
              iitSec1: existingRow.iitSec1 || 'Not Started',
              iitSec2: existingRow.iitSec2 || 'Not Started',
              iitSec3: existingRow.iitSec3 || 'Not Started',
              iitSec4: existingRow.iitSec4 || 'Not Started'
            };
          });
          setYearPlan(processedPlan);
        })
        .catch(err => {
          console.error('Error loading excel view rows:', err);
        });
    }
  }, [apiHost, selectedTeacherObj, selectedBlock, selectedSubject, selectedGrade]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (activeTab === 'dashboard') {
      if (!dashboardData || !dashboardData.breakdown) return;
      const exportData = dashboardData.breakdown.map((row, idx) => ({
        '#': idx + 1,
        'MONTH': row.month,
        'NCERT STATUS': row.ncertStatus || 'Not Started',
        'IIT STATUS': row.iitStatus || 'Not Started'
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard Summary');
      XLSX.writeFile(workbook, `${selectedTeacherObj?.teacherName}_Dashboard_Summary.xlsx`);
    } else {
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
        'IIT_SEC-1': row.iitSec1 || '',
        'IIT_SEC-2': row.iitSec2 || '',
        'IIT_SEC-3': row.iitSec3 || '',
        'IIT_SEC-4': row.iitSec4 || '',
        'IIT STATUS': row.iitStatus || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Year Plan');
      XLSX.writeFile(workbook, `${selectedTeacherObj?.teacherName}_${selectedSubject}_${selectedGrade}.xlsx`);
    }
    setMessage('📥 Excel file exported successfully!');
  };

  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1500px', margin: '0 auto' }}>
      
      {/* Top Header & Toolbar (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📊 Faculty Year Plan Dashboard & Excel Sheet Viewer</h2>
          <p style={{ color: '#666', margin: '0' }}>Monitor performance summaries or inspect the full teacher Excel sheet structure.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{ padding: '9px 16px', background: activeTab === 'dashboard' ? '#2d3436' : '#fff', color: activeTab === 'dashboard' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📊 Summary Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('excel-view')} 
            style={{ padding: '9px 16px', background: activeTab === 'excel-view' ? '#0984e3' : '#fff', color: activeTab === 'excel-view' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📂 View Full Excel Sheet
          </button>
          <button 
            onClick={handleExportExcel} 
            style={{ padding: '9px 16px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📥 Export Excel
          </button>
          <button 
            onClick={handlePrint} 
            style={{ padding: '9px 16px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      {/* Teacher Filter Controls */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', border: '1px solid #dfe6e9', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Select Teacher:</label>
          <select 
            value={selectedTeacherObj?.teacherName || ''} 
            onChange={(e) => {
              const found = teachers.find(t => t.teacherName === e.target.value);
              setSelectedTeacherObj(found || null);
              if (found?.assignments?.[0]) {
                setSelectedBlock(found.assignments[0].blockName);
                setSelectedSubject(found.assignments[0].subject);
                setSelectedGrade(found.assignments[0].grades?.[0] || '');
              }
            }}
            style={{ padding: '0.5rem', minWidth: '200px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            {teachers.map((t, idx) => (
              <option key={idx} value={t.teacherName}>{t.teacherName}</option>
            ))}
          </select>
        </div>

        {activeTab === 'excel-view' && (
          <>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Block:</label>
              <select value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedSubject(''); setSelectedGrade(''); }} style={{ padding: '0.5rem', minWidth: '150px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="">Select Block</option>
                {assignmentsList.map((a, i) => <option key={i} value={a.blockName}>{a.blockName}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Subject:</label>
              <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedGrade(''); }} style={{ padding: '0.5rem', minWidth: '150px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedBlock}>
                <option value="">Select Subject</option>
                {assignmentsList?.filter(a => a.blockName === selectedBlock)?.map((a, i) => <option key={i} value={a.subject}>{a.subject}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Grade:</label>
              <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ padding: '0.5rem', minWidth: '130px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedSubject}>
                <option value="">Select Grade</option>
                {assignmentsList?.filter(a => a.blockName === selectedBlock && a.subject === selectedSubject)?.[0]?.grades?.map((g, i) => <option key={i} value={g}>{g}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {loading && <p>Loading data...</p>}
      {message && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontWeight: 'bold' }} className="no-print">{message}</div>}

      {/* TAB 1: SUMMARY DASHBOARD VIEW */}
      {activeTab === 'dashboard' && dashboardData && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', borderTop: '4px solid #0984e3' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>📘 NCERT Track Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Completed:</span>
                <b>{dashboardData.ncertCompleted || 0} / 11 Months</b>
              </div>
              <div style={{ width: '100%', background: '#eee', height: '10px', borderRadius: '5px', overflow: 'hidden', marginTop: '1rem' }}>
                <div style={{ width: `${((dashboardData.ncertCompleted || 0) / 11) * 100}%`, background: '#00b894', height: '100%' }}></div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', borderTop: '4px solid #6c5ce7' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>🚀 IIT Track Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Completed:</span>
                <b>{dashboardData.iitCompleted || 0} / 11 Months</b>
              </div>
              <div style={{ width: '100%', background: '#eee', height: '10px', borderRadius: '5px', overflow: 'hidden', marginTop: '1rem' }}>
                <div style={{ width: `${((dashboardData.iitCompleted || 0) / 11) * 100}%`, background: '#6c5ce7', height: '100%' }}></div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem' }}>
            <h3 style={{ marginTop: '0', marginBottom: '1rem' }}>📋 Monthly Syllabus Track Status</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#2d3436', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Month</th>
                  <th style={{ padding: '10px' }}>NCERT Track Status</th>
                  <th style={{ padding: '10px' }}>IIT Track Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.breakdown?.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.month}</td>
                    <td style={{ padding: '10px' }}>{row.ncertStatus || 'Not Started'}</td>
                    <td style={{ padding: '10px' }}>{row.iitStatus || 'Not Started'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FULL EXCEL SHEET SPREADSHEET VIEW */}
      {activeTab === 'excel-view' && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', overflowX: 'auto' }}>
          <h3 style={{ marginTop: '0', marginBottom: '1rem' }}>📂 Excel Sheet View: {selectedTeacherObj?.teacherName} ({selectedSubject} - {selectedGrade})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#192a56', color: '#fff', textAlign: 'center' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>#</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>MONTH</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT SYLLABUS</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-1</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-2</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-3</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-4</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-5</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>SEC-6</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>NCERT STATUS</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT SYLLABUS</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-1</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-2</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-3</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT_SEC-4</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>IIT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {yearPlan.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{idx + 1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f9f9f9' }}>{row.month}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>{row.ncertSyllabus || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec2}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec3}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec4}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec5}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec6}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{row.ncertStatus}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>{row.iitSyllabus || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec2}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec3}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec4}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{row.iitStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Print Styling */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; color: #000; }
        }
      `}</style>
    </div>
  );
}