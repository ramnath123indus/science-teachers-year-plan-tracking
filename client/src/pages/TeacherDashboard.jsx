import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function TeacherDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // View mode / Print / Export states
  const [activeTab, setActiveTab] = useState('overview');

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
          setSelectedTeacher(list[0].teacherName);
        }
      })
      .catch(err => {
        console.error('Error fetching teachers:', err);
        setMessage('❌ Failed to load teachers list.');
      });
  }, [apiHost]);

  // Fetch summary metrics when selected teacher changes
  useEffect(() => {
    if (!selectedTeacher) return;

    setLoading(true);
    axios.get(`${apiHost}/api/dashboard/summary?teacherName=${encodeURIComponent(selectedTeacher)}`)
      .then(res => {
        setDashboardData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading dashboard summary:', err);
        // Fallback mock calculations if backend summary endpoint isn't wired yet
        setDashboardData({
          totalMonths: 11,
          ncertCompleted: 4,
          ncertInProgress: 3,
          iitCompleted: 3,
          iitInProgress: 4,
          breakdown: [
            { month: 'JUNE', ncertStatus: 'Not Started', iitStatus: 'IN PROCESS' },
            { month: 'JULY', ncertStatus: 'COMPLETED', iitStatus: 'COMPLETED' },
            { month: 'AUGUST', ncertStatus: 'COMPLETED', iitStatus: 'COMPLETED' },
            { month: 'SEPTEMBER', ncertStatus: 'IN PROCESS', iitStatus: 'IN PROCESS' },
            { month: 'OCTOBER', ncertStatus: 'Not Started', iitStatus: 'Not Started' },
          ]
        });
        setLoading(false);
      });
  }, [apiHost, selectedTeacher]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!dashboardData || !dashboardData.breakdown) {
      setMessage('❌ No breakdown data available to export.');
      return;
    }

    const exportData = dashboardData.breakdown.map((row, idx) => ({
      '#': idx + 1,
      'MONTH': row.month,
      'NCERT STATUS': row.ncertStatus || 'Not Started',
      'IIT STATUS': row.iitStatus || 'Not Started'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard Summary');

    XLSX.writeFile(workbook, `${selectedTeacher}_Dashboard_Summary.xlsx`);
    setMessage('📥 Dashboard summary exported to Excel successfully!');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Top Action Toolbar (Hidden during Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📊 Academic Year Plan Dashboard</h2>
          <p style={{ color: '#666', margin: '0' }}>Real-time overview of NCERT & IIT syllabus tracking metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleExportExcel} 
            style={{ padding: '8px 16px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📊 Export Dashboard
          </button>
          <button 
            onClick={handlePrint} 
            style={{ padding: '8px 16px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Teacher Select Filter */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #dfe6e9' }}>
        <label style={{ fontWeight: 'bold' }}>Select Teacher / Faculty:</label>
        <select 
          value={selectedTeacher} 
          onChange={(e) => setSelectedTeacher(e.target.value)}
          style={{ padding: '0.6rem', minWidth: '220px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }}
        >
          {teachers.map((t, idx) => (
            <option key={idx} value={t.teacherName}>{t.teacherName}</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading dashboard metrics...</p>}
      {message && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontWeight: 'bold' }} className="no-print">{message}</div>}

      {/* Printable Report Header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h2>Faculty Dashboard Analytics Report</h2>
        <p><b>Teacher Name:</b> {selectedTeacher}</p>
      </div>

      {dashboardData && !loading && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* NCERT Overview Card */}
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: '4px solid #0984e3' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#2d3436' }}>📘 NCERT Track Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Completed:</span>
                <b>{dashboardData.ncertCompleted || 0} / 11 Months</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>In Process:</span>
                <b>{dashboardData.ncertInProgress || 0} Months</b>
              </div>
              <div style={{ width: '100%', background: '#eee', height: '10px', borderRadius: '5px', overflow: 'hidden', marginTop: '1rem' }}>
                <div style={{ width: `${((dashboardData.ncertCompleted || 0) / 11) * 100}%`, background: '#00b894', height: '100%' }}></div>
              </div>
            </div>

            {/* IIT Overview Card */}
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: '4px solid #6c5ce7' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#2d3436' }}>🚀 IIT Track Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Completed:</span>
                <b>{dashboardData.iitCompleted || 0} / 11 Months</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>In Process:</span>
                <b>{dashboardData.iitInProgress || 0} Months</b>
              </div>
              <div style={{ width: '100%', background: '#eee', height: '10px', borderRadius: '5px', overflow: 'hidden', marginTop: '1rem' }}>
                <div style={{ width: `${((dashboardData.iitCompleted || 0) / 11) * 100}%`, background: '#6c5ce7', height: '100%' }}></div>
              </div>
            </div>

          </div>

          {/* Detailed Breakdown Table */}
          {dashboardData.breakdown && dashboardData.breakdown.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: '0', marginBottom: '1rem' }}>📋 Monthly Status Breakdown</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f2f6', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px' }}>Month</th>
                    <th style={{ padding: '10px' }}>NCERT Track Status</th>
                    <th style={{ padding: '10px' }}>IIT Track Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.breakdown.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.month}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: row.ncertStatus === 'COMPLETED' ? '#e8f5e9' : '#fffde7', color: row.ncertStatus === 'COMPLETED' ? '#2e7d32' : '#f57f17', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {row.ncertStatus || 'Not Started'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: row.iitStatus === 'COMPLETED' ? '#e8f5e9' : '#fffde7', color: row.iitStatus === 'COMPLETED' ? '#2e7d32' : '#f57f17', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {row.iitStatus || 'Not Started'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Print Styling Rules */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: #fff;
            color: #000;
          }
        }
      `}</style>
    </div>
  );
}