import { useState, useCallback, useEffect } from 'react';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/bytadmin/me', { credentials: 'include' });
      if (res.ok) {
        setState({ isAuthenticated: true, isLoading: false, error: null });
      } else {
        setState({ isAuthenticated: false, isLoading: false, error: null });
      }
    } catch {
      setState({ isAuthenticated: false, isLoading: false, error: null });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (secret: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const res = await fetch('/api/bytadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ secret }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setState({ isAuthenticated: true, isLoading: false, error: null });
        return true;
      }
      setState((s) => ({ ...s, error: data.error || 'Login failed' }));
      return false;
    } catch {
      setState((s) => ({ ...s, error: 'Network error' }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/bytadmin/logout', { method: 'POST', credentials: 'include' });
    setState({ isAuthenticated: false, isLoading: false, error: null });
  }, []);

  return { ...state, login, logout };
}
