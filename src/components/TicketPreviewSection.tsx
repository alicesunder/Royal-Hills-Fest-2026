import React, { useState } from 'react';
import { Atmosphere, CountUp } from './fx';
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
} from 'lucide-react';

import musicImg from '../assets/images/exp_music_stage_1791251823402.jpg';
import campfireImg from '../assets/images/exp_campfire_lounge_1791251835632.jpg';

interface TicketPreviewSectionProps {
  onSelectTicketType: (typeId: string) => void;
  onViewAllTickets: () => void;
}

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

  return (
    <section className="isolate py-28 sm:py-36 bg-[#10140F] relative border-t border-[#30391E]/50 overflow-hidden">
      <Atmosphere embers={14} mist lights />
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-gradient-to-b from-[#D8A934]/15 via-[#182719]/40 to-transparent rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute top-12 left-10 w-96 h-96 bg-[#182719] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-12 right-10 w-[450px] h-[450px] bg-[#30391E]/30 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Stage Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#182719] border border-[#D8A934]/60 text-xs font-semibold tracking-[0.28em] uppercase text-[#D8A934] mb-4 shadow-xl shadow-[#D8A934]/10 animate-subtle-float">
            <Sparkles className="w-3.5 h-3.5 text-[#D8A934]" />
            OFFICIAL TICKETS · 2026
          </div>

          <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#FFF9ED] leading-[1.1] mb-4">
            เลือกบัตรเข้าร่วมงาน
          </h2>

          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#D8A934] to-transparent mx-auto mb-5 rounded-full" />

          <p className="text-base sm:text-lg text-[#F3E7C8]/90 max-w-2xl mx-auto leading-relaxed font-light">
            มีประเภทบัตรทางการ 2 รูปแบบ ออกแบบสำหรับทั้งผู้เข้าร่วมทั่วไปและกลุ่มเพื่อน/องค์กรที่ต้องการโต๊ะ VIP ส่วนตัว
          </p>
        </div>

        {/* 2 OFFICIAL TICKET CARDS: SIDE-BY-SIDE ON DESKTOP, STACKED ON MOBILE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto mb-16 perspective-1000 items-stretch">
          {/* =========================================
              CARD 1: บัตรปกติ (NORMAL TICKET)
              ========================================= */}
          {normalTicket && (() => {
            const isSoldOut = normalTicket.remainingQuantity <= 0 || normalTicket.saleStatus === 'SOLD_OUT';
            const isHovered = hoveredId === normalTicket.id;
            const pos = cardMousePos[normalTicket.id] || { x: 0, y: 0 };
            const rotateX = isHovered ? -pos.y * 12 : 0;
            const rotateY = isHovered ? pos.x * 12 : 0;

            return (
              <div
                onMouseEnter={() => setHoveredId(normalTicket.id)}
                onMouseMove={(e) => handleMouseMove(e, normalTicket.id)}
                onMouseLeave={() => handleMouseLeave(normalTicket.id)}
                className={`group relative rounded-3xl flex flex-col justify-between overflow-hidden border transition-all duration-300 ease-out ${
                  isHovered
                    ? 'border-[#D8A934]/80 shadow-2xl shadow-[#D8A934]/15'
                    : 'border-[#30391E]'
                } ${isSoldOut ? 'opacity-65' : ''}`}
                style={{
                  background: 'linear-gradient(180deg, #182719 0%, #131913 60%, #10140F 100%)',
                  transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
                    isHovered ? 'translateY(-8px)' : 'translateY(0px)'
                  }`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <img
                    src={musicImg}
                    alt="บัตรปกติ"
                    className="w-full h-52 object-cover object-center opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#10140F]/60 via-[#182719]/90 to-[#10140F]" />
                </div>

                {/* Shimmer sweep */}
                <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
                  <div className="ticket-shimmer-sweep absolute -inset-full top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#D8A934]/15 to-transparent" />
                </div>

                {/* Ticket Stub Notches */}
                <div className="ticket-notch-left" />
                <div className="ticket-notch-right" />

                {/* CARD BODY */}
                <div className="relative z-10 p-7 sm:p-8">
                  {/* Badge & Inventory */}
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFF9ED] bg-[#10140F]/90 px-3 py-1 rounded-lg border border-[#30391E] shadow-sm">
                      {normalTicket.name}
                    </span>

                    <span
                      className={`text-xs font-medium flex items-center gap-1 ${
                        isSoldOut ? 'text-red-400 font-bold' : 'text-[#65705A]'
                      }`}
                    >
                      {isSoldOut ? 'บัตรหมด' : `คงเหลือ ${normalTicket.remainingQuantity} ใบ`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-3xl font-bold text-[#FFF9ED] mb-2 leading-tight">
                    {normalTicket.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#F3E7C8]/80 mb-6 leading-relaxed font-light">
                    {normalTicket.description}
                  </p>

                  {/* PRICE BOX: 555 บาท / คน (CLEARLY ต่อคน) */}
                  <div className="p-4 rounded-2xl bg-[#10140F]/85 border border-[#30391E] mb-6 flex items-baseline justify-between shadow-inner">
                    <div>
                      <span className="text-[11px] uppercase text-[#65705A] tracking-wider block font-medium">
                        ราคาบัตร
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-mono text-4xl font-bold text-[#FFF9ED] tabular-nums">
                          ฿<CountUp to={555} />
                        </span>
                        <span className="text-xs text-[#65705A] font-mono">THB</span>
                      </div>
                    </div>

                    {/* Prominent Unit Label Badge: ต่อคน */}
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-lg bg-[#182719] border border-[#65705A]/50 text-xs font-bold text-[#FFF9ED] tracking-wide">
                        / คน
                      </span>
                      <span className="block text-[10px] text-[#65705A] mt-1 font-mono">
                        1 ใบ = 1 ผู้เข้าร่วม
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 text-xs text-[#F3E7C8]/85 mb-6">
                    {normalTicket.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#D8A934] shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM STUB: CTA "เลือกบัตร" */}
                <div className="relative z-10 p-7 sm:p-8 pt-0">
                  <button
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => onSelectTicketType('tt-normal')}
                    className={`cursor-pointer w-full py-4 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                      isSoldOut
                        ? 'bg-[#30391E]/40 text-[#65705A] cursor-not-allowed border border-[#30391E]'
                        : 'bg-[#182719] hover:bg-[#30391E] text-[#FFF9ED] border border-[#65705A]/50 hover:border-[#D8A934]'
                    }`}
                  >
                    {isSoldOut ? (
                      'บัตรหมดแล้ว (Sold Out)'
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>เลือกบัตร</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* =========================================
              CARD 2: บัตร VIP (VIP TABLE PASS)
              ========================================= */}
          {vipTicket && (() => {
            const isSoldOut = vipTicket.remainingQuantity <= 0 || vipTicket.saleStatus === 'SOLD_OUT';
            const isHovered = hoveredId === vipTicket.id;
            const pos = cardMousePos[vipTicket.id] || { x: 0, y: 0 };
            const rotateX = isHovered ? -pos.y * 12 : 0;
            const rotateY = isHovered ? pos.x * 12 : 0;

            return (
              <div
                onMouseEnter={() => setHoveredId(vipTicket.id)}
                onMouseMove={(e) => handleMouseMove(e, vipTicket.id)}
                onMouseLeave={() => handleMouseLeave(vipTicket.id)}
                className={`group relative rounded-3xl flex flex-col justify-between overflow-hidden border-2 transition-all duration-300 ease-out ${
                  isHovered
                    ? 'border-[#D8A934] shadow-2xl shadow-[#D8A934]/30'
                    : 'border-[#D8A934]/80 shadow-2xl animate-pulse-gold'
                } ${isSoldOut ? 'opacity-65' : ''}`}
                style={{
                  background: 'linear-gradient(180deg, #1d2b1c 0%, #141d14 60%, #10140F 100%)',
                  transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
                    isHovered ? 'translateY(-10px) scale(1.02)' : 'translateY(0px) scale(1.01)'
                  }`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Visual Backdrop */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <img
                    src={campfireImg}
                    alt="VIP โต๊ะ"
                    className="w-full h-56 object-cover object-center opacity-35 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#10140F]/60 via-[#182719]/85 to-[#10140F]" />
                </div>

                {/* Shimmer sweep */}
                <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
                  <div className="ticket-shimmer-sweep absolute -inset-full top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#D8A934]/30 to-transparent" />
                </div>

                {/* Hologram Foil */}
                <div className="absolute inset-0 z-1 pointer-events-none hologram-foil opacity-25 group-hover:opacity-45 transition-opacity" />

                {/* Ticket Stub Notches */}
                <div className="ticket-notch-left" />
                <div className="ticket-notch-right" />

                <div className="fx-border-run absolute inset-0 z-20 rounded-3xl" />

                {/* VIP Luxury Corner Ribbon */}
                <div className="absolute top-0 right-0 z-10 bg-gradient-to-l from-[#D8A934] via-[#e2b747] to-[#c4982c] text-[#10140F] text-[11px] font-extrabold tracking-widest uppercase px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#10140F]" />
                  VIP TABLE PASS
                </div>

                {/* CARD BODY */}
                <div className="relative z-10 p-7 sm:p-8">
                  {/* Badge & Inventory */}
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#10140F] bg-gradient-to-r from-[#D8A934] to-[#c4982c] px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#10140F]" />
                      VIP
                    </span>

                    <span
                      className={`text-xs font-medium flex items-center gap-1 ${
                        isSoldOut
                          ? 'text-red-400 font-bold'
                          : vipTicket.remainingQuantity < 10
                          ? 'text-[#C96F3D] font-bold animate-pulse'
                          : 'text-[#D8A934]'
                      }`}
                    >
                      {!isSoldOut && vipTicket.remainingQuantity < 10 && (
                        <Flame className="w-4 h-4 text-[#C96F3D]" />
                      )}
                      {isSoldOut ? 'โต๊ะหมดแล้ว' : `เหลือเพียง ${vipTicket.remainingQuantity} โต๊ะ`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-[#FFF9ED] mb-2 leading-tight flex items-center gap-2">
                    VIP
                    <span className="text-xs font-mono font-normal text-[#D8A934] bg-[#182719] px-2 py-0.5 rounded border border-[#D8A934]/40">
                      EXCLUSIVE
                    </span>
                  </h3>

                  {/* PROMINENT HIGHLIGHT: 1 โต๊ะ / 6 ที่นั่ง */}
                  <div className="mb-6 p-3 rounded-xl bg-[#D8A934]/15 border border-[#D8A934]/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#D8A934] text-[#10140F] flex items-center justify-center shrink-0 font-bold shadow-md">
                      <Users className="w-5 h-5 text-[#10140F]" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-[#FFF9ED]">
                        1 โต๊ะ / 6 ที่นั่ง
                      </p>
                      <p className="text-[11px] text-[#F3E7C8]/90">
                        สำหรับผู้เข้าร่วมสูงสุด 6 คน (ขายแบบเหมาโต๊ะ ไม่แยกที่นั่ง)
                      </p>
                    </div>
                  </div>

                  {/* PRICE BOX: 5,555 บาท / โต๊ะ (PROMINENTLY ต่อโต๊ะ) */}
                  <div className="p-4 rounded-2xl bg-[#10140F]/90 border border-[#D8A934]/60 mb-6 flex items-baseline justify-between shadow-inner">
                    <div>
                      <span className="text-[11px] uppercase text-[#D8A934] tracking-wider block font-semibold">
                        ราคาบัตร VIP
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-mono text-4xl font-bold text-[#D8A934] tabular-nums">
                          ฿<CountUp to={5555} />
                        </span>
                        <span className="text-xs text-[#65705A] font-mono">THB</span>
                      </div>
                    </div>

                    {/* Prominent Unit Label Badge: ต่อโต๊ะ */}
                    <div className="text-right">
                      <span className="inline-block px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D8A934] to-[#c4982c] text-xs font-bold text-[#10140F] tracking-wide shadow">
                        / โต๊ะ
                      </span>
                      <span className="block text-[10px] text-[#F3E7C8]/80 mt-1 font-mono">
                        รวม 6 ที่นั่ง
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 text-xs text-[#F3E7C8]/90 mb-6">
                    {vipTicket.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#D8A934] shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM STUB: CTA "เลือกโต๊ะ VIP" */}
                <div className="relative z-10 p-7 sm:p-8 pt-0">
                  <button
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => onSelectTicketType('tt-vip')}
                    className={`cursor-pointer w-full py-4 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-xl active:scale-95 ${
                      isSoldOut
                        ? 'bg-[#30391E]/40 text-[#65705A] cursor-not-allowed border border-[#30391E]'
                        : 'bg-gradient-to-r from-[#D8A934] via-[#e2b747] to-[#c4982c] hover:brightness-110 text-[#10140F] shadow-[#D8A934]/35 font-extrabold'
                    }`}
                  >
                    {isSoldOut ? (
                      'โต๊ะ VIP หมดแล้ว (Sold Out)'
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>เลือกโต๊ะ VIP</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* View All & Order Online Callout */}
        <div className="p-7 sm:p-8 rounded-2xl bg-gradient-to-r from-[#182719] via-[#30391E]/70 to-[#182719] border border-[#D8A934]/50 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="text-center sm:text-left relative z-10">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#D8A934] block mb-1">
              OFFICIAL BOX OFFICE
            </span>
            <p className="font-display text-xl sm:text-2xl font-bold text-[#FFF9ED]">
              ต้องการระบุจำนวนบัตรหรือโต๊ะ VIP เพิ่มเติม?
            </p>
            <p className="text-xs sm:text-sm text-[#F3E7C8]/80 mt-1 font-light">
              เปิดหน้าร้านค้าออนไลน์เพื่อคำนวณยอดรวม กรอกข้อมูลผู้เข้าร่วม และชำระเงินรับ QR Code
            </p>
          </div>

          <button
            onClick={onViewAllTickets}
            className="cursor-pointer shrink-0 inline-flex items-center gap-2.5 bg-gradient-to-r from-[#D8A934] to-[#c4982c] hover:brightness-110 text-[#10140F] font-bold text-xs uppercase tracking-wider px-7 py-4 rounded-xl shadow-xl shadow-[#D8A934]/30 transition-all active:scale-95 relative z-10"
          >
            <Ticket className="w-4 h-4" />
            เปิดหน้าร้านซื้อบัตร
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
