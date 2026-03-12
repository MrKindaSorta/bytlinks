# Your To-Do List
> Things only you (the human) can do. Updated after each sprint.

---

## Sprint 1 — Critical Blockers

### Resend (Email Provider)
- [ ] Create a Resend.com account at https://resend.com
- [ ] Verify your domain (bytlinks.com) in Resend dashboard
- [ ] Copy the API key
- [ ] Add it as a Cloudflare Worker secret:
  ```
  wrangler secret put RESEND_API_KEY
  ```

### Stripe (Payments)
- [ ] Create a Stripe account (or use existing) at https://stripe.com
- [ ] Create a Product called "BytLinks Pro" in the Stripe Dashboard
- [ ] Create a Price: $9.99/month recurring on that product
- [ ] Copy the Price ID (starts with `price_...`)
- [ ] Set up a webhook endpoint in Stripe Dashboard:
  - URL: `https://www.bytlinks.com/api/billing/webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
- [ ] Copy the Webhook Signing Secret (starts with `whsec_...`)
- [ ] Add all three as Cloudflare Worker secrets:
  ```
  wrangler secret put STRIPE_SECRET_KEY
  wrangler secret put STRIPE_WEBHOOK_SECRET
  wrangler secret put STRIPE_PRO_PRICE_ID
  ```

### Database Migrations
- [x] ~~Run migration 027~~ — done via `wrangler d1 execute --remote` (2026-03-12)
- [x] ~~Run migration 028~~ — done via `wrangler d1 execute --remote` (2026-03-12)

### Code Deployment
- [x] ~~Pushed to GitHub~~ — commit `836dd97`, triggers Cloudflare Actions deploy (2026-03-12)

### Verify After Deploy
- [ ] Go to /login → click "Forgot password?" → enter email → check inbox
- [ ] Complete password reset flow end-to-end
- [ ] Sign up a new test account → check for welcome email
- [ ] Test upgrade flow → should redirect to Stripe Checkout (needs Stripe secrets first)
- [ ] Test webhook → after payment, user should become Pro (needs Stripe secrets first)
- [ ] Visit homepage → confirm new headline "Your professional presence, in one link."

---

## Sprint 2 — Conversion Funnel

### Database Migrations
- [x] ~~Run migration 029~~ — done via `wrangler d1 execute --remote` (2026-03-12)
- [x] ~~Run migration 030~~ — done via `wrangler d1 execute --remote` (2026-03-12)

### Verify After Deploy
- [ ] Sign up a new test account → onboarding checklist should appear on dashboard
- [ ] Dismiss checklist → should not reappear on refresh
- [ ] Click a Pro-only block in the palette → upgrade modal should pop up (not redirect to /settings)
- [ ] Verify free users can now create 5 blocks (was 3)
- [ ] Monitor drip emails: check that cron sends activation nudge ~24hrs after a test signup (needs RESEND_API_KEY first)

---

## Sprint 3 — SEO & Performance

### Verify After Deploy
- [ ] Open homepage → check Network tab → should only load Cabinet Grotesk + DM Sans (2 fonts, not 14)
- [ ] Open a public profile page → check that theme-specific fonts load dynamically
- [ ] Run PageSpeed Insights on https://www.bytlinks.com → record LCP score (target < 2.5s)
- [ ] Run PageSpeed Insights on a real profile page → record scores
- [ ] Visit /for/photographers, /for/developers, /for/artists, /for/real-estate, /for/personal → all should render
- [ ] Validate homepage SoftwareApplication schema at https://search.google.com/test/rich-results
- [ ] Check all 6 original use case pages → testimonials should show real names/quotes (not placeholder)
- [ ] Submit updated sitemap to Google Search Console (11 use case pages now)

---

## Sprint 4+ — (will be added as built)
