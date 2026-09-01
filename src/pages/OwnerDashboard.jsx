import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Wallet, AlertTriangle, Clock, CheckCircle2,
  XCircle, ArrowUpRight, TrendingUp, Calendar, FileText,
  Building2, ShieldAlert, Sparkles, RefreshCw, Send,
  UserCheck, UserX, Phone, MessageSquare, ExternalLink,
  ChevronRight, Filter, Search, Award, MapPin, Eye,
  Radio, CalendarDays, Coins, Palmtree, UserPlus,
  CreditCard, CheckCheck, FileSpreadsheet, ShieldCheck,
  Scale
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getAdvances } from '@/lib/payrollEngine';
import { getUnifiedRequests, approveRequestStep, rejectRequest } from '@/lib/requestsEngine';
import { getStoredContracts, initializeUnifiedContracts, getStoredResignationNotices } from '@/lib/contractsEngine';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [unifiedRequests, setUnifiedRequests] = useState([]);
  const [advancesList, setAdvancesList] = useState([]);
  const [contractsList, setContractsList] = useState([]);
  const [resignationNotices, setResignationNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, logs] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 1500)
      ]);

      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
      setAdvancesList(getAdvances());
      setUnifiedRequests(getUnifiedRequests());

      const contracts = await initializeUnifiedContracts(emps);
      setContractsList(contracts || []);
      setResignationNotices(getStoredResignationNotices() || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ في تحميل البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    const handleReqUpdate = () => {
      setUnifiedRequests(getUnifiedRequests());
      setContractsList(getStoredContracts() || []);
      setResignationNotices(getStoredResignationNotices() || []);
    };
    window.addEventListener('hr_requests_updated', handleReqUpdate);
    window.addEventListener('hr_contracts_updated', handleReqUpdate);
    window.addEventListener('hr_resignation_notices_updated', handleReqUpdate);
    return () => {
      window.removeEventListener('hr_requests_updated', handleReqUpdate);
      window.removeEventListener('hr_contracts_updated', handleReqUpdate);
      window.removeEventListener('hr_resignation_notices_updated', handleReqUpdate);
    };
  }, [loadData]);

  // Executive Metrics Calculations
  const metrics = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const onLeave = employees.filter(e => e.status === 'on_leave');
    
    const totalBasic = active.reduce((s, e) => s + (Number(e.salary) || Number(e.basic_salary) || 0), 0);
    const totalAllowances = active.reduce((s, e) => 
      s + (Number(e.housing_allowance) || 0) + (Number(e.transport_allowance) || 0) + (Number(e.electricity_allowance) || 0) + (Number(e.phone_allowance) || 0), 0
    );

    const activeAdvances = advancesList.filter(a => a.status === 'active' || (a.remaining_balance > 0));
    const totalOutstandingAdvances = activeAdvances.reduce((s, a) => s + (Number(a.remaining_balance) || 0), 0);
    const monthlyAdvanceDeductions = activeAdvances.reduce((s, a) => s + (Number(a.monthly_installment) || 0), 0);

    const estimatedNet = Math.max(0, totalBasic + totalAllowances - monthlyAdvanceDeductions);

    // Expiring Documents Check (30 days threshold)
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);
    const expiringDocs = employees.filter(e => {
      if (!e.id_expiry_date) return false;
      const d = new Date(e.id_expiry_date);
      return d <= in30Days && d >= today;
    });

    const pendingApprovals = unifiedRequests.filter(r => r.status === 'pending' || r.status === 'under_review');
    const pendingContractSigns = contractsList.filter(c => !c.signed_by_employee);
    const pendingResignations = resignationNotices.filter(n => n.status === 'pending_manager_approval');

    return {
      totalEmployees: employees.length,
      activeCount: active.length,
      onLeaveCount: onLeave.length,
      totalBasic,
      totalAllowances,
      totalOutstandingAdvances,
      monthlyAdvanceDeductions,
      estimatedNet,
      expiringDocsCount: expiringDocs.length,
      expiringDocsList: expiringDocs,
      pendingApprovals,
      pendingContractSigns,
      pendingResignations
    };
  }, [employees, advancesList, unifiedRequests, contractsList, resignationNotices]);

  const fmtSAR = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Quick Approval Handler
  const handleQuickApprove = (reqId) => {
    approveRequestStep(reqId, 'approved', user, 'تمت الموافقة الرسمية من قبل المدير العام');
    setUnifiedRequests(getUnifiedRequests());
    toast({ title: '✓ تم الاعتماد بنجاح', description: 'تمت الموافقة الرسمية على الطلب وتحديث حالته.' });
  };

  const handleQuickReject = (reqId) => {
    rejectRequest(reqId, user, 'تم الرفض بتوجيه من الإدارة العليا');
    setUnifiedRequests(getUnifiedRequests());
    toast({ title: 'تم رفض الطلب', description: 'تم تسجيل رفض الطلب وتحديث سجله.', variant: 'destructive' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-right" dir="rtl">
      
      {/* ─── 1. EXECUTIVE COMMAND HEADER ────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-amber-950/80 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-amber-500/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner">
              👑
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold text-xs">
                  لوحة التحكم والقيادة للمدير العام (فهد الجوعي)
                </Badge>
                <span className="text-xs text-amber-200/70 font-mono">درة السيارة</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white">
                مركز الرقابة والقرارات التنفيذية
              </h1>
              <p className="text-xs text-slate-300">
                متابعة العقود والتوثيق الرقمي، مسيرات الرواتب، السلف، وإشعارات الموظفين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => navigate('/contracts')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Scale className="w-4 h-4" />
              <span>إدارة العقود والتوقيع ➔</span>
            </Button>
            <Button
              onClick={() => navigate('/payroll')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-amber-500/20"
            >
              <Wallet className="w-4 h-4" />
              <span>اعتماد الرواتب ➔</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE KPIS (6 HIGH-IMPACT CARDS) ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">إجمالي الكادر الوظيفي</div>
          <div className="text-2xl font-black font-mono text-foreground">{metrics.totalEmployees}</div>
          <div className="text-[10px] text-emerald-600 font-bold">نشط: {metrics.activeCount} • إجازة: {metrics.onLeaveCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">الرواتب الأساسية</div>
          <div className="text-xl font-black font-mono text-foreground">{fmtSAR(metrics.totalBasic)}</div>
          <div className="text-[10px] text-muted-foreground">ريال سعودي / شهر</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">إجمالي البدلات والمزايا</div>
          <div className="text-xl font-black font-mono text-emerald-600">+{fmtSAR(metrics.totalAllowances)}</div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400">سكن + مواصلات</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">عقود موقعة رقمياً</div>
          <div className="text-xl font-black font-mono text-purple-600">
            {contractsList.filter(c => c.signed_by_employee).length} / {contractsList.length}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-400">معتمدة بالكامل ✓</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-md space-y-1">
          <div className="text-[11px] font-bold text-slate-900">صافي مسير الرواتب</div>
          <div className="text-2xl font-black font-mono text-slate-950">{fmtSAR(metrics.estimatedNet)}</div>
          <div className="text-[10px] font-bold text-slate-900">المستحق للصرف النهائي</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">إشعارات وقرارات معلقة</div>
          <div className="text-2xl font-black font-mono text-rose-600">
            {metrics.pendingApprovals.length + metrics.pendingResignations.length}
          </div>
          <div className="text-[10px] text-rose-700">تحتاج قرارك الرسمي</div>
        </Card>
      </div>

      {/* ─── 3. APPROVAL CENTER & CONTRACT / NOTICE CENTER ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* APPROVALS CENTER ("يحتاج اعتمادك") */}
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h2 className="font-heading font-black text-base text-foreground">مركز الموافقات والاعتمادات</h2>
                <p className="text-[11px] text-muted-foreground">الطلبات المالية والإدارية المعلقة التي تتطلب قرارك</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 text-xs font-mono font-bold">
              {metrics.pendingApprovals.length} معلق
            </Badge>
          </div>

          <div className="space-y-3">
            {metrics.pendingApprovals.length === 0 ? (
              <div className="text-center py-10 space-y-2 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-xs text-foreground">لا توجد طلبات معلقة بانتظار الاعتماد</div>
                <p className="text-[11px]">كافة طلبات السلف والإجازات والمسيرات معتمدة ومحدثة بالكامل.</p>
              </div>
            ) : (
              metrics.pendingApprovals.slice(0, 4).map(req => (
                <div key={req.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{req.details?.request_label || req.type}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">#{req.request_number}</span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>الموظف:</strong> {req.employee_name} ({req.branch_name})
                    </div>
                    {req.reason && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-sm">
                        {req.reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleQuickApprove(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-9 px-3 gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>اعتماد</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickReject(req.id)}
                      className="border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold h-9 px-3 gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* CONTRACTS & RESIGNATION NOTICES CENTER */}
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-heading font-black text-base text-foreground">حالة العقود وإشعارات الاستقالة</h2>
                <p className="text-[11px] text-muted-foreground">متابعة التوقيع الإلكتروني وإشعارات الـ 30 يوماً</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/contracts')}
              className="text-xs font-bold text-emerald-600"
            >
              عرض الكل ➔
            </Button>
          </div>

          <div className="space-y-3">
            {metrics.pendingResignations.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>يوجد {metrics.pendingResignations.length} إشعار عدم تجديد/استقالة بانتظار قرارك</span>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => navigate('/contracts')}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] h-7 px-2.5 rounded-lg"
                  >
                    مراجعة واتخاذ قرار
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-1">
                <div className="text-muted-foreground">عقود معتمدة رقمياً:</div>
                <div className="text-lg font-black font-mono text-emerald-600">
                  {contractsList.filter(c => c.signed_by_employee).length} عقد
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-1">
                <div className="text-muted-foreground">بانتظار توقيع الموظف:</div>
                <div className="text-lg font-black font-mono text-amber-600">
                  {metrics.pendingContractSigns.length} عقد
                </div>
              </div>
            </div>

            {metrics.expiringDocsCount > 0 && (
              <div className="p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-foreground">تنبيه انتهاء إقامات/وثائق:</div>
                  <div className="text-[11px] text-muted-foreground">يوجد {metrics.expiringDocsCount} موظف تنتهي وثائقهم خلال 30 يوماً</div>
                </div>
                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                  تنبيه عاجل ⚠️
                </Badge>
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* ─── 4. EXECUTIVE SUMMARY & BRANCH BREAKDOWN ─────────────────────────── */}
      <Card className="p-6 rounded-3xl border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="font-heading font-black text-base text-foreground">توزيع الكادر الوظيفي والتكلفة حسب الفروع</h2>
            <p className="text-xs text-muted-foreground">مقارنة القوة العاملة والكتلة المالية بين الفروع الأربعة ومكتب الإدارة</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {['الفرع الرئيسي', 'فرع كيا ( السليم )', 'فرع هونداي ( الرواف )', 'مكتب الإدارة'].map(branchName => {
            const branchEmps = employees.filter(e => (e.branch_name || e.branch) === branchName && e.status === 'active');
            const branchPayroll = branchEmps.reduce((s, e) => s + (Number(e.salary) || Number(e.basic_salary) || 0), 0);
            return (
              <div key={branchName} className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900 space-y-1">
                <div className="text-xs font-bold text-foreground">{branchName}</div>
                <div className="text-xl font-black font-mono text-emerald-600 mt-1">{branchEmps.length} <span className="text-xs font-normal text-muted-foreground font-sans">موظف</span></div>
                <div className="text-[11px] text-muted-foreground font-mono">{fmtSAR(branchPayroll)} ر.س / شهر</div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}
