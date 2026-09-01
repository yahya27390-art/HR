import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Building2, MapPin, Phone, CheckCircle2 } from 'lucide-react';

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  is_main: false
};

export default function BranchForm({ open, onOpenChange, branch, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!branch;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (branch) {
        setForm({
          name: branch.name || '',
          address: branch.address || '',
          phone: branch.phone || '',
          is_main: Boolean(branch.is_main)
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, branch]);

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'يرجى إدخال اسم الفرع', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Clean payload with only valid Supabase columns
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        is_main: form.is_main
      };

      if (isEdit) {
        await base44.entities.Branch.update(branch.id, payload);
        toast({ title: '✓ تم تحديث بيانات وعنوان الفرع بنجاح' });
      } else {
        await base44.entities.Branch.create({
          id: `br_${Date.now()}`,
          ...payload
        });
        toast({ title: '✓ تم إضافة الفرع الجديد بنجاح' });
      }

      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      console.error('Error saving branch:', e);
      toast({ title: 'خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            {isEdit ? `تعديل بيانات وعنوان: ${branch.name}` : 'إضافة فرع جديد للمنشأة'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          
          {/* Branch Name */}
          <div className="space-y-1">
            <Label className="font-bold">اسم الفرع *:</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: الفرع الرئيسي، فرع طريق الملك عبد العزيز..."
              className="rounded-xl font-bold"
            />
          </div>

          {/* Branch Address */}
          <div className="space-y-1">
            <Label className="font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              العنوان التفصيلي للفرع (المدينة والحي والشارع) *:
            </Label>
            <Input
              value={form.address}
              onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="مثال: حي السليم، شارع المعارض، القصيم - بريدة"
              className="rounded-xl font-medium"
            />
          </div>

          {/* Branch Phone */}
          <div className="space-y-1">
            <Label className="font-bold flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              هاتف التواصل للفرع:
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="مثال: +966542821253"
              className="rounded-xl font-mono"
            />
          </div>

          {/* Is Main HQ Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={form.is_main}
                onChange={(e) => setForm(f => ({ ...f, is_main: e.target.checked }))}
                className="w-4 h-4 rounded text-sky-600 cursor-pointer"
              />
              <div>
                <div className="font-bold text-foreground">تعيين هذا الفرع كمقر رئيسي (الإدارة العامة)</div>
                <div className="text-[10px] text-muted-foreground">يظهر كمركز القيادة والفرع الرئيسي في التقارير</div>
              </div>
            </label>
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            إلغاء
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold"
          >
            {saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة الفرع')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
