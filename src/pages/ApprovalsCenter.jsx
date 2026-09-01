import AdvanceVoucherA4Modal from '@/components/AdvanceVoucherA4Modal';
import { saveAdvance, getAdvances } from '@/lib/payrollEngine';
import { cloudSave, cloudLoad, initFullCloudSync } from '@/lib/cloudSyncEngine';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2, XCircle, Clock, Search, CreditCard, Calendar,
  ClipboardList, DollarSign, FileText, AlertCircle, Eye, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:              { label: 'بانتظار المراجعة', class: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  hr_approved:          { label: 'اعتمد HR', class: 'bg-sky-100 text-sky-800 border-sky-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  accountant_approved:  { label: 'اعتمد المحاسب', class: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  approved:             { label: 'معتمد', class: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:             { label: 'مرفوض', class: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3 h-3" /> },
  disbursed:            { label: 'تم الصرف', class: 'bg-purple-100 text-purple-800 border-purple-200', icon: <DollarSign className="w-3 h-3" /> },
};

function useRequests() {
  const loadLocal = (key) => { 
    try { 
      const d = JSON.parse(localStorage.getItem(key) || '[]'); 
      if (key === 'hr_advances_list' && (!d || d.length === 0)) {
        return JSON.parse(localStorage.getItem('hr_flow_employee_advances') || '[]');
      }
      return Array.isArray(d) ? d : []; 
    } catch(e) { 
      return []; 
    } 
  };

  const save = async (key, data) => { 
    localStorage.setItem(key, JSON.stringify(data)); 
    if (key === 'hr_advances_list') {
      localStorage.setItem('hr_flow_employee_advances', JSON.stringify(data));
    }
    await cloudSave(key, data); 
  };

  const [advances,    setAdvances]    = useState(() => loadLocal('hr_advances_list'));
  const [leaves,      setLeaves]      = useState(() => loadLocal('hr_leave_requests'));
  const [corrections, setCorrections] = useState(() => loadLocal('hr_correction_requests'));
  const [syncing,     setSyncing]     = useState(false);

  const silentSync = useCallback(async (isManual = false) => {
    if (isManual) setSyncing(true);
    try {
      const [advData, lvData, crData] = await Promise.all([
        cloudLoad('hr_advances_list', []),
        cloudLoad('hr_leave_requests', []),
        cloudLoad('hr_correction_requests', [])
      ]);
      if (Array.isArray(advData)) setAdvances(advData);
      if (Array.isArray(lvData)) setLeaves(lvData);
      if (Array.isArray(crData)) setCorrections(crData);
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      if (isManual) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    silentSync(false);
    const interval = setInterval(() => silentSync(false), 15000);
    return () => clearInterval(interval);
  }, [silentSync]);

  const manualRefresh = async () => {
    await silentSync(true);
  };

  const updateAdvance = async (id, fields) => {
    const updated = advances.map(a => a.id === id ? { ...a, ...fields } : a);
    setAdvances(updated);
    await save('hr_advances_list', updated);
  };

  const updateLeave = async (id, fields) => {
    const updated = leaves.map(a => a.id === id ? { ...a, ...fields } : a);
    setLeaves(updated);
    await save('hr_leave_requests', updated);
  };

  const updateCorrection = async (id, fields) => {
    const updated = corrections.map(a => a.id === id ? { ...a, ...fields } : a);
    setCorrections(updated);
    await save('hr_correction_requests', updated);
  };

  return { advances, leaves, corrections, refresh: manualRefresh, syncing, updateAdvance, updateLeave, updateCorrection };
}

export default function ApprovalsCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('advances');
  const [viewModal, setViewModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedAdvanceForVoucher, setSelectedAdvanceForVoucher] = useState(null);
  const { advances, leaves, corrections, refresh, syncing, updateAdvance, updateLeave, updateCorrection } = useRequests();

  const isOwner      = user?.role === 'owner';
  const isAccountant = user?.role === 'accountant';
  const isHR         = user?.role === 'hr';
  const isAdmin      = user?.role === 'system_admin';

  const handleAdvanceAction = async (adv, action) => {
    const now = new Date().toISOString();

    if (action === 'hr_approve' && (isHR || isAdmin)) {
      await updateAdvance(adv.id, { status: 'hr_approved', hr_approved_at: now, hr_approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد السلفة من قبل HR' });
    } else if (action === 'accountant_approve' && (isAccountant || isAdmin)) {
      await updateAdvance(adv.id, { status: 'accountant_approved', accountant_approved_at: now, accountant_approved_by: user.full_name });
      toast({ title: '✅ تم الاعتماد المالي للسلفة' });
    } else if (action === 'owner_approve' && (isOwner || isAdmin)) {
      await updateAdvance(adv.id, { status: 'approved', owner_approved_at: now, owner_approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد السلفة نهائياً من المدير العام' });
    } else if (action === 'disburse' && (isAccountant || isAdmin)) {
      const amt = Number(adv.amount || adv.total_amount) || 0;
      const instCount = Number(adv.installments || adv.total_installments) || 1;
      const monthly = Number(adv.monthly_deduction || adv.monthly_installment) || Math.round(amt / instCount);
      
      const formattedAdv = {
        ...adv,
        total_amount: amt,
        amount: amt,
        total_installments: instCount,
        installments: instCount,
        monthly_installment: monthly,
        monthly_deduction: monthly,
        paid_amount: 0,
        paid_installments: 0,
        remaining_balance: amt,
        status: 'disbursed',
        disbursed_at: now,
        disbursed_by: user.full_name,
        start_month: '2026-09',
        disbursement_date: now.split('T')[0]
      };

      await updateAdvance(adv.id, formattedAdv);
      saveAdvance(formattedAdv);
      
      setSelectedAdvanceForVoucher(formattedAdv);
      setVoucherModalOpen(true);
      toast({ title: '💰 تم تسجيل صرف السلفة وتفعيل الاستقطاع الشهري الآلي' });
    } else if (action === 'reject') {
      await updateAdvance(adv.id, { status: 'rejected', rejected_at: now, rejected_by: user.full_name, rejection_reason: rejectReason });
      setViewModal(null);
      setRejectReason('');
      toast({ title: '❌ تم رفض السلفة', variant: 'destructive' });
    }
    setViewModal(null);
  };

  const handleLeaveAction = async (lv, action) => {
    const now = new Date().toISOString();
    if (action === 'approve' && (isHR || isOwner || isAdmin)) {
      await updateLeave(lv.id, { status: 'approved', approved_at: now, approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد الإجازة' });
    } else if (action === 'reject') {
      await updateLeave(lv.id, { status: 'rejected', rejected_at: now, rejected_by: user.full_name, rejection_reason: rejectReason });
      setViewModal(null); setRejectReason('');
      toast({ title: '❌ تم رفض الإجازة', variant: 'destructive' });
    }
    setViewModal(null);
  };

  const handleCorrectionAction = async (cr, action) => {
    const now = new Date().toISOString();
    if (action === 'approve' && (isHR || isAdmin)) {
      await updateCorrection(cr.id, { status: 'approved', approved_at: now, approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد تعديل البصمة' });
    } else if (action === 'reject') {
      await updateCorrection(cr.id, { status: 'rejected', rejected_at: now, rejected_by: user.full_name, rejection_reason: rejectReason });
      setViewModal(null); setRejectReason('');
      toast({ title: '❌ تم رفض تعديل البصمة', variant: 'destructive' });
    }
    setViewModal(null);
  };

  const filterList = (list) => (list || []).filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (item.employee_name || '').toLowerCase().includes(s) || (item.reason || '').toLowerCase().includes(s);
  });

  const pendingAdvances    = advances.filter(a => 
    (a.source === 'employee_request' || a.is_employee_request) &&
    ['pending', 'hr_approved', 'accountant_approved', 'pending_gm_approval'].includes(a.status) &&
    !a.is_opening_balance &&
    !a.is_admin_direct &&
    a.source !== 'management'
  );
  const pendingLeaves      = leaves.filter(l => l.status === 'pending');
  const pendingCorrections = corrections.filter(c => c.status === 'pending');
  const totalPending       = pendingAdvances.length + pendingLeaves.length + pendingCorrections.length;

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return <Badge className={"text-xs gap-1 border flex items-center " + cfg.class}>{cfg.icon}{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black text-foreground">مركز الاعتمادات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{totalPending} طلب بانتظار المراجعة</p>
          </div>
        </div>

        <Button
          onClick={refresh}
          disabled={syncing}
          variant="outline"
          className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-4"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-sky-600' : ''}`} />
          <span>{syncing ? 'جاري المزامنة...' : 'مزامنة وتحديث'}</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ابحث باسم الموظف أو السبب..." value={search} onChange={e=>setSearch(e.target.value)} className="pr-9 rounded-xl h-10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-2xl h-10 p-1 gap-1">
          <TabsTrigger value="advances" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CreditCard className="w-3.5 h-3.5" /> السلف {pendingAdvances.length > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingAdvances.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="w-3.5 h-3.5" /> الإجازات {pendingLeaves.length > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingLeaves.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="corrections" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="w-3.5 h-3.5" /> تعديلات البصمة {pendingCorrections.length > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingCorrections.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* Advances Tab */}
        <TabsContent value="advances" className="mt-4 space-y-2">
          {filterList(pendingAdvances).length === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لا توجد طلبات سلفة</Card>
          ) : filterList(pendingAdvances).map(adv => (
            <Card key={adv.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-sm">{adv.employee_name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">#{adv.employee_number}</Badge>
                    <StatusBadge status={adv.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="font-black text-foreground">{Number(adv.amount || 0).toLocaleString('en-US')} ر.س</span>
                    <span>•</span>
                    <span>{adv.installments || 1} شهر ({(adv.monthly_deduction || Math.round(adv.amount / (adv.installments || 1))).toLocaleString('en-US')} ر.س/شهر)</span>
                    {adv.reason && <><span>•</span><span className="text-foreground">{adv.reason}</span></>}
                  </div>
                  {adv.rejection_reason && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-xl mt-2">
                      سبب الرفض: {adv.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Action Buttons based on role */}
                  {adv.status === 'pending' && (isHR || isAdmin) && (
                    <Button size="sm" onClick={() => handleAdvanceAction(adv, 'hr_approve')} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold">
                      اعتماد HR ✓
                    </Button>
                  )}
                  {adv.status === 'hr_approved' && (isAccountant || isAdmin) && (
                    <Button size="sm" onClick={() => handleAdvanceAction(adv, 'accountant_approve')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                      اعتماد مالي ✓
                    </Button>
                  )}
                  {(adv.status === 'accountant_approved' || adv.status === 'pending' || adv.status === 'hr_approved') && (isOwner || isAdmin) && (
                    <Button size="sm" onClick={() => handleAdvanceAction(adv, 'owner_approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                      اعتماد المدير العام 👑
                    </Button>
                  )}
                  {adv.status === 'approved' && (isAccountant || isAdmin) && (
                    <Button size="sm" onClick={() => handleAdvanceAction(adv, 'disburse')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">
                      تسجيل الصرف 💰
                    </Button>
                  )}
                  {adv.status === 'disbursed' && (
                    <Button size="sm" variant="outline" onClick={() => { setSelectedAdvanceForVoucher(adv); setVoucherModalOpen(true); }} className="text-purple-700 border-purple-300 hover:bg-purple-50 rounded-xl text-xs font-bold gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>سند السلفة A4</span>
                    </Button>
                  )}
                  {!['approved', 'rejected', 'disbursed'].includes(adv.status) && (
                    <Button size="sm" variant="outline" onClick={() => setViewModal(adv)} className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-xs font-bold">
                      رفض ✕
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves" className="mt-4 space-y-2">
          {filterList(leaves).length === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لا توجد طلبات إجازة</Card>
          ) : filterList(leaves).map(lv => (
            <Card key={lv.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-sm">{lv.employee_name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">#{lv.employee_number}</Badge>
                    <StatusBadge status={lv.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-foreground">{lv.leave_type}</span>
                    <span>•</span>
                    <span>من {lv.start_date} إلى {lv.end_date}</span>
                    {lv.reason && <><span>•</span><span>{lv.reason}</span></>}
                  </div>
                </div>
                {lv.status === 'pending' && (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" onClick={() => handleLeaveAction(lv, 'approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                      موافقة ✓
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setViewModal({ ...lv, _type: 'leave' }); }} className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-xs font-bold">
                      رفض ✕
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Corrections Tab */}
        <TabsContent value="corrections" className="mt-4 space-y-2">
          {filterList(corrections).length === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لا توجد طلبات تعديل بصمة</Card>
          ) : filterList(corrections).map(cr => (
            <Card key={cr.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-sm">{cr.employee_name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">#{cr.employee_number}</Badge>
                    <StatusBadge status={cr.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span>تاريخ: {cr.log_date}</span>
                    <span>•</span>
                    <span>دخول: {cr.check_in || '—'} | خروج: {cr.check_out || '—'}</span>
                    {cr.reason && <><span>•</span><span>السبب: {cr.reason}</span></>}
                  </div>
                </div>
                {cr.status === 'pending' && (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" onClick={() => handleCorrectionAction(cr, 'approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                      موافقة ✓
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setViewModal({ ...cr, _type: 'correction' }); }} className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-xs font-bold">
                      رفض ✕
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={!!viewModal} onOpenChange={open => { if (!open) { setViewModal(null); setRejectReason(''); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">رفض الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">الرجاء كتابة سبب الرفض ليظهر للموظف:</p>
            <Textarea
              placeholder="مثال: الميزانية غير كافية حالياً / يرجى التواصل مع الإدارة..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setViewModal(null); setRejectReason(''); }} className="rounded-xl text-xs font-bold">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (viewModal?._type === 'leave') handleLeaveAction(viewModal, 'reject');
                else if (viewModal?._type === 'correction') handleCorrectionAction(viewModal, 'reject');
                else handleAdvanceAction(viewModal, 'reject');
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* A4 Advance Disbursement Voucher Modal */}
      {selectedAdvanceForVoucher && (
        <AdvanceVoucherA4Modal
          isOpen={voucherModalOpen}
          onClose={() => { setVoucherModalOpen(false); setSelectedAdvanceForVoucher(null); }}
          advance={selectedAdvanceForVoucher}
          employee={null}
          companyName="مؤسسة السهم الأخضر للتجارة"
        />
      )}
    </div>
  );
}
