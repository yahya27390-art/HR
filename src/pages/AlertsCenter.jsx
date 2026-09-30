import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { 
  calcDocAlerts, 
  ALERT_CATEGORIES, 
  getStoredThresholds, 
  saveStoredThresholds,
  parseExpiryDate 
} from '@/lib/alertsEngine';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bell, 
  Search, 
  Pencil, 
  Sliders, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  IdCard,
  Building2,
  FileCheck,
  ShieldCheck,
  Plane,
  Car,
  Briefcase,
  Clock,
  Timer,
  Layers,
  FileText
} from 'lucide-react';

export default function AlertsCenter() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('id_expiry'); // default matches screenshot: انتهاء الهوية
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Thresholds config state (days before expiry to trigger alert)
  const [thresholds, setThresholds] = useState(getStoredThresholds);
  const [thresholdsModalOpen, setThresholdsModalOpen] = useState(false);
  const [tempThresholds, setTempThresholds] = useState(getStoredThresholds);

  // Edit Expiry Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    id_expiry_date: '',
    work_permit_expiry_date: '',
    insurance_expiry_date: '',
    passport_expiry_date: '',
    driving_license_expiry_date: '',
    contract_end_date: '',
    other_licenses_expiry_date: '',
  });
  const [saving, setSaving] = useState(false);

  // Load all employees
  const loadData = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Employee.list();
      setEmployees(list || []);
    } catch (e) {
      console.error('Error loading employees in Alerts Center:', e);
      toast({ title: 'خطأ في تحميل سجلات التنبيهات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute all alerts based on current thresholds
  const allAlerts = useMemo(() => {
    return calcDocAlerts(employees, thresholds);
  }, [employees, thresholds]);

  // Dynamic counts for each category
  const categoryCounts = useMemo(() => {
    const counts = {};
    ALERT_CATEGORIES.forEach(cat => {
      if (cat.id === 'all_documents') {
        counts[cat.id] = allAlerts.length;
      } else {
        counts[cat.id] = allAlerts.filter(a => a.category === cat.id).length;
      }
    });
    return counts;
  }, [allAlerts]);

  // Current active category label & count
  const currentCatMeta = useMemo(() => {
    return ALERT_CATEGORIES.find(c => c.id === activeCategory) || ALERT_CATEGORIES[0];
  }, [activeCategory]);

  // Filtered rows for active category & search
  const filteredRows = useMemo(() => {
    let list = allAlerts;
    if (activeCategory !== 'all_documents') {
      list = list.filter(a => a.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => 
        (a.employee_name || '').toLowerCase().includes(q) ||
        String(a.employee_number || '').includes(q) ||
        String(a.national_id || '').includes(q) ||
        (a.branch_name || '').toLowerCase().includes(q) ||
        (a.department_name || '').toLowerCase().includes(q) ||
        (a.expiry_date || '').includes(q)
      );
    }

    return list;
  }, [allAlerts, activeCategory, search]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage]);

  // Handle open edit document dates modal
  const handleOpenEdit = (alertItem) => {
    const emp = employees.find(e => String(e.id) === String(alertItem.employee_id) || String(e.employee_number) === String(alertItem.employee_number));
    let meta = {};
    if (emp?.manager_name && typeof emp.manager_name === 'string' && emp.manager_name.startsWith('{')) {
      try { meta = JSON.parse(emp.manager_name); } catch (e) {}
    }

    setEditingItem({ alertItem, employee: emp });
    setEditForm({
      id_expiry_date: emp?.id_expiry_date || alertItem.expiry_date || '',
      work_permit_expiry_date: meta.work_permit_expiry_date || emp?.work_permit_expiry_date || '',
      insurance_expiry_date: meta.insurance_expiry_date || emp?.insurance_expiry_date || '',
      passport_expiry_date: meta.passport_expiry_date || emp?.passport_expiry_date || '',
      driving_license_expiry_date: meta.driving_license_expiry_date || emp?.driving_license_expiry_date || '',
      contract_end_date: meta.contract_end_date || emp?.contract_end_date || '',
      other_licenses_expiry_date: meta.other_licenses_expiry_date || emp?.other_licenses_expiry_date || '',
    });
    setEditModalOpen(true);
  };

  // Save updated document dates
  const handleSaveDocDates = async () => {
    if (!editingItem?.employee) return;
    setSaving(true);
    try {
      const emp = editingItem.employee;
      let meta = {};
      if (emp.manager_name && typeof emp.manager_name === 'string' && emp.manager_name.startsWith('{')) {
        try { meta = JSON.parse(emp.manager_name); } catch (e) {}
      }

      // Merge new dates into meta
      const updatedMeta = {
        ...meta,
        work_permit_expiry_date: editForm.work_permit_expiry_date,
        insurance_expiry_date: editForm.insurance_expiry_date,
        passport_expiry_date: editForm.passport_expiry_date,
        driving_license_expiry_date: editForm.driving_license_expiry_date,
        contract_end_date: editForm.contract_end_date,
        other_licenses_expiry_date: editForm.other_licenses_expiry_date,
      };

      const payload = {
        id_expiry_date: editForm.id_expiry_date,
        manager_name: JSON.stringify(updatedMeta),
      };

      await base44.entities.Employee.update(emp.id, payload);
      toast({ title: '✓ تم تحديث وتجديد تواريخ الوثيقة للموظف بنجاح وحفظها' });
      setEditModalOpen(false);
      await loadData();
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Save customized alert thresholds
  const handleSaveThresholds = () => {
    setThresholds(tempThresholds);
    saveStoredThresholds(tempThresholds);
    setThresholdsModalOpen(false);
    toast({ title: '✓ تم تحديث وتطبيق فترات التنبيه المخصصة بنجاح' });
  };

  // Bulk Refresh Trigger
  const handleBulkRefresh = async () => {
    await loadData();
    toast({ title: '✓ تم تدقيق وتحديث سجلات التنبيهات مع قاعدة البيانات' });
  };

  return (
    <div className="space-y-4" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── TOP ACTION BAR & TITLE ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 text-sky-600 flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-black text-foreground flex items-center gap-2">
              <span>{currentCatMeta.label}</span>
              <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 text-xs font-mono font-bold">
                {filteredRows.length} تنبيه
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة مواعيد التجديد وانتهاء الوثائق والإقامات ورخص العمل والتأمينات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Thresholds Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTempThresholds({ ...thresholds });
              setThresholdsModalOpen(true);
            }}
            className="rounded-2xl text-xs font-bold gap-1.5 h-10 border-slate-300 dark:border-slate-700"
          >
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>تعديل فترة التنبيه (شهر / أسبوع)</span>
          </Button>

          {/* Bulk Refresh Button (Matches Ektefa "تحديث جماعي") */}
          <Button
            size="sm"
            onClick={handleBulkRefresh}
            className="bg-[#179bd7] hover:bg-[#1282b5] text-white rounded-2xl text-xs font-black gap-1.5 h-10 shadow-md shadow-sky-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث جماعي</span>
          </Button>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN LAYOUT: SIDEBAR CATEGORIES & CONTENT TABLE ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ─── RIGHT MAIN TABLE CONTAINER (9 COLS) ─────────────────────────── */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Search Box (Matches Ektefa top search bar) */}
          <Card className="p-2 rounded-2xl border border-border bg-white dark:bg-slate-900 shadow-sm">
            <div className="relative w-full">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="ابحث بالاسم، الرقم الوظيفي، رقم الهوية أو الإقامة..."
                className="ps-10 rounded-xl text-xs h-10 bg-slate-50 dark:bg-slate-800/60 border-0 focus-visible:ring-1 focus-visible:ring-sky-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
                >
                  مسح
                </button>
              )}
            </div>
          </Card>

          {/* Table Container with Ektefa Sky-Blue Header */}
          <Card className="rounded-2xl border border-border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#179bd7] text-white text-[12px] font-bold select-none">
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3">تاريخ الانتهاء</th>
                    <th className="py-3 px-4">اسم الموظف</th>
                    <th className="py-3 px-3 font-mono">رقم الهوية / الإقامة</th>
                    <th className="py-3 px-3">القسم</th>
                    <th className="py-3 px-3">الفرع</th>
                    <th className="py-3 px-3 text-center w-16">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-500 mb-2" />
                        <span>جاري تحميل بيانات التنبيهات...</span>
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                        <div className="font-bold text-foreground">لا توجد وثائق منتهية أو قريبة الانتهاء في هذا القسم</div>
                        <div className="text-[11px] text-muted-foreground">جميع المستندات سارية وضمن حدود الفترات المحددة.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const seq = (currentPage - 1) * itemsPerPage + idx + 1;
                      const isExpired = row.is_expired;
                      const isExpiringSoon = row.days <= 30;

                      return (
                        <tr 
                          key={row.id} 
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Sequential Number */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-muted-foreground">
                            {seq}
                          </td>

                          {/* Expiry Date */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{row.expiry_date}</span>
                              {isExpired ? (
                                <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] px-1.5 py-0 border-0">
                                  منتهية
                                </Badge>
                              ) : isExpiringSoon ? (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5 py-0 border-0">
                                  خلال {row.days} يوم
                                </Badge>
                              ) : null}
                            </div>
                          </td>

                          {/* Employee Name + Number */}
                          <td className="py-3 px-4 font-bold text-foreground">
                            <div className="leading-tight">
                              <div>{row.employee_name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground font-normal">
                                {row.employee_number}
                              </div>
                            </div>
                          </td>

                          {/* National / Iqama ID */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-100">
                            {row.national_id || '—'}
                          </td>

                          {/* Department */}
                          <td className="py-3 px-3 text-muted-foreground">
                            {row.department_name}
                          </td>

                          {/* Branch */}
                          <td className="py-3 px-3 text-muted-foreground">
                            {row.branch_name}
                          </td>

                          {/* Action Button (Ektefa Yellow Edit Square) */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(row)}
                              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center transition-transform hover:scale-105"
                              title="تعديل تاريخ الوثيقة وتجديدها"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                <div className="text-muted-foreground font-bold">
                  إجمالي النتائج: <strong className="text-foreground">{filteredRows.length}</strong>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 rounded-xl text-xs font-bold"
                  >
                    الأول
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-8 rounded-xl text-xs font-bold"
                  >
                    السابق
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className={`h-8 w-8 rounded-xl text-xs font-bold p-0 ${
                        currentPage === p ? 'bg-[#179bd7] text-white' : 'bg-transparent text-foreground hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </Button>
                  ))}

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-8 rounded-xl text-xs font-bold"
                  >
                    التالي
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 rounded-xl text-xs font-bold"
                  >
                    الأخير
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ─── LEFT CATEGORIES SIDEBAR (3 COLS - Matches Ektefa design) ───── */}
        <div className="lg:col-span-3 space-y-2">
          <Card className="p-2 rounded-2xl border border-border bg-white dark:bg-slate-900 shadow-sm space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-muted-foreground border-b mb-1">
              تصنيفات وأقسام التنبيهات
            </div>

            {ALERT_CATEGORIES.map(cat => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-black border-r-4 border-r-[#179bd7]'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>

                  {count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </Card>
        </div>

      </div>

      {/* ─── MODAL 1: CUSTOM ALERT THRESHOLDS CONFIG ────────────────────────── */}
      <Dialog open={thresholdsModalOpen} onOpenChange={setThresholdsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-600" />
              <span>تخصيص وتعديل فترات التنبيه المسبق</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              حدد الفترة الزمنية التي ترغب أن يبدأ النظام فيها بإظهار التنبيه قبل موعد الانتهاء الفعلي:
            </p>

            <div className="space-y-3 pt-1">
              {[
                { key: 'id_expiry', label: 'تنبيه انتهاء الهوية / الإقامة' },
                { key: 'work_permit', label: 'تنبيه رخصة العمل (كرت العمل)' },
                { key: 'insurance', label: 'تنبيه انتهاء التأمين الطبي' },
                { key: 'passport', label: 'تنبيه انتهاء جواز السفر' },
                { key: 'driving_license', label: 'تنبيه انتهاء رخصة القيادة' },
                { key: 'contract', label: 'تنبيه انتهاء عقد العمل' },
                { key: 'other_licenses', label: 'تنبيه الرخص الإضافية' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                  <span className="font-bold text-foreground">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={String(tempThresholds[item.key] || 30)}
                      onValueChange={(v) => setTempThresholds(prev => ({ ...prev, [item.key]: Number(v) }))}
                    >
                      <SelectTrigger className="w-32 h-8 rounded-xl text-xs font-bold font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="7">قبل أسبوع (7 أيام)</SelectItem>
                        <SelectItem value="14">قبل أسبوعين (14 يوم)</SelectItem>
                        <SelectItem value="30">قبل شهر (30 يوم)</SelectItem>
                        <SelectItem value="60">قبل شهرين (60 يوم)</SelectItem>
                        <SelectItem value="90">قبل 3 أشهر (90 يوم)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setThresholdsModalOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button onClick={handleSaveThresholds} className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md">
              حفظ وتطبيق فترات التنبيه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: EDIT EMPLOYEE DOCUMENT EXPIRY DATES ───────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-black flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-600" />
              <span>تعديل وتجديد تواريخ الوثائق والرخص للموظف</span>
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2 text-xs">
              
              {/* Employee Summary Card */}
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-900 flex items-center justify-between">
                <div>
                  <div className="font-heading font-black text-sm text-sky-950 dark:text-sky-200">
                    {editingItem.employee?.full_name}
                  </div>
                  <div className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
                    الرقم الوظيفي: #{editingItem.employee?.employee_number} • الجنسية: {editingItem.employee?.nationality}
                  </div>
                </div>
                <div className="text-left font-mono font-bold text-xs text-sky-900 dark:text-sky-100">
                  {editingItem.employee?.national_id}
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* ID / Iqama Expiry Date */}
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">تاريخ انتهاء الهوية / الإقامة:</Label>
                  <Input
                    value={editForm.id_expiry_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, id_expiry_date: e.target.value }))}
                    placeholder="مثال: 1448-03-06 أو 2026-10-15"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                {/* Work Permit Expiry Date */}
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">تاريخ انتهاء رخصة العمل (كرت العمل):</Label>
                  <Input
                    value={editForm.work_permit_expiry_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, work_permit_expiry_date: e.target.value }))}
                    placeholder="مثال: 1448-05-15 أو 2026-11-20"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                {/* Medical Insurance Expiry Date */}
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">تاريخ انتهاء وثيقة التأمين الطبي:</Label>
                  <Input
                    value={editForm.insurance_expiry_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, insurance_expiry_date: e.target.value }))}
                    placeholder="مثال: 1448-06-30 أو 2026-12-31"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                {/* Driving License Expiry Date */}
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">تاريخ انتهاء رخصة القيادة:</Label>
                  <Input
                    value={editForm.driving_license_expiry_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, driving_license_expiry_date: e.target.value }))}
                    placeholder="مثال: 1449-01-10 أو 2027-01-15"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                {/* Passport Expiry Date */}
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">تاريخ انتهاء جواز السفر:</Label>
                  <Input
                    value={editForm.passport_expiry_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, passport_expiry_date: e.target.value }))}
                    placeholder="مثال: 2027-08-20"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                {/* Contract End Date */}
                <div className="space-y-1">
                  <Label className="font-bold text-[11px]">تاريخ انتهاء عقد العمل:</Label>
                  <Input
                    value={editForm.contract_end_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, contract_end_date: e.target.value }))}
                    placeholder="مثال: 2027-01-01"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

                {/* Other Licenses Expiry */}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="font-bold text-[11px]">تاريخ التراخيص المهنية / أخرى:</Label>
                  <Input
                    value={editForm.other_licenses_expiry_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, other_licenses_expiry_date: e.target.value }))}
                    placeholder="مثال: 2026-12-15"
                    className="rounded-xl font-mono text-xs font-bold h-9"
                  />
                </div>

              </div>

            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button 
              onClick={handleSaveDocDates} 
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ وتحديث التواريخ سحابياً'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
