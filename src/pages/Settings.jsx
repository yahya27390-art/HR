import { getCompanyProfile, saveCompanyProfile, DEFAULT_COMPANY_PROFILE } from '@/lib/companyProfile';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { 
  Building2, 
  UploadCloud, 
  Image as ImageIcon, 
  Save, 
  ShieldCheck, 
  Palette, 
  Sun, 
  Moon, 
  Globe,
  Sparkles,
  Check,
  RotateCcw,
  DollarSign,
  Wallet,
  Sliders
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const { toast } = useToast();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();

  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Green Arrow HR',
      legal_name: 'شركة درة السيارة لقطع غيار السيارات',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966 54 169 7999',
      address: 'المملكة العربية السعودية',
      logo_url: '/green-arrow-logo.png'
    };
  });

  // Payroll Settings State
  const [payrollSettings, setPayrollSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_payroll_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fridayDailyRate: parsed.fridayDailyRate || parsed.friday_daily_rate || 50,
          overtimeDailyRate: parsed.overtimeDailyRate || parsed.overtime_daily_rate || 100,
          daysPerMonth: parsed.daysPerMonth || parsed.days_per_month || 30,
        };
      }
    } catch {}
    return {
      fridayDailyRate: 50,
      overtimeDailyRate: 100,
      daysPerMonth: 30
    };
  });

  const handleSavePayrollSettings = (e) => {
    e?.preventDefault?.();
    const toSave = {
      fridayDailyRate: Number(payrollSettings.fridayDailyRate) || 50,
      friday_daily_rate: Number(payrollSettings.fridayDailyRate) || 50,
      overtimeDailyRate: Number(payrollSettings.overtimeDailyRate) || 100,
      overtime_daily_rate: Number(payrollSettings.overtimeDailyRate) || 100,
      daysPerMonth: Number(payrollSettings.daysPerMonth) || 30,
      days_per_month: Number(payrollSettings.daysPerMonth) || 30,
    };
    localStorage.setItem('hr_flow_payroll_settings', JSON.stringify(toSave));
    toast({ title: '✓ تم حفظ إعدادات الرواتب بنجاح' });
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    saveCompanyProfile(companyProfile);
    toast({
      title: 'تم حفظ بيانات المنشأة والشعار بنجاح ✅',
      description: 'تم تحديث الشعار والاسم التجاري ومزامنتها لجميع مستخدمي النظام.'
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'حجم الصورة كبير جداً',
        description: 'يرجى اختيار صورة بحجم أقل من 2 ميغابايت',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (typeof base64 === 'string') {
        const updated = { ...companyProfile, logo_url: base64 };
        setCompanyProfile(updated);
        localStorage.setItem('hr_flow_company_profile', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        toast({
          title: 'تم تحديث الشعار بنجاح ✨',
          description: 'تم تطبيق الشعار الجديد ذو الخلفية الشفافة الفاخرة.'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    const updated = { ...companyProfile, logo_url: '/company-logo.svg' };
    setCompanyProfile(updated);
    saveCompanyProfile(updated);
    toast({ title: 'تمت استعادة الشعار الافتراضي للمنشأة' });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-black tracking-tight text-foreground flex items-center gap-2.5">
          <Sliders className="w-7 h-7 text-primary" />
          إعدادات النظام والمنشأة
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
          تخصيص هوية المنشأة، الشعار، ألوان الثيم، ومعادلات احتساب الرواتب والبدلات
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border flex flex-wrap gap-1">
          <TabsTrigger value="company" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Building2 className="w-4 h-4 text-primary" />
            هوية المنشأة والشعار
          </TabsTrigger>

          <TabsTrigger value="payroll" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            إعدادات الرواتب والبدلات
          </TabsTrigger>

          <TabsTrigger value="appearance" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Palette className="w-4 h-4 text-purple-600" />
            المظهر والألوان
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: COMPANY PROFILE ──────────────────────────────────────── */}
        <TabsContent value="company">
          <Card className="rounded-3xl border-border/60 shadow-sm bg-card p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Logo Section */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row items-center gap-6 shadow-md">
                
                {/* Logo Box Preview */}
                <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center p-3 shadow-xl border-2 border-white/80 flex-shrink-0">
                  {companyProfile.logo_url ? (
                    <img 
                      src={companyProfile.logo_url} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain filter drop-shadow-sm" 
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-slate-400" />
                  )}
                </div>

                {/* Upload & Actions */}
                <div className="space-y-2.5 text-center sm:text-right flex-1">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300">
                      ✨ تصميم الشعار الفاخر
                    </span>
                    <h4 className="font-heading font-bold text-base mt-1 text-white">
                      معاينة الشعار كما يظهر في القائمة والشاشات والتقارير
                    </h4>
                    <p className="text-xs text-slate-300">
                      يتم عرض الشعار في شاشات النظام، قسائم الرواتب، وسندات السلف الرسمية A4.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-100 transition-all">
                      <UploadCloud className="w-4 h-4 text-primary" />
                      <span>رفع شعار جديد (PNG/SVG)</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>

                    {companyProfile.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="rounded-xl text-xs font-bold border-white/30 text-white hover:bg-white/10 gap-1.5 h-9"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة الافتراضي</span>
                      </Button>
                    )}
                  </div>
                </div>

              </div>

              {/* Company Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">اسم المنشأة في النظام (Display Name) *</Label>
                  <Input 
                    value={companyProfile.name} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="font-bold rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">الاسم التجاري الرسمي (Legal Company Name)</Label>
                  <Input 
                    value={companyProfile.legal_name} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, legal_name: e.target.value }))}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">رقم السجل التجاري (CR Number)</Label>
                  <Input 
                    value={companyProfile.cr_number} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, cr_number: e.target.value }))}
                    className="font-mono rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">الرقم الضريبي (VAT Number)</Label>
                  <Input 
                    value={companyProfile.tax_number} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, tax_number: e.target.value }))}
                    className="font-mono rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">رقم الهاتف والتواصل</Label>
                  <Input 
                    value={companyProfile.phone} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="font-mono rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">العنوان والمقر</Label>
                  <Input 
                    value={companyProfile.address} 
                    onChange={(e) => setCompanyProfile(prev => ({ ...prev, address: e.target.value }))}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border/40">
                <Button type="submit" className="bg-primary text-primary-foreground font-bold px-6 rounded-xl shadow-md gap-2 text-xs">
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات المنشأة</span>
                </Button>
              </div>

            </form>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: PAYROLL SETTINGS ─────────────────────────────────────── */}
        <TabsContent value="payroll">
          <Card className="rounded-3xl border-border/60 shadow-sm bg-card overflow-hidden">
            <div className="p-5 border-b border-border/40 bg-emerald-500/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-foreground text-base">إعدادات الرواتب والبدلات</h2>
                <p className="text-xs text-muted-foreground mt-0.5">التحكم في مبالغ بدل الجمعة، الإضافي، وأيام احتساب الشهر</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                
                <div className="space-y-2">
                  <Label className="font-bold text-xs">بدل يوم الجمعة (ريال / يوم):</Label>
                  <Input
                    type="number"
                    value={payrollSettings.fridayDailyRate}
                    onChange={e => setPayrollSettings(p => ({ ...p, fridayDailyRate: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-mono font-bold text-sm"
                    min="0" step="10"
                  />
                  <p className="text-[11px] text-muted-foreground">المبلغ الإضافي لكل يوم جمعة حضره الموظف (بصمة فعلية)</p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs">إضافي شفت 9 ساعات (ريال / يوم):</Label>
                  <Input
                    type="number"
                    value={payrollSettings.overtimeDailyRate}
                    onChange={e => setPayrollSettings(p => ({ ...p, overtimeDailyRate: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-mono font-bold text-sm"
                    min="0" step="10"
                  />
                  <p className="text-[11px] text-muted-foreground">المبلغ المستحق لكل يوم عمل في شفت 9 ساعات</p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs">عدد أيام الشهر للاحتساب:</Label>
                  <Input
                    type="number"
                    value={payrollSettings.daysPerMonth}
                    onChange={e => setPayrollSettings(p => ({ ...p, daysPerMonth: Number(e.target.value) }))}
                    className="rounded-xl h-10 font-mono font-bold text-sm"
                    min="26" max="31" step="1"
                  />
                  <p className="text-[11px] text-muted-foreground">معادلة الساعة = (الراتب ÷ الأيام ÷ ساعات الشفت)</p>
                </div>

              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold space-y-1">
                <p>معادلة قيمة الساعة: الراتب الأساسي ÷ {payrollSettings.daysPerMonth} يوم ÷ ساعات الشفت</p>
                <p>مثال راتب 1,500 ريال وشفت 5 ساعات: 1,500 ÷ {payrollSettings.daysPerMonth} ÷ 5 = {(1500 / (payrollSettings.daysPerMonth || 30) / 5).toFixed(2)} ريال/ساعة</p>
              </div>

              <Button 
                onClick={handleSavePayrollSettings}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-6 h-10 shadow gap-2 text-xs"
              >
                <Save className="w-4 h-4" /> حفظ إعدادات الرواتب
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: THEMES & APPEARANCE ──────────────────────────────────── */}
        <TabsContent value="appearance">
          <Card className="rounded-3xl border-border/60 shadow-sm bg-card p-6 space-y-6">
            <div>
              <h2 className="font-heading font-extrabold text-foreground text-base">المظهر والثيم العام</h2>
              <p className="text-xs text-muted-foreground mt-0.5">تغيير الألوان والوضع الليلي/النهاري</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900">
              <div>
                <div className="font-bold text-xs">الوضع الليلي (Dark Mode)</div>
                <div className="text-[11px] text-muted-foreground">التبديل بين المظهر الفاتح والداكن المريح للعين</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
                className="rounded-xl font-bold text-xs gap-2"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span>{isDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
              </Button>
            </div>

            {/* Themes Palette Grid */}
            <div className="space-y-3">
              <Label className="font-bold text-xs">اختر لوحة الألوان الرئيسية (Color Palette):</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themes && Object.entries(themes).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between ${
                      currentTheme === key
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
                        : 'border-border/60 hover:border-border hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: t.previewColor || '#10b981' }} />
                      <span className="text-xs font-bold text-foreground">{t.name}</span>
                    </div>
                    {currentTheme === key && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
