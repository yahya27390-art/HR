import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Plus, Pencil, Building2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function Departments() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', head: '', branch: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      setDepartments(await base44.entities.Department.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', head: '', branch: '', description: '' }); setFormOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, head: d.head || '', branch: d.branch || '', description: d.description || '' }); setFormOpen(true); };

  const save = async () => {
    if (!form.name) { toast({ title: t('departments.nameRequired'), variant: 'destructive' }); return; }
    try {
      if (editing) await base44.entities.Department.update(editing.id, form);
      else await base44.entities.Department.create(form);
      toast({ title: editing ? t('departments.updated') : t('departments.added') });
      setFormOpen(false);
      load();
    } catch (e) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (d) => {
    if (!confirm(t('departments.deleteConfirm', { name: d.name }))) return;
    try {
      await base44.entities.Department.delete(d.id);
      toast({ title: t('departments.deleted') });
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
          <h1 className="text-2xl font-heading font-bold">{t('departments.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('departments.subtitle', { n: departments.length })}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 me-2" /> {t('departments.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-secondary animate-pulse" />)
        ) : departments.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-10">{t('departments.none')}</p>
        ) : departments.map((d) => (
          <Card key={d.id} className="p-6 border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(d)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <h3 className="font-heading font-semibold text-lg mt-4">{d.name}</h3>
            {d.head && <p className="text-sm text-muted-foreground">{t('departments.headLabel', { name: d.head })}</p>}
            {d.branch && <p className="text-xs text-muted-foreground mt-1">{d.branch}</p>}
            {d.description && <p className="text-sm text-muted-foreground mt-3">{d.description}</p>}
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('departments.editTitle') : t('departments.addTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>{t('departments.name')} *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{t('departments.departmentHead')}</Label><Input value={form.head} onChange={(e) => setForm((f) => ({ ...f, head: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{t('common.branch')}</Label><Input value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{t('departments.description')}</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={save} className="bg-accent text-accent-foreground hover:bg-accent/90">{editing ? t('common.save') : t('common.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}