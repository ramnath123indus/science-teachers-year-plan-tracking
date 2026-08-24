import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const STANDARD_MONTHS = [
  'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 
  'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL'
];

export default function TeacherYearPlanView() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherObj, setSelectedTeacherObj] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  const [yearPlan, setYearPlan] = useState([]);
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

  // Fetch Year Plan data when filters change
  useEffect(() => {
    if (selectedTeacherObj && selectedBlock && selectedSubject && selectedGrade) {
      const gradeQuery = String(selectedGrade).replace(/Grade\s*/i, '').trim();
      setLoading(true);
      setMessage('');

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
              iitStatus: existingRow.iitStatus || 'Not Started'
            };
          });

          setYearPlan(processedPlan);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading plan view:', err);
          setLoading(false);
        });
    } else {
      setYearPlan([]);
    }
  }, [apiHost, selectedTeacherObj, selectedBlock, selectedSubject, selectedGrade]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!yearPlan.length) return;
    const exportData = yearPlan.map((row, idx) => ({
      '#': idx + 1,
      'MONTH': row.month,
      'NCERT SYLLABUS': row.ncertSyllabus || '',
      'NCERT STATUS': row.ncertStatus || '',
      'IIT SYLLABUS': row.iitSyllabus || '',
      'IIT STATUS': row.iitStatus || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teacher Year Plan');
    XLSX.writeFile(workbook, `${selectedTeacherObj?.teacherName}_${selectedSubject}_${selectedGrade}_YearPlan.xlsx`);
    setMessage('📥 Year plan exported to Excel successfully!');
  };

  const getStatusBadgeStyle = (status) => {
    const upper = (status || '').toUpperCase();
    if (upper === 'COMPLETED') return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
    if (upper.includes('PROCESS')) return { background: '#fffde7', color: '#f57f17', border: '1px solid #ffe082' };
    return { background: '#f5f5f5', color: '#757575', border: '1px solid #e0e0e0' };
  };

  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Top Header & Toolbar (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📖 Teacher Academic Year Plan View</h2>
          <p style={{ color: '#666', margin: '0' }}>Inspect monthly syllabus breakdown, topics, and completion status for the selected teacher.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportExcel} style={{ padding: '9px 16px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            📊 Export to Excel
          </button>
          <button onClick={handlePrint} style={{ padding: '9px 16px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            🖨️ Print Plan
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', background: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', border: '1px solid #dfe6e9', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Teacher:</label>
          <select value={selectedTeacherObj?.teacherName || ''} onChange={(e) => {
            const found = teachers.find(t => t.teacherName === e.target.value);
            setSelectedTeacherObj(found || null);
            if (found?.assignments?.[0]) {
              setSelectedBlock(found.assignments[0].blockName);
              setSelectedSubject(found.assignments[0].subject);
              setSelectedGrade(found.assignments[0].grades?.[0] || '');
            }
          }} style={{ padding: '0.5rem', minWidth: '180px', borderRadius: '6px', border: '1px solid #ccc' }}>
            {teachers.map((t, i) => <option key={i} value={t.teacherName}>{t.teacherName}</option>)}
          </select>
        </div>

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
      </div>

      {loading && <p>Loading academic year plan...</p>}
      {message && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontWeight: 'bold' }} className="no-print">{message}</div>}

      {/* Printable Header Info */}
      <div className="print-only" style={{ display: 'none', marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h2>Teacher Academic Year Plan Report</h2>
        <p><b>Teacher:</b> {selectedTeacherObj?.teacherName} | <b>Block:</b> {selectedBlock} | <b>Subject:</b> {selectedSubject} | <b>Grade:</b> {selectedGrade}</p>
      </div>

      {/* Year Plan Cards Grid View */}
      {yearPlan.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {yearPlan.map((row, index) => (
            <div key={index} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderLeft: '5px solid #0984e3' }}>
              
              {/* Month Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2d3436' }}>📅 {row.month}</span>
                <span style={{ fontSize: '0.75rem', color: '#777' }}>Month #{index + 1}</span>
              </div>

              {/* NCERT Section */}
              <div style={{ marginBottom: '10px', background: '#f8f9fa', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0984e3', textTransform: 'uppercase', marginBottom: '4px' }}>📘 NCERT Track</div>
                <div style={{ fontSize: '0.9rem', color: '#333', fontWeight: '500', marginBottom: '6px' }}>
                  {row.ncertSyllabus ? row.ncertSyllabus : <span style={{ color: '#aaa', fontStyle: 'italic' }}>No syllabus assigned</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span>Status:</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', ...getStatusBadgeStyle(row.ncertStatus) }}>
                    {row.ncertStatus || 'Not Started'}
                  </span>
                </div>
              </div>

              {/* IIT Section */}
              <div style={{ background: '#f8f9fa', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6c5ce7', textTransform: 'uppercase', marginBottom: '4px' }}>🚀 IIT Track</div>
                <div style={{ fontSize: '0.9rem', color: '#333', fontWeight: '500', marginBottom: '6px' }}>
                  {row.iitSyllabus ? row.iitSyllabus : <span style={{ color: '#aaa', fontStyle: 'italic' }}>No IIT syllabus assigned</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span>Status:</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', ...getStatusBadgeStyle(row.iitStatus) }}>
                    {row.iitStatus || 'Not Started'}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Print Styling */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff; color: #000; }
        }
      `}</style>
    </div>
  );
}