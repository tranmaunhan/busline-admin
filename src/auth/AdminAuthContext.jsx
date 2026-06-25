import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_AUTH_STORAGE_KEYS,
  adminAuthApi,
  clearAdminSession,
  getStoredAdminUser,
  hasActiveAdminToken,
  saveAdminSession,
} from '../api/adminApi';

const AdminAuthContext = createContext(null);

function isAdminRole(user) {
  const roles = user?.roles ?? [];
  return roles.some((role) => ['ADMIN', 'STAFF'].includes(String(role).toUpperCase()));
}

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(getStoredAdminUser);
  const [authReady, setAuthReady] = useState(() => {
    const storedUser = getStoredAdminUser();
    const hasToken = hasActiveAdminToken();
    return hasToken ? Boolean(storedUser) : true;
  });

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrap() {
      if (!hasActiveAdminToken()) {
        clearAdminSession();
        setUser(null);
        setAuthReady(true);
        return;
      }

      setAuthReady(true);

      try {
        const profile = await adminAuthApi.me(controller.signal);
        if (!isAdminRole(profile)) {
          clearAdminSession();
          setUser(null);
        } else {
          localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.user, JSON.stringify(profile));
          setUser(profile);
        }
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          clearAdminSession();
          setUser(null);
        }
      }
    }

    bootstrap();

    function syncFromStorage() {
      const storedUser = hasActiveAdminToken() ? getStoredAdminUser() : null;
      setUser(storedUser);
    }

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('admin-auth-changed', syncFromStorage);

    return () => {
      controller.abort();
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('admin-auth-changed', syncFromStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      isAuthenticated: Boolean(user && isAdminRole(user)),
      async login(credentials) {
        const response = await adminAuthApi.login(credentials);
        if (!isAdminRole(response.user)) {
          throw new Error('Tài khoản này không có quyền truy cập admin.');
        }
        saveAdminSession(response);
        setUser(response.user);
        return response.user;
      },
      logout() {
        clearAdminSession();
        setUser(null);
      },
    }),
    [user, authReady],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}
