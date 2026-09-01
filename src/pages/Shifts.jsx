import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Timer, 
  Plus, 
  Clock, 
  Users, 
  Coffee, 
  Edit, 
  Trash2, 
  Sun, 
  Moon, 
  Sparkles, 
  DollarSign,
  UserCheck,
  Building2,
  ChevronLeft,
  Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ShiftForm from '@/components/ShiftForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const initialShifts = [
  {
    "id": "sh_non_saudi_overtime",
    "name": "فترة عمل غير سعودي (9 ساعات + إضافي 100 ريال)",
    "type": "multi",
    "morning_start": "09:00",
    "morning_end": "13:00",
    "break_start": "13:00",
    "break_end": "16:00",
    "evening_start": "16:00",
    "evening_end": "21:00",
    "start_time": "09:00",
    "end_time": "21:00",
    "working_hours": 9,
    "total_hours": 9,
    "has_overtime": true,
    "overtime_hours": 1,
    "overtime_daily_rate": 100,
    "grace_minutes": 15,
    "description": "دوام فترتين مخصص (يحيى باشا & هشام زغلول): 9:00 ص إلى 1:00 م & 4:00 ع إلى 9:00 م (ساعة إضافية يومية = 100 ريال)"
  },
  {
    "id": "sh_non_saudi",
    "name": "فترة عمل غير سعودي (الأساسي 8 ساعات)",
    "type": "multi",
    "morning_start": "08:00",
    "morning_end": "12:00",
    "break_start": "12:00",
    "break_end": "16:00",
    "evening_start": "16:00",
    "evening_end": "20:00",
    "start_time": "08:00",
    "end_time": "20:00",
    "working_hours": 8,
    "total_hours": 8,
    "has_overtime": false,
    "grace_minutes": 15,
    "description": "دوام فترتين أساسي: 8:00 ص إلى 12:00 م & 4:00 ع إلى 8:00 م مع استراحة 4 ساعات"
  },
  {
    "id": "sh_saudi_morning",
    "name": "فترة عمل سعودي صباحي",
    "type": "morning",
    "start_time": "08:00",
    "end_time": "13:00",
    "working_hours": 5,
    "total_hours": 5,
    "grace_minutes": 15,
    "description": "دوام صباحي 5 ساعات للكوادر الوطنية (8:00 ص إلى 1:00 م)"
  },
  {
    "id": "sh_saudi_evening",
    "name": "فترة عمل سعودي مسائي",
    "type": "evening",
    "start_time": "16:00",
    "end_time": "21:00",
    "working_hours": 5,
    "total_hours": 5,
    "early_checkin_grace": 60,
    "grace_minutes": 10,
    "overtime_grace": 60,
    "has_netting": true,
    "description": "دوام مسائي 5 ساعات (4:00 م إلى 9:00 م) - سماحية حضور مبكر 60 دقيقة، سماحية تأخير 10 دقائق، احتساب خروج وإضافي حتى 60 دقيقة ومقاصة شهرية للإضافي مع التأخير"
  },
  {
    "id": "sh_gm",
    "name": "شفت المدير العام",
    "type": "flexible",
    "start_time": "09:00",
    "end_time": "17:00",
    "working_hours": 8,
    "total_hours": 8,
    "grace_minutes": 0,
    "description": "دوام الإدارة العامة حضور وانصراف مرن ومعفى آلياً"
  },
  {
    "id": "sh_ramadan",
    "name": "شفت رمضان",
    "type": "ramadan",
    "start_time": "20:30",
    "end_time": "02:00",
    "working_hours": 5.5,
    "total_hours": 5.5,
    "grace_minutes": 20,
    "description": "دوام شهر رمضان المبارك المسائي (8:30 م إلى 2:00 ص)"
  }
];

export default function Shifts() {
  const { toast } = useToast();
  const [shifts, setShifts] = useState(initialShifts);
  const [employees, setEmployees] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  
  // Modal for Viewing Assigned Employees
  const [viewingShiftEmployees, setViewingShiftEmployees] = useState(null);

  const loadData = async () => {
    try {
      const [sList, eList] = await Promise.all([
        base44.entities.Shift.list(),
        base44.entities.Employee.list()
      ]);
      if (sList && sList.length > 0) {
        const merged = [...initialShifts];
        sList.forEach(s => {
          if (!merged.find(m => m.name === s.name || m.id === s.id)) merged.push(s);
        });
        setShifts(merged);
      } else {
        setShifts(initialShifts);
      }
      setEmployees(eList || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Precise normalized employee matcher
  const getAssignedEmployees = (shiftName, shiftId) => {
    return employees.filter(e => {
      const empShift = (e.shift || '').trim();
      const empNum = String(e.employee_number || '');

      // 1. Direct exact match
      if (empShift === shiftName) return true;

      // 2. GM Shift Match
      if (shiftName === 'شفت المدير العام' || shiftId === 'sh_gm') {
        return empNum === '1001' || empShift.includes('المدير') || empShift.includes('الاداره');
      }

      // 3. Overtime Non-Saudi Match (Yahya Basha & Hesham Zaghloul)
      if (shiftName.includes('9 ساعات') || shiftId === 'sh_non_saudi_overtime') {
        return empNum === '1022' || empNum === '1005' || empShift.includes('745') || empShift.includes('إضافي');
      }

      // 4. Saudi Morning Match
      if (shiftName.includes('صباحي') || shiftId === 'sh_saudi_morning') {
        return empShift.includes('الصباح') || empShift === 'فترة عمل سعودي صباحي';
      }

      // 5. Saudi Evening Match
      if (shiftName.includes('مسائي') || shiftId === 'sh_saudi_evening') {
        return empShift.includes('المساء') || empShift === 'فترة عمل سعودي مسائي';
      }

      // 6. Ramadan Shift
      if (shiftName.includes('رمضان') || shiftId === 'sh_ramadan') {
        return empShift.includes('رمضان');
      }

      // 7. Base Non-Saudi 8h Match
      if (shiftName.includes('الأساسي') || shiftName === 'فترة عمل غير سعودي' || shiftId === 'sh_non_saudi') {
        if (empNum === '1022' || empNum === '1005' || empNum === '1001') return false;
        return (
          e.nationality !== 'سعودي' || 
          empShift.includes('غير سعودي') || 
          empShift.includes('غير السعوديين') ||
          empShift === 'فترة عمل غير سعودي'
        );
      }

      return false;
    });
  };

  const handleEdit = (shift) => {
    setSelectedShift(shift);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedShift(null);
    setFormOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل أنت متأكد من حذف وردية "${name}"؟`)) return;
    try {
      await base44.entities.Shift.delete(id);
      setShifts(prev => prev.filter(s => s.id !== id));
      toast({ title: 'تم حذف الوردية بنجاح' });
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ─── TOP HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              ورديات العمل وفترات الدوام
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              تحديد وتوزيع فترات الدوام الصباحية والمسائية والبريك وربط كل موظف بورديته الرسمية
            </p>
          </div>
        </div>

        <Button 
          onClick={handleAdd} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md gap-2 text-xs h-10 px-5"
        >
          <Plus className="w-4 h-4" /> 
          <span>إضافة وردية جديدة</span>
        </Button>
      </div>

      {/* ─── GRID OF SHIFTS CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shifts.map((s) => {
          const assignedEmps = getAssignedEmployees(s.name, s.id);
          const empCount = assignedEmps.length;
          const isSplit = s.type === 'multi';

          return (
            <Card 
              key={s.id} 
              className="p-5 border-border/70 shadow-sm rounded-3xl bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4 hover:shadow-lg hover:border-emerald-500/40 transition-all group"
            >
              <div>
                {/* Card Top Title & Actions */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-sm text-foreground truncate group-hover:text-emerald-600 transition-colors">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        {isSplit ? 'دوام فترتين' : s.type === 'morning' ? 'دوام صباحي' : s.type === 'evening' ? 'دوام مسائي' : s.type === 'ramadan' ? 'شفت رمضان' : 'دوام مرن'}
                      </Badge>
                      {s.has_overtime && (
                        <Badge className="bg-amber-500 text-white text-[10px] font-black">
                          ⭐ +100 ريال إضافي
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                    <button 
                      onClick={() => handleEdit(s)} 
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition-colors"
                      title="تعديل الوردية"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(s.id, s.name)} 
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
                      title="حذف الوردية"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Structured Timetable Breakdown */}
                {isSplit ? (
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border/60 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-bold">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>الفترة الصباحية:</span>
                      </span>
                      <span className="font-mono font-black text-foreground" dir="ltr">
                        {s.morning_start || s.start_time || '08:00'} - {s.morning_end || s.break_start || '12:00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1.5 rounded-xl border border-amber-200/50">
                      <span className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        <span>فترة الاستراحة (البريك):</span>
                      </span>
                      <span className="font-mono font-black" dir="ltr">
                        {s.break_start || '12:00'} - {s.break_end || '16:00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-bold">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>الفترة المسائية:</span>
                      </span>
                      <span className="font-mono font-black text-foreground" dir="ltr">
                        {s.evening_start || s.break_end || '16:00'} - {s.evening_end || s.end_time || '20:00'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">ساعات العمل الأساسية:</span>
                      <span className="font-mono font-black text-emerald-600">{s.working_hours} ساعات</span>
                    </div>

                    {s.has_overtime && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-black">
                        <span>بدل الإضافي اليومي:</span>
                        <span className="font-mono">{s.overtime_daily_rate || 100} ريال / يوم</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border/60 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">الفترة الزمنية:</span>
                      <span className="font-mono font-black text-foreground" dir="ltr">
                        {s.start_time || '08:00'} - {s.end_time || '13:00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">ساعات العمل:</span>
                      <span className="font-mono font-black text-emerald-600">{s.working_hours} ساعات</span>
                    </div>
                  </div>
                )}

                {s.description && (
                  <p className="text-[11px] text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                )}
              </div>

              {/* Card Footer: Assigned Employees Counter & View Button */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-bold">الموظفون المخصصون:</span>
                
                <button
                  type="button"
                  onClick={() => setViewingShiftEmployees({ shift: s, employees: assignedEmps })}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold transition-all shadow-sm group-hover:scale-105"
                  title="عرض أسماء الموظفين المخصصين لهذه الوردية"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono">{empCount} موظف</span>
                  <ChevronLeft className="w-3 h-3 text-emerald-500" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── MODAL: VIEW ASSIGNED EMPLOYEES DETAILS ──────────────────────── */}
      <Dialog open={Boolean(viewingShiftEmployees)} onOpenChange={(open) => !open && setViewingShiftEmployees(null)}>
        <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span>الموظفون المخصصون للوردية ({viewingShiftEmployees?.employees?.length || 0})</span>
                <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                  {viewingShiftEmployees?.shift?.name}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto space-y-2 py-2 no-scrollbar">
            {(!viewingShiftEmployees?.employees || viewingShiftEmployees.employees.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-bold">
                لا يوجد موظفون مخصصون لهذه الوردية حالياً
              </div>
            ) : (
              viewingShiftEmployees.employees.map((emp) => (
                <div 
                  key={emp.id || emp.employee_number}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {emp.full_name ? emp.full_name[0] : 'م'}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground flex items-center gap-2">
                        <span>{emp.full_name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">#{emp.employee_number}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{emp.branch_name || emp.branch || 'الفرع الرئيسي'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>{emp.job_title || 'موظف'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-900 border-slate-300">
                    {emp.nationality || 'سعودي'}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setViewingShiftEmployees(null)} 
              className="w-full bg-slate-900 text-white rounded-2xl text-xs font-bold"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Create Shift Modal */}
      <ShiftForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        shift={selectedShift} 
        onSaved={loadData} 
      />
    </div>
  );
}
