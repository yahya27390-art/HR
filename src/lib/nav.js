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
  KeyRound,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

export const navigationModules = [
  {
    id: 'dashboard',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    color: '#0284c7', // Sky Blue
    badgeColor: 'bg-sky-500 text-white',
    activeBg: 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    permission: 'dashboard.view',
    items: [
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
      { to: '/my-requests', label: 'طلباتي (الخدمة الذاتية)', icon: ClipboardList },
      { to: '/approvals', label: 'مركز الاعتمادات والطلبات', icon: CheckCircle2, permission: 'approvals.manage' },
      { to: '/alerts', label: 'مركز التنبيهات والوثائق', icon: Bell, permission: 'alerts.view' },
      { to: '/employee-profile', label: 'ملفي الشخصي 360°', icon: UserCheck },
      { to: '/portal', label: 'بوابة الموظف', icon: UserCheck },
    ]
  },
  {
    id: 'communication',
    label: 'التواصل',
    icon: MessageSquare,
    color: '#ec4899', // Pink
    badgeColor: 'bg-pink-500 text-white',
    activeBg: 'bg-pink-50 text-pink-900 dark:bg-pink-950/40 dark:text-pink-200',
    permission: 'announcements.send',
    items: [
      { to: '/announcements?tab=inbox', label: 'البريد الداخلي', icon: Mail },
      { to: '/announcements?tab=circulars', label: 'التعاميم والقرارات', icon: Megaphone },
      { to: '/announcements?tab=notifications', label: 'التنبيهات الإدارية', icon: Bell },
      { to: '/announcements?tab=calendar', label: 'التقويم والفعاليات', icon: CalendarDays },
    ]
  },
  {
    id: 'attendance',
    label: 'الحضور',
    icon: Clock,
    color: '#f97316', // Orange
    badgeColor: 'bg-orange-500 text-white',
    activeBg: 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
    permission: 'attendance.view',
    items: [
      { to: '/attendance', label: 'إدارة وسجل البصمات', icon: Clock },
      { to: '/devices', label: 'أجهزة البصمة الحيوية', icon: Fingerprint, permission: 'shifts.manage' },
      { to: '/import-data', label: 'رفع واستيراد الحضور', icon: UploadCloud, permission: 'attendance.import' },
      { to: '/attendance?mode=manual', label: 'التحضير اليدوي', icon: FileCheck, permission: 'attendance.edit' },
      { to: '/devices?sync=true', label: 'مزامنة وسحب الحركات', icon: Fingerprint, permission: 'shifts.manage' },
    ]
  },
  {
    id: 'employees',
    label: 'الموظفين',
    icon: Users,
    color: '#ef4444', // Red
    badgeColor: 'bg-red-500 text-white',
    activeBg: 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
    permission: 'employees.view',
    items: [
      { to: '/employees', label: 'دليل وسجلات الموظفين', icon: Users },
      { to: '/branches', label: 'الفروع ومواقع العمل', icon: GitBranch, permission: 'branches.manage' },
      { to: '/departments', label: 'الأقسام والهيكل الإداري', icon: Layers, permission: 'departments.manage' },
      { to: '/contracts', label: 'العقود ومسيرات التوظيف', icon: FileText, permission: 'employees.edit' },
      { to: '/allowances', label: 'سجل وإدارة البدلات والمزايا', icon: Coins, permission: 'allowances.view' },
      { to: '/shifts', label: 'الورديات ومواعيد العمل', icon: CalendarRange, permission: 'shifts.view' },
    ]
  },
  {
    id: 'services',
    label: 'وظائف الكادر',
    icon: Briefcase,
    color: '#0ea5e9', // Sky/Cyan Blue
    badgeColor: 'bg-sky-500 text-white',
    activeBg: 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    permission: 'leave.view',
    items: [
      { to: '/leave', label: 'إدارة ومسيرات الإجازات', icon: CalendarDays },
      { to: '/approvals', label: 'مركز الاعتمادات والطلبات', icon: CheckCircle2, permission: 'approvals.manage' },
      { to: '/alerts', label: 'مركز التنبيهات والوثائق', icon: Bell, permission: 'alerts.view' },
      { to: '/leave-policies', label: 'سياسات واستحقاقات الإجازات', icon: BookOpen, permission: 'settings.view' },
      { to: '/rewards-penalties', label: 'المكافآت والجزاءات', icon: Award, permission: 'employees.edit' },
    ]
  },
  {
    id: 'payroll',
    label: 'الأجور',
    icon: Wallet,
    color: '#8b5cf6', // Purple
    badgeColor: 'bg-purple-500 text-white',
    activeBg: 'bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
    permission: 'payroll.view',
    items: [
      { to: '/payroll?stage=1', label: '1. مراجعة وتدقيق البصمات', icon: Clock },
      { to: '/payroll?stage=2', label: '2. اعتماد الاستقطاعات والخصم', icon: Wallet },
      { to: '/payroll?stage=3', label: '3. اعتماد الاستحقاقات والمكافئات', icon: Award },
      { to: '/payroll?stage=4', label: '4. المراجعة والإقفال النهائي', icon: FileSpreadsheet },
      { to: '/payroll?stage=5', label: '5. رواتب الشهور السابقة والمصادقة', icon: FileText },
      { to: '/allowances', label: 'سجل وإدارة البدلات والمزايا', icon: Coins },
      { to: '/payroll?tab=advances', label: 'نظام السلف والقروض', icon: CreditCard, permission: 'loans.view' },
      { to: '/end-of-service', label: 'حاسبة مكافأة نهاية الخدمة', icon: Calculator },
    ]
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: FileSpreadsheet,
    color: '#f43f5e', // Rose/Coral Ektefa Color
    badgeColor: 'bg-rose-500 text-white',
    activeBg: 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    permission: 'reports.view',
    items: [
      { to: '/reports', label: 'مركز التقارير الشامل', icon: FileSpreadsheet },
      { to: '/reports?report=daily_biometrics', label: 'تقرير البصمات اليومي', icon: Clock },
      { to: '/reports?report=payroll_details', label: 'تفاصيل الرواتب والأجور', icon: Wallet, permission: 'employees.salary.view' },
      { to: '/reports?report=employee_master_data', label: 'بيانات الموظفين الشاملة', icon: Users },
      { to: '/reports?report=leave_report', label: 'تقرير الإجازات والأرصدة', icon: CalendarDays },
      { to: '/reports?report=advances_and_loans', label: 'تقرير السلف والقروض', icon: CreditCard, permission: 'loans.view' },
      { to: '/documents-print', label: 'طباعة النماذج والمستندات الرسمية', icon: FolderOpen, permission: 'reports.view' },
    ]
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    color: '#10b981', // Emerald Green
    badgeColor: 'bg-emerald-500 text-white',
    activeBg: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    permission: 'settings.view',
    items: [
      { to: '/settings', label: 'إعدادات النظام العامة', icon: Settings },
      { to: '/users', label: 'المستخدمين والصلاحيات', icon: KeyRound, permission: 'users.manage' },
      { to: '/print-templates', label: 'قوالب ونماذج الطباعة', icon: FileText },
      { to: '/evaluations', label: 'تقييمات الأداء السنوية', icon: Award },
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
  return visibleMods.map(mod => ({
    ...mod,
    items: mod.items.filter(it => !it.permission || hasPermission(user, it.permission))
  }));
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
