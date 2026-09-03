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
  ChevronLeft, 
  UserCheck, 
  Sun, 
  Moon, 
  LogOut,
  Sparkles,
  MapPin,
  ShieldCheck,
  Building2,
  FileSignature,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MobileSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const roleMeta = getRoleMeta(user);
  const { t } = useI18n();
  const { isDark, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const groups = useMemo(() => getNavGroups(user), [user]);

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

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const userDisplayName = user?.full_name || 'محمد سالم صالح أحمد المردم';
  const userEmpNum = user?.employee_number || '1017';
  const userBranch = user?.branch_name || user?.branch || 'فرع كيا (السليم)';
  const userJob = user?.job_title || 'بائع قطع غيار';

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex justify-end" dir="rtl">
      
      {/* Backdrop with blur */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-out Drawer Panel */}
      <div 
        className="relative w-[86%] max-w-sm h-full flex flex-col shadow-2xl z-10 overflow-hidden animate-in slide-in-from-right duration-300 border-s border-emerald-900/40 bg-gradient-to-b from-slate-950 via-[#061c14] to-slate-950 text-slate-100"
      >
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-emerald-800/30 shrink-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={companyProfile.logo_url || "/company-logo.png"} 
              alt="شعار درة السيارة" 
              className="w-10 h-10 object-contain drop-shadow-md shrink-0" 
            />
            <div>
              <h2 className="font-heading font-black text-xs text-white tracking-wide">
                درة السيارة
              </h2>
              <div className="text-[10px] text-emerald-400 font-mono">HR ENTERPRISE PRO</div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* User VIP Profile Card Inside Drawer */}
        <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-slate-900/90 via-emerald-950/40 to-slate-900/90 border border-emerald-700/30 shadow-lg shadow-emerald-950/40 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-base flex items-center justify-center shadow-md shrink-0">
              {userDisplayName[0] || 'م'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-heading font-black text-xs text-white truncate">
                {userDisplayName}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                <span className="font-mono text-emerald-400 font-bold">#{userEmpNum}</span>
                <span>•</span>
                <span className="truncate">{userJob}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
            <div className="flex items-center gap-1 text-slate-300 font-medium truncate">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{userBranch}</span>
            </div>
            <span 
              className="text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center border border-emerald-500/30 bg-emerald-950 text-emerald-300"
            >
              {roleMeta.label || 'موظف'}
            </span>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 no-scrollbar">
          {groups.map((grp, gIdx) => {
            if (!grp.items || grp.items.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1.5">
                <div className="px-2 flex items-center justify-between text-[11px] font-bold text-emerald-400/90 tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{grp.label || grp.group || "القائمة"}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">({grp.items.length})</span>
                </div>

                <div className="space-y-1">
                  {grp.items.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          active
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]'
                            : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-800/80 text-emerald-400'
                          }`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span>{item.label}</span>
                        </div>
                        {active && <ChevronLeft className="w-4 h-4" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-3 border-t border-emerald-900/30 bg-slate-950/90 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 text-xs h-9 rounded-xl gap-1.5"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? 'نهاري' : 'ليلي'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-900/50 text-xs h-9 rounded-xl gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </Button>
          </div>
          
          <div className="text-center text-[10px] text-slate-500 font-mono pt-1">
            Green Arrow HR • V2.4 Enterprise
          </div>
        </div>

      </div>
    </div>
  );
}
