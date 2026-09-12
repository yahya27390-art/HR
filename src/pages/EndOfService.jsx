import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator, Printer, FileCheck, Award, User, Calendar, DollarSign,
  ShieldAlert, ArrowRight, CheckCircle2, FileText, Building2, AlertTriangle,
  Download, RefreshCw, X
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { getAdvances } from '@/lib/payrollEngine';
import { useToast } from '@/components/ui/use-toast';

export default function EndOfService() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  // Mode: 'employee' (linked to DB) vs 'manual'
  const [calcMode, setCalcMode] = useState('employee');

  // Contract & Reason
  const [contractType, setContractType] = useState('unlimited'); // unlimited | limited
  const [reason, setReason] = useState('employer'); // employer | resignation | agreement | force_majeure
  
  // Financial inputs
  const [basicSalary, setBasicSalary] = useState(4000);
  const [housingAllowance, setHousingAllowance] = useState(0);
  const [transportAllowance, setTransportAllowance] = useState(0);
  const [otherAllowances, setOtherAllowances] = useState(0);

  // Dates & Service length
  const [joinDate, setJoinDate] = useState('2022-11-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualYears, setManualYears] = useState(3);
  const [manualMonths, setManualMonths] = useState(6);

  // Leave balance & Loan deductions
  const [unusedLeaveDays, setUnusedLeaveDays] = useState(0);
  const [remainingAdvanceDeduction, setRemainingAdvanceDeduction] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [otherEntitlements, setOtherEntitlements] = useState(0);

  // Print modal state
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);

  // Load Employees & Advances
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const emps = await base44.entities.Employee.list();
        setEmployees(emps || []);
        if (emps && emps.length > 0) {
          setSelectedEmpId(String(emps[0].employee_number || emps[0].id));
        }
      } catch (e) {
        console.error('Failed to load employees:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // When selected employee changes, populate data automatically
  useEffect(() => {
    if (calcMode !== 'employee' || !selectedEmpId || employees.length === 0) return;

    const emp = employees.find(e => 
      String(e.employee_number || e.id) === String(selectedEmpId)
    );

    if (emp) {
      setBasicSalary(Number(emp.salary) || 0);
      setHousingAllowance(Number(emp.housing_allowance) || 0);
      setTransportAllowance(Number(emp.transport_allowance) || 0);
      setOtherAllowances(Number(emp.other_allowance || emp.electricity_allowance || 0));

      if (emp.join_date) {
        setJoinDate(emp.join_date);
      }

      // Check remaining loans/advances for this employee
      const advances = getAdvances();
      const empAdv = advances.find(a => 
        String(a.employee_number || '').trim() === String(emp.employee_number || '').trim() &&
        (a.status === 'active' || a.status === 'disbursed' || a.status === 'approved') &&
        (Number(a.remaining_balance) || 0) > 0
      );

      if (empAdv) {
        setRemainingAdvanceDeduction(Number(empAdv.remaining_balance) || 0);
      } else {
        setRemainingAdvanceDeduction(0);
      }
    }
  }, [selectedEmpId, calcMode, employees]);

  // Calculate Service Duration
  const { totalYears, serviceYears, serviceMonths, serviceDays } = useMemo(() => {
    if (calcMode === 'manual') {
      const y = Number(manualYears) || 0;
      const m = Number(manualMonths) || 0;
      return { totalYears: y + (m / 12), serviceYears: y, serviceMonths: m, serviceDays: 0 };
    }

    if (!joinDate || !endDate) return { totalYears: 0, serviceYears: 0, serviceMonths: 0, serviceDays: 0 };

    const start = new Date(joinDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { totalYears: 0, serviceYears: 0, serviceMonths: 0, serviceDays: 0 };
    }

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const totalY = years + (months / 12) + (days / 365);
    return {
      totalYears: Math.max(0, totalY),
      serviceYears: Math.max(0, years),
      serviceMonths: Math.max(0, months),
      serviceDays: Math.max(0, days)
    };
  }, [calcMode, joinDate, endDate, manualYears, manualMonths]);

  // Comprehensive Wage (الأجر الفعلي الشامل: الأساسي + البدلات الثابتة)
  const comprehensiveSalary = useMemo(() => {
    return Number(basicSalary || 0) + Number(housingAllowance || 0) + Number(transportAllowance || 0) + Number(otherAllowances || 0);
  }, [basicSalary, housingAllowance, transportAllowance, otherAllowances]);

  // Saudi Labor Law Article 84 & 85 Calculations
  const { rawReward, finalReward, entitlementRatio } = useMemo(() => {
    const wage = comprehensiveSalary;
    if (wage <= 0 || totalYears <= 0) {
      return { rawReward: 0, finalReward: 0, entitlementRatio: 0 };
    }

    // Article 84: Half month for each of the first 5 years, one month for subsequent years
    let raw = 0;
    if (totalYears <= 5) {
      raw = (wage / 2) * totalYears;
    } else {
      raw = ((wage / 2) * 5) + (wage * (totalYears - 5));
    }

    // Article 85: Entitlement in case of resignation
    let final = raw;
    let ratio = 100;

    if (reason === 'resignation') {
      if (totalYears < 2) {
        final = 0;
        ratio = 0;
      } else if (totalYears >= 2 && totalYears < 5) {
        final = raw * (1 / 3);
        ratio = 33.33;
      } else if (totalYears >= 5 && totalYears < 10) {
        final = raw * (2 / 3);
        ratio = 66.67;
      } else {
        final = raw;
        ratio = 100;
      }
    } else {
      // Employer termination, end of contract, agreement, force majeure
      final = raw;
      ratio = 100;
    }

    return {
      rawReward: Math.round(raw * 100) / 100,
      finalReward: Math.round(final * 100) / 100,
      entitlementRatio: ratio
    };
  }, [comprehensiveSalary, totalYears, reason]);

  // Unused Leave Compensation (بدل رصيد الإجازات المتبقي)
  const leaveCompensation = useMemo(() => {
    const days = Number(unusedLeaveDays) || 0;
    if (days <= 0 || comprehensiveSalary <= 0) return 0;
    const dailyWage = comprehensiveSalary / 30;
    return Math.round(days * dailyWage * 100) / 100;
  }, [unusedLeaveDays, comprehensiveSalary]);

  // Final Net Settlement (صافي المستحقات للتصفية والمخالصة)
  const totalEntitlements = useMemo(() => {
    return finalReward + leaveCompensation + Number(otherEntitlements || 0);
  }, [finalReward, leaveCompensation, otherEntitlements]);

  const totalDeductions = useMemo(() => {
    return Number(remainingAdvanceDeduction || 0) + Number(otherDeductions || 0);
  }, [remainingAdvanceDeduction, otherDeductions]);

  const netSettlementAmount = useMemo(() => {
    return Math.max(0, totalEntitlements - totalDeductions);
  }, [totalEntitlements, totalDeductions]);

  const currentEmployee = useMemo(() => {
    return employees.find(e => String(e.employee_number || e.id) === String(selectedEmpId)) || null;
  }, [employees, selectedEmpId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold shadow-sm">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black text-foreground">
              حاسبة وتصفية مستحقات نهاية الخدمة
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              احتساب مكافأة نهاية الخدمة، رصيد الإجازات، وإصدار المخالصة النهائية وفق المادتين 84 و 85 من نظام العمل السعودي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setClearanceModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs h-11 px-5 gap-2 shadow-md shadow-emerald-600/20"
          >
            <FileText className="w-4 h-4" />
            <span>طباعة سند المخالصة النهائية A4</span>
          </Button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setCalcMode('employee')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            calcMode === 'employee'
              ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          اختيار موظف من النظام (تعبئة آلية)
        </button>
        <button
          onClick={() => setCalcMode('manual')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            calcMode === 'manual'
              ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          حساب يدوي مخصص (Manual)
        </button>
      </div>

      {/* Main Parameters Card */}
      <Card className="p-6 border shadow-sm rounded-3xl bg-card space-y-6">
        
        {/* Section 1: Employee & Termination Reason */}
        <div className="space-y-4">
          <h3 className="font-heading font-black text-sm text-foreground border-b pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>1. بيانات الموظف والسبب النظامي لانتهاء الخدمة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {calcMode === 'employee' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الموظف المعني بالتصفية:</Label>
                <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                  <SelectTrigger className="rounded-2xl h-11 text-xs bg-slate-50 dark:bg-slate-900 font-bold">
                    <SelectValue placeholder="اختر الموظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                        {e.full_name} (#{e.employee_number}) — {e.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نوع عقد العمل:</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger className="rounded-2xl h-11 text-xs bg-slate-50 dark:bg-slate-900 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">عقد غير محدد المدة (دائم)</SelectItem>
                  <SelectItem value="limited">عقد محدد المدة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سبب انتهاء العلاقة التعاقدية:</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="rounded-2xl h-11 text-xs bg-slate-50 dark:bg-slate-900 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employer">إنهاء العقد من صاحب العمل / انتهاء المدة (استحقاق كامل)</SelectItem>
                  <SelectItem value="resignation">استقالة الموظف (المادة 85 - استحقاق نسبي)</SelectItem>
                  <SelectItem value="agreement">إنهاء العقد بالاتفاق الودي بين الطرفين (كامل)</SelectItem>
                  <SelectItem value="force_majeure">ظرف قاهر أو بموجب المادة 81 من نظام العمل (كامل)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Dates & Service Period */}
        <div className="space-y-4">
          <h3 className="font-heading font-black text-sm text-foreground border-b pb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>2. التواريخ ومدة الخدمة المحتسبة</span>
          </h3>

          {calcMode === 'employee' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تاريخ المباشرة (بداية العمل):</Label>
                <Input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="rounded-2xl h-11 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">تاريخ نهاية الخدمة (آخر يوم عمل):</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-2xl h-11 font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 flex flex-col justify-center">
                <span className="text-[11px] text-muted-foreground block">إجمالي مدة الخدمة المحتسبة:</span>
                <span className="font-black text-foreground font-heading text-sm">
                  {serviceYears} سنة و {serviceMonths} شهر و {serviceDays} يوم
                </span>
                <span className="text-[10px] text-emerald-700 font-mono">({totalYears.toFixed(2)} سنة كاملة)</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عدد السنوات:</Label>
                <Input
                  type="number"
                  value={manualYears}
                  onChange={(e) => setManualYears(e.target.value)}
                  className="rounded-2xl h-11 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عدد الأشهر الإضافية:</Label>
                <Input
                  type="number"
                  value={manualMonths}
                  onChange={(e) => setManualMonths(e.target.value)}
                  className="rounded-2xl h-11 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Salary Components (الأجر الفعلي الشامل) */}
        <div className="space-y-4">
          <h3 className="font-heading font-black text-sm text-foreground border-b pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>3. عناصر الأجر الفعلي الشامل (أساس احتساب المكافأة)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الراتب الأساسي:</Label>
              <Input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">بدل السكن:</Label>
              <Input
                type="number"
                value={housingAllowance}
                onChange={(e) => setHousingAllowance(e.target.value)}
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">بدل النقل:</Label>
              <Input
                type="number"
                value={transportAllowance}
                onChange={(e) => setTransportAllowance(e.target.value)}
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">بدلات أخرى ثابتة:</Label>
              <Input
                type="number"
                value={otherAllowances}
                onChange={(e) => setOtherAllowances(e.target.value)}
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">
              إجمالي الأجر الشهري الشامل (الأساسي + البدلات):
            </span>
            <span className="text-base font-black font-mono text-foreground">
              {comprehensiveSalary.toLocaleString()} ر.س / شهرياً
            </span>
          </div>
        </div>

        {/* Section 4: Settlement & Deductions */}
        <div className="space-y-4">
          <h3 className="font-heading font-black text-sm text-foreground border-b pb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>4. المستحقات الإضافية وتصفية السلف والخصومات</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">رصيد الإجازات المتبقي (بالأيام):</Label>
              <Input
                type="number"
                value={unusedLeaveDays}
                onChange={(e) => setUnusedLeaveDays(e.target.value)}
                placeholder="0"
                className="rounded-2xl h-11 font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                القيمة المستحقة: {leaveCompensation.toLocaleString()} ر.س
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-rose-700">تصفية السلف المتبقية (خصم):</Label>
              <Input
                type="number"
                value={remainingAdvanceDeduction}
                onChange={(e) => setRemainingAdvanceDeduction(e.target.value)}
                className="rounded-2xl h-11 font-mono text-xs text-rose-700 font-bold"
              />
              <span className="text-[10px] text-rose-600 block">
                تخصم تلقائياً من إجمالي مكافأة نهاية الخدمة
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">مستحقات أخرى إضافية (إن وجدت):</Label>
              <Input
                type="number"
                value={otherEntitlements}
                onChange={(e) => setOtherEntitlements(e.target.value)}
                placeholder="0"
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Final Calculation Result Hero */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
            <div>
              <span className="text-xs text-emerald-300 font-bold block mb-1">
                صافي المستحق النهائي للمخالصة وإبراء الذمة:
              </span>
              <span className="text-3xl lg:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                {Math.round(netSettlementAmount).toLocaleString()} ر.س
              </span>
            </div>

            <div className="text-left space-y-1 text-xs">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold">
                نسبة الاستحقاق: {entitlementRatio}%
              </Badge>
              <p className="text-slate-300 text-[11px]">
                مدة الخدمة المحتسبة: <span className="font-bold text-white font-mono">{totalYears.toFixed(1)} سنة</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div>
              <span className="text-slate-400 block text-[10px]">مكافأة نهاية الخدمة:</span>
              <span className="font-bold font-mono text-emerald-300">+{Math.round(finalReward).toLocaleString()} ر.س</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">بدل رصيد الإجازات:</span>
              <span className="font-bold font-mono text-emerald-300">+{Math.round(leaveCompensation).toLocaleString()} ر.س</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">تصفية السلف المستحقة:</span>
              <span className="font-bold font-mono text-rose-300">-{Math.round(remainingAdvanceDeduction).toLocaleString()} ر.س</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">إجمالي الصافي للموظف:</span>
              <span className="font-bold font-mono text-white text-sm">{Math.round(netSettlementAmount).toLocaleString()} ر.س</span>
            </div>
          </div>
        </div>

      </Card>

      {/* ─── OFFICIAL PRINTABLE CLEARANCE LETTER MODAL (A4) ──────────────────── */}
      <Dialog open={clearanceModalOpen} onOpenChange={setClearanceModalOpen}>
        <DialogContent className="max-w-4xl rounded-3xl p-6 print:p-0 print:border-0" dir="rtl">
          <DialogHeader className="border-b pb-3 print:hidden">
            <DialogTitle className="flex items-center justify-between text-base font-heading font-black">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span>سند مخالصة نهائية وإبراء ذمة مالية (A4 رسمي)</span>
              </div>
              <Button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black h-9 px-4 gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Printable Document Sheet */}
          <div className="p-8 bg-white text-slate-900 rounded-2xl space-y-6 text-xs border print:border-0 shadow-sm print:shadow-none">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-heading font-black text-slate-900">شركة درة السيارة لقطع غيار السيارات</h2>
                <div className="text-[11px] text-slate-600">سجل تجاري: 7016475555 • الرقم الضريبي: 311861381500003</div>
                <div className="text-[11px] text-slate-600">المملكة العربية السعودية — القصيم / الرياض</div>
              </div>
              <div className="text-left space-y-1">
                <div className="px-3 py-1 bg-slate-900 text-white rounded-lg font-black text-xs">مخالصة نهائية</div>
                <div className="text-[10px] text-slate-500 font-mono">التاريخ: {endDate}</div>
                <div className="text-[10px] text-slate-500 font-mono">الرقم المرجعي: CLR-{Date.now().toString().slice(-6)}</div>
              </div>
            </div>

            {/* Employee Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block">اسم الموظف:</span>
                <span className="font-bold text-slate-900 text-xs">{currentEmployee?.full_name || 'موظف المنشأة'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">الرقم الوظيفي:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">#{currentEmployee?.employee_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">رقم الهوية / الإقامة:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">{currentEmployee?.national_id || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">المسمى الوظيفي:</span>
                <span className="font-bold text-slate-900 text-xs">{currentEmployee?.job_title || 'موظف'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">تاريخ المباشرة:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">{joinDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">تاريخ انتهاء الخدمة:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">{endDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">مدة الخدمة المحتسبة:</span>
                <span className="font-bold text-slate-900 text-xs">{serviceYears} سنة و {serviceMonths} شهر</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">الراتب الشامل الأخير:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">{comprehensiveSalary.toLocaleString()} ر.س</span>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <table className="w-full text-right text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2.5">البند المالي والبيان</th>
                  <th className="p-2.5 text-emerald-700">المستحق للموظف (+)</th>
                  <th className="p-2.5 text-rose-700">المستقطع على الموظف (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5">مكافأة نهاية الخدمة النظامية (المادتين 84 و 85 من نظام العمل)</td>
                  <td className="p-2.5 font-mono font-bold text-emerald-700">+{Math.round(finalReward).toLocaleString()} ر.س</td>
                  <td className="p-2.5 font-mono text-slate-400">—</td>
                </tr>
                {leaveCompensation > 0 && (
                  <tr>
                    <td className="p-2.5">بدل رصيد الإجازات السنوية المستحقة والمتبقية ({unusedLeaveDays} يوم)</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700">+{Math.round(leaveCompensation).toLocaleString()} ر.س</td>
                    <td className="p-2.5 font-mono text-slate-400">—</td>
                  </tr>
                )}
                {otherEntitlements > 0 && (
                  <tr>
                    <td className="p-2.5">مستحقات وفروقات مالية أخرى</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700">+{Math.round(otherEntitlements).toLocaleString()} ر.س</td>
                    <td className="p-2.5 font-mono text-slate-400">—</td>
                  </tr>
                )}
                {remainingAdvanceDeduction > 0 && (
                  <tr>
                    <td className="p-2.5">تسوية وتصفية رصيد السلف والقروض المستحقة للمنشأة</td>
                    <td className="p-2.5 font-mono text-slate-400">—</td>
                    <td className="p-2.5 font-mono font-bold text-rose-700">-{Math.round(remainingAdvanceDeduction).toLocaleString()} ر.س</td>
                  </tr>
                )}
                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td className="p-3">صافي المبلغ المستحق للصرف النهائي للموظف:</td>
                  <td colSpan={2} className="p-3 text-left font-mono text-emerald-300 text-base">
                    {Math.round(netSettlementAmount).toLocaleString()} ريال سعودي فقط لا غير
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Legal Acknowledgment Declaration */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[11px] leading-relaxed">
              <div className="font-bold text-slate-900">إقرار وتعهد إبراء ذمة:</div>
              <p className="text-slate-700">
                أقر أنا الموظف الموضحة بياناتي أعلاه بأنني قد استلمت من <strong>شركة درة السيارة لقطع غيار السيارات</strong> كامل مستحقاتي المالية النظامية والتعاقدية الناتجة عن فترة عملي بالمنشأة، بما في ذلك مكافأة نهاية الخدمة، وبدل الإجازات، والرواتب، وكافة البدلات، وأبرئ ذمة المنشأة إبراءً شاملاً مانعاً لأي مطالبة حالية أو مستقبلية، ولا يحق لي الرجوع على المنشأة بأي حق كان بعد التوقيع على هذا السند.
              </p>
            </div>

            {/* Signatures & Official Stamp Grid */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center">
              <div className="space-y-6">
                <span className="font-bold block text-xs">توقيع الموظف المقر بما فيه</span>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <span className="text-[10px] text-slate-500">التوقيع / البصمة</span>
              </div>
              <div className="space-y-6">
                <span className="font-bold block text-xs">المحاسب المالي</span>
                <div className="h-10 border-b border-dashed border-slate-400">
                  <span className="text-[11px] font-mono font-bold text-slate-600">هشام ابوالفضل زغلول</span>
                </div>
                <span className="text-[10px] text-slate-500">التوقيع والاعتماد المالي</span>
              </div>
              <div className="space-y-6">
                <span className="font-bold block text-xs">المدير العام والختم الرسمي</span>
                <div className="h-10 border-b border-dashed border-slate-400">
                  <span className="text-[11px] font-bold text-slate-700">فهد ناصر محمد الجوعي</span>
                </div>
                <span className="text-[10px] text-slate-500">ختم المنشأة الرسمي</span>
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2 sm:justify-start pt-2 print:hidden">
            <Button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold h-10 px-5 gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند الرسمي A4</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setClearanceModalOpen(false)}
              className="rounded-2xl text-xs font-bold h-10"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
