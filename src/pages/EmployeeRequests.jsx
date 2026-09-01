import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  DollarSign,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock3,
  Search,
  Plus,
  Printer,
  ShieldCheck,
  Building2,
  User,
  ArrowRight,
  Send,
  Sparkles,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAdvances, saveAdvance } from '@/lib/payrollEngine';
import AdvanceVoucherA4Modal from '@/components/AdvanceVoucherA4Modal';

export default function EmployeeRequests() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('advances');
  const [advancesSubTab, setAdvancesSubTab] = useState('active'); // 'active' | 'archived'
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  // Data lists
  const [advancesList, setAdvancesList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [correctionRequests, setCorrectionRequests] = useState([]);

  // Modals
  const [newAdvanceOpen, setNewAdvanceOpen] = useState(false);
  const [newLeaveOpen, setNewLeaveOpen] = useState(false);
  const [newCorrectionOpen, setNewCorrectionOpen] = useState(false);

  // Voucher Print Modal
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedAdvanceForVoucher, setSelectedAdvanceForVoucher] = useState(null);

  // Forms
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: '1000',
    repayment_type: 'installments', // 'lump_sum' | 'installments'
    installments_requested: '4',
    reason: '',
  });

  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'سنوية',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [correctionForm, setCorrectionForm] = useState({
    employee_id: '',
    log_date: new Date().toISOString().split('T')[0],
    check_in: '08:00',
    check_out: '16:00',
    reason: 'نسيان تسجيل البصمة بجهاز الفرع',
  });

  // Accountant Finalization Modal State
  const [accountantModalOpen, setAccountantModalOpen] = useState(false);
  const [targetAdvanceForAccountant, setTargetAdvanceForAccountant] = useState(null);
  const [accountantForm, setAccountantForm] = useState({
    total_installments: '4',
    monthly_installment: '250',
    start_month: '2026-09',
    disbursement_date: new Date().toISOString().split('T')[0],
  });

  // Permissions
  const isGeneralManager = user?.job_title?.includes('عام') || user?.employee_number === '1001' || user?.role === 'admin';
  const isHrManager = user?.job_title?.includes('موارد') || user?.employee_number === '1022' || user?.role === 'admin';
  const isAccountant = user?.job_title?.includes('محاسب') || user?.job_title?.includes('مالي') || user?.employee_number === '1005' || user?.role === 'admin';

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, leaves] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.LeaveRequest.list(),
      ]);
      setEmployees(emps || []);
      setLeaveRequests(leaves || []);

      // Load advances from payrollEngine storage
      const advs = getAdvances();
      setAdvancesList(advs || []);

      // Load punch corrections
      try {
        const stored = JSON.parse(localStorage.getItem('hr_flow_punch_corrections') || '[]');
        setCorrectionRequests(stored);
      } catch {
        setCorrectionRequests([]);
      }

      // Default employee selection for current user
      if (emps && emps.length > 0 && !advanceForm.employee_id) {
        const myEmp = emps.find(e => String(e.employee_number) === String(user?.employee_number));
        const defaultId = myEmp ? String(myEmp.id) : String(emps[0].id);
        setAdvanceForm(prev => ({ ...prev, employee_id: defaultId }));
        setLeaveForm(prev => ({ ...prev, employee_id: defaultId }));
        setCorrectionForm(prev => ({ ...prev, employee_id: defaultId }));
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ في تحميل البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.employee_number]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Employee lookup helper
  const empMap = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      map[String(e.id)] = e;
      map[String(e.employee_number)] = e;
      map[e.full_name] = e;
    });
    return map;
  }, [employees]);

  // ==========================================================================
  // 1. ADVANCE REQUESTS HANDLERS
  // ==========================================================================

  // Submit Advance Request
  const handleSubmitAdvance = async () => {
    if (!advanceForm.employee_id || !advanceForm.amount || !advanceForm.reason) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال المبلغ وتوضيح سبب السلفة.', variant: 'destructive' });
      return;
    }

    const emp = empMap[advanceForm.employee_id];
    const amountNum = Number(advanceForm.amount) || 0;

    // Check old active balance
    const oldBalance = advancesList
      .filter(a => String(a.employee_number) === String(emp?.employee_number) && a.status === 'active')
      .reduce((sum, a) => sum + (Number(a.remaining_balance) || 0), 0);

    const newAdv = {
      id: 'adv_req_' + Date.now(),
      voucher_number: `VCH-ADV-2026-${Math.floor(100 + Math.random() * 900)}`,
      employee_id: emp?.id || advanceForm.employee_id,
      employee_number: String(emp?.employee_number || '1000'),
      employee_name: emp?.full_name || 'موظف',
      branch: emp?.branch_name || emp?.branch || 'مكتب الإدارة',
      job_title: emp?.job_title || 'موظف',
      national_id: emp?.national_id || '—',
      total_amount: amountNum,
      repayment_type: advanceForm.repayment_type,
      total_installments: advanceForm.repayment_type === 'lump_sum' ? 1 : Number(advanceForm.installments_requested || 4),
      monthly_installment: Math.round(amountNum / (advanceForm.repayment_type === 'lump_sum' ? 1 : Number(advanceForm.installments_requested || 4))),
      remaining_balance: amountNum,
      paid_amount: 0,
      paid_installments: 0,
      start_month: '2026-09',
      reason: advanceForm.reason,
      status: 'pending_gm_approval', // pending_gm_approval -> approved_pending_accountant -> active -> completed
      previous_balance: oldBalance,
      requested_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    saveAdvance(newAdv);
    setAdvancesList(getAdvances());
    setNewAdvanceOpen(false);

    // Send internal alert notification to GM & HR
    try {
      await base44.entities.Announcement.create({
        title: `طلب سلفة جديدة: ${emp?.full_name} (${amountNum} ر.س)`,
        content: `قدم الموظف ${emp?.full_name} (#${emp?.employee_number}) طلب سلفة مالية بقيمة ${amountNum} ريال سعودي. السبب: ${advanceForm.reason}. يرجى مراجعة الطلب واتخاذ القرار.`,
        priority: 'high',
        target_role: 'admin',
        created_at: new Date().toISOString()
      });
    } catch {}

    toast({
      title: '✓ تم تقديم طلب السلفة بنجاح',
      description: 'تم إرسال إشعار فوري للمدير العام ومدير الموارد البشرية لمراجعة واعتماد الطلب.',
    });
  };

  // General Manager Action (Approve / Reject)
  const handleGmDecision = (advanceId, decision, rejectReason = '') => {
    const adv = advancesList.find(a => a.id === advanceId);
    if (!adv) return;

    if (decision === 'approve') {
      adv.status = 'approved_pending_accountant';
      adv.gm_approval = {
        approved_by: user?.full_name || 'فهد الجوعي (المدير العام)',
        approved_at: new Date().toISOString(),
        note: 'تمت موافقة الإدارة العامة وتحويل الطلب للمحاسب المالي للصرف والجدولة.'
      };
      toast({
        title: '✓ تمت موافقة المدير العام',
        description: 'تم تحويل الطلب تلقائياً للمحاسب المالي (هشام زغلول) لصرف السلفة وجدولة الأقساط.',
      });
    } else {
      adv.status = 'rejected';
      adv.rejection_reason = rejectReason || 'تم رفض الطلب بناءً على تقدير الإدارة العامة.';
      toast({
        title: 'تم رفض طلب السلفة',
        description: 'تم توثيق الرفض وإشعار الموظف بالسبب.',
        variant: 'destructive'
      });
    }

    saveAdvance(adv);
    setAdvancesList(getAdvances());
  };

  // Accountant Action (Finalize Installments & Disburse)
  const handleOpenAccountantModal = (adv) => {
    setTargetAdvanceForAccountant(adv);
    const instCount = adv.total_installments || 4;
    const monthly = Math.round(Number(adv.total_amount) / (instCount || 1));
    setAccountantForm({
      total_installments: String(instCount),
      monthly_installment: String(monthly),
      start_month: adv.start_month || '2026-09',
      disbursement_date: new Date().toISOString().split('T')[0],
    });
    setAccountantModalOpen(true);
  };

  const handleFinalizeDisbursement = () => {
    if (!targetAdvanceForAccountant) return;

    const adv = targetAdvanceForAccountant;
    const totalInst = Number(accountantForm.total_installments) || 1;
    const monthlyInst = Number(accountantForm.monthly_installment) || Math.round(Number(adv.total_amount) / totalInst);

    adv.status = 'active'; // Now active and will be deducted monthly in Payroll
    adv.total_installments = totalInst;
    adv.monthly_installment = monthlyInst;
    adv.start_month = accountantForm.start_month;
    adv.disbursement_date = accountantForm.disbursement_date;
    adv.accountant_approval = {
      approved_by: user?.full_name || 'هشام ابوالفضل زغلول (المحاسب المالي)',
      approved_at: new Date().toISOString(),
    };

    saveAdvance(adv);
    setAdvancesList(getAdvances());
    setAccountantModalOpen(false);

    toast({
      title: '✓ تم اعتماد الصرف وتفعيل جدولة الأقساط بالمسير',
      description: `تم إدراج قسط شهري بقيمة ${monthlyInst} ر.س بدءاً من شهر ${accountantForm.start_month}.`,
    });

    // Auto open A4 print modal
    setSelectedAdvanceForVoucher(adv);
    setVoucherModalOpen(true);
  };

  // ==========================================================================
  // 2. LEAVE REQUESTS HANDLERS
  // ==========================================================================

  const handleSubmitLeave = async () => {
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى تحديد الموظف وتواريخ الإجازة.', variant: 'destructive' });
      return;
    }

    const emp = empMap[leaveForm.employee_id];
    const d1 = new Date(leaveForm.start_date);
    const d2 = new Date(leaveForm.end_date);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

    const leavePayload = {
      id: 'leave_' + Date.now(),
      employee_id: emp?.id || leaveForm.employee_id,
      employee_number: emp?.employee_number || '1000',
      employee_name: emp?.full_name || 'موظف',
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      days_count: days,
      reason: leaveForm.reason,
      status: 'pending', // 'pending', 'approved', 'rejected'
      created_at: new Date().toISOString()
    };

    try {
      await base44.entities.LeaveRequest.create(leavePayload);
      setLeaveRequests(prev => [leavePayload, ...prev]);
      setNewLeaveOpen(false);
      toast({ title: '✓ تم تقديم طلب الإجازة', description: 'الطلب قيد مراجعة واعتماد مدير الموارد البشرية.' });
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  const handleLeaveDecision = async (leaveId, decision) => {
    try {
      const status = decision === 'approve' ? 'approved' : 'rejected';
      await base44.entities.LeaveRequest.update(leaveId, { status });
      setLeaveRequests(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l));
      toast({
        title: decision === 'approve' ? '✓ تم اعتماد الإجازة' : 'تم رفض طلب الإجازة',
        description: `تم تحديث حالة الطلب إلى ${status === 'approved' ? 'معتمد' : 'مرفوض'}.`
      });
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  // ==========================================================================
  // 3. PUNCH CORRECTION HANDLERS
  // ==========================================================================

  const handleSubmitCorrection = () => {
    if (!correctionForm.employee_id || !correctionForm.log_date || !correctionForm.reason) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال التاريخ وسبب التعديل.', variant: 'destructive' });
      return;
    }

    const emp = empMap[correctionForm.employee_id];
    const newCorr = {
      id: 'corr_' + Date.now(),
      employee_id: emp?.id || correctionForm.employee_id,
      employee_number: emp?.employee_number || '1000',
      employee_name: emp?.full_name || 'موظف',
      log_date: correctionForm.log_date,
      check_in: correctionForm.check_in,
      check_out: correctionForm.check_out,
      reason: correctionForm.reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const updated = [newCorr, ...correctionRequests];
    setCorrectionRequests(updated);
    localStorage.setItem('hr_flow_punch_corrections', JSON.stringify(updated));
    setNewCorrectionOpen(false);

    toast({
      title: '✓ تم إرسال طلب تصحيح البصمة',
      description: 'سيتم مراجعة الطلب من مدير الموارد البشرية وتحديث سجل البصمة فور الاعتماد.'
    });
  };

  const handleCorrectionDecision = async (corrId, decision) => {
    const corr = correctionRequests.find(c => c.id === corrId);
    if (!corr) return;

    if (decision === 'approve') {
      corr.status = 'approved';
      // Automatically save to Supabase attendance_logs!
      try {
        const emp = empMap[corr.employee_id] || empMap[corr.employee_number];
        await base44.entities.AttendanceLog.create({
          id: 'att_corr_' + Date.now(),
          employee_id: emp?.id || corr.employee_id,
          employee_name: emp?.full_name || corr.employee_name,
          log_date: corr.log_date,
          check_in: corr.check_in ? `${corr.log_date}T${corr.check_in}:00` : null,
          check_out: corr.check_out ? `${corr.log_date}T${corr.check_out}:00` : null,
          status: 'present',
          notes: JSON.stringify({
            employee_number: emp?.employee_number || corr.employee_number,
            total_hours: 8,
            timestamp_raw: `${corr.check_in}:00 -- ${corr.check_out}:00`,
            period_1_in: corr.check_in,
            period_1_out: corr.check_out,
            correction_request_id: corr.id,
            manual_edit_by: user?.full_name || 'مدير الموارد البشرية',
            manual_edit_at: new Date().toISOString()
          })
        });
      } catch (e) {
        console.error('Error auto-syncing approved correction to attendance_logs:', e);
      }
      toast({ title: '✓ تم اعتماد تصحيح البصمة وتحديث السجل السحابي' });
    } else {
      corr.status = 'rejected';
      toast({ title: 'تم رفض طلب تصحيح البصمة', variant: 'destructive' });
    }

    const updated = correctionRequests.map(c => c.id === corrId ? corr : c);
    setCorrectionRequests(updated);
    localStorage.setItem('hr_flow_punch_corrections', JSON.stringify(updated));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* ─── HEADER BANNER ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-xl text-foreground">
              بوابة طلبات الموظفين والخدمة الذاتية
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة وإرسال طلبات الإجازات، وتصحيح البصمات، وسير عمل طلبات السلف المالية والاعتمادات.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setNewAdvanceOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold gap-1.5 h-10 px-4 shadow-md shadow-emerald-600/20"
          >
            <DollarSign className="w-4 h-4" />
            <span>+ طلب سلفة مالية</span>
          </Button>

          <Button
            onClick={() => setNewLeaveOpen(true)}
            variant="outline"
            className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4"
          >
            <Calendar className="w-4 h-4" />
            <span>+ طلب إجازة</span>
          </Button>

          <Button
            onClick={() => setNewCorrectionOpen(true)}
            variant="outline"
            className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4"
          >
            <Clock className="w-4 h-4" />
            <span>+ تعديل بصمة</span>
          </Button>
        </div>
      </div>

      {/* ─── TABS NAVIGATION ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1.5 rounded-2xl h-auto grid grid-cols-3 max-w-xl">
          <TabsTrigger value="advances" className="rounded-xl py-2.5 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>طلبات السلف والاعتمادات ({advancesList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl py-2.5 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>طلبات الإجازات ({leaveRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="corrections" className="rounded-xl py-2.5 text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>تصحيح البصمات ({correctionRequests.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: ADVANCES & LOANS WORKFLOW
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="advances" className="space-y-6">
          
          {/* Workflow Explanation Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 rounded-3xl border-border/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono text-xs flex items-center justify-center font-bold">1</span>
                <h4 className="font-heading font-bold text-xs text-foreground">تقديم طلب السلفة</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يحدد الموظف المبلغ المطلوب (مثلاً: 1000 ر.س) وطريقة السداد وسبب السلفة، مع إشعار فوري للمدير العام والـ HR.
              </p>
            </Card>

            <Card className="p-4 rounded-3xl border-border/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs flex items-center justify-center font-bold">2</span>
                <h4 className="font-heading font-bold text-xs text-foreground">اعتماد المدير العام</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يقوم المدير العام بمراجعة السلفة والموافقة عليها أو رفضها، وعند القبول تتحول تلقائياً للمحاسب المالي للصرف.
              </p>
            </Card>

            <Card className="p-4 rounded-3xl border-border/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs flex items-center justify-center font-bold">3</span>
                <h4 className="font-heading font-bold text-xs text-foreground">الصرف وجدولة المحاسب A4</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يفحص المحاسب السلف القديمة، ويحدد الأقساط الشهرية لخصمها بالمسير، ويطبع سند الصرف الرسمي A4.
              </p>
            </Card>
          </div>

          {/* Advances Table Card */}
          <Card className="p-6 rounded-3xl border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  سجل طلبات السلف وسير الموافقات
                </h3>
                <p className="text-xs text-muted-foreground">
                  قائمة بجميع طلبات السلف وحالاتها ومراحل الاعتماد
                </p>
              </div>

              <Button
                onClick={() => setNewAdvanceOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>تقديم طلب جديد</span>
              </Button>
            </div>

            {advancesList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p>لا توجد طلبات سلف مسجلة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold">
                      <th className="py-3 px-3">رقم السند</th>
                      <th className="py-3 px-3">الموظف</th>
                      <th className="py-3 px-3">المبلغ المطلوب</th>
                      <th className="py-3 px-3">طريقة السداد</th>
                      <th className="py-3 px-3">السبب</th>
                      <th className="py-3 px-3">سلف سابقة</th>
                      <th className="py-3 px-3">الحالة والمرحلة</th>
                      <th className="py-3 px-3 text-center">الإجراءات والاعتمادات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {advancesList.filter(a => advancesSubTab === 'active' ? ((Number(a.remaining_balance) || 0) > 0 && a.status !== 'completed') : ((Number(a.remaining_balance) || 0) <= 0 || a.status === 'completed')).map((adv) => {
                      const emp = empMap[adv.employee_id] || empMap[adv.employee_number] || {};
                      
                      return (
                        <tr key={adv.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {adv.voucher_number || adv.id?.slice(0, 10)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-heading font-bold text-foreground">{adv.employee_name || emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{adv.employee_number || emp.employee_number} — {emp.job_title || 'موظف'}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-emerald-600 text-sm">
                            {Number(adv.total_amount).toLocaleString('en-US')} ر.س
                          </td>
                          <td className="py-3 px-3">
                            {adv.repayment_type === 'lump_sum' ? (
                              <Badge variant="outline" className="text-[10px] font-bold">دفعة واحدة</Badge>
                            ) : (
                              <div className="text-[11px] font-bold">
                                <span>{adv.total_installments || 4} أقساط</span>
                                <div className="text-[10px] text-rose-600 font-mono">({adv.monthly_installment || Math.round(adv.total_amount / 4)} ر.س / شهر)</div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-[11px] text-muted-foreground" title={adv.reason}>
                            {adv.reason || 'سلفة شخصية'}
                          </td>
                          <td className="py-3 px-3">
                            {adv.previous_balance > 0 ? (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-mono text-[10px] font-bold">
                                {adv.previous_balance.toLocaleString('en-US')} ر.س
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[10px]">لا يوجد ✓</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {adv.status === 'pending_gm_approval' && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold gap-1">
                                <Clock3 className="w-3 h-3" />
                                <span>1. قيد موافقة المدير العام</span>
                              </Badge>
                            )}
                            {adv.status === 'approved_pending_accountant' && (
                              <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] font-bold gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>2. بانتظار جدولة المحاسب</span>
                              </Badge>
                            )}
                            {adv.status === 'active' && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>معتمد وجاري الخصم بالمسير</span>
                              </Badge>
                            )}
                            {adv.status === 'rejected' && (
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold gap-1">
                                <XCircle className="w-3 h-3" />
                                <span>مرفوض</span>
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* GM Decision Buttons */}
                              {adv.status === 'pending_gm_approval' && isGeneralManager && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleGmDecision(adv.id, 'approve')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>موافقة</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGmDecision(adv.id, 'reject')}
                                    className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>رفض</span>
                                  </Button>
                                </>
                              )}

                              {/* Accountant Finalize Button */}
                              {adv.status === 'approved_pending_accountant' && isAccountant && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenAccountantModal(adv)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1 shadow-sm"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>صرف وجدولة الأقساط</span>
                                </Button>
                              )}

                              {/* Print A4 Voucher Button */}
                              {(adv.status === 'active' || adv.status === 'approved_pending_accountant') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAdvanceForVoucher(adv);
                                    setVoucherModalOpen(true);
                                  }}
                                  className="rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1 border-slate-300"
                                >
                                  <Printer className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                                  <span>طباعة سند A4</span>
                                </Button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: LEAVE REQUESTS
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="leaves" className="space-y-6">
          <Card className="p-6 rounded-3xl border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  سجل طلبات الإجازات وحالاتها
                </h3>
                <p className="text-xs text-muted-foreground">
                  متابعة الإجازات السنوية، المرضية، والاضطرارية
                </p>
              </div>

              <Button
                onClick={() => setNewLeaveOpen(true)}
                className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ تقديم طلب إجازة</span>
              </Button>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p>لا توجد طلبات إجازة مسجلة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold">
                      <th className="py-3 px-3">الموظف</th>
                      <th className="py-3 px-3">نوع الإجازة</th>
                      <th className="py-3 px-3">من تاريخ</th>
                      <th className="py-3 px-3">إلى تاريخ</th>
                      <th className="py-3 px-3">عدد الأيام</th>
                      <th className="py-3 px-3">السبب / الملاحظات</th>
                      <th className="py-3 px-3">الحالة</th>
                      <th className="py-3 px-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {leaveRequests.map((leave) => {
                      const emp = empMap[leave.employee_id] || empMap[leave.employee_number] || {};
                      
                      return (
                        <tr key={leave.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-heading font-bold text-foreground">{leave.employee_name || emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{leave.employee_number || emp.employee_number}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="font-bold text-[10px]">{leave.leave_type || 'سنوية'}</Badge>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{leave.start_date}</td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{leave.end_date}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">{leave.days_count || 1} يوم</td>
                          <td className="py-3 px-3 max-w-xs truncate text-[11px] text-muted-foreground">{leave.reason || 'إجازة اعتيادية'}</td>
                          <td className="py-3 px-3">
                            {leave.status === 'approved' && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">معتمد ✓</Badge>
                            )}
                            {leave.status === 'pending' && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">قيد المراجعة ⏳</Badge>
                            )}
                            {leave.status === 'rejected' && (
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold">مرفوض ❌</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {leave.status === 'pending' && (isHrManager || isGeneralManager) && (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleLeaveDecision(leave.id, 'approve')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>اعتماد</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLeaveDecision(leave.id, 'reject')}
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>رفض</span>
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: PUNCH CORRECTION REQUESTS
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="corrections" className="space-y-6">
          <Card className="p-6 rounded-3xl border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  سجل طلبات تعديل وتصحيح البصمات
                </h3>
                <p className="text-xs text-muted-foreground">
                  تعديل البصمات المنسية أو الأعذار الميدانية واعتمادها المباشر في سجلات الدوام السحابية
                </p>
              </div>

              <Button
                onClick={() => setNewCorrectionOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ طلب تعديل بصمة</span>
              </Button>
            </div>

            {correctionRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p>لا توجد طلبات تصحيح بصمة مسجلة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold">
                      <th className="py-3 px-3">الموظف</th>
                      <th className="py-3 px-3">تاريخ اليوم</th>
                      <th className="py-3 px-3">وقت الحضور المعدل</th>
                      <th className="py-3 px-3">وقت الانصراف المعدل</th>
                      <th className="py-3 px-3">السبب / العذر</th>
                      <th className="py-3 px-3">الحالة</th>
                      <th className="py-3 px-3 text-center">الإجراء والاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {correctionRequests.map((corr) => {
                      const emp = empMap[corr.employee_id] || empMap[corr.employee_number] || {};
                      
                      return (
                        <tr key={corr.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-heading font-bold text-foreground">{corr.employee_name || emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{corr.employee_number || emp.employee_number}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">{corr.log_date}</td>
                          <td className="py-3 px-3 font-mono text-emerald-600 font-bold">{corr.check_in || '—'}</td>
                          <td className="py-3 px-3 font-mono text-indigo-600 font-bold">{corr.check_out || '—'}</td>
                          <td className="py-3 px-3 max-w-xs truncate text-[11px] text-muted-foreground">{corr.reason}</td>
                          <td className="py-3 px-3">
                            {corr.status === 'approved' && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">معتمد وموثق ✓</Badge>
                            )}
                            {corr.status === 'pending' && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">قيد الاعتماد ⏳</Badge>
                            )}
                            {corr.status === 'rejected' && (
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold">مرفوض ❌</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {corr.status === 'pending' && (isHrManager || isGeneralManager) && (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleCorrectionDecision(corr.id, 'approve')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>اعتماد وتوثيق</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCorrectionDecision(corr.id, 'reject')}
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-7 px-2.5 gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>رفض</span>
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: NEW ADVANCE REQUEST
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={newAdvanceOpen} onOpenChange={setNewAdvanceOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <span>تقديم طلب سلفة مالية جديدة</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">الموظف صاحب الطلب *:</Label>
              <Select 
                value={advanceForm.employee_id} 
                onValueChange={(v) => setAdvanceForm(prev => ({ ...prev, employee_id: v }))}
              >
                <SelectTrigger className="rounded-xl text-xs font-bold h-10">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-60">
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)} className="text-xs font-bold py-2">
                      {e.full_name} (#{e.employee_number}) — {e.branch_name || 'مكتب الإدارة'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">المبلغ المطلوب (ريال سعودي) *:</Label>
                <Input 
                  type="number" 
                  value={advanceForm.amount} 
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="مثال: 1000"
                  className="rounded-xl font-mono text-xs font-bold h-10 text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">طريقة سداد السلفة:</Label>
                <Select 
                  value={advanceForm.repayment_type} 
                  onValueChange={(v) => setAdvanceForm(prev => ({ ...prev, repayment_type: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs font-bold h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="installments">تقسيط على دفعات شهرية</SelectItem>
                    <SelectItem value="lump_sum">دفعة واحدة من الراتب القادم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {advanceForm.repayment_type === 'installments' && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-foreground">عدد الأقساط المقترحة (تترك للمحاسب للموافقة):</span>
                  <span className="font-mono font-bold text-emerald-600">{advanceForm.installments_requested} شهور</span>
                </div>
                <Select 
                  value={advanceForm.installments_requested} 
                  onValueChange={(v) => setAdvanceForm(prev => ({ ...prev, installments_requested: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs font-bold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="2">على شهرين (قسطين)</SelectItem>
                    <SelectItem value="3">على 3 أشهر (3 أقساط)</SelectItem>
                    <SelectItem value="4">على 4 أشهر (4 أقساط)</SelectItem>
                    <SelectItem value="5">على 5 أشهر (5 أقساط)</SelectItem>
                    <SelectItem value="10">على 10 أشهر (10 أقساط)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="font-bold">سبب السلفة والتفاصيل *:</Label>
              <Textarea 
                value={advanceForm.reason} 
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="يرجى كتابة سبب طلب السلفة والظرف الطارئ بالتفصيل..."
                className="rounded-2xl text-xs resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNewAdvanceOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitAdvance} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الطلب للاعتماد 🚀</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: ACCOUNTANT DISBURSEMENT & INSTALLMENTS FINALIZATION
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={accountantModalOpen} onOpenChange={setAccountantModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <span>اعتماد الصرف المالي وجدولة الأقساط (المحاسب المالي)</span>
            </DialogTitle>
          </DialogHeader>

          {targetAdvanceForAccountant && (
            <div className="space-y-4 py-2 text-xs">
              
              {/* Employee & Amount Summary */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <div className="font-heading font-black text-sm text-indigo-950 dark:text-indigo-200">
                    {targetAdvanceForAccountant.employee_name} (#{targetAdvanceForAccountant.employee_number})
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                    السبب: {targetAdvanceForAccountant.reason}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-bold">المبلغ المعتمد:</div>
                  <div className="font-mono font-black text-base text-emerald-600">
                    {Number(targetAdvanceForAccountant.total_amount).toLocaleString('en-US')} ر.س
                  </div>
                </div>
              </div>

              {/* Previous Balance Warning */}
              {targetAdvanceForAccountant.previous_balance > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-[11px]">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>تنبيه: رصيد سلف قديمة غير مسددة على الموظف:</span>
                  </span>
                  <span className="font-mono font-black text-amber-950">
                    {targetAdvanceForAccountant.previous_balance.toLocaleString('en-US')} ر.س
                  </span>
                </div>
              )}

              {/* Installments Setup */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">عدد الأقساط المعتمدة:</Label>
                  <Select 
                    value={accountantForm.total_installments} 
                    onValueChange={(v) => {
                      const monthly = Math.round(Number(targetAdvanceForAccountant.total_amount) / (Number(v) || 1));
                      setAccountantForm(prev => ({
                        ...prev,
                        total_installments: v,
                        monthly_installment: String(monthly)
                      }));
                    }}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="1">دفعة واحدة (شهر واحد)</SelectItem>
                      <SelectItem value="2">على شهرين (قسطين)</SelectItem>
                      <SelectItem value="3">على 3 أشهر</SelectItem>
                      <SelectItem value="4">على 4 أشهر</SelectItem>
                      <SelectItem value="5">على 5 أشهر</SelectItem>
                      <SelectItem value="6">على 6 أشهر</SelectItem>
                      <SelectItem value="10">على 10 أشهر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold">قيمة القسط الشهري (ر.س):</Label>
                  <Input 
                    type="number" 
                    value={accountantForm.monthly_installment} 
                    onChange={(e) => setAccountantForm(prev => ({ ...prev, monthly_installment: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9 text-rose-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">شهر بدء الخصم من الراتب:</Label>
                  <Input 
                    type="month" 
                    value={accountantForm.start_month} 
                    onChange={(e) => setAccountantForm(prev => ({ ...prev, start_month: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-bold">تاريخ صرف السلفة:</Label>
                  <Input 
                    type="date" 
                    value={accountantForm.disbursement_date} 
                    onChange={(e) => setAccountantForm(prev => ({ ...prev, disbursement_date: e.target.value }))}
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAccountantModalOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button 
              onClick={handleFinalizeDisbursement} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد الصرف والجدولة وطباعة A4 💵</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: NEW LEAVE REQUEST
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <span>تقديم طلب إجازة جديد</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">الموظف *:</Label>
              <Select 
                value={leaveForm.employee_id} 
                onValueChange={(v) => setLeaveForm(prev => ({ ...prev, employee_id: v }))}
              >
                <SelectTrigger className="rounded-xl text-xs font-bold h-10">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-60">
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)} className="text-xs font-bold py-2">
                      {e.full_name} (#{e.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">نوع الإجازة:</Label>
              <Select 
                value={leaveForm.leave_type} 
                onValueChange={(v) => setLeaveForm(prev => ({ ...prev, leave_type: v }))}
              >
                <SelectTrigger className="rounded-xl text-xs font-bold h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="سنوية">إجازة سنوية اعتيادية</SelectItem>
                  <SelectItem value="مرضية">إجازة مرضية (بتقرير طبي)</SelectItem>
                  <SelectItem value="اضطرارية">إجازة اضطرارية</SelectItem>
                  <SelectItem value="بدون راتب">إجازة بدون راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">من تاريخ *:</Label>
                <Input 
                  type="date" 
                  value={leaveForm.start_date} 
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="rounded-xl font-mono text-xs font-bold h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">إلى تاريخ *:</Label>
                <Input 
                  type="date" 
                  value={leaveForm.end_date} 
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="rounded-xl font-mono text-xs font-bold h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">السبب والتفاصيل:</Label>
              <Textarea 
                value={leaveForm.reason} 
                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="سبب الإجازة..."
                className="rounded-2xl text-xs resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNewLeaveOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitLeave} 
              className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>إرسال طلب الإجازة 🏖️</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: NEW PUNCH CORRECTION REQUEST
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={newCorrectionOpen} onOpenChange={setNewCorrectionOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <span>تقديم طلب تعديل وتصحيح بصمة</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">الموظف *:</Label>
              <Select 
                value={correctionForm.employee_id} 
                onValueChange={(v) => setCorrectionForm(prev => ({ ...prev, employee_id: v }))}
              >
                <SelectTrigger className="rounded-xl text-xs font-bold h-10">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-60">
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.id)} className="text-xs font-bold py-2">
                      {e.full_name} (#{e.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">تاريخ يوم البصمة *:</Label>
              <Input 
                type="date" 
                value={correctionForm.log_date} 
                onChange={(e) => setCorrectionForm(prev => ({ ...prev, log_date: e.target.value }))}
                className="rounded-xl font-mono text-xs font-bold h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">وقت الحضور الفعلي:</Label>
                <Input 
                  type="time" 
                  value={correctionForm.check_in} 
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, check_in: e.target.value }))}
                  className="rounded-xl font-mono text-xs font-bold h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">وقت الانصراف الفعلي:</Label>
                <Input 
                  type="time" 
                  value={correctionForm.check_out} 
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, check_out: e.target.value }))}
                  className="rounded-xl font-mono text-xs font-bold h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">سبب التعديل / العذر الإداري *:</Label>
              <Textarea 
                value={correctionForm.reason} 
                onChange={(e) => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="مثال: نسيان البصمة / عطل بجهاز الفرع / مهمة عمل خارجية..."
                className="rounded-2xl text-xs resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNewCorrectionOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitCorrection} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>إرسال طلب التصحيح 🕒</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 5: A4 ADVANCE DISBURSEMENT VOUCHER PRINT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedAdvanceForVoucher && (
        <AdvanceVoucherA4Modal
          open={voucherModalOpen}
          onOpenChange={setVoucherModalOpen}
          advance={selectedAdvanceForVoucher}
          employee={empMap[selectedAdvanceForVoucher.employee_id] || empMap[selectedAdvanceForVoucher.employee_number]}
        />
      )}

    </div>
  );
}
