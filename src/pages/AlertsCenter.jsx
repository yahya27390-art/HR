import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { calcDocAlerts, getAlertCountBySeverity } from '@/lib/alertsEngine';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Search, ExternalLink, ChevronDown, Users } from 'lucide-react';

const SEV_CONFIG = {
  critical: { label: 'حرج', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200', border: 'border-r-4 border-r-red-500' },
  high:     { label: 'عالي', class: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200', border: 'border-r-4 border-r-amber-500' },
  medium:   { label: 'متوسط', class: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200', border: 'border-r-4 border-r-orange-500' },
  low:      { label: 'منخفض', class: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200', border: 'border-r-4 border-r-sky-500' },
};

export default function AlertsCenter() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState('all');

  useEffect(() => {
    base44.entities.Employee.list().then(d => { setEmployees(d||[]); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  const alerts = useMemo(() => calcDocAlerts(employees), [employees]);
  const counts = useMemo(() => getAlertCountBySeverity(alerts), [alerts]);

  const filtered = useMemo(() => alerts.filter(a => {
    if (filterSev !== 'all' && a.severity !== filterSev) return false;
    if (search && !a.employee_name?.includes(search) && !a.message?.includes(search)) return false;
    return true;
  }), [alerts, filterSev, search]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-200 flex items-center justify-center">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-black text-foreground">مركز التنبيهات</h1>
          <p className="text-xs text-muted-foreground mt-0.5">تنبيهات انتهاء الوثائق والإقامات والعقود</p>
        </div>
      </div>

      {/* Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'critical', label: 'حرجة', count: counts.critical, color: 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200' },
          { key: 'high',     label: 'عالية', count: counts.high,    color: 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' },
          { key: 'medium',   label: 'متوسطة',count: counts.medium,  color: 'border-orange-200 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200' },
          { key: 'low',      label: 'منخفضة',count: counts.low,     color: 'border-sky-200 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200' },
        ].map(({ key, label, count, color }) => (
          <Card key={key} onClick={() => setFilterSev(filterSev===key?'all':key)}
            className={"p-3 rounded-2xl border cursor-pointer hover:shadow-md transition-all " + color + (filterSev===key?' ring-2 ring-offset-1 ring-current':'')}>
            <div className="text-3xl font-black">{count}</div>
            <div className="text-xs font-bold mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث باسم الموظف..." value={search} onChange={e=>setSearch(e.target.value)} className="pr-9 rounded-xl h-10" />
        </div>
        <Button variant={filterSev==='all'?'default':'outline'} onClick={()=>setFilterSev('all')} className="rounded-xl h-10 px-4 text-xs font-bold">
          الكل ({counts.total})
        </Button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center">
          <div className="text-5xl mb-3">✅</div>
          <div className="font-bold text-foreground">{counts.total === 0 ? 'لا توجد تنبيهات حالياً' : 'لا نتائج للبحث المحدد'}</div>
          <div className="text-xs text-muted-foreground mt-1">{counts.total === 0 ? 'جميع وثائق الموظفين سارية المفعول' : 'جرب البحث بكلمة أخرى'}</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.low;
            return (
              <Card key={alert.id} className={"p-4 rounded-2xl border " + cfg.border + " hover:shadow-sm transition-all"}>
                <div className="flex items-start gap-3">
                  <div className="text-xl flex-shrink-0 mt-0.5">{alert.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-foreground text-sm">{alert.title}</span>
                      <Badge className={"text-xs border " + cfg.class}>{cfg.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                    {alert.expiry_date && (
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        تاريخ الانتهاء: {alert.expiry_date}
                        {alert.days < 0 ? <span className="text-red-600 font-bold"> (منذ {Math.abs(alert.days)} يوم)</span>
                          : <span className="text-amber-600 font-bold"> (بعد {alert.days} يوم)</span>}
                      </div>
                    )}
                  </div>
                  <Link to={alert.link || '/employees'} className="flex-shrink-0">
                    <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> عرض
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
