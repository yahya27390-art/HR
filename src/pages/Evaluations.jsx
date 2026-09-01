import { useState } from 'react';
import { Trophy, Plus, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function Evaluations() {
  const [evals] = useState([
    { id: '1', emp: 'طه محمود المحيميد', role: 'مسئول متجر الكتروني', score: '95%', grade: 'ممتاز', date: '2026-08' },
    { id: '2', emp: 'محمود طه المحيميد', role: 'بائع قطع غيار', score: '88%', grade: 'جيد جداً', date: '2026-08' },
    { id: '3', emp: 'هشام ابوالفضل زغلول', role: 'مدير الحسابات', score: '98%', grade: 'ممتاز مرتفع', date: '2026-08' }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">تقييم أداء الموظفين</h1>
            <p className="text-xs text-muted-foreground mt-0.5">تقارير الأداء الدوري ومؤشرات الإنجاز لكادر الشركة</p>
          </div>
        </div>

        <Button className="bg-[#2D164D] text-white"><Plus className="w-4 h-4 me-2" /> تقييم جديد</Button>
      </div>

      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="font-bold text-xs">الموظف</TableHead>
              <TableHead className="font-bold text-xs">المسمى الوظيفي</TableHead>
              <TableHead className="font-bold text-xs">التقييم</TableHead>
              <TableHead className="font-bold text-xs">التقدير</TableHead>
              <TableHead className="font-bold text-xs">الفترة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evals.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="font-bold text-sm text-foreground">{ev.emp}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{ev.role}</TableCell>
                <TableCell className="font-bold font-mono text-primary text-sm">{ev.score}</TableCell>
                <TableCell>
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">{ev.grade}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{ev.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
