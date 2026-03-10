import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { BookingData } from '@bytlinks/shared';

export function BookingEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as BookingData;
  const [bookingUrl, setBookingUrl] = useState(data.booking_url || '');

  function save(updates: Partial<BookingData>) {
    editBlock(block.id, { data: { ...data, booking_url: bookingUrl, ...updates } });
  }

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={bookingUrl}
        onChange={(e) => setBookingUrl(e.target.value)}
        onBlur={() => save({ booking_url: bookingUrl })}
        placeholder="https://calendly.com/you or https://cal.com/you"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <p className="font-body text-xs text-brand-text-muted">
        Paste your Calendly or Cal.com booking link. It will render inline so visitors can book without leaving the page.
      </p>
    </div>
  );
}
