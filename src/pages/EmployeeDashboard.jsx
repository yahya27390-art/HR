import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MaskedSalary } from '@/lib/FinancialPrivacyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock, Calendar, FileText, User, ArrowLeft, Send,
  ClipboardList, Wallet, ShieldCheck, CheckCircle2,
  AlertCircle, Download, Printer, Sparkles, Building2,
  CalendarDays, Award, Clock4, UserCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const formatPunchTime = (val) => {
  if (!val || val === '--:--') return '--:--';
  if (typeof val === 'string' && val.includes('T')) {
    return val.slice(11, 16);
  }
  return val;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentEmp, setCurrentEmp] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Modals
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'إجازة سنوية', start_date: todayStr(), end_date: todayStr(), reason: '' });

  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: 1000, monthly_installment: 500, reason: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await base44.entities.Employee.list();
      const target = (emps || []).find(e =>
        (user?.employee_number && String(e.employee_number) === String(user.employee_number)) ||
        (user?.id && String(e.id) === String(user.id)) ||
        (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
      ) || (emps && emps[0]);

      setCurrentEmp(target || null);

      if (target) {
        const logs = await base44.entities.AttendanceLog.list('-log_date', 300);
        const myLogs = (logs || []).filter(l =>
          String(l.employee_number || l.employee_id) === String(target.employee_number) ||
          String(l.employee_id) === String(target.id)
        );
        setRecentLogs(myLogs.slice(0, 10));

        const tLog = myLogs.find(l => (l.log_date || l.date) === todayStr());
        setTodayLog(tLog || null);

        // Load my requests
        try {
          const lr = JSON.parse(localStorage.getItem('hr_leave_requests') || '[]');
          const myLeaves = lr.filter(r => String(r.employee_number) === String(target.employee_number));
          const adv = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
          const myAdv = adv.filter(r => String(r.employee_number) === String(target.employee_number));
          setMyRequests([...myLeaves, ...myAdv]);
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit Leave
  const handleSubmitLeave = () => {
    if (!currentEmp) return;
    const d1 = new Date(leaveForm.start_date);
    const d2 = new Date(leaveForm.end_date);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

    const newReq = {
      id: 'leave_' + Date.now(),
      employee_id: currentEmp.id,
      employee_number: currentEmp.employee_number,
      employee_name: currentEmp.full_name,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      days_count: days,
      reason: leaveForm.reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      const lr = JSON.parse(localStorage.getItem('hr_leave_requests') || '[]');
      lr.unshift(newReq);
      localStorage.setItem('hr_leave_requests', JSON.stringify(lr));
      setMyRequests(prev => [newReq, ...prev]);
      setLeaveModal(false);
      toast({ title: '✓ تم تقديم طلب الإجازة بنجاح وهو قيد المراجعة' });
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  // Submit Advance
  const handleSubmitAdvance = () => {
    if (!currentEmp) return;
    const newReq = {
      id: 'adv_' + Date.now(),
      employee_id: currentEmp.id,
      employee_number: currentEmp.employee_number,
      employee_name: currentEmp.full_name,
      amount: Number(advanceForm.amount),
      monthly_installment: Number(advanceForm.monthly_installment),
      reason: advanceForm.reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      const adv = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
      adv.unshift(newReq);
      localStorage.setItem('hr_advances_list', JSON.stringify(adv));
      setMyRequests(prev => [newReq, ...prev]);
      setAdvanceModal(false);
      toast({ title: '✓ تم تقديم طلب السلفة بنجاح وهو قيد المراجعة' });
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16" dir="rtl">
      
      {/* ─── EMPLOYEE WELCOME BANNER ─────────────────────────────────── */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-3xl font-heading shadow-inner">
              {(currentEmp?.full_name || user?.full_name || 'م')[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black font-heading">
                  مرحباً، {currentEmp?.full_name || user?.full_name}
                </h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-bold">بوابة الموظف الذكية ✓</Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {currentEmp?.job_title} • {currentEmp?.branch_name || currentEmp?.branch} • <span className="font-mono text-emerald-400">#{currentEmp?.employee_number}</span>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate(`/employees/${currentEmp?.id || currentEmp?.employee_number}`)}
            className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl h-9"
          >
            ملفي 360° ←
          </Button>
        </div>

        {/* Quick Employee Key Stats */}
        {currentEmp && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-white/10">
            
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] text-slate-300 font-bold">الراتب الأساسي</div>
              <div className="font-black font-mono text-sm mt-0.5 text-white">
                <MaskedSalary value={currentEmp.salary} />
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] text-slate-300 font-bold">رصيد الإجازات السنوية</div>
              <div className="font-black font-mono text-sm mt-0.5 text-amber-300">
                21 / 21 يوم
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] text-slate-300 font-bold">الوردية المعتمدة</div>
              <div className="font-bold text-xs mt-0.5 truncate text-white">
                {currentEmp.shift}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] text-slate-300 font-bold">طريقة الصرف</div>
              <div className="font-bold text-xs mt-0.5 text-emerald-300">
                {currentEmp.payout_method === 'split_bank_cash' ? 'بنك + كاش 🔀' : currentEmp.payout_method === 'cash_full' ? 'كاش نقدي 💵' : 'تحويل بنكي 🏦'}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ─── TODAY ATTENDANCE PUNCH STATUS ───────────────────────────── */}
      <Card className="p-5 rounded-3xl border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-xs text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>حالة دوامك اليوم ({todayStr()})</span>
          </div>
          <Badge className={todayLog?.check_in ? 'bg-emerald-600 text-white font-bold text-[10px]' : 'bg-slate-200 text-slate-700 font-bold text-[10px]'}>
            {todayLog?.check_in ? 'مسجل حضور اليوم ✓' : 'لم تسجل بصمة بعد'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800">
            <span className="text-muted-foreground text-[10px] font-bold">بصمة الدخول:</span>
            <div className="font-mono font-black text-emerald-600 text-sm mt-0.5">
              {formatPunchTime(todayLog?.check_in) || '--:--'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800">
            <span className="text-muted-foreground text-[10px] font-bold">بصمة الخروج:</span>
            <div className="font-mono font-black text-indigo-600 text-sm mt-0.5">
              {formatPunchTime(todayLog?.check_out) || '--:--'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800">
            <span className="text-muted-foreground text-[10px] font-bold">ساعات التواجد:</span>
            <div className="font-mono font-black text-foreground text-sm mt-0.5">
              {todayLog?.work_hours ? `${todayLog.work_hours} ساعة` : '--'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800">
            <span className="text-muted-foreground text-[10px] font-bold">التأخير المرصود:</span>
            <div className="font-mono font-black text-rose-600 text-sm mt-0.5">
              {todayLog?.late_minutes ? `${todayLog.late_minutes} دقيقة` : '0 دقيقة ✓'}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── QUICK SELF-SERVICE ACTIONS ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <button
          type="button"
          onClick={() => setLeaveModal(true)}
          className="p-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 text-right hover:shadow-md transition-all group"
        >
          <Calendar className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-black text-foreground text-sm">طلب إجازة</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">سنوية • اضطرارية • مرضية</div>
        </button>

        <button
          type="button"
          onClick={() => setAdvanceModal(true)}
          className="p-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/20 text-right hover:shadow-md transition-all group"
        >
          <Wallet className="w-6 h-6 text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-black text-foreground text-sm">طلب سلفة</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">تقسيط شهري ميسر</div>
        </button>

        <Link
          to="/my-requests?type=correction"
          className="p-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20 text-right hover:shadow-md transition-all group block"
        >
          <Clock4 className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-black text-foreground text-sm">تعديل بصمة</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">تصحيح نسيان البصمة</div>
        </Link>

        <Link
          to="/my-requests"
          className="p-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/20 text-right hover:shadow-md transition-all group block"
        >
          <ClipboardList className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-black text-foreground text-sm">سجل طلباتي</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">متابعة حالة الموافقات</div>
        </Link>

      </div>

      {/* ─── MY RECENT REQUESTS & ATTENDANCE LOG ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Recent Attendance Days */}
        <Card className="p-5 rounded-3xl border bg-card space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>سجل بصماتك الأخير</span>
            </span>
            <span className="text-[10px] text-muted-foreground">آخر 10 أيام</span>
          </div>

          <div className="space-y-2 text-xs">
            {recentLogs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">لا يوجد سجلات مسجلة مؤخراً</div>
            ) : (
              recentLogs.slice(0, 5).map((l, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border flex items-center justify-between">
                  <div>
                    <div className="font-bold font-mono text-foreground">{l.log_date || l.date}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      دخول: {l.check_in || '--:--'} • خروج: {l.check_out || '--:--'}
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                    {l.status === 'present' ? 'حاضر ✓' : l.status === 'late' ? 'متأخر' : 'مسجل'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* My Requests Track */}
        <Card className="p-5 rounded-3xl border bg-card space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>متابعة طلباتك الأخيرة</span>
            </span>
            <Link to="/my-requests" className="text-[10px] text-indigo-600 hover:underline font-bold">عرض الكل ←</Link>
          </div>

          <div className="space-y-2 text-xs">
            {myRequests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">لم تقم بتقديم طلبات جديدة مؤخراً</div>
            ) : (
              myRequests.slice(0, 5).map((r, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">
                      {r.leave_type ? `إجازة (${r.leave_type})` : `سلفة مالية (${r.amount} ر.س)`}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {r.start_date ? `من ${r.start_date} إلى ${r.end_date}` : `قسط شهري: ${r.monthly_installment} ر.س`}
                    </div>
                  </div>
                  <Badge className={`text-[10px] font-bold ${
                    r.status === 'approved' ? 'bg-emerald-600 text-white' :
                    r.status === 'rejected' ? 'bg-rose-600 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {r.status === 'approved' ? 'معتمد ✓' : r.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* ─── MODAL 1: REQUEST LEAVE ──────────────────────────────────── */}
      <Dialog open={leaveModal} onOpenChange={setLeaveModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>تقديم طلب إجازة جديدة</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">نوع الإجازة:</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm(prev => ({ ...prev, leave_type: v }))}>
                <SelectTrigger className="rounded-xl font-bold text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="إجازة سنوية">إجازة سنوية (مدفوعة)</SelectItem>
                  <SelectItem value="إجازة اضطرارية">إجازة اضطرارية</SelectItem>
                  <SelectItem value="إجازة مرضية">إجازة مرضية (بتقرير طبي)</SelectItem>
                  <SelectItem value="إجازة بدون راتب">إجازة بدون راتب</SelectItem>
                  <SelectItem value="إجازة عمرة / حج">إجازة عمرة / حج</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">تاريخ البداية:</Label>
                <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))} className="rounded-xl text-xs font-bold h-9" />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">تاريخ النهاية:</Label>
                <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))} className="rounded-xl text-xs font-bold h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">سبب الإجازة وملاحظات إضافية:</Label>
              <Input placeholder="اكتب سبب طلب الإجازة..." value={leaveForm.reason} onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))} className="rounded-xl text-xs h-9" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLeaveModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleSubmitLeave} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <Send className="w-3.5 h-3.5" />
              <span>إرسال الطلب للاعتماد</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: REQUEST ADVANCE ────────────────────────────────── */}
      <Dialog open={advanceModal} onOpenChange={setAdvanceModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <Wallet className="w-5 h-5 text-sky-600" />
              <span>تقديم طلب سلفة مالية</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">مبلغ السلفة المطلوب (ر.س):</Label>
                <Input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: Number(e.target.value) }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">القسط الشهري المقترح (ر.س):</Label>
                <Input type="number" value={advanceForm.monthly_installment} onChange={(e) => setAdvanceForm(prev => ({ ...prev, monthly_installment: Number(e.target.value) }))} className="rounded-xl font-mono text-xs font-bold h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">سبب السلفة:</Label>
              <Input placeholder="ظرف طارئ / التزامات أسرية..." value={advanceForm.reason} onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))} className="rounded-xl text-xs h-9" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdvanceModal(false)} className="rounded-xl font-bold text-xs">إلغاء</Button>
            <Button onClick={handleSubmitAdvance} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md gap-1">
              <Send className="w-3.5 h-3.5" />
              <span>إرسال طلب السلفة</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
