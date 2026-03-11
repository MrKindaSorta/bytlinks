import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

interface Props {
  inverted?: boolean;
}

export function UsernameClaimInput({ inverted = false }: Props) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const checkAvailability = useCallback(async (username: string) => {
    if (username.length < 2) { setStatus('idle'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('checking');
    try {
      const res = await fetch(`/api/public/${encodeURIComponent(username)}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setStatus(res.status === 404 ? 'available' : 'taken');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStatus('available');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.length >= 2) {
      debounceRef.current = setTimeout(() => checkAvailability(raw), 400);
    } else {
      setStatus('idle');
    }
  };

  const handleClaim = () => {
    if (!value || status === 'taken') return;
    navigate(`/signup?username=${encodeURIComponent(value)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClaim();
  };

  const borderColor = status === 'available'
    ? (inverted ? 'border-white/60' : 'border-brand-accent/60')
    : status === 'taken'
      ? 'border-brand-danger/50'
      : (inverted ? 'border-white/30' : 'border-brand-border');

  return (
    <div className="w-full max-w-md">
      <div
        className={`flex items-stretch rounded-xl border-2 overflow-hidden transition-colors duration-150
          ${borderColor}
          ${inverted ? 'bg-white' : 'bg-brand-surface'}
          ${inverted ? 'focus-within:border-white/80' : 'focus-within:border-brand-accent'}`}
      >
        <span
          className={`flex items-center pl-4 font-body text-sm select-none shrink-0 whitespace-nowrap
            ${inverted ? 'text-brand-text-muted' : 'text-brand-text-muted'}`}
        >
          bytlinks.com/
        </span>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="yourname"
          maxLength={30}
          aria-label="Claim your BytLinks username"
          className={`flex-1 bg-transparent font-body text-sm py-3.5 pr-2 outline-none min-w-0
            ${inverted ? 'text-brand-text placeholder:text-brand-text-muted' : 'text-brand-text placeholder:text-brand-text-muted'}`}
        />
        <button
          onClick={handleClaim}
          disabled={!value || status === 'taken' || status === 'checking'}
          aria-label="Claim username"
          className={`px-4 py-2 m-1.5 rounded-lg font-body text-sm font-semibold
                     transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                     shrink-0 flex items-center gap-1.5 group
                     ${inverted
                       ? 'bg-brand-accent text-white hover:bg-brand-accent-hover'
                       : 'bg-brand-accent text-white hover:bg-brand-accent-hover'}`}
        >
          Claim
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0" />
        </button>
      </div>

      <div className="mt-2 h-4">
        {status === 'available' && (
          <p className={`font-body text-xs flex items-center gap-1 ${inverted ? 'text-white' : 'text-brand-accent'}`}>
            <Check className="w-3 h-3" /> bytlinks.com/{value} is available
          </p>
        )}
        {status === 'taken' && (
          <p className="font-body text-xs text-brand-danger">
            That username is taken — try another
          </p>
        )}
        {status === 'checking' && (
          <p className={`font-body text-xs ${inverted ? 'text-white/60' : 'text-brand-text-muted'}`}>
            Checking availability…
          </p>
        )}
      </div>
    </div>
  );
}
