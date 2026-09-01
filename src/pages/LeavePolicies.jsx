import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Pencil, Trash2, CalendarRange } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LeavePolicyForm from '@/components/LeavePolicyForm';
import { useToast } from '@/components/ui/use-toast';

export default function LeavePolicies() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const [policies, setPolicies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        base44.entities.LeavePolicy.list(),
        base44.entities.Employee.list(),
      ]);
      setPolicies(p); setEmployees(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  const remove = async (p) => {
    const count = employees.filter((e) => e.leave_policy === p.name).length;
    if (count > 0) {
      toast({ title: t('shifts.hasEmployees'), description: `${count} ${t('policies.employees')}`, variant: 'destructive' });
      return;
    }
    if (!confirm(t('policies.deleteConfirm', { name: p.name }))) return;
    try {
      await base44.entities.LeavePolicy.delete(p.id);
      toast({ title: t('policies.deleted') });
      load();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20"><p className="text-muted-foreground">{t('common.noAccess')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('policies.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('policies.subtitle')}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 me-2" /> {t('policies.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-secondary animate-pulse" />)
        ) : policies.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">{t('policies.noPolicies')}</p>
        ) : policies.map((p) => {
          const count = employees.filter((e) => e.leave_policy === p.name).length;
          return (
            <Card key={p.id} className="p-6 border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><CalendarRange className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg">{p.name}</h3>
                    {p.company && <p className="text-xs text-muted-foreground mt-0.5">{p.company}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('policies.annualDays')}</span><span className="font-medium">{p.annual_days} {t('leave.days')}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('policies.sickDays')}</span><span className="font-medium">{p.sick_days} {t('leave.days')}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('policies.emergencyDays')}</span><span className="font-medium">{p.emergency_days} {t('leave.days')}</span></div>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">{p.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('policies.employees')}</span>
                <Badge className="bg-primary/10 text-primary">{count}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <LeavePolicyForm open={formOpen} onOpenChange={setFormOpen} policy={editing} onSaved={load} />
    </div>
  );
}