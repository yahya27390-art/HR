import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  KeyRound
} from "lucide-react";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
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

  // Check if redirected due to timeout
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_timeout") {
      setIsTimeout(true);
    }
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
      setError("يرجى إدخال رقم الهوية الوطنية أو الإقامة أو الرقم الوظيفي.");
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-950 font-sans" dir="rtl">
      
      {/* ─── LEFT: FORM PANEL (5 COLS / 6 COLS) ─────────────────────────────── */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white dark:bg-slate-950 z-10">
        
        {/* Top Header Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-black text-sm shadow-md">
              GA
            </div>
            <div>
              <div className="font-heading font-black text-base text-foreground tracking-tight flex items-center gap-1.5">
                <span>Green Arrow</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-normal text-muted-foreground">HR</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Enterprise Cloud Platform
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>بوابة موحدة آمنة</span>
          </div>
        </div>

        {/* Center Main Form */}
        <div className="w-full max-w-md mx-auto my-8 space-y-6">
          
          {/* Title and Welcome */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-foreground tracking-tight">
              تسجيل الدخول
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              أدخل معرّف نطاق المنشأة وبيانات حسابك للوصول إلى النظام.
            </p>
          </div>

          {/* Session Inactivity Timeout Notice */}
          {isTimeout && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-fade-in">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <div className="font-bold">تم إنهاء الجلسة تلقائياً لدواعي الأمان</div>
                <div className="text-[11px] opacity-90">نظراً لعدم وجود نشاط وحفاظاً على سرية البيانات، يرجى تسجيل الدخول مجدداً.</div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Workspace Domain */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>نطاق المنشأة (Company Workspace) *</span>
                <span className="text-[10px] text-muted-foreground font-mono">Workspace ID</span>
              </label>
              <div className="relative">
                <Building2 className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="مثال: doratcars"
                  className="ps-10 h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-foreground focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            </div>

            {/* 2. Username / National ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>رقم الهوية الوطنية / الإقامة / الرقم الوظيفي *</span>
                <span className="text-[10px] text-muted-foreground font-mono">National ID / ID</span>
              </label>
              <div className="relative">
                <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل رقم الهوية أو الرقم الوظيفي"
                  className="ps-10 h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-sm font-mono focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* 3. Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">كلمة المرور *</label>
                <a
                  href="mailto:support@greenarrow.sa?subject=طلب استعادة كلمة المرور"
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  نسيت كلمة المرور؟
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="ps-10 pe-10 h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-sm font-mono focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={rememberWorkspace}
                  onChange={(e) => setRememberWorkspace(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                />
                <span>تذكّر معرّف المنشأة على هذا المتصفح</span>
              </label>
            </div>

            {/* Submit Button (Luxury High-End Bank Style) */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جاري التحقق من الصلاحيات...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>تسجيل الدخول إلى المنظومة</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              )}
            </Button>

          </form>

        </div>

        {/* Minimal Bottom Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encryption • Bank-Grade Security</span>
          </div>
          <div className="font-mono">
            © {new Date().getFullYear()} Green Arrow
          </div>
        </div>

      </div>

      {/* ─── RIGHT: LUXURY BRAND HERO (7 COLS / 6 COLS) ────────────────────── */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#071318] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none"></div>

        {/* Top Brand Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>الجيل الأحدث من أنظمة الموارد البشرية والرواتب</span>
          </div>

          <div className="text-xs text-white/50 font-mono">
            SOC 2 & ISO 27001 Certified
          </div>
        </div>

        {/* Center Hero Glass Card */}
        <div className="relative z-10 max-w-xl space-y-8 my-auto">
          
          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-heading font-black leading-tight text-white tracking-tight">
              الدقة الإدارية والأمان المالي في منصة موحدة متكاملة
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              حلول سحابية متقدمة لإدارة شؤون الموظفين، الحضور والانصراف اللحظي، ومسيرات الرواتب المتوافقة بالكامل مع الأنظمة السعودية.
            </p>
          </div>

          {/* 3 Executive Metric Pillars */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
              <div className="text-emerald-400 font-mono font-black text-lg">99.99%</div>
              <div className="text-[11px] text-white/80 font-bold">جاهزية واستقرار سحابي</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
              <div className="text-emerald-400 font-mono font-black text-lg">100%</div>
              <div className="text-[11px] text-white/80 font-bold">عزل مشفر لقواعد البيانات</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
              <div className="text-emerald-400 font-mono font-black text-lg">GOSI • مدد</div>
              <div className="text-[11px] text-white/80 font-bold">توافق حكومي متكامل</div>
            </div>

          </div>

        </div>

        {/* Bottom Organization Badge */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <div>
            المنصة المعتمدة لمنشأة: <strong className="text-white">شركة درة السيارة لقطع غيار السيارات</strong>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>v2.6 Enterprise</span>
          </div>
        </div>

      </div>

    </div>
  );
}
