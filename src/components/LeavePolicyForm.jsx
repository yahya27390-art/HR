import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

const empty = { name: '', company: '', annual_days: 21, sick_days: 30, emergency_days: 5, description: '' };

export default function LeavePolicyForm({ open, onOpenChange, policy, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!policy;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (open) setForm(policy ? { ...empty, ...policy } : empty);
  }, [open, policy]);

  useEffect(() => {
    base44.entities.Company.list().then(setCompanies).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) {
      toast({ title: t('employeeForm.required'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        annual_days: Number(form.annual_days) || 0,
        sick_days: Number(form.sick_days) || 0,
        emergency_days: Number(form.emergency_days) || 0,
      };
      if (isEdit) await base44.entities.LeavePolicy.update(policy.id, payload);
      else await base44.entities.LeavePolicy.create(payload);
      toast({ title: isEdit ? t('policies.updated') : t('policies.added') });
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('policies.editTitle') : t('policies.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('policies.name')} *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('policies.company')}</Label>
            <Select value={form.company} onValueChange={(v) => set('company', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t('policies.annualDays')}</Label><Input type="number" value={form.annual_days} onChange={(e) => set('annual_days', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('policies.sickDays')}</Label><Input type="number" value={form.sick_days} onChange={(e) => set('sick_days', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('policies.emergencyDays')}</Label><Input type="number" value={form.emergency_days} onChange={(e) => set('emergency_days', e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t('policies.description')}</Label><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? t('employeeForm.saving') : isEdit ? t('employeeForm.saveChanges') : t('employeeForm.addBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}