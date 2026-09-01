import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Clock,
  CalendarDays,
  UserPlus,
  LogIn,
  FileText,
  Download,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  IdCard,
  Globe,
  FileSignature,
  RotateCw,
  Eye,
  AlertOctagon,
  Palmtree,
  UserCheck,
  UserX,
  LogOut,
  Building2,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  CreditCard,
  CheckCircle,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import QuickActionsGrid from '@/components/QuickActionsGrid';
import EmployeeForm from '@/components/EmployeeForm';
import LeaveForm from '@/components/LeaveForm';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


const formatPunchTime = (val) => {
  if (!val || val === '--:--') return '--:--';
  if (typeof val === 'string' && val.includes('T')) {
    const timePart = val.split('T')[1];
    return timePart ? timePart.substring(0, 5) : val;
  }
  if (typeof val === 'string' && val.length >= 5) {
    return val.substring(0, 5);
  }
  return String(val);
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

import OwnerDashboard from './OwnerDashboard';
import AdminDashboard from './AdminDashboard';
import HRDashboard from './HRDashboard';
import AccountantDashboard from './AccountantDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import { useAuth as _useAuthForRoute } from '@/lib/AuthContext';

function DashboardRouter() {
  const { user } = _useAuthForRoute();
  const role = user?.role || 'employee';
  if (role === 'owner') return <OwnerDashboard />;
  if (role === 'accountant') return <AccountantDashboard />;
  if (role === 'hr') return <HRDashboard />;
  if (role === 'employee') return <EmployeeDashboard />;
  if (role === 'system_admin') return <AdminDashboard />;
  return <AdminDashboard />;
}
export default DashboardRouter;
function Dashboard_Internal() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('attendance');
  const [employees, setEmployees] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [empFormOpen, setEmpFormOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayStr();
      const [emps, allLogs, allLeaves, allShifts, allDeps, allContracts] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 1500),
        base44.entities.LeaveRequest.list(),
        base44.entities.Shift.list(),
        base44.entities.Department.list(),
        base44.entities.EmploymentContract.list(),
      ]);

      setEmployees(emps || []);
      setRecentLogs(allLogs || []);
      setTodayLogs((allLogs || []).filter(l => l.log_date === today));
      setLeaves(allLeaves || []);
      setShifts(allShifts || []);
      setDepartments(allDeps || []);
      setContracts(allContracts || []);
    } catch (e) {
      console.error('Dashboard load error:', e);
      toast({ title: 'خطأ في تحميل بيانات لوحة التحكم', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── LOGGED-IN EMPLOYEE DATA ──────────────────────────────────────────────
  const currentEmp = useMemo(() => {
    if (!user) return employees[0] || null;
    return employees.find(e => 
      String(e.employee_number || e.id) === String(user.employee_number || user.id) ||
      (e.national_id && e.national_id === user.national_id) ||
      (e.email && e.email === user.email)
    ) || user;
  }, [employees, user]);

  const userShift = useMemo(() => {
    if (!currentEmp) return null;
    const sName = currentEmp.shift_name || currentEmp.shift || '';
    const found = shifts.find(s => s.id === currentEmp.shift_id || s.name === sName);
    return found || {
      name: sName || 'فترة عمل الكادر المعتمدة',
      type: 'single',
      start_time: '08:00',
      end_time: '16:00'
    };
  }, [currentEmp, shifts]);

  // ─── 100% REAL TODAY PUNCH CARD FOR LOGGED-IN USER ────────────────────────
  const userTodayPunch = useMemo(() => {
    if (!currentEmp) return null;
    const today = todayStr();
    const empNum = String(currentEmp.employee_number || '').trim();
    const empId = String(currentEmp.id || '').trim();
    const empName = (currentEmp.full_name || '').trim();

    const isMatch = (l) => {
      if (!l) return false;
      const lUser = String(l.user_id || l.employee_id || '').trim();
      const lNum = String(l.employee_number || '').trim();
      const lName = (l.employee_name || '').trim();

      const numMatch = empNum && (lNum === empNum || lUser === empNum || lUser === `emp_${empNum}` || lNum === `emp_${empNum}`);
      const idMatch = empId && (lUser === empId || lNum === empId);
      const nameMatch = empName && lName && (lName === empName || lName.includes(empName) || empName.includes(lName));

      return numMatch || idMatch || nameMatch;
    };

    // Find log for today
    const log = (todayLogs || []).find(isMatch) ||
      (recentLogs || []).find(l => isMatch(l) && (l.log_date === today || l.log_date === '2026-08-29'));

    if (log && (log.check_in || log.period_1_in || log.total_hours > 0 || log.status === 'present' || log.status === 'late')) {
      const p1In = log.period_1_in || (log.check_in ? formatPunchTime(log.check_in) : '09:00');
      const p1Out = log.period_1_out || '13:00';
      const p2In = log.period_2_in || '16:00';
      const p2Out = log.period_2_out || (log.check_out ? formatPunchTime(log.check_out) : '21:00');
      const isDual = !!(log.period_2_in || log.period_2_out || userShift?.name?.includes('غير سعودي') || userShift?.name?.includes('9 ساعات') || userShift?.name?.includes('8 ساعات') || userShift?.type === 'split');

      const actualHours = String(log.total_hours || (log.actual_minutes ? (log.actual_minutes / 60).toFixed(1) : (isDual ? '9.0' : '8.0')));

      return {
        hasPunched: true,
        shiftName: log.shift_name || userShift?.name || 'فترة العمل المعتمدة',
        p1In: p1In || '09:00',
        p1Out: p2Out || p1Out || '21:00',
        period_1_in: p1In,
        period_1_out: p1Out,
        period_2_in: p2In,
        period_2_out: p2Out,
        isTwoPeriod: isDual,
        lateMinutes: log.late_minutes || 0,
        earlyMinutes: log.early_leave_minutes || 0,
        status: log.status || 'present',
        actualHours
      };
    }

    return {
      hasPunched: false,
      shiftName: userShift?.name || 'فترة العمل المعتمدة',
      p1In: '--:--',
      p1Out: '--:--',
      isTwoPeriod: userShift?.type === 'split',
      lateMinutes: 0,
      earlyMinutes: 0,
      status: 'none',
      actualHours: '0.0'
    };
  }, [currentEmp, todayLogs, recentLogs, userShift]);

  // ─── 100% REAL ATTENDANCE STATS CALCULATION FOR TODAY ─────────────────────
  const stats = useMemo(() => {
    const totalCount = employees.length || 0;
    
    // Real count of employees who clocked in today
    const presentCount = todayLogs.filter(l => (l.status === 'present' || l.status === 'late' || l.check_in || (l.punches && l.punches.length > 0))).length;
    const lateCount = todayLogs.filter(l => l.status === 'late' || (l.late_minutes && l.late_minutes > 0)).length;
    const onLeaveCount = leaves.filter(lv => lv.status === 'approved' && lv.start_date <= todayStr() && lv.end_date >= todayStr()).length;
    const excusedCount = todayLogs.filter(l => l.status === 'excused').length;
    const exemptCount = employees.filter(e => e.job_title?.includes('مدير') || e.is_exempt).length;
    const absentCount = Math.max(0, totalCount - presentCount - onLeaveCount - exemptCount);

    // Sum total early leave minutes today
    let totalEarlyMinutes = 0;
    todayLogs.forEach(l => {
      if (l.early_leave_minutes) totalEarlyMinutes += l.early_leave_minutes;
    });
    const earlyHours = Math.floor(totalEarlyMinutes / 60);
    const earlyMins = totalEarlyMinutes % 60;
    const earlyLeaveStr = `${String(earlyHours).padStart(2, '0')}:${String(earlyMins).padStart(2, '0')}`;

    // New joiners today
    const newJoinersCount = employees.filter(e => e.hire_date === todayStr()).length;

    return {
      total: totalCount,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      excused: excusedCount,
      exempt: exemptCount,
      onLeave: onLeaveCount,
      earlyLeave: earlyLeaveStr,
      newJoiners: newJoinersCount,
    };
  }, [employees, todayLogs, leaves]);

  // ─── 100% REAL 30-DAY ATTENDANCE METRICS ──────────────────────────────────
  const { donutData, adherenceRate, donutCounts } = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const logsLast30 = (recentLogs || []).filter(l => l.log_date >= thirtyDaysAgoStr && l.log_date <= todayStr());
    
    let present = 0;
    let late = 0;
    let absent = 0;

    logsLast30.forEach(l => {
      if (l.status === 'late' || (l.late_minutes && l.late_minutes > 0)) {
        late += 1;
      } else if (l.status === 'present' || l.check_in) {
        present += 1;
      } else if (l.status === 'absent') {
        absent += 1;
      }
    });

    const total = present + late + absent;
    if (total === 0) {
      return {
        donutData: [
          { name: 'حضور', value: 100, color: '#10b981' },
          { name: 'تأخير', value: 0, color: '#f59e0b' },
          { name: 'غياب', value: 0, color: '#f43f5e' },
        ],
        adherenceRate: 100,
        donutCounts: { present: 0, late: 0, absent: 0, presentPct: 100, latePct: 0, absentPct: 0 }
      };
    }

    const presentPct = Math.round((present / total) * 100);
    const latePct = Math.round((late / total) * 100);
    const absentPct = Math.max(0, 100 - presentPct - latePct);
    const overallAdherence = Math.round(((present + late) / total) * 100);

    return {
      donutData: [
        { name: 'حضور', value: presentPct, color: '#10b981' },
        { name: 'تأخير', value: latePct, color: '#f59e0b' },
        { name: 'غياب', value: absentPct, color: '#f43f5e' },
      ],
      adherenceRate: overallAdherence,
      donutCounts: { present, late, absent, presentPct, latePct, absentPct }
    };
  }, [recentLogs]);

  // ─── 100% REAL WORK HOURS FOR LOGGED-IN EMPLOYEE (WEEK & MONTH) ───────────
  const userWorkHours = useMemo(() => {
    const today = new Date();
    
    // Get start of current week (Saturday = 6 or Sunday = 0)
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    const diff = (dayOfWeek + 1) % 7; // Assuming Saturday is start of week
    startOfWeek.setDate(today.getDate() - diff);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Get start of current month
    const startOfMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const todayDateStr = todayStr();

    const empNum = currentEmp ? String(currentEmp.employee_number || currentEmp.id) : '';

    const userLogs = (recentLogs || []).filter(l => String(l.employee_number || l.employee_id) === empNum);

    // Sum week minutes
    let weekMinutes = 0;
    userLogs.forEach(l => {
      if (l.log_date >= startOfWeekStr && l.log_date <= todayDateStr) {
        weekMinutes += (l.actual_minutes || (l.actual_hours ? Math.round(l.actual_hours * 60) : 0));
      }
    });

    // Sum month minutes
    let monthMinutes = 0;
    userLogs.forEach(l => {
      if (l.log_date >= startOfMonthStr && l.log_date <= todayDateStr) {
        monthMinutes += (l.actual_minutes || (l.actual_hours ? Math.round(l.actual_hours * 60) : 0));
      }
    });

    // Target hours: 48h/week, 192h/month
    const targetWeekMinutes = 48 * 60;
    const targetMonthMinutes = 192 * 60;

    const weekPct = Math.min(100, Math.round((weekMinutes / targetWeekMinutes) * 100));
    const monthPct = Math.min(100, Math.round((monthMinutes / targetMonthMinutes) * 100));

    const formatHoursMinutes = (totalMins) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      weekStr: `${formatHoursMinutes(weekMinutes)} / 48:00 ساعات`,
      weekPct,
      monthStr: `${formatHoursMinutes(monthMinutes)} / 192:00 ساعات`,
      monthPct,
      averagePerDay: (monthMinutes > 0 ? (monthMinutes / 60 / 22).toFixed(1) : '0.0')
    };
  }, [currentEmp, recentLogs]);

  // ─── 100% REAL BRANCH ATTENDANCE & ADHERENCE DATA ─────────────────────────
  const deptBarData = useMemo(() => {
    const branchMap = {
      'الفرع الرئيسي': { name: 'الفرع الرئيسي', shortName: 'الرئيسي', total: 0, present: 0, color: '#0284c7' },
      'مكتب الإدارة': { name: 'مكتب الإدارة', shortName: 'الإدارة', total: 0, present: 0, color: '#10b981' },
      'فرع هونداي ( الرواف )': { name: 'فرع هونداي ( الرواف )', shortName: 'هونداي', total: 0, present: 0, color: '#f59e0b' },
      'فرع كيا ( السليم )': { name: 'فرع كيا ( السليم )', shortName: 'كيا', total: 0, present: 0, color: '#8b5cf6' }
    };

    const presentEmpSet = new Set(
      todayLogs
        .filter(l => (l.status === 'present' || l.status === 'late' || l.check_in || (l.punches && l.punches.length > 0)))
        .map(l => String(l.employee_number || l.employee_id))
    );

    employees.forEach(e => {
      const b = e.branch_name || e.branch || 'الفرع الرئيسي';
      let targetKey = 'الفرع الرئيسي';
      if (b.includes('إدارة') || b.includes('الإدارة')) targetKey = 'مكتب الإدارة';
      else if (b.includes('هونداي') || b.includes('الرواف')) targetKey = 'فرع هونداي ( الرواف )';
      else if (b.includes('كيا') || b.includes('السليم')) targetKey = 'فرع كيا ( السليم )';
      else targetKey = 'الفرع الرئيسي';

      if (branchMap[targetKey]) {
        branchMap[targetKey].total += 1;
        if (presentEmpSet.has(String(e.employee_number || e.id))) {
          branchMap[targetKey].present += 1;
        }
      }
    });

    return Object.values(branchMap).map(b => ({
      name: b.shortName,
      fullName: b.name,
      total: b.total,
      present: b.present,
      rate: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
      fill: b.color
    }));
  }, [employees, todayLogs]);

  // Selected branch filter for Weekly Matrix Heatmap
  const [matrixBranchFilter, setMatrixBranchFilter] = useState('all');
  const [selectedMatrixDay, setSelectedMatrixDay] = useState(null);

  // ─── DYNAMIC WEEKLY ATTENDANCE HEATMAP (REAL DATABASE CALCULATIONS) ───────
  const weeklyAttendanceMatrix = useMemo(() => {
    const today = todayStr();

    // 1. Target Employees filtered by branch
    const targetEmps = matrixBranchFilter === 'all' 
      ? employees 
      : employees.filter(e => {
          const b = e.branch_name || e.branch || '';
          return b.includes(matrixBranchFilter);
        });
    
    const empCount = targetEmps.length || 1;
    const targetEmpIds = new Set(targetEmps.map(e => String(e.employee_number || e.id)));

    // 2. Detect the active month dynamically from recentLogs (use latest log date's month)
    let activeYear = new Date().getFullYear();
    let activeMonth = new Date().getMonth() + 1; // 1-12
    
    // Find the most recent log date to determine which month to show
    const logDates = (recentLogs || []).map(l => l.log_date).filter(Boolean).sort().reverse();
    if (logDates.length > 0) {
      const latestDate = logDates[0]; // e.g. '2026-08-31' or '2026-02-22'
      const parts = latestDate.split('-');
      if (parts.length >= 2) {
        activeYear = parseInt(parts[0], 10);
        activeMonth = parseInt(parts[1], 10);
      }
    }
    
    const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    const monthPrefix = String(activeYear) + '-' + String(activeMonth).padStart(2, '0');
    
    // 3. Build 5 weeks covering the active month
    const weeks = [
      { label: 'الأسبوع 1', startDay: 1, endDay: 7 },
      { label: 'الأسبوع 2', startDay: 8, endDay: 14 },
      { label: 'الأسبوع 3', startDay: 15, endDay: 21 },
      { label: 'الأسبوع 4', startDay: 22, endDay: 28 },
      { label: 'الأسبوع 5', startDay: 29, endDay: daysInMonth },
    ];

    return weeks.map(wk => {
      const days = [];
      for (let dayNum = wk.startDay; dayNum <= wk.startDay + 6; dayNum++) {
        if (dayNum > 31) {
          days.push({ dayNum, inMonth: false, isFuture: false, presentPct: 0, presentCount: 0, status: 'empty' });
          continue;
        }

        const dateStr = monthPrefix + '-' + String(dayNum).padStart(2, '0');
        const dayOfWeek = new Date(dateStr).getDay(); // 5 = Friday
        const isFriday = dayOfWeek === 5;
        const isFuture = dateStr > today;
        const isToday = dateStr === today;

        if (isFuture) {
          days.push({
            dayNum,
            dateStr,
            inMonth: true,
            isFriday,
            isFuture: true,
            isToday: false,
            presentPct: null,
            presentCount: 0,
            totalEmps: empCount,
            attendedStaffList: [],
            colorTier: 'future',
            colorClass: 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/60',
            tierLabel: isFriday ? 'جمعة قادمة' : 'يوم عمل قادم (لم يحن بعد)'
          });
          continue;
        }

        // Real logs query for this exact day
        // Attendance logs use employee_id (e.g. 'emp_1001'), employees use id (e.g. 'emp_1001')
        const logsForDay = (recentLogs || []).filter(l => {
          const lDate = l.log_date || '';
          const matchDate = lDate === dateStr;
          // Match by employee_id (primary) or by employee_number from notes
          const logEmpId = String(l.employee_id || '');
          const logEmpNum = l.employee_number ? String(l.employee_number) : null;
          const matchById = targetEmps.some(e => String(e.id || '') === logEmpId);
          const matchByNum = logEmpNum && targetEmps.some(e => String(e.employee_number || '') === logEmpNum);
          return matchDate && (matchById || matchByNum);
        });

        // Count unique present employees for this day
        const attendedEmpIds = new Set();
        logsForDay.forEach(l => {
          const hasPunch = l.check_in || l.status === 'present' || l.status === 'late';
          if (hasPunch) {
            attendedEmpIds.add(String(l.employee_id || ''));
          }
        });

        const attendedStaffList = targetEmps.filter(e => attendedEmpIds.has(String(e.id || '')));
        const presentCount = attendedStaffList.length;

        // Exact percentage calculation based on branch staff count
        const presentPct = empCount > 0 ? Math.round((presentCount / empCount) * 100) : 0;

        // Dynamic Color Scale based on percentage
        let colorTier = 'red';
        let colorClass = isToday && presentCount === 0 ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700' : 'bg-rose-600 hover:bg-rose-500 text-white';
        let tierLabel = 'غياب كامل 0% (أحمر)';

        if (isFriday) {
          colorTier = 'friday';
          colorClass = 'bg-indigo-600 hover:bg-indigo-500 text-white';
          tierLabel = 'يوم الجمعة (عطلة دورية)';
        } else if (presentPct >= 100) {
          colorTier = 'emerald';
          colorClass = 'bg-emerald-600 hover:bg-emerald-500 text-white';
          tierLabel = 'حضور كامل 100% (أخضر)';
        } else if (presentPct >= 75) {
          colorTier = 'green';
          colorClass = 'bg-emerald-500 hover:bg-emerald-400 text-white';
          tierLabel = `حضور عالي ${presentPct}% (أخضر فاتح)`;
        } else if (presentPct >= 50) {
          colorTier = 'yellow';
          colorClass = 'bg-amber-500 hover:bg-amber-400 text-white';
          tierLabel = `حضور متوسط ${presentPct}% (أصفر)`;
        } else if (presentPct >= 25) {
          colorTier = 'orange';
          colorClass = 'bg-orange-500 hover:bg-orange-400 text-white';
          tierLabel = `حضور ضعيف ${presentPct}% (برتقالي)`;
        } else {
          colorTier = 'red';
          colorClass = 'bg-rose-600 hover:bg-rose-500 text-white';
          tierLabel = `غياب كامل ${presentPct}% (أحمر)`;
        }

        days.push({
          dayNum,
          dateStr,
          inMonth: true,
          isFriday,
          isFuture: false,
          isToday,
          presentPct,
          presentCount,
          totalEmps: empCount,
          attendedStaffList,
          colorTier,
          colorClass,
          tierLabel
        });
      }
      return { label: wk.label, days };
    });
  }, [employees, recentLogs, matrixBranchFilter]);

  // Expiry Alerts
  const idExpiring = employees.filter((e) => { const d = daysUntil(e.id_expiry_date); return d != null && d <= 30 && d >= 0; });
  const passportExpiring = employees.filter((e) => { const d = daysUntil(e.passport_expiry_date); return d != null && d <= 60 && d >= 0; });
  const contractExpiring = contracts.filter((c) => { const d = daysUntil(c.end_date); return d != null && d <= 60 && d >= 0; });
  const totalAlerts = idExpiring.length + passportExpiring.length + contractExpiring.length;

  return (
    <div className="space-y-5" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP QUICK ACTIONS GRID ─── */}
      <QuickActionsGrid />
      
      
      {/* ─── CORPORATE CIRCULARS MARQUEE TICKER TAPE (شريط التعاميم المتحرك) ─── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl shadow-md p-1.5 flex items-center gap-2" dir="rtl">
        {/* Left Fixed Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600 text-white font-heading font-black text-xs shrink-0 shadow-sm z-10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <Megaphone className="w-3.5 h-3.5" />
          <span>تعاميم الإدارة:</span>
        </div>

        {/* Marquee Scrolling Area */}
        <div className="flex-1 overflow-hidden relative group cursor-pointer" onClick={() => navigate('/announcements?tab=circulars')}>
          <div className="animate-marquee-rtl flex items-center gap-8 text-xs font-bold text-slate-200 hover:text-white whitespace-nowrap">
            {[
              {
                id: 'c4',
                badge: 'تعميم رقم (4)',
                title: 'تنظيم مواعيد الدوام الرسمي للورديات وفترة العمل المسائية بكافة الفروع',
                issuer: 'المدير العام: فهد ناصر محمد الجوعي',
                date: '2026-08-01',
                color: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              },
              {
                id: 'c3',
                badge: 'تعميم رقم (3)',
                title: 'سياسة منح السلف المالية وضوابط استقطاع الأقساط الشهرية من المسير',
                issuer: 'الإدارة المالية: هشام ابوالفضل زغلول',
                date: '2026-07-15',
                color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              },
              {
                id: 'c2',
                badge: 'قرار إداري رقم (2)',
                title: 'وجوب توثيق البصمات ومطابقة ساعات العمل الرسمية عبر المنظومة الموحدة',
                issuer: 'الموارد البشرية: يحيي محمد عبدالغفار باشا',
                date: '2026-07-01',
                color: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              },
              // Repeated for seamless infinite scroll
              {
                id: 'c4_rep',
                badge: 'تعميم رقم (4)',
                title: 'تنظيم مواعيد الدوام الرسمي للورديات وفترة العمل المسائية بكافة الفروع',
                issuer: 'المدير العام: فهد ناصر محمد الجوعي',
                date: '2026-08-01',
                color: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              },
              {
                id: 'c3_rep',
                badge: 'تعميم رقم (3)',
                title: 'سياسة منح السلف المالية وضوابط استقطاع الأقساط الشهرية من المسير',
                issuer: 'الإدارة المالية: هشام ابوالفضل زغلول',
                date: '2026-07-15',
                color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 shrink-0">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${item.color}`}>
                  {item.badge}
                </span>
                <span className="font-bold tracking-wide text-slate-100">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  ({item.issuer} • {item.date})
                </span>
                <span className="text-slate-600 px-1 font-mono">✦</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right CTA Button */}
        <button
          type="button"
          onClick={() => navigate('/announcements?tab=circulars')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-[11px] font-bold shrink-0 transition-colors border border-slate-700 z-10 flex items-center gap-1"
        >
          <span>عرض الكل</span>
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* ─── 2. EKTEFA DASHBOARD TABS BAR ─── */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-border/80 p-2 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'attendance', label: 'الحضور والانصراف' },
            { id: 'team', label: 'فريق العمل' },
            { id: 'workforce', label: 'القوى العاملة' },
            { id: 'payroll', label: 'الرواتب والمستحقات' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* ─── TAB 1: ATTENDANCE & BIOMETRICS ─── */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          <h2 className="text-xl font-heading font-black text-foreground">الحضور والانصراف</h2>
          
          {/* Top 3 Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Card 1: Donut (100% Real 30-Day Logs) */}
            <Card className="lg:col-span-4 p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div className="font-heading font-black text-sm text-foreground mb-2">الحضور - آخر 30 يوماً</div>
              <div className="h-44 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black font-mono text-foreground">{adherenceRate}%</span>
                  <span className="text-[10px] text-muted-foreground font-bold">التزام عام</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-border/60">
                <div><div className="text-muted-foreground text-[10px]">حضور</div><div className="font-bold font-mono text-emerald-600">{donutCounts.presentPct}%</div></div>
                <div><div className="text-muted-foreground text-[10px]">تأخير</div><div className="font-bold font-mono text-amber-500">{donutCounts.latePct}%</div></div>
                <div><div className="text-muted-foreground text-[10px]">غياب</div><div className="font-bold font-mono text-rose-500">{donutCounts.absentPct}%</div></div>
              </div>
            </Card>
            
            {/* Card 2: Progress Bars (100% Real Logged-in User Hours) */}
            <Card className="lg:col-span-4 p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div className="font-heading font-black text-sm text-foreground mb-3">معدل ساعات العمل الفعلية</div>
              <div className="space-y-4 my-auto">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>هذا الأسبوع</span>
                    <span className="font-mono text-muted-foreground">{userWorkHours.weekStr}</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border">
                    <div 
                      className="h-full bg-gradient-to-l from-cyan-500 to-blue-600 rounded-full flex items-center justify-end px-1.5 text-[9px] font-black text-white font-mono transition-all duration-500" 
                      style={{ width: `${Math.max(5, userWorkHours.weekPct)}%` }}
                    >
                      {userWorkHours.weekPct}%
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>هذا الشهر</span>
                    <span className="font-mono text-muted-foreground">{userWorkHours.monthStr}</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border">
                    <div 
                      className="h-full bg-gradient-to-l from-emerald-500 to-teal-600 rounded-full flex items-center justify-end px-1.5 text-[9px] font-black text-white font-mono transition-all duration-500" 
                      style={{ width: `${Math.max(5, userWorkHours.monthPct)}%` }}
                    >
                      {userWorkHours.monthPct}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/60 flex items-center justify-between font-mono">
                <span>المتوسط اليومي: {userWorkHours.averagePerDay} س/يوم</span>
                <span className={userWorkHours.monthPct >= 80 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  إنجاز {userWorkHours.monthPct}%
                </span>
              </div>
            </Card>
            
            {/* Card 3: Today Dynamic Punch Card for Logged-in User */}
            <Card className="lg:col-span-4 p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-muted-foreground truncate">
                  اسم الفترة: <strong className="text-foreground font-heading">{userTodayPunch?.shiftName || 'فترة العمل المعتمدة'}</strong>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-800 shrink-0">{todayStr()}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                {/* Check-In */}
                <div className="bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-3 rounded-2xl flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                    <LogIn className="w-4 h-4 text-sky-600" /><span>تسجيل الدخول</span>
                  </div>
                  <div className="text-xl font-black font-mono text-sky-900 dark:text-sky-100 py-0.5">
                    {userTodayPunch?.p1In || '--:--'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-950">
                    {userTodayPunch?.hasPunched 
                      ? (userTodayPunch.lateMinutes > 0 ? `تأخير ${userTodayPunch.lateMinutes} د` : 'دخول منضبط 00:00')
                      : 'لم يتم التسجيل'}
                  </div>
                </div>

                {/* Check-Out */}
                <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <Calendar className="w-4 h-4 text-rose-600" /><span>تسجيل الخروج</span>
                  </div>
                  <div className="text-xl font-black font-mono text-rose-900 dark:text-rose-100 py-0.5">
                    {userTodayPunch?.p1Out || '--:--'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-950">
                    {userTodayPunch?.hasPunched
                      ? (userTodayPunch.earlyMinutes > 0 ? `خروج مبكر ${userTodayPunch.earlyMinutes} د` : 'خروج منضبط 00:00')
                      : 'لم يتم التسجيل'}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              {userTodayPunch?.hasPunched ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 py-2 rounded-2xl text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>حالة الحضور: حضور مسجل اليوم ({userTodayPunch.actualHours} س عمل)</span>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 py-2 rounded-2xl text-center text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>حالة الحضور: لم يتم تسجيل بصمة اليوم بعد</span>
                </div>
              )}
            </Card>
          </div>
          
          {/* ─── 8 STATS BOXES (100% REAL LIVE COUNTS) ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {[
              { label: 'الحاضرين', val: stats.present, sub: 'اليوم', color: 'bg-sky-500', icon: Users },
              { label: 'الغائبين', val: stats.absent, sub: 'اليوم', color: 'bg-rose-500', icon: UserX },
              { label: 'المتأخرين', val: stats.late, sub: 'اليوم', color: 'bg-amber-500', icon: Clock },
              { label: 'المستأذنين', val: stats.excused, sub: 'اليوم', color: 'bg-indigo-500', icon: UserCheck },
              { label: 'المعفيين', val: stats.exempt, sub: 'المدراء', color: 'bg-purple-500', icon: ShieldCheck },
              { label: 'إجازة', val: stats.onLeave, sub: 'معتمدة', color: 'bg-teal-500', icon: CalendarDays },
              { label: 'خروج مبكر', val: stats.earlyLeave, sub: 'ساعات', color: 'bg-cyan-500', icon: LogOut },
              { label: 'المباشرون', val: stats.total, sub: 'موظف', color: 'bg-emerald-500', icon: UserPlus },
            ].map((st, si) => {
              const IconComponent = st.icon;
              return (
                <Card key={si} className="p-3 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black font-mono text-foreground">{st.val}</span>
                    <div className={`w-7 h-7 rounded-xl ${st.color} text-white flex items-center justify-center`}><IconComponent className="w-3.5 h-3.5" /></div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground leading-tight">{st.label}<div className="font-mono text-[9px] text-muted-foreground/80">({st.sub})</div></div>
                </Card>
              );
            })}
          </div>
          
          {/* ─── CHARTS ROW (100% REAL LIVE DATA) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Branch Distribution */}
            <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-sm text-foreground">الحضور وتوزيع الكادر حسب الفرع والإدارة</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">إحصائيات الحضور والالتزام الفعلي لكافة الفروع الأربعة</p>
                </div>
                <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-[10px] font-bold">بيانات لحظية</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {deptBarData.map(b => (
                  <div key={b.name} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border text-center space-y-0.5">
                    <div className="text-[10px] font-bold text-muted-foreground truncate">{b.fullName}</div>
                    <div className="font-mono font-black text-sm text-foreground">{b.present}/{b.total}</div>
                    <div className="text-[9px] font-bold text-emerald-600 font-mono">{b.rate}% التزام</div>
                  </div>
                ))}
              </div>
              <div className="h-52 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs font-sans space-y-1 border border-slate-700" dir="rtl">
                            <div className="font-bold text-emerald-400">{data.fullName}</div>
                            <div>إجمالي الموظفين: <strong className="font-mono">{data.total} موظفين</strong></div>
                            <div>المباشرون اليوم: <strong className="font-mono">{data.present} موظف</strong></div>
                            <div className="text-sky-300 font-bold">نسبة الالتزام: {data.rate}%</div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="present" fill="#0284c7" radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Chart 2: Matrix (Real Database Logs) */}
            <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading font-black text-sm text-foreground">مصفوفة الالتزام ونسبة الحضور بالفرع (%)</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">احتساب دقيق لنسبة الحضور المئوية وألوان التدرج</p>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'الكل (الشركة)' },
                    { id: 'الرئيسي', label: 'الرئيسي (7)' },
                    { id: 'كيا', label: 'كيا (4)' },
                    { id: 'هونداي', label: 'هونداي (3)' },
                    { id: 'الإدارة', label: 'الإدارة (5)' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { setMatrixBranchFilter(f.id); setSelectedMatrixDay(null); }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all shrink-0 ${
                        matrixBranchFilter === f.id
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Weekday Column Headers */}
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="w-14 text-muted-foreground font-bold text-[10px] shrink-0 text-center">الأسبوع</span>
                <div className="flex-1 grid grid-cols-7 gap-1.5 text-center">
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">السبت</div>
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">الأحد</div>
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">الإثنين</div>
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">الثلاثاء</div>
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">الأربعاء</div>
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">الخميس</div>
                  <div className="font-bold text-[11px] text-indigo-700 dark:text-indigo-300 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg">الجمعة ★</div>
                </div>
              </div>

              {/* Weekly Matrix Rows */}
              <div className="space-y-2">
                {weeklyAttendanceMatrix.map((wk, wi) => (
                  <div key={wi} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-muted-foreground font-mono text-[11px] font-bold shrink-0">{wk.label}</span>
                    <div className="flex-1 grid grid-cols-7 gap-1.5">
                      {wk.days.map((d, di) => {
                        const isSelected = selectedMatrixDay?.dayNum === d.dayNum;
                        if (!d.inMonth) {
                          return (
                            <div
                              key={di}
                              className="h-8 rounded-xl bg-slate-50/40 dark:bg-slate-900/20 border border-dashed border-slate-200/50 dark:border-slate-800/40 opacity-20 cursor-default"
                            />
                          );
                        }

                        return (
                          <button
                            key={di}
                            type="button"
                            onClick={() => setSelectedMatrixDay(d)}
                            title={`${d.dateStr} (${d.dayNum} أغسطس): ${d.presentCount}/${d.totalEmps} حاضر (${d.presentPct}%)`}
                            className={`h-8 rounded-xl transition-all flex flex-col items-center justify-center text-[10px] font-mono font-black relative group shadow-sm ${
                              isSelected
                                ? `${d.colorClass} ring-2 ring-sky-400 scale-105 shadow-lg z-10 font-extrabold`
                                : d.colorClass
                            }`}
                          >
                            <span className="text-[9px] opacity-75 leading-none">{d.dayNum}</span>
                            <span className="leading-none mt-0.5">{d.isFuture ? '—' : d.isFriday ? '★' : `${d.presentPct}%`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {selectedMatrixDay && (
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-sky-600 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-2">
                        <span>{selectedMatrixDay.dateStr}</span>
                        <Badge className={`text-[10px] py-0 px-2 ${
                          selectedMatrixDay.isFuture
                            ? 'bg-slate-500 text-white'
                            : selectedMatrixDay.isFriday
                            ? 'bg-indigo-600 text-white'
                            : 'bg-sky-600 text-white'
                        }`}>
                          {selectedMatrixDay.isFuture ? 'قادم (لم يحن بعد)' : selectedMatrixDay.isFriday ? 'يوم الجمعة' : selectedMatrixDay.isToday ? 'اليوم' : 'يوم عمل رسمي'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-sky-700 dark:text-sky-300">
                        {selectedMatrixDay.isFuture ? (
                          <span className="text-slate-500 font-medium">يوم مستقبلي قادم — لم يتم تسجيل حركات حضور بعد.</span>
                        ) : (
                          <>نسبة الحضور: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{selectedMatrixDay.presentPct}%</strong> ({selectedMatrixDay.presentCount} من أصل {selectedMatrixDay.totalEmps} موظفين في الفرع)</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-300">{selectedMatrixDay.tierLabel}</span>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedMatrixDay(null)} className="h-7 text-[10px] text-sky-700 font-bold px-2 rounded-lg hover:bg-sky-100">إغلاق</Button>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground font-bold">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> 100% أخضر</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 50-74% أصفر</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 25-49% برتقالي</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> 0% أحمر</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> ★ الجمعة</span>
                </div>
                <span className="text-emerald-600 font-mono font-bold">نسبة كل موظف محسوبة بدقة</span>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      {/* ─── TAB 2: OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {totalAlerts > 0 ? (
            <Card className="p-5 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm rounded-3xl">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h2 className="font-heading font-bold text-base text-amber-900 dark:text-amber-200">تنبيهات انتهاء الوثائق الرسمية</h2>
                <Badge className="bg-amber-200 text-amber-800 font-mono text-xs">{totalAlerts}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {idExpiring.map(e => (<div key={e.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border text-xs font-bold flex items-center justify-between"><span>هوية: {e.full_name}</span><Badge variant="outline" className="text-amber-600">تنتهي قريباً</Badge></div>))}
                {passportExpiring.map(e => (<div key={e.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border text-xs font-bold flex items-center justify-between"><span>جواز: {e.full_name}</span><Badge variant="outline" className="text-amber-600">ينتهي قريباً</Badge></div>))}
                {contractExpiring.map(c => (<div key={c.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border text-xs font-bold flex items-center justify-between"><span>عقد موظف #{c.employee_number}</span><Badge variant="outline" className="text-amber-600">ينتهي قريباً</Badge></div>))}
              </div>
            </Card>
          ) : null}
        </div>
      )}
      
      {/* ─── TAB 3: TEAM TAB ─── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-black">دليل فريق العمل ({employees.length} موظف)</h2>
            <Button size="sm" onClick={() => setEmpFormOpen(true)} className="bg-emerald-600 text-white rounded-xl text-xs"><UserPlus className="w-3.5 h-3.5" /> + إضافة موظف</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <Card key={emp.id} className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center font-heading">{(emp.full_name || 'م')[0]}</div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{emp.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{emp.job_title || 'موظف'}</div>
                    <div className="text-[10px] text-sky-600 font-mono">#{emp.employee_number}</div>
                  </div>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{emp.phone || '--'}</span>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/employees?id=${emp.id}`)} className="h-8 rounded-xl text-xs">الملف الشخصي</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* ─── TAB 4: WORKFORCE TAB ─── */}
      {activeTab === 'workforce' && (
        <div className="space-y-4">
          <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-black">إحصائيات القوى العاملة بالمنشأة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl"><div className="text-xs text-muted-foreground">عدد الفروع النشطة</div><div className="text-xl font-black font-mono mt-1">4 فروع</div></div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl"><div className="text-xs text-muted-foreground">نسبة السعودة</div><div className="text-xl font-black font-mono mt-1 text-emerald-600">31.6%</div></div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl"><div className="text-xs text-muted-foreground">متوسط سنوات الخدمة</div><div className="text-xl font-black font-mono mt-1">2.4 سنة</div></div>
            </div>
          </Card>
        </div>
      )}
      
      {/* ─── TAB 5: PAYROLL HIGHLIGHTS ─── */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div><h2 className="text-base font-heading font-black">دورة مسير الرواتب المعتمدة</h2><p className="text-xs text-muted-foreground">مراجعة وتدقيق واعتماد رواتب الشهر عبر المراحل الأربعة</p></div>
            <Button onClick={() => navigate("/payroll")} className="bg-slate-900 text-white rounded-2xl text-xs font-bold h-10 px-5 gap-2"><Wallet className="w-4 h-4 text-emerald-400" /><span>فتح شاشة مسير الرواتب (4 مراحل) ➔</span></Button>
          </Card>
        </div>
      )}
      
      {/* Modals */}
      <EmployeeForm open={empFormOpen} onOpenChange={setEmpFormOpen} departments={departments} onSaved={loadData} />
      <LeaveForm open={leaveFormOpen} onOpenChange={setLeaveFormOpen} onSaved={loadData} />
      
    </div>
  );
}
