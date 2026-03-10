import { useState, useMemo } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { EmbedBlockData, EmbedType } from '@bytlinks/shared';

const EMBED_TYPES: { key: EmbedType; label: string; placeholder: string; pattern: RegExp }[] = [
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/watch?v=...', pattern: /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/ },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/track/...', pattern: /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/ },
];

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function EmbedEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as EmbedBlockData;
  const [embedType, setEmbedType] = useState<EmbedType>(data.embed_type || 'youtube');
  const [embedUrl, setEmbedUrl] = useState(data.embed_url || '');

  function save(updates: Partial<EmbedBlockData>) {
    editBlock(block.id, { data: { embed_type: embedType, embed_url: embedUrl, ...updates } });
  }

  const typeInfo = EMBED_TYPES.find((t) => t.key === embedType);
  const isValid = useMemo(() => {
    if (!embedUrl.trim()) return true; // empty is ok
    return typeInfo ? typeInfo.pattern.test(embedUrl) : true;
  }, [embedUrl, typeInfo]);

  const youtubeId = embedType === 'youtube' && isValid ? getYouTubeId(embedUrl) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {EMBED_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setEmbedType(t.key); save({ embed_type: t.key }); }}
            className={`px-2.5 py-1 rounded-md font-body text-xs font-medium transition-colors duration-150
              ${embedType === t.key
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        <input
          type="url"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          onBlur={() => save({ embed_url: embedUrl })}
          placeholder={typeInfo?.placeholder || 'Paste URL...'}
          className={`w-full px-3 py-2 rounded-lg border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none transition-colors duration-150
            ${!isValid ? 'border-red-400 focus:border-red-500' : 'border-brand-border focus:border-brand-accent'}`}
        />
        {!isValid && (
          <p className="font-body text-[11px] text-red-500 mt-1">
            Please enter a valid {EMBED_TYPES.find((t) => t.key === embedType)?.label || ''} URL
          </p>
        )}
      </div>
      {/* YouTube thumbnail preview */}
      {youtubeId && (
        <div className="rounded-lg overflow-hidden bg-brand-surface-alt">
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}
