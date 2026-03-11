import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera, CameraOff, ScanLine, UserPlus, SendHorizontal,
  RefreshCw, Keyboard, ArrowLeft, CheckCircle, AlertCircle,
  Mail, Phone, Building2, MapPin, Briefcase,
} from 'lucide-react';

interface ScannedCard {
  username: string;
  page: {
    display_name: string | null;
    bio: string | null;
    job_title: string | null;
    avatar_r2_key: string | null;
    company_name: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
  };
}

interface ScanSectionProps {
  onCardAdded: (username: string) => void;
}

/** Detect iOS devices (all iOS browsers use WebKit which restricts camera) */
function isIOSNonSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  // Safari on iOS includes "Safari" but NOT "CriOS" (Chrome) or "FxiOS" (Firefox)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return !isSafari;
}

/** Check if camera API is available */
function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

export function ScanSection({ onCardAdded }: ScanSectionProps) {
  const [mode, setMode] = useState<'idle' | 'scanning' | 'result' | 'manual'>('idle');
  const [scannedCard, setScannedCard] = useState<ScannedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualUsername, setManualUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [addedToRolodex, setAddedToRolodex] = useState(false);
  const [sentCard, setSentCard] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Ref to track if the scan result has already been handled (prevents double-fire)
  const scanHandledRef = useRef(false);

  // Check camera support on mount
  useEffect(() => {
    if (!isCameraSupported()) {
      setCameraSupported(false);
      if (isIOSNonSafari()) {
        setCameraError('Camera access is only available in Safari on iOS. Please open this page in Safari, or use the username lookup below.');
      } else {
        setCameraError('Your browser does not support camera access.');
      }
    }
  }, []);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // Only stop if scanning (state 2) or paused (state 3)
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch { /* already stopped */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanning(); };
  }, [stopScanning]);

  // ── Core: start the scanner AFTER React has rendered the viewport div ──
  useEffect(() => {
    if (mode !== 'scanning') return;

    let cancelled = false;
    scanHandledRef.current = false;

    // Small delay to ensure the DOM element is fully painted
    const timer = setTimeout(async () => {
      if (cancelled) return;

      const el = document.getElementById('qr-scanner-viewport');
      if (!el) {
        setCameraError('Scanner element not ready. Please try again.');
        setMode('idle');
        return;
      }

      try {
        const scanner = new Html5Qrcode('qr-scanner-viewport');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            // Do NOT set aspectRatio — let the camera choose its native ratio
          },
          (decodedText) => {
            if (cancelled || scanHandledRef.current) return;

            const match = decodedText.match(/bytlinks\.com\/([^\/?#]+)/);
            if (match) {
              const username = match[1];
              if (username && !['api', 'login', 'signup', 'dashboard'].includes(username)) {
                scanHandledRef.current = true;
                scanner.stop().catch(() => {});
                scannerRef.current = null;
                if (navigator.vibrate) navigator.vibrate(100);
                fetchCardData(username);
              }
            }
          },
          () => {} // QR not found in frame — expected, keep scanning
        );
      } catch (err) {
        if (cancelled) return;

        // Provide specific error messages based on the error type
        const errStr = String(err);

        if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
          setCameraError(
            'Camera permission was denied. Please allow camera access in your browser settings and try again.'
          );
        } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFound')) {
          setCameraError('No camera found on this device.');
        } else if (errStr.includes('NotReadableError') || errStr.includes('could not start video')) {
          setCameraError(
            'Camera is in use by another app, or could not be started. Close other camera apps and try again.'
          );
        } else if (errStr.includes('OverconstrainedError')) {
          // Retry without facingMode constraint
          try {
            const scanner = new Html5Qrcode('qr-scanner-viewport');
            scannerRef.current = scanner;
            await scanner.start(
              { facingMode: 'user' }, // fall back to front camera
              { fps: 10, qrbox: { width: 250, height: 250 } },
              (decodedText) => {
                if (cancelled || scanHandledRef.current) return;
                const match2 = decodedText.match(/bytlinks\.com\/([^\/?#]+)/);
                if (match2) {
                  const username = match2[1];
                  if (username && !['api', 'login', 'signup', 'dashboard'].includes(username)) {
                    scanHandledRef.current = true;
                    scanner.stop().catch(() => {});
                    scannerRef.current = null;
                    if (navigator.vibrate) navigator.vibrate(100);
                    fetchCardData(username);
                  }
                }
              },
              () => {}
            );
            return; // retry succeeded
          } catch {
            setCameraError('Could not access any camera on this device.');
          }
        } else {
          setCameraError(
            'Could not access camera. Make sure you\'re on HTTPS and have granted camera permissions.'
          );
        }
        setMode('idle');
      }
    }, 100); // 100ms lets React commit the DOM

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function fetchCardData(username: string) {
    setError(null);
    try {
      const res = await fetch(`/api/public/${username}/card`);
      const json = await res.json();
      if (json.success && json.data) {
        setScannedCard({ username, page: json.data.page });
        setMode('result');
        setAddedToRolodex(false);
        setSentCard(null);
      } else {
        setError('User not found');
        setMode('idle');
      }
    } catch {
      setError('Failed to load card. Check your connection.');
      setMode('idle');
    }
  }

  async function handleManualLookup() {
    const username = manualUsername.trim().replace(/^@/, '');
    if (!username) return;
    setMode('idle');
    await fetchCardData(username);
  }

  async function addToRolodex() {
    if (!scannedCard || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/rolodex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: scannedCard.username }),
      });
      const json = await res.json();
      if (json.success) {
        setAddedToRolodex(true);
      } else {
        setError(json.error || 'Failed to add');
      }
    } catch {
      setError('Network error');
    } finally {
      setAdding(false);
    }
  }

  async function sendMyCard() {
    if (!scannedCard || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/rolodex/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to_username: scannedCard.username }),
      });
      const json = await res.json();
      if (json.success) {
        setSentCard(json.data.status === 'accepted' ? 'accepted' : 'pending');
      } else {
        setError(json.error || 'Failed to send');
      }
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }

  function resetScanner() {
    stopScanning();
    setScannedCard(null);
    setError(null);
    setAddedToRolodex(false);
    setSentCard(null);
    setMode('idle');
  }

  function goToRolodex() {
    onCardAdded(scannedCard?.username ?? '');
  }

  const avatarUrl = scannedCard?.page.avatar_r2_key
    ? `/api/public/avatar/${scannedCard.page.avatar_r2_key}`
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Idle State ── */}
      {mode === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-accent/10 flex items-center justify-center">
            <ScanLine className="w-10 h-10 text-brand-accent" />
          </div>
          <div className="text-center">
            <h2 className="font-display text-xl font-800 text-brand-text mb-1">Scan a Card</h2>
            <p className="font-body text-sm text-brand-text-secondary max-w-xs">
              Point your camera at a BytLinks QR code to scan someone's business card.
            </p>
          </div>

          {cameraError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 max-w-xs">
              <CameraOff className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{cameraError}</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 max-w-xs">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {cameraSupported && (
              <button
                onClick={() => { setCameraError(null); setMode('scanning'); }}
                className="flex items-center justify-center gap-2 font-body text-sm font-semibold px-6 py-3.5 rounded-xl bg-brand-accent text-white transition-all duration-200 hover:bg-brand-accent-hover active:scale-[0.98]"
              >
                <Camera className="w-5 h-5" />
                Open Camera
              </button>
            )}
            <button
              onClick={() => { setError(null); setCameraError(null); setMode('manual'); }}
              className="flex items-center justify-center gap-2 font-body text-sm font-medium px-6 py-3 rounded-xl border border-brand-border text-brand-text-secondary transition-colors hover:bg-brand-surface-alt"
            >
              <Keyboard className="w-4 h-4" />
              Enter Username
            </button>
          </div>
        </div>
      )}

      {/* ── Manual Entry ── */}
      {mode === 'manual' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <div className="text-center">
            <h2 className="font-display text-lg font-800 text-brand-text mb-1">Look Up a Card</h2>
            <p className="font-body text-sm text-brand-text-secondary">Enter their BytLinks username</p>
          </div>
          <div className="w-full max-w-xs flex gap-2">
            <input
              type="text"
              value={manualUsername}
              onChange={(e) => setManualUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualLookup(); }}
              placeholder="username"
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl border border-brand-border bg-brand-surface font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
            <button
              onClick={handleManualLookup}
              disabled={!manualUsername.trim()}
              className="px-4 py-3 rounded-xl bg-brand-accent text-white font-semibold text-sm disabled:opacity-40 transition-colors hover:bg-brand-accent-hover"
            >
              Go
            </button>
          </div>
          <button onClick={resetScanner} className="font-body text-xs text-brand-text-muted hover:text-brand-text-secondary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />Back
          </button>
        </div>
      )}

      {/* ── Scanning ── */}
      {mode === 'scanning' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative bg-black overflow-hidden" style={{ minHeight: 300 }}>
            {/* Camera viewport — html5-qrcode renders the video here */}
            <div id="qr-scanner-viewport" className="w-full h-full" style={{ minHeight: 300 }} />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
                <div className="absolute left-2 right-2 h-0.5 bg-brand-accent/80 animate-scan-line" />
              </div>
            </div>
            <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm font-body">
              Point at a BytLinks QR code
            </p>
          </div>
          <div className="shrink-0 p-4 bg-brand-bg">
            <button
              onClick={() => { stopScanning(); setMode('idle'); }}
              className="w-full flex items-center justify-center gap-2 font-body text-sm font-medium px-4 py-3 rounded-xl border border-brand-border text-brand-text transition-colors hover:bg-brand-surface-alt"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Result: Scanned Card Preview ── */}
      {mode === 'result' && scannedCard && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 gap-4">
            {/* Card */}
            <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shadow-xl overflow-hidden animate-card-reveal">
              <div className="px-5 pt-6 pb-4">
                <div className="flex items-start gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-white/60">
                        {(scannedCard.page.display_name || scannedCard.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="text-lg font-800 text-white tracking-tight truncate">
                      {scannedCard.page.display_name || scannedCard.username}
                    </h2>
                    {scannedCard.page.job_title && (
                      <p className="text-sm text-white/60 mt-0.5 truncate flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />{scannedCard.page.job_title}
                      </p>
                    )}
                    {scannedCard.page.company_name && (
                      <p className="text-sm text-white/40 mt-0.5 truncate flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />{scannedCard.page.company_name}
                      </p>
                    )}
                  </div>
                </div>
                {scannedCard.page.bio && (
                  <p className="text-sm text-white/50 mt-3 line-clamp-2">{scannedCard.page.bio}</p>
                )}
              </div>
              <div className="mx-5 border-t border-white/10" />
              <div className="px-5 py-4 space-y-2">
                {scannedCard.page.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/70 truncate">{scannedCard.page.email}</span>
                  </div>
                )}
                {scannedCard.page.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/70 truncate">{scannedCard.page.phone}</span>
                  </div>
                )}
                {scannedCard.page.address && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/70 truncate">{scannedCard.page.address}</span>
                  </div>
                )}
              </div>
              <div className="px-5 py-2.5 bg-white/5 border-t border-white/10">
                <p className="text-[11px] text-white/25 text-center tracking-wide">
                  @{scannedCard.username} — bytlinks.com/{scannedCard.username}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full max-w-sm space-y-2.5">
              {!addedToRolodex ? (
                <button
                  onClick={addToRolodex}
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-2 font-body text-sm font-semibold px-4 py-3.5 rounded-xl bg-brand-accent text-white transition-all hover:bg-brand-accent-hover active:scale-[0.98] disabled:opacity-60"
                >
                  {adding ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Add to Rolodex
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 font-body text-sm font-semibold px-4 py-3.5 rounded-xl bg-green-600 text-white">
                  <CheckCircle className="w-4 h-4" />
                  Added to Rolodex
                </div>
              )}

              {sentCard === null ? (
                <button
                  onClick={sendMyCard}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 font-body text-sm font-semibold px-4 py-3 rounded-xl border border-brand-border bg-brand-surface text-brand-text transition-all hover:bg-brand-surface-alt active:scale-[0.98] disabled:opacity-60"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SendHorizontal className="w-4 h-4" />
                  )}
                  Send My Card
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 font-body text-sm font-medium px-4 py-3 rounded-xl border border-brand-border bg-brand-surface-alt text-brand-text-secondary">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {sentCard === 'accepted' ? 'Card auto-accepted!' : 'Card sent — pending approval'}
                </div>
              )}

              <div className="flex gap-2">
                {addedToRolodex && (
                  <button
                    onClick={goToRolodex}
                    className="flex-1 font-body text-xs font-medium text-brand-accent py-2.5 rounded-lg hover:bg-brand-accent/5 transition-colors"
                  >
                    View Rolodex
                  </button>
                )}
                <button
                  onClick={resetScanner}
                  className="flex-1 flex items-center justify-center gap-1.5 font-body text-xs font-medium text-brand-text-muted py-2.5 rounded-lg hover:bg-brand-surface-alt transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Scan Another
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
