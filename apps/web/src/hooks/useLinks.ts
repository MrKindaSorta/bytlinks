import { useCallback, useEffect } from 'react';
import { useLinkStore } from '../store/linkStore';
import type { Link } from '@bytlinks/shared';

export function useLinks() {
  const links = useLinkStore((s) => s.links);
  const isLoading = useLinkStore((s) => s.isLoading);
  const _hasFetched = useLinkStore((s) => s._hasFetched);

  const fetchLinks = useCallback(async () => {
    useLinkStore.getState().setLoading(true);
    try {
      const res = await fetch('/api/links', { credentials: 'include' });
      const data = await res.json();
      if (data.success) useLinkStore.getState().setLinks(data.data);
    } catch {
      // silent
    } finally {
      useLinkStore.getState().setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (_hasFetched) return;
    useLinkStore.getState().setFetched();
    fetchLinks();
  }, [_hasFetched, fetchLinks]);

  const createLink = useCallback(async (input: {
    title: string;
    url: string;
    description?: string;
    icon?: string;
    is_featured?: boolean;
  }) => {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    useLinkStore.getState().addLink(data.data as Link);
    return data.data;
  }, []);

  const editLink = useCallback(async (id: string, updates: Partial<Link>) => {
    // Optimistic: update store immediately so UI responds instantly
    useLinkStore.getState().updateLink(id, updates);
    const res = await fetch(`/api/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    const res = await fetch(`/api/links/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    useLinkStore.getState().removeLink(id);
  }, []);

  const saveOrder = useCallback(async (orderedLinks: Link[]) => {
    useLinkStore.getState().reorderLinks(orderedLinks);
    const order = orderedLinks.map((l, i) => ({ id: l.id, order_num: i }));
    const res = await fetch('/api/links/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ order }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  }, []);

  return { links, isLoading, fetchLinks, createLink, editLink, deleteLink, saveOrder };
}
