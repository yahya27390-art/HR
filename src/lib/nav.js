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
  ClipboardList
} from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

export const navigationModules = [
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
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
      { to: '/my-requests', label: 'طلباتي', icon: ClipboardList },
      { to: '/approvals', label: 'الاعتمادات', icon: CheckCircle2, permission: 'approvals.manage' },
      { to: '/alerts', label: 'التنبيهات', icon: Bell, permission: 'alerts.view' },
      { to: '/employee-profile', label: 'ملفي 360°', icon: UserCheck },
      { to: '/portal', label: 'بوابة الموظف', icon: UserCheck },
    ]
  },
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
      { to: '/employees', label: 'الموظفين', icon: Users },
      { to: '/contracts', label: 'العقود', icon: FileText, permission: 'employees.edit' },
      { to: '/departments', label: 'الأقسام والهيكل', icon: Layers, permission: 'departments.manage' },
      { to: '/branches', label: 'الفروع', icon: GitBranch, permission: 'branches.manage' },
      { to: '/shifts', label: 'الورديات', icon: CalendarRange, permission: 'shifts.view' },
      { to: '/allowances', label: 'البدلات والمزايا', icon: Coins, permission: 'allowances.view' },
    ]
  },
  {
    id: 'attendance',
    label: 'الحضور',
    sublabel: 'البصمات والأجهزة',
    icon: Clock,
    color: '#f59e0b', // Amber
    gradient: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    badgeColor: 'bg-amber-500 text-white',
    activeBg: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    permission: 'attendance.view',
    items: [
      { to: '/attendance', label: 'حركات البصمة', icon: Clock },
      { to: '/devices', label: 'أجهزة البصمة', icon: Fingerprint, permission: 'shifts.manage' },
      { to: '/devices?sync=true', label: 'سحب الحركات', icon: Fingerprint, permission: 'shifts.manage' },
      { to: '/attendance?mode=manual', label: 'التحضير اليدوي', icon: FileCheck, permission: 'attendance.edit' },
      { to: '/import-data', label: 'رفع البصمات', icon: UploadCloud, permission: 'attendance.import' },
    ]
  },
  {
    id: 'services',
    label: 'الإجازات',
    sublabel: 'الطلبات والتقييم',
    icon: Briefcase,
    color: '#6366f1', // Indigo
    gradient: 'from-indigo-500 to-violet-600',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    badgeColor: 'bg-indigo-500 text-white',
    activeBg: 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
    permission: 'leave.view',
    items: [
      { to: '/leave', label: 'الإجازات', icon: CalendarDays },
      { to: '/leave-policies', label: 'سياسات الإجازة', icon: BookOpen, permission: 'settings.view' },
      { to: '/evaluations', label: 'تقييم الأداء', icon: Award, permission: 'employees.view' },
      { to: '/rewards-penalties', label: 'المكافآت والجزاءات', icon: Award, permission: 'employees.edit' },
      { to: '/approvals', label: 'مركز الاعتمادات', icon: CheckCircle2, permission: 'approvals.manage' },
    ]
  },
  {
    id: 'payroll',
    label: 'الرواتب',
    sublabel: 'المسيرات والسلف',
    icon: Wallet,
    color: '#8b5cf6', // Purple
    gradient: 'from-purple-500 to-indigo-700',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    badgeColor: 'bg-purple-500 text-white',
    activeBg: 'bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
    permission: 'payroll.view',
    items: [
      { to: '/payroll?stage=1', label: '1. تدقيق البصمات', icon: Clock },
      { to: '/payroll?stage=2', label: '2. الاستقطاعات', icon: Wallet },
      { to: '/payroll?stage=3', label: '3. الاستحقاقات', icon: Award },
      { to: '/payroll?stage=4', label: '4. الإقفال النهائي', icon: FileSpreadsheet },
      { to: '/payroll?stage=5', label: '5. أرشيف الرواتب', icon: FileText },
      { to: '/payroll?tab=advances', label: 'السلف والقروض', icon: CreditCard, permission: 'loans.view' },
      { to: '/allowances', label: 'البدلات والمزايا', icon: Coins },
      { to: '/end-of-service', label: 'مكافأة نهاية الخدمة', icon: Calculator },
    ]
  },
  {
    id: 'reports',
    label: 'التقارير',
    sublabel: 'الكشوفات والطباعة',
    icon: FileSpreadsheet,
    color: '#0d9488', // Teal
    gradient: 'from-teal-500 to-cyan-700',
    glowColor: 'rgba(13, 148, 136, 0.4)',
    badgeColor: 'bg-teal-600 text-white',
    activeBg: 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200',
    permission: 'reports.view',
    items: [
      { to: '/reports', label: 'مركز التقارير', icon: FileSpreadsheet },
      { to: '/reports?report=daily_biometrics', label: 'حضور وبصمات اليوم', icon: Clock },
      { to: '/reports?report=payroll_details', label: 'مسيرات الرواتب', icon: Wallet, permission: 'employees.salary.view' },
      { to: '/reports?report=employee_master_data', label: 'بيانات الموظفين', icon: Users },
      { to: '/reports?report=leave_report', label: 'أرصدة الإجازات', icon: CalendarDays },
      { to: '/reports?report=advances_and_loans', label: 'أقساط السلف', icon: CreditCard, permission: 'loans.view' },
      { to: '/documents-print', label: 'طباعة النماذج', icon: FileText },
      { to: '/evaluations', label: 'مؤشرات الكفاءة', icon: Award },
    ]
  },
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
      { to: '/announcements?tab=circulars', label: 'التعاميم والقرارات', icon: Megaphone },
      { to: '/announcements?tab=inbox', label: 'البريد الداخلي', icon: Mail },
      { to: '/announcements?tab=notifications', label: 'التنبيهات الإدارية', icon: Bell },
      { to: '/announcements?tab=calendar', label: 'التقويم والفعاليات', icon: CalendarDays },
    ]
  },
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
      { to: '/settings?tab=company', label: 'بيانات المنشأة', icon: Building2 },
      { to: '/settings?tab=permissions', label: 'الصلاحيات', icon: ShieldCheck },
      { to: '/settings?tab=branches', label: 'الفروع', icon: Building },
      { to: '/settings?tab=departments', label: 'الأقسام', icon: Layers },
      { to: '/settings?tab=bank_accounts', label: 'الحسابات البنكية', icon: Wallet },
      { to: '/settings?tab=salary_components', label: 'بنود الراتب', icon: Calculator },
      { to: '/settings?tab=payroll_workflow', label: 'سير الاعتماد', icon: FileCheck },
      { to: '/settings?tab=request_workflows', label: 'سير الطلبات', icon: GitBranch },
      { to: '/settings?tab=job_titles', label: 'المسميات الوظيفية', icon: Briefcase },
      { to: '/settings?tab=penalties', label: 'لائحة الجزاءات', icon: AlertTriangle },
      { to: '/settings?tab=cadre_policies', label: 'سياسات الكادر', icon: Users },
      { to: '/settings?tab=document_templates', label: 'قوالب الطباعة', icon: FileText },
      { to: '/settings?tab=official_holidays', label: 'العطلات الرسمية', icon: CalendarDays },
      { to: '/settings?tab=leave_policies', label: 'سياسات الإجازات', icon: CalendarRange },
      { to: '/settings?tab=rewards_bonuses', label: 'أنواع المكافآت', icon: Award },
      { to: '/settings?tab=deductions_rules', label: 'الحسميات والتأمينات', icon: Calculator },
      { to: '/settings?tab=advances_rules', label: 'ضوابط السلف', icon: CreditCard },
      { to: '/settings?tab=overtime_rules', label: 'العمل الإضافي', icon: Clock },
      { to: '/settings?tab=geofencing', label: 'بصمة الموقع', icon: Fingerprint },
      { to: '/settings?tab=biometric_devices', label: 'أجهزة البصمة', icon: UploadCloud },
      { to: '/settings?tab=custody_assets', label: 'العهد والأصول', icon: BookOpen },
      { to: '/settings?tab=medical_insurance', label: 'التأمين الطبي', icon: CheckCircle2 },
      { to: '/settings?tab=audit_logs', label: 'سجل العمليات', icon: ClipboardList },
      { to: '/settings?tab=api_integration', label: 'الربط البرمجي (قوى • مدد)', icon: KeyRound },
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
