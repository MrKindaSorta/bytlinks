import { useCallback, useEffect } from 'react';
import { useBlockStore } from '../store/blockStore';
import { usePageStore } from '../store/pageStore';
import type { ContentBlock, ContentBlockType, ContentBlockData } from '@bytlinks/shared';

export function useBlocks() {
  const blocks = useBlockStore((s) => s.blocks);
  const isLoading = useBlockStore((s) => s.isLoading);
  const _hasFetched = useBlockStore((s) => s._hasFetched);

  const fetchBlocks = useCallback(async () => {
    useBlockStore.getState().setLoading(true);
    try {
      const res = await fetch('/api/blocks', { credentials: 'include' });
      const data = await res.json();
      if (data.success) useBlockStore.getState().setBlocks(data.data);
    } catch {
      // silent
    } finally {
      useBlockStore.getState().setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (_hasFetched) return;
    useBlockStore.getState().setFetched();
    fetchBlocks();
  }, [_hasFetched, fetchBlocks]);

  const createBlock = useCallback(async (input: {
    block_type: ContentBlockType;
    title?: string;
    data?: ContentBlockData;
    insert_index?: number;
  }) => {
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    const newBlock = data.data as ContentBlock;
    useBlockStore.getState().addBlock(newBlock);
    useBlockStore.getState().setFocusedBlockId(newBlock.id);

    // Insert into section_order at the specified position (or append)
    const page = usePageStore.getState().page;
    if (page) {
      const currentOrder = [...(page.section_order ?? ['social_links', 'links'])];
      const entry = `block:${newBlock.id}`;
      if (input.insert_index != null && input.insert_index >= 0 && input.insert_index <= currentOrder.length) {
        currentOrder.splice(input.insert_index, 0, entry);
      } else {
        currentOrder.push(entry);
      }
      usePageStore.getState().setPage({
        ...page,
        section_order: currentOrder,
      });
    }

    return newBlock;
  }, []);

  const editBlock = useCallback(async (id: string, updates: {
    title?: string;
    data?: ContentBlockData;
    is_visible?: boolean;
    column_span?: 'full' | 'half' | null;
  }) => {
    // Optimistic update
    useBlockStore.getState().updateBlock(id, updates as Partial<ContentBlock>);
    const res = await fetch(`/api/blocks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  }, []);

  const duplicateBlock = useCallback(async (id: string) => {
    const res = await fetch(`/api/blocks/${id}/duplicate`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    const newBlock = data.data as ContentBlock;
    useBlockStore.getState().addBlock(newBlock);
    useBlockStore.getState().setFocusedBlockId(newBlock.id);

    // Insert into section_order right after source
    const page = usePageStore.getState().page;
    if (page) {
      const currentOrder = [...(page.section_order ?? ['social_links', 'links'])];
      const sourceIdx = currentOrder.indexOf(`block:${id}`);
      if (sourceIdx >= 0) {
        currentOrder.splice(sourceIdx + 1, 0, `block:${newBlock.id}`);
      } else {
        currentOrder.push(`block:${newBlock.id}`);
      }
      usePageStore.getState().setPage({
        ...page,
        section_order: currentOrder,
      });
    }

    return newBlock;
  }, []);

  const deleteBlock = useCallback(async (id: string) => {
    const res = await fetch(`/api/blocks/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    useBlockStore.getState().removeBlock(id);

    // Remove from section_order in page store
    const page = usePageStore.getState().page;
    if (page) {
      const currentOrder = page.section_order ?? ['social_links', 'links'];
      usePageStore.getState().setPage({
        ...page,
        section_order: currentOrder.filter((entry) => entry !== `block:${id}`),
      });
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/blocks/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data as { r2_key: string; filename: string; file_size: number; url: string };
  }, []);

  return { blocks, isLoading, fetchBlocks, createBlock, editBlock, duplicateBlock, deleteBlock, uploadFile };
}
