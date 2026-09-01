import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const empty = {
  contract_id: '', employee_name: '', employee_id: '', company: '', contract_type: 'limited',
  joining_date: '', start_date: '', end_date: '', probation_days: 90, basic_salary: '', working_hours: '', status: 'active',
};

export default function ContractForm({ open, onOpenChange, contract, companies, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!contract;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(contract ? { ...empty, ...contract } : empty);
  }, [open, contract]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.employee_name || !form.company) {
      toast({ title: t('employeeForm.required'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        probation_days: Number(form.probation_days) || 0,
        basic_salary: Number(form.basic_salary) || 0,
        working_hours: Number(form.working_hours) || 0,
      };
      if (isEdit) await base44.entities.EmploymentContract.update(contract.id, payload);
      else await base44.entities.EmploymentContract.create(payload);
      toast({ title: isEdit ? t('employeeForm.updated') : t('employeeForm.added') });
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('contracts.editTitle') : t('contracts.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5"><Label>{t('contracts.contractId')}</Label><Input value={form.contract_id} onChange={(e) => set('contract_id', e.target.value)} placeholder="CNT-2025-1022" /></div>
          <div className="space-y-1.5"><Label>{t('contracts.employee')} *</Label><Input value={form.employee_name} onChange={(e) => set('employee_name', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t('contracts.company')} *</Label>
            <Select value={form.company} onValueChange={(v) => set('company', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {(companies || []).map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('contracts.contractType')}</Label>
            <Select value={form.contract_type} onValueChange={(v) => set('contract_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="limited">{t('contracts.typeLimited')}</SelectItem>
                <SelectItem value="fixed">{t('contracts.typeFixed')}</SelectItem>
                <SelectItem value="undefined">{t('contracts.typeUndefined')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t('contracts.joiningDate')}</Label><Input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('contracts.startDate')}</Label><Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('contracts.endDate')}</Label><Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('contracts.probationDays')}</Label><Input type="number" value={form.probation_days} onChange={(e) => set('probation_days', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('contracts.basicSalary')}</Label><Input type="number" value={form.basic_salary} onChange={(e) => set('basic_salary', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('contracts.workingHours')}</Label><Input type="number" value={form.working_hours} onChange={(e) => set('working_hours', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t('common.status')}</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('contracts.statusActive')}</SelectItem>
                <SelectItem value="expired">{t('contracts.statusExpired')}</SelectItem>
                <SelectItem value="terminated">{t('contracts.statusTerminated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? t('employeeForm.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}