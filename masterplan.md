# BytLinks Execution Masterplan
> Actionable sprint-by-sprint plan derived from bytlinks-master-plan.md
> Each task includes exact files, SQL, and Claude Code instructions
> Status markers: `[ ]` todo, `[x]` done, `[-]` skipped

---

## Current State Summary

| System | Status | Notes |
|--------|--------|-------|
| Stripe billing | Mock only | `mock_cus_*` IDs, no SDK, no webhooks |
| Password reset | Missing | No table, no endpoints, no UI |
| Email system | Missing | Only newsletter forwarding to Mailchimp/ConvertKit |
| Referral system | Missing | No schema, no endpoints |
| Onboarding checklist | Missing | Template picker only, no guided steps |
| Blog | Missing | No infrastructure at all |
| Showcase page | Missing | No /showcase route |
| Use case pages | 6 exist | All have placeholder testimonials |
| Upgrade modal | Missing | Upgrade routes to /settings (2 clicks away) |
| Custom domains | Schema only | `custom_domain` column exists, zero implementation |
| Fonts | 14 families loaded upfront | ~45 font files, massive LCP hit |
| Image optimization | Partial | `loading="lazy"` on some renderers, no `fetchpriority` |
| SoftwareApplication schema | Missing | Only Person JSON-LD on profiles |
| Homepage copy | Old positioning | "One link. Everything people need." |
| Block limit (free) | 3 blocks | May be too aggressive |
| Admin dashboard | Complete | Tabbed, 5 endpoints, charts, queue |

---

## Sprint 1 — Critical Bugs & Revenue Blockers (Week 1)

### 1.1 Password Reset Flow via Resend

**Why first:** Users who forget passwords are permanently lost. No recovery = no retention.

**Migration:** `migrations/027_password_reset_tokens.sql`
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_reset_user ON password_reset_tokens(user_id);
```

**Backend — `apps/worker/src/routes/auth.ts`:**
- [ ] Add `POST /api/auth/forgot-password` — accepts email, generates crypto token, stores bcrypt hash in DB, sends reset email via Resend
- [ ] Add `POST /api/auth/reset-password` — validates token (not expired, not used), updates password hash, marks token used
- [ ] Rate limit: max 3 reset requests per email per hour

**Frontend:**
- [ ] Create `apps/web/src/pages/ForgotPassword.tsx` — email input form
- [ ] Create `apps/web/src/pages/ResetPassword.tsx` — new password form (reads `?token=` from URL)
- [ ] Add "Forgot password?" link to `apps/web/src/pages/Login.tsx`
- [ ] Add routes to `apps/web/src/App.tsx`

**Environment:**
- [ ] Add `RESEND_API_KEY` to `Env` type in `apps/worker/src/index.ts`
- [ ] Add `RESEND_API_KEY` to Cloudflare Worker secrets
- [ ] Create email utility: `apps/worker/src/utils/email.ts` (Resend REST API wrapper)

---

### 1.2 Welcome Email on Signup

**Why now:** While Resend is being set up for password reset, add the welcome email — highest-impact transactional email.

**Backend — `apps/worker/src/routes/auth.ts`:**
- [ ] After successful registration (where user + bio_page are created), call Resend to send welcome email
- [ ] Email content: confirm username URL, 3 quick profile steps, link to dashboard

**Email template:** `apps/worker/src/emails/welcome.ts`
- [ ] Subject: "Your BytLinks page is live"
- [ ] HTML template with brand styling
- [ ] Plain text fallback

---

### 1.3 Real Stripe Integration

**Why now:** No revenue path = no business. This unblocks everything.

**Migration:** `migrations/028_stripe_subscription.sql`
```sql
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
```

**Backend — `apps/worker/src/routes/billing.ts` (rewrite):**
- [ ] Install/import Stripe SDK (or use REST API for Workers compatibility)
- [ ] `POST /api/billing/upgrade` → Create Stripe Checkout Session, return session URL
- [ ] `POST /api/billing/downgrade` → Cancel Stripe subscription at period end
- [ ] `GET /api/billing/status` → Return real subscription status from Stripe
- [ ] `POST /api/billing/webhook` → Handle Stripe webhooks:
  - `checkout.session.completed` → set plan='pro', store subscription_id
  - `customer.subscription.deleted` → set plan='free', clear subscription_id
  - `invoice.payment_failed` → send failure email via Resend
- [ ] `GET /api/billing/portal` → Create Stripe Customer Portal session URL

**Frontend — `apps/web/src/components/settings/SettingsPanel.tsx`:**
- [ ] Remove "This is a demo" disclaimer
- [ ] Upgrade button → redirect to Stripe Checkout URL from API
- [ ] Add "Manage Subscription" link → Stripe Customer Portal
- [ ] Show next billing date, payment method status

**Environment:**
- [ ] Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Env type
- [ ] Add both to Cloudflare Worker secrets
- [ ] Create Stripe product + price in Stripe Dashboard ($9.99/mo recurring)

---

### 1.4 Fix Link Scheduling Paywall

**File:** `apps/web/src/components/builder/links/LinkEditor.tsx` (or wherever scheduling UI lives)

- [ ] Replace `opacity-50 pointer-events-none` with visible Pro badge + explanation
- [ ] Add inline callout: "Link scheduling is a Pro feature"
- [ ] Add "Upgrade to Pro" button (uses upgrade modal from Sprint 2)

---

### 1.5 Homepage Copy Update (Positioning Pivot)

**Files to modify:**

**`apps/web/src/components/home/HeroSection.tsx`:**
- [ ] Headline: "One link. Everything people need." → "Your professional presence, in one link."
- [ ] Subheadline: update to "A link in bio that looks like you hired a designer. Business card, portfolio, analytics — all in one URL."

**`apps/web/index.html`:**
- [ ] Meta title: → "BytLinks — Professional Link in Bio & Digital Identity"
- [ ] Meta description: → "The professional alternative to Linktree. Custom page, digital business card, contact rolodex, and privacy-first analytics — free forever."

---

## Sprint 2 — Conversion Funnel (Week 2)

### 2.1 Inline Upgrade Modal

**Why:** Stop sending users to /settings. Capture them at the desire moment.

**Create:** `apps/web/src/components/shared/UpgradeModal.tsx`
- [ ] Overlay modal with Pro features list (all 19 blocks, 25 max, scheduling, remove badge, priority support)
- [ ] Primary CTA: "Upgrade Now — $9.99/mo" → calls billing upgrade endpoint → redirect to Stripe
- [ ] Secondary: "Maybe later" dismiss
- [ ] Accept `trigger` prop for analytics tracking (which feature triggered it)

**Wire up in:**
- [ ] `apps/web/src/components/builder/BlockPalette.tsx` — Pro block click
- [ ] Block limit reached state
- [ ] Link scheduling section (from 1.4)
- [ ] Any other gated feature

---

### 2.2 Onboarding Checklist

**Migration:** `migrations/029_dismissed_onboarding.sql`
```sql
ALTER TABLE users ADD COLUMN dismissed_onboarding INTEGER DEFAULT 0;
```

**Create:** `apps/web/src/components/dashboard/OnboardingChecklist.tsx`
- [ ] Dismissible widget for accounts < 7 days old
- [ ] Checklist items (auto-check as completed):
  - Add a profile photo (check: avatar_r2_key is not null)
  - Write a bio (check: bio is not empty)
  - Add your first link (check: links count > 0)
  - Pick a theme (check: theme != default — or always checked since template picker runs)
  - Share your page (show bytlinks.com/{username} with copy button)
  - Set up your business card (check: business_cards count > 0)
- [ ] Progress bar: "X of 6 complete"
- [ ] Each item is a direct action link
- [ ] Store dismissal in localStorage + `dismissed_onboarding` column

**Backend:**
- [ ] Add `GET /api/onboarding/status` endpoint — returns completion state for all 6 items
- [ ] Add `POST /api/onboarding/dismiss` endpoint

---

### 2.3 Drip Email Sequence

**Migration:** `migrations/030_email_tracking.sql`
```sql
CREATE TABLE IF NOT EXISTS email_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id, email_type)
);
CREATE INDEX idx_email_sends_user ON email_sends(user_id);
```

**Email templates to create in `apps/worker/src/emails/`:**
- [ ] `activation-nudge.ts` — 24hrs post-signup, IF no avatar → "Your page is missing a face"
- [ ] `engagement-nudge.ts` — 72hrs post-signup, IF < 3 links → "3 things that make a great page"
- [ ] `upgrade-day7.ts` — Day 7, IF free plan → "You've had visitors" (include real view count)
- [ ] `upgrade-day14.ts` — Day 14, IF free plan → "Your data is always yours"

**Cron job — `apps/worker/src/index.ts` (scheduled handler):**
- [ ] Add email drip logic to existing cron trigger (runs every 6 hours)
- [ ] Query users at each stage who haven't received that email yet
- [ ] Send via Resend, record in `email_sends` table
- [ ] Respect unsubscribe (add `email_unsubscribed` column to users if needed)

---

### 2.4 Raise Free Block Limit to 5

**File:** `packages/shared/constants.ts`
- [ ] Change `max_blocks: 3` → `max_blocks: 5` for free tier
- [ ] This is a hypothesis — monitor conversion rate before/after

---

## Sprint 3 — SEO & Performance (Week 3)

### 3.1 Font Loading Optimization (Biggest Performance Win)

**Current problem:** 14 Google Font families (~45 files) loaded on every page load.

**`apps/web/index.html`:**
- [ ] Remove the massive Google Fonts `<link>` tag
- [ ] Add only the 2 fonts needed for marketing pages (e.g., Cabinet Grotesk + DM Sans)

**`apps/worker/src/utils/injectMeta.ts`:**
- [ ] For public profile pages, inject only the 2 font families for that user's theme
- [ ] Create font mapping: theme → [displayFont, bodyFont]

**`apps/web/src/hooks/` or `apps/web/src/utils/`:**
- [ ] Create `loadThemeFonts.ts` utility — dynamically inject Google Fonts link for the active theme
- [ ] Call from dashboard/editor when theme changes
- [ ] Call from public page renderer on mount

**Expected impact:** LCP improvement of 1-2 seconds.

---

### 3.2 Image Optimization

**Public profile renderer components:**
- [ ] Add `fetchpriority="high"` to avatar image in `PageHero` component (LCP element)
- [ ] Verify all below-fold images have `loading="lazy"` (most already do)
- [ ] Add explicit `width` and `height` attributes to all `<img>` tags to prevent CLS

---

### 3.3 Use Case Pages — Fix Placeholder Content

**File:** `apps/web/src/data/useCases.ts`

All 6 pages have: `testimonialRole: 'To be added before launch'` and `testimonialQuote: 'Placeholder — do not display'`

- [ ] Write realistic testimonials for each use case (or hide testimonial section until real ones exist)
- [ ] Add unique, keyword-rich meta titles per page:
  - /for/musicians → "Link in Bio for Musicians | BytLinks"
  - /for/freelancers → "Professional Link in Bio for Freelancers | BytLinks"
  - /for/coaches → "Link in Bio for Coaches & Consultants | BytLinks"
  - /for/creators → "Link in Bio for Content Creators | BytLinks"
  - /for/podcasters → "Link in Bio for Podcasters | BytLinks"
  - /for/businesses → "Business Link in Bio Page | BytLinks"
- [ ] Ensure unique h1 text per page

---

### 3.4 New Use Case Pages

**File:** `apps/web/src/data/useCases.ts` + `apps/web/src/App.tsx` (router)

Add 5 new pages:
- [ ] /for/photographers → "Link in Bio for Photographers"
- [ ] /for/developers → "Link in Bio for Developers & Designers"
- [ ] /for/artists → "Link in Bio for Artists"
- [ ] /for/real-estate → "Link in Bio for Real Estate Agents"
- [ ] /for/personal → "Simple Personal Website & Link in Bio"

Each needs: unique copy, relevant features highlighted, correct meta tags.

**Update sitemap in `apps/worker/src/index.ts`** to include new pages.

---

### 3.5 Schema.org Structured Data

**`apps/web/src/pages/Home.tsx`:**
- [ ] Add `SoftwareApplication` JSON-LD via react-helmet-async:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BytLinks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Professional link in bio and digital identity platform..."
}
```

**`apps/web/src/pages/UseCasePage.tsx`:**
- [ ] Add BreadcrumbList JSON-LD: Home → Use Cases → {This Page}

---

### 3.6 PageSpeed Audit

- [ ] Run PageSpeed Insights on https://www.bytlinks.com (homepage)
- [ ] Run PageSpeed Insights on a real public profile page
- [ ] Record LCP, CLS, FID/INP scores
- [ ] Address any additional issues found

---

## Sprint 4 — Growth Features (Week 4)

### 4.1 Referral System

**Migration:** `migrations/031_referrals.sql`
```sql
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referred_by TEXT REFERENCES users(id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
```

**Backend — `apps/worker/src/routes/auth.ts`:**
- [ ] On registration: generate 8-char unique referral_code
- [ ] On registration: if `?ref=CODE` was passed, look up referrer and set `referred_by`

**Backend — new `apps/worker/src/routes/referrals.ts`:**
- [ ] `GET /api/referrals` — return user's referral code, link, and count of referrals
- [ ] `GET /api/referrals/stats` — detailed referral stats (who signed up, who upgraded)

**Frontend:**
- [ ] Add "Refer & Earn" section to settings or dashboard
- [ ] Show referral link with copy button: `bytlinks.com/signup?ref=CODE`
- [ ] Show referral count

**Signup page:**
- [ ] Read `ref` from URL query params
- [ ] Store in localStorage on landing
- [ ] Send with registration request

---

### 4.2 Profile Showcase Page

**Create:** `apps/web/src/pages/Showcase.tsx`
- [ ] Public page at `/showcase`
- [ ] Query published, verified (or high-quality) profiles
- [ ] Filterable grid by use case / template type
- [ ] Each card: avatar, name, profession, theme preview, link to profile
- [ ] "Get Featured" CTA
- [ ] Add to router in `App.tsx`
- [ ] Link from footer and homepage BuildGallery section

**Backend:**
- [ ] `GET /api/public/showcase` — return featured/verified profiles with pagination

---

### 4.3 Export System Enhancement

The admin export exists. Consider adding user-facing data export:
- [ ] `GET /api/settings/export` — download all user data as JSON (links, blocks, analytics, contacts)
- [ ] Add "Export My Data" button to settings panel
- [ ] This is a trust signal ("your data is always yours")

---

## Sprint 5 — Content & SEO (Month 2)

### 5.1 Blog Infrastructure

**Approach:** Markdown files in repo, processed at build time or served by Worker.

**Create structure:**
```
apps/web/src/data/blog/
├── posts.ts          (blog post metadata index)
├── linktree-alternatives.md
├── bytlinks-vs-linktree.md
├── professional-link-in-bio.md
├── link-in-bio-freelancers.md
└── digital-business-card.md
```

**Create pages:**
- [ ] `apps/web/src/pages/Blog.tsx` — blog index with post cards
- [ ] `apps/web/src/pages/BlogPost.tsx` — individual post renderer (markdown → HTML)
- [ ] Add routes: `/blog` and `/blog/:slug`

**First 5 posts:**
1. [ ] "The Best Linktree Alternatives in 2026 (Free & Paid)"
2. [ ] "BytLinks vs Linktree: Honest Comparison"
3. [ ] "How to Create a Professional Link in Bio Page"
4. [ ] "Best Link in Bio for Freelancers"
5. [ ] "What Is a Digital Business Card (And Why You Need One)"

**Update sitemap** to include /blog and all blog posts.

---

### 5.2 Free SEO Tool Pages

High-traffic keyword targets that funnel into signups:

- [ ] `/tools/instagram-bio-generator` — AI-powered bio generator (or template-based)
- [ ] `/tools/qr-code-generator` — standalone QR code tool (reuse existing QR logic)
- [ ] `/tools/business-card-maker` — preview tool that leads to signup
- [ ] `/tools/bio-character-counter` — simple utility for Instagram bio limits

Each tool page needs:
- Unique meta tags targeting the keyword
- Functional tool (not just a landing page)
- CTA: "Want more? Create your free BytLinks page"
- Add to sitemap

---

## Sprint 6 — Advanced Features (Month 3+)

### 6.1 Custom Domains (Cloudflare for SaaS)

**The biggest pricing lever.** Justifies raising Pro to $12.99-14.99/mo.

**Migration:** `migrations/032_domain_verified.sql`
```sql
ALTER TABLE bio_pages ADD COLUMN domain_verified INTEGER DEFAULT 0;
```

**Backend — new `apps/worker/src/routes/domains.ts`:**
- [ ] `POST /api/settings/domain` — set custom_domain on bio_page, initiate verification
- [ ] `DELETE /api/settings/domain` — remove custom domain
- [ ] `GET /api/settings/domain/status` — check DNS verification status
- [ ] DNS TXT record verification flow

**Worker routing — `apps/worker/src/index.ts`:**
- [ ] Check incoming request Host header against verified custom_domains
- [ ] If match, serve that profile's content (same as /:username route)
- [ ] Handle SSL via Cloudflare for SaaS certificate issuance

**Frontend:**
- [ ] Custom domain settings UI in dashboard/settings
- [ ] DNS instructions for users
- [ ] Verification status indicator
- [ ] Gate behind Pro plan

---

### 6.2 Annual Pricing

**After validating monthly conversions:**
- [ ] Add annual price: $99/year (2 months free)
- [ ] Update Stripe product with annual price
- [ ] Update pricing UI with monthly/annual toggle
- [ ] Update billing endpoints to support both intervals

---

### 6.3 Affiliate Program

**After referral system proves traction:**
- [ ] Integrate with Rewardful or similar
- [ ] 30-40% recurring commission
- [ ] Affiliate dashboard showing earnings
- [ ] Payout tracking

---

## Marketing Execution (Parallel Track)

### Week 1-2 (Zero Budget)
- [ ] Submit sitemap.xml to Google Search Console
- [ ] Monitor indexing of profile pages + use case pages
- [ ] Set up Core Web Vitals monitoring
- [ ] Start build-in-public Twitter/X presence (#buildinpublic #indiehacker)
- [ ] Run PageSpeed Insights, record baseline scores

### Week 3-4 (Zero Budget)
- [ ] Prepare Product Hunt launch materials (GIF demo, tagline, description)
- [ ] Launch on Product Hunt (Tuesday or Wednesday)
- [ ] Begin genuine Reddit participation (r/entrepreneur, r/freelance, r/webdev, r/socialmedia)
- [ ] Post on Indie Hackers, Designer News, Hacker News (Show HN)

### Month 2 ($500-1000 Budget)
- [ ] 10 micro-influencer outreach deals ($50-100 each, 5k-50k follower range)
- [ ] First newsletter sponsorship ($100-300)
- [ ] Target: productivity, freelancing, creator economy newsletters

### Month 3+
- [ ] AppSumo listing ($49-79 lifetime deal) — get 500+ users fast
- [ ] Launch affiliate program via Rewardful
- [ ] Scale content SEO (2 blog posts/month minimum)

---

## Pricing Evolution

| Phase | Plan | Price | Trigger |
|-------|------|-------|---------|
| Now | Free | $0 | — |
| Now | Pro | $9.99/mo | Stripe goes live |
| After custom domains | Pro | $12.99/mo | Custom domains ship |
| At scale | Pro Annual | $99/year | Monthly conversions validated |
| Future | Business | $24.99/mo | Multi-page, teams |

**Target: 7,500-10,000 registered users = $5k MRR at 6-8% conversion.**

---

## File Index — What Gets Created vs Modified

### New Files
| File | Sprint | Purpose |
|------|--------|---------|
| `migrations/027_password_reset_tokens.sql` | 1 | Reset token storage |
| `migrations/028_stripe_subscription.sql` | 1 | Stripe subscription ID |
| `migrations/029_dismissed_onboarding.sql` | 2 | Onboarding dismissal flag |
| `migrations/030_email_tracking.sql` | 2 | Drip email dedup |
| `migrations/031_referrals.sql` | 4 | Referral codes |
| `migrations/032_domain_verified.sql` | 6 | Domain verification |
| `apps/worker/src/utils/email.ts` | 1 | Resend API wrapper |
| `apps/worker/src/emails/welcome.ts` | 1 | Welcome email template |
| `apps/worker/src/emails/activation-nudge.ts` | 2 | 24hr nudge |
| `apps/worker/src/emails/engagement-nudge.ts` | 2 | 72hr nudge |
| `apps/worker/src/emails/upgrade-day7.ts` | 2 | Day 7 upgrade |
| `apps/worker/src/emails/upgrade-day14.ts` | 2 | Day 14 upgrade |
| `apps/worker/src/routes/referrals.ts` | 4 | Referral endpoints |
| `apps/worker/src/routes/domains.ts` | 6 | Custom domain endpoints |
| `apps/web/src/pages/ForgotPassword.tsx` | 1 | Password reset request |
| `apps/web/src/pages/ResetPassword.tsx` | 1 | Password reset form |
| `apps/web/src/pages/Showcase.tsx` | 4 | Public showcase |
| `apps/web/src/pages/Blog.tsx` | 5 | Blog index |
| `apps/web/src/pages/BlogPost.tsx` | 5 | Blog post renderer |
| `apps/web/src/components/shared/UpgradeModal.tsx` | 2 | Inline upgrade modal |
| `apps/web/src/components/dashboard/OnboardingChecklist.tsx` | 2 | Setup checklist |
| `apps/web/src/utils/loadThemeFonts.ts` | 3 | Dynamic font loading |

### Modified Files
| File | Sprint | Changes |
|------|--------|---------|
| `apps/worker/src/routes/auth.ts` | 1 | Password reset + welcome email + referral tracking |
| `apps/worker/src/routes/billing.ts` | 1 | Real Stripe integration (full rewrite) |
| `apps/worker/src/index.ts` | 1,4,6 | Env type updates, sitemap updates, Host routing |
| `apps/web/src/App.tsx` | 1,4,5 | New routes |
| `apps/web/src/pages/Login.tsx` | 1 | "Forgot password?" link |
| `apps/web/src/pages/Signup.tsx` | 4 | Referral code capture |
| `apps/web/src/components/home/HeroSection.tsx` | 1 | New positioning copy |
| `apps/web/index.html` | 1,3 | Meta tags + font optimization |
| `apps/web/src/components/settings/SettingsPanel.tsx` | 1 | Real Stripe UI |
| `apps/web/src/components/builder/BlockPalette.tsx` | 2 | Upgrade modal integration |
| `apps/web/src/data/useCases.ts` | 3 | Fix testimonials, add 5 new pages |
| `apps/web/src/pages/UseCasePage.tsx` | 3 | BreadcrumbList schema |
| `apps/web/src/pages/Home.tsx` | 3 | SoftwareApplication schema |
| `apps/worker/src/utils/injectMeta.ts` | 3 | Per-theme font injection |
| `packages/shared/constants.ts` | 2 | Free block limit 3→5 |
| `schema.sql` | 1-6 | Keep in sync with migrations |

---

## Verification Checklist (Per Sprint)

### Sprint 1
- [ ] `npx tsc --noEmit` passes for both web and worker
- [ ] Password reset: request → email received → new password works
- [ ] Stripe: upgrade → Stripe Checkout → payment → plan=pro
- [ ] Stripe: webhook → plan changes reflect in app
- [ ] Welcome email sends on signup
- [ ] Homepage shows new positioning copy
- [ ] Link scheduling shows Pro badge + upgrade prompt

### Sprint 2
- [ ] Upgrade modal appears on Pro block click, block limit, scheduling
- [ ] Onboarding checklist shows for new accounts, auto-checks items
- [ ] Drip emails fire at correct intervals (test with short delays)
- [ ] Free users can now create 5 blocks

### Sprint 3
- [ ] Only 2 fonts load on homepage (verify Network tab)
- [ ] Public profiles load only their theme's fonts
- [ ] PageSpeed LCP < 2.5s, CLS < 0.1
- [ ] Use case pages have real testimonials and unique meta tags
- [ ] 11 use case pages total (6 existing + 5 new)
- [ ] SoftwareApplication schema validates in Google Rich Results Test

### Sprint 4
- [ ] Referral link works: signup with ?ref=CODE → referred_by set
- [ ] Showcase page loads with published profiles
- [ ] User data export downloads complete JSON

### Sprint 5
- [ ] Blog index renders, individual posts render
- [ ] Blog posts are in sitemap
- [ ] SEO tool pages functional and indexed

### Sprint 6
- [ ] Custom domain: add → verify DNS → domain serves profile
- [ ] Annual pricing toggle works in UI and Stripe
