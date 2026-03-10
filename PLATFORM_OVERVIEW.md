# BytLinks — Platform Overview

> A full-stack link-in-bio platform built on Cloudflare's edge infrastructure. Users get beautiful, customizable public pages at `bytlinks.com/username` with analytics, multiple content types, and 12 distinct aesthetic themes.

---

## What Is BytLinks?

BytLinks is a modern link-in-bio tool — think Linktree, but with serious design chops and no generic AI aesthetics. Users sign up, claim a username, and build a personal page with links, content blocks, social icons, and rich embeds. Every page is fully themeable with 12 base styles, 15 color presets, custom colors, 11 button styles, 8 font pairs, animated backgrounds, and more.

The entire stack runs on Cloudflare (Workers, D1, R2) with a React + Vite frontend — no traditional server, no database cluster, no S3 bucket. Edge-native from the ground up.

---

## Core Features

### 1. User Accounts & Auth
- Email/password registration with username claim
- PBKDF2-SHA256 password hashing (100k iterations)
- JWT authentication stored in httpOnly, Secure, SameSite=Lax cookies
- Protected dashboard routes via auth middleware
- Plan tiers: Free, Pro, Business

### 2. Public Bio Pages
Every user gets a page at `bytlinks.com/username` with:
- **Avatar** with click-to-expand lightbox
- **Display name & bio** with optional expandable "About Me" section
- **Social icons** — 13 platforms (X, GitHub, LinkedIn, YouTube, Instagram, TikTok, Discord, Twitch, Mastodon, Threads, Bluesky, Email, Website)
- **Links** displayed as styled buttons with optional icons, featured state, and per-link style overrides
- **Content blocks** — 14 types of rich content (see below)
- **Embed blocks** — YouTube, Spotify, Twitter, Substack
- **Animated backgrounds** — Night sky, rain, fireflies, bokeh, waves
- **Analytics tracking** — Page views, link clicks, and block interactions logged automatically

### 3. Dashboard (Page Builder)
A four-tab editor for managing everything:

| Tab | What It Does |
|-----|-------------|
| **Links** | Profile editor, social picker, sortable links & blocks, live preview |
| **Appearance** | Theme style, colors, buttons, fonts, animation, layout, background effects |
| **Analytics** | Views/clicks charts, referrers, countries, devices, link performance, real-time pulse |
| **Settings** | Publish toggle, domain settings (future), billing |

- Desktop: real sidebar grid layout (not a centered card)
- Mobile: bottom navigation
- Live preview panel updates as you edit

### 4. Link Management
- Create, edit, delete links with title, URL, icon, and description
- Drag-to-reorder via @dnd-kit
- Feature toggle to highlight important links
- Visibility toggle to hide without deleting
- **Per-link style overrides** — custom button style, colors, icon style, icon position
- NSFW domain validation (blocks adult content sites)

### 5. Social Links
- 13 supported platforms with auto-detected icons (Lucide)
- 6 icon display styles: icon-only, circle, circle-outline, square, pill-label, minimal-row
- Drag-to-reorder

---

## Theme System

BytLinks' theme engine is its differentiator — deep customization without the generic look.

### 12 Base Styles

| Style | Aesthetic | Key Traits |
|-------|-----------|-----------|
| **Minimal** | Ultra-clean | Whitespace-heavy, Outfit font, fade animation |
| **Bold Type** | Typography-first | Oversized display, Playfair Display, slide-up |
| **Dark Pro** | Developer | Deep dark, cyan accent, mono-serif, left-photo layout |
| **Glass** | Glassmorphism | Blur, depth, light sans, blur-in animation |
| **Brutalist** | Raw | Stark borders, monospace, no softness, no animation |
| **Editorial** | Magazine | Serif body, columns, structured, fade |
| **Soft Warm** | Friendly | Rounded, warm pastels, humanist sans, scale |
| **Neon Night** | Nightlife | Dark, neon highlights, bold condensed, slide-up |
| **Paper** | Analog | Off-white, ink-like, serif, centered |
| **Gradient Flow** | Creator | Smooth gradients, clean sans, pill buttons |
| **Grid** | Geometric | Visible grid structure, cascade animation |
| **Retro** | Vintage | Muted palette, vintage serif, worn feel, shadow buttons |

### Color System (3 Tiers)
- **15 Presets** (free) — Midnight, Sand, Forest, Ink, Rose Gold, Arctic, Dusk, Ember, Ocean, Slate, Clay, Moss, Storm, Coral, Charcoal
- **Simple Custom** (free) — Pick 3 colors (primary, accent, text); the system derives a full palette via HSL manipulation
- **Advanced Custom** (pro) — Full control over 8+ individual CSS tokens

### 11 Button Styles
Filled, Outline, Outline Sharp, Pill, Pill Outline, Underline, Ghost, Shadow, Brutalist, Gradient, Soft — plus "style default" that inherits from the base style.

### 8 Font Pairs
Mono-Serif, Editorial, Grotesque, Slab, Humanist, Condensed, Geometric, Retro — plus "style default."

### 8 Entrance Animations
None, Fade, Slide Up, Slide Down, Scale, Blur In, Cascade, Typewriter — with 5 speed settings (slowest → fastest). Scroll-reveal on desktop via IntersectionObserver. Reduced-motion media query respected.

### 5 Animated Backgrounds
- **Night Sky** — Configurable shooting stars (0–25), static stars (0–300), drift speed
- **Rain** — Drop count (0–600), speed, angle (-60° to 60°), splash intensity
- **Fireflies** — Count (0–180), speed, glow, pulse
- **Bokeh** — Soft light orbs
- **Waves** — Fluid wave animation

Each has an intensity slider (0–100).

### Layout Options
- **3 Layout Variants** — Centered, Left-photo, Right-photo
- **4 Content Display Modes** — Scroll, Below-fold, Hamburger menu, Tab bar
- **Spacing** — Compact, Comfortable, Airy
- **Desktop overrides** — Different layout/content display for desktop vs mobile

---

## Content Blocks (14 Types)

Rich content beyond simple links:

| Block Type | Description | Plan |
|-----------|-------------|------|
| **Embed** | YouTube, Spotify, Twitter, Substack | Free |
| **Rich Link** | Card with URL, description, optional image | Free |
| **Quote** | Styled quote with attribution (4 styles: callout, centered, highlight, minimal) | Free |
| **FAQ** | Expandable accordion Q&A | Free |
| **Countdown** | Timer counting down to a date | Free |
| **Microblog** | Collection of timestamped text posts | Pro |
| **Social Post** | Embedded post from any platform | Pro |
| **Image Gallery** | Single, carousel, or grid layout | Pro |
| **Collabs** | Display collaborator usernames | Pro |
| **Schedule** | Calendar widget integration | Pro |
| **Poll** | Multiple-choice voting (cookie-gated) | Pro |
| **Testimonials** | Collection of quotes with author/role/avatar | Pro |
| **Newsletter** | Email signup form with customizable copy | Pro |
| **File Download** | Downloadable file hosted on R2 | Pro |

**Limits:** Free = 3 blocks (5 types). Pro = 25 blocks (all 14 types).

---

## Analytics

### Dashboard Metrics
- **Overview** — All-time views, 30-day views, total clicks, daily chart, week-over-week comparison
- **Referrers** — Where traffic comes from
- **Countries** — Geographic distribution (via Cloudflare `cf-ipcountry` header)
- **Devices** — Device type, browser, and OS breakdown (parsed from User-Agent)
- **Link Performance** — Click-through rate per link, ranked
- **Real-time Pulse** — Activity in the last 30 minutes
- **Block Analytics** — Per-block interaction data (poll votes, newsletter signups, etc.)

### Tracked Events
`page_view`, `link_click`, `social_click`, `rich_link_click`, `faq_expand`, `embed_interact`, `social_post_click`, `gallery_view`, `collab_click`, `schedule_click`, `file_download`, `poll_vote`, `newsletter_signup`

---

## Public Page Rendering

### Mobile Layout (stacked)
```
┌──────────────────┐
│     [Avatar]     │
│  [Display Name]  │
│      [Bio]       │
│  [Social Icons]  │
│ [Featured Links] │
│    [All Links]   │
│    [Blocks]      │
│    [Embeds]      │
│   [BytLinks ♥]   │
└──────────────────┘
```

### Desktop Layout (35/65 split)
```
┌────────────┬───────────────────────┐
│  LEFT 35%  │     RIGHT 65%         │
│            │                       │
│  [Avatar]  │  [Featured Links]     │
│  [Name]    │  [Link Grid/List]     │
│  [Bio]     │  [Content Blocks]     │
│  [Socials] │  [Embeds]             │
│  (sticky)  │  (scrollable)         │
└────────────┴───────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite at the edge) |
| File Storage | Cloudflare R2 |
| Auth | Custom JWT (HMAC-SHA256) + httpOnly cookies |
| State | Zustand (5 stores) |
| Icons | Lucide (~150 icons mapped) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Rich Text | @tiptap |
| Monorepo | npm workspaces |

### Project Structure
```
bytlinks/
├── apps/
│   ├── web/          — React + Vite frontend
│   │   └── src/
│   │       ├── components/
│   │       │   ├── page/        — Public page renderers
│   │       │   ├── builder/     — Dashboard editor components
│   │       │   └── analytics/   — Analytics dashboard
│   │       ├── hooks/           — 8 custom hooks
│   │       ├── store/           — 5 Zustand stores
│   │       ├── styles/          — Base CSS + 12 theme files
│   │       └── utils/           — Color derivation, validators, tracking
│   └── worker/       — Cloudflare Worker (Hono API)
│       └── src/
│           ├── routes/          — 8 route files
│           ├── middleware/      — Auth middleware
│           └── validators/      — NSFW domain blocklist
├── packages/
│   └── shared/       — Types + constants
├── migrations/       — D1 migration files
└── schema.sql        — Complete database schema
```

---

## API Surface

| Endpoint Group | Routes | Auth Required |
|---------------|--------|--------------|
| `POST /api/auth/register, login, logout` | 3 | No |
| `GET/PUT /api/pages/me`, `POST /api/pages/avatar` | 3 | Yes |
| `GET/POST/PUT/DELETE /api/links`, `PUT /api/links/reorder` | 5 | Yes |
| `GET/POST/PUT/DELETE /api/socials`, `PUT /api/socials/reorder` | 5 | Yes |
| `GET/POST/PUT/DELETE /api/blocks` | 4 | Yes |
| `GET /api/analytics/*` (overview, referrers, countries, devices, links, realtime, blocks, newsletter) | 8 | Yes |
| `POST /api/analytics/track` | 1 | No (public) |
| `GET /api/public/avatar/:key`, `GET /api/public/file/:key` | 2 | No |
| `POST /api/public/poll/:id/vote`, `POST /api/public/newsletter/:id/subscribe` | 2 | No |
| `POST/GET /api/billing/*` | 2 | Yes |

**Total: ~35 endpoints**

---

## Security

- **Password hashing:** PBKDF2-SHA256 with 100k iterations + random salt
- **JWT:** HMAC-SHA256, stored in httpOnly/Secure/SameSite=Lax cookies
- **NSFW filtering:** Server-side domain blocklist on link creation/update
- **Input validation:** Username (3–30 chars, lowercase alphanumeric), password (8+ chars), email regex
- **File uploads:** 5MB max for avatars, image types only
- **Poll voting:** Cookie-gated to prevent duplicate votes

---

## Design Philosophy

BytLinks was built with an explicit **anti-vibe-code** stance — rejecting the generic AI-generated aesthetic:

**Banned patterns:**
- Purple/indigo/violet gradients (AI fingerprint)
- Inter, Roboto, Open Sans, system-ui fonts
- Full-bleed dark hero + neon glow (Linear clone aesthetic)
- Glassmorphism as default (only as user's choice)
- Generic 3-column icon sections
- `max-width: 600px` centered card on desktop
- Scattered micro-animations and infinite pulsing loaders

**Enforced standards:**
- Brand palette: warm slate + teal accent (#0d9488)
- Fonts: Cabinet Grotesk (display) + DM Sans (body)
- Weight contrast mandatory (3x+ size jumps, 200+ weight differences)
- No `transition: all` — always specify exact properties
- No hardcoded colors — CSS custom properties only
- Desktop is first-class (35/65 grid, not a phone mockup)
- One entrance animation per page, no more
- Hover states are functional, not decorative
- Max 15 npm dependencies

---

## Build Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Foundation | ✅ Complete | Monorepo, routing, theme system, DB schema |
| 2. Auth | ✅ Complete | PBKDF2, JWT, cookies, protected routes |
| 3. Page Builder | ✅ Complete | Links, socials, blocks, avatar upload, drag reorder |
| 4. Theme System UI | ✅ Complete | 12 styles, 15 presets, color/button/font/animation pickers |
| 5. Public Pages | ✅ Complete | Full renderer, animations, analytics, desktop layout |
| 6. Analytics (Advanced) | ⬜ Not started | Post-MVP |
| 7. Polish + Stripe | ⬜ Not started | Post-MVP |
