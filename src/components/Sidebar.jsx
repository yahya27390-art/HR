import { getCompanyProfile } from '@/lib/companyProfile';
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
  '/settings': 'settings',
  '/users': 'settings',
  '/print-templates': 'settings',
  '/evaluations': 'settings',
};

export default function Sidebar({ isSubMenuOpen, setIsSubMenuOpen }) {
  const { user } = useAuth();
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
  };

  return (
    <div className="hidden lg:flex fixed top-0 bottom-0 right-0 z-40 flex-row" dir="rtl">
      
      {/* ─── RAIL 1: SLIM PRIMARY ICON RAIL (68px) ON FAR RIGHT ─────────── */}
      <aside 
        className="w-[68px] h-full bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 flex flex-col items-center py-3 z-20 shadow-sm shrink-0 select-none"
      >
        {/* Brand Mini Logo */}
        <Link 
          to="/" 
          className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-3 hover:scale-105 transition-transform shrink-0 p-1"
          title="Green Arrow HR - لوحة التحكم"
        >
          <img src={getCompanyProfile().logo_url || "/company-logo.svg"} alt="logo" className="w-8 h-8 object-contain" />
        </Link>

        {/* Primary Module Icons List */}
        <div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto no-scrollbar w-full px-1.5 py-1">
          {visibleModules.map((mod) => {
            const isCurrent = activeModuleId === mod.id;
            const Icon = mod.icon;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleModuleClick(mod.id)}
                className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 shrink-0 ${
                  isCurrent 
                    ? 'shadow-md ring-2 ring-offset-2 ring-offset-background' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-muted-foreground'
                }`}
                style={{
                  backgroundColor: isCurrent ? mod.color : 'transparent',
                  color: isCurrent ? '#FFFFFF' : undefined,
                  boxShadow: isCurrent ? `0 4px 14px ${mod.color}40` : undefined
                }}
                title={mod.label}
              >
                <div 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    !isCurrent ? 'bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                  style={{
                    backgroundColor: !isCurrent ? `${mod.color}15` : 'transparent',
                    color: !isCurrent ? mod.color : '#FFFFFF'
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span 
                  className={`text-[9px] font-bold mt-0.5 leading-tight truncate max-w-[48px] ${
                    isCurrent ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {mod.label}
                </span>

                {/* Rightmost Active Indicator Strip */}
                {isCurrent && (
                  <span 
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-s-full bg-white shadow-sm"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* User Role Mini Indicator */}
        <div className="mt-1 flex flex-col items-center shrink-0">
          <span 
            className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-sm"
            style={{ backgroundColor: roleMeta.color + '22', color: roleMeta.color }}
            title={roleMeta.label}
          >
            {roleMeta.icon}
          </span>
        </div>

        {/* Bottom Collapse Toggle Arrow */}
        <button
          type="button"
          onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-2 shrink-0"
          title={isSubMenuOpen ? 'إخفاء القائمة الفرعية' : 'إظهار القائمة الفرعية'}
        >
          {isSubMenuOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* ─── RAIL 2: SECONDARY SUB-MENU PANEL (200px) TO THE LEFT OF RAIL 1 ── */}
      {isSubMenuOpen && (
        <aside 
          className="w-[200px] h-full bg-slate-50/95 dark:bg-slate-900/95 border-l border-slate-200/80 dark:border-slate-800 flex flex-col py-4 px-3 shadow-lg z-10 animate-in slide-in-from-right duration-200 shrink-0"
        >
          {/* Sub-Menu Header & Search Input */}
          <div className="space-y-3 mb-3 shrink-0">
            <div className="flex items-center gap-2 px-1">
              <div 
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs shrink-0 shadow-sm"
                style={{ backgroundColor: activeModule?.color || '#0284c7' }}
              >
                {activeModule && <activeModule.icon className="w-3.5 h-3.5" />}
              </div>
              <h3 className="font-heading font-black text-xs text-foreground truncate">
                {activeModule?.label || 'الرئيسية'}
              </h3>
            </div>

            {/* Cyan Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في القائمة..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pe-8 ps-2 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <div className="absolute top-1/2 -translate-y-1/2 end-1 w-6 h-6 bg-sky-500 text-white rounded-lg flex items-center justify-center shadow-sm">
                <Search className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Sub-Items Navigation List */}
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar py-1">
            {filteredItems.map((item) => {
              const active = isItemActive(item.to);
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 group ${
                    active
                      ? 'bg-sky-100/90 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 shadow-sm border-r-2 border-sky-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="pt-3 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between px-1 shrink-0">
            <span className="font-mono">Green Arrow HR</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold font-mono">v2.5</span>
          </div>
        </aside>
      )}

    </div>
  );
}
