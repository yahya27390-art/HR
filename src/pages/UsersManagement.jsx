import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  KeyRound, 
  ShieldCheck, 
  Search, 
  Copy, 
  Check, 
  RotateCcw, 
  FileSpreadsheet, 
  Eye, 
  EyeOff, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  UserCheck, 
  Shield, 
  Info,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { sanitizeXlsxRows } from '@/lib/security';

const ROLES_CONFIG = [
  { value: 'owner', label: '👑 صاحب العمل', desc: 'كامل الصلاحيات والاطلاع المالي الشامل' },
  { value: 'system_admin', label: '🛡️ مدير النظام', desc: 'إدارة النظام وقواعد البيانات والمستخدمين' },
  { value: 'general_manager', label: '👔 المدير العام', desc: 'الاعتمادات والموافقات والتقارير التنفيذية' },
  { value: 'accountant', label: '🧾 المحاسب', desc: 'مسيرات الرواتب والسلف والتقارير المالية' },
  { value: 'hr', label: '👥 الموارد البشرية', desc: 'شؤون الموظفين والحضور والطلبات والإجازات' },
  { value: 'employee', label: '👤 موظف', desc: 'بوابة الخدمة الذاتية وطلباته الشخصية فقط' },
];

export default function UsersManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' (default) | 'all' | 'inactive'

  // Password visibility map { [empId]: boolean }
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [editForm, setEditForm] = useState({
    login_username: '',
    login_password: '',
    role: 'employee',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  // Check admin access
  const isAdmin = user?.role === 'system_admin' || user?.role === 'owner' || user?.role === 'general_manager' || user?.role === 'hr';

  // Load all employees
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Employee.list();
      setEmployees(list || []);
    } catch (e) {
      console.error('Error loading employees:', e);
      toast({ title: 'خطأ في تحميل بيانات الموظفين', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Helper to get employee login credentials
  const getCredentials = (emp) => {
    const meta = typeof emp.manager_name === 'string' && emp.manager_name.startsWith('{')
      ? JSON.parse(emp.manager_name)
      : {};

    const nationalId = String(emp.national_id || '').trim();
    const empNum = String(emp.employee_number || emp.id || '').replace('emp_', '').trim();
    
    // Username: national_id by default, fallback to employee_number
    const username = meta.login_username || nationalId || empNum;
    
    // Password: meta.login_password, or national_id by default
    const password = meta.login_password || nationalId || empNum || '123456';
    
    const role = emp.role || meta.role || 'employee';
    const isActive = emp.status === 'active' && meta.login_disabled !== true;

    return { username, password, role, isActive, meta };
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = (emp.full_name || '').toLowerCase();
      const num = String(emp.employee_number || '');
      const natId = String(emp.national_id || '');
      const branch = (emp.branch_name || emp.branch || '').toLowerCase();
      const s = search.toLowerCase();

      const matchSearch = name.includes(s) || num.includes(s) || natId.includes(s) || branch.includes(s);
      if (!matchSearch) return false;

      const isInactive = emp.status === 'inactive' || emp.status === 'terminated' || emp.status === 'suspended' || emp.status === 'متوقف عن العمل' || emp.status === 'غير نشط';
      if (filterStatus === 'active' && isInactive) return false;
      if (filterStatus === 'inactive' && !isInactive) return false;

      if (filterRole !== 'all') {
        const cred = getCredentials(emp);
        return cred.role === filterRole;
      }
      return true;
    });
  }, [employees, search, filterRole, filterStatus]);

  // Toggle password visibility for specific employee
  const togglePasswordVisibility = (empId) => {
    setShowPasswords(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  // Copy credentials to clipboard
  const handleCopyCredentials = (emp) => {
    const cred = getCredentials(emp);
    const loginUrl = window.location.origin + '/login';
    const text = `بيانات الدخول لنظام درة السيارة (HR Dorat Cars):\n` +
                 `الموظف: ${emp.full_name}\n` +
                 `الرقم الوظيفي: ${emp.employee_number}\n` +
                 `اسم المستخدم (رقم الهوية): ${cred.username}\n` +
                 `كلمة المرور: ${cred.password}\n` +
                 `رابط الدخول: ${loginUrl}`;

    navigator.clipboard.writeText(text);
    setCopiedId(emp.id);
    setTimeout(() => setCopiedId(null), 2500);
    toast({ title: `✓ تم نسخ بيانات الدخول للموظف ${emp.full_name}` });
  };

  // Quick reset password to National ID
  const handleResetToNationalId = async (emp) => {
    const nationalId = String(emp.national_id || '').trim();
    if (!nationalId) {
      toast({ title: 'تنبيه', description: 'الموظف لا يمتلك رقم هوية مسجل بالنظام.', variant: 'destructive' });
      return;
    }

    try {
      const cred = getCredentials(emp);
      const updatedMeta = {
        ...cred.meta,
        login_username: nationalId,
        login_password: nationalId,
        password_updated_at: new Date().toISOString()
      };

      await base44.entities.Employee.update(emp.id, {
        ...emp,
        manager_name: JSON.stringify(updatedMeta)
      });

      toast({ title: `✓ تم تعيين رقم الهوية (${nationalId}) كاسم مستخدم وكلمة مرور للموظف ${emp.full_name}` });
      loadEmployees();
    } catch (e) {
      toast({ title: 'خطأ أثناء تعيين كلمة المرور', description: e.message, variant: 'destructive' });
    }
  };

  // Open Edit Modal
  const openEditModal = (emp) => {
    const cred = getCredentials(emp);
    setEditingEmp(emp);
    setEditForm({
      login_username: cred.username,
      login_password: cred.password,
      role: cred.role,
      is_active: cred.isActive
    });
    setEditModalOpen(true);
  };

  // Save Edit Form
  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    setSaving(true);
    try {
      const cred = getCredentials(editingEmp);
      const updatedMeta = {
        ...cred.meta,
        login_username: editForm.login_username.trim(),
        login_password: editForm.login_password.trim(),
        login_disabled: !editForm.is_active,
        password_updated_at: new Date().toISOString()
      };

      await base44.entities.Employee.update(editingEmp.id, {
        ...editingEmp,
        role: editForm.role,
        manager_name: JSON.stringify(updatedMeta)
      });

      toast({ title: `✓ تم تحديث بيانات دخول وصلاحية الموظف ${editingEmp.full_name} بنجاح` });
      setEditModalOpen(false);
      loadEmployees();
    } catch (e) {
      toast({ title: 'خطأ في الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Bulk Initialize All Accounts to National ID
  const handleBulkInitialize = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في تهيئة وتعيين أرقام الهويات كأسماء مستخدمين وكلمات مرور لجميع الموظفين دفعة واحدة؟')) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    try {
      for (const emp of employees) {
        const nationalId = String(emp.national_id || '').trim();
        const empNum = String(emp.employee_number || emp.id || '').replace('emp_', '').trim();
        const defaultIdent = nationalId || empNum;

        const cred = getCredentials(emp);
        const updatedMeta = {
          ...cred.meta,
          login_username: defaultIdent,
          login_password: defaultIdent,
          password_updated_at: new Date().toISOString()
        };

        await base44.entities.Employee.update(emp.id, {
          ...emp,
          manager_name: JSON.stringify(updatedMeta)
        });
        successCount++;
      }

      toast({ title: `✓ تمت تهيئة حسابات ${successCount} موظف بنجاح برقم الهوية` });
      loadEmployees();
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء التهيئة الجماعية', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Export Credentials Table to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredEmployees.map((emp, idx) => {
      const cred = getCredentials(emp);
      return {
        '#': idx + 1,
        'الرقم الوظيفي': emp.employee_number,
        'اسم الموظف': emp.full_name,
        'رقم الهوية / الإقامة': emp.national_id || 'غير مسجل',
        'الفرع': emp.branch_name || emp.branch || 'الفرع الرئيسي',
        'المسمى الوظيفي': emp.job_title || 'موظف',
        'اسم المستخدم للدخول': cred.username,
        'كلمة المرور المؤقتة': cred.password,
        'الدور / الصلاحية': ROLES_CONFIG.find(r => r.value === cred.role)?.label || cred.role,
        'حالة الحساب': cred.isActive ? 'نشط ✓' : 'معطل ✕'
      };
    });

    const ws = XLSX.utils.json_to_sheet(sanitizeXlsxRows(dataToExport));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'بيانات تسجيل دخول الموظفين');
    XLSX.writeFile(wb, `بيانات_حسابات_دخول_الموظفين_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: '✓ تم تصدير كشف حسابات الدخول إلى Excel بنجاح' });
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl p-8 border border-border shadow-sm max-w-lg mx-auto mt-10">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground">غير مصرح بالوصول</h2>
        <p className="text-xs text-muted-foreground mt-1">هذه اللوحة مخصصة للإدارة العامة وأصحاب الصلاحيات لإدارة حسابات الدخول.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground">
              إدارة حسابات الدخول وكلمات المرور
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              تنظيم بيانات تسجيل الدخول وتعيين أرقام الهويات كأسماء مستخدمين وكلمات مرور مؤقتة للموظفين.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleBulkInitialize}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold gap-1.5 h-11 px-4 shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>تهيئة الجميع برقم الهوية ⚡</span>
          </Button>

          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="rounded-2xl text-xs font-bold gap-1.5 h-11 px-4 border-slate-200 dark:border-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </Button>

          <Button
            onClick={loadEmployees}
            variant="ghost"
            size="icon"
            className="rounded-2xl h-11 w-11 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ─── STATS CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">إجمالي حسابات الموظفين:</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground mt-1">
            {employees.length} <span className="text-xs font-sans text-muted-foreground">موظف</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">أرقام الهوية المسجلة:</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {employees.filter(e => !!e.national_id).length} <span className="text-xs font-sans text-muted-foreground">هوية / إقامة</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">أصحاب الصلاحيات الإدارية:</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-600 mt-1">
            {employees.filter(e => e.role && e.role !== 'employee').length} <span className="text-xs font-sans text-muted-foreground">إداري / محاسب</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border-border bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">بوابة الموظفين العامة:</span>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 mt-1">
            {employees.filter(e => !e.role || e.role === 'employee').length} <span className="text-xs font-sans text-muted-foreground">موظف عادي</span>
          </div>
        </Card>
      </div>

      {/* ─── SEARCH & FILTERS ────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-5 rounded-3xl border-border bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-3 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم، الرقم الوظيفي، أو رقم الهوية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rounded-2xl text-xs font-bold h-10 border-slate-250 dark:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter: Active (Default) vs All vs Inactive */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🟢 النشطين ({employees.filter(e => e.status !== 'inactive' && e.status !== 'terminated' && e.status !== 'suspended' && e.status !== 'متوقف عن العمل' && e.status !== 'غير نشط').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                الكل ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'inactive'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔴 غير النشطين ({employees.filter(e => e.status === 'inactive' || e.status === 'terminated' || e.status === 'suspended' || e.status === 'متوقف عن العمل' || e.status === 'غير نشط').length})
              </button>
            </div>

            <Button
              size="sm"
              variant={filterRole === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterRole('all')}
              className="rounded-xl text-xs font-bold h-9"
            >
              كافة الأدوار
            </Button>
            <Button
              size="sm"
              variant={filterRole === 'employee' ? 'default' : 'outline'}
              onClick={() => setFilterRole('employee')}
              className="rounded-xl text-xs font-bold h-9"
            >
              الموظفون
            </Button>
            <Button
              size="sm"
              variant={filterRole === 'accountant' ? 'default' : 'outline'}
              onClick={() => setFilterRole('accountant')}
              className="rounded-xl text-xs font-bold h-9"
            >
              المحاسبون
            </Button>
            <Button
              size="sm"
              variant={filterRole === 'hr' ? 'default' : 'outline'}
              onClick={() => setFilterRole('hr')}
              className="rounded-xl text-xs font-bold h-9"
            >
              الموارد البشرية
            </Button>
            <Button
              size="sm"
              variant={filterRole === 'owner' ? 'default' : 'outline'}
              onClick={() => setFilterRole('owner')}
              className="rounded-xl text-xs font-bold h-9"
            >
              الإدارة العليا
            </Button>
          </div>
        </div>

        {/* ─── CREDENTIALS TABLE ────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-[11.5px] font-bold text-muted-foreground">
                <th className="py-3 px-3">الموظف</th>
                <th className="py-3 px-2 text-center font-mono">الرقم الوظيفي</th>
                <th className="py-3 px-2 text-center font-mono">رقم الهوية / الإقامة</th>
                <th className="py-3 px-2 text-center">اسم المستخدم للدخول</th>
                <th className="py-3 px-2 text-center">كلمة المرور المؤقتة</th>
                <th className="py-3 px-2 text-center">الصلاحية / الدور</th>
                <th className="py-3 px-2 text-center">الحالة</th>
                <th className="py-3 px-3 text-center">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    جاري تحميل بيانات الموظفين والحسابات...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    لا توجد بيانات مطابقة لخيارات البحث.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const cred = getCredentials(emp);
                  const isPassVisible = showPasswords[emp.id];
                  const roleObj = ROLES_CONFIG.find(r => r.value === cred.role) || ROLES_CONFIG[5];

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Branch */}
                      <td className="py-3 px-3">
                        <div className="font-heading font-black text-foreground">{emp.full_name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span>{emp.branch_name || emp.branch || 'الفرع الرئيسي'}</span>
                          <span>•</span>
                          <span>{emp.job_title || 'موظف'}</span>
                        </div>
                      </td>

                      {/* Emp Number */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-foreground">
                        #{emp.employee_number}
                      </td>

                      {/* National ID */}
                      <td className="py-3 px-2 text-center font-mono">
                        {emp.national_id ? (
                          <Badge variant="outline" className="font-bold text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {emp.national_id}
                          </Badge>
                        ) : (
                          <span className="text-rose-500 font-bold text-[10px]">غير مسجل ⚠️</span>
                        )}
                      </td>

                      {/* Login Username */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-sky-700 dark:text-sky-300">
                        {cred.username}
                      </td>

                      {/* Password */}
                      <td className="py-3 px-2 text-center font-mono">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-xl">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {isPassVisible ? cred.password : '••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(emp.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-2 text-center">
                        <Badge 
                          className={`text-[10px] font-bold ${
                            cred.role === 'owner' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            cred.role === 'system_admin' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                            cred.role === 'accountant' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            cred.role === 'hr' ? 'bg-teal-100 text-teal-900 border-teal-300' :
                            'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {roleObj.label}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold ${cred.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cred.isActive ? 'bg-emerald-600' : 'bg-rose-500'}`} />
                          {cred.isActive ? 'مفعل' : 'معطل'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Copy */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyCredentials(emp)}
                            title="نسخ بيانات الدخول"
                            className="h-8 px-2 rounded-xl text-slate-600 hover:text-foreground"
                          >
                            {copiedId === emp.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>

                          {/* Reset to National ID */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetToNationalId(emp)}
                            title="تعيين رقم الهوية كباسوورد"
                            className="h-8 px-2.5 rounded-xl text-[10.5px] font-bold gap-1 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>رقم الهوية</span>
                          </Button>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openEditModal(emp)}
                            className="h-8 px-2.5 rounded-xl text-[10.5px] font-bold bg-slate-900 text-white hover:bg-slate-800"
                          >
                            <span>تعديل</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── MODAL: EDIT CREDENTIALS & ROLE ───────────────────────────────── */}
      {editingEmp && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <span>تعديل بيانات الدخول والصلاحية</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 flex items-center justify-between">
                <div>
                  <div className="font-heading font-black text-sm text-indigo-950 dark:text-indigo-200">
                    {editingEmp.full_name}
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                    الرقم الوظيفي: #{editingEmp.employee_number} — الهوية: {editingEmp.national_id || 'غير مسجل'}
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground">اسم المستخدم لتسجيل الدخول</Label>
                <Input
                  value={editForm.login_username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, login_username: e.target.value }))}
                  placeholder="رقم الهوية أو اسم المستخدم"
                  className="rounded-xl h-10 font-mono text-xs"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground">كلمة المرور</Label>
                <Input
                  value={editForm.login_password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, login_password: e.target.value }))}
                  placeholder="كلمة المرور"
                  className="rounded-xl h-10 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  القيمة الافتراضية هي رقم الهوية الوطنية / الإقامة.
                </p>
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground">الدور والصلاحية</Label>
                <Select 
                  value={editForm.role} 
                  onValueChange={(val) => setEditForm(prev => ({ ...prev, role: val }))}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_CONFIG.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex flex-col text-right">
                          <span className="font-bold">{r.label}</span>
                          <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Reset to National ID button inside modal */}
              {editingEmp.national_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditForm(prev => ({
                    ...prev,
                    login_username: editingEmp.national_id,
                    login_password: editingEmp.national_id
                  }))}
                  className="w-full rounded-xl text-xs font-bold gap-1 text-indigo-700 border-indigo-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة رقم الهوية ({editingEmp.national_id}) كاسم مستخدم وكلمة مرور</span>
                </Button>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
