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
    job_title?: string;
    profession?: string;
    phone?: string;
    company_name?: string;
    address?: string;
    show_email_page?: boolean;
    show_email_card?: boolean;
    show_phone_page?: boolean;
    show_phone_card?: boolean;
    show_company_page?: boolean;
    show_company_card?: boolean;
    show_address_page?: boolean;
    show_address_card?: boolean;
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
    const directFields = ['display_name', 'bio', 'about_me', 'about_me_expanded', 'section_order',
      'job_title', 'profession', 'phone', 'company_name', 'address',
      'show_email_page', 'show_email_card', 'show_phone_page', 'show_phone_card',
      'show_company_page', 'show_company_card', 'show_address_page', 'show_address_card'] as const;
    if (directFields.some((f) => (updates as Record<string, unknown>)[f] !== undefined)) {
      usePageStore.getState().setPage(current ? { ...current, ...updates } as typeof current : null);
    }
    if (updates.theme) {
      usePageStore.getState().updateTheme(updates.theme);
    }
  }, []);

  return { page, isLoading, fetchPage, updatePage };
}
