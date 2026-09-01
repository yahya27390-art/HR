import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Building2,
  User,
  Calendar,
  DollarSign,
  Scale,
  Award,
  Lock,
  Download,
  Clock,
  Briefcase,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SAUDI_INTERNAL_CONTRACT_TERMS, signEmployeeContract } from '@/lib/contractsEngine';
import { useToast } from '@/components/ui/use-toast';

export default function ContractViewerModal({
  open,
  onOpenChange,
  contract,
  isEmployeeView = false,
  currentUser = null,
  onContractSigned = null
}) {
  const { toast } = useToast();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPenalty, setAgreedToPenalty] = useState(false);
  const [signing, setSigning] = useState(false);

  if (!contract) return null;

  const isQiwa = contract.category === 'qiwa';
  const isSigned = Boolean(contract.signed_by_employee);

  const handleSignContract = async () => {
    if (!agreedToTerms || !agreedToPenalty) {
      toast({
        title: 'تنبيه إلزامي',
        description: 'يجب قراءة بنود العقد والموافقة على مهلة الإشعار والشرط الجزائي قبل التوقيع.',
        variant: 'destructive'
      });
      return;
    }

    setSigning(true);
    try {
      const updated = signEmployeeContract(contract.id, {
        id: currentUser?.id || contract.employee_id,
        employee_number: currentUser?.employee_number || contract.employee_number,
        full_name: currentUser?.full_name || contract.employee_name
      });

      toast({
        title: '✓ تم توقيع واعتماد العقد بنجاح',
        description: 'تم توثيق موافقتك إلكترونياً وتثبيت نسخة العقد في ملفك الشخصي وإشعار المدير العام.'
      });

      onContractSigned && onContractSigned(updated);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'خطأ في عملية التوقيع',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto text-right p-0 gap-0 border-0 bg-slate-950 text-slate-100 shadow-2xl rounded-3xl" dir="rtl">
        
        {/* Printable Section Header & Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-contract-area, .printable-contract-area * {
              visibility: visible;
            }
            .printable-contract-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />

        {/* ─── MODAL HEADER (Qiwa Official Theme) ────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b border-slate-800 sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg ${
              isQiwa 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            }`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-black text-lg text-white">
                  {isQiwa ? 'عقد عمل رسمي موثق (منصة قوى)' : 'عقد عمل داخلي موحد (لائحة العمل السعودية)'}
                </span>
                <Badge className={isSigned ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}>
                  {isSigned ? '✓ معتمد وموقع رقمياً' : '⏳ بانتظار توقيع الموظف'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                رقم العقد: {contract.contract_number} • منشأة: درة السيارة لقطع غيار السيارات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl text-xs gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة العقد A4</span>
            </Button>
          </div>
        </div>

        {/* ─── CONTRACT DOCUMENT BODY ────────────────────────────────────── */}
        <div className="p-6 sm:p-8 space-y-6 printable-contract-area bg-slate-900/60">
          
          {/* Document Header Branding */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>الطرف الأول (صاحب العمل): مؤسسة درة السيارة لقطع غيار السيارات</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  سجل تجاري: 7016475555 • الرقم الضريبي: 311861381500003 • هاتف: 0541697999
                </div>
              </div>

              <div className="space-y-1 sm:text-left">
                <div className="text-blue-400 font-bold text-xs flex items-center gap-1.5 sm:justify-end">
                  <User className="w-4 h-4" />
                  <span>الطرف الثاني (الموظف): {contract.employee_name}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  الرقم الوظيفي: #{contract.employee_number} • الجنسية: {contract.nationality || 'سعودي'} • الهوية/الإقامة: {contract.national_id || '—'}
                </div>
              </div>
            </div>

            {/* Core Job & Financial Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[11px]">المسمى الوظيفي:</div>
                <div className="font-bold text-white mt-1">{contract.job_title}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[11px]">مكان ومقر العمل:</div>
                <div className="font-bold text-emerald-400 mt-1">{contract.branch || contract.branch_name || 'الفرع الرئيسي'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[11px]">مدة العقد والتجديد:</div>
                <div className="font-bold text-blue-400 mt-1">سنة ميلادية (تجدد تلقائياً)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[11px]">الأجر الشهري الإجمالي:</div>
                <div className="font-bold font-mono text-purple-300 mt-1">
                  {(contract.total_salary || contract.basic_salary || 0).toLocaleString('en-US')} ر.س
                </div>
              </div>
            </div>
          </div>

          {/* Special Attention Callout: Notice Period & Penalty */}
          <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-800/60 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>شروط إلزامية هامة (مهلة إشعار الاستقالة والشرط الجزائي):</span>
            </div>
            <p className="text-xs text-rose-200 leading-relaxed">
              • <strong>مهلة الإشعار المسبق:</strong> يلتزم الموظف بتقديم إشعار استقالة رسمي قبل ترك العمل بمدة لا تقل عن <strong>(30 يوماً / شهر كامل)</strong> ومواصلة العمل حتى قبولها من المدير العام.
              <br />
              • <strong>الشرط الجزائي والتعويض:</strong> ترك العمل المفاجئ دون إشعار يوجب <strong>خصم شهر الإشعار من الراتب أو إلزام الموظف بدفع تعويض يعادل راتب شهرين كاملين</strong> للطرف الأول كتعويض عن الإخلال العقدي.
            </p>
          </div>

          {/* ─── FULL LEGAL CLAUSES ACCORDION / LIST ────────────────────────── */}
          <div className="space-y-4">
            <h3 className="font-heading font-black text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>بنود العقد الرسمية وأحكام لائحة تنظيم العمل:</span>
            </h3>

            <div className="space-y-3">
              {SAUDI_INTERNAL_CONTRACT_TERMS.map((term, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    term.highlight
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-emerald-400 font-heading">
                      {term.article}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {term.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {term.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── DIGITAL SIGNATURE & AUDIT TRAIL ───────────────────────────── */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>التوثيق والاعتماد الإلكتروني (Digital Seal & Signature):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Employer Signature Box */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-400">الطرف الأول: درة السيارة لقطع غيار السيارات</div>
                <div className="text-slate-400 text-[11px]">المفوض بالتوقيع: فهد ناصر الجوعي (المدير العام)</div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold pt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>معتمد وموثق بختم المنشأة الإلكتروني ✓</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">SEAL-DORAT-CARS-7016475555</div>
              </div>

              {/* Employee Signature Box */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                isSigned 
                  ? 'bg-emerald-950/30 border-emerald-800/60' 
                  : 'bg-amber-950/20 border-amber-800/40'
              }`}>
                <div className="font-bold text-slate-200">الطرف الثاني: {contract.employee_name}</div>
                {isSigned ? (
                  <>
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم التوقيع والموافقة إلكترونياً ✓</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      وقت الاعتماد: {new Date(contract.signed_at || contract.created_at).toLocaleString('ar-SA')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      كود التحقق: {contract.signature_verification_code || `DIGI-VER-${contract.employee_number}-OK`}
                    </div>
                  </>
                ) : (
                  <div className="text-amber-400 font-bold flex items-center gap-1.5 pt-2">
                    <Clock className="w-4 h-4" />
                    <span>بانتظار قراءة وتوقيع الموظف الإلكتروني</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ─── MODAL FOOTER (Interactive Action for Employee) ───────────── */}
        <div className="bg-slate-900 p-6 border-t border-slate-800 sticky bottom-0 z-20 no-print space-y-4">
          
          {/* If Employee is viewing and hasn't signed yet */}
          {isEmployeeView && !isSigned && (
            <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={setAgreedToTerms}
                  className="mt-0.5"
                />
                <label htmlFor="agree-terms" className="text-xs text-slate-200 font-semibold cursor-pointer select-none">
                  أقر بأنني اطلعت على كافة بنود هذا العقد ولائحة العمل الخاصة بالمؤسسة وأوافق عليها موافقة تامة ونهائية.
                </label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="agree-penalty"
                  checked={agreedToPenalty}
                  onCheckedChange={setAgreedToPenalty}
                  className="mt-0.5"
                />
                <label htmlFor="agree-penalty" className="text-xs text-rose-300 font-bold cursor-pointer select-none">
                  أقر بالالتزام بمهلة الإشعار (شهر على الأقل قبل ترك العمل) وأوافق على الشرط الجزائي والتعويضي في حال الإخلال بذلك.
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white text-xs h-10 px-4"
            >
              إغلاق النافذة
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isEmployeeView && !isSigned && (
                <Button
                  onClick={handleSignContract}
                  disabled={!agreedToTerms || !agreedToPenalty || signing}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-6 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 flex-1 sm:flex-initial"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{signing ? 'جاري توثيق التوقيع...' : 'أوافق وأوقع العقد إلكترونياً'}</span>
                </Button>
              )}

              {isSigned && (
                <Button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة النسخة المعتمدة A4</span>
                </Button>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
