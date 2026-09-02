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
  Scale
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
  const [currentIndex, setCurrentIndex] = useState(0);
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

  // Auto-rotation timer (every 7 seconds when not paused)
  useEffect(() => {
    if (isPaused || announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, announcements.length]);

  const currentItem = announcements[currentIndex] || announcements[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

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
        description: 'تم بث التعميم لجميع الموظفين والشاشات في النظام فوراً.'
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
      setCurrentIndex(0);
    } catch (e) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (!currentItem) return null;

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'executive':
        return { label: 'توجيه المدير العام', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'financial':
        return { label: 'تعميم مالي ورواتب', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'hr':
        return { label: 'الموارد البشرية', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'urgent':
        return { label: 'تنبيه عاجل ⚠️', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      default:
        return { label: 'تعميم إداري رسمي', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    }
  };

  const catBadge = getCategoryBadge(currentItem.category);

  return (
    <>
      {/* ─── 1. ULTRA-PREMIUM TICKER STRIP ──────────────────────────────────── */}
      <div
        className={`relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl border border-slate-800 shadow-xl p-2 sm:p-2.5 transition-all ${className}`}
        dir="rtl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          {/* Left / Start: Glowing Live Badge & Category */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-heading font-black text-xs shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
              </span>
              <Megaphone className="w-3.5 h-3.5" />
              <span>التعاميم والتوجيهات:</span>
            </div>

            <Badge className={`text-[10px] font-bold border ${catBadge.color}`}>
              {catBadge.label}
            </Badge>

            <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
              ({currentIndex + 1} من {announcements.length})
            </span>
          </div>

          {/* Middle: Active Announcement Teaser Title */}
          <div
            onClick={() => setSelectedAnnouncement(currentItem)}
            className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer group px-1 sm:px-3 py-1 rounded-xl hover:bg-slate-800/60 transition-all"
            title="انقر لقراءة التعميم بالكامل"
          >
            <span className="text-xs sm:text-[13px] font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
              {currentItem.title}
            </span>
            <span className="text-[11px] text-slate-400 hidden lg:inline shrink-0 font-normal">
              — {currentItem.author_role || currentItem.author_name}
            </span>
            <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline" />
          </div>

          {/* Right / End: Interactive Controls & Publish Action */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            
            {/* Previous & Next Buttons */}
            <div className="flex items-center bg-slate-900/90 rounded-xl border border-slate-800 p-0.5 shadow-inner">
              <button
                onClick={handlePrev}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                title="التعميم السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-6 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all"
                title={isPaused ? 'استئناف التمرير التلقائي' : 'إيقاف مؤقت'}
              >
                {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
              </button>
              <button
                onClick={handleNext}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                title="التعميم التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Read Full Button */}
            <Button
              size="sm"
              onClick={() => setSelectedAnnouncement(currentItem)}
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl text-[11px] h-7 px-2.5 gap-1 font-bold shadow-sm"
            >
              <FileText className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">عرض التعميم</span>
              <span className="sm:hidden">عرض</span>
            </Button>

            {/* Management Direct Post Button (Owner / Accountant / HR) */}
            {canPublish && (
              <Button
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] h-7 px-3 rounded-xl gap-1 shadow-md shadow-amber-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">نشر تعميم جديد ✍️</span>
                <span className="sm:hidden">نشر ✍️</span>
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* ─── 2. FULL CIRCULAR READER MODAL ───────────────────────────────────── */}
      <Dialog open={Boolean(selectedAnnouncement)} onOpenChange={(v) => !v && setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl text-right p-0 gap-0 border-0 bg-slate-950 text-slate-100 shadow-2xl rounded-3xl overflow-hidden" dir="rtl">
          {selectedAnnouncement && (
            <div>
              {/* Header Letterhead */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-400 font-bold">مؤسسة درة السيارة لقطع غيار السيارات</div>
                      <div className="font-heading font-black text-base text-white">{selectedAnnouncement.title}</div>
                    </div>
                  </div>

                  <Badge className={`text-xs ${getCategoryBadge(selectedAnnouncement.category).color}`}>
                    {selectedAnnouncement.number || 'تعميم رسمي'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>المرسل: <strong className="text-slate-200">{selectedAnnouncement.author_name}</strong> ({selectedAnnouncement.author_role})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono">{new Date(selectedAnnouncement.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-900/60">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium shadow-inner">
                  {selectedAnnouncement.content}
                </div>

                {/* Official Electronic Seal */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>معتمد وموثق بنظام الموارد البشرية الداخلي ✓</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      رقم التوثيق: SEALD-CIRC-{selectedAnnouncement.id?.slice(-6) || '2026-OK'}
                    </div>
                  </div>

                  <div className="text-left font-mono text-[10px] text-slate-500">
                    HR DORAT CARS<br />OFFICIAL CIRCULAR
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedAnnouncement(null)}
                  className="text-slate-400 hover:text-white text-xs h-9"
                >
                  إغلاق
                </Button>

                <Button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة التعميم</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 3. MANAGEMENT NEW ANNOUNCEMENT MODAL ────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg text-right p-6 rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>نشر تعميم أو توجيه إداري جديد</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2 text-xs">
            
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground">عنوان التعميم أو الملاحظة *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: تعميم بشأن تنظيم ساعات الدوام / إيداع المسير..."
                className="rounded-xl text-xs h-10 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground">تصنيف التعميم *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-xl text-xs h-10 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">توجيه المدير العام (فهد الجوعي)</SelectItem>
                    <SelectItem value="financial">تعميم مالي وحسابات (هشام زغلول)</SelectItem>
                    <SelectItem value="hr">الموارد البشرية والعقود (يحيى باشا)</SelectItem>
                    <SelectItem value="urgent">تنبيه عاجل وهام ⚠️</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-foreground">الفئة المستهدفة *</Label>
                <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                  <SelectTrigger className="rounded-xl text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة منسوبي المنشأة (جميع الفروع)</SelectItem>
                    <SelectItem value="sales">فروع مبيعات قطع الغيار فقط</SelectItem>
                    <SelectItem value="admin">مكتب الإدارة والمحاسبة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-foreground">نص وتفاصيل التعميم الإداري *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="اكتب التوجيهات أو الملاحظات الرسمية بوضوح ليراها جميع الموظفين..."
                className="rounded-xl text-xs min-h-[110px] leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl text-xs h-10"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-10 px-5 rounded-xl gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{creating ? 'جاري النشر...' : 'بث ونشر التعميم فوراً 📢'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
