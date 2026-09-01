import { Check, X, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusBadge = (s) => {
  const map = { present: 'bg-emerald-100 text-emerald-700', late: 'bg-amber-100 text-amber-700', absent: 'bg-red-100 text-red-700', pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };
  return map[s] || 'bg-slate-100 text-slate-700';
};

const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

export default function ActivityPanel({ todayLogs, pendingLeaves, onDecide, t }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('activity.checkIns')}</h3>
        {todayLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('activity.noCheckins')}</p>
        ) : (
          <div className="space-y-1">
            {todayLogs.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{fmtTime(l.check_in)} → {fmtTime(l.check_out)}</p>
                </div>
                <Badge className={statusBadge(l.status)}>{t('status.' + l.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('activity.leaveRequests')}</h3>
        {pendingLeaves.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('activity.noLeaves')}</p>
        ) : (
          <div className="space-y-1">
            {pendingLeaves.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{t('leave.' + l.leave_type)} · {l.days} {t('common.dayUnit')}</p>
                </div>
                <button onClick={() => onDecide(l, 'approved')} className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDecide(l, 'rejected')} className="w-7 h-7 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}