import { getCompanyProfile } from '@/lib/companyProfile';
import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getNavGroups } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { getRoleMeta } from '@/lib/rbac';
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
  ChevronLeft,
  Pin,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const roleMeta = getRoleMeta(user);
  const { t } = useI18n();
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

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const userDisplayName = user?.full_name || 'يحيي محمد عبدالغفار باشا';
  const userEmpNum = user?.employee_number || '1022';
  const userJob = user?.job_title || 'مدير النظام';

  // Windows 11 Pinned Tiles (Clean, vibrant, high-frequency app tiles)
  const pinnedTiles = [
    { to: '/', label: 'الرئيسية', icon: LayoutDashboard, gradient: 'from-sky-500 to-blue-600', shadow: 'rgba(2, 132, 199, 0.35)' },
    { to: '/employees', label: 'الموظفين', icon: Users, gradient: 'from-emerald-500 to-teal-600', shadow: 'rgba(16, 185, 129, 0.35)' },
    { to: '/contracts', label: 'العقود', icon: FileText, gradient: 'from-teal-500 to-cyan-600', shadow: 'rgba(13, 148, 136, 0.35)' },
    { to: '/attendance', label: 'البصمات', icon: Clock, gradient: 'from-amber-500 to-orange-600', shadow: 'rgba(245, 158, 11, 0.35)' },
    { to: '/devices', label: 'الأجهزة', icon: Fingerprint, gradient: 'from-orange-500 to-rose-600', shadow: 'rgba(249, 115, 22, 0.35)' },
    { to: '/leave', label: 'الإجازات', icon: CalendarDays, gradient: 'from-indigo-500 to-violet-600', shadow: 'rgba(99, 102, 241, 0.35)' },
    { to: '/payroll', label: 'الرواتب', icon: Wallet, gradient: 'from-purple-500 to-indigo-700', shadow: 'rgba(139, 92, 246, 0.35)' },
    { to: '/payroll?tab=advances', label: 'السلف', icon: CreditCard, gradient: 'from-violet-500 to-purple-600', shadow: 'rgba(139, 92, 246, 0.35)' },
    { to: '/reports', label: 'التقارير', icon: FileSpreadsheet, gradient: 'from-teal-500 to-cyan-700', shadow: 'rgba(13, 148, 136, 0.35)' },
    { to: '/announcements', label: 'التعاميم', icon: Megaphone, gradient: 'from-pink-500 to-rose-600', shadow: 'rgba(236, 72, 153, 0.35)' },
    { to: '/branches', label: 'الفروع', icon: GitBranch, gradient: 'from-emerald-600 to-teal-700', shadow: 'rgba(5, 150, 105, 0.35)' },
    { to: '/settings', label: 'الإعدادات', icon: Settings, gradient: 'from-slate-600 to-slate-800', shadow: 'rgba(71, 85, 105, 0.35)' },
  ];

  // Quick Recommended Actions
  const recommendedActions = [
    { to: '/my-requests', label: 'طلباتي والاعتمادات', icon: ClipboardList, color: '#0284c7' },
    { to: '/leave', label: 'تقديم إجازة', icon: CalendarDays, color: '#6366f1' },
    { to: '/payroll', label: 'مسير الرواتب', icon: Wallet, color: '#8b5cf6' },
    { to: '/reports', label: 'كشوفات وطباعة', icon: FileSpreadsheet, color: '#0d9488' },
  ];

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

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end" dir="rtl">
      
      {/* Fluent Acrylic Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* Windows 11 Start Menu Modal Surface */}
      <div 
        className="relative w-full max-w-lg mx-auto h-[90vh] max-h-[750px] flex flex-col z-10 overflow-hidden rounded-t-[32px] border-t border-x border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl shadow-[0_-15px_45px_rgba(0,0,0,0.2)] text-slate-800 dark:text-slate-100 animate-in slide-in-from-bottom duration-300"
      >
        
        {/* Top Handle Bar */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700/80" />
        </div>

        {/* Windows 11 Style Search Bar */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في النظام والمهام..."
              className="w-full h-11 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl pe-10 ps-10 text-xs font-bold text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 shadow-inner transition-all"
            />
            <div className="absolute end-3 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="absolute start-2 w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Start Menu Category Switcher */}
        <div className="px-4 py-1.5 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
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
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">HR Pro</span>
          </div>
        </div>

        {/* Scrollable Center Canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar space-y-4">

          {/* TAB 1: PINNED TILES (WINDOWS 11 STYLE APP GRID) */}
          {activeTab === 'pinned' && !searchQuery && (
            <>
              {/* Pinned App Tiles Grid (4 Columns) */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>البرامج والأقسام</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">12 تطبيق</span>
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
                        className={`group flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 active:scale-95 text-center ${
                          active 
                            ? 'bg-slate-100/90 dark:bg-slate-800/90 ring-2 ring-sky-500 shadow-sm' 
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Windows 11 App Tile Icon */}
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${tile.gradient} shadow-md transition-transform duration-200 group-hover:scale-105`}
                          style={{ boxShadow: `0 8px 18px -4px ${tile.shadow}` }}
                        >
                          <TileIcon className="w-6 h-6 drop-shadow-sm" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1.5 truncate max-w-full">
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
                    الوصول السريع
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">مهام فورية</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {recommendedActions.map((rec) => {
                    const RecIcon = rec.icon;
                    return (
                      <Link
                        key={rec.to}
                        to={rec.to}
                        onClick={onClose}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/60 dark:border-slate-700/60 group"
                      >
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                          style={{ backgroundColor: rec.color }}
                        >
                          <RecIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {rec.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ALL APPS / SEARCH RESULTS (CLEAN DIRECT LIST) */}
          {(activeTab === 'all' || searchQuery) && (
            <div className="space-y-1">
              {filteredAllItems.map((item) => {
                const active = isActive(item.to);
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                        style={{ color: active ? '#FFFFFF' : (item.groupColor || '#0284c7') }}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {item.groupLabel}
                      </span>
                      <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

        </div>

        {/* Windows 11 Style Bottom User Dock Bar */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          
          {/* User Info (Right Side in RTL) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
              {userDisplayName[0] || 'ي'}
            </div>
            <div className="min-w-0">
              <div className="font-heading font-black text-xs text-foreground truncate">
                {userDisplayName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                #{userEmpNum} • {userJob}
              </div>
            </div>
          </div>

          {/* Quick Action Controls (Left Side in RTL) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800"
              title="تبديل المظهر"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title="تسجيل الخروج"
            >
              <Power className="w-4 h-4" />
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}
