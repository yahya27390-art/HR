import {
  LayoutDashboard,
  MessageSquare,
  Clock,
  Users,
  Briefcase,
  Wallet,
  Coins,
  Settings,
  UserCheck,
  CalendarDays,
  FileCheck,
  FolderOpen,
  Mail,
  Megaphone,
  Bell,
  Fingerprint,
  UploadCloud,
  UserPlus,
  GitBranch,
  Layers,
  FileText,
  CalendarRange,
  FileSpreadsheet,
  BookOpen,
  Award,
  CreditCard,
  Building,
  Building2,
  ShieldCheck,
  KeyRound,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Star,
  Palmtree,
  TrendingUp
} from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

export const navigationModules = [
  // 1. الرئيسية (Dashboard & Self-Service)
  {
    id: 'dashboard',
    label: 'الرئيسية',
    sublabel: 'المؤشرات والطلبات',
    icon: LayoutDashboard,
    color: '#0284c7', // Sky Blue
    gradient: 'from-sky-500 to-blue-600',
    glowColor: 'rgba(2, 132, 199, 0.4)',
    badgeColor: 'bg-sky-500 text-white',
    activeBg: 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    permission: 'dashboard.view',
    items: [
      { to: '/', label: 'لوحة التحكم والمؤشرات', icon: LayoutDashboard },
      { to: '/my-requests', label: 'طلباتي والخدمة الذاتية', icon: ClipboardList },
      { to: '/approvals', label: 'مركز الاعتمادات والطلبات', icon: CheckCircle2, permission: 'approvals.manage' },
      { to: '/alerts', label: 'التنبيهات والإشعارات', icon: Bell, permission: 'alerts.view' },
      { to: '/employee-profile', label: 'ملفي التعريفي 360°', icon: UserCheck },
      { to: '/portal', label: 'بوابة الموظف', icon: UserCheck },
    ]
  },

  // 2. الموظفين (Employees & Organization)
  {
    id: 'employees',
    label: 'الموظفين',
    sublabel: 'السجلات والهيكل',
    icon: Users,
    color: '#10b981', // Emerald
    gradient: 'from-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badgeColor: 'bg-emerald-500 text-white',
    activeBg: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    permission: 'employees.view',
    items: [
      { to: '/employees', label: 'دليل وبيانات الموظفين', icon: Users },
      { to: '/contracts', label: 'عقود العمل والاتفاقيات', icon: FileText, permission: 'employees.edit' },
      { to: '/departments', label: 'الأقسام والهيكل الإداري', icon: Layers, permission: 'departments.manage' },
      { to: '/branches', label: 'الفروع ومواقع العمل', icon: GitBranch, permission: 'branches.manage' },
      { to: '/users', label: 'حسابات الدخول والمستخدمين', icon: KeyRound, permission: 'employees.view' },
    ]
  },

  // 3. الحضور والدوام (Attendance & Shifts)
  {
    id: 'attendance',
    label: 'الحضور',
    sublabel: 'البصمات والورديات',
    icon: Clock,
    color: '#f59e0b', // Amber
    gradient: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    badgeColor: 'bg-amber-500 text-white',
    activeBg: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    permission: 'attendance.view',
    items: [
      { to: '/attendance', label: 'سجل وحركات البصمة', icon: Clock },
      { to: '/shifts', label: 'الورديات وفترات العمل', icon: CalendarRange, permission: 'shifts.view' },
      { to: '/devices', label: 'أجهزة البصمة والربط', icon: Fingerprint, permission: 'shifts.manage' },
      { to: '/attendance?mode=manual', label: 'التحضير اليدوي والتصحيح', icon: FileCheck, permission: 'attendance.edit' },
      { to: '/import-data', label: 'سحب ورفع حركات البصمة', icon: UploadCloud, permission: 'attendance.import' },
    ]
  },

  // 4. الإجازات (Leaves & Absences)
  {
    id: 'leaves',
    label: 'الإجازات',
    sublabel: 'الطلبات والأرصدة',
    icon: Palmtree,
    color: '#06b6d4', // Cyan
    gradient: 'from-cyan-500 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    badgeColor: 'bg-cyan-600 text-white',
    activeBg: 'bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200',
    permission: 'leave.view',
    items: [
      { to: '/leave?tab=requests', label: 'طلبات وسجل الإجازات', icon: CalendarDays },
      { to: '/leave?tab=balances', label: 'أرصدة الإجازات السنوية', icon: FileSpreadsheet },
      { to: '/leave-policies', label: 'سياسات ولائحة الإجازات', icon: BookOpen, permission: 'settings.view' },
      { to: '/leave?tab=holidays', label: 'العطلات والإجازات الرسمية', icon: CalendarRange, permission: 'settings.view' },
    ]
  },

  // 5. الأداء والتقييم (Performance & KPIs) - قسم مستقل ومتخصص
  {
    id: 'performance',
    label: 'الأداء والتقييم',
    sublabel: 'الكفاءة والـ KPIs',
    icon: Award,
    color: '#8b5cf6', // Violet/Purple
    gradient: 'from-violet-500 to-purple-600',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    badgeColor: 'bg-violet-600 text-white',
    activeBg: 'bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
    permission: 'employees.view',
    items: [
      { to: '/evaluations', label: 'تقييم الأداء الوظيفي', icon: Award, permission: 'employees.view' },
      { to: '/rewards-penalties', label: 'لائحة المكافآت والجزاءات', icon: Star, permission: 'employees.edit' },
      { to: '/evaluations?tab=criteria', label: 'معايير ومؤشرات الكفاءة (KPIs)', icon: TrendingUp, permission: 'employees.view' },
    ]
  },

  // 6. الرواتب (Payroll & Financials)
  {
    id: 'payroll',
    label: 'الرواتب',
    sublabel: 'المسيرات والبدلات',
    icon: Wallet,
    color: '#2563eb', // Royal Blue
    gradient: 'from-blue-600 to-indigo-700',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    badgeColor: 'bg-blue-600 text-white',
    activeBg: 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    permission: 'payroll.view',
    items: [
      { to: '/payroll', label: 'مسيرات الرواتب الشهرية', icon: Wallet },
      { to: '/payroll?tab=advances', label: 'السلف والقروض الميسرة', icon: CreditCard, permission: 'loans.view' },
      { to: '/allowances', label: 'البدلات والمزايا الشهرية', icon: Coins, permission: 'allowances.view' },
      { to: '/end-of-service', label: 'مكافأة نهاية الخدمة (WPS)', icon: Calculator },
      { to: '/payroll?stage=5', label: 'أرشيف وكشوفات البنوك', icon: FileSpreadsheet },
    ]
  },

  // 7. التواصل (Communication & Circulars)
  {
    id: 'communication',
    label: 'التواصل',
    sublabel: 'التعاميم والبريد',
    icon: MessageSquare,
    color: '#ec4899', // Pink
    gradient: 'from-pink-500 to-rose-600',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    badgeColor: 'bg-pink-500 text-white',
    activeBg: 'bg-pink-50 text-pink-900 dark:bg-pink-950/40 dark:text-pink-200',
    permission: 'announcements.send',
    items: [
      { to: '/announcements?tab=circulars', label: 'التعاميم والقرارات الرسمية', icon: Megaphone },
      { to: '/announcements?tab=inbox', label: 'البريد والمراسلات الداخلية', icon: Mail },
      { to: '/announcements?tab=notifications', label: 'التنبيهات الإدارية والوثائق', icon: Bell },
      { to: '/announcements?tab=calendar', label: 'التقويم والفعاليات الرسمية', icon: CalendarDays },
    ]
  },

  // 8. التقارير (Reports & Documents)
  {
    id: 'reports',
    label: 'التقارير',
    sublabel: 'الكشوفات والطباعة',
    icon: FileSpreadsheet,
    color: '#0d9488', // Teal
    gradient: 'from-teal-500 to-cyan-700',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    badgeColor: 'bg-teal-600 text-white',
    activeBg: 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200',
    permission: 'reports.view',
    items: [
      { to: '/reports', label: 'مركز التقارير الشامل', icon: FileSpreadsheet },
      { to: '/reports?report=daily_biometrics', label: 'كشف الحضور والبصمات اليومي', icon: Clock },
      { to: '/reports?report=payroll_details', label: 'كشف مسيرات الرواتب', icon: Wallet, permission: 'employees.salary.view' },
      { to: '/reports?report=leave_report', label: 'تقرير أرصدة الإجازات', icon: CalendarDays },
      { to: '/reports?report=advances_and_loans', label: 'كشف أقساط السلف', icon: CreditCard, permission: 'loans.view' },
      { to: '/reports?report=employee_master_data', label: 'سجل بيانات الموظفين', icon: Users },
      { to: '/documents-print', label: 'طباعة النماذج والمستندات', icon: FileText },
    ]
  },

  // 9. الإعدادات (Settings & Configuration)
  {
    id: 'settings',
    label: 'الإعدادات',
    sublabel: 'المنشأة والربط',
    icon: Settings,
    color: '#475569', // Slate
    gradient: 'from-slate-600 to-slate-800',
    glowColor: 'rgba(71, 85, 105, 0.4)',
    badgeColor: 'bg-slate-600 text-white',
    activeBg: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    permission: 'settings.view',
    items: [
      { to: '/settings?tab=company', label: 'معلومات المنشأة والتراخيص', icon: Building2 },
      { to: '/settings?tab=rbac', label: 'الصلاحيات والمشرفين', icon: ShieldCheck },
      { to: '/settings?tab=salary_rules', label: 'بنود الراتب وحماية الأجور WPS', icon: Calculator },
      { to: '/settings?tab=leave_settings', label: 'سياسات الإجازات والدوام', icon: CalendarRange },
      { to: '/settings?tab=biometric_hardware', label: 'أجهزة البصمة والربط السحابي', icon: Fingerprint },
      { to: '/settings?tab=device_api', label: 'الربط البرمجي (قوى • مدد)', icon: KeyRound },
      { to: '/settings?tab=templates', label: 'نماذج وقوالب النظام الرسمية', icon: FileText },
      { to: '/settings?tab=audit_logs', label: 'سجلات الأمان والنسخ الاحتياطي', icon: ClipboardList },
    ]
  }
];

export const EKTEFA_MODULES = navigationModules;

export function getVisibleModules(user) {
  if (!user) return [];
  const role = user.role || 'employee';
  if (role === 'system_admin') return navigationModules;
  
  return navigationModules.filter(mod => {
    if (!mod.permission) return true;
    return hasPermission(user, mod.permission);
  });
}

export function getNavGroups(user) {
  const visibleMods = getVisibleModules(user);
  return visibleMods
    .map(mod => ({
      ...mod,
      items: mod.items.filter(it => !it.permission || hasPermission(user, it.permission))
    }))
    .filter(mod => mod.items.length > 0);
}

export function getNavItems(user) {
  const items = [];
  const groups = getNavGroups(user);
  groups.forEach(mod => {
    mod.items.forEach(it => {
      items.push({ ...it, module: mod.id });
    });
  });
  return items;
}
