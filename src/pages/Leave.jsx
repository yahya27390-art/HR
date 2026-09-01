import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
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
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

export default function Leave() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'requests'
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Details Modal
  const [selectedAuditEmp, setSelectedAuditEmp] = useState(null);

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

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'مراجعة الإجازات السنوية 2026');
    XLSX.writeFile(wb, `تقرير_أرصدة_الإجازات_والغياب_السنوي_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: '✓ تم تصدير تقرير الإجازات والغياب السنوي إلى Excel بنجاح' });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* ─── TOP EXECUTIVE HEADER ────────────────────────────────────────── */}
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

        <div className="flex items-center gap-2">
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

      {/* ─── SUMMARY KPI STATS BANNER ────────────────────────────────────── */}
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

      {/* ─── MAIN AUDIT TABLE & FILTERS ──────────────────────────────────── */}
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
              <tr className="border-b border-border text-muted-foreground font-bold">
                <th className="py-3 px-3">الموظف</th>
                <th className="py-3 px-3">الفرع والمسمى</th>
                <th className="py-3 px-3 text-center">التأمين والرصيد السنوي</th>
                <th className="py-3 px-3 text-center">المستهلك من الرصيد</th>
                <th className="py-3 px-3 text-center">الرصيد المتبقي</th>
                <th className="py-3 px-3 text-center">نسبة الاستهلاك</th>
                <th className="py-3 px-3 text-center">غياب بدون إذن</th>
                <th className="py-3 px-3 text-center">حالة الرصيد</th>
                <th className="py-3 px-3 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {filteredAudit.map((item) => (
                <tr key={item.emp.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-heading font-black text-foreground">{item.emp.full_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">#{item.emp.employee_number} — {item.emp.nationality || 'سعودي'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{item.emp.branch_name || item.emp.branch || 'مكتب الإدارة'}</div>
                    <div className="text-[10px] text-muted-foreground">{item.emp.job_title}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {item.totalAnnualEntitlement} يوم
                    </div>
                    {item.isInsured ? (
                      <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[9px] font-bold mt-0.5">مؤمن عليه (21 يوم)</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold mt-0.5">غير مؤمن</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-teal-600 text-sm">
                    {item.annualUsed} يوم
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className={`font-mono font-black text-sm ${item.isExceeded ? 'text-rose-600' : (item.isDepleted ? 'text-amber-600' : 'text-emerald-600')}`}>
                      {item.remainingBalance} يوم
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center w-36">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold">
                        <span>{item.pctUsed}%</span>
                        <span className="text-muted-foreground">{item.annualUsed}/{item.totalAnnualEntitlement}</span>
                      </div>
                      <Progress 
                        value={item.pctUsed} 
                        className={`h-2 ${item.isExceeded ? 'bg-rose-100 [&>div]:bg-rose-600' : (item.isDepleted ? 'bg-amber-100 [&>div]:bg-amber-500' : 'bg-teal-100 [&>div]:bg-teal-600')}`}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.absenceUsed > 0 ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-mono font-black text-[10px]">
                        {item.absenceUsed} يوم غياب 🚫
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-[10px]">0 ✓</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.isExceeded ? (
                      <Badge className="bg-rose-500 text-white font-bold text-[10px] gap-1 shadow-sm">
                        <AlertTriangle className="w-3 h-3" />
                        <span>تجاوز الرصيد ({Math.abs(item.remainingBalance)} يوم)</span>
                      </Badge>
                    ) : item.isDepleted ? (
                      <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                        استنفد كامل الرصيد
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>رصيد متاح ({item.remainingBalance} يوم)</span>
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAuditEmp(item)}
                      className="rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1 border-slate-300"
                    >
                      <Eye className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                      <span>كشف الأيام</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Card>

      {/* ─── MODAL: DETAILED DAYS BREAKDOWN FOR EMPLOYEE ─────────────────── */}
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
              
              {/* Summary Header */}
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
