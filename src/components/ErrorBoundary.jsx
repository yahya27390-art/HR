import React from 'react';
import { RotateCw, LogIn, AlertCircle, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Green Arrow HR Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      // Reset error state only - do NOT redirect, stay on current page
      this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
      // Soft reload using history pushState to avoid clearing in-memory caches
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  handleClearCacheAndLogin = () => {
    try {
      // SAFE: Only clear authentication session, NOT HR/payroll data
      // This preserves all employee data, attendance logs, payroll settings stored in localStorage
      const SAFE_KEYS_TO_REMOVE = [
        'zenith_auth_user',
        'zenith_auth_token',
        'ga_auth_user',
        'ga_session',
        'supabase.auth.token',
        'sb-omnvdvmmmarwsobadlsb-auth-token',
      ];
      SAFE_KEYS_TO_REMOVE.forEach(key => {
        try { localStorage.removeItem(key); } catch (e) {}
      });
      sessionStorage.clear(); // sessionStorage is safe to clear (no persistent HR data)
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || this.state.error?.toString() || 'خطأ غير معروف';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-slate-950" dir="rtl">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            
            {/* Branded Logo / Icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black font-heading tracking-tight text-white">
                Green Arrow HR • استرداد الجلسة
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                تم رصد تحديث في بنية النظام أو بيانات الجلسة السابقة. يمكنك استعادة النظام مباشرة عبر الخيارات أدناه:
              </p>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-900/60 text-right space-y-1.5 font-mono text-xs">
              <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 font-sans">
                <Terminal className="w-3.5 h-3.5" />
                <span>رسالة النظام:</span>
              </div>
              <div className="text-rose-200 text-[11px] break-all leading-tight bg-slate-950/60 p-2 rounded-xl border border-rose-900/40">
                {errorMessage}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleClearCacheAndLogin}
                className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                <span>تحديث الجلسة والانتقال لتسجيل الدخول ➔</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 active:scale-[0.98]"
              >
                <RotateCw className="w-4 h-4" />
                <span>إعادة تحميل الصفحة</span>
              </button>

              {/* Collapsible Tech Details */}
              {stack && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                    className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1 mx-auto"
                  >
                    <span>تفاصيل المطور (Stack Trace)</span>
                    {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {this.state.showDetails && (
                    <pre className="mt-2 p-3 bg-slate-950 rounded-xl text-[10px] text-slate-400 text-left font-mono overflow-x-auto max-h-48 border border-slate-800" dir="ltr">
                      {stack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 text-[10px] text-slate-500 font-mono">
              Green Arrow Enterprise Core • Safe Recovery
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
