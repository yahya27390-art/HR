import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { base44 } from '@/api/base44Client';
import { getCompanyProfile, saveCompanyProfile } from '@/lib/companyProfile';
import {
  PERMISSIONS,
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_META,
  getRolePermissions,
  saveRolePermissions,
  resetAllPermissionsToDefault,
  getEmployeeCustomOverrides,
  saveEmployeeCustomOverrides
} from '@/lib/rbac';
import {
  ShieldCheck,
  Shield,
  Sliders,
  Building2,
  DollarSign,
  Palette,
  UploadCloud,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  Crown,
  Calculator,
  UserCheck,
  User,
  Users,
  Sparkles,
  Lock,
  Download,
  Upload,
  RefreshCw,
  Clock,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck2,
  Megaphone,
  Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();

  // Check if user is Super Admin or Owner
  const isSystemAdmin = useMemo(() => {
    const role = user?.role;
    const num = String(user?.employee_number || user?.id || '').replace('emp_', '');
    const email = (user?.email || '').toLowerCase();
    return (
      role === 'system_admin' || role === 'owner' ||
      num === '1022' || num === '1001' ||
      email === 'yahya9031@gmail.com' || email === 'dortalsiarh@gmail.com'
    );
  }, [user]);

  // ─── 1. RBAC STATE ────────────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState('owner');
  const [targetMode, setTargetMode] = useState('role'); // 'role' | 'employee'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  
  // Current Role Permissions Map
  const [activePermissions, setActivePermissions] = useState(() => {
    return new Set(getRolePermissions('owner'));
  });

  // Employee Custom Overrides Map
  const [employeeOverrides, setEmployeeOverrides] = useState({ granted: [], revoked: [] });

  // Load Employees for Overrides Selector
  useEffect(() => {
    const loadEmps = async () => {
      try {
        const emps = await base44.entities.Employee.list();
        if (Array.isArray(emps) && emps.length > 0) {
          setEmployeesList(emps);
          if (!selectedEmployeeId) {
            setSelectedEmployeeId(emps[0].id || emps[0].employee_number);
          }
        }
      } catch (e) {}
    };
    loadEmps();
  }, []);

  // Sync active permissions when role or target mode changes
  useEffect(() => {
    if (targetMode === 'role') {
      const perms = getRolePermissions(selectedRole);
      setActivePermissions(new Set(perms));
    } else if (targetMode === 'employee' && selectedEmployeeId) {
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      const role = targetEmp?.role || 'employee';
      const baseRolePerms = getRolePermissions(role);
      const overrides = getEmployeeCustomOverrides(selectedEmployeeId);
      setEmployeeOverrides(overrides);

      // Effective permissions
      const granted = overrides.granted || [];
      const revoked = new Set(overrides.revoked || []);
      const effective = [...baseRolePerms, ...granted].filter(p => !revoked.has(p));
      setActivePermissions(new Set(effective));
    }
  }, [selectedRole, targetMode, selectedEmployeeId, employeesList]);

  // Toggle single permission
  const handleTogglePermission = (permId) => {
    if (targetMode === 'role') {
      setActivePermissions(prev => {
        const next = new Set(prev);
        if (next.has(permId)) {
          next.delete(permId);
        } else {
          next.add(permId);
        }
        return next;
      });
    } else {
      // Employee Override Mode
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      const basePerms = new Set(getRolePermissions(targetEmp?.role || 'employee'));
      const isBaseGranted = basePerms.has(permId);

      setActivePermissions(prev => {
        const next = new Set(prev);
        const willEnable = !next.has(permId);

        if (willEnable) next.add(permId);
        else next.delete(permId);

        setEmployeeOverrides(curr => {
          let granted = new Set(curr.granted || []);
          let revoked = new Set(curr.revoked || []);

          if (willEnable) {
            revoked.delete(permId);
            if (!isBaseGranted) granted.add(permId);
          } else {
            granted.delete(permId);
            if (isBaseGranted) revoked.add(permId);
          }

          return { granted: Array.from(granted), revoked: Array.from(revoked) };
        });

        return next;
      });
    }
  };

  // Save Permissions
  const handleSavePermissions = () => {
    if (targetMode === 'role') {
      const list = Array.from(activePermissions);
      saveRolePermissions(selectedRole, list);
      toast({
        title: '✓ تم حفظ وتطبيق صلاحيات الدور بنجاح',
        description: `تم تحديث مصفوفة صلاحيات (${ROLE_META[selectedRole]?.label || selectedRole}) وتطبيقها فوراً لكافة المستخدمين.`
      });
    } else {
      saveEmployeeCustomOverrides(selectedEmployeeId, employeeOverrides);
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      toast({
        title: '✓ تم حفظ الصلاحيات المخصصة للموظف',
        description: `تم تثبيت الصلاحيات الفردية للموظف (${targetEmp?.full_name || selectedEmployeeId}) بنجاح.`
      });
    }
  };

  // Quick Action Presets
  const handleGrantAll = () => {
    const all = Object.values(PERMISSIONS);
    setActivePermissions(new Set(all));
    if (targetMode === 'employee') {
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      const basePerms = new Set(getRolePermissions(targetEmp?.role || 'employee'));
      const granted = all.filter(p => !basePerms.has(p));
      setEmployeeOverrides({ granted, revoked: [] });
    }
    toast({ title: '✓ تم تفعيل كافة الصلاحيات', description: 'انقر على زر الحفظ لتثبيت التغيير.' });
  };

  const handleRevokeAll = () => {
    setActivePermissions(new Set());
    if (targetMode === 'employee') {
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      const basePerms = Array.from(getRolePermissions(targetEmp?.role || 'employee'));
      setEmployeeOverrides({ granted: [], revoked: basePerms });
    }
    toast({ title: '✓ تم تعطيل كافة الصلاحيات', description: 'انقر على زر الحفظ لتثبيت التغيير.' });
  };

  const handleResetRecommended = () => {
    if (targetMode === 'role') {
      const def = DEFAULT_ROLE_PERMISSIONS[selectedRole] || DEFAULT_ROLE_PERMISSIONS.employee;
      setActivePermissions(new Set(def));
    } else {
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      const baseRolePerms = getRolePermissions(targetEmp?.role || 'employee');
      setActivePermissions(new Set(baseRolePerms));
      setEmployeeOverrides({ granted: [], revoked: [] });
    }
    toast({ title: '✓ تمت استعادة الصلاحيات القياسية الموصى بها.' });
  };

  // ─── 2. COMPANY PROFILE STATE ─────────────────────────────────────────────
  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Green Arrow HR',
      legal_name: 'شركة درة السيارة لقطع غيار السيارات',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966 54 169 7999',
      address: 'المملكة العربية السعودية',
      logo_url: '/company-logo.svg'
    };
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    saveCompanyProfile(companyProfile);
    toast({
      title: 'تم حفظ بيانات المنشأة والشعار بنجاح ✅',
      description: 'تم تحديث الشعار والاسم التجاري ومزامنتها لجميع مستخدمي النظام.'
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'حجم الصورة كبير جداً',
        description: 'يرجى اختيار صورة بحجم أقل من 2 ميغابايت',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (typeof base64 === 'string') {
        const updated = { ...companyProfile, logo_url: base64 };
        setCompanyProfile(updated);
        localStorage.setItem('hr_flow_company_profile', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        toast({
          title: 'تم تحديث الشعار بنجاح ✨',
          description: 'تم تطبيق الشعار الجديد ذو الخلفية الشفافة الفاخرة.'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── 3. PAYROLL & FINANCIAL SETTINGS ───────────────────────────────────────
  const [payrollSettings, setPayrollSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_payroll_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fridayDailyRate: parsed.fridayDailyRate || parsed.friday_daily_rate || 50,
          overtimeDailyRate: parsed.overtimeDailyRate || parsed.overtime_daily_rate || 100,
          daysPerMonth: parsed.daysPerMonth || parsed.days_per_month || 30,
          gosiSaudiRate: parsed.gosiSaudiRate || 9.75,
          maxAdvanceInstallments: parsed.maxAdvanceInstallments || 12,
        };
      }
    } catch {}
    return {
      fridayDailyRate: 50,
      overtimeDailyRate: 100,
      daysPerMonth: 30,
      gosiSaudiRate: 9.75,
      maxAdvanceInstallments: 12,
    };
  });

  const handleSavePayrollSettings = (e) => {
    e?.preventDefault?.();
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify(payrollSettings));
    toast({ title: '✓ تم حفظ إعدادات الرواتب والبدلات بنجاح' });
  };

  // ─── 4. GPS & ATTENDANCE SETTINGS ──────────────────────────────────────────
  const [gpsSettings, setGpsSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_gps_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enforceGpsFence: true,
      allowedRadiusMeters: 250,
      allowEarlyPunchMinutes: 30,
      lateGraceMinutes: 15,
      autoCheckoutAfterHours: 12
    };
  });

  const handleSaveGpsSettings = (e) => {
    e?.preventDefault?.();
    localStorage.setItem('hr_gps_settings', JSON.stringify(gpsSettings));
    toast({ title: '✓ تم حفظ إعدادات الدوام ونطاق الـ GPS بنجاح' });
  };

  // ─── 5. BACKUP & EXPORT SYSTEM DATA ────────────────────────────────────────
  const handleExportSystemBackup = () => {
    try {
      const backupData = {
        export_date: new Date().toISOString(),
        exported_by: user?.full_name || 'System Admin',
        company_profile: companyProfile,
        payroll_settings: payrollSettings,
        gps_settings: gpsSettings,
        rbac_matrix: localStorage.getItem('hr_rbac_matrix_v3'),
        contracts_store: localStorage.getItem('hr_flow_v12_contracts_store'),
        advances_store: localStorage.getItem('green_arrow_hr_advances'),
        announcements: localStorage.getItem('green_arrow_hr_live_announcements'),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `green_arrow_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast({
        title: '✓ تم استخراج النسخة الاحتياطية بنجاح',
        description: 'تم تنزيل ملف النسخ الاحتياطي الشامل للنظام بتنسيق JSON.'
      });
    } catch (e) {
      toast({ title: 'خطأ في النسخ الاحتياطي', description: e.message, variant: 'destructive' });
    }
  };

  // Filter Permissions by Search
  const filteredModules = useMemo(() => {
    if (!permissionSearch.trim()) return PERMISSION_MODULES;
    const query = permissionSearch.toLowerCase();
    return PERMISSION_MODULES.map(mod => {
      const matchedPerms = mod.permissions.filter(p =>
        p.label.toLowerCase().includes(query) ||
        p.desc.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
      return { ...mod, permissions: matchedPerms };
    }).filter(mod => mod.permissions.length > 0);
  }, [permissionSearch]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── PAGE TITLE & HEADER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="w-8 h-8 text-emerald-600" />
            لوحة الإعدادات والتحكم الإداري
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            التحكم الشامل في مصفوفة الصلاحيات (RBAC)، إعدادات المنشأة، معادلات الرواتب، وسياج الموقع الجغرافي
          </p>
        </div>

        {isSystemAdmin && (
          <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-heading font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>صلاحية مدير النظام الكاملة ✓</span>
          </Badge>
        )}
      </div>

      {/* ─── MAIN TABS ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue={isSystemAdmin ? "rbac" : "company"} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border flex flex-wrap gap-1.5 h-auto">
          
          {/* RBAC TAB (Exclusive for System Admin / Owner) */}
          {isSystemAdmin && (
            <TabsTrigger
              value="rbac"
              className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>الأدوار والصلاحيات (RBAC)</span>
            </TabsTrigger>
          )}

          <TabsTrigger
            value="company"
            className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>هوية المنشأة والشعار</span>
          </TabsTrigger>

          <TabsTrigger
            value="payroll"
            className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <DollarSign className="w-4 h-4" />
            <span>الرواتب والبدلات والخصومات</span>
          </TabsTrigger>

          <TabsTrigger
            value="gps"
            className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span>الدوام وسياج الـ GPS</span>
          </TabsTrigger>

          <TabsTrigger
            value="appearance"
            className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <Palette className="w-4 h-4" />
            <span>المظهر والألوان</span>
          </TabsTrigger>

          {isSystemAdmin && (
            <TabsTrigger
              value="security"
              className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>الأمان والنسخ الاحتياطي</span>
            </TabsTrigger>
          )}

        </TabsList>

        {/* ─── TAB 1: ADVANCED INTERACTIVE RBAC MATRIX ──────────────────────── */}
        {isSystemAdmin && (
          <TabsContent value="rbac" className="space-y-6">
            
            {/* Mode & Target Selector */}
            <Card className="rounded-3xl border border-border p-6 shadow-sm bg-card space-y-5">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="font-heading font-black text-lg text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    التحكم في مصفوفة الأدوار والصلاحيات
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اختر الدور العام أو حدد موظفاً مخصصاً لضبط صلاحياته في كافة أنظمة البرنامج
                  </p>
                </div>

                {/* Switch between Role Mode vs Specific Employee Mode */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-2xl border">
                  <button
                    onClick={() => setTargetMode('role')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${targetMode === 'role' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-foreground'}`}
                  >
                    صلاحيات الدور العام
                  </button>
                  <button
                    onClick={() => setTargetMode('employee')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${targetMode === 'employee' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-foreground'}`}
                  >
                    تخصيص موظف محدد 🎯
                  </button>
                </div>
              </div>

              {/* Target Selector Cards */}
              {targetMode === 'role' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  {/* GM / Owner */}
                  <button
                    onClick={() => setSelectedRole('owner')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${selectedRole === 'owner' ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'bg-slate-50 dark:bg-slate-900 border-border hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <Crown className="w-5 h-5 text-amber-600" />
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-black">فهد الجوعي</Badge>
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-foreground">المدير العام (Owner)</div>
                      <div className="text-[11px] text-muted-foreground">صاحب العمل والإدارة العليا</div>
                    </div>
                  </button>

                  {/* Accountant */}
                  <button
                    onClick={() => setSelectedRole('accountant')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${selectedRole === 'accountant' ? 'bg-sky-500/10 border-sky-500 shadow-md ring-2 ring-sky-500/30' : 'bg-slate-50 dark:bg-slate-900 border-border hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <Calculator className="w-5 h-5 text-sky-600" />
                      <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-black">هشام زغلول</Badge>
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-foreground">مدير الحسابات والمالية</div>
                      <div className="text-[11px] text-muted-foreground">إدارة المسيرات والصرف</div>
                    </div>
                  </button>

                  {/* HR Manager */}
                  <button
                    onClick={() => setSelectedRole('hr')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${selectedRole === 'hr' ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900 border-border hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-black">يحيى باشا</Badge>
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-foreground">الموارد البشرية (HR)</div>
                      <div className="text-[11px] text-muted-foreground">شؤون الموظفين والدوام</div>
                    </div>
                  </button>

                  {/* General Employees */}
                  <button
                    onClick={() => setSelectedRole('employee')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${selectedRole === 'employee' ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 shadow-md ring-2 ring-slate-400/30' : 'bg-slate-50 dark:bg-slate-900 border-border hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <Users className="w-5 h-5 text-slate-600" />
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-black">عامة الفروع</Badge>
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-foreground">الموظفون (Employees)</div>
                      <div className="text-[11px] text-muted-foreground">الخدمات الذاتية والبصمة</div>
                    </div>
                  </button>

                </div>
              ) : (
                /* Employee Specific Dropdown */
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Label className="font-bold text-xs text-foreground">اختر الموظف المراد تخصيص صلاحياته:</Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="w-full sm:w-80 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold">
                        <SelectValue placeholder="اختر موظفاً..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {employeesList.map(emp => (
                          <SelectItem key={emp.id || emp.employee_number} value={emp.id || emp.employee_number}>
                            {emp.full_name} (#{emp.employee_number}) - {emp.job_title || 'موظف'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Action Bar & Quick Presets */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="بحث عن صلاحية محددة (مثال: راتب، عقد، بصمة، إجازة)..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="pr-9 rounded-xl text-xs h-9 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                {/* Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGrantAll}
                    className="rounded-xl text-[11px] h-8 px-2.5 font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تفعيل الكل</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetRecommended}
                    className="rounded-xl text-[11px] h-8 px-2.5 font-bold gap-1 text-purple-700 dark:text-purple-300 border-purple-300"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>الموصى به</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRevokeAll}
                    className="rounded-xl text-[11px] h-8 px-2.5 font-bold gap-1 text-rose-700 dark:text-rose-300 border-rose-300"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>تعطيل الكل</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSavePermissions}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-heading font-black rounded-xl text-xs h-8 px-4 gap-1.5 shadow-md shadow-purple-600/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ وتطبيق فوراً 💾</span>
                  </Button>
                </div>

              </div>

            </Card>

            {/* ─── PERMISSION MODULES LIST (9 COMPREHENSIVE CATEGORIES) ─────── */}
            <div className="space-y-4">
              {filteredModules.map(module => {
                const totalInMod = module.permissions.length;
                const grantedInMod = module.permissions.filter(p => activePermissions.has(p.id)).length;

                return (
                  <Card key={module.id} className="rounded-3xl border border-border/80 shadow-sm bg-card overflow-hidden">
                    
                    {/* Module Header Bar */}
                    <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-border flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-heading font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                          {module.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {module.description}
                        </p>
                      </div>

                      <Badge className={`text-xs font-mono font-bold ${grantedInMod === totalInMod ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : (grantedInMod > 0 ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-slate-100 text-slate-700')}`}>
                        {grantedInMod} من {totalInMod} مفعلة
                      </Badge>
                    </div>

                    {/* Permissions Grid */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {module.permissions.map(perm => {
                        const isChecked = activePermissions.has(perm.id);

                        return (
                          <div
                            key={perm.id}
                            onClick={(e) => {
                              e.preventDefault();
                              handleTogglePermission(perm.id);
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                              isChecked 
                                ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-400 dark:border-purple-700 shadow-sm' 
                                : 'bg-slate-50/40 dark:bg-slate-900/40 border-border opacity-70 hover:opacity-100 hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-1 flex-1 pointer-events-none">
                              <div className="font-heading font-black text-xs text-foreground flex items-center gap-1.5">
                                <span>{perm.label}</span>
                                {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {perm.desc}
                              </p>
                              <span className="font-mono text-[9.5px] text-slate-400 block pt-0.5" dir="ltr">
                                {perm.id}
                              </span>
                            </div>

                            <Switch
                              checked={isChecked}
                              className="data-[state=checked]:bg-purple-600 mt-1 shrink-0 pointer-events-none"
                            />
                          </div>
                        );
                      })}
                    </div>

                  </Card>
                );
              })}
            </div>

            {/* Bottom Save Float */}
            <div className="sticky bottom-4 z-20 bg-slate-950/90 backdrop-blur-md text-white p-4 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>تم تجهيز <strong>{activePermissions.size}</strong> صلاحية للدور المحدد. اضغط حفظ لتطبيق التحديث فوراً.</span>
              </div>

              <Button
                onClick={handleSavePermissions}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xs h-9 px-6 rounded-xl gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتطبيق التغييرات</span>
              </Button>
            </div>

          </TabsContent>
        )}

        {/* ─── TAB 2: COMPANY PROFILE & LOGO ────────────────────────────────── */}
        <TabsContent value="company">
          <Card className="rounded-3xl border border-border p-6 shadow-sm bg-card">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Logo Section */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-col sm:flex-row items-center gap-6 shadow-md">
                <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center p-3 shadow-xl border-2 border-white/80 flex-shrink-0">
                  {companyProfile.logo_url ? (
                    <img 
                      src={companyProfile.logo_url} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain filter drop-shadow-sm" 
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-slate-400" />
                  )}
                </div>

                <div className="space-y-2.5 text-center sm:text-right flex-1">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300">
                      ✨ تصميم الشعار الفاخر
                    </span>
                    <h4 className="font-heading font-bold text-base mt-1 text-white">
                      معاينة الشعار كما يظهر في القائمة والشاشات والتقارير
                    </h4>
                    <p className="text-xs text-slate-300">
                      يتم عرض الشعار في شاشات النظام، قسائم الرواتب، وسندات السلف الرسمية A4.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-100 transition-all">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      <span>رفع شعار جديد (PNG/SVG)</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Company Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="font-bold">اسم المنشأة في النظام *</Label>
                  <Input 
                    value={companyProfile.name} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="font-bold rounded-xl text-xs h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">الاسم التجاري الرسمي (Legal Name)</Label>
                  <Input 
                    value={companyProfile.legal_name} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, legal_name: e.target.value }))}
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">رقم السجل التجاري (CR Number)</Label>
                  <Input 
                    value={companyProfile.cr_number} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, cr_number: e.target.value }))}
                    className="font-mono rounded-xl text-xs font-bold h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">الرقم الضريبي (VAT Number)</Label>
                  <Input 
                    value={companyProfile.tax_number} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, tax_number: e.target.value }))}
                    className="font-mono rounded-xl text-xs font-bold h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">رقم التواصل والهاتف</Label>
                  <Input 
                    value={companyProfile.phone} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="font-mono rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">العنوان والمقر الرئيسي</Label>
                  <Input 
                    value={companyProfile.address} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, address: e.target.value }))}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 rounded-xl shadow-md gap-2 text-xs h-10">
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات المنشأة</span>
                </Button>
              </div>

            </form>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: PAYROLL & ALLOWANCES ──────────────────────────────────── */}
        <TabsContent value="payroll">
          <Card className="rounded-3xl border border-border p-6 shadow-sm bg-card space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-heading font-black text-sm text-foreground">قواعد الرواتب واحتساب البدلات</h3>
                <p className="text-xs text-muted-foreground">تحديد المبالغ اليومية الثابتة لبدل الجمعة والإضافي ومعادلات الشهر</p>
              </div>
            </div>

            <form onSubmit={handleSavePayrollSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold">مبلغ بدل الجمعة الثابت (ريال / يوم):</Label>
                  <Input
                    type="number"
                    value={payrollSettings.fridayDailyRate}
                    onChange={(e) => setPayrollSettings(prev => ({ ...prev, fridayDailyRate: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">مبلغ بدل الإضافي الثابت (ريال / يوم):</Label>
                  <Input
                    type="number"
                    value={payrollSettings.overtimeDailyRate}
                    onChange={(e) => setPayrollSettings(prev => ({ ...prev, overtimeDailyRate: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">عدد أيام احتساب الشهر الأساسي:</Label>
                  <Input
                    type="number"
                    value={payrollSettings.daysPerMonth}
                    onChange={(e) => setPayrollSettings(prev => ({ ...prev, daysPerMonth: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">نسبة استقطاع التأمينات الاجتماعية (GOSI %):</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={payrollSettings.gosiSaudiRate}
                    onChange={(e) => setPayrollSettings(prev => ({ ...prev, gosiSaudiRate: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 rounded-xl shadow-md gap-2 text-xs h-10">
                  <Save className="w-4 h-4" />
                  <span>حفظ إعدادات الرواتب</span>
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: GPS & ATTENDANCE ──────────────────────────────────────── */}
        <TabsContent value="gps">
          <Card className="rounded-3xl border border-border p-6 shadow-sm bg-card space-y-6">
            <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center gap-3">
              <MapPin className="w-6 h-6 text-sky-600 shrink-0" />
              <div>
                <h3 className="font-heading font-black text-sm text-foreground">سياج الموقع الجغرافي وبصمة الدوام</h3>
                <p className="text-xs text-muted-foreground">التحكم في نصف قطر البصمة وسماحية دقائق التأخير والتسجيل المبكر</p>
              </div>
            </div>

            <form onSubmit={handleSaveGpsSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">إلزامية البصمة داخل الفرع (GPS Geofence)</div>
                    <div className="text-[11px] text-muted-foreground">رفض تسجيل الحضور إذا كان الموظف خارج النطاق</div>
                  </div>
                  <Switch
                    checked={gpsSettings.enforceGpsFence}
                    onCheckedChange={(v) => setGpsSettings(prev => ({ ...prev, enforceGpsFence: v }))}
                    className="data-[state=checked]:bg-sky-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">نصف قطر النطاق المسموح به (بالمتر):</Label>
                  <Input
                    type="number"
                    value={gpsSettings.allowedRadiusMeters}
                    onChange={(e) => setGpsSettings(prev => ({ ...prev, allowedRadiusMeters: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">فترة السماح قبل احتساب التأخير (دقائق):</Label>
                  <Input
                    type="number"
                    value={gpsSettings.lateGraceMinutes}
                    onChange={(e) => setGpsSettings(prev => ({ ...prev, lateGraceMinutes: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">أقصى وقت للبصمة المبكرة قبل الوردية (دقائق):</Label>
                  <Input
                    type="number"
                    value={gpsSettings.allowEarlyPunchMinutes}
                    onChange={(e) => setGpsSettings(prev => ({ ...prev, allowEarlyPunchMinutes: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-6 rounded-xl shadow-md gap-2 text-xs h-10">
                  <Save className="w-4 h-4" />
                  <span>حفظ إعدادات الـ GPS</span>
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: APPEARANCE & THEMES ───────────────────────────────────── */}
        <TabsContent value="appearance">
          <Card className="rounded-3xl border border-border p-6 shadow-sm bg-card space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
              <div>
                <h4 className="font-heading font-black text-sm text-foreground">الوضع الليلي / النهاري</h4>
                <p className="text-xs text-muted-foreground">التبديل بين الثيم المظلم والفاتح المريح للعين</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
                className="rounded-xl text-xs font-bold gap-2 h-9"
              >
                {isDark ? 'تفعيل الوضع النهاري ☀️' : 'تفعيل الوضع الليلي 🌙'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 6: SECURITY & SYSTEM BACKUP ──────────────────────────────── */}
        {isSystemAdmin && (
          <TabsContent value="security">
            <Card className="rounded-3xl border border-border p-6 shadow-sm bg-card space-y-6">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-3">
                <Lock className="w-6 h-6 text-purple-600 shrink-0" />
                <div>
                  <h3 className="font-heading font-black text-sm text-foreground">مركز الأمان والنسخ الاحتياطي للنظام</h3>
                  <p className="text-xs text-muted-foreground">تصدير قاعدة البيانات، السجلات، وتوثيق العمليات</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-heading font-black text-sm text-foreground">تصدير نسخة احتياطية كاملة (Full Backup)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      تتضمن النسخة: بيانات الموظفين، مصفوفة الصلاحيات، العقود، السلف، وسجلات الدوام
                    </div>
                  </div>

                  <Button
                    onClick={handleExportSystemBackup}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs h-10 px-5 gap-2 shadow-md shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل نسخة JSON 💾</span>
                  </Button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-heading font-black text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>إعادة تعيين مصفوفة الصلاحيات لضبط المصنع</span>
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  سيؤدي هذا الإجراء إلى استعادة كافة الصلاحيات القياسية المعتمدة للأدوار وإلغاء أي تخصيصات يدوية.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من رغبتك في إعادة ضبط مصفوفة الصلاحيات بالكامل؟')) {
                      resetAllPermissionsToDefault();
                      toast({ title: '✓ تم إعادة ضبط مصفوفة الصلاحيات بنجاح' });
                    }
                  }}
                  className="rounded-xl text-xs font-bold h-9 px-4 gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط المصنع للصلاحيات</span>
                </Button>
              </div>

            </Card>
          </TabsContent>
        )}

      </Tabs>

    </div>
  );
}
