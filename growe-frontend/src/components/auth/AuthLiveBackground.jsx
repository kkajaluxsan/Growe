import { useEffect, useRef, useState, useCallback } from 'react';

const G = 76;
const G2 = 245;
const G3 = 183;

/**
 * Live animated background for auth pages: rotating aurora mesh, floating orbs,
 * canvas particle network, light sweep. Respects prefers-reduced-motion.
 */
export default function AuthLiveBackground() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeRef.current = { w, h, dpr };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = w * h;
    const count = Math.min(90, Math.max(38, Math.floor(area / 15000)));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.6 + 0.35,
        ph: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = list;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initParticles();
    const ro = new ResizeObserver(() => initParticles());
    if (wrapRef.current) ro.observe(wrapRef.current);

    const tick = (t) => {
      const { w, h } = sizeRef.current;
      if (w < 2 || h < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      const particles = particlesRef.current;
      const pulse = 0.88 + 0.12 * Math.sin(t * 0.0008);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.ph += 0.012;
        if (p.x <= 0 || p.x >= w) p.vx *= -1;
        if (p.y <= 0 || p.y >= h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }

      const linkDist = Math.min(135, Math.max(95, w * 0.12));
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * 0.15 * pulse;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${G},${G2},${G3},${alpha})`;
            ctx.lineWidth = 0.55;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const tw = 0.28 + 0.08 * Math.sin(p.ph + t * 0.0015);
        ctx.beginPath();
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grd.addColorStop(0, `rgba(${G},${G2},${G3},${tw + 0.14})`);
        grd.addColorStop(0.5, `rgba(${G},${G2},${G3},${tw * 0.45})`);
        grd.addColorStop(1, `rgba(${G},${G2},${G3},0)`);
        ctx.fillStyle = grd;
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, initParticles]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Slow-rotating soft aurora */}
      {!reducedMotion && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2 animate-auth-aurora opacity-75"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(76,245,183,0.1), rgba(111,248,200,0.06), rgba(46,232,160,0.08), rgba(76,245,183,0.07), rgba(111,248,200,0.05), rgba(76,245,183,0.1))',
          }}
        />
      )}

      {/* Base green washes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% -15%, rgba(76, 245, 183, 0.22), transparent 58%), radial-gradient(ellipse 75% 60% at 100% 100%, rgba(46, 232, 160, 0.15), transparent 55%), radial-gradient(ellipse 50% 45% at 0% 90%, rgba(111, 248, 200, 0.11), transparent 50%)',
        }}
      />

      {/* Floating orbs */}
      {!reducedMotion && (
        <>
          <div className="absolute -left-[18%] top-[8%] h-[min(52vw,30rem)] w-[min(52vw,30rem)] animate-auth-blob-1 rounded-full bg-growe/22 blur-[100px]" />
          <div className="absolute -right-[12%] bottom-[3%] h-[min(58vw,34rem)] w-[min(58vw,34rem)] animate-auth-blob-2 rounded-full bg-growe-dark/18 blur-[115px]" />
          <div className="absolute left-[20%] top-[55%] h-[14rem] w-[14rem] animate-auth-blob-3 rounded-full bg-growe-light/20 blur-[80px]" />
        </>
      )}

      {reducedMotion && (
        <div className="absolute -left-[18%] top-[8%] h-72 w-72 rounded-full bg-growe/14 blur-[90px]" />
      )}

      {/* Particle canvas */}
      {!reducedMotion && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-[0.48]" aria-hidden />
      )}

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage: `linear-gradient(rgba(46, 232, 160, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(46, 232, 160, 0.08) 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
        }}
      />

      {/* Moving light sweep — mint highlight */}
      {!reducedMotion && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-y-[18%] left-0 h-[136%] w-[38%] animate-auth-sweep bg-gradient-to-r from-transparent via-growe/18 to-transparent opacity-70 blur-[1px]" />
        </div>
      )}

      {/* Soft vignette — keeps focus on center / form */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 88% 78% at 50% 48%, transparent 0%, rgba(255,255,255,0.52) 100%)',
        }}
      />
    </div>
  );
}
