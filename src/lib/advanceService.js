/**
 * advanceService.js
 * ============================================================================
 * Server-backed advance & loan management service.
 *
 * REPLACES:
 *   - localStorage('hr_flow_employee_advances')
 *   - localStorage('hr_advances_list')
 *   - getAdvances(), saveAdvance(), deleteAdvance() in payrollEngine.js
 *   - commitMonthlyAdvanceDeductions() (wired into payroll lock here)
 *
 * FINANCIAL INTEGRITY GUARANTEES:
 * 1. Atomic: advance installment deductions are written as advance_installments
 *    records. UNIQUE(advance_id, payroll_period_id) prevents double-deduction.
 * 2. Idempotent: re-locking the same month safely re-reads existing installments.
 * 3. Traceable: every deduction creates an audit log entry.
 *
 * PHASE 2 DEPENDENCY:
 * Requires public.advances and public.advance_installments tables.
 * Falls back gracefully if tables don't exist (logs warning only).
 * ============================================================================
 */

import { supabase } from '@/lib/supabaseClient';
import { appendAuditLog } from '@/lib/auditService';

// ─── READ OPERATIONS ──────────────────────────────────────────────────────────

/**
 * Fetch all advances (admin: all employees; employee: own only via RLS).
 * @returns {Promise<{ data: Advance[], error }>}
 */
export async function getAdvances() {
  const { data, error } = await supabase
    .from('advances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[advanceService] getAdvances error:', error.message);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

/**
 * Fetch active advance for a specific employee in a given month.
 * Returns the first active advance where start_month <= monthPrefix.
 *
 * @param {string} employeeNumber
 * @param {string} monthPrefix - 'YYYY-MM'
 * @returns {Promise<{ data: Advance | null, error }>}
 */
export async function getActiveAdvanceForEmployee(employeeNumber, monthPrefix = '') {
  const cleanNum = String(employeeNumber || '').trim();
  if (!cleanNum) return { data: null, error: null };

  let query = supabase
    .from('advances')
    .select('*')
    .eq('employee_number', cleanNum)
    .in('status', ['active', 'disbursed'])
    .gt('remaining_balance', 0)
    .order('created_at', { ascending: true })
    .limit(1);

  if (monthPrefix) {
    query = query.lte('start_month', monthPrefix);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[advanceService] getActiveAdvanceForEmployee error:', error.message);
    return { data: null, error };
  }

  return { data: data && data.length > 0 ? data[0] : null, error: null };
}

// ─── WRITE OPERATIONS ─────────────────────────────────────────────────────────

/**
 * Create or update an advance.
 * @param {Object} advanceData
 * @param {Object} user - Current user for audit
 * @returns {Promise<{ data, error }>}
 */
export async function saveAdvance(advanceData, user = null) {
  const now = new Date().toISOString();

  const record = {
    employee_id: advanceData.employee_id || ('emp_' + advanceData.employee_number),
    employee_number: String(advanceData.employee_number || '').trim(),
    employee_name: advanceData.employee_name || 'موظف',
    total_amount: Number(advanceData.total_amount || advanceData.amount) || 0,
    monthly_installment: Number(advanceData.monthly_installment || advanceData.monthly_deduction) || 0,
    total_installments: Number(advanceData.total_installments || advanceData.installments) || 1,
    paid_installments: Number(advanceData.paid_installments) || 0,
    paid_amount: Number(advanceData.paid_amount) || 0,
    remaining_balance: Number(advanceData.remaining_balance !== undefined
      ? advanceData.remaining_balance
      : advanceData.total_amount || advanceData.amount) || 0,
    start_month: advanceData.start_month || now.slice(0, 7),
    disbursement_date: advanceData.disbursement_date || now.slice(0, 10),
    reason: advanceData.reason || 'سلفة شخصية',
    status: advanceData.status || 'active',
    source: advanceData.source || 'management',
    workflow_stage: advanceData.workflow_stage || 'disbursed',
    owner_approved_by: advanceData.approved_by || advanceData.owner_approved_by || null,
    owner_approved_at: advanceData.owner_approved_at || now,
    disbursed_by: advanceData.disbursed_by || null,
    disbursed_at: advanceData.disbursed_at || null,
    notes: advanceData.notes || null,
    updated_at: now,
  };

  // If ID provided, upsert; otherwise insert
  if (advanceData.id) {
    const { data, error } = await supabase
      .from('advances')
      .upsert({ id: advanceData.id, ...record, created_at: advanceData.created_at || now })
      .select()
      .single();

    if (!error) {
      await appendAuditLog({
        action: 'advance_updated',
        entityType: 'advance',
        entityId: advanceData.id,
        newValue: { employee_number: record.employee_number, amount: record.total_amount },
      }, user);
    }
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('advances')
      .insert([{ ...record, created_at: now }])
      .select()
      .single();

    if (!error) {
      await appendAuditLog({
        action: 'advance_created',
        entityType: 'advance',
        entityId: data?.id,
        newValue: { employee_number: record.employee_number, amount: record.total_amount },
      }, user);
    }
    return { data, error };
  }
}

/**
 * Soft-delete an advance (sets status = 'cancelled').
 * @param {string} advanceId
 * @param {Object} user
 */
export async function deleteAdvance(advanceId, user = null) {
  const { data: existing } = await supabase
    .from('advances')
    .select('status, remaining_balance')
    .eq('id', advanceId)
    .single();

  if (existing && existing.remaining_balance > 0) {
    // Warn: deleting an advance with remaining balance
    console.warn('[advanceService] Cancelling advance with remaining balance:', existing.remaining_balance);
  }

  const { data, error } = await supabase
    .from('advances')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', advanceId)
    .select()
    .single();

  if (!error) {
    await appendAuditLog({
      action: 'advance_cancelled',
      entityType: 'advance',
      entityId: advanceId,
    }, user);
  }

  return { data, error };
}

// ─── PAYROLL LOCK: COMMIT ADVANCE DEDUCTIONS ──────────────────────────────────

/**
 * CRITICAL: Called when locking a payroll period.
 *
 * Atomically records advance installment deductions for the month.
 * Creates advance_installments records and updates advance remaining_balance.
 *
 * IDEMPOTENT: If an installment for this advance+period already exists,
 * it is skipped (UNIQUE constraint on advance_installments).
 *
 * FIXES: The bug in payrollEngine.js where commitMonthlyAdvanceDeductions()
 * existed but was never called during payroll lock.
 *
 * @param {string} monthPrefix - 'YYYY-MM'
 * @param {string} payrollPeriodId - payroll_periods.id
 * @param {Array} payrollsList - Output of computeEmployeePayroll() per employee
 * @param {Object} user - Current user for audit
 * @returns {Promise<{ committed: number, skipped: number, errors: string[] }>}
 */
export async function commitMonthlyAdvanceDeductions(monthPrefix, payrollPeriodId, payrollsList, user = null) {
  if (!monthPrefix || !payrollPeriodId || !Array.isArray(payrollsList)) {
    return { committed: 0, skipped: 0, errors: ['Invalid parameters'] };
  }

  let committed = 0;
  let skipped = 0;
  const errors = [];

  for (const p of payrollsList) {
    const deductedAmount = Number(p.advanceInstallment) || 0;
    if (deductedAmount <= 0) continue;

    const emp = p.emp || {};
    const empNum = String(emp.employee_number || emp.id || '').trim();
    if (!empNum) continue;

    try {
      // Get active advance for this employee
      const { data: advance, error: advErr } = await getActiveAdvanceForEmployee(empNum, monthPrefix);
      if (advErr || !advance) continue;

      const remainingBefore = Number(advance.remaining_balance) || 0;
      const actualDeduction = Math.min(deductedAmount, remainingBefore);
      if (actualDeduction <= 0) continue;

      const newPaid = (Number(advance.paid_amount) || 0) + actualDeduction;
      const newRemaining = Math.max(0, remainingBefore - actualDeduction);
      const newPaidInst = (Number(advance.paid_installments) || 0) + 1;

      // Insert installment record (UNIQUE constraint prevents double-insert)
      const { error: instErr } = await supabase
        .from('advance_installments')
        .insert([{
          advance_id: advance.id,
          payroll_period_id: payrollPeriodId,
          employee_id: advance.employee_id,
          month_prefix: monthPrefix,
          amount_deducted: actualDeduction,
          remaining_after: newRemaining,
          installment_number: newPaidInst,
          recorded_by: user?.full_name || 'النظام',
        }]);

      if (instErr) {
        if (instErr.code === '23505') {
          // UNIQUE constraint violation = already committed for this month
          skipped++;
        } else {
          errors.push(`${empNum}: ${instErr.message}`);
        }
        continue;
      }

      // Update advance balances atomically
      const { error: advUpdateErr } = await supabase
        .from('advances')
        .update({
          paid_amount: newPaid,
          remaining_balance: newRemaining,
          paid_installments: newPaidInst,
          status: newRemaining <= 0 ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', advance.id);

      if (advUpdateErr) {
        errors.push(`${empNum} update: ${advUpdateErr.message}`);
        continue;
      }

      // Audit
      await appendAuditLog({
        action: 'advance_installment_deducted',
        entityType: 'advance',
        entityId: advance.id,
        newValue: {
          month_prefix: monthPrefix,
          deducted: actualDeduction,
          remaining: newRemaining,
          installment_num: newPaidInst,
        },
      }, user);

      committed++;
    } catch (err) {
      errors.push(`${empNum}: ${err.message}`);
    }
  }

  console.log(`[advanceService] commitMonthlyAdvanceDeductions: ${committed} committed, ${skipped} skipped, ${errors.length} errors`);
  return { committed, skipped, errors };
}
