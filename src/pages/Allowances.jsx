import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Wallet,
  Home,
  Car,
  Zap,
  Phone,
  ShoppingBag,  ShoppingCart,
  PlusCircle,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Edit3,
  CheckCircle2,
  Sparkles,
  Building,
  Users,
  Coins,
  TrendingUp,
  Layers,
  Percent,
  X,
  FileCheck
} from 'lucide-react';

export default function Allowances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === 'owner' || user?.role === 'accountant' || user?.role === 'hr' || user?.role === 'system_admin' || user?.role === 'admin' || !user?.role || user?.role !== 'employee';

  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [allowanceFilter, setAllowanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('employee_number');

  // Edit Modal State
  const [editModal, setEditModal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Print View Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Fetch Employees and Reference Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empData, branchData, deptData] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.Branch.list().catch(() => []),
        base44.entities.Department.list().catch(() => [])
      ]);

      const activeEmployees = (empData || []).filter(e => e.status !== 'inactive' && e.status !== 'terminated');
      setEmployees(activeEmployees);
      setBranches(branchData || []);
      setDepartments(deptData || []);
    } catch (e) {
      toast({ title: 'خطأ في جلب البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered and Sorted Employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(e => {
        // Search Filter
        if (search) {
          const s = search.toLowerCase().trim();
          const matchName = (e.full_name || '').toLowerCase().includes(s);
          const matchNum = String(e.employee_number || '').includes(s);
          const matchDept = (e.department_name || '').toLowerCase().includes(s);
          const matchBranch = (e.branch_name || '').toLowerCase().includes(s);
          if (!matchName && !matchNum && !matchDept && !matchBranch) return false;
        }

        // Branch Filter
        if (selectedBranch !== 'all' && e.branch_name !== selectedBranch) return false;

        // Department Filter
        if (selectedDept !== 'all' && e.department_name !== selectedDept) return false;

        // Allowance Type Filter
        const housing = Number(e.housing_allowance) || 0;
        const transport = Number(e.transport_allowance) || 0;
        const electricity = Number(e.electricity_allowance) || 0;
        const phone = Number(e.phone_allowance) || 0;
        const other = Number(e.other_allowance) || 0;
        const total = housing + transport + electricity + phone + other;

        if (allowanceFilter === 'has_housing' && housing <= 0) return false;
        if (allowanceFilter === 'has_transport' && transport <= 0) return false;
        if (allowanceFilter === 'has_electricity' && electricity <= 0) return false;
        if (allowanceFilter === 'has_phone' && phone <= 0) return false;
        if (allowanceFilter === 'has_other' && other <= 0) return false;
        if (allowanceFilter === 'has_any' && total <= 0) return false;
        if (allowanceFilter === 'no_allowance' && total > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'full_name') return (a.full_name || '').localeCompare(b.full_name || '');
        if (sortBy === 'salary') return (Number(b.salary) || 0) - (Number(a.salary) || 0);
        if (sortBy === 'total_allowance') {
          const totA = (Number(a.housing_allowance) || 0) + (Number(a.transport_allowance) || 0) + (Number(a.electricity_allowance) || 0) + (Number(a.phone_allowance) || 0) + (Number(a.other_allowance) || 0);
          const totB = (Number(b.housing_allowance) || 0) + (Number(b.transport_allowance) || 0) + (Number(b.electricity_allowance) || 0) + (Number(b.phone_allowance) || 0) + (Number(b.other_allowance) || 0);
          return totB - totA;
        }
        return Number(a.employee_number || 0) - Number(b.employee_number || 0);
      });
  }, [employees, search, selectedBranch, selectedDept, allowanceFilter, sortBy]);

  // Totals & KPI Metrics
  const metrics = useMemo(() => {
    let totalBasic = 0;
    let totalHousing = 0;
    let totalTransport = 0;
    let totalElectricity = 0;
    let totalPhone = 0;
    let totalOther = 0;
    let beneficiaryCount = 0;

    employees.forEach(e => {
      const basic = Number(e.salary) || 0;
      const h = Number(e.housing_allowance) || 0;
      const t = Number(e.transport_allowance) || 0;
      const el = Number(e.electricity_allowance) || 0;
      const ph = Number(e.phone_allowance) || 0;
      const ot = Number(e.other_allowance) || 0;
      const allSum = h + t + el + ph + ot;

      totalBasic += basic;
      totalHousing += h;
      totalTransport += t;
      totalElectricity += el;
      totalPhone += ph;
      totalOther += ot;

      if (allSum > 0) beneficiaryCount++;
    });

    const totalAllowances = totalHousing + totalTransport + totalElectricity + totalPhone + totalOther;
    const totalGross = totalBasic + totalAllowances;
    const beneficiaryPercentage = employees.length > 0 ? Math.round((beneficiaryCount / employees.length) * 100) : 0;

    return {
      totalBasic,
      totalHousing,
      totalTransport,
      totalElectricity,
      totalPhone,
      totalOther,
      totalAllowances,
      totalGross,
      beneficiaryCount,
      beneficiaryPercentage,
      employeeCount: employees.length
    };
  }, [employees]);

  // Save Allowance Updates
  const handleSaveAllowance = async () => {
    if (!editModal) return;
    setIsSaving(true);
    try {
      const { emp, housing, transport, electricity, phone, other, notes } = editModal;
      
      const updatedRecord = {
        ...emp,
        housing_allowance: Number(housing) || 0,
        transport_allowance: Number(transport) || 0,
        electricity_allowance: Number(electricity) || 0,
        phone_allowance: Number(phone) || 0,
        other_allowance: Number(other) || 0,
        allowance_notes: notes || ''
      };

      await base44.entities.Employee.update(emp.id, updatedRecord);

      // In-memory update
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...updatedRecord } : e));

      toast({
        title: '✓ تم حفظ وتحديث البدلات بنجاح',
        description: `تم تحديث حزمة بدلات الموظف (${emp.full_name}) وحفظها سحابياً.`
      });

      setEditModal(null);
    } catch (e) {
      toast({ title: 'خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const fmtSAR = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      
      {/* ─── HEADER & ACTIONS ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-black tracking-tight">سجل وإدارة البدلات والمزايا المالية</h1>
              <p className="text-xs text-indigo-200/80">
                إدارة مركزية شاملة لبدلات السكن، المواصلات، الكهرباء، والمشتريات لكافة موظفي الشركة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsPrintModalOpen(true)}
            variant="outline"
            className="rounded-2xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 h-10 backdrop-blur-md"
          >
            <Printer className="w-4 h-4 text-indigo-300" />
            <span>طباعة كشف البدلات A4</span>
          </Button>

          <Button
            onClick={() => {
              const headers = ['الرقم الوظيفي', 'اسم الموظف', 'الفرع', 'القسم', 'الراتب الأساسي', 'بدل السكن', 'بدل المواصلات', 'بدل الكهرباء', 'بدل المشتريات', 'بدلات أخرى', 'إجمالي البدلات', 'إجمالي الراتب'];
              const rows = filteredEmployees.map(e => {
                const h = Number(e.housing_allowance) || 0;
                const t = Number(e.transport_allowance) || 0;
                const el = Number(e.electricity_allowance) || 0;
                const ph = Number(e.phone_allowance) || 0;
                const ot = Number(e.other_allowance) || 0;
                const tot = h + t + el + ph + ot;
                const basic = Number(e.salary) || 0;
                return [
                  e.employee_number,
                  `"${e.full_name}"`,
                  `"${e.branch_name || ''}"`,
                  `"${e.department_name || ''}"`,
                  basic,
                  h,
                  t,
                  el,
                  ph,
                  ot,
                  tot,
                  basic + tot
                ].join(',');
              });

              const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `كشف_البدلات_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast({ title: '✓ تم تصدير ملف الإكسيل بنجاح' });
            }}
            variant="outline"
            className="rounded-2xl bg-emerald-600/80 hover:bg-emerald-600 text-white border-0 text-xs font-bold gap-1.5 h-10 shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel (CSV)</span>
          </Button>
        </div>
      </div>

      {/* ─── METRICS CARDS GRID ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* 1. Total Allowances */}
        <Card className="p-4 rounded-3xl border bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300">
            <span className="text-[11px] font-bold">إجمالي البدلات الشهرية</span>
            <Wallet className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-indigo-900 dark:text-indigo-200">
            {fmtSAR(metrics.totalAllowances)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
          <div className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 mt-1 font-semibold">
            {metrics.beneficiaryCount} من أصل {metrics.employeeCount} موظف مستفيد
          </div>
        </Card>

        {/* 2. Housing Allowance */}
        <Card className="p-4 rounded-3xl border bg-gradient-to-br from-sky-50/80 to-sky-100/50 dark:from-sky-950/40 dark:to-sky-900/20 border-sky-200 dark:border-sky-800/60 shadow-sm">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-300">
            <span className="text-[11px] font-bold">بدل السكن 🏠</span>
            <Home className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-sky-900 dark:text-sky-200">
            {fmtSAR(metrics.totalHousing)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
          <div className="text-[10px] text-sky-700/80 dark:text-sky-300/80 mt-1 font-semibold">
            شهرياً لجميع الفروع
          </div>
        </Card>

        {/* 3. Transport Allowance */}
        <Card className="p-4 rounded-3xl border bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-[11px] font-bold">بدل المواصلات 🚗</span>
            <Car className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-emerald-900 dark:text-emerald-200">
            {fmtSAR(metrics.totalTransport)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1 font-semibold">
            شهرياً لجميع الفروع
          </div>
        </Card>

        {/* 4. Electricity Allowance */}
        <Card className="p-4 rounded-3xl border bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-[11px] font-bold">بدل الكهرباء ⚡</span>
            <Zap className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-amber-900 dark:text-amber-200">
            {fmtSAR(metrics.totalElectricity)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
          <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-1 font-semibold">
            المرافق والخدمات
          </div>
        </Card>

        {/* 5. Phone Allowance */}
        <Card className="p-4 rounded-3xl border bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/60 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
            <span className="text-[11px] font-bold">بدل المشتريات 🛒</span>
            <ShoppingBag className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-purple-900 dark:text-purple-200">
            {fmtSAR(metrics.totalPhone)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
          <div className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-1 font-semibold">
            الهاتف وشبكة العمل
          </div>
        </Card>

        {/* 6. Gross Total with Allowances */}
        <Card className="p-4 rounded-3xl border bg-gradient-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20 border-rose-200 dark:border-rose-800/60 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300">
            <span className="text-[11px] font-bold">إجمالي الرواتب والبدلات</span>
            <TrendingUp className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-rose-900 dark:text-rose-200">
            {fmtSAR(metrics.totalGross)} <span className="text-[10px] font-sans font-normal text-muted-foreground">ر.س</span>
          </div>
          <div className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-1 font-semibold">
            الأساسي: {fmtSAR(metrics.totalBasic)} ر.س
          </div>
        </Card>

      </div>

      {/* ─── FILTERS & SEARCH TOOLBAR ────────────────────────────────────────── */}
      <Card className="p-4 rounded-3xl border bg-card shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم الوظيفي..."
              className="pr-9 rounded-2xl text-xs h-10 bg-background"
            />
          </div>

          {/* Branch Select */}
          <div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="rounded-2xl text-xs h-10 bg-background">
                <SelectValue placeholder="كافة الفروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الفروع والمواقع</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id || b.name} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Select */}
          <div>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="rounded-2xl text-xs h-10 bg-background">
                <SelectValue placeholder="كافة الأقسام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الأقسام</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allowance Filter */}
          <div>
            <Select value={allowanceFilter} onValueChange={setAllowanceFilter}>
              <SelectTrigger className="rounded-2xl text-xs h-10 bg-background font-bold">
                <SelectValue placeholder="نوع البدل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الموظفين</SelectItem>
                <SelectItem value="has_any" className="text-indigo-700 font-bold">✓ لديهم أي بدل مالي</SelectItem>
                <SelectItem value="has_housing" className="text-sky-700 font-bold">🏠 لديهم بدل سكن</SelectItem>
                <SelectItem value="has_transport" className="text-emerald-700 font-bold">🚗 لديهم بدل مواصلات</SelectItem>
                <SelectItem value="has_electricity" className="text-amber-700 font-bold">⚡ لديهم بدل كهرباء</SelectItem>
                <SelectItem value="has_phone" className="text-purple-700 font-bold">🛒 لديهم بدل مشتريات</SelectItem>
                <SelectItem value="has_other" className="text-rose-700 font-bold">➕ لديهم بدلات أخرى</SelectItem>
                <SelectItem value="no_allowance" className="text-slate-500 font-bold">🚫 بدون بدلات (أساسي فقط)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-2xl text-xs h-10 bg-background">
                <SelectValue placeholder="الترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee_number">ترتيب حسب الرقم الوظيفي</SelectItem>
                <SelectItem value="full_name">ترتيب أبجدي بالاسم</SelectItem>
                <SelectItem value="total_allowance">ترتيب بالأعلى بدلات</SelectItem>
                <SelectItem value="salary">ترتيب بالأعلى راتب أساسي</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Filter Summary Pill */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t px-1">
          <span>يتم عرض <strong>{filteredEmployees.length}</strong> من أصل {employees.length} موظف</span>
          {(search || selectedBranch !== 'all' || selectedDept !== 'all' || allowanceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedBranch('all');
                setSelectedDept('all');
                setAllowanceFilter('all');
              }}
              className="h-6 text-[11px] text-rose-600 hover:bg-rose-50 rounded-xl"
            >
              إعادة ضبط الفلاتر ✕
            </Button>
          )}
        </div>
      </Card>

      {/* ─── MAIN ALLOWANCES TABLE ───────────────────────────────────────────── */}
      <Card className="rounded-3xl border shadow-sm bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b text-slate-700 dark:text-slate-300 font-heading font-black">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4 min-w-[200px]">الموظف والبيانات الوظيفية</th>
                <th className="py-3.5 px-3">الفرع والوردية</th>
                <th className="py-3.5 px-3">الراتب الأساسي</th>
                <th className="py-3.5 px-3 text-sky-700 dark:text-sky-400">🏠 بدل سكن</th>
                <th className="py-3.5 px-3 text-emerald-700 dark:text-emerald-400">🚗 بدل مواصلات</th>
                <th className="py-3.5 px-3 text-amber-700 dark:text-amber-400">⚡ بدل كهرباء</th>
                <th className="py-3.5 px-3 text-purple-700 dark:text-purple-400">🛒 بدل مشتريات</th>
                <th className="py-3.5 px-3 text-slate-600 dark:text-slate-400">➕ أخرى</th>
                <th className="py-3.5 px-3 text-indigo-700 dark:text-indigo-300 font-black">إجمالي البدلات</th>
                <th className="py-3.5 px-4 text-emerald-800 dark:text-emerald-300 font-black">الراتب الإجمالي</th>
                {canManage && <th className="py-3.5 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل سجل البدلات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    لا توجد سجلات موظفين مطابقة لمعايير البحث والفلترة.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const basic = Number(emp.salary) || 0;
                  const housing = Number(emp.housing_allowance) || 0;
                  const transport = Number(emp.transport_allowance) || 0;
                  const electricity = Number(emp.electricity_allowance) || 0;
                  const phone = Number(emp.phone_allowance) || 0;
                  const other = Number(emp.other_allowance) || 0;
                  const totalAllowances = housing + transport + electricity + phone + other;
                  const grossSalary = basic + totalAllowances;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors group"
                    >
                      {/* # Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-muted-foreground">
                        {idx + 1}
                      </td>

                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-200/60 shadow-sm flex-shrink-0">
                            {(emp.full_name || 'م')[0]}
                          </div>
                          <div>
                            <div className="font-heading font-black text-foreground text-xs flex items-center gap-1.5">
                              <span>{emp.full_name}</span>
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
                                #{emp.employee_number}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                              {emp.job_title || 'موظف'} • {emp.nationality || 'سعودي'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Branch & Shift */}
                      <td className="py-3.5 px-3">
                        <div className="text-[11px] font-bold text-foreground">
                          {emp.branch_name || 'الفرع الرئيسي'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {emp.shift || 'فترة عمل'}
                        </div>
                      </td>

                      {/* Basic Salary */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {fmtSAR(basic)} ر.س
                      </td>

                      {/* Housing */}
                      <td className="py-3.5 px-3 font-mono">
                        {housing > 0 ? (
                          <span className="font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-200/60">
                            {fmtSAR(housing)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Transport */}
                      <td className="py-3.5 px-3 font-mono">
                        {transport > 0 ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                            {fmtSAR(transport)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Electricity */}
                      <td className="py-3.5 px-3 font-mono">
                        {electricity > 0 ? (
                          <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200/60">
                            {fmtSAR(electricity)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3 font-mono">
                        {phone > 0 ? (
                          <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200/60">
                            {fmtSAR(phone)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Other */}
                      <td className="py-3.5 px-3 font-mono">
                        {other > 0 ? (
                          <span className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200/60" title={emp.allowance_notes || ''}>
                            {fmtSAR(other)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Total Allowances */}
                      <td className="py-3.5 px-3 font-mono font-black text-indigo-700 dark:text-indigo-300">
                        {totalAllowances > 0 ? `+${fmtSAR(totalAllowances)}` : '0.00'}
                      </td>

                      {/* Gross Salary */}
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50/30 dark:bg-emerald-950/20">
                        {fmtSAR(grossSalary)} <span className="text-[10px] font-sans font-normal">ر.س</span>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditModal({
                              emp,
                              housing: emp.housing_allowance || 0,
                              transport: emp.transport_allowance || 0,
                              electricity: emp.electricity_allowance || 0,
                              phone: emp.phone_allowance || 0,
                              other: emp.other_allowance || 0,
                              notes: emp.allowance_notes || ''
                            })}
                            className="h-8 text-xs font-bold rounded-xl text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/60 px-2.5 gap-1 border border-indigo-200/60 dark:border-indigo-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل البدلات</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredEmployees.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-900 border-t font-black font-mono text-xs">
                  <td colSpan={3} className="py-3 px-4 text-right font-heading">
                    الإجماليات الكلية المعتمدة ({filteredEmployees.length} موظف):
                  </td>
                  <td className="py-3 px-3 text-slate-900 dark:text-slate-100">{fmtSAR(metrics.totalBasic)}</td>
                  <td className="py-3 px-3 text-sky-700 dark:text-sky-300">{fmtSAR(metrics.totalHousing)}</td>
                  <td className="py-3 px-3 text-emerald-700 dark:text-emerald-300">{fmtSAR(metrics.totalTransport)}</td>
                  <td className="py-3 px-3 text-amber-700 dark:text-amber-300">{fmtSAR(metrics.totalElectricity)}</td>
                  <td className="py-3 px-3 text-purple-700 dark:text-purple-300">{fmtSAR(metrics.totalPhone)}</td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{fmtSAR(metrics.totalOther)}</td>
                  <td className="py-3 px-3 text-indigo-700 dark:text-indigo-300 font-black">+{fmtSAR(metrics.totalAllowances)}</td>
                  <td className="py-3 px-4 text-emerald-800 dark:text-emerald-300 text-sm font-black">{fmtSAR(metrics.totalGross)}</td>
                  {canManage && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ─── MODAL: EDIT EMPLOYEE ALLOWANCES ─────────────────────────────────── */}
      {editModal && (
        <Dialog open={!!editModal} onOpenChange={(o) => !o && setEditModal(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <span>تعديل باقة البدلات — {editModal.emp?.full_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              
              {/* Employee Quick Info */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">{editModal.emp?.full_name}</span>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    #{editModal.emp?.employee_number} • {editModal.emp?.job_title} • {editModal.emp?.branch_name}
                  </div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-[10px] text-muted-foreground">الراتب الأساسي</div>
                  <div className="text-sm font-black text-indigo-900 dark:text-indigo-200">{fmtSAR(editModal.emp?.salary)} ر.س</div>
                </div>
              </div>

              {/* Allowances Input Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* 1. Housing */}
                <div className="space-y-1">
                  <Label className="font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                    <Home className="w-3.5 h-3.5" />
                    <span>1. بدل السكن (ر.س شهرياً):</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={editModal.housing}
                    onChange={(e) => setEditModal(prev => ({ ...prev, housing: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                    placeholder="0"
                  />
                </div>

                {/* 2. Transport */}
                <div className="space-y-1">
                  <Label className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Car className="w-3.5 h-3.5" />
                    <span>2. بدل المواصلات (ر.س شهرياً):</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={editModal.transport}
                    onChange={(e) => setEditModal(prev => ({ ...prev, transport: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                    placeholder="0"
                  />
                </div>

                {/* 3. Electricity */}
                <div className="space-y-1">
                  <Label className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Zap className="w-3.5 h-3.5" />
                    <span>3. بدل الكهرباء والمرافق:</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={editModal.electricity}
                    onChange={(e) => setEditModal(prev => ({ ...prev, electricity: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                    placeholder="0"
                  />
                </div>

                {/* 4. Phone */}
                <div className="space-y-1">
                  <Label className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                    <Phone className="w-3.5 h-3.5" />
                    <span>4. بدل المشتريات والاتصالات:</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={editModal.phone}
                    onChange={(e) => setEditModal(prev => ({ ...prev, phone: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                    placeholder="0"
                  />
                </div>

              </div>

              {/* 5. Other Allowance & Notes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <Label className="font-bold text-rose-800 dark:text-rose-300">بدلات أخرى (ر.س):</Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={editModal.other}
                    onChange={(e) => setEditModal(prev => ({ ...prev, other: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="font-bold text-muted-foreground">ملاحظات ومبرر البدلات:</Label>
                  <Input
                    value={editModal.notes}
                    onChange={(e) => setEditModal(prev => ({ ...prev, notes: e.target.value }))}
                    className="rounded-xl text-xs h-9"
                    placeholder="مثال: بدل إعاشة / بدل طبيعة عمل خاصة..."
                  />
                </div>
              </div>

              {/* Live Gross Salary Calculation Box */}
              {(() => {
                const b = Number(editModal.emp?.salary) || 0;
                const h = Number(editModal.housing) || 0;
                const t = Number(editModal.transport) || 0;
                const el = Number(editModal.electricity) || 0;
                const ph = Number(editModal.phone) || 0;
                const ot = Number(editModal.other) || 0;
                const sumAll = h + t + el + ph + ot;
                const gross = b + sumAll;

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between font-mono shadow-md">
                    <div>
                      <div className="text-[10px] text-slate-400">إجمالي البدلات الجديدة:</div>
                      <div className="text-sm font-black text-indigo-300">+{fmtSAR(sumAll)} ر.س</div>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-slate-400">الراتب الإجمالي الجديد:</div>
                      <div className="text-base font-black text-emerald-400">{fmtSAR(gross)} ر.س</div>
                    </div>
                  </div>
                );
              })()}

            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditModal(null)} className="rounded-xl font-bold text-xs">
                إلغاء
              </Button>
              <Button
                onClick={handleSaveAllowance}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ واعتماد البدلات 💾'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: PRINT A4 ALLOWANCES REPORT ───────────────────────────────── */}
      {isPrintModalOpen && (
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black flex items-center justify-between">
                <span>معاينة كشف البدلات والمزايا المالية المعتمد A4</span>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-indigo-600 text-white rounded-xl text-xs font-bold gap-1"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs font-sans border rounded-2xl p-6 bg-white text-slate-900 shadow-sm print:m-0 print:p-0 print:border-0" id="print-allowances-area">
              {/* Report Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">مؤسسة درة السيارة لقطع غيار السيارات</h2>
                  <div className="text-xs text-slate-600 font-semibold mt-1">كشف البدلات والمزايا المالية الرسمية للعاملين</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-SA')}</div>
                </div>
                <div className="text-left font-mono">
                  <Badge variant="outline" className="text-xs font-bold">تقرير معتمد</Badge>
                  <div className="text-[11px] text-slate-600 mt-1">إجمالي الموظفين: {filteredEmployees.length}</div>
                </div>
              </div>

              {/* Print Table */}
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300">#</th>
                    <th className="p-2 border border-slate-300">الاسم والوظيفة</th>
                    <th className="p-2 border border-slate-300">الفرع</th>
                    <th className="p-2 border border-slate-300 font-mono">الأساسي</th>
                    <th className="p-2 border border-slate-300 font-mono">السكن</th>
                    <th className="p-2 border border-slate-300 font-mono">المواصلات</th>
                    <th className="p-2 border border-slate-300 font-mono">الكهرباء</th>
                    <th className="p-2 border border-slate-300 font-mono">الهاتف</th>
                    <th className="p-2 border border-slate-300 font-mono">أخرى</th>
                    <th className="p-2 border border-slate-300 font-mono font-black">إجمالي البدلات</th>
                    <th className="p-2 border border-slate-300 font-mono font-black">الراتب الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((e, i) => {
                    const basic = Number(e.salary) || 0;
                    const h = Number(e.housing_allowance) || 0;
                    const t = Number(e.transport_allowance) || 0;
                    const el = Number(e.electricity_allowance) || 0;
                    const ph = Number(e.phone_allowance) || 0;
                    const ot = Number(e.other_allowance) || 0;
                    const totAll = h + t + el + ph + ot;

                    return (
                      <tr key={e.id} className="border-b border-slate-300">
                        <td className="p-2 border border-slate-300 font-mono">{i + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {e.full_name} <span className="font-mono text-[10px] text-slate-500">(#{e.employee_number})</span>
                        </td>
                        <td className="p-2 border border-slate-300">{e.branch_name}</td>
                        <td className="p-2 border border-slate-300 font-mono">{fmtSAR(basic)}</td>
                        <td className="p-2 border border-slate-300 font-mono">{h > 0 ? fmtSAR(h) : '—'}</td>
                        <td className="p-2 border border-slate-300 font-mono">{t > 0 ? fmtSAR(t) : '—'}</td>
                        <td className="p-2 border border-slate-300 font-mono">{el > 0 ? fmtSAR(el) : '—'}</td>
                        <td className="p-2 border border-slate-300 font-mono">{ph > 0 ? fmtSAR(ph) : '—'}</td>
                        <td className="p-2 border border-slate-300 font-mono">{ot > 0 ? fmtSAR(ot) : '—'}</td>
                        <td className="p-2 border border-slate-300 font-mono font-black text-indigo-700">+{fmtSAR(totAll)}</td>
                        <td className="p-2 border border-slate-300 font-mono font-black text-emerald-800">{fmtSAR(basic + totAll)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black font-mono border-t border-slate-400">
                    <td colSpan={3} className="p-2 border border-slate-300 text-right">الإجماليات الكلية:</td>
                    <td className="p-2 border border-slate-300">{fmtSAR(metrics.totalBasic)}</td>
                    <td className="p-2 border border-slate-300">{fmtSAR(metrics.totalHousing)}</td>
                    <td className="p-2 border border-slate-300">{fmtSAR(metrics.totalTransport)}</td>
                    <td className="p-2 border border-slate-300">{fmtSAR(metrics.totalElectricity)}</td>
                    <td className="p-2 border border-slate-300">{fmtSAR(metrics.totalPhone)}</td>
                    <td className="p-2 border border-slate-300">{fmtSAR(metrics.totalOther)}</td>
                    <td className="p-2 border border-slate-300 text-indigo-800">+{fmtSAR(metrics.totalAllowances)}</td>
                    <td className="p-2 border border-slate-300 text-emerald-800">{fmtSAR(metrics.totalGross)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 pt-8 text-center text-xs font-bold">
                <div>
                  <div>مسؤول الموارد البشرية</div>
                  <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
                <div>
                  <div>المحاسب المالي</div>
                  <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
                <div>
                  <div>المدير العام المعتمد</div>
                  <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
