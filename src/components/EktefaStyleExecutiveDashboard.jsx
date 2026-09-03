import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  FileText,
  Bell,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UploadCloud,
  Settings,
  ShieldCheck,
  Building2,
  MapPin,
  Eye,
  CheckCircle,
  XCircle,
  RotateCw,
  Wallet,
  Star,
  Mail,
  CalendarDays,
  Plus,
  DollarSign,
  Palmtree,
  TrendingUp,
  CreditCard,
  Building,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Megaphone
} from 'lucide-react';
import { getUnifiedRequests } from '@/lib/requestsEngine';
import { getStoredEvaluations } from '@/lib/evaluationsEngine';
import { getCompanyProfile } from '@/lib/companyProfile';
import { hasRealBiometricPunches, calcActualMinutes } from '@/lib/payrollEngine';

export default function EktefaStyleExecutiveDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [unifiedRequests, setUnifiedRequests] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Sub-Tab: 'overview' | 'team' | 'attendance' | 'payroll' | 'evaluations'
  const [activeTab, setActiveTab] = useState('overview');

  // Circulars Carousel Index
  const [circularIndex, setCircularIndex] = useState(0);

  // Real Current Date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Official Announcements
  const [announcementsList, setAnnouncementsList] = useState([]);

  // Load Real Data strictly from Base44 DB and unified stores
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [emps, logs, shs] = await Promise.all([
          base44.entities.Employee.list(),
          base44.entities.AttendanceLog.list('-log_date', 5000),
          base44.entities.Shift.list()
        ]);
        setEmployees(emps || []);
        setAttendanceLogs(logs || []);
        setShifts(shs || []);
        setUnifiedRequests(getUnifiedRequests());
        setEvaluations(getStoredEvaluations());

        // Load announcements from storage
        try {
          const rawAnn = localStorage.getItem('hr_flow_announcements');
          if (rawAnn) {
            const parsed = JSON.parse(rawAnn);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAnnouncementsList(parsed);
            }
          }
        } catch (e) {}

      } catch (e) {
        console.error('Error loading dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleReqUpdate = () => setUnifiedRequests(getUnifiedRequests());
    const handleEvalUpdate = () => setEvaluations(getStoredEvaluations());
    window.addEventListener('hr_requests_updated', handleReqUpdate);
    window.addEventListener('hr_evaluations_updated', handleEvalUpdate);
    return () => {
      window.removeEventListener('hr_requests_updated', handleReqUpdate);
      window.removeEventListener('hr_evaluations_updated', handleEvalUpdate);
    };
  }, []);

  // Default company circulars if none created in system
  const defaultCirculars = [
    {
      id: 'c1',
      title: 'إجازة عيد الفطر المبارك الرسمية',
      subtitle: 'تعميم إجازة عيد الفطر المبارك إلى فريق عمل شركة درة السيارة لقطع الغيار',
      date: '2026-03-17',
      content: [
        'الخميس 19 مارس 2026 – بداية الإجازة الرسمية.',
        'الجمعة 20 مارس 2026 – عطلة نهاية الأسبوع.',
        'السبت 21 مارس 2026 – عطلة العيد.',
        'الأحد 22 مارس 2026 – عطلة العيد.',
        'الاثنين 23 مارس 2026 – آخر يوم في الإجازة واستئناف العمل الثلاثاء.'
      ],
      note: 'تنويه: يستمر عمل الفروع المناوبة بحسب جدول التغطية المعتمد من المدير العام.'
    },
    {
      id: 'c2',
      title: 'الالتزام بالزي الرسمي والهندام المعتمد',
      subtitle: 'قرار إداري رقم (14/2026) بشأن الهوية المؤسسية في كافة الفروع',
      date: '2026-08-15',
      content: [
        'الالتزام بارتداء قميص الشركة الرسمي المعتمد في كافة فترات الدوام.',
        'حمل بطاقة العمل التعريفية وإبرازها أثناء خدمة العملاء.',
        'الحرص على نظافة وترتيب صالة العرض والمستودعات أولاً بأول.'
      ],
      note: 'يدخل هذا المعيار ضمن التقييم الشهري لمكافآت التميز والإنتاجية.'
    },
    {
      id: 'c3',
      title: 'تنظيم مشتريات وتأمين قطع الغيار للفروع',
      subtitle: 'توجيهات الإدارة العامة لفرق المشتريات والمبيعات',
      date: '2026-09-01',
      content: [
        'سرعة رفع طلبات النواقص وقطع هيونداي وكيا النادرة عبر النظام.',
        'التنسيق الفوري مع الموردين المعتمدين ببريدة والرياض لضمان أفضل الأسعار.',
        'تدقيق فواتير الشراء ومطابقة الجرد مع مستودع الفرع الرئيسي.'
      ],
      note: 'مسؤولو المشتريات: عبدالعزيز الجوعي، صالح المحيميد، وخالد الجوعي.'
    }
  ];

  const activeCirculars = announcementsList.length > 0 ? announcementsList : defaultCirculars;
  const currentCircular = activeCirculars[circularIndex] || activeCirculars[0];

  // ─── 1. REAL METRICS CALCULATION STRICTLY FROM DB ────────────────────────
  const metrics = useMemo(() => {
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);
    const active = employees.filter(e => e.status === 'active');
    const onLeave = employees.filter(e => e.status === 'on_leave');

    // Real Today Biometrics
    const todayLogs = attendanceLogs.filter(l => l.log_date === todayStr);
    const presentTodayCount = todayLogs.filter(l => hasRealBiometricPunches(l) || l.status === 'present').length;
    const absentTodayCount = Math.max(0, active.length - presentTodayCount - onLeave.length);

    // Expiring IDs / Documents in real database
    const expiringDocs = active.filter(e => {
      if (!e.id_expiry_date) return false;
      const d = new Date(e.id_expiry_date);
      return d <= in30 && d >= today;
    });

    // Real Unified Requests
    const pendingRequests = unifiedRequests.filter(r => r.status === 'pending' || r.status === 'under_review');
    const approvedRequests = unifiedRequests.filter(r => r.status === 'approved');

    // Real Hours Calculation for Current Month
    const currentMonthPrefix = todayStr.slice(0, 7); // e.g. "2026-09"
    const monthLogs = attendanceLogs.filter(l => (l.log_date || '').startsWith(currentMonthPrefix));
    
    let monthTotalActualMins = 0;
    let monthTotalRequiredMins = 0;
    monthLogs.forEach(l => {
      const act = calcActualMinutes(l);
      monthTotalActualMins += act;
      monthTotalRequiredMins += 9 * 60; // standard 9 hours shift
    });

    const monthActualHours = Math.round((monthTotalActualMins / 60) * 10) / 10;
    const monthRequiredHours = Math.round((monthTotalRequiredMins / 60) * 10) / 10 || (active.length * 30 * 9);
    const monthProgressPercent = monthRequiredHours > 0 
      ? Math.min(100, Math.round((monthActualHours / monthRequiredHours) * 100)) 
      : 0;

    // Real Hours for Current Week (Last 7 Days)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const weekLogs = attendanceLogs.filter(l => l.log_date >= sevenDaysAgo && l.log_date <= todayStr);
    
    let weekTotalActualMins = 0;
    let weekTotalRequiredMins = (active.length * 6 * 9 * 60); // 6 working days * 9 hrs
    weekLogs.forEach(l => {
      weekTotalActualMins += calcActualMinutes(l);
    });

    const weekActualHours = Math.round((weekTotalActualMins / 60) * 10) / 10;
    const weekRequiredHours = Math.round((weekTotalRequiredMins / 60) * 10) / 10;
    const weekProgressPercent = weekRequiredHours > 0 
      ? Math.min(100, Math.round((weekActualHours / weekRequiredHours) * 100)) 
      : 0;

    // Real Attendance Rate over the last 30 days
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const last30DaysLogs = attendanceLogs.filter(l => l.log_date >= thirtyDaysAgo && l.log_date <= todayStr);
    const validPunchesIn30Days = last30DaysLogs.filter(l => hasRealBiometricPunches(l)).length;
    const totalExpectedWorkingSlots = Math.max(1, active.length * 26); // 26 working days approx
    const realAttendanceRate30Days = Math.min(100, Math.round((validPunchesIn30Days / totalExpectedWorkingSlots) * 100));

    return {
      totalEmployees: employees.length,
      activeCount: active.length,
      onLeaveCount: onLeave.length,
      presentToday: presentTodayCount,
      absentToday: absentTodayCount,
      expiringDocsCount: expiringDocs.length,
      pendingRequestsCount: pendingRequests.length,
      approvedRequestsCount: approvedRequests.length,
      evaluationsCount: evaluations.length,
      monthActualHours,
      monthRequiredHours,
      monthProgressPercent,
      weekActualHours,
      weekRequiredHours,
      weekProgressPercent,
      realAttendanceRate30Days
    };
  }, [employees, attendanceLogs, unifiedRequests, evaluations, todayStr]);

  // ─── 2. REAL PUNCHES FOR LOGGED-IN USER TODAY ─────────────────────────────
  const todayUserLog = useMemo(() => {
    if (!user) return null;
    const clean = (v) => String(v || '').replace('emp_', '').trim();
    const userId = clean(user.id);
    const userEmpNum = clean(user.employee_number || user.employee_id);

    return attendanceLogs.find(l => {
      if (l.log_date !== todayStr) return false;
      const lId = clean(l.employee_id || l.user_id);
      const lNum = clean(l.employee_number);
      return (lId && (lId === userId || lId === userEmpNum)) || (lNum && (lNum === userEmpNum || lNum === userId));
    }) || null;
  }, [attendanceLogs, user, todayStr]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans select-none" dir="rtl">
      
      {/* ─── 1. TOP GREETING & STATUS BAR (Ektefa Header Style) ─────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Right: Personalized Greeting */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-emerald-950 border border-emerald-500/30 text-white flex items-center justify-center p-2 shadow-md shrink-0">
            <img 
              src={company.logo_url || "/company-logo.svg"} 
              alt="Logo" 
              className="w-full h-full object-contain filter drop-shadow" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-black text-base sm:text-lg text-foreground">
                👋 مرحباً بعودتك، {user?.full_name || user?.name || 'فهد ناصر محمد الجوعي'}
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10.5px] font-bold">
                {user?.role === 'owner' ? 'المدير العام 👑' : (user?.role === 'accountant' ? 'مدير المالية 💼' : 'مدير النظام 🛡️')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>{todayDateFormatted}</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">شركة درة السيارة لقطع غيار السيارات</span>
            </p>
          </div>
        </div>

        {/* Left: Quick Refresh & Employee Directory */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-xl text-xs h-9 px-3 gap-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="تحديث البيانات اللحظية من قاعدة البيانات"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>تحديث</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/employees')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-sm"
          >
            <span>دليل الموظفين ➔</span>
          </Button>
        </div>

      </div>

      {/* ─── 2. QUICK ACTION GRID BAR (8 High-Priority Actions - Ektefa Style) ─ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* 1. Add Employee */}
        <Button
          onClick={() => navigate('/employees')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-emerald-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-emerald-600 font-bold group-hover:scale-110 transition-transform">➕</span>
            <span>إضافة موظف</span>
          </span>
          <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
        </Button>

        {/* 2. Payroll Export */}
        <Button
          onClick={() => navigate('/payroll')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-sky-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-sky-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-sky-600 font-bold group-hover:scale-110 transition-transform">💵</span>
            <span>تصدير مسير الراتب</span>
          </span>
          <Wallet className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
        </Button>

        {/* 3. Shifts & Timings */}
        <Button
          onClick={() => navigate('/shifts')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-indigo-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-indigo-600 font-bold group-hover:scale-110 transition-transform">🕒</span>
            <span>إضافة فترة عمل</span>
          </span>
          <Clock className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
        </Button>

        {/* 4. Circulars & Mails */}
        <Button
          onClick={() => navigate('/announcements')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-pink-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-pink-600 font-bold group-hover:scale-110 transition-transform">✉️</span>
            <span>إرسال تعميم إداري</span>
          </span>
          <Megaphone className="w-4 h-4 text-slate-400 group-hover:text-pink-600 shrink-0" />
        </Button>

        {/* 5. Biometrics Correction */}
        <Button
          onClick={() => navigate('/attendance')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-orange-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-orange-600 font-bold group-hover:scale-110 transition-transform">📅</span>
            <span>طلب تصحيح بصمة</span>
          </span>
          <Clock className="w-4 h-4 text-slate-400 group-hover:text-orange-600 shrink-0" />
        </Button>

        {/* 6. Leave Approval */}
        <Button
          onClick={() => navigate('/leave')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-teal-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-teal-600 font-bold group-hover:scale-110 transition-transform">🌴</span>
            <span>تقديم واعتماد إجازة</span>
          </span>
          <Palmtree className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
        </Button>

        {/* 7. Performance Evaluation */}
        <Button
          onClick={() => navigate('/evaluations')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-amber-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-amber-600 font-bold group-hover:scale-110 transition-transform">🏆</span>
            <span>رصد تقييم أداء</span>
          </span>
          <Star className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0" />
        </Button>

        {/* 8. Advances & Loans */}
        <Button
          onClick={() => navigate('/payroll?tab=advances')}
          variant="outline"
          className="h-12 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between px-3.5 shadow-sm text-xs font-bold text-foreground hover:border-purple-500 transition-all group"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-purple-600 font-bold group-hover:scale-110 transition-transform">💳</span>
            <span>إضافة وصرف سلفة</span>
          </span>
          <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-purple-600 shrink-0" />
        </Button>

      </div>

      {/* ─── 3. SUB-NAVIGATION TABS (Ektefa Navigation Pills) ────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة', path: '/' },
            { id: 'team', label: 'فريقي والفروع', path: '/employees' },
            { id: 'attendance', label: 'الحضور والانصراف', path: '/attendance' },
            { id: 'payroll', label: 'مسيرات الرواتب', path: '/payroll' },
            { id: 'evaluations', label: 'تقييم الأداء (KPIs)', path: '/evaluations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.path !== '/') navigate(tab.path);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Badge variant="outline" className="font-mono text-xs text-muted-foreground hidden sm:inline-flex">
          {metrics.totalEmployees} موظفين مسجلين بقاعدة البيانات
        </Badge>
      </div>

      {/* ─── 4. MAIN CENTRAL SECTION: 3-BOX REAL ATTENDANCE HUB & CIRCULARS ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ─── CENTER/RIGHT: 3-BOX ATTENDANCE & BIOMETRICS DASHBOARD (8 COLS) ── */}
        <div className="lg:col-span-8 space-y-4">
          
          <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
            
            {/* Header: Shift Title & Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold">الوردية ومواعيد العمل الفعلية اليوم</span>
                <h3 className="text-base font-heading font-black text-foreground">
                  {user?.shift || 'وردية كادر الفروع والمبيعات (فترتين)'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50 dark:bg-slate-800 px-3 py-1">
                  📅 {todayStr}
                </Badge>
              </div>
            </div>

            {/* 3 Columns Sub-Grid with Real Dynamic DB Data */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Box 1: Real Today's Punch Boxes (5 Cols) */}
              <div className="md:col-span-5 space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  
                  {/* Period 1 Check-In */}
                  <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
                    <div className="text-[10px] text-sky-800 dark:text-sky-300 font-bold">دخول صباحي</div>
                    <div className="font-mono font-black text-base text-sky-600 mt-0.5">
                      {todayUserLog?.period_1_in || (todayUserLog?.check_in ? (todayUserLog.check_in.includes('T') ? todayUserLog.check_in.slice(11, 16) : todayUserLog.check_in.slice(0, 5)) : '--:--')}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {todayUserLog?.period_1_in || todayUserLog?.check_in ? 'تم تسجيل البصمة ✓' : 'بانتظار البصمة'}
                    </div>
                  </div>

                  {/* Period 1 Check-Out */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-muted-foreground font-bold">خروج صباحي</div>
                    <div className="font-mono font-black text-base text-slate-700 dark:text-slate-300 mt-0.5">
                      {todayUserLog?.period_1_out || '--:--'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {todayUserLog?.period_1_out ? 'تم الخروج ✓' : 'الفترة الصباحية'}
                    </div>
                  </div>

                  {/* Period 2 Check-In */}
                  <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">دخول مسائي</div>
                    <div className="font-mono font-black text-base text-emerald-600 mt-0.5">
                      {todayUserLog?.period_2_in || '--:--'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {todayUserLog?.period_2_in ? 'تم تسجيل البصمة ✓' : 'الفترة المسائية'}
                    </div>
                  </div>

                  {/* Period 2 Check-Out */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-muted-foreground font-bold">خروج مسائي</div>
                    <div className="font-mono font-black text-base text-slate-700 dark:text-slate-300 mt-0.5">
                      {todayUserLog?.period_2_out || (todayUserLog?.check_out ? (todayUserLog.check_out.includes('T') ? todayUserLog.check_out.slice(11, 16) : todayUserLog.check_out.slice(0, 5)) : '--:--')}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {todayUserLog?.period_2_out || todayUserLog?.check_out ? 'تم تسجيل الانصراف ✓' : 'نهاية الدوام'}
                    </div>
                  </div>

                </div>

                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-center text-[10.5px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الفرع المعتمد: {user?.branch_name || user?.branch || 'الفرع الرئيسي (بريدة)'}</span>
                </div>
              </div>

              {/* Box 2: Real Working Hours Progress from Database (4 Cols) */}
              <div className="md:col-span-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4 text-xs">
                <div className="font-heading font-black text-foreground text-xs border-b pb-1.5 flex items-center justify-between">
                  <span>📊 إنجاز ساعات العمل الموثقة</span>
                  <Badge variant="outline" className="text-[9px] font-mono font-bold">من واقع البصمات</Badge>
                </div>

                {/* This Week */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">هذا الأسبوع</span>
                    <span className="font-mono text-sky-600 font-black">
                      {metrics.weekActualHours} / {metrics.weekRequiredHours} س
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                      style={{ width: `${metrics.weekProgressPercent}%` }} 
                    />
                  </div>
                  <div className="text-[9.5px] text-muted-foreground text-left font-mono">
                    {metrics.weekProgressPercent}% منجز
                  </div>
                </div>

                {/* This Month */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">شهر ({todayStr.slice(0, 7)})</span>
                    <span className="font-mono text-emerald-600 font-black">
                      {metrics.monthActualHours} / {metrics.monthRequiredHours} س
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${metrics.monthProgressPercent}%` }} 
                    />
                  </div>
                  <div className="text-[9.5px] text-muted-foreground text-left font-mono">
                    {metrics.monthProgressPercent}% منجز
                  </div>
                </div>
              </div>

              {/* Box 3: Real Attendance Donut Chart / Breakdown (3 Cols) */}
              <div className="md:col-span-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-[10px] text-muted-foreground font-bold">نسبة الحضور الفعلي آخر 30 يوماً</div>
                
                {/* Visual SVG Donut Indicator based on Real DB Data */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${metrics.realAttendanceRate30Days}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute font-heading font-black text-sm text-foreground">
                    {metrics.realAttendanceRate30Days}%
                  </div>
                </div>

                <div className="text-[10px] text-emerald-600 font-bold">
                  {metrics.realAttendanceRate30Days >= 80 ? 'انضباط ممتاز ✓' : (metrics.realAttendanceRate30Days > 0 ? 'متابعة دورية' : 'بانتظار تسجيل البصمات')}
                </div>
              </div>

            </div>

          </Card>

        </div>

        {/* ─── LEFT: CIRCULARS & ANNOUNCEMENTS CAROUSEL (4 COLS - Ektefa Style) ─ */}
        <div className="lg:col-span-4 space-y-4">
          
          <Card className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-3.5 flex flex-col justify-between min-h-[340px]">
            
            {/* Header with Navigation Controls */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-600" />
                <h3 className="font-heading font-black text-sm text-foreground">التعاميم والقرارات الإدارية</h3>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setCircularIndex(prev => (prev - 1 + activeCirculars.length) % activeCirculars.length)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setCircularIndex(prev => (prev + 1) % activeCirculars.length)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Circular Content Card */}
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  تعميم رقم {circularIndex + 1}
                </Badge>
                <span className="text-[10.5px] font-mono text-muted-foreground">{currentCircular?.date || currentCircular?.created_at || todayStr}</span>
              </div>

              <h4 className="font-heading font-black text-sm text-foreground">
                {currentCircular?.title || 'تعميم إداري'}
              </h4>
              <p className="text-[11px] text-muted-foreground font-medium">
                {currentCircular?.subtitle || currentCircular?.summary || ''}
              </p>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                {Array.isArray(currentCircular?.content) ? (
                  currentCircular.content.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <p className="leading-relaxed">{currentCircular?.content || currentCircular?.body || 'نص التعميم الإداري المعتمد.'}</p>
                )}
              </div>

              {currentCircular?.note && (
                <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-bold pt-1">
                  💡 {currentCircular.note}
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-2 border-t flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/announcements')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-500 p-0 h-auto"
              >
                عرض كافة التعاميم الإدارية ➔
              </Button>
              <span className="text-[10px] font-mono text-muted-foreground">
                {circularIndex + 1} من {activeCirculars.length}
              </span>
            </div>

          </Card>

        </div>

      </div>

      {/* ─── 5. BOTTOM KPI COUNTERS ROW (Real Database Counts) ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* 1. Pending Requests (Real DB Count) */}
        <Card 
          onClick={() => navigate('/approvals')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm hover:border-amber-500 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground font-bold">طلبات الكادر المعلقة</div>
            <div className="text-2xl font-black font-mono text-amber-600">
              {metrics.pendingRequestsCount}
            </div>
            <div className="text-[10px] text-muted-foreground group-hover:text-amber-600 transition-colors">
              بانتظار المراجعة والاعتماد
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <ClipboardList className="w-5 h-5" />
          </div>
        </Card>

        {/* 2. Approved Requests (Real DB Count) */}
        <Card 
          onClick={() => navigate('/approvals')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm hover:border-emerald-500 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground font-bold">الموافقات والقرارات</div>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {metrics.approvedRequestsCount}
            </div>
            <div className="text-[10px] text-muted-foreground group-hover:text-emerald-600 transition-colors">
              تم اعتمادها رسمياً
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* 3. Today Present vs Absent (Real Attendance DB Count) */}
        <Card 
          onClick={() => navigate('/attendance')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm hover:border-sky-500 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground font-bold">حضور اليوم بالبصمة</div>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {metrics.presentToday} <span className="text-xs text-muted-foreground font-normal font-sans">/ {metrics.activeCount}</span>
            </div>
            <div className="text-[10px] text-muted-foreground group-hover:text-sky-600 transition-colors">
              الغياب المسجل اليوم: {metrics.absentToday}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        {/* 4. Expiring IDs & Alerts (Real DB Count) */}
        <Card 
          onClick={() => navigate('/alerts')}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm hover:border-rose-500 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground font-bold">تنبيهات الوثائق والإقامات</div>
            <div className="text-2xl font-black font-mono text-rose-600">
              {metrics.expiringDocsCount}
            </div>
            <div className="text-[10px] text-muted-foreground group-hover:text-rose-600 transition-colors">
              تستوجب التجديد خلال 30 يوماً
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
        </Card>

      </div>

    </div>
  );
}
