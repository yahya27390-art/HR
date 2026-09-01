import AdvanceVoucherA4Modal from '@/components/AdvanceVoucherA4Modal';
import { initFullCloudSync } from '@/lib/cloudSyncEngine';
import { getCompanyProfile } from '@/lib/companyProfile';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { computeEmployeePayroll, getPayrollSettings, getAdvances } from '@/lib/payrollEngine';

export const REPORT_DEFINITIONS = [
  {
    id: 'branch_biometrics_advanced',
    title: 'البصمات (حسب الفرع) - مطور',
    category: 'attendance',
    categoryLabel: 'تقرير الحضور',
    description: 'سجل تفصيلي متطور للبصمات وحركات الدخول والخروج والورديات اليومية بطراز جدول الإكسيل المعتمد',
    icon: Clock,
    color: '#0284c7'
  },
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
    title: 'تفاصيل الرواتب والأجور',
    category: 'payroll',
    categoryLabel: 'رواتب الموظفين',
    description: 'المسير المالي للرواتب متضمناً البدلات والمكافآت والاستقطاعات وصافي الراتب المستحق',
    icon: Wallet,
    color: '#8b5cf6'
  },
  {
    id: 'employee_master_data',
    title: 'بيانات الموظفين الشاملة',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'الدليل العام والشامل لبيانات الكادر، الأرقام الوظيفية، الهويات، وتواريخ المباشرة',
    icon: Users,
    color: '#ef4444'
  },
  {
    id: 'leave_report',
    title: 'تقرير الإجازات والأرصدة',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'سجل الإجازات السنوية والمرضية والاضطرارية وفترات القيام والعودة من الإجازة',
    icon: CalendarDays,
    color: '#10b981'
  },
  {
    id: 'advances_and_loans',
    title: 'تقرير السلف والقروض',
    category: 'payroll',
    categoryLabel: 'رواتب الموظفين',
    description: 'كشف السلف المالية الممنوحة للموظفين، المبالغ المسددة، والأقساط الشهرية المتبقية',
    icon: Wallet,
    color: '#f59e0b'
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
    id: 'medical_insurance',
    title: 'تقرير التأمين الطبي للموظفين',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'بيانات وثائق التأمين الصحي، فئات التغطية، وتواريخ الصلاحية لكافة الموظفين والتابعين',
    icon: HeartPulse,
    color: '#ec4899'
  },
  {
    id: 'terminated_employees',
    title: 'تقرير الموظفين المنتهية خدماتهم',
    category: 'hr',
    categoryLabel: 'الموارد البشرية',
    description: 'سجل الاستقالات، إنهاء العقود، وتواريخ تسليم العهد وتصفية المستحقات النهائية',
    icon: Briefcase,
    color: '#64748b'
  },
  {
    id: 'company_custodies',
    title: 'التقرير العام - العهد المسلمة',
    category: 'admin',
    categoryLabel: 'الإدارة والعهد',
    description: 'جرد العهد العينية والمالية المسلمة للموظفين (السيارات، أجهزة الحاسب، والعهد النقدية)',
    icon: Package,
    color: '#06b6d4'
  }
];

export default function Reports() {
  const [company, setCompany] = useState(getCompanyProfile);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedReportId, setSelectedReportId] = useState(() => searchParams.get('report') || null);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [starredReports, setStarredReports] = useState(() => {
    try {
      const s = localStorage.getItem('ga_starred_reports');
      return s ? JSON.parse(s) : ['daily_biometrics', 'payroll_details', 'employee_master_data'];
    } catch (e) {
      return ['daily_biometrics', 'payroll_details', 'employee_master_data'];
    }
  });

  // Filter Form State
  const [filterEmpId, setFilterEmpId] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');

  // Master Data
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [advancesList, setAdvancesList] = useState([]);
  const [selectedAdvForVoucher, setSelectedAdvForVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generated Data
  const [generatedData, setGeneratedData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync with searchParams
  useEffect(() => {
    const reportParam = searchParams.get('report');
    if (reportParam !== selectedReportId) {
      setSelectedReportId(reportParam || null);
    }
  }, [searchParams]);

  // Load Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        await initFullCloudSync().catch(() => {});
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

    const handleSync = () => {
      setAdvancesList(getAdvances());
    };
    window.addEventListener('cloud_data_synced', handleSync);
    return () => window.removeEventListener('cloud_data_synced', handleSync);
  }, []);

  const currentReportDef = useMemo(() => {
    return REPORT_DEFINITIONS.find(r => r.id === selectedReportId) || null;
  }, [selectedReportId]);

  // Unique branches
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Filter Catalog Cards
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

  // Master Generation Function
  const generateCurrentReport = (repId) => {
    setIsGenerating(true);

    setTimeout(() => {
      try {
        let targetEmployees = employees.filter(e => {
          const matchEmp = filterEmpId === 'all' || String(e.employee_number || e.id) === String(filterEmpId);
          const matchBranch = filterBranch === 'all' || (e.branch_name || e.branch || '') === filterBranch;
          return matchEmp && matchBranch;
        });

        let rows = [];
        let summary = {};
        const activeDef = REPORT_DEFINITIONS.find(r => r.id === repId) || currentReportDef || REPORT_DEFINITIONS[0];

        if (repId === 'daily_biometrics' || repId === 'branch_biometrics_advanced') {
          const monthKey = fromDate.slice(0, 7) || '2026-08';
          const settings = getPayrollSettings();
          const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

          targetEmployees.forEach(emp => {
            const pr = computeEmployeePayroll(emp, attendanceLogs, shifts, {
              ...settings,
              monthPrefix: monthKey
            });

            const days = (pr.dailyDetails || []).filter(d => {
              const dStr = d.log_date || '';
              return !dStr || (dStr >= fromDate && dStr <= toDate);
            });

            days.forEach((d, idx) => {
              const logDate = d.log_date || (monthKey + '-01');
              let dayName = d.day_name;
              if (!dayName && logDate) {
                const dt = new Date(logDate);
                if (!isNaN(dt.getTime())) dayName = daysAr[dt.getDay()];
              }

              const actMins = Number(d.actualMinutes) || 0;
              const reqMins = Number(d.requiredMinutes) || 480;
              const lateMins = Number(d.shortfallMinutes) || 0;
              const actHrs = (actMins / 60).toFixed(1);

              rows.push({
                index: idx + 1,
                emp_num: emp.employee_number || '1000',
                emp_name: emp.full_name,
                branch: emp.branch_name || 'الفرع الرئيسي',
                shift: emp.shift || 'دوام رسمي',
                date: logDate,
                day_name: dayName || 'يوم عمل',
                check_in: d.check_in ? (d.check_in.includes('T') ? d.check_in.split('T')[1].slice(0, 5) : d.check_in.slice(0, 5)) : '--:--',
                check_out: d.check_out ? (d.check_out.includes('T') ? d.check_out.split('T')[1].slice(0, 5) : d.check_out.slice(0, 5)) : '--:--',
                actual_hours: actHrs,
                late_minutes: lateMins,
                status: d.status === 'present' ? 'حاضر' : d.status === 'absent' ? 'غائب' : d.status
              });
            });
          });

          summary = {
            totalRows: rows.length,
            presentCount: rows.filter(r => r.status === 'حاضر').length,
            absentCount: rows.filter(r => r.status === 'غائب').length,
            totalHours: rows.reduce((acc, r) => acc + Number(r.actual_hours || 0), 0).toFixed(1)
          };

        } else if (repId === 'payroll_details') {
          const monthKey = fromDate.slice(0, 7) || '2026-08';
          const settings = getPayrollSettings();

          targetEmployees.forEach((emp, idx) => {
            const pr = computeEmployeePayroll(emp, attendanceLogs, shifts, {
              ...settings,
              monthPrefix: monthKey
            });

            const basicSal = Number(pr.basicSalary || emp.salary) || 0;
            const housingVal = Number(pr.housing || emp.housing_allowance) || 0;
            const transportVal = Number(pr.transport || emp.transport_allowance) || 0;
            const additionsVal = Number(pr.totalAdditions) || 0;
            const deductionsVal = Number(pr.totalDeductions) || 0;
            const netSal = Number(pr.netSalary) || (basicSal + housingVal + transportVal + additionsVal - deductionsVal);

            rows.push({
              index: idx + 1,
              emp_num: emp.employee_number,
              emp_name: emp.full_name,
              branch: emp.branch_name || 'الفرع الرئيسي',
              job_title: emp.job_title || 'موظف',
              basic_salary: basicSal,
              housing_allowance: housingVal,
              transport_allowance: transportVal,
              gross_salary: basicSal + housingVal + transportVal,
              extra_hours_bonus: Number(pr.customBonusesTotal) || 0,
              sales_incentive: additionsVal,
              total_earnings: basicSal + housingVal + transportVal + additionsVal,
              late_deduction: Number(pr.approvedShortfallDeduction) || 0,
              absence_deduction: Number(pr.customPenaltiesTotal) || 0,
              advance_deduction: Number(pr.advanceInstallment) || 0,
              total_deductions: deductionsVal,
              net_salary: netSal
            });
          });

          summary = {
            totalEmployees: rows.length,
            totalGross: rows.reduce((acc, r) => acc + Number(r.gross_salary || 0), 0),
            totalDeductions: rows.reduce((acc, r) => acc + Number(r.total_deductions || 0), 0),
            totalNetSalary: rows.reduce((acc, r) => acc + Number(r.net_salary || 0), 0)
          };

        } else if (repId === 'employee_master_data') {
          targetEmployees.forEach((emp, idx) => {
            rows.push({
              index: idx + 1,
              emp_num: emp.employee_number,
              name_ar: emp.full_name,
              name_en: emp.english_name || emp.name_en || '--',
              national_id: emp.national_id || '--',
              nationality: emp.nationality || 'سعودي',
              branch: emp.branch_name || 'الفرع الرئيسي',
              job_title: emp.job_title || 'موظف',
              join_date: emp.join_date || emp.hire_date || '--',
              basic_salary: emp.salary || 0,
              mobile: emp.phone || emp.mobile || '--',
              status: emp.status || 'نشط'
            });
          });
          summary = { totalEmployees: rows.length, saudiCount: rows.filter(r => r.nationality === 'سعودي').length };

        } else if (repId === 'leave_report') {
          targetEmployees.forEach((emp, idx) => {
            const isInsured = emp.is_insured === true || emp.is_insured === 'true';
            const totalAnnual = isInsured ? 21 : 30;
            const empLeaves = (leavesList || []).filter(l => String(l.employee_number || l.employee_id) === String(emp.employee_number || emp.id));
            const takenDays = empLeaves.reduce((acc, l) => acc + (Number(l.days_count) || 0), 0);
            const remaining = Math.max(0, totalAnnual - takenDays);

            rows.push({
              index: idx + 1,
              emp_num: emp.employee_number,
              emp_name: emp.full_name,
              branch: emp.branch_name || 'الفرع الرئيسي',
              annual_balance: totalAnnual,
              taken_days: takenDays,
              remaining_days: remaining,
              last_leave_date: empLeaves[0]?.start_date || '--',
              status: remaining > 0 ? 'رصيد متاح' : 'استنفذ الرصيد'
            });
          });
          summary = { totalEmployees: rows.length };

        } else if (repId === 'advances_and_loans') {
          const rawAdvs = getAdvances();
          const advs = rawAdvs.length > 0 ? rawAdvs : (advancesList || []);
          let activeIndex = 1;
          advs.forEach((adv) => {
            if (adv.status === 'rejected') return;
            const emp = employees.find(e => String(e.employee_number || e.id) === String(adv.employee_number));
            const matchBranch = filterBranch === 'all' || (emp?.branch_name || emp?.branch || '') === filterBranch;
            const matchEmp = filterEmpId === 'all' || String(adv.employee_number) === String(filterEmpId);

            if (matchBranch && matchEmp) {
              const total = Number(adv.total_amount || adv.amount) || 0;
              const monthly = Number(adv.monthly_installment || adv.monthly_deduction) || 0;
              const totalInst = Number(adv.total_installments || adv.installments) || (monthly > 0 ? Math.ceil(total / monthly) : 1);
              const paidInst = Number(adv.paid_installments) || 0;
              const paid = Number(adv.paid_amount !== undefined ? adv.paid_amount : (paidInst * monthly)) || 0;
              const rem = Number(adv.remaining_balance !== undefined ? adv.remaining_balance : Math.max(0, total - paid));

              rows.push({
                index: activeIndex++,
                emp_num: adv.employee_number || emp?.employee_number || '--',
                emp_name: emp?.full_name || adv.employee_name || 'موظف',
                branch: emp?.branch_name || emp?.branch || 'الفرع الرئيسي',
                total_amount: total,
                monthly_installment: monthly,
                total_installments: totalInst,
                paid_amount: paid,
                remaining_amount: rem,
                start_month: adv.start_month || (adv.date ? adv.date.slice(0, 7) : '2026-08'),
                status: rem <= 0 ? 'مسددة بالكامل' : (adv.status === 'disbursed' || adv.status === 'active' ? 'سارية وقيد الاستقطاع' : 'معتمدة')
              });
            }
          });
          summary = {
            totalAdvances: rows.reduce((acc, r) => acc + Number(r.total_amount || 0), 0),
            totalPaid: rows.reduce((acc, r) => acc + Number(r.paid_amount || 0), 0),
            totalRemaining: rows.reduce((acc, r) => acc + Number(r.remaining_amount || 0), 0),
            activeCount: rows.filter(r => r.remaining_amount > 0).length
          };

        } else if (repId === 'medical_insurance') {
          targetEmployees.forEach((emp, idx) => {
            rows.push({
              index: idx + 1,
              emp_num: emp.employee_number,
              emp_name: emp.full_name,
              branch: emp.branch_name || 'الفرع الرئيسي',
              national_id: emp.national_id || '--',
              policy_num: 'POL-GA-2026-88',
              insurance_class: String(emp.employee_number) === '1001' ? 'VIP Elite' : 'Class A',
              expiry_date: emp.insurance_expiry || '2027-04-30',
              status: 'ساري المفعول'
            });
          });
          summary = { totalCount: rows.length, activeCount: rows.length };

        } else {
          targetEmployees.forEach((emp, idx) => {
            rows.push({
              index: idx + 1,
              emp_num: emp.employee_number,
              emp_name: emp.full_name,
              branch: emp.branch_name || 'الفرع الرئيسي',
              job_title: emp.job_title || 'موظف',
              date: fromDate,
              status: 'معتمد'
            });
          });
          summary = { totalCount: rows.length };
        }

        setGeneratedData({
          reportDef: activeDef,
          rows,
          summary,
          generatedAt: new Date().toLocaleString('ar-SA'),
          filterEmp: filterEmpId === 'all' ? 'كافة الموظفين' : targetEmployees[0]?.full_name || filterEmpId,
          filterBranch: filterBranch === 'all' ? 'كافة الفروع' : filterBranch,
          fromDate,
          toDate
        });

      } catch (err) {
        console.error('Report Generation Error:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  };

  // Auto-generate report when selected or filters change
  useEffect(() => {
    if (selectedReportId && employees.length > 0) {
      generateCurrentReport(selectedReportId);
    }
  }, [selectedReportId, employees, attendanceLogs, fromDate, toDate, filterEmpId, filterBranch]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!generatedData || !generatedData.rows.length) return;
    try {
      const ws = XLSX.utils.json_to_sheet(generatedData.rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
      XLSX.writeFile(wb, generatedData.reportDef.title + '_' + generatedData.fromDate + '.xlsx');
      toast({ title: '✓ تم تصدير ملف الإكسل بنجاح' });
    } catch (e) {
      toast({ title: 'خطأ في التصدير', description: e.message, variant: 'destructive' });
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto min-h-screen" dir="rtl">
      
      {/* ─── 1. REPORT CATALOG OVERVIEW (WHEN NO REPORT SELECTED) ─── */}
      {!selectedReportId && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="bg-card p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-heading font-black text-xl text-foreground">
                  مركز التقارير والتحليلات المؤسسية
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  استخراج وطباعة وتصدير كافة تقارير الحضور، الرواتب، الإجازات، والبيانات الإدارية.
                </p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
              <Input
                placeholder="ابحث في أسماء التقارير..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pr-9 rounded-xl text-xs font-bold h-10"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'عرض الكل', count: REPORT_DEFINITIONS.length },
              { id: 'attendance', label: 'تقرير الحضور', count: REPORT_DEFINITIONS.filter(r => r.category === 'attendance').length },
              { id: 'payroll', label: 'رواتب الموظفين', count: REPORT_DEFINITIONS.filter(r => r.category === 'payroll').length },
              { id: 'hr', label: 'الموارد البشرية', count: REPORT_DEFINITIONS.filter(r => r.category === 'hr').length },
              { id: 'admin', label: 'الإدارة والعهد', count: REPORT_DEFINITIONS.filter(r => r.category === 'admin').length },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatalogCategory(cat.id)}
                className={'px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ' + (
                  catalogCategory === cat.id
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-card border text-muted-foreground hover:bg-muted'
                )}
              >
                <span>{cat.label}</span>
                <span className={'text-[10px] px-1.5 py-0.5 rounded-full font-mono ' + (
                  catalogCategory === cat.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map(rep => {
              const IconComponent = rep.icon;
              const isStarred = starredReports.includes(rep.id);

              return (
                <Card
                  key={rep.id}
                  onClick={() => {
                    setSelectedReportId(rep.id);
                    setSearchParams({ report: rep.id });
                  }}
                  className="p-5 rounded-3xl border hover:border-rose-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: rep.color }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStarredReports(prev => {
                            const next = prev.includes(rep.id) ? prev.filter(x => x !== rep.id) : [...prev, rep.id];
                            try { localStorage.setItem('ga_starred_reports', JSON.stringify(next)); } catch (err) {}
                            return next;
                          });
                        }}
                        className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                      >
                        <Star className={'w-4 h-4 ' + (isStarred ? 'fill-amber-400 text-amber-400' : '')} />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-heading font-black text-sm text-foreground group-hover:text-rose-600 transition-colors">
                        {rep.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {rep.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-muted-foreground">{rep.categoryLabel}</span>
                    <span className="font-bold text-rose-600 flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
                      <span>استعراض</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

        </div>
      )}

      {/* ─── 2. ACTIVE REPORT VIEWER (WHEN A REPORT IS SELECTED) ─── */}
      {selectedReportId && currentReportDef && (
        <div className="space-y-6">

          {/* Top Bar: Back button & Title */}
          <div className="bg-card p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedReportId(null);
                  setSearchParams({});
                }}
                className="rounded-2xl gap-1.5 font-bold text-xs h-10 px-4"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للمركز</span>
              </Button>

              <div>
                <h2 className="font-heading font-black text-lg text-foreground flex items-center gap-2">
                  <span>{currentReportDef.title}</span>
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                    {currentReportDef.categoryLabel}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">{currentReportDef.description}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 px-4 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>إكسل</span>
              </Button>

              <Button
                onClick={handlePrint}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 px-4 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة A4</span>
              </Button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <Card className="p-5 rounded-3xl border shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Branch Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">الفرع المعتمد:</label>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="rounded-xl text-xs font-bold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة الفروع</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">الموظف:</label>
                <Select value={filterEmpId} onValueChange={setFilterEmpId}>
                  <SelectTrigger className="rounded-xl text-xs font-bold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة الموظفين</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                        {e.full_name} (#{e.employee_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">من تاريخ:</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl text-xs font-bold h-9"
                />
              </div>

              {/* To Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">إلى تاريخ:</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl text-xs font-bold h-9"
                />
              </div>

            </div>
          </Card>

          {/* Results Table */}
          {generatedData && (
            <Card className="p-5 rounded-3xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 text-xs">
                <span className="font-bold text-muted-foreground">
                  إجمالي السجلات المستخرجة: <strong className="font-mono text-foreground text-sm">{generatedData.rows.length}</strong>
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  تاريخ التوليد: {generatedData.generatedAt}
                </span>
              </div>

              
              {/* ─── PRINT ONLY OFFICIAL CORPORATE HEADER WITH DYNAMIC LOGO ─── */}
              <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4" dir="rtl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="شعار الشركة" className="h-12 w-auto max-h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-lg">GA</div>
                    )}
                    <div>
                      <h1 className="text-base font-heading font-black text-slate-950">{company.name_ar}</h1>
                      <p className="text-[10px] text-slate-600 font-mono font-bold">{company.name_en}</p>
                      <div className="text-[9px] text-slate-600 mt-0.5">
                        السجل التجاري: <strong className="font-mono">{company.cr_number}</strong> • الرقم الضريبي: <strong className="font-mono">{company.tax_number}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-left border border-slate-300 rounded-lg p-2 bg-slate-50 text-[10px] space-y-0.5 min-w-[200px]">
                    <div><strong>التقرير:</strong> {currentReportDef?.title}</div>
                    <div><strong>الفترة:</strong> من {fromDate} إلى {toDate}</div>
                    <div><strong>الفرع:</strong> {filterBranch === 'all' ? 'كافة الفروع' : filterBranch}</div>
                    <div><strong>تاريخ الطباعة:</strong> {new Date().toLocaleDateString('en-US')}</div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 text-center">
                  <h2 className="text-sm font-heading font-black text-slate-950 uppercase">{currentReportDef?.title}</h2>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] print:max-h-none">
                <Table className="text-right text-xs">
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الفرع</TableHead>

                      {/* Dynamic Columns based on Report Type */}
                      {(selectedReportId === 'daily_biometrics' || selectedReportId === 'branch_biometrics_advanced') && (
                        <>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>اليوم</TableHead>
                          <TableHead>الدخول</TableHead>
                          <TableHead>الخروج</TableHead>
                          <TableHead className="text-center">ساعات العمل</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                        </>
                      )}

                      {selectedReportId === 'payroll_details' && (
                        <>
                          <TableHead>الأساسي</TableHead>
                          <TableHead>البدلات</TableHead>
                          <TableHead className="text-emerald-600">المكافآت</TableHead>
                          <TableHead className="text-rose-600">الاستقطاعات</TableHead>
                          <TableHead className="text-purple-600">قسط السلفة</TableHead>
                          <TableHead className="font-bold text-sky-600">صافي الراتب</TableHead>
                        </>
                      )}

                      {selectedReportId === 'employee_master_data' && (
                        <>
                          <TableHead>رقم الهوية / الإقامة</TableHead>
                          <TableHead>الجنسية</TableHead>
                          <TableHead>المسمى الوظيفي</TableHead>
                          <TableHead>تاريخ المباشرة</TableHead>
                          <TableHead>الراتب الأساسي</TableHead>
                          <TableHead>الحالة</TableHead>
                        </>
                      )}

                      {selectedReportId === 'leave_report' && (
                        <>
                          <TableHead className="text-center">الرصيد السنوي</TableHead>
                          <TableHead className="text-center text-rose-600">المستهلك</TableHead>
                          <TableHead className="text-center text-emerald-600 font-bold">المتبقي</TableHead>
                          <TableHead>آخر إجازة</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                        </>
                      )}

                      {selectedReportId === 'advances_and_loans' && (
                        <>
                          <TableHead>إجمالي السلفة</TableHead>
                          <TableHead>القسط الشهري</TableHead>
                          <TableHead className="text-emerald-600">المسدد</TableHead>
                          <TableHead className="text-rose-600 font-bold">المتبقي</TableHead>
                          <TableHead>تاريخ البدء</TableHead>
                          <TableHead className="text-center">حالة السداد</TableHead>
                        </>
                      )}

                      {selectedReportId === 'medical_insurance' && (
                        <>
                          <TableHead>رقم الوثيقة</TableHead>
                          <TableHead>فئة التأمين</TableHead>
                          <TableHead>تاريخ الانتهاء</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                        </>
                      )}

                      {!['daily_biometrics', 'branch_biometrics_advanced', 'payroll_details', 'employee_master_data', 'leave_report', 'advances_and_loans', 'medical_insurance'].includes(selectedReportId) && (
                        <>
                          <TableHead>المسمى الوظيفي</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {generatedData.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-12 text-center text-muted-foreground font-bold">
                          لا توجد بيانات مطابقة لمعايير الفلترة المحددة
                        </TableCell>
                      </TableRow>
                    ) : (
                      generatedData.rows.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/40 font-medium">
                          <TableCell className="font-mono text-muted-foreground">{row.index}</TableCell>
                          <TableCell className="font-bold">
                            <div>{row.emp_name || row.name_ar}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{row.emp_num}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.branch}</TableCell>

                          {/* Dynamic Row Cells */}
                          {(selectedReportId === 'daily_biometrics' || selectedReportId === 'branch_biometrics_advanced') && (
                            <>
                              <TableCell className="font-mono">{row.date}</TableCell>
                              <TableCell>{row.day_name}</TableCell>
                              <TableCell className="font-mono text-emerald-600 font-bold">{row.check_in}</TableCell>
                              <TableCell className="font-mono text-rose-600 font-bold">{row.check_out}</TableCell>
                              <TableCell className="font-mono text-center font-bold">{row.actual_hours} س</TableCell>
                              <TableCell className="text-center">
                                <Badge className={'text-[10px] ' + (
                                  row.status === 'حاضر' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}>
                                  {row.status}
                                </Badge>
                              </TableCell>
                            </>
                          )}

                          {selectedReportId === 'payroll_details' && (
                            <>
                              <TableCell className="font-mono">{Number(row.basic_salary).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono">{Number((row.housing_allowance || 0) + (row.transport_allowance || 0)).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono text-emerald-600 font-bold">+{Number(row.extra_hours_bonus || 0).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono text-rose-600 font-bold">-{Number(row.total_deductions || 0).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono text-purple-600 font-bold">{Number(row.advance_deduction || 0).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono font-bold text-sky-600 text-sm">{Number(row.net_salary).toLocaleString()} ر.س</TableCell>
                            </>
                          )}

                          {selectedReportId === 'employee_master_data' && (
                            <>
                              <TableCell className="font-mono">{row.national_id}</TableCell>
                              <TableCell>{row.nationality}</TableCell>
                              <TableCell>{row.job_title}</TableCell>
                              <TableCell className="font-mono">{row.join_date}</TableCell>
                              <TableCell className="font-mono font-bold">{Number(row.basic_salary).toLocaleString()} ر.س</TableCell>
                              <TableCell>
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  {row.status}
                                </Badge>
                              </TableCell>
                            </>
                          )}

                          {selectedReportId === 'leave_report' && (
                            <>
                              <TableCell className="font-mono text-center">{row.annual_balance} يوم</TableCell>
                              <TableCell className="font-mono text-center text-rose-600 font-bold">{row.taken_days} يوم</TableCell>
                              <TableCell className="font-mono text-center text-emerald-600 font-bold">{row.remaining_days} يوم</TableCell>
                              <TableCell className="font-mono">{row.last_leave_date}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={'text-[10px] ' + (
                                  row.remaining_days > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}>
                                  {row.status}
                                </Badge>
                              </TableCell>
                            </>
                          )}

                          {selectedReportId === 'advances_and_loans' && (
                            <>
                              <TableCell className="font-mono font-bold">{Number(row.total_amount).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono text-purple-700">{Number(row.monthly_installment).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono text-emerald-600 font-bold">{Number(row.paid_amount).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono text-rose-600 font-bold">{Number(row.remaining_amount).toLocaleString()} ر.س</TableCell>
                              <TableCell className="font-mono">{row.start_month}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {row.status}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const emp = employees.find(e => String(e.employee_number) === String(row.employee_number)) || { full_name: row.employee_name, employee_number: row.employee_number };
                                      setSelectedAdvForVoucher({
                                        advance: {
                                          amount: row.total_amount,
                                          total_amount: row.total_amount,
                                          monthly_installment: row.monthly_installment,
                                          start_month: row.start_month,
                                          reason: 'سلفة مالية مستحقة ومجدولة'
                                        },
                                        employee: emp
                                      });
                                    }}
                                    className="h-7 text-[11px] font-bold rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 gap-1"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>طباعة سند A4</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}

                          {selectedReportId === 'medical_insurance' && (
                            <>
                              <TableCell className="font-mono">{row.policy_num}</TableCell>
                              <TableCell className="font-bold text-pink-600">{row.insurance_class}</TableCell>
                              <TableCell className="font-mono">{row.expiry_date}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  {row.status}
                                </Badge>
                              </TableCell>
                            </>
                          )}

                          {!['daily_biometrics', 'branch_biometrics_advanced', 'payroll_details', 'employee_master_data', 'leave_report', 'advances_and_loans', 'medical_insurance'].includes(selectedReportId) && (
                            <>
                              <TableCell>{row.job_title}</TableCell>
                              <TableCell className="font-mono">{row.date}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-slate-100 text-slate-700 text-[10px]">{row.status}</Badge>
                              </TableCell>
                            </>
                          )}

                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ─── PRINT ONLY SIGNATURES & STAMPS FOOTER ─── */}
              <div className="hidden print:grid grid-cols-3 gap-4 text-center text-xs pt-4 mt-6 border-t-2 border-slate-900" dir="rtl">
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <div className="font-bold text-[9.5px] text-slate-500 mb-5">إعداد وتدقيق الموارد البشرية</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] font-bold text-slate-800">
                    يحيى محمد عبدالغفار باشا
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <div className="font-bold text-[9.5px] text-slate-500 mb-5">تدقيق وترحيل الحسابات</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] font-bold text-slate-800">
                    هشام ابوالفضل زغلول
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <div className="font-bold text-[9.5px] text-slate-500 mb-5">اعتماد ومصادقة المدير العام</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] font-bold text-slate-800">
                    فهد ناصر محمد الجوعي
                  </div>
                </div>
              </div>

            </Card>
          )}

        </div>
      )}

    </div>
  );
}
