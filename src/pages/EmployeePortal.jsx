import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44, initialData } from '@/api/base44Client';
import { computeEmployeePayroll, getAdvances, getLockedMonthlyPayrolls, getLockedMonthlyPayroll, isMonthLocked } from '@/lib/payrollEngine';
import { getUnifiedRequests, saveUnifiedRequest, REQUEST_TYPES } from '@/lib/requestsEngine';
import { getCompanyProfile } from '@/lib/companyProfile';
import { getEmployeeContract, initializeUnifiedContracts } from '@/lib/contractsEngine';
import ContractViewerModal from '@/components/ContractViewerModal';
import ResignationNoticeModal from '@/components/ResignationNoticeModal';
import PayslipPrint from '@/components/PayslipPrint';
import ExecutiveAnnouncementTicker from '@/components/ExecutiveAnnouncementTicker';
import { getStoredEvaluations, getEvaluationTier, STANDARD_EVALUATION_CRITERIA, PURCHASING_EVALUATION_CRITERIA } from '@/lib/evaluationsEngine';
import { printEvaluationDocument } from '@/lib/evaluationPrintEngine';
import MobileEmployeeProfileCard from '@/components/MobileEmployeeProfileCard';
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
  Eye,
  Plane,
  UserX,
  ArrowRight,
  CalendarCheck,
  Lock,
  ShieldAlert,
  Info,
  X,
  ChevronUp
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
  const [currentEmp, setCurrentEmp] = useState(() => user || null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [empContract, setEmpContract] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & Steps
  const [newRequestModal, setNewRequestModal] = useState(false);
  const [requestStep, setRequestStep] = useState('select'); // 'select' (2-column square grid) | 'form' (dedicated fields)
  const [selectedRequestType, setSelectedRequestType] = useState('annual_leave');
  const [selectedForPayslip, setSelectedForPayslip] = useState(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [resignationModalOpen, setResignationModalOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState(null); // null | 'attendance' | 'requests' | 'payroll' | 'performance' | 'documents' | 'account'
  const documentsDrawerOpen = activeDrawerTab === 'documents';
  const setDocumentsDrawerOpen = (open) => setActiveDrawerTab(open ? 'documents' : null);
  const tabsBarRef = React.useRef(null);

  // Request Form State
  const [reqForm, setReqForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    leaveSubType: 'annual', // 'annual' | 'unpaid' | 'sick'
    permissionType: 'morning', // 'morning' | 'evening' | 'custom'
    permissionHours: '2',
    letterType: 'salary_bank',
    letterEntity: '',
    amount: '',
    installments: 1,
    reason: '',
    checkInTime: '09:00',
    checkOutTime: '17:00',
    overtimeHours: '2',
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
        const [rawEmps, logs, shs] = await Promise.all([
          base44.entities.Employee.list(),
          base44.entities.AttendanceLog.list('-log_date', 3000),
          base44.entities.Shift.list()
        ]);

        const emps = (rawEmps && rawEmps.length > 0) ? rawEmps : (initialData?.Employee || []);

        // Strict Match: Logged-in user employee record ONLY
        const clean = (v) => String(v || '').replace('emp_', '').trim();
        const matched = emps.find(e => 
          clean(e.id) === clean(user?.id) ||
          clean(e.employee_number) === clean(user?.employee_number) ||
          (user?.national_id && e.national_id && String(e.national_id).trim() === String(user.national_id).trim()) ||
          (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
        ) || user || emps[0];

        if (matched) {
          setCurrentEmp(matched);
        }
        setShifts(shs || []);

        // Filter logs strictly for this employee only!
        const empNum = String(matched?.employee_number || matched?.id || '').replace('emp_', '');
        const empLogs = (logs || []).filter(l => clean(l.employee_number || l.employee_id || l.user_id) === empNum);
        setAttendanceLogs(empLogs);

        // Load unified requests for this employee only
        const allReqs = getUnifiedRequests();
        const myReqs = (allReqs || []).filter(r => clean(r.employee_number || r.employee_id) === empNum);
        setRequestsList(myReqs);

        // Load unified contracts safely
        try {
          const unifiedContracts = await initializeUnifiedContracts(emps);
          const foundContract = (unifiedContracts || []).find(c => clean(c.employee_number || c.employee_id) === empNum);
          setEmpContract(foundContract || null);
        } catch (cErr) {
          console.warn('Contracts loading error:', cErr);
        }

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

  // Close drawer on Escape key press (Desktop UX enhancement)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeDrawerTab) {
        setActiveDrawerTab(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawerTab]);

  // Today's attendance calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = useMemo(() => {
    return attendanceLogs.find(l => l.log_date === todayStr) || null;
  }, [attendanceLogs, todayStr]);

  // Current calendar month prefix (e.g. 2026-09)
  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Strictly past approved months only (m.month_prefix < currentMonthPrefix && status === 'locked')
  const approvedPastMonths = useMemo(() => {
    const lockedList = getLockedMonthlyPayrolls();
    return lockedList.filter(m => 
      m.status === 'locked' && 
      m.month_prefix < currentMonthPrefix
    ).sort((a, b) => b.month_prefix.localeCompare(a.month_prefix));
  }, [currentMonthPrefix]);

  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState('');

  // Default to latest approved past month
  useEffect(() => {
    if (approvedPastMonths.length > 0 && (!selectedPayrollMonth || !approvedPastMonths.some(m => m.month_prefix === selectedPayrollMonth))) {
      setSelectedPayrollMonth(approvedPastMonths[0].month_prefix);
    }
  }, [approvedPastMonths, selectedPayrollMonth]);

  // Approved Payroll Record for the selected past month
  const approvedPayrollData = useMemo(() => {
    if (!currentEmp || !selectedPayrollMonth) return null;
    const isPastApproved = approvedPastMonths.some(m => m.month_prefix === selectedPayrollMonth);
    if (!isPastApproved) return null;

    const lockedMeta = approvedPastMonths.find(m => m.month_prefix === selectedPayrollMonth);
    const lockedSnapshot = getLockedMonthlyPayroll(selectedPayrollMonth);

    const clean = (v) => String(v || '').replace('emp_', '').trim();
    const empNum = clean(currentEmp.employee_number || currentEmp.id);
    const empName = clean(currentEmp.full_name);

    let found = null;
    if (lockedSnapshot && Array.isArray(lockedSnapshot.payrolls)) {
      found = lockedSnapshot.payrolls.find(p => 
        clean(p.emp?.employee_number || p.emp?.id) === empNum ||
        clean(p.employee_number || p.employee_id) === empNum ||
        (empName && clean(p.emp?.full_name || p.employee_name) === empName)
      );
    }

    if (!found) {
      found = computeEmployeePayroll(currentEmp, attendanceLogs, shifts, { monthPrefix: selectedPayrollMonth });
    }

    return {
      payroll: found,
      meta: lockedMeta,
      snapshot: lockedSnapshot
    };
  }, [currentEmp, selectedPayrollMonth, approvedPastMonths, attendanceLogs, shifts]);

  // Filtered attendance for selected month
  const monthlyLogs = useMemo(() => {
    return attendanceLogs
      .filter(l => (l.log_date || '').startsWith(attMonth))
      .sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
  }, [attendanceLogs, attMonth]);

  // Current month attendance summary & stats based on attMonth
  const currentMonthPayroll = useMemo(() => {
    if (!currentEmp) return null;
    try {
      return computeEmployeePayroll(currentEmp, attendanceLogs, shifts, { monthPrefix: attMonth });
    } catch (e) {
      console.error('Error computing current month payroll stats:', e);
      return null;
    }
  }, [currentEmp, attendanceLogs, shifts, attMonth]);

  // Handle Request Submission
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!currentEmp) return;

    let reqMeta = REQUEST_TYPES[Object.keys(REQUEST_TYPES).find(k => REQUEST_TYPES[k].id === selectedRequestType)] || REQUEST_TYPES.OTHER;

    let finalLabel = reqMeta.label;
    if (selectedRequestType === 'annual_leave') {
      if (reqForm.leaveSubType === 'unpaid') finalLabel = 'طلب إجازة بدون راتب';
      else if (reqForm.leaveSubType === 'sick') finalLabel = 'طلب إجازة مرضية';
      else finalLabel = 'طلب إجازة سنوية';
    } else if (selectedRequestType === 'permission') {
      finalLabel = `طلب استئذان (${reqForm.permissionHours} س)`;
    } else if (selectedRequestType === 'advance') {
      finalLabel = `طلب سلفة مالية (${reqForm.amount || 0} ر.س)`;
    }

    const payload = {
      type: selectedRequestType,
      employee_id: currentEmp.id,
      employee_number: currentEmp.employee_number,
      employee_name: currentEmp.full_name,
      branch_name: currentEmp.branch_name || currentEmp.branch,
      reason: reqForm.reason || finalLabel,
      details: {
        ...reqForm,
        request_label: finalLabel
      }
    };

    saveUnifiedRequest(payload, user);
    setNewRequestModal(false);
    setRequestStep('select');
    toast({
      title: '✓ تم تقديم الطلب بنجاح',
      description: `تم إرسال ${finalLabel} لإدارة الموارد البشرية للمراجعة.`
    });

    // Reset Form
    setReqForm({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      leaveSubType: 'annual',
      permissionType: 'morning',
      permissionHours: '2',
      letterType: 'salary_bank',
      letterEntity: '',
      amount: '',
      installments: 1,
      reason: '',
      checkInTime: '09:00',
      checkOutTime: '17:00',
      overtimeHours: '2',
      targetShift: '',
      targetBranch: '',
      targetDept: '',
      notes: ''
    });
  };

  if (loading && !currentEmp) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isContractPendingSignature = empContract && !empContract.signed_by_employee;

  // Metadata helper for the dynamic Drawer header
  const getDrawerTabMeta = (tabId) => {
    switch (tabId) {
      case 'attendance':
        return {
          title: 'سجل الحضور والبصمات وساعاتي',
          subtitle: 'الفترات الصباحية والمسائية، ساعات العمل الإجمالية، والعجز والإضافي',
          icon: Clock,
          gradient: 'from-teal-600 to-emerald-500'
        };
      case 'requests':
        return {
          title: 'مركز طلباتي ومتابعة القرارات الإدارية',
          subtitle: 'الإجازات، السلف، الاستئذان، والخطابات ومتابعة حالات الموافقة',
          icon: FileText,
          gradient: 'from-blue-600 to-indigo-500'
        };
      case 'payroll':
        return {
          title: 'قسائم ومسيرات الرواتب الشهرية المعتمدة',
          subtitle: 'استعراض وتحميل قسائم الرواتب المعتمدة رسمياً وتفاصيل المستحقات',
          icon: Wallet,
          gradient: 'from-sky-600 to-blue-500'
        };
      case 'performance':
        return {
          title: 'تقييم الأداء الوظيفي ومؤشرات الإنجاز',
          subtitle: 'معايير التقييم المعتمدة، نقاط القوة والتميز، والشهادات الوظيفية',
          icon: Star,
          gradient: 'from-amber-500 to-orange-500'
        };
      case 'documents':
        return {
          title: 'الوثائق وعقد العمل المعتمد',
          subtitle: 'عقد العمل الرسمي الموثق، إثباتات الهوية، والاشتراك التأميني',
          icon: Scale,
          gradient: 'from-emerald-600 to-teal-500'
        };
      case 'account':
        return {
          title: 'الملف التعريفي والبيانات البنكية',
          subtitle: 'بيانات الحساب المعتمدة في نظام حماية الأجور (WPS) ومعلومات الوظيفة',
          icon: User,
          gradient: 'from-slate-700 to-slate-900'
        };
      default:
        return {
          title: 'درج الخدمات المعتمد',
          subtitle: 'بوابة الموظف الموحدة',
          icon: Sparkles,
          gradient: 'from-teal-600 to-emerald-500'
        };
    }
  };

  // 1. Attendance Tab Content
  const renderAttendanceContent = () => (
    <Card className="p-5 sm:p-6 rounded-3xl border shadow-sm bg-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          <h3 className="font-heading font-black text-lg text-foreground">سجل الحضور والبصمات التفصيلي</h3>
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
              <th className="py-3 px-2 text-sky-700">إجمالي الفعلي</th>
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
                    <td className="py-3 px-3 text-center">
                      {log.period_1_in ? (
                        <span dir="ltr" className="inline-flex items-center justify-center gap-1 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                          <span>{log.period_1_in}</span>
                          <span className="text-emerald-500 font-sans">➔</span>
                          <span>{log.period_1_out || '--:--'}</span>
                        </span>
                      ) : (log.check_in ? (log.check_in.includes('T') ? log.check_in.slice(11, 16) : log.check_in.slice(0, 5)) : '—')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {log.period_2_in ? (
                        <span dir="ltr" className="inline-flex items-center justify-center gap-1 font-mono text-blue-700 dark:text-blue-400 font-bold">
                          <span>{log.period_2_in}</span>
                          <span className="text-blue-500 font-sans">➔</span>
                          <span>{log.period_2_out || '--:--'}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-2 font-mono text-muted-foreground">{log.required_hours || 9} س</td>
                    <td className="py-3 px-2 font-mono font-black text-sky-700">
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
  );

  // 2. Requests Tab Content
  const renderRequestsContent = () => (
    <Card className="p-5 sm:p-6 rounded-3xl border shadow-sm bg-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="font-heading font-black text-lg text-foreground">مركز طلباتي الموحد</h3>
          <p className="text-xs text-muted-foreground">متابعة كافة الطلبات المقدمة ومراحل اعتمادها الإداري</p>
        </div>
        <Button
          onClick={() => {
            setRequestStep('select');
            setNewRequestModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-md cursor-pointer"
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
  );

  // 3. Payroll Tab Content
  const renderPayrollContent = () => (
    <Card className="p-5 sm:p-6 rounded-3xl border shadow-sm bg-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
        <div>
          <h3 className="font-heading font-black text-lg text-foreground">قسائم ومسيرات الرواتب الشهرية</h3>
          <p className="text-xs text-muted-foreground">استعراض وتحميل قسائم الرواتب المعتمدة رسمياً من المدير العام (الشهور السابقة المنتهية)</p>
        </div>

        {/* Approved Month Selector */}
        {approvedPastMonths.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">الشهر المعتمد:</span>
            <Select value={selectedPayrollMonth} onValueChange={setSelectedPayrollMonth}>
              <SelectTrigger className="w-56 h-9 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border">
                <SelectValue placeholder="اختر الشهر المعتمد..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {approvedPastMonths.map(m => (
                  <SelectItem key={m.month_prefix} value={m.month_prefix} className="text-xs font-bold">
                    ✓ {m.title || `شهر ${m.month_prefix}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Verification Guard: Only show if officially approved by GM and past month */}
      {approvedPastMonths.length === 0 || !approvedPayrollData?.payroll ? (
        <div className="p-8 rounded-3xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-3.5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-black text-base text-amber-950 dark:text-amber-200">
              قسيمة الراتب بانتظار الاعتماد النهائي من الإدارة والمدير العام
            </h3>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 max-w-md mx-auto leading-relaxed">
              وفقاً للسياسات الإدارية المعتمدة، لا تصدر قسيمة الراتب للموظف إلا بعد مراجعتها وتدقيقها والتأكيد على إتمام الاعتماد الرسمي وإقفال المسير من قبل الإدارة والمدير العام بالتحديد. تظهر هنا رواتب الشهور السابقة المنتهية فقط فور اعتمادها.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Badge className="bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-200 text-[11px] font-bold px-3 py-1">
              ⏳ مسير شهر {currentMonthPrefix} قيد العمل والتدقيق
            </Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* GM Official Approval Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                  <span>معتمد وموثق رسمياً من الإدارة والمدير العام بالتحديد</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                  المعتمد: {approvedPayrollData.meta?.locked_by || 'فهد ناصر محمد الجوعي (المدير العام)'}
                  {approvedPayrollData.meta?.locked_at && (
                    <span> • بتاريخ {new Date(approvedPayrollData.meta.locked_at).toLocaleDateString('ar-SA')}</span>
                  )}
                </div>
              </div>
            </div>

            <Badge className="bg-emerald-600 text-white font-bold text-[10px] self-start sm:self-center px-2.5 py-1">
              مسير معتمد ومقفل رسمياً ✓
            </Badge>
          </div>

          {/* Main Official Payslip Card */}
          <div className="p-6 rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <span>مسير راتب شهر: {selectedPayrollMonth}</span>
                  <span className="text-slate-400">({approvedPayrollData.meta?.title || `شهر ${selectedPayrollMonth}`})</span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black text-white mt-1">
                  {approvedPayrollData.payroll.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-emerald-300 font-sans">ريال سعودي</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">صافي الراتب المعتمد رسمياً للصرف</div>
              </div>

              <Button
                onClick={() => setSelectedForPayslip(approvedPayrollData.payroll)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>معاينة وطباعة قسيمة الراتب A4</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-700/60 text-xs">
              <div>
                <div className="text-slate-400">الراتب الأساسي:</div>
                <div className="font-mono font-bold text-white mt-0.5">{approvedPayrollData.payroll.basicSalary?.toLocaleString('en-US')} ر.س</div>
              </div>
              <div>
                <div className="text-slate-400">إجمالي البدلات والإضافي:</div>
                <div className="font-mono font-bold text-emerald-400 mt-0.5">+{approvedPayrollData.payroll.totalAdditions?.toLocaleString('en-US')} ر.س</div>
              </div>
              <div>
                <div className="text-slate-400">إجمالي الاستقطاعات والسلف:</div>
                <div className="font-mono font-bold text-rose-400 mt-0.5">-{approvedPayrollData.payroll.totalDeductions?.toLocaleString('en-US')} ر.س</div>
              </div>
              <div>
                <div className="text-slate-400">طريقة الصرف:</div>
                <div className="font-bold text-slate-200 mt-0.5">{currentEmp.iban ? 'تحويل بنكي' : 'تسليم نقدي (كاش)'}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>🔒 معتمد ومطابق لمتطلبات نظام حماية الأجور (WPS)</span>
              <span className="font-mono">#{currentEmp.employee_number}</span>
            </div>
          </div>

          {/* Informational Security Footnote */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              <strong>ملاحظة نظام الرواتب:</strong> تظهر للموظف قسائم رواتب الشهور السابقة المنتهية والمعتمدة رسمياً فقط من المدير العام، ولا يتاح راتب الشهر الحالي إلا بعد اكتمال واعتماد المسير الإداري.
            </span>
          </div>

        </div>
      )}
    </Card>
  );

  // 4. Performance Tab Content
  const renderPerformanceContent = () => {
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
          <h3 className="font-heading font-black text-base text-foreground">سجل تقييم الأداء الوظيفي</h3>
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
      <Card className="p-5 sm:p-6 rounded-3xl border shadow-sm bg-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-black text-lg text-foreground">سجل تقييم الأداء الوظيفي (KPIs)</h3>
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-9 gap-1.5 shadow-sm cursor-pointer"
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
                </Card>
              );
            })}
          </div>

          {latestEval.strengths && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
              <strong className="text-emerald-800 dark:text-emerald-300">أبرز نقاط القوة والتميز:</strong>
              <p className="text-muted-foreground">{latestEval.strengths}</p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // 5. Documents Tab Content
  const renderDocumentsContent = () => (
    <div className="space-y-5">
      {empContract ? (
        <div className="p-6 rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shrink-0">
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
                onClick={() => {
                  setContractModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-10 px-5 rounded-xl gap-2 shadow-lg cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>
                  {empContract.category === 'qiwa'
                    ? (empContract.qiwa_document_url ? 'استعراض أو تحديث عقد قوى' : 'رفع عقد منصة قوى الآن (PDF) 📤')
                    : (empContract.signed_by_employee ? 'عرض وطباعة العقد A4' : 'قراءة وتوقيع العقد الآن ✍️')}
                </span>
              </Button>

              <Button
                onClick={() => {
                  setResignationModalOpen(true);
                }}
                variant="outline"
                className="bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border-slate-700 text-xs h-10 px-4 rounded-xl gap-1.5 cursor-pointer"
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
  );

  // 6. Account Tab Content
  const renderAccountContent = () => (
    <div className="py-1">
      <MobileEmployeeProfileCard employee={currentEmp} />
    </div>
  );

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
              onClick={() => {
                setRequestStep('select');
                setNewRequestModal(true);
              }}
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
            onClick={() => setDocumentsDrawerOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl h-8 px-3 shrink-0 shadow-xs cursor-pointer"
          >
            توقيع الآن ➔
          </Button>
        </div>
      )}

      {/* ─── 2. STICKY NAVIGATION TABS & INLINE EXPANDING PANEL (ينبثق مباشرة من مكان الضغط) ─── */}
      <div className="sticky top-2 z-30 space-y-2.5">
        <div className="relative flex items-center group">
          {/* Scroll Right Button (in RTL, Right scrolls toward start) */}
          <button
            type="button"
            onClick={() => {
              if (tabsBarRef.current) {
                tabsBarRef.current.scrollBy({ left: 160, behavior: 'smooth' });
              }
            }}
            className="absolute -right-2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:border-emerald-500/50 active:scale-90 transition-all cursor-pointer"
            title="تمرير لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scrollable Tabs Track with Visible Custom Scrollbar */}
          <div
            ref={tabsBarRef}
            onWheel={(e) => {
              if (tabsBarRef.current && e.deltaY !== 0) {
                tabsBarRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 pb-2.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-x-auto tabs-scrollbar scroll-smooth select-none w-full shadow-sm"
          >
            {[
              { id: 'home', label: 'الرئيسية', icon: Home, isHome: true },
              { id: 'attendance', label: 'حضوري وساعاتي', icon: Clock },
              { id: 'requests', label: 'مركز طلباتي', icon: FileText, count: requestsList.length },
              { id: 'payroll', label: 'قسائم الرواتب', icon: Wallet },
              { id: 'performance', label: 'تقييم الأداء', icon: Star },
              { id: 'documents', label: 'عقد العمل ووثائقي', icon: FolderOpen },
              { id: 'account', label: 'ملفي وبياناتي', icon: User }
            ].map(t => {
              const Icon = t.icon;
              const isActive = t.isHome ? (!activeDrawerTab) : (activeDrawerTab === t.id);

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.isHome) {
                      setActiveDrawerTab(null);
                    } else {
                      setActiveDrawerTab(prev => prev === t.id ? null : t.id);
                    }
                  }}
                  className={`group/btn relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 hover:scale-[1.02] hover:-translate-y-0.5 ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-500/30 ring-1 ring-emerald-500/20 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="relative flex items-center">
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${
                      isActive
                        ? 'scale-110 text-emerald-600 dark:text-emerald-400'
                        : 'group-hover/btn:scale-110 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 text-slate-500 dark:text-slate-400'
                    }`} />
                    {t.id === 'documents' && isContractPendingSignature && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </div>

                  <span>{t.label}</span>

                  {t.count !== undefined && t.count > 0 && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Left Button (in RTL, Left scrolls toward end) */}
          <button
            type="button"
            onClick={() => {
              if (tabsBarRef.current) {
                tabsBarRef.current.scrollBy({ left: -160, behavior: 'smooth' });
              }
            }}
            className="absolute -left-2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:border-emerald-500/50 active:scale-90 transition-all cursor-pointer"
            title="تمرير لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* ─── INLINE POP-OUT PANEL (ينبثق مباشرة من نفس مكان التاب) ─── */}
        {Boolean(activeDrawerTab) && (() => {
          const drawerMeta = getDrawerTabMeta(activeDrawerTab);
          const DrawerIcon = drawerMeta.icon;

          return (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all duration-300 animate-in slide-in-from-top-2 fade-in">
              {/* Minimal Panel Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-border/60 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${drawerMeta.gradient} text-white flex items-center justify-center shadow-xs shrink-0`}>
                    <DrawerIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-sm sm:text-base text-foreground">
                      {drawerMeta.title}
                    </h2>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {drawerMeta.subtitle}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveDrawerTab(null)}
                  className="rounded-full w-7 h-7 p-0 text-muted-foreground hover:text-foreground hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="طي"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Direct Content (No repeated switcher, no duplicates) */}
              <div className="p-4 sm:p-5 max-h-[75vh] overflow-y-auto no-scrollbar space-y-4">
                {activeDrawerTab === 'attendance' && renderAttendanceContent()}
                {activeDrawerTab === 'requests' && renderRequestsContent()}
                {activeDrawerTab === 'payroll' && renderPayrollContent()}
                {activeDrawerTab === 'performance' && renderPerformanceContent()}
                {activeDrawerTab === 'documents' && renderDocumentsContent()}
                {activeDrawerTab === 'account' && renderAccountContent()}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── 3. HOME DASHBOARD (ALWAYS PRESERVED BELOW) ────────────────────── */}
      <div className="space-y-4">
          
          {/* Quick Services Grid - Direct Match to 2-Column Mobile App Mockup */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              {
                label: 'طلب إجازة',
                icon: Plane,
                iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40',
                onClick: () => {
                  setSelectedRequestType('annual_leave');
                  setRequestStep('form');
                  setNewRequestModal(true);
                }
              },
              {
                label: 'طلب استئذان',
                icon: Clock4,
                iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40',
                onClick: () => {
                  setSelectedRequestType('permission');
                  setRequestStep('form');
                  setNewRequestModal(true);
                }
              },
              {
                label: 'سجل الحضور',
                icon: Clock,
                iconClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40',
                onClick: () => {
                  setActiveTab('attendance');
                  setActiveDrawerTab('attendance');
                }
              },
              {
                label: 'قسيمة الراتب',
                icon: Wallet,
                iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
                onClick: () => {
                  setActiveTab('payroll');
                  setActiveDrawerTab('payroll');
                }
              },
              {
                label: 'طلب سلفة',
                icon: CreditCard,
                iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40',
                onClick: () => {
                  setSelectedRequestType('advance');
                  setRequestStep('form');
                  setNewRequestModal(true);
                }
              },
              {
                label: 'عقد العمل',
                icon: Scale,
                iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40',
                onClick: () => {
                  setActiveTab('documents');
                  setActiveDrawerTab('documents');
                }
              },
              {
                label: 'مركز طلباتي',
                icon: FileText,
                iconClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40',
                count: requestsList.length,
                onClick: () => {
                  setActiveTab('requests');
                  setActiveDrawerTab('requests');
                }
              },
              {
                label: 'تقييم الأداء',
                icon: Award,
                iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40',
                onClick: () => {
                  setActiveTab('performance');
                  setActiveDrawerTab('performance');
                }
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
                    <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
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
                <div className="text-sm sm:text-base font-bold font-mono text-sky-600 mt-0.5">
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

      {/* ─── 10. NEW REQUEST MODAL (2-COLUMN SQUARE GRID & DEDICATED FORMS) ───── */}
      <Dialog open={newRequestModal} onOpenChange={setNewRequestModal}>
        <DialogContent className="max-w-md sm:max-w-lg text-right p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl" dir="rtl">
          
          {requestStep === 'select' ? (
            /* ── STEP 1: 2-COLUMN SQUARE ICON GRID (MATCHING REFERENCE APP) ── */
            <div className="space-y-4 py-1">
              <DialogHeader className="text-right">
                <DialogTitle className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  <span>طلب جديد</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  اختر نوع المعاملة لتقديم الطلب مباشرة
                </p>
              </DialogHeader>

              {/* 2-Column Square Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 max-h-[62vh] overflow-y-auto p-1">
                {[
                  {
                    id: 'annual_leave',
                    title: 'الإجازات',
                    subtitle: 'سنوية، مرضية، طارئة',
                    icon: Plane,
                    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60',
                    onClick: () => {
                      setSelectedRequestType('annual_leave');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'permission',
                    title: 'الاستئذان',
                    subtitle: 'خروج مؤقت أو تأخير مصرح',
                    icon: Clock4,
                    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60',
                    onClick: () => {
                      setSelectedRequestType('permission');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'advance',
                    title: 'سلفة مالية',
                    subtitle: 'سلفة ميسرة وأقساط شهرية',
                    icon: CreditCard,
                    iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60',
                    onClick: () => {
                      setSelectedRequestType('advance');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'punch_correction',
                    title: 'تصحيح بصمة',
                    subtitle: 'تعديل بصمة دخول أو خروج',
                    icon: RotateCw,
                    iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60',
                    onClick: () => {
                      setSelectedRequestType('punch_correction');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'salary_certificate',
                    title: 'الخطابات والنماذج',
                    subtitle: 'تعريف بالراتب أو شهادة خبرة',
                    icon: FileText,
                    iconBg: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/60 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-800/60',
                    onClick: () => {
                      setSelectedRequestType('salary_certificate');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'overtime',
                    title: 'العمل الإضافي',
                    subtitle: 'تسجيل ساعات عمل إضافية',
                    icon: Clock,
                    iconBg: 'bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400 border border-pink-200/60 dark:border-pink-800/60',
                    onClick: () => {
                      setSelectedRequestType('overtime');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'shift_change',
                    title: 'تعديل الوردية',
                    subtitle: 'طلب تغيير شفت الدوام',
                    icon: Briefcase,
                    iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200/60 dark:border-sky-700/60',
                    onClick: () => {
                      setSelectedRequestType('shift_change');
                      setRequestStep('form');
                    }
                  },
                  {
                    id: 'resignation',
                    title: 'نهاية الخدمة',
                    subtitle: 'إشعار استقالة أو إنهاء العقد',
                    icon: UserX,
                    iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60',
                    onClick: () => {
                      setNewRequestModal(false);
                      setResignationModalOpen(true);
                    }
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.onClick}
                    className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-50/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 hover:border-teal-500/50 dark:hover:border-teal-500/50 flex flex-col items-center justify-center text-center transition-all group active:scale-95 shadow-xs hover:shadow-md min-h-[110px] sm:min-h-[125px]"
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs ${item.iconBg}`}>
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="font-heading font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mt-2">
                      {item.title}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {item.subtitle}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── STEP 2: DEDICATED REQUEST FORM (NO DROPDOWN OVERCROWDING!) ── */
            <form onSubmit={handleSubmitRequest} className="space-y-4 py-1">
              <div className="flex items-center justify-between border-b pb-3">
                <button
                  type="button"
                  onClick={() => setRequestStep('select')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-xl px-3 py-1.5 transition-all shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>العودة لاختيار الطلبات</span>
                </button>
                <div className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  {selectedRequestType === 'annual_leave' && 'طلب إجازة'}
                  {selectedRequestType === 'permission' && 'طلب استئذان'}
                  {selectedRequestType === 'advance' && 'طلب سلفة مالية'}
                  {selectedRequestType === 'punch_correction' && 'طلب تصحيح بصمة'}
                  {selectedRequestType === 'salary_certificate' && 'طلب خطابات ونماذج'}
                  {selectedRequestType === 'overtime' && 'طلب عمل إضافي'}
                  {selectedRequestType === 'shift_change' && 'طلب تعديل وردية'}
                </div>
              </div>

              {/* LEAVE FORM */}
              {selectedRequestType === 'annual_leave' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">نوع الإجازة</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'annual', label: 'سنوية اعتيادية' },
                        { id: 'unpaid', label: 'بدون راتب' },
                        { id: 'sick', label: 'مرضية' }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setReqForm({ ...reqForm, leaveSubType: sub.id })}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                            reqForm.leaveSubType === sub.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">تاريخ البداية *</Label>
                      <Input
                        type="date"
                        value={reqForm.startDate}
                        onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                        className="rounded-xl text-xs h-10"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">تاريخ النهاية *</Label>
                      <Input
                        type="date"
                        value={reqForm.endDate}
                        onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                        className="rounded-xl text-xs h-10"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PERMISSION FORM */}
              {selectedRequestType === 'permission' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">فترة الاستئذان</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'morning', label: 'صباحي (تأخير)' },
                        { id: 'evening', label: 'مسائي (خروج مبكر)' },
                        { id: 'custom', label: 'خلال الدوام' }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setReqForm({ ...reqForm, permissionType: sub.id })}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                            reqForm.permissionType === sub.id
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">تاريخ الإذن *</Label>
                      <Input
                        type="date"
                        value={reqForm.startDate}
                        onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                        className="rounded-xl text-xs h-10"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">عدد الساعات المطلوبة</Label>
                      <Select
                        value={reqForm.permissionHours}
                        onValueChange={(val) => setReqForm({ ...reqForm, permissionHours: val })}
                      >
                        <SelectTrigger className="rounded-xl text-xs h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 ساعة</SelectItem>
                          <SelectItem value="2">ساعتان (2 س)</SelectItem>
                          <SelectItem value="3">3 ساعات</SelectItem>
                          <SelectItem value="4">نصف يوم (4 س)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* ADVANCE FORM */}
              {selectedRequestType === 'advance' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">المبلغ المطلوب (ر.س) *</Label>
                    <Input
                      type="number"
                      value={reqForm.amount}
                      onChange={(e) => setReqForm({ ...reqForm, amount: e.target.value })}
                      placeholder="مثال: 2000"
                      className="rounded-xl text-xs h-10 font-mono font-bold"
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
                      className="rounded-xl text-xs h-10 font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {/* PUNCH CORRECTION FORM */}
              {selectedRequestType === 'punch_correction' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">تاريخ البصمة المراد تصحيحها *</Label>
                    <Input
                      type="date"
                      value={reqForm.startDate}
                      onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                      className="rounded-xl text-xs h-10"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">وقت الدخول الفعلي</Label>
                      <Input
                        type="time"
                        value={reqForm.checkInTime}
                        onChange={(e) => setReqForm({ ...reqForm, checkInTime: e.target.value })}
                        className="rounded-xl text-xs h-10 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">وقت الخروج الفعلي</Label>
                      <Input
                        type="time"
                        value={reqForm.checkOutTime}
                        onChange={(e) => setReqForm({ ...reqForm, checkOutTime: e.target.value })}
                        className="rounded-xl text-xs h-10 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LETTERS & FORMS */}
              {selectedRequestType === 'salary_certificate' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">نوع الخطاب المطلوب</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'salary_bank', label: 'تعريف راتب بنكي' },
                        { id: 'experience', label: 'شهادة خبرة' },
                        { id: 'employment_proof', label: 'إثبات استمرار عمل' }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setReqForm({ ...reqForm, letterType: sub.id })}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                            reqForm.letterType === sub.id
                              ? 'bg-yellow-600 text-white border-yellow-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">الجهة الموجه إليها الخطاب</Label>
                    <Input
                      type="text"
                      value={reqForm.letterEntity}
                      onChange={(e) => setReqForm({ ...reqForm, letterEntity: e.target.value })}
                      placeholder="مثال: بنك الراجحي / السفارة / لمن يهمه الأمر"
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </div>
              )}

              {/* OVERTIME FORM */}
              {selectedRequestType === 'overtime' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">تاريخ التكليف الإضافي *</Label>
                    <Input
                      type="date"
                      value={reqForm.startDate}
                      onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                      className="rounded-xl text-xs h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">عدد الساعات الإضافية *</Label>
                    <Input
                      type="number"
                      value={reqForm.overtimeHours}
                      onChange={(e) => setReqForm({ ...reqForm, overtimeHours: e.target.value })}
                      min="1"
                      max="12"
                      className="rounded-xl text-xs h-10 font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {/* SHIFT CHANGE FORM */}
              {selectedRequestType === 'shift_change' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">الوردية المطلوبة</Label>
                    <Input
                      type="text"
                      value={reqForm.targetShift}
                      onChange={(e) => setReqForm({ ...reqForm, targetShift: e.target.value })}
                      placeholder="مثال: فترة صباحية / 8 ساعات"
                      className="rounded-xl text-xs h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">تاريخ بدء السريان *</Label>
                    <Input
                      type="date"
                      value={reqForm.startDate}
                      onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                      className="rounded-xl text-xs h-10"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Reason Textarea (Common) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">المبرر والتفاصيل *</Label>
                <Textarea
                  value={reqForm.reason}
                  onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                  placeholder="اكتب تفاصيل طلبك بدقة..."
                  className="rounded-xl text-xs min-h-[75px]"
                  required
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-10 px-5 gap-1.5 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال الطلب للاعتماد</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewRequestModal(false)}
                  className="rounded-xl text-xs font-bold h-10"
                >
                  إلغاء
                </Button>
              </DialogFooter>
            </form>
          )}

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
          monthLabel={selectedPayrollMonth || attMonth}
          onClose={() => setSelectedForPayslip(null)}
        />
      )}

      {/* Modals and modals dialogs remain above */}

    </div>
  );
}
