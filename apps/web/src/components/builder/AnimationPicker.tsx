import type { Animation, AnimationSpeed } from '@bytlinks/shared';

const ANIMATIONS: { key: Animation; label: string; description: string }[] = [
  { key: 'none', label: 'None', description: 'Instant load' },
  { key: 'fade', label: 'Fade', description: 'Gentle fade-in' },
  { key: 'slide-up', label: 'Slide Up', description: 'Enter from below' },
  { key: 'slide-down', label: 'Slide Down', description: 'Enter from above' },
  { key: 'scale', label: 'Scale', description: 'Scale in smoothly' },
  { key: 'blur-in', label: 'Blur In', description: 'Come into focus' },
  { key: 'cascade', label: 'Cascade', description: 'Staggered reveal' },
];

const SPEEDS: { key: AnimationSpeed; label: string }[] = [
  { key: 'slowest', label: 'Slowest' },
  { key: 'slow', label: 'Slow' },
  { key: 'default', label: 'Default' },
  { key: 'fast', label: 'Fast' },
  { key: 'fastest', label: 'Fastest' },
];

interface AnimationPickerProps {
  value: Animation;
  speed: AnimationSpeed;
  onChange: (animation: Animation) => void;
  onChangeSpeed: (speed: AnimationSpeed) => void;
}

export function AnimationPicker({ value, speed, onChange, onChangeSpeed }: AnimationPickerProps) {
  return (
    <div className="space-y-5">
      {/* Animation type */}
      <div className="grid grid-cols-3 gap-2">
        {ANIMATIONS.map((anim) => (
          <button
            key={anim.key}
            onClick={() => onChange(anim.key)}
            className={`rounded-xl border p-3 text-left transition-colors duration-fast
              ${value === anim.key
                ? 'border-brand-accent ring-2 ring-brand-accent/20'
                : 'border-brand-border hover:border-brand-text-muted'
              }`}
          >
            <p className="font-body text-xs font-semibold text-brand-text">{anim.label}</p>
            <p className="font-body text-[10px] text-brand-text-muted leading-tight">{anim.description}</p>
          </button>
        ))}
      </div>

      {/* Speed selector — only show when an animation is selected */}
      {value !== 'none' && (
        <div>
          <p className="font-body text-xs font-medium text-brand-text-muted mb-2">Speed</p>
          <div className="flex gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s.key}
                onClick={() => onChangeSpeed(s.key)}
                className={`font-body text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-fast flex-1 text-center
                  ${speed === s.key
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
