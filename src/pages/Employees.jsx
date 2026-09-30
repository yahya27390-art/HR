import { MaskedSalary, PrivacyMaskToggle } from '@/lib/FinancialPrivacyContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sanitizeCsvRow } from '@/lib/security';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Building2,
  Clock,
  IdCard,
  Phone,
  Mail,
  DollarSign,
  ShieldCheck,
  UserCheck,
  Globe,
  Users,
  UserX,
  MapPin,
  MessageCircle,
  Share2,
  Filter,
  Download,
  LayoutGrid,
  List,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Employees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Strict RBAC Guard: Only users with employees.view can access this page
  if (!hasPermission(user, 'employees.view')) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-3xl shadow-lg">
          🔒
        </div>
        <h1 className="text-xl font-black text-foreground">غير مصرح بالوصول</h1>
        <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
          دليل وسجلات الموظفين مخصص للإدارة والموارد البشرية والمحاسبين فقط. يمكنك الاطلاع على بياناتك الشخصية عبر صفحة ملفي الشخصي.
        </p>
        <Button onClick={() => navigate('/employee-profile')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold px-6 h-10 shadow-md">
          الانتقال إلى ملفي الشخصي 360°
        </Button>
      </div>
    );
  }

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([
    { id: 'sh_non_saudi_overtime', name: 'فترة عمل غير سعودي (9 ساعات + إضافي 100 ريال)', working_hours: 9 },
    { id: 'sh_non_saudi', name: 'فترة عمل غير سعودي (الأساسي 8 ساعات)', working_hours: 8 },
    { id: 'sh_saudi_morning', name: 'فترة عمل سعودي صباحي', working_hours: 5 },
    { id: 'sh_saudi_evening', name: 'فترة عمل سعودي مسائي', working_hours: 5 },
    { id: 'sh_gm', name: 'شفت المدير العام', working_hours: 8 },
    { id: 'sh_ramadan', name: 'شفت رمضان', working_hours: 5.5 }
  ]);
  const [loading, setLoading] = useState(true);

  // Filters & Search (Default to active employees only per user directive)
  const [search, setSearch] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState('active'); // 'active' (default) | 'all' | 'inactive' | 'saudi' | 'resident' | 'main' | 'hyundai' | 'kia' | 'mgmt'
  const [branchFilter, setBranchFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [form, setForm] = useState({
    employee_number: '',
    full_name: '',
    job_title: 'بائع قطع غيار',
    branch_name: 'الفرع الرئيسي',
    department_name: 'درة السيارة لقطع الغيار',
    shift: 'فترة عمل غير السعوديين',
    nationality: 'سعودي',
    national_id: '',
    phone: '',
    email: '',
    salary: 3000,
    join_date: '2026-01-01',
    gender: 'male',
    status: 'active'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empList, shiftList] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.Shift.list()
      ]);
      setEmployees(empList || []);
      if (shiftList && shiftList.length > 0) {
        setShifts(shiftList);
      }
    } catch (e) {
      console.error('Error loading employees:', e);
      toast({ title: 'خطأ في تحميل الموظفين', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistics calculation (Ektefa Exact KPI cards)
  const stats = useMemo(() => {
    const total = employees.length;
    const isInactiveStatus = (s) => s === 'inactive' || s === 'terminated' || s === 'suspended' || s === 'متوقف عن العمل' || s === 'غير نشط';
    const inactive = employees.filter(e => isInactiveStatus(e.status)).length;
    const active = total - inactive;
    const saudi = employees.filter(e => e.nationality === 'سعودي').length;
    const resident = total - saudi;
    const male = employees.filter(e => e.gender !== 'female').length;
    const female = total - male;

    return { total, active, inactive, saudi, resident, male, female };
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    const isInactiveStatus = (s) => s === 'inactive' || s === 'terminated' || s === 'suspended' || s === 'متوقف عن العمل' || s === 'غير نشط';

    return employees.filter(emp => {
      // 1. Search filter
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (emp.full_name || '').toLowerCase().includes(q) ||
        (emp.employee_number || '').toString().includes(q) ||
        (emp.phone || '').includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.job_title || '').toLowerCase().includes(q) ||
        (emp.national_id || '').includes(q);

      // 2. Tab Filter
      let matchTab = true;
      if (activeTabFilter === 'active') {
        matchTab = !isInactiveStatus(emp.status);
      } else if (activeTabFilter === 'inactive') {
        matchTab = isInactiveStatus(emp.status);
      } else if (activeTabFilter === 'saudi') {
        matchTab = emp.nationality === 'سعودي';
      } else if (activeTabFilter === 'resident') {
        matchTab = emp.nationality !== 'سعودي';
      } else if (activeTabFilter === 'male') {
        matchTab = emp.gender !== 'female';
      } else if (activeTabFilter === 'female') {
        matchTab = emp.gender === 'female';
      } else if (activeTabFilter === 'main') {
        matchTab = (emp.branch_name || '').includes('الرئيسي');
      } else if (activeTabFilter === 'hyundai') {
        matchTab = (emp.branch_name || '').includes('هونداي') || (emp.branch_name || '').includes('هيونداي');
      } else if (activeTabFilter === 'kia') {
        matchTab = (emp.branch_name || '').includes('كيا');
      } else if (activeTabFilter === 'mgmt') {
        matchTab = (emp.branch_name || '').includes('الإدارة');
      }

      // 3. Branch filter dropdown
      const matchBranch = branchFilter === 'all' || (emp.branch_name || '') === branchFilter;

      return matchSearch && matchTab && matchBranch;
    });
  }, [employees, search, activeTabFilter, branchFilter]);

  // Handle Add New
  const handleOpenAdd = () => {
    const nextNum = String(Math.max(...employees.map(e => Number(e.employee_number) || 1000)) + 1);
    setEditingEmp(null);
    setForm({
      employee_number: nextNum,
      full_name: '',
      job_title: 'بائع قطع غيار',
      branch_name: 'الفرع الرئيسي',
      department_name: 'درة السيارة لقطع الغيار',
      shift: 'فترة عمل غير السعوديين',
      nationality: 'سعودي',
      national_id: '',
      phone: '966',
      email: '',
      salary: 3000,
      join_date: new Date().toISOString().split('T')[0],
      gender: 'male',
      status: 'active'
    });
    setModalOpen(true);
  };

  // Handle Edit
  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setForm({
      id: emp.id || ('emp_' + emp.employee_number),
      employee_number: emp.employee_number || '',
      full_name: emp.full_name || '',
      job_title: emp.job_title || 'بائع قطع غيار',
      branch_name: emp.branch_name || 'الفرع الرئيسي',
      department_name: emp.department_name || 'درة السيارة لقطع الغيار',
      shift: emp.shift || 'فترة عمل غير سعودي (الأساسي 8 ساعات)',
      nationality: emp.nationality || 'سعودي',
      national_id: emp.national_id || '',
      phone: emp.phone || '',
      email: emp.email || '',
      salary: emp.salary || 3000,
      join_date: emp.join_date || '2026-01-01',
      gender: emp.gender || 'male',
      status: emp.status || 'active'
    });
    setModalOpen(true);
  };

  // Save Employee (Create or Update)
  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'يرجى إدخال اسم الموظف بالكامل', variant: 'destructive' });
      return;
    }

    try {
      if (editingEmp) {
        const empId = editingEmp.id || ('emp_' + editingEmp.employee_number);
        await base44.entities.Employee.update(empId, {
          ...form,
          id: empId
        });
        toast({ title: '✓ تم تحديث بيانات الموظف والوردية بنجاح وحفظها في قاعدة البيانات' });
      } else {
        await base44.entities.Employee.create(form);
        toast({ title: '✓ تم إضافة الموظف الجديد بنجاح' });
      }
      setModalOpen(false);
      await loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    }
  };

  // Delete Employee
  const handleDelete = async (emp) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف ${emp.full_name} (رقم ${emp.employee_number})؟`)) return;
    try {
      await base44.entities.Employee.delete(emp.id);
      toast({ title: '✓ تم حذف الموظف بنجاح' });
      loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء الحذف', description: e.message, variant: 'destructive' });
    }
  };

  // Toggle Employee Active / Inactive Status
  const handleToggleStatus = async (emp) => {
    const isCurrentlyInactive = ['inactive', 'terminated', 'suspended', 'متوقف عن العمل', 'غير نشط'].includes(emp.status);
    const newStatus = isCurrentlyInactive ? 'active' : 'inactive';
    const newLabel = isCurrentlyInactive ? 'نشط على رأس العمل ✓' : 'متوقف عن العمل (غير نشط) ⏸️';

    try {
      const empId = emp.id || ('emp_' + emp.employee_number);
      await base44.entities.Employee.update(empId, {
        ...emp,
        status: newStatus
      });
      toast({
        title: `✓ تم تحديث حالة الموظف (${emp.full_name})`,
        description: `أصبحت الحالة الآن: ${newLabel}`
      });
      await loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء تعديل الحالة', description: e.message, variant: 'destructive' });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      toast({ title: 'لا توجد بيانات للتصدير' });
      return;
    }
    const headers = ['الرقم الوظيفي', 'الاسم', 'المسمى الوظيفي', 'الفرع', 'الجنسية', 'الهوية', 'الجوال', 'الإيميل', 'الراتب', 'تاريخ الانضمام'];
    const rows = filteredEmployees.map(e =>
      sanitizeCsvRow([
        e.employee_number,
        e.full_name,
        e.job_title,
        e.branch_name,
        e.nationality,
        e.national_id,
        e.phone,
        e.email,
        e.salary,
        e.join_date
      ])
    );

    // [Security] Formula-injection-safe: cleanCell prefixes formula triggers with a single-quote.
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `دليل_الموظفين_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: '✓ تم تصدير ملف الموظفين بنجاح' });
  };

  return (
    <div className="space-y-6" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP STATS CARDS (EKTEFA EXACT "ملخص" ROW) ──────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" />
            ملخص وإحصائيات القوى العاملة
          </h2>
          <span className="text-xs text-muted-foreground font-mono font-bold">
            إجمالي {stats.total} موظف
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Active */}
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'active' ? 'all' : 'active')}
            className={`p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
              activeTabFilter === 'active' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : ''
            }`}
          >
            <div>
              <div className="text-[11px] text-muted-foreground font-bold">نشط</div>
              <div className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Inactive */}
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'inactive' ? 'all' : 'inactive')}
            className={`p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
              activeTabFilter === 'inactive' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/20' : ''
            }`}
          >
            <div>
              <div className="text-[11px] text-muted-foreground font-bold">غير نشط</div>
              <div className="font-mono font-black text-2xl text-rose-600 dark:text-rose-400 mt-1">{stats.inactive}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          {/* Citizens (Saudi) */}
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'saudi' ? 'all' : 'saudi')}
            className={`p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
              activeTabFilter === 'saudi' ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
            }`}
          >
            <div>
              <div className="text-[11px] text-muted-foreground font-bold">مواطن</div>
              <div className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">{stats.saudi}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Residents */}
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'resident' ? 'all' : 'resident')}
            className={`p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
              activeTabFilter === 'resident' ? 'ring-2 ring-teal-500 border-teal-500' : ''
            }`}
          >
            <div>
              <div className="text-[11px] text-muted-foreground font-bold">مقيم</div>
              <div className="font-mono font-black text-2xl text-teal-600 dark:text-teal-400 mt-1">{stats.resident}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Globe className="w-5 h-5" />
            </div>
          </div>

          {/* Males */}
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'male' ? 'all' : 'male')}
            className={`p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
              activeTabFilter === 'male' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : ''
            }`}
          >
            <div>
              <div className="text-[11px] text-muted-foreground font-bold">ذكر</div>
              <div className="font-mono font-black text-2xl text-blue-600 dark:text-blue-400 mt-1">{stats.male}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Females */}
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'female' ? 'all' : 'female')}
            className={`p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
              activeTabFilter === 'female' ? 'ring-2 ring-pink-500 border-pink-500 bg-pink-50/20' : ''
            }`}
          >
            <div>
              <div className="text-[11px] text-muted-foreground font-bold">أنثى</div>
              <div className="font-mono font-black text-2xl text-pink-500 mt-1">{stats.female}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

        </div>
      </div>

      {/* ─── 2. MAIN TITLE BAR & ACTION BUTTONS ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-heading font-black text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" />
              قائمة الموظفين
            </h1>
            <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-mono font-bold">
              {filteredEmployees.length} موظف
            </Badge>

            {/* Active Quick Filter Indicator */}
            {activeTabFilter !== 'all' && (
              <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2.5 py-1 rounded-xl text-xs font-bold">
                <span>تصفية: {
                  activeTabFilter === 'active' ? 'النشطين' :
                  activeTabFilter === 'inactive' ? 'غير النشطين' :
                  activeTabFilter === 'saudi' ? 'المواطنين' :
                  activeTabFilter === 'resident' ? 'المقيمين' :
                  activeTabFilter === 'male' ? 'الذكور' :
                  activeTabFilter === 'female' ? 'الإناث' : activeTabFilter
                }</span>
                <button
                  type="button"
                  onClick={() => setActiveTabFilter('all')}
                  className="hover:text-rose-500 font-black ms-1 text-sm"
                  title="إلغاء التصفية"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            دليل الكوادر الوظيفية، العقود، والملفات الشخصية 360°
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-muted-foreground'
              }`}
              title="عرض البطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-muted-foreground'
              }`}
              title="عرض الجدول"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Export Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="rounded-2xl text-xs font-bold gap-1.5 h-9"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>تصدير Excel</span>
          </Button>

          {/* Add Employee Button (Ektefa Sky Blue) */}
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black gap-1.5 h-9 shadow-md shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </Button>
        </div>
      </div>

      {/* ─── 3. SEARCH & BRANCH TOOLBAR (Clean, Non-repetitive) ──────────────── */}
      <Card className="p-3 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالاسم، الرقم الوظيفي (1001)، الجوال، أو رقم الهوية..."
            className="ps-10 rounded-2xl text-xs h-10 bg-slate-50 dark:bg-slate-800/60 border-0 focus-visible:ring-1 focus-visible:ring-sky-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold hover:text-foreground"
            >
              مسح
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-52 rounded-2xl text-xs h-10 bg-background">
              <SelectValue placeholder="كافة الفروع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كافة الفروع</SelectItem>
              <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
              <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
              <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
              <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ─── 4. EMPLOYEE CARDS GRID VIEW (EKTEFA EXACT SPEC) ────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 rounded-3xl border bg-white dark:bg-slate-900 animate-pulse h-64" />
            ))
          ) : filteredEmployees.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <div className="font-heading font-black text-sm text-foreground">لا توجد نتائج مطابقة لبحثك</div>
              <p className="text-xs mt-1">جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر</p>
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isInactive = ['inactive', 'terminated', 'suspended', 'متوقف عن العمل', 'غير نشط'].includes(emp.status);
              const whatsappNumber = (emp.phone || '').replace(/[^0-9]/g, '');
              const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`مرحباً أخي ${emp.full_name}`)}`;

              return (
                <Card
                  key={emp.id}
                  className={`p-4 sm:p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                    isInactive ? 'opacity-85 border-rose-200/70 bg-rose-50/10' : 'hover:border-sky-300'
                  }`}
                >
                  {/* Card Content */}
                  <div>
                    {/* Header: Avatar + Name + Clean Number Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-heading font-black text-base shadow-sm transition-transform ${
                            isInactive 
                              ? 'bg-gradient-to-tr from-slate-600 to-rose-600' 
                              : 'bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-500'
                          }`}>
                            {emp.full_name ? emp.full_name.charAt(0) : 'م'}
                          </div>
                          <span 
                            className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              isInactive 
                                ? 'bg-rose-500 ring-1 ring-rose-300' 
                                : 'bg-emerald-500 ring-1 ring-emerald-300'
                            }`}
                            title={isInactive ? 'متوقف عن العمل' : 'نشط على رأس العمل'}
                          />
                        </div>

                        <div className="min-w-0">
                          <Link
                            to={`/employees/${emp.id}`}
                            className="font-heading font-black text-sm text-foreground hover:text-sky-600 transition-colors truncate block"
                          >
                            {emp.full_name}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                            {emp.job_title || 'بائع قطع غيار'}
                          </div>
                        </div>
                      </div>

                      {/* Employee Number & Status Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs px-2.5 py-0.5 rounded-xl">
                          {emp.employee_number}
                        </Badge>
                        {isInactive && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900">
                            متوقف
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Integrated Metadata Box (Clean, sleek, harmonious layout) */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 space-y-2 mb-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="text-foreground font-bold truncate text-[11.5px]">{emp.branch_name || 'الفرع الرئيسي'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                          <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="text-foreground font-bold text-[11.5px]">{emp.nationality || 'سعودي'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-foreground font-medium truncate text-[11px]">{emp.shift || 'دوام رسمي'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono text-foreground font-bold text-[11px]" dir="ltr">{emp.phone || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {/* Quick Toggle Status Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleStatus(emp)}
                        className={`w-8 h-8 rounded-xl border transition-colors ${
                          isInactive
                            ? 'bg-rose-50 hover:bg-emerald-50 text-rose-600 hover:text-emerald-600 border-rose-200'
                            : 'bg-emerald-50 hover:bg-rose-50 text-emerald-600 hover:text-rose-600 border-emerald-200'
                        }`}
                        title={isInactive ? 'إعادة تفعيل الموظف (نشط على رأس العمل)' : 'إيقاف الموظف وتحويله إلى متوقف عن العمل'}
                      >
                        {isInactive ? <UserCheck className="w-4 h-4 text-emerald-600" /> : <UserX className="w-4 h-4 text-rose-500" />}
                      </Button>

                      {/* WhatsApp Button */}
                      {emp.phone && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center transition-colors shadow-sm"
                          title="محادثة واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {/* Email Button */}
                      {emp.email && (
                        <a
                          href={`mailto:${emp.email}`}
                          className="w-8 h-8 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center transition-colors shadow-sm"
                          title="إرسال بريد"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}

                      {/* Edit Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(emp)}
                        className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        title="تعديل الموظف"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(emp)}
                        className="w-8 h-8 rounded-xl hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-950/50"
                        title="حذف الموظف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* View Profile 360 Button */}
                    <Link to={`/employees/${emp.id}`}>
                      <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-3"
                      >
                        <span>ملفي 360°</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-sky-400 dark:text-white" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── 5. EMPLOYEE TABLE VIEW ─────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <Card className="rounded-3xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
              <thead>
                <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                  <th className="py-3 px-4">الرقم الوظيفي</th>
                  <th className="py-3 px-4">الموظف والبيانات</th>
                  <th className="py-3 px-3">المسمى الوظيفي</th>
                  <th className="py-3 px-3">الفرع</th>
                  <th className="py-3 px-3">فترة العمل</th>
                  <th className="py-3 px-3">رقم الجوال</th>
                  <th className="py-3 px-3">الجنسية</th>
                  <th className="py-3 px-3">تاريخ الانضمام</th>
                  <th className="py-3 px-4 text-center">الخيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700 dark:text-sky-400">{emp.employee_number}</td>
                    <td className="py-3 px-4">
                      <Link to={`/employees/${emp.id}`} className="font-bold text-foreground hover:text-sky-600 transition-colors">
                        {emp.full_name}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-mono">{emp.email || '—'}</div>
                    </td>
                    <td className="py-3 px-3 text-foreground font-medium">{emp.job_title}</td>
                    <td className="py-3 px-3 text-muted-foreground">{emp.branch_name}</td>
                    <td className="py-3 px-3 font-medium">{emp.shift}</td>
                    <td className="py-3 px-3 font-mono">{emp.phone || '—'}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {emp.nationality || 'سعودي'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{emp.join_date}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/employees/${emp.id}`}>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-sky-600 hover:bg-sky-50 rounded-lg">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(emp)} className="h-7 w-7 hover:bg-slate-100 rounded-lg">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(emp)} className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── ADD / EDIT EMPLOYEE MODAL ──────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              {editingEmp ? `تعديل بيانات: ${editingEmp.full_name}` : 'إضافة موظف جديد للمنظومة'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">الرقم الوظيفي:</Label>
                <Input value={form.employee_number} onChange={(e) => setForm(prev => ({ ...prev, employee_number: e.target.value }))} className="rounded-xl font-mono font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الاسم بالكامل (بالعربية):</Label>
                <Input value={form.full_name} onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))} className="rounded-xl" placeholder="مثال: محمد علي السعوي" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">المسمى الوظيفي:</Label>
                <Input value={form.job_title} onChange={(e) => setForm(prev => ({ ...prev, job_title: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الفرع المعتمد:</Label>
                <Select value={form.branch_name} onValueChange={(val) => setForm(prev => ({ ...prev, branch_name: val }))}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                    <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
                    <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
                    <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs flex items-center justify-between">
                  <span>فترة العمل (الوردية المعتمدة):</span>
                </Label>
                <Select value={form.shift} onValueChange={(val) => setForm(prev => ({ ...prev, shift: val }))}>
                  <SelectTrigger className="rounded-xl text-xs font-bold">
                    <SelectValue placeholder="اختر الوردية..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl border-border">
                    {shifts.map((s) => (
                      <SelectItem key={s.id || s.name} value={s.name} className="text-xs font-bold py-2">
                        {s.name} {s.working_hours ? `(${s.working_hours} ساعات)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الجنسية:</Label>
                <Select value={form.nationality} onValueChange={(val) => setForm(prev => ({ ...prev, nationality: val }))}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="سعودي">سعودي</SelectItem>
                    <SelectItem value="مصري">مصري</SelectItem>
                    <SelectItem value="يمني">يمني</SelectItem>
                    <SelectItem value="سوري">سوري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">رقم الهوية / الإقامة:</Label>
                <Input value={form.national_id} onChange={(e) => setForm(prev => ({ ...prev, national_id: e.target.value }))} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">رقم الجوال:</Label>
                <Input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">البريد الإلكتروني:</Label>
                <Input value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الراتب الأساسي (ر.س):</Label>
                <Input type="number" value={form.salary} onChange={(e) => setForm(prev => ({ ...prev, salary: Number(e.target.value) }))} className="rounded-xl font-mono font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">تاريخ المباشرة والانضمام:</Label>
                <Input type="date" value={form.join_date} onChange={(e) => setForm(prev => ({ ...prev, join_date: e.target.value }))} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">الجنس:</Label>
                <Select value={form.gender} onValueChange={(val) => setForm(prev => ({ ...prev, gender: val }))}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Field */}
            <div className="space-y-1 pt-2 border-t">
              <Label className="font-bold text-xs flex items-center justify-between">
                <span>حالة الموظف في المنظومة:</span>
                <span className="text-[10.5px] text-muted-foreground font-normal">تتحكم في إمكانية الدخول للخدمة الذاتية ومسير الرواتب</span>
              </Label>
              <Select value={form.status || 'active'} onValueChange={(val) => setForm(prev => ({ ...prev, status: val }))}>
                <SelectTrigger className="rounded-xl text-xs font-bold h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl">
                  <SelectItem value="active" className="text-emerald-600 font-bold py-2.5">
                    ✓ نشط على رأس العمل (Active)
                  </SelectItem>
                  <SelectItem value="inactive" className="text-rose-600 font-bold py-2.5">
                    ⏸️ متوقف عن العمل / غير نشط (Inactive / Suspended)
                  </SelectItem>
                  <SelectItem value="terminated" className="text-slate-600 font-bold py-2.5">
                    🚫 منتهي الخدمات / مستقيل (Terminated)
                  </SelectItem>
                  <SelectItem value="on_leave" className="text-amber-600 font-bold py-2.5">
                    🌴 في إجازة رسمية (On Leave)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleSave} className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold">
              {editingEmp ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
