import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Activity, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function ComplianceChart({ logs, employees }) {
  const { t, lang } = useI18n();
  const [dept, setDept] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const empDept = useMemo(() => {
    const m = {};
    employees.forEach((e) => { if (e.full_name) m[e.full_name] = e.department || ''; });
    return m;
  }, [employees]);

  const depts = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (from && l.log_date && l.log_date < from) return false;
      if (to && l.log_date && l.log_date > to) return false;
      if (dept !== 'all') {
        const d = empDept[l.employee_name] || '';
        if (d !== dept) return false;
      }
      return true;
    });
  }, [logs, dept, from, to, empDept]);

  const daily = useMemo(() => {
    const map = {};
    filtered.forEach((l) => {
      const key = l.log_date;
      if (!key) return;
      if (!map[key]) map[key] = { date: key, onTime: 0, lateIn: 0, incomplete: 0, absent: 0 };
      if (l.status === 'absent') map[key].absent++;
      else if (l.status === 'late') map[key].lateIn++;
      else if (l.status === 'present') {
        if (l.check_out) map[key].onTime++;
        else map[key].incomplete++;
      }
    });
    return Object.values(map)
      .map((d) => {
        const tot = d.onTime + d.lateIn + d.incomplete + d.absent || 1;
        return { ...d, rate: Math.round((d.onTime / tot) * 100) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const overall = useMemo(() => {
    const onTime = daily.reduce((a, d) => a + d.onTime, 0);
    const tot = daily.reduce((a, d) => a + d.onTime + d.lateIn + d.incomplete + d.absent, 0) || 1;
    return { onTime, tot, rate: Math.round((onTime / tot) * 100) };
  }, [daily]);

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  const fmtD = (ds) => {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="p-6 border-border/60 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-heading font-semibold text-lg">{t('reports.compliance')}</h2>
            <p className="text-sm text-muted-foreground">{t('reports.complianceDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="w-3 h-3" />{t('reports.filterDept')}</label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reports.allDepartments')}</SelectItem>
                {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t('reports.from')}</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t('reports.to')}</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="font-heading font-bold text-lg">{overall.rate}%</span>
          </div>
          <div>
            <p className="text-sm font-medium">{t('reports.complianceRate')}</p>
            <p className="text-xs text-muted-foreground">{overall.onTime} / {overall.tot} {t('reports.compliant').toLowerCase()}</p>
          </div>
        </div>

        {daily.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">{t('reports.noComplianceData')}</p>
        ) : (
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOnTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtD} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} labelFormatter={fmtD} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="onTime" name={t('reports.onTime')} stackId="1" stroke="#10b981" fill="url(#gOnTime)" />
                <Area type="monotone" dataKey="lateIn" name={t('reports.lateIn')} stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                <Area type="monotone" dataKey="incomplete" name={t('reports.incomplete')} stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                <Area type="monotone" dataKey="absent" name={t('status.absent')} stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}