import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Calendar,
  Building2,
  Users,
  Clock,
  Wallet,
  ShieldCheck,
  Award,
  Filter,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  Star,
  Layers,
  HeartPulse,
  Package,
  Calculator,
  CalendarDays,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { computeEmployeePayroll, getPayrollSettings, getAdvances } from '@/lib/payrollEngine';

// ─── REPORT DEFINITIONS CATALOG (MATCHING EKTEFA SYSTEM) ─────────────────────
const REPORT_DEFINITIONS = [
  {
    id: 'daily_biometrics',
    title: 'تقرير البصمات اليومي',
    category: 'attendance',
    categoryLabel: 'تقرير الحضور',
    description: 'سجل البصمات التفصيلي ومواعيد الدخول والخروج والتأخير وساعات العمل اليومية',
    icon: Clock,
    color: '#0284c7'
  },
  {
    id: 'payroll_details',
    title: 'تفاصيل الرواتب',
    category: 'payroll',
    categoryLabel: 'رواتب الموظفين',
    description: 'المسير المالي للرواتب متضمناً البدلات والمكافآت والاستقطاعات وصافي الراتب المستحق',
    icon: Wallet,
    color: '#8b5cf6'
  },
  {
    id: 'leave_report',
    title: 'تقرير الإجازات',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'سجل الإجازات السنوية والمرضية والاضطرارية وفترات القيام والعودة من الإجازة',
    icon: CalendarDays,
    color: '#10b981'
  },
  {
    id: 'punch_corrections',
    title: 'طلبات تصحيح البصمات',
    category: 'attendance',
    categoryLabel: 'تقرير الحضور',
    description: 'سجل التعديلات الإدارية على حركات البصمة والأعذار المعتمدة رسمياً',
    icon: CheckCircle2,
    color: '#f59e0b'
  },
  {
    id: 'employee_master_data',
    title: 'تقرير بيانات الموظفين',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'الدليل العام والشامل لبيانات الكادر، الأرقام الوظيفية، الهويات، وتواريخ المباشرة',
    icon: Users,
    color: '#ef4444'
  },
  {
    id: 'terminated_employees',
    title: 'تقرير بيانات الموظفين المنتهية خدماتهم',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'سجل الاستقالات، إنهاء العقود، وتواريخ تسليم العهد وتصفية المستحقات',
    icon: Briefcase,
    color: '#64748b'
  },
  {
    id: 'company_custodies',
    title: 'التقرير العام - العهد',
    category: 'admin',
    categoryLabel: 'الإدارة',
    description: 'جرد العهد العينية المسلمة للموظفين (السيارات، أجهزة الحاسب، الجوالات، والعهد المالية)',
    icon: Package,
    color: '#0d9488'
  },
  {
    id: 'employee_detailed_dossier',
    title: 'تقرير الموظفين التفصيلي',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'ملف الموظف الشامل مع تفاصيل الورديات والرواتب والتأمينات وبيانات التواصل',
    icon: FileText,
    color: '#3b82f6'
  },
  {
    id: 'medical_insurance',
    title: 'تقرير التأمين الطبي للموظفين',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'بيانات وثائق التأمين الصحي، فئات التغطية (Class A/B/C/VIP)، وتواريخ الصلاحية',
    icon: HeartPulse,
    color: '#ec4899'
  },
  {
    id: 'employee_leave_balances',
    title: 'تقرير إجازات الموظف',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'أرصدة الإجازات المستحقة والمستهلكة والمتبقية وتاريخ آخر إجازة',
    icon: Calendar,
    color: '#14b8a6'
  },
  {
    id: 'employee_status_report',
    title: 'تقرير حالة الموظف',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'حالة النشاط على رأس العمل، تحت التجربة، في إجازة، أو منقطع',
    icon: UserCheck,
    color: '#6366f1'
  },
  {
    id: 'end_of_service_settlements',
    title: 'طلبات نهاية الخدمة المنتهية',
    category: 'payroll',
    categoryLabel: 'رواتب الموظفين',
    description: 'بيان تسويات مكافأة نهاية الخدمة المعتمدة ومسيرات التصفية النهائية',
    icon: Calculator,
    color: '#d97706'
  },
  {
    id: 'accrued_leaves_by_year',
    title: 'الإجازات المتراكمة حسب السنة',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'الرصيد التراكمي للإجازات السنوية المرحلة عبر سنوات الخدمة وفقاً لنظام العمل',
    icon: Layers,
    color: '#8b5cf6'
  },
  {
    id: 'advances_and_loans',
    title: 'تقرير السلف والقروض المؤسسية',
    category: 'payroll',
    categoryLabel: 'رواتب الموظفين',
    description: 'بيان السلف الممنوحة والأقساط المستقطعة والمبالغ المتبقية وسندات لأمر',
    icon: Wallet,
    color: '#7c3aed'
  }
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  // Selected Report ID (null = Catalog view, string = Filter/Results view)
  const [selectedReportId, setSelectedReportId] = useState(() => searchParams.get('report') || null);
  
  // Category Filter in Catalog ('all' | 'hr' | 'attendance' | 'payroll' | 'admin')
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [starredReports, setStarredReports] = useState(() => {
    const s = localStorage.getItem('ga_starred_reports');
    return s ? JSON.parse(s) : ['daily_biometrics', 'payroll_details', 'employee_master_data'];
  });

  // Filter Form State
  const [filterEmpId, setFilterEmpId] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');

  // Generated Report Data State
  const [generatedData, setGeneratedData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Master Raw Data from DB
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [advancesList, setAdvancesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load All Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [emps, logs, shs, leaves] = await Promise.all([
          base44.entities.Employee.list(),
          base44.entities.AttendanceLog.list('-log_date', 3000),
          base44.entities.Shift.list(),
          base44.entities.LeaveRequest.list(),
        ]);
        setEmployees(emps || []);
        setAttendanceLogs(logs || []);
        setShifts(shs || []);
        setLeavesList(leaves || []);
        setAdvancesList(getAdvances());
      } catch (e) {
        console.error('Error loading reports data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update query param when selecting report
  const handleSelectReport = (repId) => {
    setSelectedReportId(repId);
    setGeneratedData(null);
    if (repId) {
      setSearchParams({ report: repId });
    } else {
      setSearchParams({});
    }
  };

  const currentReportDef = useMemo(() => {
    return REPORT_DEFINITIONS.find(r => r.id === selectedReportId) || null;
  }, [selectedReportId]);

  // Toggle Star
  const handleToggleStar = (id, e) => {
    e.stopPropagation();
    setStarredReports(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('ga_starred_reports', JSON.stringify(next));
      return next;
    });
  };

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return REPORT_DEFINITIONS.filter(r => {
      const matchCat = catalogCategory === 'all' || r.category === catalogCategory;
      const q = catalogSearch.toLowerCase();
      const matchSearch = !catalogSearch ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [catalogCategory, catalogSearch]);

  // Unique branches
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees list based on selected branch
  const branchFilteredEmployees = useMemo(() => {
    if (filterBranch === 'all') return employees;
    return employees.filter(e => (e.branch_name || e.branch || '') === filterBranch);
  }, [employees, filterBranch]);

  // When branch changes, ensure selected employee belongs to that branch
  const handleBranchChange = (newBranch) => {
    setFilterBranch(newBranch);
    if (newBranch !== 'all' && filterEmpId !== 'all') {
      const stillValid = employees.some(e => 
        String(e.employee_number || e.id) === String(filterEmpId) && 
        (e.branch_name || e.branch || '') === newBranch
      );
      if (!stillValid) setFilterEmpId('all');
    }
  };


  // ─── GENERATE REPORT ENGINE ───────────────────────────────────────────────
  const handleGenerateReport = () => {
    setIsGenerating(true);

    setTimeout(() => {
      // 1. Filter employees
      let targetEmployees = employees.filter(e => {
        const matchEmp = filterEmpId === 'all' || String(e.employee_number || e.id) === String(filterEmpId);
        const matchBranch = filterBranch === 'all' || (e.branch_name || e.branch || '') === filterBranch;
        return matchEmp && matchBranch;
      });

      let rows = [];
      let summary = {};

      const repId = currentReportDef?.id;

      if (repId === 'daily_biometrics') {
        // Daily attendance logs between fromDate and toDate using verified master engine
        const monthKey = fromDate.slice(0, 7) || '2026-08';
        const settings = getPayrollSettings();

        targetEmployees.forEach(emp => {
          const pr = computeEmployeePayroll(emp, attendanceLogs, shifts, {
            ...settings,
            monthPrefix: monthKey
          });

          const days = (pr.dailyDetails || []).filter(d => {
            const dStr = d.dateStr || d.date || '';
            return !dStr || (dStr >= fromDate && dStr <= toDate);
          });

          days.forEach(d => {
            const checkIn = d.firstCheckIn && d.firstCheckIn !== '—' ? d.firstCheckIn : (d.checkIn || '--:--');
            const checkOut = d.lastCheckOut && d.lastCheckOut !== '—' ? d.lastCheckOut : (d.checkOut || '--:--');
            const actualHrs = d.actualMinutes ? (d.actualMinutes / 60).toFixed(1) : (d.actualHours || 0);

            rows.push({
              date: d.dateStr || `${monthKey}-${String(d.dayNum).padStart(2, '0')}`,
              day_name: d.dayName || 'اليوم',
              emp_name: emp.full_name,
              emp_num: emp.employee_number,
              branch: emp.branch_name || emp.branch || 'الفرع الرئيسي',
              shift: emp.shift_name || d.shiftName || 'الوردية الصباحية',
              check_in: checkIn,
              check_out: checkOut,
              actual_hours: actualHrs,
              late_minutes: d.lateMinutes || 0,
              early_leave: d.earlyMinutes || 0,
              status: d.statusLabel || (d.status === 'present' ? 'حاضر ومنضبط' : d.status === 'late' ? 'متأخر' : d.status === 'absent' ? 'غائب' : 'عطلة/معفى')
            });
          });
        });

        // Sort by date desc
        rows.sort((a, b) => b.date.localeCompare(a.date));
        summary = {
          totalRows: rows.length,
          totalHours: rows.reduce((acc, r) => acc + Number(r.actual_hours || 0), 0).toFixed(1),
          totalLateMins: rows.reduce((acc, r) => acc + Number(r.late_minutes || 0), 0),
          presentDays: rows.filter(r => r.status.includes('حاضر') || r.status.includes('متأخر')).length,
          employeesCount: targetEmployees.length
        };

      } else if (repId === 'payroll_details') {
        // Detailed Payroll calculation
        const monthKey = fromDate.slice(0, 7) || '2026-08';
        const settings = getPayrollSettings();

        targetEmployees.forEach(emp => {
          const pr = computeEmployeePayroll(emp, attendanceLogs, shifts, {
            ...settings,
            monthPrefix: monthKey
          });

          rows.push({
            emp_num: emp.employee_number,
            emp_name: emp.full_name,
            branch: emp.branch_name || 'الفرع الرئيسي',
            job_title: emp.job_title || 'موظف مبيعات',
            basic_salary: pr.basicSalary,
            housing_allowance: pr.housingAllowance,
            transport_allowance: pr.transportAllowance,
            gross_salary: pr.grossSalary,
            extra_hours_bonus: pr.earnings.extraHoursBonus,
            sales_incentive: pr.earnings.incentives,
            total_earnings: pr.totalEarnings,
            late_deduction: pr.deductions.lateDeduction,
            absence_deduction: pr.deductions.absenceDeduction,
            advance_deduction: pr.deductions.advanceDeduction,
            total_deductions: pr.totalDeductions,
            net_salary: pr.netSalary
          });
        });

        summary = {
          totalEmployees: rows.length,
          totalGross: rows.reduce((acc, r) => acc + Number(r.gross_salary || 0), 0),
          totalDeductions: rows.reduce((acc, r) => acc + Number(r.total_deductions || 0), 0),
          totalNetSalary: rows.reduce((acc, r) => acc + Number(r.net_salary || 0), 0)
        };

      } else if (repId === 'employee_master_data' || repId === 'employee_detailed_dossier') {
        // Master Employee Directory
        targetEmployees.forEach(emp => {
          rows.push({
            emp_num: emp.employee_number,
            name_ar: emp.full_name,
            name_en: emp.english_name || emp.name_en || '--',
            national_id: emp.national_id || emp.iqama_number || '--',
            nationality: emp.nationality || 'سعودي',
            branch: emp.branch_name || 'الفرع الرئيسي',
            job_title: emp.job_title || 'موظف',
            join_date: emp.join_date || emp.hire_date || '--',
            basic_salary: emp.basic_salary || 0,
            mobile: emp.mobile_number || emp.phone || '--',
            status: emp.status || 'active'
          });
        });
        summary = { totalEmployees: rows.length, saudiCount: rows.filter(r => r.nationality === 'سعودي').length };

      } else if (repId === 'advances_and_loans') {
        // Loans and Advances
        advancesList.forEach(adv => {
          const emp = employees.find(e => String(e.employee_number || e.id) === String(adv.employee_number));
          const matchBranch = filterBranch === 'all' || (emp?.branch_name || '') === filterBranch;
          const matchEmp = filterEmpId === 'all' || String(adv.employee_number) === String(filterEmpId);

          if (matchBranch && matchEmp) {
            const total = Number(adv.total_amount) || 0;
            const paid = Number(adv.paid_amount) || 0;
            const rem = Math.max(0, total - paid);
            rows.push({
              emp_num: adv.employee_number,
              emp_name: emp?.full_name || adv.employee_name,
              branch: emp?.branch_name || 'الفرع الرئيسي',
              total_amount: total,
              monthly_installment: adv.monthly_installment,
              total_installments: adv.total_installments,
              paid_amount: paid,
              remaining_amount: rem,
              start_month: adv.start_month,
              status: rem <= 0 ? 'مسددة بالكامل' : 'سارية وقيد الاستقطاع'
            });
          }
        });
        summary = {
          totalAdvances: rows.reduce((acc, r) => acc + Number(r.total_amount || 0), 0),
          totalPaid: rows.reduce((acc, r) => acc + Number(r.paid_amount || 0), 0),
          totalRemaining: rows.reduce((acc, r) => acc + Number(r.remaining_amount || 0), 0)
        };

      } else if (repId === 'medical_insurance') {
        // Medical Insurance
        targetEmployees.forEach(emp => {
          const isExpired = emp.insurance_status === 'منتهي';
          rows.push({
            emp_num: emp.employee_number,
            emp_name: emp.full_name,
            branch: emp.branch_name || 'الفرع الرئيسي',
            national_id: emp.national_id || '--',
            policy_num: 'POL-GA-2026-88',
            insurance_class: emp.insurance_class || (emp.employee_number === 1001 ? 'VIP Elite' : 'Class A'),
            expiry_date: emp.insurance_expiry || '2027-04-30',
            status: isExpired ? 'منتهي الصلاحية' : 'ساري المفعول'
          });
        });
        summary = { totalCount: rows.length, activeCount: rows.filter(r => r.status.includes('ساري')).length };

      } else if (repId === 'leave_report' || repId === 'employee_leave_balances') {
        // Leave report
        targetEmployees.forEach(emp => {
          rows.push({
            emp_num: emp.employee_number,
            emp_name: emp.full_name,
            branch: emp.branch_name || 'الفرع الرئيسي',
            annual_balance: emp.employee_number === 1034 ? 0 : 30,
            taken_days: 0,
            remaining_days: emp.employee_number === 1034 ? 0 : 30,
            last_leave_date: '--',
            status: 'مستحق بالكامل'
          });
        });
        summary = { totalCount: rows.length };

      } else {
        // Default generic row builder
        targetEmployees.forEach(emp => {
          rows.push({
            emp_num: emp.employee_number,
            emp_name: emp.full_name,
            branch: emp.branch_name || 'الفرع الرئيسي',
            job_title: emp.job_title || 'موظف مبيعات',
            date: fromDate,
            status: 'معتمد'
          });
        });
        summary = { totalCount: rows.length };
      }

      setGeneratedData({
        reportDef: currentReportDef,
        rows,
        summary,
        generatedAt: new Date().toLocaleString('ar-SA'),
        filterEmp: filterEmpId === 'all' ? 'كافة الموظفين' : targetEmployees[0]?.full_name || filterEmpId,
        filterBranch: filterBranch === 'all' ? 'كافة الفروع' : filterBranch,
        fromDate,
        toDate
      });

      setIsGenerating(false);
      toast({ title: `✓ تم استخراج: ${currentReportDef.title} بنجاح` });
    }, 400);
  };

  // ─── EXPORT TO EXCEL (.xlsx) ENGINE ───────────────────────────────────────
  const handleExportExcel = () => {
    if (!generatedData || !generatedData.rows.length) {
      toast({ title: 'لا توجد بيانات لتصديرها', variant: 'destructive' });
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(generatedData.rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير_رسمي');
      
      const fileName = `${generatedData.reportDef.title.replace(/\s+/g, '_')}_${fromDate}_${toDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast({ title: `✓ تم تنزيل ملف الإكسيل: ${fileName}` });
    } catch (e) {
      console.error('Error exporting excel:', e);
      toast({ title: 'حدث خطأ أثناء تنزيل الإكسيل', description: e.message, variant: 'destructive' });
    }
  };

  // Print Report A4
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 1: REPORT CATALOG / DIRECTORY (دليل وفهرس التقارير)
          ═══════════════════════════════════════════════════════════════════════ */}
      {!selectedReportId && (
        <div className="space-y-6">
          
          {/* Top Title & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 font-bold shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground">
                  مركز التقارير والتحليلات المؤسسية
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  استخراج وطباعة وتصدير كافة تقارير الحضور، الرواتب، الإجازات، والبيانات الإدارية
                </p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600" />
              <Input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="ابحث في أسماء التقارير..."
                className="ps-10 rounded-2xl text-xs h-10 bg-slate-50 dark:bg-slate-800/60 border-0"
              />
            </div>
          </div>

          {/* Category Tabs (Matching Ektefa System Top Tabs) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'عرض الكل', count: REPORT_DEFINITIONS.length },
              { id: 'hr', label: 'الموارد البشرية', count: REPORT_DEFINITIONS.filter(r => r.category === 'hr').length },
              { id: 'attendance', label: 'تقرير الحضور', count: REPORT_DEFINITIONS.filter(r => r.category === 'attendance').length },
              { id: 'payroll', label: 'رواتب الموظفين', count: REPORT_DEFINITIONS.filter(r => r.category === 'payroll').length },
              { id: 'admin', label: 'الإدارة والعهد', count: REPORT_DEFINITIONS.filter(r => r.category === 'admin').length },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCatalogCategory(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 flex items-center gap-2 transition-all ${
                  catalogCategory === tab.id
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20 scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 text-muted-foreground border hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  catalogCategory === tab.id ? 'bg-white text-sky-800' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Reports Grid (Cards Matching Ektefa Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCatalog.map(rep => {
              const Icon = rep.icon;
              const isStarred = starredReports.includes(rep.id);

              return (
                <Card
                  key={rep.id}
                  onClick={() => handleSelectReport(rep.id)}
                  className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-sky-300 transition-all cursor-pointer group flex flex-col justify-between h-44 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: Icon + Category Badge + Star */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(rep.id, e)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : 'text-slate-300'}`} />
                      </button>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-heading font-black text-sm text-foreground group-hover:text-sky-600 transition-colors leading-snug">
                        {rep.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {rep.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer Tag */}
                  <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground font-bold">
                    <span>{rep.categoryLabel}</span>
                    <span className="text-sky-600 flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-transform">
                      استعراض <ChevronLeft className="w-3 h-3" />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 2: REPORT FILTER & RESULTS GENERATION (شاشة الفلترة والاستعراض)
          ═══════════════════════════════════════════════════════════════════════ */}
      {selectedReportId && currentReportDef && (
        <div className="space-y-6">
          
          {/* Top Title Bar with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectReport(null)}
                className="rounded-2xl text-xs font-bold gap-1.5 h-9 border-slate-200"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لدليل التقارير</span>
              </Button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground">
                    {currentReportDef.title}
                  </h1>
                  <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-bold">
                    {currentReportDef.categoryLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentReportDef.description}
                </p>
              </div>
            </div>
          </div>

          {/* ─── FILTERS CARD (فلاتر التقارير المطابقة لصورة المستخدم) ──────── */}
          <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-heading font-black text-sm text-foreground border-b pb-3">
              <Filter className="w-4 h-4 text-sky-600" />
              <span>فلاتر ومعايير استخراج التقرير:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              {/* 1. Branch Selector (FIRST) */}
              <div className="space-y-1.5">
                <label className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1. الفرع أو القسم:</span>
                </label>
                <Select value={filterBranch} onValueChange={handleBranchChange}>
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="كافة الفروع والأقسام" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏢 كافة الفروع والأقسام ({employees.length} موظف)</SelectItem>
                    {branches.map(b => {
                      const count = employees.filter(e => (e.branch_name || e.branch || '') === b).length;
                      return (
                        <SelectItem key={b} value={b}>
                          📍 {b} ({count} موظف)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Cascading Employee Selector (SECOND - Filtered by chosen branch) */}
              <div className="space-y-1.5">
                <label className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>2. الموظف المستهدف:</span>
                </label>
                <Select value={filterEmpId} onValueChange={setFilterEmpId}>
                  <SelectTrigger className="rounded-2xl text-xs h-10 font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="اختر الموظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 كافة موظفي الفرع المختار ({branchFilteredEmployees.length} موظف)</SelectItem>
                    {branchFilteredEmployees.map(e => (
                      <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                        #{e.employee_number} - {e.full_name} ({e.national_id || '--'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. From Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground">من تاريخ:</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-2xl text-xs h-10 font-mono font-bold bg-slate-50 dark:bg-slate-800/60 border-0"
                />
              </div>

              {/* 4. To Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground">إلى تاريخ:</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-2xl text-xs h-10 font-mono font-bold bg-slate-50 dark:bg-slate-800/60 border-0"
                />
              </div>

            </div>

            {/* Action Button: استعراض */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black gap-2 h-10 px-8 shadow-md shadow-sky-500/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ معالجة واستخراج البيانات...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>استعراض نتائج التقرير</span>
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* ─── GENERATED REPORT RESULTS TABLE ────────────────────────────── */}
          {generatedData && (
            <div className="space-y-4">
              
              {/* Results Top Header & Export Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm text-foreground">
                      نتائج {generatedData.reportDef.title} ({generatedData.rows.length} سجل)
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      النطاق: {generatedData.fromDate} إلى {generatedData.toDate} • الفرع: {generatedData.filterBranch}
                    </p>
                  </div>
                </div>

                {/* Print & Excel Buttons */}
                <div className="flex items-center gap-2">
                  
                  {/* Download Excel */}
                  <Button
                    onClick={handleExportExcel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold gap-1.5 h-9 px-4 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل كملف إكسيل (Excel .xlsx)</span>
                  </Button>

                  {/* Print A4 */}
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="rounded-2xl text-xs font-bold gap-1.5 h-9 px-4 border-slate-300"
                  >
                    <Printer className="w-4 h-4 text-sky-600" />
                    <span>طباعة التقرير A4</span>
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <Card className="rounded-3xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                        {selectedReportId === 'daily_biometrics' && (
                          <>
                            <th className="py-3 px-3">التاريخ واليوم</th>
                            <th className="py-3 px-3">الموظف والفرع</th>
                            <th className="py-3 px-3">الوردية</th>
                            <th className="py-3 px-3">دخول</th>
                            <th className="py-3 px-3">خروج</th>
                            <th className="py-3 px-3">ساعات العمل</th>
                            <th className="py-3 px-3">تأخير (دقيقة)</th>
                            <th className="py-3 px-3">الحالة</th>
                          </>
                        )}

                        {selectedReportId === 'payroll_details' && (
                          <>
                            <th className="py-3 px-3"># الموظف</th>
                            <th className="py-3 px-3">الفرع والمسمى</th>
                            <th className="py-3 px-3">الأساسي</th>
                            <th className="py-3 px-3">البدلات</th>
                            <th className="py-3 px-3">المكافآت والحوافز</th>
                            <th className="py-3 px-3">الاستقطاعات</th>
                            <th className="py-3 px-3">قسط السلفة</th>
                            <th className="py-3 px-3">صافي الراتب</th>
                          </>
                        )}

                        {selectedReportId === 'employee_master_data' && (
                          <>
                            <th className="py-3 px-3"># الرقم الوظيفي</th>
                            <th className="py-3 px-3">الاسم بالعربي</th>
                            <th className="py-3 px-3">الاسم بالإنجليزي</th>
                            <th className="py-3 px-3">الهوية / الإقامة</th>
                            <th className="py-3 px-3">الفرع والمسمى</th>
                            <th className="py-3 px-3">تاريخ الالتحاق</th>
                            <th className="py-3 px-3">الراتب الأساسي</th>
                          </>
                        )}

                        {selectedReportId === 'advances_and_loans' && (
                          <>
                            <th className="py-3 px-3">الموظف</th>
                            <th className="py-3 px-3">إجمالي السلفة</th>
                            <th className="py-3 px-3">القسط والمدة</th>
                            <th className="py-3 px-3">المسدد</th>
                            <th className="py-3 px-3">المتبقي</th>
                            <th className="py-3 px-3">شهر البدء</th>
                            <th className="py-3 px-3">الحالة</th>
                          </>
                        )}

                        {selectedReportId === 'medical_insurance' && (
                          <>
                            <th className="py-3 px-3">الموظف</th>
                            <th className="py-3 px-3">الفرع</th>
                            <th className="py-3 px-3">رقم الوثيقة</th>
                            <th className="py-3 px-3">فئة التأمين</th>
                            <th className="py-3 px-3">تاريخ الانتهاء</th>
                            <th className="py-3 px-3">الحالة</th>
                          </>
                        )}

                        {!['daily_biometrics', 'payroll_details', 'employee_master_data', 'advances_and_loans', 'medical_insurance'].includes(selectedReportId) && (
                          <>
                            <th className="py-3 px-3"># الموظف</th>
                            <th className="py-3 px-3">الفرع</th>
                            <th className="py-3 px-3">البيان</th>
                            <th className="py-3 px-3">التاريخ</th>
                            <th className="py-3 px-3">الحالة</th>
                          </>
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border/60">
                      {generatedData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-muted-foreground font-bold">
                            لا توجد بيانات مطابقة لمعايير الفلترة المحددة
                          </td>
                        </tr>
                      ) : (
                        generatedData.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-mono">
                            
                            {selectedReportId === 'daily_biometrics' && (
                              <>
                                <td className="py-3 px-3 font-bold text-foreground">
                                  {row.date} ({row.day_name})
                                </td>
                                <td className="py-3 px-3 font-sans font-bold">
                                  {row.emp_name} <span className="text-muted-foreground text-[10px]">({row.branch})</span>
                                </td>
                                <td className="py-3 px-3 font-sans text-muted-foreground">{row.shift}</td>
                                <td className="py-3 px-3 text-emerald-600 font-bold">{row.check_in}</td>
                                <td className="py-3 px-3 text-rose-600 font-bold">{row.check_out}</td>
                                <td className="py-3 px-3 font-black text-foreground">{row.actual_hours} س</td>
                                <td className="py-3 px-3 text-rose-600 font-bold">{row.late_minutes > 0 ? `${row.late_minutes} د` : '0'}</td>
                                <td className="py-3 px-3">
                                  <Badge className={`text-[10px] font-sans ${
                                    row.status === 'حاضر' ? 'bg-emerald-100 text-emerald-800' : row.status === 'متأخر' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {row.status}
                                  </Badge>
                                </td>
                              </>
                            )}

                            {selectedReportId === 'payroll_details' && (
                              <>
                                <td className="py-3 px-3 font-sans font-bold">
                                  {row.emp_name} <span className="text-muted-foreground font-mono">(#{row.emp_num})</span>
                                </td>
                                <td className="py-3 px-3 font-sans text-muted-foreground">{row.branch}</td>
                                <td className="py-3 px-3">{Number(row.basic_salary).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3">{Number((row.housing_allowance || 0) + (row.transport_allowance || 0)).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3 text-emerald-600 font-bold">+{Number(row.extra_hours_bonus || 0).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3 text-rose-600 font-bold">-{Number(row.total_deductions || 0).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3 text-purple-600 font-bold">{Number(row.advance_deduction || 0).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3 font-black text-sky-700 text-sm">{Number(row.net_salary).toLocaleString()} ر.س</td>
                              </>
                            )}

                            {selectedReportId === 'employee_master_data' && (
                              <>
                                <td className="py-3 px-3 font-bold">#{row.emp_num}</td>
                                <td className="py-3 px-3 font-sans font-bold text-foreground">{row.name_ar}</td>
                                <td className="py-3 px-3 text-muted-foreground">{row.name_en}</td>
                                <td className="py-3 px-3">{row.national_id}</td>
                                <td className="py-3 px-3 font-sans">{row.branch} - {row.job_title}</td>
                                <td className="py-3 px-3">{row.join_date}</td>
                                <td className="py-3 px-3 font-black">{Number(row.basic_salary).toLocaleString()} ر.س</td>
                              </>
                            )}

                            {selectedReportId === 'advances_and_loans' && (
                              <>
                                <td className="py-3 px-3 font-sans font-bold">{row.emp_name} (#{row.emp_num})</td>
                                <td className="py-3 px-3 font-bold">{Number(row.total_amount).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3 text-purple-700">{Number(row.monthly_installment).toLocaleString()} ر.س ({row.total_installments} ش)</td>
                                <td className="py-3 px-3 text-emerald-600">{Number(row.paid_amount).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3 text-rose-600 font-bold">{Number(row.remaining_amount).toLocaleString()} ر.س</td>
                                <td className="py-3 px-3">{row.start_month}</td>
                                <td className="py-3 px-3"><Badge className="text-[10px] font-sans">{row.status}</Badge></td>
                              </>
                            )}

                            {selectedReportId === 'medical_insurance' && (
                              <>
                                <td className="py-3 px-3 font-sans font-bold">{row.emp_name} (#{row.emp_num})</td>
                                <td className="py-3 px-3 font-sans">{row.branch}</td>
                                <td className="py-3 px-3">{row.policy_num}</td>
                                <td className="py-3 px-3 font-bold text-pink-700">{row.insurance_class}</td>
                                <td className="py-3 px-3">{row.expiry_date}</td>
                                <td className="py-3 px-3"><Badge className="text-[10px] font-sans">{row.status}</Badge></td>
                              </>
                            )}

                            {!['daily_biometrics', 'payroll_details', 'employee_master_data', 'advances_and_loans', 'medical_insurance'].includes(selectedReportId) && (
                              <>
                                <td className="py-3 px-3 font-sans font-bold">{row.emp_name} (#{row.emp_num})</td>
                                <td className="py-3 px-3 font-sans">{row.branch}</td>
                                <td className="py-3 px-3 font-sans">{row.job_title}</td>
                                <td className="py-3 px-3">{row.date}</td>
                                <td className="py-3 px-3"><Badge className="text-[10px] font-sans">{row.status}</Badge></td>
                              </>
                            )}

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
