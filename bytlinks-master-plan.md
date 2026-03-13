# Bytlinks — Master Growth & Technical Remediation Plan
> Generated from full codebase audit + competitive analysis  
> Every item is actionable. Ordered by revenue impact.

---

## PART 1 — POSITIONING PIVOT (DO THIS FIRST, COSTS NOTHING)

### 1.1 Stop Competing with Linktree. Own a New Category.

**Current positioning:** "One link. Everything people need." — generic, competes head-on with a $165M-funded company.

**New positioning:** "Your professional presence in one link."

**Target customer:** Freelancers, consultants, coaches, creative professionals, developers, and small business owners who are embarrassed by their current Linktree and want something that looks intentional and professional.

**Why this works:** Linktree is going broad and bloated. Beacons is going commerce-heavy. Carrd is static. Nobody owns the "professional digital identity" space cleanly. Bytlinks already has the features to own it — the marketing just hasn't caught up to the product.

### 1.2 Homepage Copy Changes

Update the following:

| Location | Current | New |
|---|---|---|
| Hero headline | "One link. Everything people need." | "Your professional presence, in one link." |
| Hero subheadline | Generic | "A link in bio that looks like you hired a designer. Business card, portfolio, analytics — all in one URL." |
| Meta title | "BytLinks — Your link. Your brand. Your data." | "BytLinks — Professional Link in Bio & Digital Identity" |
| Meta description | Current generic | "The professional alternative to Linktree. Custom page, digital business card, contact rolodex, and privacy-first analytics — free forever." |

### 1.3 Lead With the Business/Professional Differentiators

The comparison table on the homepage already wins on 8/10 features vs competitors. Make sure visitors see the uniquely Bytlinks features first:
- Desktop-first 2-column layout (nobody else does this)
- Digital business card + QR code + vCard download
- Contact Rolodex (scan, save, exchange — completely unique)
- Privacy-first analytics with no third-party scripts
- Per-page SEO editor (Linktree doesn't have this)
- Zero transaction fees vs Beacons' 9%
- Import from Linktree (removes switching friction)
- Full data export (own your data — trust signal)

---

## PART 2 — CRITICAL BUGS & BLOCKERS (FIX BEFORE ANY MARKETING)

### 2.1 🚨 No Password Reset — Users Are Locked Out Forever

**Status:** Does not exist. No recovery flow at all.  
**Impact:** Any user who forgets their password is permanently lost.  
**Fix:** Implement password reset via Resend.com (free tier available).

**Claude Code instruction:**
```
Implement a password reset flow using Resend.com for email delivery.

Steps:
1. Add POST /api/auth/forgot-password — accepts email, generates a 
   time-limited (1hr) signed reset token, stores in a password_reset_tokens 
   table (token, user_id, expires_at, used), sends reset email via Resend API.

2. Add POST /api/auth/reset-password — validates token (not expired, not used), 
   updates user password (bcrypt hash), marks token as used.

3. Add frontend pages: /forgot-password (email input form) and 
   /reset-password?token=xxx (new password form).

4. Add "Forgot password?" link to the login page.

5. Use Resend.com SDK. Store RESEND_API_KEY in Worker environment secrets.
```

### 2.2 🚨 No Email System — You're Losing 40-60% of Signups

**Status:** Zero emails sent. No welcome, no transactional, no drip, no password reset.  
**Impact:** Users who don't activate on day 1 are gone forever with no recovery path.  
**Fix:** Implement Resend.com for transactional + drip emails.

**Claude Code instruction:**
```
Set up Resend.com as the email provider (resend.com — simple REST API, 
generous free tier, works perfectly with Cloudflare Workers).

Implement the following emails in this priority order:

EMAIL 1 — Welcome (send immediately on signup):
Subject: "Your BytLinks page is live 🎉"
Content: Confirm their username URL (bytlinks.com/{username}), 
3 quick steps to complete their profile, link to dashboard.

EMAIL 2 — Activation nudge (send 24hrs after signup IF no avatar uploaded):
Subject: "Your page is missing a face"
Content: Reminder that adding a photo increases profile clicks by 3x. 
CTA to dashboard.

EMAIL 3 — Engagement nudge (send 72hrs after signup IF fewer than 3 links):
Subject: "3 things that make a great BytLinks page"
Content: Add your social links, pick a theme, share your URL. 
CTA to dashboard.

EMAIL 4 — Upgrade nudge (send day 7 IF still on free plan):
Subject: "You've had visitors. Here's what Pro unlocks."
Content: Show their actual view count from analytics. 
List Pro features with emphasis on: removing BytLinks badge, 
all 19 blocks, link scheduling. CTA to upgrade.

EMAIL 5 — Final upgrade nudge (send day 14 IF still on free plan):
Subject: "Last thing — your data is always yours"
Content: Emphasize the "no lock-in, export anytime" trust signal. 
Soft sell on Pro. Include a discount code if possible ($7.99 first month).

Use Cloudflare Workers Cron Triggers to run a daily job that 
queries users who need emails at each stage and sends via Resend.
Store email preferences and sent_at timestamps to avoid duplicates.
```

### 2.3 🚨 Stripe Is Mock — No Real Revenue Path

**Status:** POST /api/billing/upgrade is mocked with "This is a demo. No real payment is processed."  
**Fix:** Wire up real Stripe Checkout or Stripe Billing.

**Claude Code instruction:**
```
Replace the mock billing system with real Stripe integration.

1. Install Stripe SDK for the Worker environment.
2. Create a Stripe product + price for Pro ($9.99/mo recurring).
3. Replace POST /api/billing/upgrade with Stripe Checkout Session creation 
   — redirect user to Stripe-hosted checkout.
4. Add POST /api/billing/webhook endpoint to handle:
   - checkout.session.completed → set user plan to 'pro'
   - customer.subscription.deleted → set user plan back to 'free'
   - invoice.payment_failed → send payment failure email (via Resend)
5. Replace POST /api/billing/downgrade with Stripe subscription cancellation.
6. Store stripe_customer_id and stripe_subscription_id on the users table.
7. Update the billing settings panel to show real subscription status, 
   next billing date, and a "Manage subscription" link to Stripe Customer Portal.
Store STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Worker environment secrets.
```

### 2.4 Invisible Paywall on Link Scheduling

**Status:** The link scheduling section renders with `opacity-50 pointer-events-none` for free users — no explanation, no upgrade prompt. Looks like a broken UI.  
**Fix:** Add an explicit upgrade prompt.

**Claude Code instruction:**
```
In the link scheduling section of the link editor, replace the 
opacity-50/pointer-events-none treatment for free users with:
- A visible Pro badge on the section header
- An inline callout: "Link scheduling is a Pro feature. 
  Schedule links to go live or expire automatically."
- An "Upgrade to Pro" button that opens the upgrade modal 
  (same modal used in the block palette paywall)
Do not just dim the UI — always explain why and provide a clear action.
```

---

## PART 3 — CONVERSION FUNNEL IMPROVEMENTS

### 3.1 Onboarding — Add a Setup Checklist

**Status:** After template picker, users land on an empty editor with no guidance. No wizard, no checklist, no next step.  
**Fix:** Add a dismissible onboarding checklist.

**Claude Code instruction:**
```
Add a dismissible onboarding checklist widget to the dashboard for 
new users (accounts < 7 days old) that haven't dismissed it.

Checklist items (check off automatically as completed):
☐ Add a profile photo
☐ Write a bio
☐ Add your first link
☐ Pick a theme
☐ Share your page (show their bytlinks.com/username URL with copy button)
☐ Set up your business card

Store dismissal in localStorage and a dismissed_onboarding column on users.
Show a progress bar (e.g. "3 of 6 complete").
Each item should be a direct link/action — clicking "Add a profile photo" 
should open the avatar upload flow directly.
```

### 3.2 Paywall Moment — Upgrade In Context, Not in Settings

**Status:** All upgrade CTAs route to `/settings?tab=billing` — two navigations away from the desire moment.  
**Fix:** Inline upgrade modal with Stripe redirect.

**Claude Code instruction:**
```
Create a reusable <UpgradeModal> component that:
1. Shows when a free user hits the block limit OR clicks a Pro block type
2. Displays: "Unlock Pro — $9.99/month"
3. Lists the 5 Pro features with icons (all 19 blocks, 25 max blocks, 
   link scheduling, remove branding, priority support)
4. Has a single primary CTA: "Upgrade Now" → initiates Stripe Checkout
5. Has a secondary "Maybe later" dismiss option
6. Does NOT redirect to /settings — the entire flow happens in the modal

Replace all existing paywall touchpoints to use this modal:
- Block palette Pro block click
- Block limit reached state  
- Link scheduling section
- Any other gated feature
```

### 3.3 Upgrade Email Hook — Use Their Own Data

The day-7 upgrade email (see 2.2) should pull the user's real analytics view count and include it in the email. "Your page has been viewed 47 times this week. Upgrade to Pro to remove the BytLinks badge and make it fully yours." This is the highest-converting upgrade email pattern for this type of product.

### 3.4 Fix the Block Limit — Consider Raising to 5

**Current:** Free = 3 blocks max.  
**Recommendation:** Consider raising to 5. Users need to experience enough of the product to feel invested before hitting the wall. 3 blocks may be too aggressive — users hit the limit before reaching the "aha moment." 5 blocks lets them build a real page while still clearly needing Pro for a full-featured page.

This is a hypothesis — test it. If conversion rate goes up after raising, the extra free usage is worth it.

---

## PART 4 — TECHNICAL SEO FIXES

### 4.1 Font Loading — Biggest Performance Win

**Status:** 14 Google Font families loaded in a single `<link>` tag = ~45 font files fetched on first load. This is your single biggest Core Web Vitals problem.

**Claude Code instruction:**
```
Audit which fonts are actually used per theme and implement 
font loading on demand — only load the fonts for the active theme 
rather than all 14 families upfront.

For the marketing site (homepage, landing pages, auth pages), 
limit to 2 font families maximum: one for headings, one for body.

For public profile pages (/:username), only load the 2 font families 
associated with that user's selected theme — inject font links in 
injectMeta.ts alongside the existing OG/JSON-LD injection.

This change alone can improve LCP by 1-2 seconds on first load.
```

### 4.2 Run PageSpeed Insights Immediately

Go to https://pagespeed.web.dev and run both:
- `https://www.bytlinks.com` (homepage)
- A real public profile page

Record the scores. LCP should be under 2.5s, CLS under 0.1, FID/INP under 200ms. If they're failing, the font fix in 4.1 is the first thing to address.

### 4.3 Add Image Lazy Loading

**Claude Code instruction:**
```
Add loading="lazy" to all <img> tags on public profile pages 
that are below the fold (everything except the avatar in PageHero).
Add fetchpriority="high" to the avatar image in PageHero 
as it is the LCP element on most profile pages.
Add width and height attributes to all img tags to prevent 
layout shift (CLS).
```

### 4.4 Use Case Pages — Add Real Content

**Status:** 6 use case pages (`/for/musicians`, `/for/freelancers`, etc.) are templated with placeholder testimonials ("To be added before launch"). These pages won't rank and won't convert with placeholder content.

**Claude Code instruction:**
```
For each of the 6 use case pages, update the config in 
apps/web/src/data/useCases.ts:

1. Replace all placeholder testimonials with real ones. 
   (Source these from actual users, or write placeholder-but-realistic 
   ones until real ones are collected — do NOT leave "To be added before launch")

2. Add unique, keyword-rich meta titles and descriptions per page:
   - /for/musicians → "Link in Bio for Musicians | BytLinks"
   - /for/freelancers → "Professional Link in Bio for Freelancers | BytLinks"  
   - /for/coaches → "Link in Bio for Coaches & Consultants | BytLinks"
   - /for/creators → "Link in Bio for Content Creators | BytLinks"
   - /for/podcasters → "Link in Bio for Podcasters | BytLinks"
   - /for/businesses → "Business Link in Bio Page | BytLinks"

3. Ensure each page has unique h1 text (not just the hero headline) 
   for SEO differentiation.
```

### 4.5 Add More Use Case Pages

High-value SEO targets that don't exist yet:

**Claude Code instruction:**
```
Add the following new use case pages to useCases.ts and the router:
- /for/photographers → "Link in Bio for Photographers"
- /for/developers → "Link in Bio for Developers & Designers" 
- /for/artists → "Link in Bio for Artists"
- /for/real-estate → "Link in Bio for Real Estate Agents"
- /for/personal → "Simple Personal Website & Link in Bio"

Each should have unique copy, features highlighted relevant to that 
audience, and at minimum a stub with correct meta tags even if 
full content comes later.
```

### 4.6 Add a Blog (Highest Long-Term SEO ROI)

**Status:** No blog exists. No CMS integrated.

**Recommended stack:** Use a simple markdown-based approach with static files, or integrate with a headless CMS (Ghost, Sanity, or even a GitHub-based approach with markdown files processed by the Worker).

First 5 posts to publish (in order):

| Priority | Title | Target Keyword |
|---|---|---|
| 1 | "The Best Linktree Alternatives in 2026 (Free & Paid)" | linktree alternative |
| 2 | "BytLinks vs Linktree: Honest Comparison" | bytlinks vs linktree |
| 3 | "How to Create a Professional Link in Bio Page" | professional link in bio |
| 4 | "Best Link in Bio for Freelancers" | link in bio freelancers |
| 5 | "What Is a Digital Business Card (And Why You Need One)" | digital business card |

### 4.7 Schema Markup — Extend Existing

**Status:** Profile pages already have `schema.org/Person` JSON-LD (well implemented). Homepage has no structured data.

**Claude Code instruction:**
```
Add schema.org/SoftwareApplication structured data to the homepage:
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BytLinks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Professional link in bio and digital identity platform with business card, analytics, and contact rolodex."
}

Also add BreadcrumbList schema to use case pages.
```

---

## PART 5 — FEATURE ROADMAP (Ordered by Revenue Impact)

### 5.1 Custom Domains — Next Major Pricing Lever

**Status:** Schema column exists (`custom_domain` in bio_pages), roadmap spec exists (Cloudflare for SaaS), but zero implementation.  
**Impact:** Unlocking custom domains justifies raising Pro to $14.99/mo. Professionals who want `links.janedoe.com` will not stay on a platform that doesn't offer this.  
**Estimate:** Significant build — do after Stripe + email are stable.

**Claude Code instruction:**
```
Implement custom domains using Cloudflare for SaaS 
(as specced in bytlinks_roadmap.md).

Key steps:
1. Add POST/DELETE /api/settings/domain endpoints for 
   adding/removing a custom domain.
2. Add domain_verified column to bio_pages.
3. Implement DNS TXT record verification flow.
4. Add Host header routing in the Worker — if request Host 
   matches a verified custom_domain in bio_pages, serve that 
   profile's content.
5. Handle SSL via Cloudflare for SaaS certificate issuance.
6. Add custom domain settings UI in the dashboard.
7. Gate custom domains behind Pro plan.
```

### 5.2 Referral / Affiliate Program

**Status:** Does not exist. Zero referral infrastructure.  
**Impact:** A 30-40% recurring commission affiliate program is the highest ROI marketing investment you can make. Social media managers, tool review bloggers, and YouTubers will promote for free if the commission is right.

**Claude Code instruction:**
```
Implement a basic referral system:
1. Add referral_code (8-char unique) to each user on signup.
2. Add referred_by (user_id) column to users table.
3. Track referral via ?ref=CODE URL param on signup page — 
   store in localStorage, apply on account creation.
4. Add a "Refer & Earn" section in dashboard/settings showing:
   - Their referral link (bytlinks.com/signup?ref=CODE)
   - Number of referrals
   - Commission earned (if affiliate program active)
5. On referred user upgrade to Pro, credit the referrer 
   (implement payout logic via Stripe or manual initially).
Start simple — track referrals now, worry about automated payouts later.
```

### 5.3 Profile Showcase Page

**Status:** The homepage has a `BuildGallery` section with 6 static previews. This should be a live, public, filterable page.

**Claude Code instruction:**
```
Create a public showcase page at bytlinks.com/showcase.

- Query published, verified (or highly-complete) profiles
- Display as a filterable grid by use case / template type
- Each card shows: avatar, name, profession, theme preview, 
  link to their public profile
- Add a "Get featured" CTA that encourages users to share their page
- Link to showcase from footer and homepage BuildGallery section
- This page serves dual purpose: SEO content + social proof
```

### 5.4 Free SEO Tools (Traffic Magnets)

Build these as standalone pages that rank in Google and funnel into signups:

| Tool | URL | Target Keyword |
|---|---|---|
| Instagram Bio Generator | /tools/instagram-bio-generator | instagram bio generator |
| Link in Bio Analyzer | /tools/link-in-bio-analyzer | link in bio analyzer |
| QR Code Generator | /tools/qr-code-generator | free qr code generator |
| Business Card Maker | /tools/business-card-maker | digital business card maker |
| Bio Character Counter | /tools/bio-character-counter | instagram bio character limit |

---

## PART 6 — MARKETING PLAN

### 6.1 Week 1-2: Foundation (Zero Budget)

**Google Search Console**
- Submit sitemap.xml to Google Search Console immediately
- Monitor indexing of profile pages + use case pages
- Set up Core Web Vitals monitoring

**Product Hunt Launch (prepare 2 weeks out)**
- Line up 50+ upvotes from your network before launch day
- Prepare a compelling GIF demo showing: signup → template pick → live page → business card → QR scan
- Tagline: "The professional alternative to Linktree"
- Post on a Tuesday or Wednesday (best traffic days)
- A successful launch = 1,000-5,000 visitors in 24 hours + permanent SEO backlinks

**Build in Public on Twitter/X**
- Post weekly: user count, MRR updates, feature launches, behind-the-scenes
- Use hashtags: #buildinpublic #indiehacker #saas
- Tag @levelsio style updates — this audience shares, supports, and becomes customers

### 6.2 Week 2-4: Community Seeding (Zero Budget)

**Reddit Strategy**
Target subreddits (do NOT spam — contribute genuinely, mention Bytlinks when directly relevant):
- r/entrepreneur
- r/freelance  
- r/socialmedia
- r/webdev (developer template angle)
- r/photography (photographer template angle)
- r/podcasting
- r/sidehustle

Best Reddit play: Find threads asking "what link in bio tool do you use?" or "how do I consolidate my social links?" and answer authentically. One genuine Reddit thread can send thousands of visitors.

**Facebook Groups**
- "Social Media Managers" groups (100k-500k members)
- "Online Business Owners"
- "Freelancers & Consultants"
- "Photographers" niche groups
Offer value first. Mention Bytlinks when it's the right tool for the question being asked.

**Niche Communities**
- Indie Hackers (post your story — "Building a Linktree alternative focused on professionals")
- Designer News
- Hacker News Show HN post

### 6.3 Month 2: Low-Budget Paid Channels

**Micro-Influencer Outreach ($50-100/each, budget: $500-1000)**
- Find Instagram/TikTok creators in the 5k-50k follower range in: productivity, business tools, freelancing, photography
- Offer: free Pro account + $50-100 for an authentic "tools I use" mention or short demo
- 10 micro-influencers > 1 macro influencer for actual conversion rate
- Track with UTM links

**Niche Newsletter Sponsorships ($100-300/mention)**
- Target newsletters about: creator economy, freelancing, productivity tools, solopreneurship
- The Freelancer's Newsletter, Creator Economy Report, Indie Hackers digest, etc.
- These audiences are exactly your customer

### 6.4 Month 3+: Scalable Channels

**AppSumo Listing**
- Lifetime deal at $49-79 one-time
- Pro: 500-2,000 customers fast, reviews, social proof, SEO backlinks
- Con: trains users to expect low prices
- Strategy: Use it to get first 500+ users and reviews, then retire the deal and move to subscription

**Affiliate Program (see 5.2)**
- 30-40% recurring commission
- Reach out directly to tool review blogs and YouTubers who cover productivity/creator tools
- List on: PartnerStack, Impact, or Rewardful

**Content SEO (see blog plan in 4.6)**
- "Linktree alternative" keyword cluster is high-intent buyer traffic
- One well-ranked comparison post can drive thousands of monthly visitors within 6 months

---

## PART 7 — PRICING STRATEGY

### 7.1 Current State

- Free: $0 forever (generous — analytics, business card, rolodex all included)
- Pro: $9.99/mo (mock Stripe — not yet live)

### 7.2 Recommended Pricing Evolution

**Phase 1 (now):** Keep $9.99/mo Pro. Get Stripe live. Validate that people will pay at all.

**Phase 2 (after custom domains):** Raise to $12.99/mo or introduce a second tier:
| Plan | Price | Key Features |
|---|---|---|
| Free | $0 | 5 blocks, 7 block types, analytics, business card, rolodex |
| Pro | $12.99/mo | All 19 blocks, 25 max, scheduling, remove badge, custom domain |
| Business | $24.99/mo | Multiple pages, team features (future), priority support |

**Phase 3 (at scale):** Annual pricing option ($99/year = 2 months free) — significantly reduces churn and improves cash flow.

### 7.3 Path to $5,000 MRR

Working backwards at $9.99/mo:

| Registered Users | Conversion Rate | Paying Users | MRR |
|---|---|---|---|
| 2,500 | 8% | 200 | $1,998 |
| 5,000 | 8% | 400 | $3,996 |
| 7,500 | 8% | 600 | $5,994 ✅ |
| 10,000 | 6% | 600 | $5,994 ✅ |

**Target: 7,500-10,000 registered users = $5k MRR at realistic conversion rates.**

Timeline with consistent execution: **9-12 months.**

Faster path: AppSumo lifetime deal gets you to 1,000+ users in 30 days, followed by recurring subscription conversion.

---

## PART 8 — WHAT YOU HAVE THAT NOBODY ELSE HAS

This is your moat. Never stop talking about these:

1. **Desktop-first 2-column layout** — every competitor is phone-width. Professionals opening your page on a laptop see a real website, not a mobile app.

2. **Contact Rolodex with card exchange** — scan QR → save contact → exchange cards with request/accept flow. This is a CRM feature on a bio page. Nobody has this.

3. **Privacy-first self-hosted analytics** — no Google Analytics, no third-party scripts. GDPR-friendly by design. Huge for European users and privacy-conscious professionals.

4. **Per-page SEO editor** — users can set their own title, description, keywords. Linktree doesn't offer this. Professionals care about their Google presence.

5. **Linktree importer** — removes the #1 switching barrier. "Keep your existing links, just move your page" is a powerful migration message.

6. **Full data export** — "your data is always yours" is a trust signal that directly counters the lock-in fear that keeps people on Linktree.

7. **Zero transaction fees** — Beacons takes 9%. Linktree takes fees on digital products. Bytlinks takes nothing. This is a massive differentiator for anyone selling anything.

---

## PART 9 — EXECUTION ORDER (THE ACTUAL TODO LIST)

### 🔴 This Week — Non-Negotiable
- [ ] Wire up real Stripe (in progress)
- [ ] Implement password reset via Resend
- [ ] Send welcome email on signup via Resend
- [ ] Fix invisible link scheduling paywall (add real upgrade prompt)
- [ ] Replace placeholder testimonials on all 6 use case pages
- [ ] Run PageSpeed Insights on homepage + a profile page. Record scores.

### 🟡 Week 2
- [ ] Implement inline upgrade modal (stop redirecting to /settings)
- [ ] Add onboarding checklist to dashboard
- [ ] Fix font loading (per-theme lazy load instead of all 14 upfront)
- [ ] Add image lazy loading + fetchpriority to profile pages
- [ ] Add day-7 and day-14 upgrade drip emails
- [ ] Submit sitemap to Google Search Console
- [ ] Update homepage copy to new positioning

### 🟠 Week 3-4
- [ ] Publish first blog post: "Best Linktree Alternatives in 2026"
- [ ] Prepare and launch on Product Hunt
- [ ] Start build-in-public Twitter presence
- [ ] Begin Reddit community participation (not spam — genuine contribution)
- [ ] Add SoftwareApplication schema to homepage
- [ ] Add new use case pages: /for/photographers, /for/developers

### 🟢 Month 2
- [ ] Implement referral tracking system
- [ ] 10 micro-influencer outreach deals
- [ ] Build public showcase page (/showcase)
- [ ] Publish 2nd and 3rd blog posts
- [ ] First newsletter sponsorship

### 🔵 Month 3+
- [ ] Custom domains (Cloudflare for SaaS implementation)
- [ ] AppSumo listing preparation and launch
- [ ] Affiliate program (Rewardful or similar)
- [ ] Free SEO tools pages (/tools/*)
- [ ] Raise Pro price to $12.99 after custom domains ship
- [ ] Annual pricing option

---

## APPENDIX — QUICK REFERENCE

**Tech Stack:** React 18 + Vite (CSR) | Hono.js on Cloudflare Workers | Cloudflare D1 (SQLite) | Cloudflare R2 | Tailwind CSS 4

**SEO Architecture:** Edge meta injection for profile pages via injectMeta.ts — OG tags, Twitter cards, JSON-LD Person schema all server-rendered at edge. This is correct and should not be changed.

**Key Files:**
- Use case pages config: `apps/web/src/data/useCases.ts`
- Meta injection: `apps/worker/src/utils/injectMeta.ts`
- Free/Pro limits: `packages/shared/constants.ts`
- Billing routes: `apps/worker/src/routes/billing.ts` (replace mock with Stripe)
- Home page: `apps/web/src/pages/Home.tsx`
- Pricing section: `apps/web/src/components/home/PricingSection.tsx`
- Upgrade paywalls: `apps/web/src/components/blocks/BlockPalette.tsx`

**Competitors Referenced:**
- Linktree — dominant, going broad, $165M funded, most features paywalled
- Beacons — commerce-heavy, 9% transaction fee, NFC card at $90/mo
- Carrd — static sites, $19/year, no analytics, no business features  
- Lnk.Bio — minimal, basic, not a serious competitor at this stage

**Core Positioning Statement (internal):**
> BytLinks is the professional digital identity platform for freelancers, consultants, coaches, and creative professionals who want a link in bio that looks like they hired a designer — with a built-in business card, contact network, and analytics that respects their privacy.
