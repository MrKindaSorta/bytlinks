import { useState } from 'react';
import { ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { NewsletterData } from '@bytlinks/shared';

export function NewsletterEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as NewsletterData;

  const [heading, setHeading] = useState(data.heading || 'Stay in the loop');
  const [subtext, setSubtext] = useState(data.subtext || '');
  const [buttonLabel, setButtonLabel] = useState(data.button_label || 'Subscribe');
  const [successMessage, setSuccessMessage] = useState(data.success_message || '');
  const [showSubscriberCount, setShowSubscriberCount] = useState(data.show_subscriber_count === true);

  // Provider section
  const [providerOpen, setProviderOpen] = useState(false);
  const [provider, setProvider] = useState<'none' | 'mailchimp' | 'convertkit'>(data.sync_provider || 'none');
  const [apiKey, setApiKey] = useState('');
  const [audienceId, setAudienceId] = useState(data.mailchimp_audience_id || '');
  const [datacenter, setDatacenter] = useState(data.mailchimp_datacenter || '');
  const [formId, setFormId] = useState(data.convertkit_form_id || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function buildData(overrides: Partial<NewsletterData> = {}): NewsletterData {
    return {
      heading,
      subtext,
      button_label: buttonLabel,
      success_message: successMessage,
      show_subscriber_count: showSubscriberCount,
      sync_provider: provider,
      mailchimp_audience_id: audienceId || undefined,
      mailchimp_datacenter: datacenter || undefined,
      convertkit_form_id: formId || undefined,
      ...overrides,
    };
  }

  function save(overrides: Partial<NewsletterData> = {}) {
    editBlock(block.id, { data: buildData(overrides) });
  }

  async function handleSaveCredentials() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/utils/newsletter/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          block_id: block.id,
          provider,
          api_key: apiKey,
          metadata: provider === 'mailchimp'
            ? { audience_id: audienceId, datacenter }
            : { form_id: formId },
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        setSaveResult({ type: 'success', text: 'Credentials saved' });
        setApiKey('');
      } else {
        setSaveResult({ type: 'error', text: json.error || 'Failed to save' });
      }
    } catch {
      setSaveResult({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/utils/newsletter/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          audience_id: audienceId || undefined,
          datacenter: datacenter || undefined,
          form_id: formId || undefined,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        setTestResult({ type: 'success', text: 'Connection successful' });
      } else {
        setTestResult({ type: 'error', text: json.error || 'Connection failed' });
      }
    } catch {
      setTestResult({ type: 'error', text: 'Network error' });
    } finally {
      setTesting(false);
    }
  }

  function handleProviderChange(val: 'none' | 'mailchimp' | 'convertkit') {
    setProvider(val);
    setTestResult(null);
    setSaveResult(null);
    save({ sync_provider: val });
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

      <label className="flex items-center justify-between font-body text-xs text-brand-text-secondary cursor-pointer">
        <span>Show subscriber count</span>
        <input
          type="checkbox"
          checked={showSubscriberCount}
          onChange={(e) => {
            setShowSubscriberCount(e.target.checked);
            save({ show_subscriber_count: e.target.checked });
          }}
          className="rounded border-brand-border accent-brand-accent"
        />
      </label>

      {/* Connect Email Provider section */}
      <div className="border border-brand-border rounded-lg overflow-hidden">
        <button
          onClick={() => setProviderOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-brand-surface-alt hover:bg-brand-surface transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-brand-text-muted" />
            <span className="font-body text-xs font-medium text-brand-text-secondary">Connect Email Provider</span>
            {provider !== 'none' && (
              <span className="px-1.5 py-0.5 rounded bg-brand-accent text-white font-body text-[10px] font-medium">
                {provider === 'mailchimp' ? 'Mailchimp' : 'ConvertKit'}
              </span>
            )}
          </div>
          {providerOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-brand-text-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-brand-text-muted" />
          )}
        </button>

        {providerOpen && (
          <div className="p-3 space-y-3">
            {/* Provider picker */}
            <div className="flex gap-2">
              {(['none', 'mailchimp', 'convertkit'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`flex-1 py-1.5 rounded-md font-body text-xs font-medium border transition-colors duration-150 ${
                    provider === p
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-brand-bg text-brand-text-secondary border-brand-border hover:border-brand-accent'
                  }`}
                >
                  {p === 'none' ? 'None' : p === 'mailchimp' ? 'Mailchimp' : 'ConvertKit'}
                </button>
              ))}
            </div>

            {provider !== 'none' && (
              <>
                {/* API Key input */}
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'mailchimp' ? 'Mailchimp API key' : 'ConvertKit API key'}
                  autoComplete="new-password"
                  className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                />

                {/* Mailchimp-specific fields */}
                {provider === 'mailchimp' && (
                  <>
                    <input
                      type="text"
                      value={audienceId}
                      onChange={(e) => setAudienceId(e.target.value)}
                      onBlur={() => save({ mailchimp_audience_id: audienceId || undefined })}
                      placeholder="Audience ID"
                      className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                    />
                    <input
                      type="text"
                      value={datacenter}
                      onChange={(e) => setDatacenter(e.target.value)}
                      onBlur={() => save({ mailchimp_datacenter: datacenter || undefined })}
                      placeholder="Datacenter (e.g. us6 — optional, derived from key)"
                      className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                    />
                  </>
                )}

                {/* ConvertKit-specific fields */}
                {provider === 'convertkit' && (
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    onBlur={() => save({ convertkit_form_id: formId || undefined })}
                    placeholder="Form ID"
                    className="w-full px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
                  />
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !apiKey.trim()}
                    className="flex-1 py-1.5 rounded-md font-body text-xs font-medium border border-brand-border bg-brand-bg text-brand-text-secondary hover:border-brand-accent disabled:opacity-50 transition-colors duration-150"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleSaveCredentials}
                    disabled={saving || !apiKey.trim()}
                    className="flex-1 py-1.5 rounded-md font-body text-xs font-medium bg-brand-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
                  >
                    {saving ? 'Saving...' : 'Save Key'}
                  </button>
                </div>

                {testResult && (
                  <p className={`font-body text-[11px] ${testResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {testResult.text}
                  </p>
                )}
                {saveResult && (
                  <p className={`font-body text-[11px] ${saveResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {saveResult.text}
                  </p>
                )}
                <p className="font-body text-[11px] text-brand-text-muted">
                  API keys are encrypted before storage and never exposed to visitors.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
