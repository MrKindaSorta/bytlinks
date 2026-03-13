import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, AlertCircle, Upload, Star, Loader2 } from 'lucide-react';
import type { BlockRendererProps } from './blockRendererRegistry';
import type { FormData, FormField } from '@bytlinks/shared';
import { trackEvent } from '../../../utils/trackEvent';
import { useConditionalLogic } from '../../../hooks/useConditionalLogic';

type FormState = 'idle' | 'loading' | 'success' | 'error' | 'closed' | 'capped';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,}$/;
const URL_RE = /^https?:\/\/.+/;

function validateField(field: FormField, value: unknown): string | null {
  const str = String(value ?? '');
  if (field.required && !str.trim()) return 'This field is required';
  if (!str.trim()) return null;

  if (field.type === 'short-text' && field.input_mask === 'email' && !EMAIL_RE.test(str)) return 'Invalid email';
  if (field.type === 'short-text' && field.input_mask === 'phone' && !PHONE_RE.test(str)) return 'Invalid phone';
  if (field.type === 'short-text' && field.input_mask === 'url' && !URL_RE.test(str)) return 'Invalid URL';
  if (field.type === 'long-text' && field.max_chars && str.length > field.max_chars) return `Max ${field.max_chars} characters`;
  if (field.type === 'number') {
    const num = Number(str);
    if (isNaN(num)) return 'Must be a number';
    if (field.number_min !== undefined && num < field.number_min) return `Min: ${field.number_min}`;
    if (field.number_max !== undefined && num > field.number_max) return `Max: ${field.number_max}`;
  }
  return null;
}

function FieldRenderer({ field, value, onChange, error }: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  error: string | null;
}) {
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors duration-150
    ${error ? 'border-red-400' : 'border-[var(--page-border,rgba(128,128,128,0.2))]'}`;
  const inputStyle = {
    background: 'var(--page-surface-alt, rgba(128,128,128,0.05))',
    color: 'var(--page-text)',
    fontFamily: 'var(--page-font-body)',
  };

  switch (field.type) {
    case 'short-text':
      return (
        <input
          type={field.input_mask === 'email' ? 'email' : field.input_mask === 'url' ? 'url' : field.input_mask === 'phone' ? 'tel' : 'text'}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
          style={inputStyle}
        />
      );
    case 'long-text':
      return (
        <div>
          <textarea
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${inputClass} resize-none`}
            style={inputStyle}
          />
          {field.max_chars && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--page-text)', opacity: 0.5 }}>
              {String(value || '').length} / {field.max_chars}
            </p>
          )}
        </div>
      );
    case 'dropdown':
      return (
        <select value={String(value || '')} onChange={(e) => onChange(e.target.value)} className={inputClass} style={inputStyle}>
          <option value="">{field.placeholder || 'Select...'}</option>
          {(field.options || []).map((opt) => (
            <option key={opt.id} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--page-text)' }}>
              <input type="radio" name={field.id} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--page-text)' }}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.placeholder || field.label}
        </label>
      );
    case 'number':
      return (
        <input
          type="number"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          min={field.number_min}
          max={field.number_max}
          step={field.number_step}
          className={inputClass}
          style={inputStyle}
        />
      );
    case 'date-time':
      return (
        <input
          type={field.date_mode === 'time' ? 'time' : field.date_mode === 'datetime' ? 'datetime-local' : 'date'}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      );
    case 'rating': {
      const max = field.rating_max || (field.rating_mode === 'nps' ? 10 : 5);
      const current = Number(value) || 0;
      return (
        <div>
          {field.rating_low_label && field.rating_high_label && (
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--page-text)', opacity: 0.5 }}>
              <span>{field.rating_low_label}</span>
              <span>{field.rating_high_label}</span>
            </div>
          )}
          <div className="flex gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="transition-transform hover:scale-110"
              >
                {field.rating_mode === 'nps' ? (
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                    style={{
                      background: n <= current ? 'var(--page-accent)' : 'var(--page-surface-alt, rgba(128,128,128,0.1))',
                      color: n <= current ? 'var(--page-bg)' : 'var(--page-text)',
                    }}
                  >
                    {n}
                  </span>
                ) : (
                  <Star className="w-6 h-6" style={{ color: n <= current ? 'var(--page-accent)' : 'var(--page-border, rgba(128,128,128,0.3))' }} fill={n <= current ? 'currentColor' : 'none'} />
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'file-upload':
      return (
        <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--page-border, rgba(128,128,128,0.2))', background: 'var(--page-surface-alt, rgba(128,128,128,0.03))' }}
        >
          <Upload className="w-5 h-5" style={{ color: 'var(--page-text)', opacity: 0.5 }} />
          <span className="text-xs" style={{ color: 'var(--page-text)', opacity: 0.6 }}>
            {value ? (value as File).name : 'Click to upload'}
          </span>
          <input type="file" className="hidden" accept={field.allowed_mime_types?.join(',')} onChange={(e) => onChange(e.target.files?.[0])} />
        </label>
      );
    case 'hidden':
      return null;
    default:
      return <input type="text" value={String(value || '')} onChange={(e) => onChange(e.target.value)} className={inputClass} style={inputStyle} />;
  }
}

export function FormRenderer({ block, pageId }: BlockRendererProps) {
  const data = block.data as FormData;
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const startedRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const [turnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  // Initialize hidden fields from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial: Record<string, unknown> = {};
    for (const field of data.fields) {
      if (field.type === 'hidden' && field.hidden_url_param) {
        initial[field.id] = params.get(field.hidden_url_param) || field.hidden_default_value || '';
      }
    }
    if (Object.keys(initial).length) setValues((v) => ({ ...initial, ...v }));
  }, [data.fields]);

  // Track form view
  useEffect(() => {
    if (!viewTrackedRef.current && pageId) {
      viewTrackedRef.current = true;
      trackEvent(pageId, 'form_view', { blockId: block.id });
    }
  }, [pageId, block.id]);

  // Check closed/capped
  useEffect(() => {
    if (data.close_date && new Date(data.close_date).getTime() < Date.now()) {
      setState('closed');
    }
  }, [data.close_date]);

  // Load Turnstile if needed
  useEffect(() => {
    if (!data.captcha_enabled) return;
    const existing = document.querySelector('script[src*="challenges.cloudflare.com"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [data.captcha_enabled]);

  const hiddenFields = useConditionalLogic(data.fields, data.conditional_rules, values);

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    if (!startedRef.current && pageId) {
      startedRef.current = true;
      trackEvent(pageId, 'form_start', { blockId: block.id });
    }
    setValues((v) => ({ ...v, [fieldId]: value }));
    setErrors((e) => { const next = { ...e }; delete next[fieldId]; return next; });
  }, [pageId, block.id]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'loading') return;

    // Validate
    const newErrors: Record<string, string> = {};
    for (const field of data.fields) {
      if (hiddenFields.has(field.id)) continue;
      if (field.type === 'hidden') continue;
      const err = validateField(field, values[field.id]);
      if (err) newErrors[field.id] = err;
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setState('loading');
    try {
      // Handle file uploads first
      const submissionData: Record<string, unknown> = {};
      for (const field of data.fields) {
        if (hiddenFields.has(field.id)) continue;
        if (field.type === 'file-upload' && values[field.id] instanceof File) {
          const file = values[field.id] as File;
          const formData = new FormData();
          formData.append('file', file);
          formData.append('field_id', field.id);
          const uploadRes = await fetch(`/api/public/form/${block.id}/upload`, { method: 'POST', body: formData });
          const uploadJson = await uploadRes.json() as { success: boolean; data?: { url: string }; error?: string };
          if (uploadJson.success) {
            submissionData[field.id] = uploadJson.data?.url;
          } else {
            throw new Error(uploadJson.error || 'Upload failed');
          }
        } else {
          submissionData[field.id] = values[field.id];
        }
      }

      const body: Record<string, unknown> = { data: submissionData };
      if (turnstileToken) body.turnstile_token = turnstileToken;

      const res = await fetch(`/api/public/form/${block.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: string };

      if (json.success) {
        setState('success');
        if (pageId) trackEvent(pageId, 'form_submit', { blockId: block.id });
        if (data.success_redirect_url) {
          setTimeout(() => { window.location.href = data.success_redirect_url!; }, 1500);
        }
      } else {
        if (json.error?.includes('cap')) setState('capped');
        else if (json.error?.includes('closed')) setState('closed');
        else { setState('error'); setErrorMsg(json.error || 'Submission failed'); }
      }
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed');
    }
  }, [data, values, hiddenFields, state, block.id, pageId, turnstileToken]);

  // Success state
  if (state === 'success') {
    return (
      <div className="scroll-reveal my-6 rounded-xl p-8 text-center" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}>
        <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--page-accent)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}>
          {data.success_message || 'Thank you! Your response has been submitted.'}
        </p>
      </div>
    );
  }

  // Closed/capped states
  if (state === 'closed' || state === 'capped') {
    return (
      <div className="scroll-reveal my-6 rounded-xl p-8 text-center" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}>
        <p className="text-sm" style={{ color: 'var(--page-text)', opacity: 0.7 }}>
          {state === 'closed' ? 'This form is no longer accepting responses.' : 'This form has reached its submission limit.'}
        </p>
      </div>
    );
  }

  return (
    <div className="scroll-reveal my-6 rounded-xl overflow-hidden" style={{ background: 'var(--page-surface-alt, rgba(128,128,128,0.05))' }}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {data.title && (
          <h3 className="text-base font-bold" style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-display)' }}>
            {data.title}
          </h3>
        )}
        {data.description && (
          <p className="text-sm" style={{ color: 'var(--page-text)', opacity: 0.7, fontFamily: 'var(--page-font-body)' }}>
            {data.description}
          </p>
        )}
        {data.fields
          .filter((f) => !hiddenFields.has(f.id) && f.type !== 'hidden')
          .sort((a, b) => a.order - b.order)
          .map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--page-text)', fontFamily: 'var(--page-font-body)' }}>
                {field.label}
                {field.required && <span style={{ color: 'var(--page-accent)' }}> *</span>}
              </label>
              <FieldRenderer field={field} value={values[field.id]} onChange={(v) => handleChange(field.id, v)} error={errors[field.id] || null} />
              {field.helper_text && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--page-text)', opacity: 0.5 }}>{field.helper_text}</p>
              )}
              {errors[field.id] && (
                <p className="text-[11px] mt-0.5 text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors[field.id]}
                </p>
              )}
            </div>
          ))}

        {data.captcha_enabled && (
          <div ref={turnstileRef} className="cf-turnstile" data-sitekey="" data-callback="(token) => {}" />
        )}

        {state === 'error' && errorMsg && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={state === 'loading'}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity duration-200 disabled:opacity-50"
          style={{
            background: 'var(--page-accent)',
            color: 'var(--page-bg)',
            fontFamily: 'var(--page-font-body)',
          }}
        >
          {state === 'loading' ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
          ) : (
            data.submit_label || 'Submit'
          )}
        </button>
      </form>
    </div>
  );
}
