const fs = require('fs');

let code = fs.readFileSync('src/api/base44Client.js', 'utf8');

const header = `import { supabase } from '@/lib/supabaseClient';
import { AUTHORITATIVE_LEAVE_BASELINES } from '@/lib/leaveBalance';

const isSupabaseConfigured = Boolean(supabase);
export { supabase };

// Auto normalize branch names on load
function normalizeEmployeeBranches(list) {
  return (list || []).map(e => {
    const bName = e.branch_name || e.branch || 'مكتب الإدارة';
    return {
      ...e,
      branch: bName,
      branch_name: bName,
      department: e.department_name || e.department || bName,
      department_name: e.department_name || e.department || bName
    };
  });
}

// ============================================================================
// AUTO DATABASE SYNC v8 (Guarantees zero cache mismatch across all browsers)
// ============================================================================
const CURRENT_DB_VERSION = 'v12_leave_balances_baseline';
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (localStorage.getItem('hr_flow_db_ver') !== CURRENT_DB_VERSION) {
      // Clear all legacy storage keys
`;

code = header + code;
fs.writeFileSync('src/api/base44Client.js', code, 'utf8');
console.log('Fixed top of base44Client.js successfully!');
