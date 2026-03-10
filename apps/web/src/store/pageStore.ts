import { create } from 'zustand';
import type { BioPage, Theme, EmbedBlock } from '@bytlinks/shared';

interface PageState {
  page: BioPage | null;
  embeds: EmbedBlock[];
  isLoading: boolean;
  _hasFetched: boolean;
  setPage: (page: BioPage | null) => void;
  setEmbeds: (embeds: EmbedBlock[]) => void;
  setLoading: (loading: boolean) => void;
  setFetched: () => void;
  updateTheme: (theme: Partial<Theme>) => void;
}

export const usePageStore = create<PageState>((set) => ({
  page: null,
  embeds: [],
  isLoading: true,
  _hasFetched: false,
  setPage: (page) => set({ page }),
  setEmbeds: (embeds) => set({ embeds }),
  setLoading: (isLoading) => set({ isLoading }),
  setFetched: () => set({ _hasFetched: true }),
  updateTheme: (themeUpdate) =>
    set((state) => {
      if (!state.page) return state;
      const prev = state.page.theme;
      // Deep-merge desktopOverrides so partial updates don't clobber sibling keys
      const merged = { ...prev, ...themeUpdate };
      if ('desktopOverrides' in themeUpdate && themeUpdate.desktopOverrides && prev.desktopOverrides) {
        merged.desktopOverrides = { ...prev.desktopOverrides, ...themeUpdate.desktopOverrides };
      }
      return { page: { ...state.page, theme: merged } };
    }),
}));
