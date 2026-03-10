import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import { useUiStore } from '../../../store/uiStore';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { StatsData, StatItem } from '@bytlinks/shared';

const SOURCES = [
  { key: 'manual', label: 'Manual' },
  { key: 'spotify_followers', label: 'Spotify Followers', placeholder: 'Spotify artist URL' },
  { key: 'youtube_subscribers', label: 'YouTube Subscribers', placeholder: 'YouTube channel URL' },
  { key: 'instagram_followers', label: 'Instagram Followers', placeholder: 'Instagram profile URL' },
] as const;

const COMING_SOON = [
  'GitHub Stars',
  'TikTok Followers',
  'Twitch Subscribers',
  'Twitter Followers',
];

function formatTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function StatsEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as StatsData;
  const [items, setItems] = useState<StatItem[]>(data.items || []);
  const [animate, setAnimate] = useState(data.animate !== false);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  function save(updated: StatItem[], anim?: boolean) {
    editBlock(block.id, { data: { items: updated, animate: anim ?? animate } });
  }

  function updateItem(index: number, field: keyof StatItem, value: string) {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    setItems(next);
  }

  function updateSource(index: number, source: string) {
    const next = items.map((item, i) => (i === index ? { ...item, source: source as StatItem['source'], source_url: '' } : item));
    setItems(next);
    save(next);
  }

  function addItem() {
    if (items.length >= 6) return;
    const next = [...items, { id: crypto.randomUUID(), value: '', label: '', source: 'manual' as const }];
    setItems(next);
    save(next);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    save(next);
  }

  function moveItem(fromIndex: number, direction: 'up' | 'down') {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const next = [...items];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    setItems(next);
    save(next);
  }

  async function refreshStat(index: number) {
    const item = items[index];
    if (!item.id || !item.source || item.source === 'manual') return;

    setRefreshing(item.id);
    try {
      const res = await fetch('/api/utils/stats-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ block_id: block.id, stat_id: item.id }),
      });
      const json = await res.json();
      if (json.success) {
        const next = items.map((it, i) =>
          i === index ? { ...it, live_value: json.data.value, last_fetched_at: Math.floor(Date.now() / 1000) } : it
        );
        setItems(next);
        save(next);
      } else {
        useUiStore.getState().addToast(json.error || 'Refresh failed', 'error');
      }
    } catch {
      useUiStore.getState().addToast('Refresh failed', 'error');
    } finally {
      setRefreshing(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-[11px] text-brand-text-muted">
        Use prefixes/suffixes in the value field: $12K, 99%, 4.9/5
      </p>
      {items.map((item, i) => {
        const sourceInfo = SOURCES.find((s) => s.key === (item.source || 'manual'));
        const isLive = item.source && item.source !== 'manual';

        return (
          <div key={item.id || i} className="rounded-lg border border-brand-border p-2.5 space-y-2">
            <div className="flex gap-2 items-start">
              <div className="flex flex-col gap-0.5 mt-1">
                {items.length > 1 && (
                  <>
                    <button onClick={() => moveItem(i, 'up')} disabled={i === 0} className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150">&uarr;</button>
                    <button onClick={() => moveItem(i, 'down')} disabled={i === items.length - 1} className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150">&darr;</button>
                  </>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={isLive ? (item.live_value || item.value) : item.value}
                  onChange={(e) => updateItem(i, 'value', e.target.value)}
                  onBlur={() => save(items)}
                  placeholder="$12,000 or 99%"
                  disabled={!!isLive}
                  className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent disabled:opacity-60"
                />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(i, 'label', e.target.value)}
                  onBlur={() => save(items)}
                  placeholder="subscribers"
                  className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
              <button onClick={() => removeItem(i)} className="mt-1 text-xs text-brand-text-muted hover:text-red-500 transition-colors duration-150">&times;</button>
            </div>

            {/* Source selector */}
            <select
              value={item.source || 'manual'}
              onChange={(e) => updateSource(i, e.target.value)}
              className="w-full px-2.5 py-1 rounded-md border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text focus:outline-none focus:border-brand-accent"
            >
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>

            {isLive && sourceInfo && 'placeholder' in sourceInfo && (
              <div className="space-y-1.5">
                <input
                  type="url"
                  value={item.source_url || ''}
                  onChange={(e) => updateItem(i, 'source_url' as keyof StatItem, e.target.value)}
                  onBlur={() => save(items)}
                  placeholder={sourceInfo.placeholder}
                  className="w-full px-2.5 py-1 rounded-md border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshStat(i)}
                    disabled={refreshing === item.id || !item.source_url}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md font-body text-[10px] font-medium bg-brand-surface-alt text-brand-text-secondary hover:text-brand-accent disabled:opacity-40 transition-colors duration-150"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${refreshing === item.id ? 'animate-spin' : ''}`} />
                    Refresh now
                  </button>
                  {item.last_fetched_at && (
                    <span className="font-body text-[10px] text-brand-text-muted">
                      Updated {formatTimeAgo(item.last_fetched_at)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {items.length < 6 && (
        <button
          onClick={addItem}
          className="w-full py-2 rounded-lg border border-dashed border-brand-border text-xs font-medium text-brand-text-muted hover:border-brand-accent hover:text-brand-accent transition-colors duration-150"
        >
          + Add stat
        </button>
      )}

      <label className="flex items-center gap-2 font-body text-xs text-brand-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={animate}
          onChange={(e) => { setAnimate(e.target.checked); save(items, e.target.checked); }}
          className="accent-brand-accent"
        />
        Animate numbers on scroll
      </label>

      {/* Coming Soon */}
      <div className="pt-2 border-t border-brand-border/50">
        <p className="font-body text-[10px] text-brand-text-muted mb-1.5 uppercase tracking-wider">Coming Soon</p>
        <div className="flex gap-1.5 flex-wrap">
          {COMING_SOON.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-md bg-brand-surface-alt font-body text-[10px] text-brand-text-muted opacity-50">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
