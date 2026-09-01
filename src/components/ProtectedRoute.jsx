import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement, requiredPermission }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, user } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) checkUserAuth();
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) return fallback;
  if (authError && authError.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (!isAuthenticated) return unauthenticatedElement;

  // Optional permission guard
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950" dir="rtl">
        <div className="text-center space-y-4 p-8">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">غير مصرح بالوصول</h2>
          <p className="text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
          <p className="text-xs text-slate-400 font-mono">المطلوب: {requiredPermission}</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
