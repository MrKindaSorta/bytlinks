import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Crown } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import { useAuth } from '../../../hooks/useAuth';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { FormData, FormField, FormFieldType, FormConditionalRule } from '@bytlinks/shared';
import { FORM_LIMITS } from '@bytlinks/shared/constants';
import { UpgradeModal } from '../../shared/UpgradeModal';

const FREE_FIELD_TYPES: FormFieldType[] = ['short-text', 'long-text', 'dropdown', 'radio', 'checkbox'];
const PRO_FIELD_TYPES: FormFieldType[] = ['date-time', 'file-upload', 'rating', 'review', 'roster', 'number', 'hidden'];

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  'short-text': 'Short Text',
  'long-text': 'Long Text',
  'dropdown': 'Dropdown',
  'radio': 'Radio',
  'checkbox': 'Checkbox',
  'date-time': 'Date / Time',
  'file-upload': 'File Upload',
  'rating': 'Rating',
  'review': 'Review',
  'roster': 'Roster',
  'number': 'Number',
  'hidden': 'Hidden',
};

function defaultField(type: FormFieldType, order: number): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    required: false,
    order,
    ...(type === 'dropdown' || type === 'radio' ? { options: [{ id: crypto.randomUUID(), label: '', value: '' }] } : {}),
    ...(type === 'rating' ? { rating_mode: 'stars', rating_max: 5 } : {}),
    ...(type === 'number' ? { number_step: 1 } : {}),
    ...(type === 'roster' ? { roster_sub_fields: [], roster_min_rows: 1, roster_max_rows: 10 } : {}),
  };
}

export function FormEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const limits = FORM_LIMITS[plan as keyof typeof FORM_LIMITS] || FORM_LIMITS.free;

  const data = (block.data || { fields: [], submit_label: 'Submit', one_response_per_visitor: false, captcha_enabled: false, email_alert_enabled: false }) as FormData;

  // --- Local state for all editable values (save on blur, not on every keystroke) ---
  const [fields, setFields] = useState<FormField[]>(data.fields || []);
  const [title, setTitle] = useState(data.title || '');
  const [description, setDescription] = useState(data.description || '');
  const [submitLabel, setSubmitLabel] = useState(data.submit_label || 'Submit');
  const [successMessage, setSuccessMessage] = useState(data.success_message || '');
  const [successRedirectUrl, setSuccessRedirectUrl] = useState(data.success_redirect_url || '');
  const [submissionCap, setSubmissionCap] = useState(data.submission_cap?.toString() || '');
  const [closeDate, setCloseDate] = useState(data.close_date || '');
  const [emailRecipient, setEmailRecipient] = useState(data.email_alert_recipient || '');
  const [webhookUrl, setWebhookUrl] = useState(data.webhook_url || '');
  const [rules, setRules] = useState<FormConditionalRule[]>(data.conditional_rules || []);

  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConditional, setShowConditional] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showFieldTypes, setShowFieldTypes] = useState(false);

  // Persist current local state to the global block store
  function save(overrides: Partial<FormData> = {}) {
    editBlock(block.id, {
      data: {
        ...data,
        fields,
        title,
        description,
        submit_label: submitLabel,
        success_message: successMessage,
        success_redirect_url: successRedirectUrl,
        submission_cap: submissionCap ? parseInt(submissionCap) : undefined,
        close_date: closeDate || undefined,
        email_alert_recipient: emailRecipient || undefined,
        webhook_url: webhookUrl || undefined,
        conditional_rules: rules,
        ...overrides,
      },
    });
  }

  // Save with a new fields array (updates local state + persists)
  function saveFields(newFields: FormField[]) {
    setFields(newFields);
    editBlock(block.id, {
      data: {
        ...data,
        fields: newFields,
        title,
        description,
        submit_label: submitLabel,
        success_message: successMessage,
        success_redirect_url: successRedirectUrl,
        submission_cap: submissionCap ? parseInt(submissionCap) : undefined,
        close_date: closeDate || undefined,
        email_alert_recipient: emailRecipient || undefined,
        webhook_url: webhookUrl || undefined,
        conditional_rules: rules,
      },
    });
  }

  function updateFieldLocal(fieldId: string, updates: Partial<FormField>) {
    setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, ...updates } : f));
  }

  function saveField(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    save({ fields });
  }

  function addField(type: FormFieldType) {
    if (fields.length >= limits.max_fields) return;
    const field = defaultField(type, fields.length);
    const newFields = [...fields, field];
    saveFields(newFields);
    setExpandedField(field.id);
    setShowFieldTypes(false);
  }

  function removeField(fieldId: string) {
    const newFields = fields.filter((f) => f.id !== fieldId).map((f, i) => ({ ...f, order: i }));
    saveFields(newFields);
    if (expandedField === fieldId) setExpandedField(null);
  }

  function moveField(fieldId: string, dir: -1 | 1) {
    const idx = fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const newFields = [...fields];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    saveFields(newFields.map((f, i) => ({ ...f, order: i })));
  }

  function addOption(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const options = [...(field.options || []), { id: crypto.randomUUID(), label: '', value: '' }];
    const newFields = fields.map((f) => f.id === fieldId ? { ...f, options } : f);
    saveFields(newFields);
  }

  function updateOptionLocal(fieldId: string, optionId: string, label: string) {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const options = (f.options || []).map((o) => o.id === optionId ? { ...o, label, value: label } : o);
        return { ...f, options };
      }),
    );
  }

  function removeOption(fieldId: string, optionId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const newFields = fields.map((f) => f.id === fieldId ? { ...f, options: (f.options || []).filter((o) => o.id !== optionId) } : f);
    saveFields(newFields);
  }

  // Conditional logic
  function addRule() {
    const newRules = [...rules, {
      id: crypto.randomUUID(),
      if_field: fields[0]?.id || '',
      operator: 'is' as const,
      value: '',
      then_action: 'show' as const,
      target_field: fields[1]?.id || '',
    }];
    setRules(newRules);
    save({ conditional_rules: newRules });
  }

  function removeRule(ruleId: string) {
    const newRules = rules.filter((r) => r.id !== ruleId);
    setRules(newRules);
    save({ conditional_rules: newRules });
  }

  function updateRuleLocal(ruleId: string, updates: Partial<FormConditionalRule>) {
    setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, ...updates } : r));
  }

  const atFieldLimit = fields.length >= limits.max_fields;

  return (
    <div className="space-y-4">
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="form_editor" />}

      {/* Field list */}
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="rounded-lg border border-brand-border bg-brand-surface">
            {/* Field header */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
            >
              <GripVertical className="w-3.5 h-3.5 text-brand-text-muted shrink-0" />
              <span className="font-body text-xs font-medium text-brand-text flex-1 min-w-0 truncate">
                {field.label || `${FIELD_TYPE_LABELS[field.type]} (untitled)`}
              </span>
              <span className="font-body text-[10px] text-brand-text-muted uppercase">{FIELD_TYPE_LABELS[field.type]}</span>
              <div className="flex items-center gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); moveField(field.id, -1); }} disabled={idx === 0} className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveField(field.id, 1); }} disabled={idx === fields.length - 1} className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-0.5 text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            {/* Expanded field config */}
            {expandedField === field.id && (
              <div className="border-t border-brand-border px-3 py-3 space-y-2">
                <input type="text" value={field.label} onChange={(e) => updateFieldLocal(field.id, { label: e.target.value })} onBlur={() => saveField(field.id)} placeholder="Field label" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <input type="text" value={field.placeholder || ''} onChange={(e) => updateFieldLocal(field.id, { placeholder: e.target.value })} onBlur={() => saveField(field.id)} placeholder="Placeholder text" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <input type="text" value={field.helper_text || ''} onChange={(e) => updateFieldLocal(field.id, { helper_text: e.target.value })} onBlur={() => saveField(field.id)} placeholder="Helper text" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <label className="flex items-center gap-2 font-body text-xs text-brand-text">
                  <input type="checkbox" checked={field.required} onChange={(e) => { updateFieldLocal(field.id, { required: e.target.checked }); const newFields = fields.map((f) => f.id === field.id ? { ...f, required: e.target.checked } : f); saveFields(newFields); }} className="rounded" />
                  Required
                </label>
                {/* Input mask for short-text */}
                {field.type === 'short-text' && (
                  <select value={field.input_mask || 'none'} onChange={(e) => { const v = e.target.value as FormField['input_mask']; const newFields = fields.map((f) => f.id === field.id ? { ...f, input_mask: v } : f); saveFields(newFields); }} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text focus:outline-none focus:border-brand-accent">
                    <option value="none">No mask</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="url">URL</option>
                  </select>
                )}
                {/* Max chars for long-text */}
                {field.type === 'long-text' && (
                  <input type="number" value={field.max_chars || ''} onChange={(e) => updateFieldLocal(field.id, { max_chars: parseInt(e.target.value) || undefined })} onBlur={() => saveField(field.id)} placeholder="Max characters" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                )}
                {/* Options for dropdown/radio */}
                {(field.type === 'dropdown' || field.type === 'radio') && (
                  <div className="space-y-1">
                    <p className="font-body text-[11px] text-brand-text-muted font-medium">Options</p>
                    {(field.options || []).map((opt) => (
                      <div key={opt.id} className="flex items-center gap-1.5">
                        <input type="text" value={opt.label} onChange={(e) => updateOptionLocal(field.id, opt.id, e.target.value)} onBlur={() => saveField(field.id)} placeholder="Option label" className="flex-1 px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-base md:text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                        <button onClick={() => removeOption(field.id, opt.id)} className="p-0.5 text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => addOption(field.id)} className="font-body text-xs text-brand-accent hover:opacity-80">+ Add option</button>
                  </div>
                )}
                {/* Rating config */}
                {field.type === 'rating' && (
                  <div className="space-y-2">
                    <select value={field.rating_mode || 'stars'} onChange={(e) => { const v = e.target.value as 'stars' | 'nps'; const newFields = fields.map((f) => f.id === field.id ? { ...f, rating_mode: v } : f); saveFields(newFields); }} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text focus:outline-none focus:border-brand-accent">
                      <option value="stars">Stars (1-5)</option>
                      <option value="nps">NPS (1-10)</option>
                    </select>
                    <input type="text" value={field.rating_low_label || ''} onChange={(e) => updateFieldLocal(field.id, { rating_low_label: e.target.value })} onBlur={() => saveField(field.id)} placeholder="Low label (e.g. Poor)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="text" value={field.rating_high_label || ''} onChange={(e) => updateFieldLocal(field.id, { rating_high_label: e.target.value })} onBlur={() => saveField(field.id)} placeholder="High label (e.g. Excellent)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                  </div>
                )}
                {/* Number config */}
                {field.type === 'number' && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={field.number_min ?? ''} onChange={(e) => updateFieldLocal(field.id, { number_min: e.target.value ? Number(e.target.value) : undefined })} onBlur={() => saveField(field.id)} placeholder="Min" className="px-2 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="number" value={field.number_max ?? ''} onChange={(e) => updateFieldLocal(field.id, { number_max: e.target.value ? Number(e.target.value) : undefined })} onBlur={() => saveField(field.id)} placeholder="Max" className="px-2 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="number" value={field.number_step ?? ''} onChange={(e) => updateFieldLocal(field.id, { number_step: e.target.value ? Number(e.target.value) : undefined })} onBlur={() => saveField(field.id)} placeholder="Step" className="px-2 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                  </div>
                )}
                {/* Hidden field config */}
                {field.type === 'hidden' && (
                  <div className="space-y-2">
                    <input type="text" value={field.hidden_url_param || ''} onChange={(e) => updateFieldLocal(field.id, { hidden_url_param: e.target.value })} onBlur={() => saveField(field.id)} placeholder="URL parameter name" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="text" value={field.hidden_default_value || ''} onChange={(e) => updateFieldLocal(field.id, { hidden_default_value: e.target.value })} onBlur={() => saveField(field.id)} placeholder="Default value" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add field button */}
      <div className="relative">
        <button
          onClick={() => setShowFieldTypes(!showFieldTypes)}
          disabled={atFieldLimit}
          className="flex items-center gap-1.5 font-body text-xs font-medium text-brand-accent hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add field {atFieldLimit && `(limit: ${limits.max_fields})`}
        </button>
        {showFieldTypes && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFieldTypes(false)} />
            <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
              {FREE_FIELD_TYPES.map((type) => (
                <button key={type} onClick={() => addField(type)} className="w-full text-left px-3 py-1.5 font-body text-xs text-brand-text hover:bg-brand-surface-alt">
                  {FIELD_TYPE_LABELS[type]}
                </button>
              ))}
              <div className="border-t border-brand-border my-1" />
              {PRO_FIELD_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => plan === 'pro' ? addField(type) : setShowUpgrade(true)}
                  className="w-full text-left px-3 py-1.5 font-body text-xs text-brand-text hover:bg-brand-surface-alt flex items-center justify-between"
                >
                  {FIELD_TYPE_LABELS[type]}
                  {plan !== 'pro' && <Crown className="w-3 h-3 text-amber-500" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Form Settings */}
      <div className="border border-brand-border rounded-lg">
        <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between px-3 py-2 font-body text-xs font-semibold text-brand-text">
          Form Settings
          {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showSettings && (
          <div className="border-t border-brand-border px-3 py-3 space-y-2">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => save()} placeholder="Form title" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => save()} placeholder="Form description" rows={2} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none" />
            <input type="text" value={submitLabel} onChange={(e) => setSubmitLabel(e.target.value)} onBlur={() => save()} placeholder="Submit button label" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <input type="text" value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} onBlur={() => save()} placeholder="Success message" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <input type="url" value={successRedirectUrl} onChange={(e) => setSuccessRedirectUrl(e.target.value)} onBlur={() => save()} placeholder="Redirect URL after submit (optional)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={submissionCap} onChange={(e) => setSubmissionCap(e.target.value)} onBlur={() => save()} placeholder="Submission cap" className="px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
              <input type="datetime-local" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} onBlur={() => save()} className="px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text focus:outline-none focus:border-brand-accent" />
            </div>
            <label className="flex items-center gap-2 font-body text-xs text-brand-text">
              <input type="checkbox" checked={data.one_response_per_visitor} onChange={(e) => save({ one_response_per_visitor: e.target.checked })} className="rounded" />
              One response per visitor
            </label>
            <label className="flex items-center gap-2 font-body text-xs text-brand-text">
              <input type="checkbox" checked={data.captcha_enabled} onChange={(e) => save({ captcha_enabled: e.target.checked })} className="rounded" />
              CAPTCHA (Cloudflare Turnstile)
            </label>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="border border-brand-border rounded-lg">
        <button onClick={() => setShowNotifications(!showNotifications)} className="w-full flex items-center justify-between px-3 py-2 font-body text-xs font-semibold text-brand-text">
          Notifications
          {showNotifications ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showNotifications && (
          <div className="border-t border-brand-border px-3 py-3 space-y-2">
            <label className="flex items-center gap-2 font-body text-xs text-brand-text">
              <input type="checkbox" checked={data.email_alert_enabled} onChange={(e) => save({ email_alert_enabled: e.target.checked })} className="rounded" />
              Email alerts
            </label>
            {data.email_alert_enabled && (
              <>
                <input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} onBlur={() => save()} placeholder="Recipient email (default: your account email)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <select value={data.email_alert_mode || 'immediate'} onChange={(e) => save({ email_alert_mode: e.target.value as 'immediate' | 'daily_digest' })} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text focus:outline-none focus:border-brand-accent">
                  <option value="immediate">Immediate</option>
                  <option value="daily_digest">Daily digest</option>
                </select>
              </>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 font-body text-xs text-brand-text flex-1">
                <input type="checkbox" checked={!!data.webhook_enabled} onChange={(e) => plan === 'pro' ? save({ webhook_enabled: e.target.checked }) : setShowUpgrade(true)} className="rounded" />
                Webhook
                {plan !== 'pro' && <Crown className="w-3 h-3 text-amber-500" />}
              </label>
            </div>
            {data.webhook_enabled && plan === 'pro' && (
              <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} onBlur={() => save()} placeholder="https://your-webhook-url.com" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-base md:text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            )}
          </div>
        )}
      </div>

      {/* Conditional Logic (Pro) */}
      <div className="border border-brand-border rounded-lg">
        <button onClick={() => plan === 'pro' ? setShowConditional(!showConditional) : setShowUpgrade(true)} className="w-full flex items-center justify-between px-3 py-2 font-body text-xs font-semibold text-brand-text">
          <span className="flex items-center gap-1.5">
            Conditional Logic
            {plan !== 'pro' && <Crown className="w-3 h-3 text-amber-500" />}
          </span>
          {showConditional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showConditional && plan === 'pro' && (
          <div className="border-t border-brand-border px-3 py-3 space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-body text-[10px] text-brand-text-muted">If</span>
                <select value={rule.if_field} onChange={(e) => { updateRuleLocal(rule.id, { if_field: e.target.value }); save({ conditional_rules: rules.map((r) => r.id === rule.id ? { ...r, if_field: e.target.value } : r) }); }} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-base md:text-[11px] text-brand-text focus:outline-none">
                  {fields.map((f) => <option key={f.id} value={f.id}>{f.label || f.type}</option>)}
                </select>
                <select value={rule.operator} onChange={(e) => { const v = e.target.value as FormConditionalRule['operator']; updateRuleLocal(rule.id, { operator: v }); save({ conditional_rules: rules.map((r) => r.id === rule.id ? { ...r, operator: v } : r) }); }} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-base md:text-[11px] text-brand-text focus:outline-none">
                  <option value="is">is</option>
                  <option value="is_not">is not</option>
                  <option value="contains">contains</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </select>
                {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                  <input type="text" value={rule.value} onChange={(e) => updateRuleLocal(rule.id, { value: e.target.value })} onBlur={() => save({ conditional_rules: rules })} placeholder="value" className="w-20 px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-base md:text-[11px] text-brand-text focus:outline-none" />
                )}
                <span className="font-body text-[10px] text-brand-text-muted">then</span>
                <select value={rule.then_action} onChange={(e) => { const v = e.target.value as 'show' | 'hide'; updateRuleLocal(rule.id, { then_action: v }); save({ conditional_rules: rules.map((r) => r.id === rule.id ? { ...r, then_action: v } : r) }); }} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-base md:text-[11px] text-brand-text focus:outline-none">
                  <option value="show">show</option>
                  <option value="hide">hide</option>
                </select>
                <select value={rule.target_field} onChange={(e) => { updateRuleLocal(rule.id, { target_field: e.target.value }); save({ conditional_rules: rules.map((r) => r.id === rule.id ? { ...r, target_field: e.target.value } : r) }); }} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-base md:text-[11px] text-brand-text focus:outline-none">
                  {fields.map((f) => <option key={f.id} value={f.id}>{f.label || f.type}</option>)}
                </select>
                <button onClick={() => removeRule(rule.id)} className="p-0.5 text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button onClick={addRule} className="font-body text-xs text-brand-accent hover:opacity-80">+ Add rule</button>
          </div>
        )}
      </div>
    </div>
  );
}
