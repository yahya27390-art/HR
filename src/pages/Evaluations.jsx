import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Trophy,
  Plus,
  Star,
  Printer,
  Edit3,
  Trash2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Briefcase,
  MessageSquare,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Users,
  Award,
  ChevronDown,
  Building2,
  AlertCircle
} from 'lucide-react';
import {
  STANDARD_EVALUATION_CRITERIA,
  PURCHASING_EVALUATION_CRITERIA,
  PURCHASING_SPECIALISTS_NAMES,
  hasPurchasingDuty,
  getEvaluationTier,
  calculateWeightedTotal,
  getStoredEvaluations,
  saveEvaluation,
  deleteEvaluation
} from '@/lib/evaluationsEngine';
import { printEvaluationDocument } from '@/lib/evaluationPrintEngine';
import { getCompanyProfile } from '@/lib/companyProfile';

export default function Evaluations() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const currentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // Modal State
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_number: '',
    employee_name: '',
    job_title: '',
    branch: '',
    month: currentMonthStr(),
    has_purchasing_duty: false,
    scores: {
      attendance_discipline: 90,
      uniform_appearance: 90,
      job_execution_quality: 90,
      whatsapp_customer_care: 90,
      google_reviews_reputation: 90,
      branch_sales_target: 90,
      branch_purchasing_duties: 90
    },
    notes: '',
    strengths: '',
    improvement_areas: ''
  });

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await base44.entities.Employee.list();
      setEmployees(emps || []);
      const stored = getStoredEvaluations();
      try {
        localStorage.setItem('hr_flow_v12_evaluations_store', JSON.stringify(stored));
      } catch {}
      setEvaluations(stored);
    } catch (e) {
      console.error('Error loading evaluations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => setEvaluations(getStoredEvaluations());
    window.addEventListener('hr_evaluations_updated', handleUpdate);
    return () => window.removeEventListener('hr_evaluations_updated', handleUpdate);
  }, [loadData]);

  // Handle Employee Selection in Modal
  const handleSelectEmployee = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId) || String(e.employee_number) === String(empId));
    if (!emp) return;

    const isPurchasing = hasPurchasingDuty(emp.full_name, emp.job_title);

    // Check if an evaluation already exists for this employee in selected month
    const existing = evaluations.find(ev => 
      (ev.employee_id === emp.id || ev.employee_number === emp.employee_number) && 
      ev.month === (formData.month || selectedMonth)
    );

    if (existing) {
      setFormData({
        ...existing,
        employee_id: emp.id,
        employee_number: emp.employee_number,
        employee_name: emp.full_name,
        job_title: emp.job_title || 'موظف',
        branch: emp.branch || emp.branch_name || 'الفرع الرئيسي',
        has_purchasing_duty: existing.has_purchasing_duty !== undefined ? existing.has_purchasing_duty : isPurchasing
      });
    } else {
      setFormData(prev => ({
        ...prev,
        employee_id: emp.id,
        employee_number: emp.employee_number,
        employee_name: emp.full_name,
        job_title: emp.job_title || 'موظف',
        branch: emp.branch || emp.branch_name || 'الفرع الرئيسي',
        has_purchasing_duty: isPurchasing,
        scores: {
          attendance_discipline: 95,
          uniform_appearance: 95,
          job_execution_quality: 95,
          whatsapp_customer_care: 95,
          google_reviews_reputation: 95,
          branch_sales_target: 95,
          branch_purchasing_duties: 95
        },
        notes: '',
        strengths: '',
        improvement_areas: ''
      }));
    }
  };

  // Open Modal for New Evaluation
  const handleOpenNewModal = () => {
    setEditingEval(null);
    const firstEmp = employees[0];
    const isPurchasing = firstEmp ? hasPurchasingDuty(firstEmp.full_name, firstEmp.job_title) : false;

    setFormData({
      employee_id: firstEmp ? firstEmp.id : '',
      employee_number: firstEmp ? firstEmp.employee_number : '',
      employee_name: firstEmp ? firstEmp.full_name : '',
      job_title: firstEmp ? firstEmp.job_title : '',
      branch: firstEmp ? (firstEmp.branch || firstEmp.branch_name || 'الفرع الرئيسي') : '',
      month: selectedMonth,
      has_purchasing_duty: isPurchasing,
      scores: {
        attendance_discipline: 95,
        uniform_appearance: 95,
        job_execution_quality: 95,
        whatsapp_customer_care: 95,
        google_reviews_reputation: 95,
        branch_sales_target: 95,
        branch_purchasing_duties: 95
      },
      notes: '',
      strengths: '',
      improvement_areas: ''
    });
    setEvalModalOpen(true);
  };

  // Open Modal for Editing Evaluation
  const handleOpenEditModal = (evaluation) => {
    setEditingEval(evaluation);
    setFormData({ ...evaluation });
    setEvalModalOpen(true);
  };

  // Live calculation of current modal score
  const activeCriteriaList = formData.has_purchasing_duty ? PURCHASING_EVALUATION_CRITERIA : STANDARD_EVALUATION_CRITERIA;
  const liveTotalScore = useMemo(() => {
    return calculateWeightedTotal(activeCriteriaList, formData.scores || {});
  }, [activeCriteriaList, formData.scores]);
  const liveTier = getEvaluationTier(liveTotalScore);

  // Save Evaluation
  const handleSaveEvaluation = (e) => {
    e.preventDefault();
    if (!formData.employee_name) {
      toast({ title: 'يرجى اختيار الموظف أولاً', variant: 'destructive' });
      return;
    }

    const payload = {
      ...formData,
      total_score: liveTotalScore,
      grade: liveTier.grade,
      evaluated_by: user?.full_name || user?.name || 'فهد ناصر محمد الجوعي (المدير العام)'
    };

    saveEvaluation(payload, user);
    setEvalModalOpen(false);
    toast({
      title: '✓ تم حفظ واعتماد تقييم الأداء بنجاح',
      description: `تم توثيق تقييم ${formData.employee_name} لشهر ${formData.month} بدرجة (${liveTotalScore}% - ${liveTier.grade}).`
    });
  };

  // Delete Evaluation
  const handleDeleteEvaluation = (id, name) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف تقييم الموظف (${name})؟`)) {
      deleteEvaluation(id);
      toast({ title: '✓ تم حذف سجل التقييم بنجاح' });
    }
  };

  // Print Evaluation
  const handlePrintEvaluation = (ev) => {
    printEvaluationDocument(ev, getCompanyProfile());
    toast({ title: '✓ جاري تجهيز مستند التقييم A4 للطباعة...' });
  };

  // Filtered Evaluations List for selected month
  const monthEvaluations = useMemo(() => {
    return evaluations.filter(ev => ev.month === selectedMonth);
  }, [evaluations, selectedMonth]);

  const filteredEvaluations = useMemo(() => {
    return monthEvaluations.filter(ev => {
      const matchSearch = !searchQuery || 
        ev.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(ev.employee_number).includes(searchQuery);
      
      const matchBranch = branchFilter === 'all' || ev.branch === branchFilter;
      
      const matchTier = tierFilter === 'all' || 
        (tierFilter === 'top' && ev.total_score >= 95) ||
        (tierFilter === 'excellent' && ev.total_score >= 85 && ev.total_score < 95) ||
        (tierFilter === 'good' && ev.total_score < 85);

      return matchSearch && matchBranch && matchTier;
    }).sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  }, [monthEvaluations, searchQuery, branchFilter, tierFilter]);

  // KPI Calculations
  const averageScore = useMemo(() => {
    if (monthEvaluations.length === 0) return 0;
    const sum = monthEvaluations.reduce((s, e) => s + (Number(e.total_score) || 0), 0);
    return Math.round((sum / monthEvaluations.length) * 10) / 10;
  }, [monthEvaluations]);

  const topStarCount = useMemo(() => {
    return monthEvaluations.filter(e => e.total_score >= 95).length;
  }, [monthEvaluations]);

  const topPerformer = useMemo(() => {
    if (monthEvaluations.length === 0) return null;
    return [...monthEvaluations].sort((a, b) => b.total_score - a.total_score)[0];
  }, [monthEvaluations]);

  // List of branches for filter
  const branchesList = useMemo(() => {
    const s = new Set();
    employees.forEach(e => {
      if (e.branch) s.add(e.branch);
      if (e.branch_name) s.add(e.branch_name);
    });
    return Array.from(s);
  }, [employees]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      
      {/* ─── 1. TOP HEADER & ACTION BANNER ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 p-6 sm:p-8 rounded-3xl text-white border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-2xl shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-black">
                منظومة تقييم أداء الموظفين (KPIs)
              </h1>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold">
                شركة درة السيارة
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              هيكلة مؤشرات الأداء بالنسب المئوية (الحضور، الزي، الجودة، الواتساب، جوجل، مبيعات الفرع، ومشتريات الفروع)
            </p>
          </div>
        </div>

        {/* Month Selector & Add Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400 ms-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-mono text-xs font-bold px-2 py-1.5 focus:outline-none"
            />
          </div>

          <Button
            onClick={handleOpenNewModal}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl shadow-lg shadow-amber-500/20 gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ رصد تقييم جديد</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Average Score */}
        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>متوسط أداء الشركة</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono text-amber-500">
            {averageScore}%
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {getEvaluationTier(averageScore).grade} لشهر ({selectedMonth})
          </div>
        </Card>

        {/* Top Performer */}
        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>موظف الشهر المتصدر 🏆</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-heading font-black text-foreground truncate">
            {topPerformer ? topPerformer.employee_name : '—'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
            {topPerformer ? `الدرجة: ${topPerformer.total_score}% • ${topPerformer.branch}` : 'لا توجد تقييمات'}
          </div>
        </Card>

        {/* Exceptional Stars Count */}
        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>فئة ممتاز مرتفع 🌟</span>
            <Star className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-3xl font-black font-mono text-teal-500">
            {topStarCount} <span className="text-xs font-normal text-muted-foreground font-sans">موظفين</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            نسبة ≥ 95% وتستحق مكافآت تميز
          </div>
        </Card>

        {/* Total Evaluated */}
        <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>إجمالي المقيّمين</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black font-mono text-blue-500">
            {monthEvaluations.length} / {employees.length}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            تم رصد واعتماد تقاريرهم الرسمية
          </div>
        </Card>

      </div>

      {/* ─── 3. PURCHASING SPECIALISTS NOTICE BANNER ──────────────────────── */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/40 text-xs text-slate-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-rose-300 text-sm flex items-center gap-2">
              <span>كادر المشتريات والمهام الإضافية المعتمد ⭐</span>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">معيار مخصص (20%)</Badge>
            </div>
            <p className="text-slate-300 text-[11.5px] mt-0.5">
              يشمل تلقائياً: <strong>عبد العزيز الجوعي</strong>، <strong>صالح المحيميد</strong>، و <strong>خالد الجوعي</strong> لتقييم مهام تأمين مشتريات الفرع ومتابعة الموردين والتفاوض.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 4. SEARCH & FILTERS BAR ────────────────────────────────────────── */}
      <Card className="p-4 rounded-3xl border bg-card shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
            <Input
              placeholder="البحث باسم الموظف أو رقمه الوظيفي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 rounded-2xl h-10 text-xs font-medium"
            />
          </div>

          {/* Branch Filter */}
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="rounded-2xl h-10 text-xs font-bold">
              <SelectValue placeholder="تصفية حسب الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفروع</SelectItem>
              {branchesList.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tier Filter */}
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="rounded-2xl h-10 text-xs font-bold">
              <SelectValue placeholder="تصفية حسب التقدير" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كافة التقديرات</SelectItem>
              <SelectItem value="top">ممتاز مرتفع (95%+)</SelectItem>
              <SelectItem value="excellent">ممتاز (85% - 94%)</SelectItem>
              <SelectItem value="good">جيد جداً فما دون (&lt;85%)</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </Card>

      {/* ─── 5. EVALUATIONS TABLE / LEADERBOARD ────────────────────────────── */}
      <Card className="border rounded-3xl shadow-sm overflow-hidden bg-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-heading font-black text-base text-foreground">
              سجل نتائج تقييم شهر ({selectedMonth})
            </h2>
          </div>
          <Badge variant="outline" className="font-mono text-xs font-bold">
            {filteredEvaluations.length} سجل معتمد
          </Badge>
        </div>

        {filteredEvaluations.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs space-y-3">
            <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <div className="font-bold text-sm text-foreground">لا توجد تقييمات مرصودة لشهر ({selectedMonth})</div>
            <p>يمكنك البدء برصد تقييم جديد للموظفين بالضغط على زر "رصد تقييم جديد" أعلاه.</p>
            <Button onClick={handleOpenNewModal} className="bg-amber-600 text-white text-xs font-bold rounded-2xl">
              + رصد أول تقييم لهذا الشهر
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b font-heading font-bold text-foreground">
                  <th className="py-3.5 px-3 text-center">الترتيب</th>
                  <th className="py-3.5 px-4">الموظف</th>
                  <th className="py-3.5 px-3">الفرع والمسمى</th>
                  <th className="py-3.5 px-3">النوع</th>
                  <th className="py-3.5 px-3 text-center">الحضور (15%)</th>
                  <th className="py-3.5 px-3 text-center">الزي (10%)</th>
                  <th className="py-3.5 px-3 text-center">المهام والجودة</th>
                  <th className="py-3.5 px-3 text-center">الواتساب</th>
                  <th className="py-3.5 px-3 text-center">جوجل</th>
                  <th className="py-3.5 px-3 text-center">التارجت</th>
                  <th className="py-3.5 px-3 text-center">المشتريات (20%)</th>
                  <th className="py-3.5 px-3 text-center font-black">النسبة الإجمالية</th>
                  <th className="py-3.5 px-3 text-center">التقدير</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEvaluations.map((ev, index) => {
                  const tier = getEvaluationTier(ev.total_score);
                  const isPurchasing = Boolean(ev.has_purchasing_duty);
                  const scores = ev.scores || {};

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs mx-auto ${
                          index === 0 
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                            : (index === 1 ? 'bg-slate-300 text-slate-900 font-bold' : (index === 2 ? 'bg-amber-700/60 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'))
                        }`}>
                          {index + 1}
                        </div>
                      </td>

                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-heading font-black text-foreground text-sm flex items-center gap-1.5">
                          <span>{ev.employee_name}</span>
                          {tier.isStar && <span title="ممتاز مرتفع">🌟</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          #{ev.employee_number}
                        </div>
                      </td>

                      {/* Branch & Job */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-foreground text-xs">{ev.branch}</div>
                        <div className="text-[11px] text-muted-foreground">{ev.job_title}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3">
                        {isPurchasing ? (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold">
                            مشتريات ومهام ⭐
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500">
                            كادر عام
                          </Badge>
                        )}
                      </td>

                      {/* Criteria Scores */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-600">
                        {scores.attendance_discipline || '—'}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-600">
                        {scores.uniform_appearance || '—'}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-indigo-600">
                        {scores.job_execution_quality || '—'}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-teal-600">
                        {scores.whatsapp_customer_care || '—'}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-600">
                        {scores.google_reviews_reputation || '—'}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-purple-600">
                        {scores.branch_sales_target || '—'}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-rose-600">
                        {isPurchasing ? `${scores.branch_purchasing_duties || '—'}%` : '—'}
                      </td>

                      {/* Total Score */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {ev.total_score}%
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <Badge className={`${tier.badgeClass} font-bold text-[10.5px]`}>
                          {tier.grade}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePrintEvaluation(ev)}
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                            title="طباعة التقرير الرسمي A4"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(ev)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                            title="تعديل التقييم"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteEvaluation(ev.id, ev.employee_name)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            title="حذف التقييم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* ─── 6. EVALUATION INPUT / EDIT MODAL ──────────────────────────────── */}
      <Dialog open={evalModalOpen} onOpenChange={setEvalModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-black text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>{editingEval ? 'تعديل تقييم أداء الموظف' : 'رصد تقييم أداء شهري جديد'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEvaluation} className="space-y-6 text-xs">
            
            {/* Top Row: Employee & Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">اختيار الموظف *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={handleSelectEmployee}
                >
                  <SelectTrigger className="rounded-2xl h-11 text-xs font-bold">
                    <SelectValue placeholder="اختر الموظف المراد تقييمه" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} (#{emp.employee_number}) - {emp.branch || 'الفرع الرئيسي'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">شهر التقييم *</Label>
                <Input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                  className="rounded-2xl h-11 font-mono text-xs font-bold"
                  required
                />
              </div>
            </div>

            {/* Special Duty Toggle */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-bold text-rose-400 text-xs">
                  الموظف لديه مهام مشتريات الفرع ومتابعة الموردين (20%) ⭐
                </div>
                <div className="text-[11px] text-muted-foreground">
                  تفعيل هذا الخيار يخصص معياراً لمشتريات وتأمين نواقص الفرع (خاص بـ عبدالعزيز الجوعي، صالح المحيميد، خالد الجوعي، ومن في حكمهم).
                </div>
              </div>
              <Checkbox
                id="has-purchasing"
                checked={formData.has_purchasing_duty}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, has_purchasing_duty: Boolean(v) }))}
              />
            </div>

            {/* ─── Criteria Matrix Sliders ─────────────────────────────────── */}
            <div className="space-y-4">
              <div className="font-bold text-sm text-foreground flex items-center justify-between border-b pb-2">
                <span>تحديد درجات المعايير (من 0 إلى 100):</span>
                <span className="text-xs text-muted-foreground">الوزن الكلي: 100%</span>
              </div>

              <div className="space-y-3">
                {activeCriteriaList.map(c => {
                  const val = formData.scores ? formData.scores[c.id] || 0 : 90;
                  return (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                              الوزن: {c.weight}%
                            </Badge>
                          </div>
                          <div className="text-[10.5px] text-muted-foreground">{c.desc}</div>
                        </div>

                        <div className="text-center font-mono font-black text-sm text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl">
                          {val} / 100
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={val}
                          onChange={(e) => {
                            const num = Number(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              scores: {
                                ...prev.scores,
                                [c.id]: num
                              }
                            }));
                          }}
                          className="flex-1 accent-amber-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                        />
                        <div className="flex gap-1">
                          {[70, 85, 95, 100].map(quickVal => (
                            <button
                              type="button"
                              key={quickVal}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  scores: {
                                    ...prev.scores,
                                    [c.id]: quickVal
                                  }
                                }));
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                val === quickVal 
                                  ? 'bg-amber-600 text-white border-amber-600' 
                                  : 'bg-background hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              {quickVal}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── LIVE TOTAL SCORE PREVIEW CARD ──────────────────────────── */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-2 border-emerald-500/60 flex items-center justify-between text-white shadow-lg">
              <div>
                <div className="text-xs text-slate-300 font-bold">النتيجة النهائية المرجحة المحتسبة:</div>
                <div className="text-xs text-emerald-400 font-medium mt-0.5">{liveTier.description}</div>
              </div>
              <div className="text-left flex items-center gap-3">
                <div className="text-3xl font-black font-mono text-emerald-400">{liveTotalScore}%</div>
                <Badge className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1">
                  {liveTier.grade}
                </Badge>
              </div>
            </div>

            {/* ─── NOTES, STRENGTHS & IMPROVEMENTS ────────────────────────── */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">ملاحظات وتوجيهات المدير العام</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="اكتب توجيهاتك للموظف، رأيك في أدائه خلال هذا الشهر..."
                  className="rounded-2xl text-xs min-h-16"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">أبرز نقاط القوة</Label>
                  <Input
                    value={formData.strengths}
                    onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                    placeholder="مثال: سرعة الاستجابة، الأمانة، العلاقات مع العملاء..."
                    className="rounded-2xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">مجالات التحسين والتطوير</Label>
                  <Input
                    value={formData.improvement_areas}
                    onChange={(e) => setFormData(prev => ({ ...prev, improvement_areas: e.target.value }))}
                    placeholder="مثال: زيادة الاهتمام بتقييمات جوجل، تنظيم الجرد..."
                    className="rounded-2xl text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setEvalModalOpen(false)} className="rounded-2xl font-bold">
                إلغاء
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl shadow-lg gap-1.5 px-6">
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ واعتماد التقييم رسمياً ✓</span>
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
