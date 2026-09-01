import { useState } from 'react';
import { Gift, AlertTriangle, Plus, CalendarCheck, Sparkles, DollarSign, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function RewardsPenalties() {
  const [items, setItems] = useState([
    { 
      id: '1', 
      title: 'بدل عمل إضافي أيام الجمعة (عطلة رسمية)', 
      type: 'reward', 
      amount: '50 ر.س / يوم جمعة', 
      description: 'يُحتسب 50 ريال إضافي عن كل يوم جمعة يحضره الموظف، ويُجمّع آلياً في مسير الراتب (مثال: 200 ريال عن إضافي حضور 4 أيام جمعة)' 
    },
    { 
      id: '2', 
      title: 'بدل ساعة عمل إضافية يومية (شفت 9 ساعات)', 
      type: 'reward', 
      amount: '100 ر.س / يوم', 
      description: 'يُصرف 100 ريال يومياً للموظف في حال امتداد دوام الفترة المسائية حتى 9:00 مساءً' 
    },
    { 
      id: '3', 
      title: 'مكافأة تميز في المبيعات وخدمة العملاء', 
      type: 'reward', 
      amount: '500 ر.س', 
      description: 'مكافأة شهرية لتحقيق مستهدف المبيعات وانضباط الفرع' 
    },
    { 
      id: '4', 
      title: 'خصم تأخير متكرر عن مواعيد الشفت', 
      type: 'penalty', 
      amount: 'حسم ربع/نصف يوم', 
      description: 'تأخير أكثر من 3 مرات في الشهر بعد انتهاء فترة السماح (15 دقيقة)' 
    },
    { 
      id: '5', 
      title: 'مكافأة انضباط وحضور كامل للشهر', 
      type: 'reward', 
      amount: '300 ر.س', 
      description: 'حضور كامل الشهر بدون أي تأخير أو استئذان' 
    }
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold shadow-sm">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">إعدادات وسياسات المكافآت والجزاءات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">تحديد بنود الحوافز وبدلات أيام الجمعة وساعات العمل الإضافية وخصومات الحضور</p>
          </div>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 pb-3 border-b border-border/40 flex items-center justify-between bg-secondary/20">
          <h2 className="font-heading font-bold text-base text-foreground">
            لائحة البدلات والمكافآت المعتمدة بالمنظومة
          </h2>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            {items.length} سياسات نشطة
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 text-xs">
                <TableHead>البند / السياسة</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>القيمة المقررة</TableHead>
                <TableHead>الشرح وآلية الاحتساب في الراتب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id} className="hover:bg-secondary/40 text-xs">
                  <TableCell className="font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{it.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={it.type === 'reward' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}>
                      {it.type === 'reward' ? 'مكافأة / بدل إضافي' : 'خصم / جزاء'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-black text-xs text-emerald-700">
                    {it.amount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {it.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
