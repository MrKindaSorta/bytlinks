/** NSFW domain blocklist — server-side validation on every link save */
export const BLOCKED_DOMAINS = [
  'onlyfans.com',
  'fansly.com',
  'manyvids.com',
  'loyalfans.com',
  'admireme.vip',
] as const;

/** Supported social platforms with display metadata */
export const SOCIAL_PLATFORMS = {
  x: { label: 'X (Twitter)', icon: 'twitter' },
  github: { label: 'GitHub', icon: 'github' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin' },
  youtube: { label: 'YouTube', icon: 'youtube' },
  instagram: { label: 'Instagram', icon: 'instagram' },
  tiktok: { label: 'TikTok', icon: 'music-2' },
  discord: { label: 'Discord', icon: 'message-circle' },
  twitch: { label: 'Twitch', icon: 'twitch' },
  mastodon: { label: 'Mastodon', icon: 'at-sign' },
  threads: { label: 'Threads', icon: 'at-sign' },
  bluesky: { label: 'Bluesky', icon: 'cloud' },
  email: { label: 'Email', icon: 'mail' },
  website: { label: 'Website', icon: 'globe' },
} as const;

/** Social icon display styles */
export const SOCIAL_ICON_STYLES = {
  plain: { label: 'Plain' },
  'circle-outline': { label: 'Circle Outline' },
  'circle-filled': { label: 'Circle Filled' },
  'square-outline': { label: 'Square Outline' },
  'square-filled': { label: 'Square Filled' },
} as const;

/** Link icon styles (same as social badges) */
export const LINK_ICON_STYLES = {
  plain: { label: 'Plain' },
  'circle-outline': { label: 'Circle Outline' },
  'circle-filled': { label: 'Circle Filled' },
  'square-outline': { label: 'Square Outline' },
  'square-filled': { label: 'Square Filled' },
} as const;

/** Link icon positions */
export const LINK_ICON_POSITIONS = {
  left: { label: 'Left of text' },
  right: { label: 'Right of text' },
  only: { label: 'Icon only' },
  above: { label: 'Above text' },
} as const;

/** Extensive categorized icon library for links (Lucide icon names) */
export const LINK_ICONS = {
  social: {
    label: 'Social',
    icons: [
      'twitter', 'github', 'linkedin', 'youtube', 'instagram', 'music-2',
      'message-circle', 'twitch', 'at-sign', 'cloud', 'mail', 'globe',
      'facebook', 'rss', 'podcast', 'radio',
    ],
  },
  general: {
    label: 'General',
    icons: [
      'link', 'external-link', 'arrow-right', 'arrow-up-right', 'star',
      'heart', 'bookmark', 'share-2', 'thumbs-up', 'thumbs-down',
      'plus', 'minus', 'check', 'x', 'info', 'help-circle',
      'alert-triangle', 'ban', 'search', 'filter', 'list',
    ],
  },
  media: {
    label: 'Media',
    icons: [
      'play', 'pause', 'skip-forward', 'volume-2', 'camera', 'image',
      'video', 'music', 'headphones', 'mic', 'film', 'clapperboard',
      'tv', 'monitor-play', 'cast', 'airplay', 'disc', 'radio',
    ],
  },
  business: {
    label: 'Business',
    icons: [
      'building-2', 'briefcase', 'dollar-sign', 'credit-card',
      'shopping-cart', 'shopping-bag', 'store', 'tag', 'receipt',
      'wallet', 'piggy-bank', 'trending-up', 'bar-chart-3', 'pie-chart',
      'line-chart', 'coins', 'badge-dollar-sign', 'banknote', 'landmark',
      'handshake', 'clipboard-list', 'file-spreadsheet',
    ],
  },
  tech: {
    label: 'Tech',
    icons: [
      'code', 'terminal', 'database', 'server', 'cpu', 'monitor',
      'laptop', 'smartphone', 'tablet', 'wifi', 'bluetooth', 'signal',
      'satellite', 'bot', 'bug', 'git-branch', 'git-commit',
      'git-pull-request', 'binary', 'braces', 'brackets', 'code-2',
      'cloud-download', 'cloud-upload', 'hard-drive', 'usb',
      'circuit-board', 'qr-code', 'scan', 'fingerprint',
    ],
  },
  creative: {
    label: 'Creative',
    icons: [
      'palette', 'brush', 'pen-tool', 'pencil', 'scissors', 'layers',
      'layout', 'grid-3x3', 'figma', 'frame', 'shapes', 'diamond',
      'gem', 'sparkles', 'wand-2', 'paintbrush', 'eraser', 'ruler',
      'pipette', 'blend', 'crop', 'move', 'type', 'italic',
    ],
  },
  education: {
    label: 'Education',
    icons: [
      'book-open', 'graduation-cap', 'library', 'file-text',
      'newspaper', 'scroll-text', 'award', 'trophy', 'medal', 'target',
      'brain', 'lightbulb', 'lamp', 'microscope', 'flask-conical',
      'atom', 'dna', 'beaker', 'calculator', 'notebook-pen',
    ],
  },
  lifestyle: {
    label: 'Lifestyle',
    icons: [
      'heart-pulse', 'activity', 'dumbbell', 'bike', 'person-standing',
      'baby', 'apple', 'coffee', 'utensils-crossed', 'beer', 'wine',
      'salad', 'leaf', 'tree-pine', 'flower-2', 'mountain', 'waves',
      'sun', 'moon', 'cloud-rain', 'snowflake', 'umbrella', 'wind',
      'rainbow', 'flame', 'zap', 'droplets', 'sprout',
    ],
  },
  travel: {
    label: 'Travel',
    icons: [
      'map-pin', 'navigation', 'compass', 'map', 'globe-2', 'plane',
      'car', 'train-front', 'ship', 'anchor', 'bus', 'truck', 'bike',
      'fuel', 'tent', 'mountain-snow', 'palm-tree', 'sunrise', 'sunset',
      'luggage', 'ticket', 'hotel',
    ],
  },
  communication: {
    label: 'Communication',
    icons: [
      'message-square', 'messages-square', 'send', 'inbox', 'mail-open',
      'at-sign', 'hash', 'phone', 'phone-call', 'video', 'voicemail',
      'megaphone', 'bell', 'bell-ring', 'siren', 'speech',
    ],
  },
  gaming: {
    label: 'Gaming',
    icons: [
      'gamepad-2', 'joystick', 'dice-1', 'dice-3', 'dice-5', 'puzzle',
      'crown', 'sword', 'shield', 'wand-2', 'ghost', 'skull',
      'crosshair', 'swords', 'trophy', 'flag', 'target',
    ],
  },
  misc: {
    label: 'More',
    icons: [
      'home', 'key', 'lock', 'unlock', 'settings', 'wrench', 'hammer',
      'rocket', 'gift', 'cake', 'party-popper', 'sparkle',
      'hand-metal', 'hand-heart', 'dog', 'cat', 'bird', 'fish',
      'rabbit', 'paw-print', 'eye', 'glasses', 'clock', 'timer',
      'calendar', 'alarm-clock', 'hourglass', 'battery', 'power',
      'download', 'upload', 'save', 'folder', 'file', 'archive',
      'trash-2', 'recycle', 'infinity', 'hash', 'asterisk',
    ],
  },
} as const;

/** Default theme applied to new pages */
export const DEFAULT_THEME = {
  base: 'minimal',
  colorMode: 'preset',
  preset: 'ink',
  buttonStyle: 'filled',
  fontPair: 'grotesque',
  animation: 'fade',
  socialStyle: 'icon-only',
  spacing: 'comfortable',
  layoutVariant: 'centered',
} as const;

/** Max links per page (free plan) */
export const MAX_LINKS_FREE = 100;

/** Max featured links */
export const MAX_FEATURED = 2;

/** Max embeds per page (MVP) */
export const MAX_EMBEDS = 5;

/** Content block limits by plan */
export const BLOCK_LIMITS = {
  free: {
    max_blocks: 5,
    allowed_types: ['embed', 'rich-link', 'quote', 'faq', 'countdown', 'stats', 'event'] as const,
  },
  pro: {
    max_blocks: 25,
    allowed_types: 'all' as const,
  },
} as const;

/** Block type metadata — labels, icons (Lucide), and categories */
export const BLOCK_TYPE_META = {
  embed: { label: 'Embed', icon: 'play', category: 'media' },
  microblog: { label: 'Updates', icon: 'message-square', category: 'content' },
  'rich-link': { label: 'Rich Link', icon: 'link', category: 'content' },
  'social-post': { label: 'Social Post', icon: 'share-2', category: 'media' },
  'image-gallery': { label: 'Image Gallery', icon: 'image', category: 'media' },
  collabs: { label: 'My Collabs', icon: 'users', category: 'social' },
  schedule: { label: 'My Schedule', icon: 'calendar', category: 'social' },
  poll: { label: 'Poll', icon: 'bar-chart-3', category: 'interactive' },
  testimonials: { label: 'Testimonials', icon: 'quote', category: 'content' },
  newsletter: { label: 'Newsletter Signup', icon: 'mail', category: 'interactive' },
  faq: { label: 'FAQ', icon: 'help-circle', category: 'content' },
  quote: { label: 'Quote / Text', icon: 'type', category: 'content' },
  'file-download': { label: 'File Download', icon: 'download', category: 'media' },
  countdown: { label: 'Countdown', icon: 'timer', category: 'content' },
  booking: { label: 'Book a Call', icon: 'calendar-check', category: 'interactive' },
  stats: { label: 'Stats / Numbers', icon: 'trending-up', category: 'content' },
  'tip-jar': { label: 'Payment Options', icon: 'heart', category: 'interactive' },
  event: { label: 'Event / Drop', icon: 'ticket', category: 'content' },
  'product-card': { label: 'Product Card', icon: 'shopping-bag', category: 'interactive' },
} as const;

/** Block types that span full width in 2-column desktop grid */
export const FULL_WIDTH_BLOCKS: readonly string[] = [
  'image-gallery', 'testimonials', 'social-post', 'newsletter',
] as const;

/** Block types that stay single-column in 2-column grid */
export const SINGLE_COL_BLOCKS: readonly string[] = [
  'quote', 'rich-link', 'countdown', 'stats', 'tip-jar',
  'file-download', 'faq', 'poll', 'microblog', 'event', 'product-card',
  'embed', 'collabs', 'schedule', 'booking',
] as const;

/** Resolve effective column span for a block (per-block override → block type default). */
export function resolveBlockColumnSpan(block: { block_type: string; column_span?: 'full' | 'half' | null }): 'full' | 'half' {
  if (block.column_span) return block.column_span;
  return FULL_WIDTH_BLOCKS.includes(block.block_type) ? 'full' : 'half';
}

/** Content display options metadata */
export const CONTENT_DISPLAY_META = {
  flow: { label: 'Flow', desc: 'Everything in one flow' },
  spotlight: { label: 'Spotlight', desc: 'Hero first, scroll to content' },
  sections: { label: 'Sections', desc: 'Named sections with navigation' },
  cards: { label: 'Cards', desc: 'Swipeable full-screen cards' },
} as const;

export type BlockCategory = 'content' | 'media' | 'interactive' | 'social';

export const BLOCK_CATEGORIES: { key: BlockCategory; label: string }[] = [
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'interactive', label: 'Interactive' },
  { key: 'social', label: 'Social' },
];
