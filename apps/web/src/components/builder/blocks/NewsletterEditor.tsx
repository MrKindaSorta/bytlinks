import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { NewsletterData } from '@bytlinks/shared';

interface ExtendedNewsletterData extends NewsletterData {
  success_message?: string;
}

export function NewsletterEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as ExtendedNewsletterData;
  const [heading, setHeading] = useState(data.heading || 'Stay in the loop');
  const [subtext, setSubtext] = useState(data.subtext || '');
  const [buttonLabel, setButtonLabel] = useState(data.button_label || 'Subscribe');
  const [successMessage, setSuccessMessage] = useState(data.success_message || '');

  function save(updates: Partial<ExtendedNewsletterData>) {
    editBlock(block.id, { data: { heading, subtext, button_label: buttonLabel, success_message: successMessage, ...updates } });
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        onBlur={() => save({ heading })}
        placeholder="Heading"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="text"
        value={subtext}
        onChange={(e) => setSubtext(e.target.value)}
        onBlur={() => save({ subtext })}
        placeholder="Subtext (optional)"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="text"
        value={buttonLabel}
        onChange={(e) => setButtonLabel(e.target.value)}
        onBlur={() => save({ button_label: buttonLabel })}
        placeholder="Button label"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <input
        type="text"
        value={successMessage}
        onChange={(e) => setSuccessMessage(e.target.value)}
        onBlur={() => save({ success_message: successMessage })}
        placeholder="Success message (default: You're subscribed!)"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
    </div>
  );
}
