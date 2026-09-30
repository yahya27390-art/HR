import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { MaskedSalary } from '@/lib/FinancialPrivacyContext';
import {
  ChevronRight,
  User,
  Briefcase,
  Users,
  Phone,
  Mail,
  Calendar,
  IdCard,
  Globe,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  Award,
  Wallet,
  Activity,
  BookOpen,
  CreditCard,
  UserCheck,
  CalendarDays
} from 'lucide-react';

export default function MobileEmployeeProfileCard({ 
  employee: propEmployee,
  onBack,
  defaultTab = 'official'
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Resolved employee data (from props or logged in user)
  const employee = useMemo(() => {
    return propEmployee || user || {
      full_name: 'يحيي محمد عبدالغفار باشا',
      employee_number: '1022',
      job_title: 'مدير الموارد البشرية',
      department: 'الموارد البشرية والشؤون الإدارية',
      branch: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي • بريدة',
      phone: '0555139031',
      email: 'yahya9031@gmail.com',
      national_id: '1113348641',
      nationality: 'مصري',
      birth_date: '1992-06-17',
      hire_date: '2016-01-03',
      join_date: '2016-01-03',
      basic_salary: 8500,
      blood_type: 'O+',
      gender: 'ذكر',
      religion: 'الإسلام',
      iban: 'SA44 8000 0123 6080 1000 9999',
      is_insured: true,
      status: 'active'
    };
  }, [propEmployee, user]);

  // Active Tab: 'personal' | 'official' | 'others'
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Avatar URL
  const avatarUrl = useMemo(() => {
    return employee?.avatar_url || 
      (employee?.id ? localStorage.getItem(`hr_employee_photo_${employee.id}`) : null) || 
      (employee?.employee_number ? localStorage.getItem(`hr_employee_photo_${employee.employee_number}`) : null) || 
      null;
  }, [employee]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto select-none font-sans" dir="rtl">
      
      {/* ─── بطاقة الصفحة المتوافقة طبيعياً مع الجوال ─────────────────────── */}
      <div className="bg-[#F8FAFC] dark:bg-slate-950 rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col relative">
        
        {/* ─── 1. الهيدر الكحلي الملكي بانحناء انسيابي ─────────────────────── */}
        <div className="bg-gradient-to-b from-[#101b4d] via-[#15256b] to-[#1c3285] text-white pt-6 pb-20 px-5 relative overflow-hidden">
          
          {/* لمسات إضاءة خلفية ناعمة */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -left-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* شريط العنوان العلوي الأنيق */}
          <div className="relative z-10 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-white font-bold text-xs bg-white/15 hover:bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الملف التعريفي</span>
            </button>

            <span className="text-xs font-mono font-bold bg-white/15 px-3 py-1 rounded-full text-blue-100 backdrop-blur-md shadow-xs">
              #{employee.employee_number || '1022'}
            </span>
          </div>

          {/* التقويس الانسيابي لأسفل الهيدر */}
          <div className="absolute bottom-0 inset-x-0 h-8 bg-[#F8FAFC] dark:bg-slate-950 rounded-t-[2.5rem]" />
        </div>

        {/* ─── 2. بروفايل الموظف المتداخل مع التقويس (Avatar + Name + Actions) ─── */}
        <div className="px-5 -mt-16 relative z-10 space-y-4">
          
          {/* الصورة الدائرية البارزة بإطار أبيض سميك */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-slate-950 shadow-xl overflow-hidden bg-gradient-to-tr from-[#162768] to-[#3b5bfd] flex items-center justify-center text-white font-heading font-black text-2xl sm:text-3xl">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={employee.full_name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{employee.full_name?.slice(0, 2) || 'مو'}</span>
                )}
              </div>
              <div className="absolute bottom-1 end-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 flex items-center justify-center shadow-xs" title="على رأس العمل">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {/* الاسم الكامل */}
            <h2 className="font-heading font-black text-lg text-slate-900 dark:text-white tracking-tight mt-3 text-center">
              {employee.full_name}
            </h2>

            {/* المسمى الوظيفي وكود الموظف */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                {employee.job_title || 'موظف'}
              </span>
              <span className="text-[11px] font-mono font-bold bg-[#edf2fe] dark:bg-indigo-950/70 text-[#3b5bfd] px-2.5 py-0.5 rounded-md">
                {String(employee.employee_number || '1022').padStart(8, '0')}
              </span>
            </div>
          </div>

          {/* أزرار الاتصال والمراسلة المباشرة */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <a
              href={`tel:${employee.phone || '0555139031'}`}
              className="w-11 h-11 rounded-2xl bg-[#edf2fe] hover:bg-[#e0eaff] dark:bg-slate-800 text-[#3b5bfd] flex items-center justify-center shadow-xs transition-transform active:scale-90"
              title="اتصال هاتفي مباشر"
            >
              <Phone className="w-4 h-4" />
            </a>

            <a
              href={`mailto:${employee.email || 'info@doratcars.com'}`}
              className="w-11 h-11 rounded-2xl bg-[#edf2fe] hover:bg-[#e0eaff] dark:bg-slate-800 text-[#3b5bfd] flex items-center justify-center shadow-xs transition-transform active:scale-90"
              title="إرسال بريد إلكتروني"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>

          {/* ─── 3. شريط التبويبات الثلاثي العائم (مطابق لنموذج التصميم الأصلي) ─── */}
          <div className="bg-slate-100/80 dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-1.5">
            
            {/* الشخصية */}
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-[#3b5bfd] text-white shadow-md shadow-blue-500/30 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>الشخصية</span>
            </button>

            {/* الوظيفية */}
            <button
              type="button"
              onClick={() => setActiveTab('official')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'official'
                  ? 'bg-[#3b5bfd] text-white shadow-md shadow-blue-500/30 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>الوظيفية</span>
            </button>

            {/* أخرى */}
            <button
              type="button"
              onClick={() => setActiveTab('others')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'others'
                  ? 'bg-[#3b5bfd] text-white shadow-md shadow-blue-500/30 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>أخرى</span>
            </button>

          </div>

          {/* ─── 4. حاوية البيانات الرئيسية ─────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4 mb-5">
            
            {/* ═══ التبويب 1: البيانات الشخصية ════════════════════════════════ */}
            {activeTab === 'personal' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  البيانات الشخصية
                </h3>

                {/* تاريخ الميلاد */}
                <div className="flex items-center gap-3.5 py-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">تاريخ الميلاد</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.birth_date || '17-06-1992'}
                    </div>
                  </div>
                </div>

                {/* الهوية الوطنية / الإقامة */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <IdCard className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">رقم الهوية الوطنية / الإقامة</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.national_id || '1113348641'}
                    </div>
                  </div>
                </div>

                {/* الجنسية */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الجنسية</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.nationality || 'سعودي'}
                    </div>
                  </div>
                </div>

                {/* البريد الإلكتروني */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">البريد الإلكتروني</div>
                    <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate" dir="ltr">
                      {employee.email || 'employee@doratcars.com'}
                    </div>
                  </div>
                </div>

                {/* رقم الجوال */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">رقم الجوال الشخصي</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5" dir="ltr">
                      {employee.phone || '0555139031'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ التبويب 2: البيانات الوظيفية ════════════════════════════════ */}
            {activeTab === 'official' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  البيانات الوظيفية
                </h3>

                {/* الرقم الوظيفي */}
                <div className="flex items-center gap-3.5 py-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الرقم الوظيفي</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {String(employee.employee_number || '1022').padStart(8, '0')}
                    </div>
                  </div>
                </div>

                {/* تاريخ المباشرة والتعيين */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">تاريخ المباشرة والتعيين</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.hire_date || employee.join_date || '03-01-2016'}
                    </div>
                  </div>
                </div>

                {/* المسمى الوظيفي */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">المسمى الوظيفي</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.job_title || 'مدير الموارد البشرية'}
                    </div>
                  </div>
                </div>

                {/* الإدارة والقسم */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الإدارة والقسم</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.department || 'إدارة العمليات والتشغيل'}
                    </div>
                  </div>
                </div>

                {/* حالة التعيين */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">حالة التعيين</div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <span>على رأس العمل (مثبت دائم)</span>
                      <span>✓</span>
                    </div>
                  </div>
                </div>

                {/* الفرع المعتمد */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الفرع المعتمد</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.branch_name || employee.branch || 'الفرع الرئيسي • بريدة'}
                    </div>
                  </div>
                </div>

                {/* الراتب الأساسي */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الراتب الأساسي المعتمد</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      <MaskedSalary value={employee.basic_salary || 8500} currency="ر.س" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ التبويب 3: بيانات إضافية ═══════════════════════════════════ */}
            {activeTab === 'others' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  البيانات الإضافية والتأمين
                </h3>

                {/* فصيلة الدم */}
                <div className="flex items-center gap-3.5 py-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">فصيلة الدم</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.blood_type || 'O+'}
                    </div>
                  </div>
                </div>

                {/* رقم الاتصال المعتمد للعمل */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">رقم الاتصال المعتمد للعمل</div>
                    <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5" dir="ltr">
                      {employee.phone || '0555139031'}
                    </div>
                  </div>
                </div>

                {/* الديانة */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الديانة</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.religion || 'الإسلام'}
                    </div>
                  </div>
                </div>

                {/* الجنس */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">الجنس</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.gender || 'ذكر'}
                    </div>
                  </div>
                </div>

                {/* التأمين الطبي */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">وثيقة التأمين الطبي</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      شركة التأمين المتحدة • الفئة A (سارية)
                    </div>
                  </div>
                </div>

                {/* الآيبان البنكي */}
                <div className="flex items-center gap-3.5 py-1 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf2fe] dark:bg-indigo-950/50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 font-medium">رقم الحساب البنكي (الآيبان WPS)</div>
                    <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 break-all" dir="ltr">
                      {employee.iban || 'SA44 8000 0123 6080 1000 9999'}
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
