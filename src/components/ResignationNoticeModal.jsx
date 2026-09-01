import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  Calendar,
  Send,
  CheckCircle2,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { submitResignationNotice } from '@/lib/contractsEngine';
import { useToast } from '@/components/ui/use-toast';

export default function ResignationNoticeModal({
  open,
  onOpenChange,
  employee,
  onNoticeSubmitted
}) {
  const { toast } = useToast();

  // Compute default minimum last working day (today + 30 days)
  const today = new Date();
  const defaultMinDate = new Date(today);
  defaultMinDate.setDate(defaultMinDate.getDate() + 30);
  const minDateStr = defaultMinDate.toISOString().split('T')[0];

  const [form, setForm] = useState({
    type: 'non_renewal', // 'non_renewal' | 'resignation'
    requested_last_working_day: minDateStr,
    reason: '',
    handover_plan: '',
    agreedToNoticeTerms: false
  });
  const [submitting, setSubmitting] = useState(false);

  if (!employee) return null;

  // Calculate days difference
  const selectedDate = new Date(form.requested_last_working_day || minDateStr);
  const diffDays = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
  const isNoticeLessThan30 = diffDays < 30;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.agreedToNoticeTerms) {
      toast({
        title: 'تنبيه إلزامي',
        description: 'يرجى الإقرار بشروط مهلة الإشعار والالتزام بمواصلة العمل وتسليم المهام.',
        variant: 'destructive'
      });
      return;
    }

    if (isNoticeLessThan30) {
      toast({
        title: 'مخالفة لمهلة الإشعار المحددة',
        description: 'مهلة الإشعار النظامية يجب ألا تقل عن 30 يوماً (شهر كامل) لتجنب تطبيق الشرط الجزائي.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const notice = submitResignationNotice({
        type: form.type,
        requested_last_working_day: form.requested_last_working_day,
        notice_days_provided: diffDays,
        reason: form.reason,
        handover_plan: form.handover_plan
      }, employee);

      toast({
        title: '✓ تم تقديم الإشعار بنجاح',
        description: 'تم إرسال إشعار عدم التجديد/الاستقالة للمدير العام للاطلاع والبت فيه.'
      });

      onNoticeSubmitted && onNoticeSubmitted(notice);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg text-right p-6 rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading font-black text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>تقديم إشعار (عدم تجديد العقد / استقالة رسمية)</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          
          {/* Important Rule Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>الضوابط النظامية لإنهاء العلاقة التعاقدية (المادة 7 و 8):</span>
            </div>
            <p>
              • يجب تقديم الإشعار قبل موعد ترك العمل بمدة لا تقل عن <strong>(30 يوماً / شهر كامل)</strong>.
              <br />
              • يلتزم الموظف بمواصلة أداء واجباته الوظيفية وتسليم العهد والمهام كاملة حتى آخر يوم عمل معتمد من المدير العام.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">نوع الإشعار *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_renewal">إشعار بعدم الرغبة في تجديد العقد السنوي</SelectItem>
                <SelectItem value="resignation">طلب استقالة رسمية أثناء سريان العقد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">
              تاريخ آخر يوم عمل مقترح (مهلة الإشعار) *
            </Label>
            <Input
              type="date"
              min={minDateStr}
              value={form.requested_last_working_day}
              onChange={(e) => setForm({ ...form, requested_last_working_day: e.target.value })}
              className="rounded-xl font-mono text-xs h-10"
              required
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>المهلة المحددة: <strong className="font-mono font-bold text-foreground">{diffDays} يوم</strong></span>
              {isNoticeLessThan30 ? (
                <span className="text-rose-600 font-bold">⚠️ أقل من 30 يوماً المطلوبة نظاماً</span>
              ) : (
                <span className="text-emerald-600 font-bold">✓ متوافقة مع مهلة الإشعار المحددة</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">أسباب عدم التجديد / الاستقالة *</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="اكتب أسبابك بوضوح للإدارة..."
              className="rounded-xl text-xs min-h-[70px]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">خطة تسليم المهام والعهدة</Label>
            <Input
              value={form.handover_plan}
              onChange={(e) => setForm({ ...form, handover_plan: e.target.value })}
              placeholder="مثال: تسليم المفاتيح والعهدة لمدير الفرع..."
              className="rounded-xl text-xs h-10"
            />
          </div>

          {/* Acknowledgement Checkbox */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border flex items-start gap-2.5">
            <Checkbox
              id="notice-ack"
              checked={form.agreedToNoticeTerms}
              onCheckedChange={(v) => setForm({ ...form, agreedToNoticeTerms: v })}
              className="mt-0.5"
            />
            <label htmlFor="notice-ack" className="text-[11px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none leading-relaxed">
              أقر بأنني سألتزم بالدوام الكامل طيلة فترة مهلة الإشعار وتسليم كافة المسؤوليات والعهد، وأعلم أن الموافقة النهائية تخضع لقرار المدير العام.
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-10"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.agreedToNoticeTerms || isNoticeLessThan30}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-10 px-5 rounded-xl gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'جاري الإرسال...' : 'إرسال الإشعار للمدير العام'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
