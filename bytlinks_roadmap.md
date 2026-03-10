# BytLinks — Feature Roadmap & Content Block Spec

> Ranked by priority. Each feature includes implementation notes, tech stack recommendations, and best practices.

---

## Part 1: Feature Roadmap

---

### #1 — Server-Side Rendering + Open Graph Images
**Why first:** Public pages are currently client-rendered React, meaning they're invisible to Google. A creator's BytLinks page will often be their #1 search result — it needs to be indexable. OG images also drive click-through rates on every platform share.

**Implementation:**
- Use Cloudflare Workers' `HTMLRewriter` or migrate public page routes to return full HTML from the Worker rather than hydrating from React
- For each `/:username` request, the Worker fetches the user's data from D1, renders a complete HTML shell with all critical `<meta>` tags, then React hydrates on the client
- Generate dynamic OG images using **Cloudflare Workers + `@vercel/og`** (works on the edge, no canvas dependency) — pass username, avatar, bio, and theme color as query params to a `/api/og/:username` endpoint that returns a `image/png` response
- Add `<meta property="og:image">`, `<meta name="description">`, `<title>`, and JSON-LD `Person` schema to every public page
- Auto-generate `sitemap.xml` from all published profiles via a scheduled Worker cron (`0 0 * * *`)
- Add `robots.txt` with `Allow: /` for public pages, `Disallow: /dashboard`

**Best Practices:**
- Cache OG images in R2 with a 24-hour TTL — regenerate on profile save
- Keep the SSR HTML shell lightweight; let React handle interactivity after hydration
- Never block the response on avatar fetching — use a fallback initials-based OG if R2 is slow

---

### #2 — Custom Domains
**Why second:** The single biggest reason professional creators pay for any bio tool. `yourname.com` instead of `bytlinks.com/yourname` is the Pro tier's most compelling upgrade hook.

**Implementation:**
- Gate to Pro/Business tier only
- Use **Cloudflare for SaaS** (formerly Cloudflare SSL for SaaS) — this is your native solution since you're already on Workers. Users add a CNAME pointing their domain to `proxy.bytlinks.com`. Cloudflare handles SSL issuance automatically via the API
- Store `custom_domain` and `domain_verified` columns in D1 on the `pages` table
- Add a `/api/settings/domain` endpoint: `POST` to initiate verification, `GET` to poll status
- In the Worker's router, check the incoming `Host` header first — if it matches a known custom domain in D1, serve that user's page. Fall back to username routing
- Add a DNS verification step (TXT record check) before activating the domain to prevent hijacking
- Show a clear setup wizard in the Settings tab: copy CNAME value → verify → activate

**Best Practices:**
- Poll Cloudflare's API for certificate issuance status and surface it clearly in the dashboard (pending / active / error)
- Cache the `Host → username` lookup in Workers KV with a 5-minute TTL to avoid a D1 hit on every public page load
- Enforce that a custom domain can only be claimed by one account

---

### #3 — Linktree / Competitor Import Tool ✅ *Implemented 2026-03-10*
> URL + CSV parsing, preview/select flow, NSFW filtering, rate limiting, bulk import commit. Frontend modal accessible from link list.

**Why third:** Drops the switching cost to near zero. This is the most direct conversion lever.

**Implementation:**
- Build a `/api/import` endpoint that accepts a URL (Linktree, Beacons, etc.)
- Use a **Cloudflare Worker with `fetch()`** to scrape the target page's HTML, then parse with a lightweight HTML parser (use `node-html-parser` bundled into the Worker, or handle parsing client-side)
- Linktree pages expose link data in a `__NEXT_DATA__` JSON blob embedded in the HTML — parse `props.pageProps.links` directly rather than scraping the DOM. This is far more reliable than CSS selectors
- Map scraped fields: link title → `title`, URL → `url`, thumbnail → `icon` (best-effort)
- For Beacons and others, fall back to DOM scraping: look for `<a>` tags within the main content area with `href` pointing to external domains
- Show a preview of what will be imported before committing — let users deselect individual links
- Also accept CSV upload (Linktree's export format): parse columns `Title`, `URL`, `Active`

**Best Practices:**
- Run the scrape server-side only — never expose a client-side proxy (CORS / abuse vector)
- Respect `robots.txt` — add a note in the UI that import is for personal use only
- Rate-limit to 3 import attempts per account per hour via a KV counter
- Don't silently fail — if a URL can't be scraped, tell the user exactly why (blocked, no links found, etc.)

---

### #4 — Stripe Billing Integration
**Why fourth:** Nothing else matters for revenue without this.

**Implementation:**
- Use **Stripe Checkout + Customer Portal** — do not build a custom payment form. Checkout handles SCA, card vaulting, and PCI compliance out of the box
- Install `stripe` npm package in the Worker (it's edge-compatible). Use the Stripe REST API directly if bundle size is a concern
- Flow: User clicks "Upgrade" → Worker creates a Checkout Session with `mode: 'subscription'`, `price_id` for the selected plan, and `client_reference_id: userId` → redirect to Stripe → on success, Stripe fires a `checkout.session.completed` webhook → Worker receives it, updates D1 `users.plan` column
- Store `stripe_customer_id`, `stripe_subscription_id`, `plan` (`free`/`pro`/`business`), and `plan_expires_at` on the `users` table
- Use **Stripe Customer Portal** for self-serve plan changes and cancellations — one endpoint, no custom UI needed
- Handle `customer.subscription.deleted` and `invoice.payment_failed` webhooks to downgrade accounts gracefully
- Verify all webhook signatures using `stripe.webhooks.constructEvent()` with your `WEBHOOK_SECRET` env var

**Best Practices:**
- Never trust the client for plan status — always derive permissions server-side from D1
- Store `plan_expires_at` so you can offer a grace period on failed payments before hard-downgrading
- Test in Stripe's test mode with their test card suite before going live
- Gate Pro features with a middleware check in Hono: `if (user.plan === 'free' && route.requiresPro) return 403`

---

### #5 — Advanced Analytics Completion
**Why fifth:** Your analytics tab is already scaffolded. Finishing it converts trial users into paid users — seeing real data is the most powerful upgrade prompt.

**Implementation:**
- **A/B Testing for links:** Add an `ab_variant` column to the `links` table (`null` | `'a'` | `'b'`). When variant links exist, serve variant A to ~50% of visitors (deterministic via a hashed cookie value), track separately. Show winner in the Analytics tab
- **Pixel / UTM tracking:** Parse `utm_source`, `utm_medium`, `utm_campaign` from the public page URL on load and store them with each `page_view` event in the analytics table
- **Exportable reports:** Add `GET /api/analytics/export?format=csv&range=30d` — stream a CSV from D1 using chunked responses. Gate to Pro
- **Google Analytics 4 integration:** Add a `ga4_measurement_id` field in Settings. Inject the GA4 script tag server-side into the public page HTML if set — no client-side secret needed
- **Real-time pulse:** Use Cloudflare Durable Objects (you're already on Workers) — a single DO per user holds a WebSocket connection and receives events pushed from the analytics track endpoint. Client polls every 30 seconds as a fallback

**Best Practices:**
- Index `(page_id, created_at)` on the analytics table — without this, 30-day queries will scan every row
- Aggregate into daily rollup rows via a nightly cron Worker to avoid unbounded table growth
- Cap raw event storage at 90 days for free, 2 years for Pro — communicate this clearly

---

### #6 — QR Code Generator ✅ *Implemented 2026-03-10*
> Client-side QR generation with customizable colors, size, PNG/SVG download. Added to Settings panel.

**Why sixth:** A tiny feature with outsized perceived value. Business cards, merch drops, event check-ins. Takes a few hours to ship.

**Implementation:**
- Use **`qrcode` npm package** bundled into the Worker (or generate client-side with `qrcode.js` — client-side is fine here since there's no secret)
- Generate on-demand at `/api/qr/:username?format=png&size=512&color=0d9488` — return the PNG directly
- In the Dashboard, add a "Download QR Code" button in Settings that fetches this endpoint and triggers a file download
- Allow color customization: foreground color defaults to the user's accent color, background white
- Offer SVG format in addition to PNG for print use

**Best Practices:**
- Always include a quiet zone (4 module margin) — QR codes without it fail to scan in many readers
- Test generated codes with multiple scanner apps before shipping
- Cache the generated QR in R2 — only regenerate when the username or color changes

---

### #7 — Profile Templates / Starter Kits ✅ *Implemented 2026-03-10*
> 8 persona-based templates (musician, developer, freelancer, coach, podcaster, photographer, writer, startup). Full-screen picker shown after signup, applies theme only (never overwrites name/bio/links).

**Why seventh:** Solves the cold-start blank-page problem. Also your best content marketing asset.

**Implementation:**
- Create 8–10 fully pre-configured JSON template objects in your `shared` package — each defines a theme style, color preset, button style, font pair, social icon style, and 3–4 sample links/blocks with placeholder copy
- Templates are keyed by persona: `musician`, `developer`, `freelancer`, `coach`, `podcaster`, `photographer`, `writer`, `startup`
- On signup, after username claim, show a full-screen template picker (not a modal) — large previews, one-click apply
- Applying a template does a single `PUT /api/pages/me` with the template's appearance config merged with the user's existing profile data (don't overwrite their name/bio)
- Also expose templates in the Appearance tab as "Start from a template" — useful for existing users who want to redesign

**Best Practices:**
- Keep template JSON in source control and version it — when you update a template, don't break existing users who applied it (their settings are already copied into their profile)
- Render live thumbnail previews using a mini iframe pointing to a static preview URL, not a screenshot service — faster and theme-accurate

---

### #8 — Verified Badge System ✅ *Implemented 2026-03-10*
> DB migration for verified users + verification_requests table. Admin verify/unverify API. User-facing eligibility check + request flow in Settings. BadgeCheck icon on public page hero.

**Why eighth:** Highest-leverage trust signal for the professional positioning. Cheap to build, high perceived value.

**Implementation:**
- Add a `verified` boolean and `verified_at` timestamp to the `users` table
- Verification is manual at first — add an admin-only endpoint `PUT /api/admin/users/:id/verify` protected by a separate `ADMIN_SECRET` env var header check
- Display a small badge icon (use a Lucide `BadgeCheck` icon in your teal accent color) next to the display name on the public page
- Add a "Request Verification" button in Settings that submits a form to a D1 `verification_requests` table with: account age, link to LinkedIn or professional website, brief description. You review manually
- Gate the request button behind account age > 14 days and at least 3 links published

**Best Practices:**
- Don't automate verification early — manual review is the point. The scarcity and human review is what makes the badge mean something
- Publish a clear, short Verification Criteria page (professional use, real identity, active page). No adult content platforms — this aligns directly with your brand promise
- Revoke verified status automatically if NSFW links are detected on the account

---

### #9 — Team / Agency Accounts
**Why ninth:** Your highest-value Business tier feature. Agencies managing 10+ client profiles will pay $20/month without hesitation.

**Implementation:**
- Add a `teams` table: `id`, `owner_user_id`, `name`, `plan`, `seat_limit`
- Add a `team_members` table: `team_id`, `user_id`, `role` (`admin` | `editor` | `viewer`), `invited_email`, `status` (`pending` | `active`)
- Add a `team_id` FK to the `pages` table — a page belongs to either a user or a team
- Invite flow: `POST /api/teams/:id/invite` with email → create pending record → send invite email via **Cloudflare Email Routing + a transactional provider like Resend** (Resend has a Workers-compatible SDK)
- In the Dashboard, team admins see a switcher dropdown in the top nav — "My Pages" vs each team they belong to
- Editors can edit any page in the team. Viewers can only view analytics. Admins can invite/remove members and manage billing

**Best Practices:**
- Enforce seat limits server-side on every invite attempt — don't rely on client-side gating
- Scope all API middleware to check team membership before returning any team-owned page data
- Log all team actions (invite, remove, edit) to an `audit_log` table for accountability

---

### #10 — Link Scheduling & Auto-Expiry ✅ *Implemented 2026-03-10*
> published_at + expires_at columns on links. Pro plan-gated. Server-side temporal filtering on public page. Schedule UI in link editor with visual indicators (scheduled/expiring/expired).

**Why tenth:** A quiet power feature that justifies Pro for anyone running campaigns, events, or product launches.

**Implementation:**
- Add `published_at` and `expires_at` datetime columns to the `links` table
- Add a **Cloudflare Cron Trigger** (`[triggers] crons = ["*/5 * * * *"]`) — every 5 minutes, the Worker queries D1 for links where `published_at <= now()` and `active = false` (publish them) or `expires_at <= now()` and `active = true` (expire them), and updates in batch
- In the link editor UI, add "Schedule" and "Auto-expire" date/time pickers (use the native `<input type="datetime-local">` — no library needed)
- Show a clock icon on scheduled links in the Dashboard link list with a tooltip showing the schedule

**Best Practices:**
- Store all datetimes in UTC — convert to the user's local timezone only in the UI using `Intl.DateTimeFormat`
- Don't rely solely on the cron for expiry — also check `expires_at` on every public page render in the Worker and filter expired links server-side, so a slow cron can't serve stale data
- Notify users via email 1 hour before a scheduled link goes live (use Resend)

---

## Part 2: Content Blocks — Complete Spec

### Currently Shipped (14 blocks)

| Block | Plan |
|-------|------|
| Embed (YouTube, Spotify, Twitter, Substack) | Free |
| Rich Link | Free |
| Quote | Free |
| FAQ / Accordion | Free |
| Countdown Timer | Free |
| Microblog | Pro |
| Social Post | Pro |
| Image Gallery | Pro |
| Collabs | Pro |
| Schedule / Calendar | Pro |
| Poll | Pro |
| Testimonials | Pro |
| Newsletter Signup | Pro |
| File Download | Pro |

---

### New Blocks to Add

---

#### 🗺️ Location / Map Block *(Free)*
A static embed showing a location — an office address, studio, event venue, or home city. Renders as a styled card with a map thumbnail, address, and optional "Get Directions" CTA button.

**Implementation:** Use the **Google Maps Static API** (a simple `<img>` tag with a signed URL — no JS SDK needed). Store `lat`, `lng`, `label`, and `place_id` in the block's JSON data. Alternatively use **OpenStreetMap + Leaflet** for a zero-cost option. Gate the interactive map to Pro; show static image for Free.

---

#### 📅 Availability / Booking Block *(Pro)*
A "Book a call with me" block that shows a user's real-time availability and lets visitors book directly — without leaving the page. Replaces the awkward "here's my Calendly link" link.

**Implementation:** Integrate with **Calendly's embed API** (they have an `initInlineWidget()` function designed for embeds) or **Cal.com** (open-source, more flexible, better for privacy-conscious users). Store the user's booking URL in the block config. Render as an inline iframe with a custom border style that inherits the page theme. This is far more compelling than a Calendly link buried in a list.

---

#### 🎵 Music / Track Player Block *(Pro)*
An audio player for musicians, podcasters, and voice artists — host a track directly on BytLinks rather than linking out. The visitor plays right on the page.

**Implementation:** Store audio files in **R2** (you already have this for file downloads — reuse the same upload flow). Use the HTML5 `<audio>` element styled to match the current theme. Show waveform visualization using **wavesurfer.js** (lightweight, well-maintained). Limit file size to 25MB, formats: MP3, WAV, OGG. Track play events in analytics as `audio_play`. Gate to Pro.

---

#### 📊 Stats / Numbers Block *(Free)*
A row of impressive numbers with labels — "12,000 newsletter subscribers", "4.9★ rating", "8 years experience". Simple but extremely effective for social proof on professional profiles.

**Implementation:** Each stat is a `{ value: string, label: string }` object in a JSON array. Optionally animate the number counting up on scroll using a simple `IntersectionObserver` + `requestAnimationFrame` counter. No external library needed. Render as a horizontal flex row on desktop, 2-column grid on mobile. Support up to 6 stats.

---

#### 💬 Chat / Contact Block *(Pro)*
A minimal contact form directly on the page — name, email, message. Submissions are stored in D1 and forwarded to the profile owner's email. No third-party form tool needed.

**Implementation:** `POST /api/public/contact/:username` endpoint on the Worker. Validate with your existing validators (email regex, max lengths). Store in a `contact_submissions` table with `page_id`, `name`, `email`, `message`, `created_at`. Email the page owner via **Resend** on each submission. Add a simple "New message" indicator in the Dashboard. Rate-limit to 5 submissions per IP per hour via a KV counter. Gate to Pro.

---

#### 🧵 Latest Posts Feed Block *(Pro)*
Auto-syncs the user's latest posts from a connected platform — pulls the last 3–5 posts and displays them as cards, updated automatically. More dynamic than a static link.

**Implementation:** Support **RSS feeds first** (RSS is universal — most platforms expose one). Store `feed_url` and `last_fetched_at` in the block config. Use a **Cloudflare Cron** to refresh feeds every hour, store parsed post data (title, URL, date, image) in D1. Display as compact cards with the theme's card styling. Platforms to support: Substack (RSS), Medium (RSS), Dev.to (RSS), Ghost (RSS), LinkedIn (no RSS — manual link only). Do not scrape — RSS only.

---

#### 🏆 Featured Project / Case Study Block *(Pro)*
A richly formatted card for showcasing a single project — image, title, description, tags, links (live site + source). Think a portfolio card, not a simple link.

**Implementation:** Block config stores `image_r2_key`, `title`, `description` (up to 300 chars), `tags` (string array, max 5), `live_url`, `source_url`. Image upload reuses the existing R2 avatar upload flow. Renders as a horizontal card on desktop (image left, content right), stacked on mobile. Optionally support a "View more projects" link that expands to show multiple projects in a grid — store as an array of project objects in one block.

---

#### 📜 Resume / CV Highlight Block *(Pro)*
A structured, scannable work history block — employer, role, dates, one-line description. The professional alternative to linking a PDF resume.

**Implementation:** Block config stores an array of `{ company, role, start_date, end_date | 'Present', description }` entries, sorted descending. Render as a vertical timeline using CSS `border-left` with dot markers — no library. Add a "Download full resume" link field that points to a File Download block or external URL. This pairs perfectly with the File Download block for users who want both a scannable summary and the full PDF.

---

#### ❓ Tip Jar / Support Block *(Pro)*
Let visitors send a one-time payment directly from the bio page — like Buy Me a Coffee but native to BytLinks, with no third-party cut.

**Implementation:** Use **Stripe Payment Links** (not a full Checkout integration — Payment Links are pre-built URLs that require zero backend code to create). Let users paste their Stripe Payment Link URL into the block config. Renders as a styled CTA button with a configurable amount and message (e.g., "Buy me a coffee — $5"). Track `tip_click` events in analytics. For users who don't have Stripe, offer Ko-fi and Buy Me a Coffee URL fields as fallbacks. Avoid building a custom payment flow for this — Payment Links are safer and faster.

---

#### 🎯 Call to Action Block *(Free)*
A full-width, visually prominent CTA — bigger and bolder than a regular link button. Ideal for a primary conversion goal: "Book a free call", "Download my guide", "Join the waitlist".

**Implementation:** Config stores `headline` (large text), `subtext` (optional small text below), `button_label`, `button_url`, and `style` (`filled` | `outline` | `gradient`). Inherits the theme's accent color. This is distinct from a regular link because it takes up the full block width and includes multi-line copy. Render with `role="region"` and `aria-label` for accessibility.

---

#### 🔗 Link Grid Block *(Pro)*
A compact visual grid of icon + label links — ideal for portfolios, resource libraries, or tool stacks. More scannable than a vertical list of buttons when you have 8–20 destinations.

**Implementation:** Config stores an array of `{ label, url, icon_name, icon_color }` objects. Use your existing Lucide icon map for icons. Render as a responsive CSS grid: 3 columns on desktop, 2 on mobile. Each cell is a small card with the icon above and label below. This is particularly appealing to developers (show your tech stack with logos) and educators (link to all course modules). Gate to Pro for more than 6 items.

---

#### 📆 Event / Drop Block *(Free)*
A single upcoming event card — date, time, venue (or "Online"), and a ticket/registration link. More structured and visually distinct than a plain link. Auto-hides after the event date passes.

**Implementation:** Config stores `event_name`, `event_date` (datetime), `venue` (string), `ticket_url`, `image_r2_key` (optional). Render a styled card with a large date badge on the left (day number large, month above, year small below), event name and venue on the right, and a "Get Tickets" button. In the Worker's public page render, filter out Event blocks where `event_date < now()` — they disappear automatically without any user action. This block is free because it drives real engagement for creators with events.

---

### Summary Table — All Blocks

| # | Block | Plan | Category |
|---|-------|------|----------|
| 1 | Embed (YouTube/Spotify/Twitter/Substack) | Free | Media |
| 2 | Rich Link | Free | Links |
| 3 | Quote | Free | Text |
| 4 | FAQ / Accordion | Free | Text |
| 5 | Countdown Timer | Free | Utility |
| 6 | Stats / Numbers | Free | Social Proof |
| 7 | Call to Action | Free | Conversion |
| 8 | Location / Map | Free | Utility |
| 9 | Event / Drop | Free | Utility |
| 10 | Microblog | Pro | Text |
| 11 | Social Post | Pro | Media |
| 12 | Image Gallery | Pro | Media |
| 13 | Collabs | Pro | Social |
| 14 | Schedule / Calendar | Pro | Utility |
| 15 | Poll | Pro | Interactive |
| 16 | Testimonials | Pro | Social Proof |
| 17 | Newsletter Signup | Pro | Conversion |
| 18 | File Download | Pro | Utility |
| 19 | Availability / Booking | Pro | Utility |
| 20 | Music / Track Player | Pro | Media |
| 21 | Chat / Contact Form | Pro | Interactive |
| 22 | Latest Posts Feed | Pro | Dynamic |
| 23 | Featured Project | Pro | Portfolio |
| 24 | Resume / CV Highlight | Pro | Portfolio |
| 25 | Tip Jar / Support | Pro | Monetization |
| 26 | Link Grid | Pro | Links |

**Total: 26 blocks — 9 Free, 17 Pro**
