import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { CollabsData, BioPage } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';

interface CollabProfile {
  username: string;
  display_name: string | null;
  avatar_r2_key: string | null;
}

export function CollabsRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as CollabsData;
  const [profiles, setProfiles] = useState<CollabProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data.usernames?.length) {
      setLoading(false);
      return;
    }

    // Fetch all profiles in parallel (individual requests — no batch endpoint yet)
    Promise.all(
      data.usernames.map(async (username) => {
        try {
          const res = await fetch(`/api/public/${username}`);
          const json = await res.json();
          if (json.success) {
            const page = json.data.page as BioPage;
            return { username, display_name: page.display_name, avatar_r2_key: page.avatar_r2_key };
          }
        } catch {
          // silent
        }
        return { username, display_name: null, avatar_r2_key: null };
      })
    ).then((results) => {
      setProfiles(results);
      setLoading(false);
    });
  }, [data.usernames]);

  if (!data.usernames?.length) return null;

  const displayProfiles = profiles.length
    ? profiles
    : data.usernames.map((u) => ({ username: u, display_name: null, avatar_r2_key: null }));

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
              onClick={() => pageId && trackEvent(pageId, 'collab_click', { blockId: block.id })}
              className="flex flex-col items-center gap-1.5 shrink-0"
              style={{
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
              <span className="text-[11px] font-medium" style={{ color: 'var(--page-text)' }}>
                @{profile.username}
              </span>
            </Link>
          ))}
        </div>
        {/* Fade edge when scrollable */}
        {displayProfiles.length > 4 && (
          <div
            className="absolute top-0 right-0 w-8 h-14 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, transparent, var(--page-bg, #fff))',
            }}
          />
        )}
      </div>
    </div>
  );
}
