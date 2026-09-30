/**
 * auditService.js
 * ============================================================================
 * Server-backed, append-only audit trail service.
 *
 * REPLACES:
 *   - localStorage('hr_flow_audit_log')  [appendAuditLog() in payrollEngine.js]
 *   - localStorage('hr_audit_logs')      [saveAuditEntry() in payrollEngine.js]
 *
 * SECURITY:
 * - All audit writes go to public.audit_logs table (DB-backed)
 * - RLS: INSERT allowed for all authenticated users (logging own actions)
 * - RLS: SELECT restricted to admin roles
 * - Trigger on DB: UPDATE and DELETE are blocked (append-only)
 *
 * PHASE 2 DEPENDENCY:
 * Requires Phase 2 migration to have run (public.audit_logs table must exist).
 * If the table doesn't exist yet, falls back to console.warn only (no localStorage).
 * ============================================================================
 */

import { supabase } from '@/lib/supabaseClient';

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

/**
 * Append an audit log entry to the database.
 *
 * @param {Object} entry - Audit entry
 * @param {string} entry.action - Action name (e.g., 'payroll_locked', 'advance_approved')
 * @param {string} entry.entityType - Entity type (e.g., 'payroll_period', 'advance')
 * @param {string} entry.entityId - Entity ID
 * @param {any} entry.oldValue - Previous value (will be JSON stringified)
 * @param {any} entry.newValue - New value (will be JSON stringified)
 * @param {string} entry.reason - Reason for the action
 * @param {Object} user - Current user object (from AuthContext)
 * @returns {Promise<{ data, error }>}
 */
export async function appendAuditLog(entry, user = null) {
  const auditRow = {
    user_id: user?.id || null,
    user_name: user?.full_name || 'النظام',
    user_role: user?.role || 'system',
    action: entry.action || 'unknown',
    entity_type: entry.entityType || entry.entity_type || null,
    entity_id: entry.entityId || entry.entity_id || null,
    old_value: entry.oldValue !== undefined ? entry.oldValue : (entry.old_value !== undefined ? entry.old_value : null),
    new_value: entry.newValue !== undefined ? entry.newValue : (entry.new_value !== undefined ? entry.new_value : null),
    reason: entry.reason || null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([auditRow]);

    if (error) {
      // Table may not exist yet (Phase 2 migration pending)
      if (error.code === '42P01') {
        console.warn('[auditService] audit_logs table does not exist yet. Run Phase 2 migration.');
      } else {
        console.warn('[auditService] Failed to write audit log:', error.message, '| Entry:', auditRow.action);
      }
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('[auditService] Unexpected error writing audit log:', err.message);
    return { error: err };
  }
}

/**
 * Fetch audit log entries.
 * Admin roles only (enforced by RLS).
 *
 * @param {Object} filters
 * @param {string} [filters.entity_type]
 * @param {string} [filters.entity_id]
 * @param {string} [filters.user_id]
 * @param {string} [filters.action_prefix] - Match actions starting with this string
 * @param {number} [filters.limit] - Max records (default 200)
 * @returns {Promise<{ data, error }>}
 */
export async function getAuditLogs(filters = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit || 200);

  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
  if (filters.entity_id)   query = query.eq('entity_id', filters.entity_id);
  if (filters.user_id)     query = query.eq('user_id', filters.user_id);
  if (filters.action_prefix) query = query.ilike('action', filters.action_prefix + '%');

  const { data, error } = await query;

  if (error) {
    console.warn('[auditService] getAuditLogs error:', error.message);
    return { error, data: [] };
  }

  return { data: data || [], error: null };
}

/**
 * Convenience: log a payroll lock event.
 * @param {Object} period - Payroll period record
 * @param {Object} user - Current user
 */
export async function logPayrollLocked(period, user) {
  return appendAuditLog({
    action: 'payroll_locked',
    entityType: 'payroll_period',
    entityId: period.id || period.month_prefix,
    newValue: {
      month_prefix: period.month_prefix,
      employee_count: period.employee_count,
      total_net: period.total_net,
      locked_by: user?.full_name,
    },
    reason: 'Monthly payroll finalized and locked',
  }, user);
}

/**
 * Convenience: log a payroll unlock event.
 * @param {Object} period - Payroll period record
 * @param {string} reason - Reason for unlock
 * @param {Object} user - Current user
 */
export async function logPayrollUnlocked(period, reason, user) {
  return appendAuditLog({
    action: 'payroll_unlocked',
    entityType: 'payroll_period',
    entityId: period.id || period.month_prefix,
    oldValue: { status: 'locked' },
    newValue: { status: 'draft' },
    reason: reason || 'Emergency correction',
  }, user);
}

/**
 * Convenience: log an advance approval.
 * @param {Object} advance - Advance record
 * @param {string} action - 'advance_created', 'advance_approved', 'advance_rejected'
 * @param {Object} user - Current user
 */
export async function logAdvanceAction(advance, action, user) {
  return appendAuditLog({
    action,
    entityType: 'advance',
    entityId: advance.id,
    newValue: {
      employee_number: advance.employee_number,
      amount: advance.total_amount,
      monthly_installment: advance.monthly_installment,
      status: advance.status,
    },
  }, user);
}

/**
 * Convenience: log an employee data change.
 * @param {Object} employee - Employee record
 * @param {string} action - 'employee_updated', 'employee_created', 'salary_changed'
 * @param {Object} oldValue - Previous values
 * @param {Object} newValue - New values
 * @param {Object} user - Current user
 */
export async function logEmployeeChange(employee, action, oldValue, newValue, user) {
  return appendAuditLog({
    action,
    entityType: 'employee',
    entityId: employee.id,
    oldValue,
    newValue,
  }, user);
}
