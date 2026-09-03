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
  Sparkles,
  Upload,
  FileCheck,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SAUDI_INTERNAL_CONTRACT_TERMS, signEmployeeContract, uploadAndVerifyQiwaContract } from '@/lib/contractsEngine';
import { printContractDocument } from '@/lib/contractPrintEngine';
import { getCompanyProfile } from '@/lib/companyProfile';
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
  
  // Signing Mode: 'internal' | 'qiwa_upload'
  const [signingMode, setSigningMode] = useState('internal');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPenalty, setAgreedToPenalty] = useState(false);
  const [signing, setSigning] = useState(false);

  // Qiwa Upload State
  const [qiwaNumber, setQiwaNumber] = useState('');
  const [qiwaFile, setQiwaFile] = useState(null);
  const [qiwaFileDataUrl, setQiwaFileDataUrl] = useState('');

  if (!contract) return null;

  const isQiwa = contract.category === 'qiwa';
  const isSigned = Boolean(contract.signed_by_employee);

  // Handle Qiwa File Selection
  const handleQiwaFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'حجم الملف كبير جداً',
        description: 'الحد الأقصى لحجم الملف هو 5 ميجابايت.',
        variant: 'destructive'
      });
      return;
    }

    setQiwaFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setQiwaFileDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Sign Internal Contract
  const handleSignInternal = async () => {
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
        title: '✓ تم توقيع واعتماد العقد الداخلي بنجاح',
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

  // Submit Qiwa Contract Document
  const handleUploadQiwa = async () => {
    if (!qiwaFileDataUrl && !qiwaNumber) {
      toast({
        title: 'بيانات ناقصة',
        description: 'يرجى إرفاق ملف عقد قوى أو إدخال رقم العقد لتوثيقه.',
        variant: 'destructive'
      });
      return;
    }

    setSigning(true);
    try {
      const updated = uploadAndVerifyQiwaContract(contract.id, {
        id: currentUser?.id || contract.employee_id,
        employee_number: currentUser?.employee_number || contract.employee_number,
        full_name: currentUser?.full_name || contract.employee_name
      }, {
        fileDataUrl: qiwaFileDataUrl,
        qiwaNumber: qiwaNumber,
        notes: `تم توثيق عقد قوى رسمي باسم الموظف (${contract.employee_name})`
      });

      toast({
        title: '✓ تم رفع وتوثيق عقد قوى بنجاح',
        description: 'تم تسجيل العقد كموثق في منصة قوى وتثبيت نسخته لدى الإدارة والمدير العام.'
      });

      onContractSigned && onContractSigned(updated);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'خطأ في رفع العقد',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  const handlePrint = () => {
    printContractDocument(contract, getCompanyProfile());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto text-right p-0 gap-0 border-0 bg-slate-950 text-slate-100 shadow-2xl rounded-3xl" dir="rtl">
        {/* ─── MODAL TOP BAR ────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b border-slate-800 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold shadow-inner">
                <Scale className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge className={isQiwa ? "bg-emerald-500 text-slate-950 font-bold text-xs" : "bg-blue-600 text-white font-bold text-xs"}>
                    {isQiwa ? 'عقد قوى رسمي موثق' : 'عقد عمل داخلي موحد'}
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">
                    {contract.qiwa_contract_number || contract.contract_number}
                  </span>
                </div>
                <h1 className="font-heading font-black text-lg text-white">
                  عقد عمل رسمي - {contract.employee_name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl text-xs h-9 px-3 gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة A4</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ─── PRINTABLE DOCUMENT BODY (Official Qiwa / Saudi Labor Style) ─── */}
        <div className="p-6 sm:p-10 space-y-8 printable-contract-area">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-emerald-500/80 pb-6 flex items-start justify-between">
            <div className="space-y-1 text-right">
              <h2 className="font-heading font-black text-xl text-emerald-400">
                شركة درة السيارة لقطع غيار السيارات
              </h2>
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>سجل تجاري: <strong className="text-slate-200 font-mono">7016475555</strong></div>
                <div>الرقم الضريبي: <strong className="text-slate-200 font-mono">311861381500003</strong></div>
                <div>المقر: القصيم - بريدة - المملكة العربية السعودية</div>
              </div>
            </div>

            <div className="text-left space-y-1">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto font-heading font-black text-xl shadow-inner">
                DORAT
              </div>
              <div className="text-[10px] text-slate-400 font-mono">HR-VERIFIED-2026</div>
            </div>
          </div>

          {/* Contract Metadata Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400">اسم الموظف:</span>
              <div className="font-bold text-slate-100 text-sm">{contract.employee_name}</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">الرقم الوظيفي:</span>
              <div className="font-bold font-mono text-emerald-400">{contract.employee_number}</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">المسمى الوظيفي:</span>
              <div className="font-bold text-slate-200">{contract.job_title}</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">الفرع المعتمد:</span>
              <div className="font-bold text-slate-200">{contract.branch}</div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-slate-400">الراتب الإجمالي:</span>
              <div className="font-black font-mono text-emerald-400 text-sm">{contract.total_salary} ر.س</div>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-slate-400">مدة العقد:</span>
              <div className="font-bold text-slate-200">سنة واحدة (تجدد تلقائياً)</div>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-slate-400">تاريخ المباشرة:</span>
              <div className="font-bold font-mono text-slate-300">{contract.start_date}</div>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-slate-400">حالة التوقيع:</span>
              <div>
                <Badge className={isSigned ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border-amber-500/40"}>
                  {isSigned ? (isQiwa ? 'موثق عبر قوى ✓' : 'موقع ومصادق عليه ✓') : 'بانتظار التوقيع / رفع قوى ⏳'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Uploaded Qiwa Document Preview Banner (if exists) */}
          {contract.qiwa_document_url && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-300">تم إرفاق مستند عقد قوى الرسمي المعتمد</div>
                  <div className="text-[11px] text-slate-300 font-mono">رقم العقد: {contract.qiwa_contract_number || 'منصة قوى'}</div>
                </div>
              </div>

              <a
                href={contract.qiwa_document_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة المستند المرفق</span>
              </a>
            </div>
          )}

          {/* ─── CONTRACT ARTICLES & LEGAL TERMS ─────────────────────────── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="font-heading font-black text-base text-white">
                بنود ومواد عقد العمل الموحد
              </h3>
            </div>

            <div className="space-y-4">
              {SAUDI_INTERNAL_CONTRACT_TERMS.map((term, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-2xl border transition-all ${
                    term.highlight
                      ? 'bg-rose-950/30 border-rose-600/60 shadow-lg shadow-rose-950/20'
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-heading font-bold text-xs text-emerald-400">
                      {term.article}
                    </span>
                    {term.highlight && (
                      <Badge className="bg-rose-600 text-white font-black text-[10px]">
                        شرط إلزامي وصارم ⚠️
                      </Badge>
                    )}
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
                <div className="font-bold text-emerald-400">الطرف الأول: شركة درة السيارة لقطع غيار السيارات</div>
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
                      <span>
                        {contract.signed_method === 'qiwa_document_upload' ? 'تم توثيق ورفع عقد قوى الرسمي بنجاح ✓' : 'تم التوقيع والموافقة على العقد الداخلي إلكترونياً ✓'}
                      </span>
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
                    <span>العقد غير موقع بعد (بانتظار قيام الموظف بالتوقيع أو رفع عقد قوى)</span>
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
            <div className="space-y-4">
              
              {/* Selector between Internal Signature vs Qiwa Upload */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSigningMode('internal')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    signingMode === 'internal'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>توقيع العقد الداخلي الموحد</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSigningMode('qiwa_upload')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    signingMode === 'qiwa_upload'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>لدي عقد على منصة قوى (رفع العقد)</span>
                </button>
              </div>

              {/* Mode 1: Internal Contract Signature Acknowledgements */}
              {signingMode === 'internal' && (
                <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedToTerms}
                      onCheckedChange={setAgreedToTerms}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-terms" className="text-xs text-slate-200 font-semibold cursor-pointer select-none">
                      أقر بأنني اطلعت على كافة بنود هذا العقد ولائحة العمل الخاصة بالشركة وأوافق عليها موافقة تامة ونهائية.
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

              {/* Mode 2: Qiwa Document Upload Form */}
              {signingMode === 'qiwa_upload' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Upload className="w-4 h-4" />
                    <span>رفع وتوثيق عقد منصة قوى الرسمي:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300 font-bold">رقم عقد قوى (اختياري)</Label>
                      <Input
                        value={qiwaNumber}
                        onChange={(e) => setQiwaNumber(e.target.value)}
                        placeholder="مثال: QW-KSA-2026-..."
                        className="bg-slate-900 border-slate-700 text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300 font-bold">ملف العقد (PDF أو صورة) *</Label>
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleQiwaFileChange}
                        className="bg-slate-900 border-slate-700 text-xs h-9 cursor-pointer file:text-emerald-400"
                      />
                    </div>
                  </div>

                  {qiwaFile && (
                    <div className="text-[11px] text-emerald-400 font-mono">
                      ✓ تم اختيار الملف: {qiwaFile.name} ({(qiwaFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              )}

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
                signingMode === 'internal' ? (
                  <Button
                    onClick={handleSignInternal}
                    disabled={!agreedToTerms || !agreedToPenalty || signing}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-6 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 flex-1 sm:flex-initial"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{signing ? 'جاري توثيق التوقيع...' : 'أوافق وأوقع العقد الداخلي إلكترونياً ✍️'}</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleUploadQiwa}
                    disabled={(!qiwaFileDataUrl && !qiwaNumber) || signing}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-6 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 flex-1 sm:flex-initial"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{signing ? 'جاري رفع العقد...' : 'توثيق واعتماد عقد قوى الرسمي 📤'}</span>
                  </Button>
                )
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
