import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const typeColor = (tp) => ({
  annual: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sick: 'bg-amber-100 text-amber-700 border-amber-200',
  unpaid: 'bg-slate-200 text-slate-700 border-slate-300',
  emergency: 'bg-red-100 text-red-700 border-red-200',
}[tp] || 'bg-primary/10 text-primary border-border');

const sameDay = (a, b) => a.toDateString() === b.toDateString();
const inRange = (d, s, e) => {
  const dd = new Date(d); const ss = new Date(s); const ee = new Date(e);
  dd.setHours(0, 0, 0, 0); ss.setHours(0, 0, 0, 0); ee.setHours(0, 0, 0, 0);
  return dd >= ss && dd <= ee;
};

export default function LeaveCalendar({ leaves }) {
  const { t, lang } = useI18n();
  const [cursor, setCursor] = useState(new Date());
  const firstDayOfWeek = lang === 'ar' ? 6 : 0;
  const weekdayNames = lang === 'ar'
    ? ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const orderedWeekdays = [...weekdayNames.slice(firstDayOfWeek), ...weekdayNames.slice(0, firstDayOfWeek)];

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() - firstDayOfWeek + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const approved = leaves.filter((l) => l.status === 'approved');
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

  return (
    <Card className="p-5 border-border/60 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          {t('leave.calendarTitle')}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-[150px] text-center capitalize">
            {cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-2 ring-accent inline-block" /> {t('leave.overlap')}</span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {orderedWeekdays.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dayLeaves = approved.filter((l) => inRange(d, l.start_date, l.end_date));
          const overlap = dayLeaves.length > 1;
          const today = sameDay(d, new Date());
          return (
            <div
              key={i}
              className={`min-h-[68px] p-1 rounded-lg border text-xs ${today ? 'border-primary bg-primary/5' : 'border-border/60'} ${overlap ? 'ring-2 ring-accent' : ''}`}
            >
              <div className={`font-semibold mb-1 ${today ? 'text-primary' : 'text-foreground/70'}`}>{d.getDate()}</div>
              <div className="space-y-0.5">
                {dayLeaves.slice(0, 2).map((l) => (
                  <div key={l.id} className={`px-1 py-0.5 rounded border truncate ${typeColor(l.leave_type)}`} title={`${l.employee_name} · ${t('leave.' + l.leave_type)}`}>
                    {l.employee_name.split(' ')[0]}
                  </div>
                ))}
                {dayLeaves.length > 2 && <div className="text-[10px] text-muted-foreground font-medium">+{dayLeaves.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {approved.length === 0 && <p className="text-sm text-muted-foreground text-center mt-4">{t('leave.noApproved')}</p>}
    </Card>
  );
}