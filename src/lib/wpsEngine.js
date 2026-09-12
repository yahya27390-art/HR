/**
 * ============================================================================
 * WAGE PROTECTION SYSTEM (WPS) ENGINE - SAUDI ARABIA (MUDAD / SAMA / SIF FORMAT)
 * محرك نظام حماية الأجور السعودي - صيغة SIF وملفات منصة مدد والبنوك السعودية
 * ============================================================================
 */

import { sanitizeForExport } from './security.js';

// Saudi Bank Codes derived from IBAN 5th-6th digits
export const SAUDI_BANK_CODES = {
  '80': { code: 'RJHI', nameAr: 'مصرف الراجحي', nameEn: 'Al Rajhi Bank' },
  '10': { code: 'NCBK', nameAr: 'البنك الأهلي السعودي (SNB)', nameEn: 'Saudi National Bank' },
  '05': { code: 'ALBI', nameAr: 'مصرف الإنماء', nameEn: 'Alinma Bank' },
  '20': { code: 'RIBL', nameAr: 'بنك الرياض', nameEn: 'Riyad Bank' },
  '55': { code: 'BSFR', nameAr: 'البنك السعودي الفرنسي', nameEn: 'Banque Saudi Fransi' },
  '45': { code: 'SABB', nameAr: 'البنك الأول (SABB)', nameEn: 'Saudi Awwal Bank' },
  '40': { code: 'ARNB', nameAr: 'البنك العربي الوطني', nameEn: 'Arab National Bank' },
  '60': { code: 'BJAZ', nameAr: 'بنك الجزيرة', nameEn: 'Bank AlJazira' },
  '65': { code: 'SIBC', nameAr: 'بنك الاستثمار', nameEn: 'The Saudi Investment Bank' },
  '30': { code: 'ALBI', nameAr: 'بنك البلاد', nameEn: 'Bank Albilad' },
};

/**
 * Extract Bank Code from Saudi IBAN
 */
export function getBankFromIban(ibanStr = '') {
  const clean = String(ibanStr || '').replace(/\s+/g, '').toUpperCase();
  if (clean.startsWith('SA') && clean.length >= 7) {
    const bankDigits = clean.substring(4, 6);
    if (SAUDI_BANK_CODES[bankDigits]) {
      return SAUDI_BANK_CODES[bankDigits];
    }
  }
  return { code: 'RJHI', nameAr: 'مصرف الراجحي', nameEn: 'Al Rajhi Bank' };
}

/**
 * Validate Saudi IBAN format (Must start with SA and be 24 alphanumeric characters)
 */
export function isValidSaudiIban(ibanStr = '') {
  const clean = String(ibanStr || '').replace(/\s+/g, '').toUpperCase();
  return /^SA\d{22}$/.test(clean);
}

/**
 * Validate Saudi National ID or Iqama (10 digits, starts with 1 or 2)
 */
export function isValidNationalId(idStr = '') {
  const clean = String(idStr || '').trim();
  return /^[12]\d{9}$/.test(clean);
}

/**
 * Validate WPS compliance for a list of computed payrolls
 */
export function validateWpsCompliance(payrolls = [], companyProfile = {}) {
  const issues = [];
  let compliantCount = 0;
  let totalSalaries = 0;

  payrolls.forEach(pr => {
    const emp = pr.emp || {};
    const empNum = emp.employee_number || emp.id || 'N/A';
    const empName = emp.full_name || 'موظف';
    const net = Number(pr.netSalary) || 0;
    const basic = Number(pr.basicSalary) || 0;
    const deductions = Number(pr.totalDeductions) || 0;
    const nationalId = String(emp.national_id || '').trim();
    const iban = String(emp.iban || '').trim();

    totalSalaries += net;

    const empErrors = [];

    // 1. National ID / Iqama check
    if (!nationalId) {
      empErrors.push({ code: 'MISSING_ID', message: 'رقم الهوية / الإقامة غير مسجل' });
    } else if (!isValidNationalId(nationalId)) {
      empErrors.push({ code: 'INVALID_ID', message: `رقم الهوية (${nationalId}) غير مطابق (يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2)` });
    }

    // 2. IBAN check (Required for bank transfer / WPS)
    if (!iban) {
      empErrors.push({ code: 'MISSING_IBAN', message: 'رقم الآيبان البنكي (IBAN) غير مسجل' });
    } else if (!isValidSaudiIban(iban)) {
      empErrors.push({ code: 'INVALID_IBAN', message: 'صيغة الآيبان غير صحيحة (يجب أن تبدأ بـ SA وتتكون من 24 خانة)' });
    }

    // 3. Net salary > 0
    if (net <= 0) {
      empErrors.push({ code: 'ZERO_NET_SALARY', message: 'صافي الراتب صفر أو سالب (مرفوض في نظام حماية الأجور)' });
    }

    // 4. Labor Law Article 92 (Deduction ceiling: max 50% of basic salary)
    if (basic > 0 && deductions > basic * 0.5) {
      const deductionPct = Math.round((deductions / basic) * 100);
      empErrors.push({
        code: 'EXCEEDED_DEDUCTION_LIMIT',
        message: `الاستقطاعات (${deductions.toLocaleString()} ر.س) تتجاوز 50% من الراتب الأساسي (${deductionPct}%) - مخالفة المادة 92 من نظام العمل`
      });
    }

    if (empErrors.length === 0) {
      compliantCount++;
    } else {
      issues.push({
        employeeNumber: empNum,
        employeeName: empName,
        netSalary: net,
        errors: empErrors
      });
    }
  });

  const totalEmployees = payrolls.length;
  const complianceRate = totalEmployees > 0 ? Math.round((compliantCount / totalEmployees) * 100) : 100;

  return {
    isReady: issues.length === 0 && totalEmployees > 0,
    totalEmployees,
    compliantCount,
    nonCompliantCount: issues.length,
    complianceRate,
    totalSalaries: Math.round(totalSalaries * 100) / 100,
    issues
  };
}

/**
 * Generate Mudad / SAMA SIF File Content (Salary Information File)
 */
export function generateWpsSifContent(payrolls = [], monthPrefix, companyProfile = {}) {
  const cleanMonth = monthPrefix || new Date().toISOString().slice(0, 7);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const establishmentId = String(companyProfile.cr_number || companyProfile.mol_id || '7016475555').trim();
  const companyName = companyProfile.legal_name || companyProfile.name || 'HR DORAT CARS';
  const mainBankCode = companyProfile.bank_code || 'RJHI';

  // Calculate totals
  let totalSalaries = 0;
  const detailRecords = [];

  payrolls.forEach(pr => {
    const emp = pr.emp || {};
    const nationalId = String(emp.national_id || '').trim();
    const iban = String(emp.iban || '').replace(/\s+/g, '').toUpperCase();
    const bankInfo = getBankFromIban(iban);
    const bankRoutingCode = bankInfo.code;

    const basic = Math.max(0, Number(pr.basicSalary) || 0);
    const housing = Math.max(0, Number(pr.housing) || 0);
    const otherEarnings = Math.max(0, (Number(pr.totalAdditions) || 0) - housing);
    const deductions = Math.max(0, Number(pr.totalDeductions) || 0);
    const net = Math.max(0, Number(pr.netSalary) || 0);

    totalSalaries += net;

    // EDR line: EDR,Civil_ID,Bank_Code,IBAN,Employee_Name,Basic,Housing,Other,Deductions,Reference,EmpNum
    const edrFields = [
      'EDR',
      nationalId,
      bankRoutingCode,
      iban,
      emp.full_name || 'Employee',
      basic.toFixed(2),
      housing.toFixed(2),
      otherEarnings.toFixed(2),
      deductions.toFixed(2),
      `SAL-${cleanMonth}-${emp.employee_number || emp.id}`,
      emp.employee_number || emp.id || ''
    ];

    detailRecords.push(edrFields.join(','));
  });

  // SCR Header line: SCR,Establishment_ID,Bank_Code,File_Date,File_Time,Payment_Date,Total_Salaries,Count,Currency,Reference
  const scrFields = [
    'SCR',
    establishmentId,
    mainBankCode,
    dateStr,
    timeStr,
    dateStr,
    totalSalaries.toFixed(2),
    detailRecords.length,
    'SAR',
    `PAYROLL-${cleanMonth}-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}`
  ];

  const contentLines = [
    scrFields.join(','),
    ...detailRecords
  ];

  return contentLines.join('\r\n');
}

/**
 * Trigger download of WPS SIF / TXT File
 */
export function downloadWpsSif(payrolls, monthPrefix, companyProfile) {
  const content = generateWpsSifContent(payrolls, monthPrefix, companyProfile);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `WPS_SIF_${monthPrefix}_${companyProfile.cr_number || '7016475555'}.sif`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Generate Secure CSV for Payroll Ledger (Formula-Injection Protected)
 */
export function generatePayrollCsv(payrolls = [], monthPrefix) {
  const headers = [
    'الرقم الوظيفي',
    'اسم الموظف',
    'المسمى الوظيفي',
    'الفرع / القسم',
    'رقم الهوية / الإقامة',
    'اسم البنك',
    'رقم الآيبان (IBAN)',
    'الراتب الأساسي',
    'بدل السكن',
    'بدل النقل',
    'بدلات أخرى',
    'إضافي الجمعات',
    'إضافي 9 ساعات',
    'المكافآت والحوافز',
    'إجمالي المستحقات والبدلات',
    'خصم التأخير (عجز الساعات)',
    'خصم الغياب',
    'أقساط السلف والقروض',
    'الجزاءات والخصومات',
    'إجمالي الاستقطاعات',
    'صافي الراتب المستحق',
    'التأمينات الاجتماعية',
    'حالة المسير'
  ];

  const rows = payrolls.map(pr => {
    const emp = pr.emp || {};
    const bankInfo = getBankFromIban(emp.iban);

    return [
      emp.employee_number || emp.id || '',
      emp.full_name || '',
      emp.job_title || '',
      emp.branch_name || emp.department_name || '',
      emp.national_id || '',
      bankInfo.nameAr,
      emp.iban || '—',
      pr.basicSalary || 0,
      pr.housing || 0,
      pr.transport || 0,
      (Number(pr.electricity || 0) + Number(pr.phone || 0) + Number(pr.otherAllowance || 0)),
      pr.fridayAllowance || 0,
      pr.dailyOvertimeAllowance || 0,
      pr.customBonusesTotal || 0,
      pr.totalAdditions || 0,
      pr.approvedShortfallDeduction || 0,
      pr.approvedAbsenceDeduction || 0,
      pr.advanceInstallment || 0,
      pr.customPenaltiesTotal || 0,
      pr.totalDeductions || 0,
      pr.netSalary || 0,
      pr.isInsured ? 'مؤمن' : 'غير مسجل',
      'معتمد'
    ];
  });

  // Apply defensive sanitization against formula injection
  const csvContent = sanitizeForExport([headers, ...rows]);
  return csvContent;
}

/**
 * Trigger download of Payroll CSV Ledger
 */
export function downloadPayrollCsvFile(payrolls, monthPrefix) {
  const content = generatePayrollCsv(payrolls, monthPrefix);
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `مسير_رواتب_شهر_${monthPrefix}.csv`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}
