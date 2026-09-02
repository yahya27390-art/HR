export const PERMISSIONS = {
  // 1. Dashboard & Core
  DASHBOARD_VIEW: 'dashboard.view',
  MY_REQUESTS: 'my.requests',

  // 2. Employees & 360 Profiles
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_SALARY_VIEW: 'employees.salary.view',
  EMPLOYEES_SALARY_EDIT: 'employees.salary.edit',
  EMPLOYEES_PHOTO_EDIT: 'employees.photo.edit',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_EDIT: 'documents.edit',
  DOCUMENTS_DELETE: 'documents.delete',

  // 3. Payroll & Finance
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_EDIT: 'payroll.edit',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_LOCK: 'payroll.lock',
  PAYROLL_CLOSE: 'payroll.close',
  PAYROLL_REOPEN: 'payroll.reopen',
  PAYROLL_PRINT: 'payroll.print',
  ALLOWANCES_VIEW: 'allowances.view',
  ALLOWANCES_EDIT: 'allowances.edit',

  // 4. Advances & Loans
  LOANS_VIEW: 'loans.view',
  LOANS_CREATE: 'loans.create',
  LOANS_APPROVE_HR: 'loans.approve.hr',
  LOANS_APPROVE_FINANCIAL: 'loans.approve.financial',
  LOANS_APPROVE_FINAL: 'loans.approve.final',
  LOANS_DISBURSE: 'loans.disburse',
  ADVANCES_VIEW: 'loans.view',
  ADVANCES_CREATE: 'loans.create',
  ADVANCES_APPROVE: 'loans.approve.final',

  // 5. Attendance & GPS
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_EDIT: 'attendance.edit',
  ATTENDANCE_APPROVE: 'attendance.approve',
  ATTENDANCE_IMPORT: 'attendance.import',
  ATTENDANCE_CORRECT: 'attendance.correct',
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',
  GPS_FENCE_BYPASS: 'attendance.gps_bypass',

  // 6. Contracts & Qiwa
  CONTRACTS_VIEW: 'contracts.view',
  CONTRACTS_SIGN: 'contracts.sign',
  CONTRACTS_MANAGE: 'contracts.manage',
  CONTRACTS_RESET: 'contracts.reset',

  // 7. Leaves & Requests
  LEAVE_VIEW: 'leave.view',
  LEAVE_CREATE: 'leave.create',
  LEAVE_APPROVE: 'leave.approve',
  REQUESTS_VIEW_ALL: 'requests.view_all',
  REQUESTS_APPROVE: 'requests.approve',
  REQUESTS_CREATE: 'requests.create',

  // 8. Performance & Evaluation
  PERFORMANCE_VIEW: 'performance.view',
  PERFORMANCE_EDIT: 'performance.edit',

  // 9. Announcements & Ticker
  ANNOUNCEMENTS_SEND: 'announcements.send',
  ANNOUNCEMENTS_MANAGE: 'announcements.manage',

  // 10. Reports & KPIs
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  ALERTS_VIEW: 'alerts.view',
  AUDIT_VIEW: 'audit.view',

  // 11. System Administration & Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  APPROVALS_MANAGE: 'approvals.manage',
  BRANCHES_MANAGE: 'branches.manage',
  DEPARTMENTS_MANAGE: 'departments.manage',
};

// Categorized Permission Modules Metadata
export const PERMISSION_MODULES = [
  {
    id: 'employees',
    title: '👥 إدارة الموظفين والملفات 360°',
    description: 'التحكم في استعراض بطاقات الموظفين، الإضافة، التعديل، وحذف السجلات ورفع الصور',
    permissions: [
      { id: 'employees.view', label: 'عرض قائمة وملفات الموظفين', desc: 'إمكانية تصفح سجلات الموظفين والاطلاع على تفاصيلهم الأساسية' },
      { id: 'employees.create', label: 'إضافة موظف جديد', desc: 'إنشاء ملف موظف جديد وتعيين رقمه الوظيفي وفرعه' },
      { id: 'employees.edit', label: 'تعديل بيانات الموظف', desc: 'تحديث بيانات الهوية، المسمى، الفرع، وأرقام التواصل' },
      { id: 'employees.delete', label: 'حذف أو إنهاء خدمات موظف', desc: 'أرشفة أو حذف ملف الموظف نهائياً من النظام' },
      { id: 'employees.salary.view', label: 'الاطلاع على الرواتب والبدلات', desc: 'عرض خانة الراتب الأساسي ومسيرات الأجور' },
      { id: 'employees.salary.edit', label: 'تعديل الرواتب والبدلات', desc: 'تعديل مبالغ الراتب والبدلات الثابتة للموظف' },
      { id: 'employees.photo.edit', label: 'رفع وتحديث صورة الموظف', desc: 'صلاحية تغيير ورفع الصورة الشخصية الرسمية للموظف' },
      { id: 'documents.view', label: 'عرض مستندات الموظف', desc: 'الاطلاع على الهويات، رخص القيادة، والشهادات المرفوعة' },
      { id: 'documents.edit', label: 'رفع وتعديل المستندات', desc: 'إضافة مستندات جديدة وتحديث تواريخ انتهائها' },
      { id: 'documents.delete', label: 'حذف المستندات المرفوعة', desc: 'إلغاء وحذف أي وثيقة من ملف الموظف' },
    ]
  },
  {
    id: 'payroll',
    title: '💰 الرواتب والمسيرات والمالية',
    description: 'التحكم في احتساب الرواتب الشهرية، البدلات، الخصومات، والاعتمادات البنكية',
    permissions: [
      { id: 'payroll.view', label: 'عرض كشوفات ومسيرات الرواتب', desc: 'استعراض المسيرات الشهرية الإجمالية وتفاصيل أجور الفروع' },
      { id: 'payroll.create', label: 'إنشاء واحتساب مسير رواتب جديد', desc: 'بدء مسير شهري واحتساب الإضافي والخصومات آلياً' },
      { id: 'payroll.edit', label: 'تعديل قيود المسير والخصومات', desc: 'إضافة استقطاعات يدوية، مكافآت، وتعديل مبالغ الاستحقاق' },
      { id: 'payroll.approve', label: 'اعتماد مسير الرواتب رسمياً', desc: 'التوقيع والاعتماد النهائي لمسير الرواتب الشهري' },
      { id: 'payroll.lock', label: 'قفل المسير وترحيله محاسبياً', desc: 'منع أي تعديل إضافي على المسير بعد اعتماده' },
      { id: 'payroll.reopen', label: 'إعادة فتح مسير مقفل للتصحيح', desc: 'إلغاء قفل المسير لإجراء تسويات طارئة' },
      { id: 'payroll.print', label: 'طباعة المسيرات وكشوفات البنوك', desc: 'تصدير ملفات التحويل البنكي وطباعة مسيرات الرواتب A4' },
      { id: 'allowances.view', label: 'عرض البدلات والمكافآت', desc: 'الاطلاع على بدلات السكن، النقل، وبدل الجمعة والإضافي' },
      { id: 'allowances.edit', label: 'تعديل سياسة البدلات والمكافآت', desc: 'تعديل مبالغ البدلات الإضافية ومعادلات احتسابها' },
    ]
  },
  {
    id: 'loans',
    title: '🏦 السلف والمستحقات المالية',
    description: 'إدارة دورة طلبات السلف، الموافقات المرحلية، وصرف الشيكات والحوالات',
    permissions: [
      { id: 'loans.view', label: 'عرض سجل السلف والمستحقات', desc: 'متابعة كافة طلبات السلف المقدمة والأرصدة المتبقية' },
      { id: 'loans.create', label: 'تقديم طلب سلفة مالية', desc: 'رفع طلب سلفة جديد باسم الموظف مع خطة الأقساط' },
      { id: 'loans.approve.hr', label: 'موافقة الموارد البشرية على السلفة', desc: 'التحقق من أهلية الموظف ورصيد خدمته للموافقة المبدئية' },
      { id: 'loans.approve.financial', label: 'موافقة المحاسب والإدارة المالية', desc: 'مراجعة الملاءة المالية للمنشأة وجدولة الخصم الشهري' },
      { id: 'loans.approve.final', label: 'الاعتماد النهائي للمدير العام', desc: 'الموافقة الرسمية النهائية لصاحب العمل على صرف السلفة' },
      { id: 'loans.disburse', label: 'تنفيذ الصرف وطباعة سند الصرف A4', desc: 'صرف المبلغ نقداً أو حوالة وتوثيق السند المالي الرسمي' },
    ]
  },
  {
    id: 'attendance',
    title: '⏱️ الدوام والحضور والمواقع الجغرافية',
    description: 'متابعة بصمة الحضور والانصراف، الورديات، وتتبع الموقع الجغرافي GPS',
    permissions: [
      { id: 'attendance.view', label: 'عرض سجلات الحضور والانصراف', desc: 'متابعة توقيت الدخول والخروج اليومي وساعات العمل' },
      { id: 'attendance.edit', label: 'تسجيل وتعديل الحضور اليدوي', desc: 'إثبات الحضور أو الانصراف يدوياً في الحالات الاستثنائية' },
      { id: 'attendance.approve', label: 'اعتماد سجلات وساعات الدوام', desc: 'التصديق على ساعات الحضور واحتساب الإضافي والتأخير' },
      { id: 'attendance.correct', label: 'تصحيح بصمات الحضور الخاطئة', desc: 'معالجة نسيان البصمة وتعديل الدقائق الفعلية' },
      { id: 'shifts.view', label: 'عرض المناوبات وجداول العمل', desc: 'الاطلاع على توزيع فترات العمل (صباحي / مسائي)' },
      { id: 'shifts.manage', label: 'إدارة وتعيين الورديات والفترات', desc: 'تخصيص وردية لكل موظف وتحديد ساعات العمل الرسمية' },
      { id: 'attendance.gps_bypass', label: 'تجاوز فحص الموقع الجغرافي (GPS)', desc: 'السماح بالبصمة للموظف حتى لو كان خارج نطاق الفرع' },
    ]
  },
  {
    id: 'contracts',
    title: '📜 العقود وقوى والبنود الجزائية',
    description: 'التحكم في توثيق العقود الداخلية، منصة قوى الرسمية، والشرط الجزائي',
    permissions: [
      { id: 'contracts.view', label: 'عرض واستعراض العقود الرسمية', desc: 'الاطلاع على بنود العقد الوظيفي والمستندات المرفقة' },
      { id: 'contracts.sign', label: 'التوقيع الإلكتروني على العقد', desc: 'توقيع الموظف أو صاحب العمل إلكترونياً على العقد' },
      { id: 'contracts.manage', label: 'إدارة عقود قوى والتحقق من التوثيق', desc: 'مراجعة عقود قوى المرفوعة واعتماد صحة التوثيق' },
      { id: 'contracts.reset', label: 'إعادة تعيين العقود لغير موقعة', desc: 'إعادة حالة العقود إلى غير موقعة لطلب إعادة التوقيع' },
    ]
  },
  {
    id: 'leaves',
    title: '🏖️ الإجازات والطلبات الذاتية',
    description: 'التحكم في أرصدة الإجازات السنوية، الموافقات الإدارية، وتعديل الأيام',
    permissions: [
      { id: 'leave.view', label: 'عرض سجل وأرصدة الإجازات', desc: 'الاطلاع على رصيد الإجازة السنوية والمستهلك منها' },
      { id: 'leave.create', label: 'تقديم ومنح إجازة للموظف', desc: 'تقديم طلب إجازة جديد أو منح إجازة مباشرة من الإدارة' },
      { id: 'leave.approve', label: 'اعتماد ورفض طلبات الإجازات', desc: 'الموافقة الإدارية النهائية على خروج الموظف في إجازة' },
      { id: 'requests.view_all', label: 'استعراض كافة طلبات الموظفين', desc: 'متابعة طلبات المشاهد، خطابات التعريف، والاستئذان' },
      { id: 'requests.approve', label: 'اعتماد ومعالجة الطلبات الإدارية', desc: 'إصدار خطابات التعريف والموافقة على الاستئذان' },
    ]
  },
  {
    id: 'announcements',
    title: '📢 التعاميم وشريط الأخبار التلفزيوني',
    description: 'بث التوجيهات والقرارات الإدارية على الشريط التلفزيوني المتحرك',
    permissions: [
      { id: 'announcements.send', label: 'نشر تعميم أو قرار إداري جديد', desc: 'بث الملاحظات والتوجيهات على شريط الأخبار لجميع الموظفين' },
      { id: 'announcements.manage', label: 'تعديل وحذف وتثبيت التعاميم', desc: 'إدارة التعاميم المنشورة والتحكم في أولوية ظهورها' },
    ]
  },
  {
    id: 'reports',
    title: '📊 التقارير والمؤشرات والتدقيق',
    description: 'الاطلاع على مؤشرات الأداء المالي والإداري وتصدير البيانات',
    permissions: [
      { id: 'reports.view', label: 'عرض لوحة المؤشرات والتقارير الإحصائية', desc: 'متابعة رسوم الأداء، التكاليف، ومعدلات الانضباط' },
      { id: 'reports.export', label: 'تصدير البيانات إلى Excel و PDF', desc: 'تحميل التقارير الشاملة بصيغ قابلة للطباعة والمعالجة' },
      { id: 'audit.view', label: 'الاطلاع على سجل التدقيق والعمليات', desc: 'متابعة سجل حركات وتعديلات المستخدمين داخل النظام' },
      { id: 'alerts.view', label: 'عرض التنبيهات الإدارية العاجلة', desc: 'متابعة انتهاء الإقامات، العقود، والتأمين الطبي' },
    ]
  },
  {
    id: 'system',
    title: '⚙️ إعدادات النظام والمنشأة والصلاحيات',
    description: 'التحكم الكامل في هيكل المنشأة، الفروع، وإدارة مصفوفة الصلاحيات',
    permissions: [
      { id: 'settings.view', label: 'الاطلاع على لوحة إعدادات النظام', desc: 'الوصول إلى شاشة الإعدادات ومعاينة الخيارات' },
      { id: 'settings.edit', label: 'تعديل هوية المنشأة والشعار والثيم', desc: 'تحديث الشعار والاسم التجاري وألوان المظهر' },
      { id: 'roles.manage', label: 'إدارة وتعديل الأدوار والصلاحيات (RBAC)', desc: 'تخصيص صلاحيات كل دور وكل موظف بشكل مباشر' },
      { id: 'branches.manage', label: 'إدارة الفروع والمواقع الجغرافية', desc: 'إضافة وتعديل فروع المنشأة ومواقع بصمة الـ GPS' },
      { id: 'departments.manage', label: 'إدارة الأقسام والهيكل الإداري', desc: 'تنظيم الأقسام والمسميات الوظيفية' },
      { id: 'approvals.manage', label: 'تخصيص مسارات الاعتماد الإلكتروني', desc: 'تحديد سلسلة الموافقات المطلوبة للطلبات والمسيرات' },
    ]
  }
];

// Default Role Permissions Matrix
export const DEFAULT_ROLE_PERMISSIONS = {
  system_admin: Object.values(PERMISSIONS),

  owner: [
    'dashboard.view', 'my.requests',
    'employees.view', 'employees.create', 'employees.edit', 'employees.salary.view', 'employees.salary.edit', 'employees.photo.edit',
    'documents.view', 'documents.edit',
    'payroll.view', 'payroll.approve', 'payroll.lock', 'payroll.reopen', 'payroll.print',
    'allowances.view', 'allowances.edit',
    'loans.view', 'loans.create', 'loans.approve.final', 'loans.disburse',
    'attendance.view', 'attendance.approve', 'attendance.edit', 'attendance.correct', 'shifts.view', 'shifts.manage',
    'contracts.view', 'contracts.sign', 'contracts.manage', 'contracts.reset',
    'leave.view', 'leave.create', 'leave.approve', 'requests.view_all', 'requests.approve',
    'performance.view', 'performance.edit',
    'announcements.send', 'announcements.manage',
    'reports.view', 'reports.export', 'alerts.view', 'audit.view',
    'settings.view', 'settings.edit', 'roles.manage', 'branches.manage', 'departments.manage', 'approvals.manage'
  ],

  accountant: [
    'dashboard.view', 'my.requests',
    'employees.view', 'employees.salary.view',
    'documents.view',
    'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.close', 'payroll.print',
    'allowances.view', 'allowances.edit',
    'loans.view', 'loans.create', 'loans.approve.financial', 'loans.disburse',
    'attendance.view', 'shifts.view',
    'contracts.view',
    'leave.view', 'requests.create',
    'reports.view', 'reports.export',
    'announcements.send',
    'settings.view'
  ],

  hr: [
    'dashboard.view', 'my.requests',
    'employees.view', 'employees.create', 'employees.edit', 'employees.salary.view', 'employees.photo.edit',
    'documents.view', 'documents.edit', 'documents.delete',
    'payroll.view', 'payroll.print',
    'allowances.view',
    'loans.view', 'loans.create', 'loans.approve.hr',
    'attendance.view', 'attendance.edit', 'attendance.approve', 'attendance.import', 'attendance.correct',
    'shifts.view', 'shifts.manage',
    'contracts.view', 'contracts.manage', 'contracts.reset',
    'leave.view', 'leave.create', 'leave.approve',
    'requests.view_all', 'requests.approve', 'requests.create',
    'performance.view', 'performance.edit',
    'announcements.send', 'announcements.manage',
    'reports.view', 'reports.export', 'alerts.view',
    'branches.manage', 'departments.manage',
    'settings.view'
  ],

  employee: [
    'dashboard.view', 'my.requests', 'requests.create',
    'attendance.view',
    'contracts.view', 'contracts.sign',
    'leave.view', 'leave.create',
    'documents.view', 'performance.view'
  ]
};

export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// Dynamic RBAC Storage Key
const RBAC_STORAGE_KEY = 'hr_rbac_matrix_v3';
const USER_PERMS_KEY_PREFIX = 'hr_user_perms_override_';

/**
 * Get effective role permissions with live fallback
 */
export function getRolePermissions(role) {
  if (role === 'system_admin') {
    return Object.values(PERMISSIONS);
  }

  try {
    const saved = localStorage.getItem(RBAC_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed[role])) {
        return parsed[role];
      }
    }
  } catch (e) {}

  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.employee;
}

/**
 * Save updated role permissions to persistent storage
 */
export function saveRolePermissions(role, permissionsList) {
  try {
    const saved = localStorage.getItem(RBAC_STORAGE_KEY);
    const matrix = saved ? JSON.parse(saved) : { ...DEFAULT_ROLE_PERMISSIONS };
    matrix[role] = permissionsList;
    localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(matrix));
    window.dispatchEvent(new CustomEvent('hr_permissions_updated', { detail: { role, permissions: permissionsList } }));
    return true;
  } catch (e) {
    console.error('Failed to save role permissions', e);
    return false;
  }
}

/**
 * Reset all permissions to system defaults
 */
export function resetAllPermissionsToDefault() {
  localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
  window.dispatchEvent(new CustomEvent('hr_permissions_updated', { detail: DEFAULT_ROLE_PERMISSIONS }));
  return DEFAULT_ROLE_PERMISSIONS;
}

/**
 * Get custom permissions override for specific employee
 */
export function getEmployeeCustomOverrides(employeeId) {
  if (!employeeId) return { granted: [], revoked: [] };
  try {
    const key = USER_PERMS_KEY_PREFIX + String(employeeId).replace('emp_', '');
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { granted: [], revoked: [] };
}

/**
 * Save custom permissions override for specific employee
 */
export function saveEmployeeCustomOverrides(employeeId, overrides) {
  if (!employeeId) return false;
  try {
    const key = USER_PERMS_KEY_PREFIX + String(employeeId).replace('emp_', '');
    localStorage.setItem(key, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent('hr_permissions_updated', { detail: { employeeId, overrides } }));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * High-performance, Real-time Permission Checker
 */
export function hasPermission(user, permission) {
  if (!user) return false;

  const role = user.role || 'employee';
  const empNum = String(user.employee_number || user.id || '').replace('emp_', '');
  const email = (user.email || '').toLowerCase();

  // Super Admin bypass
  if (role === 'system_admin' || empNum === '1022' || email === 'yahya9031@gmail.com') {
    return true;
  }

  // 1. Check user-specific custom overrides
  const overrides = getEmployeeCustomOverrides(user.id || user.employee_number);
  if (overrides.revoked && overrides.revoked.includes(permission)) {
    return false;
  }
  if (overrides.granted && overrides.granted.includes(permission)) {
    return true;
  }

  // 2. Check legacy custom_permissions array on user object
  const custom = user.custom_permissions;
  if (custom && Array.isArray(custom)) {
    if (custom.includes('!' + permission)) return false;
    if (custom.includes(permission)) return true;
  }

  // 3. Check dynamic role matrix
  const rolePerms = getRolePermissions(role);
  return rolePerms.includes(permission);
}

export const hasAllPermissions = (user, perms) => perms.every(p => hasPermission(user, p));
export const hasAnyPermission  = (user, perms) => perms.some(p  => hasPermission(user, p));

export function getUserPermissions(user) {
  if (!user) return [];
  const role = user.role || 'employee';
  if (role === 'system_admin') return Object.values(PERMISSIONS);
  const base = getRolePermissions(role);
  const overrides = getEmployeeCustomOverrides(user.id || user.employee_number);
  const granted = overrides.granted || [];
  const revoked = new Set(overrides.revoked || []);
  const merged = [...base, ...granted].filter(p => !revoked.has(p));
  return [...new Set(merged)];
}

/**
 * Strict Data Isolation Guard:
 * Checks if the current user is authorized to view/manage the target employee's record.
 */
export function canAccessEmployeeData(currentUser, targetEmployee) {
  if (!currentUser) return false;
  const role = currentUser.role || 'employee';
  if (role === 'owner' || role === 'accountant' || role === 'hr' || role === 'system_admin') {
    return true;
  }
  if (!targetEmployee) return false;

  const targetId = typeof targetEmployee === 'object' ? (targetEmployee.id || targetEmployee.employee_id) : targetEmployee;
  const targetNum = typeof targetEmployee === 'object' ? targetEmployee.employee_number : targetEmployee;

  const currentId = currentUser.id || currentUser.employee_id;
  const currentNum = currentUser.employee_number;

  const clean = (v) => String(v || '').replace('emp_', '').trim();

  return (
    (currentId && clean(currentId) === clean(targetId)) ||
    (currentNum && clean(currentNum) === clean(targetNum)) ||
    (currentUser.email && targetEmployee?.email && currentUser.email.toLowerCase() === targetEmployee.email.toLowerCase())
  );
}

/**
 * Strict Salary Visibility Guard
 */
export function canViewSalary(currentUser, targetEmployee) {
  if (!currentUser) return false;
  if (hasPermission(currentUser, PERMISSIONS.EMPLOYEES_SALARY_VIEW)) return true;
  return canAccessEmployeeData(currentUser, targetEmployee);
}

export const ROLE_META = {
  system_admin: { label: 'مدير النظام (Super Admin)', labelEn: 'System Admin', color: '#8b5cf6', bgColor: 'bg-purple-100 dark:bg-purple-950/40', textColor: 'text-purple-800 dark:text-purple-200', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🛡️' },
  owner:        { label: 'المدير العام (صاحب العمل)',  labelEn: 'Owner / GM',   color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-950/40',   textColor: 'text-amber-800 dark:text-amber-200',   badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',   icon: '👑' },
  accountant:   { label: 'مدير الحسابات والمالية',     labelEn: 'Accountant',   color: '#0ea5e9', bgColor: 'bg-sky-100 dark:bg-sky-950/40',       textColor: 'text-sky-800 dark:text-sky-200',       badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',         icon: '💼' },
  hr:           { label: 'مدير الموارد البشرية',        labelEn: 'HR Manager',   color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',textColor: 'text-emerald-800 dark:text-emerald-200',badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',icon: '📋' },
  employee:     { label: 'موظف (كادر الفروع)',          labelEn: 'Employee',     color: '#6b7280', bgColor: 'bg-slate-100 dark:bg-slate-800/40',   textColor: 'text-slate-800 dark:text-slate-200',   badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',   icon: '👤' },
};

export const getRoleMeta = (user) => ROLE_META[user?.role] || ROLE_META.employee;

export function determineRoleFromEmployee(emp) {
  const num   = String(emp?.employee_number || '');
  const email = (emp?.email  || '').toLowerCase();
  const job   = (emp?.job_title || '').toLowerCase();
  if (num === '1001' || email === 'dortalsiarh@gmail.com') return 'owner';
  if (num === '1005' || email === 'hes.ham42@yahoo.com')   return 'accountant';
  if (num === '1022' || email === 'yahya9031@gmail.com')   return 'system_admin';
  if (job.includes('محاسب') || job.includes('حسابات'))     return 'accountant';
  if (job.includes('موارد بشرية') || job.includes('مسؤول')) return 'hr';
  return 'employee';
}
