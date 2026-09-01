
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_SALARY_VIEW: 'employees.salary.view',
  EMPLOYEES_SALARY_EDIT: 'employees.salary.edit',
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_EDIT: 'attendance.edit',
  ATTENDANCE_APPROVE: 'attendance.approve',
  ATTENDANCE_IMPORT: 'attendance.import',
  ATTENDANCE_CORRECT: 'attendance.correct',
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_EDIT: 'payroll.edit',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_LOCK: 'payroll.lock',
  PAYROLL_CLOSE: 'payroll.close',
  PAYROLL_REOPEN: 'payroll.reopen',
  PAYROLL_PRINT: 'payroll.print',
  LOANS_VIEW: 'loans.view',
  LOANS_CREATE: 'loans.create',
  LOANS_APPROVE_HR: 'loans.approve.hr',
  LOANS_APPROVE_FINANCIAL: 'loans.approve.financial',
  LOANS_APPROVE_FINAL: 'loans.approve.final',
  LOANS_DISBURSE: 'loans.disburse',
  ADVANCES_VIEW: 'loans.view',
  ADVANCES_CREATE: 'loans.create',
  ADVANCES_APPROVE: 'loans.approve.final',
  LEAVE_VIEW: 'leave.view',
  LEAVE_CREATE: 'leave.create',
  LEAVE_APPROVE: 'leave.approve',
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_MANAGE: 'shifts.manage',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_EDIT: 'documents.edit',
  DOCUMENTS_DELETE: 'documents.delete',
  PERFORMANCE_VIEW: 'performance.view',
  PERFORMANCE_EDIT: 'performance.edit',
  REQUESTS_VIEW_ALL: 'requests.view_all',
  REQUESTS_APPROVE: 'requests.approve',
  REQUESTS_CREATE: 'requests.create',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  ALERTS_VIEW: 'alerts.view',
  APPROVALS_MANAGE: 'approvals.manage',
  ALLOWANCES_VIEW: 'allowances.view',
  ALLOWANCES_EDIT: 'allowances.edit',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_VIEW: 'audit.view',
  BRANCHES_MANAGE: 'branches.manage',
  DEPARTMENTS_MANAGE: 'departments.manage',
  ANNOUNCEMENTS_SEND: 'announcements.send',
  MY_REQUESTS: 'my.requests',
};

export const ROLE_PERMISSIONS = {
  system_admin: Object.values(PERMISSIONS),

  owner: [
    'dashboard.view', 'employees.view', 'employees.salary.view',
    'attendance.view', 'attendance.approve',
    'payroll.view', 'payroll.approve', 'payroll.lock', 'payroll.reopen', 'payroll.print',
    'loans.view', 'loans.approve.final',
    'leave.view', 'leave.approve',
    'shifts.view', 'documents.view', 'performance.view', 'performance.edit',
    'requests.view_all', 'requests.approve',
    'reports.view', 'reports.export',
    'alerts.view', 'approvals.manage',
    'allowances.view', 'allowances.edit', 'settings.view',
    'announcements.send', 'my.requests', 'audit.view'
  ],

  accountant: [
    'dashboard.view', 'employees.view', 'employees.salary.view',
    'attendance.view',
    'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.close', 'payroll.print',
    'loans.view', 'loans.approve.financial', 'loans.disburse',
    'leave.view', 'shifts.view',
    'reports.view', 'reports.export',
    'allowances.view', 'allowances.edit', 'approvals.manage', 'settings.view', 'my.requests',
  ],

  hr: [
    'dashboard.view', 'employees.view', 'employees.create', 'employees.edit',
    'employees.salary.view',
    'attendance.view', 'attendance.edit', 'attendance.approve', 'attendance.import', 'attendance.correct',
    'payroll.view', 'payroll.print',
    'loans.view', 'loans.create', 'loans.approve.hr',
    'leave.view', 'leave.create', 'leave.approve',
    'shifts.view', 'shifts.manage',
    'documents.view', 'documents.edit', 'performance.view', 'performance.edit',
    'requests.view_all', 'requests.approve', 'requests.create',
    'reports.view', 'reports.export',
    'alerts.view', 'approvals.manage',
    'allowances.view', 'allowances.edit',
    'branches.manage', 'departments.manage',
    'announcements.send', 'settings.view', 'my.requests',
  ],

  employee: [
    'dashboard.view', 'my.requests', 'requests.create', 'leave.create', 'attendance.view', 'documents.view', 'performance.view'
  ],
};

export function hasPermission(user, permission) {
  if (!user) return false;
  const role = user.role || 'employee';
  if (role === 'system_admin') return true;
  const custom = user.custom_permissions;
  if (custom && Array.isArray(custom)) {
    if (custom.includes('!' + permission)) return false;
    if (custom.includes(permission)) return true;
  }
  const rolePerms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.employee;
  return rolePerms.includes(permission);
}

export const hasAllPermissions = (user, perms) => perms.every(p => hasPermission(user, p));
export const hasAnyPermission  = (user, perms) => perms.some(p  => hasPermission(user, p));

export function getUserPermissions(user) {
  if (!user) return [];
  const base = ROLE_PERMISSIONS[user.role || 'employee'] || [];
  const custom = (user.custom_permissions || []).filter(p => !p.startsWith('!'));
  return [...new Set([...base, ...custom])];
}

/**
 * Strict Data Isolation Guard:
 * Checks if the current user is authorized to view/manage the target employee's record.
 * Employees can ONLY ever access their own profile.
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
 * Strict Salary Visibility Guard:
 * Authorized roles with 'employees.salary.view' OR the employee themselves in their portal.
 */
export function canViewSalary(currentUser, targetEmployee) {
  if (!currentUser) return false;
  if (hasPermission(currentUser, PERMISSIONS.EMPLOYEES_SALARY_VIEW)) return true;
  return canAccessEmployeeData(currentUser, targetEmployee);
}

export const ROLE_META = {
  system_admin: { label: 'مدير النظام',     labelEn: 'System Admin', color: '#8b5cf6', bgColor: 'bg-purple-100 dark:bg-purple-950/40',  textColor: 'text-purple-800 dark:text-purple-200',  badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',  icon: '🛡️' },
  owner:        { label: 'صاحب العمل',      labelEn: 'Owner / GM',   color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-950/40',    textColor: 'text-amber-800 dark:text-amber-200',    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',    icon: '👑' },
  accountant:   { label: 'المحاسب',         labelEn: 'Accountant',   color: '#0ea5e9', bgColor: 'bg-sky-100 dark:bg-sky-950/40',        textColor: 'text-sky-800 dark:text-sky-200',        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',          icon: '🧾' },
  hr:           { label: 'الموارد البشرية', labelEn: 'HR',           color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-950/40', textColor: 'text-emerald-800 dark:text-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '👥' },
  employee:     { label: 'موظف',            labelEn: 'Employee',     color: '#6b7280', bgColor: 'bg-slate-100 dark:bg-slate-800/40',    textColor: 'text-slate-800 dark:text-slate-200',    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',    icon: '👤' },
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
