import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Clock,
  LogIn,
  ShieldCheck,
  Sparkles,
  Building2,
  Globe
} from "lucide-react";
import { useCompanyProfile } from "@/lib/companyProfile";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { profile: company } = useCompanyProfile();

  const [domain, setDomain] = useState(() => {
    return localStorage.getItem('hr_saas_tenant_domain') || 'dorat-sayarah';
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
    const cleanEmail = (email || "").trim();
    const cleanPass = (password || "").trim();

    if (!cleanDomain) {
      setError("يرجى إدخال نطاق المنشأة (Workspace Domain).");
      setLoading(false);
      return;
    }

    if (!cleanEmail) {
      setError("يرجى إدخال اسم المستخدم أو رقم الهوية.");
      setLoading(false);
      return;
    }

    if (!cleanPass) {
      setError("يرجى إدخال كلمة المرور.");
      setLoading(false);
      return;
    }

    localStorage.setItem('hr_saas_tenant_domain', cleanDomain);

    try {
      const result = await login(cleanEmail, cleanPass);
      if (result && result.error) {
        setError(result.error.message || "بيانات الدخول غير صحيحة، يرجى التحقق والمحاولة مجدداً.");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        navigate(returnTo, { replace: true });
      } else if (result?.employee?.role === 'employee' || result?.role === 'employee') {
        navigate("/portal", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "فشل تسجيل الدخول. يرجى التأكد من البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const companyLogo = company?.logo_url || "/company-logo.png";
  const companyTitle = company?.name || "شركة درة السيارة";

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#EDF4FA] dark:bg-slate-950 font-sans selection:bg-sky-500 selection:text-white relative overflow-hidden"
      dir="ltr"
    >
      {/* Soft Ambient Background Elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-sky-200/50 dark:bg-sky-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-200/40 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card (Identical to Behance / Dribbble design reference) */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-sky-500/10 border border-slate-100 dark:border-slate-800 overflow-hidden relative z-10 flex flex-col md:flex-row items-stretch">
        
        {/* Decorative Floating Circle Overlapping Bottom Corner */}
        <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-sky-200/40 dark:bg-sky-900/30 rounded-full pointer-events-none z-0" />

        {/* ─── LEFT SIDE: ARTISTIC FLAT-VECTOR ILLUSTRATION ───────────────── */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-white via-sky-50/40 to-sky-100/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 min-h-[340px] md:min-h-[460px]">
          
          {/* Organic Vector Waves & Blobs (SVG) */}
          <svg 
            viewBox="0 0 400 450" 
            className="w-full h-full max-w-[340px] max-h-[380px] drop-shadow-sm select-none"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Main Wave Gradient */}
              <linearGradient id="waveGrad" x1="0" y1="0" x2="300" y2="400" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>

              {/* Soft Cloud Gradient */}
              <linearGradient id="cloudGrad" x1="50" y1="50" x2="350" y2="250" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E0F2FE" />
                <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.6" />
              </linearGradient>

              {/* Phone Screen Gradient */}
              <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F0F9FF" />
                <stop offset="100%" stopColor="#E0F2FE" />
              </linearGradient>
            </defs>

            {/* Background Soft Organic Blob */}
            <path 
              d="M60 180 C40 120, 100 80, 180 85 C260 90, 340 110, 350 170 C360 230, 310 270, 260 280 C210 290, 80 240, 60 180 Z" 
              fill="url(#cloudGrad)"
            />

            {/* Left Big Smooth Wave Curve (Signature shape from reference image) */}
            <path 
              d="M0 160 C50 180, 100 240, 95 320 C90 390, 130 430, 160 450 L0 450 Z" 
              fill="url(#waveGrad)"
            />

            {/* Small Floating Pastel Bubbles */}
            <circle cx="50" cy="110" r="14" fill="#BAE6FD" opacity="0.6" />
            <circle cx="340" cy="130" r="18" fill="#BAE6FD" opacity="0.5" />
            <circle cx="360" cy="280" r="10" fill="#93C5FD" opacity="0.4" />
            <circle cx="90" cy="410" r="6" fill="#FFFFFF" opacity="0.7" />

            {/* Botanical Foliage / Stem on the Left */}
            <path 
              d="M130 330 Q120 230, 145 140" 
              stroke="#93C5FD" 
              strokeWidth="3" 
              strokeLinecap="round" 
              fill="none" 
            />
            {/* Leaves along stem */}
            <path d="M128 290 C105 285, 100 270, 108 260 C118 260, 126 275, 128 290 Z" fill="#60A5FA" opacity="0.8" />
            <path d="M132 265 C150 255, 155 240, 146 235 C136 237, 131 250, 132 265 Z" fill="#93C5FD" />
            <path d="M125 235 C102 230, 98 215, 106 205 C116 206, 123 220, 125 235 Z" fill="#60A5FA" opacity="0.8" />
            <path d="M133 210 C152 200, 156 185, 147 180 C138 182, 132 195, 133 210 Z" fill="#93C5FD" />
            <path d="M128 180 C108 175, 105 160, 112 150 C122 152, 127 165, 128 180 Z" fill="#60A5FA" opacity="0.8" />
            <path d="M138 155 C155 145, 158 132, 150 128 C142 130, 137 142, 138 155 Z" fill="#93C5FD" />
            <path d="M145 140 C140 120, 148 110, 153 112 C156 120, 152 132, 145 140 Z" fill="#60A5FA" />

            {/* Smartphone Graphic (Centerpiece) */}
            <g transform="translate(140, 125)">
              {/* Outer Shadow & Chassis */}
              <rect x="0" y="0" width="130" height="230" rx="22" fill="#1E293B" />
              {/* Inner Screen */}
              <rect x="4" y="4" width="122" height="222" rx="18" fill="url(#screenGrad)" />
              {/* Top Speaker Notch */}
              <rect x="45" y="10" width="40" height="4" rx="2" fill="#CBD5E1" />

              {/* Seated Employee / Professional Character Inside Phone */}
              {/* Head & Hair */}
              <circle cx="65" cy="85" r="14" fill="#FCD34D" opacity="0.3" />
              {/* Hair */}
              <path d="M52 82 C52 70, 78 70, 78 82 C74 76, 56 76, 52 82 Z" fill="#C2410C" />
              {/* Face */}
              <ellipse cx="65" cy="84" rx="10" ry="11" fill="#FDBA74" />
              {/* Neck */}
              <rect x="62" y="94" width="6" height="6" fill="#FB923C" />
              
              {/* White Shirt Torso */}
              <path d="M50 100 L80 100 L82 145 L48 145 Z" fill="#FFFFFF" />
              {/* Tie */}
              <path d="M63 100 L67 100 L66 128 L64 128 Z" fill="#DC2626" />
              {/* Suit Collar details */}
              <path d="M50 100 L62 108 L62 100 Z" fill="#E2E8F0" />
              <path d="M80 100 L68 108 L68 100 Z" fill="#E2E8F0" />

              {/* Arms folded / resting */}
              <path d="M50 102 C42 115, 45 138, 56 142 L58 134 C50 130, 48 116, 54 106 Z" fill="#CBD5E1" />
              <path d="M80 102 C88 115, 85 138, 74 142 L72 134 C80 130, 82 116, 76 106 Z" fill="#CBD5E1" />
              
              {/* Trousers (Seated) */}
              <path d="M48 145 L82 145 L86 195 L72 195 L68 160 L62 160 L58 195 L44 195 Z" fill="#334155" />
              {/* Shoes */}
              <ellipse cx="49" cy="198" rx="8" ry="4" fill="#0F172A" />
              <ellipse cx="81" cy="198" rx="8" ry="4" fill="#0F172A" />
            </g>

            {/* Gentle Ground Dots / Leaves */}
            <circle cx="100" cy="370" r="3" fill="#93C5FD" />
            <circle cx="285" cy="385" r="4" fill="#60A5FA" />
            <path d="M295 380 Q305 375, 308 382" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>

        </div>

        {/* ─── RIGHT SIDE: CLEAN MINIMALIST LOGIN FORM ────────────────────── */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative z-10 bg-white dark:bg-slate-900">
          
          <div className="max-w-xs mx-auto w-full space-y-6">

            {/* Circular Avatar / Badge (Just like in the reference) */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-950/60 border-2 border-sky-200 dark:border-sky-800 mx-auto flex items-center justify-center p-2 shadow-sm relative group">
                <img 
                  src={companyLogo} 
                  alt={companyTitle} 
                  className="w-full h-full object-contain drop-shadow-sm rounded-full"
                />
              </div>

              {/* WELCOME Greeting */}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-700 dark:text-slate-100 tracking-wider font-heading uppercase">
                  WELCOME
                </h1>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {companyTitle} • نظام الموارد البشرية
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2 shadow-sm text-right" dir="rtl">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-[11px]">{error}</span>
              </div>
            )}

            {/* Session Timeout */}
            {isTimeout && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-[11px] text-amber-800 dark:text-amber-200 text-center">
                انتهت الجلسة، يرجى تسجيل الدخول مجدداً.
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              
              {/* SaaS Workspace / Domain Input */}
              <div className="space-y-1">
                <div className="relative flex items-center border-b border-slate-250 dark:border-slate-700 focus-within:border-sky-500 transition-colors pb-1">
                  <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Workspace / نطاق المنشأة"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-1.5 font-mono"
                    autoComplete="organization"
                    required
                  />
                  <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200/60 shrink-0 select-none">
                    .saas
                  </span>
                </div>
              </div>

              {/* Username / ID Input */}
              <div className="space-y-1">
                <div className="relative flex items-center border-b border-slate-250 dark:border-slate-700 focus-within:border-sky-500 transition-colors pb-1">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Username / رقم الهوية"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-1.5"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="relative flex items-center border-b border-slate-250 dark:border-slate-700 focus-within:border-sky-500 transition-colors pb-1">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2.5 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password / كلمة المرور"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-1.5 font-mono"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right pt-1">
                  <a 
                    href="mailto:support@greenarrow.sa?subject=استعادة كلمة المرور" 
                    className="text-[10.5px] text-slate-400 hover:text-sky-600 transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>

              {/* Pill Button (LOGIN) */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-[#58A6FF] to-[#3B82F6] hover:from-[#3B82F6] hover:to-[#2563EB] text-white font-bold rounded-full shadow-md shadow-sky-500/20 text-xs tracking-widest uppercase transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <span>LOGIN</span>
                  )}
                </Button>
              </div>

              {/* Discreet Note for Employees */}
              <div className="text-center pt-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500" dir="rtl">
                  💡 للموظفين: يتم الدخول برقم الهوية أو الإقامة مباشرة.
                </p>
              </div>

            </form>

          </div>

        </div>

      </div>

      {/* Subtle Bottom Credit / System Info */}
      <div className="mt-6 text-center text-[10.5px] text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-sky-500/70" />
        <span>بوابة آمنة ومشفرة • درة السيارة للموارد البشرية © {new Date().getFullYear()}</span>
      </div>

    </div>
  );
}
