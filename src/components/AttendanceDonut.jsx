import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function AttendanceDonut({ data, t }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={62} outerRadius={84} paddingAngle={3} stroke="none">
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-heading font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">{t('common.employee')}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-xs text-muted-foreground">{d.name} · {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}