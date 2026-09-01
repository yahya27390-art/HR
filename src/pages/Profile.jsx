import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { Mail, Briefcase, Building2, Phone, Calendar, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const statusBadge = (s) => {
  const map = { active: 'bg-emerald-100 text-emerald-700', on_leave: 'bg-amber-100 text-amber-700', inactive: 'bg-slate-200 text-slate-600' };
  return map[s] || 'bg-slate-100 text-slate-600';
};

export default function Profile() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { employee, loading } = useCurrentEmployee();
  const isAdmin = user?.role === 'admin';

  const fields = employee ? [
    { icon: Mail, label: t('employeeDetail.email'), value: employee.email },
    { icon: Phone, label: t('employeeDetail.phone'), value: employee.phone || '—' },
    { icon: Briefcase, label: t('employeeDetail.jobTitle'), value: employee.job_title },
    { icon: Building2, label: t('employeeDetail.department'), value: employee.department },
    { icon: Building2, label: t('employeeDetail.branch'), value: employee.branch || '—' },
    { icon: Calendar, label: t('employeeDetail.hireDate'), value: employee.hire_date || '—' },
  ] : [
    { icon: Mail, label: t('employeeDetail.email'), value: user?.email },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('profile.subtitle')}</p>
      </div>

      <Card className="p-8 border-border/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar className="w-24 h-24 bg-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-heading font-bold">
              {(employee?.full_name || user?.full_name || user?.email)?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-heading font-bold">{employee?.full_name || user?.full_name || t('profile.yourProfile')}</h2>
            <p className="text-muted-foreground mt-1">{employee?.job_title || (isAdmin ? t('nav.administrator') : t('nav.employee'))}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className={isAdmin ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}>
                <ShieldCheck className="w-3 h-3 me-1" /> {isAdmin ? t('nav.administrator') : t('nav.employee')}
              </Badge>
              {employee && <Badge className={statusBadge(employee.status)}>{t('status.' + employee.status)}</Badge>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-32 bg-secondary rounded animate-pulse mt-6" />
        ) : (
          <>
            <Separator className="my-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {fields.map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-medium break-words">{f.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            {!employee && (
              <p className="text-sm text-muted-foreground mt-6 p-4 bg-secondary/50 rounded-xl">{t('profile.notSetup')}</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}