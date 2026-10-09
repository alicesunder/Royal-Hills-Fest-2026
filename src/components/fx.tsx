import React, { useEffect, useRef, useState } from 'react';

/* ===============================================================
   Winter golf-camp FX kit
   - Atmosphere: embers / fireflies / mist / stars / string lights
   - AutoReveal : scroll-in animation for the homepage sections
   - CountUp    : animated numbers
   - ScrollRail : golf ball that rolls down the whole page
   - ScrollProgressBar : thin gold bar (used in the Navbar)
=============================================================== */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seeded = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------------- particles ---------------- */
export const Embers: React.FC<{ count?: number; rise?: number }> = ({ count = 18, rise = 700 }) => (
  <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ ['--rise' as string]: `${rise}px` } as React.CSSProperties}>
    {Array.from({ length: count }).map((_, i) => {
      const dur = 8 + seeded(i, 3) * 9;
      return (
        <span
          key={i}
          className="fx-ember"
          style={{
            left: `${seeded(i, 1) * 100}%`,
            width: 2 + seeded(i, 2) * 3.5,
            height: 2 + seeded(i, 2) * 3.5,
            background: seeded(i, 6) > 0.5 ? '#FFB347' : '#FF8A3D',
            animationDuration: `${dur}s`,
            animationDelay: `${-seeded(i, 4) * dur}s`,
            ['--dx' as string]: `${(seeded(i, 5) - 0.5) * 140}px`,
          } as React.CSSProperties}
        />
      );
    })}
  </div>
);

export const Fireflies: React.FC<{ count?: number }> = ({ count = 14 }) => (
  <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="fx-firefly"
        style={{
          left: `${seeded(i, 7) * 100}%`,
          top: `${seeded(i, 8) * 100}%`,
          width: 2 + (i % 3),
          height: 2 + (i % 3),
          animationDuration: `${7 + (i % 5) * 2.2}s`,
          animationDelay: `${-seeded(i, 9) * 9}s`,
        }}
      />
    ))}
  </div>
);

export const Stars: React.FC<{ count?: number; height?: string }> = ({ count = 40, height = '45%' }) => (
  <div aria-hidden className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height }}>
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="fx-star"
        style={{
          left: `${seeded(i, 11) * 100}%`,
          top: `${seeded(i, 12) * 100}%`,
          width: 1 + (i % 3) * 0.8,
          height: 1 + (i % 3) * 0.8,
          animationDuration: `${2.5 + seeded(i, 13) * 4}s`,
          animationDelay: `${-seeded(i, 14) * 6}s`,
        }}
      />
    ))}
  </div>
);

export const Mist: React.FC<{ tops?: string[] }> = ({ tops = ['20%', '60%'] }) => (
  <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
    {tops.map((t, i) => (
      <div
        key={i}
        className="fx-mist"
        style={{ top: t, height: 200, animationDuration: `${26 + i * 8}s`, animationDirection: i % 2 ? 'alternate-reverse' : 'alternate' }}
      />
    ))}
  </div>
);

/** Warm bulbs hanging on a sagging cord (camp feel). */
export const StringLights: React.FC<{ swags?: number; perSwag?: number; sag?: number; height?: number; top?: number }> = ({
  swags = 5,
  perSwag = 4,
  sag = 22,
  height = 70,
  top = 0,
}) => {
  const segW = 1000 / swags;
  let d = 'M0 8';
  for (let k = 0; k < swags; k++) d += ` Q ${(k + 0.5) * segW} ${8 + 2 * sag}, ${(k + 1) * segW} 8`;
  const bulbs: { x: number; y: number; i: number }[] = [];
  for (let k = 0; k < swags; k++) {
    for (let j = 1; j <= perSwag; j++) {
      const t = j / (perSwag + 1);
      bulbs.push({ x: ((k + t) * segW) / 10, y: ((8 + 4 * sag * t * (1 - t)) / 100) * 100, i: k * perSwag + j });
    }
  }
  const scale = height / 100;
  return (
    <div aria-hidden className="absolute inset-x-0 pointer-events-none" style={{ top, height }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none" fill="none">
        <path d={d} stroke="#3a2f1c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      {bulbs.map((b) => (
        <span
          key={b.i}
          className="fx-bulb"
          style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${(b.i % 7) * 0.45}s` }}
        />
      ))}
    </div>
  );
};

/** Layer that sits behind a section's content. The section must have `isolate`. */
export const Atmosphere: React.FC<{
  embers?: number;
  fireflies?: number;
  stars?: number;
  mist?: boolean;
  lights?: boolean;
  rise?: number;
}> = ({ embers = 0, fireflies = 0, stars = 0, mist = false, lights = false, rise = 700 }) => (
  <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    {stars > 0 && <Stars count={stars} />}
    {mist && <Mist />}
    {fireflies > 0 && <Fireflies count={fireflies} />}
    {embers > 0 && <Embers count={embers} rise={rise} />}
    {lights && <StringLights top={4} />}
  </div>
);

/* ---------------- count up ---------------- */
export const CountUp: React.FC<{ to: number; duration?: number; className?: string }> = ({ to, duration = 1400, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(reduced() ? to : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref} className={className}>
      {v.toLocaleString('en-US')}
    </span>
  );
};

/* ---------------- auto scroll reveal ---------------- */
const REVEAL_SECTIONS = ['#about', '#experience', '#location', '#faq', '#tickets-preview'];

export const AutoReveal: React.FC = () => {
  useEffect(() => {
    if (reduced() || typeof IntersectionObserver === 'undefined') return;
    const marked = new Set<HTMLElement>();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          el.classList.add('fx-in');
          window.setTimeout(() => {
            el.classList.remove('fx-reveal', 'fx-in', 'fx-from-up', 'fx-from-left', 'fx-from-right', 'fx-from-zoom');
            el.style.removeProperty('--d');
          }, 1800);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );

    const mark = (el: HTMLElement, dir: string, delay: number) => {
      if (marked.has(el) || el.offsetHeight === 0) return;
      marked.add(el);
      el.classList.add('fx-reveal', `fx-from-${dir}`);
      el.style.setProperty('--d', `${Math.min(delay, 520)}ms`);
      io.observe(el);
    };

    const walk = (parent: Element, depth: number) => {
      const kids = [...parent.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
      kids.forEach((child, idx) => {
        const cs = getComputedStyle(child);
        if (cs.position === 'absolute' || cs.position === 'fixed') return;
        if (cs.display === 'grid' && child.children.length > 1 && depth < 2) {
          const gk = [...child.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
          gk.forEach((g, gi) => {
            const dir = gk.length === 2 ? (gi === 0 ? 'left' : 'right') : 'up';
            mark(g, dir, gi * 110);
          });
        } else {
          mark(child, 'up', idx * 90);
        }
      });
    };

    const run = () => {
      REVEAL_SECTIONS.forEach((sel) => {
        const sec = document.querySelector(sel);
        if (!sec) return;
        const container = sec.querySelector('div[class*="max-w"]');
        if (container) walk(container, 0);
      });
    };
    run();
    const t = window.setTimeout(run, 900); // catch late-rendered nodes
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, []);
  return null;
};



/* ---------------- cinematic motion director ----------------
   Global interaction layer: loading reveal, pointer light, custom cursor,
   scroll velocity, and scene activation. All effects are progressively
   enhanced and respect prefers-reduced-motion.
--------------------------------------------------------------- */
export const MotionDirector: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;
    const reduce = reduced();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    root.classList.add('rh-motion-ready');
    if (reduce) root.classList.add('rh-reduced-motion');
    if (coarse) root.classList.add('rh-touch');

    const intro = document.createElement('div');
    intro.className = 'rh-page-intro';
    intro.innerHTML = `
      <div class="rh-page-intro-glow"></div>
      <div class="rh-page-intro-inner">
        <span class="rh-page-intro-kicker">ROYAL HILLS FEST 2026</span>
        <span class="rh-page-intro-line"></span>
        <strong>ONE DAY. ONE PLACE.</strong>
        <small>GOLF · MUSIC · GOOD TIMES</small>
      </div>
    `;
    body.appendChild(intro);

    let introTimer = window.setTimeout(() => intro.classList.add('is-hidden'), reduce ? 180 : 1100);
    let removeTimer = window.setTimeout(() => intro.remove(), reduce ? 700 : 1900);

    let cursor = null as HTMLDivElement | null;
    let cursorDot = null as HTMLDivElement | null;
    let cursorGlow = null as HTMLDivElement | null;
    let raf = 0;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;

    if (!coarse && !reduce) {
      cursor = document.createElement('div');
      cursor.className = 'rh-cursor';
      cursorDot = document.createElement('div');
      cursorDot.className = 'rh-cursor-dot';
      cursorGlow = document.createElement('div');
      cursorGlow.className = 'rh-pointer-glow';
      body.append(cursor, cursorDot, cursorGlow);

      const tick = () => {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        cursor?.style.setProperty('transform', `translate3d(${cx}px,${cy}px,0)`);
        cursorDot?.style.setProperty('transform', `translate3d(${tx}px,${ty}px,0)`);
        cursorGlow?.style.setProperty('transform', `translate3d(${tx}px,${ty}px,0)`);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const onMove = (e: MouseEvent) => {
        tx = e.clientX;
        ty = e.clientY;
        root.style.setProperty('--mouse-x', `${e.clientX}px`);
        root.style.setProperty('--mouse-y', `${e.clientY}px`);
        const target = e.target as HTMLElement | null;
        const interactive = target?.closest('button,a,[data-cursor="interactive"]');
        const artist = target?.closest('.artist-festival-figure,.artist-festival-card');
        cursor?.classList.toggle('is-hover', Boolean(interactive));
        cursor?.classList.toggle('is-artist', Boolean(artist));
        cursorDot?.classList.toggle('is-hover', Boolean(interactive));
        cursorGlow?.classList.toggle('is-artist', Boolean(artist));
      };
      const onLeave = () => {
        root.classList.add('rh-pointer-away');
      };
      const onEnter = () => {
        root.classList.remove('rh-pointer-away');
      };
      window.addEventListener('mousemove', onMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
      document.documentElement.addEventListener('mouseenter', onEnter);

      (MotionDirector as any)._cleanupPointer = () => {
        window.removeEventListener('mousemove', onMove);
        document.documentElement.removeEventListener('mouseleave', onLeave);
        document.documentElement.removeEventListener('mouseenter', onEnter);
      };
    }

    let lastY = window.scrollY;
    let lastT = performance.now();
    let scrollRaf = 0;
    let progressRaf = 0;
    const scenes = Array.from(document.querySelectorAll<HTMLElement>('main section, #tickets-preview > section'));

    const updateSceneProgress = () => {
      progressRaf = 0;
      const vh = window.innerHeight || 1;
      scenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        const span = Math.max(1, vh + rect.height);
        // 0 = just entering from the bottom, 1 = almost fully past the top.
        const progress = clamp((vh - rect.top) / span, 0, 1);
        scene.style.setProperty('--scene-progress', progress.toFixed(4));
        scene.style.setProperty('--scene-shift', `${((progress - 0.5) * -2).toFixed(4)}`);
      });
    };

    const requestSceneProgress = () => {
      // Scene progress drives decorative parallax only. On touch/reduced-motion devices,
      // leave the CSS defaults in place rather than measuring every section on every scroll.
      if (coarse || reduce || progressRaf) return;
      progressRaf = requestAnimationFrame(updateSceneProgress);
    };

    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const now = performance.now();
        const dy = window.scrollY - lastY;
        const dt = Math.max(16, now - lastT);
        const velocity = clamp(Math.abs(dy / dt) * 18, 0, 1);
        root.style.setProperty('--scroll-y', `${window.scrollY}px`);
        root.style.setProperty('--scroll-velocity', velocity.toFixed(3));
        root.classList.toggle('rh-scrolling-fast', velocity > 0.48);
        root.classList.toggle('rh-scrolling-down', dy > 2);
        root.classList.toggle('rh-scrolling-up', dy < -2);
        if (window.scrollY > 90 && dy > 2) root.classList.add('rh-nav-condensed');
        if (dy < -2 || window.scrollY < 40) root.classList.remove('rh-nav-condensed');
        lastY = window.scrollY;
        lastT = now;
        requestSceneProgress();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', requestSceneProgress, { passive: true });

    const magneticTargets = Array.from(document.querySelectorAll<HTMLElement>('.luxury-btn, .hero-cinematic button, .rh-mid-cta button, .rh-final-cta button, .artist-festival-card'))
      .filter((el) => !el.closest('[data-no-magnetic]'));
    const magneticCleanup: Array<() => void> = [];
    if (!coarse && !reduce) {
      magneticTargets.forEach((el) => {
        el.dataset.magnetic = 'true';
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const dx = ((e.clientX - (r.left + r.width / 2)) / Math.max(1, r.width / 2)) * 5;
          const dy = ((e.clientY - (r.top + r.height / 2)) / Math.max(1, r.height / 2)) * 5;
          el.style.setProperty('--mx', `${dx.toFixed(2)}px`);
          el.style.setProperty('--my', `${dy.toFixed(2)}px`);
        };
        const leave = () => {
          el.style.setProperty('--mx', '0px');
          el.style.setProperty('--my', '0px');
        };
        el.addEventListener('mousemove', move, { passive: true });
        el.addEventListener('mouseleave', leave, { passive: true });
        magneticCleanup.push(() => {
          el.removeEventListener('mousemove', move);
          el.removeEventListener('mouseleave', leave);
          delete el.dataset.magnetic;
          el.style.removeProperty('--mx');
          el.style.removeProperty('--my');
        });
      });
    }

    onScroll();
    if (!coarse && !reduce) updateSceneProgress();

    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        el.classList.toggle('rh-scene-active', entry.isIntersecting);
        if (entry.isIntersecting && entry.intersectionRatio > 0.14) {
          el.classList.add('rh-scene-seen');
        }
      });
    }, { threshold: [0.14, 0.35, 0.7], rootMargin: '-10% 0px -12% 0px' }) : null;
    scenes.forEach((scene) => io?.observe(scene));

    const onReady = () => root.classList.add('rh-loaded');
    if (document.readyState === 'complete') onReady();
    else window.addEventListener('load', onReady, { once: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', requestSceneProgress);
      cancelAnimationFrame(scrollRaf);
      cancelAnimationFrame(progressRaf);
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.clearTimeout(introTimer);
      window.clearTimeout(removeTimer);
      intro.remove();
      (MotionDirector as any)._cleanupPointer?.();
      cursor?.remove();
      cursorDot?.remove();
      cursorGlow?.remove();
      magneticCleanup.forEach((fn) => fn());
      root.classList.remove('rh-motion-ready', 'rh-loaded', 'rh-touch', 'rh-reduced-motion', 'rh-scrolling-fast', 'rh-scrolling-down', 'rh-scrolling-up', 'rh-nav-condensed');
      root.style.removeProperty('--scroll-y');
      root.style.removeProperty('--scroll-velocity');
      root.style.removeProperty('--mouse-x');
      root.style.removeProperty('--mouse-y');
    };
  }, []);
  return null;
};

/* ---------------- progress bar (navbar) ---------------- */
export const ScrollProgressBar: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        if (ref.current) ref.current.style.transform = `scaleX(${clamp(window.scrollY / max, 0, 1)})`;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-transparent pointer-events-none">
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-[#D8A934] via-[#FFF1B8] to-[#D8A934] shadow-[0_0_10px_rgba(240,199,90,0.9)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
};

/* ---------------- golf ball that rolls down the page ---------------- */
const RAIL = [
  { id: 'home', label: 'หน้าแรก' },
  { id: 'about', label: 'เกี่ยวกับงาน' },
  { id: 'experience', label: 'ประสบการณ์' },
  { id: 'schedule', label: 'กำหนดการ' },
  { id: 'tickets-preview', label: 'บัตร' },
  { id: 'location', label: 'สถานที่' },
  { id: 'faq', label: 'คำถามที่พบบ่อย' },
];

export const ScrollRail: React.FC = () => {
  const ballRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState('home');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // The rail is hidden below xl in CSS; skip its layout/scroll work on phones and tablets.
    if (window.matchMedia('(max-width: 1279px)').matches) return;

    let tops: number[] = [];
    let raf = 0;

    const layout = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const n = RAIL.length;
      tops = RAIL.map((r, i) => {
        const el = r.id === 'home' ? null : document.getElementById(r.id);
        const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
        return Math.min(top, max - (n - 1 - i) * 60);
      });
      for (let i = 1; i < n; i++) tops[i] = Math.max(tops[i], tops[i - 1] + 1);
    };

    const update = () => {
      raf = 0;
      if (!tops.length) layout();
      const y = window.scrollY;
      const n = RAIL.length;
      let seg = 0;
      for (let i = 0; i < n - 1; i++) if (y >= tops[i]) seg = i;
      const span = Math.max(1, tops[Math.min(n - 1, seg + 1)] - tops[seg]);
      const frac = seg >= n - 1 ? 0 : clamp((y - tops[seg]) / span, 0, 1);
      const P = clamp((seg + frac) / (n - 1), 0, 1);
      if (ballRef.current) ballRef.current.style.top = `${P * 100}%`;
      if (fillRef.current) fillRef.current.style.height = `${P * 100}%`;
      const probe = y + window.innerHeight * 0.4;
      let cur = RAIL[0].id;
      RAIL.forEach((r, i) => {
        if (probe >= tops[i]) cur = r.id;
      });
      setActive((p) => (p === cur ? p : cur));
      setShown(y > 120);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      layout();
      onScroll();
    };

    layout();
    update();
    const t1 = window.setTimeout(onResize, 700);
    const t2 = window.setTimeout(onResize, 2200);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const go = (id: string) => {
    if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      aria-label="ตำแหน่งการเลื่อนหน้า"
      className={`hidden xl:block fixed right-3 top-1/2 -translate-y-1/2 z-40 w-6 h-[52vh] transition-opacity duration-500 ${
        shown ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-[#F0C75A]/25" />
      <div
        ref={fillRef}
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] bg-gradient-to-b from-[#F4D27A] to-[#FFF1B8] shadow-[0_0_10px_rgba(240,199,90,0.9)]"
        style={{ height: 0 }}
      />
      {RAIL.map((r, i) => (
        <button
          key={r.id}
          type="button"
          onClick={() => go(r.id)}
          aria-label={r.label}
          className="group absolute left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer p-1.5"
          style={{ top: `${(i / (RAIL.length - 1)) * 100}%` }}
        >
          <span
            className={`block rounded-full border transition-all duration-300 ${
              active === r.id
                ? 'w-3 h-3 bg-[#D8A934] border-[#FFF1B8] shadow-[0_0_12px_rgba(240,199,90,0.9)]'
                : 'w-2 h-2 bg-[#10140F] border-[#F0C75A]/60 group-hover:bg-[#D8A934]'
            }`}
          />
          <span className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#D8A934]/50 bg-[#0c100a]/90 px-3 py-1 text-[11px] text-[#F3E7C8] opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
            {r.label}
          </span>
        </button>
      ))}
      <div ref={ballRef} className="absolute left-1/2 z-10 pointer-events-none" style={{ top: 0 }}>
        <div className="-translate-x-1/2 -translate-y-1/2 w-[15px] h-[15px] rounded-full bg-[radial-gradient(circle_at_32%_28%,#fff,#d9d4c6_70%)] shadow-[0_0_14px_4px_rgba(255,241,184,0.9),0_0_30px_8px_rgba(216,169,52,0.5)]" />
      </div>
    </div>
  );
};
