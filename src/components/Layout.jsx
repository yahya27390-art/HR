import SessionGuardian from '@/components/SessionGuardian';
import { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileSidebar from '@/components/MobileSidebar';
import { getNavItems } from '@/lib/nav';
import { Grid, Menu, ChevronLeft, User, Clock, FileSignature } from 'lucide-react';

export default function Layout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const items = useMemo(() => getNavItems(user), [user]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(true);

  const isActive = (path) => {
    const base = path.split('?')[0];
    if (base === '/') return location.pathname === '/';
    return location.pathname.startsWith(base);
  };

  const desktopRightPadding = isSubMenuOpen ? 'lg:pr-[268px]' : 'lg:pr-[68px]';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-foreground font-sans selection:bg-sky-500 selection:text-white" dir="rtl">
      <SessionGuardian />
      
      {/* 1. Desktop Persistent Dual-Sidebar (Fixed on the RIGHT) */}
      <div className="no-print print:hidden">
        <Sidebar isSubMenuOpen={isSubMenuOpen} setIsSubMenuOpen={setIsSubMenuOpen} />
      </div>

      {/* 2. Mobile Slide-out Drawer */}
      <div className="no-print print:hidden">
        <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* 3. Main Content Area with EXPLICIT right padding */}
      <div className={`${desktopRightPadding} flex flex-col min-h-screen transition-all duration-200`}>
        <div className="no-print print:hidden">
          <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        </div>
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-6 pb-28 lg:pb-12 max-w-[1650px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* 4. Native Absher / Tawakkalna Style Mobile Bottom Navigation Dock */}
      <div 
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] pb-safe"
        dir="rtl"
      >
        <div className="grid grid-cols-5 items-center px-2 py-2 max-w-md mx-auto">
          
          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all ${
              location.pathname === '/'
                ? 'text-emerald-600 dark:text-emerald-400 scale-105 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${location.pathname === '/' ? 'bg-emerald-500/15' : ''}`}>
              <Grid className="w-5 h-5" />
            </div>
            <span className="text-[10.5px] font-bold tracking-tight">الرئيسية</span>
          </Link>

          {/* Requests */}
          <Link
            to="/my-requests"
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all ${
              location.pathname.startsWith('/my-requests') || location.pathname.startsWith('/requests')
                ? 'text-emerald-600 dark:text-emerald-400 scale-105 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${location.pathname.startsWith('/my-requests') ? 'bg-emerald-500/15' : ''}`}>
              <FileSignature className="w-5 h-5" />
            </div>
            <span className="text-[10.5px] font-bold tracking-tight">طلباتي</span>
          </Link>

          {/* Attendance Center Button */}
          <Link
            to="/attendance"
            className="flex flex-col items-center justify-center -mt-5 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 group-active:scale-95 transition-all">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 mt-1">دوامي</span>
          </Link>

          {/* 360 Profile */}
          <Link
            to={user?.role === 'employee' ? `/employees/${user.employee_number || user.id}` : '/employees'}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all ${
              location.pathname.startsWith('/employees') || location.pathname.startsWith('/profile')
                ? 'text-emerald-600 dark:text-emerald-400 scale-105 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${location.pathname.startsWith('/employees') ? 'bg-emerald-500/15' : ''}`}>
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10.5px] font-bold tracking-tight">ملفي 360°</span>
          </Link>

          {/* Mobile All Menus Sheet */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
          >
            <div className="p-1 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10.5px] font-bold tracking-tight">المزيد</span>
          </button>

        </div>
      </div>

    </div>
  );
}
