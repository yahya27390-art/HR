import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@/index.css'

// One-time purge of stale/synthetic attendance records from browser localStorage
try {
  const purgeKey = 'hr_att_purge_v3';
  if (!localStorage.getItem(purgeKey)) {
    localStorage.removeItem('hr_flow_AttendanceLog');
    localStorage.removeItem('hr_flow_attendance_logs');
    localStorage.setItem(purgeKey, 'true');
  }
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
