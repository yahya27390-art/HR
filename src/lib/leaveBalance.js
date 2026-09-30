// Leave balance computation helpers (annual leave entitlement vs. approved annual leave used this year).

export const DEFAULT_ANNUAL_DAYS = 21;

export const AUTHORITATIVE_LEAVE_BASELINES = {
  '1002': { entitlement: 30, consumed: 11, policy: 'الاجازة السنوية (30 يوم)' },
  '1004': { entitlement: 30, consumed: 11, policy: 'الاجازة السنوية (30 يوم)' },
  '1005': { entitlement: 21, consumed: 0, policy: 'الاجازة السنوية (21 يوم)' },
  '1008': { entitlement: 21, consumed: 9, policy: 'الاجازة السنوية (21 يوم)' },
  '1011': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1015': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1017': { entitlement: 21, consumed: 3, policy: 'الاجازة السنوية (21 يوم)' },
  '1018': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1020': { entitlement: 21, consumed: 15, policy: 'الاجازة السنوية (21 يوم)' },
  '1021': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1022': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1024': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1027': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1034': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
  '1035': { entitlement: 0, consumed: 0, policy: 'اجازات بدون مرتب' },
};

export function getBaselineFor(employee) {
  if (!employee) return null;
  const num = String(employee.employee_number || employee.id || '').replace('emp_', '').trim();
  return AUTHORITATIVE_LEAVE_BASELINES[num] || null;
}

export function annualAllowanceFor(employee, policies) {
  if (employee?.annual_leave_entitlement !== undefined && employee.annual_leave_entitlement !== null && employee.annual_leave_entitlement !== '') {
    return Number(employee.annual_leave_entitlement);
  }
  const baseline = getBaselineFor(employee);
  if (baseline) return baseline.entitlement;
  if (!employee?.leave_policy) return DEFAULT_ANNUAL_DAYS;
  const p = (policies || []).find((x) => x.name === employee.leave_policy);
  if (p && p.annual_days !== undefined) return Number(p.annual_days);
  if (employee.leave_policy === 'اجازات بدون مرتب') return 0;
  if (employee.leave_policy.includes('30')) return 30;
  return DEFAULT_ANNUAL_DAYS;
}

export function matchEmployee(leave, employee) {
  if (!employee) return false;
  if (employee.id && leave.employee_id && (leave.employee_id === employee.id || leave.employee_id === `emp_${employee.employee_number}`)) return true;
  if (employee.employee_number && leave.employee_number && String(leave.employee_number) === String(employee.employee_number)) return true;
  if (employee.user_id && leave.user_id && leave.user_id === employee.user_id) return true;
  if (leave.employee_name && employee.full_name && leave.employee_name.trim() === employee.full_name.trim()) return true;
  return false;
}

export function approvedAnnualDays(leaves, employee, year = new Date().getFullYear()) {
  return (leaves || [])
    .filter((l) => (l.leave_type === 'annual' || l.leave_type === 'annual_leave' || (l.leave_type || '').includes('سنو')) && l.status === 'approved')
    .filter((l) => matchEmployee(l, employee))
    .filter((l) => (l.start_date || '').startsWith(String(year)))
    .reduce((s, l) => s + (Number(l.days_count) || Number(l.days) || 0), 0);
}

export function computeBalance(employee, policies, leaves, year = new Date().getFullYear()) {
  const baseline = getBaselineFor(employee);
  const allowance = annualAllowanceFor(employee, policies);
  const openingConsumed = (employee?.opening_consumed_leaves !== undefined && employee.opening_consumed_leaves !== null && employee.opening_consumed_leaves !== '')
    ? Number(employee.opening_consumed_leaves)
    : (baseline ? baseline.consumed : 0);
  const approvedUsed = approvedAnnualDays(leaves, employee, year);
  const used = openingConsumed + approvedUsed;
  return { 
    allowance, 
    openingConsumed,
    approvedUsed,
    used, 
    remaining: Math.max(0, allowance - used) 
  };
}