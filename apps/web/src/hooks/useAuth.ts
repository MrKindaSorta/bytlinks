import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePageStore } from '../store/pageStore';
import { useLinkStore } from '../store/linkStore';
import { useBlockStore } from '../store/blockStore';

/**
 * Auth hook — handles login, signup, logout, and a one-time session check.
 * The session check fires only once per app lifecycle (guarded by _hasChecked).
 */
export function useAuth() {
  const store = useAuthStore();
  const { user, isAuthenticated, isLoading, _hasChecked, setUser, setLoading, setChecked, logout: clearUser } = store;

  useEffect(() => {
    if (_hasChecked) return;
    setChecked();

    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUser(data.data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [_hasChecked, setUser, setLoading, setChecked]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }

    setUser(data.data.user);
    return data.data;
  }, [setUser]);

  const signup = useCallback(async (email: string, password: string, username: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Registration failed');
    }

    setUser(data.data.user);
    return data.data;
  }, [setUser]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    clearUser();
    usePageStore.getState().reset();
    useLinkStore.getState().reset();
    useBlockStore.getState().reset();
  }, [clearUser]);

  return { user, isAuthenticated, isLoading, login, signup, logout };
}
