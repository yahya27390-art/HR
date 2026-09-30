/**
 * Alerts Engine — Enterprise Document & License Expiry Alerts
 * Dorat Al-Sayarah (Dorat Cars) HR System
 */

export const ALERT_CATEGORIES = [
  { id: 'id_expiry', label: 'انتهاء الهوية', icon: '🪪', key: 'id_expiry_date' },
  { id: 'passport', label: 'جواز السفر', icon: '🛂', key: 'passport_expiry_date' },
  { id: 'driving_license', label: 'رخصة القيادة', icon: '🚗', key: 'driving_license_expiry_date' },
  { id: 'insurance', label: 'التأمين', icon: '🏥', key: 'insurance_expiry_date' },
  { id: 'late_checkin', label: 'الدخول المتأخر', icon: '⏰', key: 'late_checkin' },
  { id: 'early_checkout', label: 'الخروج الباكر', icon: '⏳', key: 'early_checkout' },
  { id: 'annual_leave', label: 'الإجازة السنوية', icon: '🏖️', key: 'annual_leave' },
  { id: 'contract', label: 'العقد', icon: '📋', key: 'contract_end_date' },
  { id: 'other_licenses', label: 'رخص أخرى', icon: '🏢', key: 'other_licenses_expiry_date' },
  { id: 'work_permit', label: 'فترة العمل', icon: '💼', key: 'work_permit_expiry_date' },
  { id: 'probation', label: 'إنتهاء فترة التجربة', icon: '⏱️', key: 'probation_end_date' },
  { id: 'all_documents', label: 'تاريخ إنتهاء المستندات', icon: '📁', key: 'all' },
];

export const DEFAULT_THRESHOLDS = {
  id_expiry: 60, // days before expiry to alert
  passport: 90,
  driving_license: 30,
  insurance: 30,
  contract: 60,
  other_licenses: 30,
  work_permit: 45,
  probation: 15,
};

export function getStoredThresholds() {
  try {
    const raw = localStorage.getItem('hr_alert_thresholds');
    if (raw) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_THRESHOLDS;
}

export function saveStoredThresholds(thresholds) {
  try {
    localStorage.setItem('hr_alert_thresholds', JSON.stringify(thresholds));
  } catch (e) {}
}

export function parseExpiryDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // If already YYYY-MM-DD Gregorian
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // If Hijri (starts with 14xx-xx-xx)
  if (/^14\d{2}-\d{2}-\d{2}$/.test(str)) {
    const [hy, hm, hd] = str.split('-').map(Number);
    // Approximate conversion: 1 Hijri year ≈ 354.36 days; reference 1445-01-01 ≈ 2023-07-19
    const hijriDays = (hy - 1445) * 354.367 + (hm - 1) * 29.53 + hd;
    const refGregorian = new Date(2023, 6, 19).getTime();
    return new Date(refGregorian + hijriDays * 86400000);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function calcDocAlerts(employees, customThresholds = null) {
  const thresholds = customThresholds || getStoredThresholds();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts = [];

  (employees || []).forEach((emp, index) => {
    // Only active employees
    const isInactive = emp.status === 'inactive' || emp.status === 'terminated' || emp.status === 'suspended' || emp.status === 'متوقف عن العمل' || emp.status === 'غير نشط';
    if (isInactive) return;

    let meta = {};
    if (emp.manager_name && typeof emp.manager_name === 'string' && emp.manager_name.startsWith('{')) {
      try { meta = JSON.parse(emp.manager_name); } catch(e) {}
    }

    const checkDoc = (category, dateVal, customTitle, keyName) => {
      if (!dateVal) return;
      const exp = parseExpiryDate(dateVal);
      if (!exp) return;

      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      const thresholdDays = thresholds[category] !== undefined ? thresholds[category] : 30;

      // Trigger if expired OR expiring within the configured threshold
      if (diffDays <= thresholdDays) {
        let severity = 'low';
        if (diffDays < 0) severity = 'critical';
        else if (diffDays <= 7) severity = 'high';
        else if (diffDays <= 30) severity = 'medium';

        alerts.push({
          id: `${category}_${emp.id || emp.employee_number}`,
          category,
          keyName,
          severity,
          title: customTitle,
          employee_id: emp.id || emp.employee_number,
          employee_number: emp.employee_number,
          employee_name: emp.full_name,
          national_id: emp.national_id || '',
          branch_name: emp.branch_name || emp.branch || 'الفرع الرئيسي',
          department_name: emp.department_name || emp.department || 'درة السيارة لقطع الغيار',
          expiry_date: dateVal,
          days: diffDays,
          thresholdDays,
          is_expired: diffDays < 0
        });
      }
    };

    // 1. ID / Iqama Expiry
    if (emp.id_expiry_date) {
      checkDoc('id_expiry', emp.id_expiry_date, emp.nationality === 'سعودي' ? 'انتهاء الهوية الوطنية' : 'انتهاء الإقامة', 'id_expiry_date');
    }

    // 2. Passport Expiry
    const passExp = meta.passport_expiry_date || emp.passport_expiry_date;
    if (passExp) {
      checkDoc('passport', passExp, 'انتهاء جواز السفر', 'passport_expiry_date');
    }

    // 3. Driving License Expiry
    const drvExp = meta.driving_license_expiry_date || emp.driving_license_expiry_date;
    if (drvExp) {
      checkDoc('driving_license', drvExp, 'انتهاء رخصة القيادة', 'driving_license_expiry_date');
    }

    // 4. Insurance Expiry
    const insExp = meta.insurance_expiry_date || emp.insurance_expiry_date || (emp.is_insured ? '1448-06-30' : null);
    if (insExp) {
      checkDoc('insurance', insExp, 'انتهاء التأمين الطبي', 'insurance_expiry_date');
    }

    // 5. Work Permit Expiry (رخصة العمل / كرت العمل)
    const wpExp = meta.work_permit_expiry_date || emp.work_permit_expiry_date || (emp.nationality !== 'سعودي' ? (emp.id_expiry_date || '1448-02-15') : null);
    if (wpExp && emp.nationality !== 'سعودي') {
      checkDoc('work_permit', wpExp, 'انتهاء رخصة العمل (كرت العمل)', 'work_permit_expiry_date');
    }

    // 6. Contract End Date
    const ctrExp = meta.contract_end_date || emp.contract_end_date;
    if (ctrExp) {
      checkDoc('contract', ctrExp, 'انتهاء عقد العمل', 'contract_end_date');
    }

    // 7. Other Licenses Expiry
    const othExp = meta.other_licenses_expiry_date || emp.other_licenses_expiry_date;
    if (othExp) {
      checkDoc('other_licenses', othExp, 'انتهاء ترخيص إضافي / مهني', 'other_licenses_expiry_date');
    }

    // 8. Probation Period Expiry (90 days from join_date)
    if (emp.join_date) {
      const join = new Date(emp.join_date);
      if (!isNaN(join.getTime())) {
        const probExp = new Date(join.getTime() + 90 * 86400000);
        const probStr = probExp.toISOString().split('T')[0];
        checkDoc('probation', probStr, 'انتهاء فترة التجربة (90 يوم)', 'probation_end_date');
      }
    }
  });

  return alerts.sort((a, b) => a.days - b.days);
}

export function getAlertCountBySeverity(alerts) {
  return {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high:     alerts.filter(a => a.severity === 'high').length,
    medium:   alerts.filter(a => a.severity === 'medium').length,
    low:      alerts.filter(a => a.severity === 'low').length,
    total:    alerts.length,
  };
}

export function getAlertsForEmployee(alerts, employeeId) {
  return alerts.filter(a => a.employee_id === employeeId);
}

