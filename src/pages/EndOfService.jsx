import { useState } from 'react';
import { Calculator, Printer, FileCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EndOfService() {
  const [contractType, setContractType] = useState('unlimited');
  const [reason, setReason] = useState('employer');
  const [salary, setSalary] = useState(4000);
  const [years, setYears] = useState(3);
  const [months, setMonths] = useState(6);

  // Saudi Labor Law Article 84 & 85 calculation
  const totalYears = Number(years) + Number(months) / 12;
  let rawReward = 0;
  if (totalYears <= 5) {
    rawReward = (Number(salary) / 2) * totalYears;
  } else {
    rawReward = (Number(salary) / 2) * 5 + Number(salary) * (totalYears - 5);
  }

  let finalReward = rawReward;
  if (reason === 'resignation') {
    if (totalYears < 2) finalReward = 0;
    else if (totalYears >= 2 && totalYears < 5) finalReward = rawReward * (1 / 3);
    else if (totalYears >= 5 && totalYears < 10) finalReward = rawReward * (2 / 3);
    else finalReward = rawReward;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">حاسبة مكافأة نهاية الخدمة</h1>
            <p className="text-sm text-muted-foreground mt-0.5">وفق أحكام المادتين 84 و 85 من نظام العمل السعودي</p>
          </div>
        </div>

        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" /> طباعة المسير
        </Button>
      </div>

      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>نوع عقد العمل</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">عقد غير محدد المدة</SelectItem>
                <SelectItem value="limited">عقد محدد المدة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>سبب انتهاء العلاقة التعاقدية</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employer">إنهاء العقد من صاحب العمل (أو انتهاء مدته)</SelectItem>
                <SelectItem value="resignation">استقالة الموظف</SelectItem>
                <SelectItem value="force_majeure">فسخ العقد لظرف قاهر أو ترك العمل بموجب المادة 81</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الراتب الشهري الأخير (الأساسي + البدلات)</Label>
            <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="rounded-xl h-11 font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>عدد السنوات</Label>
              <Input type="number" value={years} onChange={(e) => setYears(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>عدد الأشهر</Label>
              <Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} className="rounded-xl h-11 font-mono" />
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground block">إجمالي مكافأة نهاية الخدمة المستحقة</span>
            <span className="text-3xl font-bold text-primary font-mono">{Math.round(finalReward).toLocaleString()} ر.س</span>
          </div>

          <div className="text-xs text-muted-foreground text-right sm:max-w-xs space-y-1">
            <p>• مدة الخدمة المحتسبة: <span className="font-bold text-foreground">{totalYears.toFixed(1)} سنة</span></p>
            <p>• نسبة الاستحقاق النظامية: <span className="font-bold text-emerald-600">{Math.round((finalReward / (rawReward || 1)) * 100)}%</span></p>
          </div>
        </div>
      </Card>
    </div>
  );
}
