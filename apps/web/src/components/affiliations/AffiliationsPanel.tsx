import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage } from '../../hooks/usePage';
import { useSearchParams } from 'react-router-dom';
import {
  Users, UserPlus, Copy, Check, RefreshCw, Eye, EyeOff,
  Loader2, Trash2, CheckCircle2, XCircle, Link2, Clock,
} from 'lucide-react';

// ── Types ──

interface MyAffiliation {
  id: string;
  businessName: string;
  businessUsername: string;
  businessAvatarKey: string | null;
  roleLabel: string;
  status: 'pending' | 'active';
  showOnMemberPage: boolean;
  createdAt: number;
}

interface TeamMember {
  id: string;
  username: string;
  displayName: string | null;
  avatarKey: string | null;
  roleLabel: string;
  status: 'pending' | 'active';
  showOnBusinessPage: boolean;
  createdAt: number;
}

interface InviteData {
  id: string;
  code: string;
  inviteUrl: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: number | null;
  isActive: boolean;
  createdAt: number;
}

// ── Helpers ──

function avatarUrl(key: string | null): string | null {
  return key ? `/api/public/avatar/${key}` : null;
}

function AvatarCircle({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const px = `${size}px`;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-lg object-cover shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      className="rounded-lg flex items-center justify-center font-bold shrink-0 bg-brand-accent/10 text-brand-accent"
      style={{ width: px, height: px, fontSize: `${Math.round(size * 0.38)}px` }}
    >
      {initial}
    </span>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'active' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Panel
// ══════════════════════════════════════════════════════════════════════════

export function AffiliationsPanel() {
  const { page } = usePage();
  const pageId = page?.id || '';
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Member state ──
  const [myAffiliations, setMyAffiliations] = useState<MyAffiliation[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // ── Business state ──
  const [pendingMembers, setPendingMembers] = useState<TeamMember[]>([]);
  const [activeMembers, setActiveMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showTeamSection, setShowTeamSection] = useState(false);

  // ── Auto-join from invite link ──
  const autoJoinHandled = useRef(false);

  // ── Fetch member affiliations ──
  const fetchMyAffiliations = useCallback(async () => {
    if (!pageId) return;
    setMyLoading(true);
    try {
      const res = await fetch(`/api/affiliations/my/${pageId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setMyAffiliations(json.data.affiliations);
      }
    } catch { /* silent */ }
    finally { setMyLoading(false); }
  }, [pageId]);

  // ── Fetch team members ──
  const fetchTeamMembers = useCallback(async () => {
    if (!pageId) return;
    setTeamLoading(true);
    try {
      const res = await fetch(`/api/affiliations/members/${pageId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setPendingMembers(json.data.pending);
        setActiveMembers(json.data.active);
      }
    } catch { /* silent */ }
    finally { setTeamLoading(false); }
  }, [pageId]);

  // ── Fetch invites ──
  const fetchInvites = useCallback(async () => {
    if (!pageId) return;
    try {
      const res = await fetch(`/api/affiliations/invites/${pageId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setInvites(json.data.invites);
      }
    } catch { /* silent */ }
  }, [pageId]);

  // ── Initial load ──
  useEffect(() => {
    if (!pageId) return;
    fetchMyAffiliations();
    fetchTeamMembers();
    fetchInvites();
  }, [pageId, fetchMyAffiliations, fetchTeamMembers, fetchInvites]);

  // ── Sync show_team_section from page data ──
  useEffect(() => {
    if (page) {
      setShowTeamSection(!!(page as unknown as Record<string, unknown>).show_team_section);
    }
  }, [page]);

  // ── Auto-join from ?joinToken= param ──
  useEffect(() => {
    if (autoJoinHandled.current || !pageId) return;
    const token = searchParams.get('joinToken');
    if (!token) return;
    autoJoinHandled.current = true;

    // Clear the param immediately
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('joinToken');
      return next;
    }, { replace: true });

    // Auto-submit the join with a default role (user can edit later)
    (async () => {
      setJoinLoading(true);
      setJoinError('');
      try {
        const res = await fetch('/api/affiliations/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token,
            member_page_id: pageId,
            role_label: 'Team Member',
          }),
        });
        const json = await res.json();
        if (json.success) {
          setJoinSuccess(`Request sent to ${json.data.business_name}! They'll review it shortly.`);
          fetchMyAffiliations();
        } else {
          setJoinError(json.error || 'Failed to join');
        }
      } catch {
        setJoinError('Network error. Please try again.');
      } finally {
        setJoinLoading(false);
      }
    })();
  }, [pageId, searchParams, setSearchParams, fetchMyAffiliations]);

  // ── Join handler (manual code entry) ──
  async function handleJoin() {
    const code = joinCode.trim();
    const role = joinRole.trim() || 'Team Member';
    if (!code) { setJoinError('Enter an invite code'); return; }
    if (role.length > 40) { setJoinError('Role must be 40 characters or less'); return; }

    setJoinLoading(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const res = await fetch('/api/affiliations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code,
          member_page_id: pageId,
          role_label: role,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setJoinSuccess(`Request sent to ${json.data.business_name}! They'll review it shortly.`);
        setJoinCode('');
        setJoinRole('');
        fetchMyAffiliations();
      } else {
        setJoinError(json.error || 'Failed to join');
      }
    } catch {
      setJoinError('Network error. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  }

  // ── Member actions ──
  async function handleToggleVisibility(id: string, current: boolean) {
    try {
      await fetch(`/api/affiliations/visibility/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ show_on_member_page: !current }),
      });
      setMyAffiliations((prev) => prev.map((a) =>
        a.id === id ? { ...a, showOnMemberPage: !current } : a
      ));
    } catch { /* silent */ }
  }

  async function handleUpdateRole(id: string, newRole: string) {
    const role = newRole.trim();
    if (!role || role.length > 40) return;
    try {
      await fetch(`/api/affiliations/role/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role_label: role }),
      });
      setMyAffiliations((prev) => prev.map((a) =>
        a.id === id ? { ...a, roleLabel: role } : a
      ));
    } catch { /* silent */ }
  }

  async function handleLeave(id: string) {
    try {
      await fetch(`/api/affiliations/leave/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setMyAffiliations((prev) => prev.filter((a) => a.id !== id));
    } catch { /* silent */ }
  }

  // ── Business actions ──
  async function handleGenerateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch('/api/affiliations/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ business_page_id: pageId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchInvites();
      }
    } catch { /* silent */ }
    finally { setInviteLoading(false); }
  }

  async function handleDeactivateInvite(inviteId: string) {
    try {
      await fetch(`/api/affiliations/invite/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setInvites((prev) => prev.map((inv) =>
        inv.id === inviteId ? { ...inv, isActive: false } : inv
      ));
    } catch { /* silent */ }
  }

  async function handleApprove(id: string) {
    try {
      await fetch(`/api/affiliations/approve/${id}`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchTeamMembers();
    } catch { /* silent */ }
  }

  async function handleReject(id: string) {
    try {
      await fetch(`/api/affiliations/reject/${id}`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchTeamMembers();
    } catch { /* silent */ }
  }

  async function handleRemoveMember(id: string) {
    try {
      await fetch(`/api/affiliations/remove/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setActiveMembers((prev) => prev.filter((m) => m.id !== id));
    } catch { /* silent */ }
  }

  async function handleToggleTeamSection(value: boolean) {
    setShowTeamSection(value);
    try {
      await fetch('/api/affiliations/team-visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ business_page_id: pageId, show_team_section: value }),
      });
    } catch {
      setShowTeamSection(!value); // revert on error
    }
  }

  if (!pageId) {
    return (
      <div className="px-6 py-8 lg:px-10 lg:py-10 pb-20 lg:pb-10">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-brand-text-muted" />
        </div>
      </div>
    );
  }

  const activeInvite = invites.find((inv) => inv.isActive);

  return (
    <div className="px-6 py-8 lg:px-10 lg:py-10 pb-20 lg:pb-10">
      <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">Affiliations</h1>
      <p className="font-body text-sm text-brand-text-secondary mb-8">
        Manage your team memberships and invite members to your team.
      </p>
      <div className="max-w-3xl space-y-8">
      {/* ════════ SECTION A: My Team Memberships ════════ */}
      <section>
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text mb-1">
          My Team Memberships
        </h2>
        <p className="font-body text-sm text-brand-text-secondary mb-6">
          Teams and businesses you're affiliated with.
        </p>

        {/* Join form */}
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5 mb-5">
          <h3 className="font-body text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Join a team
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Invite code (e.g. NOK-X7P2)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-border bg-brand-bg text-brand-text
                         placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
            <input
              type="text"
              placeholder="Your role (e.g. Lead Technician)"
              value={joinRole}
              onChange={(e) => setJoinRole(e.target.value)}
              maxLength={40}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-border bg-brand-bg text-brand-text
                         placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
            <button
              onClick={handleJoin}
              disabled={joinLoading || !joinCode.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-accent text-white
                         hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 shrink-0"
            >
              {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
            </button>
          </div>
          {joinError && <p className="text-xs text-red-500 mt-2">{joinError}</p>}
          {joinSuccess && <p className="text-xs text-emerald-600 mt-2">{joinSuccess}</p>}
        </div>

        {/* Affiliations list */}
        {myLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-brand-border bg-brand-surface p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-surface-alt" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-brand-surface-alt rounded" />
                    <div className="h-3 w-20 bg-brand-surface-alt rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : myAffiliations.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-brand-border bg-brand-surface">
            <Users className="w-8 h-8 mx-auto text-brand-text-muted mb-3" />
            <p className="font-body text-sm font-semibold text-brand-text mb-1">Not on any teams yet</p>
            <p className="font-body text-xs text-brand-text-muted max-w-xs mx-auto">
              Enter an invite code from a business to join their team.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myAffiliations.map((aff) => (
              <MemberAffiliationRow
                key={aff.id}
                affiliation={aff}
                onToggleVisibility={handleToggleVisibility}
                onUpdateRole={handleUpdateRole}
                onLeave={handleLeave}
              />
            ))}
          </div>
        )}
      </section>

      {/* ════════ SECTION B: Manage My Team ════════ */}
      <section>
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text mb-1">
          Manage My Team
        </h2>
        <p className="font-body text-sm text-brand-text-secondary mb-6">
          Invite people to affiliate with your page.
        </p>

        {/* Invite code section */}
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5 mb-5">
          <h3 className="font-body text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Invite code
          </h3>

          {activeInvite ? (
            <InviteCodeDisplay
              invite={activeInvite}
              onDeactivate={handleDeactivateInvite}
              onGenerate={handleGenerateInvite}
              generating={inviteLoading}
            />
          ) : (
            <div className="flex items-center gap-3">
              <p className="font-body text-xs text-brand-text-muted flex-1">
                No active invite code. Generate one to share with your team.
              </p>
              <button
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent text-white
                           hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 flex items-center gap-1.5"
              >
                {inviteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Generate Code
              </button>
            </div>
          )}
        </div>

        {/* Show team section toggle */}
        <div className="rounded-xl border border-brand-border bg-brand-surface p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="font-body text-sm font-semibold text-brand-text">Show "Meet Our Team" on my page</p>
            <p className="font-body text-xs text-brand-text-muted">Displays active team members on your public page.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showTeamSection}
            onClick={() => handleToggleTeamSection(!showTeamSection)}
            className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0 ${
              showTeamSection ? 'bg-brand-accent' : 'bg-brand-border'
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                         transition-transform duration-200 ${showTeamSection ? 'translate-x-[14px]' : ''}`}
            />
          </button>
        </div>

        {/* Pending requests */}
        {teamLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-brand-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading team...</span>
          </div>
        ) : (
          <>
            {pendingMembers.length > 0 && (
              <div className="mb-5">
                <h3 className="font-body text-sm font-semibold text-brand-text mb-3">
                  Pending requests ({pendingMembers.length})
                </h3>
                <div className="space-y-2">
                  {pendingMembers.map((m) => (
                    <PendingMemberRow
                      key={m.id}
                      member={m}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeMembers.length > 0 ? (
              <div>
                <h3 className="font-body text-sm font-semibold text-brand-text mb-3">
                  Active members ({activeMembers.length})
                </h3>
                <div className="space-y-2">
                  {activeMembers.map((m) => (
                    <ActiveMemberRow
                      key={m.id}
                      member={m}
                      onRemove={handleRemoveMember}
                    />
                  ))}
                </div>
              </div>
            ) : pendingMembers.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-brand-border bg-brand-surface">
                <Users className="w-8 h-8 mx-auto text-brand-text-muted mb-3" />
                <p className="font-body text-sm font-semibold text-brand-text mb-1">No team members yet</p>
                <p className="font-body text-xs text-brand-text-muted max-w-xs mx-auto">
                  Share your invite code with your team members to get started.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════

function MemberAffiliationRow({
  affiliation,
  onToggleVisibility,
  onUpdateRole,
  onLeave,
}: {
  affiliation: MyAffiliation;
  onToggleVisibility: (id: string, current: boolean) => void;
  onUpdateRole: (id: string, role: string) => void;
  onLeave: (id: string) => void;
}) {
  const [editingRole, setEditingRole] = useState(false);
  const [roleInput, setRoleInput] = useState(affiliation.roleLabel);

  function handleRoleSave() {
    if (roleInput.trim() && roleInput.trim() !== affiliation.roleLabel) {
      onUpdateRole(affiliation.id, roleInput.trim());
    }
    setEditingRole(false);
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4 flex items-center gap-3">
      <AvatarCircle
        src={avatarUrl(affiliation.businessAvatarKey)}
        name={affiliation.businessName}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-body text-sm font-semibold text-brand-text truncate">
            {affiliation.businessName}
          </p>
          <StatusBadge status={affiliation.status} />
        </div>
        {editingRole ? (
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              maxLength={40}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRoleSave(); if (e.key === 'Escape') setEditingRole(false); }}
              onBlur={handleRoleSave}
              className="px-2 py-0.5 text-xs rounded border border-brand-border bg-brand-bg text-brand-text
                         focus:outline-none focus:ring-1 focus:ring-brand-accent/30 w-48"
            />
          </div>
        ) : (
          <button
            onClick={() => { setRoleInput(affiliation.roleLabel); setEditingRole(true); }}
            className="font-body text-xs text-brand-text-muted hover:text-brand-text transition-colors duration-150"
            title="Click to edit role"
          >
            {affiliation.roleLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onToggleVisibility(affiliation.id, affiliation.showOnMemberPage)}
          className="p-1.5 rounded-lg hover:bg-brand-surface-alt transition-colors duration-150"
          title={affiliation.showOnMemberPage ? 'Hide badge on my page' : 'Show badge on my page'}
        >
          {affiliation.showOnMemberPage
            ? <Eye className="w-3.5 h-3.5 text-brand-text-secondary" />
            : <EyeOff className="w-3.5 h-3.5 text-brand-text-muted" />
          }
        </button>
        <button
          onClick={() => onLeave(affiliation.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-150"
          title="Leave this team"
        >
          <Trash2 className="w-3.5 h-3.5 text-brand-text-muted hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}

function InviteCodeDisplay({
  invite,
  onDeactivate,
  onGenerate,
  generating,
}: {
  invite: InviteData;
  onDeactivate: (id: string) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const [copied, setCopied] = useState<'code' | 'link' | 'url' | null>(null);

  function handleCopy(text: string, type: 'code' | 'link' | 'url') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="px-3 py-1.5 text-sm font-mono font-bold bg-brand-surface-alt rounded-lg text-brand-text tracking-wider">
          {invite.code}
        </code>
        <button
          onClick={() => handleCopy(invite.code, 'code')}
          className="p-1.5 rounded-lg hover:bg-brand-surface-alt transition-colors duration-150"
          title="Copy code"
        >
          {copied === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-brand-text-muted" />}
        </button>
      </div>
      {invite.inviteUrl && (
        <div className="flex items-center gap-2">
          <p className="font-body text-xs text-brand-text-muted">Or share this link:</p>
          <code className="px-2 py-1 text-xs font-mono bg-brand-surface-alt rounded text-brand-text-secondary truncate max-w-[280px]">
            {invite.inviteUrl.length > 40 ? `${invite.inviteUrl.slice(0, 40)}…` : invite.inviteUrl}
          </code>
          <button
            onClick={() => handleCopy(invite.inviteUrl!, 'url')}
            className="p-1.5 rounded-lg hover:bg-brand-surface-alt transition-colors duration-150 shrink-0"
            title="Copy invite link"
          >
            {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-brand-text-muted" />}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <p className="font-body text-xs text-brand-text-muted truncate flex-1">
          {invite.useCount > 0 && `Used ${invite.useCount}${invite.maxUses ? `/${invite.maxUses}` : ''} times · `}
          Share this code with your team members
        </p>
        <button
          onClick={() => onDeactivate(invite.id)}
          className="text-xs text-brand-text-muted hover:text-red-500 transition-colors duration-150"
        >
          Deactivate
        </button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-xs font-medium text-brand-accent hover:opacity-80 transition-opacity duration-150 flex items-center gap-1"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          New code
        </button>
      </div>
    </div>
  );
}

function PendingMemberRow({
  member,
  onApprove,
  onReject,
}: {
  member: TeamMember;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 flex items-center gap-3">
      <AvatarCircle
        src={avatarUrl(member.avatarKey)}
        name={member.displayName || member.username}
      />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-brand-text truncate">
          {member.displayName || member.username}
        </p>
        <p className="font-body text-xs text-brand-text-muted truncate">
          @{member.username} · {member.roleLabel}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onApprove(member.id)}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white
                     hover:bg-emerald-600 transition-colors duration-150 flex items-center gap-1"
        >
          <CheckCircle2 className="w-3 h-3" /> Approve
        </button>
        <button
          onClick={() => onReject(member.id)}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-surface-alt border border-brand-border
                     text-brand-text-secondary hover:text-brand-text transition-colors duration-150 flex items-center gap-1"
        >
          <XCircle className="w-3 h-3" /> Reject
        </button>
      </div>
    </div>
  );
}

function ActiveMemberRow({
  member,
  onRemove,
}: {
  member: TeamMember;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4 flex items-center gap-3">
      <AvatarCircle
        src={avatarUrl(member.avatarKey)}
        name={member.displayName || member.username}
      />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-brand-text truncate">
          {member.displayName || member.username}
        </p>
        <p className="font-body text-xs text-brand-text-muted truncate">
          @{member.username} · {member.roleLabel}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge status="active" />
        <button
          onClick={() => onRemove(member.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-150"
          title="Remove from team"
        >
          <Trash2 className="w-3.5 h-3.5 text-brand-text-muted hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}
