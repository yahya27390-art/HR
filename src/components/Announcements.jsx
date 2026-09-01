import { useI18n } from '@/lib/i18n';
import { Megaphone, CalendarDays, PartyPopper } from 'lucide-react';

export default function Announcements() {
  const { lang } = useI18n();
  const items = lang === 'ar'
    ? [
        { icon: Megaphone, color: 'bg-accent/20 text-accent-foreground', title: 'إجازة اليوم الوطني', body: 'سيُعطّل العمل يوم 23 سبتمبر بمناسبة اليوم الوطني للمملكة.', date: '23 سبتمبر' },
        { icon: CalendarDays, color: 'bg-primary/10 text-primary', title: 'اجتماع الموظفين ربع السنوي', body: 'مراجعة أداء الربع الثالث الساعة 10 صباحًا في القاعة الكبرى.', date: '15 سبتمبر' },
        { icon: PartyPopper, color: 'bg-emerald-100 text-emerald-600', title: 'ترحيب بموظفين جدد', body: 'انضمّ 3 مهندسين جدد إلى فريق الهندسة هذا الشهر.', date: 'هذا الشهر' },
      ]
    : [
        { icon: Megaphone, color: 'bg-accent/20 text-accent-foreground', title: 'National Day Holiday', body: 'The office will be closed on Sept 23 for Saudi National Day.', date: 'Sep 23' },
        { icon: CalendarDays, color: 'bg-primary/10 text-primary', title: 'Quarterly All-Hands', body: 'Q3 performance review at 10:00 AM in the main hall.', date: 'Sep 15' },
        { icon: PartyPopper, color: 'bg-emerald-100 text-emerald-600', title: 'New Joiners', body: '3 new engineers joined the team this month.', date: 'This month' },
      ];

  return (
    <div className="space-y-5">
      {items.map((it, i) => (
        <div key={i} className="flex gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${it.color}`}>
            <it.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{it.title}</p>
              <span className="text-xs text-muted-foreground">{it.date}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}