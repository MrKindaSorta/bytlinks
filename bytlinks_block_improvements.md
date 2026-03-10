# BytLinks — Block Improvement Notes

> Actionable fixes and upgrades for all 18 existing blocks, ordered by impact. Cross-cutting issues addressed first, then per-block specifics.

---

## Cross-Cutting Fixes First

These apply to multiple blocks. Fix these systematically before touching individual blocks — they'll resolve a large percentage of the issues in one pass.

---

### 1. Wire Up All Dead `image_r2_key` Fields
**Affects:** Rich Link, Testimonials, Event

The type definitions already have `image_r2_key` on these three blocks. The backend presumably handles the upload. The editor just never got the UI. This is the lowest-effort/highest-impact fix in the entire block system — the infrastructure is already there.

**Fix:** Copy the image upload component from the Image Gallery block editor (the dashed dropzone + card-on-upload pattern) and drop it into these three editors. Point to the same `/api/pages/avatar` or a new `/api/blocks/upload` endpoint — whichever you're using for R2. One reusable `<ImageUploadField r2Key={...} onChange={...} />` component covers all three.

---

### 2. Add Item Reordering to All List-Based Editors
**Affects:** FAQ, Poll options, Stats, Testimonials, Image Gallery

You already have `@dnd-kit` installed and working for links and socials. There is zero reason not to use it here. Every block that has a list of items should support drag-to-reorder using the exact same `DndContext` + `SortableContext` + `useSortable` pattern you already have.

**Fix:** Extract your existing sortable list wrapper into a generic `<SortableList items={items} onReorder={setItems} renderItem={...} />` component. Wrap all repeatable item lists in it. This should take 2–3 hours total across all affected blocks once the wrapper exists.

---

### 3. Add Analytics Tracking to All Untracked Blocks
**Affects:** Microblog, Quote, Countdown, Stats, Testimonials

Call your existing `trackEvent()` utility. Suggested events:

| Block | Event | Trigger |
|-------|-------|---------|
| Microblog | `microblog_expand` | If posts exceed visible limit and user expands |
| Quote | `quote_view` | IntersectionObserver at 50% visibility |
| Countdown | `countdown_view` | On render when not expired |
| Stats | `stats_view` | IntersectionObserver — fires once |
| Testimonials | `testimonial_navigate` | On prev/next click |

None of these require backend changes — your `POST /api/analytics/track` endpoint already accepts arbitrary event names.

---

### 4. Add Swipe/Gesture Support to All Carousels
**Affects:** Image Gallery (carousel), Testimonials

Both carousels have prev/next buttons but no touch swipe support. On mobile this feels broken — it's 2025 and every swipeable surface should support gestures.

**Fix:** Add a minimal touch handler directly — no library needed:
```javascript
const touchStart = useRef(null);

onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
onTouchEnd={(e) => {
  const delta = e.changedTouches[0].clientX - touchStart.current;
  if (Math.abs(delta) > 40) delta < 0 ? next() : prev();
}}
```
Four lines per carousel. Do it.

---

### 5. Add Slide Transition Animations to All Carousels
**Affects:** Image Gallery (carousel), Testimonials

Both currently do instant state swaps — content just blinks to the next item. This feels cheap and unfinished.

**Fix:** Use a CSS `transition` on `opacity` + a slight `translateX`. Set `opacity: 0; transform: translateX(8px)` on exit, then swap content and snap back to `opacity: 1; transform: translateX(0)` with a 250ms ease. Implement with a `useState` for `transitioning` — set it true, wait for the CSS transition via `setTimeout(250)`, swap content, set false. No library needed. This single change makes both carousels feel professional.

---

### 6. Merge Schedule + Booking Into One Block
**Affects:** Schedule (Pro), Booking (Pro)

These are the same block. Same providers (Calendly/Cal.com), same iframe embed approach, only difference is a 100px height variation (400px vs 500px). They exist as separate blocks because of scope creep during development. Having both confuses users and wastes a block slot.

**Fix:** Merge into a single **Booking / Availability** block. Add a height option: Compact (400px), Standard (500px), Tall (650px). Remove the duplicate from the block picker. Migrate any existing Schedule blocks to Booking type in a D1 migration — add a `height_preset` column with a default.

---

## Per-Block Recommendations

---

### Embed Block

**Fix the dead embed types.** `tweet` and `substack` are in your type definition but never wired up in the editor. For Twitter/X: use the standard `blockquote.twitter-tweet` + injected widget script, same as you do in the Social Post block — just extract it into a shared `useTwitterEmbed()` hook. For Substack: their embed is a simple iframe at `https://{publication}.substack.com/embed` — parse the URL and construct it.

**Make heights responsive.** The fixed 315px YouTube and 152px Spotify heights are fine as minimums but YouTube should use `aspect-ratio: 16/9` with `width: 100%` instead. A YouTube embed in a narrow mobile column is currently cropped or overflowing. Replace:
```css
/* Remove this */
height: 315px;

/* Use this */
aspect-ratio: 16 / 9;
width: 100%;
```

**Add URL validation with feedback.** Paste a YouTube URL — if it doesn't match the expected pattern, show an inline error immediately. Use a simple regex on the input's `onChange`. Don't wait for the iframe to 404.

**Add a thumbnail preview in the editor.** For YouTube, `https://img.youtube.com/vi/{videoId}/mqdefault.jpg` is a free, no-auth thumbnail. Show it in the editor once a valid URL is pasted. Gives the user confirmation they pasted the right video.

---

### Microblog Block

**Add edit capability.** Right now it's append-and-delete only. Clicking a post should make it inline-editable — swap the text display for a textarea pre-filled with the post content, same 280-char limit, Save/Cancel buttons. Store the edited post in place, preserve the original `created_at`.

**Add "show more" pagination.** If a user has 20 microblog posts, render the latest 5 and show a "Load more" button. Client-side only — you already have all posts in the block data. No API call needed.

**Add a subtle visual separator between posts.** Currently it's just `space-y-3` with no visual boundary. Add a `border-b border-[--page-border] last:border-0` to each post row — a thin line gives the list structure without being heavy.

---

### Rich Link Block

**Build the image upload UI.** The type already has `image_r2_key`. See cross-cutting fix #1. A Rich Link card with an image is dramatically more compelling than text-only — this is the entire point of the block.

**Add URL auto-unfurl.** When the user pastes a URL and tabs out, fetch `GET /api/unfurl?url=...` from your Worker. The Worker fetches the target page, parses `<title>`, `<meta name="description">`, and `<meta property="og:image">` from the HTML using `HTMLRewriter`, and returns the metadata. Pre-fill the title and description fields. Let the user override. This removes the #1 friction point of the block — nobody wants to manually type a description for a URL.

**Show a favicon.** `https://www.google.com/s2/favicons?domain={domain}&sz=32` gives you a free favicon for any domain. Display it as a 16px icon to the left of the domain name in the renderer. Small detail, high polish signal.

---

### Social Post Block

**Fix Instagram and TikTok — they're broken.** Both currently render as plain links, not embeds. Both platforms support oEmbed:
- Instagram: `https://graph.facebook.com/v18.0/instagram_oembed?url={url}&access_token={token}` — requires a Meta app token (free tier available)
- TikTok: `https://www.tiktok.com/oembed?url={url}` — no auth required

Fetch the oEmbed response in the Worker at block save time, cache the `html` field in the block's D1 data, and inject it in the renderer. Don't fetch on every page render — cache it. For Instagram, the Meta token can live as a Worker env var.

**Fix Twitter's hardcoded dark theme.** The `blockquote.twitter-tweet` element supports `data-theme="light"` or `data-theme="dark"`. Read the page's current theme from context and pass it. One line change that's been broken since launch.

---

### Image Gallery Block

**Make carousel dots clickable.** They're already rendered — they're just not wired to `onClick`. Add `onClick={() => setIndex(i)}` to each dot. This is a 5-minute fix that's been missing since day one.

**Add a lightbox.** When a user taps any image (single, carousel, or grid), it should open fullscreen with a close button. Use a portal-rendered `div` with `position: fixed; inset: 0; z-index: 50` and a `backdrop-blur`. No library needed. The image centers in the viewport with `object-contain`. Add keyboard `Escape` to close. This is table stakes for any image display on the web.

**Add `add to calendar` support on caption.** Each gallery image should support an optional caption — the field exists in the type, it just has no editor UI. Add a small text input below each image thumbnail in the editor. Render below the image in single layout, as a tooltip on hover in grid layout.

**Fix the always-visible scrollbar on image upload.** The `pb-2` padding trick for the scrollbar is a workaround. Use `scrollbar-hide` (Tailwind plugin) or `::-webkit-scrollbar { display: none }` on the upload grid container. Clean.

---

### Collabs Block

**Batch the avatar fetches.** Currently makes one API call per username on render. With 10 collaborators that's 10 sequential requests. Add `GET /api/public/users?usernames=alice,bob,carol` — a single endpoint that queries D1 with `WHERE username IN (...)` and returns an array. One round trip for any number of collaborators. This is the most important fix for this block.

**Validate usernames on add.** When the user types a username and hits Enter, immediately call `GET /api/public/users?usernames={username}` and show either a green checkmark (found) or a red "not found on BytLinks" inline error. Don't let users save collaborators that don't exist — the block renders broken avatar fallbacks for all of them.

**Style the scrollbar or add fade edges.** The horizontal scroll container looks unfinished. Replace the always-visible scrollbar with a CSS fade gradient on the right edge when there are more items (`after:` pseudo-element, `pointer-events: none`, gradient from transparent to the page background). This signals "more to scroll" without a raw scrollbar.

---

### Poll Block

**Fix vote persistence.** Votes currently reset on page refresh. Add cookie-based persistence: on successful vote, set a cookie `poll_voted_{blockId}=optionId` with a 30-day expiry. On component mount, check for this cookie and show results view immediately if found. The backend endpoint should also check the cookie on vote submission and return a 409 if already voted. This is a one-day fix that makes the block production-ready.

**Show total vote count.** "47 total votes" below the question gives social proof and makes the poll feel alive. Sum all option vote counts and display it.

**Add a result-reveal option.** Add a "Hide results until voted" toggle in the editor. If enabled, the renderer shows options as plain buttons until the visitor votes — no percentages visible beforehand. This makes polls more honest and encourages participation. Store as `hide_results_until_voted: boolean` in the block config.

**Add a vote reset button in the editor.** An admin should be able to wipe all votes and start fresh. `DELETE /api/blocks/{id}/votes` — clears all vote counts to zero. Put it behind a confirmation dialog.

---

### Testimonials Block

**Build the avatar upload UI.** `avatar_r2_key` is in the type but the editor has no upload field. See cross-cutting fix #1. A testimonial with a photo headshot converts significantly better than one without — this is the entire purpose of the avatar field.

**Add autoplay option.** A toggle in the editor: "Auto-advance every X seconds" (3/5/10 options). Pause on hover. Implement with `useEffect` + `setInterval`, clear on hover with `onMouseEnter/Leave`. Adds life to the block on pages where the owner doesn't expect visitors to manually click through.

**Remove the `max-w-sm` constraint on long quotes.** A 300-character testimonial in `max-w-sm` wraps awkwardly. Use `max-w-lg` or `max-w-prose` instead. The narrow constraint was probably defensive, but it hurts readability for any quote over two sentences.

---

### Newsletter Block

**Build the subscriber list UI.** This is the most critically missing feature in the entire block system. Users are collecting emails and have absolutely no way to see them. Add a **Subscribers** section to the Analytics tab: a paginated table of `email`, `subscribed_at`, and which newsletter block they came from. Add `GET /api/analytics/newsletter/{blockId}/subscribers` returning paginated results. Add a CSV export button. This is a Pro feature that users will churn over if they discover their emails are going nowhere visible.

**Add duplicate email prevention.** `INSERT OR IGNORE` in the D1 query on `POST /api/public/newsletter/{blockId}/subscribe` with a unique constraint on `(block_id, email)`. Currently undefined behavior on duplicates.

**Add a GDPR consent checkbox.** A simple opt-in checkbox below the email field: "I agree to receive emails from {display_name}." Checked state required before submission. Store `consented: true` with each subscription record. This is a legal requirement for EU users, not optional.

**Allow a custom success message.** The "Thanks for subscribing!" is hardcoded. Add a `success_message` field to the editor. Default to the current string, let users customize it. Costs nothing to build, adds meaningful personalization.

---

### FAQ Block

**Allow only one item open at a time (optional).** Add an "Accordion mode" toggle in the editor. When on, opening one item closes all others — standard accordion UX. When off, multiple items stay open simultaneously (current behavior). Implement by tracking `openId` (single string) vs `openIds` (Set) based on the toggle.

**Add markdown rendering to answers.** FAQ answers frequently need formatting — bold terms, inline code, links. Run answers through a minimal markdown renderer. Use `marked` (2KB minified, no dependencies) or a micro-parser for just bold/italic/links/code. Plain text for questions is fine; answers need formatting.

**Add item reordering.** See cross-cutting fix #2.

---

### Quote Block

**Fix potential contrast issues on Highlight style.** When the user picks a light accent color (e.g., a pale yellow or sand preset), the Highlight style renders light-on-light. Run a contrast check on `getComputedStyle` when rendering — if contrast ratio against `--page-bg` is below 4.5:1 (WCAG AA), switch the text to `--page-text` instead of `--page-bg`. The color derivation utility you already use for the theme system can handle this.

**This block is otherwise the most polished in the system.** The four styles are distinct and well-executed. Minor addition: allow a URL on the attribution field — turn it into a link when present.

---

### File Download Block

**Show download count.** The `file_download` analytics event is already tracked. Surface the count on the block in the Dashboard view: a small "47 downloads" label below the filename. Motivating for the owner, zero backend work since you're already writing the events.

**Add file type icons.** Instead of a generic `Download` icon for every file, map MIME types to appropriate Lucide icons: `FileText` for PDF/DOC, `FileCode` for ZIP/code files, `Image` for image files, `Music` for audio, `Video` for video. The mapping is a simple switch on the file extension stored with the block.

**Support multi-file.** Allow up to 5 files per block, each with its own label and download count. Render as a stacked list. This is more useful than having 5 separate File Download blocks cluttering the page. Store as a `files: [{r2_key, label, size, type}]` array in the block config.

---

### Countdown Block

**Handle timezone explicitly.** `datetime-local` gives a local time in the user's browser timezone, but different visitors are in different timezones. Add a timezone selector to the editor (use the browser's `Intl.supportedValuesOf('timeZone')` for the list). Store the timezone with the target date. In the renderer, compute the countdown against the target time in the stored timezone. Display the timezone abbreviation next to the countdown: "Counting down to Jan 1 12:00 PM EST."

**Add auto-hide after expiration.** The expired text currently replaces the countdown but the block stays on the page. Add a "Hide block after expiration" toggle in the editor. If set, the block renders nothing after the target date — same auto-hide behavior as the Event block. This is the expected behavior for most use cases (a product launch countdown shouldn't sit on the page as "00:00:00:00" forever).

**Give the expired state a distinct style.** If the owner doesn't auto-hide, the expired block should look intentionally finished — not like a broken counter. Render a simple "Event has passed" state with the label and date, styled differently from the active countdown. Not an afterthought.

---

### Stats Block

**Add prefix/suffix support.** `"$12K"`, `"99%"`, `"4.9★"` are all common stat formats. Add optional `prefix` and `suffix` string fields per stat item. The animated counter already handles the numeric portion — prepend/append these as static `<span>` elements that don't animate. This is a 30-minute editor and renderer change that makes the block substantially more useful.

**Non-numeric values shouldn't pretend to animate.** If the value field contains non-numeric content (e.g., `"Since 2015"` or `"Remote"`), the AnimatedNumber component should detect this and skip the count-up, just rendering the value as static text. Currently it probably tries to parse `NaN` and shows `0`. Add a `isNumeric(value)` check before running the animation.

---

### Tip Jar Block

**Show provider logo.** The provider field is stored but doesn't affect rendering at all. Add small provider logos/icons: Stripe's `S` mark, Ko-fi's coffee cup, BMAC's mug. These are recognizable trust signals. Use simple SVGs inlined in the component — no external fetch.

**Add multiple tiers.** A single amount button is limiting. Support 3 amount options: e.g., "$3 / $5 / $10" that each link to different Stripe Payment Links. Store as `tiers: [{label, amount, url}]` array. Render as a row of three pill buttons. Single option remains supported as the default. This makes the block behave like an actual tip jar instead of a single vending machine slot.

---

### Event Block

**Server-side auto-hide.** Auto-hiding is currently client-side — the block data still loads, it just doesn't render. Move the expiration check into the Worker's public page render: filter out Event blocks where `event_date < Date.now()` before sending the page data to the client. Past events shouldn't cost a DOM node.

**Add "Add to Calendar" link.** Generate an `.ics` file URL on the fly. An `.ics` is just a text file with a specific format — generate it as a data URI client-side:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:{date}
SUMMARY:{eventName}
LOCATION:{venue}
END:VEVENT
END:VCALENDAR
```
Encode as `data:text/calendar;charset=utf8,...` and set as the `href` of a small "Add to calendar" link below the ticket button. No library, no server round-trip. This single addition makes the Event block genuinely useful for real event promotion.

**Add timezone display.** Same issue as Countdown — store a timezone with the event datetime and display it. "7:00 PM EST" is unambiguous. "7:00 PM" is not.

---

## Priority Order for the Fixes

If you're triaging, do these first — highest user-facing impact, lowest implementation cost:

1. **Poll vote persistence** (cookie check) — block is functionally broken without it
2. **Newsletter subscriber list UI** — users are losing emails right now
3. **Carousel dot clicks + swipe** — five-minute fixes, obvious UX gaps
4. **Wire up dead `image_r2_key` fields** — three blocks get image support instantly
5. **Batch Collabs API call** — N+1 request bug on every page render
6. **Fix Instagram/TikTok embeds** — two platforms currently broken
7. **Twitter dark theme hardcode** — one-line fix that's been wrong since launch
8. **URL unfurl on Rich Link** — eliminates the block's biggest friction point
9. **File Download type icons + download count** — polish items, quick wins
10. **Merge Schedule + Booking** — reduces confusion, no user-facing regressions
