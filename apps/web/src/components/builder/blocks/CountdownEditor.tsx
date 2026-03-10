import { useState } from 'react';
import { ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { CountdownData } from '@bytlinks/shared';

const COMMON_TIMEZONES = [
  { tz: 'UTC', label: 'UTC', offset: '+0' },
  { tz: 'America/New_York', label: 'Eastern Time', offset: '-5' },
  { tz: 'America/Chicago', label: 'Central Time', offset: '-6' },
  { tz: 'America/Denver', label: 'Mountain Time', offset: '-7' },
  { tz: 'America/Los_Angeles', label: 'Pacific Time', offset: '-8' },
  { tz: 'America/Anchorage', label: 'Alaska Time', offset: '-9' },
  { tz: 'Pacific/Honolulu', label: 'Hawaii Time', offset: '-10' },
  { tz: 'America/Phoenix', label: 'Arizona', offset: '-7' },
  { tz: 'America/Toronto', label: 'Toronto', offset: '-5' },
  { tz: 'America/Vancouver', label: 'Vancouver', offset: '-8' },
  { tz: 'America/Mexico_City', label: 'Mexico City', offset: '-6' },
  { tz: 'America/Bogota', label: 'Bogota', offset: '-5' },
  { tz: 'America/Sao_Paulo', label: 'Sao Paulo', offset: '-3' },
  { tz: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', offset: '-3' },
  { tz: 'Europe/London', label: 'London', offset: '+0' },
  { tz: 'Europe/Paris', label: 'Paris', offset: '+1' },
  { tz: 'Europe/Berlin', label: 'Berlin', offset: '+1' },
  { tz: 'Europe/Madrid', label: 'Madrid', offset: '+1' },
  { tz: 'Europe/Rome', label: 'Rome', offset: '+1' },
  { tz: 'Europe/Amsterdam', label: 'Amsterdam', offset: '+1' },
  { tz: 'Europe/Brussels', label: 'Brussels', offset: '+1' },
  { tz: 'Europe/Zurich', label: 'Zurich', offset: '+1' },
  { tz: 'Europe/Vienna', label: 'Vienna', offset: '+1' },
  { tz: 'Europe/Stockholm', label: 'Stockholm', offset: '+1' },
  { tz: 'Europe/Warsaw', label: 'Warsaw', offset: '+1' },
  { tz: 'Europe/Athens', label: 'Athens', offset: '+2' },
  { tz: 'Europe/Helsinki', label: 'Helsinki', offset: '+2' },
  { tz: 'Europe/Bucharest', label: 'Bucharest', offset: '+2' },
  { tz: 'Europe/Istanbul', label: 'Istanbul', offset: '+3' },
  { tz: 'Europe/Moscow', label: 'Moscow', offset: '+3' },
  { tz: 'Asia/Dubai', label: 'Dubai', offset: '+4' },
  { tz: 'Asia/Karachi', label: 'Karachi', offset: '+5' },
  { tz: 'Asia/Kolkata', label: 'India (IST)', offset: '+5:30' },
  { tz: 'Asia/Dhaka', label: 'Dhaka', offset: '+6' },
  { tz: 'Asia/Bangkok', label: 'Bangkok', offset: '+7' },
  { tz: 'Asia/Jakarta', label: 'Jakarta', offset: '+7' },
  { tz: 'Asia/Singapore', label: 'Singapore', offset: '+8' },
  { tz: 'Asia/Hong_Kong', label: 'Hong Kong', offset: '+8' },
  { tz: 'Asia/Shanghai', label: 'Shanghai', offset: '+8' },
  { tz: 'Asia/Taipei', label: 'Taipei', offset: '+8' },
  { tz: 'Asia/Seoul', label: 'Seoul', offset: '+9' },
  { tz: 'Asia/Tokyo', label: 'Tokyo', offset: '+9' },
  { tz: 'Australia/Perth', label: 'Perth', offset: '+8' },
  { tz: 'Australia/Adelaide', label: 'Adelaide', offset: '+9:30' },
  { tz: 'Australia/Sydney', label: 'Sydney', offset: '+10' },
  { tz: 'Australia/Melbourne', label: 'Melbourne', offset: '+10' },
  { tz: 'Australia/Brisbane', label: 'Brisbane', offset: '+10' },
  { tz: 'Pacific/Auckland', label: 'Auckland', offset: '+12' },
  { tz: 'Africa/Lagos', label: 'Lagos', offset: '+1' },
  { tz: 'Africa/Cairo', label: 'Cairo', offset: '+2' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-brand-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left font-body text-xs font-medium text-brand-text-secondary hover:bg-brand-surface-alt/50 transition-colors duration-150"
      >
        {title}
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

export function CountdownEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as CountdownData;

  const [targetDate, setTargetDate] = useState(data.target_date || '');
  const [label, setLabel] = useState(data.label || '');
  const [expiredText, setExpiredText] = useState(data.expired_text || '');
  const [timezone, setTimezone] = useState(data.timezone || 'UTC');
  const [showVisitorTz, setShowVisitorTz] = useState(data.show_visitor_timezone !== false);
  const [recurrence, setRecurrence] = useState(data.recurrence || 'none');
  const [recurrenceDay, setRecurrenceDay] = useState(data.recurrence_day ?? 1);
  const [recurrenceTime, setRecurrenceTime] = useState(data.recurrence_time || '12:00');
  const [revealEnabled, setRevealEnabled] = useState(data.reveal_enabled || false);
  const [revealHeadline, setRevealHeadline] = useState(data.reveal_headline || '');
  const [revealDescription, setRevealDescription] = useState(data.reveal_description || '');
  const [revealCtaLabel, setRevealCtaLabel] = useState(data.reveal_cta_label || '');
  const [revealCtaUrl, setRevealCtaUrl] = useState(data.reveal_cta_url || '');
  const [revealHideAfter, setRevealHideAfter] = useState<string>(data.reveal_hide_after_hours?.toString() || '');
  const [revealImageKey, setRevealImageKey] = useState(data.reveal_image_r2_key || '');
  const [uploading, setUploading] = useState(false);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [tzSearch, setTzSearch] = useState('');

  function save(updates: Partial<CountdownData>) {
    const full: CountdownData = {
      target_date: targetDate,
      label,
      expired_text: expiredText,
      timezone,
      show_visitor_timezone: showVisitorTz,
      recurrence,
      recurrence_day: recurrenceDay,
      recurrence_time: recurrenceTime,
      reveal_enabled: revealEnabled,
      reveal_image_r2_key: revealImageKey || undefined,
      reveal_headline: revealHeadline || undefined,
      reveal_description: revealDescription || undefined,
      reveal_cta_label: revealCtaLabel || undefined,
      reveal_cta_url: revealCtaUrl || undefined,
      reveal_hide_after_hours: revealHideAfter ? parseInt(revealHideAfter, 10) : undefined,
      ...updates,
    };
    editBlock(block.id, { data: full });
  }

  function toggle(section: string) {
    setOpenSection(openSection === section ? null : section);
  }

  const filteredTz = tzSearch
    ? COMMON_TIMEZONES.filter((t) =>
        t.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
        t.tz.toLowerCase().includes(tzSearch.toLowerCase())
      )
    : COMMON_TIMEZONES;

  async function handleRevealImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setRevealImageKey(result.r2_key);
      save({ reveal_image_r2_key: result.r2_key });
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Core fields */}
      <div>
        <label className="font-body text-xs font-medium text-brand-text-secondary mb-1 block">Target Date & Time</label>
        <input
          type="datetime-local"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          onBlur={() => save({ target_date: targetDate })}
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent"
        />
      </div>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => save({ label })}
        placeholder="Label (e.g. 'Launch day!')"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="text"
        value={expiredText}
        onChange={(e) => setExpiredText(e.target.value)}
        onBlur={() => save({ expired_text: expiredText })}
        placeholder="Text when expired (e.g. 'It's here!')"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />

      {/* Section A: Timezone */}
      <Section title="Timezone Settings" open={openSection === 'tz'} onToggle={() => toggle('tz')}>
        <input
          type="text"
          value={tzSearch}
          onChange={(e) => setTzSearch(e.target.value)}
          placeholder="Search timezones..."
          className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
        />
        <div className="max-h-36 overflow-y-auto rounded-md border border-brand-border">
          {filteredTz.map((t) => (
            <button
              key={t.tz}
              onClick={() => { setTimezone(t.tz); save({ timezone: t.tz }); }}
              className={`w-full text-left px-2.5 py-1.5 font-body text-xs transition-colors duration-100
                ${timezone === t.tz ? 'bg-brand-accent/10 text-brand-accent font-medium' : 'text-brand-text hover:bg-brand-surface-alt'}`}
            >
              {t.label} <span className="text-brand-text-muted">(UTC{t.offset})</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showVisitorTz}
            onChange={(e) => { setShowVisitorTz(e.target.checked); save({ show_visitor_timezone: e.target.checked }); }}
            className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
          />
          <span className="font-body text-xs text-brand-text">Show visitors their local time</span>
        </label>
      </Section>

      {/* Section B: Repeat */}
      <Section title="Repeat Settings" open={openSection === 'repeat'} onToggle={() => toggle('repeat')}>
        <div className="flex gap-1.5">
          {(['none', 'weekly', 'monthly'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRecurrence(r); save({ recurrence: r }); }}
              className={`px-2.5 py-1 rounded-md font-body text-xs font-medium transition-colors duration-150
                ${recurrence === r ? 'bg-brand-accent text-white' : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'}`}
            >
              {r === 'none' ? 'None' : r === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
        {recurrence === 'weekly' && (
          <div className="flex gap-1 flex-wrap">
            {DAYS_OF_WEEK.map((d, i) => (
              <button
                key={d}
                onClick={() => { setRecurrenceDay(i); save({ recurrence_day: i }); }}
                className={`px-2 py-1 rounded-md font-body text-[11px] font-medium transition-colors duration-150
                  ${recurrenceDay === i ? 'bg-brand-accent text-white' : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'}`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        {recurrence === 'monthly' && (
          <div>
            <label className="font-body text-xs text-brand-text-secondary mb-1 block">Day of month (1–28)</label>
            <input
              type="number"
              min={1}
              max={28}
              value={recurrenceDay}
              onChange={(e) => setRecurrenceDay(Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              onBlur={() => save({ recurrence_day: recurrenceDay })}
              className="w-20 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text focus:outline-none focus:border-brand-accent"
            />
          </div>
        )}
        {recurrence !== 'none' && (
          <div>
            <label className="font-body text-xs text-brand-text-secondary mb-1 block">Time</label>
            <input
              type="time"
              value={recurrenceTime}
              onChange={(e) => setRecurrenceTime(e.target.value)}
              onBlur={() => save({ recurrence_time: recurrenceTime })}
              className="w-32 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text focus:outline-none focus:border-brand-accent"
            />
          </div>
        )}
      </Section>

      {/* Section C: Post-Expiry Reveal */}
      <Section title="Post-Expiry Reveal" open={openSection === 'reveal'} onToggle={() => toggle('reveal')}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={revealEnabled}
            onChange={(e) => { setRevealEnabled(e.target.checked); save({ reveal_enabled: e.target.checked }); }}
            className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
          />
          <span className="font-body text-xs text-brand-text">Show content after countdown ends</span>
        </label>
        {revealEnabled && (
          <div className="space-y-2.5 pt-1">
            {/* Image upload */}
            <div>
              {revealImageKey ? (
                <div className="relative inline-block">
                  <img src={`/api/public/file/${revealImageKey}`} alt="" className="h-20 rounded-lg object-cover" />
                  <button
                    onClick={() => { setRevealImageKey(''); save({ reveal_image_r2_key: undefined }); }}
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-brand-surface border border-brand-border text-brand-text-muted hover:text-red-500 transition-colors duration-150"
                  >
                    <span className="text-[10px] font-bold px-0.5">x</span>
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-brand-border cursor-pointer hover:border-brand-accent transition-colors duration-150">
                  <Upload className="w-3.5 h-3.5 text-brand-text-muted" />
                  <span className="font-body text-xs text-brand-text-muted">
                    {uploading ? 'Uploading...' : 'Upload reveal image'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleRevealImage} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>
            <input
              type="text"
              value={revealHeadline}
              onChange={(e) => setRevealHeadline(e.target.value)}
              onBlur={() => save({ reveal_headline: revealHeadline || undefined })}
              placeholder="Headline"
              className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
            <textarea
              value={revealDescription}
              onChange={(e) => setRevealDescription(e.target.value)}
              onBlur={() => save({ reveal_description: revealDescription || undefined })}
              placeholder="Description"
              rows={2}
              className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={revealCtaLabel}
                onChange={(e) => setRevealCtaLabel(e.target.value)}
                onBlur={() => save({ reveal_cta_label: revealCtaLabel || undefined })}
                placeholder="Button label"
                className="px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
              <input
                type="url"
                value={revealCtaUrl}
                onChange={(e) => setRevealCtaUrl(e.target.value)}
                onBlur={() => save({ reveal_cta_url: revealCtaUrl || undefined })}
                placeholder="Button URL"
                className="px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
            </div>
            {(revealCtaLabel && !revealCtaUrl) || (!revealCtaLabel && revealCtaUrl) ? (
              <p className="font-body text-[10px] text-amber-500">Both button label and URL are required together.</p>
            ) : null}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={revealHideAfter}
                onChange={(e) => setRevealHideAfter(e.target.value)}
                onBlur={() => save({ reveal_hide_after_hours: revealHideAfter ? parseInt(revealHideAfter, 10) : undefined })}
                placeholder="—"
                className="w-16 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
              <span className="font-body text-xs text-brand-text-muted">hours after expiry, hide block (leave blank = never)</span>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
