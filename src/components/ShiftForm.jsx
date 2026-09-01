import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Sun, Moon, Coffee, Sparkles, Clock, DollarSign, AlertCircle } from 'lucide-react';

const empty = { 
  name: '', 
  type: 'multi', 
  start_time: '08:00', 
  end_time: '20:00', 
  morning_start: '08:00',
  morning_end: '12:00',
  break_start: '12:00',
  break_end: '16:00',
  evening_start: '16:00',
  evening_end: '20:00',
  working_hours: 5,
    grace_minutes: 10,
    early_checkin_grace: 60,
    overtime_grace: 60,
    has_netting: true, 
  has_overtime: false,
  overtime_hours: 1,
  overtime_daily_rate: 100,
  description: '' 
};

const types = [
  { value: 'multi', label: 'دوام فترتين (صباحي + مسائي)' },
  { value: 'morning', label: 'دوام صباحي فترة واحدة' },
  { value: 'evening', label: 'دوام مسائي فترة واحدة' },
  { value: 'flexible', label: 'دوام مرن' },
  { value: 'ramadan', label: 'دوام شهر رمضان' }
];

export default function ShiftForm({ open, onOpenChange, shift, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!shift;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (shift) {
        setForm({
          ...empty,
          ...shift,
          morning_start: shift.morning_start || shift.start_time || '08:00',
          morning_end: shift.morning_end || shift.break_start || '12:00',
          break_start: shift.break_start || '12:00',
          break_end: shift.break_end || '16:00',
          evening_start: shift.evening_start || shift.break_end || '16:00',
          evening_end: shift.evening_end || shift.end_time || '20:00',
          has_overtime: shift.has_overtime ?? (shift.working_hours > 8 || shift.name?.includes('إضافي') || shift.name?.includes('745')),
          overtime_hours: shift.overtime_hours || 1,
          overtime_daily_rate: shift.overtime_daily_rate || 100
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, shift]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Quick Preset Handlers
  const applyPreset8Hours = () => {
    setForm(f => ({
      ...f,
      name: f.name || 'فترة عمل غير سعودي (الأساسي)',
      type: 'multi',
      morning_start: '08:00',
      morning_end: '12:00',
      break_start: '12:00',
      break_end: '16:00',
      evening_start: '16:00',
      evening_end: '20:00',
      working_hours: 8,
      has_overtime: false,
      description: 'دوام فترتين: 8:00 ص - 12:00 م & 4:00 ع - 8:00 م (8 ساعات أساسية)'
    }));
  };

  const applyPreset9HoursOvertime = () => {
    setForm(f => ({
      ...f,
      name: f.name || 'فترة عمل غير سعودي (شفت 9 ساعات + إضافي 100 ريال)',
      type: 'multi',
      morning_start: '09:00',
      morning_end: '13:00',
      break_start: '13:00',
      break_end: '16:00',
      evening_start: '16:00',
      evening_end: '21:00',
      working_hours: 9,
      has_overtime: true,
      overtime_hours: 1,
      overtime_daily_rate: 100,
      description: 'دوام فترتين مخصص: 9:00 ص - 1:00 م & 4:00 ع - 9:00 م (ساعة إضافية يومية = 100 ريال)'
    }));
  };

  const save = async () => {
    if (!form.name) {
      toast({ title: 'يرجى إدخال مسمى الوردية *', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const isMulti = form.type === 'multi';
      const payload = { 
        ...form,
        start_time: isMulti ? form.morning_start : form.start_time,
        end_time: isMulti ? form.evening_end : form.end_time,
        break_start: isMulti ? form.morning_end : (form.break_start || null),
        break_end: isMulti ? form.evening_start : (form.break_end || null),
        working_hours: Number(form.working_hours) || (isMulti ? (form.has_overtime ? 9 : 8) : 8),
        total_hours: Number(form.working_hours) || 8,
        grace_minutes: Number(form.grace_minutes) || 15,
        overtime_daily_rate: Number(form.overtime_daily_rate) || 100
      };

      if (isEdit) await base44.entities.Shift.update(shift.id, payload);
      else await base44.entities.Shift.create(payload);

      toast({ title: isEdit ? 'تم تحديث الوردية بنجاح' : 'تمت إضافة الوردية بنجاح' });
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isMulti = form.type === 'multi';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-lg text-foreground">
            {isEdit ? 'تعديل بيانات الوردية وفترات الدوام' : 'إضافة وردية عمل جديدة'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          
          {/* Shift Name */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">مسمى الوردية *</Label>
            <Input 
              placeholder="مثال: فترة عمل غير سعودي (الأساسي)" 
              value={form.name} 
              onChange={(e) => set('name', e.target.value)} 
              className="text-xs"
            />
          </div>

          {/* Shift Type */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">نوع الوردية</Label>
            <Select value={form.type || 'multi'} onValueChange={(v) => set('type', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="اختر نوع الوردية" /></SelectTrigger>
              <SelectContent>
                {types.map((tp) => <SelectItem key={tp.value} value={tp.value} className="text-xs">{tp.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Presets for Split-Shifts */}
          {isMulti && (
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نماذج فترات الدوام الجاهزة:</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={applyPreset8Hours}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 hover:border-emerald-500 text-right transition-all shadow-sm group"
                >
                  <p className="font-bold text-[11px] text-foreground group-hover:text-emerald-600">🔹 دوام الفترتين الأساسي</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">8:00 ص - 12:00 م & 4:00 ع - 8:00 م</p>
                </button>

                <button
                  type="button"
                  onClick={applyPreset9HoursOvertime}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 hover:border-amber-500 text-right transition-all shadow-sm group"
                >
                  <p className="font-bold text-[11px] text-amber-900 dark:text-amber-300 group-hover:text-amber-600">⭐ دوام 9:00 ص + إضافي 100 ر.س</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">9:00 ص - 1:00 م & 4:00 ع - 9:00 م</p>
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED SPLIT SHIFT DETAILED INPUTS */}
          {isMulti ? (
            <div className="space-y-3 p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
              
              {/* 1. Morning Shift */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400 text-xs">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>الفترة الأولى (الصباحية):</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">وقت الحضور الصباحي</Label>
                    <Input type="time" value={form.morning_start} onChange={(e) => set('morning_start', e.target.value)} className="h-9 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">وقت الانصراف الصباحي</Label>
                    <Input type="time" value={form.morning_end} onChange={(e) => set('morning_end', e.target.value)} className="h-9 text-xs font-mono" />
                  </div>
                </div>
              </div>

              {/* 2. Break Period */}
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-[11px]">فترة الاستراحة الرسمية (البريك):</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                      تبدأ من {form.morning_end} وتستمر حتى {form.evening_start} (الساعة 4:00 عصراً)
                    </p>
                  </div>
                </div>
                <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-amber-300">
                  {form.morning_end} - {form.evening_start}
                </span>
              </div>

              {/* 3. Evening Shift */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-400 text-xs">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>الفترة الثانية (المسائية):</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">وقت الحضور المسائي</Label>
                    <Input type="time" value={form.evening_start} onChange={(e) => set('evening_start', e.target.value)} className="h-9 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">وقت الانصراف المسائي</Label>
                    <Input type="time" value={form.evening_end} onChange={(e) => set('evening_end', e.target.value)} className="h-9 text-xs font-mono" />
                  </div>
                </div>
              </div>

              {/* 4. Overtime Configuration */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>احتساب بدل عمل إضافي يومي (Overtime)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      تفعيل احتساب ساعة إضافية للموظف في حال استمرار الدوام للساعة 9:00 مساءً
                    </p>
                  </div>
                  <Switch 
                    checked={form.has_overtime} 
                    onCheckedChange={(c) => {
                      set('has_overtime', c);
                      if (c) {
                        set('evening_end', '21:00');
                        set('working_hours', 9);
                      }
                    }} 
                  />
                </div>

                {form.has_overtime && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40 animate-in fade-in">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-700">عدد الساعات الإضافية اليومية</Label>
                      <Input 
                        type="number" 
                        value={form.overtime_hours} 
                        onChange={(e) => set('overtime_hours', e.target.value)} 
                        className="h-8 text-xs font-mono font-bold mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-emerald-700">بدل الإضافي اليومي (ريال)</Label>
                      <Input 
                        type="number" 
                        value={form.overtime_daily_rate} 
                        onChange={(e) => set('overtime_daily_rate', e.target.value)} 
                        className="h-8 text-xs font-mono font-black text-emerald-600 mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Single-Shift Start/End */
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">بداية الدوام</Label>
                <Input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} className="text-xs font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">نهاية الدوام</Label>
                <Input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} className="text-xs font-mono" />
              </div>
            </div>
          )}

          {/* Total Hours & Grace Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">إجمالي ساعات العمل الصافية</Label>
              <Input type="number" value={form.working_hours} onChange={(e) => set('working_hours', e.target.value)} className="text-xs font-mono font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">فترة السماح (دقائق)</Label>
              <Input type="number" value={form.grace_minutes} onChange={(e) => set('grace_minutes', e.target.value)} className="text-xs font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">الوصف أو الملاحظات</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className="text-xs" />
          </div>

        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md">
            {saving ? 'جاري الحفظ...' : 'حفظ بيانات الوردية 💾'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
