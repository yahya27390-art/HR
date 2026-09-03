import { useCompanyProfile } from '@/lib/companyProfile';
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
  ShieldCheck
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
  const { profile } = useCompanyProfile();
  const roleMeta = getRoleMeta(user);
  const { lang, toggleLanguage } = useI18n();
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = user?.full_name || user?.name || (user?.email?.includes('dortal') ? 'فهد ناصر محمد الجوعي' : (user?.email?.includes('yahya') ? 'يحيي محمد عبدالغفار باشا' : 'المشرف العام'));

  return (
    <header 
      className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between transition-colors shadow-sm"
      dir="rtl"
    >
      
      {/* ─── RIGHT: BRAND LOGO & SYSTEM TITLE ─────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden w-9 h-9 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
          aria-label="القائمة"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src={profile.logo_url || "/company-logo.png"} 
            alt="شعار درة السيارة" 
            className="h-10 w-auto max-w-[44px] object-contain group-hover:scale-105 transition-transform" 
          />
          <div>
            <div className="text-xs sm:text-sm font-heading font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>درة السيارة</span>
              <span className="text-[9px] bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold px-1.5 py-0.5 rounded-md font-mono">HR</span>
            </div>
            <div className="text-[9.5px] text-muted-foreground font-medium hidden sm:block">الموارد البشرية والخدمة الذاتية</div>
          </div>
        </Link>
      </div>

      {/* ─── CENTER: GREETING MESSAGE (DESKTOP ONLY) ───────────────────────── */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-4 py-1.5 rounded-full shadow-inner">
        <span className="text-sm">👋</span>
        <span className="text-xs font-bold text-foreground">
          أهلاً بك، <strong className="text-emerald-600 dark:text-emerald-400 font-black">{userName.split(' ')[0]}</strong>
        </span>
      </div>

      {/* ─── LEFT: CONTROLS & USER AVATAR ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        
        {/* Language Switcher (Desktop Only) */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="hidden sm:inline-flex h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 gap-1"
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span className="font-sans text-[11px]">{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </Button>

        {/* Privacy Mask Toggle */}
        <div className="hidden sm:block">
          <PrivacyMaskToggle />
        </div>

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* Night / Day Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </Button>

        {/* User Avatar & Dropdown Menu */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 p-0.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                {userName[0]}
              </div>
              <span className="hidden xl:inline text-xs font-bold text-foreground max-w-[110px] truncate pe-2">
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

    </header>
  );
}
