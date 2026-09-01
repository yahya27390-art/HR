import { getCompanyProfile } from '@/lib/companyProfile';
import { PrivacyMaskToggle } from '@/lib/FinancialPrivacyContext';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import { initFullCloudSync, exportSystemBackupJSON } from '@/lib/cloudSyncEngine';
import { useTheme } from '@/lib/theme';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getRoleMeta } from '@/lib/rbac';
import { useI18n } from '@/lib/i18n';
import { 
  Cloud,
  Download,
  Bell, 
  Mail, 
  Sun, 
  Moon, 
  Globe, 
  LogOut, 
  Settings as SettingsIcon, 
  Menu, 
  User, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header({ onOpenMobileMenu }) {
  const { user, logout } = useAuth();
  const roleMeta = getRoleMeta(user);
  const { lang, toggleLanguage } = useI18n();
  const navigate = useNavigate();

  const { isDark, toggleDarkMode } = useTheme();

    // ─── DYNAMIC REAL UNREAD MESSAGES COUNT TAILORED TO LOGGED-IN USER ─────
  // RBAC-aware notification count
  const [rbacNotifCount, setRbacNotifCount] = useState(0);
  useEffect(() => {
    const check = () => {
      try {
        const all = JSON.parse(localStorage.getItem('hr_notifications_v2') || '[]');
        const uid = user?.employee_number || user?.id;
        const role = user?.role;
        const unread = all.filter(n => {
          if (n.is_read) return false;
          if (n.recipient_id && n.recipient_id !== uid) return false;
          if (n.recipient_role && n.recipient_role !== role) return false;
          return true;
        }).length;
        setRbacNotifCount(unread);
      } catch(e) {}
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const getRealUnreadCount = useCallback(() => {
    try {
      const userEmpNum = String(user?.employee_number || user?.id || '').replace('emp_', '');
      const isAdmin = user?.role === 'admin' || !user?.role;
      const userBranch = user?.branch_name || user?.branch || '';

      const saved = localStorage.getItem('hr_flow_announcements_messages');
      if (saved) {
        const msgs = JSON.parse(saved);
        if (Array.isArray(msgs)) {
          return msgs.filter(m => {
            if (m.folder !== 'inbox' || m.is_read) return false;
            if (isAdmin) return true;
            if (m.recipient_type === 'all' || !m.recipient_type) return true;
            if (m.recipient_type === 'branch') {
              return userBranch && (m.recipient_target === userBranch || m.recipient_label?.includes(userBranch));
            }
            if (m.recipient_type === 'emp') {
              const target = String(m.recipient_id || m.recipient_target || m.recipient_emp_num || '');
              return target === userEmpNum;
            }
            return true;
          }).length;
        }
      }
    } catch {}
    return 0;
  }, [user]);

  const [unreadCount, setUnreadCount] = useState(getRealUnreadCount);

  useEffect(() => {
    const handleUpdate = () => {
      setUnreadCount(getRealUnreadCount());
    };
    window.addEventListener('messages_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('messages_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [getRealUnreadCount]);

  // toggleDarkMode provided by useTheme

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user display name
  const userName = user?.full_name || user?.name || (user?.email?.includes('dortal') ? 'فهد ناصر محمد الجوعي' : (user?.email?.includes('yahya') ? 'يحيي محمد عبدالغفار باشا' : 'المشرف العام'));

  return (
    <header 
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors"
      dir="rtl"
    >
      
      {/* ─── RIGHT: BRAND & MOBILE MENU TRIGGER ───────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden rounded-xl text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform p-1">
            <img src={getCompanyProfile().logo_url || "/company-logo.svg"} alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-heading font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>Green Arrow</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.2 rounded-md font-mono">HR</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">منظومة الموارد البشرية المتكاملة</div>
          </div>
        </Link>
      </div>

      {/* ─── CENTER: GREETING MESSAGE (EKTEFA STYLE) ───────────────────────── */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-border/60 px-4 py-1.5 rounded-full shadow-inner">
        <span className="text-sm">👋</span>
        <span className="text-xs font-bold text-foreground">
          مرحباً بعودتك، <strong className="text-emerald-600 dark:text-emerald-400 font-black">{userName}</strong>
        </span>
      </div>

      {/* ─── LEFT: CONTROLS & USER AVATAR ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        
        {/* English / Arabic Pill Switcher */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="h-8 px-3 rounded-full text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white border-0 shadow-sm gap-1"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-sans text-[11px]">{lang === 'ar' ? 'English' : 'عربي'}</span>
        </Button>

        <PrivacyMaskToggle />
        <NotificationsDropdown />

        {/* Mail / Announcements with Dynamic Counter */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/announcements?tab=inbox')}
          className="relative h-8 w-8 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:flex"
          title="البريد والمراسلات الإدارية"
        >
          <Mail className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 end-0.5 min-w-[16px] h-4 px-1 bg-pink-600 text-white text-[9px] font-black rounded-full flex items-center justify-center font-mono ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>

        {/* Night / Day Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </Button>

        {/* User Avatar & Dropdown Menu */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pe-1 ps-1.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-border/80">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {userName[0]}
              </div>
              <span className="hidden xl:inline text-xs font-bold text-foreground max-w-[120px] truncate">
                {userName.split(' ')[0]}
              </span>
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-xl">
            <DropdownMenuLabel className="font-bold text-xs">
              <div className="font-black text-foreground">{userName}</div>
              <div className="text-[11px] text-muted-foreground font-normal">{user?.email || 'admin@greenarrow.com'}</div>
              <div style={{background: roleMeta.color + '22', color: roleMeta.color}} className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-1.5">
                {roleMeta.icon} {roleMeta.label}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => navigate('/employee-profile')}
              className="rounded-xl py-2 text-xs font-bold gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-sky-600" />
              <span>ملفي الشخصي 360°</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={async () => {
                await initFullCloudSync();
                toast({ title: '☁️ تمت المزامنة السحابية بنجاح', description: 'تم استرجاع ومزامنة كافة الاعتمادات والسلف من السحابة.' });
              }}
              className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 cursor-pointer p-2.5 rounded-xl"
            >
              <Cloud className="w-4 h-4" />
              <span>مزامنة سحابية فورية</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => {
                exportSystemBackupJSON();
                toast({ title: '📥 تم تصدير النسخة الاحتياطية', description: 'تم حفظ ملف النسخة الاحتياطية على جهازك.' });
              }}
              className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer p-2.5 rounded-xl"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="rounded-xl py-2 text-xs font-bold gap-2 cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4 text-slate-600" />
              <span>إعدادات النظام</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="rounded-xl py-2 text-xs font-bold gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج الآمن</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

    </header>
  );
}
