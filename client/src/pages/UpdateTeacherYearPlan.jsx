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
            const existingRow = planMap[monthName] || fetchedPlan[STANDARD_MONTHS.indexOf(monthName)] || {};
            return {
              ...existingRow,
              month: monthName,
              ncertSyllabus: existingRow.ncertSyllabus || '',
              ncertStatus: existingRow.ncertStatus || 'Not Started',
              iitSyllabus: existingRow.iitSyllabus || '',
              iitStatus: existingRow.iitStatus || 'Not Started',
              
              section1: existingRow.section1 || 'Not Started',
              section2: existingRow.section2 || 'Not Started',
              section3: existingRow.section3 || 'Not Started',
              section4: existingRow.section4 || 'Not Started',
              section5: existingRow.section5 || 'Not Started',
              section6: existingRow.section6 || 'Not Started',

              iitSection1: existingRow.iitSection1 || 'Not Started',
              iitSection2: existingRow.iitSection2 || 'Not Started',
              iitSection3: existingRow.iitSection3 || 'Not Started'
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
            ncertStatus: 'Not Started',
            iitSyllabus: '',
            iitStatus: 'Not Started',
            section1: 'Not Started',
            section2: 'Not Started',
            section3: 'Not Started',
            section4: 'Not Started',
            section5: 'Not Started',
            section6: 'Not Started',
            iitSection1: 'Not Started',
            iitSection2: 'Not Started',
            iitSection3: 'Not Started'
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
      const serverErrorMsg = err.response?.data?.error || err.message;
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
    } else if (upper === 'NOT STARTED' || upper === 'NOT STARTED') {
      bg = '#f5f5f5';
      color = '#616161';
    }

    return {
      width: '100%',
      padding: '5px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      background: bg,
      fontWeight: 'bold',
      color: color,
      fontSize: '0.8rem'
    };
  };

  const assignmentsList = selectedTeacherObj?.assignments || [];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, sans-serif', maxWidth: '1700px', margin: '0 auto' }}>
      <h2>📝 Teacher Year Plan Management (Dual Track Sections)</h2>

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
                {yearPlan.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', background: '#f9f9f9' }}>{row.month}</td>

                    {/* NCERT Syllabus */}
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                      <input type="text" value={row.ncertSyllabus || ''} disabled={mode === 'view'} onChange={(e) => handleInputChange(index, 'ncertSyllabus', e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '0.8rem' }} />
                    </td>

                    {/* NCERT Sections 1 to 6 */}
                    {['section1', 'section2', 'section3', 'section4', 'section5', 'section6'].map((secField) => (
                      <td key={secField} style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <select value={row[secField] || 'Not Started'} disabled={mode === 'view'} onChange={(e) => handleInputChange(index, secField, e.target.value)} style={getDropdownStyle(row[secField])}>
                          <option value="Not Started">Not Started</option>
                          <option value="In Process">In Process</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    ))}

                    {/* NCERT Status */}
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                      <select value={row.ncertStatus || 'Not Started'} disabled={mode === 'view'} onChange={(e) => handleInputChange(index, 'ncertStatus', e.target.value)} style={getDropdownStyle(row.ncertStatus)}>
                        <option value="Not Started">Not Started</option>
                        <option value="In Process">In Process</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>

                    {/* IIT Syllabus */}
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                      <input type="text" value={row.iitSyllabus || ''} disabled={mode === 'view'} onChange={(e) => handleInputChange(index, 'iitSyllabus', e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '0.8rem' }} />
                    </td>

                    {/* IIT Sections 1 to 3 */}
                    {['iitSection1', 'iitSection2', 'iitSection3'].map((secField) => (
                      <td key={secField} style={{ padding: '6px', border: '1px solid #ddd' }}>
                        <select value={row[secField] || 'Not Started'} disabled={mode === 'view'} onChange={(e) => handleInputChange(index, secField, e.target.value)} style={getDropdownStyle(row[secField])}>
                          <option value="Not Started">Not Started</option>
                          <option value="In Process">In Process</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    ))}

                    {/* IIT Status */}
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                      <select value={row.iitStatus || 'Not Started'} disabled={mode === 'view'} onChange={(e) => handleInputChange(index, 'iitStatus', e.target.value)} style={getDropdownStyle(row.iitStatus)}>
                        <option value="Not Started">Not Started</option>
                        <option value="In Process">In Process</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mode === 'edit' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSavePlan} disabled={saving} style={{ padding: '12px 30px', background: '#0984e3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}