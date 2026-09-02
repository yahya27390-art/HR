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
  CalendarDays, Award, Clock4, UserCheck, Scale, FileSignature,
  Eye, Upload, MapPin, Check, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ExecutiveAnnouncementTicker from '@/components/ExecutiveAnnouncementTicker';
import ContractViewerModal from '@/components/ContractViewerModal';
import { getEmployeeContract, initializeUnifiedContracts } from '@/lib/contractsEngine';

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
  const [empContract, setEmpContract] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contract Modal
  const [contractModalOpen, setContractModalOpen] = useState(false);

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
        // Initialize/Load Contracts
        await initializeUnifiedContracts(emps);
        const c = getEmployeeContract(target.employee_number || target.id);
        setEmpContract(c);

        // Attendance Logs
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

    const handleContractUpdate = () => {
      if (currentEmp) {
        const c = getEmployeeContract(currentEmp.employee_number || currentEmp.id);
        setEmpContract(c);
      }
    };

    window.addEventListener('hr_contracts_updated', handleContractUpdate);
    window.addEventListener('hr_contract_signed', handleContractUpdate);
    return () => {
      window.removeEventListener('hr_contracts_updated', handleContractUpdate);
      window.removeEventListener('hr_contract_signed', handleContractUpdate);
    };
  }, [loadData, currentEmp]);

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

  const isContractSigned = Boolean(empContract?.signed_by_employee);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-20 text-right" dir="rtl">
      
      {/* ─── 1. URGENT CONTRACT SIGNING ALERT CARD (HIGH PRIORITY) ─────────── */}
      {empContract && !isContractSigned && (
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/80 border-2 border-amber-500/60 shadow-xl shadow-amber-950/30 text-white animate-pulse-slow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Scale className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-xs">
                    تنبيه إداري إلزامي ⚠️
                  </Badge>
                  <span className="text-xs text-amber-300 font-bold font-mono">
                    {empContract.contract_number}
                  </span>
                </div>
                <h3 className="font-heading font-black text-sm sm:text-base text-white">
                  عقد العمل الرسمي بانتظار قراءتك واعتمادك الإلكتروني
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  يرجى الاطلاع على بنود العقد الموحد والموافقة على الشرط الجزائي ومهلة الإشعار (شهر كامل)، أو رفع وثيقة عقد منصة قوى المعتمدة.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setContractModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs h-11 px-6 rounded-2xl gap-2 shadow-lg shadow-amber-500/20 shrink-0 self-stretch sm:self-auto"
            >
              <FileSignature className="w-4 h-4" />
              <span>قراءة وتوقيع العقد الآن ✍️</span>
            </Button>
          </div>
        </div>
      )}

      {/* ─── 2. VIP EMPLOYEE HERO GREETING CARD ────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#071f16] to-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-2xl border border-emerald-600/30">
        
        {/* Glow Accent Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-emerald-800/30 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 text-slate-950 font-heading font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20 border-2 border-emerald-300/40">
                {(currentEmp?.full_name || user?.full_name || 'م')[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-heading font-black text-white">
                  مرحباً، {currentEmp?.full_name || user?.full_name}
                </h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold py-0.5">
                  بوابة الموظف الذكية ✓
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                <span className="font-semibold text-emerald-300">{currentEmp?.job_title || 'بائع قطع غيار'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {currentEmp?.branch_name || currentEmp?.branch || 'الفرع الرئيسي'}
                </span>
                <span>•</span>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/50">
                  #{currentEmp?.employee_number || '1017'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isContractSigned ? (
              <Button
                size="sm"
                onClick={() => setContractModalOpen(true)}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs rounded-2xl h-10 px-4 gap-1.5 font-bold"
              >
                <FileCheckIcon className="w-4 h-4" />
                <span>عقدي المعتمد A4</span>
              </Button>
            ) : null}

            <Button
              size="sm"
              onClick={() => navigate(`/employees/${currentEmp?.id || currentEmp?.employee_number}`)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-2xl h-10 px-4 font-bold border border-white/10"
            >
              <span>ملفي 360°</span>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            </Button>
          </div>
        </div>

        {/* Quick Employee FinTech Stats Grid */}
        {currentEmp && (
          <div className="relative z-10 mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-slate-800/80 hover:border-emerald-500/40 transition-all text-center">
              <div className="text-[10px] text-slate-400 font-bold">الراتب الأساسي</div>
              <div className="font-black font-mono text-sm sm:text-base mt-1 text-white">
                <MaskedSalary value={currentEmp.salary} />
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-slate-800/80 hover:border-amber-500/40 transition-all text-center">
              <div className="text-[10px] text-slate-400 font-bold">رصيد الإجازات السنوية</div>
              <div className="font-black font-mono text-sm sm:text-base mt-1 text-amber-300">
                21 / 21 يوم
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-slate-800/80 hover:border-sky-500/40 transition-all text-center">
              <div className="text-[10px] text-slate-400 font-bold">الوردية المعتمدة</div>
              <div className="font-bold text-xs mt-1 truncate text-white">
                {currentEmp.shift || 'شفت قياسي'}
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-slate-800/80 hover:border-emerald-500/40 transition-all text-center">
              <div className="text-[10px] text-slate-400 font-bold">طريقة الصرف</div>
              <div className="font-bold text-xs mt-1 text-emerald-300 truncate">
                {currentEmp.payout_method === 'split_bank_cash' ? 'بنك + كاش 🔀' : currentEmp.payout_method === 'cash_full' ? 'كاش نقدي 💵' : 'تحويل بنكي 🏦'}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ─── 3. LIVE SMART ATTENDANCE TERMINAL CARD ─────────────────────────── */}
      <Card className="p-5 sm:p-6 rounded-3xl border bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-heading font-black text-xs sm:text-sm text-foreground">
                حالة دوامك وحضورك اليوم
              </div>
              <div className="text-[10.5px] text-muted-foreground font-mono">
                {todayStr()}
              </div>
            </div>
          </div>

          <Badge className={`text-xs font-bold py-1 px-3 ${
            todayLog?.check_in 
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
          }`}>
            {todayLog?.check_in ? 'مسجل حضور اليوم ✓' : 'لم تسجل بصمة بعد ⏳'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-muted-foreground text-[10.5px] font-bold">بصمة الدخول:</span>
            <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
              {formatPunchTime(todayLog?.check_in) || '--:--'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-muted-foreground text-[10.5px] font-bold">بصمة الخروج:</span>
            <div className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-base mt-0.5">
              {formatPunchTime(todayLog?.check_out) || '--:--'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-muted-foreground text-[10.5px] font-bold">ساعات التواجد:</span>
            <div className="font-mono font-black text-foreground text-base mt-0.5">
              {todayLog?.work_hours ? `${todayLog.work_hours} ساعة` : '--'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-muted-foreground text-[10.5px] font-bold">التأخير المرصود:</span>
            <div className={`font-mono font-black text-base mt-0.5 ${todayLog?.late_minutes ? 'text-rose-600' : 'text-emerald-600'}`}>
              {todayLog?.late_minutes ? `${todayLog.late_minutes} دقيقة` : '0 دقيقة ✓'}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 4. QUICK SELF-SERVICE ACTIONS (LUXURY 6-GRID) ──────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        
        {/* Leave */}
        <button
          type="button"
          onClick={() => setLeaveModal(true)}
          className="p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-slate-900 text-right hover:shadow-lg hover:scale-[1.02] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-foreground text-xs sm:text-sm">طلب إجازة</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">سنوية • اضطرارية</div>
        </button>

        {/* Advance */}
        <button
          type="button"
          onClick={() => setAdvanceModal(true)}
          className="p-3.5 sm:p-4 rounded-2xl border border-sky-200/80 dark:border-sky-900/40 bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-slate-900 text-right hover:shadow-lg hover:scale-[1.02] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-foreground text-xs sm:text-sm">طلب سلفة</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">تقسيط شهري ميسر</div>
        </button>

        {/* Contract & Documents */}
        <button
          type="button"
          onClick={() => setContractModalOpen(true)}
          className="p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-slate-900 text-right hover:shadow-lg hover:scale-[1.02] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Scale className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-foreground text-xs sm:text-sm">عقد العمل</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {isContractSigned ? 'معتمد رسمياً ✓' : 'بانتظار توقيعك ✍️'}
          </div>
        </button>

        {/* Punch Correction */}
        <Link
          to="/my-requests?type=correction"
          className="p-3.5 sm:p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-slate-900 text-right hover:shadow-lg hover:scale-[1.02] transition-all group block"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Clock4 className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-foreground text-xs sm:text-sm">تعديل بصمة</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">نسيان البصمة</div>
        </Link>

        {/* Salary Certificate */}
        <Link
          to="/salary-certificates"
          className="p-3.5 sm:p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-slate-900 text-right hover:shadow-lg hover:scale-[1.02] transition-all group block"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-foreground text-xs sm:text-sm">تعريف بالراتب</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">مشهد موجه للبنوك</div>
        </Link>

        {/* My Requests Track */}
        <Link
          to="/my-requests"
          className="p-3.5 sm:p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-slate-900 text-right hover:shadow-lg hover:scale-[1.02] transition-all group block"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-foreground text-xs sm:text-sm">سجل طلباتي</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">متابعة الموافقات</div>
        </Link>

      </div>

      {/* ─── 5. RECENT LOGS & REQUESTS TRACK ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Recent Attendance Days */}
        <Card className="p-5 rounded-3xl border bg-card space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <span className="font-heading font-black text-xs text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>سجل بصماتك الأخير</span>
            </span>
            <Link to="/attendance" className="text-[10px] text-emerald-600 hover:underline font-bold">عرض السجل الكامل ←</Link>
          </div>

          <div className="space-y-2 text-xs">
            {recentLogs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">لا يوجد سجلات مسجلة مؤخراً</div>
            ) : (
              recentLogs.slice(0, 5).map((l, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border flex items-center justify-between">
                  <div>
                    <div className="font-bold font-mono text-foreground">{l.log_date || l.date}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      دخول: <span className="font-mono text-emerald-600 font-bold">{l.check_in || '--:--'}</span> • خروج: <span className="font-mono text-indigo-600 font-bold">{l.check_out || '--:--'}</span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 text-[10px] font-bold">
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
            <span className="font-heading font-black text-xs text-foreground flex items-center gap-1.5">
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
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">
                      {r.leave_type ? `إجازة (${r.leave_type})` : `سلفة مالية (${r.amount} ر.س)`}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
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

      {/* ─── MODAL 0: CONTRACT VIEWER & DIGITAL SIGNATURE ────────────── */}
      {empContract && (
        <ContractViewerModal
          open={contractModalOpen}
          onOpenChange={setContractModalOpen}
          contract={empContract}
          isEmployeeView={true}
          currentUser={user}
          onContractSigned={(updated) => {
            setEmpContract(updated);
            toast({
              title: '✓ تم توثيق واعتماد العقد بنجاح',
              description: 'تم توثيق العقد رسمياً وإشعار الإدارة والمدير العام.'
            });
          }}
        />
      )}

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

// Icon helper
function FileCheckIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
