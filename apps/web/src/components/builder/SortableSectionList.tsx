import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePage } from '../../hooks/usePage';
import { useBlocks } from '../../hooks/useBlocks';
import { useBlockStore } from '../../store/blockStore';
import { LinkList } from './LinkList';
import { SectionGroupEditor } from './SectionGroupEditor';
import { BLOCK_TYPE_META } from '@bytlinks/shared/constants';
import type { ContentBlock, ContentBlockType, ContentSection } from '@bytlinks/shared';
import { blockEditorRegistry } from './blocks/blockEditorRegistry';
import { resolveContentDisplay } from '../../utils/styleDefaults';

interface SortableSectionItemProps {
  id: string;
  children: React.ReactNode;
  label: string;
  isBuiltIn?: boolean;
  isVisible?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleVisibility?: () => void;
  onDelete?: () => void;
  itemRef?: (el: HTMLDivElement | null) => void;
}

function SortableSectionItem({ id, children, label, isBuiltIn, isVisible = true, expanded, onToggleExpand, onToggleVisibility, onDelete, itemRef }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(el) => { setNodeRef(el); itemRef?.(el); }}
      style={style}
      className="rounded-xl border border-brand-border bg-brand-surface mb-3"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-brand-border">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-brand-text-muted hover:text-brand-text transition-colors duration-150"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
        >
          <span className="font-display text-sm font-700 tracking-tight text-brand-text truncate">
            {label}
          </span>
          <ChevronDown
            className="w-3.5 h-3.5 text-brand-text-muted shrink-0"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </button>
        {!isBuiltIn && onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className="p-1 text-brand-text-muted hover:text-brand-text transition-colors duration-150"
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}
        {!isBuiltIn && onDelete && (
          <button
            onClick={onDelete}
            className="p-1 text-brand-text-muted hover:text-red-500 transition-colors duration-150"
            title="Delete block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Animated accordion content using CSS grid row trick */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SortableSectionList() {
  const { page, updatePage } = usePage();
  const { blocks, editBlock, deleteBlock } = useBlocks();
  const focusedBlockId = useBlockStore((s) => s.focusedBlockId);
  const setFocusedBlockId = useBlockStore((s) => s.setFocusedBlockId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sectionOrder = page?.section_order ?? ['social_links', 'links'];

  // When a new block is focused (just created), expand it and scroll to it
  useEffect(() => {
    if (!focusedBlockId) return;
    const entry = `block:${focusedBlockId}`;
    setExpandedId(entry);

    // Small delay to let the DOM update + accordion open, then scroll
    const timer = setTimeout(() => {
      const el = itemRefs.current.get(entry);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    setFocusedBlockId(null);
    return () => clearTimeout(timer);
  }, [focusedBlockId, setFocusedBlockId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionOrder.indexOf(active.id as string);
    const newIndex = sectionOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    updatePage({ section_order: newOrder });
  }

  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  function removeOrphanedEntry(entry: string) {
    const newOrder = sectionOrder.filter((e) => e !== entry);
    updatePage({ section_order: newOrder });
  }

  function renderSectionContent(entry: string) {
    if (entry === 'links') return <LinkList />;

    if (entry.startsWith('block:')) {
      const block = blockMap.get(entry.slice(6));
      if (!block) return <p className="font-body text-sm text-brand-text-muted">Block not found</p>;

      const Editor = blockEditorRegistry[block.block_type];
      if (!Editor) return <p className="font-body text-sm text-brand-text-muted">Unknown block type</p>;
      return <Editor block={block} />;
    }
    return null;
  }

  function getSectionLabel(entry: string): string {
    if (entry === 'links') return 'Links';
    if (entry.startsWith('block:')) {
      const block = blockMap.get(entry.slice(6));
      if (!block) return 'Missing Block';
      const meta = BLOCK_TYPE_META[block.block_type as ContentBlockType];
      return block.title || meta?.label || 'Content Block';
    }
    return entry;
  }

  function isBuiltIn(entry: string): boolean {
    return entry === 'links';
  }

  function getBlock(entry: string): ContentBlock | undefined {
    if (!entry.startsWith('block:')) return undefined;
    return blockMap.get(entry.slice(6));
  }

  const setItemRef = useCallback((entry: string) => (el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(entry, el);
    else itemRefs.current.delete(entry);
  }, []);

  // Always filter orphaned block refs — during loading blocks is empty so
  // block: entries won't pass, which is correct (avoids "Missing Block" labels)
  const visibleOrder = sectionOrder.filter((entry) => {
    if (entry === 'social_links') return false;
    if (!entry.startsWith('block:')) return true;
    return blockMap.has(entry.slice(6));
  });

  // Check if we should show the grouped section editor
  const theme = page?.theme;
  const contentDisplay = theme ? resolveContentDisplay(theme) : 'flow';
  const isSectioned = contentDisplay === 'sections' || contentDisplay === 'cards';

  if (isSectioned && theme) {
    const sectionsConfig = theme.sectionsConfig;
    const currentSections: ContentSection[] = sectionsConfig?.sections ?? [{
      id: 'main',
      label: 'Main',
      items: visibleOrder,
    }];

    function handleUpdateSections(newSections: ContentSection[]) {
      if (!page || !theme) return;
      updatePage({
        theme: {
          ...theme,
          sectionsConfig: {
            mode: sectionsConfig?.mode ?? 'anchor',
            navPosition: sectionsConfig?.navPosition ?? 'top',
            sections: newSections,
          },
        },
      });
    }

    return (
      <SectionGroupEditor
        sections={currentSections}
        sectionOrder={visibleOrder}
        blocks={blocks}
        onUpdateSections={handleUpdateSections}
      />
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
        {visibleOrder.map((entry) => {
          const block = getBlock(entry);
          const isOrphaned = entry.startsWith('block:') && !block;
          return (
            <SortableSectionItem
              key={entry}
              id={entry}
              label={getSectionLabel(entry)}
              isBuiltIn={isBuiltIn(entry)}
              isVisible={block?.is_visible ?? true}
              expanded={expandedId === entry}
              onToggleExpand={() => setExpandedId(expandedId === entry ? null : entry)}
              onToggleVisibility={block ? () => editBlock(block.id, { is_visible: !block.is_visible }) : undefined}
              onDelete={isOrphaned ? () => removeOrphanedEntry(entry) : block ? () => deleteBlock(block.id) : undefined}
              itemRef={setItemRef(entry)}
            >
              {renderSectionContent(entry)}
            </SortableSectionItem>
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
