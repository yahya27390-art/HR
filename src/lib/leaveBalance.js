// Leave balance computation helpers (annual leave entitlement vs. approved annual leave used this year).

export const DEFAULT_ANNUAL_DAYS = 21;

export function annualAllowanceFor(employee, policies) {
  if (!employee?.leave_policy) return DEFAULT_ANNUAL_DAYS;
  const p = (policies || []).find((x) => x.name === employee.leave_policy);
  return p && Number(p.annual_days) ? Number(p.annual_days) : DEFAULT_ANNUAL_DAYS;
}

export function matchEmployee(leave, employee) {
  if (!employee) return false;
  if (employee.user_id && leave.user_id && leave.user_id === employee.user_id) return true;
  if (leave.employee_name && leave.employee_name === employee.full_name) return true;
  return false;
}

export function approvedAnnualDays(leaves, employee, year = new Date().getFullYear()) {
  return (leaves || [])
    .filter((l) => l.leave_type === 'annual' && l.status === 'approved')
    .filter((l) => matchEmployee(l, employee))
    .filter((l) => (l.start_date || '').startsWith(String(year)))
    .reduce((s, l) => s + (Number(l.days) || 0), 0);
}

export function computeBalance(employee, policies, leaves, year = new Date().getFullYear()) {
  const allowance = annualAllowanceFor(employee, policies);
  const used = approvedAnnualDays(leaves, employee, year);
  return { allowance, used, remaining: Math.max(0, allowance - used) };
}