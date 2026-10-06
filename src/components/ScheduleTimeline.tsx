import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Flag,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';

import hole1Img from '../assets/images/venue_resort_spa_1791251845700.jpg';
import hole2Img from '../assets/images/exp_golf_resort_1791251812446.jpg';
import hole3Img from '../assets/images/exp_campfire_lounge_1791251835632.jpg';
import hole4Img from '../assets/images/exp_music_stage_1791251823402.jpg';
import hole5Img from '../assets/images/schedule_hole5_lounge_1791255601050.jpg';
import courseBg from '../assets/images/schedule_golf_map_bg_1791255616900.jpg';

/* ===============================================================
   DATA
=============================================================== */
interface CourseHole {
  holeNumber: number;
  time: string;
  title: string;
  location: string;
  ghostLabel: string;
  image: string;
  side: 'left' | 'right'; // side of the green (desktop)
  cardLeft: string;
  description: string;
  highlights: string[];
}

const COURSE_HOLES: CourseHole[] = [
  {
    holeNumber: 1,
    time: '07:30 – 08:30 น.',
    title: 'WELCOME TEE-OFF',
    location: 'Clubhouse Terrace',
    ghostLabel: 'CLUBHOUSE TERRACE',
    image: hole1Img,
    side: 'left',
    cardLeft: '27%',
    description:
      'จุดลงทะเบียนรับบัตรเข้างานและ Wristband ประจำตัว รับถุงของที่ระลึก Welcome Bag จิบ Specialty Drip Coffee อุ่นๆ ชมวิวแฟร์เวย์ยามเช้าท่ามกลางสายหมอกขุนเขา',
    highlights: ['ลงทะเบียนรับบัตร & สายรัดข้อมือ', 'Specialty Coffee & อาหารเช้าต้อนรับ', 'รับชุดของที่ระลึก Welcome Bag'],
  },
  {
    holeNumber: 2,
    time: '09:30 – 12:30 น.',
    title: 'ROYAL HILLS INVITATIONAL',
    location: 'Championship Course',
    ghostLabel: 'CHAMPIONSHIP COURSE',
    image: hole2Img,
    side: 'right',
    cardLeft: '22%',
    description:
      'การแข่งขันกอล์ฟออกรอบแบบช็อตกันสตาร์ท (Shotgun Start) 18 หลุม ท่ามกลางทิวเขาธรรมชาติ พร้อมรางวัลพิเศษ Hole-in-One, Near Pin, Longest Drive และซุ้มอาหารว่างประจำหลุม',
    highlights: ['ช็อตกันสตาร์ท 18 หลุมพร้อมกัน', 'ชิงรางวัล Hole-in-One และ Near Pin', 'จุดพัก Refreshment Bar ประจำซุ้ม'],
  },
  {
    holeNumber: 3,
    time: '16:00 – 18:00 น.',
    title: 'SUNSET CAMPFIRE & CRAFT',
    location: 'Pine Forest Lawn',
    ghostLabel: 'PINE FOREST LAWN',
    image: hole3Img,
    side: 'left',
    cardLeft: '29%',
    description:
      'พักผ่อนบนเก้าอี้แคมป์ปิ้งรอบกองไฟอุ่น ชมพระอาทิตย์ลับเหลี่ยมเขา เสิร์ฟบาร์บีคิวรมควัน Smoked Brisket และคราฟต์ดริ้งก์ยามเย็น เคล้าเสียงดนตรีโฟล์กอะคูสติก',
    highlights: ['จุดกองไฟไลฟ์สไตล์ & วิวพาโนรามา', 'บาร์บีคิวรมควัน Smoked Brisket', 'ดนตรีโฟล์กอะคูสติกเบาสบาย'],
  },
  {
    holeNumber: 4,
    time: '18:30 – 22:00 น.',
    title: 'FOREST LIVE CONCERT',
    location: 'Main Stage Amphitheater',
    ghostLabel: 'MAIN STAGE AMPHITHEATER',
    image: hole4Img,
    side: 'right',
    cardLeft: '25%',
    description:
      'คอนเสิร์ตใหญ่เต็มรูปแบบกลางป่าสนธรรมชาติ แสงสีเสียงอลังการใต้ท้องฟ้าพร่างดาว เต็มอิ่มกับไลน์อัพศิลปินรับเชิญ และโซนอาหารเครื่องดื่มพรีเมียม',
    highlights: ['เวทีดนตรีสดเวทีกลางป่าสนธรรมชาติ', 'การแสดงหลักจากไลน์อัพศิลปินรับเชิญ', 'โซนอาหารสตรีทฟู้ด & บาร์เครื่องดื่ม'],
  },
  {
    holeNumber: 5,
    time: '22:00 – 23:30 น.',
    title: 'THE 19TH HOLE CELEBRATION',
    location: 'Grand Complex Club & Spa Lounge',
    ghostLabel: 'GRAND COMPLEX CLUB & SPA LOUNGE',
    image: hole5Img,
    side: 'left',
    cardLeft: '26%',
    description:
      'พิธีมอบถ้วยรางวัลเกียรติยศ Royal Hills Trophy การแสดงดนตรีส่งท้ายรอบกองไฟใหญ่ ชนแก้วสังสรรค์ และบริการรถ Shuttle ส่งกลับที่พักรีสอร์ทอย่างปลอดภัย',
    highlights: ['พิธีมอบถ้วยเกียรติยศ Royal Hills Trophy', 'Acoustic Jam ปิดท้ายค่ำคืนอย่างอบอุ่น', 'บริการรถ Shuttle ส่งกลับที่พักรีสอร์ท'],
  },
];

type Filter = 'all' | number;

/* Desktop map geometry (px) */
const ROW_H = 270;
const HOLE_Y = [135, 405, 675, 945, 1215];
const FINAL_Y = 1500;
const MAP_H = 1700;
const TRAIL = 9;

const buildPath = (W: number) => {
  const x = (v: number) => +((v * W) / 1000).toFixed(1);
  return (
    `M${x(120)} 135 C ${x(120)} 240, ${x(260)} 270, ${x(500)} 270 ` +
    `S ${x(840)} 290, ${x(840)} 405 C ${x(840)} 510, ${x(740)} 540, ${x(500)} 540 ` +
    `S ${x(120)} 560, ${x(120)} 675 C ${x(120)} 780, ${x(260)} 810, ${x(500)} 810 ` +
    `S ${x(840)} 830, ${x(840)} 945 C ${x(840)} 1050, ${x(740)} 1080, ${x(500)} 1080 ` +
    `S ${x(120)} 1100, ${x(120)} 1215 C ${x(120)} 1320, ${x(260)} 1350, ${x(400)} 1400 ` +
    `S ${x(500)} 1430, ${x(500)} ${FINAL_Y}`
  );
};

const FIREFLIES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 97,
  top: (i * 53 + 7) % 96,
  size: 2 + (i % 3),
  delay: (i * 0.9) % 7,
  dur: 7 + (i % 5) * 2.2,
}));

const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  a: (360 / 16) * i,
  d: 70 + (i % 3) * 26,
  delay: (i % 4) * 0.12,
}));

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ===============================================================
   STYLES (animations)
=============================================================== */
const STYLES = `
@keyframes rh-firefly {
  0%   { transform: translate(0,0) scale(.6); opacity: 0; }
  20%  { opacity: .95; }
  50%  { transform: translate(18px,-26px) scale(1); opacity: .35; }
  80%  { opacity: .9; }
  100% { transform: translate(-10px,-54px) scale(.6); opacity: 0; }
}
@keyframes rh-mist {
  0%   { transform: translateX(-6%); }
  100% { transform: translateX(6%); }
}
@keyframes rh-title {
  0%   { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}
@keyframes rh-ripple {
  0%   { transform: scale(.7); opacity: .9; }
  100% { transform: scale(2.1); opacity: 0; }
}
@keyframes rh-flag {
  0%,100% { transform: skewY(0deg) scaleX(1); }
  30%     { transform: skewY(5deg) scaleX(.9); }
  65%     { transform: skewY(-4deg) scaleX(1.04); }
}
@keyframes rh-halo {
  0%,100% { transform: scale(1); opacity: .75; }
  50%     { transform: scale(1.25); opacity: 1; }
}
@keyframes rh-sweep {
  0%   { transform: translateX(-130%); }
  100% { transform: translateX(130%); }
}
@keyframes rh-spark {
  0%   { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1; }
  100% { transform: rotate(var(--a)) translateX(var(--d)) scale(.2); opacity: 0; }
}
@keyframes rh-bob {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}

.rh-title {
  background: linear-gradient(100deg,#FFF9ED 0%,#FFF9ED 38%,#F7D97A 50%,#FFF9ED 62%,#FFF9ED 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
  animation: rh-title 7s linear infinite;
  filter: drop-shadow(0 4px 14px rgba(0,0,0,.65));
}
.rh-firefly { position:absolute; border-radius:9999px; background:#FFE9A0;
  box-shadow: 0 0 8px 2px rgba(255,214,102,.8); animation: rh-firefly linear infinite; }
.rh-mist { position:absolute; left:-10%; width:120%; height:220px; pointer-events:none;
  background: radial-gradient(ellipse at center, rgba(235,240,230,.10), transparent 70%);
  filter: blur(18px); animation: rh-mist 26s ease-in-out infinite alternate; }

/* --- golf ball --- */
.rh-ball { position:absolute; left:-13px; top:-13px; width:26px; height:26px; border-radius:9999px;
  overflow:hidden;
  background: radial-gradient(circle at 34% 30%, #ffffff 0%, #f3efe6 42%, #bdb7a8 100%);
  box-shadow: inset -3px -4px 6px rgba(0,0,0,.28), 0 0 14px 4px rgba(255,241,184,.85), 0 0 38px 12px rgba(216,169,52,.55);
  transition: transform .7s cubic-bezier(.5,0,.2,1), opacity .5s; }
.rh-ball::after { content:''; position:absolute; inset:0; border-radius:inherit;
  background: radial-gradient(circle at 30% 24%, rgba(255,255,255,.95), transparent 42%); pointer-events:none; }
.rh-dimples { position:absolute; inset:-6px;
  background-image: radial-gradient(circle, rgba(60,55,40,.28) 1.1px, transparent 1.9px);
  background-size: 5.5px 5.5px; }
.rh-ball-drop { transform: translateY(9px) scale(.12); opacity: 0; }
.rh-halo { position:absolute; left:-30px; top:-30px; width:60px; height:60px; border-radius:9999px;
  background: radial-gradient(circle, rgba(255,233,160,.55), rgba(216,169,52,.18) 55%, transparent 72%);
  animation: rh-halo 1.8s ease-in-out infinite; }
.rh-bshadow { position:absolute; left:-12px; top:8px; width:24px; height:9px; border-radius:50%;
  background: rgba(0,0,0,.55); filter: blur(3px); }

/* --- hole greens --- */
.rh-ripple { position:absolute; inset:0; border-radius:9999px; border:2px solid rgba(247,217,122,.85);
  animation: rh-ripple 2.2s ease-out infinite; pointer-events:none; }
.rh-flagpath { transform-box: fill-box; transform-origin: left center; animation: rh-flag 2.6s ease-in-out infinite; }

/* --- cards --- */
.rh-card { position:relative; overflow:hidden; }
.rh-card-sweep { position:absolute; inset:0; pointer-events:none; transform: translateX(-130%);
  background: linear-gradient(105deg, transparent 38%, rgba(255,241,184,.22) 50%, transparent 62%); }
.rh-card:hover .rh-card-sweep, .rh-card-on .rh-card-sweep { animation: rh-sweep 1.2s ease-out; }

/* --- finale --- */
.rh-spark { position:absolute; left:0; top:0; width:6px; height:6px; margin:-3px 0 0 -3px; border-radius:9999px;
  background:#FFE9A0; box-shadow: 0 0 10px 3px rgba(255,214,102,.9);
  animation: rh-spark 1.4s ease-out infinite; }
.rh-final-on h3 { text-shadow: 0 0 28px rgba(240,199,90,.85), 0 3px 10px rgba(0,0,0,.8); }

/* --- isometric golf hole styling --- */
.rh-iso-hole {
  position: relative;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease;
  will-change: transform;
}
.rh-iso-hole:hover {
  transform: translateY(-4px) scale(1.05);
}

@media (prefers-reduced-motion: reduce) {
  .rh-firefly, .rh-mist, .rh-title, .rh-ripple, .rh-flagpath, .rh-halo, .rh-spark { animation: none !important; }
}
`;

/* ===============================================================
   SMALL PIECES
=============================================================== */
const useBallRefs = () => ({
  ball: useRef<HTMLDivElement>(null),
  spin: useRef<HTMLDivElement>(null),
  trail: useRef<(HTMLDivElement | null)[]>([]),
});
type BallRefs = ReturnType<typeof useBallRefs>;

const GolfBall: React.FC<{ refs: BallRefs; finished: boolean }> = ({ refs, finished }) => (
  <>
    {Array.from({ length: TRAIL }).map((_, i) => {
      const s = 15 - i * 1.4;
      return (
        <div
          key={i}
          ref={(el) => {
            refs.trail.current[i] = el;
          }}
          className="absolute top-0 left-0 rounded-full pointer-events-none z-[25]"
          style={{
            width: s,
            height: s,
            marginLeft: -s / 2,
            marginTop: -s / 2,
            background: 'radial-gradient(circle,#FFF4C4,#E7B93F)',
            opacity: 0,
            filter: 'blur(1.2px)',
            willChange: 'transform',
          }}
        />
      );
    })}
    <div ref={refs.ball} className="absolute top-0 left-0 z-30 pointer-events-none" style={{ willChange: 'transform', opacity: 0 }}>
      <div className="rh-halo" />
      <div className="rh-bshadow" />
      <div className={`rh-ball ${finished ? 'rh-ball-drop' : ''}`}>
        <div ref={refs.spin} className="rh-dimples" />
      </div>
    </div>
  </>
);

const FlagTag: React.FC<{ n: number; small?: boolean }> = ({ n, small }) => (
  <div className="flex items-end gap-1.5 pointer-events-none">
    <svg width={small ? 22 : 30} height={small ? 34 : 46} viewBox="0 0 30 46" fill="none" className="drop-shadow-[0_0_6px_rgba(216,169,52,0.7)]">
      <line x1="4" y1="2" x2="4" y2="46" stroke="#F3E7C8" strokeWidth="1.6" />
      <path className="rh-flagpath" d="M4 2 L28 8 L4 15 Z" fill="#E7B93F" stroke="#FFF1B8" strokeWidth="0.8" />
    </svg>
    {!small && (
      <span className="font-display font-bold tracking-wider text-[#E7B93F] text-sm mb-0.5 whitespace-nowrap">HOLE {n}</span>
    )}
  </div>
);

const HoleGreen: React.FC<{
  hole: CourseHole;
  small?: boolean;
  active: boolean;
  reached: boolean;
  onClick: () => void;
}> = ({ hole, small, active, reached, onClick }) => {
  const isRightSide = hole.side === 'right';
  const holeN = hole.holeNumber;

  // ViewBox: 240 x 170 (desktop) or compact scale
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`หลุมที่ ${holeN} (${hole.title})`}
      className={`rh-iso-hole group relative cursor-pointer shrink-0 focus:outline-none select-none ${
        small ? 'w-[88px] h-[72px]' : 'w-[180px] sm:w-[210px] h-[135px] sm:h-[155px]'
      }`}
    >
      {/* Active pulse aura when golf ball is near */}
      {active && (
        <div className="absolute inset-0 rounded-full bg-[#D8A934]/25 blur-xl animate-pulse pointer-events-none" />
      )}

      {/* Realistic Top-Down / Isometric Vector Golf Hole */}
      <svg
        viewBox="0 0 240 180"
        className={`w-full h-full overflow-visible drop-shadow-[0_12px_22px_rgba(0,0,0,0.85)] transition-all duration-500 ${
          active ? 'scale-[1.06]' : 'scale-100'
        }`}
        style={{
          filter: reached
            ? 'drop-shadow(0 0 16px rgba(216,169,52,0.65))'
            : 'drop-shadow(0 6px 14px rgba(0,0,0,0.75))',
        }}
      >
        <defs>
          {/* Rough Turf Base Gradient */}
          <radialGradient id={`turfGrad-${holeN}`} cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#2A5C28" />
            <stop offset="60%" stopColor="#1B3F1B" />
            <stop offset="100%" stopColor="#102511" />
          </radialGradient>

          {/* Isometric Putting Green Gradient */}
          <radialGradient id={`greenGrad-${holeN}`} cx="48%" cy="38%" r="52%">
            <stop offset="0%" stopColor="#6BC24A" />
            <stop offset="45%" stopColor="#418E2C" />
            <stop offset="85%" stopColor="#28631B" />
            <stop offset="100%" stopColor="#1B4613" />
          </radialGradient>

          {/* Sand Bunker Gradient (Warm desert sand) */}
          <radialGradient id={`sandGrad-${holeN}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#F6E8BF" />
            <stop offset="55%" stopColor="#DFC38C" />
            <stop offset="90%" stopColor="#A88B57" />
            <stop offset="100%" stopColor="#6C542E" />
          </radialGradient>

          {/* Flagstick Cloth Shimmer */}
          <linearGradient id={`flagGrad-${holeN}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF9ED" />
            <stop offset="40%" stopColor="#F5D061" />
            <stop offset="80%" stopColor="#D8A934" />
            <stop offset="100%" stopColor="#B37E15" />
          </linearGradient>

          {/* Flagstick Chrome Pole */}
          <linearGradient id={`poleGrad-${holeN}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Cup Depth Gradient */}
          <radialGradient id={`cupDepth-${holeN}`} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#050805" />
            <stop offset="70%" stopColor="#090E09" />
            <stop offset="100%" stopColor="#1A281A" />
          </radialGradient>

          {/* Green Ring Glow Filter */}
          <filter id={`greenGlow-${holeN}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* 1. TERRAIN BASE COLLAR / APRON (Dark lush rough surrounding green) */}
        <ellipse
          cx="120"
          cy="104"
          rx="106"
          ry="62"
          fill={`url(#turfGrad-${holeN})`}
          stroke="#386A2E"
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* 2. REALISTIC SAND BUNKERS (Natural kidney-shaped sand hazards) */}
        {/* Bunker 1: Main hazard hugs the green */}
        <g transform={isRightSide ? 'translate(210, 0) scale(-1, 1)' : ''}>
          <path
            d="M 32 95 C 22 75, 45 55, 68 62 C 80 66, 85 82, 78 96 C 70 110, 42 112, 32 95 Z"
            fill={`url(#sandGrad-${holeN})`}
            stroke="#8A6E3E"
            strokeWidth="1.5"
            filter="drop-shadow(inset 0 2px 4px rgba(60,40,15,0.7))"
          />
          {/* Bunker shadow rim */}
          <path
            d="M 36 90 C 28 78, 46 62, 65 67 C 55 72, 45 84, 42 98 Z"
            fill="#5E4521"
            opacity="0.45"
          />
          {/* Sand raked ripple texture */}
          <path
            d="M 44 80 Q 56 86 66 82 M 48 92 Q 58 97 68 91"
            stroke="#CBB07E"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </g>

        {/* Bunker 2: Secondary top hazard */}
        <path
          d={
            isRightSide
              ? 'M 58 48 C 48 38, 66 28, 82 32 C 92 35, 96 46, 88 54 C 78 62, 64 56, 58 48 Z'
              : 'M 168 46 C 158 36, 176 26, 192 30 C 202 33, 206 44, 198 52 C 188 60, 174 54, 168 46 Z'
          }
          fill={`url(#sandGrad-${holeN})`}
          stroke="#8A6E3E"
          strokeWidth="1.2"
        />

        {/* 3. ISOMETRIC PUTTING GREEN SURFACE (Smooth, manicured bentgrass) */}
        {/* Under-green shadow for elevation */}
        <ellipse
          cx="124"
          cy="104"
          rx="76"
          ry="48"
          fill="#0C1D0B"
          opacity="0.55"
        />

        {/* Main contoured Putting Green */}
        <path
          d="M 64 96 C 54 72, 88 52, 134 54 C 182 56, 198 76, 192 102 C 186 128, 148 144, 108 142 C 76 140, 68 116, 64 96 Z"
          fill={`url(#greenGrad-${holeN})`}
          stroke={reached ? '#F7DC8A' : '#73C84B'}
          strokeWidth={reached ? '2.5' : '1.5'}
          filter={`url(#greenGlow-${holeN})`}
          className="transition-colors duration-500"
        />

        {/* Subtle turf stripe mowing pattern (Diagonal light/dark green bands) */}
        <g opacity="0.18">
          <path d="M 80 62 L 95 138" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
          <path d="M 108 56 L 123 144" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
          <path d="M 136 56 L 151 140" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
          <path d="M 164 64 L 175 130" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* Putting Green Inner Contour Highlight */}
        <path
          d="M 78 94 C 72 78, 96 64, 132 66 C 168 68, 180 82, 176 100 C 172 118, 142 130, 112 128 C 88 126, 80 108, 78 94 Z"
          fill="none"
          stroke="#A8E87B"
          strokeWidth="0.8"
          strokeDasharray="4 3"
          opacity="0.4"
        />

        {/* 4. THE GOLF CUP (Hole in the ground with rim & dark depth) */}
        {/* Cup location: Center-right on green for dramatic isometric balance */}
        <g transform="translate(136, 100)">
          {/* Outer Cup Rim / Lip */}
          <ellipse cx="0" cy="0" rx="9" ry="5.5" fill="#1C381B" stroke="#4B7E3E" strokeWidth="1" />
          {/* Inner Cup Hole */}
          <ellipse cx="0" cy="1" rx="7.2" ry="4.2" fill={`url(#cupDepth-${holeN})`} />
          {/* Plastic cup liner white ring inside hole */}
          <ellipse cx="0" cy="0.8" rx="6.5" ry="3.6" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.65" />
          {/* Cup bottom socket where pin inserts */}
          <circle cx="0" cy="1.6" r="2.2" fill="#000000" />
        </g>

        {/* 5. GOLF BALL (Sitting right next to or in the hole cup) */}
        <g transform="translate(148, 104)">
          {/* Ball contact shadow */}
          <ellipse cx="0" cy="2" rx="4" ry="1.8" fill="#000000" opacity="0.6" />
          {/* 3D dimpled golf ball */}
          <circle cx="0" cy="0" r="3.4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
          <circle cx="-0.8" cy="-0.8" r="1.2" fill="#FFFFFF" opacity="0.9" />
          {reached && (
            <circle cx="0" cy="0" r="4.5" fill="none" stroke="#FFF9ED" strokeWidth="1" opacity="0.8" className="animate-ping" />
          )}
        </g>

        {/* 6. REALISTIC FLAGSTICK (PIN) PLANTED FIRMLY IN CUP */}
        <g transform="translate(136, 100)">
          {/* Flagstick Pole (Stainless steel / fiberglass tournament rod) */}
          {/* Pole Shadow falling onto green */}
          <line
            x1="0"
            y1="1.6"
            x2="-38"
            y2="18"
            stroke="#071206"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* Vertical Pole */}
          <line
            x1="0"
            y1="1.6"
            x2="0"
            y2="-68"
            stroke={`url(#poleGrad-${holeN})`}
            strokeWidth="2.6"
            strokeLinecap="round"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
          />

          {/* Gold Finial Ball on Top of Flagstick */}
          <circle cx="0" cy="-69" r="3.2" fill="#FFE9A0" stroke="#D8A934" strokeWidth="0.8" />
          <circle cx="-0.8" cy="-70" r="1.2" fill="#FFFFFF" />

          {/* Fluttering Tournament Triangular Pin Flag */}
          <g transform="translate(0, -68)" className="rh-flagpath">
            {/* Flag cloth shadow */}
            <path
              d="M 0 0 L 46 11 L 0 24 Z"
              fill="#000000"
              opacity="0.25"
              transform="translate(1, 2)"
            />

            {/* Premium Gold Flag Cloth with stitch border */}
            <path
              d="M 0 0 L 46 11 L 0 24 Z"
              fill={`url(#flagGrad-${holeN})`}
              stroke="#FFF9ED"
              strokeWidth="0.9"
            />

            {/* Flag Texture Crease Lines */}
            <line x1="0" y1="8" x2="30" y2="15" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.5" />
            <line x1="0" y1="16" x2="22" y2="19" stroke="#9A6F14" strokeWidth="0.6" opacity="0.5" />

            {/* Big Bold Hole Number on Flag */}
            <text
              x="12"
              y="16"
              fill="#10140F"
              fontSize="12.5"
              fontWeight="900"
              fontFamily="Cinzel, serif"
              letterSpacing="0"
            >
              {holeN}
            </text>
          </g>
        </g>

        {/* 7. ELEGANT HOLE PILL LABEL BADGE (Under the green) */}
        <g transform="translate(120, 162)">
          {/* Pill Container */}
          <rect
            x="-44"
            y="-10"
            width="88"
            height="19"
            rx="9.5"
            fill="#0E140D"
            stroke={reached ? '#F7DC8A' : '#D8A934'}
            strokeWidth={reached ? '1.8' : '1.2'}
            filter="drop-shadow(0 3px 6px rgba(0,0,0,0.85))"
          />
          {/* Little flag icon inside badge */}
          <circle cx="-28" cy="-0.5" r="2.5" fill="#D8A934" />
          <text
            x="-18"
            y="3.2"
            fill="#FFF9ED"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
            letterSpacing="0.1em"
          >
            HOLE {holeN}
          </text>
        </g>
      </svg>
    </button>
  );
};

const HoleCard: React.FC<{
  hole: CourseHole;
  onClick: () => void;
  reveal: boolean;
  active: boolean;
  from: 'left' | 'right' | 'bottom';
  className?: string;
  style?: React.CSSProperties;
}> = ({ hole, onClick, reveal, active, from, className = '', style }) => {
  const hiddenShift = from === 'left' ? '-translate-x-14' : from === 'right' ? 'translate-x-14' : 'translate-y-8';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={style}
      className={`rh-card group/card cursor-pointer rounded-xl bg-gradient-to-br from-[#171c11]/90 to-[#080a06]/90 backdrop-blur-md p-2.5 sm:p-3
        transition-all duration-700 ease-out
        ${reveal ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 pointer-events-none ${hiddenShift}`}
        ${
          active
            ? 'rh-card-on scale-[1.035] border border-[#F7DC8A] shadow-[0_0_44px_rgba(247,220,138,0.45),0_14px_34px_rgba(0,0,0,0.65)]'
            : 'border border-[#D8A934]/55 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,241,184,0.12)] hover:border-[#F0C75A]'
        } ${className}`}
    >
      <span className="rh-card-sweep" />
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative w-24 h-[72px] sm:w-40 sm:h-[104px] rounded-md overflow-hidden shrink-0 border border-[#D8A934]/30">
          <img src={hole.image} alt={hole.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-gradient-to-b from-[#F4D27A] to-[#D8A934] text-[#1a1408] text-xs font-bold flex items-center justify-center shadow-md">
            {hole.holeNumber}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-semibold text-[#F0C75A]">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{hole.time}</span>
          </div>
          <h3 className="font-display text-sm sm:text-2xl font-bold text-[#FFF9ED] uppercase leading-tight tracking-wide mt-0.5 sm:mt-1">
            {hole.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-[#F3E7C8]/85 mt-1 sm:mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E7B93F] shrink-0" />
            <span className="truncate">{hole.location}</span>
          </div>
        </div>

        <div className="shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-[#D8A934]/70 flex items-center justify-center text-[#F0C75A] group-hover/card:bg-[#D8A934] group-hover/card:text-[#10140F] group-hover/card:translate-x-0.5 transition-all">
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
    </div>
  );
};

const CupGreen: React.FC<{ wide?: boolean; finished: boolean }> = ({ wide, finished }) => (
  <div
    className={`group relative cursor-pointer select-none transition-transform duration-500 hover:scale-105 ${
      wide ? 'w-[230px] sm:w-[270px] h-[170px] sm:h-[195px]' : 'w-[180px] sm:w-[210px] h-[135px] sm:h-[155px]'
    }`}
  >
    {/* Ambient Celebration Halo */}
    {finished && (
      <div className="absolute inset-0 rounded-full bg-[#D8A934]/30 blur-2xl animate-pulse pointer-events-none" />
    )}

    {/* Realistic Isometric 19th Hole Putting Green Illustration */}
    <svg
      viewBox="0 0 260 200"
      className="w-full h-full overflow-visible drop-shadow-[0_16px_28px_rgba(0,0,0,0.9)]"
    >
      <defs>
        <radialGradient id="turfGrad-19" cx="48%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#2A5C28" />
          <stop offset="65%" stopColor="#1B3F1B" />
          <stop offset="100%" stopColor="#0E200F" />
        </radialGradient>
        <radialGradient id="greenGrad-19" cx="48%" cy="38%" r="52%">
          <stop offset="0%" stopColor="#7CD858" />
          <stop offset="40%" stopColor="#4AA033" />
          <stop offset="85%" stopColor="#2C701E" />
          <stop offset="100%" stopColor="#1B4813" />
        </radialGradient>
        <radialGradient id="sandGrad-19" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#F6E8BF" />
          <stop offset="55%" stopColor="#DFC38C" />
          <stop offset="90%" stopColor="#A88B57" />
          <stop offset="100%" stopColor="#6C542E" />
        </radialGradient>
        <linearGradient id="flagGrad-19" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF9ED" />
          <stop offset="30%" stopColor="#F5D061" />
          <stop offset="70%" stopColor="#D8A934" />
          <stop offset="100%" stopColor="#B37E15" />
        </linearGradient>
      </defs>

      {/* 1. Base Apron Collar */}
      <ellipse cx="130" cy="116" rx="116" ry="68" fill="url(#turfGrad-19)" stroke="#386A2E" strokeWidth="1.5" />

      {/* 2. Sand Bunkers surrounding 19th hole green */}
      {/* Left Bunker */}
      <path
        d="M 28 108 C 18 88, 42 66, 68 74 C 80 78, 85 95, 76 110 C 66 125, 38 126, 28 108 Z"
        fill="url(#sandGrad-19)"
        stroke="#8A6E3E"
        strokeWidth="1.5"
      />
      {/* Right Bunker */}
      <path
        d="M 194 72 C 206 60, 232 68, 236 86 C 240 102, 222 118, 204 112 C 190 108, 184 88, 194 72 Z"
        fill="url(#sandGrad-19)"
        stroke="#8A6E3E"
        strokeWidth="1.5"
      />

      {/* 3. Manicured Putting Green with Mowing Stripes */}
      <path
        d="M 68 106 C 56 80, 94 58, 145 60 C 198 62, 216 84, 210 112 C 204 140, 162 158, 118 156 C 82 154, 72 128, 68 106 Z"
        fill="url(#greenGrad-19)"
        stroke={finished ? '#FFF1B8' : '#D8A934'}
        strokeWidth={finished ? '3' : '2'}
        filter={finished ? 'drop-shadow(0 0 16px rgba(247,220,138,0.8))' : 'none'}
      />

      {/* Mowing pattern */}
      <g opacity="0.2">
        <path d="M 88 72 L 104 150" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
        <path d="M 118 64 L 134 156" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <path d="M 148 64 L 164 152" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <path d="M 178 74 L 190 142" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      </g>

      {/* 4. Cup & Flagstick */}
      <g transform="translate(142, 112)">
        {/* Cup */}
        <ellipse cx="0" cy="0" rx="10" ry="6" fill="#1C381B" stroke="#4B7E3E" strokeWidth="1" />
        <ellipse cx="0" cy="1" rx="8" ry="4.5" fill="#060906" />
        <ellipse cx="0" cy="0.8" rx="7.2" ry="4" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.75" />
        <circle cx="0" cy="1.6" r="2.4" fill="#000000" />

        {/* Golf ball in cup when finished */}
        {finished && (
          <g transform="translate(0, 0)">
            <circle cx="0" cy="0" r="3.6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
            <circle cx="-0.8" cy="-0.8" r="1.3" fill="#FFFFFF" />
          </g>
        )}

        {/* Flagstick Pole */}
        <line x1="0" y1="1.6" x2="-44" y2="20" stroke="#071206" strokeWidth="2.5" opacity="0.45" />
        <line x1="0" y1="1.6" x2="0" y2="-74" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="0" cy="-75" r="3.5" fill="#FFE9A0" stroke="#D8A934" strokeWidth="0.9" />

        {/* 19th Hole Golden Flag */}
        <g transform="translate(0, -74)" className="rh-flagpath">
          <path d="M 0 0 L 52 12 L 0 27 Z" fill="#000000" opacity="0.25" transform="translate(1, 2)" />
          <path d="M 0 0 L 52 12 L 0 27 Z" fill="url(#flagGrad-19)" stroke="#FFF9ED" strokeWidth="1" />
          <text x="11" y="18" fill="#10140F" fontSize="13" fontWeight="900" fontFamily="Cinzel, serif">
            19th
          </text>
        </g>
      </g>

      {/* Pill Badge */}
      <g transform="translate(130, 178)">
        <rect
          x="-50"
          y="-11"
          width="100"
          height="22"
          rx="11"
          fill="#0E140D"
          stroke={finished ? '#FFF1B8' : '#D8A934'}
          strokeWidth="1.8"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.85))"
        />
        <text
          x="0"
          y="4.5"
          textAnchor="middle"
          fill="#FFF9ED"
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
          letterSpacing="0.12em"
        >
          19TH HOLE
        </text>
      </g>
    </svg>

    {/* Celebration Sparks when reached */}
    {finished && (
      <div className="absolute left-1/2 top-1/2 pointer-events-none">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="rh-spark"
            style={{ ['--a' as string]: `${s.a}deg`, ['--d' as string]: `${s.d}px`, animationDelay: `${s.delay}s` } as React.CSSProperties}
          />
        ))}
      </div>
    )}
  </div>
);

/* ===============================================================
   MAIN SECTION
=============================================================== */
export const ScheduleTimeline: React.FC = () => {
  const [selectedHole, setSelectedHole] = useState<CourseHole | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width:1024px)').matches,
  );
  const [W, setW] = useState(1100);
  const [sampleVer, setSampleVer] = useState(0);
  const [ui, setUi] = useState({
    reveal: [false, false, false, false, false],
    reached: [false, false, false, false, false],
    active: -1,
    finished: false,
  });

  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const mobRef = useRef<HTMLDivElement>(null);
  const mobRows = useRef<(HTMLDivElement | null)[]>([]);
  const litPathRef = useRef<SVGPathElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const glow2PathRef = useRef<SVGPathElement>(null);
  const basePathRef = useRef<SVGPathElement>(null);
  const litLineRef = useRef<HTMLDivElement>(null);
  const deskBall = useBallRefs();
  const mobBall = useBallRefs();
  const samples = useRef<{ xs: Float32Array; ys: Float32Array; ls: Float32Array; total: number } | null>(null);

  /* breakpoint */
  useEffect(() => {
    const mq = window.matchMedia('(min-width:1024px)');
    const h = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  /* measure map width */
  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setW(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* sample the route so the ball can follow it by Y */
  useLayoutEffect(() => {
    const p = basePathRef.current;
    if (!p) return;
    const total = p.getTotalLength();
    const N = 900;
    const xs = new Float32Array(N + 1);
    const ys = new Float32Array(N + 1);
    const ls = new Float32Array(N + 1);
    let maxY = 0;
    for (let i = 0; i <= N; i++) {
      const l = (total * i) / N;
      const pt = p.getPointAtLength(l);
      maxY = Math.max(maxY, pt.y);
      xs[i] = pt.x;
      ys[i] = maxY;
      ls[i] = l;
    }
    samples.current = { xs, ys, ls, total };
    setSampleVer((v) => v + 1);
  }, [W]);

  /* scroll-driven golf ball */
  useEffect(() => {
    const container = isDesktop ? deskRef.current : mobRef.current;
    if (!container) return;
    if (isDesktop && !samples.current) return;

    const refs = isDesktop ? deskBall : mobBall;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let cur = 0;
    let target = 0;
    let settle = 0;
    let lastKey = '';
    let centers: number[] = HOLE_Y;
    let yTop = 135;
    let yEnd = FINAL_Y;
    const hist: { x: number; y: number }[] = [];

    const measure = () => {
      if (isDesktop) {
        centers = HOLE_Y;
        yTop = 135;
        yEnd = FINAL_Y;
      } else {
        centers = mobRows.current.map((r) => (r ? r.offsetTop + r.offsetHeight / 2 : 0));
        yTop = centers[0] || 0;
        yEnd = (centers[4] || 0) + 70;
      }
    };

    const computeTarget = () => {
      const rect = container.getBoundingClientRect();
      target = clamp(window.innerHeight * 0.55 - rect.top, yTop, yEnd);
    };

    const place = (y: number) => {
      let x = 34;
      let py = y;
      let len = y - yTop;

      if (isDesktop) {
        const s = samples.current;
        if (!s) return;
        let lo = 0;
        let hi = s.ys.length - 1;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (s.ys[m] < y) lo = m + 1;
          else hi = m;
        }
        const i = Math.max(1, lo);
        const y0 = s.ys[i - 1];
        const y1 = s.ys[i];
        const t = y1 > y0 ? clamp((y - y0) / (y1 - y0), 0, 1) : 0;
        x = s.xs[i - 1] + (s.xs[i] - s.xs[i - 1]) * t;
        len = s.ls[i - 1] + (s.ls[i] - s.ls[i - 1]) * t;
        const dash = `${len} ${s.total + 40}`;
        litPathRef.current?.setAttribute('stroke-dasharray', dash);
        glowPathRef.current?.setAttribute('stroke-dasharray', dash);
        glow2PathRef.current?.setAttribute('stroke-dasharray', dash);
      } else if (litLineRef.current) {
        litLineRef.current.style.height = `${Math.max(0, py - 24)}px`;
      }

      const ball = refs.ball.current;
      if (ball) {
        ball.style.transform = `translate3d(${x}px, ${py}px, 0)`;
        ball.style.opacity = String(clamp((y - yTop) / 45, 0, 1));
      }
      if (refs.spin.current) refs.spin.current.style.transform = `rotate(${len * 3}deg)`;

      hist.unshift({ x, y: py });
      if (hist.length > TRAIL * 3 + 2) hist.pop();
      refs.trail.current.forEach((d, i) => {
        if (!d) return;
        const h = hist[Math.min((i + 1) * 2, hist.length - 1)];
        if (!h) return;
        d.style.transform = `translate3d(${h.x}px, ${h.y}px, 0)`;
        d.style.opacity = String(((1 - i / TRAIL) * 0.55 * clamp((y - yTop) / 45, 0, 1)).toFixed(3));
      });

      /* state: which holes are revealed / reached / active */
      const reveal = centers.map((c) => reduce || y >= c - (isDesktop ? 230 : 260));
      const reached = centers.map((c) => y >= c - 8);
      let active = -1;
      centers.forEach((c, i) => {
        if (Math.abs(y - c) < (isDesktop ? 85 : 75)) active = i;
      });
      const finished = y >= yEnd - 4;
      const key = `${reveal.join('')}|${reached.join('')}|${active}|${finished}`;
      if (key !== lastKey) {
        lastKey = key;
        setUi({ reveal, reached, active, finished });
      }
    };

    let lastT = 0;
    const tick = (t: number = performance.now()) => {
      raf = 0;
      const dt = lastT ? Math.min(100, t - lastT) : 16;
      lastT = t;
      const diff = target - cur;
      const moving = Math.abs(diff) > 0.4;
      cur = reduce || !moving ? target : cur + diff * (1 - Math.exp(-dt / 95));
      if (moving) settle = 26;
      place(cur);
      if (moving || settle-- > 0) raf = requestAnimationFrame(tick);
      else lastT = 0;
    };

    const parallax = () => {
      const sec = sectionRef.current;
      const bg = bgRef.current;
      if (!sec || !bg || reduce) return;
      const r = sec.getBoundingClientRect();
      const p = clamp((window.innerHeight - r.top) / (r.height + window.innerHeight), 0, 1);
      bg.style.transform = `translate3d(0, ${(0.5 - p) * 150}px, 0) scale(1.12)`;
    };

    const update = () => {
      measure();
      computeTarget();
      parallax();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    measure();
    computeTarget();
    cur = target;
    place(cur);
    parallax();

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const late = window.setTimeout(update, 600); // after fonts / images settle
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.clearTimeout(late);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, W, sampleVer]);

  const handleFilter = (f: Filter) => {
    setFilter(f);
    if (f !== 'all') {
      const id = isDesktop ? `hole-${f}` : `hole-m-${f}`;
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isDim = (n: number) => filter !== 'all' && filter !== n;
  const rowFade = (n: number) => `transition-opacity duration-500 ${isDim(n) ? 'opacity-25' : 'opacity-100'}`;

  const pathD = buildPath(W);

  return (
    <section ref={sectionRef} id="schedule" className="relative overflow-hidden border-t border-[#30391E]/50 bg-[#0b0f0a]">
      <style>{STYLES}</style>

      {/* ===== BACKGROUND (parallax) ===== */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          ref={bgRef}
          className="absolute inset-x-0 -top-24 -bottom-24 bg-cover bg-center will-change-transform"
          style={{ backgroundImage: `url(${courseBg})`, transform: 'scale(1.12)' }}
        />
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1a0f08]/80 via-[#0b1209]/78 to-[#070a06]/92" />
      <div className="absolute top-0 inset-x-0 h-[460px] z-0 bg-gradient-to-b from-[#C96F3D]/40 via-[#8a3f22]/12 to-transparent pointer-events-none" />
      <div className="absolute top-[120px] left-1/2 -translate-x-1/2 w-[720px] h-[320px] z-0 rounded-full bg-[#F4B860]/15 blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-[340px] z-0 bg-gradient-to-t from-[#E7B93F]/12 to-transparent pointer-events-none" />

      {/* mist + fireflies */}
      <div className="rh-mist z-[1]" style={{ top: '18%' }} />
      <div className="rh-mist z-[1]" style={{ top: '52%', animationDuration: '34s', animationDirection: 'alternate-reverse' }} />
      <div className="rh-mist z-[1]" style={{ top: '82%', animationDuration: '30s' }} />
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {FIREFLIES.map((f, i) => (
          <span
            key={i}
            className="rh-firefly"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              width: f.size,
              height: f.size,
              animationDuration: `${f.dur}s`,
              animationDelay: `${f.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-20">
        {/* ===== HEADER ===== */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="font-display text-[11px] sm:text-xs tracking-[0.45em] text-[#E7B93F] uppercase">Golf · Music · Good Times</p>
          <h2 className="rh-title font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.2] mt-3 pb-1">กำหนดการจัดงาน</h2>

          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-[#E7B93F]" />
            <Flag className="w-4 h-4 text-[#E7B93F]" />
            <span className="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-[#E7B93F]" />
          </div>

          <p className="font-display text-base sm:text-xl text-[#FFF9ED] mt-3 font-medium">เส้นทางประสบการณ์ 5 หลุม</p>
          <p className="text-xs sm:text-sm text-[#F3E7C8]/90 mt-3 font-medium">กับกอล์ฟ ดนตรี และบรรยากาศธรรมชาติสุดประทับใจ</p>
          <p className="text-[11px] sm:text-xs tracking-widest text-[#F3E7C8]/90 uppercase mt-0.5">ณ Royal Hills Nakhon Nayok</p>

          <div className="mt-5 inline-flex items-center gap-2.5 px-6 py-2 rounded-full bg-[#0c100a]/80 border border-[#D8A934]/70 text-xs sm:text-sm text-[#FFF9ED] shadow-[0_0_24px_rgba(216,169,52,0.25)]">
            <Calendar className="w-4 h-4 text-[#E7B93F]" />
            14 พฤศจิกายน 2569
          </div>

          <p className="mt-4 text-[11px] text-[#F3E7C8]/60 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] animate-[rh-bob_1.8s_ease-in-out_infinite]" />
            เลื่อนลง แล้วตามลูกกอล์ฟไปทีละหลุม
          </p>
        </div>

        {/* ===== FILTER TABS ===== */}
        <div className="mt-8 sm:mt-10 overflow-x-auto pb-1 -mx-1 px-1">
          <div className="mx-auto w-max sm:w-full flex items-center gap-1 sm:gap-0 sm:justify-between rounded-full border border-[#D8A934]/50 bg-[#0c100a]/70 backdrop-blur-md p-1.5 sm:px-3">
            <button
              onClick={() => handleFilter('all')}
              className={`cursor-pointer flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-b from-[#F4D27A] to-[#D8A934] text-[#1a1408] shadow-[0_0_20px_rgba(216,169,52,0.5)]'
                  : 'text-[#F3E7C8] hover:text-[#F0C75A]'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              ดูทั้งหมด (5 หลุม)
            </button>

            {COURSE_HOLES.map((h) => (
              <React.Fragment key={h.holeNumber}>
                <span className="hidden sm:block w-px h-5 bg-[#D8A934]/30" />
                <button
                  onClick={() => handleFilter(h.holeNumber)}
                  className={`cursor-pointer flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    filter === h.holeNumber
                      ? 'bg-gradient-to-b from-[#F4D27A] to-[#D8A934] text-[#1a1408] shadow-[0_0_20px_rgba(216,169,52,0.5)]'
                      : 'text-[#F3E7C8] hover:text-[#F0C75A]'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" style={{ color: filter === h.holeNumber ? '#1a1408' : '#E7B93F' }} />
                  หลุม {h.holeNumber}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ============================================================
            DESKTOP COURSE MAP
        ============================================================ */}
        <div ref={deskRef} className="hidden lg:block relative mt-10" style={{ height: MAP_H }}>
          <svg className="absolute inset-0 pointer-events-none" width={W} height={MAP_H} viewBox={`0 0 ${W} ${MAP_H}`} fill="none">
            <defs>
              <linearGradient id="rhRouteGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F4D27A" />
                <stop offset="50%" stopColor="#FFF1B8" />
                <stop offset="100%" stopColor="#E7B93F" />
              </linearGradient>
            </defs>
            {/* fairway ribbon */}
            <path d={pathD} stroke="#2c5a22" strokeWidth="64" strokeOpacity="0.32" strokeLinecap="round" />
            {/* unplayed route: dotted */}
            <path ref={basePathRef} d={pathD} stroke="#F0C75A" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" />
            {/* played route: glows & lights up behind the ball */}
            <path
              ref={glowPathRef}
              d={pathD}
              stroke="#F0C75A"
              strokeWidth="18"
              strokeOpacity="0.18"
              strokeLinecap="round"
              strokeDasharray="0 99999"
            />
            <path
              ref={glow2PathRef}
              d={pathD}
              stroke="#FFE9A0"
              strokeWidth="9"
              strokeOpacity="0.28"
              strokeLinecap="round"
              strokeDasharray="0 99999"
            />
            <path ref={litPathRef} d={pathD} stroke="url(#rhRouteGold)" strokeWidth="3.8" strokeLinecap="round" strokeDasharray="0 99999" />
          </svg>

          {/* rows */}
          {COURSE_HOLES.map((hole, i) => {
            const isLeft = hole.side === 'left';
            return (
              <div
                id={`hole-${hole.holeNumber}`}
                key={hole.holeNumber}
                className={`absolute inset-x-0 ${rowFade(hole.holeNumber)}`}
                style={{ top: i * ROW_H, height: ROW_H }}
              >
                <div
                  className={`absolute top-[110px] w-[17%] text-center font-display text-[11px] tracking-[0.3em] leading-relaxed transition-all duration-700 ${
                    ui.reached[i] ? 'text-[#F3E7C8]/60' : 'text-[#F3E7C8]/25'
                  } ${isLeft ? 'right-[1%]' : 'left-[1%]'}`}
                >
                  {hole.ghostLabel}
                </div>

                <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: isLeft ? '12%' : '84%', top: 135 }}>
                  <HoleGreen
                    hole={hole}
                    active={ui.active === i}
                    reached={ui.reached[i]}
                    onClick={() => setSelectedHole(hole)}
                  />
                </div>

                <HoleCard
                  hole={hole}
                  onClick={() => setSelectedHole(hole)}
                  reveal={ui.reveal[i]}
                  active={ui.active === i}
                  from={isLeft ? 'right' : 'left'}
                  className="absolute w-[50%]"
                  style={{ left: hole.cardLeft, top: 70 }}
                />
              </div>
            );
          })}

          {/* 19th hole */}
          <div
            className={`absolute inset-x-0 flex flex-col items-center text-center cursor-pointer ${ui.finished ? 'rh-final-on' : ''}`}
            style={{ top: 1350, height: 350 }}
            onClick={() => setSelectedHole(COURSE_HOLES[4])}
          >
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: FINAL_Y - 1350 }}>
              <CupGreen wide finished={ui.finished} />
            </div>
            <div className="absolute bottom-4">
              <span className="font-display text-sm tracking-[0.3em] text-[#F0C75A] uppercase block">19th Hole</span>
              <h3 className="font-display text-3xl sm:text-4xl font-bold text-[#FFF9ED] tracking-wide mt-1 transition-all duration-700">
                THE FINAL CELEBRATION
              </h3>
              <p className="text-sm text-[#F3E7C8] mt-1.5">
                22:00 – 23:30 น. <span className="mx-2 text-[#D8A934]">|</span> Grand Complex Club & Spa Lounge
              </p>
            </div>
          </div>

          {/* the ball */}
          <GolfBall refs={deskBall} finished={ui.finished} />
        </div>

        {/* ============================================================
            MOBILE / TABLET
        ============================================================ */}
        <div ref={mobRef} className="lg:hidden relative mt-10">
          {/* unlit rail + lit rail */}
          <div className="absolute left-[32.5px] top-6 bottom-44 w-[3px] rounded-full bg-[#F0C75A]/20" />
          <div
            ref={litLineRef}
            className="absolute left-[32.5px] top-6 w-[3px] rounded-full bg-gradient-to-b from-[#F4D27A] via-[#FFF1B8] to-[#E7B93F] shadow-[0_0_14px_rgba(216,169,52,0.9)]"
            style={{ height: 0 }}
          />

          <div className="space-y-12">
            {COURSE_HOLES.map((hole, i) => (
              <div
                id={`hole-m-${hole.holeNumber}`}
                key={hole.holeNumber}
                ref={(el) => {
                  mobRows.current[i] = el;
                }}
                className={`relative flex items-center gap-3 ${rowFade(hole.holeNumber)}`}
              >
                <div className="w-[68px] flex justify-center shrink-0">
                  <HoleGreen
                    hole={hole}
                    small
                    active={ui.active === i}
                    reached={ui.reached[i]}
                    onClick={() => setSelectedHole(hole)}
                  />
                </div>
                <HoleCard
                  hole={hole}
                  onClick={() => setSelectedHole(hole)}
                  reveal={ui.reveal[i]}
                  active={ui.active === i}
                  from="bottom"
                  className="flex-1 min-w-0"
                />
              </div>
            ))}
          </div>

          <div
            className={`relative mt-16 flex flex-col items-center text-center cursor-pointer ${ui.finished ? 'rh-final-on' : ''}`}
            onClick={() => setSelectedHole(COURSE_HOLES[4])}
          >
            <div className="mt-10">
              <CupGreen finished={ui.finished} />
            </div>
            <span className="font-display text-xs tracking-[0.3em] text-[#F0C75A] uppercase mt-6">19th Hole</span>
            <h3 className="font-display text-2xl font-bold text-[#FFF9ED] tracking-wide mt-1 transition-all duration-700">
              THE FINAL CELEBRATION
            </h3>
            <p className="text-xs text-[#F3E7C8] mt-1.5">
              22:00 – 23:30 น. <span className="mx-1 text-[#D8A934]">|</span> Grand Complex Club & Spa Lounge
            </p>
          </div>

          <GolfBall refs={mobBall} finished={ui.finished} />
        </div>

        {/* bottom note */}
        <div className="mt-6 lg:mt-4 text-center p-4 rounded-2xl border border-[#D8A934]/30 bg-[#0c100a]/60 max-w-xl mx-auto backdrop-blur-sm">
          <p className="text-xs text-[#F3E7C8]/85 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E7B93F] shrink-0" />
            ผู้มีบัตรสามารถตรวจสอบอัปเดตกำหนดการแบบเรียลไทม์ผ่านบัตรดิจิทัล QR Code ของฉัน
          </p>
        </div>
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {selectedHole && (
        <div
          className="fixed inset-0 z-50 bg-[#10140F]/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedHole(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#182719] border-2 border-[#D8A934] rounded-2xl shadow-[0_0_50px_rgba(216,169,52,0.4)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <img src={selectedHole.image} alt={selectedHole.title} className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#182719] via-[#182719]/40 to-transparent" />
              <button
                onClick={() => setSelectedHole(null)}
                className="cursor-pointer absolute top-4 right-4 w-8 h-8 rounded-full bg-[#10140F]/80 hover:bg-[#10140F] border border-[#30391E] text-[#FFF9ED] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-4 left-4 bg-gradient-to-r from-[#D8A934] to-[#c4982c] text-[#10140F] px-3 py-1 rounded-full text-xs font-bold uppercase shadow flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" />
                HOLE {selectedHole.holeNumber}
              </div>
            </div>

            <div className="p-6 pt-2 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#D8A934]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedHole.time}</span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#FFF9ED] mt-1">{selectedHole.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#C96F3D] font-medium mt-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedHole.location}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#F3E7C8]/85 leading-relaxed bg-[#10140F] p-3.5 rounded-xl border border-[#30391E]">
                {selectedHole.description}
              </p>

              <div className="space-y-1.5 pt-1">
                {selectedHole.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#F3E7C8]/90">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D8A934] shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#30391E] flex justify-end">
                <button
                  onClick={() => setSelectedHole(null)}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
