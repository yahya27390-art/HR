import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import {
  getStoredContracts,
  initializeUnifiedContracts,
  getStoredResignationNotices,
  processResignationNotice
} from '@/lib/contractsEngine';
import ContractViewerModal from '@/components/ContractViewerModal';
import ContractForm from '@/components/ContractForm';
import { printContractDocument } from '@/lib/contractPrintEngine';
import { getCompanyProfile } from '@/lib/companyProfile';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Building2,
  UserCheck,
  Eye,
  Pencil,
  RotateCw,
  Send,
  XCircle,
  ExternalLink,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [contracts, setContracts] = useState([]);
  const [resignationNotices, setResignationNotices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'internal' | 'qiwa' | 'pending' | 'expiring' | 'notices'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Modals State
  const [viewingContract, setViewingContract] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  // Resignation Action Modal
  const [processingNotice, setProcessingNotice] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'reject'
  const [managerNotes, setManagerNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [emps, comps] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.Company.list()
      ]);
      setEmployees(emps || []);
      setCompanies(comps || []);

      const unified = await initializeUnifiedContracts(emps);
      setContracts(unified || []);
      setResignationNotices(getStoredResignationNotices());
    } catch (e) {
      console.error('Error loading contracts data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    const handleUpdate = () => {
      setContracts(getStoredContracts() || []);
      setResignationNotices(getStoredResignationNotices());
    };

    window.addEventListener('hr_contracts_updated', handleUpdate);
    window.addEventListener('hr_resignation_notices_updated', handleUpdate);
    window.addEventListener('hr_contract_signed', (e) => {
      toast({
        title: '✓ تم توقيع عقد جديد',
        description: `قام الموظف (${e.detail.employee_name}) بالموافقة والتوقيع الإلكتروني على العقد.`
      });
      handleUpdate();
    });

    return () => {
      window.removeEventListener('hr_contracts_updated', handleUpdate);
      window.removeEventListener('hr_resignation_notices_updated', handleUpdate);
    };
  }, []);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = contracts.length;
    const qiwa = contracts.filter(c => c.category === 'qiwa').length;
    const internal = contracts.filter(c => c.category === 'internal').length;
    const signed = contracts.filter(c => c.signed_by_employee).length;
    const pending = contracts.filter(c => !c.signed_by_employee).length;

    // Check expiring within 30 days
    const now = new Date();
    const next30 = new Date(now);
    next30.setDate(next30.getDate() + 30);
    const expiring = contracts.filter(c => {
      if (!c.end_date) return false;
      const d = new Date(c.end_date);
      return d >= now && d <= next30;
    }).length;

    const pendingNotices = resignationNotices.filter(n => n.status === 'pending_manager_approval').length;

    return { total, qiwa, internal, signed, pending, expiring, pendingNotices };
  }, [contracts, resignationNotices]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // Tab filter
      if (activeTab === 'internal' && c.category !== 'internal') return false;
      if (activeTab === 'qiwa' && c.category !== 'qiwa') return false;
      if (activeTab === 'pending' && c.signed_by_employee) return false;
      if (activeTab === 'expiring') {
        const now = new Date();
        const next30 = new Date(now);
        next30.setDate(next30.getDate() + 30);
        const d = new Date(c.end_date || '');
        if (isNaN(d.getTime()) || d < now || d > next30) return false;
      }

      // Branch filter
      if (selectedBranch !== 'all' && (c.branch || c.branch_name) !== selectedBranch) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = String(c.employee_number || '').toLowerCase();
        const name = String(c.employee_name || '').toLowerCase();
        const job = String(c.job_title || '').toLowerCase();
        const cNum = String(c.contract_number || '').toLowerCase();
        return num.includes(q) || name.includes(q) || job.includes(q) || cNum.includes(q);
      }

      return true;
    });
  }, [contracts, activeTab, selectedBranch, searchQuery]);

  // Handle Process Resignation Notice
  const handleProcessNotice = () => {
    if (!processingNotice) return;
    setActionLoading(true);
    try {
      processResignationNotice(
        processingNotice.id,
        actionType,
        managerNotes,
        user?.full_name || 'فهد الجوعي (المدير العام)'
      );

      toast({
        title: actionType === 'approve' ? '✓ تمت الموافقة على الإشعار' : 'تم رفض الإشعار',
        description: `تم حفظ قرار المدير العام وتحديث حالة عقد الموظف.`
      });

      setProcessingNotice(null);
      setManagerNotes('');
      loadAll();
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-right" dir="rtl">
      
      {/* ─── 1. TOP HEADER & HERO SECTION ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-heading font-black text-2xl shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                  إدارة عقود العمل الرسمية
                </span>
                <span className="text-xs text-slate-400">نظام العمل السعودي ولائحة درة السيارة</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
                منظومة عقود الموظفين والتوقيع الرقمي
              </h1>
              <p className="text-xs text-slate-300">
                متابعة عقود منصة قوى، عقود العمل الداخلية، التوقيع الإلكتروني، مهلة الإشعار (شهر)، والشروط الجزائية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={async () => {
                const refreshed = await initializeUnifiedContracts(employees, true);
                setContracts(refreshed);
                toast({ title: '✓ تم تحديث حالة العقود', description: 'جميع العقود أصبحت الآن غير موقعة وبانتظار اعتماد وتوقيع الموظف أو رفع عقد قوى.' });
              }}
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs h-11 px-4 rounded-2xl gap-2 font-bold"
            >
              <RotateCw className="w-4 h-4" />
              <span>إعادة تعيين العقود لغير موقعة</span>
            </Button>
            <Button
              onClick={() => { setEditingContract(null); setFormOpen(true); }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء عقد جديد</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 2. STATS SUMMARY CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">إجمالي العقود</div>
          <div className="text-2xl font-black font-mono text-foreground">{stats.total}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-1">
          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">عقود قوى الرسمية</div>
          <div className="text-2xl font-black font-mono text-emerald-600">{stats.qiwa}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-sm space-y-1">
          <div className="text-[11px] text-blue-800 dark:text-blue-300 font-bold">عقود داخلية موحدة</div>
          <div className="text-2xl font-black font-mono text-blue-600">{stats.internal}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60 shadow-sm space-y-1">
          <div className="text-[11px] text-purple-800 dark:text-purple-300 font-bold">معتمدة وموقعة رقمياً</div>
          <div className="text-2xl font-black font-mono text-purple-600">{stats.signed}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-sm space-y-1">
          <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold">بانتظار توقيع الموظف</div>
          <div className="text-2xl font-black font-mono text-amber-600">{stats.pending}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 shadow-sm space-y-1">
          <div className="text-[11px] text-rose-800 dark:text-rose-300 font-bold">إشعارات استقالة معلقة</div>
          <div className="text-2xl font-black font-mono text-rose-600">{stats.pendingNotices}</div>
        </Card>
      </div>

      {/* ─── 3. NAVIGATION TABS & CONTROLS ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border overflow-x-auto">
          {[
            { id: 'all', label: 'جميع العقود', count: stats.total },
            { id: 'internal', label: 'العقود الداخلية (الموحدة)', count: stats.internal },
            { id: 'qiwa', label: 'عقود منصة قوى', count: stats.qiwa },
            { id: 'pending', label: 'بانتظار التوقيع', count: stats.pending },
            { id: 'expiring', label: 'تنتهي خلال شهر', count: stats.expiring },
            { id: 'notices', label: 'إشعارات الاستقالة وعدم التجديد', count: resignationNotices.length }
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                }`}
              >
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                    isActive ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filter */}
        {activeTab !== 'notices' && (
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5" />
              <Input
                placeholder="بحث باسم الموظف أو رقم العقد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 rounded-xl text-xs h-9 bg-card"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. TAB CONTENT: CONTRACTS TABLE ─────────────────────────────────── */}
      {activeTab !== 'notices' && (
        <Card className="border shadow-sm rounded-3xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b text-xs font-heading font-bold text-foreground">
                  <th className="py-3 px-4">رقم العقد</th>
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-3">الفرع والمسمى الوظيفي</th>
                  <th className="py-3 px-3">تصنيف العقد</th>
                  <th className="py-3 px-3">الراتب الإجمالي</th>
                  <th className="py-3 px-3">تاريخ البداية والنهاية</th>
                  <th className="py-3 px-3 text-center">حالة التوقيع الرقمي</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse my-1" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs">
                      لا توجد عقود مطابقة للشروط المحددة.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map(c => {
                    const isQiwa = c.category === 'qiwa';
                    const isSigned = Boolean(c.signed_by_employee);

                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs">
                        
                        {/* Contract Number */}
                        <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {c.contract_number}
                        </TableCell>

                        {/* Employee Details */}
                        <TableCell>
                          <div className="font-bold text-foreground">{c.employee_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            #{c.employee_number} • {c.nationality || 'سعودي'}
                          </div>
                        </TableCell>

                        {/* Job & Branch */}
                        <TableCell>
                          <div className="font-semibold text-foreground">{c.job_title}</div>
                          <div className="text-[11px] text-emerald-600 font-bold">{c.branch || c.branch_name}</div>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <Badge className={
                            isQiwa 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }>
                            {isQiwa ? 'منصة قوى ✓' : 'عقد داخلي موحد'}
                          </Badge>
                        </TableCell>

                        {/* Salary */}
                        <TableCell className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {(c.total_salary || c.basic_salary || 0).toLocaleString('en-US')} ر.س
                        </TableCell>

                        {/* Dates */}
                        <TableCell className="font-mono text-[11px]">
                          <div>{c.start_date || '—'}</div>
                          <div className="text-muted-foreground">➔ {c.end_date || 'تجديد تلقائي'}</div>
                        </TableCell>

                        {/* Signature Status */}
                        <TableCell className="text-center">
                          {isSigned ? (
                            <div className="inline-flex flex-col items-center">
                              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>معتمد وموقع رقمياً</span>
                              </Badge>
                              {c.signed_at && (
                                <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                  {new Date(c.signed_at).toLocaleDateString('ar-SA')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] gap-1">
                              <Clock className="w-3 h-3" />
                              <span>بانتظار توقيع الموظف</span>
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => printContractDocument(c, getCompanyProfile())}
                              className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1"
                              title="طباعة العقد مباشرة A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة A4</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewingContract(c)}
                              className="h-8 px-2.5 rounded-xl text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                              title="عرض وقراءة العقد الرسمي"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض العقد</span>
                            </Button>
                          </div>
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ─── 5. TAB CONTENT: RESIGNATION & NON-RENEWAL NOTICES ───────────────── */}
      {activeTab === 'notices' && (
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-heading font-black text-lg text-foreground">
                طلبات وإشعارات الاستقالة وعدم التجديد (مهلة 30 يوماً)
              </h2>
              <p className="text-xs text-muted-foreground">
                الإشعارات المقدمة من الموظفين قبل شهر من ترك العمل وفق أحكام المادتين 7 و 8.
              </p>
            </div>
          </div>

          {resignationNotices.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-bold text-sm text-foreground">لا توجد إشعارات استقالة أو عدم تجديد مسجلة</div>
              <p className="text-xs text-muted-foreground">كافة عقود الموظفين سارية وتجدد بشكل تلقائي وسلس.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resignationNotices.map(notice => {
                const isPending = notice.status === 'pending_manager_approval';

                return (
                  <div key={notice.id} className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border flex items-center justify-center font-bold text-amber-600 shadow-sm">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">
                            {notice.type === 'non_renewal' ? 'إشعار عدم الرغبة في تجديد العقد السنوي' : 'طلب استقالة رسمية'}
                            <span className="text-xs text-muted-foreground font-normal me-2">({notice.employee_name} - #{notice.employee_number})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            رقم الإشعار: {notice.notice_number} • تاريخ التقديم: {notice.submission_date} • تاريخ آخر يوم عمل مقترح: <strong>{notice.requested_last_working_day} ({notice.notice_days_provided} يوم مهلة)</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={
                          notice.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          notice.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }>
                          {notice.status === 'approved' ? 'معتمد من المدير العام ✓' : notice.status === 'rejected' ? 'مرفوض من الإدارة ✗' : 'بانتظار قرار المدير العام ⏳'}
                        </Badge>

                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => { setProcessingNotice(notice); setActionType('approve'); }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 rounded-xl gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>موافقة</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setProcessingNotice(notice); setActionType('reject'); }}
                              className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs h-8 px-3 rounded-xl gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border">
                        <strong className="text-foreground">أسباب عدم التجديد / الاستقالة:</strong>
                        <p className="text-muted-foreground mt-1">{notice.reason || '—'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border">
                        <strong className="text-foreground">خطة تسليم العهدة والمهام:</strong>
                        <p className="text-muted-foreground mt-1">{notice.handover_plan || '—'}</p>
                      </div>
                    </div>

                    {notice.manager_action_at && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-300">
                        <strong>قرار المدير العام ({notice.manager_name}):</strong> {notice.manager_notes || 'تم اعتماد الطلب وفق الأصول ونظام العمل.'}
                        <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                          تاريخ القرار: {new Date(notice.manager_action_at).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}
      
      {/* 1. Official Qiwa-Style Contract Viewer Modal */}
      <ContractViewerModal
        open={Boolean(viewingContract)}
        onOpenChange={(v) => !v && setViewingContract(null)}
        contract={viewingContract}
        isEmployeeView={false}
        currentUser={user}
        onContractSigned={loadAll}
      />

      {/* 2. Contract Form Modal for Add/Edit */}
      <ContractForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contract={editingContract}
        companies={companies}
        onSaved={loadAll}
      />

      {/* 3. General Manager Decision Modal for Resignation Notices */}
      <Dialog open={Boolean(processingNotice)} onOpenChange={(v) => !v && setProcessingNotice(null)}>
        <DialogContent className="max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-foreground flex items-center gap-2">
              {actionType === 'approve' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
              <span>قرار المدير العام بشأن {processingNotice?.type === 'non_renewal' ? 'إشعار عدم التجديد' : 'طلب الاستقالة'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-1">
              <div>الموظف: <strong>{processingNotice?.employee_name}</strong> (#{processingNotice?.employee_number})</div>
              <div>تاريخ آخر يوم عمل مقترح: <strong>{processingNotice?.requested_last_working_day}</strong></div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">توجيهات وملاحظات المدير العام</label>
              <Textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="اكتب التوجيهات الرسمية أو شروط التسليم..."
                className="rounded-xl text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setProcessingNotice(null)} className="rounded-xl text-xs h-10">
              إلغاء
            </Button>
            <Button
              onClick={handleProcessNotice}
              disabled={actionLoading}
              className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10' : 'bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-10'}
            >
              {actionLoading ? 'جاري الحفظ...' : actionType === 'approve' ? 'اعتماد الموافقة الرسمية' : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}