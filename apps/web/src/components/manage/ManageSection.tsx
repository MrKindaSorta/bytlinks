import { useState } from 'react';
import { CalendarDays, Mail, BarChart2, CalendarCheck, ClipboardList } from 'lucide-react';
import { useBlocks } from '../../hooks/useBlocks';
import { ManageBookings } from './ManageBookings';
import { ManageNewsletter } from './ManageNewsletter';
import { ManagePolls } from './ManagePolls';
import { ManageEvents } from './ManageEvents';
import { ManageForms } from './ManageForms';

type ManageSubTab = 'bookings' | 'newsletter' | 'polls' | 'events' | 'forms';

const SUB_TAB_ICONS = {
  bookings: CalendarDays,
  newsletter: Mail,
  polls: BarChart2,
  events: CalendarCheck,
  forms: ClipboardList,
} as const;

const SUB_TAB_LABELS: Record<ManageSubTab, string> = {
  bookings: 'Calendar',
  newsletter: 'Newsletter',
  polls: 'Polls',
  events: 'Events',
  forms: 'Forms',
};

export function ManageSection() {
  const { blocks } = useBlocks();

  const hasBookings = blocks.some((b) => b.block_type === 'booking' || b.block_type === 'schedule' || b.block_type === 'calendar');
  const hasNewsletter = blocks.some((b) => b.block_type === 'newsletter');
  const hasPolls = blocks.some((b) => b.block_type === 'poll');
  const hasEvents = blocks.some((b) => b.block_type === 'event');
  const hasForms = blocks.some((b) => b.block_type === 'form');

  const availableTabs: ManageSubTab[] = [];
  if (hasBookings) availableTabs.push('bookings');
  if (hasNewsletter) availableTabs.push('newsletter');
  if (hasPolls) availableTabs.push('polls');
  if (hasEvents) availableTabs.push('events');
  if (hasForms) availableTabs.push('forms');

  const [activeSubTab, setActiveSubTab] = useState<ManageSubTab>(() => {
    return availableTabs[0] ?? 'bookings';
  });

  // If no relevant blocks exist at all, show empty state
  if (availableTabs.length === 0) {
    return (
      <div className="px-6 py-8 lg:px-10 lg:py-10">
        <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">Manage</h1>
        <p className="font-body text-sm text-brand-text-secondary mb-8">
          Manage your interactive blocks — calendar, newsletters, polls, events, and forms.
        </p>
        <div className="max-w-md text-center mx-auto py-16">
          <p className="font-body text-sm text-brand-text-muted">
            Add a Calendar, Newsletter, Poll, Event, or Form block to your page to manage it here.
          </p>
        </div>
      </div>
    );
  }

  // Ensure activeSubTab is valid given current blocks
  const effectiveTab = availableTabs.includes(activeSubTab) ? activeSubTab : availableTabs[0];

  return (
    <div className="px-6 py-8 lg:px-10 lg:py-10 pb-20 lg:pb-10">
      <h1 className="font-display text-2xl font-800 tracking-tight text-brand-text mb-1">Manage</h1>
      <p className="font-body text-sm text-brand-text-secondary mb-6">
        Manage your interactive blocks — calendar, newsletters, polls, events, and forms.
      </p>

      {/* Sub-navigation */}
      <div className="flex gap-1 mb-8 border-b border-brand-border">
        {availableTabs.map((tab) => {
          const Icon = SUB_TAB_ICONS[tab];
          const isActive = effectiveTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex items-center gap-1.5 font-body text-sm font-medium px-4 py-2.5 border-b-2 -mb-px transition-colors duration-fast
                ${isActive
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {SUB_TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {/* Sub-section content */}
      {effectiveTab === 'bookings' && <ManageBookings blocks={blocks} />}
      {effectiveTab === 'newsletter' && <ManageNewsletter blocks={blocks} />}
      {effectiveTab === 'polls' && <ManagePolls blocks={blocks} />}
      {effectiveTab === 'events' && <ManageEvents blocks={blocks} />}
      {effectiveTab === 'forms' && <ManageForms blocks={blocks} />}
    </div>
  );
}
