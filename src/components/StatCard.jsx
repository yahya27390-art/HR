import { Card } from '@/components/ui/card';

export default function StatCard({ icon: Icon, label, value, accent, hint }) {
  return (
    <Card className="p-6 flex items-center gap-5 border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${accent || 'bg-primary/10 text-primary'}`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-heading font-bold text-foreground leading-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </Card>
  );
}