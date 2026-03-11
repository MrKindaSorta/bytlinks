import { AnimatedBackground } from '../page/AnimatedBackground';
import type { ShowcasePage } from './showcaseData';

export function MiniPagePreview({ page, size = 'normal' }: { page: ShowcasePage; size?: 'normal' | 'small' }) {
  const { theme: t, bgEffect } = page;
  const isGradientBg = t.bg.includes('gradient');
  const isSmall = size === 'small';

  const width = isSmall ? 80 : 210;
  const height = isSmall ? 130 : 340;

  return (
    <div className="shrink-0 flex flex-col items-center gap-2.5">
      <div
        className="shrink-0 overflow-hidden select-none relative"
        style={{
          width,
          height,
          background: t.bg,
          borderRadius: isSmall ? '12px' : '20px',
          border: `1.5px solid ${t.border}`,
          '--page-text': t.text,
          '--page-accent': t.accent,
        } as React.CSSProperties}
      >
        {bgEffect !== 'none' && !isSmall && (
          <AnimatedBackground
            effect={bgEffect}
            intensity={bgEffect === 'bokeh' ? 30 : bgEffect === 'waves' ? 35 : 50}
            nightSkyConfig={{ shootingStars: 1, staticStars: 30, drift: 6 }}
            firefliesConfig={{ count: 12, speed: 15, glow: 40, pulse: 35 }}
            rainConfig={{ drops: 80, speed: 30, angle: 10, splash: 30 }}
          />
        )}

        <div
          className="relative z-[1] flex flex-col items-center text-center h-full"
          style={{ padding: isSmall ? '8px 6px 4px' : '28px 20px 16px' }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center font-bold shrink-0"
            style={{
              width: isSmall ? 20 : 48,
              height: isSmall ? 20 : 48,
              fontSize: isSmall ? 6 : 14,
              marginBottom: isSmall ? 4 : 10,
              borderRadius: t.radius === '0px' ? '0' : '50%',
              background: isGradientBg ? 'rgba(255,255,255,0.12)' : t.surface,
              color: t.textSec,
              fontFamily: t.fontDisplay,
              border: `1.5px solid ${t.border}`,
            }}
          >
            {page.initials}
          </div>

          {/* Name */}
          <div
            className="font-bold tracking-tight leading-tight"
            style={{
              fontSize: isSmall ? 5 : 14,
              marginBottom: isSmall ? 1 : 2,
              color: t.text,
              fontFamily: t.fontDisplay,
            }}
          >
            {page.name}
          </div>

          {!isSmall && (
            <>
              {/* Bio */}
              <div
                className="leading-relaxed px-1 max-w-[170px]"
                style={{ fontSize: 9, marginBottom: 12, color: t.textSec, fontFamily: t.fontBody }}
              >
                {page.bio}
              </div>

              {/* Social icons */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {page.socials.map(({ Icon }, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 flex items-center justify-center"
                    style={{
                      borderRadius: t.radius === '0px' ? '0' : '50%',
                      background: isGradientBg ? 'rgba(255,255,255,0.08)' : t.surface,
                      color: t.text,
                    }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                  </div>
                ))}
              </div>

              {/* Links */}
              <div className="w-full space-y-1.5 flex-1">
                {page.links.map((link, i) => (
                  <div
                    key={i}
                    className="w-full text-center px-3 font-medium"
                    style={{
                      padding: '7px 12px',
                      fontSize: 9,
                      background: t.btnBg,
                      color: t.btnText,
                      border: `1.5px solid ${t.btnBorder}`,
                      borderRadius: t.radius,
                      fontFamily: t.fontBody,
                      boxShadow: t.btnShadow ?? 'none',
                    }}
                  >
                    {link}
                  </div>
                ))}
              </div>
            </>
          )}

          {isSmall && (
            <div className="w-full space-y-1 flex-1">
              {page.links.slice(0, 2).map((link, i) => (
                <div
                  key={i}
                  className="w-full text-center font-medium"
                  style={{
                    padding: '2px 4px',
                    fontSize: 4,
                    background: t.btnBg,
                    color: t.btnText,
                    border: `1px solid ${t.btnBorder}`,
                    borderRadius: t.radius === '0px' ? '0' : '4px',
                    fontFamily: t.fontBody,
                  }}
                >
                  {link}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isSmall && (
        <div className="font-body text-[11px] font-semibold tracking-wider uppercase text-brand-text-muted">
          {page.label}
        </div>
      )}
    </div>
  );
}
