import { useCompanyProfile } from '@/lib/companyProfile';
import { PrivacyMaskToggle } from '@/lib/FinancialPrivacyContext';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import { initFullCloudSync, exportSystemBackupJSON } from '@/lib/cloudSyncEngine';
import { useTheme } from '@/lib/theme';
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getRoleMeta } from '@/lib/rbac';
import { isSpecializedRole } from '@/components/DashboardViewSwitcherBar';
import { useI18n } from '@/lib/i18n';
import WindowsStartMenu from '@/components/WindowsStartMenu';
import { 
  Cloud,
  Download,
  Bell, 
  Sun, 
  Moon, 
  Globe, 
  LogOut, 
  Settings as SettingsIcon, 
  Menu, 
  User, 
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  RotateCw,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const { profile } = useCompanyProfile();
  const roleMeta = getRoleMeta(user);
  const { lang, toggleLanguage } = useI18n();
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useTheme();
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  // Check if current user holds an executive/managerial role
  const isSpecialized = useMemo(() => {
    return isSpecializedRole(user?.role) || user?.email?.includes('yahya') || user?.email?.includes('dortal');
  }, [user]);

  // Synchronized view mode state (specialized admin vs employee portal)
  const [currentViewMode, setCurrentViewMode] = useState(() => {
    if (user?.id) {
      return localStorage.getItem('hr_dashboard_view_mode_' + user.id) || 'specialized';
    }
    return 'specialized';
  });

  useEffect(() => {
    const handleModeChange = (e) => {
      if (e.detail?.mode) {
        setCurrentViewMode(e.detail.mode);
      }
    };
    window.addEventListener('hr_view_mode_changed', handleModeChange);
    return () => window.removeEventListener('hr_view_mode_changed', handleModeChange);
  }, []);

  const handleToggleViewMode = (mode) => {
    setCurrentViewMode(mode);
    if (user?.id) {
      localStorage.setItem('hr_dashboard_view_mode_' + user.id, mode);
    }
    window.dispatchEvent(new CustomEvent('hr_view_mode_changed', { detail: { mode } }));
    if (window.location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = user?.full_name || user?.name || (user?.email?.includes('dortal') ? 'فهد ناصر محمد الجوعي' : (user?.email?.includes('yahya') ? 'يحيي محمد عبدالغفار باشا' : 'المشرف العام'));

  const todayDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  return (
    <>
      <header 
        className="sticky top-0 z-30 bg-gradient-to-r from-[#0c1538] via-[#101b4d] to-[#162768] text-white border-b border-blue-900/40 shadow-xl shadow-blue-950/25 relative overflow-hidden backdrop-blur-xl transition-all"
        dir="rtl"
      >
        {/* Subtle decorative glowing background ambient light */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* ─── PRIMARY HEADER ROW ─────────────────────────────────────────── */}
        <div className="relative z-10 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* ─── RIGHT: LOGO + EXECUTIVE GREETING & ROLE ───────────────────── */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Mobile Hamburger / Start Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (onOpenMobileMenu) onOpenMobileMenu();
                else setIsStartMenuOpen(prev => !prev);
              }}
              className="lg:hidden w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 shadow-sm shrink-0"
              aria-label="قائمة ابدأ"
              title="قائمة ابدأ (Windows 11 Start)"
            >
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00adef]" />
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00a859]" />
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#ffb900]" />
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#f25022]" />
              </div>
            </Button>

            {/* Brand Logo & Name Box */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-inner flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <img 
                  src={profile.logo_url || "/company-logo.png"} 
                  alt="شعار درة السيارة" 
                  className="w-full h-full object-contain filter drop-shadow" 
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-xs sm:text-sm text-white tracking-tight flex items-center gap-1">
                    <span>👋 مرحباً،</span>
                    <strong className="text-blue-100 font-black">{userName}</strong>
                  </span>
                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-xl shadow-sm flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span>{roleMeta.label}</span>
                  </Badge>
                </div>

                <div className="text-[10px] sm:text-[11px] text-blue-200/80 font-medium hidden md:flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium text-blue-100">{todayDateFormatted}</span>
                  <span>•</span>
                  <span className="text-blue-200 font-bold">شركة درة السيارة لقطع غيار السيارات</span>
                </div>
              </div>
            </Link>
          </div>

          {/* ─── CENTER: VIEW SWITCHER & QUICK ACTIONS (DESKTOP) ────────────── */}
          {isSpecialized && (
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Mode Switcher Pills */}
              <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-blue-500/30 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('specialized')}
                  className={`rounded-xl text-xs font-bold h-8 px-3 transition-all flex items-center gap-1.5 ${
                    currentViewMode !== 'employee'
                      ? 'bg-[#3b5bfd] text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400/40'
                      : 'bg-transparent text-blue-200/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>لوحة المدير</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleViewMode('employee')}
                  className={`rounded-xl text-xs font-bold h-8 px-3 transition-all flex items-center gap-1.5 ${
                    currentViewMode === 'employee'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40'
                      : 'bg-transparent text-blue-200/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>لوحة الموظف</span>
                </button>
              </div>

              {/* Employee Directory Link */}
              <Button
                size="sm"
                onClick={() => navigate('/employees')}
                className="bg-[#3b5bfd] hover:bg-[#2d49db] text-white font-bold rounded-xl text-xs h-8 px-3 shadow-md shadow-blue-600/30 border border-blue-400/30 gap-1 flex items-center transition-all"
              >
                <span>دليل الموظفين</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              {/* Quick Refresh */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
                className="rounded-xl text-xs h-8 px-2.5 gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all"
                title="تحديث البيانات اللحظية من قاعدة البيانات"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">تحديث</span>
              </Button>
            </div>
          )}

          {/* ─── LEFT: CONTROLS & USER AVATAR ─────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Language Switcher (Desktop Only) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:inline-flex h-8 px-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-purple-300" />
              <span className="font-sans text-[11px]">{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </Button>

            {/* Privacy Mask Toggle */}
            <div className="hidden sm:block">
              <PrivacyMaskToggle className="h-8 w-8 rounded-xl text-purple-200 hover:text-white hover:bg-white/10" />
            </div>

            {/* Notifications Dropdown */}
            <NotificationsDropdown triggerClassName="text-purple-200 hover:text-white hover:bg-white/10" />

            {/* Night / Day Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-8 w-8 rounded-xl text-purple-200 hover:text-white hover:bg-white/10"
              title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-200" />}
            </Button>

            {/* User Avatar & Dropdown Menu */}
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 p-0.5 rounded-2xl hover:bg-white/15 transition-all border border-white/20 bg-white/10">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    {userName[0]}
                  </div>
                  <span className="hidden xl:inline text-xs font-bold text-white max-w-[110px] truncate pe-2">
                    {userName.split(' ')[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="start" className="w-60 p-2 rounded-2xl shadow-2xl border bg-card text-card-foreground">
                <DropdownMenuLabel className="font-bold text-xs p-2">
                  <div className="font-black text-foreground text-sm">{userName}</div>
                  <div className="text-[11px] text-muted-foreground font-normal">{user?.email || 'admin@doratcars.com'}</div>
                  <div style={{background: roleMeta.color + '22', color: roleMeta.color}} className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-2 border border-emerald-500/20">
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
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 cursor-pointer p-2 rounded-xl"
                >
                  <Cloud className="w-4 h-4" />
                  <span>مزامنة سحابية فورية</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => {
                    exportSystemBackupJSON();
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer p-2 rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير نسخة احتياطية</span>
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

        </div>

        {/* ─── MOBILE / TABLET DEDICATED SWITCHER SUB-BAR (UNDER LG) ────────── */}
        {isSpecialized && (
          <div className="lg:hidden flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-t border-blue-900/40 bg-[#0c1538]/90 backdrop-blur-md">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-blue-500/30 shadow-inner">
              <button
                type="button"
                onClick={() => handleToggleViewMode('specialized')}
                className={`rounded-lg text-[11px] font-bold h-7 px-2.5 transition-all flex items-center gap-1 ${
                  currentViewMode !== 'employee'
                    ? 'bg-[#3b5bfd] text-white shadow-sm ring-1 ring-blue-400/40'
                    : 'bg-transparent text-blue-200/60 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>لوحة المدير</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleViewMode('employee')}
                className={`rounded-lg text-[11px] font-bold h-7 px-2.5 transition-all flex items-center gap-1 ${
                  currentViewMode === 'employee'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-transparent text-blue-200/60 hover:text-white'
                }`}
              >
                <User className="w-3 h-3" />
                <span>لوحة الموظف</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => navigate('/employees')}
                className="bg-[#3b5bfd] hover:bg-[#2d49db] text-white font-bold rounded-lg text-[11px] h-7 px-2.5 border border-blue-400/30 gap-1 flex items-center shadow-sm"
              >
                <span>دليل الموظفين</span>
                <ChevronLeft className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
                className="rounded-lg text-[11px] h-7 px-2 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                title="تحديث"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

      </header>

      {/* Windows 11 Start Menu Dialog */}
      <WindowsStartMenu 
        isOpen={isStartMenuOpen} 
        onClose={() => setIsStartMenuOpen(false)} 
      />
    </>
  );
}
