# BytLinks Block System — Major Feature Sprint

You are working on the BytLinks codebase. This is a large, multi-part feature sprint.
You MUST follow these rules for the entire session:

---

## GLOBAL RULES (read before touching any file)

1. Work through each SPRINT in order. Do not skip ahead.
2. Before starting each sprint, explicitly state: "Starting Sprint X: [name]"
3. After completing each sprint, explicitly state: "Sprint X complete. Files changed: [list]"
4. Do NOT refactor code unrelated to the task at hand. Surgical changes only.
5. After every file change, verify it compiles with no TypeScript errors before moving on.
6. Never hardcode plan tiers inside component files — always reference BLOCK_LIMITS from @bytlinks/shared.
7. Never use inline styles — CSS custom properties and Tailwind only.
8. All new block data fields must be added to both the TypeScript interface in packages/shared/types.ts AND have sensible defaults in the relevant DEFAULT_DATA constant.
9. All new API endpoints must have auth middleware applied where required.
10. All new Worker endpoints must validate input before processing.
11. For any database changes, create a new migration file in /migrations/ — never modify schema.sql directly. **IMPORTANT: Migrations 001–010 are already taken. All new migrations must start from 011 and increment sequentially (011, 012, 013, etc.).**
12. If you are unsure about an existing pattern, read the relevant existing file first before writing new code. Do not guess.
13. Confirm completion of each numbered task within a sprint before moving to the next.
14. Before implementing any sub-task, verify whether it was already completed in a prior session. If the existing implementation matches the spec, confirm it's correct and skip. If there are gaps, only build what is genuinely missing.

---

## PRE-SPRINT CHECKLIST

Before starting Sprint 1, answer these questions by reading the codebase:

**A.** Does the bio_pages table have a `profession` or `job_title` column? Check schema.sql and all migration files.

**B.** What does DEFAULT_DATA look like for the existing `newsletter`, `poll`, `countdown`, `event`, `testimonials`, `stats`, `tip-jar`, `collabs`, `booking`, `schedule`, `social-post`, `microblog`, and `image-gallery` blocks? Find and list them all.

**C.** What does the main sidenav/sidebar navigation component look like and where does it live? How are new top-level nav items added?

**D.** Does a `scheduled_events` or `cron` pattern exist in the Worker already (wrangler.toml scheduled triggers)?

**E.** What does the existing plan enforcement check look like in blocks.ts? Show the exact code.

**F.** What free-tier block types does the server allow vs. the client? Confirm whether the Sprint 0 bug fix (free-tier type mismatch) from the previous session has already been applied.

Do not begin Sprint 1 until you have answered all six questions above.

### Pre-Sprint Answers (verified March 2026)

> **A.** NO — `bio_pages` has no `profession` or `job_title` columns. Migration needed in Sprint 12.
>
> **B.** DEFAULT_DATA lives in `BlockPalette.tsx` (lines 9-28), not in shared types. All 18 block types covered.
>
> **C.** Dashboard sidenav is in `apps/web/src/pages/Dashboard.tsx`. Tab system with `DashboardTab` type union and `tabs` array. Add new entries to `tabs`, `TAB_ICONS`, the type union, and the render switch.
>
> **D.** NO — No cron triggers in wrangler.toml. No scheduled handler in index.ts. Must be added fresh in Sprint 7.
>
> **E.** Plan enforcement in `blocks.ts` uses `BLOCK_LIMITS` from `@bytlinks/shared/constants` with `(limits.allowed_types as readonly string[]).includes(body.block_type)` cast. Both POST create and POST duplicate endpoints enforce limits.
>
> **F.** Server and client MATCH — both import `BLOCK_LIMITS` from `@bytlinks/shared/constants`. Free tier: 3 blocks, types `['embed', 'rich-link', 'quote', 'faq', 'countdown', 'stats', 'event']`. Fixed in prior session.

---

## SPRINT 1 — Microblog → Updates Block Upgrade

Rename and expand the microblog block into a proper "Updates" feed.

### 1.1 — Rename
- Change the block_type display label from "Microblog" to "Updates" everywhere it appears in the UI (BlockPalette, editor headers, analytics labels).
- Do NOT change the block_type string value `'microblog'` in the database or TypeScript union — only the display label changes.

### 1.2 — Extend MicroblogPost type
In `packages/shared/types.ts`, update MicroblogPost to:

> **CLARIFICATION:** Keep `created_at` as `number` (unix epoch) — do NOT change to `string`. Existing database records use `number`. Display in renderer using `new Date(post.created_at * 1000)`.

```typescript
interface MicroblogPost {
  id: string;
  text: string;
  created_at: number;           // KEEP as number (unix epoch) — NOT string
  image_r2_key?: string;
  link_url?: string;
  link_title?: string;
  post_type?: 'update' | 'announcement' | 'milestone'; // default: 'update'
}
```

Update MicroblogData to reflect a char limit of 500.

### 1.3 — MicroblogEditor.tsx updates
- Replace the plain textarea with a small composer UI:
  - Text area: 500 char limit, counter turns amber at 400, red at 480.
  - Optional image upload button below the text area (reuse existing `uploadFile` hook). Single image per post. Stores `r2_key`.
  - Optional URL field (label: "Add a link") that reveals a link title field when a URL is entered.
  - Post type selector: three small pill buttons — "Update" / "Announcement" / "Milestone". Defaults to "Update".

### 1.4 — MicroblogRenderer.tsx updates
- If a post has `image_r2_key`, render the image below the text using `/api/public/file/{r2_key}`. Constrain to block width with `rounded-lg`.
- If a post has `link_url`, render a compact link preview card below the text/image: Google favicon service, `link_title` or domain, external link icon. Opens in new tab.
- If `post_type` is `'announcement'`, add a small colored left border using the teal accent CSS variable.
- If `post_type` is `'milestone'`, add a small trophy icon prefix (use Lucide `Trophy`).
- **Wire the missing analytics call:** import `trackEvent` and fire `microblog_expand` on the "Show more" button click. This was identified as a gap in the audit. **CLARIFICATION: Verify first — `microblog_expand` is already in `EventType` and may already be tracked in MicroblogRenderer. If already wired, confirm and skip.**

---

## SPRINT 2 — Countdown Block — Timezone, Recurrence & Post-Expiry Reveal

Read `CountdownRenderer.tsx` and `CountdownEditor.tsx` fully before writing any code.

### 2.1 — Extend CountdownData type

```typescript
interface CountdownData {
  // Existing
  target_date: string;
  label?: string;
  expired_text?: string; // kept for backward compat, deprecated in favor of reveal

  // Timezone
  timezone: string;              // IANA string e.g. "America/New_York", default "UTC"
  show_visitor_timezone: boolean; // show "X:XXpm your time" label, default true

  // Recurrence
  recurrence: 'none' | 'weekly' | 'monthly'; // default 'none'
  recurrence_day?: number;   // 0–6 for weekly, 1–28 for monthly
  recurrence_time?: string;  // "HH:MM" 24hr

  // Post-expiry reveal — all optional, all user-configurable
  reveal_enabled: boolean;
  reveal_image_r2_key?: string;
  reveal_headline?: string;
  reveal_description?: string;
  reveal_cta_label?: string;
  reveal_cta_url?: string;
  reveal_hide_after_hours?: number; // hide block entirely N hours after expiry
}
```

### 2.2 — CountdownEditor.tsx updates

Add three new collapsible editor sections:

**Section A: Timezone Settings**
- Searchable dropdown of the 50 most common IANA timezones. Show offset next to each e.g. "Eastern Time (UTC-5)". Hardcode the list — do not import a timezone library.
- Toggle: "Show visitors their local time."

**Section B: Repeat Settings**
- Recurrence selector: None / Weekly / Monthly.
- If Weekly: day-of-week button picker (Mon–Sun).
- If Monthly: number input, day of month, capped at 28.
- Time input (HH:MM).

**Section C: Post-Expiry Reveal**
- Toggle: "Show content after countdown ends" (`reveal_enabled`). Everything below is hidden unless toggled on.
- Image upload (optional, reuse `uploadFile` hook).
- Headline text input (optional).
- Description textarea (optional).
- CTA button label + URL inputs (optional, both required together — validate that if one is filled, both must be).
- "Hide block after" number input + "hours" label (optional, leave blank = never hide).

### 2.3 — CountdownRenderer.tsx updates

**Timezone handling:**
- Parse `target_date` in the configured `timezone` using the `Intl.DateTimeFormat` API. No external date library.
- When `show_visitor_timezone` is true, display the target date/time converted to the visitor's local timezone using `Intl.DateTimeFormat` with the user's locale. Show as a small subtitle: "That's [time] in your timezone."

**Recurrence handling:**
- When `recurrence` is not `'none'`, compute the next occurrence from the current time instead of using `target_date` directly. For weekly: find the next matching day-of-week + time. For monthly: find the next matching day-of-month + time. If the computed time is in the past (e.g., today is Wednesday and recurrence is "every Wednesday"), advance by one period.

**Post-expiry reveal:**
- When `getTimeLeft()` returns null (expired) AND `reveal_enabled` is true, render the reveal panel instead of the expired_text.
- Reveal panel renders whichever combination of fields the user has configured: image (full block width, rounded-lg), headline (large text), description (body text), CTA button (teal, pill style).
- If `reveal_hide_after_hours` is set, calculate whether the block should be fully hidden (`Date.now() > expiry_timestamp + reveal_hide_after_hours * 3600000`). If so, render nothing.
- Animate the transition from countdown → reveal with a fade (CSS transition, not a library).

---

## SPRINT 3 — Rich Link Block — OG Auto-Fetch + Display Modes

Read `RichLinkEditor.tsx` and `RichLinkRenderer.tsx` fully before starting.

### 3.1 — OG Scraper Endpoint

> **CLARIFICATION: `ogScraper.ts` and `GET /api/blocks/og?url=<encoded>` already exist from a prior session.** Verify the existing implementation covers all required fields (`title`, `description`, `image_url`, `site_name`). If it does, reuse it — do NOT create a duplicate at `/api/utils/og`. The RichLinkEditor already calls `/api/blocks/og`. Only fix gaps if any fields are missing.

Spec for reference (existing implementation should match):
- Export an async function `fetchOgData(url: string)` that fetches the URL, reads the HTML head, and extracts: `og:title`, `og:description`, `og:image`, `og:site_name`, and the page `<title>` as fallback.
- Use basic string/regex parsing — do not import an HTML parser library.
- Timeout the fetch after 5 seconds.
- Return `{ title, description, image_url, site_name }` — all fields optional.
- Cache results in a Worker-level Map for 1 hour keyed by URL.

### 3.2 — Extend RichLinkData type

```typescript
interface RichLinkData {
  url: string;
  title?: string;
  description?: string;
  image_r2_key?: string;    // existing
  image_url?: string;       // NEW — OG image URL (external, not uploaded)
  display_mode: 'card' | 'compact' | 'featured'; // NEW — default 'card'
  show_favicon: boolean;    // NEW — default true
}
```

### 3.3 — RichLinkEditor.tsx updates
- After the URL field, add a "Fetch from URL" button. On click, call `GET /api/utils/og?url=...` and auto-populate the title, description, and image_url fields. Show a loading spinner on the button during the fetch. Show a toast if the fetch fails: "Couldn't fetch page data — fill in manually."
- Add a Display Mode picker: three options with small visual previews — Card (current look), Compact (one line), Featured (large image header). Use small icon + label buttons.

### 3.4 — RichLinkRenderer.tsx updates
- **Compact mode:** Single-line layout — favicon + title + domain + external arrow. No description, no image.
- **Card mode:** Current behavior (existing code path).
- **Featured mode:** Large image at top (use `image_url` if available, fall back to `image_r2_key`, fall back to no image). Bold title below, description, domain + favicon at bottom, full-width CTA button.
- When `show_favicon` is false, omit the favicon in all modes.

---

## SPRINT 4 — Embed Block — Provider Config Map + New Providers

Read `EmbedRenderer.tsx` and `EmbedEditor.tsx` fully before starting.

### 4.1 — Extend provider config map

> **CLARIFICATION: `embedProviders.ts` already exists with 5 providers (YouTube, Spotify, SoundCloud, Vimeo, Apple Music). The EmbedEditor and EmbedRenderer already use auto-detection and the provider map.** Only add the 3 missing providers: **Tidal, Bandcamp, Substack**. Verify no hardcoded switches remain in the editor/renderer — everything should route through the provider map.

File: `apps/web/src/components/page/blocks/embedProviders.ts`:

```typescript
export interface EmbedProvider {
  id: string;
  label: string;
  match: RegExp;
  getEmbedSrc: (url: string) => string | null;
  aspectRatio?: '16/9' | '1/1' | 'audio'; // 'audio' = fixed height 152px
  thumbnail?: (url: string) => string | null;
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    match: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    getEmbedSrc: (url) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
    },
    aspectRatio: '16/9',
    thumbnail: (url) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
    },
  },
  {
    id: 'spotify',
    label: 'Spotify',
    match: /open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/,
    getEmbedSrc: (url) => {
      const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
      return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
    },
    aspectRatio: 'audio',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    match: /soundcloud\.com/,
    getEmbedSrc: (url) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%230d9488&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`,
    aspectRatio: 'audio',
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    match: /vimeo\.com\/(\d+)/,
    getEmbedSrc: (url) => {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?dnt=1` : null;
    },
    aspectRatio: '16/9',
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    match: /music\.apple\.com/,
    getEmbedSrc: (url) => url.replace('music.apple.com', 'embed.music.apple.com'),
    aspectRatio: 'audio',
  },
  {
    id: 'tidal',
    label: 'Tidal',
    match: /tidal\.com\/(track|album|playlist)\/(\d+)/,
    getEmbedSrc: (url) => {
      const match = url.match(/tidal\.com\/(track|album|playlist)\/(\d+)/);
      return match ? `https://embed.tidal.com/${match[1]}s/${match[2]}` : null;
    },
    aspectRatio: 'audio',
  },
  {
    id: 'bandcamp',
    label: 'Bandcamp',
    match: /bandcamp\.com/,
    getEmbedSrc: (url) => `https://bandcamp.com/EmbeddedPlayer/v=2/url=${encodeURIComponent(url)}/size=large/tracklist=false/artwork=small/`,
    aspectRatio: 'audio',
  },
  {
    id: 'substack',
    label: 'Substack',
    match: /substack\.com/,
    getEmbedSrc: (url) => url.endsWith('/embed') ? url : `${url}/embed`,
    aspectRatio: '16/9',
  },
];

export function detectProvider(url: string): EmbedProvider | null {
  return EMBED_PROVIDERS.find(p => p.match.test(url)) ?? null;
}
```

### 4.2 — Verify EmbedEditor.tsx

> **CLARIFICATION: EmbedEditor already uses a single URL input with auto-detection via `detectProvider()`.** Verify the following are correct:
> - Detection badge shows for all 8 providers (including the 3 new ones).
> - Warning message lists all 8 provider names when no match is found.
> - Raw URL is stored in `embed_url` field.
> If all correct, skip. If gaps exist, fix them.

### 4.3 — Verify EmbedRenderer.tsx

> **CLARIFICATION: EmbedRenderer already imports `detectProvider` from `embedProviders.ts`.** Verify:
> - No hardcoded provider switches remain.
> - `aspectRatio` is respected (audio = 152px, 16/9 = padding-top container).
> - YouTube thumbnail-before-load works via `provider.thumbnail?.(data.url)`.
> - Unknown providers show "Unsupported embed URL" error state.
> Fix any gaps found.

---

## SPRINT 5 — Social Post Block — Platform Expansion + CLS Fix

Read `SocialPostRenderer.tsx` and `SocialPostEditor.tsx` fully before starting.

### 5.1 — Extend SocialPostData type

```typescript
type SocialPostPlatform = 'twitter' | 'tiktok' | 'instagram' | 'bluesky';

interface SocialPostData {
  url: string;
  platform: SocialPostPlatform; // auto-detected from URL
}
```

### 5.2 — New Worker endpoint: Social Post pre-render
Create `GET /api/utils/oembed?url=<encoded_url>` (auth required).

This endpoint should:
- Detect the platform from the URL using these patterns:
  - Twitter/X: `twitter.com` or `x.com`
  - TikTok: `tiktok.com`
  - Bluesky: `bsky.app`
  - Instagram: `instagram.com`
- For Twitter/X: fetch `https://publish.twitter.com/oembed?url={url}&dnt=true&theme=dark` (no API key required).
- For TikTok: fetch `https://www.tiktok.com/oembed?url={url}` (no API key required).
- For Bluesky: fetch `https://embed.bsky.app/oembed?url={url}` (no API key required).
- For Instagram: For now, return `{ platform: 'instagram', fallback: true, url }` — do not attempt the Meta oEmbed API yet (that requires a separate Facebook app approval process — leave a clear TODO comment).
- Cache results in D1: create migration **`011_oembed_cache.sql`** ~~`009_oembed_cache.sql`~~ with table `oembed_cache (url TEXT PRIMARY KEY, platform TEXT, html TEXT, cached_at INTEGER)`. Cache for 24 hours. **(Migration 009 is already taken by link_scheduling.)**
- Return `{ platform, html?, fallback?, url }`.

### 5.3 — Auto-detect platform in editor
In `SocialPostEditor.tsx`, on URL input/paste, detect the platform from the URL and update `data.platform` automatically. Show detected platform as a badge. Supported platforms: Twitter/X, TikTok, Bluesky, Instagram (with a note: "Instagram embeds require app review — may show as link card").

### 5.4 — SocialPostRenderer.tsx updates

**CLS Fix (applies to all platforms):**
- Wrap the embed container in a div with `min-height: 300px` and a skeleton placeholder (animate-pulse, gray background, rounded-lg) that is shown until the embed loads.
- For Twitter/X: fetch the pre-rendered HTML from `/api/utils/oembed` on mount. Set the returned HTML via `dangerouslySetInnerHTML`. Load `platform.twitter.com/widgets.js` once via a script tag. Use a `MutationObserver` or `setTimeout(1500)` fallback to remove the skeleton when the iframe appears.
- For TikTok: fetch from `/api/utils/oembed`, render HTML, load `https://www.tiktok.com/embed.js`. Same skeleton removal logic.
- For Bluesky: fetch from `/api/utils/oembed`, render the returned HTML directly. No additional script required — Bluesky embeds are static iframes.
- For Instagram (fallback): render a styled link card showing the Instagram URL, Instagram icon, and "View on Instagram" label. Do not attempt an iframe.

---

## SPRINT 6 — Image Gallery Block — Bulk Upload, Limits & Mobile Layout

Read `ImageGalleryEditor.tsx` and `ImageGalleryRenderer.tsx` fully before starting.

### 6.1 — Enforce image limit

> **CLARIFICATION: ImageGalleryEditor already has `MAX_IMAGES = 20`, enforces the cap in the UI (disables add button, shows "X/20"), and handles bulk upload with progress ("3/7").** Verify the following gaps:
> - Server-side validation in blocks.ts PUT handler (this is likely missing — add it).
> - `max_images` field in the ImageGalleryData type and DEFAULT_DATA (add if missing).
> - Mid-batch cap enforcement: if uploading 7 images but only 3 slots remain, stop after 3 and notify.

- Add `max_images: 20` to the ImageGalleryData type and DEFAULT_DATA.
- In `ImageGalleryEditor.tsx`, verify the 20-image cap is enforced in the UI. Add server-side validation in blocks.ts PUT handler if missing.

### 6.2 — Bulk upload

> **CLARIFICATION: Multi-file upload with `<input type="file" multiple>`, sequential processing, and progress indicator already exist in ImageGalleryEditor.** Verify that the mid-batch cap enforcement works: if uploading 7 images but only 3 slots remain, it should stop after 3 and notify. Fix if missing, skip if correct.

### 6.3 — Reorder uploaded images

> **CLARIFICATION: Check if `@dnd-kit/core` and `@dnd-kit/sortable` are in `apps/web/package.json`. If installed, use them. If NOT installed, use simple up/down arrow buttons instead (ImageGalleryEditor already has `moveImage()` with up/down arrows — verify and enhance if needed). Do NOT add new npm packages without confirming they're already present.**

- Add drag-and-drop reordering for uploaded images using `@dnd-kit` if available. Each image should show a drag handle icon on hover. Fall back to up/down arrow buttons if @dnd-kit is not installed.

### 6.4 — Mobile layout default change

> **CLARIFICATION: Current default is `'single'`, not `'carousel'`. Change `'single'` → `'grid'` as the sprint intends.**

- Change the default `layout` value in ImageGalleryData DEFAULT_DATA from `'single'` to `'grid'`.
- In `ImageGalleryRenderer.tsx`, ensure the grid layout is 2-column and each image is tappable to open the lightbox.
- Add caption overlay in the lightbox: when an image with a caption is open in the lightbox, show the caption text in a semi-transparent bar at the bottom of the image.

---

## SPRINT 7 — Stats Block — Live Data Sources

Read `StatsRenderer.tsx` and `StatsEditor.tsx` fully before starting.

### 7.1 — Extend StatItem type

```typescript
interface StatItem {
  id: string;
  label: string;
  value: string;           // existing — used for manual/cached value display
  prefix?: string;
  suffix?: string;
  columns?: 1 | 2 | 3;

  // NEW live data fields
  source: 'manual' | 'spotify_followers' | 'youtube_subscribers' | 'instagram_followers';
  source_url?: string;     // the artist/channel/profile URL to fetch from
  last_fetched_at?: number; // unix timestamp of last successful fetch
  live_value?: string;     // the last fetched value, overrides `value` when source !== 'manual'
}
```

### 7.2 — New Worker endpoints for live data

Create `apps/worker/src/utils/liveStats.ts` with the following fetchers:

> **CLARIFICATION: When `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, or `YOUTUBE_API_KEY` env secrets are not set, the relevant endpoint must return `{ error: 'not_configured', message: '<PROVIDER> credentials not set in Worker environment' }` with HTTP 503. Never fail silently.**

**Spotify followers:**
- Extract artist ID from a Spotify artist URL (`open.spotify.com/artist/{id}`).
- Call `https://api.spotify.com/v1/artists/{id}` using a Client Credentials token (store `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as Worker secrets). The followers field is `followers.total`.
- Token management: cache the access token in a Worker-level variable with expiry.

**YouTube subscribers:**
- Extract channel ID from a YouTube channel URL. Handle both `/channel/{id}` and `/@handle` formats. For `/@handle` format, first call the YouTube Search API to resolve the handle to a channel ID.
- Call `https://www.googleapis.com/youtube/v3/channels?part=statistics&id={channelId}&key={YOUTUBE_API_KEY}`. The subscriber count is `statistics.subscriberCount`.
- Store `YOUTUBE_API_KEY` as a Worker secret.

**Instagram followers:**
- Fetch the public Instagram profile page HTML (`https://www.instagram.com/{username}/`).
- Extract the follower count from the page meta tags or JSON-LD. This is a scrape — mark with a comment `// NOTE: scrape-based, may break if Instagram changes their page structure`.
- Extract the username from the Instagram profile URL.

Create a new route: `POST /api/stats/refresh` (auth required). Body: `{ block_id: string, stat_id: string }`. Fetches the live value for that stat item, updates the block's data JSON in D1, returns the updated value. Used by the manual refresh button in the editor.

### 7.3 — Scheduled refresh (cron)

In `wrangler.toml`, add a cron trigger (check if one already exists first — see pre-sprint checklist item D):
```toml
[triggers]
crons = ["0 */6 * * *"]
```

In the Worker's `scheduled` handler, query all content_blocks where `block_type = 'stats'`, parse the data JSON, find stat items where `source !== 'manual'`, and refresh each one using the appropriate fetcher from `liveStats.ts`. Update the block data in D1. Batch in groups of 10 to avoid overwhelming the Worker.

### 7.4 — StatsEditor.tsx updates
- For each stat item, add a `source` selector dropdown: "Manual" / "Spotify Followers" / "YouTube Subscribers" / "Instagram Followers".
- When a live source is selected, show a URL input field labeled appropriately ("Spotify artist URL", "YouTube channel URL", "Instagram profile URL").
- Add a "Refresh now" button per stat item that calls `POST /api/stats/refresh`. Show the last fetched timestamp below the value when a live source is active: "Last updated: 3 hours ago."
- Show a "Coming Soon" section below the active sources listing: GitHub Stars, TikTok Followers, Twitch Subscribers, Twitter Followers — displayed as grayed-out disabled options with a "Coming Soon" badge.

### 7.5 — StatsRenderer.tsx fix

> **CLARIFICATION: `stats_view` is already in the `EventType` union. Verify whether any `as never` cast exists in StatsRenderer.tsx. If the cast is gone and `stats_view` is in EventType, confirm fixed and skip that sub-task. The replayable counter animation was already implemented in a prior session (IntersectionObserver resets `animatingRef.current` on viewport exit). Verify and skip if already working.**

- Verify `'stats_view'` is in the EventType union and no `as never` cast remains. Fix if needed.
- Verify counter animation resets when element leaves viewport. Fix if needed.

---

## SPRINT 8 — Testimonials Block — Auto-Pull from Review Sources

Read `TestimonialsEditor.tsx` and `TestimonialsRenderer.tsx` fully before starting.

### 8.1 — Extend TestimonialsData type

```typescript
interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  avatar_r2_key?: string;
  source?: 'manual' | 'google' | 'trustpilot' | 'twitter';
  source_url?: string;      // link to the original review/tweet
  rating?: number;          // 1–5 stars, optional
  imported_at?: number;     // unix timestamp
}

interface TestimonialsData {
  items: TestimonialItem[];
  autoplay: boolean;              // existing
  autoplay_interval?: number;     // existing
  // NEW
  show_source_badge: boolean;     // show "Google", "Trustpilot", "X" badge on each card, default true
  show_rating_stars: boolean;     // show star rating if present, default true
  import_source?: 'google' | 'trustpilot';  // which source to auto-import from
  import_url?: string;            // the business profile URL
  last_imported_at?: number;
}
```

### 8.2 — New Worker utility: Review scrapers
Create `apps/worker/src/utils/reviewScrapers.ts`:

**Google Business scraper:**
```typescript
async function scrapeGoogleReviews(businessProfileUrl: string): Promise<TestimonialItem[]>
```
- Fetch the Google Business Profile URL (e.g., `https://g.page/r/...` or `https://www.google.com/maps/place/...`).
- Extract reviewer name, rating, review text, and review URL from the page HTML/JSON-LD.
- Return up to 10 reviews as TestimonialItem array with `source: 'google'`.
- Add a comment: `// NOTE: scrape-based — results may vary based on Google's page structure.`

> **CLARIFICATION: Implement Google scraper fully. STUB Trustpilot — build the UI flow and import endpoint infrastructure, but have the scraper function return `{ stubbed: true, message: 'Trustpilot import coming soon' }`. Add a prominent comment: `// TODO: Trustpilot scraper — implement when ToS review is complete.`**

**Trustpilot scraper (STUBBED):**
```typescript
async function scrapeTrustpilotReviews(profileUrl: string): Promise<TestimonialItem[]>
```
- **Return a stub response** — do not attempt to fetch Trustpilot pages.
- Return `{ stubbed: true, message: 'Trustpilot import coming soon' }` from the API endpoint.
- Add a comment: `// TODO: Trustpilot scraper — implement when ToS review is complete.`

Add route: `POST /api/testimonials/import` (auth required). Body: `{ block_id: string, source: 'google' | 'trustpilot', url: string }`. Calls the appropriate scraper, merges results with existing items (no duplicates by source_url), updates the block data in D1, returns the updated items array.

### 8.3 — TestimonialsEditor.tsx updates
- Add an "Import Reviews" collapsible section below the manual items list.
- Source picker: Google / Trustpilot (two buttons).
- URL input field for the business profile URL.
- "Import Reviews" button that calls `POST /api/testimonials/import`. Show loading state, show count of reviews imported on success, show error toast on failure.
- Show last imported timestamp if `last_imported_at` is set: "Last imported: 2 days ago."
- Add `show_source_badge` and `show_rating_stars` toggles.

### 8.4 — TestimonialsRenderer.tsx updates
- If `show_rating_stars` is true and a testimonial has a `rating`, render 1–5 filled/empty stars above the quote (use inline SVG stars — do not import a library).
- If `show_source_badge` is true and `source` is set, render a small badge in the bottom-right of the card: "Google" in blue, "Trustpilot" in green, "X" in black. Each badge is a link to `source_url` (open in new tab).

---

## SPRINT 9 — Newsletter Block — Mailchimp + ConvertKit Sync

Read `NewsletterEditor.tsx`, `NewsletterRenderer.tsx`, and the newsletter signup handler in `public.ts` fully before starting.

### 9.1 — Extend NewsletterData type

> **CLARIFICATION — API Key Storage Security:** Do NOT store `mailchimp_api_key` or `convertkit_api_key` in the block's JSON data column. Instead:
> 1. Create a `provider_credentials` table (new migration) with columns: `id TEXT PRIMARY KEY, user_id TEXT NOT NULL, block_id TEXT NOT NULL, provider TEXT NOT NULL, encrypted_key TEXT NOT NULL, metadata TEXT, created_at INTEGER`.
> 2. Encrypt API keys using **AES-GCM** with a `CREDENTIALS_ENCRYPTION_KEY` Worker secret (env variable).
> 3. The block data stores only `sync_provider`, `mailchimp_audience_id`, `mailchimp_datacenter`, `convertkit_form_id` — never raw API keys.
> 4. When syncing, the Worker reads the encrypted key from `provider_credentials`, decrypts it, and uses it for the API call.

```typescript
interface NewsletterData {
  heading: string;          // existing
  subtext?: string;         // existing
  button_label: string;     // existing

  // NEW provider sync fields — all optional, user-configurable
  sync_provider?: 'mailchimp' | 'convertkit' | 'none'; // default 'none'

  // Mailchimp — API key stored in provider_credentials table, NOT here
  mailchimp_audience_id?: string;
  mailchimp_datacenter?: string; // e.g. "us21" — derived from API key suffix

  // ConvertKit — API key stored in provider_credentials table, NOT here
  convertkit_form_id?: string;

  // UX
  success_message?: string;   // custom success message, default "You're subscribed!"
  show_subscriber_count: boolean; // show public subscriber count, default false
}
```

### 9.2 — New Worker utility: Email provider sync
Create `apps/worker/src/utils/emailProviders.ts`:

**Mailchimp:**
```typescript
async function syncToMailchimp(
  apiKey: string,
  audienceId: string,
  datacenter: string,
  email: string
): Promise<{ success: boolean; error?: string }>
```
- Call `https://${datacenter}.api.mailchimp.com/3.0/lists/${audienceId}/members` with method POST.
- Body: `{ email_address: email, status: 'subscribed' }`.
- Auth: Basic auth with `anystring:${apiKey}`.
- Handle 400 (already subscribed) as a soft success.

**ConvertKit:**
```typescript
async function syncToConvertKit(
  apiKey: string,
  formId: string,
  email: string
): Promise<{ success: boolean; error?: string }>
```
- Call `https://api.convertkit.com/v3/forms/${formId}/subscribe`.
- Body: `{ api_key: apiKey, email }`.

### 9.3 — Update newsletter signup handler in public.ts
After the existing INSERT OR IGNORE into `newsletter_signups`, if `sync_provider` is set and the relevant API key fields are populated, call the appropriate sync function. Do this asynchronously using `ctx.waitUntil()` — do not block the response waiting for the third-party API call.

### 9.4 — NewsletterEditor.tsx updates
- Add a collapsible "Connect Email Provider" section.
- Provider picker: None / Mailchimp / ConvertKit.
- **Mailchimp fields:** API key input (password type, show/hide toggle), Audience ID input. Auto-derive and display the datacenter from the API key (last segment after `-`). Add a "Test Connection" button that calls a new `POST /api/newsletter/test-connection` endpoint (auth required) which attempts to GET the audience info and returns success/error.
- **ConvertKit fields:** API key input (password type), Form ID input. Add a "Test Connection" button with the same pattern.
- Add `success_message` text input.
- Add `show_subscriber_count` toggle.

### 9.5 — Verify rate limiting on newsletter signups

> **CLARIFICATION: Newsletter rate limiting (10/IP/hour) already exists in `public.ts` lines 7-19.** Verify the implementation uses `CF-Connecting-IP` (or `cf-connecting-ip`) header, limits to 10/hour, and returns 429. If correct, confirm and skip. If there are gaps (e.g., wrong header, no cleanup), fix them.

---

## SPRINT 10 — Poll Block — Share Mechanic + Vote Count

Read `PollRenderer.tsx` and `PollEditor.tsx` fully before starting.

### 10.1 — Add total vote count display
In `PollRenderer.tsx`, below the question text and above the options, add a total vote count: `"X votes"` where X is the sum of all option votes. Only show when total > 0. Style as small, muted text.

### 10.2 — Share results mechanic
After a user votes (or if the poll is closed and showing results), show a "Share results" button.

- On click, construct a share URL: `https://bytlinks.com/{username}?poll={blockId}&results=1` and copy it to the clipboard using `navigator.clipboard.writeText()`.
- Show a confirmation toast: "Link copied! Share your poll results."
- On the public page, if `?poll={blockId}&results=1` is present in the URL query params, auto-show the results for that specific poll (skip the voting UI and go straight to result display).
- The `username` needed for the URL should be available via the existing page data passed to renderers — check how `pageId` and `username` are currently passed and use the same pattern.

### 10.3 — PollEditor.tsx updates
- Add a "Poll Settings" section with a "Close poll" toggle (maps to existing `closed` field — ensure this is already wired; if not, wire it).
- Add an optional "End date" date/time picker — when set, the poll automatically shows as closed after that datetime. Add `end_date?: string` to PollData.
- When `end_date` is set and has passed, treat the poll as closed in the renderer.

---

## SPRINT 11 — Event Block — RSVP System + Interested Count

Read `EventRenderer.tsx`, `EventEditor.tsx`, and the public route handler in `public.ts` fully before starting.

### 11.1 — Database migration

> **Migration 010 is already taken (`010_import_rate_limits.sql`). Use the next available number.**

Create migration file (use next available number after all other new migrations in this sprint):

```sql
CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('interested', 'rsvp')),
  name TEXT,
  email TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_block_id ON event_rsvps(block_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_rsvps_email ON event_rsvps(block_id, email) WHERE email IS NOT NULL;
```

### 11.2 — Extend EventData type

```typescript
interface EventData {
  // all existing fields remain unchanged

  // NEW RSVP fields
  rsvp_enabled: boolean;           // default false
  rsvp_mode: 'interested' | 'full' | 'both'; // 'interested' = tap only, 'full' = name+email form, 'both' = show both options
  rsvp_button_label?: string;      // default "I'm Interested"
  rsvp_form_heading?: string;      // default "Reserve your spot"
  rsvp_success_message?: string;   // default "You're on the list!"
  rsvp_cap?: number;               // optional max RSVPs, 0 = unlimited
  show_interested_count: boolean;  // show "X interested" publicly, default true
}
```

### 11.3 — New public API endpoints
Add to `public.ts`:

- `POST /api/public/event/:blockId/interested` — No body required. Records an anonymous "interested" tap. Use a cookie `event_interested_${blockId}` (30-day) to prevent duplicate taps from the same browser. Increment a counter stored in the EventData JSON's `interested_count` field. Return `{ interested_count: number }`.

- `POST /api/public/event/:blockId/rsvp` — Body: `{ name?: string, email: string }`. Validates email. Checks `rsvp_cap` if set (return 400 if full). Inserts into `event_rsvps`. Sends no email (no email sending infrastructure — log the RSVP only). Return `{ success: true }`.

### 11.4 — EventRenderer.tsx updates
- If `rsvp_enabled` is false, render as before.
- If `rsvp_enabled` is true:
  - If `show_interested_count` is true, show a count below the event details: "🙋 X people interested."
  - If `rsvp_mode` includes 'interested': show an "I'm Interested" button. On click, call `POST /api/public/event/:blockId/interested`, update the count optimistically, set the cookie, show a small confirmation ("You're interested! ✓"), disable the button.
  - If `rsvp_mode` includes 'full': show a small inline form (name optional, email required) with a submit button. On submit, call `POST /api/public/event/:blockId/rsvp`. On success show `rsvp_success_message`. On error (full) show "This event is full."
  - If `rsvp_mode` is 'both': show both the tap button and the form.

### 11.5 — EventEditor.tsx updates
- Add a collapsible "RSVP Settings" section.
- `rsvp_enabled` toggle.
- When enabled, show:
  - Mode picker: "Interested Only" / "Full RSVP Form" / "Both."
  - Button label input.
  - Form heading input (shown only for 'full' and 'both').
  - Success message input.
  - RSVP cap number input (0 = unlimited).
  - `show_interested_count` toggle.

---

## SPRINT 12 — Collabs Block — Profession Fields + Batch Endpoint + Redesigned Cards

Complete Pre-Sprint Checklist item A before starting this sprint.

### 12.1 — Add profession/job_title to user profiles

**If the column does not exist** (check from pre-sprint checklist):
Create `migrations/011_user_profession.sql`:
```sql
ALTER TABLE bio_pages ADD COLUMN job_title TEXT DEFAULT NULL;
ALTER TABLE bio_pages ADD COLUMN profession TEXT DEFAULT NULL;
```

Add `job_title` and `profession` fields to:
- The page update endpoint (`PUT /api/pages/me`) — accept and save both fields.
- The public page response (`GET /api/public/:username`) — include both fields in the response.
- The profile editor in the dashboard Links tab — add two new inputs: "Job Title" (e.g., "Senior Plumber") and "Profession / Industry" (e.g., "Trades & Construction"). These appear below the bio field.

### 12.2 — Extend batch profiles endpoint

> **CLARIFICATION: `GET /api/public/batch-profiles?usernames=...` already exists in `public.ts` and returns `username`, `display_name`, `avatar_r2_key`.** Extend it to also return the new `job_title` and `profession` fields (added in 12.1). Do NOT create a separate `/api/public/profiles` endpoint — reuse the existing one.

- Extend the existing `GET /api/public/batch-profiles` query to include `bio`, `job_title`, `profession` in the SELECT and response.
- Keep existing behavior: comma-separated, max 20, omit unknown usernames.

### 12.3 — Extend CollabsData type

```typescript
interface CollabItem {
  username: string;
  relationship_label?: string; // e.g. "Partner", "Supplier", "Collaborator", "Friend" — user-defined
}

interface CollabsData {
  items: CollabItem[];
  display_style: 'grid' | 'list'; // default 'grid'
}
```

### 12.4 — CollabsRenderer.tsx updates

> **CLARIFICATION: CollabsRenderer already uses the batch endpoint (`GET /api/public/batch-profiles`). Skip the "replace N+1" step — it's already done.** Focus on the card redesign and the new fields.

- Verify batch endpoint is used (skip if already done).
- Redesign the collab card to show: avatar (or initials fallback), display name, `job_title` (if set), `profession` (if set, in muted text), and `relationship_label` badge (if set — small pill in teal). A "View Profile →" link at the bottom.
- List mode: single-column stacked cards instead of horizontal scroll.

### 12.5 — CollabsEditor.tsx updates
- Per collab item, add a `relationship_label` text input (optional, placeholder: "e.g. Partner, Supplier, Friend").
- Add a `display_style` picker: Grid / List.

---

## SPRINT 13 — Tip Jar → Payment Options Block

Read `TipJarEditor.tsx` and `TipJarRenderer.tsx` fully before starting.

### 13.1 — Rename display label
Change the display label from "Tip Jar" to "Payment Options" everywhere in the UI. Do NOT change the block_type string `'tip-jar'`.

### 13.2 — Extend TipJarData type

```typescript
interface PaymentOption {
  id: string;
  provider: 'stripe' | 'kofi' | 'buymeacoffee' | 'paypal' | 'cashapp' | 'venmo';
  url: string;
  label?: string;         // custom button label, falls back to provider default
  suggested_amount?: string; // display text only e.g. "$5 for a coffee"
}

interface TipJarData {
  options: PaymentOption[];  // replaces single URL — supports multiple payment methods
  message?: string;           // optional message above buttons e.g. "Support my work"
  goal_enabled: boolean;      // default false
  goal_label?: string;        // e.g. "New microphone fund"
  goal_target?: string;       // display text only e.g. "$300"
  goal_current?: string;      // display text only e.g. "$147" — manually updated by user
  goal_show_bar: boolean;     // show progress bar, default true when goal_enabled
}
```

### 13.3 — TipJarEditor.tsx updates (full rewrite of the editor)
- Replace the single URL input with a list of payment options (add/remove, up to 6).
- Per option: provider picker (Stripe, Ko-fi, Buy Me a Coffee, PayPal.me, Cash.app, Venmo — each with its brand icon from Lucide or a small inline SVG), URL input, optional custom label, optional suggested amount text.
- Message textarea (optional).
- Goal section (collapsible, toggled by `goal_enabled`):
  - Goal label input.
  - Goal target text input (display only — not processed).
  - Goal current text input (display only — manually updated).
  - Show progress bar toggle.

### 13.4 — TipJarRenderer.tsx updates (full rewrite of the renderer)
- If `message` is set, render it above the buttons in muted body text.
- If `goal_enabled` is true, render the goal section:
  - Goal label and target text.
  - If `goal_show_bar` and both `goal_current` and `goal_target` are numeric-parseable, render a progress bar. Parse both as numbers, clamp progress to 0–100%. Use a CSS-only bar (no library).
  - If not numeric, render them as plain text: "Goal: $147 of $300."
- Render each payment option as a styled button with the provider's brand icon/color, the custom label or provider default (e.g., "Support on Ko-fi"), and the suggested amount as small text below if set.
- Each button is an `<a href={url} target="_blank" rel="noopener noreferrer">`.

---

## SPRINT 14 — Download Block — Download Count Badge

Read `FileDownloadRenderer.tsx` fully before starting.

### 14.1 — Aggregate download count query
In the analytics route (`analytics.ts`), add a query helper:
```typescript
async function getDownloadCount(db: D1Database, blockId: string): Promise<number>
```
Query: `SELECT COUNT(*) as count FROM analytics_events WHERE block_id = ? AND event_type = 'file_download'`.

### 14.2 — Extend FileDownloadData type
```typescript
interface FileDownloadData {
  // all existing fields unchanged
  show_download_count: boolean;   // NEW — default false
  count_min_threshold: number;    // NEW — only show count if >= this number, default 50
}
```

### 14.3 — New public endpoint for download count
Add `GET /api/public/block/:blockId/download-count` (no auth). Returns `{ count: number }`. Only returns the count if the block's `show_download_count` is true and the count meets `count_min_threshold` — otherwise returns `{ count: null }`.

### 14.4 — FileDownloadRenderer.tsx updates
- On mount, if `show_download_count` is true, fetch `GET /api/public/block/:blockId/download-count`.
- If the response returns a non-null count, render a small badge below the download button: "↓ {count} downloads" in muted text.
- Do not show the badge during loading or if count is null.

### 14.5 — FileDownloadEditor.tsx updates
- Add `show_download_count` toggle.
- Add `count_min_threshold` number input (label: "Only show count after X downloads"). Only visible when `show_download_count` is true.

---

## SPRINT 15 — FAQ Block — Collapse by Default + Search

Read `FaqRenderer.tsx` and `FaqEditor.tsx` fully before starting.

### 15.1 — Confirm collapse default
Verify that FAQ items are collapsed by default on page load (the initial `openItems` state should be an empty Set/array). If they are not, fix it. Each item should only expand on click.

### 15.2 — Add search
Extend FaqData:
```typescript
interface FaqData {
  items: FaqItem[];       // existing
  show_search: boolean;   // NEW — default false (user opts in)
  search_placeholder?: string; // NEW — default "Search questions..."
}
```

In `FaqRenderer.tsx`:
- If `show_search` is true and there are more than 5 items, show a search input above the accordion.
- Filter items in real-time as the user types — case-insensitive match against both question and answer text.
- If no items match, show "No results for '{query}'."
- The search is client-side only — no API call.

In `FaqEditor.tsx`:
- Add `show_search` toggle (label: "Show search bar").
- Add `search_placeholder` text input, visible only when `show_search` is true.

---

## SPRINT 16 — Commerce / Product Card Block (New Block)

This is a new block type. Follow the existing pattern for adding new blocks precisely.

### 16.1 — Add to shared types
In `packages/shared/types.ts`:
- Add `'product-card'` to the `ContentBlockType` union.
- Add `ProductCardData` interface:

```typescript
interface ProductItem {
  id: string;
  name: string;
  price?: string;          // display text only e.g. "$29" or "Free"
  description?: string;
  image_r2_key?: string;
  buy_url: string;
  badge?: string;          // optional badge text e.g. "Best Seller", "New", "Sale"
}

interface ProductCardData {
  items: ProductItem[];         // max 6
  layout: 'grid' | 'list';     // default 'grid'
  columns: 1 | 2 | 3;          // default 2, only applies to grid layout
  button_label: string;         // default "Buy Now"
  show_price: boolean;          // default true
}
```

- Add `DEFAULT_DATA` for `'product-card'`:
```typescript
'product-card': {
  items: [],
  layout: 'grid',
  columns: 2,
  button_label: 'Buy Now',
  show_price: true,
}
```

### 16.2 — Plan gating
- Add `'product-card'` to the Pro-only block types in both `packages/shared/constants.ts` and `apps/worker/src/routes/blocks.ts`. Free users cannot create this block.

### 16.3 — ProductCardEditor.tsx (new file)
Create `apps/web/src/components/builder/blocks/ProductCardEditor.tsx`:
- Add/remove/reorder product items (max 6, enforced in UI and server).
- Per item: image upload (reuse `uploadFile` hook), name input, price input (optional, text), description textarea (optional, max 150 chars), buy URL input (required, validate as URL), badge text input (optional).
- Layout picker: Grid / List.
- Columns selector: 1 / 2 / 3 (only shown for grid layout).
- Button label input.
- Show price toggle.

### 16.4 — ProductCardRenderer.tsx (new file)
Create `apps/web/src/components/page/blocks/ProductCardRenderer.tsx`:
- **Grid layout:** CSS grid with `columns` columns. Each card: image (aspect ratio 4/3, object-cover, rounded-lg), badge overlay (top-left, teal pill if set), product name (bold), price (if `show_price` and price is set), description (if set, truncated to 2 lines with CSS `line-clamp-2`), "Buy Now" button (uses `button_label`, links to `buy_url`, opens new tab, styled as the page's primary button style).
- **List layout:** Single column, horizontal card (image left 30%, content right 70%).
- If item has no image, show a placeholder with a subtle gradient background and a `ShoppingBag` Lucide icon.
- Track `product_click` event on buy button click: add `'product_click'` to the EventType union and call `trackEvent(pageId, 'product_click', { blockId })`.

### 16.5 — Register the new block
- Add `ProductCardEditor` to `blockEditorRegistry.ts`.
- Add `ProductCardRenderer` to `blockRendererRegistry.ts`.
- Add the block to `BlockPalette` under a "Commerce" category with a `ShoppingBag` icon.

---

## SPRINT 17 — Booking + Schedule — Unify + Dashboard Section

> **DASHBOARD STRUCTURE CLARIFICATION (applies to Sprints 17-20):**
> Do NOT add Bookings, Newsletter, Polls, and Events as 4 separate top-level sidenav tabs.
> Instead, group all four under a **single "Manage" parent tab** with internal sub-navigation.
> - **Desktop:** "Manage" appears in the sidebar. Clicking it shows a sub-nav with: Bookings, Newsletter, Polls, Events (only sections with relevant blocks are shown).
> - **Mobile:** The bottom nav shows one "Manage" tab (use `LayoutList` or `Layers` Lucide icon) that opens a sub-nav page. This keeps the mobile bottom nav at **4 items**: My Page, Analytics, Settings, Manage.
> - Add `'manage'` to the `DashboardTab` type union. Each sub-section is a sub-tab within the Manage view.
> - Each sub-section only renders when the user has at least one relevant block — no empty nav items.

Read `BookingRenderer.tsx`, `BookingEditor.tsx`, `ScheduleRenderer.tsx`, `ScheduleEditor.tsx` fully before starting.

### 17.1 — Unify the editor UI
Do NOT change block_type strings or merge the blocks in the database. Instead, create a shared `BookingScheduleEditor` component that both `BookingEditor` and `ScheduleEditor` use internally.

The unified editor should have:
- Provider picker: Calendly / Cal.com / Custom URL.
- URL input labeled "Booking/Calendar URL."
- Height input (px) with a "Responsive" toggle — when toggled on, use `Math.max(400, window.innerHeight * 0.75)` on mount instead of the fixed height.
- Error/loading state settings.

### 17.2 — Fix iframe loading and error states
In both `BookingRenderer.tsx` and `ScheduleRenderer.tsx`:
- Wrap the iframe in a container div.
- Show a loading spinner (use the existing BytLinks spinner component) until the iframe's `onLoad` event fires.
- Add a 10-second timeout via `setTimeout`: if `onLoad` has not fired, transition to an error state showing: "Unable to load booking widget. Check your URL." with the configured URL displayed as a clickable fallback link.
- Make iframe height responsive when enabled: set height on mount using `Math.max(400, window.innerHeight * 0.75)`.

### 17.3 — Manage tab: Bookings sub-section
> **This is a sub-section within the "Manage" parent tab, NOT a top-level sidenav item.** Use `CalendarDays` Lucide icon for the sub-nav entry.

This section renders only if the user has at least one `booking` or `schedule` block. If they have none, show an empty state: "Add a Booking or Schedule block to your page to manage it here."

When blocks are present, render:
- A list of their booking/schedule blocks (by title or URL).
- Per block: the configured URL displayed as a clickable link, the iframe embed in a preview panel, and a "Copy Link" button.
- A simple analytics summary: total `booking_click` and `schedule_click` events from the analytics_events table (fetched from a new `GET /api/analytics/booking-summary` endpoint, auth required).

---

## SPRINT 18 — Newsletter Dashboard Section

Add a dedicated sidenav section for Newsletter management.

### 18.1 — Manage tab: Newsletter sub-section
> **This is a sub-section within the "Manage" parent tab, NOT a top-level sidenav item.** Use `Mail` Lucide icon for the sub-nav entry.

This section renders only if the user has at least one `newsletter` block. If they have none, show an empty state: "Add a Newsletter block to your page to start building your list."

### 18.2 — Newsletter dashboard UI
This section should render:
- A block selector (tabs or dropdown) if the user has multiple newsletter blocks.
- Per block:
  - **Overview card:** Total subscribers, subscribers this week, subscribers this month.
  - **Subscriber list:** Paginated table showing email + subscribed date. Page size 25. Fetch from existing `GET /api/analytics/newsletter-subscribers?block_id=xxx`.
  - **Export button:** Call existing `GET /api/export/csv` scoped to this block_id. Download the file.
  - **Provider sync status:** If `sync_provider` is configured (from Sprint 9), show a status badge: "Syncing to Mailchimp ✓" or "Not connected." with a link to the block editor.
  - **Signup trend chart:** A simple 30-day bar chart using the existing Recharts library showing daily signup counts. Fetch data from a new `GET /api/analytics/newsletter-signups-by-day?block_id=xxx&days=30` endpoint (auth required) that queries `newsletter_signups` grouped by `date(created_at, 'unixepoch')`.

---

## SPRINT 19 — Poll Dashboard Section

Add a dedicated sidenav section for Poll management.

### 19.1 — Manage tab: Polls sub-section
> **This is a sub-section within the "Manage" parent tab, NOT a top-level sidenav item.** Use `BarChart2` Lucide icon for the sub-nav entry.

Renders only if the user has at least one `poll` block.

### 19.2 — Poll dashboard UI
Per poll block:
- Question text as the card header.
- Status badge: "Open" (green) or "Closed" (gray). Quick toggle button to open/close the poll directly from the dashboard (calls `PUT /api/blocks/:id` with the updated `closed` value).
- Results visualization: horizontal bar chart (CSS-only, no library) showing each option's text, vote count, and percentage. Match the style of the existing poll renderer results view.
- Total vote count and "votes since [created_at date]" label.
- Share button (same mechanic as Sprint 10 — copy the results URL to clipboard).
- If `end_date` is set, show it: "Closes: [date]."

---

## SPRINT 20 — Event Dashboard Section

Add a dedicated sidenav section for Event/RSVP management.

### 20.1 — Manage tab: Events sub-section
> **This is a sub-section within the "Manage" parent tab, NOT a top-level sidenav item.** Use `CalendarCheck` Lucide icon for the sub-nav entry.

Renders only if the user has at least one `event` block.

### 20.2 — Event dashboard UI
Per event block:
- Event name and date as the card header.
- "Interested" count (fetch from EventData.interested_count).
- If `rsvp_mode` includes 'full': a paginated RSVP list showing name (if provided) + email + signup date. Fetch from a new `GET /api/event-rsvps/:blockId` endpoint (auth required) that queries `event_rsvps WHERE block_id = ? AND type = 'rsvp'`.
- Export RSVPs: "Export CSV" button. Implement `GET /api/event-rsvps/:blockId/export` (auth required) that returns a CSV of all RSVPs for the block.
- Analytics summary: ticket link clicks, "Interested" taps, expand interactions.

---

## FINAL CHECKLIST

After completing all sprints, run through this checklist before declaring the session complete:

- [ ] `npm run typecheck` passes with zero errors across all workspaces.
- [ ] All new ContentBlockType values are present in both `blockRendererRegistry` and `blockEditorRegistry`.
- [ ] All new block types are in `BLOCK_LIMITS` in both the shared constants and the worker's blocks.ts.
- [ ] All new database tables have corresponding migration files in `/migrations/` starting from 011+. schema.sql was NOT directly modified.
- [ ] All new Worker endpoints have input validation.
- [ ] All new authenticated endpoints have the auth middleware applied.
- [ ] `trackEvent` is called appropriately in all new renderer files.
- [ ] No `TODO`, `FIXME`, or `as never` casts were introduced by this sprint (except the intentional Trustpilot TODO).
- [ ] The `microblog_expand` analytics gap identified in the audit is confirmed fixed.
- [ ] The `stats_view as never` TypeScript issue is confirmed fixed.
- [ ] The free-tier type mismatch bug (server vs client) is confirmed fixed.
- [ ] Newsletter rate limiting is confirmed already present and correct.
- [ ] All Manage sub-sections only render when the user has at least one relevant block — no empty nav items.
- [ ] API keys for Mailchimp/ConvertKit are stored in `provider_credentials` table with AES-GCM encryption, NOT in block JSON data.
- [ ] Live stats endpoints return 503 with `{ error: 'not_configured' }` when API secrets are missing.
- [ ] Mobile bottom nav has exactly 4 items (My Page, Analytics, Settings, Manage).

---

*End of BytLinks Block System — Major Feature Sprint*
