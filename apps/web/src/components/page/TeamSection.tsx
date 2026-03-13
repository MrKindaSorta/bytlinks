import type { TeamMemberData } from '@bytlinks/shared';

interface TeamSectionProps {
  teamMembers: TeamMemberData[];
}

export function TeamSection({ teamMembers }: TeamSectionProps) {
  if (teamMembers.length === 0) return null;

  return (
    <div className="scroll-reveal my-8">
      <h2
        className="text-lg font-bold mb-4"
        style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}
      >
        Meet Our Team
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {teamMembers.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function TeamMemberCard({ member }: { member: TeamMemberData }) {
  const avatarUrl = member.memberAvatarKey
    ? `/api/public/avatar/${member.memberAvatarKey}`
    : null;

  const initial = (member.memberName || member.memberUsername || '?').charAt(0).toUpperCase();
  const displayName = member.memberName || member.memberUsername;

  return (
    <a
      href={`/${member.memberUsername}`}
      className="flex flex-col items-center gap-2 rounded-xl p-4 transition-opacity duration-200 hover:opacity-80"
      style={{
        background: 'var(--page-surface-alt, rgba(128,128,128,0.04))',
        border: '1px solid rgba(128,128,128,0.08)',
        textDecoration: 'none',
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-14 h-14 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
          style={{
            background: 'var(--page-accent, rgba(128,128,128,0.15))',
            color: 'var(--page-bg, #fff)',
          }}
        >
          {initial}
        </span>
      )}
      <div className="text-center min-w-0 w-full">
        <p
          className="text-xs font-semibold truncate"
          style={{ color: 'var(--page-text)' }}
        >
          {displayName}
        </p>
        <p
          className="text-[10px] truncate mt-0.5"
          style={{ color: 'var(--page-text)', opacity: 0.55 }}
        >
          {member.roleLabel}
        </p>
      </div>
    </a>
  );
}
