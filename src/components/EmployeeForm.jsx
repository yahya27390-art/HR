import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Building2, Timer, ShieldCheck, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

const defaultShifts = [
  { id: 'sh_non_saudi_overtime', name: 'فترة عمل غير سعودي (9 ساعات + إضافي 100 ريال)', working_hours: 9, start_time: '09:00', end_time: '21:00' },
  { id: 'sh_non_saudi', name: 'فترة عمل غير سعودي (الأساسي 8 ساعات)', working_hours: 8, start_time: '08:00', end_time: '20:00' },
  { id: 'sh_saudi_morning', name: 'فترة عمل سعودي صباحي', working_hours: 5, start_time: '08:00', end_time: '13:00' },
  { id: 'sh_saudi_evening', name: 'فترة عمل سعودي مسائي', working_hours: 5, start_time: '16:00', end_time: '21:00' },
  { id: 'sh_gm', name: 'شفت المدير العام', working_hours: 8, start_time: '09:00', end_time: '17:00' },
  { id: 'sh_ramadan', name: 'شفت رمضان', working_hours: 5.5, start_time: '20:30', end_time: '02:00' }
];

const defaultBranches = [
  { id: 'br_admin', name: 'مكتب الإدارة' },
  { id: 'br_main', name: 'الفرع الرئيسي' },
  { id: 'br_kia', name: 'فرع كيا ( السليم )' },
  { id: 'br_hyundai', name: 'فرع هونداي ( الرواف )' }
];

const defaultDepts = [
  { id: 'd_1', name: 'مكتب الإدارة' },
  { id: 'd_2', name: 'الفرع الرئيسي' },
  { id: 'd_3', name: 'فرع كيا ( السليم )' },
  { id: 'd_4', name: 'فرع هونداي ( الرواف )' },
  { id: 'd_5', name: 'قسم المبيعات' },
  { id: 'd_6', name: 'قسم الحسابات والمالية' },
  { id: 'd_7', name: 'المتجر الإلكتروني' },
  { id: 'd_8', name: 'الموارد البشرية والشؤون الإدارية' }
];

const defaultPolicies = [
  { id: 'pol_1', name: 'الاجازة السنوية', annual_days: 21 },
  { id: 'pol_2', name: 'اجازات بدون مرتب', annual_days: 30 },
  { id: 'pol_3', name: 'Standard Policy', annual_days: 21 }
];

const defaultCompanies = [
  { id: 'c_1', name: 'HR DORAT CARS' },
  { id: 'c_2', name: 'درة السيارة لقطع غيار السيارات' }
];

const empty = {
  full_name: '',
  email: '',
  phone: '',
  job_title: '',
  department: 'مكتب الإدارة',
  department_name: 'مكتب الإدارة',
  branch: 'مكتب الإدارة',
  branch_name: 'مكتب الإدارة',
  shift: 'فترة عمل غير سعودي',
  leave_policy: 'الاجازة السنوية',
  hire_date: '2025-01-01',
  join_date: '2025-01-01',
  salary: '3000',
  housing_allowance: '0',
  transport_allowance: '0',
  status: 'active',
  employee_id: '1036',
  employee_number: '1036',
  national_id: '',
  id_expiry_date: '',
  nationality: 'سعودي',
  gender: 'male',
  company: 'درة السيارة لقطع غيار السيارات',
  is_insured: true,
  gosi_number: ''
};

export default function EmployeeForm({ open, onOpenChange, employee, departments: propsDepts, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = !!employee;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);

  const [companies, setCompanies] = useState(defaultCompanies);
  const [branches, setBranches] = useState(defaultBranches);
  const [departments, setDepartments] = useState(propsDepts && propsDepts.length > 0 ? propsDepts : defaultDepts);
  const [shifts, setShifts] = useState(defaultShifts);
  const [policies, setPolicies] = useState(defaultPolicies);

  useEffect(() => {
    if (open) {
      if (employee) {
        const isInsuredVal = employee.is_insured === false || employee.is_insured === 'false' ? false : true;
        setForm({
          ...empty,
          ...employee,
          department: employee.department || employee.department_name || 'مكتب الإدارة',
          department_name: employee.department_name || employee.department || 'مكتب الإدارة',
          branch: employee.branch || employee.branch_name || 'مكتب الإدارة',
          branch_name: employee.branch_name || employee.branch || 'مكتب الإدارة',
          shift: employee.shift || 'فترة عمل غير سعودي',
          leave_policy: employee.leave_policy || 'الاجازة السنوية',
          employee_id: employee.employee_number || employee.employee_id || '',
          employee_number: employee.employee_number || employee.employee_id || '',
          hire_date: employee.join_date || employee.hire_date || '',
          join_date: employee.join_date || employee.hire_date || '',
          company: employee.company || 'درة السيارة لقطع غيار السيارات',
          is_insured: isInsuredVal,
          gosi_number: isInsuredVal ? (employee.gosi_number || '') : ''
        });
      } else {
        setForm({ ...empty, employee_number: String(1000 + Math.floor(Math.random() * 900)) });
      }
      setShowIdentity(false);
    }
  }, [open, employee]);

  useEffect(() => {
    base44.entities.Company.list().then(list => list && list.length && setCompanies(list)).catch(() => {});
    base44.entities.Branch.list().then(list => list && list.length && setBranches(list)).catch(() => {});
    base44.entities.Shift.list().then(list => list && list.length && setShifts(list)).catch(() => {});
    base44.entities.Department.list().then(list => list && list.length && setDepartments(list)).catch(() => {});
    base44.entities.LeavePolicy.list().then(list => list && list.length && setPolicies(list)).catch(() => {});
  }, []);

  const set = (k, v) => {
    setForm(prev => {
      const updated = { ...prev, [k]: v };
      if (k === 'department') updated.department_name = v;
      if (k === 'branch') updated.branch_name = v;
      if (k === 'hire_date') updated.join_date = v;
      if (k === 'employee_id') updated.employee_number = v;
      return updated;
    });
  };

  const save = async () => {
    if (!form.full_name || !form.job_title) {
      toast({ title: 'يرجى إدخال اسم الموظف والمسمى الوظيفي', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        department: form.department || form.department_name || 'مكتب الإدارة',
        department_name: form.department_name || form.department || 'مكتب الإدارة',
        branch: form.branch || form.branch_name || 'مكتب الإدارة',
        branch_name: form.branch_name || form.branch || 'مكتب الإدارة',
        shift: form.shift || 'فترة عمل غير سعودي',
        leave_policy: form.leave_policy || 'الاجازة السنوية',
        salary: Number(form.salary) || 0,
        housing_allowance: Number(form.housing_allowance) || 0,
        transport_allowance: Number(form.transport_allowance) || 0,
        is_insured: form.is_insured !== false && form.is_insured !== 'false',
        gosi_number: form.gosi_number || '',
        employee_number: String(form.employee_number || form.employee_id || '1000'),
        employee_id: String(form.employee_number || form.employee_id || '1000'),
        join_date: form.join_date || form.hire_date || new Date().toISOString().split('T')[0]
      };

      if (isEdit) {
        await base44.entities.Employee.update(employee.id, payload);
      } else {
        await base44.entities.Employee.create(payload);
      }

      toast({ title: isEdit ? 'تم تحديث بيانات الموظف والوردية بنجاح ✅' : 'تمت إضافة الموظف بنجاح ✅' });
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-lg">
            {isEdit ? 'تعديل بيانات الموظف والوردية' : 'إضافة موظف جديد للمنظومة'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-xs">
          
          <div className="space-y-1.5">
            <Label className="font-bold">الرقم الوظيفي *</Label>
            <Input 
              value={form.employee_number || form.employee_id} 
              onChange={(e) => set('employee_number', e.target.value)} 
              className="font-mono font-bold" 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">اسم الموظف الرباعي *</Label>
            <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">البريد الإلكتروني</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">رقم الجوال (واتساب)</Label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">المسمى الوظيفي *</Label>
            <Input value={form.job_title} onChange={(e) => set('job_title', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-primary">القسم *</Label>
            <Select value={form.department_name || form.department} onValueChange={(v) => set('department', v)}>
              <SelectTrigger className="h-10 font-semibold"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-primary">الفرع التابع له *</Label>
            <Select value={form.branch_name || form.branch} onValueChange={(v) => set('branch', v)}>
              <SelectTrigger className="h-10 font-semibold"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-primary">الوردية وفترة العمل *</Label>
            <Select value={form.shift} onValueChange={(v) => set('shift', v)}>
              <SelectTrigger className="h-10 font-semibold"><SelectValue placeholder="اختر الوردية" /></SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name} {s.start_time ? `(${s.start_time} - ${s.end_time})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">سياسة الإجازات</Label>
            <Select value={form.leave_policy} onValueChange={(v) => set('leave_policy', v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name} {p.annual_days ? `· ${p.annual_days} يوم` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">الشركة التابع لها</Label>
            <Select value={form.company} onValueChange={(v) => set('company', v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">الراتب الأساسي (ريال)</Label>
            <Input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">تاريخ التعيين / المباشرة</Label>
            <Input type="date" value={form.join_date || form.hire_date} onChange={(e) => set('join_date', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">حالة الموظف</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">على رأس العمل (نشط)</SelectItem>
                <SelectItem value="on_leave">في إجازة</SelectItem>
                <SelectItem value="inactive">غير نشط / منتهي العقد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">الجنسية</Label>
            <Input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="سعودي / سوري / مصري / يمني" />
          </div>

        </div>

        {/* Identity & Legal Data Section */}
        <button 
          type="button" 
          onClick={() => setShowIdentity(!showIdentity)} 
          className="flex items-center gap-2 text-xs font-bold text-primary my-2 hover:underline"
        >
          {showIdentity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>بيانات الهوية والإقامة وتاريخ الميلاد</span>
        </button>

        {showIdentity && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60 text-xs">
            {/* GOSI Insurance Fields */}
            <div className="sm:col-span-2 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <span>🛡️ بيانات التأمينات الاجتماعية (GOSI)</span>
                </Label>
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">تحمل المنشأة 100% (بدون استقطاع من الراتب)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">حالة التأمين الاجتماعي</Label>
                  <Select
                    value={form.is_insured ? 'true' : 'false'}
                    onValueChange={(v) => {
                      const isTrue = v === 'true';
                      setForm(prev => ({
                        ...prev,
                        is_insured: isTrue,
                        gosi_number: isTrue ? prev.gosi_number : ''
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="اختر حالة التأمين..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">مؤمن عليه في التأمينات (نشط)</SelectItem>
                      <SelectItem value="false">غير مسجل بالتأمينات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">رقم الاشتراك في التأمينات</Label>
                  <Input
                    value={form.gosi_number || ''}
                    onChange={(e) => set('gosi_number', e.target.value)}
                    placeholder="مثال: 100578945"
                    className="font-mono bg-white dark:bg-slate-900"
                    disabled={!form.is_insured}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>رقم الهوية الوطنية / الإقامة</Label>
              <Input value={form.national_id} onChange={(e) => set('national_id', e.target.value)} className="font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label>تاريخ انتهاء الهوية / الإقامة</Label>
              <Input type="date" value={form.id_expiry_date} onChange={(e) => set('id_expiry_date', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>بدل السكن الشهري (ريال)</Label>
              <Input type="number" value={form.housing_allowance} onChange={(e) => set('housing_allowance', e.target.value)} className="font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label>بدل المواصلات الشهري (ريال)</Label>
              <Input type="number" value={form.transport_allowance} onChange={(e) => set('transport_allowance', e.target.value)} className="font-mono" />
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving} className="bg-[#2D164D] hover:bg-[#1E1035] text-white font-bold px-6">
            {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
