import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  getLiveAnnouncements,
  addAnnouncement,
  deleteAnnouncement
} from '@/lib/announcementsEngine';
import {
  Megaphone,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pause,
  Play,
  FileText,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Printer,
  Sparkles,
  Send,
  X,
  Volume2,
  AlertCircle,
  Coins,
  Scale,
  Crown,
  Calculator,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function ExecutiveAnnouncementTicker({ className = '' }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState(getLiveAnnouncements);
  const [isPaused, setIsPaused] = useState(false);

  // Modals
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'executive',
    target: 'all',
    priority: 'high',
    is_pinned: true
  });

  // Check if current user can publish announcements (Owner, Accountant, HR, Admin)
  const canPublish = useMemo(() => {
    const num = String(user?.employee_number || user?.id || '').replace('emp_', '');
    const email = (user?.email || '').toLowerCase();
    const role = user?.role;
    return (
      role === 'owner' || role === 'admin' || role === 'accountant' || role === 'hr' ||
      num === '1001' || num === '1005' || num === '1022' ||
      email === 'dortalsiarh@gmail.com' || email === 'hes.ham42@yahoo.com' || email === 'yahya9031@gmail.com'
    );
  }, [user]);

  // Load and Listen to Announcements Updates
  useEffect(() => {
    const handleUpdate = () => {
      setAnnouncements(getLiveAnnouncements());
    };
    window.addEventListener('hr_announcements_updated', handleUpdate);
    return () => window.removeEventListener('hr_announcements_updated', handleUpdate);
  }, []);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast({
        title: 'تنبيه',
        description: 'يرجى كتابة عنوان التعميم ونص الملاحظة بالكامل.',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const created = addAnnouncement(form, user);
      toast({
        title: '✓ تم نشر التعميم بنجاح',
        description: 'تم بث التعميم على شريط الأخبار التلفزيوني لجميع الموظفين فوراً.'
      });
      setCreateModalOpen(false);
      setForm({
        title: '',
        content: '',
        category: 'executive',
        target: 'all',
        priority: 'high',
        is_pinned: true
      });
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Distinct Author Color Meta
  const getAuthorMeta = (item) => {
    const role = (item?.author_role || '').toLowerCase();
    const name = (item?.author_name || '').toLowerCase();

    if (role.includes('مدير عام') || role.includes('owner') || name.includes('فهد') || name.includes('الجوعي')) {
      return {
        label: '👑 فهد الجوعي (المدير العام)',
        shortLabel: '👑 المدير العام',
        badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        icon: Crown
      };
    }

    if (role.includes('حسابات') || role.includes('accountant') || role.includes('مالي') || name.includes('هشام') || name.includes('زغلول')) {
      return {
        label: '💼 هشام زغلول (مدير الحسابات)',
        shortLabel: '💼 مدير الحسابات',
        badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        icon: Calculator
      };
    }

    // HR / Default
    return {
      label: '📋 يحيى باشا (الموارد البشرية)',
      shortLabel: '📋 الموارد البشرية',
      badgeClass: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
      icon: UserCheck
    };
  };

  if (!announcements || announcements.length === 0) return null;

  // Duplicate the list 4 times for a perfectly seamless, infinite marquee loop
  const tickerItems = [...announcements, ...announcements, ...announcements, ...announcements];

  return (
    <>
      {/* ─── CONTINUOUS TV NEWS TICKER CSS ──────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tvMarqueeAnimation {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(50%);
          }
        }
        .tv-marquee-track {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          width: max-content;
          animation: tvMarqueeAnimation 95s linear infinite;
          will-change: transform;
        }
        .tv-marquee-track.paused {
          animation-play-state: paused !important;
        }
        .tv-marquee-track:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* ─── 1. TV NEWS TICKER STRIP (LIGHT THEME) ─────────────────────────── */}
      <div
        className={`relative overflow-hidden bg-gradient-to-r from-emerald-50/95 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl sm:rounded-3xl border border-emerald-200/90 dark:border-slate-800 shadow-md p-1.5 sm:p-2 transition-all flex items-center justify-between gap-2 ${className}`}
        dir="rtl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        
        {/* Right / Start: Fixed Glowing Live Badge */}
        <div className="flex items-center gap-2 shrink-0 z-10 bg-white/95 dark:bg-slate-900/95 ps-1 pe-2 py-1 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-heading font-black text-[11px] sm:text-xs shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">التعاميم والتوجيهات:</span>
            <span className="sm:hidden">التعاميم:</span>
          </div>
        </div>

        {/* Center: Infinite Seamless Smooth Marquee (TV News Style) */}
        <div className="flex-1 overflow-hidden relative cursor-pointer mask-fade-edges">
          <div className={`tv-marquee-track ${isPaused ? 'paused' : ''}`}>
            {tickerItems.map((item, idx) => {
              const meta = getAuthorMeta(item);
              const AuthorIcon = meta.icon;

              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => setSelectedAnnouncement(item)}
                  className="inline-flex items-center gap-2.5 px-4 py-1 group hover:bg-emerald-100/50 dark:hover:bg-slate-800/60 rounded-xl transition-all"
                  title="انقر لقراءة نص التعميم بالكامل"
                >
                  {/* Distinct Author Pill */}
                  <Badge className={`text-[10px] font-black border py-0.5 px-2 rounded-lg flex items-center gap-1 shrink-0 ${meta.badgeClass}`}>
                    <AuthorIcon className="w-3 h-3 shrink-0" />
                    <span>{meta.shortLabel}</span>
                  </Badge>

                  {/* Title in Deep Navy Blue */}
                  <span className="text-xs sm:text-[13px] font-heading font-black text-[#0B1E33] dark:text-emerald-300 group-hover:text-emerald-700 transition-colors shrink-0">
                    {item.title}:
                  </span>

                  {/* Content in Dark Gray */}
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-950 transition-colors">
                    {item.content}
                  </span>

                  {/* News Bullet Separator */}
                  <span className="text-emerald-500 font-bold px-3 select-none text-xs">
                    ✦ ✦
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left / End: Control Buttons (Pause / View / Post) */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-white/95 dark:bg-slate-900/95 ps-2 pe-1 py-1 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          
          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
            title={isPaused ? 'استئناف حركة الشريط' : 'إيقاف حركة الشريط مؤقتاً'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Read Modal Button */}
          <Button
            size="sm"
            onClick={() => setSelectedAnnouncement(announcements[0])}
            variant="outline"
            className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded-xl text-[11px] h-7 px-2.5 gap-1 font-bold shadow-sm"
          >
            <FileText className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">عرض التعميم</span>
            <span className="sm:hidden">عرض</span>
          </Button>

          {/* Publish New Announcement */}
          {canPublish && (
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-[11px] h-7 px-3 rounded-xl gap-1 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">نشر تعميم ✍️</span>
              <span className="sm:hidden">نشر</span>
            </Button>
          )}

        </div>

      </div>

      {/* ─── 2. READ ANNOUNCEMENT LETTERHEAD MODAL ──────────────────────────── */}
      {selectedAnnouncement && (
        <Dialog open={Boolean(selectedAnnouncement)} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
          <DialogContent className="max-w-2xl text-right p-0 gap-0 border-0 bg-slate-950 text-slate-100 shadow-2xl rounded-3xl" dir="rtl">
            
            {/* Modal Header Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <Badge className={`text-xs font-black border ${getAuthorMeta(selectedAnnouncement).badgeClass}`}>
                    {getAuthorMeta(selectedAnnouncement).label}
                  </Badge>
                  <h2 className="font-heading font-black text-lg text-white mt-1">
                    {selectedAnnouncement.title}
                  </h2>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="bg-slate-800 text-slate-200 border-slate-700 rounded-xl text-xs h-9 px-3 gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </Button>
            </div>

            {/* Printable Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Official Letterhead Header */}
              <div className="border-b-2 border-emerald-500/80 pb-4 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <div className="font-heading font-black text-base text-emerald-400">
                    مؤسسة درة السيارة لقطع غيار السيارات
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    الرقم المرجعي: <span className="font-mono text-slate-200">CIRC-{selectedAnnouncement.id?.slice(-6) || '2026'}</span>
                  </div>
                </div>

                <div className="text-left font-mono text-[11px]">
                  <div>تاريخ الإصدار: {new Date(selectedAnnouncement.created_at).toLocaleDateString('ar-SA')}</div>
                  <div className="text-emerald-400">تعميم إداري رسمي معتمد ✓</div>
                </div>
              </div>

              {/* Announcement Text in Clean High Contrast Box */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h3 className="font-heading font-black text-base text-[#6EE7B7]">
                  {selectedAnnouncement.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {/* Official Seal & Signature */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-slate-200">جهة ومصدر التوجيه:</div>
                    <div className="text-emerald-400 font-bold">{selectedAnnouncement.author_role || selectedAnnouncement.author_name}</div>
                  </div>
                </div>

                <div className="text-left font-mono text-[10px] text-slate-400">
                  <div>SEAL: DORAT-CARS-7016475555</div>
                  <div>التوثيق: نظام الموارد البشرية السحابي</div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedAnnouncement(null)}
                className="text-slate-400 hover:text-white text-xs h-9 px-4 rounded-xl"
              >
                إغلاق
              </Button>
            </div>

          </DialogContent>
        </Dialog>
      )}

      {/* ─── 3. CREATE / PUBLISH ANNOUNCEMENT MODAL ─────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg text-right p-0 gap-0 border-0 bg-slate-950 text-slate-100 shadow-2xl rounded-3xl" dir="rtl">
          
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-white">
                نشر تعميم أو توجيه إداري جديد
              </h2>
              <p className="text-[11px] text-slate-400">
                بث فوري للملاحظات والقرارات على شريط الأخبار التلفزيوني والشاشات
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
            
            <div className="space-y-1">
              <Label className="font-bold text-slate-200">عنوان التعميم / الملاحظة *</Label>
              <Input
                placeholder="مثال: تعليمات صرف الرواتب، مواعيد الدوام، تنبيه رسمي..."
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-slate-900 border-slate-800 text-xs h-10 rounded-xl text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-slate-200">التصنيف والجهة:</Label>
                <Select value={form.category} onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-xs h-10 rounded-xl text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="executive">👑 توجيه المدير العام</SelectItem>
                    <SelectItem value="financial">💼 تعميم مالي وحسابات</SelectItem>
                    <SelectItem value="hr">📋 تعميم الموارد البشرية</SelectItem>
                    <SelectItem value="urgent">⚠️ تنبيه عاجل وصارم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-200">الجمهور المستهدف:</Label>
                <Select value={form.target} onValueChange={(v) => setForm(prev => ({ ...prev, target: v }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-xs h-10 rounded-xl text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="all">جميع الموظفين والفروع</SelectItem>
                    <SelectItem value="branch_sales">فروع المبيعات فقط</SelectItem>
                    <SelectItem value="admin">الإدارة العامة والمحاسبة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-200">نص التعميم والملاحظة بالكامل *</Label>
              <Textarea
                placeholder="اكتب التوجيه أو القرار الإداري هنا بوضوح ليعرض لجميع الموظفين..."
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="bg-slate-900 border-slate-800 text-xs rounded-xl text-white leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs h-10 rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xs h-10 px-6 rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{creating ? 'جاري البث...' : 'بث ونشر التعميم فوراً 🚀'}</span>
              </Button>
            </DialogFooter>

          </form>

        </DialogContent>
      </Dialog>
    </>
  );
}
