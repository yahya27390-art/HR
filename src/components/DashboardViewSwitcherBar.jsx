import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  ShieldCheck, 
  Crown, 
  Wallet, 
  ClipboardList, 
  UserCheck
} from 'lucide-react';

/**
 * Check if the user has a specialized administrative role
 */
export function isSpecializedRole(role) {
  return ['owner', 'system_admin', 'admin', 'accountant', 'hr', 'manager', 'general_manager'].includes(role);
}

/**
 * Get role display metadata
 */
export function getSpecializedRoleInfo(role) {
  switch (role) {
    case 'owner':
    case 'general_manager':
      return {
        title: 'لوحة تحكم المدير العام (صاحب العمل)',
        shortTitle: 'لوحة المدير العام',
        badge: 'المدير العام 👑',
        icon: Crown,
        color: 'emerald',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        activeBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 shadow-md',
        accentText: 'text-emerald-400'
      };
    case 'accountant':
      return {
        title: 'لوحة تحكم مدير الحسابات والمالية',
        shortTitle: 'لوحة المحاسب والمالية',
        badge: 'المحاسب والمالية 💼',
        icon: Wallet,
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        activeBtn: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30 shadow-md',
        accentText: 'text-sky-400'
      };
    case 'hr':
      return {
        title: 'لوحة تحكم مدير الموارد البشرية',
        shortTitle: 'لوحة الموارد البشرية',
        badge: 'الموارد البشرية 📋',
        icon: ClipboardList,
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        activeBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 shadow-md',
        accentText: 'text-amber-400'
      };
    case 'system_admin':
    case 'admin':
    default:
      return {
        title: 'لوحة تحكم مدير النظام (Super Admin)',
        shortTitle: 'لوحة مدير النظام',
        badge: 'مدير النظام 🛡️',
        icon: ShieldCheck,
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        activeBtn: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 shadow-md',
        accentText: 'text-purple-400'
      };
  }
}

export default function DashboardViewSwitcherBar({ viewMode, onToggleMode }) {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  // Only specialized roles can see and use the switcher
  if (!isSpecializedRole(role)) {
    return null;
  }

  const roleInfo = getSpecializedRoleInfo(role);
  const RoleIcon = roleInfo.icon;

  const isEmployeeView = viewMode === 'employee';

  return (
    <div className="w-full transition-all duration-300 mb-2" dir="rtl">
      <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all duration-300 shadow-md ${
        isEmployeeView 
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-emerald-500/40' 
          : 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Current State Info */}
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${
              isEmployeeView
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-white border border-slate-700'
            }`}>
              {isEmployeeView ? <UserCheck className="w-6 h-6" /> : <RoleIcon className="w-6 h-6" />}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-black text-sm text-white">
                  {isEmployeeView ? '👤 لوحة الموظف (الخدمة الذاتية والشخصية)' : roleInfo.title}
                </span>
                <Badge className={roleInfo.badgeBg}>
                  {roleInfo.badge}
                </Badge>
                {isEmployeeView && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                    الوضع الشخصي نشط ✓
                  </Badge>
                )}
              </div>
              <p className="text-[11.5px] text-slate-300 font-medium">
                {isEmployeeView 
                  ? 'أنت تشاهد الآن بياناتك الوظيفية والشخصية كموظف (الحضور، الإجازات، مسير الراتب، والعقد).' 
                  : 'أنت في وضع الإدارة المتخصصة والمراقبة والاعتمادات الرسمية.'
                }
              </p>
            </div>
          </div>

          {/* Toggle Switch Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            
            {/* 1. Specialized Dashboard Button */}
            <Button
              type="button"
              size="sm"
              onClick={() => onToggleMode('specialized')}
              className={`rounded-xl text-xs font-bold h-9 px-3.5 transition-all flex items-center gap-1.5 ${
                !isEmployeeView
                  ? roleInfo.activeBtn
                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <RoleIcon className="w-4 h-4" />
              <span>{roleInfo.shortTitle}</span>
            </Button>

            {/* 2. Employee Dashboard Button */}
            <Button
              type="button"
              size="sm"
              onClick={() => onToggleMode('employee')}
              className={`rounded-xl text-xs font-bold h-9 px-3.5 transition-all flex items-center gap-1.5 ${
                isEmployeeView
                  ? 'bg-emerald-600 text-white shadow-emerald-600/40 shadow-md'
                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>لوحة الموظف (الخدمة الذاتية)</span>
            </Button>

          </div>

        </div>
      </div>
    </div>
  );
}
