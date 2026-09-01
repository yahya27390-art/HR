import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Save } from 'lucide-react';
export default function PrintTemplates() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">نماذج الطباعة والترويسة</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تخصيص ترويسة وتذييل الخطابات وشعار الشركة في المطبوعات</p>
        </div>
      </div>
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <p className="text-sm font-semibold">ترويسة شركة درة السيارة الرسمية معتمدة ومفعلة لجميع المطبوعات.</p>
        <Button className="bg-[#2D164D] text-white"><Save className="w-4 h-4 me-2" /> حفظ النموذج المعتمد</Button>
      </Card>
    </div>
  );
}
