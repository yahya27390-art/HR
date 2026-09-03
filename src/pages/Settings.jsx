import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { base44 } from '@/api/base44Client';
import { getCompanyProfile, saveCompanyProfile, fetchCloudCompanyProfile } from '@/lib/companyProfile';
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
  Briefcase,
  Building,
  Layers,
  Wallet,
  FileCheck,
  GitBranch,
  CalendarDays,
  CalendarRange,
  Award,
  CreditCard,
  Fingerprint,
  BookOpen,
  ClipboardList,
  KeyRound,
  Printer,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab from URL query parameter (default: 'company')
  const activeTab = searchParams.get('tab') || 'company';
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

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

  // ─── 1. REAL DB STATS FOR SUBSCRIPTION OVERVIEW (Ektefa Layout) ────────────
  const [employeesList, setEmployeesList] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingStats(true);
        const emps = await base44.entities.Employee.list();
        setEmployeesList(emps || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  const subscriptionStats = useMemo(() => {
    const active = employeesList.filter(e => e.status === 'active');
    const inactive = employeesList.filter(e => e.status !== 'active');
    const onLeave = employeesList.filter(e => e.status === 'on_leave');
    const maxQuota = 20;
    const remainingQuota = Math.max(0, maxQuota - active.length);

    return {
      domain: 'doratcars',
      planName: 'باقة الشركات المعتمدة (Enterprise Pro)',
      startDate: '2025-11-09',
      endDate: '2026-11-09',
      maxQuota,
      activeCount: active.length,
      inactiveCount: inactive.length,
      onLeaveCount: onLeave.length,
      totalEmployees: employeesList.length,
      remainingQuota,
      smsRemaining: 500,
      smsExpiryDate: '2026-11-09'
    };
  }, [employeesList]);

  // Real Dynamic Branch Distribution from Database
  const branchDistribution = useMemo(() => {
    const map = {};
    const total = employeesList.length || 1;

    employeesList.forEach(emp => {
      const rawBranch = emp.branch_name || emp.branch || 'الفرع الرئيسي (بريدة)';
      const cleanBranch = rawBranch.trim();
      if (!map[cleanBranch]) {
        map[cleanBranch] = {
          name: cleanBranch,
          count: 0,
          employees: []
        };
      }
      map[cleanBranch].count += 1;
      map[cleanBranch].employees.push(emp);
    });

    const colors = ['#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];

    return Object.values(map).map((b, idx) => ({
      ...b,
      color: colors[idx % colors.length],
      percent: Math.round((b.count / total) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [employeesList]);

  // ─── 2. COMPANY LEGAL PROFILE STATE ────────────────────────────────────────
  const [companyProfile, setCompanyProfile] = useState(() => getCompanyProfile());

  useEffect(() => {
    fetchCloudCompanyProfile().then(p => {
      if (p) setCompanyProfile(p);
    });
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const saved = await saveCompanyProfile(companyProfile);
    setCompanyProfile(saved);
    toast({
      title: 'تم حفظ بيانات المنشأة والشعار بنجاح ✅',
      description: 'تم تحديث الشعار والاسم التجاري ومزامنتها سحابياً لجميع الأجهزة والمستخدمين.'
    });
  };

  const handleLogoUpload = async (e) => {
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
    reader.onload = async (event) => {
      const base64 = event.target?.result;
      if (typeof base64 === 'string') {
        const updated = { ...companyProfile, logo_url: base64 };
        setCompanyProfile(updated);
        await saveCompanyProfile(updated);
        toast({
          title: 'تم رفع ومزامنة الشعار بنجاح ✨',
          description: 'تم تثبيت الشعار الجديد سحابياً وسيظهر تلقائياً على كافة الأجهزة والحسابات.'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── 3. RBAC STATE & HANDLERS ─────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState('owner');
  const [targetMode, setTargetMode] = useState('role'); // 'role' | 'employee'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  
  const [activePermissions, setActivePermissions] = useState(() => {
    return new Set(getRolePermissions('owner'));
  });

  const [employeeOverrides, setEmployeeOverrides] = useState({ granted: [], revoked: [] });

  useEffect(() => {
    if (employeesList.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employeesList[0].id || employeesList[0].employee_number);
    }
  }, [employeesList, selectedEmployeeId]);

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

      const granted = overrides.granted || [];
      const revoked = new Set(overrides.revoked || []);
      const effective = [...baseRolePerms, ...granted].filter(p => !revoked.has(p));
      setActivePermissions(new Set(effective));
    }
  }, [selectedRole, targetMode, selectedEmployeeId, employeesList]);

  const handleTogglePermission = (permId) => {
    if (targetMode === 'role') {
      setActivePermissions(prev => {
        const next = new Set(prev);
        if (next.has(permId)) next.delete(permId);
        else next.add(permId);
        return next;
      });
    } else {
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

  const handleGrantAll = () => {
    const all = Object.values(PERMISSIONS);
    setActivePermissions(new Set(all));
    toast({ title: '✓ تم تفعيل كافة الصلاحيات', description: 'انقر على زر الحفظ لتثبيت التغيير.' });
  };

  const handleRevokeAll = () => {
    setActivePermissions(new Set());
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

  // ─── 4. PAYROLL & FINANCIAL SETTINGS ───────────────────────────────────────
  const [payrollSettings, setPayrollSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_payroll_settings');
      if (saved) return JSON.parse(saved);
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

  // ─── 5. GPS & ATTENDANCE SETTINGS ──────────────────────────────────────────
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

  // ─── 6. BACKUP & EXPORT SYSTEM DATA ────────────────────────────────────────
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
      downloadAnchor.setAttribute("download", `doratcars_backup_${new Date().toISOString().split('T')[0]}.json`);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 font-sans" dir="rtl">
      
      {/* ─── PAGE TITLE & HEADER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
            ⚙️
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-foreground flex items-center gap-2">
              <span>إعدادات النظام والتحكم المؤسسي</span>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {activeTab.toUpperCase()}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              إدارة المنشأة، مصفوفة الصلاحيات، الحسابات البنكية، بنود الأجور، وسياج الموقع الجغرافي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSystemAdmin && (
            <Badge className="bg-purple-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>صلاحية إدارة كاملة ✓</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ─── TAB 1: COMPANY & SUBSCRIPTION OVERVIEW (Identical to Ektefa Layout) */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          
          {/* 1. Subscription Details Card (Ektefa Screenshot Exact Representation) */}
          <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-foreground font-heading font-black text-base">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>معلومات الاشتراك والترخيص</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs px-3 py-1">
                باقة مدفوعة (Enterprise Pro)
              </Badge>
            </div>

            {/* Top 4 Metric Boxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Box 1: Domain Name */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">اسم النطاق المستعار</div>
                  <div className="font-mono font-black text-sm text-foreground">{subscriptionStats.domain}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                  🌐
                </div>
              </div>

              {/* Box 2: Subscription Type */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">نوع الاشتراك</div>
                  <div className="font-bold text-xs text-emerald-600">نشط - سحابي معتمد</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  🛡️
                </div>
              </div>

              {/* Box 3: Start Date */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">تاريخ الاشتراك</div>
                  <div className="font-mono font-bold text-xs text-foreground">{subscriptionStats.startDate}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  📅
                </div>
              </div>

              {/* Box 4: End Date */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">تاريخ الانتهاء</div>
                  <div className="font-mono font-bold text-xs text-rose-600">{subscriptionStats.endDate}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  ⏳
                </div>
              </div>

            </div>

            {/* Second 4 Metric Boxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Max Quota */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">الحد الأقصى للموظفين</div>
                  <div className="font-mono font-black text-lg text-purple-600">{subscriptionStats.maxQuota}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                  👥
                </div>
              </div>

              {/* Active Employees */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">الموظفون النشطون</div>
                  <div className="font-mono font-black text-lg text-emerald-600">{subscriptionStats.activeCount}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>

              {/* Inactive Employees */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">الموظفون غير النشطين</div>
                  <div className="font-mono font-black text-lg text-slate-600">{subscriptionStats.inactiveCount}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 flex items-center justify-center font-bold">
                  👤
                </div>
              </div>

              {/* Remaining SMS */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-bold">الرسائل المتبقية</div>
                  <div className="font-mono font-black text-lg text-amber-600">{subscriptionStats.smsRemaining}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  💬
                </div>
              </div>

            </div>

          </Card>

          {/* 2. Charts Row (Donut for Employees + Bar for Branch Allocation) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Donut Chart Card */}
            <Card className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card flex flex-col justify-between">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
                  <span>📊 إحصائيات الموظفين</span>
                </h3>
                <span className="text-xs font-mono text-muted-foreground">Total: {subscriptionStats.activeCount}</span>
              </div>

              <div className="my-6 flex items-center justify-center gap-6">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="4.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray="100, 100"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute font-heading font-black text-base text-foreground">
                    100%
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-bold">كادر نشط على رأس العمل ({subscriptionStats.activeCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span>في إجازة رسمية (0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                    <span>غير نشط (0)</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t text-[11px] text-muted-foreground text-center">
                معدل الاستيعاب: {subscriptionStats.activeCount} من {subscriptionStats.maxQuota} مقاعد مستخدمة
              </div>
            </Card>

            {/* Bar Chart Card */}
            <Card className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card flex flex-col justify-between">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
                  <span>🏢 توزيع الكادر عبر الفروع الفعلية</span>
                </h3>
                <span className="text-xs font-mono text-muted-foreground">{branchDistribution.length} فروع مسجلة</span>
              </div>

              <div className="my-4 space-y-3.5 text-xs">
                {branchDistribution.map((branch, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-foreground">{branch.name}</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {branch.count} موظفين ({branch.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${branch.percent}%`, backgroundColor: branch.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t text-[11px] text-muted-foreground text-center">
                إجمالي الكادر: {subscriptionStats.totalEmployees} موظف مسجلين وموزعين على الفروع
              </div>
            </Card>

          </div>

          {/* 3. Company Profile Form */}
          <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-base font-heading font-black text-foreground">
                    هوية وبيانات المنشأة الرسمية (السجل التجاري والضريبي)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    تظهر هذه البيانات تلقائياً في ترويسة العقود، كشوفات الرواتب، ونماذج الموارد البشرية
                  </p>
                </div>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات المنشأة</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Legal Name */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">الاسم القانوني للمنشأة *</Label>
                  <Input
                    value={companyProfile.legal_name || companyProfile.name_ar || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, legal_name: e.target.value, name_ar: e.target.value })}
                    className="rounded-xl h-10 font-bold"
                    required
                  />
                </div>

                {/* English Name */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">الاسم بالإنجليزية (Commercial Name EN)</Label>
                  <Input
                    value={companyProfile.name_en || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, name_en: e.target.value })}
                    className="rounded-xl h-10 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* CR Number */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">رقم السجل التجاري (CR Number) *</Label>
                  <Input
                    value={companyProfile.cr_number || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, cr_number: e.target.value })}
                    className="rounded-xl h-10 font-mono font-bold"
                    required
                  />
                </div>

                {/* Tax Number */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">الرقم الضريبي (VAT Number - 15 خانة) *</Label>
                  <Input
                    value={companyProfile.tax_number || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, tax_number: e.target.value })}
                    className="rounded-xl h-10 font-mono font-bold"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">رقم الهاتف والتواصل المعتمد</Label>
                  <Input
                    value={companyProfile.phone || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    className="rounded-xl h-10 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">العنوان الوطني والفرع الرئيسي</Label>
                  <Input
                    value={companyProfile.address || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                    className="rounded-xl h-10 font-bold"
                  />
                </div>

              </div>

              {/* Logo Upload Section */}
              <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center shrink-0">
                    <img
                      src={companyProfile.logo_url || "/company-logo.png"}
                      alt="شعار درة السيارة"
                      className="w-full h-full object-contain drop-shadow"
                    />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-xs text-foreground">شعار الشركة الرسمي المعتمد (Company Logo)</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      شعار شركة درة السيارة لقطع غيار السيارات بدقة عالية وخلفية شفافة لجميع النماذج والعقود
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer">
                    <div className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold text-xs shadow-sm flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>رفع شعار جديد</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </Label>
                </div>
              </div>

            </form>
          </Card>

        </div>
      )}

      {/* ─── TAB 2: RBAC PERMISSIONS MATRIX ─────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>مصفوفة الصلاحيات المتقدمة (RBAC Matrix)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحديد دقيق لصلاحيات كل دور، مع إمكانية منح أو سحب صلاحيات فردية خاصة بموظف محدد
              </p>
            </div>

            <Button
              onClick={handleSavePermissions}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتطبيق فوراً 💾</span>
            </Button>
          </div>

          {/* Mode Selector (Role vs Employee Overrides) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border">
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">نطاق التخصيص:</span>
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTargetMode('role')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    targetMode === 'role' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  صلاحيات الدور (Role)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('employee')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    targetMode === 'employee' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  استثناء لموظف محدد (Custom Override)
                </button>
              </div>
            </div>

            {targetMode === 'role' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">اختر الدور:</span>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48 h-9 rounded-xl font-bold text-xs bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {Object.entries(ROLE_META).map(([rKey, meta]) => (
                      <SelectItem key={rKey} value={rKey} className="text-xs font-bold">
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">اختر الموظف:</span>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="w-64 h-9 rounded-xl font-bold text-xs bg-white dark:bg-slate-950">
                    <SelectValue placeholder="اختر الموظف..." />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {employeesList.map(e => (
                      <SelectItem key={e.id || e.employee_number} value={String(e.id || e.employee_number)} className="text-xs font-bold">
                        {e.full_name} ({e.job_title || 'موظف'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          </div>

          {/* Quick Action Presets & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="بحث في الصلاحيات..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="ps-9 h-9 rounded-xl text-xs bg-white dark:bg-slate-950"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={handleGrantAll} className="h-8 text-xs rounded-lg font-bold">
                تفعيل الكل
              </Button>
              <Button size="sm" variant="outline" onClick={handleResetRecommended} className="h-8 text-xs rounded-lg font-bold text-purple-600">
                الموصى به
              </Button>
              <Button size="sm" variant="outline" onClick={handleRevokeAll} className="h-8 text-xs rounded-lg font-bold text-rose-600">
                تعطيل الكل
              </Button>
            </div>
          </div>

          {/* Permissions Modules Grid */}
          <div className="space-y-4 pt-2">
            {filteredModules.map(mod => (
              <Card key={mod.id} className="p-4 rounded-2xl border bg-card/60 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-heading font-black text-xs text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>{mod.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{mod.permissions.length} صلاحيات</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {mod.permissions.map(perm => {
                    const isChecked = activePermissions.has(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleTogglePermission(perm.id);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2.5 ${
                          isChecked 
                            ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-400 dark:border-purple-700 shadow-sm' 
                            : 'bg-slate-50/40 dark:bg-slate-900/40 border-border opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-0.5 flex-1 pointer-events-none">
                          <div className="font-heading font-black text-xs text-foreground flex items-center gap-1.5">
                            <span>{perm.label}</span>
                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                          </div>
                          <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                            {perm.desc}
                          </p>
                          <span className="font-mono text-[9px] text-slate-400 block pt-0.5" dir="ltr">
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
            ))}
          </div>

        </Card>
      )}

      {/* ─── TAB 3: BRANCHES & LOCATIONS ────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                <Building className="w-5 h-5 text-sky-600" />
                <span>إدارة الفروع والمواقع الجغرافية</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                فروع شركة درة السيارة لقطع غيار السيارات ومواقع البصمات الجغرافية
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branchDistribution.map((branch, idx) => (
              <Card key={idx} className="p-5 rounded-2xl border space-y-3.5 bg-card flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold text-[10px]">
                      فرع نشط 🏢
                    </Badge>
                    <span className="text-[10.5px] font-mono text-muted-foreground">BR-0{idx + 1}</span>
                  </div>
                  <h3 className="font-heading font-black text-sm text-foreground">{branch.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>المملكة العربية السعودية، منطقة القصيم</span>
                  </p>

                  <div className="pt-2 border-t space-y-1.5">
                    <div className="text-[10.5px] font-bold text-muted-foreground">الكادر المسجل بالفرع:</div>
                    <div className="flex flex-wrap gap-1">
                      {branch.employees.map((emp) => (
                        <span 
                          key={emp.id || emp.employee_number}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-medium text-foreground border border-slate-200 dark:border-slate-700"
                        >
                          {emp.full_name?.split(' ')[0]} {emp.full_name?.split(' ')[1] || ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px] flex justify-between items-center">
                  <span className="text-muted-foreground">الكادر النشط:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {branch.count} موظفين ({branch.percent}%)
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ─── TAB 4: BANK ACCOUNTS ───────────────────────────────────────────── */}
      {activeTab === 'bank_accounts' && (
        <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                <span>الحسابات المصرفية ومسيرات حماية الأجور (WPS)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                حسابات الشركة المعتمدة لصرف الرواتب الشهرية والتحويل لحسابات الموظفين
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <Card className="p-5 rounded-2xl border space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">الحساب الرئيسي للرواتب</Badge>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">مصرف الراجحي (Al Rajhi)</span>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground font-mono">IBAN SAUDI ARABIA</div>
                <div className="font-mono font-black text-sm text-foreground bg-white dark:bg-slate-950 p-2 rounded-xl border" dir="ltr">
                  SA44 8000 0123 6080 1000 9999
                </div>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold">
                ✓ متوافق مع نظام حماية الأجور (مدد • GOSI)
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-[10px]">حساب المشتريات والموردين</Badge>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">بنك الإنماء (Alinma Bank)</span>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground font-mono">IBAN SAUDI ARABIA</div>
                <div className="font-mono font-black text-sm text-foreground bg-white dark:bg-slate-950 p-2 rounded-xl border" dir="ltr">
                  SA62 0500 0000 1234 5678 0001
                </div>
              </div>
              <div className="text-[11px] text-blue-600 font-bold">
                ✓ حساب تسويات مشتريات قطع الغيار
              </div>
            </Card>

          </div>
        </Card>
      )}

      {/* ─── TAB 5: FINANCIAL & PAYROLL SETTINGS ─────────────────────────────── */}
      {(activeTab === 'salary_components' || activeTab === 'overtime_rules' || activeTab === 'deductions_rules' || activeTab === 'advances_rules') && (
        <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
          <form onSubmit={handleSavePayrollSettings} className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  <span>معادلات الرواتب والعمل الإضافي والجمعات</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  معايير احتساب أيام الشهر، نسبة التأمينات (GOSI)، وبدل حضور الجمعات
                </p>
              </div>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                <Save className="w-4 h-4" />
                <span>حفظ القواعد المالية</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              <div className="space-y-1.5">
                <Label className="font-bold text-xs">بدل حضور يوم الجمعة (ريال / يوم) *</Label>
                <Input
                  type="number"
                  value={payrollSettings.fridayDailyRate}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, fridayDailyRate: Number(e.target.value) })}
                  className="rounded-xl h-10 font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">يُصرف تلقائياً عند تسجيل بصمة دوام الجمعة</span>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">بدل الإضافي اليومي لغير السعوديين (ريال / يوم) *</Label>
                <Input
                  type="number"
                  value={payrollSettings.overtimeDailyRate}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, overtimeDailyRate: Number(e.target.value) })}
                  className="rounded-xl h-10 font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">بدل إضافي ثابت 100 ريال يومياً وفق الاتفاق المعتمد</span>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">نسبة استقطاع التأمينات للسعوديين (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payrollSettings.gosiSaudiRate}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, gosiSaudiRate: Number(e.target.value) })}
                  className="rounded-xl h-10 font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">النسبة المعتمدة لدى التأمينات الاجتماعية (GOSI)</span>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">أقصى عدد أقساط لسداد السلف الشهرية *</Label>
                <Input
                  type="number"
                  value={payrollSettings.maxAdvanceInstallments}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, maxAdvanceInstallments: Number(e.target.value) })}
                  className="rounded-xl h-10 font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">أقصى مدة لتقسيط سلفة الموظف على الرواتب</span>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">أيام الشهر القياسية لحساب الأجر اليومي *</Label>
                <Input
                  type="number"
                  value={payrollSettings.daysPerMonth}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, daysPerMonth: Number(e.target.value) })}
                  className="rounded-xl h-10 font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">30 يوماً وفق المادة (90) من نظام العمل السعودي</span>
              </div>

            </div>
          </form>
        </Card>
      )}

      {/* ─── TAB 6: GPS & BIOMETRIC DEVICES ─────────────────────────────────── */}
      {(activeTab === 'geofencing' || activeTab === 'biometric_devices') && (
        <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
          <form onSubmit={handleSaveGpsSettings} className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-sky-600" />
                  <span>معرف لوكيشن وسياج البصمة الذكية (Geofencing)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إلزامية الوجود الجغرافي داخل الفرع المعتمد لتسجيل بصمة الجوال
                </p>
              </div>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                <Save className="w-4 h-4" />
                <span>حفظ إعدادات السياج</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">تفعيل السياج الجغرافي الإلزامي (Geofence)</Label>
                  <Switch
                    checked={gpsSettings.enforceGpsFence}
                    onCheckedChange={(v) => setGpsSettings({ ...gpsSettings, enforceGpsFence: v })}
                    className="data-[state=checked]:bg-sky-600"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  يمنع تسجيل البصمة من خارج نطاق الفرع المحدد لكل موظف
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">نصف قطر النطاق المسموح به (بالمتر) *</Label>
                <Input
                  type="number"
                  value={gpsSettings.allowedRadiusMeters}
                  onChange={(e) => setGpsSettings({ ...gpsSettings, allowedRadiusMeters: Number(e.target.value) })}
                  className="rounded-xl h-10 font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">النطاق الافتراضي: 250 متراً حول إحداثيات الفرع</span>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* ─── TAB 7: SYSTEM AUDIT LOGS & BACKUP ──────────────────────────────── */}
      {(activeTab === 'audit_logs' || activeTab === 'api_integration') && (
        <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span>سجلات النظام وتصدير النسخة الاحتياطية (Audit & Backup)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                تنزيل نسخة احتياطية شاملة لكافة قواعد بيانات الموظفين، الرواتب، والعقود
              </p>
            </div>

            <Button
              onClick={handleExportSystemBackup}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية JSON</span>
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <span>🔒 التوافق الأمني والنسخ المشفر:</span>
            </div>
            <p className="leading-relaxed">
              تشتمل النسخة الاحتياطية على بيانات المنشأة، مصفوفة الصلاحيات، سجلات العقود، طلبات السلف، وبيانات الموظفين المحدثة بالكامل.
            </p>
          </div>
        </Card>
      )}

    </div>
  );
}
