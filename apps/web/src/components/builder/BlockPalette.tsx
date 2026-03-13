import { useState, useEffect } from 'react';
import { X, Crown } from 'lucide-react';
import { getLinkIcon } from '../../utils/linkIconMap';
import { useBlocks } from '../../hooks/useBlocks';
import { useAuth } from '../../hooks/useAuth';
import { BLOCK_TYPE_META, BLOCK_CATEGORIES, BLOCK_LIMITS } from '@bytlinks/shared/constants';
import type { ContentBlockType, ContentBlockData } from '@bytlinks/shared';
import { UpgradeModal } from '../shared/UpgradeModal';

const DEFAULT_DATA: Record<ContentBlockType, ContentBlockData> = {
  'media-embed': { platform: '', url: '' },
  'microblog': { posts: [] },
  'rich-link': { url: '', description: '', display_mode: 'card', show_favicon: true },
  'image-gallery': { layout: 'grid', images: [], max_images: 20 },
  'collabs': { items: [], usernames: [], display_style: 'grid' },
  'calendar': { url: '' },
  'poll': { question: '', options: [{ id: '1', text: '', votes: 0 }, { id: '2', text: '', votes: 0 }], closed: false },
  'testimonials': { items: [], autoplay: true, show_source_badge: true, show_rating_stars: true },
  'newsletter': { heading: 'Stay in the loop', button_label: 'Subscribe', show_subscriber_count: false },
  'faq': { items: [{ id: '1', question: '', answer: '' }] },
  'quote': { text: '', style: 'callout' },
  'file-download': { r2_key: '', filename: '', file_size: 0, show_download_count: false, count_min_threshold: 50 },
  'countdown': { target_date: '', label: '', timezone: 'UTC', show_visitor_timezone: true, recurrence: 'none', reveal_enabled: false },
  'stats': { items: [], animate: true },
  'tip-jar': { options: [], goal_enabled: false, goal_show_bar: true },
  'event': { event_name: '', event_date: '', venue: '' },
  'product-card': { items: [], layout: 'grid', columns: 2, button_label: 'Buy Now', show_price: true },
  'form': { fields: [], submit_label: 'Submit', one_response_per_visitor: false, captcha_enabled: false, email_alert_enabled: false },
  // Legacy entries (kept for backward compat, hidden from palette via BLOCK_TYPE_META)
  'embed': { embed_type: 'youtube', embed_url: '' },
  'social-post': { platform: '', post_url: '' },
  'booking': { booking_url: '' },
  'schedule': { calendar_url: '' },
} as Record<ContentBlockType, ContentBlockData>;

interface BlockPaletteProps {
  variant?: 'panel' | 'sheet' | 'popover';
  onClose?: () => void;
  /** Position in section_order to insert the new block */
  insertAtIndex?: number;
  /** Called with the newly created block after successful creation */
  onBlockCreated?: (block: import('@bytlinks/shared').ContentBlock) => void;
}

export function BlockPalette({ variant = 'panel', onClose, insertAtIndex, onBlockCreated }: BlockPaletteProps) {
  const { createBlock, blocks } = useBlocks();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const plan = user?.plan || 'free';
  const limits = BLOCK_LIMITS[plan as keyof typeof BLOCK_LIMITS] || BLOCK_LIMITS.free;
  const atLimit = blocks.length >= limits.max_blocks;

  // Animate in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleClose() {
    setVisible(false);
    // Wait for exit animation to finish before unmounting
    setTimeout(() => onClose?.(), 220);
  }

  async function handleAdd(blockType: ContentBlockType) {
    if (atLimit || adding) return;

    if (limits.allowed_types !== 'all' && !limits.allowed_types.includes(blockType as typeof limits.allowed_types[number])) {
      return;
    }

    setAdding(true);
    try {
      const newBlock = await createBlock({
        block_type: blockType,
        data: DEFAULT_DATA[blockType],
        insert_index: insertAtIndex,
      });
      handleClose();
      onBlockCreated?.(newBlock);
    } catch {
      // handled by store
    } finally {
      setAdding(false);
    }
  }

  function isAllowed(blockType: string): boolean {
    if (limits.allowed_types === 'all') return true;
    return limits.allowed_types.includes(blockType as typeof limits.allowed_types[number]);
  }

  const content = (
    <div className="space-y-5">
      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="block_palette" />
      )}

      {atLimit && (
        <p className="font-body text-xs text-brand-text-muted">
          Block limit reached ({limits.max_blocks}). {plan === 'free' ? 'Upgrade to Pro for more.' : ''}
        </p>
      )}
      {BLOCK_CATEGORIES.map((cat) => {
        const types = (Object.entries(BLOCK_TYPE_META) as [ContentBlockType, typeof BLOCK_TYPE_META[keyof typeof BLOCK_TYPE_META]][])
          .filter(([, meta]) => meta.category === cat.key);
        if (types.length === 0) return null;

        return (
          <div key={cat.key}>
            <h3 className="font-display text-xs font-700 tracking-wide uppercase text-brand-text-muted mb-2">
              {cat.label}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {types.map(([type, meta]) => {
                const allowed = isAllowed(type);
                const Icon = getLinkIcon(meta.icon);
                return (
                  <button
                    key={type}
                    onClick={() => allowed ? handleAdd(type) : setShowUpgrade(true)}
                    disabled={atLimit && allowed || adding}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left font-body text-xs font-medium
                      transition-colors duration-150
                      ${allowed && !atLimit
                        ? 'text-brand-text hover:bg-brand-surface-alt'
                        : 'text-brand-text-muted hover:bg-brand-surface-alt/50'
                      }`}
                    title={meta.label}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    {meta.label}
                    {!allowed && <Crown className="w-3 h-3 ml-auto text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (variant === 'sheet') {
    return (
      <div className="fixed inset-0 z-[55] flex items-end justify-center">
        <div
          className="absolute inset-0 bg-black/40"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}
          onClick={handleClose}
        />
        <div
          className="relative w-full max-w-lg bg-brand-surface rounded-t-2xl border-t border-brand-border px-5 py-6 pb-20 lg:pb-6 max-h-[70vh] overflow-y-auto"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            opacity: visible ? 1 : 0,
            transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-700 tracking-tight text-brand-text">Add Block</h2>
            <button onClick={handleClose} className="p-1 text-brand-text-muted hover:text-brand-text transition-colors duration-150">
              <X className="w-5 h-5" />
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  if (variant === 'popover') {
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
        />
        <div
          className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[50vh] overflow-y-auto
                      rounded-xl border border-brand-border shadow-lg bg-brand-surface p-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-700 tracking-tight text-brand-text">Add Block</h2>
            <button onClick={handleClose} className="p-1 text-brand-text-muted hover:text-brand-text transition-colors duration-150">
              <X className="w-4 h-4" />
            </button>
          </div>
          {content}
        </div>
      </>
    );
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
      <h2 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Add Blocks
      </h2>
      {content}
    </div>
  );
}
