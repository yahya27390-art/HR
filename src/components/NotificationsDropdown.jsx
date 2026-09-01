import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { calcDocAlerts } from '@/lib/alertsEngine';
import {
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar,
  AlertTriangle,
  FileText,
  CheckCheck,
  ChevronLeft,
  Sparkles,
  Inbox
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hr_read_notification_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'approvals' | 'alerts'

  // Load employees for document alerts
  useEffect(() => {
    base44.entities.Employee.list().then(emps => setEmployees(emps || [])).catch(() => {});
  }, []);

  // Save readIds to localStorage
  const markAsRead = useCallback((id) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [id, ...prev];
      localStorage.setItem('hr_read_notification_ids', JSON.stringify(next));
      return next;
    });
  }, []);

  const markAllAsRead = useCallback((notifsToRead) => {
    const ids = notifsToRead.map(n => n.id);
    setReadIds(prev => {
      const merged = Array.from(new Set([...prev, ...ids]));
      localStorage.setItem('hr_read_notification_ids', JSON.stringify(merged));
      return merged;
    });
  }, []);

  // Aggregate all live notifications
  const notifications = useMemo(() => {
    const list = [];
    const role = user?.role || 'employee';
    const isManager = ['owner', 'hr', 'accountant', 'system_admin'].includes(role);

    // 1. Advances Requests
    try {
      const advs = JSON.parse(localStorage.getItem('hr_advances_list') || localStorage.getItem('hr_flow_employee_advances') || '[]');
      (advs || []).forEach(a => {
        if (isManager && ['pending', 'hr_approved', 'accountant_approved'].includes(a.status)) {
          list.push({
            id: 'notif_adv_' + a.id,
            type: 'advance',
            category: 'approvals',
            title: 'طلب سلفة جديد',
            desc: `${a.employee_name} — ${Number(a.amount || 0).toLocaleString('en-US')} ر.س (${a.reason || 'سلفة راتب'})`,
            time: a.date || a.created_at || new Date().toISOString(),
            link: '/approvals',
            icon: CreditCard,
            iconColor: 'text-amber-500 bg-amber-500/10',
            badge: a.status === 'pending' ? 'بانتظار HR' : (a.status === 'hr_approved' ? 'بانتظار المحاسب' : 'بانتظار المدير العام')
          });
        }
      });
    } catch {}

    // 2. Leave Requests
    try {
      const leaves = JSON.parse(localStorage.getItem('hr_leave_requests') || '[]');
      (leaves || []).forEach(l => {
        if (isManager && l.status === 'pending') {
          list.push({
            id: 'notif_leave_' + l.id,
            type: 'leave',
            category: 'approvals',
            title: 'طلب إجازة جديد',
            desc: `${l.employee_name} — ${l.leave_type} (من ${l.start_date} إلى ${l.end_date})`,
            time: l.created_at || new Date().toISOString(),
            link: '/approvals',
            icon: Calendar,
            iconColor: 'text-emerald-500 bg-emerald-500/10',
            badge: 'طلب إجازة'
          });
        }
      });
    } catch {}

    // 3. Punch Corrections
    try {
      const corrs = JSON.parse(localStorage.getItem('hr_correction_requests') || '[]');
      (corrs || []).forEach(c => {
        if (isManager && c.status === 'pending') {
          list.push({
            id: 'notif_corr_' + c.id,
            type: 'correction',
            category: 'approvals',
            title: 'طلب تعديل بصمة',
            desc: `${c.employee_name} — تاريخ ${c.log_date} (${c.reason || 'نسيان تسجيل'})`,
            time: c.created_at || new Date().toISOString(),
            link: '/approvals',
            icon: Clock,
            iconColor: 'text-sky-500 bg-sky-500/10',
            badge: 'تعديل بصمة'
          });
        }
      });
    } catch {}

    // 4. Document Expiry Alerts (Critical & High)
    if (isManager && employees.length > 0) {
      const docAlerts = calcDocAlerts(employees);
      docAlerts.slice(0, 8).forEach(d => {
        list.push({
          id: 'notif_' + d.id,
          type: 'doc_alert',
          category: 'alerts',
          title: d.title,
          desc: d.message,
          time: new Date().toISOString(),
          link: '/alerts',
          icon: AlertTriangle,
          iconColor: d.severity === 'critical' ? 'text-rose-500 bg-rose-500/10' : 'text-amber-500 bg-amber-500/10',
          badge: d.severity === 'critical' ? 'منتهي' : 'قريب الانتهاء'
        });
      });
    }

    // Sort: Unread first, then by date
    return list.sort((a, b) => {
      const aRead = readIds.includes(a.id);
      const bRead = readIds.includes(b.id);
      if (aRead !== bRead) return aRead ? 1 : -1;
      return new Date(b.time) - new Date(a.time);
    });
  }, [user, employees, readIds]);

  const filteredNotifs = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.category === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const handleItemClick = (notif) => {
    markAsRead(notif.id);
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} dir="rtl">
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          title="مركز الإشعارات والتنبيهات"
        >
          <Bell className={`w-4 h-4 transition-transform ${unreadCount > 0 ? 'text-amber-500 animate-bounce' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[17px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center font-mono ring-2 ring-background animate-pulse shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 rounded-3xl shadow-2xl border border-border/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden z-50"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-border/60 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-black text-foreground">الإشعارات والتنبيهات</h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {unreadCount > 0 ? `لديك ${unreadCount} تنبيه غير مقروء` : 'جميع التنبيهات مقروءة ومفحوصة ✓'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead(notifications)}
                className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>قراءة الكل</span>
              </Button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('approvals')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeFilter === 'approvals'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              الاعتمادات ({notifications.filter(n => n.category === 'approvals').length})
            </button>
            <button
              onClick={() => setActiveFilter('alerts')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeFilter === 'alerts'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              الوثائق ({notifications.filter(n => n.category === 'alerts').length})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {filteredNotifs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-muted-foreground flex items-center justify-center mx-auto text-xl">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-foreground">لا توجد تنبيهات جديدة</p>
              <p className="text-[10px] text-muted-foreground">تمت معالجة وفحص جميع الطلبات والتنبيهات</p>
            </div>
          ) : (
            filteredNotifs.map(notif => {
              const isRead = readIds.includes(notif.id);
              const IconComponent = notif.icon || Bell;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    !isRead ? 'bg-amber-500/[0.04] dark:bg-amber-400/[0.03]' : 'opacity-70'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${notif.iconColor || 'bg-slate-100 text-slate-600'}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs leading-snug font-bold ${!isRead ? 'text-foreground font-black' : 'text-muted-foreground'}`}>
                        {notif.title}
                      </h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" title="تنبيه جديد" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.desc}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      {notif.badge && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md font-bold">
                          {notif.badge}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3 text-primary" />
                        <span>فحص واعتماد</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-border/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px]">
          <button
            onClick={() => { setOpen(false); navigate('/approvals'); }}
            className="text-xs font-bold text-primary hover:underline px-2 py-1"
          >
            الانتقال لمركز الاعتمادات ➔
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/alerts'); }}
            className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1"
          >
            مركز التنبيهات ➔
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
