import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Admin session state.
 *
 * Separate from the storefront's demo sign-in (AuthContext), which is a
 * customer-facing demo saved in localStorage and grants nothing.
 */

const AdminAuthContext = createContext(null);

const INITIAL = {
  loading: true,
  authenticated: false,
  user: null,
  stores: [],
  canAccessCurrentStore: false,
  currentStore: null,
  setupRequired: false,
  error: null,
};

export const useAdminAuth = () => useContext(AdminAuthContext) || INITIAL;

export const AdminAuthProvider = ({ children }) => {
  const [state, setState] = useState(INITIAL);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setState({ ...INITIAL, loading: false, setupRequired: !!data.setup_required });
        return;
      }
      if (!res.ok) {
        setState({ ...INITIAL, loading: false, error: data.error || `HTTP ${res.status}` });
        return;
      }

      setState({
        loading: false,
        authenticated: true,
        user: data.user || null,
        stores: data.stores || [],
        canAccessCurrentStore: !!data.can_access_current_store,
        currentStore: data.current_store || null,
        setupRequired: !!data.setup_required,
        error: null,
      });
    } catch (e) {
      setState({ ...INITIAL, loading: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const post = useCallback(async (path, body) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await post('/api/auth/login', { email, password });
    setState({
      loading: false,
      authenticated: true,
      user: data.user,
      stores: data.stores || [],
      canAccessCurrentStore: true,
      currentStore: null,
      setupRequired: false,
      error: null,
    });
    await refresh();
    return data;
  }, [post, refresh]);

  const setup = useCallback(async ({ token, email, password, name }) => {
    const data = await post('/api/auth/setup', { token, email, password, name });
    setState((s) => ({ ...s, authenticated: true, user: data.user, setupRequired: false }));
    await refresh();
    return data;
  }, [post, refresh]);

  const logout = useCallback(async () => {
    try {
      await post('/api/auth/logout', {});
    } catch (e) { /* ignore */ }
    setState({ ...INITIAL, loading: false });
  }, [post]);

  return (
    <AdminAuthContext.Provider value={{ ...state, refresh, login, setup, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
