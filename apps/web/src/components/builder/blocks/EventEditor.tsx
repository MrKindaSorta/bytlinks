import { useState } from 'react';
import { Upload, Trash2, Image, Plus, ExternalLink, ChevronDown } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { EventData, EventLink } from '@bytlinks/shared';
import { ImageCropEditor, CROP_EVENT_COVER } from '../../shared/ImageCropEditor';

export function EventEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as EventData;
  const [eventName, setEventName] = useState(data.event_name || '');
  const [eventDate, setEventDate] = useState(data.event_date || '');
  const [venue, setVenue] = useState(data.venue || '');
  const [ticketUrl, setTicketUrl] = useState(data.ticket_url || '');
  const [imageKey, setImageKey] = useState(data.image_r2_key || '');
  const [expandable, setExpandable] = useState(data.expandable || false);
  const [details, setDetails] = useState(data.details || '');
  const [links, setLinks] = useState<EventLink[]>(data.links || []);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // RSVP state
  const [rsvpEnabled, setRsvpEnabled] = useState(data.rsvp_enabled || false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvpMode, setRsvpMode] = useState<'interested' | 'full' | 'both'>(data.rsvp_mode || 'interested');
  const [rsvpButtonLabel, setRsvpButtonLabel] = useState(data.rsvp_button_label || '');
  const [rsvpFormHeading, setRsvpFormHeading] = useState(data.rsvp_form_heading || '');
  const [rsvpSuccessMessage, setRsvpSuccessMessage] = useState(data.rsvp_success_message || '');
  const [rsvpCap, setRsvpCap] = useState(data.rsvp_cap != null ? String(data.rsvp_cap) : '');
  const [showInterestedCount, setShowInterestedCount] = useState(data.show_interested_count !== false);

  function currentData(): EventData {
    return {
      ...data,
      event_name: eventName,
      event_date: eventDate,
      venue,
      ticket_url: ticketUrl,
      image_r2_key: imageKey,
      expandable,
      details,
      links,
      rsvp_enabled: rsvpEnabled,
      rsvp_mode: rsvpMode,
      rsvp_button_label: rsvpButtonLabel || undefined,
      rsvp_form_heading: rsvpFormHeading || undefined,
      rsvp_success_message: rsvpSuccessMessage || undefined,
      rsvp_cap: rsvpCap ? parseInt(rsvpCap, 10) : undefined,
      show_interested_count: showInterestedCount,
    };
  }

  function save(updates: Partial<EventData>) {
    editBlock(block.id, { data: { ...currentData(), ...updates } });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setCropFile(file);
    e.target.value = '';
  }

  async function handleCropConfirm(croppedFile: File) {
    setCropFile(null);
    setUploading(true);
    try {
      const result = await uploadFile(croppedFile);
      setImageKey(result.r2_key);
      save({ image_r2_key: result.r2_key });
    } catch {
      // handled
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImageKey('');
    save({ image_r2_key: '' });
  }

  function toggleExpandable() {
    const next = !expandable;
    setExpandable(next);
    save({ expandable: next });
  }

  function toggleRsvpEnabled() {
    const next = !rsvpEnabled;
    setRsvpEnabled(next);
    save({ rsvp_enabled: next });
  }

  /* ── Link management ── */

  function addLink() {
    const newLinks = [...links, { id: crypto.randomUUID(), label: '', url: '' }];
    setLinks(newLinks);
    save({ links: newLinks });
  }

  function updateLink(index: number, field: keyof Omit<EventLink, 'id'>, value: string) {
    const newLinks = links.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    setLinks(newLinks);
  }

  function saveLinks() {
    save({ links });
  }

  function removeLink(index: number) {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    save({ links: newLinks });
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        onBlur={() => save({ event_name: eventName })}
        placeholder="Event name"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <div>
        <label className="font-body text-xs font-medium text-brand-text-secondary mb-1 block">Date & Time</label>
        <input
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          onBlur={() => save({ event_date: eventDate })}
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent"
        />
      </div>
      <input
        type="text"
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        onBlur={() => save({ venue })}
        placeholder="Venue or 'Online'"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="url"
        value={ticketUrl}
        onChange={(e) => setTicketUrl(e.target.value)}
        onBlur={() => save({ ticket_url: ticketUrl })}
        placeholder="Ticket / registration URL (optional)"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />

      {/* Event image */}
      {imageKey ? (
        <div className="relative rounded-lg overflow-hidden bg-brand-surface-alt" style={{ aspectRatio: '16 / 9' }}>
          <img src={`/api/public/file/${imageKey}`} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <button
            onClick={removeImage}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors duration-150"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-brand-border px-3 py-2.5 cursor-pointer hover:border-brand-accent transition-colors duration-150">
          {uploading ? (
            <Upload className="w-4 h-4 text-brand-text-muted animate-pulse" />
          ) : (
            <Image className="w-4 h-4 text-brand-text-muted" />
          )}
          <span className="font-body text-xs text-brand-text-muted">
            {uploading ? 'Uploading...' : 'Add event image (optional)'}
          </span>
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
        </label>
      )}

      {/* Expandable toggle */}
      <div className="rounded-lg border border-brand-border overflow-hidden">
        <button
          type="button"
          onClick={toggleExpandable}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-brand-surface-alt hover:bg-brand-surface-alt/80 transition-colors duration-150"
        >
          <span className="font-body text-xs font-medium text-brand-text">
            Expandable details
          </span>
          <div className="flex items-center gap-2">
            <span className="font-body text-[11px] text-brand-text-muted">
              {expandable ? 'On' : 'Off'}
            </span>
            <div
              role="switch"
              aria-checked={expandable}
              className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                expandable ? 'bg-brand-accent' : 'bg-brand-border'
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                           transition-transform duration-200 ${expandable ? 'translate-x-[14px]' : ''}`}
              />
            </div>
          </div>
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: expandable ? '800px' : '0px' }}
        >
          <div className="px-3 py-3 border-t border-brand-border space-y-3">
            {/* Details text */}
            <div>
              <label className="font-body text-xs text-brand-text-muted mb-1.5 block">
                Details shown when visitors expand the event
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                onBlur={() => save({ details })}
                placeholder="Dress code, parking info, what to bring, agenda..."
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
              />
              <p className="font-body text-[11px] text-brand-text-muted mt-1 text-right">
                {details.length}/2000
              </p>
            </div>

            {/* Links */}
            <div>
              <label className="font-body text-xs text-brand-text-muted mb-1.5 block">
                Links
              </label>
              <div className="space-y-2">
                {links.map((link, i) => (
                  <div key={link.id} className="flex items-start gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-brand-text-muted mt-2 shrink-0" />
                    <div className="flex-1 flex gap-1.5">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        onBlur={saveLinks}
                        placeholder="Label"
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        onBlur={saveLinks}
                        placeholder="https://..."
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                    <button
                      onClick={() => removeLink(i)}
                      className="p-1 mt-1 text-brand-text-muted hover:text-red-500 transition-colors duration-150"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addLink}
                className="flex items-center gap-1 mt-2 font-body text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
                Add link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RSVP Settings */}
      <div className="rounded-lg border border-brand-border overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (!rsvpEnabled) {
              toggleRsvpEnabled();
              setRsvpOpen(true);
            } else {
              setRsvpOpen((o) => !o);
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-brand-surface-alt hover:bg-brand-surface-alt/80 transition-colors duration-150"
        >
          <span className="font-body text-xs font-medium text-brand-text">RSVP Settings</span>
          <div className="flex items-center gap-2">
            <div
              role="switch"
              aria-checked={rsvpEnabled}
              onClick={(e) => { e.stopPropagation(); toggleRsvpEnabled(); if (!rsvpEnabled) setRsvpOpen(true); }}
              className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                rsvpEnabled ? 'bg-brand-accent' : 'bg-brand-border'
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                           transition-transform duration-200 ${rsvpEnabled ? 'translate-x-[14px]' : ''}`}
              />
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-brand-text-muted"
              style={{
                transform: rsvpOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            />
          </div>
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: rsvpOpen ? '600px' : '0px' }}
        >
          <div className="px-3 py-3 border-t border-brand-border space-y-3">
            {/* Mode */}
            <div>
              <label className="font-body text-xs font-medium text-brand-text-secondary mb-1 block">Mode</label>
              <select
                value={rsvpMode}
                onChange={(e) => {
                  const v = e.target.value as 'interested' | 'full' | 'both';
                  setRsvpMode(v);
                  save({ rsvp_mode: v });
                }}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              >
                <option value="interested">Interested only (no form)</option>
                <option value="full">Full RSVP form (name + email)</option>
                <option value="both">Both — interested + RSVP form</option>
              </select>
            </div>

            {/* Button label */}
            <input
              type="text"
              value={rsvpButtonLabel}
              onChange={(e) => setRsvpButtonLabel(e.target.value)}
              onBlur={() => save({ rsvp_button_label: rsvpButtonLabel || undefined })}
              placeholder="RSVP button label (e.g. 'Register Free')"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />

            {/* Form heading */}
            {(rsvpMode === 'full' || rsvpMode === 'both') && (
              <input
                type="text"
                value={rsvpFormHeading}
                onChange={(e) => setRsvpFormHeading(e.target.value)}
                onBlur={() => save({ rsvp_form_heading: rsvpFormHeading || undefined })}
                placeholder="Form heading (e.g. 'Reserve your spot')"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
            )}

            {/* Success message */}
            <input
              type="text"
              value={rsvpSuccessMessage}
              onChange={(e) => setRsvpSuccessMessage(e.target.value)}
              onBlur={() => save({ rsvp_success_message: rsvpSuccessMessage || undefined })}
              placeholder="Success message (e.g. 'You're in!')"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />

            {/* Cap */}
            <div>
              <label className="font-body text-xs text-brand-text-muted mb-1 block">
                Max attendees (optional)
              </label>
              <input
                type="number"
                value={rsvpCap}
                onChange={(e) => setRsvpCap(e.target.value)}
                onBlur={() => save({ rsvp_cap: rsvpCap ? parseInt(rsvpCap, 10) : undefined })}
                placeholder="e.g. 100"
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
            </div>

            {/* Show interested count toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !showInterestedCount;
                setShowInterestedCount(next);
                save({ show_interested_count: next });
              }}
              className="w-full flex items-center justify-between"
            >
              <span className="font-body text-xs text-brand-text-muted">Show interested count</span>
              <div
                role="switch"
                aria-checked={showInterestedCount}
                className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                  showInterestedCount ? 'bg-brand-accent' : 'bg-brand-border'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                             transition-transform duration-200 ${showInterestedCount ? 'translate-x-[14px]' : ''}`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <p className="font-body text-xs text-brand-text-muted">
        Auto-hides after the event. Visitors can add to calendar. Hover/tap the date to see countdown.
      </p>
      {cropFile && (
        <ImageCropEditor
          file={cropFile}
          presets={CROP_EVENT_COVER}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
