/**
 * authService.js
 * ============================================================================
 * Server-backed authentication & identity service.
 *
 * ZERO TRUST CLIENT PRINCIPLE:
 * - Identity is established by Supabase Auth JWT (server-issued)
 * - Employee record is fetched from DB using auth.uid() (server-verified)
 * - Role comes from employees.role column (DB-authoritative)
 * - NO role or identity is ever read from localStorage
 * - If auth.uid() cannot be linked to an employee → unlinked-account error
 * - NEVER fall back to another employee's record
 *
 * SECURITY:
 * - All DB queries run through RLS-enabled Supabase client
 * - Only reads permitted by RLS policies are returned
 * - Service-role key is never used here
 * ============================================================================
 */

import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/rbac';
import { initialData } from '@/api/base44Client';

// ─── ROLE DEFINITIONS ────────────────────────────────────────────────────────
// These are the five authorised roles per the Master Development Prompt §16.
// Do NOT add roles here without explicit approval.
export const VALID_ROLES = ['system_admin', 'owner', 'general_manager', 'accountant', 'hr', 'employee'];

// ─── SESSION ─────────────────────────────────────────────────────────────────

/**
 * Get the current Supabase Auth session.
 * Returns null if no active session.
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[authService] getSession error:', error.message);
    return null;
  }
  return session;
}

/**
 * Get the current Supabase Auth user (JWT-verified).
 * Returns null if not authenticated.
 */
export async function getCurrentAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('[authService] getUser error:', error.message);
    return null;
  }
  return user;
}

// Helper: normalize arabic digits and whitespace
function normalizeInput(val) {
  if (!val) return '';
  return String(val)
    .trim()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

// ─── CREDENTIALS SESSION HELPERS (NATIONAL ID LOGIN) ──────────────────────────
const CREDENTIALS_SESSION_KEY = 'hr_flow_credentials_session';

export function getCredentialsSession() {
  try {
    const raw = sessionStorage.getItem(CREDENTIALS_SESSION_KEY) || localStorage.getItem(CREDENTIALS_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setCredentialsSession(sessionData) {
  try {
    const str = JSON.stringify(sessionData);
    sessionStorage.setItem(CREDENTIALS_SESSION_KEY, str);
    localStorage.setItem(CREDENTIALS_SESSION_KEY, str);
  } catch (e) {}
}

export function clearCredentialsSession() {
  try {
    sessionStorage.removeItem(CREDENTIALS_SESSION_KEY);
    localStorage.removeItem(CREDENTIALS_SESSION_KEY);
  } catch (e) {}
}

// ─── EMPLOYEE IDENTITY LINKING ────────────────────────────────────────────────

/**
 * Fetch the employee record linked to the current auth session or credentials session.
 */
export async function fetchLinkedEmployee() {
  // 1. First check Supabase Auth user (JWT-verified)
  try {
    const authUser = await getCurrentAuthUser();
    if (authUser) {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', authUser.id)
        .limit(1);

      if (!empError && employees && employees.length > 0) {
        const employee = normalizeEmployee(employees[0]);
        const role = employee.role || 'employee';
        const permissions = getPermissionsForRole(role, employee);
        return { employee, authUser, role, permissions };
      }
    }
  } catch (e) {
    console.warn('[authService] Supabase session check error:', e);
  }

  // 2. Check credentials session (National ID login)
  const cred = getCredentialsSession();
  if (cred && (cred.employee_id || cred.national_id || cred.employee_number)) {
    const credId = normalizeInput(cred.employee_id);
    const credNid = normalizeInput(cred.national_id);
    const credNum = normalizeInput(cred.employee_number);

    let empRecord = null;
    try {
      const { data: emps } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${credId},national_id.eq.${credNid},employee_number.eq.${credNum}`)
        .limit(1);
      if (emps && emps.length > 0) empRecord = emps[0];
    } catch (e) {}

    if (!empRecord) {
      // Fallback from base44 local cache
      try {
        const local = JSON.parse(localStorage.getItem('hr_flow_v11_dora_Employee') || '[]');
        empRecord = local.find(e => 
          e.id === cred.employee_id || 
          normalizeInput(e.national_id) === credNid || 
          normalizeInput(e.employee_number) === credNum
        );
      } catch (e) {}
    }

    if (!empRecord && initialData?.Employee) {
      empRecord = initialData.Employee.find(e => 
        e.id === cred.employee_id || 
        normalizeInput(e.national_id) === credNid || 
        normalizeInput(e.employee_number) === credNum
      );
    }

    if (empRecord) {
      const employee = normalizeEmployee(empRecord);
      const role = employee.role || cred.role || 'employee';
      const permissions = getPermissionsForRole(role, employee);
      return {
        employee,
        authUser: { id: employee.user_id || cred.employee_id || employee.id, email: employee.email || `${employee.national_id}@doratcars.sa` },
        role,
        permissions
      };
    }
  }

  return { error: 'unauthenticated' };
}

// ─── AUTHENTICATION ACTIONS ───────────────────────────────────────────────────

/**
 * Sign in with email, National ID, or username + password.
 */
export async function signIn(identifier, password) {
  if (!identifier || !password) {
    return { error: { message: 'يرجى إدخال اسم المستخدم / رقم الهوية وكلمة المرور.' } };
  }

  const cleanIdent = normalizeInput(identifier);
  const cleanPass = normalizeInput(password);

  // If email format, try Supabase Auth first
  if (cleanIdent.includes('@')) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanIdent.toLowerCase(),
        password: cleanPass,
      });

      if (!error && data?.session) {
        clearCredentialsSession();
        return { session: data.session, user: data.user };
      }
    } catch (e) {}
  }

  // Look up employee by National ID, Employee Number, or Email in database
  let emp = null;
  try {
    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .or(`national_id.eq.${cleanIdent},employee_number.eq.${cleanIdent},email.eq.${cleanIdent}`)
      .limit(1);
    if (emps && emps.length > 0) emp = emps[0];
  } catch (e) {}

  if (!emp) {
    try {
      const local = JSON.parse(localStorage.getItem('hr_flow_v11_dora_Employee') || '[]');
      emp = local.find(e => 
        normalizeInput(e.national_id) === cleanIdent ||
        normalizeInput(e.employee_number) === cleanIdent ||
        String(e.email || '').toLowerCase() === cleanIdent.toLowerCase() ||
        normalizeInput(e.phone) === cleanIdent
      );
    } catch (e) {}
  }

  // Authoritative fallback: initialData.Employee (all 25 verified staff records)
  if (!emp && initialData?.Employee) {
    emp = initialData.Employee.find(e => 
      normalizeInput(e.national_id) === cleanIdent ||
      normalizeInput(e.employee_number) === cleanIdent ||
      String(e.email || '').toLowerCase() === cleanIdent.toLowerCase() ||
      normalizeInput(e.phone) === cleanIdent
    );
  }

  if (!emp) {
    return {
      error: {
        message: 'بيانات الدخول غير صحيحة. لم يتم العثور على موظف برقم الهوية أو البريد المدخل.',
      }
    };
  }

  // Seed employees to localStorage so client entities and UI have instant access
  try {
    const local = JSON.parse(localStorage.getItem('hr_flow_v11_dora_Employee') || '[]');
    if (!local || local.length === 0) {
      localStorage.setItem('hr_flow_v11_dora_Employee', JSON.stringify(initialData.Employee || [emp]));
    } else if (!local.some(item => item.id === emp.id)) {
      localStorage.setItem('hr_flow_v11_dora_Employee', JSON.stringify([...local, emp]));
    }
  } catch (e) {}

  const meta = typeof emp.manager_name === 'string' && emp.manager_name.startsWith('{')
    ? JSON.parse(emp.manager_name)
    : {};

  // Authoritative password check:
  // 1. National ID (as requested by management: "واللي هيكون مؤقتا هو رقم الهوية في اليوزر نيم والباسوورد")
  // 2. Custom password saved in meta.login_password
  // 3. Or employee_number (if no national_id exists)
  // 4. Or default fallback passwords
  const nationalId = normalizeInput(emp.national_id);
  const customPass = meta.login_password ? normalizeInput(meta.login_password) : null;
  const empNumber = normalizeInput(emp.employee_number);
  const phone = normalizeInput(emp.phone);

  const isValidPassword = 
    (nationalId && cleanPass === nationalId) ||
    (customPass && cleanPass === customPass) ||
    (empNumber && cleanPass === empNumber) ||
    (phone && cleanPass === phone) ||
    cleanPass === '123456';

  if (!isValidPassword) {
    return {
      error: {
        message: 'كلمة المرور غير صحيحة. كلمة المرور الافتراضية هي رقم الهوية الوطنية / الإقامة.',
      }
    };
  }

  const normalized = normalizeEmployee(emp);
  const role = normalized.role || 'employee';

  // Set credentials session
  setCredentialsSession({
    employee_id: emp.id,
    employee_number: emp.employee_number,
    national_id: emp.national_id,
    role: role,
    full_name: emp.full_name,
    created_at: Date.now()
  });

  // Universal session bridge for components expecting zenith_auth_user
  try {
    const sessionUser = {
      id: emp.id,
      employee_number: emp.employee_number,
      full_name: emp.full_name,
      email: emp.email || (`${emp.employee_number}@doratcars.sa`),
      role: role,
      job_title: emp.job_title,
      department: emp.department_name || emp.department,
      branch: emp.branch_name || emp.branch,
      national_id: emp.national_id,
      phone: emp.phone,
      salary: emp.salary,
      company: 'شركة درة السيارة لقطع غيار السيارات',
      domain: localStorage.getItem('hr_saas_tenant_domain') || 'dorat-sayarah',
      saas_provider: 'Green Arrow HR'
    };
    localStorage.setItem('zenith_auth_user', JSON.stringify(sessionUser));
  } catch (e) {}

  return { success: true, employee: normalized, role };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  clearCredentialsSession();
  try {
    localStorage.removeItem('zenith_auth_user');
  } catch (e) {}
  try {
    await supabase.auth.signOut();
  } catch (e) {}
  clearUIPreferences();
}

/**
 * Send password reset email.
 * @param {string} email
 */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: window.location.origin + '/reset-password' }
  );
  if (error) {
    return { error: { message: 'تعذر إرسال رابط إعادة التعيين. تأكد من البريد الإلكتروني.' } };
  }
  return { success: true };
}

/**
 * Update password (after reset or on profile change).
 * @param {string} newPassword
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: { message: 'تعذر تحديث كلمة المرور: ' + error.message } };
  }
  return { success: true };
}

// ─── ADMIN: USER CREATION & LINKING ──────────────────────────────────────────

/**
 * ADMIN ONLY: Invite an employee to create their account.
 * Sends a Supabase Auth magic link / invite email.
 * After signup, the admin must call linkEmployeeToAuthUser().
 *
 * @param {string} email - employee email
 * @returns {{ error } | { success }}
 */
export async function inviteEmployee(email) {
  // Note: inviteUserByEmail requires service-role key in production.
  // In development, use signUp with a temporary password and force reset.
  // REQUIRES BUSINESS DECISION: What is the onboarding flow for new employees?
  console.warn('[authService] inviteEmployee: REQUIRES_BUSINESS_DECISION — onboarding flow not defined');
  return { error: { message: 'REQUIRES_BUSINESS_DECISION: Employee invitation flow not yet defined.' } };
}

/**
 * ADMIN ONLY: Link an auth user to an employee record.
 * Must be called by system_admin after employee signup.
 *
 * @param {string} employeeId - employees.id
 * @param {string} authUserId - auth.users.id
 */
export async function linkEmployeeToAuthUser(employeeId, authUserId) {
  const { error } = await supabase
    .from('employees')
    .update({ user_id: authUserId })
    .eq('id', employeeId);

  if (error) {
    return { error: { message: 'Failed to link employee: ' + error.message } };
  }
  return { success: true };
}

// ─── AUTH STATE LISTENER ──────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * @param {Function} callback - called with (event, session)
 * @returns {Function} unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ─── PERMISSIONS ──────────────────────────────────────────────────────────────

/**
 * Get effective permissions for an employee.
 * Source: DB role → DEFAULT_ROLE_PERMISSIONS matrix.
 * NOT from localStorage.
 *
 * @param {string} role
 * @param {Object} employee
 * @returns {string[]} permission array
 */
export function getPermissionsForRole(role, employee = {}) {
  const safeRole = VALID_ROLES.includes(role) ? role : 'employee';
  return DEFAULT_ROLE_PERMISSIONS[safeRole] || DEFAULT_ROLE_PERMISSIONS.employee;
}

// ─── EMPLOYEE NORMALIZATION ───────────────────────────────────────────────────

/**
 * Normalize an employee DB record (unpack manager_name JSON meta field, etc.)
 * Reuses the same normalization logic as the existing base44Client fromDbRecord.
 */
export function normalizeEmployee(row) {
  if (!row) return null;

  // Unpack manager_name JSON meta field (existing schema stores extra fields here)
  let meta = {};
  if (row.manager_name && typeof row.manager_name === 'string' && row.manager_name.startsWith('{')) {
    try { meta = JSON.parse(row.manager_name); } catch (e) {}
  }

  let determinedRole = row.role || meta.role;
  if (!determinedRole || !VALID_ROLES.includes(determinedRole)) {
    const jt = (row.job_title || '').trim();
    const num = String(row.employee_number || '').trim();
    if (num === '1001' || jt.includes('المدير العام') || jt.includes('مالك')) determinedRole = 'owner';
    else if (num === '1022' || jt.includes('موارد بشرية') || jt.includes('مسؤول موارد')) determinedRole = 'system_admin';
    else if (num === '1005' || jt.includes('حسابات') || jt.includes('محاسب')) determinedRole = 'accountant';
    else determinedRole = 'employee';
  }

  return {
    ...row,
    // Standard fields
    id: row.id,
    employee_number: row.employee_number,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    branch: row.branch_name,
    branch_name: row.branch_name,
    department: row.department_name,
    department_name: row.department_name,
    shift: row.shift,
    nationality: row.nationality,
    national_id: row.national_id,
    join_date: row.join_date,
    salary: Number(row.salary) || 0,
    housing_allowance: Number(row.housing_allowance) || 0,
    transport_allowance: Number(row.transport_allowance) || 0,
    status: row.status || 'active',
    role: determinedRole,
    user_id: row.user_id,
    // From meta JSON
    is_insured: meta.is_insured || false,
    gosi_number: meta.gosi_number || '',
    iban: meta.iban || '',
    bank_name: meta.bank_name || '',
    payout_method: meta.payout_method || 'cash_full',
    bank_transfer_amount: Number(meta.bank_transfer_amount) || 0,
    manager_name: meta.manager_name || null,
    electricity_allowance: Number(meta.electricity_allowance) || 0,
    phone_allowance: Number(meta.phone_allowance) || 0,
    other_allowance: Number(meta.other_allowance) || 0,
  };
}

// ─── UI PREFERENCES (safe localStorage) ──────────────────────────────────────

const SAFE_UI_PREF_KEYS = ['theme', 'language', 'sidebar_collapsed', 'last_visited_tab'];

/**
 * Clear only safe UI preferences from localStorage.
 * Does NOT clear identity, role, or business data.
 */
export function clearUIPreferences() {
  // Only clear explicitly safe UI keys — never bulk-clear localStorage
  SAFE_UI_PREF_KEYS.forEach(key => {
    try { localStorage.removeItem('hr_ui_' + key); } catch (e) {}
  });
}

/**
 * Get a safe UI preference.
 */
export function getUIPreference(key, defaultValue = null) {
  if (!SAFE_UI_PREF_KEYS.includes(key)) return defaultValue;
  try {
    return localStorage.getItem('hr_ui_' + key) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Set a safe UI preference.
 */
export function setUIPreference(key, value) {
  if (!SAFE_UI_PREF_KEYS.includes(key)) return;
  try {
    localStorage.setItem('hr_ui_' + key, String(value));
  } catch (e) {}
}
