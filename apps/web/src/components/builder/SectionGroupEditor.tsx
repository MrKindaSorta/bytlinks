import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, Pencil, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { ContentSection, ContentBlock, ContentBlockType } from '@bytlinks/shared';
import { BLOCK_TYPE_META } from '@bytlinks/shared/constants';

interface SectionGroupEditorProps {
  sections: ContentSection[];
  sectionOrder: string[];
  blocks: ContentBlock[];
  onUpdateSections: (sections: ContentSection[]) => void;
}

/* ── Sortable item within a section ── */

function SortableItem({ id, label, isDragOverlay }: { id: string; label: string; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-border bg-brand-surface
        ${isDragOverlay ? 'shadow-lg ring-2 ring-brand-accent/30' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-brand-text-muted hover:text-brand-text transition-colors duration-150"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="font-body text-xs text-brand-text flex-1 truncate">{label}</span>
    </div>
  );
}

/* ── Static overlay item (used in DragOverlay, no hooks) ── */

function OverlayItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-accent bg-brand-surface shadow-lg ring-2 ring-brand-accent/30">
      <GripVertical className="w-3.5 h-3.5 text-brand-text-muted" />
      <span className="font-body text-xs text-brand-text flex-1 truncate">{label}</span>
    </div>
  );
}

/* ── Droppable section container ── */

function DroppableSection({
  section,
  children,
  isOver,
}: {
  section: ContentSection;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `container:${section.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors duration-150 p-1 -mx-1
        ${isOver ? 'bg-brand-accent/8 ring-1 ring-brand-accent/20' : ''}`}
    >
      {children}
    </div>
  );
}

/* ── Section header (not draggable — uses up/down buttons) ── */

function SectionHeader({
  section,
  index,
  total,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  canDelete,
}: {
  section: ContentSection;
  index: number;
  total: number;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(section.label);

  function save() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== section.label) onRename(section.id, trimmed);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-1.5 py-2">
      {/* Reorder buttons */}
      <div className="flex flex-col -space-y-0.5">
        <button
          onClick={() => onMoveUp(section.id)}
          disabled={index === 0}
          className="p-0.5 text-brand-text-muted hover:text-brand-text transition-colors duration-150 disabled:opacity-20 disabled:cursor-default"
          title="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMoveDown(section.id)}
          disabled={index === total - 1}
          className="p-0.5 text-brand-text-muted hover:text-brand-text transition-colors duration-150 disabled:opacity-20 disabled:cursor-default"
          title="Move down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 font-body text-base md:text-sm font-semibold bg-transparent border-b border-brand-accent
                       text-brand-text outline-none px-0 py-0.5"
            autoFocus
          />
          <button onClick={save} className="p-0.5 text-brand-accent"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="p-0.5 text-brand-text-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <span className="font-display text-sm font-700 tracking-tight text-brand-text flex-1 truncate">
          {section.label}
        </span>
      )}

      {!editing && (
        <>
          <button
            onClick={() => { setValue(section.label); setEditing(true); }}
            className="p-1 text-brand-text-muted hover:text-brand-text transition-colors duration-150"
            title="Rename"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(section.id)}
              className="p-1 text-brand-text-muted hover:text-red-500 transition-colors duration-150"
              title="Delete section"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ── Helpers ── */

/** Find which container (section id or 'unassigned') an item belongs to */
function findContainer(
  itemId: string,
  sections: ContentSection[],
  unassigned: string[],
): string | null {
  // Check if it's a container id itself
  if (itemId.startsWith('container:')) return itemId.replace('container:', '');

  for (const section of sections) {
    if (section.items.includes(itemId)) return section.id;
  }
  if (unassigned.includes(itemId)) return 'unassigned';
  return null;
}

/* ── Main ── */

export function SectionGroupEditor({ sections, sectionOrder, blocks, onUpdateSections }: SectionGroupEditorProps) {
  const blockMap = new Map(blocks.map((b) => [b.id, b]));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Check if an item reference is valid (not an orphaned block) */
  const isValidItem = useCallback((item: string): boolean => {
    if (item === 'links') return true;
    if (item.startsWith('block:')) return blockMap.has(item.slice(6));
    return true;
  }, [blockMap]);

  const getItemLabel = useCallback((item: string): string => {
    if (item === 'links') return 'Links';
    if (item.startsWith('block:')) {
      const block = blockMap.get(item.slice(6));
      if (!block) return 'Unknown Block';
      const meta = BLOCK_TYPE_META[block.block_type as ContentBlockType];
      return block.title || meta?.label || 'Content Block';
    }
    return item;
  }, [blockMap]);

  // Filter orphaned block refs out of sections
  const cleanSections = sections.map((s) => ({
    ...s,
    items: s.items.filter(isValidItem),
  }));

  // Items assigned to (clean) sections
  const assignedItems = new Set(cleanSections.flatMap((s) => s.items));

  // Unassigned items from section_order (also filtered for valid refs)
  const unassigned = sectionOrder.filter((entry) => {
    if (entry === 'social_links') return false;
    if (!isValidItem(entry)) return false;
    return !assignedItems.has(entry);
  });

  function addSection() {
    const id = crypto.randomUUID().slice(0, 8);
    onUpdateSections([...cleanSections, { id, label: 'New Section', items: [] }]);
  }

  function renameSection(id: string, label: string) {
    onUpdateSections(cleanSections.map((s) => (s.id === id ? { ...s, label } : s)));
  }

  function deleteSection(id: string) {
    onUpdateSections(cleanSections.filter((s) => s.id !== id));
  }

  function moveSectionUp(id: string) {
    const idx = cleanSections.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    const next = [...cleanSections];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onUpdateSections(next);
  }

  function moveSectionDown(id: string) {
    const idx = cleanSections.findIndex((s) => s.id === id);
    if (idx === -1 || idx >= cleanSections.length - 1) return;
    const next = [...cleanSections];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onUpdateSections(next);
  }

  /* ── DnD handlers ── */

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setOverContainerId(null);
      return;
    }

    const activeStr = active.id as string;
    const overStr = over.id as string;

    const fromContainer = findContainer(activeStr, cleanSections, unassigned);
    let toContainer = findContainer(overStr, cleanSections, unassigned);

    // If hovering over a container droppable directly
    if (overStr.startsWith('container:')) {
      toContainer = overStr.replace('container:', '');
    }

    setOverContainerId(toContainer);

    if (!fromContainer || !toContainer || fromContainer === toContainer) return;

    // Move item between containers in real time
    const newSections = cleanSections.map((s) => ({ ...s, items: [...s.items] }));

    // Remove from source
    if (fromContainer === 'unassigned') {
      // Nothing to remove from sections state — item is just in unassigned list
    } else {
      const srcIdx = newSections.findIndex((s) => s.id === fromContainer);
      if (srcIdx !== -1) {
        newSections[srcIdx].items = newSections[srcIdx].items.filter((i) => i !== activeStr);
      }
    }

    // Add to destination
    if (toContainer === 'unassigned') {
      // Removing from section is enough — it'll appear in unassigned automatically
      if (fromContainer !== 'unassigned') {
        onUpdateSections(newSections);
      }
      return;
    }

    const destIdx = newSections.findIndex((s) => s.id === toContainer);
    if (destIdx === -1) return;

    // Don't add if already there (prevents duplicates during rapid drag)
    if (newSections[destIdx].items.includes(activeStr)) return;

    // Find insertion index
    const overIdx = newSections[destIdx].items.indexOf(overStr);
    if (overIdx !== -1) {
      newSections[destIdx].items.splice(overIdx, 0, activeStr);
    } else {
      // Dropping onto the container itself (empty section) — append
      newSections[destIdx].items.push(activeStr);
    }

    onUpdateSections(newSections);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverContainerId(null);

    if (!over) return;

    const activeStr = active.id as string;
    const overStr = over.id as string;

    if (activeStr === overStr) return;

    const fromContainer = findContainer(activeStr, cleanSections, unassigned);
    const toContainer = findContainer(overStr, cleanSections, unassigned);

    // Same container reorder
    if (fromContainer && toContainer && fromContainer === toContainer && fromContainer !== 'unassigned') {
      const sectionIdx = cleanSections.findIndex((s) => s.id === fromContainer);
      if (sectionIdx === -1) return;

      const items = cleanSections[sectionIdx].items;
      const oldIdx = items.indexOf(activeStr);
      const newIdx = items.indexOf(overStr);
      if (oldIdx === -1 || newIdx === -1) return;

      const newSections = cleanSections.map((s) => ({ ...s, items: [...s.items] }));
      newSections[sectionIdx].items = arrayMove(items, oldIdx, newIdx);
      onUpdateSections(newSections);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverContainerId(null);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={addSection}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed
                   border-brand-border text-brand-text-muted hover:text-brand-text hover:border-brand-text-muted
                   transition-colors duration-150 font-body text-xs font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Section
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {cleanSections.map((section, idx) => (
          <div key={section.id} className="rounded-xl border border-brand-border bg-brand-surface/50 px-3 pb-3">
            <SectionHeader
              section={section}
              index={idx}
              total={cleanSections.length}
              onRename={renameSection}
              onDelete={deleteSection}
              onMoveUp={moveSectionUp}
              onMoveDown={moveSectionDown}
              canDelete={cleanSections.length > 1}
            />
            <SortableContext items={section.items} strategy={verticalListSortingStrategy}>
              <DroppableSection
                section={section}
                isOver={overContainerId === section.id && !!activeId && !section.items.includes(activeId)}
              >
                {section.items.length === 0 && !activeId && (
                  <p className="font-body text-[11px] text-brand-text-muted/60 text-center py-3">
                    Drag items here
                  </p>
                )}
                {section.items.map((item) => (
                  <SortableItem key={item} id={item} label={getItemLabel(item)} />
                ))}
              </DroppableSection>
            </SortableContext>
          </div>
        ))}

        {/* Unassigned items */}
        {unassigned.length > 0 && (
          <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface/30 px-3 pb-3">
            <div className="flex items-center gap-2 py-2">
              <span className="font-body text-xs font-medium text-brand-text-muted">Unassigned</span>
              <span className="font-body text-[10px] text-brand-text-muted/60">Hidden from public page</span>
            </div>
            <SortableContext items={unassigned} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {unassigned.map((item) => (
                  <SortableItem key={item} id={item} label={getItemLabel(item)} />
                ))}
              </div>
            </SortableContext>
          </div>
        )}

        {/* Drag overlay — renders outside container boundaries */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {activeId ? <OverlayItem label={getItemLabel(activeId)} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
