import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const STANDARD_MONTHS = [
  'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 
  'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL'
];

export default function TeacherDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherName, setSelectedTeacherName] = useState('');
  const [selectedTeacherObj, setSelectedTeacherObj] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [yearPlanRows, setYearPlanRows] = useState([]);
  const [viewMode, setViewMode] = useState('summary'); // 'summary', 'cards', or 'excel'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const apiHost = (
    import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://physics-teachers-year-plan-tracking-1.onrender.com')
  ).replace(/\/+$/, '');

  // 1. Fetch teachers list on mount (Dropdown remains at default "Select Teacher")
  useEffect(() => {
    axios.get(`${apiHost}/api/teachers`)
      .then(res => {
        const list = res.data.teachers || res.data || [];
        setTeachers(list);
      })
      .catch(err => {
        console.error('Error loading teachers:', err);
        setMessage('❌ Failed to load teachers.');
      });
  }, [apiHost]);

  // Handle teacher selection change
  const handleTeacherChange = (e) => {
    const name = e.target.value;
    setSelectedTeacherName(name);

    if (!name) {
      setSelectedTeacherObj(null);
      setSelectedBlock('');
      setSelectedSubject('');
      setSelectedGrade('');
      setDashboardData(null);
      setYearPlanRows([]);
      return;
    }

    const found = teachers.find(t => t.teacherName === name);
    setSelectedTeacherObj(found || null);

    if (found?.assignments?.[0]) {
      setSelectedBlock(found.assignments[0].blockName);
      setSelectedSubject(found.assignments[0].subject);
      setSelectedGrade(found.assignments[0].grades?.[0] || '');
    } else {
      setSelectedBlock('');
      setSelectedSubject('');
      setSelectedGrade('');
    }
  };

  // 2. Fetch Summary Dashboard Data & robustly map status fields from backend
  useEffect(() => {
    if (!selectedTeacherName) return;

    axios.get(`${apiHost}/api/dashboard/summary?teacherName=${encodeURIComponent(selectedTeacherName)}`)
      .then(res => {
        const resData = res.data || {};
        const apiBreakdown = resData.breakdown || resData.summary || (Array.isArray(resData) ? resData : []) || [];
        
        const breakdownMap = {};
        apiBreakdown.forEach(b => {
          const mName = (b.month || b._id || '').trim().toUpperCase();
          if (mName) breakdownMap[mName] = b;
        });

        const mergedBreakdown = STANDARD_MONTHS.map(m => {
          const existing = breakdownMap[m] || {};
          return {
            month: m,
            ncertStatus: existing.ncertStatus || existing.ncert || existing.status || existing.ncert_status || 'Not Started',
            iitStatus: existing.iitStatus || existing.iit || existing.iit_status || 'Not Started'
          };
        });

        setDashboardData({
          ncertCompleted: resData.ncertCompleted ?? mergedBreakdown.filter(r => r.ncertStatus.toUpperCase() === 'COMPLETED').length,
          iitCompleted: resData.iitCompleted ?? mergedBreakdown.filter(r => r.iitStatus.toUpperCase() === 'COMPLETED').length,
          breakdown: mergedBreakdown
        });
      })
      .catch(err => {
        console.error('Error loading summary dashboard:', err);
        setDashboardData({
          ncertCompleted: 0,
          iitCompleted: 0,
          breakdown: STANDARD_MONTHS.map(m => ({ month: m, ncertStatus: 'Not Started', iitStatus: 'Not Started' }))
        });
      });
  }, [apiHost, selectedTeacherName]);

  // 3. Fetch detailed Year Plan spreadsheet / card rows when selection/filters change
  useEffect(() => {
    if (selectedTeacherName && selectedBlock && selectedSubject && selectedGrade) {
      setLoading(true);
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();
      const teacherParam = `&teacherName=${encodeURIComponent(selectedTeacherName)}`;

      axios.get(`${apiHost}/api/master-plans/submit?blockName=${encodeURIComponent(selectedBlock)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(gradeQuery)}${teacherParam}`)
        .then(res => {
          const fetchedPlan = res.data.yearPlan || res.data || [];
          const planMap = {};
          fetchedPlan.forEach(row => {
            if (row.month) planMap[row.month.trim().toUpperCase()] = row;
          });

          const fullSheetRows = STANDARD_MONTHS.map(monthName => {
            const existingRow = planMap[monthName] || {};
            return {
              month: monthName,
              ncertSyllabus: existingRow.ncertSyllabus || '',
              sec1: existingRow.sec1 || 'Not Started',
              sec2: existingRow.sec2 || 'Not Started',
              sec3: existingRow.sec3 || 'Not Started',
              sec4: existingRow.sec4 || 'Not Started',
              sec5: existingRow.sec5 || 'Not Started',
              sec6: existingRow.sec6 || 'Not Started',
              ncertStatus: existingRow.ncertStatus || existingRow.status || existingRow.ncert_status || 'Not Started',
              iitSyllabus: existingRow.iitSyllabus || '',
              iitSec1: existingRow.iitSec1 || 'Not Started',
              iitSec2: existingRow.iitSec2 || 'Not Started',
              iitSec3: existingRow.iitSec3 || 'Not Started',
              iitSec4: existingRow.iitSec4 || 'Not Started',
              iitStatus: existingRow.iitStatus || existingRow.iit_status || 'Not Started'
            };
          });

          setYearPlanRows(fullSheetRows);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching sheet rows:', err);
          setYearPlanRows(STANDARD_MONTHS.map(m => ({ month: m, ncertSyllabus: '', ncertStatus: 'Not Started', iitSyllabus: '', iitStatus: 'Not Started' })));
          setLoading(false);
        });
    }
  }, [apiHost, selectedTeacherName, selectedBlock, selectedSubject, selectedGrade]);

  const handleExportExcel = () => {
    const exportData = yearPlanRows.map((row, idx) => ({
      '#': idx + 1,
      'MONTH': row.month,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Year Plan Sheet');
    XLSX.writeFile(workbook, `${selectedTeacherName || 'Teacher'}_${selectedSubject}_${selectedGrade}_Sheet.xlsx`);
    setMessage('📥 Excel file downloaded successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeStyle = (status) => {
    const st = (status || '').toLowerCase();
    if (st.includes('completed') || st === 'compliant') {
      return { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
    } else if (st.includes('progress')) {
      return { background: '#cce5ff', color: '#004085', border: '1px solid #b8daff' };
    }
    return { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };
  };

  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* CSS Print Styles to hide controls during printing */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Top Header & View Toggle Toolbar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📊 Teacher Year Plan Management Dashboard</h2>
          <p style={{ color: '#666', margin: '0' }}>Switch between the summary dashboard, monthly cards view, and the full interactive Excel sheet view.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle Buttons */}
          <div style={{ display: 'flex', gap: '8px', background: '#dfe6e9', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => setViewMode('summary')}
              style={{ padding: '8px 16px', background: viewMode === 'summary' ? '#2d3436' : 'transparent', color: viewMode === 'summary' ? '#fff' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              📊 Summary
            </button>
            <button 
              onClick={() => setViewMode('cards')}
              style={{ padding: '8px 16px', background: viewMode === 'cards' ? '#6c5ce7' : 'transparent', color: viewMode === 'cards' ? '#fff' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🗂️ Cards
            </button>
            <button 
              onClick={() => setViewMode('excel')}
              style={{ padding: '8px 16px', background: viewMode === 'excel' ? '#0984e3' : 'transparent', color: viewMode === 'excel' ? '#fff' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              📋 Excel Sheet
            </button>
          </div>

          {/* Print Button */}
          <button 
            onClick={handlePrint}
            style={{ padding: '8px 16px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🖨️ Print View
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', background: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', border: '1px solid #dfe6e9', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Select Teacher:</label>
          <select value={selectedTeacherName} onChange={handleTeacherChange} style={{ padding: '0.5rem', minWidth: '180px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option value="">Select Teacher</option>
            {teachers.map((t, i) => <option key={i} value={t.teacherName}>{t.teacherName}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Block:</label>
          <select value={selectedBlock} onChange={(e) => { setSelectedBlock(e.target.value); setSelectedSubject(''); setSelectedGrade(''); }} style={{ padding: '0.5rem', minWidth: '140px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedTeacherName}>
            <option value="">Select Block</option>
            {assignmentsList.map((a, i) => <option key={i} value={a.blockName}>{a.blockName}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Subject:</label>
          <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedGrade(''); }} style={{ padding: '0.5rem', minWidth: '140px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedBlock}>
            <option value="">Select Subject</option>
            {assignmentsList?.filter(a => a.blockName === selectedBlock)?.map((a, i) => <option key={i} value={a.subject}>{a.subject}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Grade:</label>
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ padding: '0.5rem', minWidth: '120px', borderRadius: '6px', border: '1px solid #ccc' }} disabled={!selectedSubject}>
            <option value="">Select Grade</option>
            {assignmentsList?.filter(a => a.blockName === selectedBlock && a.subject === selectedSubject)?.[0]?.grades?.map((g, i) => <option key={i} value={g}>{g}</option>)}
          </select>
        </div>

        {viewMode === 'excel' && selectedTeacherName && (
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={handleExportExcel} style={{ padding: '8px 16px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              📥 Download Excel
            </button>
          </div>
        )}
      </div>

      {loading && <p>Loading data...</p>}
      {message && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontWeight: 'bold' }} className="no-print">{message}</div>}

      {!selectedTeacherName && (
        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', color: '#666' }}>
          <h3>👆 Please select a teacher from the dropdown above to view tracking details.</h3>
        </div>
      )}

      {/* VIEW 1: SUMMARY DASHBOARD */}
      {selectedTeacherName && viewMode === 'summary' && dashboardData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', borderTop: '4px solid #0984e3' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>📘 NCERT Track Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Completed Months:</span>
                <b>{dashboardData.ncertCompleted || 0} / 11</b>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', borderTop: '4px solid #6c5ce7' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>🚀 IIT Track Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Completed Months:</span>
                <b>{dashboardData.iitCompleted || 0} / 11</b>
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
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block', ...getStatusBadgeStyle(row.ncertStatus) }}>
                        {row.ncertStatus || 'Not Started'}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block', ...getStatusBadgeStyle(row.iitStatus) }}>
                        {row.iitStatus || 'Not Started'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY CARDS VIEW */}
      {selectedTeacherName && viewMode === 'cards' && (
        <div>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            <h3 style={{ margin: '0', color: '#2d3436' }}>🗂️ Monthly Cards View: {selectedTeacherName} — {selectedSubject} ({selectedGrade})</h3>
          </div>

          {yearPlanRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', color: '#666' }}>
              No plan data available for the selected assignment.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {yearPlanRows.map((item, index) => (
                <div key={index} style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                  <div style={{ background: '#f8f9fa', padding: '12px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#2d3436', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📅 {item.month}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500' }}>Month #{index + 1}</span>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                    {/* NCERT Track */}
                    <div style={{ borderBottom: '1px solid #f1f2f6', paddingBottom: '10px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0984e3', marginBottom: '4px', letterSpacing: '0.5px' }}>📘 NCERT TRACK</div>
                      <div style={{ color: '#2d3436', fontWeight: '500', minHeight: '1.4rem', marginBottom: '8px' }}>
                        {item.ncertSyllabus || <span style={{ color: '#b2bec3', fontStyle: 'italic' }}>No syllabus assigned</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: '#666' }}>Status:</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', ...getStatusBadgeStyle(item.ncertStatus) }}>
                          {item.ncertStatus || 'Not Started'}
                        </span>
                      </div>
                    </div>

                    {/* IIT Track */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6c5ce7', marginBottom: '4px', letterSpacing: '0.5px' }}>🚀 IIT TRACK</div>
                      <div style={{ color: '#2d3436', fontWeight: '500', minHeight: '1.4rem', marginBottom: '8px' }}>
                        {item.iitSyllabus || <span style={{ color: '#b2bec3', fontStyle: 'italic' }}>No IIT syllabus assigned</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: '#666' }}>Status:</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', ...getStatusBadgeStyle(item.iitStatus) }}>
                          {item.iitStatus || 'Not Started'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: INTERACTIVE EXCEL SPREADSHEET */}
      {selectedTeacherName && viewMode === 'excel' && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            <h3 style={{ margin: '0', color: '#2d3436' }}>📋 Spreadsheet View: {selectedTeacherName} — {selectedSubject} ({selectedGrade})</h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
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
              {yearPlanRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                  <td style={{ padding: '6px', border: '1px solid #ddd', background: '#fafafa' }}>{idx + 1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f1f2f6' }}>{row.month}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', minWidth: '180px' }}>{row.ncertSyllabus || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec2}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec3}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec4}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec5}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.sec6}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', color: row.ncertStatus.toUpperCase() === 'COMPLETED' ? '#27ae60' : '#d35400' }}>{row.ncertStatus}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', minWidth: '180px' }}>{row.iitSyllabus || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec2}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec3}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{row.iitSec4}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', color: row.iitStatus.toUpperCase() === 'COMPLETED' ? '#27ae60' : '#d35400' }}>{row.iitStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}