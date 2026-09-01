import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Wallet, 
  Clock, 
  Mail, 
  Fingerprint, 
  Palmtree, 
  Calendar, 
  CreditCard 
} from 'lucide-react';

export default function QuickActionsGrid({ onAction }) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'add_employee',
      label: 'إضافة موظف',
      icon: UserPlus,
      iconColor: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50',
      border: 'border-sky-200/70 dark:border-sky-900',
      onClick: () => navigate('/employees?action=new')
    },
    {
      id: 'export_payroll',
      label: 'تصدير راتب',
      icon: Wallet,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50',
      border: 'border-cyan-200/70 dark:border-cyan-900',
      onClick: () => navigate('/payroll')
    },
    {
      id: 'add_shift',
      label: 'إضافة فترة عمل',
      icon: Clock,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50',
      border: 'border-blue-200/70 dark:border-blue-900',
      onClick: () => navigate('/shifts')
    },
    {
      id: 'send_mail',
      label: 'إرسال بريد',
      icon: Mail,
      iconColor: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50',
      border: 'border-teal-200/70 dark:border-teal-900',
      onClick: () => navigate('/announcements')
    },
    {
      id: 'punch_correction',
      label: 'طلب تصحيح بصمة',
      icon: Fingerprint,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50',
      border: 'border-indigo-200/70 dark:border-indigo-900',
      onClick: () => navigate('/attendance')
    },
    {
      id: 'submit_leave',
      label: 'تقديم إجازة',
      icon: Palmtree,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
      border: 'border-emerald-200/70 dark:border-emerald-900',
      onClick: () => navigate('/leave')
    },
    {
      id: 'add_event',
      label: 'إضافة حدث',
      icon: Calendar,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50',
      border: 'border-purple-200/70 dark:border-purple-900',
      onClick: () => navigate('/announcements')
    },
    {
      id: 'add_advance',
      label: 'إضافة سلفة',
      icon: CreditCard,
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
      border: 'border-amber-200/70 dark:border-amber-900',
      onClick: () => navigate('/payroll?tab=advances')
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 my-3" dir="rtl">
      {actions.map((act) => (
        <button
          key={act.id}
          type="button"
          onClick={act.onClick}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 bg-white dark:bg-slate-900/90 ${act.border}`}
        >
          <span className="text-xs font-bold text-foreground truncate">{act.label}</span>
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${act.bgColor} shrink-0`}>
            <act.icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
          </div>
        </button>
      ))}
    </div>
  );
}
