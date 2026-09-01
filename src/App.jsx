import { FinancialPrivacyProvider } from '@/lib/FinancialPrivacyContext';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { I18nProvider } from '@/lib/i18n';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import EmployeePortal from '@/pages/EmployeePortal';
import EmployeeRequests from '@/pages/EmployeeRequests';
import Dashboard from '@/pages/Dashboard';
import Employees from '@/pages/Employees';
import EmployeeDetail from '@/pages/EmployeeDetail';
import Attendance from '@/pages/Attendance';
import Leave from '@/pages/Leave';
import Departments from '@/pages/Departments';
import Profile from '@/pages/Profile';
import Payroll from '@/pages/Payroll';
import Allowances from '@/pages/Allowances';
import Settings from '@/pages/Settings';
import Contracts from '@/pages/Contracts';
import Branches from '@/pages/Branches';
import Shifts from '@/pages/Shifts';
import Reports from '@/pages/Reports';
import LeavePolicies from '@/pages/LeavePolicies';
import Devices from '@/pages/Devices';
import Announcements from '@/pages/Announcements';
import UsersManagement from '@/pages/UsersManagement';
import EndOfService from '@/pages/EndOfService';
import RewardsPenalties from '@/pages/RewardsPenalties';
import DocumentsPrint from '@/pages/DocumentsPrint';
import Evaluations from '@/pages/Evaluations';
import PrintTemplates from '@/pages/PrintTemplates';
import ImportData from '@/pages/ImportData';
import ApprovalsCenter from '@/pages/ApprovalsCenter';
import AlertsCenter from '@/pages/AlertsCenter';
import MyRequests from '@/pages/MyRequests';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0B1F3A] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          {/* Main Dashboard is ALWAYS accessible at root / */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/portal" element={<EmployeePortal />} />
        <Route path="/requests" element={<EmployeeRequests />} />
        <Route path="/advances" element={<EmployeeRequests />} />
          
          {/* Core Administrative & Operational Pages */}
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/employee-profile" element={<EmployeeDetail />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/allowances" element={<Allowances />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/leave-policies" element={<LeavePolicies />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/end-of-service" element={<EndOfService />} />
          <Route path="/rewards-penalties" element={<RewardsPenalties />} />
          <Route path="/documents-print" element={<DocumentsPrint />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/print-templates" element={<PrintTemplates />} />
          <Route path="/import-data" element={<ImportData />} />
          <Route path="/approvals" element={<ApprovalsCenter />} />
          <Route path="/alerts" element={<AlertsCenter />} />
          <Route path="/my-requests" element={<MyRequests />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
        </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <FinancialPrivacyProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
            <Toaster />
          </Router>
        </QueryClientProvider>
      </I18nProvider>
    </FinancialPrivacyProvider>
    </AuthProvider>
  )
}

export default App;
