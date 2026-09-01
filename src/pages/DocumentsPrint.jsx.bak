import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, FileText, Calendar, Building2, User, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DocumentsPrint() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('emp_1001');
  const [docType, setDocType] = useState('loan');

  // Loan Fields
  const [loanAmount, setLoanAmount] = useState('3000');
  const [loanInstallments, setLoanInstallments] = useState('6');
  const [deductionStart, setDeductionStart] = useState('2026-09-01');
  const [loanReason, setLoanReason] = useState('ظروف عائلية وشخصية طارئة');

  // Leave Clearance Fields
  const [leaveType, setLeaveType] = useState('سنوية');
  const [leaveStart, setLeaveStart] = useState('2026-09-01');
  const [leaveEnd, setLeaveEnd] = useState('2026-09-21');
  const [leaveAllowance, setLeaveAllowance] = useState('2800');

  useEffect(() => {
    base44.entities.Employee.list().then((list) => {
      setEmployees(list || []);
      if (list && list.length > 0) {
        setSelectedEmpId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const currentEmp = employees.find(e => e.id === selectedEmpId || e.employee_number === selectedEmpId) || employees[0];
  const numInstallments = Math.max(1, Math.min(24, Number(loanInstallments) || 1));
  const monthlyDeduction = (Number(loanAmount) || 0) / numInstallments;

  // Generate dynamic installment table rows
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
    loan: 'طلب وموافقة سلفة مالية للموظف',
    leave_clearance: 'مخالصة وتصفية مستحقات إجازة',
    overtime: 'نموذج تكليف واعتماد عمل إضافي',
    comp_leave: 'إشعار منح إجازة تعويضية',
    salary_cert: 'شهادة تعريف بالراتب ومفردات المرتب',
    end_service: 'مخالصة وتسوية مكافأة نهاية الخدمة'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Executive Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body, html {
            background: #ffffff !important;
            color: #0B1F3A !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important;
          }
          header, aside, nav, .no-print, .print-controls {
            display: none !important;
          }
          .lg\\:ps-64 {
            padding-inline-start: 0 !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .executive-sheet {
            border: 2px solid #0B1F3A !important;
            border-radius: 4px !important;
            padding: 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            width: 100% !important;
            min-height: 275mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
          }
          .sheet-header-bg {
            background-color: #0B1F3A !important;
            color: #ffffff !important;
          }
          .sheet-box-bg {
            background-color: #F8FAFC !important;
            border: 1px solid #CBD5E1 !important;
          }
          .sheet-table-header {
            background-color: #0B1F3A !important;
            color: #ffffff !important;
          }
          .stamp-circle {
            border: 2px dashed #94A3B8 !important;
          }
        }
      `}</style>

      {/* Screen Controls Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0B1F3A] text-white flex items-center justify-center font-bold shadow-md">
            <Printer className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">طابعة المستندات والخطابات الرسمية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">توليد وطباعة خطابات ونماذج الشركة الرسمية المعتمدة بمقاس A4 فاخر</p>
          </div>
        </div>

        <Button onClick={handlePrint} className="bg-[#0B1F3A] hover:bg-[#152e54] text-white font-bold px-6 py-2.5 rounded-xl shadow-lg border border-[#D4AF37]/40 gap-2">
          <Printer className="w-4 h-4 text-[#D4AF37]" /> طباعة / حفظ PDF الفاخر
        </Button>
      </div>

      {/* Input Options (Hidden on Print) */}
      <Card className="no-print p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">نوع المستند الرسمي</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loan">طلب سلفة مالية</SelectItem>
                <SelectItem value="leave_clearance">مخالصة وتصفية إجازة</SelectItem>
                <SelectItem value="overtime">طلب وتكليف عمل إضافي</SelectItem>
                <SelectItem value="comp_leave">إجازة تعويضية</SelectItem>
                <SelectItem value="salary_cert">شهادة تعريف بالراتب</SelectItem>
                <SelectItem value="end_service">تسوية ومكافأة نهاية الخدمة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">الموظف المعني</Label>
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

        {/* Dynamic Fields */}
        {docType === 'loan' && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">قيمة السلفة (ريال)</Label>
              <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">عدد الأقساط الشهرية</Label>
              <Input type="number" value={loanInstallments} onChange={(e) => setLoanInstallments(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ أول قسط</Label>
              <Input type="date" value={deductionStart} onChange={(e) => setDeductionStart(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">سبب طلب السلفة</Label>
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
              <Label className="text-xs font-semibold">بدل الإجازة (ريال)</Label>
              <Input type="number" value={leaveAllowance} onChange={(e) => setLeaveAllowance(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ بداية الإجازة</Label>
              <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ نهاية الإجازة</Label>
              <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
          </div>
        )}
      </Card>

      {/* EXECUTIVE CORPORATE A4 PRINTABLE SHEET */}
      {currentEmp && (
        <div className="executive-sheet bg-white rounded-xl border-2 border-[#0B1F3A] shadow-2xl p-8 sm:p-10 text-[#0B1F3A] font-sans">
          
          {/* 1. OFFICIAL ROYAL HEADER */}
          <div>
            <div className="flex items-start justify-between pb-5 border-b-2 border-[#0B1F3A]">
              
              {/* Right: Arabic Official Header */}
              <div className="text-right space-y-1">
                <h2 className="font-heading font-extrabold text-base text-[#0B1F3A]">المملكة العربية السعودية</h2>
                <h3 className="font-heading font-black text-lg text-[#0B1F3A]">شركة درة السيارة للتجارة</h3>
                <p className="text-xs font-semibold text-slate-700">إدارة الموارد البشرية والشؤون الإدارية</p>
                <p className="text-[11px] font-mono text-slate-600">س.ت: 7016475555 | ر.ض: 311861381500003</p>
              </div>

              {/* Center: Luxury Emblem & Doc Title Box */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-[#D4AF37] bg-gradient-to-tr from-[#0B1F3A] to-[#1E3A8A] text-white shadow-md mx-auto">
                  <span className="font-serif font-black text-xl tracking-wider text-[#D4AF37]">DC</span>
                </div>
                <div className="px-6 py-2 rounded-xl bg-[#0B1F3A] text-white font-bold text-sm tracking-wide shadow border border-[#D4AF37]">
                  {docTitles[docType] || 'مستند رسمي معتمد'}
                </div>
              </div>

              {/* Left: English Official Header & Meta */}
              <div className="text-left space-y-1">
                <h2 className="font-heading font-bold text-xs text-[#0B1F3A]">KINGDOM OF SAUDI ARABIA</h2>
                <h3 className="font-heading font-extrabold text-sm text-[#0B1F3A]">DORAT AL-SAYARAH CO.</h3>
                <p className="text-[11px] text-slate-600">Human Resources Department</p>
                <div className="pt-1 text-[11px] font-mono text-slate-800 space-y-0.5">
                  <p>Ref: <span className="font-bold">LN-{currentEmp.employee_number}-{new Date().getFullYear()}</span></p>
                  <p>Date: <span className="font-bold">{new Date().toLocaleDateString('ar-SA')}</span></p>
                </div>
              </div>
            </div>

            {/* 2. STRUCTURED EMPLOYEE INFORMATION GRID */}
            <div className="mt-5 sheet-box-bg rounded-xl border border-slate-300 p-4 bg-slate-50/70">
              <div className="text-xs font-bold text-[#0B1F3A] pb-2 mb-2 border-b border-slate-200 flex items-center justify-between">
                <span>بيانات الموظف الأساسية:</span>
                <span className="font-mono text-slate-500">Employee Master Details</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">اسم الموظف الرباعي:</span>
                  <span className="font-bold text-sm text-slate-900">{currentEmp.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">الرقم الوظيفي:</span>
                  <span className="font-mono font-bold text-sm text-[#0B1F3A]">#{currentEmp.employee_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">رقم الهوية / الإقامة:</span>
                  <span className="font-mono font-bold text-slate-900">{currentEmp.national_id || '2554901666'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">الجنسية:</span>
                  <span className="font-bold text-slate-900">{currentEmp.nationality || 'سعودي'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">الفرع التابع له:</span>
                  <span className="font-semibold text-slate-800">{currentEmp.branch_name || 'الفرع الرئيسي'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">المسمى الوظيفي:</span>
                  <span className="font-semibold text-slate-800">{currentEmp.job_title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">تاريخ مباشرة العمل:</span>
                  <span className="font-mono text-slate-800">{currentEmp.join_date || '2022-11-01'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">الراتب الأساسي المعتمد:</span>
                  <span className="font-mono font-bold text-slate-900">{Number(currentEmp.salary || 0).toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>

            {/* 3. DYNAMIC CONTENT & DATA TABLES */}
            <div className="mt-5 space-y-4">
              
              {/* Case A: LOAN (طلب سلفة وجدول أقساط حقيقي) */}
              {docType === 'loan' && (
                <>
                  <div className="sheet-box-bg rounded-xl border border-slate-300 p-4 bg-slate-50/70">
                    <div className="text-xs font-bold text-[#0B1F3A] pb-2 mb-2 border-b border-slate-200">
                      تفاصيل وبيانات طلب السلفة المالية:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">المبلغ المطلوب:</span>
                        <span className="text-base font-bold font-mono text-[#0B1F3A]">{Number(loanAmount || 0).toLocaleString()} ريال</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">عدد الأقساط:</span>
                        <span className="text-base font-bold font-mono text-slate-800">{numInstallments} قسط شهري</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">قيمة القسط الشهري:</span>
                        <span className="text-base font-bold font-mono text-emerald-700">{Math.round(monthlyDeduction).toLocaleString()} ريال/شهر</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">تاريخ بدء الاستقطاع:</span>
                        <span className="text-sm font-bold font-mono text-slate-800">{deductionStart}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-xs">
                      <span className="text-slate-500">سبب طلب السلفة: </span>
                      <span className="font-medium text-slate-900">{loanReason}</span>
                    </div>
                  </div>

                  {/* Generated Installment Schedule Table */}
                  <div>
                    <p className="text-xs font-bold text-[#0B1F3A] mb-2">جدول استقطاع الأقساط الشهرية المعتمد:</p>
                    <div className="border border-[#0B1F3A] rounded-lg overflow-hidden text-xs">
                      <div className="grid grid-cols-4 sheet-table-header bg-[#0B1F3A] text-white font-bold py-2 px-3 text-center">
                        <div>رقم القسط</div>
                        <div>مبلغ القسط (ريال)</div>
                        <div>تاريخ الاستحقاق</div>
                        <div>حالة السداد</div>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {installmentRows.map((row) => (
                          <div key={row.index} className="grid grid-cols-4 py-2 px-3 text-center text-xs hover:bg-slate-50 font-mono font-medium">
                            <div className="font-bold text-slate-800">القسط #{row.index}</div>
                            <div className="font-bold text-[#0B1F3A]">{row.amount.toLocaleString()} ر.س</div>
                            <div>{row.date}</div>
                            <div className="text-slate-600 font-sans font-medium text-[11px]">مجدول بالحسم الشهري</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Case B: LEAVE CLEARANCE */}
              {docType === 'leave_clearance' && (
                <div className="sheet-box-bg rounded-xl border border-slate-300 p-5 bg-slate-50/70 space-y-3 text-xs">
                  <h4 className="font-bold text-sm text-[#0B1F3A] border-b pb-2">بيانات تصفية الإجازة والمستحقات:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">نوع الإجازة:</span>
                      <span className="font-bold text-sm">{leaveType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">تاريخ بداية الإجازة:</span>
                      <span className="font-bold font-mono text-sm">{leaveStart}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">تاريخ العودة ومباشرة العمل:</span>
                      <span className="font-bold font-mono text-sm">{leaveEnd}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">مستحقات بدل الإجازة:</span>
                      <span className="font-bold font-mono text-base text-emerald-700">{Number(leaveAllowance || 0).toLocaleString()} ر.س</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Case C: SALARY CERTIFICATE */}
              {docType === 'salary_cert' && (
                <div className="sheet-box-bg rounded-xl border border-slate-300 p-6 bg-slate-50/70 space-y-4 text-sm leading-relaxed">
                  <h4 className="font-bold text-base text-[#0B1F3A] text-center border-b pb-2">إلى من يهمه الأمر / الجهات المصرفية والرسمية</h4>
                  <p className="text-justify">
                    تشهد إدارة <span className="font-bold text-[#0B1F3A]">شركة درة السيارة للتجارة (س.ت: 7016475555)</span> بأن الموظف الموضحة بياناته أعلاه يعمل لدينا بموجب عقد عمل ساري المفعول، ويتقاضى راتباً شهرياً إجمالياً وقدره (<span className="font-bold font-mono text-base text-[#0B1F3A]">{Number(currentEmp.salary || 0).toLocaleString()} ريال سعودي</span>).
                  </p>
                  <p className="text-justify">
                    وقد أُعطي هذا الخطاب بناءً على طلبه لتقديمه للجهة الطالبة دون أدنى مسؤولية مالية أو قانونية على الشركة تجاه حقوق والتزامات الغير.
                  </p>
                </div>
              )}

              {/* Employee Declaration Box */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">إقرار وتعهد: </span>
                أقر أنا الموظف الموقع أدناه بصحة كافة البيانات المذكورة أعلاه، وأفوض إدارة الشركة بحسم الأقساط/المستحقات المقررة نظاماً من مسير رواتبي الشهري حتى السداد الكامل.
              </div>

            </div>
          </div>

          {/* 4. EXECUTIVE SIGNATURES & OFFICIAL STAMP */}
          <div className="mt-8 pt-5 border-t-2 border-[#0B1F3A]">
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-28">
                <p className="font-bold text-slate-800">مقدم الطلب (الموظف)</p>
                <div className="text-[11px] text-slate-500 font-serif">
                  <p>{currentEmp.full_name.split(' ')[0]}</p>
                  <p className="border-t border-dashed border-slate-400 mt-1 pt-0.5">التوقيع</p>
                </div>
              </div>

              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-28">
                <p className="font-bold text-slate-800">المحاسب المالي</p>
                <div className="text-[11px] text-slate-500 font-serif">
                  <p>هشام زغلول</p>
                  <p className="border-t border-dashed border-slate-400 mt-1 pt-0.5">التوقيع والتدقيق</p>
                </div>
              </div>

              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-28">
                <p className="font-bold text-slate-800">مدير الموارد البشرية</p>
                <div className="text-[11px] text-slate-500 font-serif">
                  <p>يحيى باشا</p>
                  <p className="border-t border-dashed border-slate-400 mt-1 pt-0.5">المطابقة والاعتماد</p>
                </div>
              </div>

              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between h-28 relative">
                <p className="font-bold text-slate-800">المدير العام / الختم</p>
                <div className="stamp-circle w-14 h-14 rounded-full border-2 border-dashed border-slate-300 mx-auto flex items-center justify-center text-[9px] text-slate-400">
                  محل الختم
                </div>
              </div>

            </div>

            {/* 5. OFFICIAL FOOTER WITH BARCODE & CONTACT */}
            <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600">
              <div>
                <p className="font-bold text-slate-800">شركة درة السيارة للتجارة — المملكة العربية السعودية - بريدة - القصيم</p>
                <p className="font-mono">هاتف: +966 54 169 7999 | البريد: info@doracars.com</p>
              </div>

              <div className="text-left font-mono space-y-0.5">
                <p className="tracking-widest text-[9px] text-slate-400">||| |||| || |||||| ||||| || ||||||||||||| |||</p>
                <p className="text-[9px] text-slate-500">مستند رسمي صادر إلكترونياً</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
