import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Users,
  Clock,
  Fingerprint,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Search,
  MessageCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BranchForm from '@/components/BranchForm';

// Brand theme mapping for each branch
const BRANCH_THEMES = {
  'مكتب الإدارة': {
    color: '#0284c7', // Sky blue
    gradient: 'from-sky-600 to-indigo-700',
    lightBg: 'bg-sky-50/70 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-900',
    badge: 'المقر الرئيسي - الإدارة العامة',
    device: '.2 EK0201000044',
    shift: 'فترة عمل الاداره (08:00 - 16:00)'
  },
  'الفرع الرئيسي': {
    color: '#059669', // Emerald
    gradient: 'from-emerald-600 to-teal-700',
    lightBg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900',
    badge: 'مركز المبيعات الرئيسي',
    device: '.1 EK0201000043',
    shift: 'فترة عمل غير السعوديين / صباحي ومسائي'
  },
  'فرع هونداي ( الرواف )': {
    color: '#ea580c', // Orange
    gradient: 'from-orange-500 to-amber-600',
    lightBg: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'فرع وكالة هونداي',
    device: '.3 EK0201000045',
    shift: 'فترة عمل السعودي المساء / الصباح'
  },
  'فرع كيا ( السليم )': {
    color: '#7c3aed', // Purple
    gradient: 'from-purple-600 to-indigo-700',
    lightBg: 'bg-purple-50/70 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'فرع وكالة كيا',
    device: '.2 EK0201000044',
    shift: 'فترة عمل غير السعوديين / السعودي المساء'
  }
};

const normalizeName = (str) => (str || '').replace(/\s+/g, ' ').trim();

export default function Branches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bList, eList] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.Employee.list(),
      ]);
      setBranches(bList || []);
      setEmployees(eList || []);
    } catch (e) {
      console.error('Error loading branches:', e);
      toast({ title: 'خطأ في جلب بيانات الفروع', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistics
  const stats = useMemo(() => {
    const totalBranches = branches.length;
    const totalEmployees = employees.length;
    const mainBranches = branches.filter(b => b.is_main).length;

    return { totalBranches, totalEmployees, mainBranches };
  }, [branches, employees]);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormOpen(true);
  };

  const handleDelete = async (b) => {
    const assigned = employees.filter(e => normalizeName(e.branch_name || e.branch) === normalizeName(b.name));
    if (assigned.length > 0) {
      toast({
        title: 'لا يمكن حذف الفرع',
        description: `يوجد ${assigned.length} موظف مسجلين حالياً على هذا الفرع. يرجى نقلهم أولاً.`,
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف الفرع: ${b.name}؟`)) return;

    try {
      await base44.entities.Branch.delete(b.id);
      toast({ title: '✓ تم حذف الفرع بنجاح' });
      loadData();
    } catch (e) {
      toast({ title: 'خطأ أثناء الحذف', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP HEADER & TITLE ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-600" />
            إدارة فروع المنشأة ومواقع العمل
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            تخصيص العناوين، هواتف التواصل، أجهزة البصمة، وتوزيع الكوادر الوظيفية
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black gap-2 h-10 px-5 shadow-md shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فرع جديد</span>
        </Button>
      </div>

      {/* ─── 2. TOP STATS STRIP ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Branches */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">إجمالي الفروع المعتمدة</div>
            <div className="font-mono font-black text-2xl text-sky-600 dark:text-sky-400 mt-1">
              {stats.totalBranches} فروع
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">القصيم - بريدة</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </Card>

        {/* Assigned Employees */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">الموظفون الموزعون على الفروع</div>
            <div className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.totalEmployees} موظف
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">100% نسبة التوزيع</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        {/* Biometric Integration */}
        <Card className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">أجهزة البصمة المربوطة سحابياً</div>
            <div className="font-mono font-black text-2xl text-purple-600 dark:text-purple-400 mt-1">
              4 أجهزة
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">مزامنة حية لحظية</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
            <Fingerprint className="w-6 h-6" />
          </div>
        </Card>

      </div>

      {/* ─── 3. LUXURY BRANCH CARDS GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 rounded-3xl border bg-white dark:bg-slate-900 animate-pulse h-64" />
          ))
        ) : branches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <div className="font-bold">لا توجد فروع مسجلة</div>
          </div>
        ) : (
          branches.map((b) => {
            const theme = BRANCH_THEMES[b.name] || {
              color: '#0284c7',
              gradient: 'from-slate-700 to-slate-900',
              lightBg: 'bg-slate-50 dark:bg-slate-800/60',
              border: 'border-slate-200 dark:border-slate-800',
              badge: 'فرع تشغيلي',
              device: '.1 EK0201000043',
              shift: 'دوام رسمي'
            };

            const branchEmps = employees.filter(e => normalizeName(e.branch_name || e.branch) === normalizeName(b.name));
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address || b.name)}`;
            const cleanPhone = (b.phone || '').replace(/[^0-9]/g, '');

            return (
              <Card
                key={b.id}
                className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Decorative Top Gradient Border Accent */}
                <div 
                  className="absolute top-0 inset-x-0 h-1.5 opacity-90 transition-opacity"
                  style={{ backgroundColor: theme.color }}
                />

                <div>
                  {/* Top Bar: Icon + Name + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    
                    <div className="flex items-center gap-3.5">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0 group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: theme.color }}
                      >
                        <Building2 className="w-7 h-7" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-black text-lg text-foreground truncate">
                            {b.name}
                          </h3>
                          {b.is_main && (
                            <Badge className="bg-sky-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-lg">
                              المقر الرئيسي
                            </Badge>
                          )}
                        </div>
                        <span className="inline-block text-xs font-bold text-muted-foreground mt-0.5">
                          {theme.badge}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(b)}
                        className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-600"
                        title="تعديل العنوان والبيانات"
                      >
                        <Pencil className="w-4 h-4 text-sky-600" />
                      </Button>

                      {!b.is_main && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(b)}
                          className="w-8 h-8 rounded-xl hover:bg-rose-50 text-rose-500"
                          title="حذف الفرع"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ─── ADDRESS BOX (HIGHLIGHTED & CLICKABLE) ───────────────── */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-border/80 mb-4 space-y-2">
                    
                    {/* Address Line */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-muted-foreground font-bold">العنوان المعتمد:</div>
                          <div className="text-xs font-bold text-foreground mt-0.5 leading-relaxed">
                            {b.address || 'لم يتم تسجيل العنوان بعد'}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(b)}
                        className="h-7 text-xs font-bold text-sky-600 hover:bg-sky-50 shrink-0 gap-1 rounded-xl"
                      >
                        <Pencil className="w-3 h-3" />
                        تعديل العنوان
                      </Button>
                    </div>

                    {/* Phone & Biometric Source Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px]">
                      
                      {/* Phone */}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono font-bold text-foreground">{b.phone || '966541697999'}</span>
                      </div>

                      {/* Device */}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Fingerprint className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="font-mono text-[10px] font-bold text-foreground">{theme.device}</span>
                      </div>

                    </div>

                  </div>

                </div>

                {/* ─── TEAM MEMBERS SECTION ────────────────────────────────── */}
                <div className="pt-3 border-t border-border/70">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-foreground">طاقم عمل الفرع:</span>
                      <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-xs font-mono font-bold">
                        {branchEmps.length} موظفين
                      </Badge>
                    </div>

                    <Link to="/employees">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] font-bold text-sky-600 gap-1">
                        دليل الموظفين ➔
                      </Button>
                    </Link>
                  </div>

                  {/* Employees Mini Avatars Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {branchEmps.map((emp) => (
                      <Link
                        key={emp.id}
                        to={`/employees/${emp.id}`}
                        className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/50 flex items-center justify-between transition-colors group/emp"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {emp.full_name ? emp.full_name[0] : 'م'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[11px] text-foreground truncate group-hover/emp:text-sky-600">
                              {emp.full_name}
                            </div>
                            <div className="text-[9px] text-muted-foreground truncate">
                              {emp.job_title}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground font-bold">
                          #{emp.employee_number}
                        </span>
                      </Link>
                    ))}
                  </div>

                </div>

              </Card>
            );
          })
        )}
      </div>

      {/* ─── BRANCH FORM MODAL ────────────────────────────────────────────── */}
      <BranchForm
        open={formOpen}
        onOpenChange={setFormOpen}
        branch={editingBranch}
        onSaved={loadData}
      />

    </div>
  );
}
