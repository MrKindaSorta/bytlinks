import { create } from 'zustand';
import type { Link } from '@bytlinks/shared';

interface LinkState {
  links: Link[];
  isLoading: boolean;
  _hasFetched: boolean;
  setLinks: (links: Link[]) => void;
  setLoading: (loading: boolean) => void;
  setFetched: () => void;
  addLink: (link: Link) => void;
  updateLink: (id: string, updates: Partial<Link>) => void;
  removeLink: (id: string) => void;
  reorderLinks: (links: Link[]) => void;
  reset: () => void;
}

export const useLinkStore = create<LinkState>((set) => ({
  links: [],
  isLoading: true,
  _hasFetched: false,
  setLinks: (links) => set({ links }),
  setLoading: (isLoading) => set({ isLoading }),
  setFetched: () => set({ _hasFetched: true }),
  addLink: (link) => set((state) => ({ links: [...state.links, link] })),
  updateLink: (id, updates) =>
    set((state) => ({
      links: state.links.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  removeLink: (id) =>
    set((state) => ({ links: state.links.filter((l) => l.id !== id) })),
  reorderLinks: (links) => set({ links }),
  reset: () => set({ links: [], isLoading: true, _hasFetched: false }),
}));
