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
  verified: boolean;
  verified_at: number | null;
  created_at: number;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  reviewed_at: number | null;
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
  job_title: string | null;
  profession: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  show_email_page: boolean;
  show_email_card: boolean;
  show_phone_page: boolean;
  show_phone_card: boolean;
  show_company_page: boolean;
  show_company_card: boolean;
  show_address_page: boolean;
  show_address_card: boolean;
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
  published_at: number | null;
  expires_at: number | null;
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

export type EmbedType = 'youtube' | 'spotify' | 'soundcloud' | 'vimeo' | 'apple-music' | 'tweet' | 'substack' | 'tidal' | 'bandcamp';

export interface EmbedBlock {
  id: string;
  page_id: string;
  type: EmbedType;
  embed_url: string;
  order_num: number;
}

/** Content block system — 19 block types users can add to their page */
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
  | 'event'
  | 'product-card';

export interface EmbedBlockData {
  embed_type: EmbedType;
  embed_url: string;
}

export interface MicroblogPost {
  id: string;
  text: string;
  created_at: number;
  image_r2_key?: string;
  link_url?: string;
  link_title?: string;
  post_type?: 'update' | 'announcement' | 'milestone';
}

export interface MicroblogData {
  posts: MicroblogPost[];
  char_limit?: number;
}

export interface RichLinkData {
  url: string;
  description: string;
  image_r2_key?: string;
  image_url?: string;
  display_mode: 'card' | 'compact' | 'featured';
  show_favicon: boolean;
}

export type SocialPostPlatform = 'twitter' | 'tiktok' | 'instagram' | 'bluesky';

export interface SocialPostData {
  platform: SocialPostPlatform | string;
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
  max_images?: number;
}

export interface CollabItem {
  username: string;
  relationship_label?: string;
}

export interface CollabsData {
  /** New format — preferred */
  items?: CollabItem[];
  /** Legacy format — kept for backward compat */
  usernames?: string[];
  display_style?: 'grid' | 'list';
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
  end_date?: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  avatar_r2_key?: string;
  source?: 'manual' | 'google' | 'trustpilot' | 'twitter';
  source_url?: string;
  rating?: number;
  imported_at?: number;
}

export interface TestimonialsData {
  items: TestimonialItem[];
  autoplay: boolean;
  autoplay_interval?: number;
  show_source_badge: boolean;
  show_rating_stars: boolean;
  import_source?: 'google' | 'trustpilot';
  import_url?: string;
  last_imported_at?: number;
}

export interface NewsletterData {
  heading: string;
  subtext?: string;
  button_label: string;
  sync_provider?: 'mailchimp' | 'convertkit' | 'none';
  mailchimp_audience_id?: string;
  mailchimp_datacenter?: string;
  convertkit_form_id?: string;
  success_message?: string;
  show_subscriber_count: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqData {
  items: FaqItem[];
  show_search?: boolean;
  search_placeholder?: string;
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
  show_download_count?: boolean;
  count_min_threshold?: number;
}

export interface CountdownData {
  target_date: string;
  label?: string;
  expired_text?: string;
  timezone: string;
  show_visitor_timezone: boolean;
  recurrence: 'none' | 'weekly' | 'monthly';
  recurrence_day?: number;
  recurrence_time?: string;
  reveal_enabled: boolean;
  reveal_image_r2_key?: string;
  reveal_headline?: string;
  reveal_description?: string;
  reveal_cta_label?: string;
  reveal_cta_url?: string;
  reveal_hide_after_hours?: number;
}

export interface BookingData {
  booking_url: string;
  provider?: 'calendly' | 'cal' | 'other';
}

export type StatSource = 'manual' | 'spotify_followers' | 'youtube_subscribers' | 'instagram_followers';

export interface StatItem {
  id?: string;
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  columns?: 1 | 2 | 3;
  source?: StatSource;
  source_url?: string;
  last_fetched_at?: number;
  live_value?: string;
}

export interface StatsData {
  items: StatItem[];
  animate?: boolean;
}

export type TipJarProvider = 'stripe' | 'kofi' | 'buymeacoffee' | 'paypal' | 'cashapp' | 'venmo';

export interface PaymentOption {
  id: string;
  provider: TipJarProvider;
  url: string;
  label?: string;
  suggested_amount?: string;
}

export interface TipJarData {
  options?: PaymentOption[];
  message?: string;
  goal_enabled?: boolean;
  goal_label?: string;
  goal_target?: string;
  goal_current?: string;
  goal_show_bar?: boolean;
  // Keep old fields for backward compat
  provider?: TipJarProvider;
  payment_url?: string;
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
  rsvp_enabled?: boolean;
  rsvp_mode?: 'interested' | 'full' | 'both';
  rsvp_button_label?: string;
  rsvp_form_heading?: string;
  rsvp_success_message?: string;
  rsvp_cap?: number;
  show_interested_count?: boolean;
  interested_count?: number;
}

export interface ProductItem {
  id: string;
  name: string;
  price?: string;
  description?: string;
  image_r2_key?: string;
  buy_url: string;
  badge?: string;
}

export interface ProductCardData {
  items: ProductItem[];
  layout: 'grid' | 'list';
  columns: 1 | 2 | 3;
  button_label: string;
  show_price: boolean;
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
  | EventData
  | ProductCardData;

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
  | 'microblog_expand'
  | 'product_click';

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

/** Business card configuration — users can have up to 3 cards */
export interface BusinessCard {
  id: string;
  page_id: string;
  label: string;
  order_num: number;
  show_avatar: boolean;
  show_job_title: boolean;
  show_bio: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_company: boolean;
  show_address: boolean;
  show_socials: boolean;
  access_token: string;
  created_at?: string;
}

/** Snapshot of a contact's card data stored in the rolodex */
export interface ContactSnapshot {
  display_name: string | null;
  bio: string | null;
  job_title: string | null;
  avatar_r2_key: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  theme: Record<string, unknown>;
  social_links: Array<{ platform: string; url: string }>;
}

/** A saved contact in the user's rolodex */
export interface RolodexEntry {
  id: string;
  owner_page_id: string;
  contact_username: string;
  contact_page_id: string | null;
  contact_snapshot: ContactSnapshot;
  notes: string;
  saved_at: string;
  last_refreshed_at: string;
}

/** A card exchange request between two users */
export interface CardExchange {
  id: string;
  from_page_id: string;
  from_username: string;
  to_page_id: string;
  to_username: string;
  status: 'pending' | 'accepted' | 'declined';
  card_snapshot: ContactSnapshot;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
}

/** Profile template definition for starter kits */
export interface ProfileTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  theme: Partial<Theme>;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
