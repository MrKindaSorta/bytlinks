import { useCallback, useEffect } from 'react';
import { usePageStore } from '../store/pageStore';
import type { Theme } from '@bytlinks/shared';

export function usePage() {
  const page = usePageStore((s) => s.page);
  const isLoading = usePageStore((s) => s.isLoading);
  const _hasFetched = usePageStore((s) => s._hasFetched);

  const fetchPage = useCallback(async () => {
    usePageStore.getState().setLoading(true);
    try {
      const res = await fetch('/api/pages/me', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        usePageStore.getState().setPage(data.data.page);
        usePageStore.getState().setEmbeds(data.data.embeds ?? []);
      }
    } catch {
      // silent — page may not exist yet
    } finally {
      usePageStore.getState().setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (_hasFetched) return;
    usePageStore.getState().setFetched();
    fetchPage();
  }, [_hasFetched, fetchPage]);

  const updatePage = useCallback(async (updates: {
    display_name?: string;
    bio?: string;
    about_me?: string;
    about_me_expanded?: boolean;
    theme?: Theme;
    show_branding?: boolean;
    section_order?: string[];
  }) => {
    const res = await fetch('/api/pages/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const current = usePageStore.getState().page;
    if (updates.display_name !== undefined || updates.bio !== undefined || updates.about_me !== undefined || updates.about_me_expanded !== undefined || updates.section_order !== undefined) {
      usePageStore.getState().setPage(current ? { ...current, ...updates } as typeof current : null);
    }
    if (updates.theme) {
      usePageStore.getState().updateTheme(updates.theme);
    }
  }, []);

  return { page, isLoading, fetchPage, updatePage };
}
