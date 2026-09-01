import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Mail,
  Send,
  Inbox,
  Users,
  Megaphone,
  Bell,
  CalendarDays,
  Search,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  FileText,
  Pin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Star,
  Forward,
  Reply,
  ShieldCheck,
  CheckSquare,
  Square,
  Check,
  Archive,
  Tag,
  Share2,
  Download
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Initial Official Corporate Messages
const INITIAL_MESSAGES = [
  {
    id: 'msg_1',
    sender_name: 'فهد ناصر محمد الجوعي',
    sender_role: 'المدير العام',
    sender_branch: 'مكتب الإدارة',
    recipient_type: 'all',
    recipient_label: 'كافة منسوبي المنشأة (جميع الفروع)',
    subject: 'تحميل وتفعيل تطبيق الموارد البشرية لجميع الموظفين',
    content: 'السلام عليكم ورحمة الله وبركاته،\n\nنأمل من جميع الزملاء الموظفين في كافة الفروع (الفرع الرئيسي، فرع كيا، فرع هونداي، ومكتب الإدارة) تحميل تطبيق الموارد البشرية المعتمد، وتحديث البيانات الشخصية وصور الهويات وتوثيق البصمات الشهرية بانتظام.\n\nشاكرين ومقدرين حسن تعاونكم،\nإدارة المنشأة.',
    category: 'administrative',
    date: '2025-12-17 20:21',
    is_read: true,
    is_starred: true,
    folder: 'inbox'
  },
  {
    id: 'msg_2',
    sender_name: 'هشام ابوالفضل زغلول',
    sender_role: 'مدير الحسابات والرواتب',
    sender_branch: 'مكتب الإدارة',
    recipient_type: 'all',
    recipient_label: 'كافة الموظفين المشمولين بالمسير',
    subject: 'اعتماد وإيداع مسير رواتب شهر أغسطس 2026',
    content: 'السادة الزملاء الكرام،\n\nتم بحمد الله اعتماد وتدقيق مسير الرواتب لشهر أغسطس 2026 وإيداع المستحقات والبدلات في الحسابات البنكية المعتمدة. يمكنكم الاطلاع على قسائم الرواتب والبدلات عبر قسم الأجور.\n\nمع أطيب التمنيات بالتوفيق والنجاح.',
    category: 'urgent',
    date: '2026-08-27 15:45',
    is_read: false,
    is_starred: false,
    folder: 'inbox'
  },
  {
    id: 'msg_3',
    sender_name: 'يحيي محمد عبدالغفار باشا',
    sender_role: 'مسؤول الموارد البشرية',
    sender_branch: 'مكتب الإدارة',
    recipient_type: 'all',
    recipient_label: 'كافة منسوبي المنشأة',
    subject: 'الترحيب بالموظف الجديد: عزام علي السعوي',
    content: 'يسر إدارة الموارد البشرية أن ترحب بالزميل الجديد / عزام علي السعوي المنضم حديثاً لفريق مبيعات قطع الغيار بالفرع الرئيسي.\n\nسائلين المولى عز وجل له التوفيق والنجاح في مهام عمله.',
    category: 'general',
    date: '2026-08-16 09:00',
    is_read: true,
    is_starred: false,
    folder: 'inbox'
  }
];

// Initial Official Circulars
const INITIAL_CIRCULARS = [
  {
    id: 'circ_1',
    number: 'CIRC-2026-004',
    title: 'تعميم رقم (4): تنظيم مواعيد الدوام الرسمي للورديات وفترة العمل المعتمدة',
    issued_by: 'فهد ناصر محمد الجوعي (المدير العام)',
    date: '2026-08-01',
    status: 'active',
    content: 'بناءً على مقتضيات مصلحة العمل وتنظيم حركة المبيعات في الفروع، تقرر اعتماد ساعات الدوام الرسمي من الساعة 08:00 صباحاً وحتى 16:00 للفترة الإدارية، ومن 08:00 حتى 12:00 ومن 16:00 حتى 21:00 لفروع المبيعات. ويلتزم الجميع بتسجيل البصمات وفقاً للوردية المحددة في النظام.'
  },
  {
    id: 'circ_2',
    number: 'CIRC-2026-003',
    title: 'تعميم رقم (3): سياسة منح السلف المالية واستقطاع الأقساط الشهرية',
    issued_by: 'الإدارة المالية - هشام ابوالفضل',
    date: '2026-07-15',
    status: 'active',
    content: 'يتم تقديم طلبات السلف عبر نظام الموارد البشرية مع الالتزام بالحد الأقصى لعدد الأقساط (24 شهراً)، ولا يتم إخلاء طرف أي موظف إلا بعد سداد وتصفية كامل رصيد السلفة المتبقي وفقاً لجدول الاستقطاعات المعتمد.'
  }
];

// Initial Notifications
const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'تنبيه انتهاء إقامة / هوية وطنية',
    description: 'يوجد موظف تنتهي هويته الوطنية خلال 30 يوماً القادمة. يرجى تجديد الوثيقة تفادياً للغرامات.',
    date: '2026-08-28 10:00',
    type: 'warning',
    is_read: false
  },
  {
    id: 'notif_2',
    title: 'اكتمال مزامنة أجهزة البصمة البيومترية',
    description: 'تمت مزامنة سجلات الحضور بنجاح لجميع الفروع الأربعة.',
    date: '2026-08-28 08:30',
    type: 'success',
    is_read: true
  }
];

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active top tab: 'inbox' | 'circulars' | 'notifications' | 'calendar'
  const activeTab = searchParams.get('tab') || 'inbox';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Messages State
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_announcements_messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MESSAGES;
  });

  const [circulars, setCirculars] = useState(INITIAL_CIRCULARS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [employees, setEmployees] = useState([]);

  // Sub folder for messages: 'inbox' | 'sent' | 'starred' | 'trash'
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [branchFilter, setBranchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMsgIds, setSelectedMsgIds] = useState(new Set());

  // Modal Viewers
  const [readingMessage, setReadingMessage] = useState(null);
  const [readingCircular, setReadingCircular] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // Compose Form
  const [composeForm, setComposeForm] = useState({
    recipient_type: 'all',
    recipient_target: '',
    category: 'administrative',
    subject: '',
    content: ''
  });

  // Sync messages with localStorage and dispatch event for Header badge
  const persistMessages = useCallback((newMsgs) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem('hr_flow_announcements_messages', JSON.stringify(newMsgs));
    } catch {}
    window.dispatchEvent(new Event('messages_updated'));
  }, []);

  useEffect(() => {
    const loadEmps = async () => {
      try {
        const emps = await base44.entities.Employee.list();
        setEmployees(emps || []);
      } catch {}
    };
    loadEmps();
  }, []);

  // ─── EXACT DYNAMIC UNREAD COUNTERS (NO HARDCODING) ────────────────────────
  const unreadMessagesCount = useMemo(() => {
    return messages.filter(m => m.folder === 'inbox' && !m.is_read).length;
  }, [messages]);

  const activeCircularsCount = useMemo(() => {
    return circulars.filter(c => c.status === 'active').length;
  }, [circulars]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

    // Filtered Messages List with recipient targeting
  const filteredMessages = useMemo(() => {
    const userEmpNum = String(user?.employee_number || user?.id || '').replace('emp_', '');
    const isAdmin = user?.role === 'admin' || !user?.role;
    const userBranch = user?.branch_name || user?.branch || '';

    return messages.filter(m => {
      const matchFolder = currentFolder === 'starred' 
        ? m.is_starred 
        : m.folder === currentFolder;

      let isForMe = true;
      if (!isAdmin && currentFolder === 'inbox') {
        if (m.recipient_type === 'emp') {
          const target = String(m.recipient_id || m.recipient_target || m.recipient_emp_num || '');
          isForMe = target === userEmpNum;
        } else if (m.recipient_type === 'branch') {
          isForMe = userBranch && (m.recipient_target === userBranch || m.recipient_label?.includes(userBranch));
        }
      }

      const matchBranch = branchFilter === 'all' 
        || m.sender_branch === branchFilter 
        || m.recipient_label?.includes(branchFilter);

      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q 
        || (m.subject && m.subject.toLowerCase().includes(q))
        || (m.sender_name && m.sender_name.toLowerCase().includes(q))
        || (m.content && m.content.toLowerCase().includes(q));

      return matchFolder && isForMe && matchBranch && matchQuery;
    });
  }, [messages, currentFolder, branchFilter, searchQuery, user]);

  // Actions
  const handleOpenMessage = (msg) => {
    // Mark as read immediately
    if (!msg.is_read) {
      const updated = messages.map(m => m.id === msg.id ? { ...m, is_read: true } : m);
      persistMessages(updated);
    }
    setReadingMessage(msg);
  };

  const handleToggleStar = (e, msgId) => {
    e.stopPropagation();
    const updated = messages.map(m => m.id === msgId ? { ...m, is_starred: !m.is_starred } : m);
    persistMessages(updated);
  };

  const handleToggleSelect = (e, msgId) => {
    e.stopPropagation();
    const next = new Set(selectedMsgIds);
    if (next.has(msgId)) next.delete(msgId);
    else next.add(msgId);
    setSelectedMsgIds(next);
  };

  const handleSelectAll = () => {
    if (selectedMsgIds.size === filteredMessages.length) {
      setSelectedMsgIds(new Set());
    } else {
      setSelectedMsgIds(new Set(filteredMessages.map(m => m.id)));
    }
  };

  const handleMarkSelectedRead = () => {
    if (selectedMsgIds.size === 0) return;
    const updated = messages.map(m => selectedMsgIds.has(m.id) ? { ...m, is_read: true } : m);
    persistMessages(updated);
    setSelectedMsgIds(new Set());
    toast({ title: 'تم التحديث بنجاح', description: 'تم تمييز الرسائل المحددة كمقروءة.' });
  };

  const handleDeleteSelected = () => {
    if (selectedMsgIds.size === 0) return;
    const updated = messages.filter(m => !selectedMsgIds.has(m.id));
    persistMessages(updated);
    setSelectedMsgIds(new Set());
    toast({ title: 'تم الحذف', description: 'تم حذف الرسائل المحددة بنجاح.' });
  };

    const handleSendMessage = () => {
    if (!composeForm.subject.trim() || !composeForm.content.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال الموضوع ومحتوى الرسالة.', variant: 'destructive' });
      return;
    }

    let recipientLabel = 'كافة منسوبي المنشأة';
    let recipientId = 'all';
    let recipientName = 'كافة الموظفين';

    if (composeForm.recipient_type === 'branch') {
      recipientLabel = `فرع: ${composeForm.recipient_target || 'الفرع الرئيسي'}`;
      recipientId = composeForm.recipient_target;
      recipientName = composeForm.recipient_target;
    } else if (composeForm.recipient_type === 'emp') {
      const foundEmp = employees.find(e => String(e.employee_number || e.id) === String(composeForm.recipient_target));
      recipientId = foundEmp ? String(foundEmp.employee_number) : composeForm.recipient_target;
      recipientName = foundEmp ? foundEmp.full_name : 'موظف محدد';
      recipientLabel = foundEmp ? `الموظف: ${foundEmp.full_name} (#${foundEmp.employee_number})` : 'موظف محدد';
    }

    const newMsg = {
      id: 'msg_' + Date.now(),
      sender_name: user?.full_name || 'يحيي محمد عبدالغفار باشا',
      sender_role: user?.job_title || 'مسؤول الموارد البشرية',
      sender_branch: user?.branch || 'مكتب الإدارة',
      sender_id: user?.id || 'usr_1022',
      recipient_type: composeForm.recipient_type,
      recipient_target: composeForm.recipient_target,
      recipient_id: recipientId,
      recipient_emp_num: recipientId,
      recipient_name: recipientName,
      recipient_label: recipientLabel,
      subject: composeForm.subject,
      content: composeForm.content,
      category: composeForm.category,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      is_read: false,
      is_starred: false,
      folder: 'inbox'
    };

    const updated = [newMsg, ...messages];
    persistMessages(updated);

    // Also add to Notifications tab for seamless alert visibility
    const newNotif = {
      id: 'notif_' + Date.now(),
      title: `رسالة داخلية: ${composeForm.subject}`,
      description: `أرسل ${user?.full_name || 'مسؤول الموارد البشرية'} مراسلة إدارية إلى (${recipientLabel}).`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: composeForm.category === 'urgent' ? 'warning' : 'info',
      is_read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    setComposeOpen(false);
    setComposeForm({
      recipient_type: 'all',
      recipient_target: '',
      category: 'administrative',
      subject: '',
      content: ''
    });

    toast({ 
      title: 'تم إرسال الرسالة بنجاح ✅', 
      description: `تم توجيه الرسالة وإشعار (${recipientLabel}) فوراً.` 
    });
  };

  return (
    <div className="space-y-5" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. EXECUTIVE ENTERPRISE HEADER ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-[#0B1F3A] to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-black tracking-tight text-white">
                مركز التواصل والمراسلات الإدارية والتعاميم
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                منظومة معتمدة
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
              إدارة وتوثيق المراسلات الرسمية والتعاميم والقرارات الإدارية بين الإدارة وفروع المنشأة الأربعة وفقاً للمعايير المؤسسية.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setComposeOpen(true)}
            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-pink-500/25 transition-all gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ إنشاء رسالة / تعميم رسمي</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. PRIMARY TOP TABS WITH EXACT UNREAD COUNTERS ────────────────── */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-border/80 p-2 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          
          {/* Tab 1: Internal Mail */}
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'inbox'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>البريد والمراسلات الإدارية</span>
            {unreadMessagesCount > 0 && (
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                activeTab === 'inbox' ? 'bg-white text-pink-700' : 'bg-pink-600 text-white'
              }`}>
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Tab 2: Circulars */}
          <button
            type="button"
            onClick={() => setActiveTab('circulars')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'circulars'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>التعاميم والقرارات الرسمية</span>
            <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
              activeTab === 'circulars' ? 'bg-white text-sky-700' : 'bg-slate-200 dark:bg-slate-800 text-foreground'
            }`}>
              {activeCircularsCount}
            </span>
          </button>

          {/* Tab 3: Notifications */}
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>التنبيهات الإدارية</span>
            {unreadNotificationsCount > 0 && (
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                activeTab === 'notifications' ? 'bg-white text-amber-700' : 'bg-rose-500 text-white'
              }`}>
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Tab 4: Calendar */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>التقويم والأحداث الرسمية</span>
          </button>

        </div>
      </div>

      {/* ─── TAB 1: INBOX & INTERNAL MESSAGES SUITE ────────────────────────── */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Navigation Sidebar (Folders & Branch Filters) */}
          <Card className="lg:col-span-3 p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4 h-fit">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground px-3 uppercase tracking-wider">
                مجلدات المراسلات
              </div>
              
              {[
                { id: 'inbox', label: 'الصندوق الوارد', icon: Inbox, count: unreadMessagesCount, badgeColor: 'bg-pink-600 text-white' },
                { id: 'sent', label: 'المراسلات المرسلة', icon: Send, count: 0 },
                { id: 'starred', label: 'المميزة بنجمة', icon: Star, count: messages.filter(m => m.is_starred).length },
                { id: 'trash', label: 'المهملات والأرشيف', icon: Trash2, count: 0 },
              ].map(f => {
                const IconComp = f.icon;
                const isSelected = currentFolder === f.id;

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCurrentFolder(f.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 shadow-sm border border-pink-200/60 dark:border-pink-900'
                        : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 ${isSelected ? 'text-pink-600' : 'text-slate-400'}`} />
                      <span>{f.label}</span>
                    </div>
                    {f.count > 0 && (
                      <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                        f.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-foreground'
                      }`}>
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Branch Quick Filter Pills */}
            <div className="pt-3 border-t border-border/60 space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground px-3 uppercase tracking-wider flex items-center justify-between">
                <span>تصفية حسب الفرع</span>
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1">
                {[
                  { id: 'all', label: 'كافة الفروع الأربعة' },
                  { id: 'الفرع الرئيسي', label: 'الفرع الرئيسي' },
                  { id: 'مكتب الإدارة', label: 'مكتب الإدارة' },
                  { id: 'فرع هونداي', label: 'فرع هونداي (الرواف)' },
                  { id: 'فرع كيا', label: 'فرع كيا (السليم)' },
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBranchFilter(b.id)}
                    className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors truncate ${
                      branchFilter === b.id
                        ? 'bg-slate-900 text-white dark:bg-slate-800 font-bold shadow-sm'
                        : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    • {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Security Badge */}
            <div className="pt-3 border-t border-border/60 text-[10px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>بروتوكول تشفير معتمد</span>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">
                كافة المراسلات موثقة رسمياً وتخضع للرقابة الإدارية وفق لوائح الموارد البشرية.
              </p>
            </div>
          </Card>

          {/* Right Main Messages Stream */}
          <div className="lg:col-span-9 space-y-4">
            
            {/* Search and Batch Actions Toolbar */}
            <Card className="p-3 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، الرقم الوظيفي، أو نص الموضوع..."
                  className="ps-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              {/* Batch Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  className="h-10 rounded-xl text-xs font-bold gap-1.5"
                >
                  {selectedMsgIds.size === filteredMessages.length && filteredMessages.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-pink-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span>تحديد الكل</span>
                </Button>

                {selectedMsgIds.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkSelectedRead}
                      className="h-10 rounded-xl text-xs font-bold gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>مقروء ({selectedMsgIds.size})</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteSelected}
                      className="h-10 rounded-xl text-xs font-bold gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف ({selectedMsgIds.size})</span>
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Messages Stream List */}
            <div className="space-y-2.5">
              {filteredMessages.length === 0 ? (
                <Card className="p-12 text-center rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Inbox className="w-7 h-7" />
                  </div>
                  <div className="font-heading font-black text-sm text-foreground">لا توجد رسائل في هذا المجلد</div>
                  <p className="text-xs text-muted-foreground">صندوق المراسلات فارغ حالياً أو لا توجد نتائج مطابقة لفلتر البحث.</p>
                </Card>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedMsgIds.has(msg.id);

                  return (
                    <Card
                      key={msg.id}
                      onClick={() => handleOpenMessage(msg)}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-4 ${
                        !msg.is_read
                          ? 'bg-pink-50/40 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900/60 shadow-md ring-1 ring-pink-500/20'
                          : 'bg-white dark:bg-slate-900 border-border/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        
                        {/* Select Checkbox & Star */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelect(e, msg.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4 text-pink-600" /> : <Square className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(e, msg.id)}
                            className={`p-1 transition-colors ${msg.is_starred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}
                          >
                            <Star className={`w-4 h-4 ${msg.is_starred ? 'fill-amber-500' : ''}`} />
                          </button>
                        </div>

                        {/* Sender Avatar */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white font-heading shrink-0 shadow-sm ${
                          msg.category === 'urgent' ? 'bg-gradient-to-tr from-rose-600 to-red-500' : 'bg-gradient-to-tr from-pink-600 to-purple-600'
                        }`}>
                          {(msg.sender_name || 'م')[0]}
                        </div>

                        {/* Message Subject & Sender Info */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs ${!msg.is_read ? 'font-black text-foreground' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                              {msg.sender_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              • {msg.sender_role} ({msg.sender_branch})
                            </span>
                            {msg.category === 'urgent' && (
                              <Badge className="bg-rose-500 text-white text-[9px] py-0 px-1.5 font-bold">عاجل</Badge>
                            )}
                            {msg.category === 'administrative' && (
                              <Badge className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 text-[9px] py-0 px-1.5 font-bold">إداري</Badge>
                            )}
                          </div>

                          <div className={`text-xs truncate ${!msg.is_read ? 'font-black text-foreground' : 'text-muted-foreground'}`}>
                            {msg.subject}
                          </div>

                          <div className="text-[11px] text-muted-foreground/80 truncate max-w-xl font-normal">
                            {msg.content.replace(/\n/g, ' ')}
                          </div>
                        </div>

                      </div>

                      {/* Right Meta & Date */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-end">
                          <div className="text-[10px] font-mono text-muted-foreground font-bold">
                            {msg.date}
                          </div>
                          {!msg.is_read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-pink-600 mt-1"></span>
                          )}
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleOpenMessage(msg); }}
                          className="w-8 h-8 rounded-xl text-slate-400 hover:text-foreground"
                          title="معاينة المراسلة"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>

                    </Card>
                  );
                })
              )}
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB 2: OFFICIAL CIRCULARS (التعاميم والقرارات) ────────────────── */}
      {activeTab === 'circulars' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {circulars.map((circ) => (
              <Card key={circ.id} className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 text-sky-600 flex items-center justify-center shadow-sm">
                      <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                      <Badge className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold">
                        {circ.number}
                      </Badge>
                      <h3 className="font-heading font-black text-sm text-foreground mt-1">
                        {circ.title}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground font-bold">{circ.date}</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                  {circ.content}
                </p>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-[11px] font-bold text-foreground">الجهة المصدرة: {circ.issued_by}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReadingCircular(circ)}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-600" />
                    <span>طباعة القرار الرسمي</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: NOTIFICATIONS TAB ──────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notifications.map(n => (
            <Card key={n.id} className="p-4 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  n.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60'
                }`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-xs text-foreground">{n.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.description}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{n.date}</span>
            </Card>
          ))}
        </div>
      )}

      {/* ─── TAB 4: CALENDAR TAB ───────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-base text-foreground">الأحداث والتقويم الإداري المعتمد</h3>
            <Badge className="bg-purple-100 text-purple-800 font-mono text-xs">أغسطس 2026</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border space-y-1">
              <div className="text-[10px] text-purple-600 font-bold font-mono">25 أغسطس</div>
              <div className="font-bold text-xs">بدء معالجة مسير الرواتب</div>
              <div className="text-[10px] text-muted-foreground">تدقيق البصمات الشهرية لكافة الفروع</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border space-y-1">
              <div className="text-[10px] text-emerald-600 font-bold font-mono">27 أغسطس</div>
              <div className="font-bold text-xs">إيداع رواتب الشهر</div>
              <div className="text-[10px] text-muted-foreground">صرف المستحقات والبدلات في الحسابات البنكية</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border space-y-1">
              <div className="text-[10px] text-sky-600 font-bold font-mono">01 سبتمبر</div>
              <div className="font-bold text-xs">بداية الدورة الشهرية الجديدة</div>
              <div className="text-[10px] text-muted-foreground">تصفير أرصدة الإجازات الشهرية ومتابعة البصمات</div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── MODAL: COMPOSE OFFICIAL MESSAGE / CIRCULAR ────────────────────── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-pink-600" />
              <span>إنشاء وتوجيه مراسلة إدارية رسمية</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">توجيه الرسالة إلى:</Label>
                <Select
                  value={composeForm.recipient_type}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, recipient_type: v, recipient_target: '' }))}
                >
                  <SelectTrigger className="rounded-xl text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة منسوبي المنشأة (جميع الفروع)</SelectItem>
                    <SelectItem value="branch">فرع محدد</SelectItem>
                    <SelectItem value="emp">موظف محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">درجة الأهمية والسرية:</Label>
                <Select
                  value={composeForm.category}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrative">إداري رسمي</SelectItem>
                    <SelectItem value="urgent">عاجل ومهم</SelectItem>
                    <SelectItem value="general">عام وتوجيهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {composeForm.recipient_type === 'branch' && (
              <div className="space-y-1">
                <Label className="font-bold">اختر الفرع المستهدف:</Label>
                <Select
                  value={composeForm.recipient_target}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, recipient_target: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="اختر الفرع..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                    <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
                    <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
                    <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {composeForm.recipient_type === 'emp' && (
              <div className="space-y-1">
                <Label className="font-bold">اختر الموظف المستهدف:</Label>
                <Select
                  value={composeForm.recipient_target}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, recipient_target: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="اختر الموظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                        {e.full_name} (#{e.employee_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="font-bold">موضوع الرسالة / القرار الإداري *:</Label>
              <Input
                value={composeForm.subject}
                onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="مثال: تحديث أوقات الدوام الرسمي، توثيق البصمات..."
                className="rounded-xl font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">نص ومضمون الخطاب *:</Label>
              <Textarea
                rows={5}
                value={composeForm.content}
                onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="اكتب تفاصيل ومضمون المراسلة الرسمية هنا..."
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)} className="rounded-xl font-bold text-xs">
              إلغاء
            </Button>
            <Button
              onClick={handleSendMessage}
              className="bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-xs gap-1.5 shadow-md shadow-pink-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال وتعميم المراسلة</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: OFFICIAL LETTERHEAD A4 VIEW (معاينة الخطاب الرسمي) ────────── */}
      {readingMessage && (
        <Dialog open={!!readingMessage} onOpenChange={(o) => !o && setReadingMessage(null)}>
          <DialogContent className="sm:max-w-2xl rounded-3xl p-6" dir="rtl">
            
            {/* Printable Letterhead Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-heading font-black text-sm text-foreground">شركة درة السيارة لقطع غيار السيارات</h3>
                  <div className="text-[11px] text-muted-foreground">إدارة الموارد البشرية والشؤون الإدارية</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center p-1 shadow-sm shrink-0">
                  <img src="/green-arrow-logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border">
                <div>المرجع: <strong className="text-foreground">GA-MSG-2026</strong></div>
                <div>التاريخ: <strong className="text-foreground">{readingMessage.date}</strong></div>
                <div>السرية: <strong className="text-pink-600 font-sans font-bold">إداري رسمي</strong></div>
              </div>
            </div>

            {/* Letter Body */}
            <div className="space-y-4 py-3 text-xs leading-relaxed">
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground font-bold">المستلم: <strong className="text-foreground">{readingMessage.recipient_label}</strong></div>
                <div className="text-[11px] text-muted-foreground font-bold">من: <strong className="text-foreground">{readingMessage.sender_name} ({readingMessage.sender_role} - {readingMessage.sender_branch})</strong></div>
              </div>

              <div className="pt-2">
                <div className="font-heading font-black text-base text-foreground pb-2 border-b">
                  الموضوع: {readingMessage.subject}
                </div>
                <div className="pt-3 text-foreground whitespace-pre-line text-xs leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border">
                  {readingMessage.content}
                </div>
              </div>
            </div>

            {/* Official Seal and Sign Block */}
            <div className="pt-4 border-t flex items-center justify-between text-xs">
              <div className="space-y-1 text-[11px]">
                <div className="font-bold text-foreground">إدارة الموارد البشرية والاتصال المؤسسي</div>
                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>وثيقة ومراسلة معتمدة إلكترونياً</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  <Printer className="w-3.5 h-3.5 text-pink-600" />
                  <span>طباعة الخطاب A4</span>
                </Button>
                <Button onClick={() => setReadingMessage(null)} className="bg-slate-900 text-white rounded-xl font-bold text-xs h-9">
                  إغلاق
                </Button>
              </div>
            </div>

          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL: CIRCULAR OFFICIAL VIEW ─────────────────────────────────── */}
      {readingCircular && (
        <Dialog open={!!readingCircular} onOpenChange={(o) => !o && setReadingCircular(null)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6" dir="rtl">
            <DialogHeader>
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Badge className="bg-sky-100 text-sky-800 font-mono text-xs font-bold">{readingCircular.number}</Badge>
                  <DialogTitle className="font-heading font-black text-sm text-foreground mt-1">
                    {readingCircular.title}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border text-foreground whitespace-pre-line">
                {readingCircular.content}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t pt-2 font-bold">
                <span>المصدر: {readingCircular.issued_by}</span>
                <span>تاريخ التعميم: {readingCircular.date}</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => window.print()} className="rounded-xl text-xs font-bold gap-1">
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                <span>طباعة</span>
              </Button>
              <Button onClick={() => setReadingCircular(null)} className="bg-slate-900 text-white rounded-xl font-bold text-xs">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
