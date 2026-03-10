import { Check } from 'lucide-react';
import type { BackgroundEffect, NightSkyConfig, RainConfig, FirefliesConfig } from '@bytlinks/shared';

const BACKGROUND_OPTIONS: { key: BackgroundEffect; label: string; description: string }[] = [
  { key: 'none', label: 'None', description: 'Clean, no effect' },
  { key: 'night-sky', label: 'Night Sky', description: 'Stars, meteors & drift' },
  { key: 'rain', label: 'Rain', description: 'Falling drops & splashes' },
  { key: 'fireflies', label: 'Fireflies', description: 'Wandering glowing dots' },
  { key: 'bokeh', label: 'Bokeh', description: 'Soft glowing circles' },
  { key: 'waves', label: 'Waves', description: 'Gentle flowing lines' },
];

const NIGHT_SKY_DEFAULTS: NightSkyConfig = { shootingStars: 4, staticStars: 120, drift: 12 };
const RAIN_DEFAULTS: RainConfig = { drops: 220, speed: 42, angle: 14, splash: 60 };
const FIREFLIES_DEFAULTS: FirefliesConfig = { count: 55, speed: 30, glow: 65, pulse: 50 };

const SLIDER_CLASSES = `w-full h-1.5 rounded-full appearance-none cursor-pointer
  bg-brand-border accent-brand-accent
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-3.5
  [&::-webkit-slider-thumb]:h-3.5
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-brand-accent
  [&::-webkit-slider-thumb]:shadow-sm
  [&::-webkit-slider-thumb]:border-2
  [&::-webkit-slider-thumb]:border-white`;

interface BackgroundPickerProps {
  value: BackgroundEffect;
  intensity: number;
  nightSkyConfig?: NightSkyConfig;
  rainConfig?: RainConfig;
  firefliesConfig?: FirefliesConfig;
  onChange: (effect: BackgroundEffect) => void;
  onChangeIntensity: (intensity: number) => void;
  onChangeNightSky: (config: NightSkyConfig) => void;
  onChangeRain: (config: RainConfig) => void;
  onChangeFireflies: (config: FirefliesConfig) => void;
}

export function BackgroundPicker({
  value, intensity, nightSkyConfig, rainConfig, firefliesConfig,
  onChange, onChangeIntensity, onChangeNightSky, onChangeRain, onChangeFireflies,
}: BackgroundPickerProps) {
  const current = value || 'none';
  const isNightSky = current === 'night-sky';
  const isRain = current === 'rain';
  const isFireflies = current === 'fireflies';
  const showIntensity = current !== 'none' && !isNightSky && !isRain && !isFireflies;
  const nsc = nightSkyConfig ?? NIGHT_SKY_DEFAULTS;
  const rc = rainConfig ?? RAIN_DEFAULTS;
  const fc = firefliesConfig ?? FIREFLIES_DEFAULTS;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {BACKGROUND_OPTIONS.map((opt) => {
          const active = current === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={`relative rounded-xl border p-3 text-left transition-colors duration-fast
                ${active
                  ? 'border-brand-accent ring-2 ring-brand-accent/20'
                  : 'border-brand-border hover:border-brand-text-muted'
                }`}
            >
              <div
                className="w-full h-10 rounded-lg mb-2 overflow-hidden relative"
                style={{ background: 'var(--page-bg, #1c1917)' }}
              >
                <MiniPreview effect={opt.key} />
              </div>
              <p className="font-body text-xs font-semibold text-brand-text leading-tight">
                {opt.label}
              </p>
              <p className="font-body text-[10px] text-brand-text-muted leading-tight mt-0.5">
                {opt.description}
              </p>
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-accent flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Night Sky: 3 sliders */}
      {isNightSky && (
        <div className="space-y-3 pt-1">
          <SliderRow
            label="Shooting Stars"
            value={nsc.shootingStars}
            min={0} max={25} step={1}
            lo="None" hi="Shower"
            onChange={(v) => onChangeNightSky({ ...nsc, shootingStars: v })}
          />
          <SliderRow
            label="Static Stars"
            value={nsc.staticStars}
            min={0} max={300} step={10}
            lo="None" hi="Dense"
            onChange={(v) => onChangeNightSky({ ...nsc, staticStars: v })}
          />
          <SliderRow
            label="Sky Drift"
            value={nsc.drift}
            min={0} max={100} step={1}
            lo="Still" hi="Fast"
            onChange={(v) => onChangeNightSky({ ...nsc, drift: v })}
          />
        </div>
      )}

      {/* Rain: 4 sliders */}
      {isRain && (
        <div className="space-y-3 pt-1">
          <SliderRow
            label="Drops"
            value={rc.drops}
            min={0} max={600} step={10}
            lo="Few" hi="Downpour"
            onChange={(v) => onChangeRain({ ...rc, drops: v })}
          />
          <SliderRow
            label="Speed"
            value={rc.speed}
            min={0} max={100} step={1}
            lo="Slow" hi="Fast"
            onChange={(v) => onChangeRain({ ...rc, speed: v })}
          />
          <SliderRow
            label="Wind Angle"
            value={rc.angle}
            min={-60} max={60} step={1}
            lo="Left" hi="Right"
            onChange={(v) => onChangeRain({ ...rc, angle: v })}
          />
          <SliderRow
            label="Splash"
            value={rc.splash}
            min={0} max={100} step={5}
            lo="None" hi="Heavy"
            onChange={(v) => onChangeRain({ ...rc, splash: v })}
          />
        </div>
      )}

      {/* Fireflies: 4 sliders */}
      {isFireflies && (
        <div className="space-y-3 pt-1">
          <SliderRow
            label="Count"
            value={fc.count}
            min={0} max={180} step={5}
            lo="Few" hi="Swarm"
            onChange={(v) => onChangeFireflies({ ...fc, count: v })}
          />
          <SliderRow
            label="Speed"
            value={fc.speed}
            min={0} max={100} step={1}
            lo="Still" hi="Fast"
            onChange={(v) => onChangeFireflies({ ...fc, speed: v })}
          />
          <SliderRow
            label="Glow"
            value={fc.glow}
            min={0} max={100} step={5}
            lo="Dim" hi="Bright"
            onChange={(v) => onChangeFireflies({ ...fc, glow: v })}
          />
          <SliderRow
            label="Pulse"
            value={fc.pulse}
            min={0} max={100} step={5}
            lo="Calm" hi="Lively"
            onChange={(v) => onChangeFireflies({ ...fc, pulse: v })}
          />
        </div>
      )}

      {/* Generic intensity slider for other effects */}
      {showIntensity && (
        <div className="pt-1">
          <SliderRow
            label="Intensity"
            value={intensity}
            min={5} max={100} step={5}
            lo="Subtle" hi="Bold"
            showValue
            onChange={onChangeIntensity}
          />
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, lo, hi, showValue, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  lo: string; hi: string; showValue?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-body text-xs font-semibold text-brand-text">{label}</label>
        <span className="font-body text-[11px] text-brand-text-muted tabular-nums">
          {showValue ? `${value}%` : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={SLIDER_CLASSES}
      />
      <div className="flex justify-between mt-0.5">
        <span className="font-body text-[9px] text-brand-text-muted/60">{lo}</span>
        <span className="font-body text-[9px] text-brand-text-muted/60">{hi}</span>
      </div>
    </div>
  );
}

function MiniPreview({ effect }: { effect: BackgroundEffect }) {
  if (effect === 'none') return null;
  const dotColor = 'var(--page-text, #a8a29e)';

  if (effect === 'night-sky') {
    return (
      <>
        {/* Static twinkle dots */}
        {Array.from({ length: 12 }, (_, i) => (
          <div key={`s${i}`} style={{
            position: 'absolute',
            left: `${(i * 29 + 5) % 92}%`,
            top: `${(i * 37 + 8) % 85}%`,
            width: 1 + (i % 3) * 0.5,
            height: 1 + (i % 3) * 0.5,
            borderRadius: '50%',
            background: dotColor,
            opacity: 0.08 + (i % 4) * 0.08,
          }} />
        ))}
        {/* Shooting star streaks */}
        {[0, 1].map((i) => (
          <div key={`m${i}`} style={{
            position: 'absolute',
            top: `${12 + i * 35}%`,
            left: `${30 + i * 25}%`,
            width: 18 + i * 6,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${dotColor})`,
            opacity: 0.3,
            transform: `rotate(${110 + i * 15}deg)`,
            transformOrigin: '100% 50%',
          }} />
        ))}
      </>
    );
  }

  if (effect === 'rain') {
    return (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + (i * 31 + 5) % 80}%`,
            top: `${(i * 23 + 3) % 60}%`,
            width: 0.8,
            height: 6 + (i % 3) * 3,
            background: `linear-gradient(180deg, transparent, ${dotColor})`,
            opacity: 0.2 + (i % 3) * 0.08,
            transform: 'rotate(14deg)',
          }} />
        ))}
      </>
    );
  }

  if (effect === 'fireflies') {
    const accentColor = 'var(--page-accent, #8bca5c)';
    return (
      <>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${12 + (i * 29 + 5) % 75}%`,
            top: `${15 + (i * 37 + 10) % 65}%`,
            width: 2 + (i % 2),
            height: 2 + (i % 2),
            borderRadius: '50%',
            background: accentColor,
            opacity: 0.15 + (i % 3) * 0.12,
            boxShadow: `0 0 ${3 + i % 3}px ${accentColor}`,
          }} />
        ))}
      </>
    );
  }

  if (effect === 'bokeh') {
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + i * 22}%`, top: `${15 + (i % 3) * 25}%`,
            width: 14 + i * 4, height: 14 + i * 4,
            borderRadius: '50%', background: dotColor,
            opacity: 0.1, filter: 'blur(3px)',
          }} />
        ))}
      </>
    );
  }

  if (effect === 'waves') {
    return (
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1].map((i) => (
          <path key={i}
            d={`M 0 ${22 + i * 14} Q 25 ${16 + i * 14} 50 ${22 + i * 14} Q 75 ${28 + i * 14} 100 ${22 + i * 14}`}
            fill="none" stroke={dotColor} strokeWidth="0.8" opacity={0.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    );
  }

  return null;
}
