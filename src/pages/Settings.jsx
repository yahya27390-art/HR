import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { base44 } from '@/api/base44Client';
import { getCompanyProfile, saveCompanyProfile, fetchCloudCompanyProfile } from '@/lib/companyProfile';
import { initFullCloudSync, exportSystemBackupJSON, cloudSave, cloudLoad } from '@/lib/cloudSyncEngine';
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
  Check,
  Scale,
  FileText,
  BadgePercent,
  TrendingUp,
  Cpu,
  History,
  Workflow,
  Radio,
  ExternalLink,
  ChevronDown,
  Copy,
  Pencil,
  Activity,
  CheckCheck,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getBiometricDevices, saveBiometricDevices, testDeviceConnection } from '@/lib/biometricDevices';

// ─── EKTEFA SETTINGS NAVIGATION MENU STRUCTURE (22 SECTIONS) ─────────────────
const SETTINGS_CATEGORIES = [
  {
    category: 'المنشأة والتراخيص',
    icon: Building2,
    items: [
      { id: 'company', label: 'معلومات المنشأة', desc: 'السجل التجاري والضريبي والاشتراك', icon: Building2 },
      { id: 'rbac', label: 'الصلاحيات والمجموعات', desc: 'مصفوفة صلاحيات الأدوار والمستخدمين', icon: ShieldCheck },
      { id: 'branches', label: 'الفروع', desc: 'إدارة الفروع ومواقع العمل', icon: Building },
      { id: 'departments', label: 'الأقسام والإدارات', desc: 'الهيكل التنظيمي والوحدات الإدارية', icon: Layers },
      { id: 'bank_accounts', label: 'الحسابات البنكية', desc: 'حسابات الرواتب ومسير حماية الأجور', icon: Landmark }
    ]
  },
  {
    category: 'الرواتب والسياسات المالية',
    icon: Wallet,
    items: [
      { id: 'salary_rules', label: 'مسير الراتب', desc: 'سلم الرواتب وقواعد الاحتساب', icon: Calculator },
      { id: 'payroll_workflow', label: 'سير عمل الرواتب', desc: 'دورة إعداد وتدقيق واعتماد المسير', icon: Workflow },
      { id: 'bonus_types', label: 'أنواع المكافآت والتعويضات', desc: 'بدل الجمعات، الإضافي ومكافأة المبيعات', icon: Award },
      { id: 'deduction_types', label: 'أنواع الحسميات', desc: 'حسميات الغياب، التأخير والجزاءات', icon: Scale },
      { id: 'advance_types', label: 'أنواع السلف', desc: 'سياسة السلف والأقساط الشهرية', icon: Wallet },
      { id: 'overtime_policy', label: 'أعمال إضافي', desc: 'احتساب ساعات العمل الإضافي مادة 107', icon: TrendingUp }
    ]
  },
  {
    category: 'شؤون الكادر والدوام',
    icon: Users,
    items: [
      { id: 'job_titles', label: 'المسميات الوظيفية', desc: 'دليل الوظائف والمهام المعتمدة', icon: Briefcase },
      { id: 'penalties_types', label: 'أنواع الجزاءات والمخالفات', desc: 'لائحة تنظيم العمل ومصفوفة العقوبات', icon: AlertTriangle },
      { id: 'templates', label: 'نماذج النظام', desc: 'الخطابات الرسمية والعقود بالوسوم الذكية', icon: FileText },
      { id: 'holidays', label: 'العطلات الرسمية', desc: 'أيام الأعياد واليوم الوطني ويوم التأسيس', icon: CalendarDays },
      { id: 'leave_settings', label: 'إعدادات الإجازات', desc: 'أرصدة الإجازات السنوية والمرضية والترحيل', icon: CalendarRange },
      { id: 'insurance_types', label: 'أنواع التأمين', desc: 'وثيقة التأمين الصحي وفئات التغطية', icon: Award }
    ]
  },
  {
    category: 'التقنية والربط والأمان',
    icon: Cpu,
    items: [
      { id: 'geofencing', label: 'معرف لوكيشن', desc: 'نطاق السياج الجغرافي GPS بالفروع', icon: MapPin },
      { id: 'biometric_hardware', label: 'أجهزة البصمة', desc: 'بيانات أجهزة الحضور وربط الشبكة', icon: Fingerprint },
      { id: 'device_api', label: 'أجهزة معرف', desc: 'مفاتيح الربط البرمجي السحابي للبصمات', icon: Radio },
      { id: 'requests_workflow', label: 'سير عمل الطلبات', desc: 'مسار الموافقات لطلبات الإجازات والسلف', icon: GitBranch },
      { id: 'audit_logs', label: 'سجلات النظام', desc: 'سجل الحركات الأمني والنسخ الاحتياطي', icon: ClipboardList }
    ]
  }
];

// Tab aliases mapping to guarantee legacy or alternative URL params never show empty views
const TAB_ALIASES = {
  permissions: 'rbac',
  roles: 'rbac',
  salary_components: 'salary_rules',
  salary_rules: 'salary_rules',
  leave_policies: 'leave_settings',
  leave_settings: 'leave_settings',
  leave_policy: 'leave_settings',
  biometric_devices: 'biometric_hardware',
  biometric_hardware: 'biometric_hardware',
  api_integration: 'device_api',
  device_api: 'device_api',
  official_holidays: 'holidays',
  holidays: 'holidays',
  vacations: 'leave_settings',
  wps: 'salary_rules',
  workflow: 'requests_workflow',
  security: 'audit_logs',
  backup: 'audit_logs',
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab from URL query parameter (default: 'company') with alias resolution
  const rawTab = searchParams.get('tab') || 'company';
  const activeTab = TAB_ALIASES[rawTab] || rawTab;
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Search filter for settings sidebar
  const [navSearch, setNavSearch] = useState('');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Check if user is Super Admin or Owner
  const isSystemAdmin = useMemo(() => {
    const role = user?.role;
    const num = String(user?.employee_number || user?.id || '').replace('emp_', '');
    const email = (user?.email || '').toLowerCase();
    return (
      role === 'system_admin' || role === 'owner' || role === 'general_manager' ||
      num === '1022' || num === '1001' ||
      email === 'yahya9031@gmail.com' || email === 'dortalsiarh@gmail.com'
    );
  }, [user]);

  // ─── REAL DB EMPLOYEES LIST ──────────────────────────────────────────────
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

  // ─── 1. COMPANY LEGAL PROFILE STATE ────────────────────────────────────────
  const [companyProfile, setCompanyProfile] = useState(() => getCompanyProfile());

  useEffect(() => {
    fetchCloudCompanyProfile().then(p => {
      if (p) setCompanyProfile(p);
    });
  }, []);

  const handleSaveProfile = async (e) => {
    e?.preventDefault?.();
    const saved = await saveCompanyProfile(companyProfile);
    setCompanyProfile(saved);
    await cloudSave('company_profile_data', saved);
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
        await cloudSave('company_profile_data', updated);
        toast({
          title: 'تم رفع ومزامنة الشعار بنجاح ✨',
          description: 'تم تثبيت الشعار الجديد سحابياً وسيظهر تلقائياً على كافة الأجهزة والحسابات.'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── 2. RBAC PERMISSIONS STATE ─────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState('owner');
  const [targetMode, setTargetMode] = useState('role');
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

  const handleSavePermissions = async () => {
    if (targetMode === 'role') {
      const list = Array.from(activePermissions);
      saveRolePermissions(selectedRole, list);
      await cloudSave('hr_rbac_matrix_v3', localStorage.getItem('hr_rbac_matrix_v3'));
      toast({
        title: '✓ تم حفظ وتطبيق صلاحيات الدور بنجاح',
        description: `تم تحديث مصفوفة صلاحيات (${ROLE_META[selectedRole]?.label || selectedRole}) ومزامنتها سحابياً.`
      });
    } else {
      saveEmployeeCustomOverrides(selectedEmployeeId, employeeOverrides);
      await cloudSave('hr_rbac_matrix_v3', localStorage.getItem('hr_rbac_matrix_v3'));
      const targetEmp = employeesList.find(e => String(e.id) === String(selectedEmployeeId) || String(e.employee_number) === String(selectedEmployeeId));
      toast({
        title: '✓ تم حفظ الصلاحيات المخصصة للموظف',
        description: `تم تثبيت الصلاحيات الفردية للموظف (${targetEmp?.full_name || selectedEmployeeId}) ومزامنتها سحابياً.`
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

  // ─── 3. REAL BRANCHES STATE ────────────────────────────────────────────────
  const defaultBranches = [
    { id: 'br_admin', name: 'مكتب الإدارة', code: 'BR-01', manager: 'فهد ناصر محمد الجوعي', phone: '0163851111', lat: 26.3592, lng: 43.9818, radius: 250, address: 'بريدة - طريق الملك فهد' },
    { id: 'br_main', name: 'الفرع الرئيسي', code: 'BR-02', manager: 'يحيى محمد عبدالغفار باشا', phone: '0163852222', lat: 26.3312, lng: 43.9744, radius: 250, address: 'بريدة - شارع الخبيب التجاري' },
    { id: 'br_rowaf', name: 'فرع هونداي ( الرواف )', code: 'BR-03', manager: 'أحمد شحاته', phone: '0163853333', lat: 26.3721, lng: 43.9555, radius: 250, address: 'بريدة - طريق الرواف' },
    { id: 'br_seleem', name: 'فرع كيا ( السليم )', code: 'BR-04', manager: 'إبراهيم الجوعي', phone: '0163854444', lat: 26.3450, lng: 43.9920, radius: 250, address: 'بريدة - طريق السليم' }
  ];

  const [branchesList, setBranchesList] = useState(() => {
    try {
      const saved = localStorage.getItem('dorat_branches_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultBranches;
  });

  const [branchDialog, setBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', manager: '', phone: '', lat: 26.3592, lng: 43.9818, radius: 250, address: '' });

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', code: `BR-0${branchesList.length + 1}`, manager: '', phone: '', lat: 26.3592, lng: 43.9818, radius: 250, address: '' });
    setBranchDialog(true);
  };

  const handleOpenEditBranch = (br) => {
    setEditingBranch(br);
    setBranchForm({ ...br });
    setBranchDialog(true);
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) {
      toast({ title: 'يرجى كتابة اسم الفرع', variant: 'destructive' });
      return;
    }
    let updated;
    if (editingBranch) {
      updated = branchesList.map(b => b.id === editingBranch.id ? { ...branchForm, id: b.id } : b);
    } else {
      updated = [...branchesList, { ...branchForm, id: 'br_' + Date.now() }];
    }
    setBranchesList(updated);
    localStorage.setItem('dorat_branches_settings', JSON.stringify(updated));
    await cloudSave('dorat_branches_settings', updated);
    setBranchDialog(false);
    toast({ title: '✓ تم حفظ بيانات الفرع ومزامنتها سحابياً' });
  };

  const handleDeleteBranch = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
    const updated = branchesList.filter(b => b.id !== id);
    setBranchesList(updated);
    localStorage.setItem('dorat_branches_settings', JSON.stringify(updated));
    await cloudSave('dorat_branches_settings', updated);
    toast({ title: '✓ تم حذف الفرع' });
  };

  // Branch employee count mapping
  const branchEmployeeCount = useMemo(() => {
    const map = {};
    employeesList.forEach(e => {
      const b = (e.branch_name || e.branch || 'الفرع الرئيسي').trim();
      map[b] = (map[b] || 0) + 1;
    });
    return map;
  }, [employeesList]);

  // ─── 4. DEPARTMENTS STATE ──────────────────────────────────────────────────
  const defaultDepartments = [
    { id: 'dep_sales', name: 'إدارة المبيعات وخدمة العملاء', manager: 'محمد إبراهيم سالم', count: 8, color: '#3b82f6' },
    { id: 'dep_wh', name: 'قسم المستودعات وقطع الغيار', manager: 'مشرف المستودع', count: 6, color: '#10b981' },
    { id: 'dep_acc', name: 'الشؤون المالية والمحاسبة', manager: 'هشام ابوالفضل زغلول', count: 2, color: '#f59e0b' },
    { id: 'dep_hr', name: 'الموارد البشرية والشؤون الإدارية', manager: 'يحيى محمد عبدالغفار باشا', count: 2, color: '#ec4899' },
    { id: 'dep_mgmt', name: 'الإدارة العامة والتشغيل', manager: 'فهد ناصر محمد الجوعي', count: 1, color: '#6366f1' },
  ];

  const [departmentsList, setDepartmentsList] = useState(() => {
    try {
      const saved = localStorage.getItem('dorat_departments_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultDepartments;
  });

  const [deptDialog, setDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', manager: '', color: '#3b82f6' });

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) return;
    let updated;
    if (editingDept) {
      updated = departmentsList.map(d => d.id === editingDept.id ? { ...editingDept, ...deptForm } : d);
    } else {
      updated = [...departmentsList, { ...deptForm, id: 'dep_' + Date.now(), count: 0 }];
    }
    setDepartmentsList(updated);
    localStorage.setItem('dorat_departments_settings', JSON.stringify(updated));
    await cloudSave('dorat_departments_settings', updated);
    setDeptDialog(false);
    toast({ title: '✓ تم حفظ القسم ومزامنته سحابياً' });
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    const updated = departmentsList.filter(d => d.id !== id);
    setDepartmentsList(updated);
    localStorage.setItem('dorat_departments_settings', JSON.stringify(updated));
    await cloudSave('dorat_departments_settings', updated);
    toast({ title: '✓ تم حذف القسم' });
  };

  // ─── 5. BANK ACCOUNTS STATE ────────────────────────────────────────────────
  const defaultBankAccounts = [
    {
      id: 'acc_rajhi',
      bankName: 'مصرف الراجحي (Al Rajhi Bank)',
      accountName: 'شركة درة السيارة لقطع غيار السيارات',
      purpose: 'الحساب الرئيسي للرواتب ومسير حماية الأجور (WPS)',
      iban: 'SA44 8000 0123 6080 1000 9999',
      wpsId: '7-1234567',
      bankCode: 'RJHI',
      isPrimary: true
    },
    {
      id: 'acc_inma',
      bankName: 'بنك الإنماء (Alinma Bank)',
      accountName: 'شركة درة السيارة - تسويات ومشتريات',
      purpose: 'حساب المشتريات والموردين والعمليات التشغيلية',
      iban: 'SA62 0500 0000 1234 5678 0001',
      wpsId: '7-1234567',
      bankCode: 'INMA',
      isPrimary: false
    }
  ];

  const [bankAccounts, setBankAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('dorat_bank_accounts_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultBankAccounts;
  });

  const [bankDialog, setBankDialog] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankForm, setBankForm] = useState({ bankName: '', accountName: '', purpose: '', iban: '', wpsId: '', bankCode: '', isPrimary: false });

  const handleSaveBank = async () => {
    if (!bankForm.bankName.trim() || !bankForm.iban.trim()) {
      toast({ title: 'يرجى كتابة اسم البنك والآيبان', variant: 'destructive' });
      return;
    }
    let updated;
    if (editingBank) {
      updated = bankAccounts.map(b => b.id === editingBank.id ? { ...bankForm, id: b.id } : b);
    } else {
      updated = [...bankAccounts, { ...bankForm, id: 'bank_' + Date.now() }];
    }
    setBankAccounts(updated);
    localStorage.setItem('dorat_bank_accounts_settings', JSON.stringify(updated));
    await cloudSave('dorat_bank_accounts_settings', updated);
    setBankDialog(false);
    toast({ title: '✓ تم حفظ بيانات الحساب البنكي ومزامنتها سحابياً' });
  };

  const handleDeleteBank = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب البنكي؟')) return;
    const updated = bankAccounts.filter(b => b.id !== id);
    setBankAccounts(updated);
    localStorage.setItem('dorat_bank_accounts_settings', JSON.stringify(updated));
    await cloudSave('dorat_bank_accounts_settings', updated);
    toast({ title: '✓ تم حذف الحساب البنكي' });
  };

  // ─── 6. PAYROLL & FINANCIAL SETTINGS ───────────────────────────────────────
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
      maxAdvanceSalaryPercent: 50,
      overtimeRatePercent: 150
    };
  });

  const handleSavePayrollSettings = async (e) => {
    e?.preventDefault?.();
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify(payrollSettings));
    await cloudSave('hr_flow_payroll_settings', payrollSettings);
    toast({ title: '✓ تم حفظ إعدادات الرواتب والبدلات ومزامنتها سحابياً' });
  };

  // ─── 7. GPS & GEOFENCING SETTINGS ──────────────────────────────────────────
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

  const handleSaveGpsSettings = async (e) => {
    e?.preventDefault?.();
    localStorage.setItem('hr_gps_settings', JSON.stringify(gpsSettings));
    await cloudSave('hr_gps_settings', gpsSettings);
    toast({ title: '✓ تم حفظ إعدادات السياج الجغرافي (Geofencing) ومزامنتها سحابياً' });
  };

  // ─── 8. BIOMETRIC HARDWARE & DEVICES STATE ─────────────────────────────────
  const [devicesList, setDevicesList] = useState(() => getBiometricDevices());
  const [testingDeviceId, setTestingDeviceId] = useState(null);

  const [deviceDialog, setDeviceDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({ 
    name: '', 
    ip_address: '192.168.8.', 
    port: '80', 
    comm_port: '5005',
    comm_key: '12345678',
    brand: 'Ektefa ai806 (Face & Fingerprint)', 
    serial_number: '', 
    branch_name: 'فرع كيا ( السليم )', 
    status: 'offline' 
  });

  const handleSaveDevice = async () => {
    if (!deviceForm.name.trim() || !(deviceForm.ip_address || deviceForm.ip)) return;
    let updated;
    const finalDev = {
      ...deviceForm,
      ip_address: deviceForm.ip_address || deviceForm.ip,
      serial_number: deviceForm.serial_number || deviceForm.serial,
      branch_name: deviceForm.branch_name || deviceForm.branch
    };
    if (editingDevice) {
      updated = devicesList.map(d => d.id === editingDevice.id ? { ...finalDev, id: d.id } : d);
    } else {
      updated = [...devicesList, { ...finalDev, id: 'dev_' + Date.now() }];
    }
    setDevicesList(updated);
    saveBiometricDevices(updated);
    setDeviceDialog(false);
    toast({ title: '✓ تم حفظ جهاز البصمة ومزامنته سحابياً' });
  };

  const handleDeleteDevice = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
    const updated = devicesList.filter(d => d.id !== id);
    setDevicesList(updated);
    saveBiometricDevices(updated);
    toast({ title: '✓ تم حذف الجهاز' });
  };

  const handlePingDevice = async (dev) => {
    setTestingDeviceId(dev.id);
    try {
      const result = await testDeviceConnection(dev);
      const updated = devicesList.map(d => d.id === dev.id ? { ...d, status: result.status, last_ping_time: result.latency } : d);
      setDevicesList(updated);
      saveBiometricDevices(updated);
      if (result.success) {
        toast({
          title: `فحص الاتصال بجهاز (${dev.name}) ✓`,
          description: result.message
        });
      } else {
        toast({
          title: `تعذر الاتصال بجهاز (${dev.name}) ✕`,
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: `خطأ في اختبار الاتصال`,
        description: e.message || 'فشل الاتصال',
        variant: 'destructive'
      });
    } finally {
      setTestingDeviceId(null);
    }
  };

  // ─── 9. MEDICAL INSURANCE STATE ────────────────────────────────────────────
  const defaultInsurance = {
    provider: 'شركة التأمين المتحدة التعاونية (UCA)',
    policyNumber: '2911013150',
    expiryDate: '2026-11-20',
    classes: 'Class A • VIP Elite',
    network: 'مستشفى الحبيب، مستشفى الفريح، ومجمعات سلامات بالقصيم',
    status: 'سارية المفعول'
  };

  const [insurancePolicy, setInsurancePolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('dorat_insurance_policy');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultInsurance;
  });

  const handleSaveInsurance = async (e) => {
    e?.preventDefault?.();
    localStorage.setItem('dorat_insurance_policy', JSON.stringify(insurancePolicy));
    await cloudSave('dorat_insurance_policy', insurancePolicy);
    toast({ title: '✓ تم حفظ وثيقة التأمين الطبي ومزامنتها سحابياً' });
  };

  // ─── 10. OFFICIAL HOLIDAYS STATE ───────────────────────────────────────────
  const defaultHolidays = [
    { id: 'h1', name: 'عطلة يوم التأسيس السعودي', date: '22 فبراير 2026', days: '1 يوم', status: 'إجازة مدفوعة الأجر' },
    { id: 'h2', name: 'عطلة عيد الفطر المبارك', date: '19 مارس - 23 مارس 2026', days: '4 أيام', status: 'إجازة مدفوعة الأجر' },
    { id: 'h3', name: 'عطلة عيد الأضحى المبارك', date: '26 مايو - 30 مايو 2026', days: '4 أيام', status: 'إجازة مدفوعة الأجر' },
    { id: 'h4', name: 'عطلة اليوم الوطني السعودي', date: '23 سبتمبر 2026', days: '1 يوم', status: 'إجازة مدفوعة الأجر' },
  ];

  const [holidaysList, setHolidaysList] = useState(() => {
    try {
      const saved = localStorage.getItem('dorat_holidays_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultHolidays;
  });

  const [holidayDialog, setHolidayDialog] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', days: '1 يوم', status: 'إجازة مدفوعة الأجر' });

  const handleSaveHoliday = async () => {
    if (!holidayForm.name.trim()) return;
    const updated = [...holidaysList, { ...holidayForm, id: 'h_' + Date.now() }];
    setHolidaysList(updated);
    localStorage.setItem('dorat_holidays_settings', JSON.stringify(updated));
    await cloudSave('dorat_holidays_settings', updated);
    setHolidayDialog(false);
    toast({ title: '✓ تم إضافة العطلة ومزامنتها سحابياً' });
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('حذف هذه العطلة؟')) return;
    const updated = holidaysList.filter(h => h.id !== id);
    setHolidaysList(updated);
    localStorage.setItem('dorat_holidays_settings', JSON.stringify(updated));
    await cloudSave('dorat_holidays_settings', updated);
    toast({ title: '✓ تم حذف العطلة' });
  };

  // ─── 11. TRIGGER FULL IMMEDIATE CLOUD SYNC ─────────────────────────────────
  const handleImmediateCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      await initFullCloudSync();
      toast({
        title: '✓ تمت المزامنة السحابية الفورية بنجاح',
        description: 'تم ربط ومزامنة كافة الفروع والحسابات والرواتب وأجهزة البصمة مع الخادم السحابي المشفر.'
      });
    } catch (e) {
      toast({ title: 'خطأ في المزامنة', description: e.message, variant: 'destructive' });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // ─── FILTERED NAV ITEMS FOR SIDEBAR SEARCH ─────────────────────────────────
  const filteredNavCategories = useMemo(() => {
    if (!navSearch.trim()) return SETTINGS_CATEGORIES;
    const q = navSearch.toLowerCase().trim();
    return SETTINGS_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        cat.category.toLowerCase().includes(q)
      )
    })).filter(cat => cat.items.length > 0);
  }, [navSearch]);

  const currentActiveItem = useMemo(() => {
    for (const cat of SETTINGS_CATEGORIES) {
      const found = cat.items.find(i => i.id === activeTab);
      if (found) return found;
    }
    return SETTINGS_CATEGORIES[0].items[0];
  }, [activeTab]);

  const activeCategory = useMemo(() => {
    for (const cat of SETTINGS_CATEGORIES) {
      if (cat.items.some(i => i.id === activeTab)) {
        return cat;
      }
    }
    return SETTINGS_CATEGORIES[0];
  }, [activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 font-sans select-none" dir="rtl">
      
      {/* ─── PAGE TITLE & HEADER (EKTEFA MASTER CONTROL BAR) ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-foreground">
                مركز الإعدادات والتحكم المؤسسي
              </h1>
              <Badge className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-xl shadow-sm">
                طراز إكتفاء المطور (Ektefa Pro)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              منظومة الإعدادات الشاملة لشركة درة السيارة (22 قسماً مع المزامنة السحابية الفورية)
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleImmediateCloudSync}
            disabled={isCloudSyncing}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{isCloudSyncing ? 'جاري المزامنة...' : 'مزامنة سحابية فورية'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={exportSystemBackupJSON}
            className="text-xs font-bold rounded-xl h-9 gap-1.5 border-slate-200 dark:border-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>نسخة احتياطية</span>
          </Button>
        </div>
      </div>

      {/* ─── SPECIALIZED EXECUTIVE NAVIGATION BAR (TABS & CATEGORIES) ─────────── */}
      <div className="bg-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        {/* Category Pillars (4 Main Pillars) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100 dark:border-slate-800/80">
          {SETTINGS_CATEGORIES.map((cat, idx) => {
            const CatIcon = cat.icon;
            const isCatActive = activeCategory.category === cat.category;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (!isCatActive) {
                    setActiveTab(cat.items[0].id);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isCatActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-400/40'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CatIcon className={`w-4 h-4 ${isCatActive ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                <span>{cat.category}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isCatActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-Tabs Row for the Active Category + Quick Direct Jump Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1 min-w-0">
            {activeCategory.items.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isItemActive
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm ring-1 ring-slate-700/20'
                      : 'bg-slate-100/70 dark:bg-slate-900/50 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title={item.desc}
                >
                  <ItemIcon className={`w-3.5 h-3.5 ${isItemActive ? 'text-purple-400 dark:text-purple-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Search Dropdown across all 22 settings */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-muted-foreground" />
            <Input
              placeholder="بحث مباشر في الـ 22 قسماً..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="pr-8 rounded-xl text-xs font-bold h-9 bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            />
            {navSearch.trim() && (
              <div className="absolute top-10 right-0 left-0 bg-popover text-popover-foreground border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto space-y-1">
                {filteredNavCategories.flatMap(c => c.items).map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setNavSearch('');
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ItemIcon className="w-3.5 h-3.5 text-purple-600" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-normal">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER (FULL WIDTH, SPECIALIZED & SPACIOUS) ──────── */}
      <div className="w-full space-y-6">

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 1: COMPANY & SUBSCRIPTION (معلومات المنشأة والترخيص)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              
              {/* Subscription Overview Card */}
              <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2 text-foreground font-heading font-black text-base">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <span>معلومات الاشتراك والترخيص المؤسسي</span>
                  </div>
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold text-xs px-3 py-1">
                    باقة مدفوعة (Enterprise Pro)
                  </Badge>
                </div>

                {/* 4 Metric Boxes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">اسم النطاق المستعار</div>
                      <div className="font-mono font-black text-sm text-foreground">{subscriptionStats.domain}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">🌐</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">نوع الاشتراك</div>
                      <div className="font-bold text-xs text-emerald-600">نشط - سحابي معتمد</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">🛡️</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">تاريخ الاشتراك</div>
                      <div className="font-mono font-bold text-xs text-foreground">{subscriptionStats.startDate}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">📅</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">تاريخ الانتهاء</div>
                      <div className="font-mono font-bold text-xs text-rose-600">{subscriptionStats.endDate}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">⏳</div>
                  </div>
                </div>

                {/* Second 4 Metric Boxes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">الحد الأقصى للموظفين</div>
                      <div className="font-mono font-black text-lg text-sky-600">{subscriptionStats.maxQuota}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">👥</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">الموظفون النشطون</div>
                      <div className="font-mono font-black text-lg text-emerald-600">{subscriptionStats.activeCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">✓</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">الموظفون غير النشطين</div>
                      <div className="font-mono font-black text-lg text-slate-600">{subscriptionStats.inactiveCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 flex items-center justify-center font-bold">👤</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground font-bold">الرسائل المتبقية (SMS)</div>
                      <div className="font-mono font-black text-lg text-amber-600">{subscriptionStats.smsRemaining}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">💬</div>
                  </div>
                </div>
              </Card>

              {/* Company Profile Form */}
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
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                      <Save className="w-4 h-4" />
                      <span>حفظ ومزامنة سحابية</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">الاسم القانوني للمنشأة *</Label>
                      <Input
                        value={companyProfile.legal_name || companyProfile.name_ar || ''}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, legal_name: e.target.value, name_ar: e.target.value })}
                        className="rounded-xl h-10 font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">الاسم بالإنجليزية (Commercial Name EN)</Label>
                      <Input
                        value={companyProfile.name_en || ''}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, name_en: e.target.value })}
                        className="rounded-xl h-10 font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">رقم السجل التجاري (CR Number) *</Label>
                      <Input
                        value={companyProfile.cr_number || ''}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, cr_number: e.target.value })}
                        className="rounded-xl h-10 font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">الرقم الضريبي (VAT Number - 15 خانة) *</Label>
                      <Input
                        value={companyProfile.tax_number || ''}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, tax_number: e.target.value })}
                        className="rounded-xl h-10 font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">رقم الهاتف والتواصل المعتمد</Label>
                      <Input
                        value={companyProfile.phone || ''}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                        className="rounded-xl h-10 font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">العنوان الوطني والفرع الرئيسي</Label>
                      <Input
                        value={companyProfile.address || ''}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                        className="rounded-xl h-10 font-bold"
                      />
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {companyProfile.logo_url ? (
                        <img src={companyProfile.logo_url} alt="شعار الشركة" className="w-14 h-14 object-contain rounded-xl border p-1 bg-white" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm">شعار</div>
                      )}
                      <div>
                        <div className="font-bold text-xs">شعار المنشأة الرسمي</div>
                        <div className="text-[11px] text-muted-foreground">يظهر في ترويسة التقارير وعقود العمل المطبوعة</div>
                      </div>
                    </div>
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border">
                        <UploadCloud className="w-4 h-4" />
                        <span>تغيير الشعار</span>
                      </span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </form>
              </Card>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 2: ROLES & RBAC PERMISSIONS (الصلاحيات والمجموعات)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'rbac' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <span>مصفوفة الصلاحيات والمجموعات (RBAC)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    التحكم في صلاحيات الوصول لجميع الأدوار الإدارية والموظفين بشكل فردي مع المزامنة السحابية
                  </p>
                </div>
                <Button onClick={handleSavePermissions} className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Save className="w-4 h-4" />
                  <span>حفظ الصلاحيات</span>
                </Button>
              </div>

              {/* Mode Switch: Role vs Employee */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={targetMode === 'role' ? 'default' : 'outline'}
                    onClick={() => setTargetMode('role')}
                    className={`rounded-xl text-xs font-bold h-8 ${targetMode === 'role' ? 'bg-purple-600 text-white' : ''}`}
                  >
                    صلاحيات الدور الوظيفي
                  </Button>
                  <Button
                    size="sm"
                    variant={targetMode === 'employee' ? 'default' : 'outline'}
                    onClick={() => setTargetMode('employee')}
                    className={`rounded-xl text-xs font-bold h-8 ${targetMode === 'employee' ? 'bg-purple-600 text-white' : ''}`}
                  >
                    صلاحيات فردية لموظف
                  </Button>
                </div>

                {targetMode === 'role' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">اختر الدور:</span>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="w-52 h-9 rounded-xl font-bold text-xs bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_META).map(([rKey, meta]) => (
                          <SelectItem key={rKey} value={rKey} className="text-xs font-bold">{meta.label}</SelectItem>
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
                      <SelectContent>
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

              {/* Quick Actions & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={handleGrantAll} className="h-8 text-xs rounded-lg font-bold">تفعيل الكل</Button>
                  <Button size="sm" variant="outline" onClick={handleResetRecommended} className="h-8 text-xs rounded-lg font-bold text-purple-600">الموصى به</Button>
                  <Button size="sm" variant="outline" onClick={handleRevokeAll} className="h-8 text-xs rounded-lg font-bold text-rose-600">تعطيل الكل</Button>
                </div>
              </div>

              {/* Modules Grid */}
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
                                ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-400 dark:border-purple-600 shadow-sm' 
                                : 'bg-slate-50/40 dark:bg-slate-900/40 border-border opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="space-y-0.5 flex-1 pointer-events-none">
                              <div className="font-heading font-black text-xs text-foreground flex items-center gap-1.5">
                                <span>{perm.label}</span>
                                {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                              </div>
                              <p className="text-[10.5px] text-muted-foreground leading-relaxed">{perm.desc}</p>
                            </div>
                            <Switch checked={isChecked} className="data-[state=checked]:bg-purple-600 mt-1 shrink-0 pointer-events-none" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 3: BRANCHES (الفروع - تفاعلي كامل مع المزامنة)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'branches' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <Building className="w-5 h-5 text-purple-600" />
                    <span>إدارة الفروع والمواقع الجغرافية (شركة درة السيارة)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    فروع المنشأة المعتمدة، المشرفين المسؤولين، إحداثيات GPS ونطاق الحضور الجغرافي
                  </p>
                </div>
                <Button onClick={handleOpenAddBranch} className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>إضافة فرع جديد</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branchesList.map((branch) => {
                  const empCount = branchEmployeeCount[branch.name] || 0;
                  return (
                    <Card key={branch.id} className="p-5 rounded-2xl border space-y-3.5 bg-card flex flex-col justify-between hover:border-purple-300 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                            {branch.code || 'BR-00'} • فرع معتمد 🏢
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleOpenEditBranch(branch)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteBranch(branch.id)} className="h-7 w-7 text-rose-500 hover:text-rose-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        <h3 className="font-heading font-black text-sm text-foreground">{branch.name}</h3>
                        
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{branch.address || 'بريدة، منطقة القصيم'}</span>
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t text-muted-foreground">
                          <div>
                            <span>المسؤول: </span>
                            <strong className="text-foreground">{branch.manager || 'المشرف العام'}</strong>
                          </div>
                          <div>
                            <span>الهاتف: </span>
                            <strong className="text-foreground font-mono" dir="ltr">{branch.phone || '--'}</strong>
                          </div>
                        </div>

                        <div className="text-[11px] bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border flex items-center justify-between font-mono">
                          <span>إحداثيات GPS:</span>
                          <span className="text-purple-600 font-bold">{branch.lat}, {branch.lng} (نطاق {branch.radius}م)</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t text-[11px] flex justify-between items-center">
                        <span className="text-muted-foreground">الكادر المسجل بالفرع:</span>
                        <span className="font-bold text-emerald-600 font-mono">{empCount} موظفين فعليين</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 4: DEPARTMENTS (الأقسام والإدارات - تفاعلي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'departments' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <span>الأقسام والإدارات والهيكل التنظيمي</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    هيكلية الإدارات التشغيلية والمبيعات وربطها برؤساء الأقسام
                  </p>
                </div>
                <Button onClick={() => { setEditingDept(null); setDeptForm({ name: '', manager: '', color: '#3b82f6' }); setDeptDialog(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>إضافة قسم جديد</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departmentsList.map((dep) => (
                  <Card key={dep.id} className="p-4 rounded-2xl border space-y-2.5 bg-card flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dep.color || '#3b82f6' }} />
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingDept(dep); setDeptForm({ ...dep }); setDeptDialog(true); }} className="h-6 w-6">
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteDept(dep.id)} className="h-6 w-6 text-rose-500">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-heading font-black text-sm text-foreground mt-1">{dep.name}</h3>
                      <div className="text-xs text-muted-foreground mt-1">المسؤول: <strong className="text-foreground">{dep.manager}</strong></div>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">حالة القسم:</span>
                      <Badge variant="outline" className="text-[10px] font-bold">نشط معتمد</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 5: BANK ACCOUNTS (الحسابات البنكية - تفاعلي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'bank_accounts' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-emerald-600" />
                    <span>الحسابات المصرفية ومسيرات حماية الأجور (WPS)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    حسابات الشركة الرسمية لصرف رواتب الكادر والربط مع نظام مدد ووزارة الموارد البشرية
                  </p>
                </div>
                <Button onClick={() => { setEditingBank(null); setBankForm({ bankName: '', accountName: '', purpose: '', iban: '', wpsId: '7-1234567', bankCode: '', isPrimary: false }); setBankDialog(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>إضافة حساب بنكي</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankAccounts.map((acc) => (
                  <Card key={acc.id} className="p-5 rounded-2xl border space-y-3 bg-card hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge className={acc.isPrimary ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]' : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold text-[10px]'}>
                        {acc.isPrimary ? 'الحساب الرئيسي للرواتب (WPS) 🌟' : 'حساب تشغيلي / موردين'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingBank(acc); setBankForm({ ...acc }); setBankDialog(true); }} className="h-7 w-7">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteBank(acc.id)} className="h-7 w-7 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-heading font-black text-sm text-foreground">{acc.bankName}</h3>
                      <div className="text-xs text-muted-foreground">{acc.accountName}</div>
                      <div className="text-[11px] text-muted-foreground">{acc.purpose}</div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                        <span>IBAN SAUDI ARABIA</span>
                        <span className="text-[10px] text-emerald-600 font-bold">معتمد بنكياً ✓</span>
                      </div>
                      <div className="font-mono font-black text-xs sm:text-sm text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border flex items-center justify-between" dir="ltr">
                        <span>{acc.iban}</span>
                        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(acc.iban); toast({ title: '✓ تم نسخ الآيبان' }); }} className="h-6 w-6">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between border-t">
                      <span>معرف حماية الأجور (MOL ID): <strong className="font-mono text-foreground">{acc.wpsId || '7-1234567'}</strong></span>
                      <span className="font-mono font-bold text-slate-500">{acc.bankCode}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 6: SALARY SCALE & RULES (مسير الراتب)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'salary_rules' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <form onSubmit={handleSavePayrollSettings} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-600" />
                      <span>قواعد مسير الراتب وسلالم الأجور (dorat-payroll-salary)</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      معايير احتساب الأجر اليومي، أيام الشهر، ونسب الاستقطاع الإلزامية بنظام العمل
                    </p>
                  </div>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                    <Save className="w-4 h-4" />
                    <span>حفظ ومزامنة القواعد</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
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
                    <Label className="font-bold text-xs">معدل احتساب الساعة الإضافية (%) *</Label>
                    <Input
                      type="number"
                      value={payrollSettings.overtimeRatePercent || 150}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, overtimeRatePercent: Number(e.target.value) })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">150% وفق المادة (107) من نظام العمل</span>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 7: PAYROLL WORKFLOW (سير عمل الرواتب)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'payroll_workflow' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-indigo-600" />
                  <span>سير عمل الرواتب والموافقات المالية</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  الدورة المستندية الإلزامية لمراجعة واعتماد مسير الأجور الشهري قبل الصرف
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold text-[10px]">المستوى الأول 1️⃣</Badge>
                  <h3 className="font-bold text-sm">إعداد وتجهيز المسير</h3>
                  <div className="text-xs text-muted-foreground">مسؤول الموارد البشرية: <strong className="text-foreground">يحيى محمد عبدالغفار باشا</strong></div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t">تجميع البصمات، حساب البدلات والخصومات ورفع المسير الأولي.</p>
                </Card>

                <Card className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">المستوى الثاني 2️⃣</Badge>
                  <h3 className="font-bold text-sm">تدقيق وترحيل الحسابات</h3>
                  <div className="text-xs text-muted-foreground">المحاسب العام: <strong className="text-foreground">هشام ابوالفضل زغلول</strong></div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t">مطابقة السلف، الاستقطاعات، ومطابقة القيود المحاسبية.</p>
                </Card>

                <Card className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">المستوى الثالث 3️⃣</Badge>
                  <h3 className="font-bold text-sm">الاعتماد النهائي والصرف</h3>
                  <div className="text-xs text-muted-foreground">المدير العام: <strong className="text-foreground">فهد ناصر محمد الجوعي</strong></div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t">المصادقة النهائية وتوجيه الصرف البنكي عبر نظام حماية الأجور.</p>
                </Card>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 8: BONUS & REWARDS (أنواع المكافآت والتعويضات)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'bonus_types' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <form onSubmit={handleSavePayrollSettings} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span>أنواع المكافآت والبدلات التقديرية</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      قواعد صرف بدل دوام الجمعات وبدلات الإضافي ومكافآت التميز
                    </p>
                  </div>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                    <Save className="w-4 h-4" />
                    <span>حفظ البدلات</span>
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
                    <Label className="font-bold text-xs">مكافأة تحقيق مستهدف المبيعات (تارجت)</Label>
                    <Input
                      defaultValue="متغير حسب المبيعات"
                      disabled
                      className="rounded-xl h-10 font-bold bg-muted"
                    />
                    <span className="text-[10px] text-muted-foreground">تُحدد شهرياً من قبل إدارة المبيعات</span>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 9: DEDUCTION TYPES (أنواع الحسميات)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'deduction_types' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <Scale className="w-5 h-5 text-rose-600" />
                  <span>أنواع الحسميات والاستقطاعات المعتمدة</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  بنود الاستقطاع المعتمدة لخصومات التأخير، الغياب، والجزاءات
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  { name: 'خصم التأخير الصباحي', rule: 'تدرج التأخير: يبدأ بإنذار ثم ربع يوم ثم نصف يوم بعد 15 دقيقة سماح', badge: 'آلي من البصمة' },
                  { name: 'خصم الغياب غير المبرر', rule: 'حسم أجر يوم الغياب كاملاً وفق المادة (90) من نظام العمل', badge: 'آلي من البصمة' },
                  { name: 'استقطاع التأمينات (GOSI)', rule: '9.75% من الأجر الأساسي وبدل السكن للموظفين السعوديين', badge: 'إلزامي نظامي' },
                  { name: 'قسط السلفة الشهرية', rule: 'استقطاع القسط المحدد في جدول السلف بحد أقصى 50% من الراتب', badge: 'مالي مجدول' },
                ].map((d, i) => (
                  <Card key={i} className="p-4 rounded-2xl border space-y-2 bg-slate-50/40 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-foreground">{d.name}</h3>
                      <Badge className="text-[10px]">{d.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.rule}</p>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 10: ADVANCE TYPES (أنواع السلف)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'advance_types' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <form onSubmit={handleSavePayrollSettings} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-amber-600" />
                      <span>سياسات وضوابط السلف والقروض</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      الحد الأقصى للأقساط ونسبة الاستقطاع المسموح بها نظامياً
                    </p>
                  </div>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                    <Save className="w-4 h-4" />
                    <span>حفظ ضوابط السلف</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">أقصى عدد أقساط لسداد السلف الشهرية *</Label>
                    <Input
                      type="number"
                      value={payrollSettings.maxAdvanceInstallments}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, maxAdvanceInstallments: Number(e.target.value) })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">أقصى مدة لتقسيط سلفة الموظف على الرواتب (12 شهراً)</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">الحد الأقصى للاستقطاع الشهري من الراتب (%) *</Label>
                    <Input
                      type="number"
                      value={payrollSettings.maxAdvanceSalaryPercent || 50}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, maxAdvanceSalaryPercent: Number(e.target.value) })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">50% بحد أقصى وفق المادة (92) من نظام العمل السعودي</span>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 11: OVERTIME POLICY (أعمال إضافي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overtime_policy' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span>سياسة احتساب ساعات العمل الإضافي</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  معايير التكليف بالعمل الإضافي واحتساب الأجر وفق نظام العمل السعودي
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs space-y-3">
                <div className="font-bold text-purple-900 dark:text-purple-200 text-sm">⚖️ المادة (107) من نظام العمل السعودي:</div>
                <p className="text-muted-foreground leading-relaxed">
                  يجب على صاحب العمل أن يدفع للعامل عن ساعات العمل الإضافية أجراً يوازي أجر الساعة مضافاً إليه 50% من أجره الأساسي. وتُعتبر جميع ساعات العمل التي تُؤدى في أيام العطل والأعياد ساعات إضافية.
                </p>
                <div className="pt-2 border-t border-purple-200 dark:border-purple-800 font-medium text-purple-700 dark:text-purple-300">
                  ✓ نظام درة السيارة يحتسب ساعات العمل الإضافي آلياً بنسبة 150% فور تجاوز ساعات دوام الوردية المعتمدة.
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 12: JOB TITLES (المسميات الوظيفية)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'job_titles' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-sky-600" />
                  <span>دليل المسميات الوظيفية المعتمدة بشركة درة السيارة</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  الوظائف المسجلة في عقود منسوبي المنشأة والمطابقة لمنصة قوى
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  'المدير العام (General Manager)',
                  'مدير الموارد البشرية (HR Manager)',
                  'محاسب عام (Senior Accountant)',
                  'مدير مبيعات (Sales Manager)',
                  'بائع قطع غيار سيارات (Parts Sales Specialist)',
                  'أمين مستودع (Warehouse Supervisor)',
                  'فني فحص ومطابقة قطع (Quality Inspector)',
                  'سائق توزيع ونقل (Logistics Driver)'
                ].map((title, i) => (
                  <div key={i} className="p-3.5 rounded-xl border bg-card flex items-center justify-between">
                    <span className="font-bold">{title}</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">معتمد في قوى ✓</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 13: PENALTIES & VIOLATIONS (أنواع الجزاءات والمخالفات)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'penalties_types' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>لائحة الجزاءات والمخالفات المعتمدة</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تدرج العقوبات والإنذارات المعتمدة وفق لائحة تنظيم العمل
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { viol: 'التأخير عن موعد الحضور حتى 15 دقيقة', first: 'إنذار كتابي', second: 'خصم 5% من أجر اليوم', third: 'خصم 10% من أجر اليوم' },
                  { viol: 'التأخير أكثر من 15 دقيقة حتى 30 دقيقة', first: 'خصم 10% من أجر اليوم', second: 'خصم 25% من أجر اليوم', third: 'خصم 50% من أجر اليوم' },
                  { viol: 'الغياب بدون إذن أو عذر مقبول ليوم واحد', first: 'خصم أجر يوم الغياب + إنذار', second: 'خصم يومين', third: 'خصم 3 أيام' },
                  { viol: 'مخالفة تعليمات السلامة والعهد', first: 'إنذار كتابي رسمي', second: 'خصم يوم', third: 'خصم يومين' },
                ].map((row, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                    <div className="font-bold text-sm text-foreground">{row.viol}</div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border">المرة الأولى: <span className="font-bold text-sky-600">{row.first}</span></div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border">المرة الثانية: <span className="font-bold text-amber-600">{row.second}</span></div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-950 border">المرة الثالثة: <span className="font-bold text-rose-600">{row.third}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 14: TEMPLATES (نماذج النظام)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'templates' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>نماذج الخطابات والعقود الذكية</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    النماذج الرسمية الجاهزة للطباعة مع الوسوم الديناميكية
                  </p>
                </div>
                <Button onClick={() => navigate('/documents')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح مركز النماذج والطباعة</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  { title: 'خطاب تعريف بالراتب (Salary Certificate)', tags: '{{employee_name}}, {{national_id}}, {{basic_salary}}' },
                  { title: 'خطاب تثبيت الراتب للبنوك', tags: '{{employee_name}}, {{iban}}, {{net_salary}}' },
                  { title: 'نموذج إخلاء طرف وتسليم العهد', tags: '{{employee_name}}, {{branch}}, {{custody_list}}' },
                  { title: 'عقد عمل موحد (قوى)', tags: '{{employee_name}}, {{job_title}}, {{salary}}, {{join_date}}' },
                ].map((t, i) => (
                  <Card key={i} className="p-4 rounded-2xl border space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-sm text-foreground">{t.title}</h3>
                    <div className="text-[11px] font-mono text-muted-foreground bg-white dark:bg-slate-950 p-2 rounded-xl border" dir="ltr">
                      {t.tags}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 15: OFFICIAL HOLIDAYS (العطلات الرسمية - تفاعلي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'holidays' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-emerald-600" />
                    <span>العطلات والإجازات الرسمية بالمملكة لعام 2026</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    العطلات الوطنية والدينية المعتمدة في تقويم الدوام
                  </p>
                </div>
                <Button onClick={() => { setHolidayForm({ name: '', date: '', days: '1 يوم', status: 'إجازة مدفوعة الأجر' }); setHolidayDialog(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>إضافة عطلة رسمية</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {holidaysList.map((h) => (
                  <Card key={h.id} className="p-4 rounded-2xl border space-y-2 bg-card hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-foreground">{h.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">{h.days}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteHoliday(h.id)} className="h-6 w-6 text-rose-500">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="font-mono text-muted-foreground">{h.date}</div>
                    <div className="text-[11px] text-emerald-600 font-bold">✓ {h.status}</div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 16: LEAVE SETTINGS (إعدادات الإجازات)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'leave_settings' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-emerald-600" />
                  <span>سياسات وأرصدة الإجازات المعتمدة</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  أرصدة الإجازات السنوية، المرضية، والاضطرارية وفق نظام العمل
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {[
                  { name: 'الإجازة السنوية (أقل من 5 سنوات)', days: '21 يوماً', rule: 'مدفوعة الأجر سنوياً' },
                  { name: 'الإجازة السنوية (أكثر من 5 سنوات)', days: '30 يوماً', rule: 'مدفوعة الأجر سنوياً' },
                  { name: 'الإجازة المرضية (المادة 117)', days: '120 يوماً', rule: '30 يوماً بأجر كامل، 60 بثلاثة أرباع، 30 بدون أجر' },
                  { name: 'إجازة وفاة أحد الأصول/الفروع', days: '5 أيام', rule: 'بأجر كامل' },
                  { name: 'إجازة الزواج للموظف', days: '5 أيام', rule: 'بأجر كامل (مرة واحدة)' },
                  { name: 'إجازة مولود جديد (أبوة)', days: '3 أيام', rule: 'بأجر كامل' },
                ].map((l, i) => (
                  <Card key={i} className="p-4 rounded-2xl border space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-foreground">{l.name}</h3>
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">{l.days}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{l.rule}</p>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 17: INSURANCE TYPES (أنواع التأمين - تفاعلي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'insurance_types' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <form onSubmit={handleSaveInsurance} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                      <Award className="w-5 h-5 text-pink-600" />
                      <span>وثائق التأمين الطبي الصحي التعاوني (شركة درة السيارة)</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      بيانات وثيقة التأمين الصحي لدى شركة التأمين المتحدة وفئات التغطية
                    </p>
                  </div>
                  <Button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                    <Save className="w-4 h-4" />
                    <span>حفظ بيانات الوثيقة</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">شركة التأمين المعتمدة *</Label>
                    <Input
                      value={insurancePolicy.provider}
                      onChange={(e) => setInsurancePolicy({ ...insurancePolicy, provider: e.target.value })}
                      className="rounded-xl h-10 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">رقم البوليصة / الوثيقة *</Label>
                    <Input
                      value={insurancePolicy.policyNumber}
                      onChange={(e) => setInsurancePolicy({ ...insurancePolicy, policyNumber: e.target.value })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">تاريخ انتهاء الوثيقة *</Label>
                    <Input
                      type="date"
                      value={insurancePolicy.expiryDate}
                      onChange={(e) => setInsurancePolicy({ ...insurancePolicy, expiryDate: e.target.value })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="font-bold text-xs">فئات التغطية الطبية</Label>
                    <Input
                      value={insurancePolicy.classes}
                      onChange={(e) => setInsurancePolicy({ ...insurancePolicy, classes: e.target.value })}
                      className="rounded-xl h-10 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">حالة الوثيقة</Label>
                    <Input
                      value={insurancePolicy.status}
                      onChange={(e) => setInsurancePolicy({ ...insurancePolicy, status: e.target.value })}
                      className="rounded-xl h-10 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-3">
                    <Label className="font-bold text-xs">شبكة المراكز الطبية والمستشفيات المعتمدة</Label>
                    <Input
                      value={insurancePolicy.network}
                      onChange={(e) => setInsurancePolicy({ ...insurancePolicy, network: e.target.value })}
                      className="rounded-xl h-10 font-bold"
                    />
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 18: GEOFENCING (معرف لوكيشن - تفاعلي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'geofencing' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <form onSubmit={handleSaveGpsSettings} className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      <span>معرف لوكيشن وسياج البصمة الذكية (Geofencing)</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      إلزامية الوجود الجغرافي داخل نطاق الفرع المعتمد لكل موظف لتسجيل البصمة
                    </p>
                  </div>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
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
                        className="data-[state=checked]:bg-purple-600"
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
                    <span className="text-[10px] text-muted-foreground">النطاق الافتراضي: 250 متراً حول إحداثيات كل فرع</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">فترة السماح للتأخير الصباحي (بالدقائق)</Label>
                    <Input
                      type="number"
                      value={gpsSettings.lateGraceMinutes || 15}
                      onChange={(e) => setGpsSettings({ ...gpsSettings, lateGraceMinutes: Number(e.target.value) })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">15 دقيقة سماح لا يُطبق عليها خصم التأخير</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">نافذة الحضور المبكر المسموح بها (بالدقائق)</Label>
                    <Input
                      type="number"
                      value={gpsSettings.allowEarlyPunchMinutes || 30}
                      onChange={(e) => setGpsSettings({ ...gpsSettings, allowEarlyPunchMinutes: Number(e.target.value) })}
                      className="rounded-xl h-10 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">30 دقيقة قبل موعد بدء الوردية</span>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 19: BIOMETRIC HARDWARE (أجهزة البصمة - تفاعلي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'biometric_hardware' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-purple-600" />
                    <span>أجهزة البصمة الحيوية وربط الشبكة المحلية</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    إدارة أجهزة الحضور والانصراف بالفروع، حالة الاتصال والـ IP الداخلي
                  </p>
                </div>
                <Button onClick={() => { setEditingDevice(null); setDeviceForm({ name: '', ip: '192.168.1.', port: 4370, brand: 'ZKTeco', serial: '', branch: 'الفرع الرئيسي', status: 'online' }); setDeviceDialog(true); }} className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>إضافة جهاز بصمة</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {devicesList.map((dev) => {
                  const isOnline = dev.status === 'online';
                  const isTesting = testingDeviceId === dev.id;
                  const ip = dev.ip_address || dev.ip || '192.168.8.110';
                  const port = dev.port || '80';
                  const sn = dev.serial_number || dev.serial || 'EK0201000044';
                  const branch = dev.branch_name || dev.branch || 'فرع كيا ( السليم )';

                  return (
                    <Card key={dev.id} className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                      isOnline ? 'bg-card border-emerald-300 dark:border-emerald-800/80 shadow-sm' : 'bg-card border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {isOnline ? (
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" title="الجهاز متصل فعلياً (Online)" />
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600" title="الجهاز غير متصل (Offline)" />
                          )}
                          <div>
                            <h3 className="font-bold text-sm text-foreground">{dev.name}</h3>
                            <div className="text-[10px] text-muted-foreground">{branch}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingDevice(dev); setDeviceForm({ ...dev }); setDeviceDialog(true); }} className="h-7 w-7">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteDevice(dev.id)} className="h-7 w-7 text-rose-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-secondary/30 p-2.5 rounded-xl border border-border/50 text-muted-foreground font-medium">
                        <div>الطراز: <strong className="text-foreground">{dev.brand || 'Ektefa ai806'}</strong></div>
                        <div>الرقم التسلسلي: <strong className="text-foreground font-mono">{sn}</strong></div>
                        <div>عنوان IP: <strong className="text-foreground font-mono">{ip}:{port}</strong></div>
                        <div>كلمة المرور: <strong className="text-foreground font-mono">{dev.comm_key || '12345678'}</strong></div>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isOnline ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-500/30 gap-1">
                              <Wifi className="w-3 h-3" />
                              <span>متصل فعلياً (Online)</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold text-[10px] gap-1">
                              <WifiOff className="w-3 h-3" />
                              <span>غير متصل (Offline)</span>
                            </Badge>
                          )}
                          {dev.last_ping_time && (
                            <span className="text-[10px] font-mono text-emerald-600 font-bold">
                              {dev.last_ping_time}
                            </span>
                          )}
                        </div>

                        <Button 
                          size="sm" 
                          variant={isOnline ? "default" : "outline"} 
                          onClick={() => handlePingDevice(dev)} 
                          disabled={isTesting}
                          className={`h-7 text-[11px] rounded-lg gap-1 font-bold ${
                            isOnline ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''
                          }`}
                        >
                          <Activity className={`w-3 h-3 ${isTesting ? 'animate-spin' : 'text-primary'}`} />
                          <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال الفعلي (Ping)'}</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 20: DEVICE API INTEGRATION (أجهزة معرف)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'device_api' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-600" />
                  <span>أجهزة معرف والربط السحابي (Cloud Push ADMS)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إعدادات استلام حركات البصمة الفورية من خوادم البصمات السحابية
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <div className="font-bold text-indigo-900 dark:text-indigo-200">📡 نقطة نهاية الويب هوك لاستلام البصمات (Live Webhook Endpoint):</div>
                  <div className="font-mono bg-white dark:bg-slate-950 p-2.5 rounded-xl border text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between" dir="ltr">
                    <span>https://hr.doratcars.com/api/v1/biometric/adms-push</span>
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText('https://hr.doratcars.com/api/v1/biometric/adms-push'); toast({ title: '✓ تم نسخ الرابط' }); }} className="h-6 w-6">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    تستقبل هذه النقطة بصمات الموظفين بصيغة ADMS المباشرة وترحلها تلقائياً لسجلات الحضور.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 21: REQUESTS WORKFLOW (سير عمل الطلبات)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'requests_workflow' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-purple-600" />
                  <span>سير عمل واعتماد طلبات الموظفين</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مسار الموافقات لطلبات الإجازات، الاستئذان، السلف والخطابات
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { title: 'طلبات الإجازات العادية والاضطرارية', flow: 'الموظف ➔ مسؤول الموارد البشرية (يحيى باشا) ➔ اعتماد المدير العام (فهد الجوعي)' },
                  { title: 'طلبات الاستئذان الصباحي والمسائي', flow: 'الموظف ➔ مسؤول الموارد البشرية (موافقة فورية)' },
                  { title: 'طلبات السلف والقروض المالية', flow: 'الموظف ➔ مراجعة وتدقيق الحسابات (هشام زغلول) ➔ اعتماد الصرف (المدير العام)' },
                  { title: 'طلبات خطابات التعريف وتثبيت الراتب', flow: 'الموظف ➔ إصدار مباشر ومعتمد إلكترونياً من النظام' },
                ].map((wf, i) => (
                  <div key={i} className="p-3.5 rounded-2xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-foreground">{wf.title}</span>
                    <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                      {wf.flow}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 22: SYSTEM AUDIT & BACKUP (سجلات النظام والنسخ الاحتياطي)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit_logs' && (
            <Card className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    <span>سجلات النظام والنسخ الاحتياطي الشامل (Audit & Cloud Backup)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    تنزيل نسخة احتياطية لكافة قواعد بيانات الموظفين، الرواتب، والعقود وإجراء مزامنة فورية
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleImmediateCloudSync}
                    disabled={isCloudSyncing}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    <span>مزامنة سحابية كاملة</span>
                  </Button>

                  <Button
                    onClick={exportSystemBackupJSON}
                    variant="outline"
                    className="font-bold rounded-xl text-xs gap-1.5 border"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>تنزيل نسخة JSON</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>التوافق الأمني والنسخ المشفر (Zero-Secrets & PDPL):</span>
                </div>
                <p className="leading-relaxed">
                  تشتمل النسخة الاحتياطية على بيانات المنشأة، مصفوفة الصلاحيات، الفروع، الحسابات البنكية، أجهزة البصمة، وثيقة التأمين، وطلبات الموظفين والمسيرات المحسوبة بدقة.
                </p>
              </div>
            </Card>
          )}

      </div>

      {/* ─── MODAL: BRANCH ADD / EDIT DIALOG ───────────────────────────────── */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">
              {editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تحديد بيانات الفرع، المشرف المسؤول، وإحداثيات السياج الجغرافي (GPS)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-xs">اسم الفرع *</Label>
              <Input
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                placeholder="مثال: فرع بريدة الشمالي"
                className="rounded-xl h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-bold text-xs">رمز الفرع</Label>
                <Input
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  className="rounded-xl h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">هاتف الفرع</Label>
                <Input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="016385..."
                  className="rounded-xl h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">المشرف المسؤول</Label>
              <Input
                value={branchForm.manager}
                onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })}
                placeholder="اسم المشرف أو المدير المسؤول"
                className="rounded-xl h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">العنوان التفصيلي</Label>
              <Input
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                placeholder="الشارع أو الحي"
                className="rounded-xl h-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="font-bold text-[11px]">خط العرض (Lat)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={branchForm.lat}
                  onChange={(e) => setBranchForm({ ...branchForm, lat: parseFloat(e.target.value) || 0 })}
                  className="rounded-xl h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-[11px]">خط الطول (Lng)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={branchForm.lng}
                  onChange={(e) => setBranchForm({ ...branchForm, lng: parseFloat(e.target.value) || 0 })}
                  className="rounded-xl h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-[11px]">النطاق (متر)</Label>
                <Input
                  type="number"
                  value={branchForm.radius}
                  onChange={(e) => setBranchForm({ ...branchForm, radius: parseInt(e.target.value) || 250 })}
                  className="rounded-xl h-9 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBranchDialog(false)} className="rounded-xl text-xs font-bold">إلغاء</Button>
            <Button onClick={handleSaveBranch} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold">حفظ الفرع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: BANK ACCOUNT ADD / EDIT DIALOG ─────────────────────────── */}
      <Dialog open={bankDialog} onOpenChange={setBankDialog}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">
              {editingBank ? 'تعديل الحساب البنكي' : 'إضافة حساب بنكي جديد'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تسجيل حساب بنكي معتمد لمسير حماية الأجور (WPS) أو العمليات التشغيلية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-xs">اسم البنك *</Label>
              <Input
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="مثال: مصرف الراجحي"
                className="rounded-xl h-9 font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">اسم صاحب الحساب الرسمي</Label>
              <Input
                value={bankForm.accountName}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                placeholder="شركة درة السيارة لقطع غيار السيارات"
                className="rounded-xl h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">رقم الآيبان (IBAN) *</Label>
              <Input
                value={bankForm.iban}
                onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })}
                placeholder="SA..."
                className="rounded-xl h-9 font-mono font-bold"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-bold text-xs">معرف حماية الأجور (WPS)</Label>
                <Input
                  value={bankForm.wpsId}
                  onChange={(e) => setBankForm({ ...bankForm, wpsId: e.target.value })}
                  placeholder="7-1234567"
                  className="rounded-xl h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">رمز البنك (Bank Code)</Label>
                <Input
                  value={bankForm.bankCode}
                  onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}
                  placeholder="RJHI"
                  className="rounded-xl h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">الغرض من الحساب</Label>
              <Input
                value={bankForm.purpose}
                onChange={(e) => setBankForm({ ...bankForm, purpose: e.target.value })}
                placeholder="مثال: الحساب الرئيسي للرواتب"
                className="rounded-xl h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBankDialog(false)} className="rounded-xl text-xs font-bold">إلغاء</Button>
            <Button onClick={handleSaveBank} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold">حفظ الحساب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: BIOMETRIC DEVICE ADD / EDIT DIALOG ──────────────────────── */}
      <Dialog open={deviceDialog} onOpenChange={setDeviceDialog}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">
              {editingDevice ? 'تعديل جهاز البصمة' : 'إضافة جهاز بصمة جديد'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ربط جهاز البصمة الحيوية بالفروع والشبكة المحلية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-xs">اسم الجهاز التعريفي *</Label>
              <Input
                value={deviceForm.name}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                placeholder="مثال: جهاز بصمة - الفرع الرئيسي"
                className="rounded-xl h-9 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-bold text-xs">عنوان الـ IP *</Label>
                <Input
                  value={deviceForm.ip}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ip: e.target.value })}
                  placeholder="192.168.1.201"
                  className="rounded-xl h-9 font-mono"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">المنفذ (Port)</Label>
                <Input
                  type="number"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) || 4370 })}
                  className="rounded-xl h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-bold text-xs">الشركة المصنعة / الطراز</Label>
                <Input
                  value={deviceForm.brand}
                  onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
                  placeholder="ZKTeco K40 Pro"
                  className="rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">الرقم التسلسلي</Label>
                <Input
                  value={deviceForm.serial}
                  onChange={(e) => setDeviceForm({ ...deviceForm, serial: e.target.value })}
                  placeholder="EK02010043"
                  className="rounded-xl h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">الفرع المخصص</Label>
              <Select value={deviceForm.branch} onValueChange={(v) => setDeviceForm({ ...deviceForm, branch: v })}>
                <SelectTrigger className="h-9 rounded-xl text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branchesList.map(b => (
                    <SelectItem key={b.id} value={b.name} className="text-xs font-bold">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeviceDialog(false)} className="rounded-xl text-xs font-bold">إلغاء</Button>
            <Button onClick={handleSaveDevice} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold">حفظ الجهاز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: DEPARTMENT ADD / EDIT DIALOG ────────────────────────────── */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">
              {editingDept ? 'تعديل القسم' : 'إضافة قسم جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-xs">اسم القسم *</Label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="مثال: الشؤون القانونية"
                className="rounded-xl h-9 font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-xs">المسؤول عن القسم</Label>
              <Input
                value={deptForm.manager}
                onChange={(e) => setDeptForm({ ...deptForm, manager: e.target.value })}
                placeholder="اسم رئيس القسم"
                className="rounded-xl h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeptDialog(false)} className="rounded-xl text-xs font-bold">إلغاء</Button>
            <Button onClick={handleSaveDept} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">حفظ القسم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: HOLIDAY ADD DIALOG ─────────────────────────────────────── */}
      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">إضافة عطلة رسمية</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-xs">اسم العطلة *</Label>
              <Input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="مثال: إجازة إضافية معتمدة"
                className="rounded-xl h-9 font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-xs">التاريخ / الفترة *</Label>
              <Input
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                placeholder="مثال: 15 أكتوبر 2026"
                className="rounded-xl h-9 font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-xs">عدد الأيام</Label>
              <Input
                value={holidayForm.days}
                onChange={(e) => setHolidayForm({ ...holidayForm, days: e.target.value })}
                placeholder="1 يوم"
                className="rounded-xl h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setHolidayDialog(false)} className="rounded-xl text-xs font-bold">إلغاء</Button>
            <Button onClick={handleSaveHoliday} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold">حفظ العطلة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
