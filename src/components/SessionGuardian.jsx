import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ShieldAlert, Clock, LogOut, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Total Inactivity Timeout: 15 minutes (900 seconds)
// Warning dialog triggers at: 14 minutes (60 seconds before logout)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins
const WARNING_DURATION_SEC = 60; // 60s countdown

export default function SessionGuardian() {
  const { user } = useAuth();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_DURATION_SEC);

  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Reset activity timestamp
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(WARNING_DURATION_SEC);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
  }, [showWarning]);

  // Execute secure logout
  const handleLogout = useCallback(() => {
    setShowWarning(false);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Clear user session
    localStorage.removeItem('zenith_auth_user');
    // Redirect to login with reason
    window.location.href = '/login?reason=session_timeout';
  }, []);

  // Set up user activity event listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    let throttleTimer = null;
    const handleUserAction = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          recordActivity();
          throttleTimer = null;
        }, 1000);
      }
    };

    events.forEach(ev => window.addEventListener(ev, handleUserAction, { passive: true }));

    // Periodic check every 3 seconds
    checkIntervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const timeUntilLogout = INACTIVITY_TIMEOUT_MS - idleTime;

      if (timeUntilLogout <= 0) {
        handleLogout();
      } else if (timeUntilLogout <= WARNING_DURATION_SEC * 1000 && !showWarning) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.round(timeUntilLogout / 1000)));
      }
    }, 3000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserAction));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, recordActivity, handleLogout, showWarning]);

  // Countdown timer when warning is active
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showWarning, handleLogout]);

  if (!user || !showWarning) return null;

  return (
    <Dialog open={showWarning} onOpenChange={(open) => { if (!open) recordActivity(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 shadow-2xl p-6" dir="rtl">
        
        <div className="flex flex-col items-center text-center space-y-4">
          
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 shadow-lg">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-1">
            <DialogTitle className="font-heading font-black text-lg text-foreground">
              تنبيه أمان الجلسة • مهلة عدم النشاط
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              لحماية سرية وأمان بيانات المنشأة والموظفين وفقاً للمعايير البنكية، سيتم إنهاء الجلسة تلقائياً بسبب الخمول.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-border w-full flex items-center justify-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="font-mono font-black text-3xl text-rose-600 dark:text-rose-400 tracking-wider">
              00:{String(secondsRemaining).padStart(2, '0')}
            </span>
            <span className="text-xs font-bold text-muted-foreground">ثانية متبقية</span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            اضغط على زر <strong>"تمديد الجلسة"</strong> لمواصلة العمل دون انقطاع.
          </p>

        </div>

        <DialogFooter className="mt-4 gap-2 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl text-xs font-bold gap-1.5 h-10 border-slate-200 text-muted-foreground hover:text-rose-600"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج الآن</span>
          </Button>

          <Button
            onClick={recordActivity}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black gap-2 h-10 px-6 shadow-md shadow-emerald-500/20 flex-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تمديد الجلسة ومتابعة العمل</span>
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
