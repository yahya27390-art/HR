import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { getUnifiedRequests, saveUnifiedRequest } from '@/lib/requestsEngine';
import { 
  CalendarDays, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock4, 
  Filter, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  User, 
  Building2,
  TrendingDown,
  Sparkles,
  Download,
  Eye,
  Info,
  Send,
  Plane,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { sanitizeXlsxRows } from '@/lib/security';

export default function Leave() {
  const { user } = useAuth();
  const { toast } = useToast();

  const isManager = useMemo(() => {
    if (!user) return false;
    const role = user?.role;
    return role === 'admin' || role === 'owner' || role === 'hr' || role === 'accountant' || hasPermission(user, 'leave.manage');
  }, [user]);

  const [managerViewMode, setManagerViewMode] = useState(() => (isManager ? 'audit' : 'personal'));
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'requests'
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Details Modal
  const [selectedAuditEmp, setSelectedAuditEmp] = useState(null);

  // New Leave Modal for Employee
  const [newLeaveModalOpen, setNewLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual_leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, emps, logs] = await Promise.all([
        base44.entities.LeaveRequest.list(),
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 3000),
      ]);
      setRequests(reqs || []);
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
    } catch (e) {
      console.error('Error loading leave data:', e);
      toast({ title: 'خطأ في تحميل بيانات الإجازات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── ANNUAL LEAVE & ABSENCE AUDIT ENGINE (FULL YEAR 21 DAYS) ──────────────
  const auditReport = useMemo(() => {
    if (!employees.length) return [];

    return employees.map(emp => {
      const empNum = String(emp.employee_number || '').trim();
      const empId = String(emp.id || '').trim();
      const empName = (emp.full_name || '').trim();
      const isInsured = emp.is_insured === true || emp.is_insured === 'true' || emp.nationality === 'سعودي' || !!emp.gosi_number;

      // Filter all logs for this employee across the whole year
      const empLogs = attendanceLogs.filter(l => {
        const lUser = String(l.user_id || l.employee_id || '').trim();
        const lNum = String(l.employee_number || '').trim();
        const lName = (l.employee_name || '').trim();

        return (empNum && (lNum === empNum || lUser === empNum || lUser === `emp_${empNum}`)) ||
               (empId && (lUser === empId || lNum === empId)) ||
               (empName && lName && (lName === empName || lName.includes(empName) || empName.includes(lName)));
      });

      // Filter leave requests
      const empLeaves = requests.filter(r => {
        const rNum = String(r.employee_number || '').trim();
        const rId = String(r.employee_id || '').trim();
        return (empNum && rNum === empNum) || (empId && rId === empId) || (r.employee_name && r.employee_name.includes(empName));
      });

      // Calculate annual leaves taken
      const annualDaysList = [];
      const sickDaysList = [];
      const emergencyDaysList = [];
      const unpaidDaysList = [];
      const absenceDaysList = [];

      empLogs.forEach(l => {
        const st = (l.status || '').toLowerCase();
        const date = l.log_date;
        const dayNote = l.notes || '';

        if (st === 'annual_leave' || st.includes('سنوية') || dayNote.includes('annual_leave')) {
          if (!annualDaysList.find(d => d.date === date)) {
            annualDaysList.push({ date, type: 'إجازة سنوية 🏖️', source: 'سجل الحضور والمسير' });
          }
        } else if (st === 'sick_leave' || st.includes('مرضية')) {
          if (!sickDaysList.find(d => d.date === date)) {
            sickDaysList.push({ date, type: 'إجازة مرضية 🏥', source: 'سجل الحضور والمسير' });
          }
        } else if (st === 'emergency_leave' || st.includes('اضطرارية')) {
          if (!emergencyDaysList.find(d => d.date === date)) {
            emergencyDaysList.push({ date, type: 'إجازة اضطرارية ⚠️', source: 'سجل الحضور والمسير' });
          }
        } else if (st === 'unpaid_leave' || st.includes('بدون راتب')) {
          if (!unpaidDaysList.find(d => d.date === date)) {
            unpaidDaysList.push({ date, type: 'إجازة بدون راتب ⏳', source: 'سجل الحضور والمسير' });
          }
        } else if (st === 'unexcused_absence' || st === 'absent' || st === 'غائب') {
          if (!absenceDaysList.find(d => d.date === date)) {
            absenceDaysList.push({ date, type: 'غياب بدون إذن 🚫', source: 'سجل البصمات' });
          }
        }
      });

      // Add approved leave requests if not already in logs
      empLeaves.forEach(r => {
        if (r.status === 'approved' && r.start_date) {
          const days = Number(r.days_count) || 1;
          const typeStr = r.leave_type || 'سنوية';
          
          if (typeStr.includes('سنو') && annualDaysList.length === 0) {
            annualDaysList.push({ date: `${r.start_date} (${days} يوم)`, type: 'طلب إجازة سنوية معتمد', source: 'بوابة الطلبات' });
          }
        }
      });

      const totalAnnualEntitlement = isInsured ? 21 : 30;
      const annualUsed = annualDaysList.length;
      const remainingBalance = totalAnnualEntitlement - annualUsed;
      const isExceeded = remainingBalance < 0;
      const isDepleted = remainingBalance === 0;

      const pctUsed = Math.min(100, Math.round((annualUsed / totalAnnualEntitlement) * 100));

      return {
        emp,
        isInsured,
        totalAnnualEntitlement,
        annualUsed,
        remainingBalance,
        isExceeded,
        isDepleted,
        pctUsed,
        sickUsed: sickDaysList.length,
        emergencyUsed: emergencyDaysList.length,
        unpaidUsed: unpaidDaysList.length,
        absenceUsed: absenceDaysList.length,
        annualDaysList,
        sickDaysList,
        emergencyDaysList,
        unpaidDaysList,
        absenceDaysList,
      };
    });
  }, [employees, attendanceLogs, requests]);

  // Filtered Audit Report
  const filteredAudit = useMemo(() => {
    return auditReport.filter(item => {
      const name = item.emp.full_name || '';
      const num = item.emp.employee_number || '';
      const branch = item.emp.branch_name || item.emp.branch || '';
      
      const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                          num.includes(search) ||
                          branch.toLowerCase().includes(search.toLowerCase());
      
      if (!matchSearch) return false;

      if (filterType === 'insured') return item.isInsured;
      if (filterType === 'exceeded') return item.isExceeded;
      if (filterType === 'has_absence') return item.absenceUsed > 0;
      return true;
    });
  }, [auditReport, search, filterType]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredAudit.map((item, idx) => ({
      '#': idx + 1,
      'الرقم الوظيفي': item.emp.employee_number,
      'اسم الموظف': item.emp.full_name,
      'الفرع': item.emp.branch_name || item.emp.branch || 'الفرع الرئيسي',
      'المسمى الوظيفي': item.emp.job_title,
      'التأمين الاجتماعي': item.isInsured ? 'مؤمن عليه ✓' : 'غير مؤمن',
      'الرصيد السنوي المستحق': `${item.totalAnnualEntitlement} يوم`,
      'أيام الإجازة السنوية المستهلكة': item.annualUsed,
      'الرصيد المتبقي': item.remainingBalance,
      'أيام الغياب بدون إذن': item.absenceUsed,
      'أيام الإجازة المرضية': item.sickUsed,
      'حالة الرصيد': item.isExceeded ? '⚠️ تجاوز الرصيد المسموح' : (item.isDepleted ? 'استنفد الرصيد بالكامل' : 'ضمن الرصيد المتاح ✓')
    }));

    // [Security] Sanitize before writing to prevent Formula Injection in XLSX.
    const ws = XLSX.utils.json_to_sheet(sanitizeXlsxRows(dataToExport));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'مراجعة الإجازات السنوية 2026');
    XLSX.writeFile(wb, `تقرير_أرصدة_الإجازات_والغياب_السنوي_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: '✓ تم تصدير تقرير الإجازات والغياب السنوي إلى Excel بنجاح' });
  };

  // ─── STRICT PERSONAL EMPLOYEE ISOLATION ────────────────────────────────────
  const clean = (v) => String(v || '').replace('emp_', '').trim();
  const currentEmp = useMemo(() => {
    if (!employees.length) return null;
    return employees.find(e => 
      (user?.employee_number && clean(e.employee_number) === clean(user.employee_number)) ||
      (user?.id && clean(e.id) === clean(user.id)) ||
      (user?.national_id && clean(e.national_id) === clean(user.national_id)) ||
      (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
      (user?.full_name && e.full_name && clean(e.full_name) === clean(user.full_name))
    ) || (isManager ? employees[0] : null);
  }, [employees, user, isManager]);

  const myAudit = useMemo(() => {
    if (!currentEmp) return null;
    const empNum = clean(currentEmp.employee_number || currentEmp.id);
    const empName = clean(currentEmp.full_name);
    return auditReport.find(item => 
      clean(item.emp.employee_number) === empNum ||
      clean(item.emp.id) === empNum ||
      (empName && clean(item.emp.full_name) === empName)
    ) || null;
  }, [auditReport, currentEmp]);

  const myUnifiedLeaveRequests = useMemo(() => {
    if (!currentEmp) return [];
    const empNum = clean(currentEmp.employee_number || currentEmp.id);
    return getUnifiedRequests().filter(r => 
      clean(r.employee_number || r.employee_id) === empNum && 
      (r.type === 'annual_leave' || r.type === 'unpaid_leave' || r.type === 'leave_extension' || r.type === 'permission')
    );
  }, [currentEmp, requests]);

  const myApprovedLeavesList = useMemo(() => {
    const list = [];
    if (myAudit) {
      (myAudit.annualDaysList || []).forEach(d => {
        list.push({ date: d.date, type: d.type, days: 1, source: d.source || 'سجل الدوام والمسير' });
      });
      (myAudit.sickDaysList || []).forEach(d => {
        list.push({ date: d.date, type: d.type, days: 1, source: d.source || 'سجل الدوام والمسير' });
      });
      (myAudit.emergencyDaysList || []).forEach(d => {
        list.push({ date: d.date, type: d.type, days: 1, source: d.source || 'سجل الدوام والمسير' });
      });
      (myAudit.unpaidDaysList || []).forEach(d => {
        list.push({ date: d.date, type: d.type, days: 1, source: d.source || 'سجل الدوام والمسير' });
      });
    }

    // Include approved records from LeaveRequest entity
    if (currentEmp && requests.length) {
      const myNum = clean(currentEmp.employee_number || currentEmp.id);
      const myName = clean(currentEmp.full_name);

      requests.forEach(r => {
        const rNum = clean(r.employee_number || r.employee_id);
        const rName = clean(r.employee_name);

        if ((myNum && rNum === myNum) || (myName && rName && (rName === myName || rName.includes(myName)))) {
          if (r.status === 'approved') {
            const dateLabel = r.start_date ? `${r.start_date} ➔ ${r.end_date || r.start_date}` : 'إجازة معتمدة';
            if (!list.some(item => item.date === dateLabel)) {
              list.push({
                date: dateLabel,
                type: r.leave_type || 'إجازة معتمدة',
                days: Number(r.days_count) || 1,
                source: 'إدارة الموارد البشرية'
              });
            }
          }
        }
      });
    }

    // Add approved unified requests (avoiding duplicate dates)
    myUnifiedLeaveRequests
      .filter(r => r.status === 'approved')
      .forEach(r => {
        const dateLabel = r.details?.startDate ? `${r.details.startDate} ➔ ${r.details.endDate || r.details.startDate}` : (r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : 'معتمد');
        if (!list.some(item => item.date === dateLabel)) {
          list.push({
            date: dateLabel,
            type: r.details?.request_label || r.type,
            days: r.details?.days || 1,
            source: 'بوابة الخدمة الذاتية'
          });
        }
      });

    return list;
  }, [myAudit, myUnifiedLeaveRequests, requests, currentEmp]);

  const myPendingRequests = useMemo(() => {
    return myUnifiedLeaveRequests.filter(r => r.status === 'pending' || r.status === 'under_review');
  }, [myUnifiedLeaveRequests]);

  const handleCreateLeaveRequest = (e) => {
    e.preventDefault();
    if (!currentEmp) return;

    const payload = {
      type: leaveForm.type,
      employee_id: currentEmp.id,
      employee_number: currentEmp.employee_number,
      employee_name: currentEmp.full_name,
      branch_name: currentEmp.branch_name || currentEmp.branch,
      reason: leaveForm.reason || 'طلب إجازة',
      details: {
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        request_label: leaveForm.type === 'annual_leave' ? 'طلب إجازة سنوية' : (leaveForm.type === 'sick_leave' ? 'طلب إجازة مرضية' : 'طلب إجازة بدون راتب')
      }
    };

    saveUnifiedRequest(payload, user);
    setNewLeaveModalOpen(false);
    toast({
      title: '✓ تم تقديم طلب الإجازة بنجاح',
      description: 'تم إرسال الطلب لإدارة الموارد البشرية للاعتماد والمراجعة.'
    });
    setLeaveForm({
      type: 'annual_leave',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  const showPersonalOnly = !isManager || managerViewMode === 'personal';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* ─── CASE 1: PERSONAL EMPLOYEE LEAVE VIEW (STRICTLY ISOLATED) ────── */}
      {showPersonalOnly ? (
        <div className="space-y-5">
          
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                    رصيد وسجل إجازاتي
                  </h1>
                  <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
                    #{currentEmp?.employee_number}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentEmp?.full_name} • {currentEmp?.job_title || 'موظف'} • {currentEmp?.branch_name || currentEmp?.branch || 'الفرع الرئيسي'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManagerViewMode('audit')}
                  className="text-xs font-bold rounded-xl h-10 px-3.5 gap-1.5 border-slate-200 dark:border-slate-700"
                >
                  <span>تدقيق كافة الموظفين ➔</span>
                </Button>
              )}
              <Button
                onClick={() => setNewLeaveModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-10 px-4 gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>تقديم طلب إجازة</span>
              </Button>
            </div>
          </div>

          {/* Top 4 KPI Cards (Strictly Personal) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">الرصيد السنوي المستحق</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {myAudit?.totalAnnualEntitlement || (currentEmp?.nationality === 'سعودي' || currentEmp?.is_insured ? 21 : 30)} <span className="text-xs font-normal text-slate-400 font-sans">يوم</span>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">المستهلك من الرصيد</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 mt-1">
                {myAudit?.annualUsed || 0} <span className="text-xs font-normal text-slate-400 font-sans">يوم</span>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">الرصيد المتبقي المتاح</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 mt-1">
                {myAudit?.remainingBalance ?? 21} <span className="text-xs font-normal text-slate-400 font-sans">يوم</span>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">الطلبات قيد المراجعة</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 mt-1">
                {myPendingRequests.length} <span className="text-xs font-normal text-slate-400 font-sans">طلب</span>
              </div>
            </Card>
          </div>

          {/* Approved Leaves History Card */}
          <Card className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  سجل الإجازات المعتمدة من الإدارة
                </h2>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                معتمد وموثق رسمي ✓
              </Badge>
            </div>

            {myApprovedLeavesList.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">لا توجد إجازات مستهلكة مسجلة لديك حتى الآن</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  رصيد إجازاتك السنوية متاح بالكامل للاستخدام ({myAudit?.totalAnnualEntitlement || 21} يوماً).
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myApprovedLeavesList.map((item, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{item.type}</span>
                        <span className="font-mono text-emerald-600 font-bold">({item.days} يوم)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.date} • {item.source}
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      معتمد من الإدارة ✓
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pending Requests (If Any) */}
          {myPendingRequests.length > 0 && (
            <Card className="p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Clock4 className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  طلبات إجازة قيد المراجعة والاعتماد
                </h3>
              </div>
              <div className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
                {myPendingRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-950 dark:text-amber-100">{req.details?.request_label || req.type}</div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                        من {req.details?.startDate} إلى {req.details?.endDate}
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                      قيد المراجعة ⏳
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      ) : (
        /* ─── CASE 2: MANAGEMENT AUDIT REPORT (ADMIN / HR ONLY) ─────────── */
        <div className="space-y-6">
          {/* Top Executive Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-heading font-black text-xl text-foreground">
                  مراجعة وتدقيق أرصدة الإجازات السنوية والغياب (21 يوماً)
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  متابعة دقيقة لرصيد إجازات الموظفين المؤمن عليهم والسعوديين والتأكد من عدم تجاوز الرصيد السنوي المستحق.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setManagerViewMode('personal')}
                className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4 border-slate-200 dark:border-slate-700"
              >
                <span>عرض إجازاتي الشخصية ➔</span>
              </Button>

              <Button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold gap-1.5 h-10 px-4 shadow-md shadow-emerald-600/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير تقرير الإجازات Excel</span>
              </Button>

              <Button
                onClick={() => window.print()}
                variant="outline"
                className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة A4</span>
              </Button>
            </div>
          </div>

          {/* Summary KPI Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الموظفون المؤمن عليهم:</span>
                <ShieldCheck className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black font-mono text-foreground mt-1">
                {auditReport.filter(i => i.isInsured).length} <span className="text-xs font-sans text-muted-foreground">موظف (21 يوم)</span>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">إجمالي أيام الإجازات السنوية المستهلكة:</span>
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black font-mono text-teal-600 mt-1">
                {auditReport.reduce((sum, i) => sum + i.annualUsed, 0)} <span className="text-xs font-sans text-muted-foreground">يوم إجازة</span>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">حالات تجاوز رصيد الـ 21 يوماً:</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                {auditReport.filter(i => i.isExceeded).length} <span className="text-xs font-sans text-muted-foreground">موظف متجاوز</span>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">إجمالي أيام الغياب بدون إذن:</span>
                <TrendingDown className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                {auditReport.reduce((sum, i) => sum + i.absenceUsed, 0)} <span className="text-xs font-sans text-muted-foreground">يوم غياب</span>
              </div>
            </Card>
          </div>

          {/* Main Audit Table & Filters */}
          <Card className="p-6 rounded-3xl border-border shadow-sm space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="بحث باسم الموظف أو الرقم الوظيفي أو الفرع..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-9 rounded-xl text-xs font-bold h-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterType('all')}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  الكل ({auditReport.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'insured' ? 'default' : 'outline'}
                  onClick={() => setFilterType('insured')}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  المؤمن عليهم (21 يوم)
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'exceeded' ? 'destructive' : 'outline'}
                  onClick={() => setFilterType('exceeded')}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  المتجاوزين للرصيد ({auditReport.filter(i => i.isExceeded).length})
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border font-heading font-black text-muted-foreground">
                    <th className="py-3.5 px-3">الموظف</th>
                    <th className="py-3.5 px-3">الفرع والمسمى</th>
                    <th className="py-3.5 px-2 text-center">التأمين والرصيد السنوي</th>
                    <th className="py-3.5 px-2 text-center">المستهلك من الرصيد</th>
                    <th className="py-3.5 px-3 text-center">الرصيد المتبقي</th>
                    <th className="py-3.5 px-2 text-center">نسبة الاستهلاك</th>
                    <th className="py-3.5 px-2 text-center">غياب بدون إذن</th>
                    <th className="py-3.5 px-2 text-center">إجازات أخرى</th>
                    <th className="py-3.5 px-3 text-center">الإجراءات والتفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAudit.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-muted-foreground">
                        لا توجد بيانات مطابقة لخيارات البحث أو الفلترة.
                      </td>
                    </tr>
                  ) : (
                    filteredAudit.map((item) => (
                      <tr key={item.emp.id || item.emp.employee_number} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-heading font-black text-foreground">{item.emp.full_name}</div>
                          <div className="text-[10.5px] text-muted-foreground font-mono">#{item.emp.employee_number} — {item.emp.nationality || 'غير محدد'}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-foreground">{item.emp.branch_name || item.emp.branch || 'الفرع الرئيسي'}</div>
                          <div className="text-[10.5px] text-muted-foreground">{item.emp.job_title || 'موظف'}</div>
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono">
                          <div className="font-black text-foreground">{item.totalAnnualEntitlement} يوم</div>
                          <Badge variant="outline" className={`text-[9px] font-bold ${item.isInsured ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-600'}`}>
                            {item.isInsured ? 'مؤمن عليه (21 يوم)' : '30 يوماً'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono font-bold text-teal-700 dark:text-teal-400">
                          {item.annualUsed} يوم
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono">
                          <div className={`font-black text-sm ${item.isExceeded ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {item.remainingBalance} يوم
                          </div>
                          {item.isExceeded && (
                            <Badge className="bg-rose-500 text-white text-[9px] font-bold">تجاوز ⚠️</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono">
                          <div className="text-[11px] font-bold">{item.pctUsed}%</div>
                          <Progress value={item.pctUsed} className="h-1.5 w-16 mx-auto mt-1" />
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono">
                          {item.absenceUsed > 0 ? (
                            <Badge className="bg-rose-100 text-rose-800 text-[10px] font-bold font-mono">
                              {item.absenceUsed} يوم غياب
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[11px] text-muted-foreground">
                          {item.sickUsed > 0 && <span className="block text-blue-600 font-mono">مرضية: {item.sickUsed}</span>}
                          {item.unpaidUsed > 0 && <span className="block text-amber-600 font-mono">بدون راتب: {item.unpaidUsed}</span>}
                          {item.sickUsed === 0 && item.unpaidUsed === 0 && <span>—</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAuditEmp(item)}
                            className="rounded-xl text-[11px] font-bold h-8 px-2.5 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" />
                            <span>كشف الأيام</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── MODAL: DETAILED DAYS BREAKDOWN FOR EMPLOYEE (AUDIT) ───────────── */}
      {selectedAuditEmp && (
        <Dialog open={!!selectedAuditEmp} onOpenChange={(o) => !o && setSelectedAuditEmp(null)}>
          <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>كشف تفاصيل الإجازات والغياب — {selectedAuditEmp.emp.full_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 flex items-center justify-between">
                <div>
                  <div className="font-heading font-black text-sm text-teal-950 dark:text-teal-200">
                    الرقم الوظيفي: #{selectedAuditEmp.emp.employee_number} — {selectedAuditEmp.emp.branch_name || 'الفرع الرئيسي'}
                  </div>
                  <div className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
                    الرصيد المستحق: <strong>{selectedAuditEmp.totalAnnualEntitlement} يوم</strong> | المستهلك: <strong>{selectedAuditEmp.annualUsed} يوم</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-bold">الرصيد المتبقي:</div>
                  <div className={`font-mono font-black text-base ${selectedAuditEmp.isExceeded ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedAuditEmp.remainingBalance} يوم
                  </div>
                </div>
              </div>

              {/* Annual Leaves List */}
              <div className="space-y-2">
                <h4 className="font-heading font-bold text-xs text-foreground flex items-center gap-1.5">
                  <span>أيام الإجازة السنوية المسجلة ({selectedAuditEmp.annualDaysList.length} يوم):</span>
                </h4>
                
                {selectedAuditEmp.annualDaysList.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground bg-muted/40 rounded-xl text-[11px]">
                    لم يتم تسجيل أي أيام إجازة سنوية لهذا الموظف حتى الآن.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-1">
                    {selectedAuditEmp.annualDaysList.map((d, i) => (
                      <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{d.date}</span>
                        <Badge className="bg-teal-500/10 text-teal-700 border-teal-300 font-bold text-[10px]">{d.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unexcused Absences List */}
              {selectedAuditEmp.absenceDaysList.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-heading font-bold text-xs text-rose-700 flex items-center gap-1.5">
                    <span>أيام الغياب بدون إذن ({selectedAuditEmp.absenceDaysList.length} يوم):</span>
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-1">
                    {selectedAuditEmp.absenceDaysList.map((d, i) => (
                      <div key={i} className="p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-rose-900 dark:text-rose-200">{d.date}</span>
                        <Badge className="bg-rose-500 text-white font-bold text-[10px]">خصم يوم كامل 🚫</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAuditEmp(null)} className="rounded-xl font-bold text-xs">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
