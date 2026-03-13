import { useState, useCallback } from 'react';
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
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConditional, setShowConditional] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showFieldTypes, setShowFieldTypes] = useState(false);

  const save = useCallback((updates: Partial<FormData>) => {
    editBlock(block.id, { data: { ...data, ...updates } });
  }, [data, editBlock, block.id]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    const fields = data.fields.map((f) => f.id === fieldId ? { ...f, ...updates } : f);
    save({ fields });
  }, [data.fields, save]);

  const addField = useCallback((type: FormFieldType) => {
    if (data.fields.length >= limits.max_fields) return;
    const field = defaultField(type, data.fields.length);
    save({ fields: [...data.fields, field] });
    setExpandedField(field.id);
    setShowFieldTypes(false);
  }, [data.fields, limits.max_fields, save]);

  const removeField = useCallback((fieldId: string) => {
    save({ fields: data.fields.filter((f) => f.id !== fieldId).map((f, i) => ({ ...f, order: i })) });
    if (expandedField === fieldId) setExpandedField(null);
  }, [data.fields, expandedField, save]);

  const moveField = useCallback((fieldId: string, dir: -1 | 1) => {
    const idx = data.fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= data.fields.length) return;
    const fields = [...data.fields];
    [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
    save({ fields: fields.map((f, i) => ({ ...f, order: i })) });
  }, [data.fields, save]);

  const addOption = useCallback((fieldId: string) => {
    const field = data.fields.find((f) => f.id === fieldId);
    if (!field) return;
    const options = [...(field.options || []), { id: crypto.randomUUID(), label: '', value: '' }];
    updateField(fieldId, { options });
  }, [data.fields, updateField]);

  const updateOption = useCallback((fieldId: string, optionId: string, label: string) => {
    const field = data.fields.find((f) => f.id === fieldId);
    if (!field) return;
    const options = (field.options || []).map((o) => o.id === optionId ? { ...o, label, value: label } : o);
    updateField(fieldId, { options });
  }, [data.fields, updateField]);

  const removeOption = useCallback((fieldId: string, optionId: string) => {
    const field = data.fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: (field.options || []).filter((o) => o.id !== optionId) });
  }, [data.fields, updateField]);

  // Conditional logic
  const addRule = useCallback(() => {
    const rules = [...(data.conditional_rules || []), {
      id: crypto.randomUUID(),
      if_field: data.fields[0]?.id || '',
      operator: 'is' as const,
      value: '',
      then_action: 'show' as const,
      target_field: data.fields[1]?.id || '',
    }];
    save({ conditional_rules: rules });
  }, [data, save]);

  const removeRule = useCallback((ruleId: string) => {
    save({ conditional_rules: (data.conditional_rules || []).filter((r) => r.id !== ruleId) });
  }, [data, save]);

  const updateRule = useCallback((ruleId: string, updates: Partial<FormConditionalRule>) => {
    const rules = (data.conditional_rules || []).map((r) => r.id === ruleId ? { ...r, ...updates } : r);
    save({ conditional_rules: rules });
  }, [data, save]);

  const atFieldLimit = data.fields.length >= limits.max_fields;

  return (
    <div className="space-y-4">
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="form_editor" />}

      {/* Field list */}
      <div className="space-y-2">
        {data.fields.map((field, idx) => (
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
                <button onClick={(e) => { e.stopPropagation(); moveField(field.id, 1); }} disabled={idx === data.fields.length - 1} className="p-0.5 text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-0.5 text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            {/* Expanded field config */}
            {expandedField === field.id && (
              <div className="border-t border-brand-border px-3 py-3 space-y-2">
                <input type="text" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="Field label" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <input type="text" value={field.placeholder || ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="Placeholder text" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <input type="text" value={field.helper_text || ''} onChange={(e) => updateField(field.id, { helper_text: e.target.value })} placeholder="Helper text" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <label className="flex items-center gap-2 font-body text-xs text-brand-text">
                  <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="rounded" />
                  Required
                </label>
                {/* Input mask for short-text */}
                {field.type === 'short-text' && (
                  <select value={field.input_mask || 'none'} onChange={(e) => updateField(field.id, { input_mask: e.target.value as FormField['input_mask'] })} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent">
                    <option value="none">No mask</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="url">URL</option>
                  </select>
                )}
                {/* Max chars for long-text */}
                {field.type === 'long-text' && (
                  <input type="number" value={field.max_chars || ''} onChange={(e) => updateField(field.id, { max_chars: parseInt(e.target.value) || undefined })} placeholder="Max characters" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                )}
                {/* Options for dropdown/radio */}
                {(field.type === 'dropdown' || field.type === 'radio') && (
                  <div className="space-y-1">
                    <p className="font-body text-[11px] text-brand-text-muted font-medium">Options</p>
                    {(field.options || []).map((opt) => (
                      <div key={opt.id} className="flex items-center gap-1.5">
                        <input type="text" value={opt.label} onChange={(e) => updateOption(field.id, opt.id, e.target.value)} placeholder="Option label" className="flex-1 px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                        <button onClick={() => removeOption(field.id, opt.id)} className="p-0.5 text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => addOption(field.id)} className="font-body text-xs text-brand-accent hover:opacity-80">+ Add option</button>
                  </div>
                )}
                {/* Rating config */}
                {field.type === 'rating' && (
                  <div className="space-y-2">
                    <select value={field.rating_mode || 'stars'} onChange={(e) => updateField(field.id, { rating_mode: e.target.value as 'stars' | 'nps' })} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent">
                      <option value="stars">Stars (1-5)</option>
                      <option value="nps">NPS (1-10)</option>
                    </select>
                    <input type="text" value={field.rating_low_label || ''} onChange={(e) => updateField(field.id, { rating_low_label: e.target.value })} placeholder="Low label (e.g. Poor)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="text" value={field.rating_high_label || ''} onChange={(e) => updateField(field.id, { rating_high_label: e.target.value })} placeholder="High label (e.g. Excellent)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                  </div>
                )}
                {/* Number config */}
                {field.type === 'number' && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={field.number_min ?? ''} onChange={(e) => updateField(field.id, { number_min: e.target.value ? Number(e.target.value) : undefined })} placeholder="Min" className="px-2 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="number" value={field.number_max ?? ''} onChange={(e) => updateField(field.id, { number_max: e.target.value ? Number(e.target.value) : undefined })} placeholder="Max" className="px-2 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="number" value={field.number_step ?? ''} onChange={(e) => updateField(field.id, { number_step: e.target.value ? Number(e.target.value) : undefined })} placeholder="Step" className="px-2 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                  </div>
                )}
                {/* Hidden field config */}
                {field.type === 'hidden' && (
                  <div className="space-y-2">
                    <input type="text" value={field.hidden_url_param || ''} onChange={(e) => updateField(field.id, { hidden_url_param: e.target.value })} placeholder="URL parameter name" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                    <input type="text" value={field.hidden_default_value || ''} onChange={(e) => updateField(field.id, { hidden_default_value: e.target.value })} placeholder="Default value" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
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
            <input type="text" value={data.title || ''} onChange={(e) => save({ title: e.target.value })} placeholder="Form title" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <textarea value={data.description || ''} onChange={(e) => save({ description: e.target.value })} placeholder="Form description" rows={2} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none" />
            <input type="text" value={data.submit_label || 'Submit'} onChange={(e) => save({ submit_label: e.target.value })} placeholder="Submit button label" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <input type="text" value={data.success_message || ''} onChange={(e) => save({ success_message: e.target.value })} placeholder="Success message" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <input type="url" value={data.success_redirect_url || ''} onChange={(e) => save({ success_redirect_url: e.target.value })} placeholder="Redirect URL after submit (optional)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={data.submission_cap || ''} onChange={(e) => save({ submission_cap: parseInt(e.target.value) || undefined })} placeholder="Submission cap" className="px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
              <input type="datetime-local" value={data.close_date || ''} onChange={(e) => save({ close_date: e.target.value })} className="px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent" />
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
                <input type="email" value={data.email_alert_recipient || ''} onChange={(e) => save({ email_alert_recipient: e.target.value })} placeholder="Recipient email (default: your account email)" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
                <select value={data.email_alert_mode || 'immediate'} onChange={(e) => save({ email_alert_mode: e.target.value as 'immediate' | 'daily_digest' })} className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text focus:outline-none focus:border-brand-accent">
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
              <input type="url" value={data.webhook_url || ''} onChange={(e) => save({ webhook_url: e.target.value })} placeholder="https://your-webhook-url.com" className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent" />
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
            {(data.conditional_rules || []).map((rule) => (
              <div key={rule.id} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-body text-[10px] text-brand-text-muted">If</span>
                <select value={rule.if_field} onChange={(e) => updateRule(rule.id, { if_field: e.target.value })} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text focus:outline-none">
                  {data.fields.map((f) => <option key={f.id} value={f.id}>{f.label || f.type}</option>)}
                </select>
                <select value={rule.operator} onChange={(e) => updateRule(rule.id, { operator: e.target.value as FormConditionalRule['operator'] })} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text focus:outline-none">
                  <option value="is">is</option>
                  <option value="is_not">is not</option>
                  <option value="contains">contains</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </select>
                {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                  <input type="text" value={rule.value} onChange={(e) => updateRule(rule.id, { value: e.target.value })} placeholder="value" className="w-20 px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text focus:outline-none" />
                )}
                <span className="font-body text-[10px] text-brand-text-muted">then</span>
                <select value={rule.then_action} onChange={(e) => updateRule(rule.id, { then_action: e.target.value as 'show' | 'hide' })} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text focus:outline-none">
                  <option value="show">show</option>
                  <option value="hide">hide</option>
                </select>
                <select value={rule.target_field} onChange={(e) => updateRule(rule.id, { target_field: e.target.value })} className="px-2 py-1 rounded border border-brand-border bg-brand-bg font-body text-[11px] text-brand-text focus:outline-none">
                  {data.fields.map((f) => <option key={f.id} value={f.id}>{f.label || f.type}</option>)}
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
