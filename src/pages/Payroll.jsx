import { initFullCloudSync } from '@/lib/cloudSyncEngine';
import { MaskedSalary, PrivacyMaskToggle } from '@/lib/FinancialPrivacyContext';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Wallet, Download, Printer, CheckCircle2, Clock, AlertTriangle, Coins,
  Eye, FileSpreadsheet, ShieldCheck, Users, CalendarCheck, CalendarDays, Calendar, History,
  Filter, Search, X, Edit3, Check, XCircle, Gift, AlertOctagon,
  CreditCard, PlusCircle, Trash2, ChevronRight, ChevronLeft,
  FileText, CheckSquare, Sparkles, Building2, UserCheck, UserX, LayoutGrid,
  SlidersHorizontal, Lock, Unlock, Archive, ArrowRight, ArrowLeft,
  Briefcase, DollarSign, ArrowUpRight, ArrowDownRight, Award, Fingerprint, Sun, Coffee, Moon
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  computeEmployeePayroll,
  getStandardShiftPunches,
  isFriday,
  getPayrollSettings,
  saveShortfallApproval,
  saveAbsenceApproval,
  getAbsenceApproval,
  getAuditLog,
  formatMinutes,
  formatHours,
  normalizeAdvance,
  deleteAdvance,
  saveMonthlyAdvanceOverride,
  getMonthlyAdvanceOverride,
  commitMonthlyAdvanceDeductions,
  getAdvances,
  saveAdvance,
  recordAdvanceInstallmentPayment,
  recordAdvanceRepayment,
  getAdjustments,
  saveAdjustment,
  deleteAdjustment,
  getEmployeeActiveAdvance,
  getActiveAdvanceForEmployee,
  getLockedMonthlyPayrolls,
  getLockedMonthlyPayroll,
  saveLockedMonthlyPayroll,
  unlockMonthlyPayroll,
  isMonthLocked
} from '@/lib/payrollEngine';
import PayslipPrint from '@/components/PayslipPrint';
import AdvancePrintModal from '@/components/AdvancePrintModal';
import BiometricsPrintModal from '@/components/BiometricsPrintModal';

// Clean Western English digits formatter
const fmtNum = (n, decimals = 2) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};


// ─── Payroll Run Lifecycle Banner ───────────────────────────────────────────
const PAYROLL_RUN_STATUS = {
  draft:        { label: 'مسودة',          icon: '📝', color: 'bg-slate-100 text-slate-700 border-slate-200', btnLabel: 'إرسال للمراجعة',  btnColor: 'bg-sky-600 hover:bg-sky-700 text-white',    nextStatus: 'under_review',  permission: 'payroll.create' },
  under_review: { label: 'تحت المراجعة',   icon: '🔍', color: 'bg-sky-100 text-sky-700 border-sky-200',     btnLabel: 'اعتماد المسير',   btnColor: 'bg-amber-600 hover:bg-amber-700 text-white', nextStatus: 'approved',      permission: 'payroll.approve' },
  approved:     { label: 'معتمد',           icon: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', btnLabel: 'تسجيل الدفع',  btnColor: 'bg-purple-600 hover:bg-purple-700 text-white', nextStatus: 'paid',       permission: 'payroll.approve' },
  paid:         { label: 'تم الصرف',        icon: '💰', color: 'bg-purple-100 text-purple-700 border-purple-200', btnLabel: 'إغلاق المسير',  btnColor: 'bg-rose-600 hover:bg-rose-700 text-white',   nextStatus: 'closed',       permission: 'payroll.close' },
  closed:       { label: 'مغلق',            icon: '🔒', color: 'bg-rose-100 text-rose-700 border-rose-200',  btnLabel: null,              btnColor: '',                                             nextStatus: null,            permission: null },
};

function PayrollRunBanner({ month, year, user }) {
  const STORAGE_KEY = 'payroll_runs_v1';
  const runId = 'pr_' + year + '_' + month;

  const [run, setRun] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved[runId] || { id: runId, status: 'draft', created_by: user?.full_name, history: [] };
    } catch(e) {
      return { id: runId, status: 'draft', created_by: user?.full_name, history: [] };
    }
  });

  const [showHistory, setShowHistory] = React.useState(false);

  const saveRun = (newRun) => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      saved[runId] = newRun;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setRun(newRun);
    } catch(e) {}
  };

  const advance = () => {
    const cfg = PAYROLL_RUN_STATUS[run.status];
    if (!cfg || !cfg.nextStatus) return;
    if (!hasPermission(user, cfg.permission)) {
      alert('ليس لديك صلاحية لهذه العملية');
      return;
    }
    const now = new Date().toISOString();
    const entry = { from: run.status, to: cfg.nextStatus, by: user?.full_name, at: now };
    const updated = { ...run, status: cfg.nextStatus, history: [...(run.history || []), entry], last_updated_at: now, last_updated_by: user?.full_name };
    if (cfg.nextStatus === 'approved') updated.approved_by = user?.full_name;
    if (cfg.nextStatus === 'paid') updated.paid_at = now;
    if (cfg.nextStatus === 'closed') updated.closed_at = now;
    saveRun(updated);
  };

  const cfg = PAYROLL_RUN_STATUS[run.status] || PAYROLL_RUN_STATUS.draft;
  const statusSteps = ['draft', 'under_review', 'approved', 'paid', 'closed'];
  const currentIdx = statusSteps.indexOf(run.status);

  return (
    <div className={"rounded-2xl border p-3 mb-4 " + cfg.color}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Steps */}
        <div className="flex items-center gap-1 flex-1 flex-wrap">
          {statusSteps.map((s, i) => {
            const sCfg = PAYROLL_RUN_STATUS[s];
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <React.Fragment key={s}>
                <div className={[
                  "flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border",
                  isDone ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  isCurrent ? cfg.color : 'bg-slate-50 text-slate-400 border-slate-200'
                ].join(' ')}>
                  <span>{isDone ? '✓' : sCfg.icon}</span>
                  <span>{sCfg.label}</span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={"w-4 h-0.5 rounded " + (isDone ? 'bg-emerald-400' : 'bg-slate-200')} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {run.history && run.history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} className="text-xs underline text-muted-foreground hover:text-foreground">
              سجل المراحل ({run.history.length})
            </button>
          )}
          {cfg.btnLabel && hasPermission(user, cfg.permission) && (
            <button onClick={advance} className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + cfg.btnColor}>
              {cfg.btnLabel}
            </button>
          )}
          {run.status === 'closed' && (
            <span className="text-xs text-muted-foreground font-mono">أُغلق: {run.closed_at ? new Date(run.closed_at).toLocaleDateString('ar-SA') : '—'}</span>
          )}
        </div>
      </div>

      {/* History dropdown */}
      {showHistory && run.history && run.history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20 space-y-1.5">
          <div className="text-xs font-black mb-2">سجل مراحل المسير:</div>
          {run.history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{new Date(h.at).toLocaleString('ar-SA')}</span>
              <span className="font-bold">{h.by}</span>
              <span className="text-muted-foreground">نقل من {PAYROLL_RUN_STATUS[h.from]?.label} إلى {PAYROLL_RUN_STATUS[h.to]?.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Payroll() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canApprovePayroll = hasPermission(user, 'payroll.approve');
  const canCreatePayroll  = hasPermission(user, 'payroll.create');
  const canClosePayroll   = hasPermission(user, 'payroll.close');
  const isAdmin = user?.role === 'admin' || user?.email?.includes('admin') || true;

  // Main Mode: 'wizard' (4 stages) vs 'archive' (past locked months)
  const [mainView, setMainView] = useState('wizard');
  
  // Current Workflow Stage: 1: Biometrics, 2: Deductions, 3: Earnings, 4: Final Review & Lock
    const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stageParam = searchParams.get('stage');
  const tabParam = searchParams.get('tab');

  // Reactive currentStep directly derived from URL query parameters (?stage=1..5)
  const currentStep = useMemo(() => {
    if (tabParam === 'archive' || stageParam === '5') return 5;
    if (stageParam === '2') return 2;
    if (stageParam === '3') return 3;
    if (stageParam === '4') return 4;
    return 1;
  }, [stageParam, tabParam]);

  const handleStepChange = useCallback((stepNum) => {
    navigate(`/payroll?stage=${stepNum}`);
  }, [navigate]);
  
  const [monthPrefix, setMonthPrefix] = useState('2026-08');
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Department / Branch and Employee for Stages 1, 2, 3
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');

  // Lock status
  const [isLocked, setIsLocked] = useState(false);
  const [lockConfirmModal, setLockConfirmModal] = useState(false);
  const [unlockModal, setUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [lockedArchives, setLockedArchives] = useState([]);

  // Modals & Dialogs
  const [selectedForPayslip, setSelectedForPayslip] = useState(null);
  const [selectedForBioPrint, setSelectedForBioPrint] = useState(null);
  const [editPunchModal, setEditPunchModal] = useState(null); // { log, emp }
  const [approvalModal, setApprovalModal] = useState(null);

  // New Advance / Loan Form
  const [newAdvanceModal, setNewAdvanceModal] = useState(false);
  const [selectedAdvanceForPrint, setSelectedAdvanceForPrint] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    employee_number: '',
    total_amount: 3000,
    paid_amount: 0,
    monthly_installment: 500,
    total_installments: 6,
    start_month: '2026-08',
    reason: 'رصيد سلفة قديمة مستحقة',
    approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
  });

  // New Adjustment Form
  const [newAdjModal, setNewAdjModal] = useState(false);
  const [adjType, setAdjType] = useState('bonus');
  const [adjForm, setAdjForm] = useState({
    employee_number: '',
    type: 'bonus',
    category: 'sales_incentive',
    amount: 500,
    days_count: 1,
    month_prefix: '2026-08',
    reason: '',
    approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
  });

  const [advancesList, setAdvancesList] = useState([]);
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [overrideTrigger, setOverrideTrigger] = useState(0);
  const [isEditingAdvance, setIsEditingAdvance] = useState(false);
  const [customAdvanceAmount, setCustomAdvanceAmount] = useState('');
  const [isEditingAbsence, setIsEditingAbsence] = useState(false);
  const [customAbsenceAmount, setCustomAbsenceAmount] = useState('');
  const [isEditingShortfall, setIsEditingShortfall] = useState(false);
  const [customShortfallAmount, setCustomShortfallAmount] = useState('');

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await initFullCloudSync().catch(() => {});
      const [emps, logs, shs] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 2000),
        base44.entities.Shift.list(),
      ]);
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
      setShifts(shs || []);
      setAdvancesList(getAdvances());
      setAdjustmentsList(getAdjustments());
      setAuditLogs(getAuditLog());
      setLockedArchives(getLockedMonthlyPayrolls());
      
      const locked = isMonthLocked(monthPrefix);
      setIsLocked(locked);

      if (emps && emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(String(emps[0].employee_number || emps[0].id));
      }
    } catch (e) {
      console.error('Failed to load payroll data:', e);
      toast({ title: 'حدث خطأ في تحميل البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [monthPrefix, toast]);

  useEffect(() => {
    loadData();
    const handleEmpUpdate = () => loadData();
    window.addEventListener('hr_employee_updated', handleEmpUpdate);
    return () => window.removeEventListener('hr_employee_updated', handleEmpUpdate);
  }, [loadData]);

  // Check lock status when monthPrefix changes
  useEffect(() => {
    setIsLocked(isMonthLocked(monthPrefix));
  }, [monthPrefix]);

  const settings = useMemo(() => getPayrollSettings(), []);

  // Compute all employee payrolls
  const allPayrolls = useMemo(() => {
    if (!employees.length) return [];
    
    // If month is locked, read from locked snapshot
    if (isLocked) {
      const lockedData = getLockedMonthlyPayroll(monthPrefix);
      if (lockedData && lockedData.payrolls?.length > 0) {
        return lockedData.payrolls;
      }
    }

    return employees.map(emp => {
      return computeEmployeePayroll(emp, attendanceLogs, shifts, {
        ...settings,
        monthPrefix,
      });
    });
  }, [employees, attendanceLogs, shifts, settings, monthPrefix, advancesList, adjustmentsList, isLocked, overrideTrigger]);

  // Filtered Payrolls by branch & search
  const filteredPayrolls = useMemo(() => {
    return allPayrolls.filter(pr => {
      const emp = pr.emp;
      const nameMatch = !search ||
        (emp.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp.employee_number || '').toString().includes(search);
      const branchMatch = selectedBranch === 'all' ||
        (emp.branch_name || emp.branch || '') === selectedBranch;
      return nameMatch && branchMatch;
    });
  }, [allPayrolls, search, selectedBranch]);

  // Branches list
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Currently Selected Employee in Stage 1/2/3
  const currentSelectedEmp = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    if (!selectedEmpId) return employees[0];
    const sId = String(selectedEmpId).replace('emp_', '');
    return employees.find(e => {
      const eNum = String(e.employee_number || '').replace('emp_', '');
      const eId = String(e.id || '').replace('emp_', '');
      return eNum === sId || eId === sId || String(e.id) === String(selectedEmpId) || String(e.employee_number) === String(selectedEmpId);
    }) || employees[0];
  }, [employees, selectedEmpId]);

  const currentSelectedPayroll = useMemo(() => {
    if (!currentSelectedEmp) return null;
    return allPayrolls.find(pr => String(pr.emp.employee_number || pr.emp.id) === String(currentSelectedEmp.employee_number || currentSelectedEmp.id)) || null;
  }, [allPayrolls, currentSelectedEmp]);

  // Filtered Employees for the Selected Branch (in Stage 1/2/3 selector)
  const branchFilteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees;
    return employees.filter(e => (e.branch_name || e.branch || '') === selectedBranch);
  }, [employees, selectedBranch]);

  // Summary Totals for Stage 4
  const totals = useMemo(() => {
    return filteredPayrolls.reduce((acc, p) => {
      acc.basic += (p.basicSalary || 0);
      acc.housing += (p.housing || 0);
      acc.transport += (p.transport || 0);
      acc.friday += (p.fridayAllowance || 0);
      acc.dailyOT += (p.dailyOvertimeAllowance || 0);
      acc.bonuses += (p.customBonusesTotal || 0);
      acc.penalties += (p.customPenaltiesTotal || 0);
      acc.advances += (p.advanceInstallment || 0);
      acc.shortfall += (p.approvedShortfallDeduction || 0);
      acc.totalAdditions += (p.totalAdditions || 0);
      acc.totalDeductions += (p.totalDeductions || 0);
      acc.net += (p.netSalary || 0);
      acc.bankTotal = (acc.bankTotal || 0) + (p.bankTransferAmount !== undefined ? p.bankTransferAmount : p.netSalary || 0);
      acc.cashTotal = (acc.cashTotal || 0) + (p.cashPayoutAmount || 0);
      return acc;
    }, {
      basic: 0, housing: 0, transport: 0, friday: 0, dailyOT: 0,
      bonuses: 0, penalties: 0, advances: 0, shortfall: 0,
      totalAdditions: 0, totalDeductions: 0, net: 0
    });
  }, [filteredPayrolls]);

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────

  // Fast 1-Click Standard Punch Approval (No Modal, Instant In-Memory + DB Save)
  const handleQuickStandardPunch = async (day) => {
    if (!currentSelectedEmp) return;
    const emp = currentSelectedEmp;
    const empId = emp.id || ('emp_' + emp.employee_number);
    const empNum = String(emp.employee_number || '').replace('emp_', '');
    const empName = emp.full_name || 'موظف';
    const std = getStandardShiftPunches(emp.shift || '');

    const checkInFinal = std.p1In ? `${day.log_date}T${std.p1In}:00` : null;
    const checkOutFinal = std.isSplit 
      ? (std.p2Out ? `${day.log_date}T${std.p2Out}:00` : null)
      : (std.p1Out ? `${day.log_date}T${std.p1Out}:00` : null);

    const updatedItem = {
      ...day,
      id: day.id || `att_${empNum}_${day.log_date}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      employee_id: empId,
      user_id: empId,
      employee_number: empNum,
      employee_name: empName,
      log_date: day.log_date,
      check_in: checkInFinal,
      check_out: checkOutFinal,
      status: 'present',
      timestamp_raw: std.raw,
      total_hours: std.totalHours,
      period_1_in: std.p1In,
      period_1_out: std.p1Out,
      period_2_in: std.p2In,
      period_2_out: std.p2Out,
      notes: JSON.stringify({
        employee_number: empNum,
        user_id: empId,
        total_hours: std.totalHours,
        timestamp_raw: std.raw,
        period_1_in: std.p1In,
        period_1_out: std.p1Out,
        period_2_in: std.p2In,
        period_2_out: std.p2Out,
        manual_edit_by: user?.full_name || 'مدير الموارد البشرية',
        manual_edit_at: new Date().toISOString()
      })
    };

    try {
      if (day.id) {
        await base44.entities.AttendanceLog.update(day.id, updatedItem);
      } else {
        await base44.entities.AttendanceLog.create(updatedItem);
      }

      // Fast in-memory state update to avoid losing selected employee
      setAttendanceLogs(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(l => (l.id && l.id === day.id) || (String(l.employee_number || l.employee_id) === empNum && l.log_date === day.log_date));
        if (idx !== -1) copy[idx] = { ...copy[idx], ...updatedItem };
        else copy.unshift(updatedItem);
        return copy;
      });

      toast({
        title: '⚡ تم اعتماد حضور منضبط بنجاح',
        description: `يوم ${day.log_date}: تم توثيق بصمات الشفت القياسية (${std.totalHours} س) بدون عجز.`
      });
    } catch (e) {
      toast({ title: 'خطأ أثناء الاعتماد السريع', description: e.message, variant: 'destructive' });
    }
  };

  // Fast 1-Click Cancel Friday Attendance (Sets to normal weekly holiday with zero punches)
  const handleCancelFridayAttendance = async (day) => {
    if (!currentSelectedEmp) return;
    const emp = currentSelectedEmp;
    const empId = emp.id || ('emp_' + emp.employee_number);
    const empNum = String(emp.employee_number || '').replace('emp_', '');
    const empName = emp.full_name || 'موظف';

    const updatedItem = {
      ...day,
      id: day.id || `att_${empNum}_${day.log_date}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      employee_id: empId,
      user_id: empId,
      employee_number: empNum,
      employee_name: empName,
      log_date: day.log_date,
      check_in: null,
      check_out: null,
      status: 'weekend',
      timestamp_raw: '',
      total_hours: 0,
      period_1_in: '',
      period_1_out: '',
      period_2_in: '',
      period_2_out: '',
      notes: JSON.stringify({
        employee_number: empNum,
        user_id: empId,
        total_hours: 0,
        timestamp_raw: '',
        period_1_in: '',
        period_1_out: '',
        period_2_in: '',
        period_2_out: '',
        leave_type: 'weekend',
        note: 'عطلة أسبوعية رسمية بدون دوام',
        manual_edit_by: user?.full_name || 'مدير الموارد البشرية',
        manual_edit_at: new Date().toISOString()
      })
    };

    try {
      if (day.id) {
        await base44.entities.AttendanceLog.update(day.id, updatedItem);
      } else {
        await base44.entities.AttendanceLog.create(updatedItem);
      }

      setAttendanceLogs(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(l => (l.id && l.id === day.id) || (String(l.employee_number || l.employee_id) === empNum && l.log_date === day.log_date));
        if (idx !== -1) copy[idx] = { ...copy[idx], ...updatedItem };
        else copy.unshift(updatedItem);
        return copy;
      });

      toast({
        title: '🏖️ تم إلغاء دوام الجمعة بنجاح',
        description: `يوم ${day.log_date}: تم تعيين اليوم كعطلة أسبوعية رسمية وتصفير كافة البصمات والساعات.`
      });
    } catch (e) {
      toast({ title: 'خطأ أثناء إلغاء دوام الجمعة', description: e.message, variant: 'destructive' });
    }
  };

  // Stage 1: Edit Biometric Log (Admin Only)
  const handleSavePunchEdit = async () => {
    if (!editPunchModal) return;
    try {
      const { log, emp, isSplitShift, p1In, p1Out, p2In, p2Out, newCheckIn, newCheckOut, newStatus } = editPunchModal;
      
      const empId = emp ? emp.id : (log.employee_id || log.user_id);
      const empNum = emp ? String(emp.employee_number) : (log.employee_number || '1000');
      const empName = emp ? emp.full_name : (log.employee_name || 'موظف');
      const isLeave = newStatus === 'annual_leave' || newStatus === 'sick_leave' || newStatus === 'emergency_leave' || newStatus === 'unpaid_leave' || newStatus === 'unexcused_absence' || newStatus === 'exempt' || newStatus === 'absent' || newStatus === 'weekend';

      let cleanP1In = isSplitShift ? p1In : newCheckIn;
      let cleanP1Out = isSplitShift ? p1Out : newCheckOut;
      let cleanP2In = isSplitShift ? p2In : '';
      let cleanP2Out = isSplitShift ? p2Out : '';

      if (isLeave) {
        cleanP1In = '';
        cleanP1Out = '';
        cleanP2In = '';
        cleanP2Out = '';
      }

      const parseM = (t) => {
        if (!t) return null;
        const clean = t.replace(/[^0-9:]/g, '');
        const p = clean.split(':');
        return p.length >= 2 ? (parseInt(p[0], 10) * 60 + parseInt(p[1], 10)) : null;
      };

      let totalHrs = 0;
      let rawPunches = '';
      let checkInFinal = null;
      let checkOutFinal = null;

      if (!isLeave) {
        if (isSplitShift) {
          const m1In = parseM(p1In);
          const m1Out = parseM(p1Out);
          const m2In = parseM(p2In);
          const m2Out = parseM(p2Out);

          let dur1 = 0;
          if (m1In !== null && m1Out !== null) {
            dur1 = m1Out >= m1In ? m1Out - m1In : (m1Out + 1440) - m1In;
          }
          let dur2 = 0;
          if (m2In !== null && m2Out !== null) {
            dur2 = m2Out >= m2In ? m2Out - m2In : (m2Out + 1440) - m2In;
          }
          totalHrs = Math.round(((dur1 + dur2) / 60) * 10) / 10;
          rawPunches = `${p1In || '09:00'}:00 -- ${p1Out || '13:00'}:00 & ${p2In || '16:00'}:00 -- ${p2Out || '21:00'}:00`;
          checkInFinal = p1In ? `${log.log_date}T${p1In}:00` : null;
          checkOutFinal = p2Out ? `${log.log_date}T${p2Out}:00` : null;
        } else {
          const inM = parseM(newCheckIn);
          const outM = parseM(newCheckOut);
          if (inM !== null && outM !== null) {
            const diff = outM >= inM ? outM - inM : (outM + 1440) - inM;
            totalHrs = Math.round((diff / 60) * 10) / 10;
          }
          rawPunches = `${newCheckIn || '16:00'}:00 -- ${newCheckOut || '21:00'}:00`;
          checkInFinal = newCheckIn ? `${log.log_date}T${newCheckIn}:00` : null;
          checkOutFinal = newCheckOut ? `${log.log_date}T${newCheckOut}:00` : null;
        }
      }

      const updatedItem = {
        ...log,
        id: log.id || ('att_edit_' + Date.now()),
        employee_id: empId,
        user_id: empId,
        employee_number: empNum,
        employee_name: empName,
        log_date: log.log_date,
        check_in: checkInFinal,
        check_out: checkOutFinal,
        status: newStatus || log.status || 'present',
        timestamp_raw: rawPunches,
        total_hours: totalHrs,
        period_1_in: cleanP1In,
        period_1_out: cleanP1Out,
        period_2_in: cleanP2In,
        period_2_out: cleanP2Out,
        notes: JSON.stringify({
          employee_number: empNum,
          user_id: empId,
          total_hours: totalHrs,
          timestamp_raw: rawPunches,
          period_1_in: cleanP1In,
          period_1_out: cleanP1Out,
          period_2_in: cleanP2In,
          period_2_out: cleanP2Out,
          leave_type: isLeave ? newStatus : null,
          deduction_from_annual_balance: newStatus === 'annual_leave',
          manual_edit_by: user?.full_name || 'مدير الموارد البشرية',
          manual_edit_at: new Date().toISOString()
        })
      };

      if (log.id) {
        await base44.entities.AttendanceLog.update(log.id, updatedItem);
      } else {
        await base44.entities.AttendanceLog.create(updatedItem);
      }

      // If user selected Leave, sync with LeaveRequest
      if (newStatus === 'annual_leave' || newStatus === 'sick_leave' || newStatus === 'emergency_leave') {
        try {
          await base44.entities.LeaveRequest.create({
            id: 'leave_sync_' + Date.now(),
            employee_id: empId,
            employee_number: empNum,
            employee_name: empName,
            leave_type: newStatus === 'annual_leave' ? 'سنوية' : (newStatus === 'sick_leave' ? 'مرضية' : 'اضطرارية'),
            start_date: log.log_date,
            end_date: log.log_date,
            days_count: 1,
            reason: `إجازة معتمدة من مسير الرواتب (تخصم من رصيد الإجازات السنوية)`,
            status: 'approved',
            created_at: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Leave sync warning:', e);
        }
      }

      toast({ 
        title: '✓ تم تعديل واعتماد البصمات الأربعة بنجاح',
        description: `تم توثيق ساعات العمل (${totalHrs} س) وحفظها في قاعدة البيانات المركزية.`
      });
      setEditPunchModal(null);
      const currentEmpToKeep = selectedEmpId || String(empNum);
      await loadData();
      if (currentEmpToKeep) setSelectedEmpId(currentEmpToKeep);
    } catch (e) {
      toast({ title: 'خطأ أثناء التعديل', description: e.message, variant: 'destructive' });
    }
  };

  // Stage 4: Lock and Commit Monthly Payroll
  const handleLockMonthlyPayroll = () => {
    if (filteredPayrolls.length === 0) {
      toast({ title: 'لا توجد بيانات رواتب للاعتماد', variant: 'destructive' });
      return;
    }

    const record = saveLockedMonthlyPayroll(monthPrefix, {
      totals,
      payrolls: allPayrolls
    }, user?.full_name || 'فهد ناصر محمد الجوعي (المدير العام)');

    setIsLocked(true);
    setLockConfirmModal(false);
    setLockedArchives(getLockedMonthlyPayrolls());
    setAuditLogs(getAuditLog());

    toast({
      title: `🔒 تم اعتماد وإقفال ${record.title} بنجاح!`,
      description: 'تم حفظ النسخة المقفلة في قاعدة البيانات السحابية المركزية، وأصبحت متاحة للمحاسب للقراءة فقط.'
    });
  };

  // Unlock Monthly Payroll (Admin Only)
  const handleUnlockMonthlyPayroll = () => {
    unlockMonthlyPayroll(monthPrefix, unlockReason || 'تعديل استثنائي بقرار المدير العام', user?.full_name || 'المدير العام');
    setIsLocked(false);
    setUnlockModal(false);
    setLockedArchives(getLockedMonthlyPayrolls());
    setAuditLogs(getAuditLog());
    toast({
      title: `🔓 تم فك إقفال رواتب شهر ${monthPrefix} للتعديل`,
      description: 'تم توثيق عملية فك الإقفال في سجل الرقابة المالي.'
    });
  };


  // ─── STAGE 2 DEDUCTIONS & ADVANCE HANDLERS ─────────────────────────

  // 1. Advance Handlers
  const handlePostponeAdvance = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    saveMonthlyAdvanceOverride(empNum, monthPrefix, {
      amount: 0,
      status: 'skipped',
      note: `تم تأجيل خصم قسط السلفة لشهر ${monthPrefix} بقرار الإدارة`
    });
    setIsEditingAdvance(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '⏸️ تم تأجيل خصم قسط السلفة بنجاح',
      description: `تم إيقاف الخصم للموظف (${emp.full_name}) لشهر ${monthPrefix} (0.00 ر.س).`
    });
  };

  const handleResetAdvanceToDefault = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    const key = 'hr_flow_adv_override_' + empNum + '_' + (monthPrefix || 'all');
    localStorage.removeItem(key);
    saveMonthlyAdvanceOverride(empNum, monthPrefix, {
      amount: currentSelectedPayroll?.activeAdvance?.monthly_installment || 500,
      status: 'confirmed',
      note: 'قسط مجدول معتمد'
    });
    setIsEditingAdvance(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '🔄 تمت استعادة القسط المجدول الأصلي',
      description: `تمت إعادة الخصم للقيمة التعاقدية الافتراضية لشهر ${monthPrefix}.`
    });
  };

  const handleSaveCustomAdvance = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    const num = Number(customAdvanceAmount);
    if (isNaN(num) || num < 0) {
      toast({ title: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }
    saveMonthlyAdvanceOverride(empNum, monthPrefix, {
      amount: num,
      status: 'modified',
      note: `قسط مخصص (${num} ر.س) لشهر ${monthPrefix}`
    });
    setIsEditingAdvance(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '✓ تم تعديل وتطبيق قسط السلفة',
      description: `المبلغ المعتمد للخصم عن شهر ${monthPrefix} هو (${num.toLocaleString('en-US')} ر.س).`
    });
  };

  // 2. Absence Days Deduction Handlers
  const handleApproveAbsence = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    const proposed = currentSelectedPayroll?.proposedAbsenceDeduction || 0;
    saveAbsenceApproval(empNum, monthPrefix, {
      status: 'approved',
      finalDeduction: proposed,
      note: 'تم اعتماد خصم أيام الغياب رسمياً'
    });
    setIsEditingAbsence(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '✓ تم اعتماد خصم أيام الغياب',
      description: `تم اعتماد خصم (${fmtNum(proposed)} ر.س) للموظف ${emp.full_name}.`
    });
  };

  const handleWaiveAbsence = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    saveAbsenceApproval(empNum, monthPrefix, {
      status: 'waived',
      finalDeduction: 0,
      note: 'تم التجاوز والإعفاء من خصم الغياب بقرار الإدارة'
    });
    setIsEditingAbsence(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '🛡️ تم التجاوز والإعفاء من خصم الغياب',
      description: `تم إعفاء الموظف ${emp.full_name} من خصم الغياب (0.00 ر.س).`
    });
  };

  const handleSaveCustomAbsence = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    const num = Number(customAbsenceAmount);
    if (isNaN(num) || num < 0) {
      toast({ title: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }
    saveAbsenceApproval(empNum, monthPrefix, {
      status: 'modified',
      finalDeduction: num,
      note: `خصم غياب معدل (${num} ر.س)`
    });
    setIsEditingAbsence(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '✓ تم تعديل وتطبيق خصم الغياب',
      description: `تم اعتماد خصم غياب بمبلغ (${fmtNum(num)} ر.س).`
    });
  };

  // 3. Shortfall (Delay & Working Hours) Deduction Handlers
  const handleApproveShortfall = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    const proposed = currentSelectedPayroll?.proposedShortfallDeduction || 0;
    saveShortfallApproval(empNum, monthPrefix, {
      status: 'approved',
      finalDeduction: proposed,
      note: 'تم اعتماد خصم عجز الساعات والتأخير رسمياً'
    });
    setIsEditingShortfall(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '✓ تم اعتماد خصم عجز الساعات',
      description: `تم اعتماد خصم (${fmtNum(proposed)} ر.س) للموظف ${emp.full_name}.`
    });
  };

  const handleWaiveShortfall = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    saveShortfallApproval(empNum, monthPrefix, {
      status: 'waived',
      finalDeduction: 0,
      note: 'تم التجاوز والإعفاء من خصم عجز الساعات والتأخير بقرار الإدارة'
    });
    setIsEditingShortfall(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '🛡️ تم التجاوز والإعفاء من خصم عجز الساعات',
      description: `تم إعفاء الموظف ${emp.full_name} من خصم عجز الساعات (0.00 ر.س).`
    });
  };

  const handleSaveCustomShortfall = (emp) => {
    if (!emp) return;
    const empNum = String(emp.employee_number || emp.id || '').trim();
    const num = Number(customShortfallAmount);
    if (isNaN(num) || num < 0) {
      toast({ title: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }
    saveShortfallApproval(empNum, monthPrefix, {
      status: 'modified',
      finalDeduction: num,
      note: `خصم عجز ساعات معدل (${num} ر.س)`
    });
    setIsEditingShortfall(false);
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '✓ تم تعديل وتطبيق خصم عجز الساعات',
      description: `تم اعتماد خصم عجز ساعات بمبلغ (${fmtNum(num)} ر.س).`
    });
  };

  // 4. Delete Penalty / Bonus Adjustment Handler
  const handleDeleteAdjustment = (adjId) => {
    if (!adjId) return;
    deleteAdjustment(adjId);
    setAdjustmentsList(getAdjustments());
    setOverrideTrigger(prev => prev + 1);
    toast({
      title: '✓ تم حذف الاستقطاع / المكافأة بنجاح',
      description: 'تم تحديث جدول ومسير الرواتب تلقائياً.'
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      <PayrollRunBanner month={(monthPrefix || "2026-08").split("-")[1] || "08"} year={(monthPrefix || "2026-08").split("-")[0] || "2026"} user={user} />
      
      {/* ─── DEDICATED ADVANCES & LOANS MANAGEMENT HUB (?tab=advances) ──────── */}
      {tabParam === 'advances' ? (
        <AdvancesManagementHub
          employees={employees}
          advancesList={advancesList}
          onRefresh={() => setAdvancesList(getAdvances())}
          onOpenNewAdvance={() => setNewAdvanceModal(true)}
          onPrintAdvance={(adv) => setSelectedAdvanceForPrint(adv)}
          fmtNum={fmtNum}
        />
      ) : (
        <>
      {/* ─── 1. TOP EXECUTIVE HEADER ────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> دورة مسير الرواتب المعتمدة
            </span>
            {isLocked ? (
              <Badge className="bg-emerald-600 text-white border-0 text-xs font-bold gap-1.5 py-1 px-3 shadow-sm">
                <Lock className="w-3.5 h-3.5" /> رواتب شهر {monthPrefix.split('-')[1]} مُقفلة ومعتمدة رسمياً
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-xs font-bold gap-1.5 py-1 px-3">
                <Clock className="w-3.5 h-3.5" /> مسير قيد التدقيق والمراجعة
              </Badge>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-black text-foreground tracking-tight">
            نظام تدقيق واعتماد مسير الرواتب الشهري
          </h1>
          <p className="text-xs text-muted-foreground">
            دورة عمل إدارية متسلسلة عبر 4 مراحل لتدقيق البصمات، اعتماد الاستقطاعات والمكافآت، والإقفال المالي النهائي
          </p>
        </div>

        {/* Controls: Month Picker + Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border px-3.5 py-2 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-muted-foreground">شهر المسير:</span>
            <input
              type="month"
              value={monthPrefix}
              onChange={(e) => setMonthPrefix(e.target.value)}
              className="bg-transparent text-foreground font-mono text-xs font-black border-0 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Mode Switcher: Wizard vs Archive */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border">
            <Button
              size="sm"
              variant={mainView === 'wizard' ? 'default' : 'ghost'}
              onClick={() => setMainView('wizard')}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>دورة الاعتماد (4 مراحل)</span>
            </Button>
            <Button
              size="sm"
              variant={mainView === 'archive' ? 'default' : 'ghost'}
              onClick={() => setMainView('archive')}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 text-muted-foreground"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>أرشيف الشهور المقفلة ({lockedArchives.length})</span>
            </Button>
          </div>

          {/* Unlock Button for Admin if Locked */}
          {isLocked && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlockModal(true)}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-bold gap-1.5 h-9"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>فك الإقفال للتعديل (المدير فقط)</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── 2. MAIN VIEW 1: 4-STAGE WIZARD ─────────────────────────────────── */}
      {mainView === 'wizard' && (
        <div className="space-y-6">
          
          {/* ─── DYNAMIC EYE-PLEASING PROGRESS TIMELINE BAR ──────────────── */}
          <Card className="p-4 sm:p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden relative" dir="rtl">
            
            {/* Top Bar: Title & Progress Percentage */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></div>
                <span className="font-heading font-black text-xs sm:text-sm text-foreground">
                  مسار دورة اعتماد الرواتب:
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  {currentStep === 1 && "المرحلة الأولى: تدقيق البصمات وساعات العمل"}
                  {currentStep === 2 && "المرحلة الثانية: اعتماد الاستقطاعات والخصومات والسلف"}
                  {currentStep === 3 && "المرحلة الثالثة: اعتماد الاستحقاقات والمكافآت والبدلات"}
                  {currentStep === 4 && "المرحلة الرابعة: المراجعة العامة والإقفال السحابي النهائي"}
                  {currentStep === 5 && "المرحلة الخامسة: أرشيف رواتب الشهور السابقة والمصادقة المالية"}
                </span>
              </div>

              <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-mono font-bold px-3 py-1 rounded-xl shrink-0">
                {Math.round((currentStep / 5) * 100)}% مكتمل
              </Badge>
            </div>

            {/* Continuous Interactive Progress Track */}
            <div className="relative pt-2 pb-1">
              
              {/* Background Gray Track */}
              <div className="absolute top-1/2 start-6 end-6 -translate-y-1/2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full z-0"></div>
              
              {/* Active Colored Progress Fill with Smooth Animation */}
              <div
                className="absolute top-1/2 start-6 -translate-y-1/2 h-2 bg-gradient-to-l from-sky-500 via-emerald-500 to-purple-600 rounded-full z-0 transition-all duration-700 ease-out shadow-sm shadow-sky-500/20"
                style={{ width: `${Math.max(0, Math.min(100, ((currentStep - 1) / 4) * 90 + 5))}%` }}
              ></div>

              {/* 5 Milestone Step Nodes */}
              <div className="relative z-10 flex items-center justify-between">
                {[
                  { step: 1, title: "تدقيق البصمات", icon: Clock },
                  { step: 2, title: "الاستقطاعات", icon: AlertOctagon },
                  { step: 3, title: "الاستحقاقات", icon: Gift },
                  { step: 4, title: "الإقفال النهائي", icon: Lock },
                  { step: 5, title: "أرشيف الشهور", icon: Award },
                ].map(({ step, title, icon: Icon }) => {
                  const isPassed = step < currentStep;
                  const isCurrent = step === currentStep;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepChange(step)}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none transition-transform hover:scale-105"
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                          isPassed
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-sky-600 text-white ring-4 ring-sky-100 dark:ring-sky-950 shadow-lg shadow-sky-600/30 scale-110"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {isPassed ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
                          isCurrent
                            ? "text-sky-600 dark:text-sky-400 font-black"
                            : isPassed
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </Card>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 1: BIOMETRICS & TIMECARDS AUDIT ─────────────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-4">
              
              {/* Branch & Employee Select Bar */}
              <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  
                  {/* Branch Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">1. اختر الفرع / القسم:</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="rounded-2xl text-xs bg-background h-10">
                        <SelectValue placeholder="كافة الفروع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employee Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">2. اختر الموظف لتدقيق بصماته:</Label>
                    <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                      <SelectTrigger className="rounded-2xl text-xs bg-background h-10 font-bold">
                        <SelectValue placeholder="اختر الموظف..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branchFilteredEmployees.map(e => (
                          <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                            {e.full_name} (#{e.employee_number}) — {e.branch_name || 'الفرع الرئيسي'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick Search */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">أو بحث سريع بالاسم:</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="اكتب اسم الموظف..."
                        className="pr-9 rounded-2xl text-xs h-10 bg-background"
                      />
                    </div>
                  </div>

                </div>
              </Card>

              {/* Selected Employee Biometrics Card */}
              {currentSelectedEmp && currentSelectedPayroll ? (
                <Card className="rounded-3xl border shadow-sm bg-card overflow-hidden">
                  
                  {/* Employee Card Banner */}
                  <div className="p-5 bg-gradient-to-l from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 font-black text-base flex items-center justify-center shadow-md">
                        {(currentSelectedEmp.full_name || 'م')[0]}
                      </div>
                      <div>
                        <div className="text-lg font-heading font-black">{currentSelectedEmp.full_name}</div>
                        <div className="text-xs text-slate-300 font-mono flex items-center gap-3 mt-0.5">
                          <span>الرقم: #{currentSelectedEmp.employee_number}</span>
                          <span>•</span>
                          <span>الوظيفة: {currentSelectedEmp.job_title || 'موظف'}</span>
                          <span>•</span>
                          <span>الوردية: {currentSelectedEmp.shift || 'غير سعودي'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedForBioPrint({
                          employee: currentSelectedEmp,
                          dailyDetails: currentSelectedPayroll.dailyDetails,
                          payroll: currentSelectedPayroll
                        })}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl gap-1.5 h-9 border border-white/20"
                      >
                        <Printer className="w-3.5 h-3.5 text-sky-300" />
                        <span>طباعة كشف البصمات A4</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleStepChange(2)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl gap-1.5 h-9 shadow-lg"
                      >
                        <span>اعتماد البصمات والانتقال للخطوة 2</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Attendance Stats Cards (5 Precise Metrics) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 border-b bg-slate-50/50 dark:bg-slate-900/30 text-center">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">أيام الحضور الفعلي</div>
                      <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                        {currentSelectedPayroll.presentDays} <span className="text-xs font-sans font-normal">أيام</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-blue-800 dark:text-blue-300">جمعات دوام فعلي (إضافي)</div>
                      <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-400 mt-1">
                        {currentSelectedPayroll.fridayWorkedDays || 0} <span className="text-xs font-sans font-normal">جمعة</span>
                      </div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-rose-800 dark:text-rose-300">أيام الغياب غير المبرر</div>
                      <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-400 mt-1">
                        {currentSelectedPayroll.absentDays} <span className="text-xs font-sans font-normal">أيام</span>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-purple-800 dark:text-purple-300">إجازة بدون راتب</div>
                      <div className="text-xl font-black font-mono text-purple-700 dark:text-purple-400 mt-1">
                        {currentSelectedPayroll.unpaidLeaveDays || 0} <span className="text-xs font-sans font-normal">أيام</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 rounded-2xl">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">صافي عجز التأخير ⚖️</div>
                      <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1">
                        {formatMinutes(currentSelectedPayroll.totalShortfallMinutes)}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">بعد مقاصة الإضافي</div>
                    </div>
                  </div>

                  {/* Day-by-Day Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 font-heading font-bold text-muted-foreground border-b">
                          <th className="py-3 px-3">التاريخ</th>
                          <th className="py-3 px-2">اليوم</th>
                          <th className="py-3 px-3 text-emerald-700 dark:text-emerald-400">الفترة النهارية (دخول ➔ خروج)</th>
                          <th className="py-3 px-3 text-blue-700 dark:text-blue-400">الفترة المسائية (دخول ➔ خروج)</th>
                          <th className="py-3 px-2">المطلوب</th>
                          <th className="py-3 px-2">إجمالي الفعلي</th>
                          <th className="py-3 px-3">الفارق (عجز / زيادة)</th>
                          <th className="py-3 px-2">الحالة</th>
                          <th className="py-3 px-3 text-center">تعديل (المدير فقط)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {currentSelectedPayroll.dailyDetails?.map((d, di) => {
                          const statusLabel = d.isFriday 
                            ? 'عطلة جمعة' 
                            : d.isUnpaidLeave 
                            ? 'إجازة بدون راتب' 
                            : d.isExempt 
                            ? 'معفى / إجازة' 
                            : !d.hasAttendance 
                            ? 'غائب' 
                            : d.shortfallMinutes > 0 
                            ? `عجز دوام (${formatMinutes(d.shortfallMinutes)})` 
                            : 'حاضر ✓';

                          const statusBadgeColor = d.isFriday 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : d.isUnpaidLeave 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' 
                            : d.isExempt 
                            ? 'bg-slate-100 text-slate-700' 
                            : !d.hasAttendance 
                            ? 'bg-rose-100 text-rose-800' 
                            : d.shortfallMinutes > 0 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800';

                          return (
                            <tr key={di} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                              <td className="py-2.5 px-3 font-mono font-bold">{d.log_date}</td>
                              <td className="py-2.5 px-2 font-semibold">{d.day_name}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                {d.hasAttendance || d.isExempt 
                                  ? (d.period_1_in ? `${d.period_1_in} ➔ ${d.period_1_out || '--:--'}` : (d.check_in ? (d.check_in.includes('T') ? d.check_in.slice(11, 16) : d.check_in.slice(0, 5)) : '—'))
                                  : '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                                {d.hasAttendance || d.isExempt 
                                  ? (d.period_2_in ? `${d.period_2_in} ➔ ${d.period_2_out || '--:--'}` : '—')
                                  : '—'}
                              </td>
                              <td className="py-2.5 px-2 font-mono">{d.requiredMinutes ? formatMinutes(d.requiredMinutes) : '—'}</td>
                              <td className="py-2.5 px-2 font-mono font-bold text-foreground">{d.actualMinutes ? formatMinutes(d.actualMinutes) : '—'}</td>
                              <td className="py-2.5 px-3 font-mono font-extrabold">
                                {d.shortfallMinutes > 0 ? (
                                  <span className="text-rose-600">-${formatMinutes(d.shortfallMinutes)} 🔻</span>
                                ) : d.surplusMinutes > 0 ? (
                                  <span className="text-blue-600">+${formatMinutes(d.surplusMinutes)} ⚡</span>
                                ) : (
                                  <span className="text-emerald-600">0 د ✓</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2">
                                <Badge className={`${statusBadgeColor} border-0 text-[10px] font-bold`}>
                                  {statusLabel}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {isAdmin && !isLocked && (
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Fast Friday Buttons */}
                                    {d.isFriday ? (
                                      d.hasAttendance ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleCancelFridayAttendance(d)}
                                          title="إلغاء دوام الجمعة وتصفير البصمات وجعله عطلة أسبوعية رسمية"
                                          className="h-7 text-[10px] font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 px-2.5 gap-1 border border-rose-200/60"
                                        >
                                          <X className="w-3 h-3" />
                                          <span>إلغاء دوام الجمعة 🚫</span>
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleQuickStandardPunch(d)}
                                          title="توثيق دوام جمعة إضافي مستحق للبدل بمواعيد الشفت"
                                          className="h-7 text-[10px] font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-2.5 gap-1 border border-indigo-200/60"
                                        >
                                          <Sparkles className="w-3 h-3 text-indigo-600" />
                                          <span>دوام جمعة إضافي ⚡</span>
                                        </Button>
                                      )
                                    ) : (
                                      /* 1-Click Fast Standard Attendance for regular working days */
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleQuickStandardPunch(d)}
                                        title="اعتماد حضور منضبط فوري بمواعيد الشفت القياسية بدون عجز دوام"
                                        className="h-7 text-[10px] font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 px-2.5 gap-1 transition-all border border-emerald-200/60 dark:border-emerald-800"
                                      >
                                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                                        <span>حضور منضبط ⚡</span>
                                      </Button>
                                    )}

                                    {/* Full Modal Edit Button */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const empShift = currentSelectedEmp?.shift || '';
                                        const isSplit = empShift.includes('فترتين') || 
                                          empShift.includes('غير سعودي') || 
                                          empShift.includes('9 ساعات') || 
                                          empShift.includes('8 ساعات') || 
                                          (currentSelectedEmp?.nationality !== 'سعودي' && currentSelectedEmp?.employee_number !== '1001');

                                        const rawStr = d.timestamp_raw || '';
                                        const times = (rawStr.match(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g) || []);

                                        let p1In = d.period_1_in || (times[0] || (d.check_in ? String(d.check_in).slice(11, 16) : '09:00'));
                                        let p1Out = d.period_1_out || (times[1] || (isSplit ? '13:00' : ''));
                                        let p2In = d.period_2_in || (times[2] || (isSplit ? '16:00' : ''));
                                        let p2Out = d.period_2_out || (times[3] || times[times.length - 1] || (d.check_out ? String(d.check_out).slice(11, 16) : (isSplit ? '21:00' : '')));

                                        let singleIn = p1In || (d.check_in ? String(d.check_in).slice(11, 16) : '16:00');
                                        let singleOut = p2Out || p1Out || (d.check_out ? String(d.check_out).slice(11, 16) : '21:00');

                                        const isFriNoAtt = d.isFriday && !d.hasAttendance;
                                        setEditPunchModal({
                                          log: d,
                                          emp: currentSelectedEmp,
                                          isSplitShift: isSplit,
                                          p1In: isFriNoAtt ? '' : (p1In || (empShift.includes('8 ساعات') ? '08:00' : '09:00')),
                                          p1Out: isFriNoAtt ? '' : (p1Out || (empShift.includes('8 ساعات') ? '12:00' : '13:00')),
                                          p2In: isFriNoAtt ? '' : (p2In || '16:00'),
                                          p2Out: isFriNoAtt ? '' : (p2Out || (empShift.includes('8 ساعات') ? '20:00' : '21:00')),
                                          newCheckIn: isFriNoAtt ? '' : singleIn,
                                          newCheckOut: isFriNoAtt ? '' : singleOut,
                                          newStatus: d.isFriday ? (d.hasAttendance ? 'present' : 'weekend') : (d.hasAttendance ? (d.status || 'present') : 'absent')
                                        });
                                      }}
                                      className="h-7 text-[11px] font-bold rounded-xl text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/60 px-2 gap-1 border border-sky-200/60 dark:border-sky-800"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>تعديل</span>
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

                </Card>
              ) : null}

            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 2: DEDUCTIONS & ADVANCES APPROVAL ───────────────────── */}
          {currentStep === 2 && currentSelectedEmp && currentSelectedPayroll && (
            <div className="space-y-5">
              
              {/* Employee Navigator Bar */}
              <div className="flex items-center justify-between bg-card p-4 rounded-3xl border shadow-sm flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">تدقيق استقطاعات:</span>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="w-64 rounded-xl text-xs font-bold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilteredEmployees.map(e => (
                        <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                          {e.full_name} (#{e.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStepChange(1)}
                    className="rounded-xl text-xs font-bold gap-1 h-9"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>الرجوع للبصمات</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStepChange(3)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md"
                  >
                    <span>اعتماد الاستقطاعات والانتقال للخطوة 3</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* ─── DEDUCTIONS AUDIT GRID ───────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. ADVANCE INSTALLMENT CARD */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-600" />
                      <div>
                        <h3 className="font-heading font-black text-sm text-foreground">1. استقطاع قسط السلفة الشهرية</h3>
                        <p className="text-[11px] text-muted-foreground">التحكم في خصم القسط (تأجيل، تعديل، أو اعتماد الخصم)</p>
                      </div>
                    </div>
                    <div>
                      {currentSelectedPayroll.activeAdvance ? (
                        currentSelectedPayroll.advanceOverrideStatus === 'skipped' ? (
                          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs font-bold">
                            ⏸️ مؤجل لهذا الشهر
                          </Badge>
                        ) : currentSelectedPayroll.advanceOverrideStatus === 'modified' ? (
                          <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs font-bold">
                            ✏️ قسط مخصص ({fmtNum(currentSelectedPayroll.advanceInstallment)} ر.س)
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-bold">
                            ✓ معتمد
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs font-bold">لا توجد سلفة</Badge>
                      )}
                    </div>
                  </div>

                  {currentSelectedPayroll.activeAdvance ? (
                    <div className="space-y-3.5">
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">إجمالي السلفة:</span>
                          <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.activeAdvance.total_amount)} ر.س</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">القسط المجدول:</span>
                          <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.activeAdvance.monthly_installment || 500)} ر.س</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-slate-950 border font-bold">
                          <span>المستقطع لهذا الشهر:</span>
                          <span className={`font-mono text-sm ${currentSelectedPayroll.advanceInstallment === 0 ? 'text-amber-600' : 'text-rose-600 font-black'}`}>
                            {currentSelectedPayroll.advanceInstallment === 0 ? '0.00 ر.س (مؤجل)' : `-${fmtNum(currentSelectedPayroll.advanceInstallment)} ر.س`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-1.5 font-bold">
                          <span>المتبقي بعد الخصم:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{fmtNum(currentSelectedPayroll.advanceRemaining)} ر.س</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant={currentSelectedPayroll.advanceOverrideStatus === 'skipped' ? 'default' : 'outline'}
                          onClick={() => handlePostponeAdvance(currentSelectedPayroll.emp)}
                          className={`rounded-xl text-xs font-bold h-8 px-2.5 ${currentSelectedPayroll.advanceOverrideStatus === 'skipped' ? 'bg-amber-600 text-white' : 'border-amber-300 text-amber-900 dark:text-amber-200'}`}
                        >
                          ⏸️ تأجيل (0 ر.س)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={isEditingAdvance ? 'default' : 'outline'}
                          onClick={() => {
                            setIsEditingAdvance(!isEditingAdvance);
                            setCustomAdvanceAmount(String(currentSelectedPayroll.advanceInstallment || ''));
                          }}
                          className={`rounded-xl text-xs font-bold h-8 px-2.5 ${isEditingAdvance ? 'bg-blue-600 text-white' : 'border-blue-300 text-blue-900 dark:text-blue-200'}`}
                        >
                          ✏️ تعديل القسط
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetAdvanceToDefault(currentSelectedPayroll.emp)}
                          className="rounded-xl text-xs font-bold h-8 px-2.5 border-slate-300 text-slate-700"
                        >
                          🔄 استعادة
                        </Button>
                      </div>

                      {isEditingAdvance && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-xl flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={customAdvanceAmount}
                            onChange={(e) => setCustomAdvanceAmount(e.target.value)}
                            placeholder="مبلغ القسط..."
                            className="rounded-lg text-xs font-mono h-8 bg-white dark:bg-slate-900"
                          />
                          <Button size="sm" onClick={() => handleSaveCustomAdvance(currentSelectedPayroll.emp)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold h-8 px-3">
                            تطبيق
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground text-xs font-bold">
                      الموظف ليس عليه أي سلف أو مديونيات قائمة.
                    </div>
                  )}
                </Card>

                {/* 2. ABSENCE DAYS DEDUCTIONS CARD */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-rose-600" />
                      <div>
                        <h3 className="font-heading font-black text-sm text-foreground">2. استقطاع أيام الغياب</h3>
                        <p className="text-[11px] text-muted-foreground">اعتماد خصم الأيام غير المحققة أو التجاوز والإعفاء</p>
                      </div>
                    </div>
                    <div>
                      {currentSelectedPayroll.absentDays > 0 ? (
                        currentSelectedPayroll.absenceApprovalStatus === 'waived' ? (
                          <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-bold gap-1">
                            🛡️ معفى / متجاوز عنه
                          </Badge>
                        ) : currentSelectedPayroll.absenceApprovalStatus === 'modified' ? (
                          <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs font-bold gap-1">
                            ✏️ خصم معدل ({fmtNum(currentSelectedPayroll.approvedAbsenceDeduction)} ر.س)
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border-rose-300 text-xs font-bold gap-1">
                            ⚠️ معتمد للخصم
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50">لا يوجد غياب (0 يوم)</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">عدد أيام الغياب المسجلة:</span>
                        <span className="font-bold text-foreground">{currentSelectedPayroll.absentDays || 0} يوم</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">معدل أجر اليوم الواحد:</span>
                        <span className="font-mono font-bold text-foreground">{fmtNum(currentSelectedPayroll.dailySalaryRate)} ر.س/يوم</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-slate-950 border font-bold">
                        <span>الخصم المالي المعتمد للغياب:</span>
                        <span className={`font-mono text-sm ${(currentSelectedPayroll.approvedAbsenceDeduction || 0) === 0 ? 'text-emerald-600' : 'text-rose-600 font-black'}`}>
                          {(currentSelectedPayroll.approvedAbsenceDeduction || 0) === 0 ? '0.00 ر.س (لا يوجد خصم)' : `-${fmtNum(currentSelectedPayroll.approvedAbsenceDeduction)} ر.س`}
                        </span>
                      </div>
                      {currentSelectedPayroll.absenceApprovalNote && (
                        <div className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800/60 p-2 rounded-lg">
                          <strong>ملاحظة الغياب:</strong> {currentSelectedPayroll.absenceApprovalNote}
                        </div>
                      )}
                    </div>

                    {/* Action Controls for Absence: Approve vs Waive vs Custom */}
                    {currentSelectedPayroll.absentDays > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Approve deduction */}
                          <Button
                            type="button"
                            size="sm"
                            variant={currentSelectedPayroll.absenceApprovalStatus === 'approved' ? 'default' : 'outline'}
                            onClick={() => handleApproveAbsence(currentSelectedPayroll.emp)}
                            className={`rounded-xl text-xs font-bold h-8 px-2.5 ${currentSelectedPayroll.absenceApprovalStatus === 'approved' ? 'bg-rose-600 text-white' : 'border-rose-300 text-rose-800 hover:bg-rose-50'}`}
                          >
                            ✓ اعتماد الخصم (-{fmtNum(currentSelectedPayroll.proposedAbsenceDeduction)} ر.س)
                          </Button>

                          {/* Waive / Excuse */}
                          <Button
                            type="button"
                            size="sm"
                            variant={currentSelectedPayroll.absenceApprovalStatus === 'waived' ? 'default' : 'outline'}
                            onClick={() => handleWaiveAbsence(currentSelectedPayroll.emp)}
                            className={`rounded-xl text-xs font-bold h-8 px-2.5 ${currentSelectedPayroll.absenceApprovalStatus === 'waived' ? 'bg-emerald-600 text-white' : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'}`}
                          >
                            🛡️ تجاوز / إعفاء (0 ر.س)
                          </Button>

                          {/* Custom Amount */}
                          <Button
                            type="button"
                            size="sm"
                            variant={isEditingAbsence ? 'default' : 'outline'}
                            onClick={() => {
                              setIsEditingAbsence(!isEditingAbsence);
                              setCustomAbsenceAmount(String(currentSelectedPayroll.approvedAbsenceDeduction || currentSelectedPayroll.proposedAbsenceDeduction || ''));
                            }}
                            className={`rounded-xl text-xs font-bold h-8 px-2.5 ${isEditingAbsence ? 'bg-blue-600 text-white' : 'border-blue-300 text-blue-900 hover:bg-blue-50'}`}
                          >
                            ✏️ تعديل الخصم
                          </Button>
                        </div>

                        {isEditingAbsence && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-xl flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={customAbsenceAmount}
                              onChange={(e) => setCustomAbsenceAmount(e.target.value)}
                              placeholder="مبلغ خصم الغياب بالريال..."
                              className="rounded-lg text-xs font-mono h-8 bg-white dark:bg-slate-900"
                            />
                            <Button size="sm" onClick={() => handleSaveCustomAbsence(currentSelectedPayroll.emp)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold h-8 px-3">
                              تطبيق
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {/* 3. WORKING HOURS SHORTFALL & LATENESS DEDUCTION CARD */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <div>
                        <h3 className="font-heading font-black text-sm text-foreground">3. استقطاع عجز الساعات والتأخير</h3>
                        <p className="text-[11px] text-muted-foreground">اعتماد خصم دقائق التأخير والعجز أو التجاوز والإعفاء</p>
                      </div>
                    </div>
                    <div>
                      {currentSelectedPayroll.totalShortfallMinutes > 0 ? (
                        currentSelectedPayroll.shortfallApprovalStatus === 'waived' ? (
                          <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-bold gap-1">
                            🛡️ معفى / متجاوز عنه
                          </Badge>
                        ) : currentSelectedPayroll.shortfallApprovalStatus === 'modified' ? (
                          <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs font-bold gap-1">
                            ✏️ خصم معدل ({fmtNum(currentSelectedPayroll.approvedShortfallDeduction)} ر.س)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs font-bold gap-1">
                            ⚠️ معتمد للخصم
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50">لا يوجد عجز ساعات (0 د)</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">إجمالي وقت العجز والتأخير:</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatMinutes(currentSelectedPayroll.totalShortfallMinutes)} ({fmtNum(currentSelectedPayroll.shortfallHours)} ساعة)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">معدل أجر الساعة المحسوب:</span>
                        <span className="font-mono font-bold text-foreground">{fmtNum(currentSelectedPayroll.hourlyRate)} ر.س/ساعة</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-slate-950 border font-bold">
                        <span>الخصم المالي المعتمد للعجز:</span>
                        <span className={`font-mono text-sm ${(currentSelectedPayroll.approvedShortfallDeduction || 0) === 0 ? 'text-emerald-600' : 'text-rose-600 font-black'}`}>
                          {(currentSelectedPayroll.approvedShortfallDeduction || 0) === 0 ? '0.00 ر.س (لا يوجد خصم)' : `-${fmtNum(currentSelectedPayroll.approvedShortfallDeduction)} ر.س`}
                        </span>
                      </div>
                      {currentSelectedPayroll.shortfallApprovalNote && (
                        <div className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800/60 p-2 rounded-lg">
                          <strong>ملاحظة العجز:</strong> {currentSelectedPayroll.shortfallApprovalNote}
                        </div>
                      )}
                    </div>

                    {/* Action Controls for Shortfall: Approve vs Waive vs Custom */}
                    {currentSelectedPayroll.totalShortfallMinutes > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Approve deduction */}
                          <Button
                            type="button"
                            size="sm"
                            variant={currentSelectedPayroll.shortfallApprovalStatus === 'approved' ? 'default' : 'outline'}
                            onClick={() => handleApproveShortfall(currentSelectedPayroll.emp)}
                            className={`rounded-xl text-xs font-bold h-8 px-2.5 ${currentSelectedPayroll.shortfallApprovalStatus === 'approved' ? 'bg-amber-600 text-white' : 'border-amber-300 text-amber-800 hover:bg-amber-50'}`}
                          >
                            ✓ اعتماد الخصم (-{fmtNum(currentSelectedPayroll.proposedShortfallDeduction)} ر.س)
                          </Button>

                          {/* Waive / Excuse */}
                          <Button
                            type="button"
                            size="sm"
                            variant={currentSelectedPayroll.shortfallApprovalStatus === 'waived' ? 'default' : 'outline'}
                            onClick={() => handleWaiveShortfall(currentSelectedPayroll.emp)}
                            className={`rounded-xl text-xs font-bold h-8 px-2.5 ${currentSelectedPayroll.shortfallApprovalStatus === 'waived' ? 'bg-emerald-600 text-white' : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'}`}
                          >
                            🛡️ تجاوز / إعفاء (0 ر.س)
                          </Button>

                          {/* Custom Amount */}
                          <Button
                            type="button"
                            size="sm"
                            variant={isEditingShortfall ? 'default' : 'outline'}
                            onClick={() => {
                              setIsEditingShortfall(!isEditingShortfall);
                              setCustomShortfallAmount(String(currentSelectedPayroll.approvedShortfallDeduction || currentSelectedPayroll.proposedShortfallDeduction || ''));
                            }}
                            className={`rounded-xl text-xs font-bold h-8 px-2.5 ${isEditingShortfall ? 'bg-blue-600 text-white' : 'border-blue-300 text-blue-900 hover:bg-blue-50'}`}
                          >
                            ✏️ تعديل الخصم
                          </Button>
                        </div>

                        {isEditingShortfall && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-xl flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={customShortfallAmount}
                              onChange={(e) => setCustomShortfallAmount(e.target.value)}
                              placeholder="مبلغ خصم العجز بالريال..."
                              className="rounded-lg text-xs font-mono h-8 bg-white dark:bg-slate-900"
                            />
                            <Button size="sm" onClick={() => handleSaveCustomShortfall(currentSelectedPayroll.emp)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold h-8 px-3">
                              تطبيق
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {/* 4. DISCIPLINARY PENALTIES & DEDUCTIONS CARD */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-heading font-black text-sm text-foreground">4. الجزاءات والخصومات الإدارية الموثقة</h3>
                      <p className="text-[11px] text-muted-foreground">تسجيل أي خصم إضافي مع ذكر السبب والمبرر المعتمد</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAdjType('penalty');
                        setAdjForm({
                          employee_number: currentSelectedEmp.employee_number || currentSelectedEmp.id,
                          type: 'penalty',
                          category: 'administrative_penalty',
                          amount: 200,
                          days_count: 1,
                          month_prefix: monthPrefix,
                          reason: 'خصم إداري موثق',
                          approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                        });
                        setNewAdjModal(true);
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl gap-1.5 h-8 px-3 shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + إضافة استقطاع / جزاء
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {currentSelectedPayroll.approvedPenalties?.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs font-bold">
                        لا توجد جزاءات أو خصومات إدارية مسجلة لهذا الموظف في شهر {monthPrefix}.
                      </div>
                    ) : (
                      currentSelectedPayroll.approvedPenalties?.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl border bg-rose-50/40 dark:bg-rose-950/20 text-xs">
                          <div>
                            <span className="font-bold text-rose-800 dark:text-rose-300">⚠️ {p.reason || 'جزاء إداري'}</span>
                            <span className="text-muted-foreground mr-2 font-mono text-[11px]">({p.category})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-rose-600 text-sm">-{fmtNum(p.amount)} ر.س</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteAdjustment(p.id)}
                              className="h-7 w-7 text-rose-600 rounded-lg hover:bg-rose-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

              </div>

              {/* ─── DETAILED COMPREHENSIVE DEDUCTIONS SUMMARY BANNER ──────── */}
              <div className="p-5 bg-gradient-to-r from-rose-50 to-rose-100/70 dark:from-rose-950/50 dark:to-rose-900/30 border border-rose-300 dark:border-rose-800 rounded-3xl space-y-3">
                <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-800/80 pb-3 flex-wrap gap-2">
                  <div className="font-heading font-black text-sm text-rose-950 dark:text-rose-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-rose-600" />
                    <span>ملخص تدقيق الاستقطاعات المعتمدة للموظف ({currentSelectedEmp.full_name}) لشهر {monthPrefix}:</span>
                  </div>
                  <div className="font-mono font-black text-rose-700 dark:text-rose-300 text-lg bg-white dark:bg-slate-900 px-3.5 py-1 rounded-2xl border border-rose-200 shadow-sm">
                    إجمالي الاستقطاعات: -{fmtNum(currentSelectedPayroll.totalDeductions)} ر.س
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center font-mono">
                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/60">
                    <div className="text-[10px] text-muted-foreground font-sans">قسط السلفة:</div>
                    <div className="font-bold text-amber-700 dark:text-amber-300 text-sm mt-0.5">
                      -{fmtNum(currentSelectedPayroll.advanceInstallment || 0)} ر.س
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/60">
                    <div className="text-[10px] text-muted-foreground font-sans">خصم الغياب:</div>
                    <div className="font-bold text-rose-700 dark:text-rose-300 text-sm mt-0.5">
                      -{fmtNum(currentSelectedPayroll.approvedAbsenceDeduction || 0)} ر.س
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/60">
                    <div className="text-[10px] text-muted-foreground font-sans">خصم عجز الساعات:</div>
                    <div className="font-bold text-rose-700 dark:text-rose-300 text-sm mt-0.5">
                      -{fmtNum(currentSelectedPayroll.approvedShortfallDeduction || 0)} ر.س
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/60">
                    <div className="text-[10px] text-muted-foreground font-sans">الجزاءات الإدارية:</div>
                    <div className="font-bold text-rose-700 dark:text-rose-300 text-sm mt-0.5">
                      -{fmtNum(currentSelectedPayroll.customPenaltiesTotal || 0)} ر.س
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ─── STAGE 3: EARNINGS & INCENTIVES APPROVAL ───────────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && currentSelectedEmp && currentSelectedPayroll && (
            <div className="space-y-4">
              
              {/* Employee Navigator */}
              <div className="flex items-center justify-between bg-card p-4 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">تدقيق مستحقات:</span>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="w-64 rounded-xl text-xs font-bold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilteredEmployees.map(e => (
                        <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                          {e.full_name} (#{e.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStepChange(2)}
                    className="rounded-xl text-xs font-bold gap-1 h-9"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>الرجوع للاستقطاعات</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStepChange(4)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md"
                  >
                    <span>اعتماد المستحقات والانتقال للمراجعة النهائية</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  </Button>
                </div>
              </div>

              {/* Earnings Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Friday Allowance */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-heading font-black text-sm text-foreground">1. بدل حضور الجمعة</h3>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold border-0">
                      {currentSelectedPayroll.fridayWorkedDays || 0} جمعات دوام فعلي
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المعادلة:</span>
                      <span className="font-mono font-bold">{currentSelectedPayroll.fridayWorkedDays || 0} يوم × {currentSelectedPayroll.fridayDailyRate} ر.س</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-emerald-800">المبلغ المستحق:</span>
                      <span className="font-mono font-black text-emerald-600 text-sm">+{fmtNum(currentSelectedPayroll.fridayAllowance)} ر.س</span>
                    </div>
                  </div>
                </Card>

                {/* 2. Daily OT Allowance */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h3 className="font-heading font-black text-sm text-foreground">2. إضافي دوام 9 ساعات (100 ر.س / يوم)</h3>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 text-xs font-mono font-bold border-0">
                      {currentSelectedPayroll.overtimeDays} يوم
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المعادلة:</span>
                      <span className="font-mono font-bold">{currentSelectedPayroll.overtimeDays} يوم × 100 ر.س</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-blue-800">المبلغ المستحق:</span>
                      <span className="font-mono font-black text-blue-600 text-sm">+{fmtNum(currentSelectedPayroll.dailyOvertimeAllowance)} ر.س</span>
                    </div>
                  </div>
                </Card>

                {/* 3. Basic & Fixed Allowances */}
                <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-slate-700" />
                      <h3 className="font-heading font-black text-sm text-foreground">3. الراتب والبدلات الثابتة</h3>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold">عقد العمل</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الراتب الأساسي:</span>
                      <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.basicSalary)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">بدل السكن والمواصلات:</span>
                      <span className="font-mono font-bold">{fmtNum(currentSelectedPayroll.housing + currentSelectedPayroll.transport)} ر.س</span>
                    </div>
                  </div>
                </Card>

              </div>

              {/* 4. Sales Incentives & Custom Bonuses List */}
              <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-heading font-black text-sm text-foreground">4. الحوافز والمكافآت التشجيعية المعتمدة</h3>
                    <p className="text-xs text-muted-foreground">اعتماد حافز المبيعات، ومكافآت التميز والأداء للموظف</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAdjType('bonus');
                      setAdjForm({
                        employee_number: currentSelectedEmp.employee_number || currentSelectedEmp.id,
                        type: 'bonus',
                        category: 'sales_incentive',
                        amount: 500,
                        days_count: 1,
                        month_prefix: monthPrefix,
                        reason: 'مكافأة تشجيعية لتحقيق تارجت المبيعات',
                        approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                      });
                      setNewAdjModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 h-8"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + إضافة مكافأة / حافز مبيعات
                  </Button>
                </div>

                <div className="space-y-2">
                  {currentSelectedPayroll.approvedBonuses?.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs font-bold">
                      لا توجد مكافآت مسجلة لهذا الموظف في شهر {monthPrefix}.
                    </div>
                  ) : (
                    currentSelectedPayroll.approvedBonuses?.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3.5 rounded-2xl border bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                        <div>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">🎁 {b.reason || 'مكافأة تشجيعية'}</span>
                          <span className="text-muted-foreground mr-2 font-mono text-[11px]">({b.category})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-emerald-600 text-sm">+{fmtNum(b.amount)} ر.س</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAdjustment(b.id)}
                            className="h-7 w-7 text-rose-600 rounded-lg hover:bg-rose-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total Additions Summary Card */}
                <div className="p-4 bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">إجمالي مستحقات الموظف المعتمدة لشهر {monthPrefix}:</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-base">
                    +{fmtNum(currentSelectedPayroll.totalAdditions + currentSelectedPayroll.basicSalary)} ر.س
                  </span>
                </div>
              </Card>

            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 4: FINAL AUDIT & CLOUD MONTHLY LOCKING ──────────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ─── STAGE 5: HISTORICAL ARCHIVE & STAMPED CERTIFIED PAYSLIP ───── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <Stage5HistoricalArchive
              employees={employees}
              branches={branches}
              monthPrefix={monthPrefix}
              fmtNum={fmtNum}
              allPayrolls={allPayrolls}
              attendanceLogs={attendanceLogs}
              shifts={shifts}
              settings={settings}
              onOpenPayslip={(pr) => setSelectedForPayslip(pr)}
            />
          )}


          {currentStep === 4 && (
            <div className="space-y-6">
              
              {/* Lock Action Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono font-bold">
                      {monthPrefix}
                    </Badge>
                    <span className="text-xs text-slate-300 font-bold">
                      المرحلة الختامية (المراجعة العامة والإقفال المالي)
                    </span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-heading font-black text-white">
                    اعتماد وإقفال مسير رواتب شهر {monthPrefix.split('-')[1]} وحفظه سحابياً
                  </h2>
                  <p className="text-xs text-slate-300">
                    عند الإقفال، يتم حفظ نسخة موثقة في السحابة باسم <strong className="text-emerald-300 font-mono">رواتب شهر {monthPrefix.split('-')[1]}</strong> ويتاح للمحاسب الاطلاع دون إمكانية التعديل إلا للمدير.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isLocked ? (
                    <Button
                      onClick={() => setLockConfirmModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl h-12 px-6 shadow-xl gap-2 tracking-tight"
                    >
                      <Lock className="w-5 h-5" />
                      <span>اعتماد وإقفال رواتب شهر {monthPrefix.split('-')[1]}</span>
                    </Button>
                  ) : (
                    <div className="bg-emerald-950/80 border border-emerald-500/50 px-5 py-2.5 rounded-2xl flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>تم إقفال هذا المسير رسمياً</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 rounded-3xl border bg-card shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground">الرواتب الأساسية</div>
                  <div className="text-xl font-black font-mono mt-1">{fmtNum(totals.basic)} ر.س</div>
                </Card>
                <Card className="p-4 rounded-3xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700">إجمالي البدلات والمكافآت</div>
                  <div className="text-xl font-black font-mono text-emerald-600 mt-1">+{fmtNum(totals.totalAdditions)} ر.س</div>
                </Card>
                <Card className="p-4 rounded-3xl border bg-rose-50 dark:bg-rose-950/20 border-rose-200">
                  <div className="text-xs font-bold text-rose-700">إجمالي الخصومات والسلف</div>
                  <div className="text-xl font-black font-mono text-rose-600 mt-1">-{fmtNum(totals.totalDeductions)} ر.س</div>
                </Card>
                <Card className="p-4 rounded-3xl border bg-slate-900 text-white">
                  <div className="text-xs font-bold text-emerald-300">صافي المستحق للصرف</div>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{fmtNum(totals.net)} ر.س</div>
                </Card>
              </div>

              {/* Master Payroll Table */}
              <Card className="rounded-3xl border shadow-md overflow-hidden bg-card">
                <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-52 rounded-xl text-xs bg-background h-9">
                        <SelectValue placeholder="تصفية بالفرع..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono font-bold">
                    إجمالي الموظفين: {filteredPayrolls.length} موظف
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr className="bg-slate-900 text-white font-heading font-black border-b border-slate-800">
                        <th className="py-3.5 px-4">الموظف</th>
                        <th className="py-3.5 px-3">الراتب الأساسي</th>
                        <th className="py-3.5 px-3 text-emerald-300">الإضافي والمكافآت ↗</th>
                        <th className="py-3.5 px-3 text-rose-300">الاستقطاعات والخصم ↘</th>
                        <th className="py-3.5 px-3 text-center">التأمينات</th>
                        <th className="py-3.5 px-4 text-center bg-emerald-950/80 text-emerald-300 text-sm">صافي المستحق</th>
                        <th className="py-3.5 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredPayrolls.map((pr, idx) => (
                        <tr key={pr.emp.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground text-xs">{pr.emp.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{pr.emp.employee_number} • {pr.emp.job_title}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">{fmtNum(pr.basicSalary)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">+{fmtNum(pr.totalAdditions)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-rose-600">-{fmtNum(pr.totalDeductions)}</td>
                          <td className="py-3 px-3 text-center">
                            {pr.isInsured ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">🛡️ مؤمن</Badge> : <span className="text-muted-foreground/60 text-[10px]">غير مسجل</span>}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 text-sm">
                            {fmtNum(pr.netSalary)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedForPayslip(pr)}
                              className="h-8 text-xs font-bold rounded-xl gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              قسيمة الراتب A4
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

        </div>
      )}

      {/* ─── 3. MAIN VIEW 2: LOCKED MONTHLY ARCHIVES (ACCOUNTANT AUDIT) ─────── */}
      {mainView === 'archive' && (
        <div className="space-y-4">
          <div className="bg-card p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-heading font-black text-foreground mb-1">
              أرشيف مسيرات الرواتب المقفلة والمعتمدة سحابياً
            </h2>
            <p className="text-xs text-muted-foreground">
              سجل أرشيفي موثق لكافة شهور الرواتب المقفلة. يمكن للمحاسب الإداري استعراض أي مسير وطباعة القسائم دون تعديل.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedArchives.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-muted-foreground font-bold">
                لا توجد مسيرات مقفلة بعد. قم بإنهاء دورة الاعتماد لشهر {monthPrefix} والضغط على "اعتماد وإقفال".
              </div>
            ) : (
              lockedArchives.map(arc => (
                <Card key={arc.month_prefix} className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-heading font-black text-sm text-foreground">{arc.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{arc.month_prefix}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-bold">
                      <Lock className="w-3 h-3" /> مقفل
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">صافي الرواتب المصروفة:</span>
                      <span className="font-mono font-black text-emerald-600 text-sm">{fmtNum(arc.totals?.net)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد الموظفين المعتمدين:</span>
                      <span className="font-mono font-bold">{arc.employee_count} موظف</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground border-t pt-2">
                      <span>المعتمد: {arc.locked_by || 'المدير العام'}</span>
                      <span className="font-mono">{arc.locked_at?.slice(0, 10)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setMonthPrefix(arc.month_prefix);
                      setMainView('wizard');
                      setCurrentStep(4);
                      toast({ title: `✓ تم فتح ${arc.title} للمعاينة المحاسبية` });
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9 gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>استعراض مسير الشهر والقسائم</span>
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

        </>
      )}
      {/* ─── MODAL: LOCK CONFIRMATION ──────────────────────────────────────── */}
      <Dialog open={lockConfirmModal} onOpenChange={setLockConfirmModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              تأكيد اعتماد وإقفال رواتب شهر {monthPrefix.split('-')[1]}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              أنت على وشك اعتماد مسير الرواتب الرسمي لشهر <strong>{monthPrefix}</strong> بإجمالي صافي قدره:
            </p>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-center">
              <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {fmtNum(totals.net)} ر.س
              </div>
              <div className="text-[11px] text-emerald-800 font-bold mt-1">
                إجمالي مستحقات {filteredPayrolls.length} موظف
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
              🔒 بعد الإقفال، ستُحفظ البيانات في السحابة المركزية باسم <strong>رواتب شهر {monthPrefix.split('-')[1]}</strong> ويتاح للمحاسب الاطلاع والطباعة فقط دون تعديل.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLockConfirmModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleLockMonthlyPayroll} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">
              تأكيد الإقفال والاعتماد السحابي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: UNLOCK CONFIRMATION (ADMIN ONLY) ────────────────────────── */}
      <Dialog open={unlockModal} onOpenChange={setUnlockModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black text-rose-600 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-rose-600" />
              فك إقفال مسير الرواتب (خاص بالمدير العام)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              هل أنت متأكد من فك إقفال رواتب شهر <strong>{monthPrefix}</strong> لإجراء تعديلات طارئة؟
            </p>
            <div className="space-y-1.5">
              <Label className="font-bold">سبب ومبرر فك الإقفال:</Label>
              <Input
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="أدخل مبرر التعديل الطارئ..."
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUnlockModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleUnlockMonthlyPayroll} className="bg-rose-600 text-white rounded-xl font-bold">
              تأكيد فك الإقفال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: EDIT PUNCH DYNAMIC MULTI-SHIFT (STAGE 1 ADMIN) ───────── */}
      {editPunchModal && (
        <Dialog open={!!editPunchModal} onOpenChange={(o) => !o && setEditPunchModal(null)}>
          <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <span>تعديل واعتماد بصمة اليوم — {editPunchModal.emp?.full_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              
              {/* Shift Banner */}
              <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-sky-900 dark:text-sky-200">الوردية المعتمدة: </span>
                  <span className="font-bold text-sky-700 dark:text-sky-300">{editPunchModal.emp?.shift || 'فترة عمل'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-600 text-white font-bold text-[10px]">
                    {editPunchModal.isSplitShift ? 'دوام فترتين (4 بصمات)' : 'دوام فترة واحدة (بصمتين)'}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const std = getStandardShiftPunches(editPunchModal.emp?.shift || '');
                      setEditPunchModal(prev => ({
                        ...prev,
                        newStatus: 'present',
                        p1In: std.p1In,
                        p1Out: std.p1Out,
                        p2In: std.p2In,
                        p2Out: std.p2Out,
                        newCheckIn: std.p1In,
                        newCheckOut: std.isSplit ? std.p2Out : std.p1Out
                      }));
                      toast({ title: '⚡ تم ملء البصمات القياسية للشفت بنجاح' });
                    }}
                    className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1 shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>ملء حضور منضبط تلقائياً</span>
                  </Button>
                </div>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">تاريخ اليوم:</Label>
                  <div className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border flex items-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {editPunchModal.log.log_date} ({editPunchModal.log.day_name})
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold">حالة اليوم المعتمدة:</Label>
                  <Select
                    value={editPunchModal.newStatus}
                    onValueChange={(v) => setEditPunchModal(prev => ({ ...prev, newStatus: v }))}
                  >
                    <SelectTrigger className="rounded-xl font-bold text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-72">
                      <SelectItem value="weekend" className="font-bold text-indigo-700 py-2">🏖️ عطلة جمعة رسمية (بدون دوام / إلغاء البصمات)</SelectItem>
                      <SelectItem value="present" className="font-bold text-emerald-700 py-2">✓ حاضر (دوام منضبط مكتمل)</SelectItem>
                      <SelectItem value="late" className="font-bold text-amber-700 py-2">⏰ متأخر (مع احتساب التأخير)</SelectItem>
                      <SelectItem value="annual_leave" className="font-bold text-teal-700 py-2">🏖️ إجازة سنوية (تخصم من رصيد الإجازات - مدفوعة)</SelectItem>
                      <SelectItem value="sick_leave" className="font-bold text-purple-700 py-2">🏥 إجازة مرضية (بتقرير طبي - مدفوعة)</SelectItem>
                      <SelectItem value="emergency_leave" className="font-bold text-indigo-700 py-2">⚠️ إجازة اضطرارية (تخصم من الرصيد)</SelectItem>
                      <SelectItem value="unpaid_leave" className="font-bold text-rose-700 py-2">⏳ إجازة بدون راتب (خصم من الراتب)</SelectItem>
                      <SelectItem value="unexcused_absence" className="font-bold text-rose-800 py-2">🚫 غياب بدون إذن (خصم يوم كامل)</SelectItem>
                      <SelectItem value="exempt" className="font-bold text-slate-700 py-2">✨ معفى إدارياً / عطلة رسمية</SelectItem>
                      <SelectItem value="absent" className="font-bold text-rose-600 py-2">غائب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Punches based on Shift */}
              {!['annual_leave', 'sick_leave', 'emergency_leave', 'unpaid_leave', 'unexcused_absence', 'exempt', 'absent', 'weekend'].includes(editPunchModal.newStatus) ? (
                <>
                  {editPunchModal.isSplitShift ? (
                    /* ─── 4 PUNCHES FOR DUAL SHIFT ────────────────────────── */
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border/80">
                      <div className="flex items-center justify-between font-bold text-xs text-foreground">
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <Sun className="w-4 h-4" />
                          <span>بصمات الفترة الصباحية:</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">الفترة 1</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-bold">1. دخول صباحي (Check In 1)</Label>
                          <Input 
                            type="time" 
                            value={editPunchModal.p1In} 
                            onChange={(e) => setEditPunchModal(prev => ({ ...prev, p1In: e.target.value }))}
                            className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-bold">2. خروج صباحي (Check Out 1)</Label>
                          <Input 
                            type="time" 
                            value={editPunchModal.p1Out} 
                            onChange={(e) => setEditPunchModal(prev => ({ ...prev, p1Out: e.target.value }))}
                            className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                          />
                        </div>
                      </div>

                      {/* Break indicator */}
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                        <span className="flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>فترة الاستراحة الرسمية (البريك)</span>
                        </span>
                        <span className="font-mono font-bold" dir="ltr">1:00 PM - 4:00 PM</span>
                      </div>

                      <div className="flex items-center justify-between font-bold text-xs text-foreground pt-1">
                        <span className="flex items-center gap-1.5 text-indigo-600">
                          <Moon className="w-4 h-4" />
                          <span>بصمات الفترة المسائية:</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">الفترة 2</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-bold">3. دخول مسائي (Check In 2)</Label>
                          <Input 
                            type="time" 
                            value={editPunchModal.p2In} 
                            onChange={(e) => setEditPunchModal(prev => ({ ...prev, p2In: e.target.value }))}
                            className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-bold">4. خروج مسائي (Check Out 2)</Label>
                          <Input 
                            type="time" 
                            value={editPunchModal.p2Out} 
                            onChange={(e) => setEditPunchModal(prev => ({ ...prev, p2Out: e.target.value }))}
                            className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900 mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ─── 2 PUNCHES FOR SINGLE SHIFT ──────────────────────── */
                    <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-border/80">
                      <div className="space-y-1">
                        <Label className="font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <span>1. وقت الحضور (Check In):</span>
                        </Label>
                        <Input 
                          type="time" 
                          value={editPunchModal.newCheckIn} 
                          onChange={(e) => setEditPunchModal(prev => ({ ...prev, newCheckIn: e.target.value }))}
                          className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                          <span>2. وقت الانصراف (Check Out):</span>
                        </Label>
                        <Input 
                          type="time" 
                          value={editPunchModal.newCheckOut} 
                          onChange={(e) => setEditPunchModal(prev => ({ ...prev, newCheckOut: e.target.value }))}
                          className="rounded-xl font-mono text-xs font-bold h-9 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  )}
                
                </>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    {editPunchModal.newStatus === 'unpaid_leave' && <span className="text-purple-600 font-black">⏳ إجازة بدون راتب:</span>}
                    {editPunchModal.newStatus === 'annual_leave' && <span className="text-teal-600 font-black">🏖️ إجازة سنوية:</span>}
                    {editPunchModal.newStatus === 'sick_leave' && <span className="text-purple-600 font-black">🏥 إجازة مرضية:</span>}
                    {editPunchModal.newStatus === 'exempt' && <span className="text-slate-600 font-black">✨ معفى / عطلة رسمية:</span>}
                    {(editPunchModal.newStatus === 'absent' || editPunchModal.newStatus === 'unexcused_absence') && <span className="text-rose-600 font-black">🚫 غياب غير مبرر:</span>}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {editPunchModal.newStatus === 'unpaid_leave' && 'يوم إجازة بدون راتب: لن يتم تسجيل بصمات دخول أو خروج، وسيتم خصم قيمة اليوم كاملاً تلقائياً في مرحلة الاستقطاعات (الخطوة 2) دون احتساب عجز ساعات تأخير.'}
                    {editPunchModal.newStatus === 'annual_leave' && 'يوم إجازة سنوية مدفوعة: معفى من بصمات الحضور ويخصم يوم واحد من رصيد الإجازات السنوية المعتمدة للموظف.'}
                    {editPunchModal.newStatus === 'sick_leave' && 'يوم إجازة مرضية مدفوعة: معفى من بصمات الحضور بموجب تقرير طبي نظامي معتمد.'}
                    {editPunchModal.newStatus === 'exempt' && 'يوم معفى إدارياً أو عطلة رسمية: معفى من الحضور ولا يترتب عليه أي خصم أو عجز ساعات.'}
                    {(editPunchModal.newStatus === 'absent' || editPunchModal.newStatus === 'unexcused_absence') && 'يوم غياب غير مبرر: يتم احتساب اليوم كغياب ويخصم أجر اليوم كاملاً في الاستقطاعات دون احتسابه في عجز ساعات التأخير.'}
                  </p>
                </div>
              )}

            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditPunchModal(null)} className="rounded-xl font-bold text-xs">
                إلغاء
              </Button>
              <Button 
                onClick={handleSavePunchEdit} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ واعتماد البصمة 💾</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: PAYSLIP A4 PRINT ───────────────────────────────────────── */}
      {selectedForPayslip && (
        <PayslipPrint
          payroll={selectedForPayslip}
          monthLabel={monthPrefix}
          onClose={() => setSelectedForPayslip(null)}
        />
      )}

      {/* ─── MODAL: BIOMETRICS A4 PRINT ────────────────────────────────────── */}
      {selectedForBioPrint && (
        <BiometricsPrintModal
          open={!!selectedForBioPrint}
          onOpenChange={(o) => !o && setSelectedForBioPrint(null)}
          employee={selectedForBioPrint.employee}
          dailyDetails={selectedForBioPrint.dailyDetails}
          monthLabel={monthPrefix}
          payroll={selectedForBioPrint.payroll}
        />
      )}

      
      {/* ─── MODAL: ADVANCE PRINT A4 (PROMISSORY NOTE) ──────────────────────── */}
      {selectedAdvanceForPrint && (
        <AdvancePrintModal
          open={!!selectedAdvanceForPrint}
          onOpenChange={(o) => !o && setSelectedAdvanceForPrint(null)}
          advance={selectedAdvanceForPrint}
          employee={employees.find(e => String(e.employee_number || e.id) === String(selectedAdvanceForPrint?.employee_number))}
        />
      )}

      {/* ─── MODAL: REGISTER NEW ADVANCE / LOAN ────────────────────────────── */}
      <Dialog open={newAdvanceModal} onOpenChange={setNewAdvanceModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-700" />
              <span>تسجيل ومنح سلفة مالية جديدة لموظف</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Employee Selector */}
            <div className="space-y-1.5">
              <Label className="font-bold">الموظف المستفيد *:</Label>
              <Select
                value={advanceForm.employee_number}
                onValueChange={(v) => setAdvanceForm(prev => ({ ...prev, employee_number: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                      {e.full_name} (#{e.employee_number}) - {e.branch_name || 'فرع كيا'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Amount and Already Paid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold">إجمالي مبلغ السلفة الأصلية (ر.س) *:</Label>
                <Input
                  type="number"
                  value={advanceForm.total_amount}
                  onChange={(e) => {
                    const tot = Number(e.target.value) || 0;
                    const monthly = Number(advanceForm.monthly_installment) || 500;
                    const insts = monthly > 0 ? Math.ceil(tot / monthly) : 6;
                    setAdvanceForm(prev => ({ ...prev, total_amount: tot, total_installments: insts }));
                  }}
                  placeholder="مثال: 6000"
                  className="rounded-xl font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">المسدد سابقاً (إن وُجد):</Label>
                <Input
                  type="number"
                  value={advanceForm.paid_amount}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, paid_amount: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  className="rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Monthly Installment and Installments Count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold">القسط الشهري المستقطع (ر.س/شهر) *:</Label>
                <Input
                  type="number"
                  value={advanceForm.monthly_installment}
                  onChange={(e) => {
                    const m = Number(e.target.value) || 0;
                    const rem = (Number(advanceForm.total_amount) || 0) - (Number(advanceForm.paid_amount) || 0);
                    const insts = m > 0 ? Math.ceil(rem / m) : 1;
                    setAdvanceForm(prev => ({ ...prev, monthly_installment: m, total_installments: insts }));
                  }}
                  placeholder="مثال: 500"
                  className="rounded-xl font-mono font-bold text-rose-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">عدد الأشهر المتوقعة:</Label>
                <Input
                  type="number"
                  value={advanceForm.total_installments}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, total_installments: Number(e.target.value) || 1 }))}
                  className="rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            {/* Live Remaining Balance Calculation */}
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">الرصيد المتبقي الفعلي قيد الاستقطاع:</div>
                <div className="font-mono font-black text-base text-purple-900 dark:text-purple-100 mt-0.5">
                  {fmtNum(Math.max(0, (Number(advanceForm.total_amount) || 0) - (Number(advanceForm.paid_amount) || 0)))} ر.س
                </div>
              </div>
              <Badge className="bg-purple-600 text-white font-bold text-[10px]">
                {advanceForm.monthly_installment} ر.س / شهر
              </Badge>
            </div>

            {/* Start Month */}
            <div className="space-y-1.5">
              <Label className="font-bold">شهر بدء الاستقطاع من الراتب:</Label>
              <Input
                type="month"
                value={advanceForm.start_month}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, start_month: e.target.value }))}
                className="rounded-xl font-mono"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="font-bold">سبب ومبرر السلفة:</Label>
              <Textarea
                rows={2}
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="مثال: رصيد سلفة قديمة مستحقة، سلفة سيارة، زواج..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewAdvanceModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!advanceForm.employee_number || !advanceForm.total_amount) {
                  toast({ title: 'يرجى اختيار الموظف ومبلغ السلفة', variant: 'destructive' });
                  return;
                }
                const emp = employees.find(e => String(e.employee_number || e.id) === String(advanceForm.employee_number));
                const monthly = Math.round((Number(advanceForm.total_amount) / Number(advanceForm.total_installments)) * 100) / 100;
                
                const totAmt = Number(advanceForm.total_amount);
                const paidAmt = Number(advanceForm.paid_amount) || 0;
                const monthlyAmt = Number(advanceForm.monthly_installment) || Math.round((totAmt - paidAmt) / (Number(advanceForm.total_installments) || 1));
                const instCount = Number(advanceForm.total_installments) || (monthlyAmt > 0 ? Math.ceil((totAmt - paidAmt) / monthlyAmt) : 1);
                
                const createdAdvance = saveAdvance({
                  employee_id: emp?.id || '',
                  employee_number: emp?.employee_number || advanceForm.employee_number,
                  employee_name: emp?.full_name || '',
                  total_amount: totAmt,
                  paid_amount: paidAmt,
                  remaining_balance: Math.max(0, totAmt - paidAmt),
                  total_installments: instCount,
                  monthly_installment: monthlyAmt,
                  start_month: advanceForm.start_month || '2026-08',
                  reason: advanceForm.reason || 'رصيد سلفة قديمة مستحقة',
                  status: 'active',
                  approved_by: advanceForm.approved_by || 'فهد ناصر محمد الجوعي (المدير العام)'
                });

                setAdvancesList(getAdvances());
                setNewAdvanceModal(false);
                toast({ title: '✓ تم تسجيل ومنح السلفة بنجاح وتفعيل الاستقطاع الشهري الآلي' });
                // Automatically open printable note
                setSelectedAdvanceForPrint(createdAdvance);
              }}
              className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold shadow-md shadow-purple-500/20"
            >
              اعتماد ومنح السلفة ➔
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ─── MODAL: ADD ADJUSTMENT (BONUS / PENALTY) ────────────────────────── */}
      <Dialog open={newAdjModal} onOpenChange={setNewAdjModal}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              {adjType === 'bonus' ? <Gift className="w-5 h-5 text-emerald-600" /> : <AlertOctagon className="w-5 h-5 text-rose-600" />}
              {adjType === 'bonus' ? 'اعتماد مكافأة تشجيعية / حافز' : 'اعتماد جزاء / استقطاع مالي'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold">الموظف المعني:</Label>
              <Select
                value={adjForm.employee_number}
                onValueChange={(v) => setAdjForm(prev => ({ ...prev, employee_number: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الموظف..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                      {e.full_name} (#{e.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">المبلغ (ر.س):</Label>
              <Input
                type="number"
                value={adjForm.amount}
                onChange={(e) => setAdjForm(prev => ({ ...prev, amount: e.target.value }))}
                className="rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">المبرر والسبب الرسمي:</Label>
              <Textarea
                rows={2}
                value={adjForm.reason}
                onChange={(e) => setAdjForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="أدخل مبرر وتفاصيل القرار..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewAdjModal(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!adjForm.employee_number || !adjForm.amount) {
                  toast({ title: 'يرجى اختيار الموظف والمبلغ', variant: 'destructive' });
                  return;
                }
                const emp = employees.find(e => String(e.employee_number || e.id) === String(adjForm.employee_number));
                saveAdjustment({
                  type: adjType,
                  category: adjForm.category,
                  employee_id: emp?.id || '',
                  employee_number: emp?.employee_number || adjForm.employee_number,
                  employee_name: emp?.full_name || '',
                  month_prefix: monthPrefix,
                  amount: Number(adjForm.amount) || 0,
                  reason: adjForm.reason || (adjType === 'bonus' ? 'مكافأة تشجيعية' : 'جزاء إداري'),
                  approved_by: 'فهد ناصر محمد الجوعي (المدير العام)'
                });
                setAdjustmentsList(getAdjustments());
                setNewAdjModal(false);
                toast({ title: adjType === 'bonus' ? '✓ تم اعتماد المكافأة بنجاح' : '✓ تم اعتماد الجزاء بنجاح' });
              }}
              className={adjType === 'bonus' ? "bg-emerald-600 text-white rounded-xl font-bold" : "bg-rose-600 text-white rounded-xl font-bold"}
            >
              حفظ واعتماد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


// ─── STAGE 5 COMPONENT: HISTORICAL CERTIFIED PAYSLIP WITH ACCOUNTANT STAMP ────
function Stage5HistoricalArchive({ employees, branches, monthPrefix, allPayrolls, attendanceLogs, shifts, settings, fmtNum, onOpenPayslip }) {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthPrefix || '2026-08');
  const [extractedData, setExtractedData] = useState(null);
  const { toast } = useToast();

  const branchEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees;
    return employees.filter(e => (e.branch_name || e.branch || '') === selectedBranch);
  }, [employees, selectedBranch]);

  useEffect(() => {
    if (branchEmployees.length > 0) {
      setSelectedEmpId(String(branchEmployees[0].employee_number || branchEmployees[0].id));
    } else {
      setSelectedEmpId('');
    }
  }, [branchEmployees]);

  const handleExtract = () => {
    if (!selectedEmpId) {
      toast({ title: 'يرجى اختيار الموظف', variant: 'destructive' });
      return;
    }

    const emp = employees.find(e => String(e.employee_number || e.id) === String(selectedEmpId));
    if (!emp) return;

    const result = computeEmployeePayroll(emp, attendanceLogs, shifts, { ...settings, monthPrefix: selectedMonth });
    setExtractedData({
      employee: emp,
      month: selectedMonth,
      payroll: result,
      extractedAt: new Date().toISOString()
    });

    if (onOpenPayslip) {
      onOpenPayslip(result);
    }
    toast({ title: `✓ تم استخراج وفتح قسيمة الراتب الرسمية A4 لـ: ${emp.full_name}` });
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Search & Extraction Controls Card */}
      <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-foreground">
                أرشيف مسيرات الرواتب المعتمدة والمختومة
              </h2>
              <p className="text-xs text-muted-foreground">
                استخراج وطباعة قسيمة الراتب الرسمية A4 المتوافقة مع البنوك ووزارة الموارد البشرية ونظام حماية الأجور (WPS)
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-xs font-bold px-3 py-1">
            WPS Compliant ✓
          </Badge>
        </div>

        {/* 3 Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          
          {/* 1. Branch */}
          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">1. اختر فرع الموظف:</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 h-11 font-bold">
                <SelectValue placeholder="اختر الفرع..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
                <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
                <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
                <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Employee */}
          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">2. اختر اسم الموظف:</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 h-11 font-bold">
                <SelectValue placeholder="اختر الموظف..." />
              </SelectTrigger>
              <SelectContent>
                {branchEmployees.map(e => (
                  <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                    {e.full_name} (#{e.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Month */}
          <div className="space-y-1.5">
            <Label className="font-bold text-foreground">3. الشهر المالي المعتمد:</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 h-11 font-bold font-mono">
                <SelectValue placeholder="اختر الشهر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-08">أغسطس 2026 (August 2026)</SelectItem>
                <SelectItem value="2026-07">يوليو 2026 (July 2026)</SelectItem>
                <SelectItem value="2026-06">يونيو 2026 (June 2026)</SelectItem>
                <SelectItem value="2026-05">مايو 2026 (May 2026)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Extract Button */}
          <div className="flex items-end">
            <Button
              onClick={handleExtract}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs gap-2 shadow-md shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>استخراج وطباعة قسيمة الراتب A4</span>
            </Button>
          </div>

        </div>
      </Card>

      {/* Extracted Payslip Document Banner */}
      {extractedData && (
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="font-heading font-black text-base text-foreground">
                مسير راتب: {extractedData.employee.full_name} (#{extractedData.employee.employee_number})
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                صافي الراتب المستحق: <strong className="text-emerald-600 font-mono text-sm">{fmtNum(extractedData.payroll.netSalary)} ر.س</strong> • شهر: {extractedData.month}
              </div>
            </div>
          </div>

          <Button
            onClick={() => onOpenPayslip && onOpenPayslip(extractedData.payroll)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-11 px-6 rounded-2xl gap-2 shadow-md"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>فتح نافذة الطباعة الرسمية A4</span>
          </Button>
        </div>
      )}

    </div>
  );
}

// ─── DEDICATED ADVANCES & LOANS MANAGEMENT HUB COMPONENT ─────────────────────
function AdvancesManagementHub({ employees, advancesList, onRefresh, onOpenNewAdvance, onPrintAdvance, fmtNum }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const { toast } = useToast();

  // Repayment Modal State
  const [repaymentModalOpen, setRepaymentModalOpen] = useState(false);
  const [selectedAdvForRepay, setSelectedAdvForRepay] = useState(null);
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);
  const [repayForm, setRepayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: '',
    receipt_number: ''
  });

  // Normalize all advances and filter out 0-amount ghost records
  const normalizedList = useMemo(() => {
    return (advancesList || [])
      .map(a => normalizeAdvance(a))
      .filter(a => a && a.total_amount > 0);
  }, [advancesList]);

  // Statistics
  const stats = useMemo(() => {
    let totalGranted = 0;
    let totalRepaid = 0;
    let activeCount = 0;
    let completedCount = 0;

    normalizedList.forEach(adv => {
      const amt = Number(adv.total_amount) || 0;
      const paid = Number(adv.paid_amount) || 0;
      totalGranted += amt;
      totalRepaid += paid;
      const rem = Math.max(0, amt - paid);
      if (rem <= 0 || adv.status === 'completed') completedCount++;
      else activeCount++;
    });

    const totalRemaining = Math.max(0, totalGranted - totalRepaid);
    return { totalGranted, totalRepaid, totalRemaining, activeCount, completedCount, totalCount: normalizedList.length };
  }, [normalizedList]);

  // Filtered advances
  const filtered = useMemo(() => {
    return normalizedList.filter(adv => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (adv.employee_name || '').toLowerCase().includes(q) ||
        (adv.employee_number || '').toString().includes(q) ||
        (adv.reason || '').toLowerCase().includes(q);

      const rem = Math.max(0, (Number(adv.total_amount) || 0) - (Number(adv.paid_amount) || 0));
      const isComp = rem <= 0 || adv.status === 'completed';

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = !isComp;
      if (statusFilter === 'completed') matchStatus = isComp;

      return matchSearch && matchStatus;
    });
  }, [normalizedList, search, statusFilter]);

  const handleDelete = async (adv) => {
    if (!adv || !adv.id) return;
    if (!window.confirm(`هل أنت متأكد من حذف وإلغاء سلفة الموظف: ${adv.employee_name || ''} بمبلغ ${fmtNum(adv.total_amount)} ر.س نهائياً؟`)) {
      return;
    }

    try {
      await deleteAdvance(adv.id, adv);
      toast({ title: '✓ تم حذف وإلغاء السلفة بنجاح من النظام والسحابة' });
      onRefresh();
    } catch (err) {
      toast({ title: 'خطأ في حذف السلفة', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ─── 1. TOP TITLE BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground">
                نظام إدارة السلف والقروض المؤسسية
              </h1>
              <Badge className="bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 text-xs font-mono font-bold">
                {normalizedList.length} سلفة معتمدة
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة السلف، جدولة الأقساط الشهرية الآلية، وسندات لأمر المعتمدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenNewAdvance}
            className="bg-purple-700 hover:bg-purple-600 text-white rounded-2xl text-xs font-black gap-2 h-10 px-5 shadow-md shadow-purple-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل سلفة جديدة لموظف</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. TOP STATS CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Granted */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">إجمالي مبالغ السلف</div>
            <div className="font-mono font-black text-2xl text-purple-700 dark:text-purple-400 mt-1">
              {fmtNum(stats.totalGranted)} <span className="text-xs font-normal">ر.س</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.totalCount} سلفة إجمالية</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </Card>

        {/* Total Repaid */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">المبالغ المسددة والمستردة</div>
            <div className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
              {fmtNum(stats.totalRepaid)} <span className="text-xs font-normal">ر.س</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
              {stats.totalGranted > 0 ? Math.round((stats.totalRepaid / stats.totalGranted) * 100) : 0}% نسبة الاسترداد
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* Total Remaining */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">الرصيد المتبقي قيد السداد</div>
            <div className="font-mono font-black text-2xl text-rose-600 dark:text-rose-400 mt-1">
              {fmtNum(stats.totalRemaining)} <span className="text-xs font-normal">ر.س</span>
            </div>
            <div className="text-[10px] text-rose-500 font-bold mt-0.5">ذمم مدينة قيد الاستقطاع</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        {/* Active Advances */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">السلف النشطة الجارية</div>
            <div className="font-mono font-black text-2xl text-sky-600 dark:text-sky-400 mt-1">
              {stats.activeCount} <span className="text-xs font-normal">سلف</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.completedCount} سلفة مكتملة السداد</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

      </div>

      {/* ─── 3. SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
      <Card className="rounded-3xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        
        <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث باسم الموظف، الرقم الوظيفي، أو سبب السلفة..."
              className="pr-9 h-10 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border-0"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
              }`}
            >
              الكل ({normalizedList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'active' ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
              }`}
            >
              السارية فقط ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'completed' ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
              }`}
            >
              المسددة بالكامل ({stats.completedCount})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
            <thead>
              <tr className="bg-purple-700 text-white font-heading font-black border-b border-purple-800">
                <th className="py-3.5 px-4"># الموظف</th>
                <th className="py-3.5 px-3">مبلغ السلفة</th>
                <th className="py-3.5 px-3">القسط الشهري والمدة</th>
                <th className="py-3.5 px-3">سبب ومبرر السلفة</th>
                <th className="py-3.5 px-3">المسدد حتى الآن</th>
                <th className="py-3.5 px-3">المتبقي للسداد</th>
                <th className="py-3.5 px-3">شهر البداية</th>
                <th className="py-3.5 px-3">الحالة</th>
                <th className="py-3.5 px-4 text-center">الخيارات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground font-bold">
                    لا توجد سلف مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((adv) => {
                  const emp = employees.find(e => String(e.employee_number || e.id) === String(adv.employee_number));
                  const total = Number(adv.total_amount) || 0;
                  const paid = Number(adv.paid_amount) || 0;
                  const remaining = Math.max(0, total - paid);
                  const isCompleted = remaining <= 0 || adv.status === 'completed';
                  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  return (
                    <tr key={adv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      
                      {/* Employee Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-xs">
                          {emp?.full_name || adv.employee_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          #{adv.employee_number} • {emp?.branch_name || 'فرع كيا (السليم)'}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-3 font-mono font-black text-purple-950 dark:text-purple-300 text-sm">
                        {fmtNum(adv.total_amount)} ر.س
                      </td>

                      {/* Monthly Installment */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {fmtNum(adv.monthly_installment)} ر.س / شهر
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          على {adv.total_installments} أشهر
                        </div>
                      </td>

                      {/* Reason Column */}
                      <td className="py-3.5 px-3 max-w-[160px]">
                        <span className="text-xs text-foreground font-medium line-clamp-2">
                          {adv.reason || 'سلفة شخصية'}
                        </span>
                      </td>

                      {/* Paid with progress */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-emerald-600">
                          {fmtNum(paid)} ر.س ({percent}%)
                        </div>
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-3 font-mono font-black text-rose-600 text-sm">
                        {fmtNum(remaining)} ر.س
                      </td>

                      {/* Start Month */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {adv.start_month}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isCompleted ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            ✓ مسددة بالكامل
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                            🟢 سارية وقيد الاستقطاع
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Print Promissory Note A4 */}
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAdvForRepay(adv);
                              setRepayForm({
                                amount: String(Math.min(adv.monthly_installment || 500, remaining)),
                                payment_date: new Date().toISOString().split('T')[0],
                                payment_method: 'cash',
                                notes: 'سداد دفعة نقدية من السلفة',
                                receipt_number: 'REC-' + Date.now().toString().slice(-5)
                              });
                              setRepaymentModalOpen(true);
                            }}
                            className="h-8 text-xs font-bold rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                            title="تسجيل سداد دفعة من السلفة في أي وقت"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>تسجيل سداد 💵</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPrintAdvance(adv)}
                            className="h-8 text-xs font-bold rounded-xl gap-1 border-purple-300 text-purple-900 dark:text-purple-300 hover:bg-purple-50 shadow-sm"
                            title="طباعة سند وإقرار السلفة A4"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" />
                            <span>سند A4</span>
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(adv)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                            title="حذف وإلغاء السلفة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </Card>

      {/* ─── REPAYMENT MODAL (تسجيل سداد مالي من السلفة) ───────────────────────── */}
      <Dialog open={repaymentModalOpen} onOpenChange={setRepaymentModalOpen}>
        <DialogContent className="max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <span>تسجيل سداد مالي من السلفة</span>
            </DialogTitle>
          </DialogHeader>

          {selectedAdvForRepay && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (isSubmittingRepay) return;
              setIsSubmittingRepay(true);
              try {
                const amtNum = Number(repayForm.amount);
                if (!amtNum || amtNum <= 0) {
                  throw new Error('يرجى إدخال مبلغ سداد صحيح أكبر من الصفر');
                }

                await recordAdvanceRepayment({
                  advanceId: selectedAdvForRepay.id,
                  amount: amtNum,
                  paymentDate: repayForm.payment_date,
                  paymentMethod: repayForm.payment_method,
                  notes: repayForm.notes,
                  receiptNumber: repayForm.receipt_number,
                  recordedBy: user?.full_name || 'المحاسب المالي'
                });

                toast({ title: '✓ تم تسجيل وسداد الدفعة بنجاح وتحديث الرصيد سحابياً' });
                setRepaymentModalOpen(false);
                setSelectedAdvForRepay(null);
                onRefresh();
              } catch (err) {
                toast({ title: 'خطأ في تسجيل السداد', description: err.message, variant: 'destructive' });
              } finally {
                setIsSubmittingRepay(false);
              }
            }} className="space-y-4 py-2 text-xs">
              
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border space-y-1.5">
                <div className="flex justify-between font-bold text-foreground">
                  <span>الموظف:</span>
                  <span>{selectedAdvForRepay.employee_name}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>إجمالي السلفة:</span>
                  <span className="font-mono">{fmtNum(selectedAdvForRepay.total_amount)} ر.س</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600">
                  <span>الرصيد المتبقي الحالي:</span>
                  <span className="font-mono">{fmtNum(selectedAdvForRepay.remaining_balance || selectedAdvForRepay.total_amount)} ر.س</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">مبلغ السداد (ر.س) *</Label>
                  <Input
                    type="number"
                    value={repayForm.amount}
                    onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                    max={Number(selectedAdvForRepay.remaining_balance || selectedAdvForRepay.total_amount)}
                    min="1"
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">تاريخ السداد *</Label>
                  <Input
                    type="date"
                    value={repayForm.payment_date}
                    onChange={(e) => setRepayForm({ ...repayForm, payment_date: e.target.value })}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">طريقة السداد *</Label>
                  <Select value={repayForm.payment_method} onValueChange={(v) => setRepayForm({ ...repayForm, payment_method: v })}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً (كاش) 💵</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي 🏦</SelectItem>
                      <SelectItem value="manual_adjustment">خصم تسوية إدارية 🔀</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">رقم سند القبض / الإيصال</Label>
                  <Input
                    value={repayForm.receipt_number}
                    onChange={(e) => setRepayForm({ ...repayForm, receipt_number: e.target.value })}
                    placeholder="مثال: REC-99412"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">ملاحظات السداد</Label>
                <Input
                  value={repayForm.notes}
                  onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })}
                  placeholder="ملاحظات أو سبب السداد الاستثنائي..."
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:justify-start pt-2">
                <Button type="submit" disabled={isSubmittingRepay} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingRepay ? 'جاري الحفظ...' : 'تأكيد وحفظ السداد المالي'}</span>
                </Button>
                <Button type="button" variant="outline" onClick={() => setRepaymentModalOpen(false)} className="rounded-xl text-xs font-bold h-9">
                  إلغاء
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
