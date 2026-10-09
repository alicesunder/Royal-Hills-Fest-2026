import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Compass,
  Trophy,
  Trees,
  Check,
} from 'lucide-react';
import heroImg from '../assets/images/hero_royal_hills_1791251800907.jpg';
import venueImg from '../assets/images/venue_resort_spa_1791251845700.jpg';
import golfImg from '../assets/images/exp_golf_resort_1791251812446.jpg';

interface HeroProps {
  onRegisterClick: () => void;
  onExploreClick: () => void;
}

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

const getTimeLeft = (): TimeLeft => {
  const target = new Date('2026-11-14T07:30:00+07:00').getTime();
  const diff = Math.max(0, target - Date.now());
  const total = Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

const pad = (value: number) => value.toString().padStart(2, '0');

// Ambient floating particles
const EMBERS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: (i * 31 + 7) % 95,
  size: (i % 3) + 2,
  delay: (i * 0.7) % 8,
  duration: 6 + (i % 5) * 2,
  drift: ((i % 2 === 0 ? 1 : -1) * (15 + (i % 20))),
}));

export const Hero: React.FC<HeroProps> = ({ onRegisterClick, onExploreClick }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());
  const [activeMood, setActiveMood] = useState<'all' | 'golf' | 'music' | 'campfire'>('all');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const id = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setMousePos({ x, y });
  };

  const countdown = useMemo(
    () => [
      ['DAYS', pad(timeLeft.days), 'วัน'],
      ['HOURS', pad(timeLeft.hours), 'ชั่วโมง'],
      ['MINUTES', pad(timeLeft.minutes), 'นาที'],
      ['SECONDS', pad(timeLeft.seconds), 'วินาที'],
    ],
    [timeLeft],
  );

  return (
    <section
      onMouseMove={handleMouseMove}
      className="hero-cinematic relative min-h-[100svh] flex flex-col justify-between items-center text-center px-4 sm:px-6 pt-24 sm:pt-28 pb-10 overflow-hidden bg-[#0c100b]" data-motion-scene="hero"
    >
      {/* ========================================================
          BACKGROUND: CINEMATIC MULTI-LAYER MOUNTAIN & GOLF VISUAL
          ======================================================== */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Main Background Imagery with Parallax subtle shift */}
        <div
          className="absolute inset-0 transition-transform duration-1000 ease-out will-change-transform"
          style={{
            transform: `scale(1.06) translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px, 0)`,
          }}
        >
          <img
            src={heroImg}
            alt="Royal Hills Fest 2026 บรรยากาศขุนเขาและกอล์ฟรีสอร์ท นครนายก"
            className="hero-image absolute inset-0 w-full h-full object-cover object-center"
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Cinematic Vignette, Dark Forest Green & Amber sunset overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0e0a]/85 via-[#10140F]/45 to-[#0b0e0a]/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e0a]/85 via-transparent to-[#0b0e0a]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0b0e0a_80%)] opacity-75" />

        {/* Ambient Sunset/Campfire Warm Orb */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] bg-gradient-to-br from-[#D8A934]/18 via-[#C96F3D]/12 to-transparent rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute top-[20%] left-[20%] w-[380px] h-[380px] bg-[#2d5022]/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Mountain Silhouette / Contour Lines SVG Overlay */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
            <path
              d="M-50 480 Q 240 380, 520 440 T 1080 390 Q 1280 430, 1500 400 L 1500 900 L -50 900 Z"
              fill="#10180f"
              opacity="0.6"
            />
            <path
              d="M-50 560 Q 320 490, 720 540 T 1500 510 L 1500 900 L -50 900 Z"
              fill="#080e07"
              opacity="0.8"
            />
            <path
              d="M-50 440 Q 240 360, 520 410 T 1080 370 Q 1280 400, 1500 370"
              stroke="#D8A934"
              strokeWidth="0.8"
              strokeDasharray="4 6"
              opacity="0.35"
            />
          </svg>
        </div>

        {/* Floating Campfire Embers & Starlight Particles */}
        {EMBERS.map((ember) => (
          <span
            key={ember.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${ember.left}%`,
              bottom: '12%',
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              backgroundColor: ember.id % 3 === 0 ? '#FFF9ED' : ember.id % 2 === 0 ? '#D8A934' : '#C96F3D',
              boxShadow: `0 0 ${ember.size * 3}px ${ember.id % 2 === 0 ? '#D8A934' : '#C96F3D'}`,
              animation: `rh-firefly ${ember.duration}s linear infinite`,
              animationDelay: `${ember.delay}s`,
              opacity: 0,
            }}
          />
        ))}

        {/* Film grain / editorial atmosphere */}
        <div className="hero-scan absolute inset-y-0 left-[-25%] w-[35%] opacity-40" />
      </div>

      {/* ========================================================
          TOP BRANDING ROW: EVENT BADGES & VERIFIED DESTINATION
          ======================================================== */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-4 hero-motion-top">
        {/* Left Badge: Certified Luxury Event */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#182719]/80 border border-[#D8A934]/40 backdrop-blur-md shadow-xl text-left">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#FFF9ED] to-[#D8A934] text-[#10140F]">
            <Sparkles className="w-3.5 h-3.5 text-[#10140F]" />
          </span>
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-[#D8A934] leading-tight">
              EXCLUSIVE ONE-DAY FESTIVAL
            </p>
            <p className="text-[11px] text-[#F3E7C8]/90 font-medium leading-tight">
              14 พฤศจิกายน 2569 · ROYAL HILLS นครนายก
            </p>
          </div>
        </div>

        {/* Right Badge: 3 Pillars quick chips */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#F3E7C8]/80">
          <span className="px-3 py-1.5 rounded-full bg-[#10140F]/70 border border-[#30391E] flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-[#D8A934]" /> 18-HOLE GOLF
          </span>
          <span className="px-3 py-1.5 rounded-full bg-[#10140F]/70 border border-[#30391E] flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-[#D8A934]" /> LIVE CONCERT
          </span>
          <span className="px-3 py-1.5 rounded-full bg-[#10140F]/70 border border-[#30391E] flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-[#C96F3D]" /> CAMPFIRE
          </span>
        </div>
      </div>

      {/* ========================================================
          HERO CORE: EDITORIAL HEADLINE & GOLD TYPOGRAPHY
          ======================================================== */}
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center my-auto py-6 sm:py-8 hero-motion-core">
        {/* Subtle decorative gold line & kicker */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-[#D8A934]" />
          <p className="font-mono text-xs sm:text-sm font-bold tracking-[0.35em] uppercase text-[#D8A934] drop-shadow">
            GOLF <span className="text-[#FFF9ED]">·</span> MUSIC <span className="text-[#FFF9ED]">·</span> GOOD TIMES
          </p>
          <span className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-[#D8A934]" />
        </div>

        {/* MASTER EVENT TITLE: LUXURY EDITORIAL SERIF */}
        <div className="text-center relative">
          {/* Subtle gold back-glow behind main title */}
          <div className="absolute inset-0 bg-[#D8A934]/10 blur-3xl rounded-full -z-10" />

          <h1 className="hero-main-title font-display tracking-tight text-[#FFF9ED] select-none leading-[0.9]">
            <span className="hero-main-title-line block text-[clamp(2.05rem,8.9vw,3.65rem)] sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-[-0.04em] drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              ROYAL HILLS
            </span>
            <div className="flex items-baseline justify-center gap-3 sm:gap-6 mt-1 sm:mt-2">
              <span className="hero-fest-word font-display text-[clamp(2rem,8vw,2.85rem)] sm:text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-[#FFF9ED] via-[#F5D061] to-[#D8A934] bg-clip-text text-transparent drop-shadow-[0_8px_30px_rgba(216,169,52,0.4)]">
                FEST
              </span>
              <span className="hero-year-word font-mono text-[clamp(1.5rem,6.1vw,2.4rem)] sm:text-5xl md:text-6xl lg:text-7xl font-extralight tracking-[0.14em] text-[#F3E7C8]/90">
                2026
              </span>
            </div>
          </h1>
        </div>

        {/* Narrative Thai Sub-headline with luxury feel */}
        <div className="mt-5 sm:mt-7 max-w-2xl mx-auto px-4">
          <p className="font-editorial text-lg sm:text-2xl md:text-3xl text-[#FFF9ED]/95 leading-snug drop-shadow-md">
            สัมผัสประสบการณ์ออกรอบกอล์ฟ 18 หลุมท่ามกลางทิวเขา
            <span className="block text-[#F3E7C8]/85 text-base sm:text-xl font-light mt-1.5">
              เคล้าดนตรีสดใต้แสงดาว และกองไฟอุ่นยามค่ำคืน ณ นครนายก
            </span>
          </p>
        </div>

        {/* Event Date & Location Pill Anchor */}
        <div className="hero-event-pill mt-6 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-mono text-[#F3E7C8] bg-[#141d13]/85 border border-[#30391E] px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md">
          <span className="flex items-center gap-2 font-semibold text-[#FFF9ED]">
            <Calendar className="w-4 h-4 text-[#D8A934]" />
            วันเสาร์ที่ 14 พฤศจิกายน 2569
          </span>
          <span className="text-[#65705A] hidden sm:inline">|</span>
          <span className="flex items-center gap-2 text-[#F3E7C8]/90">
            <MapPin className="w-4 h-4 text-[#C96F3D]" />
            รอยัลฮิลส์ กอล์ฟ รีสอร์ท แอนด์ สปา (สาริกา, นครนายก)
          </span>
        </div>

        {/* ========================================================
            PREMIUM COUNTDOWN CLOCK: LUXURY GOLF CLUB TIMER
            ======================================================== */}
        <div className="mt-7 sm:mt-9 w-full max-w-md mx-auto">
          <div className="hero-countdown-grid grid grid-cols-4 gap-2 sm:gap-3 p-2 rounded-2xl bg-[#0c120c]/85 border border-[#D8A934]/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            {countdown.map(([enLabel, val, thLabel]) => (
              <div
                key={enLabel}
                className="flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-1 rounded-xl bg-gradient-to-b from-[#182719] to-[#0f1710] border border-[#30391E]/60 shadow-inner group hover:border-[#D8A934]/60 transition-colors"
              >
                <span className="font-mono text-2xl sm:text-3xl font-bold text-[#FFF9ED] tabular-nums tracking-tight group-hover:text-[#D8A934] transition-colors">
                  {val}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.18em] text-[#D8A934] mt-0.5 uppercase">
                  {enLabel}
                </span>
                <span className="text-[9px] text-[#65705A] hidden sm:block font-light">
                  {thLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            CALL TO ACTION BUTTONS: HIGH-CONVERSION & LUXURY
            ======================================================== */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
          {/* Primary: Buy Ticket CTA */}
          <button
            onClick={onRegisterClick}
            className="cursor-pointer group relative w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-4.5 rounded-full bg-gradient-to-r from-[#F5D061] via-[#D8A934] to-[#b8851b] text-[#10140F] font-mono text-xs sm:text-sm font-black tracking-wider uppercase shadow-[0_0_35px_rgba(216,169,52,0.45)] hover:shadow-[0_0_50px_rgba(216,169,52,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 overflow-hidden"
          >
            {/* Shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out" />
            <Sparkles className="w-4 h-4 text-[#10140F]" />
            <span>ซื้อบัตรเข้าร่วมงาน</span>
            <span className="text-[11px] font-normal opacity-75 hidden sm:inline">(เริ่มต้น 555.-)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary: Explore Journey */}
          <button
            onClick={onExploreClick}
            className="cursor-pointer group w-full sm:w-auto px-7 sm:px-8 py-4 rounded-full bg-[#182719]/90 hover:bg-[#223824] text-[#FFF9ED] border border-[#D8A934]/50 hover:border-[#FFF9ED] font-mono text-xs sm:text-sm font-bold tracking-wider uppercase backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(216,169,52,0.25)]"
          >
            <span>สำรวจประสบการณ์</span>
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform text-[#D8A934]" />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="hero-trust-badges mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#F3E7C8]/75 font-mono">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#D8A934]" /> รับบัตรดิจิทัลพร้อม QR หลังอนุมัติ
          </span>
          <span className="text-[#30391E]">•</span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#D8A934]" /> ริสแบนด์เข้างานเฉพาะบุคคล
          </span>
          <span className="text-[#30391E]">•</span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#D8A934]" /> รองรับชำระผ่าน PromptPay QR
          </span>
        </div>
      </div>

      {/* ========================================================
          BOTTOM SCROLL INDICATOR: SUBTLE & ELEGANT
          ======================================================== */}
      <div className="relative z-10 flex flex-col items-center gap-1 text-[10px] font-mono tracking-[0.25em] text-[#F3E7C8]/60 uppercase pt-2">
        <button
          onClick={onExploreClick}
          className="cursor-pointer group flex flex-col items-center gap-1 hover:text-[#D8A934] transition-colors"
          aria-label="เลื่อนลงเพื่อสำรวจงาน"
        >
          <span>SCROLL TO EXPLORE COURSE</span>
          <ChevronDown className="w-4 h-4 text-[#D8A934] animate-bounce group-hover:translate-y-1 transition-transform" />
        </button>
      </div>
    </section>
  );
};
