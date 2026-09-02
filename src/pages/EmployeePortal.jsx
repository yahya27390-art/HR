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
  Scale
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

export default function EmployeePortal() {
  const { user } = useAuth();
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

  // Attendance Filter
  const [attMonth, setAttMonth] = useState('2026-08');

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
    <div className="space-y-6 max-w-5xl mx-auto pb-24 text-right" dir="rtl">
      
      {/* ─── 1. TOP GREETING HEADER CARD ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-heading font-black text-2xl shadow-inner">
              {currentEmp.full_name?.slice(0, 2) || 'مو'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                  بوابة الخدمة الذاتية للموظف
                </span>
                <span className="text-xs text-slate-400 font-mono">#{currentEmp.employee_number}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
                مرحباً، {currentEmp.full_name}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span>{currentEmp.job_title || 'موظف'}</span>
                <span>•</span>
                <span className="text-emerald-300 font-bold">{currentEmp.branch_name || currentEmp.branch || 'الفرع الرئيسي'}</span>
                <span>•</span>
                <span className="text-slate-400 font-mono">{currentEmp.shift || 'شفت قياسي'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setNewRequestModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تقديم طلب جديد</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── URGENT CONTRACT SIGNING ALERT BANNER (If Pending) ─────────────── */}
      {isContractPendingSignature && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="font-heading font-black text-sm text-amber-300 flex items-center gap-2">
                <span>عقد العمل الداخلي الموحد بانتظار توقيعك وموافقتك الإلكترونية</span>
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">مطلوب إلزامي</Badge>
              </div>
              <p className="text-xs text-slate-300">
                يرجى قراءة بنود العقد واللائحة الداخلية المنظمة والشروط الجزائية والمصادقة عليها لتوثيق ملفك.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setContractModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-10 px-5 rounded-xl gap-2 shadow-lg shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>قراءة وتوقيع العقد الآن ➔</span>
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

      {/* ─── 3. TAB 1: HOME (DASHBOARD OVERVIEW) ─────────────────────────────── */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          
          {/* Today's Punch Live Status Card */}
          <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h2 className="font-heading font-black text-base text-foreground">حضور ودوام اليوم ({todayStr})</h2>
              </div>
              <Badge className={todayLog?.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                {todayLog?.status === 'present' ? '✓ تم تسجيل الحضور' : 'قيد الانتظار'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border">
                <div className="text-xs text-muted-foreground">وقت الدخول:</div>
                <div className="text-base font-bold font-mono text-emerald-600 mt-1">
                  {todayLog?.period_1_in || (todayLog?.check_in ? todayLog.check_in.slice(11, 16) : '--:--')}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border">
                <div className="text-xs text-muted-foreground">وقت الخروج:</div>
                <div className="text-base font-bold font-mono text-blue-600 mt-1">
                  {todayLog?.period_2_out || todayLog?.period_1_out || (todayLog?.check_out ? todayLog.check_out.slice(11, 16) : '--:--')}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border">
                <div className="text-xs text-muted-foreground">الساعات المنجزة:</div>
                <div className="text-base font-bold font-mono text-purple-600 mt-1">
                  {todayLog?.total_hours || 0} س
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border">
                <div className="text-xs text-muted-foreground">الوردية المعتمدة:</div>
                <div className="text-xs font-bold text-foreground mt-1 truncate">
                  {currentEmp.shift || 'شفت أساسي'}
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Attendance Quick Stats */}
          {currentMonthPayroll && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                <div className="text-xs text-muted-foreground">أيام الحضور الفعلي</div>
                <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                  {currentMonthPayroll.presentDays || 0} <span className="text-xs font-normal text-muted-foreground font-sans">يوم</span>
                </div>
              </Card>
              <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                <div className="text-xs text-muted-foreground">دوام الجمعات (إضافي)</div>
                <div className="text-2xl font-black font-mono text-blue-600 mt-1">
                  {currentMonthPayroll.fridayWorkedDays || 0} <span className="text-xs font-normal text-muted-foreground font-sans">يوم</span>
                </div>
              </Card>
              <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                <div className="text-xs text-muted-foreground">أيام الغياب المسجلة</div>
                <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                  {currentMonthPayroll.absentDays || 0} <span className="text-xs font-normal text-muted-foreground font-sans">يوم</span>
                </div>
              </Card>
              <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                <div className="text-xs text-muted-foreground">عجز وتأخير الساعات</div>
                <div className="text-xl font-black font-mono text-amber-600 mt-1">
                  {Math.floor((currentMonthPayroll.totalShortfallMinutes || 0) / 60)} س و {(currentMonthPayroll.totalShortfallMinutes || 0) % 60} د
                </div>
              </Card>
            </div>
          )}

          {/* Recent Requests Section */}
          <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 className="font-heading font-black text-base text-foreground">أحدث الطلبات المقدمة</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('requests')} className="text-xs font-bold text-emerald-600">
                عرض كافة الطلبات ➔
              </Button>
            </div>

            {requestsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                لا توجد طلبات معلقة مسجلة لديك حالياً.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {requestsList.slice(0, 3).map(req => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-foreground">
                        {req.details?.request_label || req.type}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {req.request_number} • {new Date(req.created_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                    <Badge className={
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }>
                      {req.status === 'approved' ? 'معتمد ✓' : req.status === 'rejected' ? 'مرفوض ✗' : 'قيد المراجعة ⏳'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

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

      {/* ─── 7. TAB 5: MY PERFORMANCE ───────────────────────────────────────── */}
      {activeTab === 'performance' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-heading font-black text-lg text-foreground">سجل تقييم الأداء الوظيفي</h2>
              <p className="text-xs text-muted-foreground">نتائج التقييمات الربع سنوية، نقاط القوة، وأهداف التطوير</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1">
              ⭐ ممتاز مرتفع (A+)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
              <div className="text-xs font-bold text-emerald-800">الانضباط والالتزام بالدوام</div>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-1">98%</div>
            </Card>
            <Card className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
              <div className="text-xs font-bold text-blue-800">جودة الإنجاز والإنتاجية</div>
              <div className="text-2xl font-black font-mono text-blue-600 mt-1">96%</div>
            </Card>
            <Card className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
              <div className="text-xs font-bold text-purple-800">التعاون والعمل الجماعي</div>
              <div className="text-2xl font-black font-mono text-purple-600 mt-1">95%</div>
            </Card>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
            <div className="font-bold text-xs text-foreground">توصيات وملاحظات الإدارة:</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              موظف متميز ومثال يُحتذى به في الانضباط وخدمة العملاء. الاستمرار في الحفاظ على هذا المستوى الاحترافي الممتاز.
            </p>
          </div>
        </Card>
      )}

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
                        <Badge className={empContract.signed_by_employee ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}>
                          {empContract.signed_by_employee ? '✓ معتمد وموقع رقمياً' : '⏳ بانتظار توقيعك الإلكتروني'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        رقم العقد: {empContract.contract_number} • صاحب العمل: درة السيارة لقطع غيار السيارات
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => setContractModalOpen(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-10 px-5 rounded-xl gap-2 shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{empContract.signed_by_employee ? 'عرض وطباعة العقد A4' : 'قراءة وتوقيع العقد الآن'}</span>
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

      {/* ─── 14. MOBILE FIXED BOTTOM NAVIGATION ──────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2 flex items-center justify-around shadow-2xl">
        {[
          { id: 'home', label: 'الرئيسية', icon: Home },
          { id: 'attendance', label: 'حضوري', icon: Clock },
          { id: 'requests', label: 'طلباتي', icon: FileText },
          { id: 'payroll', label: 'مسيري', icon: Wallet },
          { id: 'documents', label: 'عقدي', icon: FolderOpen },
          { id: 'account', label: 'حسابي', icon: User }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{t.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
