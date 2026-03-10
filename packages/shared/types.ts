/** Base style identifiers for the theme system */
export type BaseStyle =
  | 'minimal'
  | 'bold-type'
  | 'dark-pro'
  | 'glass'
  | 'brutalist'
  | 'editorial'
  | 'soft-warm'
  | 'neon-night'
  | 'paper'
  | 'gradient-flow'
  | 'grid'
  | 'retro';

export type ColorMode = 'style-default' | 'preset' | 'custom-simple' | 'custom-advanced';

export type ColorPreset =
  | 'midnight'
  | 'sand'
  | 'forest'
  | 'ink'
  | 'rose-gold'
  | 'arctic'
  | 'dusk'
  | 'ember'
  | 'ocean'
  | 'slate'
  | 'clay'
  | 'moss'
  | 'storm'
  | 'coral'
  | 'charcoal';

export type ButtonStyle =
  | 'filled'
  | 'outline'
  | 'outline-sharp'
  | 'pill'
  | 'pill-outline'
  | 'underline'
  | 'ghost'
  | 'shadow'
  | 'brutalist'
  | 'gradient'
  | 'soft';

export type FontPair =
  | 'mono-serif'
  | 'editorial'
  | 'grotesque'
  | 'slab'
  | 'humanist'
  | 'condensed'
  | 'geometric'
  | 'retro';

export type Animation =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'scale'
  | 'blur-in'
  | 'cascade'
  | 'typewriter';

export type AnimationSpeed = 'slowest' | 'slow' | 'default' | 'fast' | 'fastest';

export type BackgroundEffect =
  | 'none'
  | 'night-sky'
  | 'rain'
  | 'fireflies'
  | 'bokeh'
  | 'waves'
  // Deprecated — kept for DB backwards compat, rendered as 'none'
  | 'particles'
  | 'shooting-stars'
  | 'starfield'
  | 'aurora';

export interface NightSkyConfig {
  shootingStars: number; // 0–25
  staticStars: number;   // 0–300
  drift: number;         // 0–100
}

export interface RainConfig {
  drops: number;   // 0–600
  speed: number;   // 0–100
  angle: number;   // -60–60
  splash: number;  // 0–100
}

export interface FirefliesConfig {
  count: number;   // 0–180
  speed: number;   // 0–100
  glow: number;    // 0–100
  pulse: number;   // 0–100
}

export type SocialStyle =
  | 'icon-only'
  | 'circle'
  | 'circle-outline'
  | 'square'
  | 'pill-label'
  | 'minimal-row';

export type Spacing = 'compact' | 'comfortable' | 'airy';

export type LayoutVariant = 'centered' | 'left-photo' | 'right-photo';

/** How content is displayed — one unified choice, no conflicting combos.
 *  Legacy values (scroll, below-fold, hamburger, tab-bar) are mapped at runtime. */
export type ContentDisplay = 'flow' | 'spotlight' | 'sections' | 'cards';

/** Legacy content display values — kept for runtime migration only. */
export type LegacyContentDisplay = 'scroll' | 'below-fold' | 'hamburger' | 'tab-bar';

export type SectionsMode = 'anchor' | 'paginated';
export type SectionNavPosition = 'top' | 'bottom';

export interface ContentSection {
  id: string;        // nanoid
  label: string;     // user-editable name
  items: string[];   // e.g. ['links', 'block:abc', 'block:def']
}

export interface SectionsConfig {
  mode: SectionsMode;
  navPosition: SectionNavPosition;
  sections: ContentSection[];
}

export type HamburgerPosition = 'top-left' | 'top-right';

/** Desktop-specific layout overrides. When present, desktop renders with these
 *  values instead of the mobile defaults. Null/undefined = follow mobile. */
export interface DesktopOverrides {
  layoutVariant?: LayoutVariant;
  contentDisplay?: ContentDisplay;
  /** @deprecated Kept for migration only */
  hamburgerPosition?: HamburgerPosition;
}

/** Full theme object stored as JSON in bio_pages.theme */
export interface Theme {
  base: BaseStyle;
  colorMode: ColorMode;
  preset?: ColorPreset;
  customColors?: {
    primary: string;
    accent: string;
    text: string;
  };
  advancedColors?: Record<string, string>;
  buttonStyle: ButtonStyle | 'style-default';
  fontPair: FontPair | 'style-default';
  animation: Animation;
  animationSpeed: AnimationSpeed;
  socialStyle: SocialStyle;
  spacing: Spacing;
  layoutVariant: LayoutVariant;
  contentDisplay: ContentDisplay;
  /** @deprecated Kept for migration — use sectionsConfig instead */
  hamburgerPosition?: HamburgerPosition;
  sectionsConfig?: SectionsConfig | null;
  twoColumnDesktop?: boolean;
  backgroundEffect?: BackgroundEffect;
  backgroundIntensity?: number; // 0–100, default 50 (particles, bokeh, waves)
  nightSkyConfig?: NightSkyConfig;
  rainConfig?: RainConfig;
  firefliesConfig?: FirefliesConfig;
  desktopOverrides?: DesktopOverrides | null;
}

export type UserPlan = 'free' | 'pro' | 'business';

export interface User {
  id: string;
  email: string;
  plan: UserPlan;
  created_at: number;
}

export interface BioPage {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  about_me: string | null;
  about_me_expanded: boolean;
  avatar_r2_key: string | null;
  custom_domain: string | null;
  show_branding: boolean;
  theme: Theme;
  section_order: string[] | null;
  is_published: boolean;
  created_at: number;
}

export type LinkIconStyle = 'plain' | 'circle-outline' | 'circle-filled' | 'square-outline' | 'square-filled';
export type LinkIconPosition = 'left' | 'right' | 'only' | 'above';

export interface LinkStyleOverride {
  buttonStyle?: ButtonStyle;
  buttonBg?: string;
  buttonText?: string;
  iconStyle?: LinkIconStyle;
  iconPosition?: LinkIconPosition;
}

export interface Link {
  id: string;
  page_id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  is_featured: boolean;
  is_visible: boolean;
  order_num: number;
  click_count: number;
  style_overrides?: LinkStyleOverride | null;
  created_at: number;
}

export type SocialPlatform =
  | 'x'
  | 'github'
  | 'linkedin'
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'discord'
  | 'twitch'
  | 'mastodon'
  | 'threads'
  | 'bluesky'
  | 'email'
  | 'website';

export type SocialIconStyle = 'plain' | 'circle-outline' | 'circle-filled' | 'square-outline' | 'square-filled';

export interface SocialLink {
  id: string;
  page_id: string;
  platform: SocialPlatform;
  url: string;
  icon_style: SocialIconStyle;
  order_num: number;
}

export type EmbedType = 'youtube' | 'spotify' | 'tweet' | 'substack';

export interface EmbedBlock {
  id: string;
  page_id: string;
  type: EmbedType;
  embed_url: string;
  order_num: number;
}

/** Content block system — 18 block types users can add to their page */
export type ContentBlockType =
  | 'embed'
  | 'microblog'
  | 'rich-link'
  | 'social-post'
  | 'image-gallery'
  | 'collabs'
  | 'schedule'
  | 'poll'
  | 'testimonials'
  | 'newsletter'
  | 'faq'
  | 'quote'
  | 'file-download'
  | 'countdown'
  | 'booking'
  | 'stats'
  | 'tip-jar'
  | 'event';

export interface EmbedBlockData {
  embed_type: EmbedType;
  embed_url: string;
}

export interface MicroblogPost {
  id: string;
  text: string;
  created_at: number;
}

export interface MicroblogData {
  posts: MicroblogPost[];
}

export interface RichLinkData {
  url: string;
  description: string;
  image_r2_key?: string;
}

export interface SocialPostData {
  platform: string;
  post_url: string;
  fallback_text?: string;
}

export interface GalleryImage {
  r2_key: string;
  alt?: string;
  caption?: string;
}

export interface ImageGalleryData {
  layout: 'single' | 'carousel' | 'grid';
  images: GalleryImage[];
}

export interface CollabsData {
  usernames: string[];
}

export interface ScheduleData {
  calendar_url: string;
  provider?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  closed: boolean;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  avatar_r2_key?: string;
}

export interface TestimonialsData {
  items: TestimonialItem[];
}

export interface NewsletterData {
  heading: string;
  subtext?: string;
  button_label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqData {
  items: FaqItem[];
}

export type QuoteStyle = 'callout' | 'centered' | 'highlight' | 'minimal';

export interface QuoteData {
  text: string;
  attribution?: string;
  style: QuoteStyle;
}

export interface FileDownloadData {
  r2_key: string;
  filename: string;
  file_size: number;
  button_label?: string;
}

export interface CountdownData {
  target_date: string;
  label?: string;
  expired_text?: string;
}

export interface BookingData {
  booking_url: string;
  provider?: 'calendly' | 'cal' | 'other';
}

export interface StatItem {
  value: string;
  label: string;
}

export interface StatsData {
  items: StatItem[];
  animate?: boolean;
}

export type TipJarProvider = 'stripe' | 'kofi' | 'buymeacoffee';

export interface TipJarData {
  provider: TipJarProvider;
  payment_url: string;
  button_label?: string;
  amount?: string;
}

export interface EventLink {
  id: string;
  label: string;
  url: string;
}

export interface EventData {
  event_name: string;
  event_date: string;
  venue: string;
  ticket_url?: string;
  image_r2_key?: string;
  expandable?: boolean;
  details?: string;
  links?: EventLink[];
}

export type ContentBlockData =
  | EmbedBlockData
  | MicroblogData
  | RichLinkData
  | SocialPostData
  | ImageGalleryData
  | CollabsData
  | ScheduleData
  | PollData
  | TestimonialsData
  | NewsletterData
  | FaqData
  | QuoteData
  | FileDownloadData
  | CountdownData
  | BookingData
  | StatsData
  | TipJarData
  | EventData;

export interface ContentBlock {
  id: string;
  page_id: string;
  block_type: ContentBlockType;
  title: string | null;
  data: ContentBlockData;
  is_visible: boolean;
  /** Per-block column span override for 2-column desktop grid. null = use block type default. */
  column_span?: 'full' | 'half' | null;
  created_at: number;
}

export type EventType =
  | 'page_view'
  | 'link_click'
  | 'social_click'
  | 'rich_link_click'
  | 'faq_expand'
  | 'embed_interact'
  | 'social_post_click'
  | 'gallery_view'
  | 'collab_click'
  | 'schedule_click'
  | 'file_download'
  | 'poll_vote'
  | 'newsletter_signup'
  | 'booking_click'
  | 'tip_click'
  | 'event_ticket_click'
  | 'event_expand'
  | 'event_link_click'
  | 'event_calendar_add'
  | 'testimonial_navigate'
  | 'countdown_view'
  | 'stats_view'
  | 'quote_view'
  | 'microblog_expand';

export interface AnalyticsEvent {
  id: string;
  page_id: string;
  link_id: string | null;
  event_type: EventType;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device_type: 'mobile' | 'desktop' | 'tablet' | null;
  browser: string | null;
  os: string | null;
  session_id: string | null;
  timestamp: number;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
