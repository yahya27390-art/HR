import { getUnifiedRequests, saveUnifiedRequest } from '@/lib/requestsEngine';
import { MaskedSalary, PrivacyMaskToggle } from '@/lib/FinancialPrivacyContext';
import { cloudSave, initFullCloudSync } from '@/lib/cloudSyncEngine';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList, Plus, Calendar, Clock, CreditCard, FileText,
  CheckCircle2, XCircle, Hourglass, Send, Wallet
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const STATUS_CFG = {
  pending:             { label: 'بانتظار المراجعة', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  hr_approved:         { label: 'اعتمد HR', class: 'bg-sky-100 text-sky-800 border-sky-200' },
  accountant_approved: { label: 'اعتمد المحاسب', class: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  approved:            { label: 'معتمد ✅', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected:            { label: 'مرفوض ❌', class: 'bg-red-100 text-red-800 border-red-200' },
  disbursed:           { label: 'تم الصرف 💰', class: 'bg-purple-100 text-purple-800 border-purple-200' },
};

const defaultAdvForm = { amount: '', installments: '1', reason: '' };
const defaultLeaveForm = { leave_type: 'سنوية', start_date: '', end_date: '', reason: '' };
const defaultCorrForm  = { log_date: '', check_in: '08:00', check_out: '17:00', reason: '' };

export default function MyRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initTab = searchParams.get('type') || 'my_requests';

  const [tab, setTab] = useState(initTab === 'leave' ? 'leave' : initTab === 'advance' ? 'advance' : initTab === 'correction' ? 'correction' : 'my_requests');
  const [empData, setEmpData] = useState(null);

  // Modals
  const [advModal, setAdvModal] = useState(false);
  const [leaveModal, setLeaveModal] = useState(false);
  const [corrModal, setCorrModal] = useState(false);

  // Forms
  const [advForm, setAdvForm]   = useState(defaultAdvForm);
  const [leaveForm, setLeaveForm] = useState(defaultLeaveForm);
  const [corrForm, setCorrForm]   = useState(defaultCorrForm);

  // Load employee data
  useEffect(() => {
    if (!user?.employee_number) return;
    base44.entities.Employee.list().then(emps => {
      setEmpData((emps||[]).find(e => e.employee_number === user.employee_number) || null);
    });
  }, [user]);

  // Load from localStorage
  const loadMyRequests = useCallback(() => {
    const empNum = String(user?.employee_number || '');
    const adv  = JSON.parse(localStorage.getItem('hr_advances_list')||'[]').filter(a => String(a.employee_number||'').trim()===empNum);
    const lv   = JSON.parse(localStorage.getItem('hr_leave_requests')||'[]').filter(l => String(l.employee_number||l.employee_id||'').replace('emp_','').trim()===empNum);
    const cr   = JSON.parse(localStorage.getItem('hr_correction_requests')||'[]').filter(c => String(c.employee_number||'').trim()===empNum);
    return [...adv.map(x=>({...x,_type:'advance'})), ...lv.map(x=>({...x,_type:'leave'})), ...cr.map(x=>({...x,_type:'correction'}))].sort((a,b)=>{
      const da = new Date(a.date||a.start_date||a.log_date||a.created_at||0);
      const db = new Date(b.date||b.start_date||b.log_date||b.created_at||0);
      return db - da;
    });
  }, [user]);

  const [myRequests, setMyRequests] = useState([]);
  useEffect(() => { setMyRequests(loadMyRequests()); }, [loadMyRequests]);

  const submitAdvance = async () => {
    if (!advForm.amount || isNaN(Number(advForm.amount))) { toast({ title: 'الرجاء إدخال مبلغ صحيح', variant: 'destructive' }); return; }
    const installmentsCount = Number(advForm.installments) || 1;
    const amountVal = Number(advForm.amount);
    const req = {
      id: 'adv_' + Date.now(),
      employee_id: empData?.id || user?.id,
      employee_number: user?.employee_number || empData?.employee_number,
      employee_name: user?.full_name || empData?.full_name || 'موظف',
      amount: amountVal,
      installments: installmentsCount,
      monthly_deduction: Math.round(amountVal / installmentsCount),
      reason: advForm.reason || 'سلفة شخصية',
      status: 'pending',
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      repayment_type: installmentsCount > 1 ? 'installments' : 'lump_sum',
    };
    const existing = JSON.parse(localStorage.getItem('hr_advances_list')||'[]');
    const nextAdv = [req, ...existing]; localStorage.setItem('hr_advances_list', JSON.stringify(nextAdv)); localStorage.setItem('hr_flow_employee_advances', JSON.stringify(nextAdv)); await cloudSave('hr_advances_list', nextAdv);
    setAdvModal(false); setAdvForm(defaultAdvForm);
    setMyRequests(loadMyRequests());
    toast({ title: '✅ تم إرسال طلب السلفة بنجاح' });
  };

  const submitLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date) { toast({ title: 'الرجاء تحديد التاريخ', variant: 'destructive' }); return; }
    const req = {
      id: 'lv_' + Date.now(),
      employee_id: empData?.id || user?.id,
      employee_number: user?.employee_number,
      employee_name: user?.full_name,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      reason: leaveForm.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('hr_leave_requests')||'[]');
    const nextLv = [req, ...existing]; localStorage.setItem('hr_leave_requests', JSON.stringify(nextLv)); await cloudSave('hr_leave_requests', nextLv);
    setLeaveModal(false); setLeaveForm(defaultLeaveForm);
    setMyRequests(loadMyRequests());
    toast({ title: '✅ تم إرسال طلب الإجازة بنجاح' });
  };

  const submitCorrection = async () => {
    if (!corrForm.log_date) { toast({ title: 'الرجاء تحديد تاريخ البصمة', variant: 'destructive' }); return; }
    const req = {
      id: 'cr_' + Date.now(),
      employee_id: empData?.id || user?.id,
      employee_number: user?.employee_number,
      employee_name: user?.full_name,
      log_date: corrForm.log_date,
      check_in: corrForm.check_in,
      check_out: corrForm.check_out,
      reason: corrForm.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('hr_correction_requests')||'[]');
    const nextCr = [req, ...existing]; localStorage.setItem('hr_correction_requests', JSON.stringify(nextCr)); await cloudSave('hr_correction_requests', nextCr);
    setCorrModal(false); setCorrForm(defaultCorrForm);
    setMyRequests(loadMyRequests());
    toast({ title: '✅ تم إرسال طلب تعديل البصمة' });
  };

  const typeLabel = { advance: 'سلفة', leave: 'إجازة', correction: 'تعديل بصمة' };
  const typeIcon  = { advance: <CreditCard className="w-3.5 h-3.5" />, leave: <Calendar className="w-3.5 h-3.5" />, correction: <Clock className="w-3.5 h-3.5" /> };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 flex items-center justify-center">
          <ClipboardList className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-black text-foreground">طلباتي</h1>
          <p className="text-xs text-muted-foreground mt-0.5">تقديم ومتابعة الطلبات الوظيفية</p>
        </div>
      </div>

      {/* Quick Submit Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button className="h-14 rounded-2xl flex flex-col gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={()=>{setTab('advance');setAdvModal(true);}}>
          <Wallet className="w-5 h-5" /><span className="text-xs">طلب سلفة</span>
        </Button>
        <Button className="h-14 rounded-2xl flex flex-col gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={()=>{setTab('leave');setLeaveModal(true);}}>
          <Calendar className="w-5 h-5" /><span className="text-xs">طلب إجازة</span>
        </Button>
        <Button className="h-14 rounded-2xl flex flex-col gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold" onClick={()=>{setTab('correction');setCorrModal(true);}}>
          <Clock className="w-5 h-5" /><span className="text-xs">تعديل بصمة</span>
        </Button>
      </div>

      {/* My Requests History */}
      <div>
        <h2 className="font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" /> سجل طلباتي ({myRequests.length})
        </h2>
        {myRequests.length === 0 ? (
          <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لم تقدم أي طلبات بعد</Card>
        ) : (
          <div className="space-y-2">
            {myRequests.map(req => {
              const cfg = STATUS_CFG[req.status] || STATUS_CFG.pending;
              return (
                <Card key={req.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-secondary flex-shrink-0 text-muted-foreground">
                      {typeIcon[req._type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{typeLabel[req._type]}</span>
                        <Badge className={"text-xs border " + cfg.class}>{cfg.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {req._type === 'advance' && <>مبلغ: <span className="font-bold">{Number(req.amount||0).toLocaleString()} ر.س</span> • {req.installments > 1 ? req.installments + ' أقساط' : 'دفعة واحدة'}</>}
                        {req._type === 'leave' && <>{req.leave_type} • من {req.start_date} إلى {req.end_date}</>}
                        {req._type === 'correction' && <>يوم {req.log_date} • {req.check_in} - {req.check_out}</>}
                        {req.reason && <> • {req.reason}</>}
                      </div>
                      {req.rejection_reason && (
                        <div className="text-xs text-red-600 mt-0.5">سبب الرفض: {req.rejection_reason}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(req.date||req.created_at||Date.now()).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Advance Modal */}
      <Dialog open={advModal} onOpenChange={setAdvModal}>
        <DialogContent className="rounded-3xl max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-black">طلب سلفة مالية</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">المبلغ المطلوب (ريال سعودي) *</Label>
              <Input type="number" placeholder="مثال: 2000" value={advForm.amount} onChange={e=>setAdvForm({...advForm,amount:e.target.value})} className="rounded-xl mt-1 h-10" />
            </div>
            <div>
              <Label className="text-xs font-bold">عدد الأقساط</Label>
              <Select value={advForm.installments} onValueChange={v=>setAdvForm({...advForm,installments:v})}>
                <SelectTrigger className="rounded-xl h-10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,6,12].map(n => <SelectItem key={n} value={String(n)}>{n===1?'دفعة واحدة':n+' أقساط'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {advForm.amount && Number(advForm.installments)>1 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 font-bold">
                📊 القسط الشهري: {Math.ceil(Number(advForm.amount)/Number(advForm.installments)).toLocaleString()} ر.س/شهر
              </div>
            )}
            <div>
              <Label className="text-xs font-bold">السبب (اختياري)</Label>
              <Textarea placeholder="سبب طلب السلفة..." value={advForm.reason} onChange={e=>setAdvForm({...advForm,reason:e.target.value})} className="rounded-xl mt-1 min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={()=>setAdvModal(false)}>إلغاء</Button>
            <Button className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5" onClick={submitAdvance}>
              <Send className="w-4 h-4" /> إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Modal */}
      <Dialog open={leaveModal} onOpenChange={setLeaveModal}>
        <DialogContent className="rounded-3xl max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-black">طلب إجازة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">نوع الإجازة</Label>
              <Select value={leaveForm.leave_type} onValueChange={v=>setLeaveForm({...leaveForm,leave_type:v})}>
                <SelectTrigger className="rounded-xl h-10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['سنوية','بدون راتب','عمرة','تعويضية','مرضية','اضطرارية'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">من تاريخ *</Label>
                <Input type="date" value={leaveForm.start_date} onChange={e=>setLeaveForm({...leaveForm,start_date:e.target.value})} className="rounded-xl h-10 mt-1" />
              </div>
              <div>
                <Label className="text-xs font-bold">إلى تاريخ *</Label>
                <Input type="date" value={leaveForm.end_date} onChange={e=>setLeaveForm({...leaveForm,end_date:e.target.value})} className="rounded-xl h-10 mt-1" />
              </div>
            </div>
            {leaveForm.start_date && leaveForm.end_date && (
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-xs text-emerald-800 font-bold">
                📅 المدة: {Math.max(0, Math.ceil((new Date(leaveForm.end_date)-new Date(leaveForm.start_date))/86400000)+1)} يوم
              </div>
            )}
            <div>
              <Label className="text-xs font-bold">السبب (اختياري)</Label>
              <Textarea placeholder="سبب الإجازة..." value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})} className="rounded-xl mt-1 min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={()=>setLeaveModal(false)}>إلغاء</Button>
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5" onClick={submitLeave}>
              <Send className="w-4 h-4" /> إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Correction Modal */}
      <Dialog open={corrModal} onOpenChange={setCorrModal}>
        <DialogContent className="rounded-3xl max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-black">طلب تعديل بصمة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">تاريخ اليوم المطلوب تعديله *</Label>
              <Input type="date" value={corrForm.log_date} onChange={e=>setCorrForm({...corrForm,log_date:e.target.value})} className="rounded-xl h-10 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">وقت الدخول</Label>
                <Input type="time" value={corrForm.check_in} onChange={e=>setCorrForm({...corrForm,check_in:e.target.value})} className="rounded-xl h-10 mt-1 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-bold">وقت الخروج</Label>
                <Input type="time" value={corrForm.check_out} onChange={e=>setCorrForm({...corrForm,check_out:e.target.value})} className="rounded-xl h-10 mt-1 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">سبب التعديل *</Label>
              <Textarea placeholder="مثال: نسيت تسجيل الخروج، خارج المكتب..." value={corrForm.reason} onChange={e=>setCorrForm({...corrForm,reason:e.target.value})} className="rounded-xl mt-1 min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={()=>setCorrModal(false)}>إلغاء</Button>
            <Button className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5" onClick={submitCorrection}>
              <Send className="w-4 h-4" /> إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
