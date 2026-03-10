import type { EmbedBlock } from '@bytlinks/shared';

interface PageEmbedsProps {
  embeds: EmbedBlock[];
}

function getEmbedSrc(embed: EmbedBlock): string | null {
  const url = embed.embed_url;

  switch (embed.type) {
    case 'youtube': {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
    }
    case 'spotify': {
      const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
      if (!match) return null;
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
    }
    default:
      return null;
  }
}

export function PageEmbeds({ embeds }: PageEmbedsProps) {
  if (embeds.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      {embeds.map((embed) => {
        const src = getEmbedSrc(embed);
        if (!src) return null;

        const isSpotify = embed.type === 'spotify';

        return (
          <div
            key={embed.id}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}
          >
            <iframe
              src={src}
              title={`${embed.type} embed`}
              className="w-full border-0"
              style={{ height: isSpotify ? 152 : 315 }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
