import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { computeEmployeePayroll, getAdvances } from '@/lib/payrollEngine';
import { getUnifiedRequests, saveUnifiedRequest, REQUEST_TYPES } from '@/lib/requestsEngine';
import { getCompanyProfile } from '@/lib/companyProfile';
import { getEmployeeContract, initializeUnifiedContracts } from '@/lib/contractsEngine';
import ContractViewerModal from '@/components/ContractViewerModal';
import ResignationNoticeModal from '@/components/ResignationNoticeModal';
import PayslipPrint from '@/components/PayslipPrint';
import ExecutiveAnnouncementTicker from '@/components/ExecutiveAnnouncementTicker';
import { getStoredEvaluations, getEvaluationTier, STANDARD_EVALUATION_CRITERIA, PURCHASING_EVALUATION_CRITERIA } from '@/lib/evaluationsEngine';
import { printEvaluationDocument } from '@/lib/evaluationPrintEngine';
import {
  Home,
  Clock,
  FileText,
  Wallet,
  Star,
  FolderOpen,
  User,
  PlusCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock4,
  XCircle,
  Building2,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Sparkles,
  MapPin,
  Briefcase,
  IdCard,
  CreditCard,
  Palmtree,
  CalendarX,
  RotateCw,
  Award,
  CalendarPlus,
  UserCheck,
  HelpCircle,
  Phone,
  Mail,
  FileCheck,
  Scale,
  Eye
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

import { useNavigate } from 'react-router-dom';
import { isSpecializedRole, getSpecializedRoleInfo } from '@/components/DashboardViewSwitcherBar';

export default function EmployeePortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'attendance' | 'requests' | 'payroll' | 'performance' | 'documents' | 'account'
  const [currentEmp, setCurrentEmp] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [empContract, setEmpContract] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [newRequestModal, setNewRequestModal] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState('annual_leave');
  const [selectedForPayslip, setSelectedForPayslip] = useState(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [resignationModalOpen, setResignationModalOpen] = useState(false);

  // Request Form State
  const [reqForm, setReqForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    amount: '',
    installments: 1,
    reason: '',
    checkInTime: '09:00',
    checkOutTime: '17:00',
    targetShift: '',
    targetBranch: '',
    targetDept: '',
    notes: ''
  });

  // Attendance Filter - Default dynamically to current month (e.g. 2026-09)
  const [attMonth, setAttMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Load Data with Strict Employee Isolation
  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true);
        const [emps, logs, shs] = await Promise.all([
          base44.entities.Employee.list(),
          base44.entities.AttendanceLog.list('-log_date', 3000),
          base44.entities.Shift.list()
        ]);

        // Strict Match: Logged-in user employee record ONLY
        const clean = (v) => String(v || '').replace('emp_', '').trim();
        const matched = emps.find(e => 
          clean(e.id) === clean(user?.id) ||
          clean(e.employee_number) === clean(user?.employee_number) ||
          (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
        ) || emps[0]; // Fallback if admin

        setCurrentEmp(matched);
        setShifts(shs || []);

        // Filter logs strictly for this employee only!
        const empNum = String(matched?.employee_number || matched?.id || '').replace('emp_', '');
        const empLogs = (logs || []).filter(l => clean(l.employee_number || l.employee_id || l.user_id) === empNum);
        setAttendanceLogs(empLogs);

        // Load unified requests for this employee only
        const allReqs = getUnifiedRequests();
        const myReqs = allReqs.filter(r => clean(r.employee_number || r.employee_id) === empNum);
        setRequestsList(myReqs);

        // Load unified contracts
        const unifiedContracts = await initializeUnifiedContracts(emps);
        const foundContract = unifiedContracts.find(c => clean(c.employee_number || c.employee_id) === empNum);
        setEmpContract(foundContract || null);

      } catch (e) {
        console.error('Error loading portal data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadPortalData();

    const handleReqUpdate = () => {
      if (currentEmp) {
        const clean = (v) => String(v || '').replace('emp_', '').trim();
        const empNum = clean(currentEmp.employee_number || currentEmp.id);
        const allReqs = getUnifiedRequests();
        setRequestsList(allReqs.filter(r => clean(r.employee_number || r.employee_id) === empNum));
      }
    };

    const handleContractUpdate = () => {
      if (currentEmp) {
        const clean = (v) => String(v || '').replace('emp_', '').trim();
        const empNum = clean(currentEmp.employee_number || currentEmp.id);
        const c = getEmployeeContract(empNum);
        if (c) setEmpContract(c);
      }
    };

    window.addEventListener('hr_requests_updated', handleReqUpdate);
    window.addEventListener('hr_contracts_updated', handleContractUpdate);
    return () => {
      window.removeEventListener('hr_requests_updated', handleReqUpdate);
      window.removeEventListener('hr_contracts_updated', handleContractUpdate);
    };
  }, [user]);

  // Today's attendance calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = useMemo(() => {
    return attendanceLogs.find(l => l.log_date === todayStr) || null;
  }, [attendanceLogs, todayStr]);

  // Current Month Payroll calculation
  const currentMonthPayroll = useMemo(() => {
    if (!currentEmp) return null;
    return computeEmployeePayroll(currentEmp, attendanceLogs, shifts, { monthPrefix: attMonth });
  }, [currentEmp, attendanceLogs, shifts, attMonth]);

  // Filtered attendance for selected month
  const monthlyLogs = useMemo(() => {
    return attendanceLogs
      .filter(l => (l.log_date || '').startsWith(attMonth))
      .sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
  }, [attendanceLogs, attMonth]);

  // Handle Request Submission
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!currentEmp) return;

    const reqMeta = REQUEST_TYPES[Object.keys(REQUEST_TYPES).find(k => REQUEST_TYPES[k].id === selectedRequestType)] || REQUEST_TYPES.OTHER;

    const payload = {
      type: selectedRequestType,
      employee_id: currentEmp.id,
      employee_number: currentEmp.employee_number,
      employee_name: currentEmp.full_name,
      branch_name: currentEmp.branch_name || currentEmp.branch,
      reason: reqForm.reason || reqMeta.label,
      details: {
        ...reqForm,
        request_label: reqMeta.label
      }
    };

    saveUnifiedRequest(payload, user);
    setNewRequestModal(false);
    toast({
      title: '✓ تم تقديم الطلب بنجاح',
      description: `تم إرسال ${reqMeta.label} لإدارة الموارد البشرية للمراجعة.`
    });

    // Reset Form
    setReqForm({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      amount: '',
      installments: 1,
      reason: '',
      checkInTime: '09:00',
      checkOutTime: '17:00',
      targetShift: '',
      targetBranch: '',
      targetDept: '',
      notes: ''
    });
  };

  if (loading || !currentEmp) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isContractPendingSignature = empContract && !empContract.signed_by_employee;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24 text-right" dir="rtl">
      
      {/* ─── 1. TOP PROFILE CARD (MATCHING REFERENCE MOCKUP) ────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          {/* User Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center font-heading font-black text-lg sm:text-xl shadow-md shadow-teal-500/20 shrink-0">
              {currentEmp.full_name?.slice(0, 2) || 'مو'}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {currentEmp.full_name}
              </h1>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                <span>{currentEmp.job_title || 'موظف'}</span>
                <span>•</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{currentEmp.branch_name || currentEmp.branch || 'الفرع الرئيسي'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isSpecializedRole(user?.role) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (user?.id) localStorage.setItem('hr_dashboard_view_mode_' + user.id, 'specialized');
                  navigate('/');
                }}
                className="hidden sm:flex text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800 text-xs font-bold rounded-xl h-9 px-3 gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>لوحة القيادة</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setNewRequestModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 sm:h-10 px-3 sm:px-4 rounded-xl gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب جديد</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── URGENT CONTRACT SIGNING ALERT (1-LINE SLEEK BANNER) ─────────────── */}
      {isContractPendingSignature && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
              عقد العمل بانتظار توقيعك
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setContractModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl h-8 px-3 shrink-0 shadow-xs"
          >
            توقيع الآن ➔
          </Button>
        </div>
      )}

      {/* ─── 2. DESKTOP NAVIGATION TABS ───────────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border overflow-x-auto">
        {[
          { id: 'home', label: 'الرئيسية', icon: Home },
          { id: 'attendance', label: 'حضوري وساعاتي', icon: Clock },
          { id: 'requests', label: 'مركز طلباتي', icon: FileText, count: requestsList.length },
          { id: 'payroll', label: 'قسائم الرواتب', icon: Wallet },
          { id: 'performance', label: 'تقييم الأداء', icon: Star },
          { id: 'documents', label: 'عقد العمل ووثائقي', icon: FolderOpen },
          { id: 'account', label: 'ملفي وبياناتي', icon: User }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center justify-center font-mono">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── 3. TAB 1: HOME (MATCHING REFERENCE MOCKUP) ────────────────────── */}
      {activeTab === 'home' && (
        <div className="space-y-4">
          
          {/* Quick Services Grid - Direct Match to 2-Column Mobile App Mockup */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              {
                label: 'طلب إجازة',
                icon: Palmtree,
                iconClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40',
                onClick: () => {
                  setSelectedRequestType('annual_leave');
                  setNewRequestModal(true);
                }
              },
              {
                label: 'طلب استئذان',
                icon: Clock4,
                iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40',
                onClick: () => {
                  setSelectedRequestType('permission');
                  setNewRequestModal(true);
                }
              },
              {
                label: 'سجل الحضور',
                icon: Clock,
                iconClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40',
                onClick: () => setActiveTab('attendance')
              },
              {
                label: 'قسيمة الراتب',
                icon: Wallet,
                iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
                onClick: () => setActiveTab('payroll')
              },
              {
                label: 'طلب سلفة',
                icon: CreditCard,
                iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40',
                onClick: () => {
                  setSelectedRequestType('loan');
                  setNewRequestModal(true);
                }
              },
              {
                label: 'عقد العمل',
                icon: Scale,
                iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40',
                onClick: () => setContractModalOpen(true)
              },
              {
                label: 'مركز طلباتي',
                icon: FileText,
                iconClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40',
                count: requestsList.length,
                onClick: () => setActiveTab('requests')
              },
              {
                label: 'تقييم الأداء',
                icon: Award,
                iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40',
                onClick: () => setActiveTab('performance')
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/60 hover:shadow-md rounded-2xl p-3 sm:p-3.5 flex items-center justify-between text-right transition-all group active:scale-98 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.iconClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 group-hover:text-teal-600 transition-colors block truncate">
                        {item.label}
                      </span>
                    </div>
                  </div>
                  {item.count !== undefined && item.count > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {item.count}
                    </span>
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-teal-500 group-hover:-translate-x-0.5 transition-all shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Today's Punch Live Status Card (Ultra Clean & Minimal Words) */}
          <Card className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <h2 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  دوام اليوم <span className="font-mono text-slate-400 font-normal text-xs">({todayStr})</span>
                </h2>
              </div>
              <Badge className={todayLog?.status === 'present' ? 'bg-emerald-100 text-emerald-800 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>
                {todayLog?.status === 'present' ? 'حاضر ✓' : 'قيد الانتظار'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[10.5px] text-slate-400 font-medium">الدخول</div>
                <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 mt-0.5">
                  {todayLog?.period_1_in || (todayLog?.check_in ? (todayLog.check_in.includes('T') ? todayLog.check_in.slice(11, 16) : todayLog.check_in.slice(0, 5)) : '--:--')}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[10.5px] text-slate-400 font-medium">الخروج</div>
                <div className="text-sm sm:text-base font-bold font-mono text-blue-600 mt-0.5">
                  {todayLog?.period_2_out || todayLog?.period_1_out || (todayLog?.check_out ? (todayLog.check_out.includes('T') ? todayLog.check_out.slice(11, 16) : todayLog.check_out.slice(0, 5)) : '--:--')}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[10.5px] text-slate-400 font-medium">المنجز</div>
                <div className="text-sm sm:text-base font-bold font-mono text-purple-600 mt-0.5">
                  {todayLog?.total_hours || 0} س
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Attendance Quick Stats (Compact Chips) */}
          {currentMonthPayroll && (
            <Card className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    ملخص الشهر
                  </span>
                </div>
                <input
                  type="month"
                  value={attMonth}
                  onChange={(e) => setAttMonth(e.target.value)}
                  className="h-7 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">حضور</div>
                  <div className="text-base font-black font-mono text-emerald-600 mt-0.5">
                    {currentMonthPayroll.presentDays || 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">جمعات</div>
                  <div className="text-base font-black font-mono text-blue-600 mt-0.5">
                    {currentMonthPayroll.fridayWorkedDays || 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">غياب</div>
                  <div className="text-base font-black font-mono text-rose-600 mt-0.5">
                    {currentMonthPayroll.absentDays || 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">تأخير</div>
                  <div className="text-sm font-black font-mono text-amber-600 mt-0.5">
                    {Math.floor((currentMonthPayroll.totalShortfallMinutes || 0) / 60)}س
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Requests Section (Minimal & Concise) */}
          {requestsList.length > 0 && (
            <Card className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">أحدث الطلبات</span>
                </div>
                <button onClick={() => setActiveTab('requests')} className="text-xs text-teal-600 font-bold hover:underline">
                  الكل ➔
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {requestsList.slice(0, 2).map(req => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{req.details?.request_label || req.type}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.request_number}</div>
                    </div>
                    <Badge className={
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-800 text-[10px]' :
                      req.status === 'rejected' ? 'bg-rose-100 text-rose-800 text-[10px]' : 'bg-amber-100 text-amber-800 text-[10px]'
                    }>
                      {req.status === 'approved' ? 'معتمد' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      )}

      {/* Back Button for Child Tabs */}
      {activeTab !== 'home' && (
        <div className="flex items-center justify-between pb-1">
          <button
            onClick={() => setActiveTab('home')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-xs transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للخدمات الرئيسية</span>
          </button>
        </div>
      )}

      {/* ─── 4. TAB 2: MY ATTENDANCE ────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 className="font-heading font-black text-lg text-foreground">سجل الحضور والبصمات التفصيلي</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">اختر الشهر:</span>
              <Input
                type="month"
                value={attMonth}
                onChange={(e) => setAttMonth(e.target.value)}
                className="w-40 h-9 text-xs font-mono rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b font-heading font-bold text-foreground">
                  <th className="py-3 px-3">التاريخ</th>
                  <th className="py-3 px-2">اليوم</th>
                  <th className="py-3 px-3 text-emerald-700 dark:text-emerald-400">الفترة النهارية (دخول ➔ خروج)</th>
                  <th className="py-3 px-3 text-blue-700 dark:text-blue-400">الفترة المسائية (دخول ➔ خروج)</th>
                  <th className="py-3 px-2">المطلوب</th>
                  <th className="py-3 px-2 text-purple-700">إجمالي الفعلي</th>
                  <th className="py-3 px-3">الفارق (عجز / زيادة)</th>
                  <th className="py-3 px-2 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {monthlyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                      لا توجد سجلات بصمة مسجلة لهذا الشهر.
                    </td>
                  </tr>
                ) : (
                  monthlyLogs.map(log => {
                    const dateObj = new Date(log.log_date);
                    const dayName = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
                    return (
                      <tr key={log.id || log.log_date} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-mono font-bold">{log.log_date}</td>
                        <td className="py-3 px-2 text-muted-foreground font-semibold">{dayName}</td>
                        <td className="py-3 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                          {log.period_1_in ? `${log.period_1_in} ➔ ${log.period_1_out || '--:--'}` : (log.check_in ? (log.check_in.includes('T') ? log.check_in.slice(11, 16) : log.check_in.slice(0, 5)) : '—')}
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-700 dark:text-blue-400 font-bold">
                          {log.period_2_in ? `${log.period_2_in} ➔ ${log.period_2_out || '--:--'}` : '—'}
                        </td>
                        <td className="py-3 px-2 font-mono text-muted-foreground">{log.required_hours || 9} س</td>
                        <td className="py-3 px-2 font-mono font-black text-purple-700">
                          {log.total_hours || 0} س
                        </td>
                        <td className="py-3 px-3 font-mono font-extrabold">
                          {Number(log.shortfall_hours || 0) > 0 ? (
                            <span className="text-rose-600">-{log.shortfall_hours} س 🔻</span>
                          ) : Number(log.overtime_hours || 0) > 0 ? (
                            <span className="text-blue-600">+{log.overtime_hours} س ⚡</span>
                          ) : (
                            <span className="text-emerald-600">0 د ✓</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge className={
                            log.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'weekend' ? 'bg-slate-100 text-slate-700' :
                            log.status === 'absent' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }>
                            {log.status === 'present' ? 'حاضر' : log.status === 'weekend' ? 'عطلة أسبوعية' : log.status === 'absent' ? 'غياب' : 'إجازة'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── 5. TAB 3: MY REQUESTS ──────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="font-heading font-black text-lg text-foreground">مركز طلباتي الموحد</h2>
              <p className="text-xs text-muted-foreground">متابعة كافة الطلبات المقدمة ومراحل اعتمادها الإداري</p>
            </div>
            <Button
              onClick={() => setNewRequestModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تقديم طلب جديد</span>
            </Button>
          </div>

          <div className="space-y-4">
            {requestsList.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="font-bold text-sm text-foreground">لا توجد طلبات مسجلة حتى الآن</div>
                <p className="text-xs text-muted-foreground">يمكنك تقديم طلب إجازة، سلفة، تعديل بصمة، أو تعريف راتب مباشرة من هنا.</p>
              </div>
            ) : (
              requestsList.map(req => (
                <div key={req.id} className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-900/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border flex items-center justify-center font-bold text-emerald-600 shadow-sm">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">{req.details?.request_label || req.type}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">رقم الطلب: {req.request_number} • تاريخ التقديم: {new Date(req.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>
                    <Badge className={
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }>
                      {req.status === 'approved' ? 'تم الاعتماد بنجاح ✓' : req.status === 'rejected' ? 'تم رفض الطلب ✗' : 'قيد المراجعة الإدارية ⏳'}
                    </Badge>
                  </div>

                  {req.reason && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border">
                      <strong>سبب ومبرر الطلب:</strong> {req.reason}
                    </div>
                  )}

                  {/* Timeline */}
                  {req.timeline && req.timeline.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="text-[11px] font-bold text-muted-foreground">سجل وخط سير المعالجة:</div>
                      <div className="space-y-1">
                        {req.timeline.map((item, tIdx) => (
                          <div key={tIdx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-foreground">{item.title}</span>
                            <span>بواسطة ({item.by})</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {new Date(item.at).toLocaleString('ar-SA')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ─── 6. TAB 4: MY PAYROLL ───────────────────────────────────────────── */}
      {activeTab === 'payroll' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-heading font-black text-lg text-foreground">قسائم ومسيرات الرواتب الشهرية</h2>
              <p className="text-xs text-muted-foreground">استعراض وتحميل قسيمة الراتب الرسمية A4 المعتمدة</p>
            </div>
          </div>

          {currentMonthPayroll && (
            <div className="p-6 rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-emerald-400 font-bold">مسير راتب شهر: {attMonth}</div>
                  <div className="text-2xl sm:text-3xl font-heading font-black text-white mt-1">
                    {currentMonthPayroll.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-emerald-300 font-sans">ريال سعودي</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">صافي الراتب المستحق للصرف</div>
                </div>

                <Button
                  onClick={() => setSelectedForPayslip(currentMonthPayroll)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة قسيمة الراتب الرسمية A4</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-700/60 text-xs">
                <div>
                  <div className="text-slate-400">الراتب الأساسي:</div>
                  <div className="font-mono font-bold text-white mt-0.5">{currentMonthPayroll.basicSalary.toLocaleString('en-US')} ر.س</div>
                </div>
                <div>
                  <div className="text-slate-400">إجمالي البدلات والإضافي:</div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">+{currentMonthPayroll.totalAdditions.toLocaleString('en-US')} ر.س</div>
                </div>
                <div>
                  <div className="text-slate-400">إجمالي الاستقطاعات والسلف:</div>
                  <div className="font-mono font-bold text-rose-400 mt-0.5">-{currentMonthPayroll.totalDeductions.toLocaleString('en-US')} ر.س</div>
                </div>
                <div>
                  <div className="text-slate-400">طريقة الصرف:</div>
                  <div className="font-bold text-slate-200 mt-0.5">{currentEmp.iban ? 'تحويل بنكي' : 'تسليم نقدي (كاش)'}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ─── 7. TAB 5: MY PERFORMANCE (تقييم الأداء الشهري ومؤشرات الإنجاز) ─── */}
      {activeTab === 'performance' && (() => {
        const allEvals = getStoredEvaluations();
        const clean = (v) => String(v || '').replace('emp_', '').trim();
        const empNum = clean(currentEmp?.employee_number || currentEmp?.id);
        
        // Find latest evaluation for this employee
        const myEvals = allEvals.filter(ev => clean(ev.employee_number || ev.employee_id) === empNum);
        const latestEval = myEvals[0] || null;

        if (!latestEval) {
          return (
            <Card className="p-8 rounded-3xl border shadow-sm bg-card text-center space-y-3">
              <Star className="w-12 h-12 text-amber-500/40 mx-auto" />
              <h2 className="font-heading font-black text-base text-foreground">سجل تقييم الأداء الوظيفي</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                لم يتم رصد تقرير تقييم أداء معتمد لشهرك الحالي حتى الآن. يتم رصد التقييمات الشهرية دورياً من قبل الإدارة العامة.
              </p>
            </Card>
          );
        }

        const tier = getEvaluationTier(latestEval.total_score);
        const isPurchasing = Boolean(latestEval.has_purchasing_duty);
        const criteriaList = isPurchasing ? PURCHASING_EVALUATION_CRITERIA : STANDARD_EVALUATION_CRITERIA;
        const scores = latestEval.scores || {};

        return (
          <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading font-black text-lg text-foreground">سجل تقييم الأداء الوظيفي (KPIs)</h2>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-amber-600 bg-amber-500/10 border-amber-500/30">
                    شهر {latestEval.month}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تفصيل معايير الأداء والنسب المرجحة المعتمدة رسمياً من الإدارة العامة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`${tier.badgeClass} text-xs font-bold px-3.5 py-1.5`}>
                  {tier.grade} ({latestEval.total_score}%)
                </Badge>
                <Button
                  size="sm"
                  onClick={() => {
                    printEvaluationDocument(latestEval, getCompanyProfile());
                    toast({ title: '✓ جاري تجهيز تقرير التقييم للطباعة...' });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-9 gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الشهادة A4</span>
                </Button>
              </div>
            </div>

            {/* Criteria Breakdown Grid */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>تفصيل المعايير والدرجات المحققة:</span>
                <span className="text-muted-foreground font-mono">الوزن الإجمالي: 100%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {criteriaList.map(c => {
                  const score = scores[c.id] || 0;
                  return (
                    <Card key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs">{c.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold text-amber-600">
                          {c.weight}%
                        </Badge>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-[10.5px] text-muted-foreground line-clamp-1">{c.desc}</span>
                        <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 ms-2 shrink-0">
                          {score}%
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Management Notes & Strengths */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-800/40 text-xs space-y-2.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>ملاحظات وتوجيهات المدير العام ({latestEval.evaluated_by || 'فهد ناصر محمد الجوعي'}):</span>
              </div>
              <p className="text-slate-200 leading-relaxed text-xs">
                {latestEval.notes || 'أداء متميز وتفانٍ كامل في العمل وخدمة العملاء. الاستمرار في الحفاظ على هذا المستوى.'}
              </p>
              {latestEval.strengths && (
                <div className="pt-1 text-[11px] text-slate-300">
                  <strong className="text-emerald-300">أبرز نقاط القوة:</strong> {latestEval.strengths}
                </div>
              )}
            </div>

          </Card>
        );
      })()}

      {/* ─── 8. TAB 6: MY DOCUMENTS & CONTRACTS ──────────────────────────────── */}
      {activeTab === 'documents' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-heading font-black text-lg text-foreground">الوثائق وعقد العمل المعتمد</h2>
              <p className="text-xs text-muted-foreground">عقد العمل الرسمي، الشروط واللائحة، وإثباتات الهوية</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            
            {/* 1. Official Employment Contract Card */}
            {empContract ? (
              <div className="p-6 rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-black text-base text-white">
                          {empContract.category === 'qiwa' ? 'عقد عمل منصة قوى الرسمي' : 'عقد العمل الداخلي الموحد (نظام العمل)'}
                        </span>
                        <Badge className={
                          empContract.category === 'qiwa'
                            ? (empContract.qiwa_document_url ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold')
                            : (empContract.signed_by_employee ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold')
                        }>
                          {empContract.category === 'qiwa'
                            ? (empContract.qiwa_document_url ? '✓ عقد قوى موثق ومرفوع' : '⏳ مطلوب رفع عقد قوى (PDF)')
                            : (empContract.signed_by_employee ? '✓ معتمد وموقع رقمياً' : '✍️ بانتظار توقيعك الإلكتروني')}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {empContract.category === 'qiwa'
                          ? `رقم العقد في قوى: ${empContract.qiwa_contract_number || 'مسجل في قوى'} • صاحب العمل: شركة درة السيارة لقطع غيار السيارات`
                          : `رقم العقد: ${empContract.contract_number} • صاحب العمل: شركة درة السيارة لقطع غيار السيارات`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => setContractModalOpen(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-10 px-5 rounded-xl gap-2 shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                      <span>
                        {empContract.category === 'qiwa'
                          ? (empContract.qiwa_document_url ? 'استعراض أو تحديث عقد قوى' : 'رفع عقد منصة قوى الآن (PDF) 📤')
                          : (empContract.signed_by_employee ? 'عرض وطباعة العقد A4' : 'قراءة وتوقيع العقد الآن ✍️')}
                      </span>
                    </Button>

                    <Button
                      onClick={() => setResignationModalOpen(true)}
                      variant="outline"
                      className="bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border-slate-700 text-xs h-10 px-4 rounded-xl gap-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      <span>تقديم إشعار استقالة (30 يوم)</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400">مدة العقد:</div>
                    <div className="font-bold text-white mt-1">سنة واحدة (تجدد تلقائياً)</div>
                  </div>
                  <div>
                    <div className="text-slate-400">تاريخ السريان:</div>
                    <div className="font-mono font-bold text-emerald-400 mt-1">{empContract.start_date || currentEmp.join_date}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">مهلة إشعار ترك العمل:</div>
                    <div className="font-bold text-amber-400 mt-1">30 يوماً على الأقل (شهر)</div>
                  </div>
                  <div>
                    <div className="text-slate-400">الشرط الجزائي والتعويض:</div>
                    <div className="font-bold text-rose-400 mt-1">خصم شهر أو راتب شهرين</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border bg-slate-50 dark:bg-slate-900 text-center text-xs text-muted-foreground">
                جاري إعداد وتجهيز العقد الموحد...
              </div>
            )}

            {/* 2. National ID / Iqama Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">الهوية الوطنية / الإقامة</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">سارية المفعول ✓</Badge>
                </div>
                <div className="text-xs font-mono text-muted-foreground">{currentEmp.national_id || '1113348641'}</div>
                <div className="text-[11px] text-slate-500">تاريخ الانتهاء: 2027-12-30 (سارية وموثقة في السجلات)</div>
              </div>

              <div className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">التأمين الطبي / الاجتماعي</span>
                  <Badge className={currentEmp.is_insured ? 'bg-emerald-100 text-emerald-800 text-[10px]' : 'bg-slate-100 text-slate-700 text-[10px]'}>
                    {currentEmp.is_insured ? 'مؤمن ومسجل ✓' : 'بدون تأمين طبي'}
                  </Badge>
                </div>
                <div className="text-xs font-mono text-muted-foreground">{currentEmp.gosi_number || '—'}</div>
                <div className="text-[11px] text-slate-500">حماية الأجور ونظام العمل المعتمد</div>
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* ─── 9. TAB 7: MY ACCOUNT ───────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
          <div className="border-b pb-4">
            <h2 className="font-heading font-black text-lg text-foreground">الملف التعريفي والبيانات البنكية</h2>
            <p className="text-xs text-muted-foreground">بيانات الحساب المعتمدة في نظام حماية الأجور (WPS)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-1">
              <div className="text-muted-foreground">الاسم الكامل:</div>
              <div className="font-bold text-foreground text-sm">{currentEmp.full_name}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-1">
              <div className="text-muted-foreground">الرقم الوظيفي:</div>
              <div className="font-mono font-bold text-foreground text-sm">#{currentEmp.employee_number}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-1">
              <div className="text-muted-foreground">رقم الآيبان البنكي (IBAN):</div>
              <div className="font-mono font-bold text-foreground text-sm">{currentEmp.iban || 'غير مسجل (صرف نقدي)'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-1">
              <div className="text-muted-foreground">الفرع المعتمد:</div>
              <div className="font-bold text-foreground text-sm">{currentEmp.branch_name || currentEmp.branch || 'الفرع الرئيسي'}</div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── 10. NEW REQUEST MODAL (14 REQUEST TYPES) ────────────────────────── */}
      <Dialog open={newRequestModal} onOpenChange={setNewRequestModal}>
        <DialogContent className="max-w-xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              <span>تقديم طلب إداري جديد</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitRequest} className="space-y-4 py-2">
            
            {/* Request Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">نوع الطلب المراد تقديمه *</Label>
              <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
                <SelectTrigger className="rounded-xl text-xs h-10 bg-background font-bold">
                  <SelectValue placeholder="اختر نوع الطلب..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.values(REQUEST_TYPES).map(rt => (
                    <SelectItem key={rt.id} value={rt.id} className="text-xs font-bold">
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Impact Banner */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-300">
              <strong>أثر وسير المعالجة:</strong> {REQUEST_TYPES[Object.keys(REQUEST_TYPES).find(k => REQUEST_TYPES[k].id === selectedRequestType)]?.impact || 'مراجعة الموارد البشرية'}
            </div>

            {/* Conditional Fields based on Request Type */}
            {(selectedRequestType === 'annual_leave' || selectedRequestType === 'unpaid_leave' || selectedRequestType === 'leave_extension') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">تاريخ البداية *</Label>
                  <Input
                    type="date"
                    value={reqForm.startDate}
                    onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                    className="rounded-xl text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">تاريخ النهاية *</Label>
                  <Input
                    type="date"
                    value={reqForm.endDate}
                    onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                    className="rounded-xl text-xs h-9"
                    required
                  />
                </div>
              </div>
            )}

            {selectedRequestType === 'advance' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">المبلغ المطلوب (ر.س) *</Label>
                  <Input
                    type="number"
                    value={reqForm.amount}
                    onChange={(e) => setReqForm({ ...reqForm, amount: e.target.value })}
                    placeholder="مثال: 2000"
                    className="rounded-xl text-xs h-9 font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">عدد الأقساط الشهرية *</Label>
                  <Input
                    type="number"
                    value={reqForm.installments}
                    onChange={(e) => setReqForm({ ...reqForm, installments: e.target.value })}
                    min="1"
                    max="24"
                    className="rounded-xl text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">المبرر والسبب بالتفصيل *</Label>
              <Textarea
                value={reqForm.reason}
                onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                placeholder="اكتب تفاصيل طلبك بدقة..."
                className="rounded-xl text-xs min-h-[80px]"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-10 px-5 gap-1.5 shadow-md">
                <Send className="w-4 h-4" />
                <span>إرسال الطلب للاعتماد</span>
              </Button>
              <Button type="button" variant="outline" onClick={() => setNewRequestModal(false)} className="rounded-xl text-xs font-bold h-10">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 11. CONTRACT VIEWER MODAL ───────────────────────────────────────── */}
      <ContractViewerModal
        open={contractModalOpen}
        onOpenChange={setContractModalOpen}
        contract={empContract}
        isEmployeeView={true}
        currentUser={currentEmp}
        onContractSigned={(updated) => {
          setEmpContract(updated);
        }}
      />

      {/* ─── 12. RESIGNATION NOTICE MODAL ────────────────────────────────────── */}
      <ResignationNoticeModal
        open={resignationModalOpen}
        onOpenChange={setResignationModalOpen}
        employee={currentEmp}
        onNoticeSubmitted={() => {
          // reload requests / notices
          if (currentEmp) {
            const clean = (v) => String(v || '').replace('emp_', '').trim();
            const empNum = clean(currentEmp.employee_number || currentEmp.id);
            const allReqs = getUnifiedRequests();
            setRequestsList(allReqs.filter(r => clean(r.employee_number || r.employee_id) === empNum));
          }
        }}
      />

      {/* ─── 13. PAYSLIP PRINT MODAL ─────────────────────────────────────────── */}
      {selectedForPayslip && (
        <PayslipPrint
          payroll={selectedForPayslip}
          monthLabel={attMonth}
          onClose={() => setSelectedForPayslip(null)}
        />
      )}

      {/* Modals and modals dialogs remain above */}

    </div>
  );
}
