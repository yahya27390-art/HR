import { getCompanyProfile } from '@/lib/companyProfile';
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, FileText, CheckCircle2, AlertCircle, Coins, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getAdvances } from '@/lib/payrollEngine';
import { saveAdvance as saveCloudAdvance } from '@/lib/advanceService';
import { cloudSave } from '@/lib/cloudSyncEngine';

export default function DocumentsPrint() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [docType, setDocType] = useState('loan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancesRefreshTrigger, setAdvancesRefreshTrigger] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Company profile (with guaranteed logo)
  const [companyProfile, setCompanyProfile] = useState(() => {
    const p = getCompanyProfile();
    return {
      ...p,
      logo_url: p.logo_url || '/company-logo.png'
    };
  });

  // Listen for logo/profile updates from Settings page
  useEffect(() => {
    const handler = () => {
      const p = getCompanyProfile();
      setCompanyProfile({
        ...p,
        logo_url: p.logo_url || '/company-logo.png'
      });
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
  const currentEmpNumber = String(currentEmp?.employee_number || '').trim();

  // Find existing active advances for the current employee
  const existingActiveAdvances = useMemo(() => {
    if (!currentEmpNumber) return [];
    try {
      const all = getAdvances();
      return all.filter(a => {
        const matchEmp = String(a.employee_number || '').trim() === currentEmpNumber;
        const isActive = a.status === 'active' || a.status === 'disbursed' || a.status === 'approved';
        const rem = Number(a.remaining_balance !== undefined ? a.remaining_balance : a.total_amount) || 0;
        return matchEmp && isActive && rem > 0;
      });
    } catch {
      return [];
    }
  }, [currentEmpNumber, advancesRefreshTrigger]);

  const existingAdvanceBalance = useMemo(() => {
    return existingActiveAdvances.reduce((sum, a) => {
      const rem = Number(a.remaining_balance !== undefined ? a.remaining_balance : a.total_amount) || 0;
      return sum + rem;
    }, 0);
  }, [existingActiveAdvances]);

  const numInstallments = Math.max(1, Math.min(24, Number(loanInstallments) || 1));
  const requestedLoanAmount = Math.max(0, Number(loanAmount) || 0);
  const totalLoanAfterAccumulation = existingAdvanceBalance + requestedLoanAmount;
  const standaloneMonthlyDeduction = requestedLoanAmount / numInstallments;
  const accumulatedMonthlyInstallment = numInstallments > 0 ? Math.round(totalLoanAfterAccumulation / numInstallments) : 0;

  // Generate installment rows for document print
  // If employee has previous balance and accountant is printing the cumulative plan, or standard requested amount
  const installmentRows = [];
  const baseForSchedule = existingAdvanceBalance > 0 ? totalLoanAfterAccumulation : requestedLoanAmount;
  const monthlyForSchedule = existingAdvanceBalance > 0 ? accumulatedMonthlyInstallment : Math.round(standaloneMonthlyDeduction);

  if (baseForSchedule > 0 && numInstallments > 0) {
    const startDate = new Date(deductionStart || '2026-09-01');
    for (let i = 1; i <= numInstallments; i++) {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + (i - 1));
      installmentRows.push({
        index: i,
        amount: monthlyForSchedule,
        date: d.toISOString().split('T')[0]
      });
    }
  }

  // Handle accountant approval & balance accumulation
  const handleAddAdvanceToSystem = async () => {
    if (!currentEmp) {
      toast({ title: 'خطأ', description: 'يرجى اختيار الموظف أولاً', variant: 'destructive' });
      return;
    }
    if (requestedLoanAmount <= 0) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال مبلغ سلفة صحيح أكبر من صفر', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const todayStr = nowIso.slice(0, 10);
      const startM = deductionStart ? deductionStart.slice(0, 7) : todayStr.slice(0, 7);

      const allAdvs = getAdvances();
      const empNum = currentEmpNumber;

      // Identify existing active advances for this employee
      const activeForEmp = allAdvs.filter(a => {
        const match = String(a.employee_number || '').trim() === empNum;
        const isActive = a.status === 'active' || a.status === 'disbursed' || a.status === 'approved';
        const rem = Number(a.remaining_balance !== undefined ? a.remaining_balance : a.total_amount) || 0;
        return match && isActive && rem > 0;
      });

      const prevBal = activeForEmp.reduce((sum, a) => {
        return sum + (Number(a.remaining_balance !== undefined ? a.remaining_balance : a.total_amount) || 0);
      }, 0);

      const newTotal = prevBal + requestedLoanAmount;
      const instCount = numInstallments;
      const newMonthly = Math.round(newTotal / instCount);

      const autoReason = prevBal > 0 
        ? `${loanReason || 'سلفة مالية'} (تم جمع رصيد سابق ${prevBal.toLocaleString()} ر.س مع سلفة جديدة ${requestedLoanAmount.toLocaleString()} ر.س ليصبح الإجمالي ${newTotal.toLocaleString()} ر.س)`
        : (loanReason || 'سلفة شخصية');

      // Keep non-conflicting advances
      const otherAdvs = allAdvs.filter(a => {
        const match = String(a.employee_number || '').trim() === empNum;
        const isActive = a.status === 'active' || a.status === 'disbursed' || a.status === 'approved';
        return !(match && isActive);
      });

      // Mark previous active ones as consolidated
      activeForEmp.forEach(oldAdv => {
        otherAdvs.push({
          ...oldAdv,
          status: 'completed',
          remaining_balance: 0,
          notes: `تم تجميع وتبديل الرصيد المتبقي (${Number(oldAdv.remaining_balance || oldAdv.total_amount).toLocaleString()} ر.س) في السلفة المجمعة الجديدة بتاريخ ${todayStr}`
        });
      });

      // Construct consolidated new advance
      const consolidatedAdvance = {
        id: 'adv_doc_' + Date.now(),
        employee_id: currentEmp.id || ('emp_' + empNum),
        employee_number: empNum,
        employee_name: currentEmp.full_name,
        total_amount: newTotal,
        monthly_installment: newMonthly,
        total_installments: instCount,
        paid_installments: 0,
        paid_amount: 0,
        remaining_balance: newTotal,
        start_month: startM,
        disbursement_date: todayStr,
        reason: autoReason,
        status: 'active',
        source: 'management',
        workflow_stage: 'disbursed',
        approved_by: user?.full_name || 'فهد ناصر محمد الجوعي (المدير العام)',
        disbursed_by: user?.full_name || 'هشام ابوالفضل زغلول (المحاسب)',
        created_at: nowIso,
        updated_at: nowIso,
        notes: `تم اعتماد السلفة من شاشة النماذج الرسمية وتجميع الرصيد تلقائياً (${prevBal > 0 ? `رصيد سابق: ${prevBal.toLocaleString()} ر.س + سلفة جديدة: ${requestedLoanAmount.toLocaleString()} ر.س` : `سلفة جديدة: ${requestedLoanAmount.toLocaleString()} ر.س`})`
      };

      // 1. Update localStorage & cloudSyncEngine
      const updatedList = [consolidatedAdvance, ...otherAdvs];
      localStorage.setItem('hr_flow_employee_advances', JSON.stringify(updatedList));
      localStorage.setItem('hr_advances_list', JSON.stringify(updatedList));
      await cloudSave('hr_flow_employee_advances', updatedList);
      await cloudSave('hr_advances_list', updatedList);

      // 2. Also save to Supabase advances table via advanceService
      try {
        await saveCloudAdvance(consolidatedAdvance, user);
        for (const oldAdv of activeForEmp) {
          if (oldAdv.id && !oldAdv.id.startsWith('adv_doc_')) {
            await saveCloudAdvance({
              ...oldAdv,
              status: 'completed',
              remaining_balance: 0
            }, user).catch(() => {});
          }
        }
      } catch (sbErr) {
        console.warn('Supabase advance sync:', sbErr);
      }

      // 3. Dispatch system events
      window.dispatchEvent(new Event('advances_updated'));
      window.dispatchEvent(new Event('payroll_refresh'));

      // 4. Notify accountant
      toast({
        title: '✓ تم اعتماد السلفة وتحديث رصيد الموظف بالنظام بنجاح',
        description: prevBal > 0 
          ? `تم جمع المبلغ الجديد (${requestedLoanAmount.toLocaleString()} ر.س) مع الرصيد السابق (${prevBal.toLocaleString()} ر.س). الرصيد الإجمالي المعتمد: ${newTotal.toLocaleString()} ر.س بقسط شهري ${newMonthly.toLocaleString()} ر.س على ${instCount} أشهُر ابتداءً من ${startM}.`
          : `تم تسجيل سلفة بمبلغ ${requestedLoanAmount.toLocaleString()} ر.س بقسط شهري ${newMonthly.toLocaleString()} ر.س على ${instCount} أشهُر ابتداءً من ${startM}.`,
      });

      setAdvancesRefreshTrigger(t => t + 1);
    } catch (err) {
      console.error('Error adding advance:', err);
      toast({
        title: 'خطأ أثناء إضافة السلفة',
        description: err.message || 'حدث خطأ غير متوقع.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Standalone print without modifying advances
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
        display: block !important;
        visibility: visible !important;
        border: 2px solid #0B1F3A !important; border-radius: 4px !important;
        padding: 20px !important; background: #fff !important; box-shadow: none !important;
        width: 100% !important; min-height: auto !important;
        page-break-inside: avoid !important; page-break-before: avoid !important; break-inside: avoid !important;
      }
      .sheet-header-bg { background-color: #0B1F3A !important; color: #fff !important; }
      .sheet-box-bg { background-color: #F8FAFC !important; border: 1px solid #CBD5E1 !important; }
      .sheet-table-header { background-color: #0B1F3A !important; color: #fff !important; }
      .print-logo-box { border: none !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
      .print-logo img {
        max-width: 190px !important;
        max-height: 85px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        filter: contrast(1.05) !important;
      }
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
            <p className="text-xs text-muted-foreground mt-0.5">إنشاء وطباعة المستندات الرسمية على ورقة A4 احترافية مع خيار الترحيل المالي</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {docType === 'loan' && (
            <Button 
              type="button"
              onClick={handleAddAdvanceToSystem}
              disabled={isSubmitting || requestedLoanAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md border border-emerald-500 gap-2 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              )}
              {existingAdvanceBalance > 0 
                ? `اعتماد وإضافة للسلف (+ جمع مع رصيد ${existingAdvanceBalance.toLocaleString()} ر.س)`
                : 'اعتماد وإضافة السلفة إلى رصيد الموظف بالنظام'}
            </Button>
          )}

          <Button 
            type="button"
            variant="outline"
            onClick={() => setShowPreview(prev => !prev)} 
            className="bg-white hover:bg-slate-50 text-[#0B1F3A] font-bold px-4 py-2.5 rounded-xl shadow-sm border border-slate-300 gap-2 transition-all active:scale-95"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4 text-slate-500" /> إخفاء المعاينة
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-blue-600" /> معاينة النموذج
              </>
            )}
          </Button>

          <Button 
            type="button"
            onClick={handlePrint} 
            className="bg-[#0B1F3A] hover:bg-[#152e54] text-white font-bold px-5 py-2.5 rounded-xl shadow-lg border border-[#D4AF37]/40 gap-2"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" /> طباعة / حفظ PDF
          </Button>
        </div>
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
          <div className="space-y-4 pt-1">
            {/* Live Financial Balance Preview Card */}
            <div className={`p-4 rounded-xl border ${existingAdvanceBalance > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'} transition-all`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${existingAdvanceBalance > 0 ? 'bg-amber-600 text-white' : 'bg-[#0B1F3A] text-[#D4AF37]'}`}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">حالة رصيد سلف الموظف بالنظام</h3>
                    <p className="text-[11px] text-slate-500">
                      {existingAdvanceBalance > 0 
                        ? `يوجد رصيد سلفة قائم مسجل على هذا الموظف (${existingActiveAdvances.length} سلفة نشطة)`
                        : 'لا يوجد رصيد سلف مسجل على هذا الموظف حالياً'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">الرصيد القائم الحالي:</span>
                  <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${existingAdvanceBalance > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                    {existingAdvanceBalance.toLocaleString()} ر.س
                  </span>
                </div>
              </div>

              {existingAdvanceBalance > 0 && requestedLoanAmount > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/90 p-3 rounded-lg border border-amber-200/60">
                  <div>
                    <span className="text-slate-500 block text-[11px]">الرصيد السابق:</span>
                    <span className="font-mono font-bold text-amber-800">{existingAdvanceBalance.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">السلفة الجديدة:</span>
                    <span className="font-mono font-bold text-blue-700">+{requestedLoanAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">الإجمالي بعد الجمع:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{totalLoanAfterAccumulation.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">القسط الشهري الجديد:</span>
                    <span className="font-mono font-bold text-emerald-700">{accumulatedMonthlyInstallment.toLocaleString()} ر.س/شهر</span>
                  </div>
                </div>
              )}
            </div>

            {/* Loan Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

            {/* Guidance for Accountant */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-600">
                💡 <span className="font-bold text-slate-800">خيارات المحاسب المالي:</span> يمكنك الضغط على <span className="font-semibold text-[#0B1F3A]">"طباعة / حفظ PDF"</span> للطباعة الورقية فقط دون إضافة للسلف، أو الضغط على <span className="font-semibold text-emerald-700">"اعتماد وإضافة للسلف"</span> لجمع المبلغ تلقائياً برصيد الموظف بالنظام وترحيله لمسير الرواتب.
              </p>
              <Button 
                type="button"
                onClick={handleAddAdvanceToSystem}
                disabled={isSubmitting || requestedLoanAmount <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-md border border-emerald-500 gap-2 shrink-0 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                )}
                {existingAdvanceBalance > 0 
                  ? `اعتماد وإضافة للسلف (+ جمع مع رصيد ${existingAdvanceBalance.toLocaleString()} ر.س)`
                  : 'اعتماد وإضافة السلفة إلى رصيد الموظف بالنظام'}
              </Button>
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

      {/* PREVIEW PLACEHOLDER (SHOWN WHEN PREVIEW IS CLOSED) */}
      {!showPreview && (
        <Card className="no-print p-8 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 text-center space-y-4 shadow-sm transition-all">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100/80 text-blue-800 flex items-center justify-center shadow-inner">
            <Eye className="w-7 h-7 text-blue-700" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading font-black text-base text-slate-900">
              نموذج {docTitles[docType]} جاهز للمعاينة أو الطباعة
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              تم إخفاء المستند لتقليل التزاحم على الشاشة وسهولة إدخال البيانات. يمكنك معاينة النموذج الرسمي (A4) قبل الطباعة أو طباعته مباشرة وحفظه PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="rounded-xl text-xs font-bold gap-2 border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 h-10 px-5 shadow-sm transition-all"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>معاينة النموذج</span>
            </Button>
            <Button 
              type="button"
              onClick={handlePrint}
              className="bg-[#0B1F3A] hover:bg-[#152e54] text-white rounded-xl text-xs font-bold gap-2 h-10 px-5 shadow-md transition-all"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>طباعة / حفظ PDF مباشرة</span>
            </Button>
          </div>
        </Card>
      )}

      {/* PREVIEW ACTIVE TOOLBAR */}
      {showPreview && (
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/90 border border-blue-200 text-blue-950 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-xs block text-blue-950">معاينة النموذج الرسمي المعتمد (A4)</span>
              <span className="text-[11px] text-blue-700">هذا هو الشكل النهائي الدقيق للمستند كما سيظهر عند الطباعة وحفظ PDF</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button"
              size="sm" 
              onClick={handlePrint} 
              className="bg-[#0B1F3A] hover:bg-[#152e54] text-white rounded-xl text-xs font-bold gap-1.5 h-9 px-4 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>طباعة المستند الآن</span>
            </Button>
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => setShowPreview(false)} 
              className="bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold h-9 px-3 border-slate-300"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>إخفاء المعاينة</span>
            </Button>
          </div>
        </div>
      )}

      {/* A4 PRINTABLE SHEET (HIDDEN ON SCREEN UNLESS PREVIEW IS CLICKED, ALWAYS VISIBLE IN PRINT) */}
      {currentEmp && (
        <div className={`executive-sheet bg-white rounded-xl border-2 border-[#0B1F3A] shadow-2xl p-8 sm:p-10 text-[#0B1F3A] font-sans ${showPreview ? 'block' : 'hidden print:block'}`} dir="rtl">

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

            {/* Center: Free Logo without border + Doc Title */}
            <div className="text-center space-y-2.5 print-logo" style={{flex: '1 1 40%'}}>
              <div className="print-logo-box mx-auto flex items-center justify-center bg-transparent border-0 shadow-none p-0 overflow-visible min-h-[90px]">
                <img 
                  src={companyProfile.logo_url || "/company-logo.png"} 
                  onError={(e) => { 
                    if (!e.currentTarget.dataset.backup) {
                      e.currentTarget.dataset.backup = '1';
                      e.currentTarget.src = "/dorat-cars-logo.png";
                    } else if (e.currentTarget.dataset.backup === '1') {
                      e.currentTarget.dataset.backup = '2';
                      e.currentTarget.src = "/logo.png";
                    }
                  }} 
                  alt="شعار شركة درة السيارة" 
                  className="h-24 sm:h-28 w-auto max-w-[210px] object-contain drop-shadow-sm select-none" 
                />
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
                  <div className="text-xs font-bold text-[#0B1F3A] pb-2 mb-2 border-b border-slate-200 flex items-center justify-between">
                    <span>تفاصيل بيانات طلب السلفة:</span>
                    {existingAdvanceBalance > 0 && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        سلفة مجمعة (رصيد سابق: {existingAdvanceBalance.toLocaleString()} ر.س)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">مبلغ السلفة المطلوب:</span>
                      <span className="text-base font-bold font-mono text-[#0B1F3A] ltr-nums" dir="ltr" style={ltrStyle}>{requestedLoanAmount.toLocaleString()} ر.س</span>
                    </div>
                    {existingAdvanceBalance > 0 ? (
                      <>
                        <div>
                          <span className="text-slate-500 block">الرصيد السابق المسجل:</span>
                          <span className="text-base font-bold font-mono text-amber-800 ltr-nums" dir="ltr" style={ltrStyle}>{existingAdvanceBalance.toLocaleString()} ر.س</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">الإجمالي بعد الجمع:</span>
                          <span className="text-base font-bold font-mono text-[#0B1F3A] ltr-nums" dir="ltr" style={ltrStyle}>{totalLoanAfterAccumulation.toLocaleString()} ر.س</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">القسط الشهري الجديد:</span>
                          <span className="text-base font-bold font-mono text-emerald-700 ltr-nums" dir="ltr" style={ltrStyle}>{accumulatedMonthlyInstallment.toLocaleString()} ر.س/شهر</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-500 block">عدد الأقساط:</span>
                          <span className="text-base font-bold font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{numInstallments} قسط</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">القسط الشهري:</span>
                          <span className="text-base font-bold font-mono text-emerald-700 ltr-nums" dir="ltr" style={ltrStyle}>{Math.round(standaloneMonthlyDeduction).toLocaleString()} ر.س/شهر</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">بداية الخصم:</span>
                          <span className="text-sm font-bold font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{deductionStart}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {existingAdvanceBalance > 0 && (
                    <div className="grid grid-cols-2 gap-4 text-xs mt-3 pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500 block">عدد الأقساط الإجمالية:</span>
                        <span className="font-bold font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{numInstallments} قسط</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">تاريخ بداية الخصم:</span>
                        <span className="font-bold font-mono text-slate-800 ltr-nums" dir="ltr" style={ltrStyle}>{deductionStart}</span>
                      </div>
                    </div>
                  )}
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
