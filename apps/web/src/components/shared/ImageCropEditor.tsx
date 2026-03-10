import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Check, Maximize } from 'lucide-react';

/* ── Public types & presets ─────────────────────────────────── */

export interface CropPreset {
  label: string;
  /** width / height. `null` = use image's natural aspect ratio */
  ratio: number | null;
}

export const CROP_SQUARE: CropPreset[] = [
  { label: '1:1', ratio: 1 },
];

export const CROP_FLEXIBLE: CropPreset[] = [
  { label: 'Original', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:3', ratio: 4 / 3 },
];

export const CROP_EVENT_COVER: CropPreset[] = [
  { label: '16:9', ratio: 16 / 9 },
  { label: '2:1', ratio: 2 },
  { label: '21:9', ratio: 21 / 9 },
];

/* ── Props ──────────────────────────────────────────────────── */

interface Props {
  file: File;
  presets: CropPreset[];
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

/* ── Constants ──────────────────────────────────────────────── */

const MAX_OUTPUT_PX = 2048;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.01;
const WHEEL_ZOOM_FACTOR = 0.002;

/* ── Helpers ────────────────────────────────────────────────── */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/* ── Component ──────────────────────────────────────────────── */

export function ImageCropEditor({ file, presets, onConfirm, onCancel }: Props) {
  /* ── State ── */
  const [imgSrc, setImgSrc] = useState('');
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 });
  const [visible, setVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* ── Refs ── */
  const areaRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(MIN_ZOOM);
  const dragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  /* ── Derived values ── */
  const natW = imgEl?.naturalWidth ?? 0;
  const natH = imgEl?.naturalHeight ?? 0;
  const fitScale = vp.w && natW ? Math.max(vp.w / natW, vp.h / natH) : 1;

  /* ── Load file as object URL ── */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* ── Entry animation ── */
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  /* ── ESC to cancel ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  /* ── Measure container ── */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setAreaSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Constrain pan so image always covers viewport ── */
  const constrainPan = useCallback(
    (p: { x: number; y: number }, z: number) => {
      const s = fitScale * z;
      const dw = natW * s;
      const dh = natH * s;
      return {
        x: clamp(p.x, vp.w - dw, 0),
        y: clamp(p.y, vp.h - dh, 0),
      };
    },
    [fitScale, natW, natH, vp],
  );

  /* ── Recalculate viewport on resize / preset / image change ── */
  useEffect(() => {
    if (!natW || !natH || !areaSize.w || !areaSize.h) return;

    const ratio = presets[presetIdx].ratio ?? natW / natH;
    const padX = 32;
    const padY = 32;
    const aw = areaSize.w - padX;
    const ah = areaSize.h - padY;

    let vpW: number;
    let vpH: number;
    if (aw / ah > ratio) {
      vpH = Math.min(ah, 520);
      vpW = vpH * ratio;
    } else {
      vpW = Math.min(aw, 640);
      vpH = vpW / ratio;
    }
    if (vpW > aw) { vpW = aw; vpH = vpW / ratio; }
    if (vpH > ah) { vpH = ah; vpW = vpH * ratio; }

    setVp({ w: Math.round(vpW), h: Math.round(vpH) });

    // Reset to cover-fit center
    const fs = Math.max(vpW / natW, vpH / natH);
    const dw = natW * fs;
    const dh = natH * fs;
    const newPan = { x: (vpW - dw) / 2, y: (vpH - dh) / 2 };

    panRef.current = newPan;
    zoomRef.current = MIN_ZOOM;
    setPan(newPan);
    setZoom(MIN_ZOOM);
  }, [natW, natH, areaSize, presetIdx, presets]);

  /* ── Sync refs ── */
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  /* ── Update pan + zoom (batched) ── */
  function applyPanZoom(newPan: { x: number; y: number }, newZoom: number) {
    const z = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const p = constrainPan(newPan, z);
    panRef.current = p;
    zoomRef.current = z;
    setPan(p);
    setZoom(z);
  }

  /* ── Pointer drag ── */
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    dragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...panRef.current };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    const newPan = { x: panOrigin.current.x + dx, y: panOrigin.current.y + dy };
    applyPanZoom(newPan, zoomRef.current);
  }

  function handlePointerUp() {
    dragging.current = false;
  }

  /* ── Wheel zoom (toward cursor) ── */
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const vpRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - vpRect.left;
    const cy = e.clientY - vpRect.top;

    const oldZ = zoomRef.current;
    const newZ = clamp(oldZ * (1 - e.deltaY * WHEEL_ZOOM_FACTOR), MIN_ZOOM, MAX_ZOOM);
    const scaleChange = (fitScale * newZ) / (fitScale * oldZ);

    const newPan = {
      x: cx - (cx - panRef.current.x) * scaleChange,
      y: cy - (cy - panRef.current.y) * scaleChange,
    };
    applyPanZoom(newPan, newZ);
  }

  /* ── Slider zoom (toward center) ── */
  function handleSliderZoom(newZoom: number) {
    const oldZ = zoomRef.current;
    const scaleChange = (fitScale * newZoom) / (fitScale * oldZ);
    const cx = vp.w / 2;
    const cy = vp.h / 2;
    const newPan = {
      x: cx - (cx - panRef.current.x) * scaleChange,
      y: cy - (cy - panRef.current.y) * scaleChange,
    };
    applyPanZoom(newPan, newZoom);
  }

  /* ── Reset to fit ── */
  function resetFit() {
    const dw = natW * fitScale;
    const dh = natH * fitScale;
    applyPanZoom({ x: (vp.w - dw) / 2, y: (vp.h - dh) / 2 }, MIN_ZOOM);
  }

  /* ── Export cropped image ── */
  async function handleConfirm() {
    if (!imgEl || !vp.w) return;
    setExporting(true);

    try {
      const displayScale = fitScale * zoomRef.current;
      const srcX = -panRef.current.x / displayScale;
      const srcY = -panRef.current.y / displayScale;
      const srcW = vp.w / displayScale;
      const srcH = vp.h / displayScale;

      // Output dimensions (capped)
      const outScale = Math.min(1, MAX_OUTPUT_PX / Math.max(srcW, srcH));
      const outW = Math.round(srcW * outScale);
      const outH = Math.round(srcH * outScale);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;

      // Use high-quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = type === 'image/jpeg' ? 0.92 : undefined;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), type, quality);
      });

      const ext = type === 'image/png' ? '.png' : '.jpg';
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const croppedFile = new File([blob], `${baseName}${ext}`, { type });
      onConfirm(croppedFile);
    } finally {
      setExporting(false);
    }
  }

  /* ── Render ── */
  const displayW = natW * fitScale * zoom;
  const displayH = natH * fitScale * zoom;
  const showPresets = presets.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={onCancel}
      />

      {/* Modal content */}
      <div
        className="relative z-10 flex flex-col w-full h-full max-w-2xl mx-auto"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <span className="font-display text-sm font-semibold text-white tracking-tight">
            Edit Image
          </span>
          <button
            onClick={handleConfirm}
            disabled={exporting || !imgEl}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-body text-sm font-medium
                       bg-[#0d9488] text-white hover:bg-[#0f766e] disabled:opacity-50
                       transition-colors duration-150"
          >
            <Check className="w-4 h-4" />
            {exporting ? 'Saving...' : 'Apply'}
          </button>
        </div>

        {/* Image area */}
        <div ref={areaRef} className="flex-1 min-h-0 flex items-center justify-center px-4 pb-2">
          {vp.w > 0 && imgEl && (
            <div
              className="relative select-none"
              style={{
                width: vp.w,
                height: vp.h,
                cursor: dragging.current ? 'grabbing' : 'grab',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                border: '2px solid rgba(255,255,255,0.25)',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* Grid overlay */}
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),' +
                    'linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
                  backgroundSize: `${vp.w / 3}px ${vp.h / 3}px`,
                }}
              />
              {/* Image */}
              <img
                src={imgSrc}
                alt=""
                draggable={false}
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: displayW,
                  height: displayH,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  willChange: 'transform',
                }}
              />
            </div>
          )}
          {/* Loading state before image loads */}
          {!imgEl && imgSrc && (
            <div className="text-white/50 font-body text-sm">Loading image...</div>
          )}
        </div>

        {/* Controls */}
        <div className="shrink-0 px-4 pb-4 space-y-3">
          {/* Zoom slider */}
          <div className="flex items-center gap-3 max-w-sm mx-auto">
            <button
              onClick={() => handleSliderZoom(Math.max(MIN_ZOOM, zoom - 0.2))}
              className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => handleSliderZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none bg-white/20 cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                         [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                         [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                         [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <button
              onClick={() => handleSliderZoom(Math.min(MAX_ZOOM, zoom + 0.2))}
              className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetFit}
              className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
              title="Fit to frame"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          {/* Aspect ratio presets */}
          {showPresets && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {presets.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPresetIdx(i)}
                  className={`px-3 py-1 rounded-full font-body text-xs font-medium transition-colors duration-150
                    ${presetIdx === i
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden image element for loading natural dimensions */}
      {imgSrc && !imgEl && (
        <img
          src={imgSrc}
          alt=""
          className="absolute opacity-0 pointer-events-none"
          style={{ position: 'fixed', left: -9999, top: -9999 }}
          onLoad={(e) => setImgEl(e.currentTarget)}
        />
      )}
    </div>,
    document.body,
  );
}
