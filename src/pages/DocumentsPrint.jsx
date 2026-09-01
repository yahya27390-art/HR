import { getCompanyProfile } from '@/lib/companyProfile';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DocumentsPrint() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [docType, setDocType] = useState('loan');

  // Company profile (with logo) from localStorage
  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'HR DORAT CARS',
      legal_name: 'شركة درة السيارة لقطع غيار السيارات',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966541697999',
      address: 'المملكة العربية السعودية - بريدة - القصيم',
      logo_url: ''
    };
  });

  // Listen for logo/profile updates from Settings page
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem('hr_flow_company_profile');
      if (saved) setCompanyProfile(JSON.parse(saved));
    };
    window.addEventListener('company_profile_updated', handler);
    return () => window.removeEventListener('company_profile_updated', handler);
  }, []);

  // Loan Fields
  const [loanAmount, setLoanAmount] = useState('3000');
  const [loanInstallments, setLoanInstallments] = useState('6');
  const [deductionStart, setDeductionStart] = useState('2026-09-01');
  const [loanReason, setLoanReason] = useState('سلفة شخصية');

  // Leave Clearance Fields
  const [leaveType, setLeaveType] = useState('سنوية');
  const [leaveStart, setLeaveStart] = useState('2026-09-01');
  const [leaveEnd, setLeaveEnd] = useState('2026-09-21');
  const [leaveAllowance, setLeaveAllowance] = useState('2800');

  useEffect(() => {
    base44.entities.Employee.list().then((list) => {
      setEmployees(list || []);
      if (list && list.length > 0) setSelectedEmpId(list[0].id);
    }).catch(() => {});
  }, []);

  const currentEmp = employees.find(e => e.id === selectedEmpId || e.employee_number === selectedEmpId) || employees[0];
  const numInstallments = Math.max(1, Math.min(24, Number(loanInstallments) || 1));
  const monthlyDeduction = (Number(loanAmount) || 0) / numInstallments;

  // Generate installment rows
  const installmentRows = [];
  if (loanAmount && numInstallments > 0) {
    const startDate = new Date(deductionStart || '2026-09-01');
    for (let i = 1; i <= numInstallments; i++) {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + (i - 1));
      installmentRows.push({
        index: i,
        amount: Math.round(monthlyDeduction),
        date: d.toISOString().split('T')[0]
      });
    }
  }

  const docTitles = {
    loan: 'طلب سلفة مالية',
    leave_clearance: 'إخلاء طرف إجازة سنوية',
    salary_cert: 'شهادة تعريف بالراتب والوظيفة',
    end_service: 'إخلاء طرف نهاية خدمة'
  };

  // Format phone — always LTR so digits are never reversed in RTL context
  const formatPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('966') && digits.length >= 12) {
      return '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 5) + ' ' + digits.slice(5, 8) + ' ' + digits.slice(8);
    }
    if (digits.startsWith('05') && digits.length === 10) {
      return '+966 ' + digits.slice(1, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
    }
    return phone;
  };

  const handlePrint = () => window.print();

  const todayAr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const todayEn = new Date().toLocaleDateString('en-GB');

  // LTR style for all numbers/phones/dates — prevents RTL reversal
  const ltrStyle = { direction: 'ltr', unicodeBidi: 'embed' };

  const printCSS = `
    @media print {
      @page { size: A4 portrait; margin: 10mm 8mm; }
      html, body {
        background: #fff !important; margin: 0 !important; padding: 0 !important;
        height: auto !important; overflow: visible !important;
        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
      }
      header, aside, nav, .no-print, .print-controls {
        display: none !important; height: 0 !important; overflow: hidden !important;
      }
      .lg\\:ps-64 { padding-inline-start: 0 !important; }
      main, main > div { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
      .executive-sheet {
        border: 2px solid #0B1F3A !important; border-radius: 4px !important;
        padding: 20px !important; background: #fff !important; box-shadow: none !important;
        width: 100% !important; min-height: auto !important;
        page-break-inside: avoid !important; page-break-before: avoid !important; break-inside: avoid !important;
      }
      .sheet-header-bg { background-color: #0B1F3A !important; color: #fff !important; }
      .sheet-box-bg { background-color: #F8FAFC !important; border: 1px solid #CBD5E1 !important; }
      .sheet-table-header { background-color: #0B1F3A !important; color: #fff !important; }
      .print-logo img { max-width: 60px !important; max-height: 60px !important; }
      .ltr-nums { direction: ltr !important; unicode-bidi: embed !important; }
    }
  `;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* PRINT STYLESHEET */}
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />

      {/* SCREEN-ONLY CONTROLS */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0B1F3A] text-white flex items-center justify-center font-bold shadow-md">
            <Printer className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">نماذج الطباعة والمستندات الرسمية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">إنشاء وطباعة المستندات الرسمية على ورقة A4 احترافية</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="bg-[#0B1F3A] hover:bg-[#152e54] text-white font-bold px-6 py-2.5 rounded-xl shadow-lg border border-[#D4AF37]/40 gap-2">
          <Printer className="w-4 h-4 text-[#D4AF37]" /> طباعة / حفظ PDF
        </Button>
      </div>

      {/* INPUT FORM (Hidden on Print) */}
      <Card className="no-print p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">نوع المستند</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loan">طلب سلفة</SelectItem>
                <SelectItem value="leave_clearance">إخلاء طرف إجازة</SelectItem>
                <SelectItem value="salary_cert">شهادة تعريف بالراتب</SelectItem>
                <SelectItem value="end_service">إخلاء طرف نهاية خدمة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">الموظف</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name} (#{e.employee_number}) - {e.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {docType === 'loan' && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">مبلغ السلفة (ر.س)</Label>
              <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">عدد الأقساط</Label>
              <Input type="number" value={loanInstallments} onChange={(e) => setLoanInstallments(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">بداية الخصم</Label>
              <Input type="date" value={deductionStart} onChange={(e) => setDeductionStart(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">سبب السلفة</Label>
              <Input value={loanReason} onChange={(e) => setLoanReason(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>
        )}

        {docType === 'leave_clearance' && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">نوع الإجازة</Label>
              <Input value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">بدل الإجازة (ر.س)</Label>
              <Input type="number" value={leaveAllowance} onChange={(e) => setLeaveAllowance(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">بداية الإجازة</Label>
              <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">نهاية الإجازة</Label>
              <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
          </div>
        )}
      </Card>

      {/* A4 PRINTABLE SHEET */}
      {currentEmp && (
        <div className="executive-sheet bg-white rounded-xl border-2 border-[#0B1F3A] shadow-2xl p-8 sm:p-10 text-[#0B1F3A] font-sans" dir="rtl">

          {/* 1. OFFICIAL HEADER WITH COMPANY LOGO */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-[#0B1F3A]">
            {/* Right: Arabic Header */}
            <div className="text-right space-y-0.5" style={{flex: '1 1 30%'}}>
              <h2 className="font-heading font-extrabold text-sm text-[#0B1F3A]">المملكة العربية السعودية</h2>
              <h3 className="font-heading font-black text-base text-[#0B1F3A]">{companyProfile.legal_name || 'شركة درة السيارة لقطع غيار السيارات'}</h3>
              <p className="text-[11px] font-semibold text-slate-700">إدارة الموارد البشرية والشؤون الإدارية</p>
              <p className="text-[10px] font-mono text-slate-600 ltr-nums" dir="ltr" style={ltrStyle}>
                س.ت: {companyProfile.cr_number || '7016475555'} | ض.ق: {companyProfile.tax_number || '311861381500003'}
              </p>
            </div>

            {/* Center: Logo + Doc Title */}
            <div className="text-center space-y-2 print-logo" style={{flex: '1 1 40%'}}>
              <div className="mx-auto w-16 h-16 rounded-full border-2 border-[#D4AF37] bg-gradient-to-tr from-[#0B1F3A] to-[#1E3A8A] flex items-center justify-center shadow-md overflow-hidden">
                {companyProfile.logo_url ? (
                  <img src={companyProfile.logo_url || "/company-logo.svg"} onError={(e) => { e.currentTarget.src = "/company-logo.svg"; }} alt="شعار الشركة" className="w-14 h-14 object-contain p-1" />
                ) : (
                  <span className="font-serif font-black text-xl tracking-wider text-[#D4AF37]">DC</span>
                )}
              </div>
              <div className="inline-block px-5 py-1.5 rounded-lg bg-[#0B1F3A] text-white font-bold text-sm tracking-wide shadow border border-[#D4AF37]">
                {docTitles[docType] || 'نموذج رسمي'}
              </div>
            </div>

            {/* Left: English Header + Ref/Date */}
            <div className="text-left space-y-0.5" style={{flex: '1 1 30%'}}>
              <h2 className="font-heading font-bold text-[11px] text-[#0B1F3A]">KINGDOM OF SAUDI ARABIA</h2>
              <h3 className="font-heading font-extrabold text-xs text-[#0B1F3A]">DORAT AL-SAYARAH CO.</h3>
              <p className="text-[10px] text-slate-600">Human Resources Department</p>
              <div className="pt-0.5 text-[10px] font-mono text-slate-800 space-y-0.5 ltr-nums" dir="ltr" style={ltrStyle}>
                <p>Ref: <span className="font-bold">HR-{currentEmp.employee_number}-{new Date().getFullYear()}</span></p>
                <p>Date: <span className="font-bold">{todayEn}</span></p>
              </div>
            </div>
          </div>

          {/* Arabic date */}
          <div className="text-left text-[11px] text-slate-600 mt-2">
            <span>التاريخ: <span className="font-bold">{todayAr}</span></span>
          </div>

          {/* 2. EMPLOYEE INFO GRID */}
          <div className="mt-4 sheet-box-bg rounded-lg border border-slate-300 p-4 bg-slate-50/70">
            <div className="text-xs font-bold text-[#0B1F3A] pb-2 mb-2 border-b border-slate-200 flex items-center justify-between">
              <span>بيانات الموظف الأساسية:</span>
              <span className="font-mono text-slate-500 text-[10px]">Employee Master Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">الاسم الكامل:</span>
                <span className="font-bold text-sm text-slate-900">{currentEmp.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الرقم الوظيفي:</span>
                <span className="font-mono font-bold text-sm text-[#0B1F3A] ltr-nums" dir="ltr" style={ltrStyle}>#{currentEmp.employee_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">رقم الهوية / الإقامة:</span>
                <span className="font-mono font-bold text-slate-900 ltr-nums" dir="ltr" style={ltrStyle}>{currentEmp.national_id || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الجنسية:</span>
                <span className="font-bold text-slate-900">{currentEmp.nationality || 'سعودي'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الفرع / القسم:</span>
                <span className="font-semibold text-slate-800">{currentEmp.branch_name || currentEmp.branch || 'مكتب الإدارة'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">المسمى الوظيفي:</span>
                <span className="font-semibold text-slate-800">{currentEmp.job_title}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">تاريخ المباشرة:</span>
                <span className="font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{currentEmp.join_date || currentEmp.hire_date || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الراتب الأساسي:</span>
                <span className="font-mono font-bold text-slate-900 ltr-nums" dir="ltr" style={ltrStyle}>{Number(currentEmp.salary || 0).toLocaleString()} ر.س</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">رقم الجوال:</span>
                <span className="font-mono font-bold text-slate-900 ltr-nums" dir="ltr" style={ltrStyle}>{formatPhone(currentEmp.phone)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">البريد الإلكتروني:</span>
                <span className="font-mono text-slate-800 text-[10px] ltr-nums" dir="ltr" style={ltrStyle}>{currentEmp.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* 3. DYNAMIC CONTENT */}
          <div className="mt-4 space-y-3">
            {/* Case A: LOAN */}
            {docType === 'loan' && (
              <>
                <div className="sheet-box-bg rounded-lg border border-slate-300 p-4 bg-slate-50/70">
                  <div className="text-xs font-bold text-[#0B1F3A] pb-2 mb-2 border-b border-slate-200">تفاصيل بيانات طلب السلفة:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">مبلغ السلفة:</span>
                      <span className="text-base font-bold font-mono text-[#0B1F3A] ltr-nums" dir="ltr" style={ltrStyle}>{Number(loanAmount || 0).toLocaleString()} ر.س</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">عدد الأقساط:</span>
                      <span className="text-base font-bold font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{numInstallments} قسط</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">القسط الشهري:</span>
                      <span className="text-base font-bold font-mono text-emerald-700 ltr-nums" dir="ltr" style={ltrStyle}>{Math.round(monthlyDeduction).toLocaleString()} ر.س/شهر</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">بداية الخصم:</span>
                      <span className="text-sm font-bold font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{deductionStart}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500">سبب السلفة: </span>
                    <span className="font-medium text-slate-900">{loanReason}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B1F3A] mb-2">جدول سداد الأقساط الشهرية:</p>
                  <div className="border border-[#0B1F3A] rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-4 sheet-table-header bg-[#0B1F3A] text-white font-bold py-2 px-3 text-center">
                      <div>القسط</div>
                      <div>المبلغ (ر.س)</div>
                      <div>تاريخ الخصم</div>
                      <div>الحالة</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {installmentRows.map((row) => (
                        <div key={row.index} className="grid grid-cols-4 py-1.5 px-3 text-center text-xs font-mono font-medium">
                          <div className="font-bold text-slate-800">قسط #{row.index}</div>
                          <div className="font-bold text-[#0B1F3A] ltr-nums" dir="ltr" style={ltrStyle}>{row.amount.toLocaleString()} ر.س</div>
                          <div className="ltr-nums" dir="ltr" style={ltrStyle}>{row.date}</div>
                          <div className="text-slate-600 font-sans font-medium text-[11px]">بانتظار الخصم</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Case B: LEAVE CLEARANCE */}
            {docType === 'leave_clearance' && (
              <div className="sheet-box-bg rounded-lg border border-slate-300 p-5 bg-slate-50/70 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-[#0B1F3A] border-b pb-2">بيانات طلب الإجازة والإخلاء:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">نوع الإجازة:</span>
                    <span className="font-bold text-sm">{leaveType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">تاريخ بداية الإجازة:</span>
                    <span className="font-bold font-mono text-sm ltr-nums" dir="ltr" style={ltrStyle}>{leaveStart}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">تاريخ المباشرة المتوقع:</span>
                    <span className="font-bold font-mono text-sm ltr-nums" dir="ltr" style={ltrStyle}>{leaveEnd}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">مستحقات بدل الإجازة:</span>
                    <span className="font-bold font-mono text-base text-emerald-700 ltr-nums" dir="ltr" style={ltrStyle}>{Number(leaveAllowance || 0).toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>
            )}

            {/* Case C: SALARY CERTIFICATE */}
            {docType === 'salary_cert' && (
              <div className="sheet-box-bg rounded-lg border border-slate-300 p-5 bg-slate-50/70 space-y-3 text-sm leading-relaxed">
                <h4 className="font-bold text-base text-[#0B1F3A] text-center border-b pb-2">إلى من يهمه الأمر / شهادة تعريف بالراتب والوظيفة</h4>
                <p className="text-justify">
                  تشهد شركة <span className="font-bold text-[#0B1F3A]">{companyProfile.legal_name || 'شركة درة السيارة لقطع غيار السيارات'} (س.ت: {companyProfile.cr_number || '7016475555'})</span> بأن الموظف المذكور أعلاه يعمل لديها بوظيفة <span className="font-bold">{currentEmp.job_title}</span> ويتقاضى راتباً شهرياً إجمالياً قدره (<span className="font-bold font-mono text-base text-[#0B1F3A] ltr-nums" dir="ltr" style={ltrStyle}>{Number(currentEmp.salary || 0).toLocaleString()} ريال سعودي</span>).
                </p>
                <p className="text-justify">
                  أعطي هذا الخطاب بناءً على طلب الموظف دون أي مسؤولية مالية أو قانونية على الشركة، ولا يعتبر هذا الخطاب ضماناً أو التزاماً بأي شكل من الأشكال.
                </p>
              </div>
            )}

            {/* Case D: END OF SERVICE */}
            {docType === 'end_service' && (
              <div className="sheet-box-bg rounded-lg border border-slate-300 p-5 bg-slate-50/70 space-y-3 text-sm leading-relaxed">
                <h4 className="font-bold text-base text-[#0B1F3A] text-center border-b pb-2">نموذج إخلاء طرف نهاية خدمة</h4>
                <p className="text-justify">
                  يشهد هذا الخطاب بأن الموظف <span className="font-bold text-[#0B1F3A]">{currentEmp.full_name}</span> الذي يحمل الرقم الوظيفي <span className="font-bold font-mono ltr-nums" dir="ltr" style={ltrStyle}>#{currentEmp.employee_number}</span> قد أنهى خدمته لدى الشركة وتم تسوية كافة مستحقاته المالية والإدارية.
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                  <div>
                    <span className="text-slate-500 block">آخر يوم عمل:</span>
                    <span className="font-bold font-mono ltr-nums" dir="ltr" style={ltrStyle}>{todayEn}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">حالة المخالصة:</span>
                    <span className="font-bold text-emerald-700">تمت التسوية</span>
                  </div>
                </div>
              </div>
            )}

            {/* Employee Declaration */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">إقرار الموظف: </span>
              أقر أنا الموظف الموقع أدناه بصحة البيانات الواردة أعلاه وموافقتي على شروط وأحكام السلفة/الإخلاء المذكورة وأتحمل المسؤولية الكاملة في حال مخالفة أي من الشروط المنصوص عليها.
            </div>
          </div>

          {/* 4. SIGNATURES */}
          <div className="mt-6 pt-4 border-t-2 border-[#0B1F3A]">
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-24">
                <p className="font-bold text-slate-800">مقدم الطلب (الموظف)</p>
                <div className="text-[11px] text-slate-500">
                  <p>{currentEmp.full_name?.split(' ').slice(0, 2).join(' ')}</p>
                  <p className="border-t border-dashed border-slate-400 mt-1 pt-0.5">التوقيع</p>
                </div>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-24">
                <p className="font-bold text-slate-800">المحاسب المالي</p>
                <div className="text-[11px] text-slate-500">
                  <p>هشام زغلول</p>
                  <p className="border-t border-dashed border-slate-400 mt-1 pt-0.5">التوقيع والختم</p>
                </div>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-24">
                <p className="font-bold text-slate-800">إدارة الموارد البشرية</p>
                <div className="text-[11px] text-slate-500">
                  <p>يحيى باشا</p>
                  <p className="border-t border-dashed border-slate-400 mt-1 pt-0.5">التوقيع والموافقة</p>
                </div>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-24 relative">
                <p className="font-bold text-slate-800">المدير العام / الختم</p>
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 mx-auto flex items-center justify-center text-[9px] text-slate-400">
                  مكان الختم
                </div>
              </div>
            </div>

            {/* 5. FOOTER */}
            <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600">
              <div>
                <p className="font-bold text-slate-800">{companyProfile.legal_name || 'شركة درة السيارة لقطع غيار السيارات'} — {companyProfile.address || 'بريدة - القصيم'}</p>
                <p className="font-mono ltr-nums" dir="ltr" style={ltrStyle}>Tel: {formatPhone(companyProfile.phone)} | Email: info@doracars.com</p>
              </div>
              <div className="text-left font-mono space-y-0.5">
                <p className="tracking-widest text-[9px] text-slate-400">||| |||| || |||||| ||||| || ||||||||||||| |||</p>
                <p className="text-[9px] text-slate-500">نسخة رسمية مختومة إلكترونياً</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
