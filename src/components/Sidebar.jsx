import { useCompanyProfile } from '@/lib/companyProfile';
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { EKTEFA_MODULES, getVisibleModules } from '@/lib/nav';
import { hasPermission, getRoleMeta } from '@/lib/rbac';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  SlidersHorizontal,
  LogOut,
  UserCheck
} from 'lucide-react';

const ROUTE_MODULE_MAP = {
  '/': 'dashboard',
  '/my-requests': 'dashboard',
  '/approvals': 'dashboard',
  '/alerts': 'dashboard',
  '/employee-profile': 'dashboard',
  '/portal': 'dashboard',
  '/documents-print': 'dashboard',
  '/announcements': 'communication',
  '/attendance': 'attendance',
  '/devices': 'attendance',
  '/import-data': 'attendance',
  '/employees': 'employees',
  '/branches': 'employees',
  '/departments': 'employees',
  '/contracts': 'employees',
  '/allowances': 'employees',
  '/shifts': 'employees',
  '/leave': 'services',
  '/leave-policies': 'services',
  '/rewards-penalties': 'services',
  '/payroll': 'payroll',
  '/end-of-service': 'payroll',
  '/reports': 'reports',
  '/evaluations': 'reports',
  '/settings': 'settings'
};

export default function Sidebar({ isSubMenuOpen, setIsSubMenuOpen }) {
  const { user } = useAuth();
  const { profile } = useCompanyProfile();
  const roleMeta = getRoleMeta(user);
  const location = useLocation();
  const navigate = useNavigate();

  const visibleModules = useMemo(() => getVisibleModules(user), [user]);

  // Find active module based on current pathname with deterministic route mapping
  const findModuleForPath = (pathname) => {
    for (const [route, modId] of Object.entries(ROUTE_MODULE_MAP)) {
      if (route === '/' && pathname === '/') return modId;
      if (route !== '/' && (pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route + '?'))) {
        return modId;
      }
    }
    for (const mod of visibleModules) {
      for (const item of mod.items) {
        const itemBase = item.to.split('?')[0];
        if (itemBase === '/' && pathname === '/') return mod.id;
        if (itemBase !== '/' && (pathname === itemBase || pathname.startsWith(itemBase + '/'))) {
          return mod.id;
        }
      }
    }
    return visibleModules[0]?.id || 'dashboard';
  };

  const [activeModuleId, setActiveModuleId] = useState(() => findModuleForPath(location.pathname));
  const [searchQuery, setSearchQuery] = useState('');

  // Sync active module when location (route) changes
  useEffect(() => {
    const modId = findModuleForPath(location.pathname);
    if (modId) setActiveModuleId(modId);
  }, [location.pathname, visibleModules]);

  const activeModule = visibleModules.find(m => m.id === activeModuleId) || visibleModules[0];

  const filteredItems = (activeModule?.items || []).filter(it => {
    const permMatch = !it.permission || hasPermission(user, it.permission);
    const searchMatch = !searchQuery || (it.label || '').toLowerCase().includes(searchQuery.toLowerCase());
    return permMatch && searchMatch;
  });

  const isItemActive = (to) => {
    if (to.includes('?')) {
      return (location.pathname + location.search) === to;
    }
    const basePath = to.split('?')[0];
    if (basePath === '/') return location.pathname === '/' && !location.search;
    return location.pathname === basePath && !location.search;
  };

  const handleModuleClick = (modId) => {
    setActiveModuleId(modId);
    if (!isSubMenuOpen) {
      setIsSubMenuOpen(true);
    }
    setSearchQuery('');

    // Automatically navigate to the first sub-item of the selected module
    const targetMod = visibleModules.find(m => m.id === modId);
    if (targetMod && Array.isArray(targetMod.items) && targetMod.items.length > 0) {
      const accessibleItems = targetMod.items.filter(it => !it.permission || hasPermission(user, it.permission));
      const firstItem = accessibleItems[0] || targetMod.items[0];
      if (firstItem && firstItem.to) {
        navigate(firstItem.to);
      }
    }
  };

  return (
    <div className="hidden lg:flex fixed top-0 bottom-0 right-0 z-40 flex-row" dir="rtl">
      
      {/* ─── RAIL 1: SLIM PRIMARY ICON RAIL (72px) ON FAR RIGHT ─────────── */}
      <aside 
        className="w-[72px] h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center py-3 z-30 shadow-sm shrink-0 select-none"
      >
        {/* Brand Mini Logo */}
        <Link 
          to="/" 
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 hover:scale-105 transition-all duration-300 shrink-0 p-1 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shadow-sm group"
          title="درة السيارة HR - لوحة التحكم"
        >
          <img src={profile.logo_url || "/company-logo.png"} alt="شعار درة السيارة" className="w-10 h-10 object-contain drop-shadow-sm group-hover:rotate-6 transition-transform" />
        </Link>

        {/* Primary Module Icons List */}
        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar w-full px-2 py-1">
          {visibleModules.map((mod) => {
            const isCurrent = activeModuleId === mod.id;
            const Icon = mod.icon;
            const itemCount = (mod.items || []).filter(it => !it.permission || hasPermission(user, it.permission)).length;

            return (
              <div key={mod.id} className="relative group/item flex items-center justify-center w-full">
                <button
                  type="button"
                  onClick={() => handleModuleClick(mod.id)}
                  className={`relative flex flex-col items-center justify-center w-[54px] h-[54px] rounded-2xl transition-all duration-300 shrink-0 ${
                    isCurrent 
                      ? 'shadow-lg scale-[1.03] ring-2 ring-offset-2 ring-offset-background' 
                      : 'hover:bg-slate-100/90 dark:hover:bg-slate-900/90 hover:scale-105 text-slate-600 dark:text-slate-400'
                  }`}
                  style={{
                    backgroundImage: isCurrent ? undefined : undefined,
                    backgroundColor: isCurrent ? mod.color : undefined,
                    color: isCurrent ? '#FFFFFF' : undefined,
                    boxShadow: isCurrent ? `0 8px 24px -4px ${mod.glowColor || mod.color + '50'}` : undefined
                  }}
                  aria-label={mod.label}
                >
                  {/* Icon Container with Glassmorphism */}
                  <div 
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-white/25 backdrop-blur-md shadow-inner text-white' 
                        : 'bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 group-hover/item:text-white'
                    }`}
                    style={{
                      backgroundColor: !isCurrent ? `${mod.color}15` : undefined,
                      color: !isCurrent ? mod.color : undefined
                    }}
                  >
                    <Icon className="w-4 h-4 transition-transform group-hover/item:scale-110" />
                  </div>

                  {/* Label under icon */}
                  <span 
                    className={`text-[9px] font-black mt-1 leading-none tracking-tight truncate max-w-[48px] ${
                      isCurrent ? 'text-white drop-shadow-sm' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {mod.label}
                  </span>

                  {/* Rightmost Glowing Active Indicator Strip */}
                  {isCurrent && (
                    <span 
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-s-full bg-white dark:bg-emerald-400 shadow-md shadow-white/40"
                    />
                  )}
                </button>

                {/* Floating Modern Glass Tooltip on Hover */}
                <div 
                  className="absolute right-[68px] top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-0 translate-x-2 transition-all duration-200 z-50 whitespace-nowrap shadow-xl"
                >
                  <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white border border-slate-700/60 rounded-xl px-3 py-2 backdrop-blur-md shadow-2xl flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }}></span>
                      <span className="font-heading font-black text-xs text-white">{mod.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-white/10 text-slate-300">
                        {itemCount}
                      </span>
                    </div>
                    {mod.sublabel && (
                      <span className="text-[10px] text-slate-400 font-medium pe-2">{mod.sublabel}</span>
                    )}
                  </div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-slate-900/95 border-t border-r border-slate-700/60 rotate-45"></div>
                </div>

              </div>
            );
          })}
        </div>

        {/* User Role Mini Indicator */}
        <div className="mt-1 flex flex-col items-center shrink-0">
          <span 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs shadow-sm border border-slate-200/60 dark:border-slate-800 transition-transform hover:scale-105"
            style={{ backgroundColor: roleMeta.color + '18', color: roleMeta.color }}
            title={roleMeta.label}
          >
            {roleMeta.icon}
          </span>
        </div>

        {/* Bottom Collapse Toggle Arrow */}
        <button
          type="button"
          onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 mt-2 shrink-0 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700"
          title={isSubMenuOpen ? 'إخفاء القائمة الفرعية' : 'إظهار القائمة الفرعية'}
        >
          {isSubMenuOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* ─── RAIL 2: SECONDARY SUB-MENU PANEL (215px) TO THE LEFT OF RAIL 1 ── */}
      {isSubMenuOpen && (
        <aside 
          className="w-[215px] h-full bg-slate-50/98 dark:bg-slate-900/98 backdrop-blur-xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col py-4 px-3 shadow-xl z-20 animate-in slide-in-from-right duration-200 shrink-0"
        >
          {/* Sub-Menu Header & Search Input */}
          <div className="space-y-3 mb-3 shrink-0">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs shrink-0 shadow-md transition-transform"
                  style={{ backgroundColor: activeModule?.color || '#0284c7' }}
                >
                  {activeModule && <activeModule.icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-black text-xs text-foreground truncate">
                    {activeModule?.label || 'الرئيسية'}
                  </h3>
                  {activeModule?.sublabel && (
                    <p className="text-[10px] text-muted-foreground truncate">{activeModule.sublabel}</p>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {filteredItems.length}
              </span>
            </div>

            {/* Cyan Search Input with Glass Styling */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في القائمة..."
                className="w-full bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl py-1.5 pe-8 ps-2 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm transition-all"
              />
              <div className="absolute top-1/2 -translate-y-1/2 end-1 w-6 h-6 bg-sky-500 text-white rounded-lg flex items-center justify-center shadow-sm pointer-events-none">
                <Search className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Sub-Items Navigation List */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar py-1">
            {filteredItems.map((item) => {
              const active = isItemActive(item.to);
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group border ${
                    active
                      ? 'bg-white dark:bg-slate-800/90 text-sky-900 dark:text-sky-200 shadow-sm border-sky-400/40 dark:border-sky-500/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:text-foreground border-transparent'
                  }`}
                  style={{
                    borderRightWidth: active ? '3px' : '1px',
                    borderRightColor: active ? (activeModule?.color || '#0284c7') : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        active 
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                      }`}
                    >
                      <ItemIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="pt-3 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between px-1 shrink-0">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Green Arrow HR</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 font-bold font-mono text-[9px]">v2.6 Pro</span>
          </div>
        </aside>
      )}

    </div>
  );
}
