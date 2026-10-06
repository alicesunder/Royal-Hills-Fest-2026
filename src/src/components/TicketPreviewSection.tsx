import React, { useState } from 'react';
import { TicketType } from '../types';
import { ticketStoreService } from '../services/ticketStoreService';
import {
  Ticket,
  ArrowRight,
  Check,
  Sparkles,
  Flame,
  Users,
  Crown,
  ShieldCheck,
  CalendarDays,
  MapPin,
} from 'lucide-react';

import musicImg from '../assets/images/exp_music_stage_1791251823402.jpg';
import campfireImg from '../assets/images/exp_campfire_lounge_1791251835632.jpg';

interface TicketPreviewSectionProps {
  onSelectTicketType: (typeId: string) => void;
  onViewAllTickets: () => void;
}

const GOLD = '#D8A934';
const GOLD_LIGHT = '#F3D36A';
const INK = '#0C120D';
const PANEL = '#111B12';
const PANEL_2 = '#182719';
const CREAM = '#FFF9ED';
const MUTED = '#D8D1BC';

export const TicketPreviewSection: React.FC<TicketPreviewSectionProps> = ({
  onSelectTicketType,
  onViewAllTickets,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cardMousePos, setCardMousePos] = useState<Record<string, { x: number; y: number }>>({});
  const ticketTypes = ticketStoreService.getTicketTypes();

  const normalTicket = ticketTypes.find((t) => t.id === 'tt-normal') || ticketTypes[0];
  const vipTicket = ticketTypes.find((t) => t.id === 'tt-vip') || ticketTypes[1];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardMousePos((prev) => ({ ...prev, [id]: { x, y } }));
  };

  const handleMouseLeave = (id: string) => {
    setHoveredId(null);
    setCardMousePos((prev) => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const getTransform = (ticket: TicketType) => {
    const isHovered = hoveredId === ticket.id;
    const pos = cardMousePos[ticket.id] || { x: 0, y: 0 };
    const rotateX = isHovered ? -pos.y * 5 : 0;
    const rotateY = isHovered ? pos.x * 5 : 0;
    return `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${isHovered ? '-8px' : '0px'})`;
  };

  const renderFeatures = (ticket: TicketType, limit = 5) => (
    <div className="space-y-3">
      {ticket.features.slice(0, limit).map((feature, index) => (
        <div key={index} className="flex items-start gap-3 text-sm leading-relaxed text-[#E7E1CF]">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#D8A934]/50 bg-[#D8A934]/10">
            <Check className="h-3 w-3 text-[#D8A934]" />
          </span>
          <span>{feature}</span>
        </div>
      ))}
    </div>
  );

  const renderCard = (ticket: TicketType | undefined, kind: 'normal' | 'vip') => {
    if (!ticket) return null;
    const isVip = kind === 'vip';
    const isHovered = hoveredId === ticket.id;
    const isSoldOut = ticket.remainingQuantity <= 0 || ticket.saleStatus === 'SOLD_OUT';
    const image = isVip ? campfireImg : musicImg;

    return (
      <article
        onMouseEnter={() => setHoveredId(ticket.id)}
        onMouseMove={(e) => handleMouseMove(e, ticket.id)}
        onMouseLeave={() => handleMouseLeave(ticket.id)}
        className={`group relative min-h-[690px] overflow-hidden rounded-[28px] border transition-all duration-500 ${
          isVip
            ? 'border-[#D8A934]/80 shadow-[0_20px_70px_rgba(216,169,52,0.16)]'
            : 'border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.28)]'
        } ${isSoldOut ? 'opacity-70' : ''}`}
        style={{
          transform: getTransform(ticket),
          transformStyle: 'preserve-3d',
          background: isVip
            ? 'linear-gradient(180deg, #1B2417 0%, #11180F 42%, #0A100B 100%)'
            : 'linear-gradient(180deg, #182719 0%, #111812 42%, #0A100B 100%)',
        }}
      >
        {/* Ambient card glow */}
        <div
          className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl transition-opacity duration-500 ${
            isVip ? 'bg-[#D8A934]/20' : 'bg-[#D8A934]/10'
          } ${isHovered ? 'opacity-100' : 'opacity-70'}`}
        />

        {/* Ticket hero image */}
        <div className="relative h-[220px] overflow-hidden">
          <img
            src={image}
            alt={isVip ? 'VIP experience' : 'Festival experience'}
            className={`h-full w-full object-cover transition duration-700 ${isHovered ? 'scale-110' : 'scale-100'} ${isVip ? 'opacity-80' : 'opacity-65'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A100B] via-[#0A100B]/20 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A100B]/60 via-transparent to-transparent" />

          {/* top metadata */}
          <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-4">
            <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.24em] ${
              isVip
                ? 'bg-[#D8A934] text-[#0A100B]'
                : 'border border-white/20 bg-black/25 text-white backdrop-blur-md'
            }`}>
              {isVip ? <Crown className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-[#D8A934]" />}
              {isVip ? 'VIP TABLE PASS' : 'FESTIVAL PASS'}
            </div>

            <div className="rounded-full border border-white/15 bg-black/25 px-3.5 py-2 text-[10px] font-medium tracking-wide text-white/85 backdrop-blur-md">
              RHF26 · 14 NOV
            </div>
          </div>

          {/* headline overlay */}
          <div className="absolute bottom-7 left-7 right-7">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#D8A934]">
              {isVip ? 'EXCLUSIVE ACCESS' : 'ONE DAY FESTIVAL'}
            </div>
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
                {isVip ? 'VIP' : 'บัตรปกติ'}
              </h3>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">{ticket.badge}</div>
                <div className="mt-1 text-xs font-semibold text-[#FFF9ED]">
                  {ticket.seatsPerUnit} {ticket.unitLabel === 'โต๊ะ' ? 'ที่นั่ง / โต๊ะ' : 'คน / บัตร'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* perforation / divider */}
        <div className="relative mx-6 h-px bg-white/10">
          <span className="absolute -left-8 -top-3 h-6 w-6 rounded-full bg-[#10140F]" />
          <span className="absolute -right-8 -top-3 h-6 w-6 rounded-full bg-[#10140F]" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#10140F] px-4 text-[9px] tracking-[0.35em] text-[#7D826F]">ROYAL HILLS FEST</span>
        </div>

        {/* content */}
        <div className="relative z-10 flex flex-1 flex-col px-7 pb-7 pt-7 sm:px-8 sm:pb-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="max-w-xl text-sm leading-relaxed text-[#CFC8B7] sm:text-[15px]">
                {ticket.description}
              </p>
            </div>
            {isVip && (
              <div className="shrink-0 rounded-xl border border-[#D8A934]/30 bg-[#D8A934]/10 px-3 py-2 text-right">
                <div className="text-[9px] uppercase tracking-[0.18em] text-[#D8A934]">LIMITED</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-xs font-bold text-[#FFF9ED]">
                  <Flame className="h-3.5 w-3.5 text-[#E67E22]" />
                  {ticket.remainingQuantity} โต๊ะ
                </div>
              </div>
            )}
          </div>

          {/* Price panel */}
          <div
            className={`relative mt-7 overflow-hidden rounded-2xl border p-5 ${
              isVip
                ? 'border-[#D8A934]/45 bg-[linear-gradient(135deg,rgba(216,169,52,0.18),rgba(255,255,255,0.02))]'
                : 'border-white/10 bg-white/[0.035]'
            }`}
          >
            <div className="absolute right-0 top-0 h-20 w-20 translate-x-5 -translate-y-5 rounded-full border border-[#D8A934]/20" />
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8D8F82]">
                  {isVip ? 'VIP TABLE PRICE' : 'ENTRY PRICE'}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`font-mono text-4xl font-black tracking-tight ${isVip ? 'text-[#F0C34F]' : 'text-[#FFF9ED]'}`}>
                    ฿{ticket.price.toLocaleString()}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-[#8D8F82]">THB</span>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  isVip ? 'bg-[#D8A934] text-[#0A100B]' : 'border border-white/15 bg-black/10 text-[#F5EEDD]'
                }`}>
                  / {ticket.unitLabel}
                </span>
                <div className="mt-1 text-[10px] text-[#8D8F82]">
                  {ticket.seatsPerUnit} {ticket.unitLabel === 'โต๊ะ' ? 'คน / โต๊ะ' : 'ท่าน'}
                </div>
              </div>
            </div>
          </div>

          {/* Small metadata */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#85887B]">
                <CalendarDays className="h-3.5 w-3.5 text-[#D8A934]" />
                EVENT DATE
              </div>
              <div className="mt-1 text-xs font-semibold text-[#F4EEDC]">14 พฤศจิกายน 2569</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#85887B]">
                <MapPin className="h-3.5 w-3.5 text-[#D8A934]" />
                VENUE
              </div>
              <div className="mt-1 text-xs font-semibold text-[#F4EEDC]">Royal Hills · นครนายก</div>
            </div>
          </div>

          {/* VIP / normal callout */}
          {isVip && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#D8A934]/20 bg-[#D8A934]/[0.06] p-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#D8A934] text-[#0A100B]">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#FFF9ED]">1 โต๊ะ / 6 ที่นั่ง</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#BEB8A7]">โต๊ะส่วนตัวโซนหน้าเวที พร้อมสิทธิประโยชน์ VIP</div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-dashed border-white/10 pt-5">
            {renderFeatures(ticket, isVip ? 6 : 5)}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-8">
            <button
              type="button"
              disabled={isSoldOut}
              onClick={() => onSelectTicketType(ticket.id)}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-extrabold uppercase tracking-[0.12em] transition-all duration-300 active:scale-[0.98] ${
                isSoldOut
                  ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/35'
                  : isVip
                  ? 'bg-gradient-to-r from-[#D8A934] via-[#F0C34F] to-[#B9871A] text-[#0A100B] shadow-[0_14px_40px_rgba(216,169,52,0.25)] hover:-translate-y-0.5 hover:brightness-105'
                  : 'border border-[#D8A934]/50 bg-[#D8A934]/[0.08] text-[#FFF9ED] hover:border-[#D8A934] hover:bg-[#D8A934]/15 hover:-translate-y-0.5'
              }`}
            >
              {isSoldOut ? (
                'SOLD OUT'
              ) : (
                <>
                  {isVip ? <Crown className="h-4 w-4" /> : <Ticket className="h-4 w-4 text-[#D8A934]" />}
                  <span>{isVip ? 'เลือกโต๊ะ VIP' : 'เลือกบัตรเข้าร่วมงาน'}</span>
                  <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${isHovered ? 'translate-x-1.5' : ''}`} />
                </>
              )}
            </button>
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#6F7568]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#D8A934]/80" />
              Secure checkout · Official box office
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="relative overflow-hidden border-t border-[#D8A934]/10 bg-[#0B100C] py-28 sm:py-36">
      {/* background atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#D8A934]/[0.05] blur-[150px]" />
        <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#234023]/25 blur-[150px]" />
        <div className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-[#D8A934]/[0.04] blur-[150px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D8A934]/50 to-transparent" />
        <div className="absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap text-[12vw] font-black tracking-[0.18em] text-white/[0.015]">
          TICKETS
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="mb-16 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-12 bg-[#D8A934]" />
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.32em] text-[#D8A934]">
                <Sparkles className="h-3.5 w-3.5" />
                Official Box Office · 2026
              </span>
            </div>

            <h2 className="max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-tight text-[#FFF9ED] sm:text-6xl lg:text-8xl">
              เข้างานแบบไหน
              <span className="block bg-gradient-to-r from-[#F8E8B5] via-[#D8A934] to-[#A77A17] bg-clip-text text-transparent">
                ที่ใช่สำหรับคุณ?
              </span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#BEB8A7] sm:text-lg">
              เลือกประสบการณ์ที่เหมาะกับคุณจาก 2 รูปแบบบัตรทางการ — ตั้งแต่การเข้าร่วมงานแบบเต็มวัน ไปจนถึงโต๊ะ VIP ส่วนตัวหน้าเวที
            </p>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md">
            <div className="px-5 py-4 sm:px-7 sm:py-5">
              <div className="text-[9px] uppercase tracking-[0.22em] text-[#7D826F]">PASS TYPES</div>
              <div className="mt-1 font-mono text-2xl font-black text-[#FFF9ED]">02</div>
            </div>
            <div className="border-l border-white/10 px-5 py-4 sm:px-7 sm:py-5">
              <div className="text-[9px] uppercase tracking-[0.22em] text-[#7D826F]">FROM</div>
              <div className="mt-1 font-mono text-2xl font-black text-[#D8A934]">฿555</div>
            </div>
          </div>
        </div>

        {/* cards */}
        <div className="grid items-stretch gap-7 lg:grid-cols-2 lg:gap-8">
          {renderCard(normalTicket, 'normal')}
          {renderCard(vipTicket, 'vip')}
        </div>

        {/* box office footer */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(216,169,52,0.07))] p-6 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#D8A934]">
                <Ticket className="h-3.5 w-3.5" />
                Official Box Office
              </div>
              <div className="font-display text-xl font-bold text-[#FFF9ED] sm:text-2xl">
                ต้องการซื้อหลายใบ หรือจัดการรายละเอียดผู้เข้าร่วม?
              </div>
              <div className="mt-1 text-sm leading-relaxed text-[#9D9F92]">
                เปิดร้านค้าออนไลน์เพื่อคำนวณยอดรวม กรอกข้อมูลผู้เข้าร่วม และชำระเงินรับ QR Code
              </div>
            </div>

            <button
              onClick={onViewAllTickets}
              className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-[#FFF9ED] px-6 py-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A100B] shadow-[0_12px_40px_rgba(255,249,237,0.12)] transition hover:-translate-y-0.5 hover:bg-[#D8A934] active:scale-[0.98]"
            >
              เปิดหน้าร้านซื้อบัตร
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[9px] font-medium uppercase tracking-[0.24em] text-[#61675B]">
          <span>ROYAL HILLS GOLF RESORT</span>
          <span>·</span>
          <span>NAKHON NAYOK</span>
          <span>·</span>
          <span>14 NOVEMBER 2026</span>
        </div>
      </div>
    </section>
  );
};
