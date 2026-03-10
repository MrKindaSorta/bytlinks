import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { CollabsData, CollabItem } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

interface CollabProfile {
  username: string;
  display_name: string | null;
  bio: string | null;
  job_title: string | null;
  profession: string | null;
  avatar_r2_key: string | null;
}

/** Normalise old `usernames` array and new `items` array into a unified list */
function resolveItems(data: CollabsData): CollabItem[] {
  if (data.items && data.items.length > 0) return data.items;
  if (data.usernames && data.usernames.length > 0) {
    return data.usernames.map((u) => ({ username: u }));
  }
  return [];
}

export function CollabsRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as CollabsData;
  const items = resolveItems(data);
  const displayStyle = data.display_style || 'grid';

  const [profiles, setProfiles] = useState<CollabProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!items.length) {
      setLoading(false);
      return;
    }

    const usernames = items.map((i) => i.username);

    fetch(`/api/public/batch-profiles?usernames=${encodeURIComponent(usernames.join(','))}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const profileMap = new Map<string, CollabProfile>();
          for (const p of json.data as CollabProfile[]) {
            profileMap.set(p.username, p);
          }
          setProfiles(
            usernames.map((u) => profileMap.get(u) || {
              username: u,
              display_name: null,
              bio: null,
              job_title: null,
              profession: null,
              avatar_r2_key: null,
            })
          );
        }
      })
      .catch(() => {
        setProfiles(usernames.map((u) => ({
          username: u,
          display_name: null,
          bio: null,
          job_title: null,
          profession: null,
          avatar_r2_key: null,
        })));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((i) => i.username))]);

  if (!items.length) return null;

  const displayProfiles: Array<CollabProfile & { relationship_label?: string }> =
    profiles.length
      ? profiles.map((p, i) => ({ ...p, relationship_label: items[i]?.relationship_label }))
      : items.map((item) => ({
          username: item.username,
          display_name: null,
          bio: null,
          job_title: null,
          profession: null,
          avatar_r2_key: null,
          relationship_label: item.relationship_label,
        }));

  function handleClick() {
    if (pageId) trackEvent(pageId, 'collab_click', { blockId: block.id });
  }

  if (displayStyle === 'list') {
    return (
      <div className="scroll-reveal my-6">
        {block.title && (
          <h3
            className="text-base font-bold tracking-tight mb-3"
            style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
          >
            {block.title}
          </h3>
        )}
        <div className="flex flex-col gap-3">
          {displayProfiles.map((profile, i) => (
            <Link
              key={profile.username}
              to={`/${profile.username}`}
              onClick={handleClick}
              className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200"
              style={{
                background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
                border: '1px solid rgba(128,128,128,0.1)',
                opacity: loading ? 0 : 1,
                transform: loading ? 'translateY(4px)' : 'translateY(0)',
                transition: `opacity 300ms ease ${i * 50}ms, transform 300ms ease ${i * 50}ms, box-shadow 200ms ease`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              {/* Avatar */}
              {profile.avatar_r2_key ? (
                <img
                  src={`/api/public/avatar/${profile.avatar_r2_key}`}
                  alt={profile.display_name || profile.username}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
                    color: 'var(--page-text)',
                    opacity: 0.5,
                  }}
                >
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}>
                    {profile.display_name || `@${profile.username}`}
                  </span>
                  {profile.relationship_label && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: 'var(--page-accent)', color: 'var(--page-bg)', opacity: 0.85 }}
                    >
                      {profile.relationship_label}
                    </span>
                  )}
                </div>
                {(profile.job_title || profile.profession) && (
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--page-text)', opacity: 0.55 }}>
                    {[profile.job_title, profile.profession].filter(Boolean).join(' · ')}
                  </p>
                )}
                <span className="text-[11px] font-medium" style={{ color: 'var(--page-accent)' }}>
                  View Profile &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Grid mode (default)
  return (
    <div className="scroll-reveal my-6">
      {block.title && (
        <h3
          className="text-base font-bold tracking-tight mb-3"
          style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
        >
          {block.title}
        </h3>
      )}
      <div className="relative">
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {displayProfiles.map((profile, i) => (
            <Link
              key={profile.username}
              to={`/${profile.username}`}
              onClick={handleClick}
              className="flex flex-col items-center gap-1.5 shrink-0 rounded-xl p-3 transition-all duration-200"
              style={{
                minWidth: 100,
                maxWidth: 110,
                background: 'var(--page-surface-alt, rgba(128,128,128,0.04))',
                border: '1px solid rgba(128,128,128,0.08)',
                opacity: loading ? 0 : 1,
                transform: loading ? 'translateY(4px)' : 'translateY(0)',
                transition: `opacity 300ms ease ${i * 50}ms, transform 300ms ease ${i * 50}ms`,
              }}
            >
              {profile.avatar_r2_key ? (
                <img
                  src={`/api/public/avatar/${profile.avatar_r2_key}`}
                  alt={profile.display_name || profile.username}
                  className="w-14 h-14 rounded-full object-cover transition-transform duration-200 hover:scale-105"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold transition-transform duration-200 hover:scale-105"
                  style={{
                    background: 'var(--page-surface-alt, rgba(128,128,128,0.15))',
                    color: 'var(--page-text)',
                    opacity: 0.5,
                  }}
                >
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name */}
              <span
                className="text-[11px] font-semibold text-center leading-tight w-full truncate"
                style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
              >
                {profile.display_name || `@${profile.username}`}
              </span>

              {/* Job / profession */}
              {(profile.job_title || profile.profession) && (
                <span
                  className="text-[10px] text-center leading-tight w-full truncate"
                  style={{ color: 'var(--page-text)', opacity: 0.5 }}
                >
                  {profile.job_title || profile.profession}
                </span>
              )}

              {/* Relationship label badge */}
              {profile.relationship_label && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-center"
                  style={{ background: 'var(--page-accent)', color: 'var(--page-bg)', opacity: 0.85 }}
                >
                  {profile.relationship_label}
                </span>
              )}

              <span className="text-[10px] font-medium" style={{ color: 'var(--page-accent)' }}>
                View Profile &rarr;
              </span>
            </Link>
          ))}
        </div>
        {/* Fade edge when scrollable */}
        {displayProfiles.length > 4 && (
          <div
            className="absolute top-0 right-0 w-8 h-20 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, transparent, var(--page-bg, #fff))',
            }}
          />
        )}
      </div>
    </div>
  );
}
