import { create } from 'zustand';
import type { ContentBlock } from '@bytlinks/shared';

interface BlockState {
  blocks: ContentBlock[];
  isLoading: boolean;
  _hasFetched: boolean;
  focusedBlockId: string | null;
  setBlocks: (blocks: ContentBlock[]) => void;
  setLoading: (loading: boolean) => void;
  setFetched: () => void;
  addBlock: (block: ContentBlock) => void;
  updateBlock: (id: string, updates: Partial<ContentBlock>) => void;
  removeBlock: (id: string) => void;
  setFocusedBlockId: (id: string | null) => void;
  reset: () => void;
}

export const useBlockStore = create<BlockState>((set) => ({
  blocks: [],
  isLoading: true,
  _hasFetched: false,
  focusedBlockId: null,
  setBlocks: (blocks) => set({ blocks }),
  setLoading: (isLoading) => set({ isLoading }),
  setFetched: () => set({ _hasFetched: true }),
  addBlock: (block) => set((state) => ({ blocks: [...state.blocks, block] })),
  updateBlock: (id, updates) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  removeBlock: (id) =>
    set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) })),
  setFocusedBlockId: (id) => set({ focusedBlockId: id }),
  reset: () => set({ blocks: [], isLoading: true, _hasFetched: false, focusedBlockId: null }),
}));
