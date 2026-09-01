import { getCompanyProfile } from '@/lib/companyProfile';
import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  FileCheck,
  Building2,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download
} from 'lucide-react';
import { normalizeAdvance } from '@/lib/payrollEngine';

export default function AdvanceVoucherA4Modal({
  isOpen,
  onClose,
  advance: rawAdvance,
  employee,
  companyName = 'مؤسسة السهم الأخضر للتجارة'
}) {
  const printRef = useRef(null);

  if (!rawAdvance) return null;
  const advance = normalizeAdvance(rawAdvance);

  const totalAmount = advance.total_amount;
  const installmentsCount = advance.total_installments;
  const monthlyInstallment = advance.monthly_installment;
  const startMonth = advance.start_month;
  const voucherNumber = 'GA-ADV-' + (advance.id ? String(advance.id).replace('adv_', '').slice(-6) : '9941');

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border shadow-2xl bg-slate-100 dark:bg-slate-900" dir="rtl">
        
        {/* Top Control Action Bar (Hidden in Print) */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                سند وإقرار استلام سلفة مالية (نموذج A4 رسمي)
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground font-mono">
                رقم السند: {voucherNumber} • الموظف: {advance.employee_name} (#{advance.employee_number})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-black gap-2 h-9 px-4 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة سند A4 🖨️</span>
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-bold h-9 px-3"
            >
              إغلاق
            </Button>
          </div>
        </div>

        {/* ─── A4 PAPER DOCUMENT CONTAINER ─────────────────────────────────── */}
        <div className="p-4 sm:p-8 flex justify-center">
          
          <div 
            ref={printRef}
            id="printable-advance-voucher"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 text-right print:p-0 print:m-0 print:border-0 print:shadow-none print:w-full print:max-w-none text-xs font-sans"
            style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}
          >
            
            {/* 1. OFFICIAL HEADER */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex items-center justify-between">
                
                {/* Right: Company Info */}
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-900">مؤسسة السهم الأخضر للتجارة</h2>
                  <p className="text-[11px] text-slate-600 font-bold">Green Arrow Trading Est.</p>
                  <p className="text-[10px] text-slate-500 font-mono">س.ت: 1131012345 • بريدة، المملكة العربية السعودية</p>
                  <Badge className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold mt-1">
                    إدارة الشؤون المالية والموارد البشرية
                  </Badge>
                </div>

                {/* Center: Title */}
                <div className="text-center px-4 py-2 border-2 border-purple-800 bg-purple-50 rounded-2xl">
                  <h1 className="text-base font-black text-purple-950">سند أمر وإقرار استلام سلفة</h1>
                  <p className="text-[10px] text-purple-800 font-mono mt-0.5 font-bold">ADVANCE DISBURSEMENT VOUCHER</p>
                  <span className="text-[9px] text-slate-500 font-mono">{voucherNumber}</span>
                </div>

                {/* Left: Logo & Date */}
                <div className="text-left space-y-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center p-1 font-bold ms-auto">
                    <img src={companyProfile.logo_url || "/company-logo.svg"} alt="logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = "/company-logo.svg"; }} />
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono pt-1">
                    التاريخ: <strong className="text-slate-900">{advance.disbursement_date || new Date().toISOString().slice(0, 10)}</strong>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. EMPLOYEE INFO BOX */}
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 mb-5">
              <h3 className="font-black text-xs text-purple-950 mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <User className="w-4 h-4 text-purple-700" />
                <span>أولاً: بيانات الموظف المستفيد (المقترض)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">اسم الموظف:</span>
                  <strong className="text-slate-900 text-xs">{advance.employee_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">الرقم الوظيفي:</span>
                  <strong className="text-purple-800 font-mono font-bold">#{advance.employee_number}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">الفرع / الموقع:</span>
                  <strong className="text-slate-900">{employee?.branch_name || employee?.branch || 'فرع كيا (السليم)'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">المسمى الوظيفي:</span>
                  <strong className="text-slate-900">{employee?.job_title || 'فني / موظف'}</strong>
                </div>
              </div>
            </div>

            {/* 3. LOAN & FINANCIAL DETAILS */}
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 mb-5">
              <h3 className="font-black text-xs text-purple-950 mb-3 flex items-center gap-1.5 border-b border-purple-200 pb-1.5">
                <CreditCard className="w-4 h-4 text-purple-700" />
                <span>ثانياً: تفاصيل وبيانات السلفة والجدولة المالية</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                  <span className="text-slate-500 block text-[10px] font-bold">إجمالي مبلغ السلفة:</span>
                  <div className="font-mono font-black text-sm text-purple-900 mt-0.5">
                    {totalAmount.toLocaleString('en-US')} ر.س
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                  <span className="text-slate-500 block text-[10px] font-bold">عدد الأقساط الشهرية:</span>
                  <div className="font-mono font-black text-sm text-slate-900 mt-0.5">
                    {installmentsCount} أشهر
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                  <span className="text-slate-500 block text-[10px] font-bold">القسط الشهري المستقطع:</span>
                  <div className="font-mono font-black text-sm text-rose-600 mt-0.5">
                    {monthlyInstallment.toLocaleString('en-US')} ر.س/شهر
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                  <span className="text-slate-500 block text-[10px] font-bold">بدء الاستقطاع من مسير:</span>
                  <div className="font-mono font-bold text-xs text-slate-800 mt-1">
                    شهر ({startMonth})
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-purple-100 text-[11px] flex items-center gap-2">
                <span className="text-slate-500 font-bold">الغرض ومبرر السلفة:</span>
                <span className="text-slate-900 font-medium">{advance.reason || 'سلفة شخصية طارئة بناءً على طلب الموظف'}</span>
              </div>
            </div>

            {/* 4. INSTALLMENTS SCHEDULE BREAKDOWN */}
            <div className="mb-6">
              <h3 className="font-black text-xs text-slate-900 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-700" />
                <span>ثالثاً: جدول استقطاع الأقساط من الرواتب الشهرية</span>
              </h3>

              <table className="w-full border-collapse border border-slate-300 text-center text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-black text-slate-900">
                    <th className="border border-slate-300 py-1.5 px-2">الدفعة #</th>
                    <th className="border border-slate-300 py-1.5 px-3">شهر الاستحقاق</th>
                    <th className="border border-slate-300 py-1.5 px-3">مبلغ القسط المستقطع</th>
                    <th className="border border-slate-300 py-1.5 px-3">الرصيد المتبقي بعد الخصم</th>
                    <th className="border border-slate-300 py-1.5 px-3">حالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let runningBalance = totalAmount;
                    const rows = [];
                    for (let idx = 0; idx < Math.min(installmentsCount, 24); idx++) {
                      if (runningBalance <= 0) break;
                      const instNum = idx + 1;
                      // Accurate remainder calculation for the last installment
                      const instAmount = Math.min(monthlyInstallment, runningBalance);
                      runningBalance = Math.max(0, runningBalance - instAmount);

                      const parts = startMonth.split('-');
                      let yr = parseInt(parts[0] || '2026', 10);
                      let mo = parseInt(parts[1] || '8', 10) + idx;
                      while (mo > 12) { mo -= 12; yr += 1; }
                      const mStr = `${yr}-${String(mo).padStart(2, '0')}`;

                      rows.push(
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 py-1.5 font-mono font-bold">القسط ({instNum}/{installmentsCount})</td>
                          <td className="border border-slate-300 py-1.5 font-mono font-bold text-slate-800">{mStr}</td>
                          <td className="border border-slate-300 py-1.5 font-mono font-black text-rose-600">-{instAmount.toLocaleString('en-US')} ر.س</td>
                          <td className="border border-slate-300 py-1.5 font-mono font-bold text-slate-600">{runningBalance.toLocaleString('en-US')} ر.س</td>
                          <td className="border border-slate-300 py-1.5 font-bold text-[10px] text-amber-700">
                            {idx === 0 && advance.paid_amount >= instAmount ? 'تم الاستقطاع ✓' : 'مجدول بمسير الراتب'}
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>

            {/* 5. LEGAL UNDERTAKING */}
            <div className="mb-6 p-4 bg-amber-50/70 rounded-2xl border border-amber-300 text-[10px] leading-relaxed text-amber-950">
              <h4 className="font-black text-xs text-amber-900 mb-1">إقرار وتعهد باستلام السلفة وتفويض صريح بالخصم:</h4>
              <p>
                أقر أنا الموظف الموضح بياناتي وتوقيعي أدناه بأنني قد استلمت مبلغ السلفة المذكور وقدره (<strong>{totalAmount.toLocaleString('en-US')} ريال سعودي</strong>) نقداً / تحويلاً بنكياً، وأفوض إدارة المنشأة بتفويض رسمي نهائي وغير قابل للإلغاء باستقطاع الأقساط المحددة شهرياً من راتبي ومستحقاتي حتى تمام السداد، وفي حال انتهاء خدماتي لأي سبب قبل اكتمال السداد، يحق للمنشأة حسم كامل الرصيد المتبقي دفعة واحدة من مكافأة نهاية الخدمة وأي مستحقات نهائية لي.
              </p>
            </div>

            {/* 6. TRIPLE OFFICIAL SIGNATURES */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-900 text-center text-xs">
              
              <div className="space-y-5">
                <div className="font-black text-slate-900">
                  توقيع الموظف المستلم (المقترض)
                </div>
                <div className="h-10 border-b border-dashed border-slate-400 mx-4"></div>
                <div className="text-[10px] text-slate-600 font-bold">
                  الاسم: {advance.employee_name}
                </div>
              </div>

              <div className="space-y-5">
                <div className="font-black text-slate-900">
                  المحاسب المالي (الصرف والجدولة)
                </div>
                <div className="font-bold text-[11px] text-slate-800">
                  هشام ابوالفضل زغلول
                </div>
                <div className="text-[10px] font-bold text-indigo-700 font-mono">
                  تم الصرف والجدولة المالية ✓
                </div>
              </div>

              <div className="space-y-5">
                <div className="font-black text-slate-900">
                  اعتماد المدير العام
                </div>
                <div className="font-bold text-[11px] text-slate-800">
                  فهد ناصر محمد الجوعي
                </div>
                <div className="text-[10px] font-bold text-emerald-700 font-mono">
                  معتمد رسمياً (Approved) 👑
                </div>
              </div>

            </div>

            {/* 7. DOCUMENT FOOTER */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono" dir="ltr">
              <span>SYSTEM-GENERATED FINANCIAL RECORD • GREEN ARROW HR ENTERPRISE</span>
              <span>VERIFIED: {voucherNumber}</span>
            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
