import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/theme';
import { getRoleMeta, hasPermission } from '@/lib/rbac';
import { getCompanyProfile } from '@/lib/companyProfile';
import { getNavGroups } from '@/lib/nav';
import {
  X,
  Search,
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Fingerprint,
  CalendarDays,
  Wallet,
  CreditCard,
  FileSpreadsheet,
  Megaphone,
  GitBranch,
  Settings,
  Layers,
  Award,
  Sun,
  Moon,
  Power,
  Lock,
  ChevronLeft,
  Pin,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Building2
} from 'lucide-react';

export default function WindowsStartMenu({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const roleMeta = getRoleMeta(user);
  const { isDark, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const groups = useMemo(() => getNavGroups(user), [user]);

  const [activeTab, setActiveTab] = useState('pinned'); // 'pinned' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [companyProfile, setCompanyProfile] = useState(() => getCompanyProfile());

  useEffect(() => {
    const updateHandler = () => {
      setCompanyProfile(getCompanyProfile());
    };
    window.addEventListener('company_profile_updated', updateHandler);
    window.addEventListener('storage', updateHandler);
    return () => {
      window.removeEventListener('company_profile_updated', updateHandler);
      window.removeEventListener('storage', updateHandler);
    };
  }, []);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const handleLockSession = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('hr_lock_session_now'));
  };

  const userDisplayName = user?.full_name || 'يحيي محمد عبدالغفار باشا';
  const userEmpNum = user?.employee_number || '1022';
  const userJob = user?.job_title || 'مدير النظام';

  const isEmployeeOnly = user?.role === 'employee' || !hasPermission(user, 'employees.view');

  // Dynamic Pinned Tiles matching user role & authorized permissions
  const pinnedTiles = useMemo(() => {
    if (isEmployeeOnly) {
      return [
        { to: '/portal', label: 'الرئيسية', icon: LayoutDashboard, gradient: 'from-sky-500 to-blue-600', shadow: 'rgba(2, 132, 199, 0.35)' },
        { to: '/my-requests', label: 'طلباتي', icon: ClipboardList, gradient: 'from-blue-500 to-indigo-600', shadow: 'rgba(59, 130, 246, 0.35)' },
        { to: '/attendance', label: 'دوامي وبصماتي', icon: Clock, gradient: 'from-amber-500 to-orange-600', shadow: 'rgba(245, 158, 11, 0.35)' },
        { to: '/leave', label: 'إجازاتي', icon: CalendarDays, gradient: 'from-indigo-500 to-violet-600', shadow: 'rgba(99, 102, 241, 0.35)' },
        { to: '/contracts', label: 'عقدي الوظيفي', icon: FileText, gradient: 'from-teal-500 to-cyan-600', shadow: 'rgba(13, 148, 136, 0.35)' },
        { to: '/employee-profile', label: 'ملفي 360°', icon: Users, gradient: 'from-emerald-500 to-teal-600', shadow: 'rgba(16, 185, 129, 0.35)' },
        { to: '/documents-print', label: 'النماذج والخطابات', icon: FileSpreadsheet, gradient: 'from-rose-500 to-pink-600', shadow: 'rgba(244, 63, 94, 0.35)' },
        { to: '/announcements', label: 'التعاميم الرسمية', icon: Megaphone, gradient: 'from-purple-500 to-indigo-600', shadow: 'rgba(168, 85, 247, 0.35)' },
      ];
    }

    // Manager / Admin / HR Pinned Tiles
    const adminTiles = [
      { to: '/', label: 'الرئيسية', icon: LayoutDashboard, gradient: 'from-sky-500 to-blue-600', shadow: 'rgba(2, 132, 199, 0.35)' },
      { to: '/employees', label: 'الموظفين', icon: Users, gradient: 'from-emerald-500 to-teal-600', shadow: 'rgba(16, 185, 129, 0.35)', permission: 'employees.view' },
      { to: '/contracts', label: 'العقود', icon: FileText, gradient: 'from-teal-500 to-cyan-600', shadow: 'rgba(13, 148, 136, 0.35)', permission: 'employees.edit' },
      { to: '/attendance', label: 'البصمات', icon: Clock, gradient: 'from-amber-500 to-orange-600', shadow: 'rgba(245, 158, 11, 0.35)', permission: 'attendance.view' },
      { to: '/devices', label: 'الأجهزة', icon: Fingerprint, gradient: 'from-orange-500 to-rose-600', shadow: 'rgba(249, 115, 22, 0.35)', permission: 'shifts.manage' },
      { to: '/leave', label: 'الإجازات', icon: CalendarDays, gradient: 'from-indigo-500 to-violet-600', shadow: 'rgba(99, 102, 241, 0.35)', permission: 'leave.view' },
      { to: '/payroll', label: 'الرواتب', icon: Wallet, gradient: 'from-purple-500 to-indigo-700', shadow: 'rgba(139, 92, 246, 0.35)', permission: 'payroll.view' },
      { to: '/payroll?tab=advances', label: 'السلف', icon: CreditCard, gradient: 'from-violet-500 to-purple-600', shadow: 'rgba(139, 92, 246, 0.35)', permission: 'loans.view' },
      { to: '/reports', label: 'التقارير', icon: FileSpreadsheet, gradient: 'from-teal-500 to-cyan-700', shadow: 'rgba(13, 148, 136, 0.35)', permission: 'reports.view' },
      { to: '/announcements', label: 'التعاميم', icon: Megaphone, gradient: 'from-pink-500 to-rose-600', shadow: 'rgba(236, 72, 153, 0.35)', permission: 'announcements.send' },
      { to: '/branches', label: 'الفروع', icon: GitBranch, gradient: 'from-emerald-600 to-teal-700', shadow: 'rgba(5, 150, 105, 0.35)', permission: 'branches.manage' },
      { to: '/settings', label: 'الإعدادات', icon: Settings, gradient: 'from-slate-600 to-slate-800', shadow: 'rgba(71, 85, 105, 0.35)', permission: 'settings.view' },
    ];

    return adminTiles.filter(t => !t.permission || hasPermission(user, t.permission));
  }, [user, isEmployeeOnly]);

  // Dynamic Recommended Actions matching user role & permissions
  const recommendedActions = useMemo(() => {
    if (isEmployeeOnly) {
      return [
        { to: '/leave', label: 'تقديم طلب إجازة', icon: CalendarDays, color: '#6366f1' },
        { to: '/my-requests', label: 'تقديم طلب سلفة', icon: CreditCard, color: '#8b5cf6' },
        { to: '/attendance', label: 'سجل بصمات دوامي', icon: Clock, color: '#f59e0b' },
        { to: '/contracts', label: 'عقد العمل الموحد', icon: FileText, color: '#0d9488' },
      ];
    }

    const adminActions = [
      { to: '/approvals', label: 'مركز الاعتمادات والطلبات', icon: CheckCircle2, color: '#0284c7', permission: 'approvals.manage' },
      { to: '/payroll', label: 'تدقيق مسير الرواتب', icon: Wallet, color: '#8b5cf6', permission: 'payroll.view' },
      { to: '/reports', label: 'التقارير والكشوفات', icon: FileSpreadsheet, color: '#0d9488', permission: 'reports.view' },
      { to: '/leave', label: 'إدارة طلبات الإجازات', icon: CalendarDays, color: '#6366f1', permission: 'leave.view' },
    ];

    return adminActions.filter(a => !a.permission || hasPermission(user, a.permission));
  }, [user, isEmployeeOnly]);

  const allItemsFlat = [];
  groups.forEach(grp => {
    (grp.items || []).forEach(it => {
      allItemsFlat.push({ ...it, groupLabel: grp.label, groupColor: grp.color });
    });
  });

  const filteredAllItems = searchQuery
    ? allItemsFlat.filter(it => it.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : allItemsFlat;

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
      
      {/* Fluent Acrylic Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* Windows 11 Start Menu Acrylic Window */}
      <div 
        className="relative w-full max-w-[560px] max-h-[92vh] sm:max-h-[720px] flex flex-col z-10 overflow-hidden rounded-[28px] sm:rounded-[32px] border border-white/80 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl shadow-[0_25px_65px_-10px_rgba(0,0,0,0.25)] text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200"
      >
        
        {/* Top Header Bar */}
        <div className="pt-3.5 px-5 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Windows 11 4-Tile Logo */}
            <div className="grid grid-cols-2 gap-0.5 w-5 h-5 drop-shadow-sm">
              <span className="w-2 h-2 rounded-[2px] bg-[#00adef]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#00a859]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#ffb900]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#f25022]" />
            </div>
            <span className="font-heading font-black text-sm text-foreground tracking-tight">قائمة ابدأ</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
              Windows 11 Fluent
            </span>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Windows 11 Style Search Bar */}
        <div className="px-5 py-2 shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في البرامج والمهام..."
              className="w-full h-11 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl pe-10 ps-4 text-xs font-bold text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 shadow-inner transition-all"
              autoFocus
            />
            <div className="absolute end-3 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Start Menu Category Switcher */}
        <div className="px-5 py-1.5 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('pinned')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all gap-1.5 flex items-center ${
                activeTab === 'pinned'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>المثبتة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all gap-1.5 flex items-center ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>كافة الأقسام</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>درة السيارة</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">HR Cloud</span>
          </div>
        </div>

        {/* Scrollable Center Canvas */}
        <div className="flex-1 overflow-y-auto px-5 py-3 no-scrollbar space-y-4">

          {/* TAB 1: PINNED TILES (WINDOWS 11 STYLE APP GRID) */}
          {activeTab === 'pinned' && !searchQuery && (
            <>
              {/* Pinned App Tiles Grid (4 Columns) */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>البرامج والأقسام الرئيسية</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{pinnedTiles.length} تطبيق</span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {pinnedTiles.map((tile) => {
                    const active = isActive(tile.to);
                    const TileIcon = tile.icon;

                    return (
                      <Link
                        key={tile.to}
                        to={tile.to}
                        onClick={onClose}
                        className={`group flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-200 active:scale-95 text-center ${
                          active 
                            ? 'bg-slate-100/90 dark:bg-slate-800/90 ring-2 ring-sky-500 shadow-sm' 
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Windows 11 App Tile Icon */}
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${tile.gradient} shadow-md transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-0.5`}
                          style={{ boxShadow: `0 8px 18px -4px ${tile.shadow}` }}
                        >
                          <TileIcon className="w-6 h-6 drop-shadow-sm" />
                        </div>
                        <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 mt-2 truncate max-w-full">
                          {tile.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Recommended / Frequent Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    المهام السريعة والاعتمادات
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">وصول مباشر</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {recommendedActions.map((act) => {
                    const ActIcon = act.icon;
                    return (
                      <Link
                        key={act.to}
                        to={act.to}
                        onClick={onClose}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all group"
                      >
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105"
                          style={{ backgroundColor: act.color }}
                        >
                          <ActIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{act.label}</div>
                          <div className="text-[9.5px] text-muted-foreground truncate">فتح الآن</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ALL MODULES & SEARCH RESULTS */}
          {(activeTab === 'all' || searchQuery) && (
            <div className="space-y-3">
              {filteredAllItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">
                  لا توجد نتائج مطابقة للبحث "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredAllItems.map((item) => {
                    const ItemIcon = item.icon || Layers;
                    const active = isActive(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          active
                            ? 'bg-sky-500/10 border-sky-500/40 text-sky-900 dark:text-sky-200 font-black'
                            : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs"
                            style={{ backgroundColor: item.groupColor || '#0284c7' }}
                          >
                            <ItemIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs truncate block">{item.label}</span>
                            {item.groupLabel && (
                              <span className="text-[9px] text-muted-foreground block truncate">{item.groupLabel}</span>
                            )}
                          </div>
                        </div>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Windows 11 Fluent Bottom Profile & Power Bar */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          
          {/* User Profile Card */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm text-white shrink-0 ring-2 ring-white dark:ring-slate-800"
              style={{ backgroundColor: roleMeta.color || '#0284c7' }}
            >
              {userDisplayName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-foreground truncate flex items-center gap-1.5">
                <span>{userDisplayName}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 font-bold">
                  #{userEmpNum}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                <span>{userJob}</span>
                <span>•</span>
                <span style={{ color: roleMeta.color }} className="font-bold">{roleMeta.label}</span>
              </div>
            </div>
          </div>

          {/* Quick System Action Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
            </button>

            {/* Lock Session */}
            <button
              type="button"
              onClick={handleLockSession}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-500/15 transition-colors"
              title="قفل الشاشة فوراً"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Power / Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-500/15 transition-colors"
              title="تسجيل الخروج"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
