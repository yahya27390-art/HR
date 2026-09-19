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
      { to: '/', label: 'لوحة التحكم والمؤشرات', icon: LayoutDashboard },
      { to: '/my-requests', label: 'طلباتي (الخدمة الذاتية)', icon: ClipboardList },
      { to: '/approvals', label: 'مركز الاعتمادات والطلبات', icon: CheckCircle2, permission: 'approvals.manage' },
      { to: '/alerts', label: 'تنبيهات الوثائق والإقامات', icon: Bell, permission: 'alerts.view' },
      { to: '/employee-profile', label: 'ملف الموظف الشامل 360°', icon: UserCheck },
      { to: '/portal', label: 'بوابة الموظف الموحدة', icon: UserCheck },
    ]
  },
  {
    id: 'employees',
    label: 'الموظفين',
    sublabel: 'السجلات والهيكل',
    icon: Users,
    color: '#10b981', // Emerald (Brand color)
    gradient: 'from-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badgeColor: 'bg-emerald-500 text-white',
    activeBg: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    permission: 'employees.view',
    items: [
      { to: '/employees', label: 'دليل وسجلات الموظفين', icon: Users },
      { to: '/contracts', label: 'العقود ومسيرات التوظيف', icon: FileText, permission: 'employees.edit' },
      { to: '/departments', label: 'الأقسام والهيكل الإداري', icon: Layers, permission: 'departments.manage' },
      { to: '/branches', label: 'الفروع ومواقع العمل', icon: GitBranch, permission: 'branches.manage' },
      { to: '/shifts', label: 'الورديات ومواعيد العمل', icon: CalendarRange, permission: 'shifts.view' },
      { to: '/allowances', label: 'سجل البدلات والمزايا الوظيفية', icon: Coins, permission: 'allowances.view' },
    ]
  },
  {
    id: 'attendance',
    label: 'الحضور',
    sublabel: 'البصمات والأجهزة',
    icon: Clock,
    color: '#f59e0b', // Amber / Orange
    gradient: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    badgeColor: 'bg-amber-500 text-white',
    activeBg: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    permission: 'attendance.view',
    items: [
      { to: '/attendance', label: 'سجل وحركات البصمات اليومية', icon: Clock },
      { to: '/devices', label: 'أجهزة البصمة الحيوية والربط', icon: Fingerprint, permission: 'shifts.manage' },
      { to: '/devices?sync=true', label: 'مزامنة وسحب الحركات فورياً', icon: Fingerprint, permission: 'shifts.manage' },
      { to: '/attendance?mode=manual', label: 'التحضير اليدوي والاستثناءات', icon: FileCheck, permission: 'attendance.edit' },
      { to: '/import-data', label: 'استيراد ورفع ملفات الحضور', icon: UploadCloud, permission: 'attendance.import' },
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
      { to: '/leave', label: 'إدارة وسجلات الإجازات', icon: CalendarDays },
      { to: '/leave-policies', label: 'سياسات واستحقاقات الأرصدة', icon: BookOpen, permission: 'settings.view' },
      { to: '/evaluations', label: 'تقييم الأداء ومؤشرات KPIs', icon: Award, permission: 'employees.view' },
      { to: '/rewards-penalties', label: 'المكافآت والجزاءات التأديبية', icon: Award, permission: 'employees.edit' },
      { to: '/approvals', label: 'مركز الاعتمادات السريعة', icon: CheckCircle2, permission: 'approvals.manage' },
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
      { to: '/payroll?stage=1', label: '1. مراجعة وتدقيق البصمات', icon: Clock },
      { to: '/payroll?stage=2', label: '2. اعتماد الاستقطاعات والخصم', icon: Wallet },
      { to: '/payroll?stage=3', label: '3. اعتماد الاستحقاقات والمكافئات', icon: Award },
      { to: '/payroll?stage=4', label: '4. المراجعة والإقفال النهائي', icon: FileSpreadsheet },
      { to: '/payroll?stage=5', label: '5. أرشيف الرواتب السابقة والمصادقة', icon: FileText },
      { to: '/payroll?tab=advances', label: 'نظام السلف والقروض الشهرية', icon: CreditCard, permission: 'loans.view' },
      { to: '/allowances', label: 'سجل البدلات والمزايا الوظيفية', icon: Coins },
      { to: '/end-of-service', label: 'حاسبة مكافأة نهاية الخدمة', icon: Calculator },
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
      { to: '/reports', label: 'مركز التقارير والكشوفات الشامل', icon: FileSpreadsheet },
      { to: '/reports?report=daily_biometrics', label: 'تقرير البصمات والحضور اليومي', icon: Clock },
      { to: '/reports?report=payroll_details', label: 'تقرير مسيرات الرواتب المفصل', icon: Wallet, permission: 'employees.salary.view' },
      { to: '/reports?report=employee_master_data', label: 'تقرير بيانات الموظفين المجمعة', icon: Users },
      { to: '/reports?report=leave_report', label: 'تقرير أرصدة وحركات الإجازات', icon: CalendarDays },
      { to: '/reports?report=advances_and_loans', label: 'تقرير السلف والأقساط المستحقة', icon: CreditCard, permission: 'loans.view' },
      { to: '/documents-print', label: 'طباعة النماذج والخطابات الرسمية', icon: FileText },
      { to: '/evaluations', label: 'تقارير مؤشرات الأداء والكفاءة', icon: Award },
    ]
  },
  {
    id: 'communication',
    label: 'التواصل',
    sublabel: 'التعاميم والبريد',
    icon: MessageSquare,
    color: '#ec4899', // Pink / Rose
    gradient: 'from-pink-500 to-rose-600',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    badgeColor: 'bg-pink-500 text-white',
    activeBg: 'bg-pink-50 text-pink-900 dark:bg-pink-950/40 dark:text-pink-200',
    permission: 'announcements.send',
    items: [
      { to: '/announcements?tab=circulars', label: 'التعاميم والقرارات الإدارية', icon: Megaphone },
      { to: '/announcements?tab=inbox', label: 'البريد الداخلي والمراسلات', icon: Mail },
      { to: '/announcements?tab=notifications', label: 'التنبيهات الإدارية العامة', icon: Bell },
      { to: '/announcements?tab=calendar', label: 'التقويم والفعاليات الرسمية', icon: CalendarDays },
    ]
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    sublabel: 'المنشأة والربط',
    icon: Settings,
    color: '#475569', // Slate / Titanium
    gradient: 'from-slate-600 to-slate-800',
    glowColor: 'rgba(71, 85, 105, 0.4)',
    badgeColor: 'bg-slate-600 text-white',
    activeBg: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    permission: 'settings.view',
    items: [
      { to: '/settings?tab=company', label: 'إدارة المنشأة والاشتراك', icon: Building2 },
      { to: '/settings?tab=permissions', label: 'الصلاحيات والمجموعات الإدارية', icon: ShieldCheck },
      { to: '/settings?tab=branches', label: 'إدارة الفروع ومواقع العمل', icon: Building },
      { to: '/settings?tab=departments', label: 'الهيكل والأقسام الداخلية', icon: Layers },
      { to: '/settings?tab=bank_accounts', label: 'الحسابات المصرفية والأيبان', icon: Wallet },
      { to: '/settings?tab=salary_components', label: 'بنود الراتب والبدلات المعيارية', icon: Calculator },
      { to: '/settings?tab=payroll_workflow', label: 'سير اعتماد مسيرات الرواتب', icon: FileCheck },
      { to: '/settings?tab=request_workflows', label: 'سير عمل وموافقات الطلبات', icon: GitBranch },
      { to: '/settings?tab=job_titles', label: 'المسميات والدرجات الوظيفية', icon: Briefcase },
      { to: '/settings?tab=penalties', label: 'لائحة الجزاءات والمخالفات', icon: AlertTriangle },
      { to: '/settings?tab=cadre_policies', label: 'سياسات الكادر الإداري', icon: Users },
      { to: '/settings?tab=document_templates', label: 'قوالب ونماذج الطباعة الرسمية', icon: FileText },
      { to: '/settings?tab=official_holidays', label: 'العطلات الرسمية والأعياد', icon: CalendarDays },
      { to: '/settings?tab=leave_policies', label: 'إعدادات الإجازات والأرصدة', icon: CalendarRange },
      { to: '/settings?tab=rewards_bonuses', label: 'أنواع المكافآت والتحفيز', icon: Award },
      { to: '/settings?tab=deductions_rules', label: 'الحسميات ونسب التأمينات الاجتماعية', icon: Calculator },
      { to: '/settings?tab=advances_rules', label: 'ضوابط السلف والقروض الشهرية', icon: CreditCard },
      { to: '/settings?tab=overtime_rules', label: 'العمل الإضافي وبدل الجمعات', icon: Clock },
      { to: '/settings?tab=geofencing', label: 'النطاق الجغرافي وبصمة الموقع', icon: Fingerprint },
      { to: '/settings?tab=biometric_devices', label: 'إعدادات شبكة أجهزة البصمة', icon: UploadCloud },
      { to: '/settings?tab=custody_assets', label: 'إدارة العهد والأصول المستلمة', icon: BookOpen },
      { to: '/settings?tab=medical_insurance', label: 'فئات وسياسات التأمين الطبي', icon: CheckCircle2 },
      { to: '/settings?tab=audit_logs', label: 'سجلات المراقبة وتدقيق العمليات', icon: ClipboardList },
      { to: '/settings?tab=api_integration', label: 'الربط البرمجي (منصة قوى • مدد)', icon: KeyRound },
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
