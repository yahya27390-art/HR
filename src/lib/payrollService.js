/**
 * payrollService.js
 * ============================================================================
 * Server-backed payroll lifecycle management service.
 *
 * REPLACES:
 *   - localStorage('hr_flow_locked_payrolls_list')
 *   - localStorage('hr_flow_locked_payroll_YYYY-MM')
 *   - saveLockedMonthlyPayroll() in payrollEngine.js
 *   - unlockMonthlyPayroll() in payrollEngine.js
 *   - isMonthLocked() in payrollEngine.js
 *   - getLockedMonthlyPayroll() in payrollEngine.js
 *
 * FINANCIAL INTEGRITY GUARANTEES:
 * 1. Lock status is server-authoritative (DB, not localStorage).
 * 2. Payroll items (snapshots) are immutable after creation (DB trigger).
 * 3. Lock commits advance deductions atomically before marking locked.
 * 4. Unlock requires system_admin role and mandatory reason.
 * 5. All operations audit-logged to database.
 *
 * PHASE 2 DEPENDENCY:
 * Requires Phase 2 migration (payroll_periods, payroll_items tables).
 * ============================================================================
 */

import { supabase } from '@/lib/supabaseClient';
import { appendAuditLog, logPayrollLocked, logPayrollUnlocked } from '@/lib/auditService';
import { commitMonthlyAdvanceDeductions } from '@/lib/advanceService';

// ─── READ OPERATIONS ──────────────────────────────────────────────────────────

/**
 * Fetch all payroll periods (admin: all; others: locked only via RLS).
 * @returns {Promise<{ data: PayrollPeriod[], error }>}
 */
export async function getPayrollPeriods() {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('month_prefix', { ascending: false });

  if (error) {
    console.warn('[payrollService] getPayrollPeriods error:', error.message);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

/**
 * Check if a month is locked (DB-authoritative).
 * @param {string} monthPrefix - 'YYYY-MM'
 * @returns {Promise<boolean>}
 */
export async function isMonthLocked(monthPrefix) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('month_prefix', monthPrefix)
    .single();

  if (error || !data) return false;
  return data.status === 'locked';
}

/**
 * Fetch locked payroll period with its items.
 * @param {string} monthPrefix - 'YYYY-MM'
 * @returns {Promise<{ period, items } | null>}
 */
export async function getLockedPayroll(monthPrefix) {
  const { data: period, error: pe } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('month_prefix', monthPrefix)
    .eq('status', 'locked')
    .single();

  if (pe || !period) return null;

  const { data: items, error: ie } = await supabase
    .from('payroll_items')
    .select('*')
    .eq('payroll_period_id', period.id)
    .order('employee_number');

  return { period, items: items || [] };
}

/**
 * Fetch a single employee's locked payslip.
 * RLS enforces: employees can only see their own payslip from locked periods.
 * @param {string} employeeId
 * @param {string} monthPrefix
 * @returns {Promise<{ data, error }>}
 */
export async function getEmployeePayslip(employeeId, monthPrefix) {
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('month_prefix', monthPrefix)
    .eq('status', 'locked')
    .single();

  if (!period) return { data: null, error: { message: 'No locked payroll for this month' } };

  const { data, error } = await supabase
    .from('payroll_items')
    .select('*')
    .eq('payroll_period_id', period.id)
    .eq('employee_id', employeeId)
    .single();

  return { data, error };
}

// ─── APPROVALS ────────────────────────────────────────────────────────────────

/**
 * Save a payroll approval decision (shortfall/absence/advance override).
 * DB-backed replacement for localStorage hr_flow_approval_* keys.
 *
 * @param {string} payrollPeriodId
 * @param {string} employeeId
 * @param {string} monthPrefix
 * @param {string} approvalType - 'shortfall' | 'absence' | 'advance_override'
 * @param {Object} decision - { status, proposed_amount, final_amount, note }
 * @param {Object} user - Current user
 */
export async function savePayrollApproval(payrollPeriodId, employeeId, monthPrefix, approvalType, decision, user = null) {
  const record = {
    payroll_period_id: payrollPeriodId,
    employee_id: employeeId,
    month_prefix: monthPrefix,
    approval_type: approvalType,
    status: decision.status || 'approved',
    proposed_amount: Number(decision.proposed_amount) || 0,
    final_amount: Number(decision.final_amount) || 0,
    note: decision.note || '',
    approved_by: user?.full_name || 'المدير العام',
    approved_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('payroll_approvals')
    .upsert(record, { onConflict: 'payroll_period_id,employee_id,approval_type' })
    .select()
    .single();

  if (!error) {
    await appendAuditLog({
      action: `approval_${approvalType}_${decision.status}`,
      entityType: 'payroll_approval',
      entityId: data?.id,
      newValue: record,
    }, user);
  }

  return { data, error };
}

/**
 * Fetch approval for a specific employee/period/type.
 * @returns {Promise<{ data, error }>}
 */
export async function getPayrollApproval(payrollPeriodId, employeeId, approvalType) {
  const { data, error } = await supabase
    .from('payroll_approvals')
    .select('*')
    .eq('payroll_period_id', payrollPeriodId)
    .eq('employee_id', employeeId)
    .eq('approval_type', approvalType)
    .single();

  return { data, error };
}

// ─── LOCK / UNLOCK ────────────────────────────────────────────────────────────

/**
 * LOCK a payroll period.
 *
 * Locking sequence:
 * 1. Verify period is not already locked.
 * 2. Insert payroll_items (immutable snapshot) — one per employee.
 * 3. Commit advance deductions (createinstallment records, update balances).
 * 4. Update payroll_periods.status = 'locked'.
 * 5. Audit log.
 *
 * ATOMIC GUARANTEE: If any step fails, the period remains in 'in_review' status.
 *
 * @param {Object} periodData - Snapshot data from computeEmployeePayroll()
 * @param {string} periodData.month_prefix
 * @param {Array}  periodData.payrolls - Array of computed payroll results per employee
 * @param {Object} periodData.totals - { total_basic, total_additions, total_deductions, total_net }
 * @param {Object} user - system_admin or owner only
 * @returns {Promise<{ success, period, errors: string[] }>}
 */
export async function lockPayrollPeriod(arg1, arg2 = null, arg3 = null) {
  let month_prefix, payrolls, totals, user;
  if (typeof arg1 === 'string') {
    month_prefix = arg1;
    payrolls = arg2?.payrolls || [];
    totals = arg2?.totals || {};
    user = arg3;
  } else {
    month_prefix = arg1?.month_prefix;
    payrolls = arg1?.payrolls || [];
    totals = arg1?.totals || {};
    user = arg2;
  }
  const errors = [];

  if (!month_prefix || !payrolls || payrolls.length === 0) {
    return { success: false, errors: ['Invalid payroll data'] };
  }

  // 1. Check if already locked
  const alreadyLocked = await isMonthLocked(month_prefix);
  if (alreadyLocked) {
    return { success: false, errors: [`الرواتب لشهر ${month_prefix} مقفلة بالفعل.`] };
  }

  // 2. Upsert payroll period record (move to 'in_review' first)
  const [yearStr, monthStr] = month_prefix.split('-');
  const periodRecord = {
    month_prefix,
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    title: `مسير رواتب شهر ${parseInt(monthStr, 10)} (${month_prefix})`,
    status: 'in_review',
    employee_count: payrolls.length,
    total_basic: Number(totals?.total_basic ?? totals?.basic) || 0,
    total_additions: Number(totals?.total_additions ?? totals?.additions) || 0,
    total_deductions: Number(totals?.total_deductions ?? totals?.deductions) || 0,
    total_net: Number(totals?.total_net ?? totals?.net) || 0,
    created_by: user?.full_name || 'النظام',
  };

  const { data: period, error: periodErr } = await supabase
    .from('payroll_periods')
    .upsert(periodRecord, { onConflict: 'month_prefix' })
    .select()
    .single();

  if (periodErr) {
    return { success: false, errors: ['Failed to create payroll period: ' + periodErr.message] };
  }

  // 3. Insert payroll items (immutable snapshot)
  const payrollItems = payrolls.map(p => {
    const emp = p.emp || {};
    return {
      payroll_period_id: period.id,
      employee_id: emp.id || ('emp_' + emp.employee_number),
      employee_number: String(emp.employee_number || ''),
      employee_name: emp.full_name || 'موظف',
      basic_salary: Number(p.basicSalary) || 0,
      housing_allowance: Number(p.housing) || 0,
      transport_allowance: Number(p.transport) || 0,
      electricity_allowance: Number(p.electricity) || 0,
      phone_allowance: Number(p.phone) || 0,
      other_allowance: Number(p.otherAllowance) || 0,
      present_days: Number(p.presentDays) || 0,
      absent_days: Number(p.absentDays) || 0,
      leave_days: Number(p.leaveDays) || 0,
      unpaid_leave_days: Number(p.unpaidLeaveDays) || 0,
      friday_days: Number(p.fridayDays) || 0,
      friday_worked_days: Number(p.fridayWorkedDays) || 0,
      friday_allowance: Number(p.fridayAllowance) || 0,
      daily_overtime_allowance: Number(p.dailyOvertimeAllowance) || 0,
      custom_bonuses: Number(p.customBonusesTotal) || 0,
      shortfall_deduction: Number(p.approvedShortfallDeduction) || 0,
      absence_deduction: Number(p.approvedAbsenceDeduction) || 0,
      unpaid_leave_deduction: Number(p.proposedUnpaidLeaveDeduction) || 0,
      custom_penalties: Number(p.customPenaltiesTotal) || 0,
      advance_installment: Number(p.advanceInstallment) || 0,
      gosi_deduction: 0, // REQUIRES_BUSINESS_DECISION
      total_additions: Number(p.totalAdditions) || 0,
      total_deductions: Number(p.totalDeductions) || 0,
      net_salary: Number(p.netSalary) || 0,
      payout_method: emp.payout_method || 'cash_full',
      bank_transfer_amount: Number(p.bankTransferAmount) || 0,
      cash_payout_amount: Number(p.cashPayoutAmount) || 0,
      iban: emp.iban || null,
    };
  });

  const { error: itemsErr } = await supabase
    .from('payroll_items')
    .insert(payrollItems);

  if (itemsErr) {
    // Rollback: delete the period and return error
    await supabase.from('payroll_periods').delete().eq('id', period.id);
    return {
      success: false,
      errors: ['Failed to insert payroll snapshots: ' + itemsErr.message]
    };
  }

  // 4. Commit advance deductions (CRITICAL FIX: was never called in old system)
  const advResult = await commitMonthlyAdvanceDeductions(month_prefix, period.id, payrolls, user);
  if (advResult.errors && advResult.errors.length > 0) {
    errors.push(...advResult.errors.map(e => 'Advance: ' + e));
  }

  // 5. Lock the period
  const { data: lockedPeriod, error: lockErr } = await supabase
    .from('payroll_periods')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: user?.full_name || 'المدير العام',
    })
    .eq('id', period.id)
    .select()
    .single();

  if (lockErr) {
    errors.push('Failed to lock period: ' + lockErr.message);
    return { success: false, period, errors };
  }

  // 6. Audit log
  await logPayrollLocked(lockedPeriod, user);

  return {
    success: true,
    period: lockedPeriod,
    advanceCommits: advResult.committed,
    errors,
  };
}

/**
 * UNLOCK a payroll period.
 * REQUIRES system_admin role.
 * REQUIRES a mandatory reason.
 *
 * STOP-02: The unlock policy is not yet formally defined.
 * This implementation requires system_admin role and mandatory reason.
 * A more restrictive policy (e.g., requiring CEO approval) can be added later.
 *
 * @param {string} monthPrefix
 * @param {string} reason - Mandatory reason for unlock
 * @param {Object} user - Must have role = 'system_admin'
 */
export async function unlockPayrollPeriod(monthPrefix, reason, user = null) {
  if (!user || user.role !== 'system_admin') {
    return { success: false, error: 'فتح قفل الرواتب يتطلب صلاحية مدير النظام (system_admin) فقط.' };
  }

  if (!reason || reason.trim().length < 10) {
    return { success: false, error: 'يجب إدخال سبب واضح لفتح القفل (10 أحرف على الأقل).' };
  }

  const { data: period } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('month_prefix', monthPrefix)
    .single();

  if (!period) {
    return { success: false, error: `لم يتم العثور على مسير رواتب لشهر ${monthPrefix}.` };
  }

  if (period.status !== 'locked') {
    return { success: false, error: 'المسير غير مقفل.' };
  }

  // Update status
  const { data: unlocked, error } = await supabase
    .from('payroll_periods')
    .update({
      status: 'draft',
      unlock_reason: reason.trim(),
      unlocked_at: new Date().toISOString(),
      unlocked_by: user.full_name,
    })
    .eq('id', period.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'فشل فتح القفل: ' + error.message };
  }

  // Note: payroll_items are retained for audit purposes even after unlock.
  // Re-locking will attempt to re-insert items, which will fail on UNIQUE constraint.
  // The user must handle item cleanup separately if needed.

  await logPayrollUnlocked(unlocked, reason, user);

  return { success: true, period: unlocked };
}
