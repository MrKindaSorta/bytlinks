# BytLinks — Affiliations Feature
## Claude Code Context Document
> Feed this entire document at the start of every Claude Code session for this feature.
> Do not begin building until you have read every section.

---

## 1. FEATURE OVERVIEW

Affiliations allows a BytLinks user (an employee, contractor, or team member) to publicly
associate their personal page with a business page. The business page can display a
"Meet Our Team" section showing all affiliated members.

This is BytLinks's core differentiator for the small business market. A plumbing company
creates their BytLinks page. Each plumber on their team has their own personal BytLinks page.
When a customer scans a plumber's QR code at a job site, they see his personal page — and
a badge that says "Northern Oak Plumbing · Lead Technician" with a link to the company page.
Trust is established. The company looks professional. The network grows organically.

---

## 2. USER STORIES

**As a business owner:**
- I can generate an invite code or invite link from my Affiliations dashboard tab
- I can see all pending and active affiliations on my page
- I can approve or reject affiliation requests
- I can remove an affiliation at any time
- I can choose whether to display a "Meet Our Team" section on my public page
- I can see each affiliate's role label as it will appear publicly

**As an individual user (employee/contractor):**
- I can enter an invite code or click an invite link to request affiliation with a business
- I can set my role title for that affiliation (e.g. "Lead Technician", "Sales Rep")
- I can toggle whether the affiliation badge shows on my public page
- I can remove myself from an affiliation at any time
- I can be affiliated with multiple businesses simultaneously

**Public page visitor:**
- On an employee's page: sees a small affiliation badge below their name/title
  showing the business logo, business name, their role, linking to the business page
- On a business page: sees an optional "Meet Our Team" section with cards for each
  active affiliate, linking to their individual pages

---

## 3. DATABASE SCHEMA

### New Table 1 — page_affiliations
```sql
-- Migration: migrations/033_affiliations.sql

CREATE TABLE IF NOT EXISTS page_affiliations (
  id TEXT PRIMARY KEY,
  business_page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  member_page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL DEFAULT 'Team Member',
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'active' | 'rejected'
  show_on_business_page INTEGER DEFAULT 1,  -- business controls this
  show_on_member_page INTEGER DEFAULT 1,    -- member controls this
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(business_page_id, member_page_id)
);

CREATE INDEX idx_affiliations_business ON page_affiliations(business_page_id, status);
CREATE INDEX idx_affiliations_member ON page_affiliations(member_page_id, status);
```

### New Table 2 — affiliation_invites
```sql
CREATE TABLE IF NOT EXISTS affiliation_invites (
  id TEXT PRIMARY KEY,
  business_page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,               -- short human-readable code e.g. "NOK-X7P2"
  token_hash TEXT NOT NULL UNIQUE,         -- full secure token (hashed), used in invite links
  created_by TEXT NOT NULL REFERENCES users(id),
  max_uses INTEGER DEFAULT NULL,           -- null = unlimited
  use_count INTEGER DEFAULT 0,
  expires_at INTEGER DEFAULT NULL,         -- null = never expires
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_invites_business ON affiliation_invites(business_page_id);
CREATE INDEX idx_invites_code ON affiliation_invites(code);
CREATE INDEX idx_invites_token ON affiliation_invites(token_hash);
```

### Modified Table — bio_pages
```sql
-- Migration: add to 033_affiliations.sql
ALTER TABLE bio_pages ADD COLUMN show_team_section INTEGER DEFAULT 1;
-- Controls whether the "Meet Our Team" block renders on the business page
```

---

## 4. INVITE CODE DESIGN

Two ways to invite:

**Short code** (human-readable, for verbal/manual sharing):
- Format: `[3-letter business prefix]-[4 random alphanumeric]`
- Example: `NOK-X7P2` (Northern Oak → NOK)
- User types this into their Affiliations tab to request joining

**Full invite link** (for sharing via text/email):
- Format: `https://bytlinks.com/join/[22-char base62 token]`
- Uses existing `generateAccessToken()` from `apps/worker/src/utils/crypto.ts`
- Token is hashed with SHA-256 before DB storage (same pattern as password reset)

Both the short code and the full token map to the same `affiliation_invites` row.

**Short code generation logic (Worker):**
```typescript
function generateInviteCode(businessName: string): string {
  const prefix = businessName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const suffix = generateAccessToken().toUpperCase().slice(0, 4);
  return `${prefix}-${suffix}`;
}
```

---

## 5. API ENDPOINTS

All endpoints live in a new file: `apps/worker/src/routes/affiliations.ts`
Register in `apps/worker/src/index.ts` as `app.route('/api/affiliations', affiliationsRouter)`

### Business-side endpoints (require auth, user must own business_page_id)

```
POST   /api/affiliations/invite/create
  Body: { business_page_id: string, max_uses?: number, expires_in_days?: number }
  Returns: { code: string, invite_url: string, invite_id: string }

GET    /api/affiliations/invites/:business_page_id
  Returns: { invites: AffiliationInvite[] }

DELETE /api/affiliations/invite/:invite_id
  Deactivates the invite (sets is_active = 0)

GET    /api/affiliations/members/:business_page_id
  Returns: { pending: AffiliationMember[], active: AffiliationMember[] }
  Each member includes: page username, display_name, avatar_url, role_label, created_at

POST   /api/affiliations/approve/:affiliation_id
  Business approves a pending request. Sets status = 'active'

POST   /api/affiliations/reject/:affiliation_id
  Sets status = 'rejected'

DELETE /api/affiliations/remove/:affiliation_id
  Business removes an active member. Deletes the row.

PATCH  /api/affiliations/team-visibility
  Body: { business_page_id: string, show_team_section: boolean }
  Toggles the "Meet Our Team" section on the business public page
```

### Member-side endpoints (require auth, user must own member_page_id)

```
POST   /api/affiliations/join
  Body: { code: string, member_page_id: string, role_label: string }
  Validates code → finds business page → creates pending affiliation row
  Returns: { affiliation_id: string, business_name: string, status: 'pending' }

GET    /api/affiliations/my/:member_page_id
  Returns: { affiliations: MyAffiliation[] }
  Each includes: business display_name, avatar_url, role_label, status, show_on_member_page

PATCH  /api/affiliations/visibility/:affiliation_id
  Body: { show_on_member_page: boolean }
  Member toggles badge visibility on their own page

PATCH  /api/affiliations/role/:affiliation_id
  Body: { role_label: string }
  Member updates their role label (max 40 chars)

DELETE /api/affiliations/leave/:affiliation_id
  Member removes themselves from an affiliation
```

### Public endpoint (no auth — called from public page loader)

```
GET    /api/public/:username  ← MODIFY EXISTING, do not create new endpoint

Add a 7th parallel query to the existing public page loader in
apps/worker/src/routes/public.ts:

// Fetch active affiliations where this page is the MEMBER
const affiliationsAsMember = await db.prepare(`
  SELECT
    pa.id, pa.role_label, pa.show_on_member_page,
    bp.username AS business_username,
    bp.display_name AS business_name,
    bp.avatar_r2_key AS business_avatar_key
  FROM page_affiliations pa
  JOIN bio_pages bp ON bp.id = pa.business_page_id
  WHERE pa.member_page_id = ? AND pa.status = 'active' AND pa.show_on_member_page = 1
  ORDER BY pa.created_at ASC
`).bind(page.id).all();

// Fetch active affiliations where this page is the BUSINESS (for team section)
const affiliationsAsBusiness = await db.prepare(`
  SELECT
    pa.id, pa.role_label,
    bp.username AS member_username,
    bp.display_name AS member_name,
    bp.avatar_r2_key AS member_avatar_key,
    bp.job_title AS member_job_title
  FROM page_affiliations pa
  JOIN bio_pages bp ON bp.id = pa.member_page_id
  WHERE pa.business_page_id = ? AND pa.status = 'active' AND pa.show_on_business_page = 1
  ORDER BY pa.created_at ASC
`).bind(page.id).all();

Add both arrays to the response data object:
{
  ...existingData,
  affiliations: affiliationsAsMember.results,   // for badge rendering
  teamMembers: affiliationsAsBusiness.results,  // for Meet Our Team section
}
```

---

## 6. FRONTEND — NEW FILES TO CREATE

### A. Dashboard Tab — AffiliationsPanel.tsx
`apps/web/src/components/affiliations/AffiliationsPanel.tsx`

This is the main dashboard UI. It has two views depending on whether the user's page
is being used as a business or member. Use a tab switcher at the top: "My Affiliations"
(member view) and "Manage Team" (business view).

**My Affiliations tab (member view):**
- List of current affiliations with status badges (Pending / Active)
- Each row: business logo, business name, role label (editable inline), visibility toggle
- "Join a team" section: text input for invite code + role label field + Join button
- Empty state: "Enter an invite code from your employer or team lead"

**Manage Team tab (business view):**
- Invite code generator: shows current active code + invite link with copy button
  and a "Generate New Code" button
- Pending requests list: name, avatar, requested role — Approve / Reject buttons
- Active members list: name, avatar, role label, visibility toggle, Remove button
- Toggle: "Show team section on my public page" (controls show_team_section)
- Empty state: "Share your invite code with your team members"

### B. Affiliation Badge Component
`apps/web/src/components/page/AffiliationBadge.tsx`

Renders on the public page below nameBlock in PageHero. One badge per active affiliation.

```typescript
interface AffiliationBadgeProps {
  businessUsername: string;
  businessName: string;
  businessAvatarUrl: string | null;
  roleLabel: string;
}
```

Visual design:
- Small pill/chip with business avatar (20px circle) + business name + role label
- Subtle — should not compete with the person's own name/title
- Clickable — links to `bytlinks.com/[businessUsername]`
- Theme-aware: uses CSS custom properties, never hardcoded colors
- Example: 🔵 [logo] Northern Oak Plumbing · Lead Technician →

### C. Team Section Component
`apps/web/src/components/page/TeamSection.tsx`

Renders on the business public page when show_team_section = 1 and teamMembers.length > 0.

Visual design:
- Section header: "Meet Our Team"
- Grid of member cards (2-col mobile, 3-col desktop)
- Each card: avatar, name, role_label, link to their BytLinks page
- Consistent with existing rolodex card style
- Only renders if page.show_team_section === 1 AND teamMembers.length > 0

---

## 7. FRONTEND — FILES TO MODIFY

### Dashboard.tsx
`apps/web/src/pages/Dashboard.tsx`

```typescript
// 1. Extend type union
type DashboardTab = 'mybytlink' | 'card' | 'analytics' | 'settings' | 'manage' | 'affiliations';

// 2. Add icon (use Users from lucide-react)
affiliations: Users,

// 3. Add to tabs array (insert between 'manage' and end)
{ key: 'affiliations', label: 'Affiliations', mobileLabel: 'Team' }

// 4. Add render branch in content area
} : activeTab === 'affiliations' ? (
  <main className="px-6 py-8 lg:px-10 lg:py-10 pb-20 lg:pb-10 overflow-y-auto">
    <AffiliationsPanel />
  </main>
```

### PageHero.tsx
`apps/web/src/components/page/PageHero.tsx`

Add `affiliations` prop to PageHeroProps interface:
```typescript
affiliations?: AffiliationBadgeData[];
```

Inject `<AffiliationBadge>` components after `{nameBlock}` and before `{bioBlock}`
in all three layout branches (centered, sidebar, side-by-side).

### PublicPage.tsx
`apps/web/src/pages/PublicPage.tsx`

- Destructure `affiliations` and `teamMembers` from the API response data
- Pass `affiliations` to both `mobileHero` and `desktopHero` PageHero instances
- Render `<TeamSection teamMembers={teamMembers} />` in the right column
  after existing blocks, only when teamMembers.length > 0

---

## 8. SHARED TYPES
`packages/shared/types.ts` — add these:

```typescript
export interface AffiliationBadgeData {
  id: string;
  businessUsername: string;
  businessName: string;
  businessAvatarKey: string | null;
  roleLabel: string;
}

export interface TeamMemberData {
  id: string;
  memberUsername: string;
  memberName: string;
  memberAvatarKey: string | null;
  roleLabel: string;
  memberJobTitle: string | null;
}

export interface PageAffiliation {
  id: string;
  businessPageId: string;
  memberPageId: string;
  roleLabel: string;
  status: 'pending' | 'active' | 'rejected';
  showOnBusinessPage: boolean;
  showOnMemberPage: boolean;
  createdAt: number;
}
```

---

## 9. BUILD ORDER — DO NOT SKIP STEPS

Build in this exact sequence. Do not jump ahead.

**Phase 1 — Database & API (no UI yet)**
1. Create migration `033_affiliations.sql` with both new tables + bio_pages ALTER
2. Create `apps/worker/src/routes/affiliations.ts` with all endpoints
3. Register affiliations router in `apps/worker/src/index.ts`
4. Modify `apps/worker/src/routes/public.ts` to add the two new parallel queries
5. Add shared types to `packages/shared/types.ts`
6. Run `npx tsc --noEmit` — zero errors before proceeding

**Phase 2 — Public page display (read-only, no dashboard yet)**
7. Create `AffiliationBadge.tsx`
8. Create `TeamSection.tsx`
9. Modify `PageHero.tsx` to accept and render affiliations prop
10. Modify `PublicPage.tsx` to pass data through
11. Test: manually insert a row into page_affiliations via DB, verify badge renders

**Phase 3 — Dashboard UI**
12. Create `AffiliationsPanel.tsx` (member view first, then business view)
13. Modify `Dashboard.tsx` to add the new tab
14. Wire all API calls in the panel
15. Test full flow: generate code → join → approve → badge appears → leave

---

## 10. VALIDATION RULES

**On POST /api/affiliations/join:**
- Code must exist, be active, not expired, not exceeded max_uses
- member_page_id must belong to the authenticated user
- business_page_id cannot equal member_page_id (can't affiliate with yourself)
- Duplicate check: UNIQUE constraint on (business_page_id, member_page_id)
- role_label: required, max 40 characters, strip HTML

**On POST /api/affiliations/approve:**
- Authenticated user must own the business_page_id
- Affiliation must be in 'pending' status

**On PATCH /api/affiliations/role:**
- Authenticated user must own the member_page_id of that affiliation
- role_label max 40 chars

**On DELETE /api/affiliations/remove:**
- Authenticated user must own the business_page_id
- Can remove pending or active affiliations

---

## 11. DESIGN RULES (NEVER VIOLATE)

These inherit from the main BytLinks coding standards:
1. Never hardcode colors — use CSS custom properties exclusively
2. Never use `transition: all` — specify exact properties
3. Mobile-first, but desktop gets a genuinely different layout
4. No prop drilling beyond 2 levels — lift to Zustand if needed
5. Business logic in hooks, not JSX
6. All Worker endpoints validate input and return typed JSON
7. Error handling everywhere — no silent failures
8. The AffiliationBadge must be subtle — it should never visually compete
   with the page owner's own name or primary identity
9. The TeamSection must match the existing rolodex card visual language

---

## 12. WHAT SUCCESS LOOKS LIKE

When this feature is complete, this exact flow works end to end:

1. Northern Oak Plumbing logs into BytLinks, goes to Affiliations tab
2. Clicks "Generate Invite Code" — gets code `NOK-X7P2` and a shareable link
3. Boss texts the code to plumber Josh
4. Josh logs in, goes to Affiliations tab, enters `NOK-X7P2`, sets role "Lead Technician", hits Join
5. Boss sees pending request, clicks Approve
6. Josh's public page now shows a badge: [NOP logo] Northern Oak Plumbing · Lead Technician
7. Northern Oak Plumbing's public page shows Josh in the "Meet Our Team" section
8. A customer scans Josh's QR code, sees his page, sees the badge, trusts he's legit,
   clicks the badge, lands on the company page, saves the contact

That flow — zero friction, no app, real trust signal — is the whole point.
