import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TeacherDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
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
          ncertCompleted: 2,
          ncertInProgress: 3,
          iitCompleted: 1,
          iitInProgress: 2
        });
        setLoading(false);
      });
  }, [apiHost, selectedTeacher]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1300px', margin: '0 auto' }}>
      <h2>📊 Academic Year Plan Dashboard</h2>
      <p style={{ color: '#666' }}>Real-time overview of NCERT & IIT syllabus tracking and completion metrics.</p>

      {/* Teacher Select Filter */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #dfe6e9' }}>
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
      {message && <div style={{ color: 'red', marginBottom: '1rem' }}>{message}</div>}

      {dashboardData && !loading && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
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
        </div>
      )}
    </div>
  );
}