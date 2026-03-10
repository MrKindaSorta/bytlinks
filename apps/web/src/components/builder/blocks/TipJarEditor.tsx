import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { TipJarData, PaymentOption, TipJarProvider } from '@bytlinks/shared';

const PROVIDERS: { value: TipJarProvider; label: string; placeholder: string }[] = [
  { value: 'stripe', label: 'Stripe', placeholder: 'https://buy.stripe.com/...' },
  { value: 'kofi', label: 'Ko-fi', placeholder: 'https://ko-fi.com/yourname' },
  { value: 'buymeacoffee', label: 'Buy Me a Coffee', placeholder: 'https://buymeacoffee.com/yourname' },
  { value: 'paypal', label: 'PayPal', placeholder: 'https://paypal.me/yourname' },
  { value: 'cashapp', label: 'Cash App', placeholder: 'https://cash.app/$yourname' },
  { value: 'venmo', label: 'Venmo', placeholder: 'https://venmo.com/yourname' },
];

const MAX_OPTIONS = 6;

/** Normalise legacy single-provider data to multi-option format */
function normaliseOptions(data: TipJarData): PaymentOption[] {
  if (data.options && data.options.length > 0) return data.options;
  if (data.payment_url) {
    return [{
      id: crypto.randomUUID(),
      provider: (data.provider as TipJarProvider) || 'stripe',
      url: data.payment_url,
      label: data.button_label,
      suggested_amount: data.amount,
    }];
  }
  return [];
}

export function TipJarEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as TipJarData;
  const [options, setOptions] = useState<PaymentOption[]>(normaliseOptions(data));
  const [message, setMessage] = useState(data.message || '');
  const [goalEnabled, setGoalEnabled] = useState(data.goal_enabled || false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalLabel, setGoalLabel] = useState(data.goal_label || '');
  const [goalTarget, setGoalTarget] = useState(data.goal_target || '');
  const [goalCurrent, setGoalCurrent] = useState(data.goal_current || '');
  const [goalShowBar, setGoalShowBar] = useState(data.goal_show_bar !== false);

  function saveAll(overrides?: Partial<TipJarData>) {
    editBlock(block.id, {
      data: {
        options,
        message: message || undefined,
        goal_enabled: goalEnabled,
        goal_label: goalLabel || undefined,
        goal_target: goalTarget || undefined,
        goal_current: goalCurrent || undefined,
        goal_show_bar: goalShowBar,
        // Keep old compat fields from existing options[0] if present
        ...(options[0] ? { provider: options[0].provider, payment_url: options[0].url } : {}),
        ...overrides,
      },
    });
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    const newOptions = [
      ...options,
      { id: crypto.randomUUID(), provider: 'stripe' as TipJarProvider, url: '' },
    ];
    setOptions(newOptions);
    editBlock(block.id, { data: { ...data, options: newOptions } });
  }

  function removeOption(index: number) {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    editBlock(block.id, { data: { ...data, options: newOptions } });
  }

  function updateOption(index: number, updates: Partial<PaymentOption>) {
    const newOptions = options.map((opt, i) => (i === index ? { ...opt, ...updates } : opt));
    setOptions(newOptions);
    editBlock(block.id, { data: { ...data, options: newOptions } });
  }

  const providerPlaceholder = (provider: TipJarProvider) =>
    PROVIDERS.find((p) => p.value === provider)?.placeholder || 'https://...';

  return (
    <div className="space-y-3">
      {/* Message */}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onBlur={() => saveAll({ message: message || undefined })}
        placeholder="Message (e.g. 'Support my work')"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />

      {/* Payment options */}
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={opt.id} className="rounded-lg border border-brand-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-surface-alt">
              <GripVertical className="w-3.5 h-3.5 text-brand-text-muted shrink-0" />
              <select
                value={opt.provider}
                onChange={(e) => updateOption(i, { provider: e.target.value as TipJarProvider })}
                className="flex-1 bg-transparent font-body text-xs text-brand-text focus:outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeOption(i)}
                className="text-brand-text-muted hover:text-red-500 transition-colors duration-150 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-3 py-2 space-y-2 border-t border-brand-border">
              <input
                type="url"
                value={opt.url}
                onChange={(e) => updateOption(i, { url: e.target.value })}
                placeholder={providerPlaceholder(opt.provider)}
                className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={opt.label || ''}
                  onChange={(e) => updateOption(i, { label: e.target.value || undefined })}
                  placeholder="Custom label (optional)"
                  className="flex-1 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
                <input
                  type="text"
                  value={opt.suggested_amount || ''}
                  onChange={(e) => updateOption(i, { suggested_amount: e.target.value || undefined })}
                  placeholder="$5"
                  className="w-16 px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS && (
        <button
          onClick={addOption}
          className="flex items-center gap-1 font-body text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          Add payment option {options.length > 0 ? `(${options.length}/${MAX_OPTIONS})` : ''}
        </button>
      )}

      {/* Goal section */}
      <div className="rounded-lg border border-brand-border overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (!goalEnabled) {
              setGoalEnabled(true);
              setGoalOpen(true);
              saveAll({ goal_enabled: true });
            } else {
              setGoalOpen((o) => !o);
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-brand-surface-alt hover:bg-brand-surface-alt/80 transition-colors duration-150"
        >
          <span className="font-body text-xs font-medium text-brand-text">Goal / Progress Bar</span>
          <div className="flex items-center gap-2">
            <div
              role="switch"
              aria-checked={goalEnabled}
              onClick={(e) => {
                e.stopPropagation();
                const next = !goalEnabled;
                setGoalEnabled(next);
                if (next) setGoalOpen(true);
                saveAll({ goal_enabled: next });
              }}
              className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                goalEnabled ? 'bg-brand-accent' : 'bg-brand-border'
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                           transition-transform duration-200 ${goalEnabled ? 'translate-x-[14px]' : ''}`}
              />
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-brand-text-muted"
              style={{
                transform: goalOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            />
          </div>
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: goalOpen ? '400px' : '0px' }}
        >
          <div className="px-3 py-3 border-t border-brand-border space-y-2">
            <input
              type="text"
              value={goalLabel}
              onChange={(e) => setGoalLabel(e.target.value)}
              onBlur={() => saveAll()}
              placeholder="Goal label (e.g. 'Studio fund')"
              className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="font-body text-[11px] text-brand-text-muted mb-1 block">Current</label>
                <input
                  type="text"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                  onBlur={() => saveAll()}
                  placeholder="$500"
                  className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="flex-1">
                <label className="font-body text-[11px] text-brand-text-muted mb-1 block">Target</label>
                <input
                  type="text"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  onBlur={() => saveAll()}
                  placeholder="$2000"
                  className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>
            {/* Show bar toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !goalShowBar;
                setGoalShowBar(next);
                saveAll({ goal_show_bar: next });
              }}
              className="flex items-center justify-between w-full"
            >
              <span className="font-body text-xs text-brand-text-muted">Show progress bar</span>
              <div
                role="switch"
                aria-checked={goalShowBar}
                className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                  goalShowBar ? 'bg-brand-accent' : 'bg-brand-border'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                             transition-transform duration-200 ${goalShowBar ? 'translate-x-[14px]' : ''}`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <p className="font-body text-xs text-brand-text-muted">
        Add up to {MAX_OPTIONS} payment options. Each can have a custom label and suggested amount.
      </p>
    </div>
  );
}
