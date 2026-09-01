import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Clock, Calendar, FileText, Bell, CheckCircle2,
  AlertTriangle, UserPlus, UserX, Briefcase, ArrowLeft,
  ClipboardList, UploadCloud, Settings, ShieldCheck,
  Building2, MapPin, Eye, CheckCircle, XCircle, RotateCw
} from 'lucide-react';
import { getUnifiedRequests, approveRequestStep, rejectRequest } from '@/lib/requestsEngine';
import { useToast } from '@/components/ui/use-toast';

export default function HRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [unifiedRequests, setUnifiedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [emps, logs] = await Promise.all([
          base44.entities.Employee.list(),
          base44.entities.AttendanceLog.list('-log_date', 1000)
        ]);
        setEmployees(emps || []);
        setAttendanceLogs(logs || []);
        setUnifiedRequests(getUnifiedRequests());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleReqUpdate = () => setUnifiedRequests(getUnifiedRequests());
    window.addEventListener('hr_requests_updated', handleReqUpdate);
    return () => window.removeEventListener('hr_requests_updated', handleReqUpdate);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);
    const active = employees.filter(e => e.status === 'active');
    const onLeave = employees.filter(e => e.status === 'on_leave');

    // Attendance today
    const todayLogs = attendanceLogs.filter(l => l.log_date === todayStr);
    const presentToday = todayLogs.filter(l => l.status === 'present').length;
    const absentToday = Math.max(0, active.length - presentToday - onLeave.length);

    // Expiring Docs
    const expiringDocs = active.filter(e => {
      if (!e.id_expiry_date) return false;
      const d = new Date(e.id_expiry_date);
      return d <= in30 && d >= today;
    });

    const pendingRequests = unifiedRequests.filter(r => r.status === 'pending' || r.status === 'under_review');

    return {
      totalEmployees: employees.length,
      activeCount: active.length,
      onLeaveCount: onLeave.length,
      presentToday,
      absentToday,
      expiringDocsCount: expiringDocs.length,
      expiringDocsList: expiringDocs,
      pendingRequests
    };
  }, [employees, attendanceLogs, unifiedRequests, todayStr]);

  const handleApprove = (reqId) => {
    approveRequestStep(reqId, 'approved', user, 'تم تدقيق واعتماد الطلب من قبل إدارة الموارد البشرية');
    setUnifiedRequests(getUnifiedRequests());
    toast({ title: '✓ تم الاعتماد', description: 'تم تدقيق واعتماد الطلب بنجاح.' });
  };

  const handleReject = (reqId) => {
    rejectRequest(reqId, user, 'تم الرفض من قبل الموارد البشرية لعدم استيفاء الشروط');
    setUnifiedRequests(getUnifiedRequests());
    toast({ title: 'تم الرفض', description: 'تم رفض الطلب وتوثيق السبب.', variant: 'destructive' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-right" dir="rtl">
      
      {/* ─── 1. TOP HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-slate-950 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-emerald-600/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-3xl shadow-inner">
              👥
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold text-[10px]">
                  مركز العمليات وإدارة الموارد البشرية
                </Badge>
                <span className="text-xs text-emerald-200/70 font-mono">{todayStr}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-white">
                لوحة تحكم الموارد البشرية وشؤون الموظفين
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/employees')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-5 rounded-2xl gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Users className="w-4 h-4" />
              <span>إدارة الموظفين (Employee 360) ➔</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 2. HR OPERATIONAL KPIS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">إجمالي الموظفين</div>
          <div className="text-2xl font-black font-mono text-foreground">{metrics.totalEmployees}</div>
          <div className="text-[10px] text-emerald-600 font-bold">نشط: {metrics.activeCount}</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">الحضور اليوم</div>
          <div className="text-2xl font-black font-mono text-emerald-600">{metrics.presentToday}</div>
          <div className="text-[10px] text-muted-foreground">تم تسجيل البصمة ✓</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">الغياب اليوم</div>
          <div className="text-2xl font-black font-mono text-rose-600">{metrics.absentToday}</div>
          <div className="text-[10px] text-rose-600">بدون إجازة رسمية</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">في إجازة رسمية</div>
          <div className="text-2xl font-black font-mono text-blue-600">{metrics.onLeaveCount}</div>
          <div className="text-[10px] text-blue-600">سنوية / مرضية</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">طلبات الموظفين المعلقة</div>
          <div className="text-2xl font-black font-mono text-amber-600">{metrics.pendingRequests.length}</div>
          <div className="text-[10px] text-amber-700">تحتاج تدقيق ومراجعة</div>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm space-y-1">
          <div className="text-[11px] text-muted-foreground font-bold">وثائق تنتهي قريباً</div>
          <div className="text-2xl font-black font-mono text-purple-600">{metrics.expiringDocsCount}</div>
          <div className="text-[10px] text-purple-700">خلال 30 يوماً</div>
        </Card>
      </div>

      {/* ─── 3. REQUESTS AUDIT & EXPIRING DOCS ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PENDING REQUESTS AUDIT */}
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-heading font-black text-base text-foreground">طلبات الموظفين المعلقة</h2>
                <p className="text-[11px] text-muted-foreground">إجازات، تعديل بصمات، تعديل ورديات، وشهادات</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 text-xs font-mono font-bold">
              {metrics.pendingRequests.length} طلب
            </Badge>
          </div>

          <div className="space-y-3">
            {metrics.pendingRequests.length === 0 ? (
              <div className="text-center py-10 space-y-2 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-xs text-foreground">لا توجد طلبات معلقة حالياً</div>
                <p className="text-[11px]">كافة طلبات الموظفين مدققة ومعالجة بالكامل.</p>
              </div>
            ) : (
              metrics.pendingRequests.slice(0, 4).map(req => (
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
                      onClick={() => handleApprove(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-9 px-3 gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تدقيق واعتماد</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(req.id)}
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

        {/* EXPIRING DOCUMENTS */}
        <Card className="p-6 rounded-3xl border shadow-sm bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="font-heading font-black text-base text-foreground">الوثائق والإقامات الموشكة على الانتهاء</h2>
                <p className="text-[11px] text-muted-foreground">تنبيهات التجديد للإقامات وعقود العمل والتراخيص</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 text-xs font-mono font-bold">
              {metrics.expiringDocsCount} موظف
            </Badge>
          </div>

          <div className="space-y-3">
            {metrics.expiringDocsCount === 0 ? (
              <div className="text-center py-10 space-y-2 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-xs text-foreground">كافة الوثائق والإقامات سارية المفعول</div>
                <p className="text-[11px]">لا توجد إقامات تستوجب التجديد الفوري.</p>
              </div>
            ) : (
              metrics.expiringDocsList.slice(0, 4).map(emp => (
                <div key={emp.id} className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-foreground">{emp.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{emp.job_title} • {emp.branch_name || emp.branch}</div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                    تنتهي خلال 30 يوم ⚠️
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* ─── 4. HR QUICK WORKSPACE SHORTCUTS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          onClick={() => navigate('/attendance')}
          className="p-5 rounded-3xl border bg-card hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground">حركة الحضور واستيراد البصمات</h3>
          <p className="text-[11px] text-muted-foreground">متابعة البصمات اليومية والشفتات المنقسمة</p>
        </Card>

        <Card
          onClick={() => navigate('/leave')}
          className="p-5 rounded-3xl border bg-card hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground">سجل الإجازات والأرصدة السنوية</h3>
          <p className="text-[11px] text-muted-foreground">إدارة الإجازات السنوية والمرضية وبدون راتب</p>
        </Card>

        <Card
          onClick={() => navigate('/shifts')}
          className="p-5 rounded-3xl border bg-card hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <RotateCw className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground">إدارة الشفتات والورديات</h3>
          <p className="text-[11px] text-muted-foreground">تخصيص أوقات الدوام وساعات العمل بالفروع</p>
        </Card>

        <Card
          onClick={() => navigate('/documents-print')}
          className="p-5 rounded-3xl border bg-card hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm space-y-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground">طباعة الخطابات والنماذج الرسمية</h3>
          <p className="text-[11px] text-muted-foreground">شهادات التعريف، قرارات التعيين، والإنذارات</p>
        </Card>
      </div>

    </div>
  );
}
