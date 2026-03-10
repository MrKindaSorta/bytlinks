import { useState } from 'react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { TipJarData, TipJarProvider } from '@bytlinks/shared';

const PROVIDERS: { value: TipJarProvider; label: string; placeholder: string }[] = [
  { value: 'stripe', label: 'Stripe Payment Link', placeholder: 'https://buy.stripe.com/...' },
  { value: 'kofi', label: 'Ko-fi', placeholder: 'https://ko-fi.com/yourname' },
  { value: 'buymeacoffee', label: 'Buy Me a Coffee', placeholder: 'https://buymeacoffee.com/yourname' },
];

export function TipJarEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as TipJarData;
  const [provider, setProvider] = useState<TipJarProvider>(data.provider || 'stripe');
  const [paymentUrl, setPaymentUrl] = useState(data.payment_url || '');
  const [buttonLabel, setButtonLabel] = useState(data.button_label || '');
  const [amount, setAmount] = useState(data.amount || '');

  function save(updates: Partial<TipJarData>) {
    editBlock(block.id, {
      data: { ...data, provider, payment_url: paymentUrl, button_label: buttonLabel, amount, ...updates },
    });
  }

  const providerInfo = PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0];

  return (
    <div className="space-y-3">
      <div>
        <label className="font-body text-xs font-medium text-brand-text-secondary mb-1 block">Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            const v = e.target.value as TipJarProvider;
            setProvider(v);
            save({ provider: v });
          }}
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <input
        type="url"
        value={paymentUrl}
        onChange={(e) => setPaymentUrl(e.target.value)}
        onBlur={() => save({ payment_url: paymentUrl })}
        placeholder={providerInfo.placeholder}
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={buttonLabel}
          onChange={(e) => setButtonLabel(e.target.value)}
          onBlur={() => save({ button_label: buttonLabel })}
          placeholder="Button label (e.g. Buy me a coffee)"
          className="flex-1 px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
        />
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => save({ amount })}
          placeholder="$5"
          className="w-20 px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
        />
      </div>
    </div>
  );
}
