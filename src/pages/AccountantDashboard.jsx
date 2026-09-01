import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Coins,
  Printer,
  ShieldCheck,
  FileText,
  AlertCircle,
  Building2,
  CalendarDays,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { getAdvances } from '@/lib/payrollEngine';
import { getUnifiedRequests } from '@/lib/requestsEngine';

const PAYROLL_STAGES = [
  { id: 'draft', label: '1. مسودة المسير', desc: 'تجميع بيانات الحضور والموظفين', icon: '📝', color: 'slate' },
  { id: 'attendance', label: '2. مراجعة البصمات', desc: 'تدقيق ساعات العمل والتأخير والجمعات', icon: '⏱️', color: 'amber' },
  { id: 'financial', label: '3. مراجعة الاستقطاعات', desc: 'تدقيق السلف والغياب والبدلات', icon: '🧾', color: 'sky' },
  { id: 'pending_owner', label: '4. اعتماد المدير العام', desc: 'بانتظار موافقة صاحب العمل', icon: '👑', color: 'purple' },
  { id: 'approved', label: '5. معتمد رسمياً', desc: 'تمت الموافقة من كافة الإدارات', icon: '✓', color: 'emerald' },
  { id: 'locked', label: '6. مقفل ومجمد', desc: 'مغلق ومحمي من أي تعديل 🔒', icon: '🔒', color: 'indigo' },
  { id: 'paid', label: '7. تم الصرف', desc: 'تم التحويل البنكي وحماية الأجور', icon: '💸', color: 'green' },
  { id: 'closed', label: '8. مؤرشف', desc: 'مغلق نهائياً وموثق في السجلات', icon: '📁', color: 'slate' }
];

export default function AccountantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [advancesList, setAdvancesList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    base44.entities.Employee.list().then(d => setEmployees(d || []));
    setAdvancesList(getAdvances());
    
    // Load financial requests
    const reqs = getUnifiedRequests();
    setPendingRequests(reqs.filter(r => r.type === 'advance' || r.type === 'update_bank_data'));
  }, []);

  const metrics = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const totalBasic = active.reduce((s, e) => s + (Number(e.salary) || Number(e.basic_salary) || 0), 0);
    const totalHousing = active.reduce((s, e) => s + (Number(e.housing_allowance) || 0), 0);
    const totalTransport = active.reduce((s, e) => s + (Number(e.transport_allowance) || 0), 0);
    const totalElectricity = active.reduce((s, e) => s + (Number(e.electricity_allowance) || 0), 0);
    const totalPurchases = active.reduce((s, e) => s + (Number(e.phone_allowance) || 0), 0);
    const totalAllowances = totalHousing + totalTransport + totalElectricity + totalPurchases;

    // Advances calculations
    const activeAdvances = advancesList.filter(a => a.status === 'active' || (a.remaining_balance > 0));
    const totalOutstandingAdvances = activeAdvances.reduce((s, a) => s + (Number(a.remaining_balance) || 0), 0);
    const monthlyAdvanceDeductions = activeAdvances.reduce((s, a) => s + (Number(a.monthly_installment) || 0), 0);

    return {
      employeeCount: active.length,
      totalBasic,
      totalAllowances,
      totalGross: totalBasic + totalAllowances,
      totalOutstandingAdvances,
      monthlyAdvanceDeductions,
      estimatedNet: Math.max(0, totalBasic + totalAllowances - monthlyAdvanceDeductions)
    };
  }, [employees, advancesList]);

  const fmtSAR = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-right" dir="rtl">
      
      {/* ─── 1. TOP HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-slate-950 via-sky-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-sky-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-3xl shadow-inner">
              🧾
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 font-bold text-[10px]">
                  مركز المحاسبة والمالية
                </Badge>
                <span className="text-xs text-sky-200/70 font-mono">أغسطس 2026</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-white">
                مساحة العمل المحاسبية ومسيرات الرواتب
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/payroll')}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-sky-500/20"
            >
              <Wallet className="w-4 h-4" />
              <span>فتح مسير الرواتب ➔</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 2. FINANCIAL KPIS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">الرواتب الأساسية</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black font-mono text-foreground mt-1">{fmtSAR(metrics.totalBasic)}</div>
          <div className="text-[11px] text-muted-foreground font-mono">لكافة الموظفين النشطين ({metrics.employeeCount})</div>
        </Card>

        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">إجمالي البدلات والمزايا</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-600 mt-1">+{fmtSAR(metrics.totalAllowances)}</div>
          <div className="text-[11px] text-muted-foreground">سكن + مواصلات + كهرباء + مشتريات</div>
        </Card>

        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">أقساط السلف الشهرية</span>
            <CreditCard className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black font-mono text-rose-600 mt-1">-{fmtSAR(metrics.monthlyAdvanceDeductions)}</div>
          <div className="text-[11px] text-muted-foreground font-mono">رصيد السلف القائم: {fmtSAR(metrics.totalOutstandingAdvances)}</div>
        </Card>

        <Card className="p-5 rounded-3xl border bg-gradient-to-br from-slate-900 to-sky-950 text-white shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300">صافي الرواتب المتوقع</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">{fmtSAR(metrics.estimatedNet)}</div>
          <div className="text-[11px] text-sky-200/80">المستحق للصرف والتحويل البنكي</div>
        </Card>
      </div>

      {/* ─── 3. PAYROLL WORKSPACE 8-STAGE VISUAL LIFECYCLE ────────────────── */}
      <Card className="p-6 rounded-3xl border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-0.5">
            <h2 className="font-heading font-black text-lg text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <span>دورة مراحل مسير الرواتب المعتمدة (Payroll Lifecycle)</span>
            </h2>
            <p className="text-xs text-muted-foreground">المسار التدقيقي المحاسبي لحماية الأجور وإقفال الرواتب</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/payroll')}
            className="rounded-xl text-xs font-bold gap-1"
          >
            <span>إدارة المسير</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PAYROLL_STAGES.map((stage, sIdx) => (
            <div
              key={stage.id}
              onClick={() => navigate('/payroll')}
              className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-900/50 hover:border-sky-500/50 hover:bg-sky-50/30 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{stage.icon}</span>
                <Badge variant="outline" className="text-[10px] font-mono">مرحلة {sIdx + 1}</Badge>
              </div>
              <div className="font-bold text-xs text-foreground">{stage.label}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{stage.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── 4. QUICK ACTION SHORTCUTS & ADVANCES ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          onClick={() => navigate('/allowances')}
          className="p-5 rounded-3xl border bg-card hover:border-sky-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">إدارة البدلات وبدل المشتريات</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            مراجعة وتعديل بدلات السكن والمواصلات وبدل المشتريات لكافة الفروع.
          </p>
        </Card>

        <Card
          onClick={() => navigate('/payroll?tab=advances')}
          className="p-5 rounded-3xl border bg-card hover:border-sky-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">سجل السلف وسندات لأمر A4</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            متابعة الـ 11 سلفة المعتمدة والأقساط المحصلة وطباعة سندات القبض.
          </p>
        </Card>

        <Card
          onClick={() => navigate('/reports')}
          className="p-5 rounded-3xl border bg-card hover:border-sky-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">مركز التقارير والتصدير المالي</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تصدير كشوف الرواتب، تقارير WPS، وملفات حماية الأجور للبنوك.
          </p>
        </Card>
      </div>

    </div>
  );
}
