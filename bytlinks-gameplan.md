# BytLinks — Master Gameplan & Claude Code Context Document
**Domain:** bytlinks.com | **Tagline:** Your link. Your brand. Your data.

---

## 1. PRODUCT VISION

BytLinks is a personal brand link-in-bio + micro-website platform. Users get a beautiful, fast public page at `bytlinks.com/username` with their links, bio, socials, and embedded content — styled exactly how they want it. The platform wins on three axes no competitor fully owns simultaneously:

1. **Best-in-class visual styles** — Not just themes. A full style system with 12+ distinct aesthetic directions, each genuinely different, professionally crafted, not AI-generic.
2. **Best analytics in the category** — Free users get a taste. Pro users get real, actionable data that no competitor offers without an enterprise plan.
3. **Desktop is a first-class citizen** — Every public page feels like a real personal website on desktop (hero section, layout, typography scale), not just a stretched mobile stack.

**What makes it NOT AI slop:**
- Every style was designed with intent — brutalist looks brutal, glassmorphism looks glass, minimal looks genuinely minimal (not just "less stuff")
- Desktop layouts use real grid design, not just `max-width: 600px` centered
- Animation system is purposeful — one great entrance animation beats ten janky ones
- Code is modular, documented, component-driven, hand-refined after generation
- Zero purple gradients. Zero Inter. Zero cookie-cutter Tailwind defaults.

---

## 2. BRAND

- **Name:** BytLinks
- **Domain:** bytlinks.com
- **Username URLs:** `bytlinks.com/username`
- **Voice:** Confident, clean, technical-adjacent but not nerdy. Professional without being corporate.
- **"Powered by BytLinks"** footer badge on all free pages. Paid plan removes it.

---

## 3. TECH STACK (LOCKED)

| Layer | Tech | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev, modular, industry standard |
| Styling | Tailwind CSS + CSS custom properties | Tailwind utilities, but CSS vars drive the theme system |
| Routing | React Router v6 | SPA routing for dashboard + public pages |
| Backend | Cloudflare Workers + Hono | Lightweight edge routing, no server ops |
| Database | Cloudflare D1 (SQLite at edge) | Native Wrangler support, near-zero cost |
| File Storage | Cloudflare R2 | Profile photos, exports. No egress fees |
| Auth | Custom JWT in Workers | Email/password, bcrypt hash in D1, JWT in httpOnly cookie |
| Analytics | Custom event logging → D1 | Server-side via Worker, privacy-first, no third-party |
| Payments | Stripe (mocked locally) | Test keys in dev, live keys post-MVP |
| Icons | Lucide React | Clean, consistent, customizable |
| Charts | Recharts | Lightweight, composable, not bloated |
| Dev Simulation | Wrangler CLI | `wrangler dev` mimics Cloudflare edge locally |
| State | Zustand | Simple, no Redux overhead |

**Dependency budget:** Max 15 npm packages. Every package gets a one-line justification comment in package.json.

**No Supabase. No Vercel. No AWS. Full Cloudflare stack.**

---

## 4. DEVELOPMENT ENVIRONMENT (LOCAL ONLY — MVP PHASE)

```
/bytlinks
  /apps
    /web          ← React + Vite frontend (dashboard + marketing site)
    /worker       ← Cloudflare Worker (Hono API)
  /packages
    /shared       ← Shared types, utils, validators
  wrangler.toml   ← D1 + R2 bindings
  .dev.vars       ← Local env vars (never committed)
```

**Local setup commands:**
```bash
wrangler dev                    # Runs Worker API on localhost:8787
wrangler pages dev ./dist       # Runs frontend on localhost:8788
wrangler d1 execute bytlinks-db --local --file=./schema.sql
```

**Mock rules during local dev:**
- Stripe: Use test keys (`sk_test_...`), no real charges
- R2: Use local filesystem mock via Wrangler's `--local` flag
- OpenAI (future AI features): Return hardcoded mock responses

**Commit convention:** `feat: `, `fix: `, `style: `, `refactor: `, `chore: `
**Branch per feature.** Never commit to main until tested end-to-end locally.

---

## 5. DATABASE SCHEMA (D1 / SQLite)

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free',          -- 'free' | 'pro' | 'business'
  created_at INTEGER DEFAULT (unixepoch())
);

-- Bio Pages (one per user for now, expandable)
CREATE TABLE bio_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,     -- bytlinks.com/username
  display_name TEXT,
  bio TEXT,
  avatar_r2_key TEXT,                -- R2 object key for profile photo
  custom_domain TEXT,                -- null if not set (paid feature)
  show_branding INTEGER DEFAULT 1,   -- 0 = hide "Powered by BytLinks" (paid)
  theme JSON NOT NULL DEFAULT '{}',  -- full theme object (see Theme System)
  is_published INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Links
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,                         -- emoji or icon key
  is_featured INTEGER DEFAULT 0,    -- appears in featured section
  is_visible INTEGER DEFAULT 1,
  order_num INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Social Links
CREATE TABLE social_links (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,            -- 'x' | 'github' | 'linkedin' | 'youtube' | etc.
  url TEXT NOT NULL,
  order_num INTEGER DEFAULT 0
);

-- Embedded Content Blocks
CREATE TABLE embed_blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                -- 'youtube' | 'spotify' | 'tweet' | 'substack'
  embed_url TEXT NOT NULL,
  order_num INTEGER DEFAULT 0
);

-- Analytics Events (server-side only, no client tracking)
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  link_id TEXT,                      -- null for page views
  event_type TEXT NOT NULL,          -- 'page_view' | 'link_click' | 'social_click'
  referrer TEXT,
  country TEXT,                      -- from CF-IPCountry header (free via Cloudflare)
  city TEXT,                         -- from CF headers
  device_type TEXT,                  -- 'mobile' | 'desktop' | 'tablet'
  browser TEXT,
  os TEXT,
  session_id TEXT,                   -- anonymous session for bounce/time tracking
  timestamp INTEGER DEFAULT (unixepoch())
);

-- NSFW Blocklist (server-side validation)
CREATE TABLE blocked_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'adult_content',
  added_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for analytics query performance
CREATE INDEX idx_events_page_time ON analytics_events(page_id, timestamp);
CREATE INDEX idx_events_link ON analytics_events(link_id, timestamp);
CREATE INDEX idx_links_page ON links(page_id, order_num);
```

---

## 6. THE STYLE SYSTEM

This is BytLinks's #1 visual differentiator. Every style must feel like it was designed by a human who cared deeply about that aesthetic — not generated.

### Architecture

Styles are driven entirely by a `theme` JSON object stored per page. CSS custom properties map to the theme values. No inline styles. No dynamic class generation.

```json
{
  "base": "brutalist",
  "colorMode": "preset",
  "preset": "midnight",
  "buttonStyle": "outline-sharp",
  "fontPair": "mono-serif",
  "layoutVariant": "centered",
  "animation": "slide-up",
  "socialStyle": "pill",
  "spacing": "comfortable"
}
```

### The 12 Base Styles (minimum — add more post-MVP)

Each style is a complete aesthetic direction. Selecting it sets opinionated defaults for typography, layout, and spacing — which the user can then override with color/button/font choices.

| Style Name | Aesthetic | Typography Direction | Feel |
|---|---|---|---|
| **Minimal** | Ultra-clean, heavy whitespace | Thin sans-serif, tight tracking | Apple-esque, calm authority |
| **Bold Type** | Typography-first, text is the hero | Oversized display font, strong hierarchy | Editorial, confident, loud |
| **Dark Pro** | Deep dark bg, sharp accents | Medium weight sans, high contrast | Developer/tech tool |
| **Glass** | Glassmorphism panels, blur, depth | Light sans on translucent cards | Modern, airy, premium |
| **Brutalist** | Raw borders, stark grid, no softness | Monospace or compressed grotesque | Intentionally stark, counter-culture |
| **Editorial** | Magazine layout, columns, structure | Serif body + sans display | Writer, journalist, thought leader |
| **Soft Warm** | Rounded corners, warm neutrals, pastels | Rounded humanist sans | Approachable, creative, friendly |
| **Neon Night** | Dark bg, vivid neon highlights | Bold condensed sans | Music, gaming, nightlife |
| **Paper** | Off-white, ink-like, textured feel | Slab serif or classic serif | Author, journalist, analog feel |
| **Gradient Flow** | Smooth full-bleed gradient bg | Clean sans, white text | Creator/influencer, Instagram-friendly |
| **Grid** | Visible grid structure, geometric | Geometric sans | Designer, architect, structured |
| **Retro** | Muted palette, vintage serif, worn feel | Display serif or retro slab | Nostalgic, unique, memorable |

### Color System (3 tiers)

**Tier 1 — Presets** (free): 15+ curated palettes, each hand-picked for harmony.
Examples: Midnight (near-black + electric blue), Sand (warm beige + terracotta), Forest (deep green + cream), Ink (true black + white), Rose Gold, Arctic, Dusk, etc.

**Tier 2 — Simple Custom** (free): User picks 3 colors:
- Primary (backgrounds, main surface)
- Accent (buttons, highlights, interactive)
- Text (primary text color)
System derives secondary/tertiary tones automatically using HSL manipulation.

**Tier 3 — Advanced Custom** (paid): Full token control:
- Background, surface, surface-alt
- Text primary, text secondary, text muted
- Accent, accent-hover, accent-muted
- Border, divider
- Button bg, button text, button border

### Button Styles (10 minimum)

| Key | Look |
|---|---|
| `filled` | Solid fill, standard rounded |
| `outline` | Transparent with border, rounded |
| `outline-sharp` | Transparent with border, square corners |
| `pill` | Fully rounded capsule, filled |
| `pill-outline` | Fully rounded capsule, outline |
| `underline` | No border/bg, just bottom underline |
| `ghost` | Subtle semi-transparent fill |
| `shadow` | Filled with dramatic drop shadow |
| `brutalist` | Solid fill + thick offset box shadow |
| `gradient` | Gradient fill, smooth |
| `soft` | Very rounded, very soft fill (pastel-friendly) |

### Animation System

One entrance animation per page. Purposeful, not decorative noise.

| Key | Behavior |
|---|---|
| `none` | Instant load |
| `fade` | Gentle fade-in on all elements |
| `slide-up` | Elements enter from below, staggered |
| `slide-down` | Elements enter from above |
| `scale` | Elements scale in from 95% → 100% |
| `blur-in` | Elements come into focus |
| `cascade` | Each element delays slightly after previous |
| `typewriter` | Name/bio types out (for bold/editorial styles) |

Scroll animations (for desktop expanded sections):
- Parallax avatar on desktop hero
- Link cards animate in on scroll
- Section dividers draw in

### Social Icon Styles

| Key | Look |
|---|---|
| `icon-only` | Just the SVG icon, no container |
| `circle` | Icon inside filled circle |
| `circle-outline` | Icon inside circle outline |
| `square` | Icon inside rounded square |
| `pill-label` | Icon + platform name in pill |
| `minimal-row` | Horizontally spaced icons, no containers |

### Font Pairs (not Inter. Never Inter.)

| Key | Display Font | Body Font |
|---|---|---|
| `mono-serif` | JetBrains Mono | Lora |
| `editorial` | Playfair Display | Source Sans 3 |
| `grotesque` | Cabinet Grotesk | DM Sans |
| `slab` | Zilla Slab | IBM Plex Sans |
| `humanist` | Nunito | Nunito Sans |
| `condensed` | Barlow Condensed | Barlow |
| `geometric` | Outfit | Outfit Light |
| `retro` | Syne | Syne |

---

## 7. PAGE LAYOUT SYSTEM

### Mobile Layout (320px–1023px)
Standard stacked bio layout:
```
[ Avatar / Logo ]
[ Display Name ]
[ Bio text ]
[ Social icons row ]
[ Featured link(s) ]
[ Link list ]
[ Embed blocks ]
[ Powered by BytLinks (if free) ]
```

### Desktop Layout (1024px+)
Real website feel. NOT just centered mobile stack.

```
LEFT COLUMN (35%)          RIGHT COLUMN (65%)
─────────────────────      ──────────────────────────
[ Avatar / Logo ]          [ Featured Section ]
[ Display Name ]           [ Link Grid or List ]
[ Bio ]                    [ Embed Blocks ]
[ Social Icons ]
[ Sticky on scroll ]
```

On desktop:
- Avatar can be large (200–300px), portrait or circle
- Bio can be longer and reflows
- Links can optionally display as 2-column grid
- Embeds are full-width in right column
- Left column sticks while right column scrolls (for long pages)
- Desktop hero variant: Full-width banner image with name overlaid (if user uploads a banner)

---

## 8. ANTI-VIBE-CODE DESIGN STANDARDS

> **This section is law. Every component, page, and style must pass these standards before it ships. These are not suggestions — they are guardrails that protect BytLinks's brand integrity.**

### 8.1 The Vibe-Code Fingerprint (What We're Fighting)

Research and analysis of AI-generated and vibe-coded sites in 2024–2025 identified a consistent cluster of design anti-patterns. Seeing two or more of these on one page is an immediate fail:

| Anti-Pattern | Why It Screams AI | BytLinks Rule |
|---|---|---|
| Purple/indigo/violet gradients | Default Tailwind palette + AI training bias — the #1 visual signal of vibe-coded output | **BANNED as brand color.** May appear only in user-chosen themes, never in the BytLinks UI itself |
| Inter font | Shipped as the default in Tailwind templates; used on 80%+ of AI-generated sites | **BANNED** everywhere — dashboard, marketing, public pages |
| Roboto, Open Sans, Lato, system-ui | Same issue as Inter — the fonts of least resistance | **BANNED** |
| Full-bleed dark hero + neon accent | The "Linear aesthetic" — cloned endlessly because it was the trendy SaaS look of 2022–2023 | Never default; only permitted inside user-chosen "Dark Pro" or "Neon Night" themes |
| Glassmorphism cards on blurry gradient bg | Overused to the point of parody — every "premium" AI UI reaches for this | Glassmorphism is ONE of 12 styles users can choose; it is not a default anywhere |
| Three-column icon feature section | Cookie-cutter SaaS landing page structure — identical across thousands of sites | Strictly avoided in marketing pages; use asymmetric layouts with editorial structure |
| Aurora/mesh gradient backgrounds | Generated automatically by most AI tools as a "beautiful background" | Never in BytLinks UI. User themes may include gradient bg only if intentional |
| Generic rounded cards with icon + title + body | The most-produced UI element by vibe-coding tools | Must be differentiated per context: use proportioned grids, asymmetric treatments, strong type hierarchy instead |
| Scattered micro-animations everywhere | AI tools add motion to feel "polished" — results in noise | ONE purposeful entrance animation per page. Hover states only on interactive elements. Nothing gratuitous. |
| Gradient text on hero headlines | Overused since 2021 — now reads as "I asked AI to make it look premium" | Only allowed in user-facing themes (Gradient Flow, Neon Night). Never in BytLinks's own UI. |
| `max-width: 600px` centered column on desktop | Mobile-first thinking that forgot to finish the job | All dashboard views use real sidebar + content-area grid. All public pages use the defined two-column desktop layout. |
| Generic sans-serif at weight 400 or 600 for display text | AI defaults to "readable" — results in flat, unconfigured typography | Use extreme weight contrasts: 200 vs 900, 3x+ size jumps. Let display text breathe. |
| Box shadows that look exactly like Tailwind `shadow-md` | Default shadow values baked into Tailwind — appear on virtually every AI-generated card | Shadow tokens defined in CSS variables. Custom shadow curves with specific blur/spread ratios tuned per style. |
| Placeholder copy left in production | AI fills in "Lorem ipsum" or generic "Get started today" copy | All copy is specific and voice-consistent with the BytLinks brand voice. No filler text ships. |
| Default Tailwind color palette as brand identity | Using `indigo-600`, `violet-500`, etc. without overriding — pure AI laziness | BytLinks has its own design tokens defined in `base.css`. Tailwind palette is a utility tool only. |

### 8.2 Typography Rules

Typography is the fastest signal of craft. These rules apply everywhere:

1. **Weight Contrast is Mandatory.** Every page must demonstrate intentional weight contrast. A headline at `font-weight: 800` paired with body text at `font-weight: 400` is the minimum. Display text at `font-weight: 900` with a `font-weight: 300` subtitle is even better. Never use two weights within 200 of each other for display elements.

2. **Size Jumps Must Be Dramatic.** Scale ratios of 1.5x are invisible. Use 3x+ for display-to-body relationships. If a name is `48px`, the bio should be `14px` or `16px` — not `28px`. The contrast creates hierarchy; the hierarchy creates polish.

3. **Tracking and Leading Are Intentional.** Headlines: `letter-spacing: -0.03em` to `-0.05em` (tight). Uppercase labels: `letter-spacing: 0.1em` to `0.15em`. Body: `line-height: 1.6` to `1.7`. Never default browser values.

4. **No All-Default Everything.** Every font pairing has been specifically chosen and defined in the `fontPairs` map. No style should fall back to `sans-serif` as a catch-all.

5. **Text as Design Element.** In Bold Type, Editorial, and Brutalist styles, text IS the visual. The layout should be built around the typography, not the other way around.

### 8.3 Color Philosophy

1. **BytLinks's Own UI Palette.** The BytLinks dashboard and marketing site use a single curated palette — defined once in `base.css` as CSS custom properties. It is NOT one of the user's page themes; it's a separate design identity.

2. **No Purple. No Indigo. Not Even "Just for Accents."** The BytLinks brand accent is **not** purple, violet, or indigo. These colors signal AI to anyone who's been paying attention. Candidates for consideration: deep amber, warm slate, strong teal, dark olive, or a distinctive neutral with a high-chroma accent that isn't in the blue-purple family.

3. **Gradient Rules.** Gradients are not decoration. If a gradient exists, it must serve a clear function (directional motion, depth, atmospheric separation). The BytLinks UI uses zero gradients by default. User themes that include gradients (Gradient Flow, Neon Night) use them intentionally with specific angle and color stop choices — not `from-purple-600 to-blue-400`.

4. **Palette Derivation.** User's Tier 2 custom colors use HSL manipulation to derive a full token set from three inputs. This is a defined algorithm (`utils/colorDerivation.ts`), not ad hoc inline logic.

### 8.4 Layout and Spatial Design

1. **Desktop is Not Mobile + `max-width`.** The two-column desktop layout (35/65 split) is a non-negotiable design decision. Left column sticky, right column scrollable. Real CSS Grid. Real spatial relationships.

2. **Negative Space is Active.** Whitespace is not empty — it defines hierarchy and directs attention. Cluttered layouts are a sign of vibe-coded CSS accumulation. BytLinks styles have explicit spacing scales (`spacing: "comfortable" | "compact" | "airy"`) and those scales must be honored.

3. **Grid is Visible or Invisible — Never Accidental.** The Grid style exposes the grid as a design element. All other styles use an underlying grid silently. No element should feel like it was placed without considering its relationship to surrounding elements.

4. **Asymmetry is Intentional.** Editorial and Bold Type styles use column offsets, oversized headers that break out of the content container, and deliberate visual tension. This is not a bug — it's the design.

5. **No Sticky Headers on Public Pages.** The public page is not a SaaS product — it has no navigation bar. No sticky anything unless it's the left column on desktop.

### 8.5 Motion and Animation

The rule is: **one performance, not a circus.**

1. **One entrance animation per page load.** Choose from the defined animation system. All elements on the page participate in it. No element animates outside of the chosen entrance pattern.

2. **Hover states are functional, not theatrical.** Links: subtle background shift + slight scale (1.02). Social icons: color shift. Featured links: mild lift. Nothing bounces. Nothing spins. Nothing glows.

3. **Duration and Easing are Tokens.** Defined once: `--duration-fast: 150ms`, `--duration-base: 250ms`, `--duration-slow: 400ms`. Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances (fast start, ease into rest). Never `transition: all 0.3s ease`.

4. **No Infinite Animations on Load.** No pulsing loaders that keep pulsing after content appears. No ambient glow loops. No floating/bobbing elements. These read as "AI filled in the blank" motion.

5. **Scroll Animations (Desktop Only).** Parallax and scroll-triggered entrance animations are valid on desktop public pages. Implement via IntersectionObserver + CSS class toggles. No animation libraries for this — keep it native.

### 8.6 Component Design Principles

1. **Every component has exactly one purpose.** If a component is doing two things, split it.

2. **Composition over configuration.** Build small, composable primitives (`Button`, `Avatar`, `Badge`, `Divider`) and compose them into larger pieces (`LinkCard`, `SocialRow`, `FeaturedBlock`). Never build a monolithic component that accepts 20 props to cover every case.

3. **Style is injected, not hardcoded.** No component hardcodes a color or font. All visual properties flow from CSS custom properties. A `Button` component renders the same HTML whether the user's theme is Brutalist or Glass — the CSS variables do the switching.

4. **States are designed, not afterthoughts.** Every interactive component has: default, hover, focus, active, disabled, loading, and error states. These are designed in the CSS, not added post-hoc.

5. **Accessibility is structural.** ARIA labels on all icon-only buttons. Focus rings that are visible and on-brand (not the default browser ring). Color contrast that meets WCAG AA at minimum on every theme combination.

---

## 9. FEATURE BREAKDOWN

### MVP (Build First — Ship Fast)

- [ ] Auth: Sign up / Login / Logout (email + password, JWT, D1)
- [ ] Dashboard: Manage page, links, socials, theme, embeds
- [ ] Page Builder:
  - Add/edit/delete/reorder links (drag to reorder)
  - Upload profile photo (→ R2)
  - Social links with platform selector + icon preview
  - Featured link toggle (pin up to 2 links)
  - Embed block (YouTube + Spotify for MVP)
  - Theme selector (all 12 styles, presets, simple custom colors)
  - Button style picker
  - Animation picker
  - Font pair picker
- [ ] Public page renderer (`bytlinks.com/username`):
  - Mobile layout
  - Desktop layout (two-column)
  - All styles render correctly
  - Entrance animations work
  - "Powered by BytLinks" badge (free)
- [ ] Analytics (basic, free):
  - Page view counter
  - Per-link click count
  - Both shown in dashboard as simple numbers + sparkline
- [ ] Analytics (advanced, paywalled):
  - Referral source breakdown
  - Country/geo map
  - Device type breakdown
  - Browser/OS breakdown
  - Click-through rate per link
  - Time-series charts (daily/weekly/monthly)
  - Top performing links
  - Real-time view (last 30 min)
- [ ] NSFW URL validator (Worker, server-side)
- [ ] "Powered by BytLinks" removal (paid toggle)

### Post-MVP (Roadmap — Don't Build Yet)

- A/B testing (two link title variants, auto-winner)
- AI-suggested title improvements based on CTR
- Custom domain support (paid)
- Email capture / waitlist block
- Tip/donation button (Stripe)
- Weekly analytics email digest
- Page analytics export (CSV, R2)
- Multiple pages per user
- QR code generator for bio page
- Substack / LinkedIn / Tweet embeds
- Advanced color tier (full token control)
- Advanced social icon styles
- Verified badge (paid cosmetic)

---

## 10. NSFW URL VALIDATION

Server-side Worker function. Runs on every link save/update.

```js
// Hardcoded initial blocklist — update quarterly
const BLOCKED_DOMAINS = [
  'onlyfans.com',
  'fansly.com',
  'manyvids.com',
  'loyalfans.com',
  'admireme.vip',
  'patreon.com', // NOT blocked — only adult-specific platforms
  // Add more as needed
];

function isBlockedUrl(url) {
  try {
    const { hostname } = new URL(url);
    const base = hostname.replace(/^www\./, '');
    return BLOCKED_DOMAINS.some(d => base === d || base.endsWith(`.${d}`));
  } catch {
    return false; // Invalid URL caught later by separate validator
  }
}
```

User-facing error message: *"BytLinks supports professional links only. This URL isn't allowed on our platform."* — No lecturing, no moralizing, just a clean policy enforcement message.

---

## 11. ANALYTICS ARCHITECTURE

All event tracking is **server-side only**. Zero client-side tracking scripts. Privacy-first.

### How it works:
1. Public page loads → Worker logs `page_view` event to D1
2. User clicks a link → Client pings `/api/track/click/:linkId` → Worker logs `link_click` event
3. Worker reads Cloudflare request headers for: `CF-IPCountry`, `CF-Device-Type`, `User-Agent`
4. No cookies. No fingerprinting. No third-party scripts.

### Free analytics (visible to all users):
- Total page views (all time + last 30 days sparkline)
- Per-link click count

### Pro analytics (paywalled — placeholder pricing):
```
Dashboard sections:
├── Overview (views + clicks, date range selector)
├── Traffic Sources (referrer breakdown, pie chart)
├── Audience (country map, device/browser/OS bars)
├── Link Performance (CTR per link, ranked table)
├── Real-Time (last 30 min, live counter)
└── Trends (weekly comparison, growth %)
```

### Analytics query patterns:
```sql
-- Page views last 30 days
SELECT DATE(timestamp, 'unixepoch') as day, COUNT(*) as views
FROM analytics_events
WHERE page_id = ? AND event_type = 'page_view'
  AND timestamp > unixepoch('now', '-30 days')
GROUP BY day ORDER BY day;

-- Top referrers
SELECT referrer, COUNT(*) as count
FROM analytics_events
WHERE page_id = ? AND event_type = 'page_view'
  AND referrer IS NOT NULL
GROUP BY referrer ORDER BY count DESC LIMIT 10;

-- Country breakdown
SELECT country, COUNT(*) as count
FROM analytics_events WHERE page_id = ?
GROUP BY country ORDER BY count DESC;
```

---

## 12. MONETIZATION (PLACEHOLDERS)

**Free Plan** — Forever free, no credit card
- Unlimited links
- All 12 styles
- All color presets + simple custom colors
- Basic analytics (views + clicks)
- `bytlinks.com/username` URL
- "Powered by BytLinks" badge (cannot remove)

**Pro Plan** — `$[PRICE_PRO]/mo` or `$[PRICE_PRO_ANNUAL]/yr`
- Everything in Free
- Full analytics dashboard
- Remove "Powered by BytLinks" badge
- Advanced color customization (full token control)
- Priority support

**Business Plan** — `$[PRICE_BIZ]/mo` *(post-MVP)*
- Everything in Pro
- Custom domain (`links.yourdomain.com`)
- Multiple pages
- CSV analytics export
- Analytics API access

**Implementation note:** Wire Stripe in locally with test keys. `PRICE_PRO`, `PRICE_PRO_ANNUAL`, `PRICE_BIZ` are `.dev.vars` environment variables. Set actual values when ready to launch.

---

## 13. BUILD ORDER (MVP PHASES)

### Phase 1 — Foundation (Days 1–3)
1. Init monorepo: `apps/web` (Vite + React), `apps/worker` (Hono)
2. `wrangler.toml` with D1 + R2 bindings
3. Run `schema.sql` locally via Wrangler
4. Custom Tailwind config: Define all CSS variables for theme system
5. Basic routing: `/`, `/login`, `/signup`, `/dashboard`, `/:username`

### Phase 2 — Auth (Days 4–5)
1. Worker: `POST /api/auth/register` — hash password, insert user, return JWT
2. Worker: `POST /api/auth/login` — verify, return JWT in httpOnly cookie
3. Worker: `POST /api/auth/logout`
4. React: Login + Signup pages (clean, not generic)
5. Auth context in Zustand

### Phase 3 — Page Builder Core (Days 6–10)
1. Dashboard layout (sidebar on desktop, bottom nav on mobile)
2. Link CRUD: Add, edit, delete, reorder (drag with `@dnd-kit/core`)
3. Social links: Platform selector, icon preview
4. Avatar upload → R2 → serve via Worker
5. Featured link toggle
6. Bio text + display name fields

### Phase 4 — Theme System (Days 11–16)
1. Build CSS variable architecture for all theme tokens
2. Implement all 12 base styles as CSS class sets
3. Color preset selector component
4. Simple custom color picker (3 inputs → derive full palette)
5. Button style picker with live preview
6. Font pair loader (Google Fonts async)
7. Animation system (entrance animations via CSS keyframes)
8. Live preview panel in dashboard

### Phase 5 — Public Page (Days 17–20)
1. Mobile layout renderer (`/:username`)
2. Desktop two-column layout (CSS Grid)
3. Entrance animations fire on load
4. Social icons render with correct style
5. Embed blocks render (YouTube iframe, Spotify iframe)
6. "Powered by BytLinks" badge
7. Analytics event firing (page view, link click via fetch)

### Phase 6 — Analytics (Days 21–25)
1. Worker: log `page_view` and `link_click` events to D1
2. Free analytics: View counts, click counts in dashboard
3. Pro analytics: Full dashboard with Recharts (gated by plan check)
4. NSFW validator wired into link save endpoint

### Phase 7 — Polish + Stripe (Days 26–28)
1. Stripe mock locally: upgrade flow UI, plan stored in D1
2. All styles QA'd on mobile + desktop
3. Error states, loading states, empty states throughout
4. Performance pass: lazy load images, code splitting
5. Anti-vibe-code audit: run the checklist in Section 8.1 against every screen

---

## 14. COMPONENT ARCHITECTURE

### Reusable Primitive Components (`components/ui/`)

These are the atoms. They know nothing about BytLinks-specific business logic. They only receive props and render.

```
components/ui/
├── Button/
│   ├── Button.tsx          ← Component
│   ├── Button.types.ts     ← Props interface
│   └── index.ts            ← Re-export
├── Input/
├── Avatar/
├── Badge/
├── Card/
├── Divider/
├── Spinner/
├── Toast/
└── Modal/
```

**Button example contract:**
```tsx
/**
 * Base button component. All visual variation comes from CSS custom properties.
 * Never hardcodes colors. Never applies theme-specific classes directly.
 */
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}
```

### Composed Feature Components (`components/builder/`, `components/page/`, `components/analytics/`)

These use primitives and know about BytLinks data shapes. They do NOT own state — they receive it via props or read from Zustand.

```
components/builder/
├── LinkCard/         ← Editable link row in dashboard
├── LinkList/         ← Sortable list container
├── SocialPicker/     ← Platform selector + preview
├── ThemeSelector/    ← Style grid + preview
├── ColorPicker/      ← 3-input custom color tool
├── FontPicker/       ← Font pair selector
├── AnimationPicker/  ← Animation selector
├── EmbedBlock/       ← YouTube/Spotify embed manager
└── LivePreview/      ← Iframe preview of public page

components/page/
├── PageHero/         ← Avatar + name + bio + socials
├── PageLinks/        ← Link list renderer
├── PageFeatured/     ← Featured links section
├── PageEmbeds/       ← Embed blocks renderer
├── PageBadge/        ← "Powered by BytLinks" badge
└── PageShell/        ← Top-level layout (mobile/desktop switch)

components/analytics/
├── StatCard/         ← Single metric display
├── SparkLine/        ← Mini trend chart
├── BarChart/         ← Recharts bar wrapper
├── GeoMap/           ← Country breakdown
└── LinkTable/        ← CTR per link table
```

### Custom Hooks (`hooks/`)

Encapsulate all side effects and async logic. Components are presentation-only.

```
hooks/
├── useAuth.ts          ← Login, logout, current user
├── usePage.ts          ← Fetch + update bio page data
├── useLinks.ts         ← CRUD + reorder links
├── useTheme.ts         ← Apply theme tokens to DOM
├── useAnalytics.ts     ← Fetch analytics data
├── useUpload.ts        ← Avatar upload to R2 via Worker
└── useDebounce.ts      ← Debounce util hook
```

### Zustand Stores (`store/`)

One store per domain. Never one giant store.

```
store/
├── authStore.ts        ← user, token, plan
├── pageStore.ts        ← current bio page + editing state
├── linkStore.ts        ← links array + drag state
└── uiStore.ts          ← modal state, toast queue, sidebar open
```

### Rules:
- **No prop drilling beyond 2 levels.** If props need to go deeper, lift into Zustand.
- **No business logic in JSX.** All conditional rendering logic lives in the hook or store.
- **No `any` types.** All shared types live in `packages/shared/types.ts`.
- **No default exports except for route-level pages.** All components use named exports.

---

## 15. CODING STANDARDS FOR CLAUDE PROMPTS

When using Claude Code to generate any part of this project, **prepend every prompt** with:

```
You are building BytLinks — a personal brand link-in-bio platform.
Stack: React 18 + Vite, Tailwind CSS (with CSS custom properties for theming),
Cloudflare Workers + Hono, D1 (SQLite), R2. Local dev via Wrangler.

CRITICAL DESIGN RULES — violation of these is a build failure:
1. NEVER use Inter, Roboto, Open Sans, Lato, or system-ui fonts anywhere.
2. NEVER use purple, violet, or indigo as a brand/accent color. These are reserved for user themes only.
3. NEVER generate gradient text on headlines in the BytLinks UI itself.
4. NEVER default to Tailwind's `indigo`, `violet`, or `purple` scale.
5. NEVER produce glassmorphism in the BytLinks dashboard UI — only in user-facing Glass theme.
6. NEVER use `transition: all` — always specify the exact properties being transitioned.
7. NEVER hardcode colors in components — use CSS custom properties exclusively.
8. NEVER use more than one entrance animation per page or route transition.
9. NEVER produce a mobile-stack layout for desktop views — all dashboard views use real sidebar grid.
10. NEVER leave placeholder copy — all text must be BytLinks-voice copy.

ARCHITECTURE RULES:
11. Every component gets JSDoc comments and a TypeScript props interface in a `.types.ts` file.
12. Error handling everywhere — try/catch, typed error responses, user-facing messages, no silent failures.
13. Mobile-first CSS, but desktop gets a genuinely different layout via Grid.
14. No console.log in production paths.
15. Debounce user inputs. Memoize expensive computations. Lazy load images.
16. Every Worker endpoint validates input and returns typed JSON responses.
17. Max 15 npm dependencies total. Justify each in a comment.
18. Named exports only, except for route-level page components.
19. Business logic lives in hooks, not in JSX or components.
20. After generating, I will manually review and refine for uniqueness.

TYPOGRAPHY RULES:
21. Use extreme weight contrasts — never two weights within 200 of each other for display elements.
22. Letter-spacing on headlines: -0.03em to -0.05em. On uppercase labels: 0.1em to 0.15em.
23. Line-height on body: 1.6 to 1.7. On display: 1.0 to 1.1.
24. Size jumps between display and body must be 3x or greater.
```

---

## 16. FILE STRUCTURE (TARGET)

```
bytlinks/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/              ← Primitive components (Button, Input, Card, Avatar...)
│   │   │   │   │   └── [Component]/
│   │   │   │   │       ├── [Component].tsx
│   │   │   │   │       ├── [Component].types.ts
│   │   │   │   │       └── index.ts
│   │   │   │   ├── builder/         ← Page builder components
│   │   │   │   ├── analytics/       ← Analytics dashboard components
│   │   │   │   └── page/            ← Public page renderer components
│   │   │   ├── hooks/               ← Custom React hooks (all side effects live here)
│   │   │   ├── store/               ← Zustand stores (one per domain)
│   │   │   ├── utils/               ← Pure utility functions
│   │   │   │   ├── colorDerivation.ts   ← HSL palette derivation from 3 user inputs
│   │   │   │   ├── themeApplicator.ts   ← Apply theme JSON → CSS custom properties
│   │   │   │   └── validators.ts        ← Client-side input validation
│   │   │   ├── styles/
│   │   │   │   ├── base.css         ← BytLinks design token definitions (NOT user themes)
│   │   │   │   ├── animations.css   ← All keyframe definitions
│   │   │   │   └── themes/          ← One CSS file per user-facing style
│   │   │   │       ├── minimal.css
│   │   │   │       ├── bold-type.css
│   │   │   │       ├── dark-pro.css
│   │   │   │       ├── glass.css
│   │   │   │       ├── brutalist.css
│   │   │   │       ├── editorial.css
│   │   │   │       ├── soft-warm.css
│   │   │   │       ├── neon-night.css
│   │   │   │       ├── paper.css
│   │   │   │       ├── gradient-flow.css
│   │   │   │       ├── grid.css
│   │   │   │       └── retro.css
│   │   │   └── pages/              ← Route-level components (default exports OK here)
│   │   │       ├── Home.tsx
│   │   │       ├── Login.tsx
│   │   │       ├── Signup.tsx
│   │   │       ├── Dashboard.tsx
│   │   │       └── PublicPage.tsx
│   │   └── vite.config.ts
│   └── worker/
│       ├── src/
│       │   ├── routes/              ← Hono route handlers
│       │   │   ├── auth.ts
│       │   │   ├── pages.ts
│       │   │   ├── links.ts
│       │   │   ├── analytics.ts
│       │   │   └── public.ts
│       │   ├── middleware/          ← Auth, CORS, rate limiting
│       │   ├── validators/          ← Input validation + NSFW check
│       │   └── index.ts             ← Hono app entry
│       └── wrangler.toml
├── packages/
│   └── shared/
│       ├── types.ts                 ← All shared TypeScript types (Theme, Link, User, etc.)
│       └── constants.ts             ← Shared constants (blocked domains, platform keys, etc.)
└── schema.sql
```

---

## 17. COMPETITIVE POSITIONING SUMMARY

| Feature | BytLinks | Linktree | Beacons | Lnk.Bio |
|---|---|---|---|---|
| All styles free | ✅ | ❌ (paywalled) | ❌ | ❌ |
| Desktop website feel | ✅ | ❌ | ❌ | ❌ |
| Server-side analytics | ✅ | ❌ | ❌ | ❌ |
| Data ownership | ✅ | ❌ | ❌ | ❌ |
| No NSFW policy | ✅ | ❌ | ❌ | ❌ |
| Cloudflare edge speed | ✅ | ❌ | ❌ | ❌ |
| 12+ distinct styles | ✅ | ❌ (~5) | ❌ | ❌ |
| Free badge removal | Paid | Paid | Paid | Free |
| Referral analytics free | ❌ (paid) | ❌ | ❌ | ❌ |

---

*This document is the single source of truth for BytLinks development. Update it as decisions are made. Every Claude Code session begins by pasting the relevant sections — at minimum, Section 15 (Coding Standards) must be included in every prompt.*
