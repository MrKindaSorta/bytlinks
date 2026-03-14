import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Camera, Users, Pencil, Plus, Eye, EyeOff, Star, Trash2, GripVertical, Smartphone, Monitor, ChevronDown, ChevronRight, Palette, Layers, Clock, CalendarClock, Crown } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  Link as LinkType,
  SocialLink,
  ContentBlock,
  ContentBlockType,
  ContentSection,
  Theme,
} from '@bytlinks/shared';
import { BLOCK_TYPE_META, FULL_WIDTH_BLOCKS, resolveBlockColumnSpan } from '@bytlinks/shared/constants';
import { usePage } from '../../hooks/usePage';
import { useAuth } from '../../hooks/useAuth';
import { useLinks } from '../../hooks/useLinks';
import { useBlocks } from '../../hooks/useBlocks';
import { useUpload } from '../../hooks/useUpload';
import { useDebounce } from '../../hooks/useDebounce';
import { usePageStore } from '../../store/pageStore';
import { PageShell } from '../page/PageShell';
import { PageSocials } from '../page/PageSocials';
import { PageLinks } from '../page/PageLinks';
import { PageHero } from '../page/PageHero';
import { PageEmbeds } from '../page/PageEmbeds';
import { PageBadge } from '../page/PageBadge';
import { PageContactInfo } from '../page/PageContactInfo';
import { AnimatedBackground } from '../page/AnimatedBackground';
import { blockRendererRegistry } from '../page/blocks/blockRendererRegistry';
import { blockEditorRegistry } from '../builder/blocks/blockEditorRegistry';
import {
  resolveButtonStyle,
  resolveLayoutVariant,
  resolveContentDisplay,
  resolveDesktopLayoutVariant,
  resolveDesktopContentDisplay,
  resolveTwoColumnDesktop,
  resolveContainerWidth,
  resolveGridGap,
  STYLE_COLORS,
} from '../../utils/styleDefaults';
import { applyTheme, getAnimationClass } from '../../utils/themeApplicator';
import { deriveFullPalette, applyDerivedPalette, COLOR_PRESETS } from '../../utils/colorDerivation';
import { EditableWrapper } from './EditableWrapper';
import { InsertionPoint } from './InsertionPoint';
import { InlineTextEdit } from './InlineTextEdit';
import { EditorDrawer } from './EditorDrawer';
import { BlockPalette } from '../builder/BlockPalette';
import { SocialPicker } from '../builder/SocialPicker';
import { ProfileEditor } from '../builder/ProfileEditor';
import { LinkList } from '../builder/LinkList';
import { SectionGroupEditor } from '../builder/SectionGroupEditor';
import { ImageCropEditor, CROP_SQUARE } from '../shared/ImageCropEditor';
import { AppearanceDrawer } from './AppearanceDrawer';
import { MobileActionBar } from './MobileActionBar';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { LinkOverrideEditor } from '../builder/LinkOverrideEditor';
import type { ThemeColorContext } from '../builder/LinkOverrideEditor';

/* ── Main component ── */

export function MyBytLink() {
  const { page, updatePage } = usePage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { links, editLink, deleteLink, saveOrder } = useLinks();
  const { blocks, editBlock, duplicateBlock, deleteBlock } = useBlocks();
  const embeds = usePageStore((s) => s.embeds);
  const { uploadAvatar } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Social links — fetched separately (no Zustand store for these)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<'block' | 'link' | 'social' | 'profile' | 'links' | 'sections' | null>(null);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);

  // Block palette state
  const [blockPaletteOpen, setBlockPaletteOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);

  // Preview mode state
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const mobileFrameRef = useRef<HTMLDivElement>(null);

  // Appearance drawer state
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  // Mobile selection — unified state for sections and links
  const [mobileSelection, setMobileSelection] = useState<
    { type: 'section'; id: string } | { type: 'link'; id: string } | null
  >(null);
  const clickHandledRef = useRef(false);

  // Debounced save for inline edits
  const debouncedSave = useDebounce(async (field: string, value: string) => {
    try {
      await updatePage({ [field]: value });
    } catch {
      // silent
    }
  }, 600);

  // Fetch social links
  const fetchSocials = useCallback(async () => {
    try {
      const res = await fetch('/api/socials', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSocialLinks(data.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchSocials();
  }, [fetchSocials]);

  // DnD sensors — support both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Desktop detection for 2-column edit mode (must be before early return)
  const isDesktop = useIsDesktop(1024);

  // Preview mode: apply theme to mobile phone frame (must be before early return)
  const pageTheme = page?.theme ?? null;
  useEffect(() => {
    const showMobile = !isDesktop || previewDevice === 'mobile';
    if (!previewMode || !showMobile || !mobileFrameRef.current || !pageTheme) return;
    applyTheme(pageTheme, mobileFrameRef.current);
    if (pageTheme.colorMode === 'custom-simple' && pageTheme.customColors) {
      const palette = deriveFullPalette(pageTheme.customColors.primary, pageTheme.customColors.accent, pageTheme.customColors.text);
      applyDerivedPalette(palette, mobileFrameRef.current);
    } else if (pageTheme.colorMode === 'preset' && pageTheme.preset) {
      const presetColors = COLOR_PRESETS[pageTheme.preset];
      if (presetColors) {
        const palette = deriveFullPalette(presetColors[0], presetColors[1], presetColors[2]);
        applyDerivedPalette(palette, mobileFrameRef.current);
      }
    }
  }, [previewMode, previewDevice, pageTheme, isDesktop]);

  // Click-outside-to-deselect: clears selection when tapping empty areas
  useEffect(() => {
    if (!mobileSelection) return;
    function handleDocClick(e: MouseEvent) {
      if (clickHandledRef.current) {
        clickHandledRef.current = false;
        return;
      }
      if ((e.target as HTMLElement).closest('[data-mobile-action-bar]')) return;
      setMobileSelection(null);
    }
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [mobileSelection]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-brand-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Alias for TS narrowing in nested functions
  const p = page;
  const theme: Theme = p.theme;
  const layout = resolveLayoutVariant(theme);
  const btnStyle = resolveButtonStyle(theme);
  const twoColumn = resolveTwoColumnDesktop(theme);
  const editTwoColumn = twoColumn && isDesktop && !previewMode;

  const sectionOrder = p.section_order ?? ['social_links', 'links'];
  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  // Detect sections/cards content display mode
  const contentDisplay = resolveContentDisplay(theme);
  const isSectioned = contentDisplay === 'sections' || contentDisplay === 'cards';

  // Filter to valid entries for DnD
  // In split/sidebar edit mode, social_links is rendered in the hero sidebar
  const desktopLayoutForFilter = resolveDesktopLayoutVariant(theme);
  const sidebarOrSplitEditMode = editTwoColumn && (desktopLayoutForFilter === 'left-photo' || desktopLayoutForFilter === 'right-photo' || desktopLayoutForFilter === 'sidebar');
  const draggableOrder = sectionOrder.filter((entry) => {
    if (entry === 'social_links') return !sidebarOrSplitEditMode;
    if (entry === 'links') return true;
    if (entry.startsWith('block:')) return blockMap.has(entry.slice(6));
    return false;
  });

  /* ── Mobile move up/down (alternative to DnD for touch) ── */

  function handleMoveSection(direction: 'up' | 'down') {
    if (mobileSelection?.type !== 'section') return;
    const idx = sectionOrder.indexOf(mobileSelection.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sectionOrder.length) return;
    const newOrder = [...sectionOrder];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    updatePage({ section_order: newOrder });
  }

  function handleMoveLink(direction: 'up' | 'down') {
    if (mobileSelection?.type !== 'link') return;
    const allLinks = [...links];
    const idx = allLinks.findIndex((l) => l.id === mobileSelection.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= allLinks.length) return;
    [allLinks[idx], allLinks[targetIdx]] = [allLinks[targetIdx], allLinks[idx]];
    const orderedLinks = allLinks.map((l, i) => ({ ...l, order_num: i }));
    saveOrder(orderedLinks);
  }

  function handleMobileEdit() {
    if (!mobileSelection) return;
    if (mobileSelection.type === 'link') {
      const link = links.find((l) => l.id === mobileSelection.id);
      if (link) openLinkEditor(link);
      return;
    }
    const entry = mobileSelection.id;
    if (entry === 'social_links') { openSocialEditor(); return; }
    if (entry === 'links') { openLinksManager(); return; }
    if (entry.startsWith('block:')) {
      const block = blockMap.get(entry.slice(6));
      if (block) openBlockEditor(block);
    }
  }

  /* ── Section DnD handler ── */

  function handleSectionDragEnd(event: DragEndEvent) {
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

  /* ── Link DnD handler ── */

  function handleLinkDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const allLinks = [...links];
    const oldIndex = allLinks.findIndex((l) => l.id === active.id);
    const newIndex = allLinks.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const [moved] = allLinks.splice(oldIndex, 1);
    allLinks.splice(newIndex, 0, moved);

    const orderedLinks = allLinks.map((l, i) => ({ ...l, order_num: i }));
    saveOrder(orderedLinks);
  }

  /* ── Inline edit handlers ── */

  function handleNameSave(value: string) {
    debouncedSave('display_name', value);
  }

  function handleBioSave(value: string) {
    debouncedSave('bio', value);
  }

  /* ── Block palette insertion ── */

  function openBlockPalette(index?: number) {
    setInsertAtIndex(index);
    setBlockPaletteOpen(true);
  }

  function handleBlockCreated(block: ContentBlock) {
    openBlockEditor(block);
  }

  /* ── Mobile selection handlers ── */

  function selectSection(id: string) {
    clickHandledRef.current = true;
    setMobileSelection((prev) =>
      prev?.type === 'section' && prev.id === id ? null : { type: 'section', id },
    );
  }

  function selectLink(id: string) {
    clickHandledRef.current = true;
    setMobileSelection((prev) =>
      prev?.type === 'link' && prev.id === id ? null : { type: 'link', id },
    );
  }

  function clearSelection() {
    setMobileSelection(null);
  }

  /* ── Drawer handlers ── */

  function openBlockEditor(block: ContentBlock) {
    setEditingBlock(block);
    setDrawerContent('block');
    setDrawerOpen(true);
    clearSelection();
  }

  function openLinkEditor(link: LinkType) {
    setEditingLink(link);
    setDrawerContent('link');
    setDrawerOpen(true);
    clearSelection();
  }

  function openSocialEditor() {
    setDrawerContent('social');
    setDrawerOpen(true);
    clearSelection();
  }

  function openProfileEditor() {
    setDrawerContent('profile');
    setDrawerOpen(true);
    clearSelection();
  }

  function openLinksManager() {
    setDrawerContent('links');
    setDrawerOpen(true);
    clearSelection();
  }

  function openSectionsManager() {
    setDrawerContent('sections');
    setDrawerOpen(true);
    clearSelection();
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingBlock(null);
    setEditingLink(null);
    // Refresh socials when closing social editor
    if (drawerContent === 'social') {
      fetchSocials();
    }
    setDrawerContent(null);
  }

  /* ── Link action handlers ── */

  function handleLinkEdit(link: LinkType) {
    openLinkEditor(link);
  }

  function handleLinkToggleVisibility(link: LinkType) {
    editLink(link.id, { is_visible: !link.is_visible });
  }

  function handleLinkToggleFeatured(link: LinkType) {
    editLink(link.id, { is_featured: !link.is_featured });
  }

  function handleLinkDelete(link: LinkType) {
    deleteLink(link.id);
  }

  /* ── Avatar upload ── */

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setCropFile(file);
    e.target.value = '';
  }

  async function handleCropConfirm(croppedFile: File) {
    setCropFile(null);
    try {
      await uploadAvatar(croppedFile);
      window.location.reload();
    } catch {
      // silent
    }
  }

  /* ── Render sections ── */

  function renderEditableHero() {
    const avatarUrl = p.avatar_r2_key
      ? `/api/public/avatar/${p.avatar_r2_key}`
      : null;

    const isCentered = layout === 'centered';
    const aboutMeText = p.about_me?.replace(/<[^>]*>/g, '').trim();

    return (
      <div className={`relative group/hero ${isCentered ? 'text-center' : ''} mb-4`}>
        {/* Avatar with edit overlay */}
        <div className={`relative inline-block mb-4 ${isCentered ? 'mx-auto' : ''}`}>
          <div
            className="w-24 h-24 rounded-full overflow-hidden cursor-pointer relative group/avatar"
            style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.1))' }}
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={p.display_name || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-6 h-6" style={{ color: 'var(--page-text-muted)' }} />
              </div>
            )}
            {/* Hover overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full
                         opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            >
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
        </div>

        {/* Display name — inline editable */}
        {p.display_name ? (
          <InlineTextEdit
            value={p.display_name}
            onSave={handleNameSave}
            placeholder="Your name"
          >
            <h1
              className="text-3xl font-900 tracking-[-0.04em] leading-[1.05] mb-2"
              style={{ fontFamily: 'var(--page-font-display)' }}
            >
              {p.display_name}
            </h1>
          </InlineTextEdit>
        ) : (
          <button
            onClick={openProfileEditor}
            className="text-sm font-medium px-3 py-1.5 rounded-lg mb-2 transition-colors duration-150"
            style={{
              color: 'var(--page-accent, #0d9488)',
              background: 'var(--page-surface-alt, rgba(128,128,128,0.08))',
            }}
          >
            + Add display name
          </button>
        )}

        {/* Bio — inline editable */}
        {p.bio ? (
          <InlineTextEdit
            value={p.bio}
            onSave={handleBioSave}
            multiline
            maxLength={300}
            placeholder="A short bio"
          >
            <p
              className={`text-sm leading-[1.65] max-w-xs mb-4 ${isCentered ? 'mx-auto' : ''}`}
              style={{ opacity: 0.65 }}
            >
              {p.bio}
            </p>
          </InlineTextEdit>
        ) : (
          <button
            onClick={openProfileEditor}
            className="text-xs font-medium px-2 py-1 rounded mb-4 transition-colors duration-150"
            style={{
              color: 'var(--page-accent, #0d9488)',
              background: 'var(--page-surface-alt, rgba(128,128,128,0.08))',
            }}
          >
            + Add bio
          </button>
        )}

        {/* About Me — shows as read-only preview, edit via profile editor */}
        {aboutMeText && (
          <div
            className={`text-sm leading-[1.7] mb-4 cursor-pointer rounded-lg px-2 py-1
                       transition-colors duration-150 hover:bg-[var(--page-surface-alt,rgba(128,128,128,0.05))]
                       ${isCentered ? 'max-w-sm mx-auto' : 'max-w-sm'}`}
            style={{ opacity: 0.6 }}
            onClick={openProfileEditor}
            title="Click to edit About Me"
          >
            <span className="text-xs font-medium" style={{ color: 'var(--page-accent)', opacity: 0.7 }}>
              About me
            </span>
            <p className="line-clamp-2 mt-1">{aboutMeText}</p>
          </div>
        )}

        {/* Edit profile button — always visible, small */}
        <div className="mb-3">
          <button
            onClick={openProfileEditor}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider
                       px-2 py-1 rounded-md transition-colors duration-150"
            style={{
              color: 'var(--page-accent, #0d9488)',
              background: 'var(--page-surface-alt, rgba(128,128,128,0.06))',
            }}
          >
            <Pencil className="w-2.5 h-2.5" />
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  function renderEditableSocials() {
    if (socialLinks.length === 0) {
      return (
        <div className="mb-6">
          <button
            onClick={openSocialEditor}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg
                       transition-colors duration-150 border border-dashed"
            style={{
              color: 'var(--page-accent, #0d9488)',
              borderColor: 'var(--page-text, currentColor)',
              opacity: 0.4,
            }}
          >
            <Users className="w-3.5 h-3.5" />
            Add social links
          </button>
        </div>
      );
    }

    return (
      <div className="relative group/socials mb-6">
        <PageSocials socialLinks={socialLinks} layoutVariant={layout} />
        {/* Edit overlay on hover */}
        <button
          onClick={openSocialEditor}
          className="absolute -top-2 right-1 z-10 flex items-center gap-1 px-2 py-1 rounded-md
                     shadow-md transition-all duration-200
                     opacity-0 group-hover/socials:opacity-100"
          style={{
            background: 'var(--page-surface, #fff)',
            border: '1px solid var(--page-border, rgba(0,0,0,0.08))',
            color: 'var(--page-accent, #0d9488)',
            transform: 'scale(0.95)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
        >
          <Pencil className="w-3 h-3" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Edit</span>
        </button>
      </div>
    );
  }

  function renderEditableLinks() {
    const visibleLinks = links.filter((l) => l.is_visible);
    const hiddenLinks = links.filter((l) => !l.is_visible);
    const featured = visibleLinks.filter((l) => l.is_featured);
    const regular = visibleLinks.filter((l) => !l.is_featured);
    const ordered = [...featured, ...regular];

    return (
      <div className="relative">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLinkDragEnd}>
          <SortableContext items={ordered.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {ordered.map((link) => (
                <SortableLinkWrapper
                  key={link.id}
                  link={link}
                  buttonStyle={btnStyle}
                  onEdit={handleLinkEdit}
                  onToggleVisibility={handleLinkToggleVisibility}
                  onToggleFeatured={handleLinkToggleFeatured}
                  onDelete={handleLinkDelete}
                  isSelected={mobileSelection?.type === 'link' && mobileSelection.id === link.id}
                  onSelect={() => selectLink(link.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Hidden links indicator */}
        {hiddenLinks.length > 0 && (
          <div
            className="mt-2 text-center"
            style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
          >
            <span className="text-[10px] font-medium">
              {hiddenLinks.length} hidden link{hiddenLinks.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Add link button */}
        <button
          onClick={openLinksManager}
          className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg
                     border border-dashed transition-colors duration-150"
          style={{
            borderColor: 'var(--page-text, currentColor)',
            color: 'var(--page-text, currentColor)',
            opacity: 0.25,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.25'; }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Link</span>
        </button>
      </div>
    );
  }

  function isBlockContentEmpty(block: ContentBlock): boolean {
    const data = block.data as unknown as Record<string, unknown>;
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return true;

    // Check the critical fields each renderer requires to produce output
    switch (block.block_type) {
      case 'embed': return !data.embed_url || !data.embed_type;
      case 'microblog': return !Array.isArray(data.posts) || data.posts.length === 0;
      case 'rich-link': return !data.url;
      case 'social-post': return !data.post_url;
      case 'image-gallery': return !Array.isArray(data.images) || data.images.length === 0;
      case 'collabs': return !Array.isArray(data.usernames) || data.usernames.length === 0;
      case 'schedule': return !data.calendar_url;
      case 'poll': return !Array.isArray(data.options) || data.options.length === 0 || !data.question;
      case 'testimonials': return !Array.isArray(data.items) || data.items.length === 0;
      case 'faq': return !Array.isArray(data.items) || data.items.length === 0;
      case 'quote': return !data.text;
      case 'file-download': return !data.r2_key;
      case 'countdown': return !data.target_date;
      case 'booking': return !data.booking_url;
      case 'stats': return !Array.isArray(data.items) || data.items.length === 0;
      case 'event': return !data.event_name || !data.event_date;
      case 'newsletter': return false;
      case 'tip-jar': return !data.payment_url;
      default: return Object.keys(data).length === 0;
    }
  }

  function renderEmptyBlockPlaceholder(block: ContentBlock) {
    const meta = BLOCK_TYPE_META[block.block_type as ContentBlockType];
    return (
      <div
        className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed
                   cursor-pointer transition-opacity duration-150 hover:opacity-60"
        style={{
          borderColor: 'var(--page-text, currentColor)',
          opacity: 0.3,
        }}
        onClick={() => openBlockEditor(block)}
      >
        <span className="text-sm font-medium mb-1" style={{ color: 'var(--page-text)' }}>
          {meta?.label || block.block_type}
        </span>
        <span className="text-xs" style={{ color: 'var(--page-text-secondary, rgba(0,0,0,0.5))' }}>
          Click to add content
        </span>
      </div>
    );
  }

  function renderSection(entry: string) {
    if (entry === 'social_links') {
      return renderEditableSocials();
    }

    if (entry === 'links') {
      return renderEditableLinks();
    }

    if (entry.startsWith('block:')) {
      const block = blockMap.get(entry.slice(6));
      if (!block) return null;

      // Show placeholder for blocks with empty/incomplete data
      if (isBlockContentEmpty(block)) {
        return renderEmptyBlockPlaceholder(block);
      }

      const Renderer = blockRendererRegistry[block.block_type as ContentBlockType];
      if (!Renderer) return renderEmptyBlockPlaceholder(block);
      return <Renderer block={block} pageId={p.id} />;
    }

    return null;
  }

  function getSectionLabel(entry: string): string {
    if (entry === 'social_links') return 'Socials';
    if (entry === 'links') return 'Links';
    if (entry.startsWith('block:')) {
      const block = blockMap.get(entry.slice(6));
      if (!block) return 'Block';
      const meta = BLOCK_TYPE_META[block.block_type as ContentBlockType];
      return block.title || meta?.label || 'Block';
    }
    return entry;
  }

  function getBlock(entry: string): ContentBlock | undefined {
    if (!entry.startsWith('block:')) return undefined;
    return blockMap.get(entry.slice(6));
  }

  function isBuiltIn(entry: string): boolean {
    return entry === 'links' || entry === 'social_links';
  }

  /* ── Render the page content (Flow mode) ── */

  function renderFlatContent() {
    const strategy = editTwoColumn ? rectSortingStrategy : verticalListSortingStrategy;

    function resolveSpanStyle(entry: string): React.CSSProperties | undefined {
      if (!editTwoColumn) return undefined;
      if (entry === 'social_links') return { gridColumn: '1 / -1' };
      if (entry === 'links') return undefined; // Let links take 1 column in 2-col grid
      const block = getBlock(entry);
      if (block && resolveBlockColumnSpan(block) === 'full') return { gridColumn: '1 / -1' };
      return undefined;
    }

    const items = draggableOrder.flatMap((entry, index) => {
      const block = getBlock(entry);
      const builtIn = isBuiltIn(entry);
      const sectionIdx = sectionOrder.indexOf(entry);

      const elements: React.ReactNode[] = [];

      // InsertionPoint before each section (except first)
      // In 2-col mode, skip interleaved InsertionPoints so blocks flow side-by-side
      if (index > 0 && !editTwoColumn) {
        elements.push(
          <div key={`insert-${entry}`}>
            <InsertionPoint onClick={() => openBlockPalette(sectionIdx)} />
          </div>
        );
      }

      elements.push(
        <div key={entry} style={resolveSpanStyle(entry)}>
          <EditableWrapper
            id={entry}
            label={getSectionLabel(entry)}
            isBuiltIn={builtIn}
            isVisible={block?.is_visible ?? true}
            onEdit={
              entry === 'social_links'
                ? openSocialEditor
                : entry === 'links'
                  ? openLinksManager
                  : block
                    ? () => openBlockEditor(block)
                    : undefined
            }
            onToggleVisibility={
              block
                ? () => editBlock(block.id, { is_visible: !block.is_visible })
                : undefined
            }
            onDuplicate={
              block
                ? () => duplicateBlock(block.id)
                : undefined
            }
            onDelete={
              block
                ? () => deleteBlock(block.id)
                : undefined
            }
            isSelected={mobileSelection?.type === 'section' && mobileSelection.id === entry}
            onSelect={() => selectSection(entry)}
            columnSpan={editTwoColumn && block ? resolveBlockColumnSpan(block) : undefined}
            onToggleColumnSpan={
              editTwoColumn && block
                ? () => {
                    const current = resolveBlockColumnSpan(block);
                    const next = current === 'full' ? 'half' : 'full';
                    const defaultSpan = FULL_WIDTH_BLOCKS.includes(block.block_type) ? 'full' : 'half';
                    editBlock(block.id, { column_span: next === defaultSpan ? null : next });
                  }
                : undefined
            }
          >
            {renderSection(entry)}
          </EditableWrapper>
        </div>
      );

      return elements;
    });

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
        <SortableContext items={draggableOrder} strategy={strategy}>
          {editTwoColumn ? (
            <div className={`grid ${resolveGridGap(theme.spacing)} [&_.scroll-reveal]:my-0`} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {items}
            </div>
          ) : (
            <>{items}</>
          )}
        </SortableContext>

        {/* Final insertion point */}
        <InsertionPoint onClick={() => openBlockPalette(sectionOrder.length)} />
      </DndContext>
    );
  }

  /* ── Preview mode: section renderers matching PublicPage ── */

  function isFullWidthBlock(entry: string): boolean {
    if (!entry.startsWith('block:')) return false;
    const block = blockMap.get(entry.slice(6));
    if (!block) return false;
    return resolveBlockColumnSpan(block) === 'full';
  }

  function renderPreviewFlatSections(useTwoColumn: boolean) {
    const order = p.section_order ?? ['social_links', 'links'];
    const items = order.map((entry) => {
      if (entry === 'social_links') return null;
      if (entry === 'links') {
        return (
          <div key="links">
            <PageLinks links={links} buttonStyle={btnStyle} />
            {embeds.length > 0 && <PageEmbeds embeds={embeds} />}
          </div>
        );
      }
      if (entry.startsWith('block:')) {
        const block = blockMap.get(entry.slice(6));
        if (!block || !block.is_visible) return null;
        const Renderer = blockRendererRegistry[block.block_type as ContentBlockType];
        if (!Renderer) return null;
        const fullWidth = isFullWidthBlock(entry);
        return (
          <div key={entry} style={useTwoColumn && fullWidth ? { gridColumn: '1 / -1' } : undefined}>
            <Renderer block={block} pageId={p.id} />
          </div>
        );
      }
      return null;
    });

    if (useTwoColumn) {
      return (
        <div className={`grid ${resolveGridGap(theme.spacing)} lg:grid-cols-2 [&>div>*]:my-0`}>
          {items}
        </div>
      );
    }
    return <>{items}</>;
  }

  function renderDesktopPreview() {
    const desktopLayout = resolveDesktopLayoutVariant(theme);
    const desktopDisplay = resolveDesktopContentDisplay(theme);
    const twoColumn = resolveTwoColumnDesktop(theme);
    const desktopIsSidebar = desktopLayout === 'sidebar';
    const desktopIsSplit = desktopLayout === 'left-photo' || desktopLayout === 'right-photo';
    const desktopIsLeft = desktopLayout === 'left-photo';

    const heroNode = <PageHero page={p} username={p.username} layoutVariant={desktopLayout} />;
    const contactNode = <PageContactInfo page={p} layoutVariant={desktopLayout} isPreview userEmail={user?.email} />;
    const socialsNode = socialLinks.length > 0
      ? <PageSocials socialLinks={socialLinks} layoutVariant={desktopLayout} />
      : null;
    const contentNode = renderPreviewFlatSections(twoColumn);
    const badge = p.show_branding ? <PageBadge /> : null;

    const splitGrid = (heroSide: React.ReactNode, contentSide: React.ReactNode) => (
      <div className="max-w-5xl mx-auto px-5 py-16">
        <div className="grid grid-cols-[7fr_13fr] gap-12 items-start">
          <div className={`sticky top-16 self-start ${desktopIsLeft ? 'order-1' : 'order-2'}`}>
            {heroSide}
            {contactNode}
            {socialsNode}
          </div>
          <main className={desktopIsLeft ? 'order-2' : 'order-1'}>
            {contentSide}
          </main>
        </div>
      </div>
    );

    const sidebarLayout = (heroSide: React.ReactNode, contentSide: React.ReactNode) => (
      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-[280px_1fr] gap-12 items-start">
          <aside className="sticky top-16 self-start">{heroSide}{contactNode}{socialsNode}</aside>
          <main>{contentSide}</main>
        </div>
      </div>
    );

    const previewContainerWidth = resolveContainerWidth(theme);
    const centeredWrap = (children: React.ReactNode) => (
      <main className={`${previewContainerWidth} mx-auto px-5 py-16`}>{children}</main>
    );

    const scrollIndicator = (
      <div className="flex flex-col items-center gap-2 py-8 animate-bounce">
        <ChevronDown className="w-5 h-5 opacity-40" style={{ color: 'var(--page-text)' }} />
        <span className="text-xs font-medium opacity-30" style={{ color: 'var(--page-text)' }}>
          Scroll for more
        </span>
      </div>
    );

    if (desktopDisplay === 'spotlight') {
      if (desktopIsSidebar) {
        return sidebarLayout(heroNode, <div>{contentNode}{badge}</div>);
      }
      if (desktopIsSplit) {
        return splitGrid(heroNode, <div>{contentNode}{badge}</div>);
      }
      return centeredWrap(
        <>
          <div className="min-h-[85vh] flex flex-col justify-center">
            {heroNode}
            {contactNode}
            {socialsNode}
            {scrollIndicator}
          </div>
          <div>{contentNode}{badge}</div>
        </>
      );
    }

    // Flow (default) + other display modes
    if (desktopIsSidebar) {
      return sidebarLayout(heroNode, <div>{contentNode}{badge}</div>);
    }
    if (desktopIsSplit) {
      return splitGrid(heroNode, <div>{contentNode}{badge}</div>);
    }
    return centeredWrap(
      <>
        {heroNode}
        {contactNode}
        {socialsNode}
        <div>{contentNode}{badge}</div>
      </>
    );
  }

  function renderMobilePreview() {
    const animClass = getAnimationClass(theme.animation);
    return (
      <div className="flex items-center justify-center py-6" style={{ minHeight: 'calc(100vh - 48px)' }}>
        {/* Phone frame */}
        <div
          className="relative flex flex-col shrink-0"
          style={{
            width: 390,
            height: 'min(844px, calc(100vh - 100px))',
          }}
        >
          {/* Outer phone shell — z-10 above content but pointer-events-none */}
          <div
            className="absolute inset-0 rounded-[3rem] pointer-events-none z-10"
            style={{
              border: '4px solid rgba(128,128,128,0.2)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(128,128,128,0.08)',
            }}
          />

          {/* Content area — min-h-0 prevents flex overflow */}
          <div className="flex-1 min-h-0 rounded-[3rem] overflow-hidden">
            <div
              ref={mobileFrameRef}
              data-preview
              data-theme={theme.base}
              className={`h-full flex flex-col ${animClass} relative`}
              style={{
                background: 'var(--page-bg)',
                color: 'var(--page-text)',
                fontFamily: 'var(--page-font-body)',
              }}
            >
              <AnimatedBackground
                effect={theme.backgroundEffect ?? 'none'}
                intensity={theme.backgroundIntensity ?? 50}
                nightSkyConfig={theme.nightSkyConfig}
                rainConfig={theme.rainConfig}
                firefliesConfig={theme.firefliesConfig}
              />
              <div className="relative flex-1 min-h-0 flex flex-col" style={{ zIndex: 1 }}>
                {/* Status bar / notch */}
                <div className="shrink-0 flex items-center justify-center px-6 pt-3 pb-1">
                  <div className="w-[100px] h-[28px] rounded-full bg-black/80" />
                </div>

                {/* Scrollable page content — min-h-0 is critical for flex scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  <div className="px-5 py-8">
                    <PageHero page={p} username={p.username} layoutVariant={layout} disableLightbox />
                    <PageContactInfo page={p} layoutVariant={layout} isPreview userEmail={user?.email} />
                    {socialLinks.length > 0 && (
                      <PageSocials socialLinks={socialLinks} layoutVariant={layout} />
                    )}
                    {renderPreviewFlatSections(false)}
                    {p.show_branding && <PageBadge />}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="shrink-0 flex justify-center py-2">
                  <div
                    className="w-28 h-1 rounded-full"
                    style={{ background: 'var(--page-text, #000)', opacity: 0.15 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Toolbar (always sticky within the main scroll area, never fixed) ── */

  function renderToolbar() {
    return (
      <div
        className="sticky top-0 z-30 flex items-center justify-between py-2 px-4 min-w-0 max-w-full"
        style={{
          background: previewMode
            ? 'var(--page-bg, rgba(255,255,255,0.85))'
            : 'var(--page-surface-alt, rgba(128,128,128,0.06))',
          borderBottom: '1px solid var(--page-border, rgba(0,0,0,0.06))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Left: Mode toggle */}
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.08))' }}
        >
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all duration-200"
            style={{
              background: !previewMode ? 'var(--page-surface, #fff)' : 'transparent',
              color: !previewMode ? 'var(--page-accent, #0d9488)' : 'var(--page-text-secondary, rgba(0,0,0,0.35))',
              boxShadow: !previewMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => {
              if (!isDesktop && p?.username) {
                navigate(`/${p.username}`);
              } else {
                setPreviewMode(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all duration-200"
            style={{
              background: previewMode ? 'var(--page-surface, #fff)' : 'transparent',
              color: previewMode ? 'var(--page-accent, #0d9488)' : 'var(--page-text-secondary, rgba(0,0,0,0.35))',
              boxShadow: previewMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>

        {/* Center: Hint text (edit mode only) */}
        {!previewMode && (
          <span
            className="hidden md:inline text-[10px] transition-opacity duration-200"
            style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.25))' }}
          >
            Hover or tap any section to edit
          </span>
        )}

        {/* Right: Sections + Customize buttons (edit mode) or Device toggle (preview mode) */}
        {!previewMode && (
          <div className="flex items-center gap-1.5 min-w-0">
            {isSectioned && (
              <button
                onClick={openSectionsManager}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider
                           transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--page-surface-alt, rgba(128,128,128,0.08))',
                  color: 'var(--page-accent, #0d9488)',
                }}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sections</span>
              </button>
            )}
            <button
              onClick={() => setAppearanceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider
                         transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'var(--page-surface-alt, rgba(128,128,128,0.08))',
                color: 'var(--page-accent, #0d9488)',
              }}
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customize</span>
            </button>
          </div>
        )}
        {previewMode && (
          <div
            className="hidden lg:flex items-center rounded-lg p-0.5"
            style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.08))' }}
          >
            <button
              onClick={() => setPreviewDevice('desktop')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all duration-200"
              style={{
                background: previewDevice === 'desktop' ? 'var(--page-surface, #fff)' : 'transparent',
                color: previewDevice === 'desktop' ? 'var(--page-accent, #0d9488)' : 'var(--page-text-secondary, rgba(0,0,0,0.35))',
                boxShadow: previewDevice === 'desktop' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all duration-200"
              style={{
                background: previewDevice === 'mobile' ? 'var(--page-surface, #fff)' : 'transparent',
                color: previewDevice === 'mobile' ? 'var(--page-accent, #0d9488)' : 'var(--page-text-secondary, rgba(0,0,0,0.35))',
                boxShadow: previewDevice === 'mobile' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Full page render ── */

  // Preview mode — both desktop and mobile render inside PageShell with sticky toolbar
  if (previewMode) {
    return (
      <PageShell theme={theme}>
        {renderToolbar()}
        <div data-preview>
          {!isDesktop || previewDevice === 'mobile'
            ? renderMobilePreview()
            : renderDesktopPreview()
          }
        </div>
      </PageShell>
    );
  }

  // Edit mode
  const desktopLayout = resolveDesktopLayoutVariant(theme);
  const desktopIsSidebar = desktopLayout === 'sidebar';
  const desktopIsSplit = desktopLayout === 'left-photo' || desktopLayout === 'right-photo';
  const desktopIsLeft = desktopLayout === 'left-photo';

  return (
    <>
      <PageShell theme={theme}>
        {renderToolbar()}

        {editTwoColumn && desktopIsSidebar ? (
          /* Sidebar layout edit mode */
          <div className="max-w-6xl mx-auto px-5 py-10 pb-24" data-preview>
            <div className="grid grid-cols-[280px_1fr] gap-12 items-start">
              <aside className="sticky top-16 self-start">
                {renderEditableHero()}
                {renderEditableSocials()}
              </aside>
              <main>{renderFlatContent()}</main>
            </div>
          </div>
        ) : editTwoColumn && desktopIsSplit ? (
          /* Split layout edit mode: hero sidebar + 2-col content */
          <div className="max-w-5xl mx-auto px-5 py-10 pb-24" data-preview>
            <div className="grid grid-cols-[7fr_13fr] gap-12 items-start">
              <div className={`sticky top-16 self-start ${desktopIsLeft ? 'order-1' : 'order-2'}`}>
                {renderEditableHero()}
                {renderEditableSocials()}
              </div>
              <main className={desktopIsLeft ? 'order-2' : 'order-1'}>
                {renderFlatContent()}
              </main>
            </div>
          </div>
        ) : editTwoColumn ? (
          /* Centered 2-col edit mode: wider container */
          <div className={`${resolveContainerWidth(theme)} mx-auto px-5 py-10 pb-24`} data-preview>
            {renderEditableHero()}
            {renderFlatContent()}
          </div>
        ) : (
          /* Single-column edit mode (mobile / 2-col off) */
          <div className={`${isDesktop ? resolveContainerWidth(theme) : 'max-w-lg'} w-full min-w-0 mx-auto px-5 py-10 pb-24 [overflow-x:clip]`} data-preview>
            {renderEditableHero()}
            {renderFlatContent()}
          </div>
        )}
      </PageShell>

      {/* Editor Drawer */}
      <EditorDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={
          drawerContent === 'block' && editingBlock
            ? `Edit ${BLOCK_TYPE_META[editingBlock.block_type as ContentBlockType]?.label || 'Block'}`
            : drawerContent === 'link'
              ? 'Edit Link'
              : drawerContent === 'social'
                ? 'Social Links'
                : drawerContent === 'profile'
                  ? 'Edit Profile'
                  : drawerContent === 'links'
                    ? 'Manage Links'
                    : drawerContent === 'sections'
                      ? 'Manage Sections'
                      : 'Editor'
        }
      >
        {drawerContent === 'block' && editingBlock && (
          <BlockEditorContent block={editingBlock} />
        )}
        {drawerContent === 'link' && editingLink && (
          <LinkEditorContent link={editingLink} onClose={closeDrawer} theme={theme} />
        )}
        {drawerContent === 'social' && (
          <SocialPicker />
        )}
        {drawerContent === 'profile' && (
          <ProfileEditor />
        )}
        {drawerContent === 'links' && (
          <LinkList />
        )}
        {drawerContent === 'sections' && (() => {
          const sectionsConfig = theme.sectionsConfig;
          const visibleOrder = sectionOrder.filter((entry) => {
            if (entry === 'social_links') return false;
            if (!entry.startsWith('block:')) return true;
            return blockMap.has(entry.slice(6));
          });
          const currentSections: ContentSection[] = sectionsConfig?.sections ?? [{
            id: 'main',
            label: 'Main',
            items: visibleOrder,
          }];

          return (
            <SectionGroupEditor
              sections={currentSections}
              sectionOrder={visibleOrder}
              blocks={blocks}
              onUpdateSections={(newSections) => {
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
              }}
            />
          );
        })()}
      </EditorDrawer>

      {/* Appearance Drawer */}
      <AppearanceDrawer
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
      />

      {/* Mobile Action Bar */}
      {(() => {
        if (!mobileSelection) return (
          <MobileActionBar
            visible={false}
            label=""
            onDeselect={clearSelection}
            canMoveUp={false}
            canMoveDown={false}
          />
        );

        if (mobileSelection.type === 'link') {
          const link = links.find((l) => l.id === mobileSelection.id);
          if (!link) return null;
          const linkIdx = links.findIndex((l) => l.id === mobileSelection.id);
          return (
            <MobileActionBar
              visible
              label={link.title || link.url || 'Link'}
              onEdit={() => openLinkEditor(link)}
              onMoveUp={() => handleMoveLink('up')}
              onMoveDown={() => handleMoveLink('down')}
              canMoveUp={linkIdx > 0}
              canMoveDown={linkIdx < links.length - 1}
              onToggleVisibility={() => editLink(link.id, { is_visible: !link.is_visible })}
              onToggleFeatured={() => editLink(link.id, { is_featured: !link.is_featured })}
              onDelete={() => { deleteLink(link.id); clearSelection(); }}
              onDeselect={clearSelection}
              isVisible={link.is_visible}
              isFeatured={link.is_featured}
            />
          );
        }

        // Section selection
        const entry = mobileSelection.id;
        const sIdx = sectionOrder.indexOf(entry);
        const block = getBlock(entry);
        const builtIn = isBuiltIn(entry);
        return (
          <MobileActionBar
            visible
            label={getSectionLabel(entry)}
            onEdit={handleMobileEdit}
            onMoveUp={() => handleMoveSection('up')}
            onMoveDown={() => handleMoveSection('down')}
            canMoveUp={sIdx > 0}
            canMoveDown={sIdx < sectionOrder.length - 1}
            onToggleVisibility={
              block ? () => editBlock(block.id, { is_visible: !block.is_visible }) : undefined
            }
            onDuplicate={
              !builtIn && block ? () => { duplicateBlock(block.id); clearSelection(); } : undefined
            }
            onDelete={
              !builtIn && block ? () => { deleteBlock(block.id); clearSelection(); } : undefined
            }
            onDeselect={clearSelection}
            isVisible={block?.is_visible ?? true}
          />
        );
      })()}

      {/* Block Palette */}
      {blockPaletteOpen && (
        <BlockPalette
          variant="sheet"
          insertAtIndex={insertAtIndex}
          onBlockCreated={handleBlockCreated}
          onClose={() => { setBlockPaletteOpen(false); setInsertAtIndex(undefined); }}
        />
      )}

      {/* Avatar crop editor */}
      {cropFile && (
        <ImageCropEditor
          file={cropFile}
          presets={CROP_SQUARE}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </>
  );
}

/* ── Sortable link wrapper ── */

interface SortableLinkWrapperProps {
  link: LinkType;
  buttonStyle: string;
  onEdit: (link: LinkType) => void;
  onToggleVisibility: (link: LinkType) => void;
  onToggleFeatured: (link: LinkType) => void;
  onDelete: (link: LinkType) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

function SortableLinkWrapper({
  link,
  buttonStyle,
  onEdit,
  onToggleVisibility,
  onToggleFeatured,
  onDelete,
  isSelected,
  onSelect,
}: SortableLinkWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || isSelected;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : link.is_visible ? 1 : 0.5,
  };

  const btnClasses = getButtonClasses(buttonStyle as import('@bytlinks/shared').ButtonStyle);
  const btnStyle = getButtonStyle(buttonStyle as import('@bytlinks/shared').ButtonStyle, link);

  // Icon handling
  const iconName = link.icon;
  const iconPosition = link.style_overrides?.iconPosition ?? 'left';
  const hasIcon = !!iconName;

  const now = Math.floor(Date.now() / 1000);
  const isScheduled = link.published_at != null && link.published_at > now;
  const isExpiring = link.expires_at != null && link.expires_at > now;
  const isExpired = link.expires_at != null && link.expires_at <= now;

  let content: React.ReactNode = <span>{link.title}</span>;
  if (hasIcon) {
    content = (
      <span className={`flex items-center justify-center gap-2 ${iconPosition === 'right' ? 'flex-row-reverse' : ''}`}>
        <span>{link.title}</span>
      </span>
    );
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect?.();
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        outline: active ? '1.5px dashed var(--page-accent, #0d9488)' : '1.5px dashed transparent',
        outlineOffset: '-1.5px',
        transition: [transition, 'outline-color 200ms'].filter(Boolean).join(', '),
      }}
      className="relative group/link [overflow-x:clip] [overflow-y:visible] lg:overflow-visible"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Link controls overlay — desktop only (mobile uses MobileActionBar) */}
      <div
        className="absolute -top-2.5 right-1 z-10 hidden lg:flex items-center gap-0.5 px-1 py-0.5 rounded-md
                   shadow-md transition-all duration-200"
        style={{
          background: 'var(--page-surface, #fff)',
          border: '1px solid var(--page-border, rgba(0,0,0,0.08))',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0) scale(1)' : 'translateY(2px) scale(0.95)',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 rounded cursor-grab active:cursor-grabbing"
          style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(link); }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: 'var(--page-accent, #0d9488)' }}
          title="Edit link"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFeatured(link); }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: link.is_featured ? 'var(--page-accent, #0d9488)' : 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
          title={link.is_featured ? 'Unfeature' : 'Feature'}
        >
          <Star className={`w-3 h-3 ${link.is_featured ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(link); }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: 'var(--page-text-muted, rgba(0,0,0,0.3))' }}
          title={link.is_visible ? 'Hide' : 'Show'}
        >
          {link.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(link); }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: '#ef4444' }}
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>


      {/* The actual link button */}
      <div className={`relative ${btnClasses}`} style={btnStyle}>
        {content}
        {/* Mobile interaction shield — taps select instead of following link */}
        <div className="absolute inset-0 z-10 lg:hidden" aria-hidden="true" />
      </div>

      {/* Scheduling indicators */}
      {(isScheduled || isExpiring || isExpired) && (
        <div className="flex items-center gap-2 mt-1 px-2">
          {isScheduled && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600"
                  title={`Publishes ${new Date((link.published_at ?? 0) * 1000).toLocaleString()}`}>
              <Clock className="w-3 h-3" /> Scheduled
            </span>
          )}
          {isExpiring && !isExpired && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-text-muted"
                  title={`Expires ${new Date((link.expires_at ?? 0) * 1000).toLocaleString()}`}>
              <CalendarClock className="w-3 h-3" /> Expires {new Date((link.expires_at ?? 0) * 1000).toLocaleDateString()}
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500">
              Expired
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Block editor content (rendered inside drawer) ── */

function BlockEditorContent({ block }: { block: ContentBlock }) {
  const { editBlock } = useBlocks();
  const theme = usePageStore((s) => s.page?.theme);
  const showColumnControl = theme ? resolveTwoColumnDesktop(theme) : false;
  const Editor = blockEditorRegistry[block.block_type];

  if (!Editor) {
    return <p className="font-body text-sm text-brand-text-muted">No editor available for this block type.</p>;
  }

  const defaultSpan = FULL_WIDTH_BLOCKS.includes(block.block_type) ? 'full' : 'half';
  const currentSpan = block.column_span ?? defaultSpan;

  return (
    <div className="space-y-4">
      <Editor block={block} />
      {showColumnControl && (
        <div className="border-t border-brand-border pt-3">
          <p className="font-body text-[11px] font-medium text-brand-text-muted mb-2">Column Width</p>
          <div className="flex gap-1.5">
            {(['half', 'full'] as const).map((span) => (
              <button
                key={span}
                onClick={() => editBlock(block.id, { column_span: span === defaultSpan ? null : span })}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium
                  transition-colors duration-150 flex-1
                  ${currentSpan === span
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
                  }`}
              >
                {span === 'half' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <rect x="0.5" y="0.5" width="5.5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1" fill={currentSpan === 'half' ? 'currentColor' : 'none'} fillOpacity="0.2" />
                      <rect x="8" y="0.5" width="5.5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />
                    </svg>
                    Half
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <rect x="0.5" y="0.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1" fill={currentSpan === 'full' ? 'currentColor' : 'none'} fillOpacity="0.2" />
                    </svg>
                    Full
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Link editor content (rendered inside drawer) ── */

function resolveThemeColors(theme: Theme): ThemeColorContext {
  if (theme.colorMode === 'preset' && theme.preset) {
    const colors = COLOR_PRESETS[theme.preset];
    if (colors) {
      const p = deriveFullPalette(colors[0], colors[1], colors[2]);
      return { pageBg: p.bg, pageText: p.text, accent: p.accent, surfaceAlt: p.surfaceAlt, btnBg: p.btnBg, btnText: p.btnText };
    }
  }
  if (theme.colorMode === 'custom-simple' && theme.customColors) {
    const p = deriveFullPalette(theme.customColors.primary, theme.customColors.accent, theme.customColors.text);
    return { pageBg: p.bg, pageText: p.text, accent: p.accent, surfaceAlt: p.surfaceAlt, btnBg: p.btnBg, btnText: p.btnText };
  }
  return STYLE_COLORS[theme.base];
}

function epochToLocalDatetime(epoch: number | null): string {
  if (!epoch) return '';
  const d = new Date(epoch * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToEpoch(value: string): number | null {
  if (!value) return null;
  return Math.floor(new Date(value).getTime() / 1000);
}

function LinkEditorContent({ link, onClose, theme }: { link: LinkType; onClose: () => void; theme: Theme }) {
  const { editLink, deleteLink } = useLinks();
  const { user } = useAuth();
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [publishedAt, setPublishedAt] = useState(link.published_at);
  const [expiresAt, setExpiresAt] = useState(link.expires_at);
  const [saving, setSaving] = useState(false);
  const [showStyler, setShowStyler] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const isPro = user?.plan === 'pro';

  async function handleSave() {
    setSaving(true);
    try {
      await editLink(link.id, { title, url, published_at: publishedAt, expires_at: expiresAt } as Partial<LinkType>);
      onClose();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteLink(link.id);
      onClose();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-body text-sm font-medium text-brand-text mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                     bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                     focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
        />
      </div>
      <div>
        <label className="block font-body text-sm font-medium text-brand-text mb-1.5">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                     bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                     focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 font-body text-sm font-semibold px-4 py-2.5 rounded-lg
                     bg-brand-accent text-white transition-colors duration-150 hover:bg-brand-accent-hover
                     disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDelete}
          className="font-body text-sm font-medium px-4 py-2.5 rounded-lg
                     text-red-600 hover:bg-red-50 transition-colors duration-150"
        >
          Delete
        </button>
      </div>

      {/* Schedule section */}
      <div className="border-t border-brand-border pt-4">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="flex items-center gap-2 w-full text-left font-body text-sm font-medium text-brand-text
                     px-3 py-2 rounded-lg transition-colors duration-150 hover:bg-brand-surface-alt"
        >
          <Clock className="w-4 h-4 text-brand-accent" />
          <span className="flex-1">Schedule</span>
          {!isPro && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
          <ChevronRight
            className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200
                       ${showSchedule ? 'rotate-90' : ''}`}
          />
        </button>
        {showSchedule && (
          <div className={`mt-3 space-y-3 ${!isPro ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block font-body text-xs font-medium text-brand-text-muted mb-1">Publish date</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={epochToLocalDatetime(publishedAt)}
                  onChange={(e) => setPublishedAt(localDatetimeToEpoch(e.target.value))}
                  className="flex-1 font-body text-sm px-2.5 py-1.5 rounded-lg border border-brand-border
                             bg-brand-surface text-brand-text
                             focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                />
                {publishedAt && (
                  <button
                    onClick={() => setPublishedAt(null)}
                    className="font-body text-xs text-brand-text-muted hover:text-brand-text"
                  >Clear</button>
                )}
              </div>
            </div>
            <div>
              <label className="block font-body text-xs font-medium text-brand-text-muted mb-1">Expiry date</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={epochToLocalDatetime(expiresAt)}
                  onChange={(e) => setExpiresAt(localDatetimeToEpoch(e.target.value))}
                  className="flex-1 font-body text-sm px-2.5 py-1.5 rounded-lg border border-brand-border
                             bg-brand-surface text-brand-text
                             focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                />
                {expiresAt && (
                  <button
                    onClick={() => setExpiresAt(null)}
                    className="font-body text-xs text-brand-text-muted hover:text-brand-text"
                  >Clear</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Button style customization toggle */}
      <div className="border-t border-brand-border pt-4">
        <button
          onClick={() => setShowStyler(!showStyler)}
          className="flex items-center gap-2 w-full text-left font-body text-sm font-medium text-brand-text
                     px-3 py-2 rounded-lg transition-colors duration-150 hover:bg-brand-surface-alt"
        >
          <Palette className="w-4 h-4 text-brand-accent" />
          <span className="flex-1">Customize Button Style</span>
          <ChevronRight
            className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200
                       ${showStyler ? 'rotate-90' : ''}`}
          />
        </button>
        {showStyler && (
          <div className="mt-3">
            <LinkOverrideEditor
              linkId={link.id}
              onClose={() => setShowStyler(false)}
              globalButtonStyle={resolveButtonStyle(theme)}
              themeColors={resolveThemeColors(theme)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Button style helpers (copied from PageLinks to render links accurately) ── */

function getButtonClasses(style: import('@bytlinks/shared').ButtonStyle): string {
  const base = 'block w-full px-5 py-4 font-medium text-sm text-center transition-transform duration-150 hover:scale-[1.02]';
  switch (style) {
    case 'filled': return `${base} rounded-lg`;
    case 'outline': return `${base} rounded-lg bg-transparent`;
    case 'outline-sharp': return `${base} rounded-none bg-transparent`;
    case 'pill': return `${base} rounded-full`;
    case 'pill-outline': return `${base} rounded-full bg-transparent`;
    case 'underline': return `${base} rounded-none bg-transparent border-b-2 border-l-0 border-r-0 border-t-0`;
    case 'ghost': return `${base} rounded-lg`;
    case 'shadow': return `${base} rounded-lg`;
    case 'brutalist': return `${base} rounded-none`;
    case 'gradient': return `${base} rounded-lg`;
    case 'soft': return `${base} rounded-xl`;
    default: return `${base} rounded-lg`;
  }
}

function getButtonStyle(style: import('@bytlinks/shared').ButtonStyle, link?: LinkType): React.CSSProperties {
  const o = link?.style_overrides;
  const base: React.CSSProperties = {
    background: o?.buttonBg ?? 'var(--page-btn-bg)',
    color: o?.buttonText ?? 'var(--page-btn-text)',
    border: '1px solid var(--page-btn-border, transparent)',
  };
  switch (style) {
    case 'outline':
    case 'outline-sharp':
    case 'pill-outline':
      return { ...base, background: 'transparent', color: o?.buttonText ?? 'var(--page-text)', border: '1.5px solid var(--page-btn-border, var(--page-text))' };
    case 'underline':
      return { ...base, background: 'transparent', color: o?.buttonText ?? 'var(--page-text)', borderBottom: '2px solid var(--page-accent)' };
    case 'ghost':
      return { ...base, background: o?.buttonBg ?? 'var(--page-surface-alt, rgba(128,128,128,0.08))', color: o?.buttonText ?? 'var(--page-text)', border: 'none' };
    case 'shadow':
      return { ...base, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' };
    case 'brutalist':
      return { ...base, border: '2px solid var(--page-text)', boxShadow: '4px 4px 0 var(--page-text)' };
    case 'soft':
      return { ...base, background: o?.buttonBg ?? 'var(--page-surface-alt, rgba(128,128,128,0.08))', color: o?.buttonText ?? 'var(--page-accent)', border: 'none' };
    default:
      return base;
  }
}
