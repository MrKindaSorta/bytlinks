import type { LayoutVariant, ContentDisplay, SectionsMode, SectionNavPosition, Spacing } from '@bytlinks/shared';

/* ── Layout wireframe mini-previews ── */

function LayoutWireframe({ variant }: { variant: LayoutVariant }) {
  const box = 'w-5 h-5 rounded-full bg-current opacity-30';
  const line1 = 'h-1.5 rounded-full bg-current opacity-25';
  const line2 = 'h-1 rounded-full bg-current opacity-15';

  if (variant === 'centered') {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <div className={box} />
        <div className={`${line1} w-10`} />
        <div className={`${line2} w-7`} />
        <div className="w-full h-px bg-current opacity-10 my-0.5" />
        <div className={`${line1} w-full`} />
        <div className={`${line1} w-full`} />
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="py-1">
        <div className="flex items-start gap-1.5">
          <div className="shrink-0 w-[30%] space-y-1">
            <div className={`${box} mx-auto`} style={{ width: 14, height: 14 }} />
            <div className={`${line2} w-full`} />
            <div className={`${line2} w-3/4 mx-auto`} />
          </div>
          <div className="w-px self-stretch bg-current opacity-10" />
          <div className="flex-1 space-y-1 pt-0.5">
            <div className={`${line1} w-full`} />
            <div className={`${line1} w-full`} />
            <div className={`${line1} w-3/4`} />
          </div>
        </div>
      </div>
    );
  }

  const isLeft = variant === 'left-photo';
  return (
    <div className="py-1">
      <div className={`flex items-start gap-2 ${isLeft ? '' : 'flex-row-reverse'}`}>
        <div className={`${box} shrink-0`} />
        <div className="flex-1 space-y-1 pt-0.5">
          <div className={`${line1} w-full`} />
          <div className={`${line2} w-3/4`} />
        </div>
      </div>
      <div className="w-full h-px bg-current opacity-10 my-1.5" />
      <div className="space-y-1">
        <div className={`${line1} w-full`} />
        <div className={`${line1} w-full`} />
      </div>
    </div>
  );
}

/* ── Content display wireframe mini-previews ── */

function ContentDisplayWireframe({ display }: { display: ContentDisplay }) {
  const line = 'h-1.5 rounded-full bg-current opacity-25 w-full';
  const lineFaint = 'h-1 rounded-full bg-current opacity-15 w-full';

  if (display === 'flow') {
    return (
      <div className="flex flex-col gap-1 py-1.5">
        <div className="w-4 h-4 rounded-full bg-current opacity-20 mx-auto" />
        <div className={line} />
        <div className={line} />
        <div className={line} />
      </div>
    );
  }

  if (display === 'spotlight') {
    return (
      <div className="flex flex-col py-1.5">
        <div className="flex-1 flex flex-col items-center justify-center gap-1 mb-1.5">
          <div className="w-4 h-4 rounded-full bg-current opacity-20" />
          <div className="h-1 rounded-full bg-current opacity-20 w-8" />
        </div>
        <div className="w-2.5 h-2.5 mx-auto opacity-30 mb-1">
          <svg viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8z" /></svg>
        </div>
        <div className="border-t border-current opacity-10 pt-1.5 space-y-1">
          <div className={lineFaint} />
          <div className={lineFaint} />
        </div>
      </div>
    );
  }

  if (display === 'sections') {
    return (
      <div className="flex flex-col py-1.5">
        {/* Nav tabs */}
        <div className="flex gap-0.5 mb-1.5">
          <div className="flex-1 h-2 rounded-sm bg-current opacity-30" />
          <div className="flex-1 h-2 rounded-sm bg-current opacity-12" />
          <div className="flex-1 h-2 rounded-sm bg-current opacity-12" />
        </div>
        <div className="space-y-1">
          <div className={line} />
          <div className={line} />
          <div className={lineFaint} />
        </div>
      </div>
    );
  }

  // cards
  return (
    <div className="flex flex-col py-1.5 items-center">
      <div className="w-full rounded-lg border border-current opacity-20 p-1.5 mb-1.5">
        <div className="h-1 rounded-full bg-current opacity-25 w-full mb-1" />
        <div className="h-1 rounded-full bg-current opacity-15 w-3/4" />
      </div>
      {/* Dots */}
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-15" />
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-15" />
      </div>
    </div>
  );
}

/* ── Configs ── */

const LAYOUTS: { key: LayoutVariant; label: string }[] = [
  { key: 'centered', label: 'Centered' },
  { key: 'left-photo', label: 'Left Photo' },
  { key: 'right-photo', label: 'Right Photo' },
  { key: 'sidebar', label: 'Sidebar' },
];

const CONTENT_DISPLAYS: { key: ContentDisplay; label: string; desc: string }[] = [
  { key: 'flow', label: 'Flow', desc: 'Everything in one flow' },
  { key: 'spotlight', label: 'Spotlight', desc: 'Hero first, scroll to content' },
  { key: 'sections', label: 'Sections', desc: 'Named sections with nav' },
  { key: 'cards', label: 'Cards', desc: 'Swipeable full-screen cards' },
];

const SECTIONS_MODES: { key: SectionsMode; label: string }[] = [
  { key: 'anchor', label: 'Anchor Scroll' },
  { key: 'paginated', label: 'Paginated' },
];

const NAV_POSITIONS: { key: SectionNavPosition; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
];

/* ── Component ── */

interface LayoutPickerProps {
  layoutVariant: LayoutVariant;
  contentDisplay: ContentDisplay;
  onChangeLayout: (v: LayoutVariant) => void;
  onChangeDisplay: (v: ContentDisplay) => void;
  twoColumnDesktop?: boolean;
  onChangeTwoColumn?: (v: boolean) => void;
  spacing?: Spacing;
  onChangeSpacing?: (v: Spacing) => void;
  sectionsMode?: SectionsMode;
  sectionNavPosition?: SectionNavPosition;
  onChangeSectionsMode?: (v: SectionsMode) => void;
  onChangeSectionNavPosition?: (v: SectionNavPosition) => void;
}

export function LayoutPicker({
  layoutVariant,
  contentDisplay,
  onChangeLayout,
  onChangeDisplay,
  twoColumnDesktop,
  onChangeTwoColumn,
  spacing,
  onChangeSpacing,
  sectionsMode,
  sectionNavPosition,
  onChangeSectionsMode,
  onChangeSectionNavPosition,
}: LayoutPickerProps) {
  const showSectionsOptions = (contentDisplay === 'sections' || contentDisplay === 'cards') && onChangeSectionsMode;
  const showTwoColumn = contentDisplay !== 'cards' && onChangeTwoColumn;

  return (
    <div className="space-y-5">
      {/* ── Profile Layout ── */}
      <div>
        <p className="font-body text-xs font-medium text-brand-text-muted mb-2">Profile Layout</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              onClick={() => onChangeLayout(l.key)}
              className={`rounded-xl border p-2.5 text-left transition-colors duration-150
                ${layoutVariant === l.key
                  ? 'border-brand-accent ring-2 ring-brand-accent/20'
                  : 'border-brand-border hover:border-brand-text-muted'
                }`}
            >
              <div className="text-brand-text px-1">
                <LayoutWireframe variant={l.key} />
              </div>
              <p className="font-body text-[10px] font-semibold text-brand-text mt-1.5 text-center">{l.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Display ── */}
      <div>
        <p className="font-body text-xs font-medium text-brand-text-muted mb-2">Content Display</p>
        <div className="grid grid-cols-2 gap-2">
          {CONTENT_DISPLAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => onChangeDisplay(d.key)}
              className={`rounded-xl border p-2.5 text-left transition-colors duration-150
                ${contentDisplay === d.key
                  ? 'border-brand-accent ring-2 ring-brand-accent/20'
                  : 'border-brand-border hover:border-brand-text-muted'
                }`}
            >
              <div className="text-brand-text px-1 min-h-[52px]">
                <ContentDisplayWireframe display={d.key} />
              </div>
              <p className="font-body text-[10px] font-semibold text-brand-text mt-1 text-center">{d.label}</p>
              <p className="font-body text-[9px] text-brand-text-muted text-center leading-tight">{d.desc}</p>
            </button>
          ))}
        </div>

        {/* Sections sub-options */}
        {showSectionsOptions && (
          <div className="mt-3 space-y-3">
            {contentDisplay === 'sections' && (
              <>
                <div>
                  <p className="font-body text-[11px] text-brand-text-muted mb-1.5">Section Mode</p>
                  <div className="flex gap-1.5">
                    {SECTIONS_MODES.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => onChangeSectionsMode?.(m.key)}
                        className={`font-body text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 flex-1 text-center
                          ${sectionsMode === m.key
                            ? 'bg-brand-accent text-white'
                            : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
                          }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-body text-[11px] text-brand-text-muted mb-1.5">Nav Position</p>
                  <div className="flex gap-1.5">
                    {NAV_POSITIONS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => onChangeSectionNavPosition?.(p.key)}
                        className={`font-body text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 flex-1 text-center
                          ${sectionNavPosition === p.key
                            ? 'bg-brand-accent text-white'
                            : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
                          }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2-Column Desktop toggle */}
        {showTwoColumn && (
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="font-body text-[11px] font-medium text-brand-text">2-Column Desktop</p>
              <p className="font-body text-[10px] text-brand-text-muted">Grid layout on larger screens</p>
            </div>
            <button
              onClick={() => onChangeTwoColumn?.(!twoColumnDesktop)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200
                ${twoColumnDesktop ? 'bg-brand-accent' : 'bg-brand-surface-alt'}`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: twoColumnDesktop ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        )}

        {/* Spacing */}
        {onChangeSpacing && (
          <div className="mt-3">
            <p className="font-body text-[11px] font-medium text-brand-text">Spacing</p>
            <div className="flex gap-1.5 mt-1.5">
              {(['compact', 'comfortable', 'airy'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeSpacing(s)}
                  className={`font-body text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 flex-1 text-center capitalize
                    ${spacing === s
                      ? 'bg-brand-accent text-white'
                      : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
