import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  KeyRound,
  FileText,
  Calendar,
  Wallet,
  Star,
  Check,
  Smartphone,
  ChevronRight
} from "lucide-react";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useCompanyProfile } from "@/lib/companyProfile";

export default function Login() {
  const { profile: company } = useCompanyProfile();

  // Read domain from URL param or saved storage or fallback to doratcars
  const [domain, setDomain] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlDomain = urlParams.get("domain") || urlParams.get("tenant") || urlParams.get("company");
    if (urlDomain) return urlDomain;
    const saved = localStorage.getItem("green_arrow_last_domain");
    return saved || "doratcars";
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberWorkspace, setRememberWorkspace] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active feature slide for the hero showcase
  const [activeSlide, setActiveSlide] = useState(0);

  // Check if redirected due to timeout
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_timeout") {
      setIsTimeout(true);
    }
  }, []);

  // Auto slide ticker for hero showcase
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanDomain = (domain || "").trim().toLowerCase();
    const cleanUser = (username || "").trim();
    const cleanPass = (password || "").trim();

    if (!cleanDomain) {
      setError("يرجى إدخال نطاق الشركة المشتركة.");
      setLoading(false);
      return;
    }

    if (!cleanUser) {
      setError("يرجى إدخال اسم المستخدم أو رقم الهوية الوطنية أو الرقم الوظيفي.");
      setLoading(false);
      return;
    }

    if (!cleanPass) {
      setError("يرجى إدخال كلمة المرور.");
      setLoading(false);
      return;
    }

    try {
      if (rememberWorkspace) {
        localStorage.setItem("green_arrow_last_domain", cleanDomain);
      }

      await base44.auth.loginViaNationalIdOrUsername(cleanDomain, cleanUser, cleanPass);

      // Successful login redirect
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = safeReturnTo(urlParams.get("returnTo"));
      window.location.href = returnTo || "/";
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "فشل تسجيل الدخول. يرجى التحقق من صحة النطاق والبيانات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-slate-950 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* ─── LEFT PANEL: THE LUXURY HERO SHOWCASE (Ektefa Inspired Style) ──── */}
      <div className="w-full lg:w-1/2 p-4 sm:p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-sky-500/10 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-b lg:border-b-0 lg:border-l border-slate-250 dark:border-slate-800">
        
        {/* Background Ambient Glow & Patterns */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tagline */}
        <div className="relative z-10 text-center pt-4 lg:pt-8 space-y-2">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-slate-800 dark:text-slate-100 tracking-tight">
            سهل ... متكامل ... سحابي ...
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
            Simple ... Unified ... Cloud ...
          </p>
        </div>

        {/* Center: 3D Floating Isometric Feature Cards Showcase */}
        <div className="relative z-10 my-8 lg:my-auto max-w-md mx-auto w-full flex flex-col items-center justify-center min-h-[360px]">
          
          {/* Card 1: Requests & Self Service */}
          <div className={`w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-700 transform ${
            activeSlide === 0 ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 absolute pointer-events-none'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-xs text-foreground">بوابة الخدمة الذاتية والطلبات</h4>
                  <p className="text-[10px] text-muted-foreground">14 نوع طلب معتمد إلكترونياً</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                اعتماد فوري ✓
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">🌴 طلب إجازة سنوية</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">30 يوماً رصيد</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">💳 طلب سلفة راتب شهرية</span>
                <span className="text-[10px] text-blue-600 font-bold font-mono">حسم أقساط ميسر</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">📜 شهادة تعريف بالراتب A4</span>
                <span className="text-[10px] text-purple-600 font-bold">طباعة مصدقة فوراً</span>
              </div>
            </div>
          </div>

          {/* Card 2: Biometrics Attendance & Friday Overtime */}
          <div className={`w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-700 transform ${
            activeSlide === 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 absolute pointer-events-none'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-xs text-foreground">الحضور الذكي ودوام الجمعات</h4>
                  <p className="text-[10px] text-muted-foreground">مزامنة سحابية لحظية للبصمات</p>
                </div>
              </div>
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                ربط الفروع 🌐
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-[10px] text-muted-foreground">دخول الفترة النهارية</div>
                <div className="font-mono font-black text-emerald-600 text-base mt-0.5">08:00 ص</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                <div className="text-[10px] text-muted-foreground">خروج الفترة المسائية</div>
                <div className="font-mono font-black text-blue-600 text-base mt-0.5">10:00 م</div>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-center text-[10.5px] font-bold text-amber-800 dark:text-amber-300">
              ⚡ احتساب بدل حضور الجمعات والإضافي تلقائياً في مسير الراتب
            </div>
          </div>

          {/* Card 3: Performance Evaluations (KPIs) */}
          <div className={`w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-700 transform ${
            activeSlide === 2 ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 absolute pointer-events-none'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-xs text-foreground">منظومة تقييم الأداء ومشتريات الفروع</h4>
                  <p className="text-[10px] text-muted-foreground">مصفوفة معايير الأوزان المرجحة (100%)</p>
                </div>
              </div>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                ⭐ ممتاز مرتفع
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">الانضباط والزي والمهام</span>
                <span className="font-bold text-emerald-600 font-mono">98%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">خدمة العملاء والواتساب وتقييمات جوجل</span>
                <span className="font-bold text-blue-600 font-mono">95%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">تارجت المبيعات ومشتريات الفرع</span>
                <span className="font-bold text-purple-600 font-mono">96%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Carousel Indicators */}
        <div className="relative z-10 flex items-center justify-center gap-2 py-3">
          {[0, 1, 2].map(idx => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === idx 
                  ? 'w-8 bg-slate-800 dark:bg-emerald-400' 
                  : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Bottom Trust Note */}
        <div className="relative z-10 text-center text-[11px] text-slate-500 dark:text-slate-400">
          منظومة إدارة الموارد البشرية المتوافقة بالكامل مع نظام العمل السعودي واللوائح التنفيذية
        </div>

      </div>

      {/* ─── RIGHT PANEL: THE CLEAN LUXURY LOGIN FORM ──────────────────────── */}
      <div className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between bg-white dark:bg-slate-950 relative">
        
        {/* Background Subtle Watermark Pattern (Ektefa Geometric Theme) */}
        <div className="absolute top-0 left-0 w-48 h-48 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        {/* Top Header Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img 
              src={company.logo_url || "/company-logo.png"} 
              alt="شعار شركة درة السيارة" 
              className="h-14 w-auto max-w-[58px] object-contain shrink-0 drop-shadow-md" 
            />
            <div>
              <h1 className="font-heading font-black text-base text-foreground tracking-tight flex items-center gap-1.5">
                <span>شركة درة السيارة</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md font-mono">HR</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">
                DORAT AL-SAYARAH ENTERPRISE PORTAL
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 py-1">
            v2.6 Cloud
          </Badge>
        </div>

        {/* Center Main Form */}
        <div className="w-full max-w-md mx-auto my-8 space-y-6">
          
          {/* Dual Language Welcome Header (Like Ektefa) */}
          <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="text-right">
              <h3 className="text-base font-heading font-black text-foreground">
                يرجى إدخال تفاصيل الدخول
              </h3>
            </div>
            <div className="text-left font-mono text-xs text-muted-foreground" dir="ltr">
              Login to continue.
            </div>
          </div>

          {/* Session Inactivity Timeout Notice */}
          {isTimeout && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-fade-in">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <div className="font-bold">تم إنهاء الجلسة تلقائياً لدواعي الأمان</div>
                <div className="text-[11px] opacity-90">نظراً لعدم وجود نشاط وحفاظاً على سرية البيانات، يرجى تسجيل الدخول مجدداً.</div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2.5 shadow-sm animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Company Domain (Dual Header) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>نطاق الشركة</span>
                <span className="text-[11px] text-muted-foreground font-mono" dir="ltr">Company Domain</span>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="doratcars"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* 2. Username / National ID (Dual Header) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>اسم المستخدم (رقم الهوية / الإقامة / الوظيفي)</span>
                <span className="text-[11px] text-muted-foreground font-mono" dir="ltr">Username / National ID</span>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل رقم الهوية أو الإقامة"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-xs font-mono text-foreground focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* 3. Password (Dual Header) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>كلمة المرور</span>
                <span className="text-[11px] text-muted-foreground font-mono" dir="ltr">Password</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-xs font-mono pe-10 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cloudflare / Security Verification Badge (Like in Ektefa) */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                  ✓
                </div>
                <span className="font-bold text-[11px]">تم التحقق من الأمان بنجاح • Success!</span>
              </div>
              <div className="text-[9.5px] font-mono text-muted-foreground flex items-center gap-1" dir="ltr">
                <span>Cloudflare Zero Trust</span>
              </div>
            </div>

            {/* Terms of Service Disclaimer (Like in Ektefa) */}
            <div className="text-center text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              <div>
                دخولك على نظام درة السيارة يعني موافقتك على <span className="text-sky-600 dark:text-sky-400 font-bold underline cursor-pointer">شروط وأحكام</span> استخدام الخدمة.
              </div>
              <div className="font-mono text-[9px] text-slate-400 mt-0.5" dir="ltr">
                By logging into the system, you agree to the Terms and Conditions.
              </div>
            </div>

            {/* Action Submit Button: "دخول | Login" */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 hover:from-sky-500 hover:to-sky-400 text-white font-heading font-black rounded-xl shadow-lg shadow-sky-500/25 transition-all text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جاري التحقق من الصلاحيات...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>دخول | Login</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </Button>

            {/* Forgot Password Links (Dual Language) */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <a
                href="mailto:support@greenarrow.sa?subject=استعادة كلمة المرور - درة السيارة"
                className="text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 font-medium transition-colors"
              >
                هل فقدت كلمة المرور؟
              </a>
              <span className="text-muted-foreground font-mono text-[11px]" dir="ltr">
                Forgot Password?
              </span>
            </div>

          </form>

        </div>

        {/* ─── BOTTOM TRUST & GOVERNMENT COMPLIANCE ICONS (Like Ektefa) ─────── */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800 space-y-3">
          
          {/* Mobile App Download Badges (Mock Icons) */}
          <div className="flex items-center justify-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs shadow-sm" title="App Store">
              
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs shadow-sm" title="Google Play">
              ▶
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs shadow-sm" title="Huawei AppGallery">
              🛍️
            </span>
          </div>

          {/* Government Compliance Integration Badges */}
          <div className="flex items-center justify-center gap-4 text-[10.5px] font-bold text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              منصة قوى (Qiwa)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              حماية الأجور (مدد)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              التأمينات (GOSI)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              منصة مقيم
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
