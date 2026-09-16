import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BotDashboard from './pages/BotDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DataDeletion from './pages/DataDeletion';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BotDashboard />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/data-deletion" element={<DataDeletion />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
