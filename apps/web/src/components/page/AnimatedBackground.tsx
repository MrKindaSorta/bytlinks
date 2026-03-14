import { useMemo, useRef, useEffect } from 'react';
import type { BackgroundEffect, NightSkyConfig, RainConfig, FirefliesConfig } from '@bytlinks/shared';

const DEPRECATED_EFFECTS = new Set(['shooting-stars', 'starfield', 'aurora', 'particles']);

interface AnimatedBackgroundProps {
  effect: BackgroundEffect;
  intensity?: number;
  nightSkyConfig?: NightSkyConfig;
  rainConfig?: RainConfig;
  firefliesConfig?: FirefliesConfig;
}

export function AnimatedBackground({ effect, intensity = 50, nightSkyConfig, rainConfig, firefliesConfig }: AnimatedBackgroundProps) {
  if (!effect || effect === 'none' || DEPRECATED_EFFECTS.has(effect)) return null;

  const t = Math.max(0, Math.min(100, intensity)) / 100;
  const isCanvas = effect === 'night-sky' || effect === 'rain' || effect === 'fireflies';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {effect === 'night-sky' && <NightSky config={nightSkyConfig} />}
      {effect === 'rain' && <Rain config={rainConfig} />}
      {effect === 'fireflies' && <Fireflies config={firefliesConfig} />}
      {!isCanvas && <style>{KEYFRAMES}</style>}
      {effect === 'bokeh' && <Bokeh t={t} />}
      {effect === 'waves' && <Waves t={t} />}
    </div>
  );
}

/* ── Seeded pseudo-random for deterministic CSS layouts ── */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── CSS Keyframes (for non-canvas effects) ── */

const KEYFRAMES = `
@keyframes bg-bokeh-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(var(--bx1), var(--by1)) scale(var(--bs1)); }
  50% { transform: translate(var(--bx2), var(--by2)) scale(var(--bs2)); }
  75% { transform: translate(var(--bx3), var(--by3)) scale(var(--bs3)); }
}
@keyframes bg-wave-drift {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes bg-wave-sway {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(var(--sway)); }
}
`;

/* ══════════════════════════════════════════════════════════════════════════════
 * NIGHT SKY — Canvas: shooting stars + orbiting twinkle field with flares
 * ══════════════════════════════════════════════════════════════════════════════ */

const NIGHT_SKY_DEFAULTS: NightSkyConfig = { shootingStars: 4, staticStars: 120, drift: 12 };

/** Resolve any CSS color to "r,g,b" string */
function cssToRgb(raw: string): string {
  const s = raw.trim();
  if (!s) return '255,255,255';
  if (s.startsWith('#')) {
    const hex = s.length === 4
      ? s[1] + s[1] + s[2] + s[2] + s[3] + s[3]
      : s.slice(1);
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const m = s.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `${m[1]},${m[2]},${m[3]}`;
  const c = document.createElement('canvas').getContext('2d');
  if (c) { c.fillStyle = s; return cssToRgb(c.fillStyle); }
  return '255,255,255';
}

/* ── Shooting Star ── */

interface ShootingStar {
  x: number; y: number;
  angle: number; speed: number;
  trailLen: number; brightness: number;
  pulseSpeed: number; pulsePhase: number;
  life: number; decay: number; curve: number;
  history: { x: number; y: number }[];
  size: number; dead: boolean;
}

function createShootingStar(W: number): ShootingStar {
  const deg = (Math.random() - 0.5) * 60;
  const angle = (deg * Math.PI) / 180;
  const speed = 1.2 + Math.random() * 2.2;
  const survivor = Math.random() < 0.4;
  return {
    x: Math.random() * W, y: -10, angle, speed,
    trailLen: 20 + Math.random() * 60,
    brightness: 0.5 + Math.random() * 0.5,
    pulseSpeed: 0.04 + Math.random() * 0.08,
    pulsePhase: Math.random() * Math.PI * 2,
    life: 1.0,
    decay: survivor ? 0.0005 : 0.003 + Math.random() * 0.007,
    curve: Math.abs(angle) > 0.08
      ? (Math.random() * 0.0006 + 0.0002) * Math.sign(angle) : 0,
    history: [], size: 0.8 + Math.random() * 1.4, dead: false,
  };
}

function updateShootingStar(s: ShootingStar, W: number, H: number) {
  s.history.push({ x: s.x, y: s.y });
  if (s.history.length > s.trailLen / s.speed) s.history.shift();
  s.angle += s.curve;
  const MAX_ANGLE = 1.2;
  s.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, s.angle));
  s.x += Math.sin(s.angle) * s.speed;
  s.y += Math.cos(s.angle) * s.speed;
  s.life -= s.decay;
  if (s.life <= 0 || s.y > H + 20 || s.x < -20 || s.x > W + 20) s.dead = true;
}

function drawShootingStar(ctx: CanvasRenderingContext2D, s: ShootingStar, rgb: string) {
  if (s.history.length < 2) return;
  const pulse = Math.sin(performance.now() * 0.001 * s.pulseSpeed * 60 + s.pulsePhase) * 0.15;
  const curBright = Math.max(0, Math.min(1, s.brightness + pulse));
  const alpha = curBright * s.life;

  ctx.lineCap = 'round';
  for (let i = 1; i < s.history.length; i++) {
    const t = i / s.history.length;
    const a = t * t * alpha * 0.8;
    const w = t * s.size * 1.2;
    ctx.beginPath();
    ctx.moveTo(s.history[i - 1].x, s.history[i - 1].y);
    ctx.lineTo(s.history[i].x, s.history[i].y);
    ctx.strokeStyle = `rgba(${rgb},${a})`;
    ctx.lineWidth = Math.max(0.3, w);
    ctx.stroke();
  }

  const r = s.size * 3;
  const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.4, `rgba(${rgb},${alpha * 0.5})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

/* ── Twinkle Star (orbits around a far-below pivot) ── */

interface TwinkleStar {
  dist: number; baseAngle: number;
  base: number; alpha: number; size: number;
  isBright: boolean;
  phase: number; driftSpeed: number; peakAlpha: number;
  twinkleOn: boolean; twinkleTick: number; twinkleDur: number; nextTwinkle: number;
  flareOn: boolean; flareTick: number; flareDur: number; nextFlare: number;
  flareAlpha: number; flareRadius: number; spikeLen: number;
  x: number; y: number;
}

function createTwinkleStar(minDist: number, maxDist: number): TwinkleStar {
  const isBright = Math.random() < 0.06;
  return {
    dist: minDist + Math.random() * (maxDist - minDist),
    baseAngle: Math.random() * Math.PI * 2,
    base: 0.06 + Math.random() * 0.23,
    alpha: 0.06 + Math.random() * 0.23,
    size: isBright ? 1.0 + Math.random() * 0.8 : 0.4 + Math.random() * 1.0,
    isBright,
    phase: Math.random() * Math.PI * 2,
    driftSpeed: 0.003 + Math.random() * 0.008,
    peakAlpha: 0.06 + Math.random() * 0.23 + 0.14 + Math.random() * 0.23,
    twinkleOn: false, twinkleTick: 0, twinkleDur: 0,
    nextTwinkle: 150 + Math.random() * 550,
    flareOn: false, flareTick: 0, flareDur: 0,
    nextFlare: 400 + Math.random() * 1200,
    flareAlpha: 0, flareRadius: 0, spikeLen: 0,
    x: 0, y: 0,
  };
}

function updateTwinkleStar(s: TwinkleStar, frame: number, skyAngle: number, pivotX: number, pivotY: number) {
  const a = s.baseAngle + skyAngle;
  s.x = pivotX + Math.cos(a) * s.dist;
  s.y = pivotY + Math.sin(a) * s.dist;

  // Subtle twinkle
  s.nextTwinkle--;
  if (s.nextTwinkle <= 0 && !s.twinkleOn && !s.flareOn) {
    s.twinkleOn = true;
    s.twinkleDur = 35 + Math.random() * 70;
    s.twinkleTick = 0;
    s.nextTwinkle = 250 + Math.random() * 650;
  }
  if (s.twinkleOn) {
    s.twinkleTick++;
    const t = s.twinkleTick / s.twinkleDur;
    s.alpha = s.base + Math.sin(t * Math.PI) * (s.peakAlpha - s.base);
    if (s.twinkleTick >= s.twinkleDur) { s.twinkleOn = false; s.alpha = s.base; }
  }

  // Strong flare (bright stars only)
  if (s.isBright) {
    s.nextFlare--;
    if (s.nextFlare <= 0 && !s.flareOn && !s.twinkleOn) {
      s.flareOn = true;
      s.flareDur = 60 + Math.random() * 60;
      s.flareTick = 0;
      s.nextFlare = 500 + Math.random() * 1500;
    }
    if (s.flareOn) {
      s.flareTick++;
      const t = s.flareTick / s.flareDur;
      const bump = t < 0.25 ? t / 0.25 : 1 - ((t - 0.25) / 0.75);
      s.flareAlpha = bump * 0.9;
      s.flareRadius = bump * (s.size * 14);
      s.spikeLen = bump * (s.size * 22);
      if (s.flareTick >= s.flareDur) { s.flareOn = false; s.flareAlpha = 0; }
    }
  }

  // Ambient drift when idle
  if (!s.twinkleOn && !s.flareOn) {
    s.alpha = s.base + Math.sin(frame * s.driftSpeed + s.phase) * 0.018;
  }
}

function drawTwinkleStar(ctx: CanvasRenderingContext2D, s: TwinkleStar, rgb: string) {
  const al = Math.max(0, s.alpha);
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb},${al})`;
  ctx.fill();

  if (s.isBright && s.flareOn && s.flareAlpha > 0) {
    const fa = s.flareAlpha;
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.flareRadius);
    grd.addColorStop(0, `rgba(${rgb},${fa * 0.9})`);
    grd.addColorStop(0.3, `rgba(${rgb},${fa * 0.4})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.flareRadius, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    const sl = s.spikeLen;
    const spikes: [number, number][] = [
      [0, sl], [0, -sl], [sl, 0], [-sl, 0],
      [sl * 0.55, sl * 0.55], [-sl * 0.55, sl * 0.55],
      [sl * 0.55, -sl * 0.55], [-sl * 0.55, -sl * 0.55],
    ];
    ctx.lineCap = 'round';
    for (const [dx, dy] of spikes) {
      const spGrd = ctx.createLinearGradient(s.x, s.y, s.x + dx, s.y + dy);
      spGrd.addColorStop(0, `rgba(${rgb},${fa * 0.8})`);
      spGrd.addColorStop(1, `rgba(${rgb},0)`);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + dx, s.y + dy);
      ctx.strokeStyle = spGrd;
      ctx.lineWidth = Math.max(0.4, s.size * 0.6);
      ctx.stroke();
    }
  }
}

/* ── NightSky Component ── */

function NightSky({ config }: { config?: NightSkyConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    shootingStars: [] as ShootingStar[],
    twinklers: [] as TwinkleStar[],
    skyAngle: 0,
    pivotX: 0,
    pivotY: 0,
    raf: 0,
    rgb: '200,200,200',
    frameCount: 0,
    builtForCount: -1,
    builtW: 0,
    builtH: 0,
  });

  const cfgRef = useRef(NIGHT_SKY_DEFAULTS);
  cfgRef.current = config ?? NIGHT_SKY_DEFAULTS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;

    function readColor() {
      if (!canvas) return;
      const raw = getComputedStyle(canvas).getPropertyValue('--page-text');
      if (raw) state.rgb = cssToRgb(raw);
    }

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function buildTwinklers(W: number, H: number, count: number) {
      state.pivotX = W / 2;
      state.pivotY = H + H * 3.5;
      const pts: [number, number][] = [[0, 0], [W, 0], [0, H], [W, H], [W / 2, 0], [W / 2, H], [0, H / 2], [W, H / 2]];
      let minD = Infinity, maxD = 0;
      for (const [px, py] of pts) {
        const d = Math.hypot(px - state.pivotX, py - state.pivotY);
        if (d < minD) minD = d;
        if (d > maxD) maxD = d;
      }
      minD *= 0.92;
      maxD *= 1.08;
      const total = count * 4;
      state.twinklers = Array.from({ length: total }, () => createTwinkleStar(minD, maxD));
      state.builtForCount = count;
      state.builtW = W;
      state.builtH = H;
    }

    resize();
    readColor();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function loop() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const cfg = cfgRef.current;
      const orbitSpeed = (cfg.drift / 100) * 0.0003;

      state.frameCount++;
      if (state.frameCount % 60 === 0) readColor();

      // Rebuild twinklers if count or canvas size changed
      if (state.builtForCount !== cfg.staticStars || state.builtW !== W || state.builtH !== H) {
        buildTwinklers(W, H, cfg.staticStars);
      }

      state.skyAngle += orbitSpeed;
      ctx.clearRect(0, 0, W, H);
      const rgb = state.rgb;

      // Twinkle stars
      for (const t of state.twinklers) {
        updateTwinkleStar(t, state.frameCount, state.skyAngle, state.pivotX, state.pivotY);
        drawTwinkleStar(ctx, t, rgb);
      }

      // Shooting stars
      if (cfg.shootingStars > 0) {
        const spawnRate = 0.08 + (cfg.shootingStars / 25) * 0.25;
        if (state.shootingStars.length < cfg.shootingStars && Math.random() < spawnRate) {
          state.shootingStars.push(createShootingStar(W));
        }
      }
      if (state.shootingStars.length > cfg.shootingStars) {
        state.shootingStars = state.shootingStars.slice(0, cfg.shootingStars);
      }
      state.shootingStars = state.shootingStars.filter((s) => !s.dead);
      for (const s of state.shootingStars) {
        updateShootingStar(s, W, H);
        drawShootingStar(ctx, s, rgb);
      }

      state.raf = requestAnimationFrame(loop);
    }

    state.raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(state.raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ══════════════════════════════════════════════════════════════════════════════
 * RAIN — Canvas: falling drops with splash + mist
 * ══════════════════════════════════════════════════════════════════════════════ */

const RAIN_DEFAULTS: RainConfig = { drops: 220, speed: 42, angle: 14, splash: 60 };

/* ── Rain Drop ── */

interface RainDrop {
  x: number; y: number;
  vx: number; vy: number;
  len: number;
  alpha: number; width: number;
  dead: boolean;
  splash: RainSplash | null;
}

function createRainDrop(W: number, H: number, cfg: RainConfig, scatter: boolean): RainDrop {
  const angleRad = (cfg.angle * Math.PI) / 180;
  const speedMult = cfg.speed / 100;
  const speed = (4 + Math.random() * 8) * (0.15 + speedMult * 0.85);
  const len = 6 + Math.random() * 18;
  return {
    x: scatter ? Math.random() * (W + 200) - 100 : Math.random() * (W + 300) - 150,
    y: scatter ? Math.random() * H : -len - Math.random() * H * 0.5,
    vx: Math.sin(angleRad) * speed,
    vy: Math.cos(angleRad) * speed,
    len, alpha: 0.15 + Math.random() * 0.45,
    width: 0.3 + Math.random() * 0.7,
    dead: false, splash: null,
  };
}

function updateRainDrop(d: RainDrop, W: number, H: number, splashAmt: number) {
  d.x += d.vx;
  d.y += d.vy;
  if (d.y >= H && !d.splash) {
    if (Math.random() < splashAmt * 0.8) {
      d.splash = createRainSplash(d.x + d.vx * 2, H);
    }
    d.dead = true;
  }
  if (d.x < -50 || d.x > W + 50) d.dead = true;
}

function drawRainDrop(ctx: CanvasRenderingContext2D, d: RainDrop, rgb: string, angleRad: number) {
  const gx = d.x - Math.sin(angleRad) * d.len;
  const gy = d.y - Math.cos(angleRad) * d.len;
  const g = ctx.createLinearGradient(gx, gy, d.x, d.y);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},${d.alpha})`);
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(d.x, d.y);
  ctx.strokeStyle = g;
  ctx.lineWidth = d.width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* ── Rain Splash ── */

interface SplashArc {
  rx: number; ry: number;
  angle: number; life: number;
  decay: number; alpha: number;
}

interface RainSplash {
  x: number; y: number;
  arcs: SplashArc[];
  dead: boolean;
}

function createRainSplash(x: number, y: number): RainSplash {
  const count = 2 + Math.floor(Math.random() * 3);
  const arcs: SplashArc[] = [];
  for (let i = 0; i < count; i++) {
    arcs.push({
      rx: 1 + Math.random() * 5,
      ry: 0.3 + Math.random() * 1.5,
      angle: (Math.random() - 0.5) * 0.6,
      life: 1.0,
      decay: 0.04 + Math.random() * 0.04,
      alpha: 0.25 + Math.random() * 0.25,
    });
  }
  return { x, y, arcs, dead: false };
}

function updateRainSplash(s: RainSplash) {
  let allDead = true;
  for (const a of s.arcs) {
    a.life -= a.decay;
    a.rx += 0.4;
    a.ry += 0.08;
    if (a.life > 0) allDead = false;
  }
  if (allDead) s.dead = true;
}

function drawRainSplash(ctx: CanvasRenderingContext2D, s: RainSplash, rgb: string) {
  for (const a of s.arcs) {
    if (a.life <= 0) continue;
    const alpha = a.alpha * a.life * a.life;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a.angle);
    ctx.scale(1, a.ry / a.rx);
    ctx.beginPath();
    ctx.arc(0, 0, a.rx, Math.PI, 0, false);
    ctx.strokeStyle = `rgba(${rgb},${alpha})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }
}

/* ── Rain Component ── */

function Rain({ config }: { config?: RainConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    drops: [] as RainDrop[],
    splashes: [] as RainSplash[],
    raf: 0,
    rgb: '200,210,230',
    frameCount: 0,
    mistOpacity: 0,
    initialized: false,
  });

  const cfgRef = useRef(RAIN_DEFAULTS);
  cfgRef.current = config ?? RAIN_DEFAULTS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;

    function readColor() {
      if (!canvas) return;
      const raw = getComputedStyle(canvas).getPropertyValue('--page-text');
      if (raw) state.rgb = cssToRgb(raw);
    }

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    resize();
    readColor();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function loop() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const cfg = cfgRef.current;
      const splashAmt = cfg.splash / 100;
      const angleRad = (cfg.angle * Math.PI) / 180;

      state.frameCount++;
      if (state.frameCount % 60 === 0) readColor();

      ctx.clearRect(0, 0, W, H);
      const rgb = state.rgb;

      // Pre-populate on first frame
      if (!state.initialized) {
        for (let i = 0; i < cfg.drops; i++) {
          state.drops.push(createRainDrop(W, H, cfg, true));
        }
        state.initialized = true;
      }

      // Mist at bottom
      if (splashAmt > 0.05) {
        const targetMist = splashAmt * 0.06;
        state.mistOpacity += (targetMist - state.mistOpacity) * 0.02;
        const g = ctx.createLinearGradient(0, H - 60, 0, H);
        g.addColorStop(0, `rgba(${rgb},0)`);
        g.addColorStop(0.5, `rgba(${rgb},${state.mistOpacity})`);
        g.addColorStop(1, `rgba(${rgb},${state.mistOpacity * 0.4})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, H - 60, W, 60);
      }

      // Update + draw splashes
      state.splashes = state.splashes.filter((s) => !s.dead);
      for (const s of state.splashes) {
        updateRainSplash(s);
        drawRainSplash(ctx, s, rgb);
      }

      // Spawn new drops
      if (cfg.speed > 0 && state.drops.length < cfg.drops) {
        const batch = Math.min(cfg.drops - state.drops.length, 8);
        for (let i = 0; i < batch; i++) {
          state.drops.push(createRainDrop(W, H, cfg, false));
        }
      }

      // Cull if count reduced
      if (state.drops.length > cfg.drops) {
        state.drops.splice(cfg.drops);
      }

      // Update angle on all drops so wind change is live
      const newSplashes: RainSplash[] = [];
      state.drops = state.drops.filter((d) => {
        if (d.dead) {
          if (d.splash) newSplashes.push(d.splash);
          return false;
        }
        return true;
      });
      state.splashes.push(...newSplashes);

      for (const d of state.drops) {
        // Re-derive velocity direction from current angle (live wind)
        const totalSpeed = Math.hypot(d.vx, d.vy);
        d.vx = Math.sin(angleRad) * totalSpeed;
        d.vy = Math.cos(angleRad) * totalSpeed;
        updateRainDrop(d, W, H, splashAmt);
        drawRainDrop(ctx, d, rgb, angleRad);
      }

      state.raf = requestAnimationFrame(loop);
    }

    state.raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(state.raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ══════════════════════════════════════════════════════════════════════════════
 * FIREFLIES — Canvas: wandering glowing dots with blink + trail
 * ══════════════════════════════════════════════════════════════════════════════ */

const FIREFLIES_DEFAULTS: FirefliesConfig = { count: 55, speed: 30, glow: 65, pulse: 50 };
const TRAIL_LEN = 18;

/* ── Firefly entity ── */

interface Firefly {
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  targetTimer: number;
  pulsePhase: number; pulseFreq: number;
  blinkState: 'idle' | 'rising' | 'hold' | 'falling';
  blinkTick: number; blinkDur: number; blinkAlpha: number;
  nextBlink: number;
  baseAlpha: number; size: number;
  curAlpha: number;
  trail: { x: number; y: number }[];
}

function createFirefly(W: number, H: number, scatter: boolean): Firefly {
  const x = Math.random() * W;
  const y = scatter ? Math.random() * H : H * 0.2 + Math.random() * H * 0.7;
  return {
    x, y,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    tx: x + (Math.random() - 0.5) * 300,
    ty: y + (Math.random() - 0.5) * 200,
    targetTimer: 60 + Math.random() * 180,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseFreq: 0.012 + Math.random() * 0.025,
    blinkState: 'idle', blinkTick: 0, blinkDur: 0, blinkAlpha: 0,
    nextBlink: 80 + Math.random() * 300,
    baseAlpha: 0.08 + Math.random() * 0.12,
    size: 1.2 + Math.random() * 1.4,
    curAlpha: 0,
    trail: [],
  };
}

function updateFirefly(f: Firefly, W: number, H: number, speedMult: number, pulseRate: number, glowAmt: number) {
  // Wander steering
  const speed = speedMult === 0 ? 0 : 0.3 + speedMult * 1.4;

  if (speedMult > 0) {
    f.targetTimer--;
    if (f.targetTimer <= 0) {
      f.tx = Math.max(20, Math.min(W - 20, f.x + (Math.random() - 0.5) * 340));
      f.ty = Math.max(H * 0.1, Math.min(H * 0.92, f.y + (Math.random() - 0.5) * 200));
      f.targetTimer = 80 + Math.random() * 200;
    }

    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const steer = 0.012 * speed;
    f.vx += (dx / dist) * steer + (Math.random() - 0.5) * 0.06 * speed;
    f.vy += (dy / dist) * steer + (Math.random() - 0.5) * 0.04 * speed;

    const maxSpd = 0.8 * speed;
    const spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    if (spd > maxSpd) { f.vx = (f.vx / spd) * maxSpd; f.vy = (f.vy / spd) * maxSpd; }

    f.x += f.vx;
    f.y += f.vy;

    if (f.x < 10) { f.vx += 0.15; f.tx = W * 0.3 + Math.random() * W * 0.4; }
    if (f.x > W - 10) { f.vx -= 0.15; f.tx = W * 0.3 + Math.random() * W * 0.4; }
    if (f.y < H * 0.05) f.vy += 0.10;
    if (f.y > H * 0.95) f.vy -= 0.10;
  }

  // Trail
  f.trail.push({ x: f.x, y: f.y });
  if (f.trail.length > TRAIL_LEN) f.trail.shift();

  // Blink state machine
  const blinkEnergy = 0.2 + pulseRate * 0.8;
  f.nextBlink--;

  if (f.nextBlink <= 0 && f.blinkState === 'idle') {
    f.blinkState = 'rising';
    f.blinkDur = Math.round(20 + (1 - blinkEnergy) * 40);
    f.blinkTick = 0;
    f.nextBlink = 60 + Math.random() * (280 / blinkEnergy);
  }

  if (f.blinkState === 'rising') {
    f.blinkTick++;
    f.blinkAlpha = f.blinkTick / f.blinkDur;
    if (f.blinkTick >= f.blinkDur) { f.blinkState = 'hold'; f.blinkTick = 0; f.blinkDur = Math.round(8 + Math.random() * 20); }
  } else if (f.blinkState === 'hold') {
    f.blinkTick++;
    f.blinkAlpha = 1;
    if (f.blinkTick >= f.blinkDur) { f.blinkState = 'falling'; f.blinkTick = 0; f.blinkDur = Math.round(30 + (1 - blinkEnergy) * 60); }
  } else if (f.blinkState === 'falling') {
    f.blinkTick++;
    f.blinkAlpha = 1 - f.blinkTick / f.blinkDur;
    if (f.blinkTick >= f.blinkDur) { f.blinkState = 'idle'; f.blinkAlpha = 0; }
  }

  // Pulse
  f.pulsePhase += f.pulseFreq * (0.3 + pulseRate * 0.7);
  const pulse = 0.5 + 0.5 * Math.sin(f.pulsePhase);
  f.curAlpha = f.baseAlpha + pulse * 0.08 + f.blinkAlpha * (0.55 + glowAmt * 0.4);
}

function drawFirefly(ctx: CanvasRenderingContext2D, f: Firefly, rgb: string, glowAmt: number) {
  if (f.trail.length < 2) return;

  const glowR = (3 + glowAmt * 22) * f.size * 0.6;
  const alpha = Math.min(1, f.curAlpha);

  // Trail
  ctx.lineCap = 'round';
  for (let i = 1; i < f.trail.length; i++) {
    const t = i / f.trail.length;
    const ta = t * t * alpha * 0.35;
    ctx.beginPath();
    ctx.moveTo(f.trail[i - 1].x, f.trail[i - 1].y);
    ctx.lineTo(f.trail[i].x, f.trail[i].y);
    ctx.strokeStyle = `rgba(${rgb},${ta})`;
    ctx.lineWidth = t * f.size * 0.9;
    ctx.stroke();
  }

  // Core dot
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb},${Math.min(1, alpha * 1.8)})`;
  ctx.fill();

  // Glow halo
  if (alpha > 0.04) {
    const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
    grd.addColorStop(0, `rgba(${rgb},${alpha * 0.7})`);
    grd.addColorStop(0.25, `rgba(${rgb},${alpha * 0.3})`);
    grd.addColorStop(0.6, `rgba(${rgb},${alpha * 0.07})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    ctx.beginPath();
    ctx.arc(f.x, f.y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }
}

/* ── Fireflies Component ── */

function Fireflies({ config }: { config?: FirefliesConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    flies: [] as Firefly[],
    raf: 0,
    rgb: '140,230,80',
    frameCount: 0,
    initialized: false,
  });

  const cfgRef = useRef(FIREFLIES_DEFAULTS);
  cfgRef.current = config ?? FIREFLIES_DEFAULTS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;

    function readColor() {
      if (!canvas) return;
      // Use accent color for firefly glow, fall back to text color
      const accent = getComputedStyle(canvas).getPropertyValue('--page-accent');
      const text = getComputedStyle(canvas).getPropertyValue('--page-text');
      const raw = accent && accent.trim() ? accent : text;
      if (raw) state.rgb = cssToRgb(raw);
    }

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    resize();
    readColor();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function loop() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const cfg = cfgRef.current;
      const speedMult = cfg.speed / 100;
      const glowAmt = cfg.glow / 100;
      const pulseRate = cfg.pulse / 100;

      state.frameCount++;
      if (state.frameCount % 60 === 0) readColor();

      ctx.clearRect(0, 0, W, H);
      const rgb = state.rgb;

      // Pre-populate on first frame
      if (!state.initialized) {
        for (let i = 0; i < cfg.count; i++) {
          state.flies.push(createFirefly(W, H, true));
        }
        state.initialized = true;
      }

      // Ambient bloom
      if (glowAmt > 0.1) {
        const grd = ctx.createRadialGradient(W * 0.5, H * 0.75, 0, W * 0.5, H * 0.75, W * 0.65);
        const a = glowAmt * 0.035;
        grd.addColorStop(0, `rgba(${rgb},${a})`);
        grd.addColorStop(0.5, `rgba(${rgb},${a * 0.4})`);
        grd.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      // Spawn
      if (state.flies.length < cfg.count) {
        const batch = Math.min(cfg.count - state.flies.length, 3);
        for (let i = 0; i < batch; i++) {
          state.flies.push(createFirefly(W, H, state.frameCount < 5));
        }
      }
      if (state.flies.length > cfg.count) state.flies.splice(cfg.count);

      // Update + draw
      for (const f of state.flies) {
        updateFirefly(f, W, H, speedMult, pulseRate, glowAmt);
        drawFirefly(ctx, f, rgb, glowAmt);
      }

      state.raf = requestAnimationFrame(loop);
    }

    state.raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(state.raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ══════════════════════════════════════════════════════════════════════════════
 * CSS-based effects (Bokeh, Waves)
 * ══════════════════════════════════════════════════════════════════════════════ */

function Bokeh({ t }: { t: number }) {
  const count = Math.round(4 + t * 8);
  const opacityMul = 0.04 + t * 0.12;
  const sizeMul = 0.6 + t * 0.8;

  const circles = useMemo(() => {
    const rng = seededRandom(314);
    return Array.from({ length: count }, (_, i) => {
      const size = (40 + rng() * 120) * sizeMul;
      const drift = 20 + rng() * 40;
      return {
        id: i,
        left: `${-10 + rng() * 110}%`, top: `${-10 + rng() * 110}%`,
        size, blur: 20 + rng() * 40,
        opacity: (0.03 + rng() * 0.08) * opacityMul / 0.08,
        useAccent: rng() > 0.5,
        delay: rng() * 10, duration: 12 + rng() * 18,
        bx1: `${(rng() - 0.5) * drift}px`, by1: `${(rng() - 0.5) * drift}px`, bs1: `${0.85 + rng() * 0.3}`,
        bx2: `${(rng() - 0.5) * drift}px`, by2: `${(rng() - 0.5) * drift}px`, bs2: `${0.85 + rng() * 0.3}`,
        bx3: `${(rng() - 0.5) * drift}px`, by3: `${(rng() - 0.5) * drift}px`, bs3: `${0.85 + rng() * 0.3}`,
      };
    });
  }, [count, opacityMul, sizeMul]);

  return (
    <>
      {circles.map((c) => (
        <div key={c.id} style={{
          position: 'absolute', left: c.left, top: c.top,
          width: c.size, height: c.size, borderRadius: '50%',
          background: c.useAccent ? 'var(--page-accent, var(--page-text))' : 'var(--page-text)',
          opacity: c.opacity, filter: `blur(${c.blur}px)`,
          '--bx1': c.bx1, '--by1': c.by1, '--bs1': c.bs1,
          '--bx2': c.bx2, '--by2': c.by2, '--bs2': c.bs2,
          '--bx3': c.bx3, '--by3': c.by3, '--bs3': c.bs3,
          animation: `bg-bokeh-drift ${c.duration}s ${c.delay}s ease-in-out infinite`,
        } as React.CSSProperties} />
      ))}
    </>
  );
}

function Waves({ t }: { t: number }) {
  const count = Math.round(3 + t * 5);
  const opacityMul = 0.06 + t * 0.14;

  const waves = useMemo(() => {
    const rng = seededRandom(691);
    return Array.from({ length: count }, (_, i) => {
      const amplitude = 8 + rng() * 20;
      const wavelength = 120 + rng() * 200;
      const thick = 1 + rng() * 2;
      const cyclesPerTile = Math.ceil(2000 / wavelength);
      const tileWidth = cyclesPerTile * wavelength;
      return {
        id: i, bottom: `${5 + rng() * 70}%`,
        amplitude, wavelength, thick, tileWidth,
        opacity: (0.04 + rng() * 0.08) * opacityMul / 0.08,
        driftDuration: 8 + rng() * 16,
        swayDuration: 4 + rng() * 8,
        swayAmount: 5 + rng() * 15,
        delay: rng() * 6,
      };
    });
  }, [count, opacityMul]);

  return (
    <>
      {waves.map((w) => (
        <div key={w.id} style={{
          position: 'absolute', bottom: w.bottom, left: 0, width: '100%',
          overflow: 'hidden',
          '--sway': `${w.swayAmount}px`,
          animation: `bg-wave-sway ${w.swayDuration}s ${w.delay}s ease-in-out infinite`,
        } as React.CSSProperties}>
          <svg style={{
            width: w.tileWidth * 2, height: w.amplitude * 2 + 4,
            opacity: w.opacity,
            animation: `bg-wave-drift ${w.driftDuration}s linear infinite`,
          }}>
            <path
              d={generateTiledSinePath(w.wavelength, w.amplitude, w.tileWidth)}
              fill="none" stroke="var(--page-text)"
              strokeWidth={w.thick} strokeLinecap="round"
            />
          </svg>
        </div>
      ))}
    </>
  );
}

function generateTiledSinePath(wavelength: number, amplitude: number, tileWidth: number): string {
  const totalWidth = tileWidth * 2;
  const cy = amplitude + 2;
  const halfWave = wavelength / 2;
  const segments: string[] = [`M 0 ${cy}`];
  for (let x = 0; x < totalWidth; x += halfWave) {
    const cpX = x + halfWave / 2;
    const endX = x + halfWave;
    const direction = (Math.round(x / halfWave) % 2 === 0) ? -1 : 1;
    segments.push(`Q ${cpX} ${cy + direction * amplitude * 2} ${endX} ${cy}`);
  }
  return segments.join(' ');
}
