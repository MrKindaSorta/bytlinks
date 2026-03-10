import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface QrCodeSectionProps {
  username: string;
}

const SIZES = [256, 512, 1024] as const;

export function QrCodeSection({ username }: QrCodeSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [foreground, setForeground] = useState('#0d9488');
  const [background, setBackground] = useState('#ffffff');
  const [size, setSize] = useState<256 | 512 | 1024>(256);
  const [format, setFormat] = useState<'png' | 'svg'>('png');

  const pageUrl = `https://bytlinks.com/${username}`;

  const renderQr = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      await QRCode.toCanvas(canvas, pageUrl, {
        width: 200,
        margin: 2,
        color: { dark: foreground, light: background },
        errorCorrectionLevel: 'M',
      });
    } catch {
      // silent
    }
  }, [pageUrl, foreground, background]);

  useEffect(() => {
    renderQr();
  }, [renderQr]);

  async function handleDownload() {
    try {
      if (format === 'svg') {
        const svgString = await QRCode.toString(pageUrl, {
          type: 'svg',
          width: size,
          margin: 2,
          color: { dark: foreground, light: background },
          errorCorrectionLevel: 'M',
        });
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${username}-qr.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const dataUrl = await QRCode.toDataURL(pageUrl, {
          width: size,
          margin: 2,
          color: { dark: foreground, light: background },
          errorCorrectionLevel: 'M',
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${username}-qr.png`;
        a.click();
      }
    } catch {
      // silent
    }
  }

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-brand-accent" />
        <h2 className="font-display text-base font-700 tracking-tight text-brand-text">
          QR Code
        </h2>
      </div>
      <p className="font-body text-sm text-brand-text-secondary mb-5">
        Download a QR code that links to your page.
      </p>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Preview */}
        <div className="flex-shrink-0 flex items-center justify-center rounded-lg border border-brand-border p-3"
             style={{ background }}>
          <canvas ref={canvasRef} />
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-medium text-brand-text-muted mb-1">
                Foreground
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={foreground}
                  onChange={(e) => setForeground(e.target.value)}
                  className="w-8 h-8 rounded border border-brand-border cursor-pointer"
                />
                <span className="font-body text-xs text-brand-text-muted">{foreground}</span>
              </div>
            </div>
            <div>
              <label className="block font-body text-xs font-medium text-brand-text-muted mb-1">
                Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-8 h-8 rounded border border-brand-border cursor-pointer"
                />
                <span className="font-body text-xs text-brand-text-muted">{background}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-medium text-brand-text-muted mb-1">
                Size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value) as 256 | 512 | 1024)}
                className="w-full font-body text-sm px-2.5 py-1.5 rounded-lg border border-brand-border
                           bg-brand-surface text-brand-text
                           focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}×{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs font-medium text-brand-text-muted mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'png' | 'svg')}
                className="w-full font-body text-sm px-2.5 py-1.5 rounded-lg border border-brand-border
                           bg-brand-surface text-brand-text
                           focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 font-body text-sm font-semibold
                       px-4 py-2.5 rounded-lg bg-brand-accent text-white
                       transition-colors duration-fast hover:bg-brand-accent-hover"
          >
            <Download className="w-4 h-4" />
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>
    </section>
  );
}
