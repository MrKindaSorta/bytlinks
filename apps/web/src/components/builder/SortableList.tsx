import { type ReactNode } from 'react';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode;
}

function DragHandle({ listeners, attributes }: { listeners?: Record<string, Function>; attributes?: Record<string, unknown> }) {
  return (
    <button
      type="button"
      className="p-0.5 text-brand-text-muted hover:text-brand-text cursor-grab transition-colors duration-150"
      style={{ touchAction: 'none' }}
      {...(attributes as React.HTMLAttributes<HTMLButtonElement>)}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );
}

export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
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
    ...(isDragging ? { opacity: 0.5, zIndex: 10 } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'ring-2 ring-brand-accent/30 rounded-lg' : ''}
    >
      {children(
        <DragHandle listeners={listeners as Record<string, Function> | undefined} attributes={attributes as unknown as Record<string, unknown> | undefined} />
      )}
    </div>
  );
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {(dragHandle) => renderItem(item, dragHandle)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
