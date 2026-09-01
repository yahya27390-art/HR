import React, { useRef, useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCompanyProfile } from '@/lib/companyProfile';

const fmtSAR = (n, dec = 2) => {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
};

function formatHours(decimalHours) {
  if (!decimalHours || isNaN(decimalHours)) return '0 د';
  const totalMinutes = Math.round(Number(decimalHours) * 60);
  const h = Math.floor(Math.abs(totalMinutes) / 60);
  const m = Math.abs(totalMinutes) % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س و ${m} د`;
}

// Full Official Arabic Tafqeet Currency Converter
function tafqeetSAR(num) {
  const amount = Math.round(Number(num) || 0);
  if (amount === 0) return 'صفر ريال سعودي فقط لا غير';
  if (amount < 0) return 'سالب ' + tafqeetSAR(Math.abs(amount));

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertHundreds(n) {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) res += hundreds[h];
    if (rem > 0) {
      if (res !== '') res += ' و ';
      if (rem < 20) {
        res += ones[rem];
      } else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (o > 0) res += ones[o] + ' و ';
        res += tens[t];
      }
    }
    return res;
  }

  function convertThousands(n) {
    if (n < 1000) return convertHundreds(n);
    const thousandsCount = Math.floor(n / 1000);
    const remainder = n % 1000;
    let thousandStr = '';
    if (thousandsCount === 1) thousandStr = 'ألف';
    else if (thousandsCount === 2) thousandStr = 'ألفان';
    else if (thousandsCount >= 3 && thousandsCount <= 10) thousandStr = convertHundreds(thousandsCount) + ' آلاف';
    else thousandStr = convertHundreds(thousandsCount) + ' ألفاً';

    if (remainder > 0) {
      return thousandStr + ' و ' + convertHundreds(remainder);
    }
    return thousandStr;
  }

  return 'فقط ' + convertThousands(amount) + ' ريال سعودي لا غير';
}

export default function PayslipPrint({ payroll, monthLabel, onClose }) {
  const printRef = useRef(null);
  const [company, setCompany] = useState(() => getCompanyProfile());

  useEffect(() => {
    setCompany(getCompanyProfile());
  }, []);

  if (!payroll) return null;

  const {
    emp = {}, basicSalary = 0, housing = 0, transport = 0,
    fridayAllowance = 0, fridayNote = '',
    dailyOvertimeAllowance = 0, dailyOvertimeNote = '',
    proposedShortfallDeduction = 0, approvedShortfallDeduction = 0, proposedAbsenceDeduction = 0, approvedAbsenceDeduction = 0, absentDays = 0,
    shortfallApprovalStatus = '', shortfallApprovalNote = '',
    shortfallHours = 0, hourlyRate = 0,
    approvedBonuses = [], customBonusesTotal = 0,
    approvedPenalties = [], customPenaltiesTotal = 0,
    activeAdvance, advanceInstallment = 0, advanceRemaining = 0, advanceNote = '',
    totalAdditions = 0, totalDeductions = 0, netSalary = 0,
    isInsured = false, gosiNumber = '', gosiDeduction = 0
  } = payroll;

  const effectivePayoutMethod = payroll.payoutMethod || emp.payout_method || (emp.iban ? 'bank_full' : 'cash_full');
  let effectiveBankAmount = payroll.bankTransferAmount;
  let effectiveCashAmount = payroll.cashPayoutAmount;

  if (effectiveBankAmount === undefined) {
    if (effectivePayoutMethod === 'bank_full') {
      effectiveBankAmount = netSalary;
      effectiveCashAmount = 0;
    } else if (effectivePayoutMethod === 'cash_full') {
      effectiveBankAmount = 0;
      effectiveCashAmount = netSalary;
    } else if (effectivePayoutMethod === 'split_bank_cash') {
      const fixedBank = Number(emp.bank_transfer_amount || emp.insured_salary || emp.basic_salary) || 0;
      effectiveBankAmount = Math.min(fixedBank, netSalary);
      effectiveCashAmount = Math.max(0, netSalary - effectiveBankAmount);
    }
  }

  const rawMonth = monthLabel?.replace(/[^0-9]/g, '') || '202608';
  const payslipNumber = 'PAY-' + rawMonth + '-' + (emp.employee_number || emp.id || '1001');
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      
      {/* ─── STRICT SINGLE-PAGE A4 PRINT STYLESHEET ─── */}
      <style>{'\
        @media print {\
          @page {\
            size: A4 portrait !important;\
            margin: 0 !important;\
          }\
          html, body {\
            width: 210mm !important;\
            height: 297mm !important;\
            margin: 0 !important;\
            padding: 0 !important;\
            background: #ffffff !important;\
            color: #0f172a !important;\
            overflow: hidden !important;\
          }\
          body * {\
            visibility: hidden !important;\
          }\
          #official-payslip-print-sheet, #official-payslip-print-sheet * {\
            visibility: visible !important;\
          }\
          #official-payslip-print-sheet {\
            position: fixed !important;\
            top: 0 !important;\
            left: 0 !important;\
            right: 0 !important;\
            width: 210mm !important;\
            max-width: 210mm !important;\
            height: 297mm !important;\
            max-height: 297mm !important;\
            margin: 0 auto !important;\
            padding: 10mm 12mm !important;\
            box-sizing: border-box !important;\
            border: none !important;\
            box-shadow: none !important;\
            background: #ffffff !important;\
            page-break-after: avoid !important;\
            page-break-inside: avoid !important;\
            break-inside: avoid !important;\
            overflow: hidden !important;\
          }\
        }\
      '}</style>

      {/* Main Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-slate-900 border border-slate-300">
        
        {/* Screen Toolbar */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="font-heading font-black text-sm text-white">
                مسير وقسيمة الراتب الرسمية A4
              </div>
              <div className="text-[11px] text-slate-400">
                الموظف: <strong className="text-white">{emp.full_name}</strong> (#{emp.employee_number}) • شهر: <strong className="text-slate-200">{monthLabel}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8 px-4 rounded-xl gap-1.5 border border-slate-700 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>طباعة القسيمة (A4 صفحة واحدة)</span>
            </Button>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 text-xs h-8 rounded-xl"
              >
                <X className="w-3.5 h-3.5 me-1" />
                إغلاق
              </Button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            OFFICIAL BANKING GRADE PAYSLIP SHEET (NAVY & SLATE GREY ONLY)
        ════════════════════════════════════════════════════════════════════ */}
        <div
          id="official-payslip-print-sheet"
          ref={printRef}
          className="p-6 sm:p-7 bg-white font-sans text-slate-900 leading-tight"
          style={{ width: '100%', maxWidth: '210mm', margin: '0 auto', boxSizing: 'border-box' }}
        >
          
          {/* 1. OFFICIAL CORPORATE HEADER WITH DYNAMIC LOGO */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center justify-between gap-4">
              
              {/* Right: Company Logo & Details */}
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img
                    src={company.logo_url || "/company-logo.svg"} onError={(e) => { e.currentTarget.src = "/company-logo.svg"; }}
                    alt="شعار الشركة"
                    className="h-12 w-auto max-h-12 max-w-[130px] object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center font-heading font-black text-xl">
                    GA
                  </div>
                )}
                <div>
                  <h1 className="text-base font-heading font-black text-slate-950 tracking-tight leading-tight">
                    {company.name_ar}
                  </h1>
                  <p className="text-[9.5px] text-slate-600 font-mono uppercase tracking-wider font-semibold">
                    {company.name_en}
                  </p>
                  <div className="text-[9px] text-slate-600 mt-0.5 flex items-center gap-x-2">
                    <span>السجل التجاري: <strong className="font-mono text-slate-900">{company.cr_number}</strong></span>
                    <span>•</span>
                    <span>الرقم الضريبي: <strong className="font-mono text-slate-900">{company.tax_number}</strong></span>
                  </div>
                </div>
              </div>

              {/* Left: Document Metadata Box */}
              <div className="text-left border border-slate-300 rounded-lg p-2 bg-slate-50 text-[9.5px] space-y-0.5 min-w-[190px]">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold">رقم المسير:</span>
                  <span className="font-mono font-black text-slate-950">{payslipNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold">الشهر المالي:</span>
                  <span className="font-bold text-slate-900">{monthLabel}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold">تاريخ الإصدار:</span>
                  <span className="font-mono text-slate-800">{issueDate}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-0.5">
                  <span className="font-bold">حالة الصرف:</span>
                  <span className="font-bold text-slate-900">معتمد ومصرح ✓</span>
                </div>
              </div>

            </div>

            {/* Document Title Banner */}
            <div className="mt-2.5 pt-1.5 border-t border-slate-200 text-center">
              <h2 className="text-sm font-heading font-black text-slate-950 uppercase tracking-wide">
                مسير وقسيمة استحقاق وصرف راتب شهري
              </h2>
              <span className="text-[9px] text-slate-500 font-mono block">
                OFFICIAL MONTHLY SALARY PAYSLIP & SETTLEMENT VOUCHER
              </span>
            </div>
          </div>

          {/* 2. EMPLOYEE IDENTIFICATION MATRIX */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 mb-3 text-xs">
            <div className="grid grid-cols-4 gap-y-1.5 gap-x-3 text-[11px]">
              
              <div>
                <span className="text-[9.5px] text-slate-500 block">اسم الموظف:</span>
                <strong className="font-heading font-black text-slate-950 block truncate">
                  {emp.full_name || '—'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">الرقم الوظيفي:</span>
                <strong className="font-mono font-bold text-slate-900">
                  #{emp.employee_number || emp.id || '—'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">الهوية / الإقامة:</span>
                <strong className="font-mono font-bold text-slate-900">
                  {emp.national_id || emp.iqama_number || '—'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">الجنسية:</span>
                <strong className="font-bold text-slate-900">
                  {emp.nationality || 'سعودي'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">المسمى الوظيفي:</span>
                <strong className="font-bold text-slate-900">
                  {emp.job_title || 'موظف'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">الفرع / الإدارة:</span>
                <strong className="font-bold text-slate-900 truncate block">
                  {emp.branch_name || emp.branch || 'الفرع الرئيسي'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">نظام التأمينات:</span>
                <strong className="font-bold text-slate-900">
                  {isInsured ? 'مسجل (GOSI)' : 'غير مسجل'}
                </strong>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-500 block">الوردية المعتمدة:</span>
                <strong className="font-bold text-slate-900 truncate block">
                  {emp.shift || 'دوام رسمي'}
                </strong>
              </div>

            </div>
          </div>

          {/* 3. DUAL BALANCED FINANCIAL TABLE (EARNINGS VS DEDUCTIONS) */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            
            {/* ─── EARNINGS COLUMN (المستحقات والبدلات) ─── */}
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white flex flex-col justify-between">
              <div>
                <div className="bg-slate-800 text-white px-3 py-1.5 text-xs font-heading font-black flex items-center justify-between">
                  <span>المستحقات والبدلات (Earnings)</span>
                  <span className="text-[9.5px] font-mono opacity-80">+SAR</span>
                </div>

                <div className="divide-y divide-slate-100 text-[10.5px]">
                  
                  {/* Basic Salary */}
                  <div className="flex items-center justify-between p-1.5 hover:bg-slate-50">
                    <span className="font-bold text-slate-800">الراتب الأساسي التعاقدي</span>
                    <span className="font-mono font-black text-slate-900">{fmtSAR(basicSalary)} ر.س</span>
                  </div>

                  {/* Housing Allowance */}
                  <div className="flex items-center justify-between p-1.5 hover:bg-slate-50">
                    <span className="font-bold text-slate-800">بدل السكن الشهري</span>
                    <span className="font-mono font-bold text-slate-800">{fmtSAR(housing)} ر.س</span>
                  </div>

                  {/* Transport Allowance */}
                  <div className="flex items-center justify-between p-1.5 hover:bg-slate-50">
                    <span className="font-bold text-slate-800">بدل الانتقال والمواصلات</span>
                    <span className="font-mono font-bold text-slate-800">{fmtSAR(transport)} ر.س</span>
                  </div>

                  {/* Friday Allowance */}
                  {fridayAllowance > 0 && (
                    <div className="flex items-center justify-between p-1.5 bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">بدل حضور الجمعات</span>
                        {fridayNote && <span className="text-[9px] text-slate-500 block">{fridayNote}</span>}
                      </div>
                      <span className="font-mono font-bold text-slate-900">+{fmtSAR(fridayAllowance)} ر.س</span>
                    </div>
                  )}

                  {/* Daily Overtime */}
                  {dailyOvertimeAllowance > 0 && (
                    <div className="flex items-center justify-between p-1.5 bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">إضافي ساعات الدوام</span>
                        {dailyOvertimeNote && <span className="text-[9px] text-slate-500 block">{dailyOvertimeNote}</span>}
                      </div>
                      <span className="font-mono font-bold text-slate-900">+{fmtSAR(dailyOvertimeAllowance)} ر.س</span>
                    </div>
                  )}

                  {/* Custom Bonuses */}
                  {approvedBonuses.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-1.5 bg-slate-50">
                      <span className="font-bold text-slate-800">مكافأة: {b.title || b.reason}</span>
                      <span className="font-mono font-bold text-slate-900">+{fmtSAR(b.amount)} ر.س</span>
                    </div>
                  ))}

                </div>
              </div>

              {/* Earnings Total */}
              <div className="bg-slate-100 border-t border-slate-300 p-2 flex items-center justify-between font-heading font-black text-xs text-slate-950">
                <span>إجمالي المستحقات (Gross):</span>
                <span className="font-mono text-xs text-slate-900">{fmtSAR(basicSalary + totalAdditions)} ر.س</span>
              </div>
            </div>

            {/* ─── DEDUCTIONS COLUMN (الاستقطاعات والخصومات) ─── */}
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white flex flex-col justify-between">
              <div>
                <div className="bg-slate-800 text-white px-3 py-1.5 text-xs font-heading font-black flex items-center justify-between">
                  <span>الاستقطاعات والخصومات (Deductions)</span>
                  <span className="text-[9.5px] font-mono opacity-80">-SAR</span>
                </div>

                <div className="divide-y divide-slate-100 text-[10.5px]">
                  
                  {/* GOSI Social Insurance */}
                  <div className="flex items-center justify-between p-1.5 hover:bg-slate-50">
                    <span className="font-bold text-slate-800">اشتراك التأمينات الاجتماعية (GOSI)</span>
                    <span className="font-mono font-bold text-slate-800">{fmtSAR(gosiDeduction)} ر.س</span>
                  </div>

                  {/* Advance Installment */}
                  {advanceInstallment > 0 && (
                    <div className="flex items-center justify-between p-1.5 bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">استقطاع قسط سلفة</span>
                        {advanceRemaining > 0 && (
                          <span className="text-[9px] text-slate-500 block">متبقي: {fmtSAR(advanceRemaining)} ر.س</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900">-{fmtSAR(advanceInstallment)} ر.س</span>
                    </div>
                  )}

                  {/* Absence Days Deduction */}
                  {approvedAbsenceDeduction > 0 && (
                    <div className="flex items-center justify-between p-1.5 bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">استقطاع أيام الغياب</span>
                        {absentDays > 0 && (
                          <span className="text-[9px] text-slate-500 block">غياب {absentDays} يوم</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900">-{fmtSAR(approvedAbsenceDeduction)} ر.س</span>
                    </div>
                  )}

                  {/* Working Hours Shortfall & Delay Deduction */}
                  {approvedShortfallDeduction > 0 && (
                    <div className="flex items-center justify-between p-1.5 bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">استقطاع عجز ساعات العمل والتأخير</span>
                        {shortfallHours > 0 && (
                          <span className="text-[9px] text-slate-500 block">عجز {formatHours(shortfallHours)}</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900">-{fmtSAR(approvedShortfallDeduction)} ر.س</span>
                    </div>
                  )}

                  {/* Custom Penalties */}
                  {approvedPenalties.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-1.5 bg-slate-50">
                      <span className="font-bold text-slate-800">جزاء إداري: {p.title || p.reason}</span>
                      <span className="font-mono font-bold text-slate-900">-{fmtSAR(p.amount)} ر.س</span>
                    </div>
                  ))}

                  {/* Empty state filler if no deductions */}
                  {advanceInstallment === 0 && approvedAbsenceDeduction === 0 && approvedShortfallDeduction === 0 && approvedPenalties.length === 0 && gosiDeduction === 0 && (
                    <div className="p-2.5 text-center text-slate-400 text-[10px]">
                      لا توجد استقطاعات أو جزاءات مسجلة على الموظف ✓
                    </div>
                  )}

                </div>
              </div>

              {/* Deductions Total */}
              <div className="bg-slate-100 border-t border-slate-300 p-2 flex items-center justify-between font-heading font-black text-xs text-slate-950">
                <span>إجمالي الاستقطاعات:</span>
                <span className="font-mono text-xs text-slate-900">-{fmtSAR(totalDeductions)} ر.س</span>
              </div>
            </div>

          </div>

          {/* 4. NET PAYABLE SALARY BANNER (BANKING GRADE NAVY) */}
          <div className="bg-slate-900 text-white rounded-lg p-3 mb-3 border border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-heading font-bold text-slate-300 uppercase tracking-wide">
                  إجمالي صافي الراتب المستحق للصرف (Net Payable Salary)
                </div>
                <div className="text-[11px] text-slate-200 mt-0.5 font-semibold">
                  المبلغ بالحروف: <strong className="text-white">{tafqeetSAR(netSalary)}</strong>
                </div>
              </div>

              <div className="text-left">
                <div className="text-2xl font-black font-mono tracking-tight text-white">
                  {fmtSAR(netSalary)} <span className="text-[11px] font-sans text-slate-300">ريال سعودي (SAR)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. OFFICIAL DISBURSEMENT BREAKDOWN (BANK VS CASH) */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 mb-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
              <span className="font-heading font-bold text-slate-900 text-[11px]">
                طريقة استلام وصرف الراتب وتوزيع المستحقات المالية:
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700">
                {effectivePayoutMethod === 'split_bank_cash' ? 'تحويل بنكي جزئي + تسليم نقدي' : effectivePayoutMethod === 'cash_full' ? 'تسليم نقدي (كاش)' : 'تحويل بنكي رسمي (WPS)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              
              {/* Bank Portion */}
              {(effectiveBankAmount > 0 || effectivePayoutMethod === 'bank_full') && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">المحول عبر الحساب البنكي (WPS):</span>
                    <strong className="font-mono text-xs text-slate-950 font-black">{fmtSAR(effectiveBankAmount)} ر.س</strong>
                  </div>
                  <div className="text-[9.5px] text-slate-600 mt-1 flex items-center justify-between">
                    <span>البنك: <strong>{emp.bank_name || 'مصرف الإنماء'}</strong></span>
                    <span className="font-mono">IBAN: <strong>{emp.iban || 'SA4480000000000000000000'}</strong></span>
                  </div>
                </div>
              )}

              {/* Cash Portion */}
              {(effectiveCashAmount > 0 || effectivePayoutMethod === 'cash_full') && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">المسلم نقداً من الخزينة:</span>
                    <strong className="font-mono text-xs text-slate-950 font-black">{fmtSAR(effectiveCashAmount)} ر.س</strong>
                  </div>
                  <div className="text-[9.5px] text-slate-600 mt-1">
                    طريقة الصرف: سند صرف نقدي بموجب توقيع واستلام الموظف أدناه
                  </div>
                </div>
              )}

            </div>

            {/* Cash Handout Signature Undertaking */}
            {effectiveCashAmount > 0 && (
              <div className="mt-2 p-1.5 bg-slate-100 border border-slate-300 rounded text-[9.5px] text-slate-800 flex items-center justify-between">
                <span>إقرار استلام الكاش: أقر أنا الموظف باستلام مبلغ ({fmtSAR(effectiveCashAmount)} ر.س) نقداً عن شهر {monthLabel}.</span>
                <span className="font-bold">توقيع الاستلام: ....................</span>
              </div>
            )}
          </div>

          {/* 6. OFFICIAL FOUR-TIER SIGNATURES & STAMP */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1 border-t-2 border-slate-900">
            
            <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
              <div className="font-bold text-[9px] text-slate-500 mb-4">إعداد وتدقيق الموارد البشرية</div>
              <div className="border-t border-dashed border-slate-300 pt-0.5 text-[9px] font-bold text-slate-800">
                يحيى محمد عبدالغفار باشا
              </div>
            </div>

            <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
              <div className="font-bold text-[9px] text-slate-500 mb-4">تدقيق وترحيل الحسابات</div>
              <div className="border-t border-dashed border-slate-300 pt-0.5 text-[9px] font-bold text-slate-800">
                هشام ابوالفضل زغلول
              </div>
            </div>

            <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
              <div className="font-bold text-[9px] text-slate-500 mb-4">اعتماد ومصادقة المدير العام</div>
              <div className="border-t border-dashed border-slate-300 pt-0.5 text-[9px] font-bold text-slate-800">
                فهد ناصر محمد الجوعي
              </div>
            </div>

            <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
              <div className="font-bold text-[9px] text-slate-500 mb-4">توقيع واستلام الموظف / الختم</div>
              <div className="border-t border-dashed border-slate-300 pt-0.5 text-[9px] font-bold text-slate-800">
                {emp.full_name?.split(' ')[0] || 'الموظف المستلم'}
              </div>
            </div>

          </div>

          {/* Document Legal Footer */}
          <div className="mt-2 text-center text-[8.5px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-200 pt-1">
            <span>وثيقة مسير مالي رسمية معتمدة • نظام حماية الأجور (WPS)</span>
            <span className="font-bold">الصفحة 1 من 1</span>
          </div>

        </div>

      </div>

    </div>
  );
}
