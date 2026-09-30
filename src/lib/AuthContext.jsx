/**
 * AuthContext.jsx
 * ============================================================================
 * REBUILT — Phase 1 Security Foundation
 *
 * ZERO TRUST CLIENT:
 * - Identity is established by Supabase Auth JWT (not localStorage)
 * - Employee record is fetched from DB via auth.uid() (not localStorage)
 * - Role comes from employees.role column (not localStorage, not hardcoded)
 * - Permissions are derived server-side from DB role
 * - If auth.uid() cannot be linked to an employee → unlinked-account error
 * - NEVER falls back to another employee's record
 *
 * AUTH LIFECYCLE:
 * 1. App loads → supabase.auth.onAuthStateChange fires
 * 2. If session: fetch linked employee from DB
 * 3. If no session: redirect to login
 * 4. On logout: Supabase clears session (server-side invalidation)
 * ============================================================================
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  getCurrentAuthUser,
  fetchLinkedEmployee,
  getCredentialsSession,
  signIn as authSignIn,
  signOut as authSignOut,
  sendPasswordReset,
  updatePassword as authUpdatePassword,
  onAuthStateChange,
  getPermissionsForRole,
} from '@/lib/authService';
import { initFullCloudSync } from '@/lib/cloudSyncEngine';
import { getCompanyProfile } from '@/lib/companyProfile';

const AuthContext = createContext(null);

// ─── AUTH STATES ─────────────────────────────────────────────────────────────
// Explicit loading/error states instead of ambiguous booleans
const AUTH_STATE = {
  INITIALIZING:  'initializing',  // First load; session check in progress
  AUTHENTICATED: 'authenticated', // Session + employee linked
  UNAUTHENTICATED: 'unauthenticated', // No session
  UNLINKED: 'unlinked',          // Session exists but no employee linked
  ERROR: 'error',                // DB or network error
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState]   = useState(AUTH_STATE.INITIALIZING);
  const [user, setUser]             = useState(null);  // Full employee record
  const [authUser, setAuthUser]     = useState(null);  // Supabase auth.users record
  const [authError, setAuthError]   = useState(null);
  const initDone = useRef(false);

  // ─── Derived state (convenience compat layer for existing components) ─────
  const isAuthenticated       = authState === AUTH_STATE.AUTHENTICATED;
  const isLoadingAuth         = authState === AUTH_STATE.INITIALIZING;
  const isLoadingPublicSettings = false; // No public settings gate needed
  const authChecked           = authState !== AUTH_STATE.INITIALIZING;

  // ─── Core: resolve identity from DB ──────────────────────────────────────
  const resolveIdentity = useCallback(async () => {
    try {
      const result = await fetchLinkedEmployee();

      if (result.error === 'unauthenticated') {
        setUser(null);
        setAuthUser(null);
        setAuthState(AUTH_STATE.UNAUTHENTICATED);
        setAuthError(null);
        return;
      }

      if (result.error === 'unlinked') {
        // Auth session exists but no employee record linked
        // DO NOT fall back — show unlinked-account error
        setUser(null);
        setAuthUser({ id: result.authUserId, email: result.authEmail });
        setAuthState(AUTH_STATE.UNLINKED);
        setAuthError({ type: 'user_not_registered', authEmail: result.authEmail });
        return;
      }

      if (result.error) {
        setUser(null);
        setAuthUser(null);
        setAuthState(AUTH_STATE.ERROR);
        setAuthError({ type: 'db_error', message: result.message });
        return;
      }

      // Success: employee is linked and authenticated
      const fullUser = {
        ...result.employee,
        // Attach computed permissions (from DB role, NOT from localStorage)
        permissions: result.permissions,
        role: result.role,
      };

      setUser(fullUser);
      setAuthUser(result.authUser);
      setAuthState(AUTH_STATE.AUTHENTICATED);
      setAuthError(null);
    } catch (err) {
      console.error('[AuthContext] resolveIdentity error:', err);
      setUser(null);
      setAuthUser(null);
      setAuthState(AUTH_STATE.ERROR);
      setAuthError({ type: 'unknown_error', message: err.message });
    }
  }, []);

  // ─── Subscribe to Supabase Auth state changes ─────────────────────────────
  useEffect(() => {
    // Load company profile and cloud sync (non-auth-dependent)
    getCompanyProfile();
    initFullCloudSync();

    // Initial check on mount
    resolveIdentity();

    // Subscribe to session changes (login, logout, token refresh, etc.)
    const unsubscribe = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await resolveIdentity();
      } else if (event === 'SIGNED_OUT') {
        const cred = getCredentialsSession();
        if (!cred) {
          setUser(null);
          setAuthUser(null);
          setAuthState(AUTH_STATE.UNAUTHENTICATED);
          setAuthError(null);
        }
      } else if (event === 'USER_UPDATED') {
        // Re-fetch employee in case DB record was updated
        await resolveIdentity();
      }
    });

    return unsubscribe;
  }, [resolveIdentity]);

  // ─── Login action ──────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setAuthState(AUTH_STATE.INITIALIZING);
    setAuthError(null);

    const result = await authSignIn(email, password);

    if (result.error) {
      setAuthState(AUTH_STATE.UNAUTHENTICATED);
      setAuthError({ type: 'login_failed', message: result.error.message });
      return { error: result.error };
    }

    // Immediately resolve identity for both Supabase Auth & National ID credentials
    await resolveIdentity();
    return { success: true, employee: result.employee, role: result.role };
  }, [resolveIdentity]);

  // ─── Logout action ────────────────────────────────────────────────────────
  const logout = useCallback(async (shouldRedirect = true) => {
    await authSignOut(); // Supabase clears session (server-side)
    setUser(null);
    setAuthUser(null);
    setAuthState(AUTH_STATE.UNAUTHENTICATED);
    setAuthError(null);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  }, []);

  // ─── Re-fetch identity (e.g., after role change by admin) ────────────────
  const checkUserAuth = useCallback(async () => {
    await resolveIdentity();
  }, [resolveIdentity]);

  // ─── Password actions ─────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    return sendPasswordReset(email);
  }, []);

  const changePassword = useCallback(async (newPassword) => {
    return authUpdatePassword(newPassword);
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  // ─── Context value ────────────────────────────────────────────────────────
  const contextValue = {
    // State
    user,                    // Full employee record (DB-authoritative)
    authUser,                // Supabase auth.users record
    authState,               // Explicit auth state enum
    authError,               // Structured error

    // Convenience booleans (backward compat with existing components)
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authChecked,

    // Actions
    login,
    logout,
    checkUserAuth,
    resetPassword,
    changePassword,
    navigateToLogin,

    // Public settings compat (no-op — no public settings gate needed)
    appPublicSettings: { id: 'app_hr', public_settings: {} },
    checkAppState: async () => {},
  };

  return (
    <AuthContext.Provider value={contextValue}>
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

export { AUTH_STATE };
