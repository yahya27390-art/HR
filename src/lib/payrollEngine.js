
/**
 * Check if employee is terminated, separated from work, or inactive
 */
export function isTerminatedOrInactiveEmployee(emp) {
  if (!emp) return false;
  const s = String(emp.status || '').toLowerCase().trim();
  return [
    'inactive',
    'terminated',
    'suspended',
    'متوقف عن العمل',
    'غير نشط',
    'مفصول',
    'مفصول عن العمل',
    'منتهي الخدمات',
    'مستقيل'
  ].includes(s);
}

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

/**
 * Extract and normalize all repayments across all advances (historical, manual, deductions, opening)
 */
export function getAllRepayments(advancesList = [], employeesList = []) {
  try {
    const list = Array.isArray(advancesList) && advancesList.length > 0 ? advancesList : getAdvances();
    const repayments = [];

    list.forEach(adv => {
      const norm = normalizeAdvance(adv);
      if (!norm || norm.total_amount <= 0) return;

      const emp = Array.isArray(employeesList) 
        ? employeesList.find(e => String(e.employee_number || e.id).trim() === String(norm.employee_number).trim())
        : null;

      const branchName = emp?.branch_name || norm.branch_name || norm.branch || 'غير محدد';
      const empName = emp?.full_name || norm.employee_name || 'موظف';
      const empNum = String(norm.employee_number || emp?.employee_number || '').trim();

      const history = Array.isArray(norm.history) ? norm.history : [];
      let totalHistoryAmount = 0;

      history.forEach((h, hIdx) => {
        const amt = Number(h.amount !== undefined ? h.amount : h.deducted_amount) || 0;
        if (amt > 0) {
          totalHistoryAmount += amt;
          const hId = h.id || `rep_${norm.id}_${hIdx}`;
          repayments.push({
            id: hId,
            advance_id: norm.id,
            employee_name: empName,
            employee_number: empNum,
            branch_name: branchName,
            amount: amt,
            payment_date: h.payment_date || (h.date ? h.date.slice(0, 10) : (h.month ? `${h.month}-28` : norm.disbursement_date || '2026-08-30')),
            payment_method: h.payment_method || (h.deducted_amount ? `استقطاع راتب (${h.month || ''})` : 'cash'),
            receipt_number: h.receipt_number || (h.month ? `PAYROLL-${h.month}` : `REC-${String(norm.id).slice(-4)}-${hIdx + 1}`),
            notes: h.notes || (h.deducted_amount ? `خصم قسط شهري من مسير رواتب شهر ${h.month}` : 'سداد دفعة من السلفة'),
            recorded_by: h.recorded_by || 'المحاسب المالي',
            recorded_at: h.recorded_at || h.date || new Date().toISOString(),
            is_payroll_deduction: !!h.deducted_amount,
            is_opening: false,
            advance_total: norm.total_amount,
            advance_remaining: norm.remaining_balance,
            advance_reason: norm.reason
          });
        }
      });

      // If paid_amount > totalHistoryAmount, surface the opening/past unaccounted repayment
      const unaccountedPaid = (Number(norm.paid_amount) || 0) - totalHistoryAmount;
      if (unaccountedPaid > 0) {
        repayments.push({
          id: `rep_init_${norm.id}`,
          advance_id: norm.id,
          employee_name: empName,
          employee_number: empNum,
          branch_name: branchName,
          amount: unaccountedPaid,
          payment_date: norm.disbursement_date || (norm.start_month ? `${norm.start_month}-01` : '2026-08-30'),
          payment_method: 'سداد سابق / رصيد افتتاحي',
          receipt_number: `REC-INIT-${empNum || String(norm.id).slice(-4)}`,
          notes: 'تسوية سداد سلفة سابقة (رصيد مسدد سابقاً)',
          recorded_by: 'الرصيد الافتتاحي',
          recorded_at: norm.created_at || '2026-08-30T00:00:00.000Z',
          is_payroll_deduction: false,
          is_opening: true,
          advance_total: norm.total_amount,
          advance_remaining: norm.remaining_balance,
          advance_reason: norm.reason
        });
      }
    });

    // Sort descending by date
    return repayments.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
  } catch (e) {
    console.error('Failed to get all repayments:', e);
    return [];
  }
}

/**
 * Update an existing advance repayment record and recalculate balances
 */
export async function updateAdvanceRepayment({ advanceId, paymentId, amount, paymentDate, paymentMethod, notes, receiptNumber, recordedBy }) {
  try {
    const list = getAdvances();
    const idx = list.findIndex(a => String(a.id) === String(advanceId));
    if (idx === -1) {
      throw new Error('السلفة المرتبطة غير موجودة بالنظام');
    }

    const adv = list[idx];
    const newAmount = Number(amount) || 0;
    if (newAmount <= 0) {
      throw new Error('مبلغ السداد يجب أن يكون أكبر من الصفر');
    }

    let history = Array.isArray(adv.history) ? [...adv.history] : [];
    const isOpening = String(paymentId).startsWith('rep_init_');

    if (isOpening) {
      history.push({
        id: paymentId,
        amount: newAmount,
        payment_date: paymentDate || adv.disbursement_date || '2026-08-30',
        payment_method: paymentMethod || 'سداد سابق / رصيد افتتاحي',
        receipt_number: receiptNumber || `REC-INIT-${adv.employee_number || '0'}`,
        notes: notes || 'تسوية سداد سلفة سابقة',
        recorded_by: recordedBy || 'المحاسب المالي',
        recorded_at: new Date().toISOString()
      });
    } else {
      const hIdx = history.findIndex((h, index) => (h.id || `rep_${adv.id}_${index}`) === paymentId);
      if (hIdx !== -1) {
        history[hIdx] = {
          ...history[hIdx],
          amount: newAmount,
          deducted_amount: history[hIdx].deducted_amount !== undefined ? newAmount : undefined,
          payment_date: paymentDate || history[hIdx].payment_date,
          payment_method: paymentMethod || history[hIdx].payment_method,
          receipt_number: receiptNumber || history[hIdx].receipt_number,
          notes: notes !== undefined ? notes : history[hIdx].notes,
          updated_at: new Date().toISOString(),
          updated_by: recordedBy || 'المحاسب المالي'
        };
      } else {
        history.push({
          id: paymentId || ('rep_' + Date.now()),
          amount: newAmount,
          payment_date: paymentDate || new Date().toISOString().split('T')[0],
          payment_method: paymentMethod || 'cash',
          receipt_number: receiptNumber || ('REC-' + Date.now().toString().slice(-6)),
          notes: notes || 'سداد دفعة من السلفة',
          recorded_by: recordedBy || 'المحاسب المالي',
          recorded_at: new Date().toISOString()
        });
      }
    }

    const newPaidAmount = history.reduce((sum, h) => sum + (Number(h.amount !== undefined ? h.amount : h.deducted_amount) || 0), 0);
    const newRemaining = Math.max(0, (Number(adv.total_amount) || 0) - newPaidAmount);

    const updated = {
      ...adv,
      paid_amount: newPaidAmount,
      remaining_balance: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active',
      history,
      updated_at: new Date().toISOString(),
      updated_by: recordedBy || 'المحاسب المالي'
    };

    list[idx] = updated;
    localStorage.setItem('hr_advances_list', JSON.stringify(list));
    localStorage.setItem('hr_flow_employee_advances', JSON.stringify(list));

    await cloudSave('hr_advances_list', list);
    await cloudSave('hr_flow_employee_advances', list);
    return updated;
  } catch (e) {
    console.error('Error updating advance repayment:', e);
    throw e;
  }
}

/**
 * Delete an advance repayment record and recalculate balances
 */
export async function deleteAdvanceRepayment({ advanceId, paymentId }) {
  try {
    const list = getAdvances();
    const idx = list.findIndex(a => String(a.id) === String(advanceId));
    if (idx === -1) {
      throw new Error('السلفة المرتبطة غير موجودة بالنظام');
    }

    const adv = list[idx];
    let history = Array.isArray(adv.history) ? [...adv.history] : [];
    const isOpening = String(paymentId).startsWith('rep_init_');

    if (!isOpening) {
      history = history.filter((h, index) => {
        const hId = h.id || `rep_${adv.id}_${index}`;
        return hId !== paymentId;
      });
    }

    const newPaidAmount = history.reduce((sum, h) => sum + (Number(h.amount !== undefined ? h.amount : h.deducted_amount) || 0), 0);
    const newRemaining = Math.max(0, (Number(adv.total_amount) || 0) - newPaidAmount);

    const updated = {
      ...adv,
      paid_amount: newPaidAmount,
      remaining_balance: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active',
      history,
      updated_at: new Date().toISOString(),
      updated_by: 'المحاسب المالي (حذف سداد)'
    };

    list[idx] = updated;
    localStorage.setItem('hr_advances_list', JSON.stringify(list));
    localStorage.setItem('hr_flow_employee_advances', JSON.stringify(list));

    await cloudSave('hr_advances_list', list);
    await cloudSave('hr_flow_employee_advances', list);
    return updated;
  } catch (e) {
    console.error('Error deleting advance repayment:', e);
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

/**
 * Intelligent parser for biometrics punches during the day:
 * Adopts FIRST punch and LAST punch of each shift (morning 08:00-12:00 and evening 16:00-21:00).
 * Ignores all intermediate punches between first and last punch!
 */
export function parseRawPunchesToPeriods(rawString, isSplitShift = true) {
  if (!rawString) {
    return {
      period_1_in: '',
      period_1_out: '',
      period_2_in: '',
      period_2_out: '',
      timestamp_raw: '',
      total_hours: 0,
      actual_minutes: 0
    };
  }

  // If already structured with '&' (e.g. "07:58:00 -- 12:17:00 & 16:23:00 -- 21:18:00")
  if (rawString.includes('&')) {
    const parts = rawString.split('&');
    const p1Times = extractTimes(parts[0]);
    const p2Times = extractTimes(parts[1]);
    const p1In = p1Times[0] || '';
    const p1Out = p1Times.length > 1 ? p1Times[p1Times.length - 1] : '';
    const p2In = p2Times[0] || '';
    const p2Out = p2Times.length > 1 ? p2Times[p2Times.length - 1] : '';

    let dur1 = 0, dur2 = 0;
    if (p1In && p1Out) {
      const mIn = parseTimeToMinutes(p1In), mOut = parseTimeToMinutes(p1Out);
      if (mIn !== null && mOut !== null) dur1 = mOut >= mIn ? mOut - mIn : (mOut + 1440) - mIn;
    }
    if (p2In && p2Out) {
      const mIn = parseTimeToMinutes(p2In), mOut = parseTimeToMinutes(p2Out);
      if (mIn !== null && mOut !== null) dur2 = mOut >= mIn ? mOut - mIn : (mOut + 1440) - mIn;
    }
    const totalMinutes = dur1 + dur2;
    return {
      period_1_in: p1In,
      period_1_out: p1Out,
      period_2_in: p2In,
      period_2_out: p2Out,
      timestamp_raw: rawString,
      total_hours: Math.round((totalMinutes / 60) * 100) / 100,
      actual_minutes: totalMinutes
    };
  }

  // Extract all distinct times in HH:MM format and sort chronologically
  const allTimes = extractTimes(rawString);
  const uniqueTimes = Array.from(new Set(allTimes)).sort();

  if (uniqueTimes.length === 0) {
    return {
      period_1_in: '',
      period_1_out: '',
      period_2_in: '',
      period_2_out: '',
      timestamp_raw: '',
      total_hours: 0,
      actual_minutes: 0
    };
  }

  // If not a split shift, first is IN, last is OUT, intermediate ignored!
  if (!isSplitShift) {
    const p1In = uniqueTimes[0];
    const p1Out = uniqueTimes.length > 1 ? uniqueTimes[uniqueTimes.length - 1] : '';
    let totalMinutes = 0;
    if (p1In && p1Out) {
      const mIn = parseTimeToMinutes(p1In), mOut = parseTimeToMinutes(p1Out);
      if (mIn !== null && mOut !== null) totalMinutes = mOut >= mIn ? mOut - mIn : (mOut + 1440) - mIn;
    }
    const formattedRaw = p1Out ? `${p1In}:00 -- ${p1Out}:00` : `${p1In}:00 --`;
    return {
      period_1_in: p1In,
      period_1_out: p1Out,
      period_2_in: '',
      period_2_out: '',
      timestamp_raw: formattedRaw,
      total_hours: Math.round((totalMinutes / 60) * 100) / 100,
      actual_minutes: totalMinutes
    };
  }

  // DUAL / SPLIT SHIFT: Separate punches into Morning (< 14:30) and Evening (>= 14:30)
  // Shift 1: 08:00 - 12:00 / 13:00
  // Shift 2: 16:00 - 20:00 / 21:00
  const mTimes = [];
  const eTimes = [];

  uniqueTimes.forEach(t => {
    const mins = parseTimeToMinutes(t);
    if (mins !== null) {
      if (mins < 870) { // Before 14:30 -> Morning Shift
        mTimes.push(t);
      } else { // 14:30 onwards -> Evening Shift
        eTimes.push(t);
      }
    }
  });

  let p1In = '';
  let p1Out = '';
  let p2In = '';
  let p2Out = '';

  // Morning shift: First is Check In 1, Last is Check Out 1. All middle punches ignored!
  if (mTimes.length >= 2) {
    p1In = mTimes[0];
    p1Out = mTimes[mTimes.length - 1];
  } else if (mTimes.length === 1) {
    p1In = mTimes[0];
    p1Out = '';
  }

  // Evening shift: First is Check In 2, Last is Check Out 2. All middle punches ignored!
  if (eTimes.length >= 2) {
    p2In = eTimes[0];
    p2Out = eTimes[eTimes.length - 1];
  } else if (eTimes.length === 1) {
    const mins = parseTimeToMinutes(eTimes[0]);
    if (mins !== null && mins >= 1110) { // 18:30 onwards -> Check Out punch
      p2In = '';
      p2Out = eTimes[0];
    } else { // Before 18:30 -> Check In punch
      p2In = eTimes[0];
      p2Out = '';
    }
  }

  let dur1 = 0, dur2 = 0;
  if (p1In && p1Out) {
    const mIn = parseTimeToMinutes(p1In), mOut = parseTimeToMinutes(p1Out);
    if (mIn !== null && mOut !== null) dur1 = mOut >= mIn ? mOut - mIn : (mOut + 1440) - mIn;
  }
  if (p2In && p2Out) {
    const mIn = parseTimeToMinutes(p2In), mOut = parseTimeToMinutes(p2Out);
    if (mIn !== null && mOut !== null) dur2 = mOut >= mIn ? mOut - mIn : (mOut + 1440) - mIn;
  }
  const totalMinutes = dur1 + dur2;

  // Format the standardized timestamp_raw string exactly matching official biometrics
  let formattedRaw = '';
  if (mTimes.length > 0 && eTimes.length > 0) {
    const p1Str = `${p1In ? p1In + ':00' : ''} -- ${p1Out ? p1Out + ':00' : ''}`.trim();
    const p2Str = `${p2In ? p2In + ':00' : ''} -- ${p2Out ? p2Out + ':00' : ''}`.trim();
    formattedRaw = `${p1Str} & ${p2Str}`;
  } else if (mTimes.length > 0) {
    formattedRaw = `${p1In ? p1In + ':00' : ''} -- ${p1Out ? p1Out + ':00' : ''}`.trim();
  } else if (eTimes.length > 0) {
    formattedRaw = `${p2In ? p2In + ':00' : ''} -- ${p2Out ? p2Out + ':00' : ''}`.trim();
  }

  return {
    period_1_in: p1In,
    period_1_out: p1Out,
    period_2_in: p2In,
    period_2_out: p2Out,
    timestamp_raw: formattedRaw,
    total_hours: Math.round((totalMinutes / 60) * 100) / 100,
    actual_minutes: totalMinutes
  };
}

export function calcActualMinutes(log) {
  if (!log) return 0;

  let notesData = {};
  if (typeof log.notes === 'string' && log.notes.startsWith('{')) {
    try { notesData = JSON.parse(log.notes); } catch {}
  }
  
  const isPeriod2Cancelled = log.period_2_cancelled === true || notesData.period_2_cancelled === true;
  const p1In = log.period_1_in !== undefined && log.period_1_in !== null ? log.period_1_in : (notesData.period_1_in || '');
  const p1Out = log.period_1_out !== undefined && log.period_1_out !== null ? log.period_1_out : (notesData.period_1_out || '');
  const p2In = isPeriod2Cancelled ? '' : (log.period_2_in !== undefined && log.period_2_in !== null ? log.period_2_in : (notesData.period_2_in || ''));
  const p2Out = isPeriod2Cancelled ? '' : (log.period_2_out !== undefined && log.period_2_out !== null ? log.period_2_out : (notesData.period_2_out || ''));

  // 1. Direct multi-period calculation if period_1 or period_2 are explicitly present
  if (p1In && p1Out) {
    const m1In = parseTimeToMinutes(p1In);
    const m1Out = parseTimeToMinutes(p1Out);
    let dur1 = 0;
    if (m1In !== null && m1Out !== null) {
      dur1 = m1Out >= m1In ? m1Out - m1In : (m1Out + 1440) - m1In;
    }
    let dur2 = 0;
    if (p2In && p2Out) {
      const m2In = parseTimeToMinutes(p2In);
      const m2Out = parseTimeToMinutes(p2Out);
      if (m2In !== null && m2Out !== null) {
        dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
      }
    }
    const total = dur1 + dur2;
    if (total > 0 && total <= 1440) return total;
  }

  // 1b. Direct multi-period calculation if only period_2 is present (attended second shift only)
  if (!isPeriod2Cancelled && p2In && p2Out) {
    const m2In = parseTimeToMinutes(p2In);
    const m2Out = parseTimeToMinutes(p2Out);
    if (m2In !== null && m2Out !== null) {
      const dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
      if (dur2 > 0 && dur2 <= 1440) return dur2;
    }
  }

  // 2. Parse from raw punches using the first-and-last shift algorithm (ignoring middle punches)
  const raw = log.timestamp_raw || log.punches_raw || '';
  if (raw && !isPeriod2Cancelled) {
    const parsed = parseRawPunchesToPeriods(raw, true);
    if (parsed.actual_minutes > 0) {
      return parsed.actual_minutes;
    }
  }

  if (log.total_hours && Number(log.total_hours) > 0) {
    return Math.round(Number(log.total_hours) * 60);
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

export function isNationalDay(log) {
  if (!log) return false;
  const dateStr = log.log_date || log.date;
  if (dateStr) {
    const clean = String(dateStr).split('T')[0].trim().replace(/\//g, '-');
    if (clean.endsWith('-09-23') || clean.endsWith('-9-23') || clean.startsWith('23-09-') || clean.startsWith('23-9-') || clean.includes('-09-23') || clean.includes('-9-23')) {
      return true;
    }
  }
  const name = (log.day_name || log.notes || log.status_label || '').toLowerCase();
  if (name.includes('اليوم الوطني') || name.includes('national day')) return true;
  return false;
}

export function isOfficialHoliday(log) {
  if (!log) return false;
  if (isNationalDay(log)) return { isHoliday: true, name: 'عطلة اليوم الوطني السعودي 🇸🇦', type: 'national_day' };
  const dateStr = log.log_date || log.date;
  if (dateStr) {
    const clean = String(dateStr).split('T')[0].trim().replace(/\//g, '-');
    if (clean.endsWith('-02-22') || clean.endsWith('-2-22') || clean.startsWith('22-02-') || clean.includes('-02-22')) {
      return { isHoliday: true, name: 'عطلة يوم التأسيس السعودي 🇸🇦', type: 'founding_day' };
    }
  }
  const status = (log.status || '').toLowerCase();
  const label = (log.status_label || log.statusLabel || log.notes || '').toLowerCase();
  if (status.includes('holiday') || status.includes('عطلة') || label.includes('عيد الفطر') || label.includes('عيد الأضحى') || label.includes('اليوم الوطني') || label.includes('يوم التأسيس') || label.includes('عطلة رسمية') || label.includes('إجازة رسمية') || label.includes('اجازة رسمية')) {
    let holidayName = 'عطلة رسمية';
    if (label.includes('عيد الفطر')) holidayName = 'عطلة عيد الفطر المبارك';
    else if (label.includes('عيد الأضحى')) holidayName = 'عطلة عيد الأضحى المبارك';
    else if (label.includes('اليوم الوطني')) holidayName = 'عطلة اليوم الوطني السعودي 🇸🇦';
    else if (label.includes('يوم التأسيس')) holidayName = 'عطلة يوم التأسيس السعودي 🇸🇦';
    else if (log.notes) holidayName = log.notes;
    return { isHoliday: true, name: holidayName, type: 'official_holiday' };
  }
  return false;
}

export function isDayExempt(log) {
  if (!log) return false;
  if (isNationalDay(log)) return true; // Saudi National Day (23/09)
  if (isOfficialHoliday(log)) return true; // Official Holidays (Eid, etc.)
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

export function getArabicDayName(dateStr, existingName) {
  if (existingName && typeof existingName === 'string' && existingName.trim().length > 1) {
    const clean = existingName.trim();
    if (!clean.includes('-') && !clean.includes('/') && !/^\d+$/.test(clean)) {
      return clean;
    }
  }
  if (!dateStr) return '';
  try {
    const cleanDate = String(dateStr).split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayIdx = d.getUTCDay();
      return dayNames[dayIdx] || '';
    }
  } catch {}
  return '';
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
    const unified = JSON.parse(localStorage.getItem('hr_flow_unified_requests') || '[]');

    const unifiedAdvs = (Array.isArray(unified) ? unified : [])
      .filter(u => ['advance', 'salary_advance', 'loan'].includes(u.type) && ['approved', 'disbursed', 'active'].includes(u.status))
      .map(u => ({
        id: u.id,
        employee_id: u.employee_id,
        employee_number: String(u.employee_number || '').trim(),
        employee_name: u.employee_name,
        total_amount: Number(u.details?.amount || u.amount || 0),
        amount: Number(u.details?.amount || u.amount || 0),
        total_installments: Number(u.details?.installments || u.installments || 1),
        installments: Number(u.details?.installments || u.installments || 1),
        monthly_installment: Math.round(Number(u.details?.amount || u.amount || 0) / Number(u.details?.installments || u.installments || 1)),
        monthly_deduction: Math.round(Number(u.details?.amount || u.amount || 0) / Number(u.details?.installments || u.installments || 1)),
        paid_amount: Number(u.paid_amount || 0),
        remaining_balance: Number(u.remaining_balance !== undefined ? u.remaining_balance : (u.details?.amount || u.amount || 0)),
        start_month: u.start_month || (u.created_at ? u.created_at.slice(0, 7) : '2026-08'),
        reason: u.reason || u.details?.reason || 'طلب سلفة راتب',
        status: u.status === 'disbursed' ? 'disbursed' : 'active',
        source: 'employee_request',
        is_employee_request: true,
        created_at: u.created_at || new Date().toISOString()
      }));

    const combined = [
      ...(Array.isArray(list1) ? list1 : []),
      ...(Array.isArray(list2) ? list2 : []),
      ...unifiedAdvs,
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
    const list = JSON.parse(localStorage.getItem('hr_flow_payroll_adjustments') || '[]');
    const unified = JSON.parse(localStorage.getItem('hr_flow_unified_requests') || '[]');
    
    const combined = Array.isArray(list) ? [...list] : [];
    (Array.isArray(unified) ? unified : []).forEach(u => {
      if (['bonus', 'reward', 'penalty', 'deduction', 'sales_incentive'].includes(u.type) && u.status === 'approved') {
        if (!combined.some(a => a.id === u.id)) {
          combined.push({
            id: u.id,
            type: ['bonus', 'reward', 'sales_incentive'].includes(u.type) ? 'bonus' : 'penalty',
            category: u.type,
            employee_id: u.employee_id,
            employee_number: String(u.employee_number || '').trim(),
            employee_name: u.employee_name,
            month_prefix: (u.created_at || '').slice(0, 7) || '2026-08',
            amount: Number(u.details?.amount || u.amount || 0),
            reason: u.reason || u.details?.reason || (['bonus', 'reward', 'sales_incentive'].includes(u.type) ? 'مكافأة معتمدة' : 'خصم معتمد'),
            status: 'approved',
            approved_by: u.approved_by || 'المدير العام',
            created_at: u.created_at || new Date().toISOString()
          });
        }
      }
    });
    return combined;
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
    monthPrefix = new Date().toISOString().slice(0, 7),
  } = settings;

  const shiftName = emp.shift || '';
  const shift = (allShifts || []).find(s =>
    s.name === shiftName || s.id === shiftName || (s.name && shiftName && s.name.includes(shiftName))
  ) || null;
  const is9HourShift = shiftName.includes('9 ساعات') || 
    shiftName.includes('غير سعودي') ||
    shiftName.includes('إضافي 100') ||
    (shift && shift.working_hours === 9) ||
    (shift && (shift.has_overtime || shift.id === 'sh_non_saudi_overtime'));
  const shiftHours = is9HourShift ? 9 : (shift ? getShiftRequiredHours(shift) : (shiftName.includes('8 ساعات') ? 8 : 8));

  const empNum = String(emp.employee_number || '').trim();
  const empId = String(emp.id || '').trim();
  const empName = (emp.full_name || '').trim();

  // ─── LOAD APPROVED REQUESTS & PERMISSIONS FOR THIS EMPLOYEE ───
  let approvedLeaves = [];
  let approvedPermissions = [];
  let approvedCorrections = [];
  try {
    const rawLeaves = JSON.parse(localStorage.getItem('hr_leave_requests') || '[]');
    const rawCorrs = JSON.parse(localStorage.getItem('hr_correction_requests') || '[]');
    const rawUnified = JSON.parse(localStorage.getItem('hr_flow_unified_requests') || '[]');

    const allLeavesList = [...(Array.isArray(rawLeaves) ? rawLeaves : [])];
    (Array.isArray(rawUnified) ? rawUnified : []).forEach(u => {
      if (['annual_leave', 'leave_extension', 'return_from_leave', 'permission'].includes(u.type)) {
        if (!allLeavesList.some(l => l.id === u.id)) {
          allLeavesList.push({
            id: u.id,
            employee_number: String(u.employee_number || '').trim(),
            employee_id: String(u.employee_id || '').trim(),
            leave_type: u.details?.leaveSubType || u.details?.request_label || (u.type === 'permission' ? 'استئذان' : 'إجازة'),
            start_date: u.details?.startDate || (u.created_at || '').split('T')[0],
            end_date: u.details?.endDate || u.details?.startDate || (u.created_at || '').split('T')[0],
            status: u.status,
            type: u.type,
            permission_hours: Number(u.details?.permissionHours) || 2,
            reason: u.reason || u.details?.reason || ''
          });
        }
      }
    });

    const isEmpMatch = (record) => {
      const rNum = String(record.employee_number || '').trim();
      const rId = String(record.employee_id || '').trim();
      return (rNum && (rNum === empNum || rNum === empId || `emp_${rNum}` === empId)) ||
             (rId && (rId === empId || rId === empNum || rId === `emp_${empNum}`));
    };

    allLeavesList.filter(l => isEmpMatch(l) && (l.status === 'approved' || l.status === 'active')).forEach(l => {
      if (l.type === 'permission' || (l.leave_type && l.leave_type.includes('استئذان'))) {
        approvedPermissions.push(l);
      } else {
        approvedLeaves.push(l);
      }
    });

    // Approved Punch Corrections
    const allCorrsList = [...(Array.isArray(rawCorrs) ? rawCorrs : [])];
    (Array.isArray(rawUnified) ? rawUnified : []).forEach(u => {
      if (['punch_correction', 'attendance_correction'].includes(u.type)) {
        if (!allCorrsList.some(c => c.id === u.id)) {
          allCorrsList.push({
            id: u.id,
            employee_number: String(u.employee_number || '').trim(),
            employee_id: String(u.employee_id || '').trim(),
            log_date: u.details?.startDate || u.details?.targetDate || u.details?.log_date || (u.created_at || '').split('T')[0],
            check_in: u.details?.checkInTime || '09:00',
            check_out: u.details?.checkOutTime || '17:00',
            status: u.status
          });
        }
      }
    });

    approvedCorrections = allCorrsList.filter(c => isEmpMatch(c) && c.status === 'approved');
  } catch (e) {
    console.warn('Error fetching employee leaves/corrections for payroll:', e);
  }

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

  // Synthesize logs for any approved leaves covering dates with no punches
  approvedLeaves.forEach(lv => {
    if (!lv.start_date) return;
    const s = new Date(lv.start_date);
    const e = new Date(lv.end_date || lv.start_date);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      if (monthPrefix && !dStr.startsWith(monthPrefix)) continue;
      const isUnpaid = (lv.leave_type || '').includes('بدون راتب') || lv.details?.leaveSubType === 'unpaid';
      if (!dateMap[dStr]) {
        dateMap[dStr] = {
          log_date: dStr,
          status: isUnpaid ? 'unpaid_leave' : 'annual_leave',
          status_label: lv.leave_type || (isUnpaid ? 'إجازة بدون راتب' : 'إجازة سنوية'),
          check_in: null,
          check_out: null,
          total_hours: 0,
          actual_minutes: 0,
          is_exempt: !isUnpaid,
          is_unpaid: isUnpaid
        };
      } else {
        dateMap[dStr] = {
          ...dateMap[dStr],
          status: isUnpaid ? 'unpaid_leave' : 'annual_leave',
          status_label: lv.leave_type || (isUnpaid ? 'إجازة بدون راتب' : 'إجازة سنوية'),
          is_exempt: !isUnpaid,
          is_unpaid: isUnpaid
        };
      }
    }
  });

  // Apply approved punch corrections over dateMap
  approvedCorrections.forEach(corr => {
    if (!corr.log_date) return;
    if (monthPrefix && !corr.log_date.startsWith(monthPrefix)) return;
    const inTime = corr.check_in || '09:00';
    const outTime = corr.check_out || '17:00';
    const inParts = inTime.split(':').map(Number);
    const outParts = outTime.split(':').map(Number);
    const inM = (inParts[0] || 0) * 60 + (inParts[1] || 0);
    const outM = (outParts[0] || 0) * 60 + (outParts[1] || 0);
    const durMins = outM >= inM ? outM - inM : (outM + 1440) - inM;

    if (!dateMap[corr.log_date]) {
      dateMap[corr.log_date] = {
        log_date: corr.log_date,
        check_in: inTime,
        check_out: outTime,
        status: 'present',
        status_label: 'حاضر (تصحيح معتمد)',
        total_hours: Math.round((durMins / 60) * 10) / 10,
        actual_minutes: durMins,
        has_approved_correction: true
      };
    } else {
      dateMap[corr.log_date] = {
        ...dateMap[corr.log_date],
        check_in: inTime,
        check_out: outTime,
        status: 'present',
        status_label: 'حاضر (تصحيح معتمد)',
        total_hours: Math.round((durMins / 60) * 10) / 10,
        actual_minutes: durMins,
        has_approved_correction: true
      };
    }
  });

  // ─── ENSURE FULL CALENDAR GRID FOR THE MONTH (توليد شبكة أيام الشهر كاملة للمسير) ───
  // A complete monthly payroll table must display all calendar days (1 to 28/29/30/31).
  // Days without punch logs must be represented as:
  // - Friday (عطلة جمعة)
  // - Saudi National Day (اليوم الوطني السعودي)
  // - Official Holiday (عطلة رسمية)
  // - Absent (غائب) for regular work days with no attendance
  let targetYear = null;
  let targetMonth = null;
  let daysInMonth = 30;

  if (monthPrefix && monthPrefix.includes('-')) {
    const parts = monthPrefix.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      targetYear = y;
      targetMonth = m;
      daysInMonth = new Date(y, m, 0).getDate();
    }
  } else {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = now.getMonth() + 1;
    daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  }

  if (targetYear && targetMonth) {
    const yStr = String(targetYear);
    const mStr = String(targetMonth).padStart(2, '0');
    const hireDateStr = emp.join_date || emp.hire_date || null;

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${yStr}-${mStr}-${String(day).padStart(2, '0')}`;
      if (!dateMap[dStr]) {
        const dummyLog = { log_date: dStr };
        const isFri = isFriday(dummyLog);
        const isNatDay = isNationalDay(dummyLog);
        const holidayInfo = isOfficialHoliday(dummyLog);
        const isBeforeHire = hireDateStr && dStr < hireDateStr;

        let dayStatus = 'absent';
        let dayStatusLabel = 'غائب';
        let isExemptDay = false;

        if (isFri) {
          dayStatus = 'friday';
          dayStatusLabel = 'جمعة (عطلة أسبوعية)';
        } else if (isNatDay) {
          dayStatus = 'official_holiday';
          dayStatusLabel = 'اليوم الوطني السعودي 🇸🇦';
        } else if (holidayInfo) {
          dayStatus = 'official_holiday';
          dayStatusLabel = holidayInfo.name || 'عطلة رسمية';
        } else if (isBeforeHire) {
          dayStatus = 'exempt';
          dayStatusLabel = 'قبل تاريخ المباشرة';
          isExemptDay = true;
        }

        dateMap[dStr] = {
          id: `att_${empNum || empId}_${dStr.replace(/-/g, '_')}`,
          log_date: dStr,
          day_name: getArabicDayName(dStr),
          employee_id: empId,
          employee_number: empNum,
          employee_name: empName,
          check_in: null,
          check_out: null,
          period_1_in: '',
          period_1_out: '',
          period_2_in: '',
          period_2_out: '',
          total_hours: 0,
          actual_minutes: 0,
          status: dayStatus,
          status_label: dayStatusLabel,
          is_exempt: isExemptDay,
          is_synthesized_day: true
        };
      }
    }
  }

  const uniqueLogs = Object.values(dateMap).sort((a, b) => (a.log_date || '').localeCompare(b.log_date || ''));

  let totalRequiredMinutes = 0, totalActualMinutes = 0;
  let totalDelayMinutes = 0, totalExtraMinutes = 0;
  let presentDays = 0, absentDays = 0, leaveDays = 0, unpaidLeaveDays = 0, fridayDays = 0, fridayWorkedDays = 0, overtimeDays = 0;
  let nationalDayWorkedDays = 0, officialHolidayDays = 0;

  const isExecutive = (emp.job_title || '').includes('المدير العام') || String(emp.employee_number || '') === '1001' || (emp.shift || '').includes('المدير العام') || (emp.shift || '').includes('إدارة عامة');

  const dailyDetails = uniqueLogs.map(log => {
    const isFri = isFriday(log);
    const isNatDay = isNationalDay(log);
    const holidayInfo = isOfficialHoliday(log);
    const exempt = isDayExempt(log) || log.is_exempt || (isExecutive && !isFri);
    const hasAtt = hasRealBiometricPunches(log) || !!log.has_approved_correction || (isExecutive && !!log.check_in);
    const status = (log.status || 'present').toLowerCase();
    const isUnpaidLeave = status === 'unpaid_leave' || log.is_unpaid || status === 'إجازة بدون راتب' || status === 'اجازة بدون راتب';
    
    // Check approved permission for this day
    const dayPermission = approvedPermissions.find(p => p.start_date === log.log_date || p.log_date === log.log_date);
    const approvedPermHours = dayPermission ? (Number(dayPermission.permission_hours) || 2) : 0;

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
    } else if (isNatDay) {
      // 3. SAUDI NATIONAL DAY (23/9 - اليوم الوطني السعودي)
      // Official paid holiday. If attended: +2 days extra compensation based on basic salary in Stage 3.
      // If not attended: 0 required, 0 shortfall, NEVER marked as absent!
      requiredMins = 0;
      shortfallMins = 0;
      if (hasAtt) {
        nationalDayWorkedDays++;
        presentDays++;
        actualMins = actualMins || (shiftHours * 60);
      } else {
        officialHolidayDays++;
        actualMins = 0;
      }
    } else if (holidayInfo) {
      // 4. OFFICIAL HOLIDAY (Eid al-Fitr, Eid al-Adha, Founding Day, etc.)
      // Official paid holiday. If attended: counted as present. If off: 0 required, never absent.
      requiredMins = 0;
      shortfallMins = 0;
      officialHolidayDays++;
      if (hasAtt) {
        presentDays++;
        actualMins = actualMins || (shiftHours * 60);
      } else {
        actualMins = 0;
      }
    } else if (exempt) {
      // 5. EXEMPT / PAID LEAVE DAY (Annual, Sick, Emergency, or Admin Exemption)
      requiredMins = 0;
      shortfallMins = 0;
      actualMins = actualMins || 0;
      if (status.includes('إجازة') || status.includes('leave') || status === 'on_leave') leaveDays++;
      else if (isExecutive) presentDays++;
    } else if (hasAtt) {
      // 6. REGULAR WORKING DAY WITH ATTENDANCE
      presentDays++;
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      const actual = actualMins || 0;
      totalActualMinutes += actual;

      if (actual < requiredMins) {
        // Late / Delay on attended work day
        let delay = requiredMins - actual;
        // EXCUSE DELAY WITH APPROVED PERMISSION HOURS
        if (approvedPermHours > 0) {
          const excusedMins = approvedPermHours * 60;
          delay = Math.max(0, delay - excusedMins);
        }
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
      // 7. EXECUTIVE
      requiredMins = shiftHours * 60;
      totalRequiredMinutes += requiredMins;
      totalActualMinutes += requiredMins;
      shortfallMins = 0;
      presentDays++;
    } else {
      // 8. ABSENCE DAY (Regular working day, not Friday, not exempt, no punches)
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

    let notesData = {};
    if (typeof log.notes === 'string' && log.notes.startsWith('{')) {
      try { notesData = JSON.parse(log.notes); } catch {}
    }
    const isPeriod2Cancelled = log.period_2_cancelled === true || notesData.period_2_cancelled === true || (log.period_2_in === '' && log.period_2_out === '' && (log.period_1_in || notesData.period_1_in));

    // Robust Multi-Period Punch Extraction (Morning & Evening Periods: First & Last Punch)
    const isSplit = is9HourShift || shiftName.includes('فترتين') || shiftName.includes('غير سعودي');
    const parsedRaw = parseRawPunchesToPeriods(log.timestamp_raw || log.punches_raw || '', isSplit);

    let p1In = (log.period_1_in !== undefined && log.period_1_in !== null) 
      ? log.period_1_in 
      : (notesData.period_1_in !== undefined ? notesData.period_1_in : (parsedRaw.period_1_in || (log.check_in ? (log.check_in.includes('T') ? log.check_in.slice(11, 16) : log.check_in.slice(0, 5)) : '')));
    let p1Out = (log.period_1_out !== undefined && log.period_1_out !== null) 
      ? log.period_1_out 
      : (notesData.period_1_out !== undefined ? notesData.period_1_out : (parsedRaw.period_1_out || (log.check_out ? (log.check_out.includes('T') ? log.check_out.slice(11, 16) : log.check_out.slice(0, 5)) : '')));
    let p2In = isPeriod2Cancelled 
      ? '' 
      : ((log.period_2_in !== undefined && log.period_2_in !== null) 
        ? log.period_2_in 
        : (notesData.period_2_in !== undefined ? notesData.period_2_in : parsedRaw.period_2_in));
    let p2Out = isPeriod2Cancelled 
      ? '' 
      : ((log.period_2_out !== undefined && log.period_2_out !== null) 
        ? log.period_2_out 
        : (notesData.period_2_out !== undefined ? notesData.period_2_out : parsedRaw.period_2_out));

    const displayCheckIn = (hasAtt || isExecutive) ? (p1In || log.check_in || '') : '';
    const displayCheckOut = (hasAtt || isExecutive) ? (p2Out || p1Out || log.check_out || (isExecutive ? '16:00' : '')) : '';
    const displayP1In = (hasAtt || isExecutive) ? p1In : '';
    const displayP1Out = (hasAtt || isExecutive) ? p1Out : '';
    const displayP2In = (hasAtt || isExecutive) ? p2In : '';
    const displayP2Out = (hasAtt || isExecutive) ? p2Out : '';

    const surplusMins = (hasAtt && !exempt && !isFri && actualMins > requiredMins) ? (actualMins - requiredMins) : 0;

    let rowStatus = 'present';
    if (isNatDay) {
      rowStatus = hasAtt ? 'national_day_worked' : 'holiday';
    } else if (holidayInfo) {
      rowStatus = hasAtt ? 'holiday_worked' : 'holiday';
    } else if (isFri) {
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
      day_name: getArabicDayName(log.log_date, log.day_name),
      status: rowStatus,
      check_in: displayCheckIn,
      check_out: displayCheckOut,
      period_1_in: displayP1In,
      period_1_out: displayP1Out,
      period_2_in: displayP2In,
      period_2_out: displayP2Out,
      timestamp_raw: hasAtt ? (log.timestamp_raw || '') : '',
      isFriday: isFri,
      isNationalDay: isNatDay,
      isOfficialHoliday: Boolean(holidayInfo || isNatDay),
      holidayName: isNatDay ? 'اليوم الوطني السعودي 🇸🇦' : (holidayInfo ? holidayInfo.name : null),
      isUnpaidLeave,
      isExempt: exempt,
      hasAttendance: hasAtt,
      hasApprovedCorrection: !!log.has_approved_correction,
      approvedPermissionHours: approvedPermHours,
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

  // National Day Compensation: 2 extra days based on Basic Salary per worked National Day (المادة 112 من نظام العمل السعودي)
  const nationalDayDailyRate = dailySalaryRate;
  const nationalDayAllowance = Math.round(nationalDayWorkedDays * 2 * nationalDayDailyRate * 100) / 100;
  const nationalDayNote = nationalDayWorkedDays > 0 
    ? `${nationalDayWorkedDays} يوم دوام في اليوم الوطني × تعويض يومين (${Math.round(2 * nationalDayDailyRate * 100) / 100} ر.س) = ${nationalDayAllowance} ريال` 
    : null;

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
  const totalAdditions = housing + transport + electricity + phone + otherAllowance + fridayAllowance + dailyOvertimeAllowance + nationalDayAllowance + customBonusesTotal;
  const totalDeductions = approvedShortfallDeduction + approvedAbsenceDeduction + proposedUnpaidLeaveDeduction + customPenaltiesTotal + advanceInstallment;
  const rawNetSalary = Math.max(0, basicSalary + totalAdditions - totalDeductions);

  // ─── STRICT RULE: AN EMPLOYEE WITH ZERO ATTENDANCE IN MONTH EARNS ZERO SALARY ───
  // If an employee has 0 days of real presence, 0 Friday attendance, 0 National Day attendance,
  // and 0 actual minutes worked throughout the month, AND has no approved paid annual leave (leaveDays === 0):
  // (and for General Manager, has no check-in logged):
  const hasZeroAttendance = (presentDays === 0 && fridayWorkedDays === 0 && nationalDayWorkedDays === 0 && totalActualMinutes === 0 && leaveDays === 0) &&
    (!isExecutive || !empLogs.some(l => l.check_in));

  const contractBasicSalary = basicSalary;
  const contractHousing = housing;
  const contractTransport = transport;
  const contractElectricity = electricity;
  const contractPhone = phone;

  let effectiveBasicSalary = basicSalary;
  let effectiveHousing = housing;
  let effectiveTransport = transport;
  let effectiveElectricity = electricity;
  let effectivePhone = phone;
  let effectiveOtherAllowance = otherAllowance;
  let effectiveFridayAllowance = fridayAllowance;
  let effectiveDailyOT = dailyOvertimeAllowance;
  let effectiveNatDayAllowance = nationalDayAllowance;
  let effectiveTotalAdditions = totalAdditions;
  let effectiveShortfallDeduction = approvedShortfallDeduction;
  let effectiveAbsenceDeduction = approvedAbsenceDeduction;
  let effectiveAdvanceInstallment = advanceInstallment;
  let effectiveTotalDeductions = totalDeductions;
  let effectiveNetSalary = rawNetSalary;

  if (hasZeroAttendance) {
    // Zero out all earned pay components for non-attending employees
    effectiveBasicSalary = 0;
    effectiveHousing = 0;
    effectiveTransport = 0;
    effectiveElectricity = 0;
    effectivePhone = 0;
    effectiveOtherAllowance = 0;
    effectiveFridayAllowance = 0;
    effectiveDailyOT = 0;
    effectiveNatDayAllowance = 0;
    effectiveTotalAdditions = customBonusesTotal; // Only manual bonuses if any
    effectiveShortfallDeduction = 0;
    effectiveAbsenceDeduction = 0;
    effectiveAdvanceInstallment = 0; // Postpone loan deduction when net is 0
    effectiveTotalDeductions = customPenaltiesTotal;
    effectiveNetSalary = Math.max(0, customBonusesTotal - customPenaltiesTotal);
  }

  // 4. PAYOUT METHOD & SPLIT DISBURSEMENT (Bank Transfer vs Cash Handout)
  const payoutMethod = emp.payout_method || (emp.iban ? 'bank_full' : 'cash_full');
  let bankTransferAmount = 0;
  let cashPayoutAmount = 0;

  if (payoutMethod === 'bank_full') {
    bankTransferAmount = effectiveNetSalary;
    cashPayoutAmount = 0;
  } else if (payoutMethod === 'cash_full') {
    bankTransferAmount = 0;
    cashPayoutAmount = effectiveNetSalary;
  } else if (payoutMethod === 'split_bank_cash') {
    const fixedBank = Number(emp.bank_transfer_amount || emp.insured_salary || emp.basic_salary) || 0;
    bankTransferAmount = Math.min(fixedBank, effectiveNetSalary);
    cashPayoutAmount = Math.max(0, effectiveNetSalary - bankTransferAmount);
  }

  // 5. SAUDI LABOR LAW ARTICLE 92: DEDUCTIONS CEILING (حماية سقف الاستقطاعات - حد أقصى 50% من الأجر الأساسي)
  const maxAllowableDeduction = effectiveBasicSalary > 0 ? Math.round(effectiveBasicSalary * 0.5 * 100) / 100 : 0;
  const isDeductionCeilingExceeded = effectiveBasicSalary > 0 && effectiveTotalDeductions > maxAllowableDeduction;
  const deductionPercentage = effectiveBasicSalary > 0 ? Math.round((effectiveTotalDeductions / effectiveBasicSalary) * 100) : 0;

  return {
    emp,
    hasZeroAttendance,
    zeroAttendanceNote: hasZeroAttendance ? 'لا يستحق راتب (0 أيام حضور خلال الشهر)' : null,
    contractBasicSalary,
    contractHousing,
    contractTransport,
    contractElectricity,
    contractPhone,
    maxAllowableDeduction,
    isDeductionCeilingExceeded,
    deductionPercentage,
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
    nationalDayWorkedDays,
    nationalDayDailyRate,
    nationalDayAllowance: effectiveNatDayAllowance,
    nationalDayNote: hasZeroAttendance ? null : nationalDayNote,
    officialHolidayDays,
    totalRequiredMinutes,
    totalActualMinutes,
    totalDelayMinutes,
    totalExtraMinutes,
    netExtraMinutes,
    totalShortfallMinutes,
    shortfallHours: Math.round(shortfallHours * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    dailySalaryRate,
    basicSalary: effectiveBasicSalary,
    housing: effectiveHousing,
    transport: effectiveTransport,
    electricity: effectiveElectricity,
    phone: effectivePhone,
    otherAllowance: effectiveOtherAllowance,
    fridayAllowance: effectiveFridayAllowance,
    fridayNote: hasZeroAttendance ? null : fridayNote,
    fridayDailyRate,
    dailyOvertimeAllowance: effectiveDailyOT,
    dailyOvertimeNote: hasZeroAttendance ? null : dailyOvertimeNote,
    isInsured,
    gosiNumber,
    gosiDeduction,
    proposedShortfallDeduction: hasZeroAttendance ? 0 : proposedShortfallDeduction,
    approvedShortfallDeduction: effectiveShortfallDeduction,
    proposedAbsenceDeduction: hasZeroAttendance ? 0 : proposedAbsenceDeduction,
    approvedAbsenceDeduction: effectiveAbsenceDeduction,
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
    advanceInstallment: effectiveAdvanceInstallment,
    advanceRemaining,
    advanceNote,
    advanceOverrideStatus,
    approvedLeaves,
    approvedPermissions,
    approvedCorrections,
    totalAdditions: effectiveTotalAdditions,
    totalDeductions: effectiveTotalDeductions,
    netSalary: effectiveNetSalary,
    bankTransferAmount,
    cashPayoutAmount,
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
    const raw = localStorage.getItem('hr_flow_locked_payrolls_list');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Official approved archived past month (August 2026 - audited & WPS compliant)
    const defaultApproved = [
      {
        id: 'lock_2026_08',
        month_prefix: '2026-08',
        title: 'مسير رواتب شهر أغسطس (2026-08)',
        employee_count: 19,
        status: 'locked',
        locked_at: '2026-09-01T09:30:00.000Z',
        locked_by: 'فهد ناصر محمد الجوعي (المدير العام)'
      }
    ];
    localStorage.setItem('hr_flow_locked_payrolls_list', JSON.stringify(defaultApproved));
    return defaultApproved;
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
