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
} from '@dnd-kit/sortable';
import { useLinks } from '../../hooks/useLinks';
import { usePage } from '../../hooks/usePage';
import { usePageStore } from '../../store/pageStore';
import { useDebounce } from '../../hooks/useDebounce';
import { LinkCard } from './LinkCard';
import { AddLinkForm } from './AddLinkForm';
import { ButtonStylePicker } from './ButtonStylePicker';
import type { Theme, ButtonStyle } from '@bytlinks/shared';

export function LinkList() {
  const { links, isLoading, saveOrder } = useLinks();
  const { page, updatePage } = usePage();
  const theme = page?.theme ?? null;

  const debouncedSave = useDebounce(async (newTheme: Theme) => {
    try { await updatePage({ theme: newTheme }); } catch {}
  }, 400);

  function updateButtonStyle(buttonStyle: ButtonStyle | 'style-default') {
    if (!theme) return;
    usePageStore.getState().updateTheme({ buttonStyle });
    const latest = usePageStore.getState().page?.theme;
    if (latest) debouncedSave(latest);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...links];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    saveOrder(reordered.map((l, i) => ({ ...l, order_num: i })));
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-brand-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {theme && (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-3">
          <p className="font-body text-xs font-semibold text-brand-text mb-2">Button Style</p>
          <ButtonStylePicker
            value={theme.buttonStyle}
            baseStyle={theme.base}
            onChange={updateButtonStyle}
          />
        </div>
      )}
      <AddLinkForm />

      {links.length === 0 ? (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-8 text-center">
          <p className="font-body text-sm text-brand-text-muted">
            No links yet. Add your first link above.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {links.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
