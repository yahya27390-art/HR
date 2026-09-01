
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission, ROLE_PERMISSIONS, ROLE_META } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Shield, Users, Database, Settings, Activity, Lock, CheckCircle2,
  AlertTriangle, Cpu, FileText, ArrowLeft, Clock, Bell, BarChart2
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Employee.list().then(d => {
      setEmployees(d || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const active  = employees.filter(e => e.status === 'active').length;
    const today   = new Date();
    const in30    = new Date(today.getTime() + 30 * 86400000);
    const expiringDocs = employees.filter(e => {
      if (!e.id_expiry_date || e.status !== 'active') return false;
      const d = new Date(e.id_expiry_date);
      return d >= today && d <= in30;
    }).length;
    const expiredDocs = employees.filter(e => {
      if (!e.id_expiry_date || e.status !== 'active') return false;
      return new Date(e.id_expiry_date) < today;
    }).length;

    let totalPending = 0;
    try {
      const adv = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
      const lv  = JSON.parse(localStorage.getItem('hr_leave_requests') || '[]');
      const cr  = JSON.parse(localStorage.getItem('hr_correction_requests') || '[]');
      totalPending = adv.filter(a => ['pending','hr_approved','accountant_approved'].includes(a.status)).length
        + lv.filter(l => l.status === 'pending').length
        + cr.filter(c => c.status === 'pending').length;
    } catch(e) {}

    const usersList = JSON.parse(localStorage.getItem('hr_flow_users_list') || '[]');

    return { total: employees.length, active, expiringDocs, expiredDocs, totalPending, systemUsers: usersList.length };
  }, [employees]);

  // System stats
  const storageKeys = ['hr_advances_list','hr_leave_requests','hr_correction_requests','zenith_auth_user','hr_audit_logs','hr_notifications_v2'];
  const storageStats = useMemo(() => {
    let total = 0;
    const breakdown = {};
    storageKeys.forEach(k => {
      try {
        const size = (localStorage.getItem(k) || '').length;
        breakdown[k] = size;
        total += size;
      } catch(e) {}
    });
    return { total, breakdown };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-purple-900 via-purple-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-purple-700/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-2xl">🛡️</div>
          <div>
            <h1 className="text-xl font-black tracking-tight">لوحة تحكم مدير النظام</h1>
            <p className="text-xs text-purple-200/80 mt-0.5">إدارة الأنظمة والمستخدمين والصلاحيات والمراقبة الكاملة</p>
          </div>
          <div className="mr-auto bg-purple-500/20 border border-purple-400/30 rounded-2xl px-4 py-2 text-center">
            <div className="text-xs text-purple-300">حجم البيانات</div>
            <div className="font-black font-mono text-sm">{(storageStats.total / 1024).toFixed(1)} KB</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'الموظفون', value: metrics.total, sub: metrics.active + ' نشط', color: 'border-slate-200 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200' },
          { label: 'مستخدمو النظام', value: metrics.systemUsers, sub: 'حساب مسجل', color: 'border-purple-200 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200' },
          { label: 'طلبات معلقة', value: metrics.totalPending, sub: 'بانتظار اعتماد', color: 'border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200' },
          { label: 'وثائق ستنتهي', value: metrics.expiringDocs, sub: 'خلال 30 يوم', color: 'border-orange-200 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200' },
          { label: 'وثائق منتهية', value: metrics.expiredDocs, sub: 'تحتاج تجديد', color: 'border-red-200 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200' },
          { label: 'الأدوار', value: Object.keys(ROLE_META).length, sub: 'دور في النظام', color: 'border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200' },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className={"p-3 rounded-2xl border " + color}>
            <div className="text-xs font-bold mb-1">{label}</div>
            <div className="text-2xl font-black">{value}</div>
            <div className="text-[11px] mt-0.5 opacity-70">{sub}</div>
          </Card>
        ))}
      </div>

      {/* Roles & Permissions Overview */}
      <Card className="p-5 rounded-2xl border">
        <h3 className="font-black text-sm text-foreground mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-500" /> مصفوفة الأدوار والصلاحيات
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(ROLE_META).map(([role, meta]) => {
            const perms = ROLE_PERMISSIONS[role] || [];
            return (
              <div key={role} style={{borderColor: meta.color + '44', background: meta.color + '11'}} className="p-3 rounded-xl border">
                <div className="font-black text-sm flex items-center gap-1 mb-2" style={{color: meta.color}}>
                  {meta.icon} {meta.label}
                </div>
                <div className="text-2xl font-black" style={{color: meta.color}}>{perms.length}</div>
                <div className="text-[11px] text-muted-foreground">صلاحية</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/employees', icon: Users, label: 'إدارة الموظفين', color: 'text-slate-600' },
          { to: '/users', icon: Shield, label: 'إدارة المستخدمين', color: 'text-purple-600' },
          { to: '/approvals', icon: CheckCircle2, label: 'مركز الاعتمادات', color: 'text-emerald-600' },
          { to: '/alerts', icon: Bell, label: 'مركز التنبيهات', color: 'text-red-600' },
          { to: '/attendance', icon: Clock, label: 'الحضور والبصمات', color: 'text-orange-600' },
          { to: '/payroll', icon: BarChart2, label: 'مسير الرواتب', color: 'text-indigo-600' },
          { to: '/reports', icon: FileText, label: 'التقارير الشاملة', color: 'text-sky-600' },
          { to: '/settings', icon: Settings, label: 'إعدادات النظام', color: 'text-rose-600' },
          { to: '/import-data', icon: Database, label: 'استيراد البيانات', color: 'text-teal-600' },
          { to: '/departments', icon: Activity, label: 'الأقسام والفروع', color: 'text-amber-600' },
          { to: '/shifts', icon: Cpu, label: 'إدارة الشفتات', color: 'text-violet-600' },
          { to: '/allowances', icon: CheckCircle2, label: 'البدلات والمزايا', color: 'text-pink-600' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}>
            <Card className="p-3.5 rounded-2xl border hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]">
              <div className="flex items-center gap-2.5">
                <Icon className={"w-5 h-5 " + color} />
                <span className="text-xs font-bold text-foreground">{label}</span>
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
