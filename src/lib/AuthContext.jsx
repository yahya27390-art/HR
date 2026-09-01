import { getCompanyProfile } from '@/lib/companyProfile';
import { initFullCloudSync } from '@/lib/cloudSyncEngine';
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getUserPermissions, determineRoleFromEmployee } from '@/lib/rbac';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('zenith_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const stored = localStorage.getItem('zenith_auth_user');
      return !!stored;
    } catch {
      return false;
    }
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'app_hr', public_settings: {} });

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await base44.auth.me();
      if (currentUser && (currentUser.id || currentUser.employee_number)) {
        // Enrich with RBAC role if not already set
        if (!currentUser.role || currentUser.role === 'admin' || currentUser.role === 'employee') {
          currentUser.role = determineRoleFromEmployee(currentUser);
        }
        currentUser.permissions = getUserPermissions(currentUser);
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    // Ensure default DC company profile and logo are loaded for all users
    getCompanyProfile();
    initFullCloudSync();
    checkUserAuth();
  }, [checkUserAuth]);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const logout = (shouldRedirect = true) => {
    base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
