
/**
 * Save monthly custom advance deduction override
 */
export function saveMonthlyAdvanceOverride(employeeNumber, monthPrefix, overrideData) {
  try {
    const cleanNum = String(employeeNumber || '').trim();
    const key = 'hr_flow_adv_override_' + cleanNum + '_' + (monthPrefix || 'all');
    const payload = {
      employeeNumber: cleanNum,
      monthPrefix,
      amount: Number(overrideData.amount) || 0,
      status: overrideData.status || 'modified', // 'confirmed', 'modified', 'skipped'
      note: overrideData.note || '',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(payload));
    cloudSave(key, payload);
    return payload;
  } catch (e) {
    console.error('Failed to save monthly advance override:', e);
    return null;
  }
}

/**
 * Get monthly custom advance deduction override
 */
export function getMonthlyAdvanceOverride(employeeNumber, monthPrefix) {
  try {
    const cleanNum = String(employeeNumber || '').trim();
    const key = 'hr_flow_adv_override_' + cleanNum + '_' + (monthPrefix || 'all');
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Process and commit all advance installment deductions when locking a monthly payroll
 */
export function commitMonthlyAdvanceDeductions(monthPrefix, payrollsList) {
  try {
    if (!Array.isArray(payrollsList) || !monthPrefix) return;
    const advances = getAdvances();

    payrollsList.forEach(p => {
      const deductedAmount = Number(p.advanceInstallment) || 0;
      if (deductedAmount > 0 && p.emp) {
        const empNum = String(p.emp.employee_number || p.emp.id || '').trim();
        const advIdx = advances.findIndex(a => 
          String(a.employee_number || '').trim() === empNum &&
          (a.status === 'active' || a.status === 'disbursed' || a.status === 'approved') &&
          (Number(a.remaining_balance) || 0) > 0
        );

        if (advIdx !== -1) {
          const adv = advances[advIdx];
          const newPaid = (Number(adv.paid_amount) || 0) + deductedAmount;
          const newRem = Math.max(0, (Number(adv.total_amount) || 0) - newPaid);
          const newPaidInst = (Number(adv.paid_installments) || 0) + 1;

          advances[advIdx] = {
            ...adv,
            paid_amount: newPaid,
            remaining_balance: newRem,
            paid_installments: newPaidInst,
            status: newRem <= 0 ? 'completed' : 'active',
            history: [
              ...(adv.history || []),
              {
                month: monthPrefix,
                deducted_amount: deductedAmount,
                remaining_after: newRem,
                date: new Date().toISOString()
              }
            ]
          };
        }
      }
    });

    localStorage.setItem('hr_flow_employee_advances', JSON.stringify(advances));
    localStorage.setItem('hr_advances_list', JSON.stringify(advances));
    cloudSave('hr_flow_employee_advances', advances);
    cloudSave('hr_advances_list', advances);
    console.log('✓ Committed monthly advance deductions for payroll month ' + monthPrefix);
  } catch (e) {
    console.error('Failed to commit monthly advance deductions:', e);
  }
}

export function getDeletedAdvances() {
  try {
    const raw = localStorage.getItem('hr_deleted_advances');
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export async function deleteAdvance(advanceId, advanceRecord = null) {
  try {
    const cleanId = String(advanceId);
    const deletedList = getDeletedAdvances();
    
    if (!deletedList.includes(cleanId)) {
      deletedList.push(cleanId);
    }
    if (advanceRecord) {
      const empNum = String(advanceRecord.employee_number || '').trim();
      const amount = Math.round(Number(advanceRecord.total_amount || advanceRecord.amount || 0));
      const reason = String(advanceRecord.reason || '').trim().toLowerCase();
      const startMonth = advanceRecord.start_month || '2026-08';
      const uniqueKey = `${empNum}_${amount}_${startMonth}_${reason.slice(0, 10)}`;
      if (!deletedList.includes(uniqueKey)) {
        deletedList.push(uniqueKey);
      }
    }

    localStorage.setItem('hr_deleted_advances', JSON.stringify(deletedList));
    await cloudSave('hr_deleted_advances', deletedList);

    const list1 = JSON.parse(localStorage.getItem('hr_flow_employee_advances') || '[]');
    const list2 = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
    
    const filtered1 = list1.filter(a => String(a.id) !== cleanId);
    const filtered2 = list2.filter(a => String(a.id) !== cleanId);
    
    localStorage.setItem('hr_flow_employee_advances', JSON.stringify(filtered1));
    localStorage.setItem('hr_advances_list', JSON.stringify(filtered2));
    
    await cloudSave('hr_flow_employee_advances', filtered1);
    await cloudSave('hr_advances_list', filtered2);
    return true;
  } catch (e) {
    console.error('Failed to delete advance:', e);
    return false;
  }
}

export async function recordAdvanceRepayment({ advanceId, amount, paymentDate, paymentMethod, notes, receiptNumber, recordedBy }) {
  try {
    const list = getAdvances();
    const idx = list.findIndex(a => String(a.id) === String(advanceId));
    if (idx === -1) {
      throw new Error('السلفة غير موجودة بالنظام');
    }

    const adv = list[idx];
    const payAmt = Math.min(Number(amount), Number(adv.remaining_balance !== undefined ? adv.remaining_balance : adv.total_amount));
    const newPaidAmount = (Number(adv.paid_amount) || 0) + payAmt;
    const newRemaining = Math.max(0, (Number(adv.total_amount) || 0) - newPaidAmount);

    const paymentRecord = {
      id: 'rep_' + Date.now(),
      amount: payAmt,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      payment_method: paymentMethod || 'cash',
      notes: notes || 'سداد دفعة من السلفة',
      receipt_number: receiptNumber || ('REC-' + Date.now().toString().slice(-6)),
      recorded_by: recordedBy || 'المحاسب المالي',
      recorded_at: new Date().toISOString()
    };

    const updated = {
      ...adv,
      paid_amount: newPaidAmount,
      remaining_balance: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active',
      history: [...(adv.history || []), paymentRecord],
      updated_at: new Date().toISOString(),
      updated_by: recordedBy || 'المحاسب'
    };

    list[idx] = updated;
    localStorage.setItem('hr_advances_list', JSON.stringify(list));
    localStorage.setItem('hr_flow_employee_advances', JSON.stringify(list));

    await cloudSave('hr_advances_list', list);
    await cloudSave('hr_flow_employee_advances', list);
    return updated;
  } catch (e) {
    console.error('Error recording advance repayment:', e);
    throw e;
  }
}

export function normalizeAdvance(adv) {
  if (!adv) return null;
  const amt = Number(adv.total_amount || adv.amount) || 0;
  const instCount = Number(adv.total_installments || adv.installments) || 1;
  const monthly = Number(adv.monthly_installment || adv.monthly_deduction) || Math.round(amt / instCount);
  const paid = Number(adv.paid_amount) || 0;
  const rem = Number(adv.remaining_balance) !== undefined ? Number(adv.remaining_balance) : Math.max(0, amt - paid);
  const startMonth = adv.start_month || (adv.date ? adv.date.slice(0, 7) : '2026-09');
  
  const isEmployeeRequest = adv.source === 'employee_request' || adv.is_employee_request;
  let st = adv.status;

  // Management registered advances or opening balances are inherently active/approved
  if (!isEmployeeRequest) {
    st = rem <= 0 ? 'completed' : 'active';
  } else {
    if (st === 'disbursed' || (st === 'approved' && rem > 0) || (st === 'active' && rem > 0)) {
      st = rem <= 0 ? 'completed' : 'active';
    } else if (rem <= 0 && st !== 'rejected') {
      st = 'completed';
    }
  }

  return {
    ...adv,
    id: adv.id || ('adv_' + Date.now()),
    employee_number: String(adv.employee_number || '').trim(),
    employee_name: adv.employee_name || 'موظف',
    total_amount: amt,
    amount: amt,
    total_installments: instCount,
    installments: instCount,
    monthly_installment: monthly,
    monthly_deduction: monthly,
    paid_amount: paid,
    remaining_balance: rem,
    start_month: startMonth,
    disbursement_date: adv.disbursement_date || (adv.date ? adv.date.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    reason: adv.reason || 'سلفة شخصية',
    status: st,
    is_admin_direct: !isEmployeeRequest,
    source: isEmployeeRequest ? 'employee_request' : 'management',
    approved_by: adv.approved_by || 'فهد ناصر محمد الجوعي (المدير العام)',
    disbursed_by: adv.disbursed_by || 'هشام ابوالفضل زغلول (المحاسب)',
    created_at: adv.created_at || (adv.date ? adv.date : new Date().toISOString()),
  };
}

import { cloudSave } from '@/lib/cloudSyncEngine';
// ============================================================================
// PAYROLL ENGINE - FINANCIAL CALCULATIONS & BUSINESS LOGIC
// Includes: Shortfall hours, Friday overtime, Daily overtime, GOSI,
// Penalties & Disciplinary deductions, Bonuses & Sales incentives,
// Employee Advances & Loans with Debt Protection & Audit trail.
// ============================================================================

export function getPayrollSettings() {
  try {
    const saved = localStorage.getItem('hr_flow_payroll_settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    fridayDailyRate: 50,
    overtimeDailyRate: 100,
    daysPerMonth: 30,
    lateGraceMinutes: 15,
  };
}

export function savePayrollSettings(settings) {
  try {
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify(settings));
    appendAuditLog({
      action: 'settings_updated',
      details: settings,
      user: 'المدير العام',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to save payroll settings:', e);
  }
}

export function calcHourlyRate(basicSalary, shiftRequiredHours, daysPerMonth = 30) {
  if (!basicSalary || basicSalary <= 0 || !shiftRequiredHours || shiftRequiredHours <= 0) return 0;
  return basicSalary / daysPerMonth / shiftRequiredHours;
}

export function getShiftRequiredHours(shift) {
  if (!shift) return 8;
  const directHours = Number(shift.working_hours || shift.hours || shift.required_hours);
  if (directHours > 0) return directHours;

  const type = (shift.type || '').toLowerCase();
  const name = (shift.name || '').toLowerCase();

  if (type === 'dual' || name.includes('فترت') || name.includes('غير سعودي') || name.includes('dual')) {
    return 8;
  }
  if (type === 'single' || name.includes('صباح') || name.includes('مساء') || name.includes('سعودي')) {
    return 8;
  }
  if (name.includes('مدير') || name.includes('مرن') || type === 'flexible') {
    return 8;
  }
  return 8;
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  try {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return null;
      return d.getHours() * 60 + d.getMinutes();
    }
    const clean = timeStr.replace(/[^0-9:]/g, '');
    const parts = clean.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
  } catch {}
  return null;
}

export function extractTimes(str) {
  if (!str || typeof str !== 'string') return [];
  const matches = str.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || [];
  return matches.map(t => {
    const parts = t.split(':');
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
  });
}

export function calcActualMinutes(log) {
  if (!log) return 0;

  if (log.total_hours && Number(log.total_hours) > 0) {
    return Math.round(Number(log.total_hours) * 60);
  }

  const raw = log.timestamp_raw || log.punches_raw || '';
  const times = extractTimes(raw);

  if (times.length >= 4) {
    const m1In = parseTimeToMinutes(times[0]);
    const m1Out = parseTimeToMinutes(times[1]);
    const m2In = parseTimeToMinutes(times[2]);
    const m2Out = parseTimeToMinutes(times[3]);

    let dur1 = 0;
    if (m1In !== null && m1Out !== null) {
      dur1 = m1Out >= m1In ? m1Out - m1In : (m1Out + 1440) - m1In;
    }
    let dur2 = 0;
    if (m2In !== null && m2Out !== null) {
      dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
    }
    const total = dur1 + dur2;
    if (total > 0 && total <= 1440) return total;
  }

  if (times.length === 2) {
    const inM = parseTimeToMinutes(times[0]);
    const outM = parseTimeToMinutes(times[1]);
    if (inM !== null && outM !== null) {
      const dur = outM >= inM ? outM - inM : (outM + 1440) - inM;
      if (dur > 0 && dur <= 1440) return dur;
    }
  }

  if (log.check_in && log.check_out) {
    const inM = parseTimeToMinutes(log.check_in);
    const outM = parseTimeToMinutes(log.check_out);
    if (inM !== null && outM !== null) {
      const dur = outM >= inM ? outM - inM : (outM + 1440) - inM;
      if (dur > 0 && dur <= 1440) return dur;
    }
  }

  return 0;
}

export function hasRealBiometricPunches(log) {
  if (!log) return false;
  const raw = (log.timestamp_raw || log.punches_raw || '').trim();
  if (raw && extractTimes(raw).length > 0) return true;
  // A real punch must have check_out, or actual total_hours > 0, or raw punches
  if (log.check_in && log.check_out && log.check_in !== '—' && log.check_out !== '—') return true;
  if (log.total_hours && Number(log.total_hours) > 0) return true;
  if (log.actual_minutes && log.actual_minutes > 0) return true;
  return false;
}

export function isDayExempt(log) {
  if (!log) return false;
  const status = (log.status || '').toLowerCase();
  const label = (log.statusLabel || log.status_label || '').toLowerCase();
  
  // Paid leaves and exemptions (Zero shortfall deduction)
  if (status === 'annual_leave' || status === 'إجازة سنوية' || status === 'اجازة سنوية' ||
      status === 'sick_leave' || status === 'إجازة مرضية' || status === 'اجازة مرضية' ||
      status === 'emergency_leave' || status === 'إجازة اضطرارية' ||
      status === 'exempt' || status === 'معفى' || status.includes('عطلة') || status === 'weekend' ||
      status === 'on_leave' || status === 'leave' || label.includes('إجازة') || label.includes('اجاز') || label.includes('معفى')) {
    return true;
  }
  return false;
}

export function isFriday(log) {
  if (!log) return false;
  if (log.log_date) {
    const d = new Date(log.log_date + 'T12:00:00Z');
    if (d.getUTCDay() === 5) return true; // 5 = Friday
  }
  const name = (log.day_name || '').toLowerCase();
  if (name.includes('جمع') || name.includes('fri')) return true;
  return false;
}

export function isFridayAttendance(log) {
  return isFriday(log);
}

export function getStandardShiftPunches(shiftNameOrObj) {
  const name = (typeof shiftNameOrObj === 'string' ? shiftNameOrObj : (shiftNameOrObj?.name || '')).toLowerCase();
  
  if (name.includes('9 ساعات') || name.includes('إضافي 100')) {
    return {
      isSplit: true,
      p1In: '09:00',
      p1Out: '13:00',
      p2In: '16:00',
      p2Out: '21:00',
      totalHours: 9,
      raw: '09:00:00 -- 13:00:00 & 16:00:00 -- 21:00:00'
    };
  }
  if (name.includes('غير سعودي') || name.includes('8 ساعات') || name.includes('فترتين')) {
    return {
      isSplit: true,
      p1In: '08:00',
      p1Out: '12:00',
      p2In: '16:00',
      p2Out: '20:00',
      totalHours: 8,
      raw: '08:00:00 -- 12:00:00 & 16:00:00 -- 20:00:00'
    };
  }
  if (name.includes('سعودي صباحي') || name.includes('صباحي')) {
    return {
      isSplit: false,
      p1In: '08:00',
      p1Out: '13:00',
      p2In: '',
      p2Out: '',
      totalHours: 5,
      raw: '08:00:00 -- 13:00:00'
    };
  }
  if (name.includes('سعودي مسائي') || name.includes('مسائي')) {
    return {
      isSplit: false,
      p1In: '16:00',
      p1Out: '21:00',
      p2In: '',
      p2Out: '',
      totalHours: 5,
      raw: '16:00:00 -- 21:00:00'
    };
  }
  if (name.includes('مدير') || name.includes('الإدارة العامة')) {
    return {
      isSplit: false,
      p1In: '09:00',
      p1Out: '17:00',
      p2In: '',
      p2Out: '',
      totalHours: 8,
      raw: '09:00:00 -- 17:00:00'
    };
  }
  if (name.includes('رمضان')) {
    return {
      isSplit: false,
      p1In: '20:30',
      p1Out: '02:00',
      p2In: '',
      p2Out: '',
      totalHours: 5.5,
      raw: '20:30:00 -- 02:00:00'
    };
  }
  // Default 8-hour single shift
  return {
    isSplit: false,
    p1In: '08:00',
    p1Out: '16:00',
    p2In: '',
    p2Out: '',
    totalHours: 8,
    raw: '08:00:00 -- 16:00:00'
  };
}

// ============================================================================
// EMPLOYEE ADVANCES & LOANS MANAGEMENT
// ============================================================================

export const DEFAULT_MASTER_ADVANCES = [
  {
    id: "adv_1033_1",
    employee_id: "emp_1033",
    employee_number: "1033",
    employee_name: "عبد الله ناصر عبد الله محمد عمر",
    total_amount: 2697,
    amount: 2697,
    monthly_installment: 500,
    monthly_deduction: 500,
    total_installments: 6,
    installments: 6,
    paid_installments: 0,
    paid_amount: 0,
    remaining_balance: 2697,
    start_month: "2026-08",
    disbursement_date: "2026-08-30",
    reason: "رصيد سلفة قديمة مستحقة",
    status: "active",
    approved_by: "فهد ناصر محمد الجوعي (المدير العام)",
    created_at: "2026-08-30T16:45:58.862Z",
    history: []
  },
  {
    id: "adv_1032_1",
    employee_id: "emp_1032",
    employee_number: "1032",
    employee_name: "محمد عادل احمد نعمان",
    total_amount: 11874,
    amount: 11874,
    monthly_installment: 500,
    monthly_deduction: 500,
    total_installments: 24,
    installments: 24,
    paid_installments: 0,
    paid_amount: 0,
    remaining_balance: 11874,
    start_month: "2026-08",
    disbursement_date: "2026-08-30",
    reason: "رصيد سلفة قديمة مستحقة",
    status: "active",
    approved_by: "فهد ناصر محمد الجوعي (المدير العام)",
    created_at: "2026-08-30T16:45:32.430Z",
    history: []
  },
  {
    id: "adv_1021_1",
    employee_id: "emp_1021",
    employee_number: "1021",
    employee_name: "إبراهيم عبد العزيز التويجري",
    total_amount: 3700,
    amount: 3700,
    monthly_installment: 500,
    monthly_deduction: 500,
    total_installments: 8,
    installments: 8,
    paid_installments: 0,
    paid_amount: 0,
    remaining_balance: 3700,
    start_month: "2026-08",
    disbursement_date: "2026-08-30",
    reason: "رصيد سلفة قديمة مستحقة",
    status: "active",
    approved_by: "فهد ناصر محمد الجوعي (المدير العام)",
    created_at: "2026-08-30T16:43:32.019Z",
    history: []
  },
  {
    id: "adv_1022_1",
    employee_id: "emp_1022",
    employee_number: "1022",
    employee_name: "يحيي محمد عبدالغفار باشا",
    total_amount: 8270,
    amount: 8270,
    monthly_installment: 500,
    monthly_deduction: 500,
    total_installments: 17,
    installments: 17,
    paid_installments: 0,
    paid_amount: 0,
    remaining_balance: 8270,
    start_month: "2026-08",
    disbursement_date: "2026-08-30",
    reason: "رصيد سلفة قديمة مستحقة",
    status: "active",
    approved_by: "فهد ناصر محمد الجوعي (المدير العام)",
    created_at: "2026-08-30T16:43:08.574Z",
    history: []
  },
  {
    id: "adv_1017_1",
    employee_id: "emp_1017",
    employee_number: "1017",
    employee_name: "محمد سالم صالح أحمد المردم",
    total_amount: 11465,
    amount: 11465,
    monthly_installment: 500,
    monthly_deduction: 500,
    total_installments: 23,
    installments: 23,
    paid_installments: 0,
    paid_amount: 0,
    remaining_balance: 11465,
    start_month: "2026-08",
    disbursement_date: "2026-08-30",
    reason: "رصيد سلفة قديمة مستحقة",
    status: "active",
    approved_by: "فهد ناصر محمد الجوعي (المدير العام)",
    created_at: "2026-08-30T16:42:37.493Z",
    history: []
  },
  {
    id: "adv_1013_1",
    employee_id: "emp_1013",
    employee_number: "1013",
    employee_name: "وضاح صالح سالم أحمد العولقي",
    total_amount: 1430,
    amount: 1430,
    monthly_installment: 500,
    monthly_deduction: 500,
    total_installments: 3,
    installments: 3,
    paid_installments: 0,
    paid_amount: 0,
    remaining_balance: 1430,
    start_month: "2026-08",
    disbursement_date: "2026-08-30",
    reason: "رصيد سلفة قديمة مستحقة",
    status: "active",
    approved_by: "فهد ناصر محمد الجوعي (المدير العام)",
    created_at: "2026-08-30T16:42:07.135Z",
    history: []
  }
];

export function getAdvances() {
  try {
    const list1 = JSON.parse(localStorage.getItem('hr_flow_employee_advances') || '[]');
    const list2 = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
    const combined = [
      ...(Array.isArray(list1) ? list1 : []),
      ...(Array.isArray(list2) ? list2 : []),
      ...DEFAULT_MASTER_ADVANCES
    ];
    
    const map = new Map();
    combined.forEach(raw => {
      if (raw) {
        const norm = normalizeAdvance(raw);
        if (norm && norm.total_amount > 0) {
          // Robust composite fingerprint key to deduplicate identical advances
          const empNum = String(norm.employee_number || '').trim();
          const amount = Math.round(Number(norm.total_amount || norm.amount || 0));
          const reason = String(norm.reason || '').trim().toLowerCase();
          const startMonth = norm.start_month || '2026-08';
          
          const uniqueKey = norm.id && norm.id.startsWith('adv_custom_') 
            ? norm.id 
            : `${empNum}_${amount}_${startMonth}_${reason.slice(0, 10)}`;
          
          if (!map.has(uniqueKey)) {
            map.set(uniqueKey, norm);
          } else {
            const prev = map.get(uniqueKey);
            // Merge gracefully keeping existing IDs and progress
            map.set(uniqueKey, { 
              ...norm, 
              ...prev, 
              remaining_balance: prev.remaining_balance !== undefined ? prev.remaining_balance : norm.remaining_balance,
              paid_amount: Math.max(Number(prev.paid_amount || 0), Number(norm.paid_amount || 0))
            });
          }
        }
      }
    });
    return Array.from(map.values());
  } catch (e) {
    console.error('Failed to parse advances:', e);
    return DEFAULT_MASTER_ADVANCES;
  }
}

export function saveAdvance(advanceData) {
  const advances = getAdvances();
  const newAdvance = {
    id: advanceData.id || ('adv_' + Date.now()),
    employee_id: advanceData.employee_id || '',
    employee_number: String(advanceData.employee_number || '').trim(),
    employee_name: advanceData.employee_name || '',
    total_amount: Number(advanceData.total_amount) || 0,
    monthly_installment: Number(advanceData.monthly_installment) || 0,
    total_installments: Number(advanceData.total_installments) || 1,
    paid_installments: Number(advanceData.paid_installments) || 0,
    paid_amount: Number(advanceData.paid_amount) || 0,
    remaining_balance: Number(advanceData.remaining_balance) !== undefined ? Number(advanceData.remaining_balance) : (Number(advanceData.total_amount) || 0),
    start_month: advanceData.start_month || '2026-08',
    disbursement_date: advanceData.disbursement_date || new Date().toISOString().split('T')[0],
    reason: advanceData.reason || 'سلفة شخصية',
    status: advanceData.status || 'active', // 'active', 'completed', 'cancelled'
    approved_by: advanceData.approved_by || 'المدير العام',
    created_at: advanceData.created_at || new Date().toISOString(),
    history: advanceData.history || []
  };

  const idx = advances.findIndex(a => a.id === newAdvance.id);
  if (idx !== -1) {
    advances[idx] = newAdvance;
  } else {
    advances.unshift(newAdvance);
  }

  localStorage.setItem('hr_flow_employee_advances', JSON.stringify(advances));
  cloudSave('hr_flow_employee_advances', advances);
  appendAuditLog({
    action: idx !== -1 ? 'advance_updated' : 'advance_created',
    employeeNumber: newAdvance.employee_number,
    amount: newAdvance.total_amount,
    installment: newAdvance.monthly_installment,
    note: newAdvance.reason,
    approvedBy: newAdvance.approved_by,
  });

  return newAdvance;
}

export function getActiveAdvanceForEmployee(employeeNumber, monthPrefix = '') {
  const cleanNum = String(employeeNumber || '').trim();
  if (!cleanNum) return null;
  const advances = getAdvances();
  return advances.find(a => {
    const matchEmp = String(a.employee_number || '').trim() === cleanNum;
    const isActiveStatus = a.status === 'active' || a.status === 'disbursed' || a.status === 'approved';
    const hasRemaining = (Number(a.remaining_balance) || 0) > 0;
    const isStarted = !monthPrefix || !a.start_month || a.start_month <= monthPrefix;
    return matchEmp && isActiveStatus && hasRemaining && isStarted;
  }) || null;
}

export function getEmployeeActiveAdvance(employeeNumber, monthPrefix = '') {
  return getActiveAdvanceForEmployee(employeeNumber, monthPrefix);
}

export function recordAdvanceInstallmentPayment(advanceId, monthPrefix, paidAmount) {
  const advances = getAdvances();
  const idx = advances.findIndex(a => a.id === advanceId);
  if (idx === -1) return null;

  const adv = advances[idx];
  const amount = Number(paidAmount) || adv.monthly_installment;
  
  adv.paid_amount = (Number(adv.paid_amount) || 0) + amount;
  adv.remaining_balance = Math.max(0, adv.total_amount - adv.paid_amount);
  adv.paid_installments = (Number(adv.paid_installments) || 0) + 1;
  
  if (adv.remaining_balance <= 0) {
    adv.status = 'completed';
    adv.remaining_balance = 0;
  }

  if (!adv.history) adv.history = [];
  adv.history.push({
    month: monthPrefix,
    amount,
    paid_at: new Date().toISOString(),
    remaining_after: adv.remaining_balance
  });

  localStorage.setItem('hr_flow_employee_advances', JSON.stringify(advances));
  return adv;
}

// ============================================================================
// PAYROLL ADJUSTMENTS (BONUSES & PENALTIES)
// ============================================================================

export function getAdjustments() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_payroll_adjustments') || '[]');
  } catch {
    return [];
  }
}

export function saveAdjustment(adjData) {
  const adjustments = getAdjustments();
  const newAdj = {
    id: adjData.id || ('adj_' + Date.now()),
    type: adjData.type || 'bonus', // 'bonus' or 'penalty'
    category: adjData.category || 'general', // 'sales_incentive', 'daily_overtime', 'performance', 'delay_penalty', 'absence_penalty', 'disciplinary'
    employee_id: adjData.employee_id || '',
    employee_number: String(adjData.employee_number || '').trim(),
    employee_name: adjData.employee_name || '',
    month_prefix: adjData.month_prefix || '2026-08',
    amount: Number(adjData.amount) || 0,
    days_count: Number(adjData.days_count) || 0,
    reason: adjData.reason || '',
    status: adjData.status || 'approved', // 'approved', 'pending', 'rejected'
    approved_by: adjData.approved_by || 'المدير العام',
    created_at: adjData.created_at || new Date().toISOString(),
  };

  const idx = adjustments.findIndex(a => a.id === newAdj.id);
  if (idx !== -1) {
    adjustments[idx] = newAdj;
  } else {
    adjustments.unshift(newAdj);
  }

  localStorage.setItem('hr_flow_payroll_adjustments', JSON.stringify(adjustments));
  cloudSave('hr_flow_payroll_adjustments', adjustments);
  appendAuditLog({
    action: newAdj.type === 'bonus' ? 'bonus_approved' : 'penalty_approved',
    employeeNumber: newAdj.employee_number,
    monthPrefix: newAdj.month_prefix,
    amount: newAdj.amount,
    note: newAdj.reason,
    approvedBy: newAdj.approved_by,
  });

  return newAdj;
}

export function deleteAdjustment(adjId) {
  let adjustments = getAdjustments();
  adjustments = adjustments.filter(a => a.id !== adjId);
  localStorage.setItem('hr_flow_payroll_adjustments', JSON.stringify(adjustments));
}

export function getEmployeeAdjustments(employeeNumber, monthPrefix) {
  const adjustments = getAdjustments();
  const cleanNum = String(employeeNumber || '').trim();
  return adjustments.filter(a => 
    a.employee_number === cleanNum && 
    (!monthPrefix || a.month_prefix === monthPrefix) &&
    a.status === 'approved'
  );
}

// ============================================================================
// MAIN PAYROLL CALCULATION ENGINE
// ============================================================================

export function computeEmployeePayroll(emp, allLogs, allShifts, settings = {}) {
  const {
    fridayDailyRate = 50,
    overtimeDailyRate = 100,
    daysPerMonth = 30,
    monthPrefix = '2026-08',
  } = settings;

  const shiftName = emp.shift || '';
  const shift = (allShifts || []).find(s =>
    s.name === shiftName || s.id === shiftName || (s.name && shiftName && s.name.includes(shiftName))
  ) || null;
  const shiftHours = getShiftRequiredHours(shift);
  const is9HourShift = shiftHours === 9 || 
    shiftName.includes('9 ساعات') || 
    shiftName.includes('إضافي 100') ||
    (shift && shift.working_hours === 9) ||
    (shift && (shift.has_overtime || shift.id === 'sh_non_saudi_overtime'));

  const empNum = String(emp.employee_number || '').trim();
  const empId = String(emp.id || '').trim();
  const empName = (emp.full_name || '').trim();

  const empLogs = (allLogs || []).filter(l => {
    const lUser = String(l.user_id || l.employee_id || '').trim();
    const lNum = String(l.employee_number || '').trim();
    const lName = (l.employee_name || '').trim();

    const match = (lUser && (lUser === empId || lUser === empNum || lUser === `emp_${empNum}`)) ||
                  (lNum && (lNum === empNum || lNum === empId || `emp_${lNum}` === empId)) ||
                  (lName && empName && (lName === empName || lName.includes(empName) || empName.includes(lName)));
    if (!match) return false;
    if (monthPrefix && l.log_date && !l.log_date.startsWith(monthPrefix)) return false;
    return true;
  });

  const dateMap = {};
  empLogs.forEach(l => {
    const existing = dateMap[l.log_date];
    if (!existing) {
      dateMap[l.log_date] = l;
    } else {
      const existingHrs = Number(existing.total_hours || calcActualMinutes(existing)) || 0;
      const newHrs = Number(l.total_hours || calcActualMinutes(l)) || 0;
      if (newHrs >= existingHrs) {
        dateMap[l.log_date] = l;
      }
    }
  });
  const uniqueLogs = Object.values(dateMap).sort((a, b) => (a.log_date || '').localeCompare(b.log_date || ''));

  let totalRequiredMinutes = 0, totalActualMinutes = 0;
  let totalDelayMinutes = 0, totalExtraMinutes = 0;
  let presentDays = 0, absentDays = 0, leaveDays = 0, unpaidLeaveDays = 0, fridayDays = 0, fridayWorkedDays = 0, overtimeDays = 0;

  const isExecutive = (emp.job_title || '').includes('المدير العام') || String(emp.employee_number || '') === '1001' || (emp.shift || '').includes('المدير العام') || (emp.shift || '').includes('إدارة عامة');

  const dailyDetails = uniqueLogs.map(log => {
    const isFri = isFriday(log);
    const exempt = isDayExempt(log) || (isExecutive && !isFri);
    const hasAtt = hasRealBiometricPunches(log) || (isExecutive && !!log.check_in);
    const status = (log.status || 'present').toLowerCase();
    const isUnpaidLeave = status === 'unpaid_leave' || status === 'إجازة بدون راتب' || status === 'اجازة بدون راتب';
    
    let actualMins = calcActualMinutes(log);

    // For Executive Manager with check-in, full hours credited
    if (isExecutive && (log.check_in || hasAtt)) {
      actualMins = shiftHours * 60;
    }

    let requiredMins = 0, shortfallMins = 0;

    if (isFri) {
      // 1. IT IS FRIDAY (Weekly Official Holiday - Never marked as Absent!)
      requiredMins = 0;
      shortfallMins = 0;
      fridayDays++;
      if (hasAtt) {
        // Punched on Friday -> Attendance on Weekend / Overtime Allowance credited!
        fridayWorkedDays++;
        presentDays++;
        actualMins = actualMins || (shiftHours * 60);
      } else {
        actualMins = 0;
      }
    } else if (isUnpaidLeave) {
      // 2. UNPAID LEAVE (0 required, 0 shortfall minutes, deducted as a day deduction in Stage 2)
      unpaidLeaveDays++;
      requiredMins = 0;
      actualMins = 0;
      shortfallMins = 0;
    } else if (exempt) {
      // 3. EXEMPT / PAID LEAVE DAY (Annual, Sick, Emergency, or Admin Exemption)
      requiredMins = 0;
      shortfallMins = 0;
      actualMins = actualMins || 0;
      if (status.includes('إجازة') || status === 'on_leave' || status === 'leave') leaveDays++;
      else if (isExecutive) presentDays++;
    } else if (hasAtt) {
      // 4. REGULAR WORKING DAY WITH ATTENDANCE
      presentDays++;
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      const actual = actualMins || 0;
      totalActualMinutes += actual;

      if (actual < requiredMins) {
        // Late / Delay on attended work day
        const delay = requiredMins - actual;
        shortfallMins = delay;
        totalDelayMinutes += delay;
      } else if (actual > requiredMins) {
        // Extra time / Overtime on attended work day
        const extra = actual - requiredMins;
        shortfallMins = 0;
        totalExtraMinutes += extra;
      } else {
        shortfallMins = 0;
      }
    } else if (isExecutive && (log.check_in || hasAtt)) {
      // 5. EXECUTIVE
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      totalActualMinutes += requiredMins;
      shortfallMins = 0;
      presentDays++;
    } else {
      // 6. ABSENCE DAY (Regular working day, not Friday, not exempt, no punches)
      // Counted under absentDays, NOT added to delay shortfall minutes!
      absentDays++;
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      shortfallMins = 0; // NOT added to shortfall delay hours!
      actualMins = 0;
    }

    // 9-Hour Daily Overtime (+100 SAR / day) when attending working day
    const hasOT = !isFri && is9HourShift && hasAtt && !exempt && (actualMins >= 510 || (actualMins >= (shiftHours * 60) - 30));
    if (hasOT) overtimeDays++;

    // Robust Multi-Period Punch Extraction (Morning & Evening Periods)
    const rawPunches = extractTimes(log.timestamp_raw || log.punches_raw || '');
    let p1In = log.period_1_in || (rawPunches[0] || (log.check_in ? (log.check_in.includes('T') ? log.check_in.slice(11, 16) : log.check_in.slice(0, 5)) : ''));
    let p1Out = log.period_1_out || (rawPunches.length >= 4 ? rawPunches[1] : (rawPunches.length === 2 ? rawPunches[1] : (log.check_out ? (log.check_out.includes('T') ? log.check_out.slice(11, 16) : log.check_out.slice(0, 5)) : '')));
    let p2In = log.period_2_in || (rawPunches.length >= 4 ? rawPunches[2] : '');
    let p2Out = log.period_2_out || (rawPunches.length >= 4 ? rawPunches[3] : '');

    const displayCheckIn = (hasAtt || isExecutive) ? (p1In || log.check_in || '') : '';
    const displayCheckOut = (hasAtt || isExecutive) ? (p2Out || p1Out || log.check_out || (isExecutive ? '16:00' : '')) : '';
    const displayP1In = (hasAtt || isExecutive) ? p1In : '';
    const displayP1Out = (hasAtt || isExecutive) ? p1Out : '';
    const displayP2In = (hasAtt || isExecutive) ? p2In : '';
    const displayP2Out = (hasAtt || isExecutive) ? p2Out : '';

    const surplusMins = (hasAtt && !exempt && !isFri && actualMins > requiredMins) ? (actualMins - requiredMins) : 0;

    let rowStatus = 'present';
    if (isFri) {
      rowStatus = 'weekend';
    } else if (isUnpaidLeave) {
      rowStatus = 'unpaid_leave';
    } else if (exempt) {
      rowStatus = 'exempt';
    } else if (!hasAtt) {
      rowStatus = 'absent';
    } else if (shortfallMins > 0) {
      rowStatus = 'late';
    } else {
      rowStatus = 'present';
    }

    return {
      ...log,
      log_date: log.log_date,
      day_name: log.day_name || '',
      status: rowStatus,
      check_in: displayCheckIn,
      check_out: displayCheckOut,
      period_1_in: displayP1In,
      period_1_out: displayP1Out,
      period_2_in: displayP2In,
      period_2_out: displayP2Out,
      timestamp_raw: hasAtt ? (log.timestamp_raw || '') : '',
      isFriday: isFri,
      isUnpaidLeave,
      isExempt: exempt,
      hasAttendance: hasAtt,
      requiredMinutes: requiredMins,
      actualMinutes: hasAtt ? (actualMins || 0) : 0,
      shortfallMinutes: shortfallMins,
      surplusMinutes: surplusMins,
      overtimeDay: hasOT,
    };
  });

  // ─── SALARY, RATES, AND OFFSETTING (المقاصة التلقائية بين الإضافي والتأخير) ────
  const basicSalary = Number(emp.salary) || 0;
  const housing = Number(emp.housing_allowance) || 0;
  const transport = Number(emp.transport_allowance) || 0;
  const electricity = Number(emp.electricity_allowance) || 0;
  const phone = Number(emp.phone_allowance) || 0;
  const otherAllowance = Number(emp.other_allowance) || 0;
  const hourlyRate = calcHourlyRate(basicSalary, shiftHours, daysPerMonth);
  const dailySalaryRate = Math.round((basicSalary / daysPerMonth) * 100) / 100;

  // AUTOMATIC NETTING: Deduct extra overtime minutes from delay shortfall minutes
  const netShortfallMinutes = Math.max(0, totalDelayMinutes - totalExtraMinutes);
  const netExtraMinutes = Math.max(0, totalExtraMinutes - totalDelayMinutes);
  const totalShortfallMinutes = netShortfallMinutes;

  const shortfallHours = totalShortfallMinutes / 60;
  const proposedShortfallDeduction = Math.round(shortfallHours * hourlyRate * 100) / 100;

  // ABSENCE AND UNPAID LEAVE DEDUCTIONS
  const proposedAbsenceDeduction = Math.round(absentDays * dailySalaryRate * 100) / 100;
  const proposedUnpaidLeaveDeduction = Math.round(unpaidLeaveDays * dailySalaryRate * 100) / 100;

  // Absence Approval / Waiver (اعتماد أو تجاوز غياب الأيام)
  let approvedAbsenceDeduction = proposedAbsenceDeduction;
  let absenceApprovalStatus = 'approved';
  let absenceApprovalNote = '';
  try {
    const savedAbsAppr = localStorage.getItem('hr_flow_absence_appr_' + (emp.employee_number || emp.id) + '_' + (monthPrefix || 'all'));
    if (savedAbsAppr) {
      const ap = JSON.parse(savedAbsAppr);
      absenceApprovalStatus = ap.status || 'approved';
      if (ap.status === 'waived') {
        approvedAbsenceDeduction = 0;
        absenceApprovalNote = ap.note || 'تم التجاوز والإعفاء من خصم الغياب بقرار الإدارة';
      } else if (ap.status === 'modified') {
        approvedAbsenceDeduction = Number(ap.finalDeduction) || 0;
        absenceApprovalNote = ap.note || `خصم غياب معدل (${approvedAbsenceDeduction} ر.س)`;
      } else {
        approvedAbsenceDeduction = proposedAbsenceDeduction;
        absenceApprovalNote = ap.note || 'معتمد للخصم';
      }
    }
  } catch {}

  // Friday allowance ONLY for days with real biometric attendance on Friday
  const fridayAllowance = fridayWorkedDays * fridayDailyRate;
  const fridayNote = fridayWorkedDays > 0 ? `${fridayWorkedDays} جمعات دوام فعلي × ${fridayDailyRate} = ${fridayAllowance} ريال` : null;
  // 9-Hour Monthly Flat Allowance: 100 SAR fixed for the month upon full attendance completion
  const dailyOvertimeAllowance = (is9HourShift && presentDays > 0) ? 100 : 0;
  const dailyOvertimeNote = dailyOvertimeAllowance > 0 ? 'بدل مقطوع عن اكتمال دوام 9 ساعات الشهري = 100 ريال' : null;

  // GOSI: 100% employer paid (zero deduction from employee)
  const isInsured = emp.is_insured === true || emp.is_insured === 'true';
  const gosiNumber = isInsured ? (emp.gosi_number || ('GSI-' + (emp.employee_number || '0000'))) : '';
  const gosiDeduction = 0;

  // Shortfall Approval
  let approvedShortfallDeduction = 0, shortfallApprovalStatus = 'pending', shortfallApprovalNote = '';
  try {
    const saved = localStorage.getItem('hr_flow_approval_' + (emp.employee_number || emp.id) + '_' + (monthPrefix || 'all'));
    if (saved) {
      const ap = JSON.parse(saved);
      shortfallApprovalStatus = ap.status || 'pending';
      if (ap.status === 'waived') {
        approvedShortfallDeduction = 0;
        shortfallApprovalNote = ap.note || 'تم التجاوز والإعفاء من خصم عجز الساعات بقرار الإدارة';
      } else if (ap.status === 'approved' || ap.status === 'modified') {
        approvedShortfallDeduction = Number(ap.finalDeduction) !== undefined ? Number(ap.finalDeduction) : proposedShortfallDeduction;
        shortfallApprovalNote = ap.note || (ap.status === 'modified' ? `خصم عجز ساعات معدل (${approvedShortfallDeduction} ر.س)` : 'معتمد للخصم');
      }
    } else {
      // Default to proposed delay deduction
      approvedShortfallDeduction = proposedShortfallDeduction;
    }
  } catch {
    approvedShortfallDeduction = proposedShortfallDeduction;
  }

  // 1. CUSTOM APPROVED BONUSES & INCENTIVES
  const empAdjustments = getEmployeeAdjustments(emp.employee_number || emp.id, monthPrefix);
  const approvedBonuses = empAdjustments.filter(a => a.type === 'bonus');
  const customBonusesTotal = approvedBonuses.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  // 2. CUSTOM APPROVED PENALTIES & DEDUCTIONS
  const approvedPenalties = empAdjustments.filter(a => a.type === 'penalty');
  const customPenaltiesTotal = approvedPenalties.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // 3. EMPLOYEE ADVANCE / LOAN INSTALLMENT
  const activeAdvance = getActiveAdvanceForEmployee(emp.employee_number || emp.id, monthPrefix);
  let advanceInstallment = 0;
  let advanceRemaining = 0;
  let advanceNote = '';
  let advanceOverrideStatus = 'auto'; // 'auto' | 'confirmed' | 'modified' | 'skipped'

  if (activeAdvance) {
    const scheduledInstallment = Math.min(
      Number(activeAdvance.monthly_installment || activeAdvance.monthly_deduction) || 0,
      Number(activeAdvance.remaining_balance) || 0
    );

    // Check if manager/accountant set a custom override for this month
    const override = getMonthlyAdvanceOverride(emp.employee_number || emp.id, monthPrefix);
    if (override) {
      advanceOverrideStatus = override.status;
      if (override.status === 'skipped') {
        advanceInstallment = 0;
        advanceRemaining = Number(activeAdvance.remaining_balance) || 0;
        advanceNote = 'تم تأجيل قسط هذا الشهر بقرار الإدارة';
      } else if (override.status === 'modified' || override.status === 'confirmed') {
        advanceInstallment = Math.min(Number(override.amount) || 0, Number(activeAdvance.remaining_balance) || 0);
        advanceRemaining = Math.max(0, (Number(activeAdvance.remaining_balance) || 0) - advanceInstallment);
        advanceNote = override.note || `قسط مخصص (${advanceInstallment} ر.س) — متبقي: ${advanceRemaining.toLocaleString('en-US')} ر.س`;
      }
    } else {
      advanceInstallment = scheduledInstallment;
      advanceRemaining = Math.max(0, (Number(activeAdvance.remaining_balance) || 0) - advanceInstallment);
      advanceNote = `قسط ${(activeAdvance.paid_installments || 0) + 1}/${activeAdvance.total_installments} — متبقي بعد الخصم: ${advanceRemaining.toLocaleString('en-US')} ر.س`;
    }
  }

  // TOTALS CALCULATION
  const totalAdditions = housing + transport + electricity + phone + otherAllowance + fridayAllowance + dailyOvertimeAllowance + customBonusesTotal;
  const totalDeductions = approvedShortfallDeduction + approvedAbsenceDeduction + proposedUnpaidLeaveDeduction + customPenaltiesTotal + advanceInstallment;
  const netSalary = Math.max(0, basicSalary + totalAdditions - totalDeductions);

  // 4. PAYOUT METHOD & SPLIT DISBURSEMENT (Bank Transfer vs Cash Handout)
  const payoutMethod = emp.payout_method || (emp.iban ? 'bank_full' : 'cash_full');
  let bankTransferAmount = 0;
  let cashPayoutAmount = 0;

  if (payoutMethod === 'bank_full') {
    bankTransferAmount = netSalary;
    cashPayoutAmount = 0;
  } else if (payoutMethod === 'cash_full') {
    bankTransferAmount = 0;
    cashPayoutAmount = netSalary;
  } else if (payoutMethod === 'split_bank_cash') {
    const fixedBank = Number(emp.bank_transfer_amount || emp.insured_salary || emp.basic_salary) || 0;
    bankTransferAmount = Math.min(fixedBank, netSalary);
    cashPayoutAmount = Math.max(0, netSalary - bankTransferAmount);
  }

  return {
    emp,
    shiftName,
    shift,
    shiftHours,
    dailyDetails,
    presentDays,
    absentDays,
    leaveDays,
    unpaidLeaveDays,
    fridayDays,
    fridayWorkedDays,
    overtimeDays,
    totalRequiredMinutes,
    totalActualMinutes,
    totalDelayMinutes,
    totalExtraMinutes,
    netExtraMinutes,
    totalShortfallMinutes,
    shortfallHours: Math.round(shortfallHours * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    dailySalaryRate,
    basicSalary,
    housing,
    transport,
    electricity,
    phone,
    otherAllowance,
    fridayAllowance,
    fridayNote,
    fridayDailyRate,
    dailyOvertimeAllowance,
    dailyOvertimeNote,
    isInsured,
    gosiNumber,
    gosiDeduction,
    proposedShortfallDeduction,
    approvedShortfallDeduction,
    proposedAbsenceDeduction,
    approvedAbsenceDeduction,
    absenceApprovalStatus,
    absenceApprovalNote,
    proposedUnpaidLeaveDeduction,
    shortfallApprovalStatus,
    shortfallApprovalNote,
    // Bonuses, Penalties, Advances
    approvedBonuses,
    customBonusesTotal,
    approvedPenalties,
    customPenaltiesTotal,
    activeAdvance,
    advanceInstallment,
    advanceRemaining,
    advanceNote,
    advanceOverrideStatus,
    activeAdvance,
    totalAdditions,
    totalDeductions,
    netSalary,
  };
}


/**
 * Save Absence Days Deduction Approval / Waiver
 */
export function saveAbsenceApproval(employeeNumber, monthPrefix, decision) {
  const record = {
    status: decision.status || 'approved', // 'approved' | 'waived' | 'modified'
    finalDeduction: Number(decision.finalDeduction) !== undefined ? Number(decision.finalDeduction) : 0,
    note: decision.note || '',
    approvedBy: decision.approvedBy || 'المدير العام',
    approvedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem('hr_flow_absence_appr_' + employeeNumber + '_' + monthPrefix, JSON.stringify(record));
    cloudSave('hr_flow_absence_appr_' + employeeNumber + '_' + monthPrefix, record);
  } catch {}
  appendAuditLog({ action: 'absence_' + decision.status, employeeNumber, monthPrefix, ...record });
  return record;
}

export function getAbsenceApproval(employeeNumber, monthPrefix) {
  try {
    const saved = localStorage.getItem('hr_flow_absence_appr_' + employeeNumber + '_' + monthPrefix);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveShortfallApproval(employeeNumber, monthPrefix, decision) {
  const record = {
    status: decision.status,
    finalDeduction: Number(decision.finalDeduction) || 0,
    note: decision.note || '',
    approvedBy: decision.approvedBy || 'المدير العام',
    approvedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem('hr_flow_approval_' + employeeNumber + '_' + monthPrefix, JSON.stringify(record));
    cloudSave('hr_flow_approval_' + employeeNumber + '_' + monthPrefix, record);
  } catch {}
  appendAuditLog({ action: 'shortfall_' + decision.status, employeeNumber, monthPrefix, ...record });
  return record;
}

export function getShortfallApproval(employeeNumber, monthPrefix) {
  try {
    const saved = localStorage.getItem('hr_flow_approval_' + employeeNumber + '_' + monthPrefix);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function appendAuditLog(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem('hr_flow_audit_log') || '[]');
    existing.unshift({
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      ...entry
    });
    localStorage.setItem('hr_flow_audit_log', JSON.stringify(existing.slice(0, 500)));
  } catch {}
}

export function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_audit_log') || '[]');
  } catch {
    return [];
  }
}

export function formatMinutes(m) {
  if (m === null || m === undefined) return '—';
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.round(Math.abs(m) % 60);
  if (h === 0 && min === 0) return '0 د';
  if (h === 0) return min + ' د';
  if (min === 0) return h + ' س';
  return h + ' س ' + min + ' د';
}

export function formatHours(hours) {
  if (!hours && hours !== 0) return '—';
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  if (h === 0 && m === 0) return '0:00';
  return h + ':' + m.toString().padStart(2, '0');
}

export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '—';
  try {
    let h, m;
    if (timeStr.toString().includes('T')) {
      const d = new Date(timeStr);
      h = d.getHours();
      m = d.getMinutes().toString().padStart(2, '0');
    } else {
      const parts = timeStr.replace(/\./g, ':').split(':');
      h = parseInt(parts[0], 10);
      m = (parts[1] || '00').padStart(2, '0');
    }
    const ap = h >= 12 ? 'م' : 'ص';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return h + ':' + m + ' ' + ap;
  } catch {
    return timeStr;
  }
}


// ============================================================================
// LOCKED MONTHLY PAYROLLS (ARCHIVE & CLOUD SNAPSHOTS)
// ============================================================================

export function getLockedMonthlyPayrolls() {
  try {
    return JSON.parse(localStorage.getItem('hr_flow_locked_payrolls_list') || '[]');
  } catch {
    return [];
  }
}

export function isMonthLocked(monthPrefix) {
  const list = getLockedMonthlyPayrolls();
  return list.some(m => m.month_prefix === monthPrefix && m.status === 'locked');
}

export function getLockedMonthlyPayroll(monthPrefix) {
  try {
    const data = localStorage.getItem('hr_flow_locked_payroll_' + monthPrefix);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveLockedMonthlyPayroll(monthPrefix, snapshotData, approvedBy = 'فهد ناصر محمد الجوعي (المدير العام)') {
  const record = {
    id: 'lock_' + monthPrefix.replace('-', '_'),
    month_prefix: monthPrefix,
    title: 'مسير رواتب شهر ' + (parseInt(monthPrefix.split('-')[1], 10)) + ' (' + monthPrefix + ')',
    totals: snapshotData.totals || {},
    payrolls: snapshotData.payrolls || [],
    employee_count: snapshotData.payrolls?.length || 0,
    status: 'locked',
    locked_at: new Date().toISOString(),
    locked_by: approvedBy,
  };

  // 1. Save specific snapshot
  localStorage.setItem('hr_flow_locked_payroll_' + monthPrefix, JSON.stringify(record));
  cloudSave('hr_flow_locked_payroll_' + monthPrefix, record);

  // 2. Update master locked list
  let list = getLockedMonthlyPayrolls();
  list = list.filter(m => m.month_prefix !== monthPrefix);
  list.unshift({
    month_prefix: record.month_prefix,
    title: record.title,
    totals: record.totals,
    employee_count: record.employee_count,
    status: 'locked',
    locked_at: record.locked_at,
    locked_by: record.locked_by
  });
  localStorage.setItem('hr_flow_locked_payrolls_list', JSON.stringify(list));
  cloudSave('hr_flow_locked_payrolls_list', list);

  // 3. Audit trail
  appendAuditLog({
    action: 'monthly_payroll_locked',
    monthPrefix,
    title: record.title,
    totalNet: record.totals?.net,
    employeeCount: record.employee_count,
    approvedBy,
  });

  return record;
}

export function unlockMonthlyPayroll(monthPrefix, reason = 'تعديل طارئ', unlockedBy = 'مدير النظام العام') {
  localStorage.removeItem('hr_flow_locked_payroll_' + monthPrefix);
  
  let list = getLockedMonthlyPayrolls();
  list = list.filter(m => m.month_prefix !== monthPrefix);
  localStorage.setItem('hr_flow_locked_payrolls_list', JSON.stringify(list));

  appendAuditLog({
    action: 'monthly_payroll_unlocked',
    monthPrefix,
    note: reason,
    approvedBy: unlockedBy,
  });
}


// ─── Audit Log Helpers ────────────────────────────────────────────────────────
export function saveAuditEntry(user, action, entityType, entityId, oldValue, newValue, reason) {
  try {
    const entry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      user_id: user?.id || user?.employee_number || 'unknown',
      user_name: user?.full_name || 'مستخدم',
      user_role: user?.role || 'unknown',
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      reason: reason || null,
      created_at: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('hr_audit_logs') || '[]');
    localStorage.setItem('hr_audit_logs', JSON.stringify([entry, ...existing].slice(0, 500)));
    return entry;
  } catch(e) {
    return null;
  }
}

export function getAuditEntries(filters) {
  try {
    const all = JSON.parse(localStorage.getItem('hr_audit_logs') || '[]');
    if (!filters) return all;
    return all.filter(e => {
      if (filters.entity_type && e.entity_type !== filters.entity_type) return false;
      if (filters.entity_id && e.entity_id !== filters.entity_id) return false;
      if (filters.user_id && e.user_id !== filters.user_id) return false;
      if (filters.action && !e.action.includes(filters.action)) return false;
      return true;
    });
  } catch(e) {
    return [];
  }
}

// ─── Notifications Helpers ────────────────────────────────────────────────────
export function createNotification({ recipientId, recipientRole, type, title, message, link, priority }) {
  try {
    const notif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      recipient_id: recipientId || null,
      recipient_role: recipientRole || null,
      type: type || 'info',
      title: title || '',
      message: message || '',
      is_read: false,
      link: link || null,
      priority: priority || 'normal',
      created_at: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('hr_notifications_v2') || '[]');
    localStorage.setItem('hr_notifications_v2', JSON.stringify([notif, ...existing].slice(0, 200)));
    return notif;
  } catch(e) {
    return null;
  }
}

export function getNotifications(userId, role) {
  try {
    const all = JSON.parse(localStorage.getItem('hr_notifications_v2') || '[]');
    return all.filter(n => {
      if (n.recipient_id && n.recipient_id === userId) return true;
      if (n.recipient_role && n.recipient_role === role) return true;
      if (!n.recipient_id && !n.recipient_role) return true;
      return false;
    });
  } catch(e) {
    return [];
  }
}

export function markNotificationRead(id) {
  try {
    const all = JSON.parse(localStorage.getItem('hr_notifications_v2') || '[]');
    const updated = all.map(n => n.id === id ? {...n, is_read: true} : n);
    localStorage.setItem('hr_notifications_v2', JSON.stringify(updated));
  } catch(e) {}
}

export function getUnreadNotificationCount(userId, role) {
  return getNotifications(userId, role).filter(n => !n.is_read).length;
}
