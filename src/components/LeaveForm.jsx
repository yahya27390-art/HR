import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

const empty = { leave_type: 'annual', start_date: '', end_date: '', reason: '' };

export default function LeaveForm({ open, onOpenChange, onSaved }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const daysBetween = (s, e) => {
    if (!s || !e) return 0;
    const d = Math.round((new Date(e) - new Date(s)) / 86400000) + 1;
    return d > 0 ? d : 0;
  };

  const save = async () => {
    if (!form.start_date || !form.end_date) {
      toast({ title: t('leaveForm.selectDates'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.LeaveRequest.create({
        user_id: user.id,
        employee_name: user.full_name || user.email,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        days: daysBetween(form.start_date, form.end_date),
        reason: form.reason,
        status: 'pending',
      });
      toast({ title: t('leaveForm.submitted') });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('leaveForm.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('leaveForm.leaveType')}</Label>
            <Select value={form.leave_type} onValueChange={(v) => set('leave_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">{t('leave.annual')}</SelectItem>
                <SelectItem value="sick">{t('leave.sick')}</SelectItem>
                <SelectItem value="unpaid">{t('leave.unpaid')}</SelectItem>
                <SelectItem value="emergency">{t('leave.emergency')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('leaveForm.startDate')}</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('leaveForm.endDate')}</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
          {form.start_date && form.end_date && (
            <p className="text-sm text-muted-foreground">{t('leaveForm.duration', { n: daysBetween(form.start_date, form.end_date) })}</p>
          )}
          <div className="space-y-1.5">
            <Label>{t('leaveForm.reason')}</Label>
            <Textarea rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? t('leaveForm.submitting') : t('leaveForm.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}