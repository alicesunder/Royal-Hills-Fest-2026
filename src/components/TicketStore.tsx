import React, { useEffect, useState } from 'react';
import { TicketType, CartItem } from '../types';
import { OFFICIAL_TICKET_TYPES } from '../services/ticketStoreService';
import { ticketingApiService } from '../services/ticketingApiService';
import {
  Ticket,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Flame,
  Users,
  Crown,
} from 'lucide-react';

import musicImg from '../assets/images/exp_music_stage_1791251823402.jpg';
import campfireImg from '../assets/images/exp_campfire_lounge_1791251835632.jpg';

interface TicketStoreProps {
  onProceedToCheckout: (cart: CartItem[]) => void;
  onOpenMyTickets: () => void;
}

export const TicketStore: React.FC<TicketStoreProps> = ({
  onProceedToCheckout,
  onOpenMyTickets,
}) => {
  const closedTemplates = () => OFFICIAL_TICKET_TYPES.map((ticket) => ({
    ...ticket,
    soldQuantity: 0,
    remainingQuantity: 0,
    saleStatus: 'CLOSED' as const,
  }));
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(closedTemplates);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'available' | 'closed' | 'error'>('loading');
  const [catalogError, setCatalogError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [cardMousePos, setCardMousePos] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    let cancelled = false;
    ticketingApiService.getCatalog()
      .then((liveTypes) => {
        if (cancelled) return;
        const liveByCode = new Map(liveTypes.map((ticket) => [ticket.id, ticket]));
        const merged = OFFICIAL_TICKET_TYPES.map((template) =>
          liveByCode.get(template.id) || {
            ...template,
            soldQuantity: 0,
            remainingQuantity: 0,
            saleStatus: 'CLOSED' as const,
          }
        );
        setTicketTypes(merged);
        setCatalogStatus(liveTypes.some((ticket) => ticket.saleStatus === 'ACTIVE' && ticket.remainingQuantity > 0) ? 'available' : 'closed');
      })
      .catch((error) => {
        if (cancelled) return;
        setTicketTypes(closedTemplates());
        setCatalogError(error instanceof Error ? error.message : 'เชื่อมต่อระบบบัตรไม่สำเร็จ');
        setCatalogStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  const canBuyTickets = catalogStatus === 'available';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardMousePos((prev) => ({ ...prev, [id]: { x, y } }));
  };

  const handleMouseLeave = (id: string) => {
    setHoveredCardId(null);
    setCardMousePos((prev) => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const handleQuantityChange = (typeId: string, delta: number, maxAvailable: number) => {
    const ticket = ticketTypes.find((item) => item.id === typeId);
    const fallbackLimit = typeId === 'tt-vip' ? 6 : 10;
    const maxPerOrder = Math.max(1, Number(ticket?.maxPerOrder || fallbackLimit));
    const quantityLimit = Math.min(maxAvailable, maxPerOrder);

    setQuantities((prev) => {
      const current = prev[typeId] || 0;
      const next = Math.max(0, Math.min(quantityLimit, current + delta));
      return { ...prev, [typeId]: next };
    });
  };

  const normalTicket = ticketTypes.find((t) => t.id === 'tt-normal') || ticketTypes[0];
  const vipTicket = ticketTypes.find((t) => t.id === 'tt-vip') || ticketTypes[1];

  const normalQty = quantities['tt-normal'] || 0;
  const vipQty = quantities['tt-vip'] || 0;

  // Order Calculation: (normalQuantity × 555) + (vipTableQuantity × 5555)
  const totalAmount =
    normalQty * (normalTicket?.price || 555) + vipQty * (vipTicket?.price || 5555);
  const totalCartCount = normalQty + vipQty;

  const getCartItems = (): CartItem[] => {
    const items: CartItem[] = [];
    if (normalQty > 0 && normalTicket) {
      items.push({ ticketType: normalTicket, quantity: normalQty });
    }
    if (vipQty > 0 && vipTicket) {
      items.push({ ticketType: vipTicket, quantity: vipQty });
    }
    return items;
  };

  const cartItems = getCartItems();

  return (
    <section id="tickets" className={`mobile-ticket-store py-24 sm:py-32 bg-[#10140F] relative min-h-screen overflow-hidden ${totalCartCount > 0 ? 'has-selected-tickets' : ''}`}>
      {/* Ambient background lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-[#D8A934]/15 via-[#182719]/40 to-transparent rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-[#182719] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#30391E]/30 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="ticket-store-header text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="ticket-store-eyebrow inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#182719] border border-[#D8A934]/60 text-xs font-semibold tracking-[0.25em] uppercase text-[#D8A934] mb-4 shadow-lg">
            <Ticket className="w-3.5 h-3.5 text-[#D8A934]" />
            Official Event Box Office · 14 NOV 2026
          </div>
          <h1 className="ticket-store-title font-display text-4xl sm:text-6xl font-bold tracking-tight text-[#FFF9ED] leading-tight">
            เลือกบัตรเข้าร่วมงาน
          </h1>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#D8A934] to-transparent mx-auto mt-4 mb-4" />
          <p className="text-base sm:text-lg text-[#F3E7C8]/90 max-w-2xl mx-auto leading-relaxed font-light">
            มีประเภทบัตรทางการ 2 รูปแบบ: บัตรปกติ (ต่อคน) และ บัตร VIP (ต่อโต๊ะ / 6 ที่นั่ง)
          </p>

          <div className="mt-5 flex items-center justify-center gap-4 text-xs">
            <button
              onClick={onOpenMyTickets}
              className="cursor-pointer text-[#D8A934] hover:underline font-semibold flex items-center gap-1.5 bg-[#182719] px-4 py-2 rounded-full border border-[#30391E] shadow-sm"
            >
              <Ticket className="w-3.5 h-3.5" />
              มีบัตรแล้ว? เปิดดูบัตรดิจิทัลและ QR Code ของฉัน &rarr;
            </button>
          </div>
        </div>

        {catalogStatus !== 'available' && (
          <div role="status" className="max-w-4xl mx-auto mb-8 rounded-xl border border-[#D8A934]/40 bg-[#182719] px-4 py-4 sm:px-5">
            <p className="text-sm font-bold text-[#D8A934]">
              {catalogStatus === 'loading'
                ? 'กำลังตรวจสอบสถานะจำหน่ายบัตร...'
                : catalogStatus === 'error'
                  ? 'ยังเชื่อมต่อระบบจำหน่ายบัตรไม่ได้'
                  : ticketTypes.every((ticket) => ticket.saleStatus === 'SOLD_OUT')
                    ? 'บัตรทั้งสองประเภทจำหน่ายหมดแล้ว'
                    : ticketTypes.some((ticket) => ticket.saleStatus === 'SOLD_OUT')
                      ? 'บัตรบางประเภทจำหน่ายหมดแล้ว'
                      : 'ขณะนี้ยังไม่เปิดจำหน่ายบัตรออนไลน์'}
            </p>
            <p className="text-xs text-[#F3E7C8]/75 mt-1 leading-relaxed">
              {catalogStatus === 'error' ? (catalogError || 'กรุณาลองใหม่ภายหลัง') : 'ระบบจะแสดงราคาและจำนวนคงเหลือจากฐานข้อมูลจริงเมื่อผู้จัดงานเปิดขาย หลังเปิดขายแล้วจึงจะสามารถสั่งซื้อและชำระเงินได้'}
            </p>
          </div>
        )}

        {/* 2 OFFICIAL TICKET CARDS: SIDE-BY-SIDE ON DESKTOP, STACKED ON MOBILE */}
        <div className="ticket-type-grid grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto mb-20 perspective-1000 items-stretch">
          {/* =========================================
              CARD 1: บัตรปกติ (NORMAL TICKET)
              ========================================= */}
          {normalTicket && (() => {
            const isSoldOut = !canBuyTickets || normalTicket.remainingQuantity <= 0 || normalTicket.saleStatus !== 'ACTIVE';
            const isNotOnSale = normalTicket.saleStatus === 'CLOSED';
            const isHovered = hoveredCardId === normalTicket.id;
            const pos = cardMousePos[normalTicket.id] || { x: 0, y: 0 };
            const rotateX = isHovered ? -pos.y * 12 : 0;
            const rotateY = isHovered ? pos.x * 12 : 0;

            return (
              <div
                onMouseEnter={() => setHoveredCardId(normalTicket.id)}
                onMouseMove={(e) => handleMouseMove(e, normalTicket.id)}
                onMouseLeave={() => handleMouseLeave(normalTicket.id)}
                className={`group relative rounded-3xl flex flex-col justify-between overflow-hidden border transition-all duration-300 ease-out ${
                  normalQty > 0
                    ? 'border-[#D8A934] ring-2 ring-[#D8A934]/60 shadow-2xl shadow-[#D8A934]/20'
                    : 'border-[#30391E] hover:border-[#65705A] hover:shadow-xl'
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

                {/* Shimmer Light Sweep */}
                <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
                  <div className="ticket-shimmer-sweep absolute -inset-full top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#D8A934]/15 to-transparent" />
                </div>

                {/* Ticket Stub Notches */}
                <div className="ticket-notch-left" />
                <div className="ticket-notch-right" />

                {/* CARD BODY */}
                <div className="ticket-card-body relative z-10 p-7 sm:p-8">
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
                      {isSoldOut
                        ? catalogStatus === 'loading' ? 'กำลังตรวจสอบ' : catalogStatus === 'error' ? 'ระบบยังไม่พร้อม' : isNotOnSale ? 'ยังไม่เปิดจำหน่าย' : 'บัตรหมด'
                        : `คงเหลือ ${normalTicket.remainingQuantity} ใบ`}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="font-display text-3xl font-bold text-[#FFF9ED] mb-2 leading-tight">
                    {normalTicket.name}
                  </h2>
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
                          ฿{normalTicket.price.toLocaleString()}
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

                  {/* Benefits Divider */}
                  <div className="relative my-4 border-t border-dashed border-[#30391E] flex items-center justify-center">
                    <span className="bg-[#182719] px-2.5 text-[10px] text-[#65705A] font-mono tracking-widest uppercase">
                      สิทธิประโยชน์ในบัตร
                    </span>
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

                {/* BOTTOM STUB: QUANTITY SELECTOR (จำนวนบัตร) */}
                <div className="ticket-card-footer relative z-10 p-7 sm:p-8 pt-0">
                  {isSoldOut ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl bg-[#30391E]/40 border border-[#30391E] text-[#65705A] text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      {catalogStatus === 'loading' ? 'กำลังตรวจสอบสถานะการขาย...' : catalogStatus === 'error' ? 'ระบบยังไม่พร้อม · กรุณาลองใหม่ภายหลัง' : catalogStatus === 'closed' || isNotOnSale ? 'ยังไม่เปิดจำหน่าย' : 'บัตรหมดแล้ว (Sold Out)'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#F3E7C8]/90 px-1">
                        <span>จำนวนบัตร:</span>
                        <span className="text-[11px] text-[#65705A] font-mono font-normal">
                          ซื้อได้สูงสุด {normalTicket.maxPerOrder || 10} ใบ / คำสั่งซื้อ
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#10140F] border border-[#30391E] rounded-xl p-2 shadow-inner">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange('tt-normal', -1, normalTicket.remainingQuantity)
                          }
                          disabled={normalQty === 0}
                          className="cursor-pointer w-10 h-10 rounded-lg bg-[#182719] hover:bg-[#30391E] disabled:opacity-30 disabled:cursor-not-allowed text-[#FFF9ED] flex items-center justify-center transition-colors active:scale-95"
                          aria-label="ลดจำนวนบัตร"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="text-center font-mono">
                          <span className="text-2xl font-bold text-[#FFF9ED] tabular-nums">
                            {normalQty}
                          </span>
                          <span className="text-xs text-[#65705A] ml-1.5">ใบ</span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange('tt-normal', 1, normalTicket.remainingQuantity)
                          }
                          disabled={normalQty >= Math.min(normalTicket.remainingQuantity, normalTicket.maxPerOrder || 10)}
                          className="cursor-pointer w-10 h-10 rounded-lg bg-[#182719] hover:bg-[#30391E] disabled:opacity-30 disabled:cursor-not-allowed text-[#FFF9ED] flex items-center justify-center transition-colors active:scale-95"
                          aria-label="เพิ่มจำนวนบัตร"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {normalQty > 0 ? (
                        <div className="flex items-center justify-between text-xs px-2 py-2 bg-[#182719] rounded-lg border border-[#30391E]">
                          <span className="text-[#65705A]">ยอดรวมบัตรปกติ ({normalQty} ใบ):</span>
                          <span className="font-mono font-bold text-[#FFF9ED]">
                            ฿{(normalQty * normalTicket.price).toLocaleString()} THB
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange('tt-normal', 1, normalTicket.remainingQuantity)}
                          className="cursor-pointer w-full py-2.5 rounded-lg border border-[#30391E] hover:border-[#65705A] bg-[#182719]/40 text-[#F3E7C8]/80 text-xs font-semibold hover:text-[#FFF9ED] transition-colors"
                        >
                          เลือกบัตร
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* =========================================
              CARD 2: บัตร VIP (VIP TABLE PASS)
              ========================================= */}
          {vipTicket && (() => {
            const isSoldOut = !canBuyTickets || vipTicket.remainingQuantity <= 0 || vipTicket.saleStatus !== 'ACTIVE';
            const isNotOnSale = vipTicket.saleStatus === 'CLOSED';
            const isHovered = hoveredCardId === vipTicket.id;
            const pos = cardMousePos[vipTicket.id] || { x: 0, y: 0 };
            const rotateX = isHovered ? -pos.y * 12 : 0;
            const rotateY = isHovered ? pos.x * 12 : 0;

            return (
              <div
                onMouseEnter={() => setHoveredCardId(vipTicket.id)}
                onMouseMove={(e) => handleMouseMove(e, vipTicket.id)}
                onMouseLeave={() => handleMouseLeave(vipTicket.id)}
                className={`group relative rounded-3xl flex flex-col justify-between overflow-hidden border-2 transition-all duration-300 ease-out ${
                  vipQty > 0
                    ? 'border-[#D8A934] ring-4 ring-[#D8A934]/30 shadow-2xl shadow-[#D8A934]/30'
                    : 'border-[#D8A934]/80 hover:border-[#D8A934] shadow-2xl animate-pulse-gold'
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

                {/* Shimmer Light Sweep */}
                <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
                  <div className="ticket-shimmer-sweep absolute -inset-full top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#D8A934]/30 to-transparent" />
                </div>

                {/* Hologram Foil Reflection */}
                <div className="absolute inset-0 z-1 pointer-events-none hologram-foil opacity-25 group-hover:opacity-45 transition-opacity" />

                {/* Ticket Stub Notches */}
                <div className="ticket-notch-left" />
                <div className="ticket-notch-right" />

                {/* VIP Luxury Corner Ribbon */}
                <div className="absolute top-0 right-0 z-10 bg-gradient-to-l from-[#D8A934] via-[#e2b747] to-[#c4982c] text-[#10140F] text-[11px] font-extrabold tracking-widest uppercase px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#10140F]" />
                  VIP TABLE PASS
                </div>

                {/* CARD BODY */}
                <div className="ticket-card-body relative z-10 p-7 sm:p-8">
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
                      {isSoldOut
                        ? catalogStatus === 'loading' ? 'กำลังตรวจสอบ' : catalogStatus === 'error' ? 'ระบบยังไม่พร้อม' : isNotOnSale ? 'ยังไม่เปิดจำหน่าย' : 'โต๊ะ VIP หมดแล้ว'
                        : `เหลือเพียง ${vipTicket.remainingQuantity} โต๊ะ`}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#FFF9ED] mb-2 leading-tight flex items-center gap-2">
                    VIP
                    <span className="text-xs font-mono font-normal text-[#D8A934] bg-[#182719] px-2 py-0.5 rounded border border-[#D8A934]/40">
                      EXCLUSIVE
                    </span>
                  </h2>

                  {/* PROMINENT HIGHLIGHT: 1 โต๊ะ / 6 ที่นั่ง (สำหรับผู้เข้าร่วมสูงสุด 6 คน) */}
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
                          ฿{vipTicket.price.toLocaleString()}
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

                  {/* Benefits Divider */}
                  <div className="relative my-4 border-t border-dashed border-[#D8A934]/40 flex items-center justify-center">
                    <span className="bg-[#182719] px-2.5 text-[10px] text-[#D8A934] font-mono tracking-widest uppercase">
                      สิทธิประโยชน์โต๊ะ VIP
                    </span>
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

                {/* BOTTOM STUB: QUANTITY SELECTOR (จำนวนโต๊ะ VIP) */}
                <div className="ticket-card-footer relative z-10 p-7 sm:p-8 pt-0">
                  {isSoldOut ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl bg-[#30391E]/40 border border-[#30391E] text-[#65705A] text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      โต๊ะ VIP หมดแล้ว (Sold Out)
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#D8A934] px-1">
                        <span>จำนวนโต๊ะ VIP:</span>
                        <span className="text-[11px] text-[#F3E7C8]/80 font-mono font-normal">
                          ซื้อได้สูงสุด {vipTicket.maxPerOrder || 6} โต๊ะ / คำสั่งซื้อ
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#10140F] border border-[#D8A934]/50 rounded-xl p-2 shadow-inner">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange('tt-vip', -1, vipTicket.remainingQuantity)
                          }
                          disabled={vipQty === 0}
                          className="cursor-pointer w-10 h-10 rounded-lg bg-[#182719] hover:bg-[#30391E] disabled:opacity-30 disabled:cursor-not-allowed text-[#FFF9ED] flex items-center justify-center transition-colors active:scale-95"
                          aria-label="ลดจำนวนโต๊ะ VIP"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="text-center font-mono">
                          <span className="text-2xl font-bold text-[#D8A934] tabular-nums">
                            {vipQty}
                          </span>
                          <span className="text-xs text-[#65705A] ml-1.5">โต๊ะ</span>
                          {vipQty > 0 && (
                            <span className="block text-[10px] text-[#F3E7C8]/75">
                              ({vipQty * 6} ที่นั่ง)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange('tt-vip', 1, vipTicket.remainingQuantity)
                          }
                          disabled={vipQty >= Math.min(vipTicket.remainingQuantity, vipTicket.maxPerOrder || 6)}
                          className="cursor-pointer w-10 h-10 rounded-lg bg-[#D8A934] hover:bg-[#c4982c] disabled:opacity-30 disabled:cursor-not-allowed text-[#10140F] font-bold flex items-center justify-center transition-colors active:scale-95"
                          aria-label="เพิ่มจำนวนโต๊ะ VIP"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {vipQty > 0 ? (
                        <div className="flex items-center justify-between text-xs px-2 py-2 bg-[#182719] rounded-lg border border-[#D8A934]/40">
                          <span className="text-[#D8A934]">ยอดรวมโต๊ะ VIP ({vipQty} โต๊ะ):</span>
                          <span className="font-mono font-bold text-[#D8A934] text-sm">
                            ฿{(vipQty * vipTicket.price).toLocaleString()} THB
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange('tt-vip', 1, vipTicket.remainingQuantity)}
                          className="cursor-pointer w-full py-2.5 rounded-lg bg-gradient-to-r from-[#D8A934] to-[#c4982c] hover:brightness-110 text-[#10140F] text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#D8A934]/20"
                        >
                          เลือกโต๊ะ VIP
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ORDER CALCULATION SUMMARY CALLOUT */}
        {(normalQty > 0 || vipQty > 0) && (
          <div className="max-w-2xl mx-auto mb-16 p-6 rounded-2xl bg-[#182719] border border-[#D8A934]/60 shadow-2xl animate-in fade-in">
            <h3 className="font-display text-lg font-bold text-[#FFF9ED] mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#D8A934]" />
              สรุปรายการคำสั่งซื้อของคุณ
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[#30391E]">
              {normalQty > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#F3E7C8]/90">
                    บัตรปกติ × {normalQty} ใบ ({normalTicket?.price.toLocaleString() || 555} บาท / คน)
                  </span>
                  <span className="font-mono font-bold text-[#FFF9ED]">
                    ฿{(normalQty * normalTicket.price).toLocaleString()} บาท
                  </span>
                </div>
              )}
              {vipQty > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#D8A934]">
                    บัตร VIP × {vipQty} โต๊ะ ({vipTicket?.price.toLocaleString() || 5555} บาท / โต๊ะ · {vipQty * 6} ที่นั่ง)
                  </span>
                  <span className="font-mono font-bold text-[#D8A934]">
                    ฿{(vipQty * vipTicket.price).toLocaleString()} บาท
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t-2 border-[#30391E] flex items-center justify-between">
              <span className="font-bold text-[#FFF9ED] text-sm">ยอดรวมทั้งสิ้น:</span>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-[#D8A934]">
                  ฿{totalAmount.toLocaleString()}
                </span>
                <span className="text-xs text-[#65705A] ml-1 font-mono">THB</span>
              </div>
            </div>

            <button
              onClick={() => onProceedToCheckout(cartItems)}
              disabled={!canBuyTickets || totalCartCount === 0}
              className="mt-5 cursor-pointer w-full py-4 rounded-xl bg-gradient-to-r from-[#D8A934] to-[#c4982c] hover:brightness-110 text-[#10140F] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#D8A934]/30 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              ดำเนินการสั่งซื้อ (ยอดรวม ฿{totalAmount.toLocaleString()})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Security Trust Marks */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-[#182719]/40 border border-[#30391E] p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#F3E7C8]/85 text-center sm:text-left shadow-xl">
          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <ShieldCheck className="w-7 h-7 text-[#D8A934] shrink-0" />
            <div>
              <p className="font-bold text-[#FFF9ED] text-sm">ระบบจำหน่ายบัตรทางการ</p>
              <p className="text-[11px] text-[#65705A] mt-0.5">ออกบัตรและ QR Code ทางการจาก Royal Hills</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <Ticket className="w-7 h-7 text-[#D8A934] shrink-0" />
            <div>
              <p className="font-bold text-[#FFF9ED] text-sm">QR Code ประจำบัตร/โต๊ะ</p>
              <p className="text-[11px] text-[#65705A] mt-0.5">บัตรปกติ 1 คน / บัตร VIP 1 โต๊ะ 6 ที่นั่ง</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <Flame className="w-7 h-7 text-[#C96F3D] shrink-0" />
            <div>
              <p className="font-bold text-[#FFF9ED] text-sm">เช็กอินแยกรายบุคคลได้</p>
              <p className="text-[11px] text-[#65705A] mt-0.5">สมาชิกโต๊ะ VIP สามารถมาถึงคนละเวลาได้</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Sticky Cart Bar */}
      {totalCartCount > 0 && (
        <div className="mobile-sticky-cart fixed bottom-0 left-0 right-0 z-40 bg-[#10140F]/95 border-t border-[#30391E] backdrop-blur-xl py-4 px-4 sm:px-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <div
                  className="mobile-cart-count w-11 h-11 rounded-full bg-[#D8A934]/20 border-2 border-[#D8A934] text-[#D8A934] flex items-center justify-center font-mono font-bold text-lg animate-bounce"
                  style={{ animationDuration: '2.5s' }}
                >
                  {totalCartCount}
                </div>
                <div>
                  <span className="text-xs text-[#65705A] block">
                    {normalQty > 0 ? `${normalQty} บัตรปกติ` : ''}{' '}
                    {normalQty > 0 && vipQty > 0 ? '· ' : ''}
                    {vipQty > 0 ? `${vipQty} โต๊ะ VIP` : ''}
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-bold text-[#FFF9ED]">
                    ฿{totalAmount.toLocaleString()}{' '}
                    <span className="text-xs text-[#65705A] font-normal">THB</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCartDrawerOpen(!cartDrawerOpen)}
                className="cursor-pointer text-xs text-[#D8A934] hover:underline sm:hidden"
              >
                {cartDrawerOpen ? 'ซ่อนรายการ' : 'ดูรายการ'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setCartDrawerOpen(!cartDrawerOpen)}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-3.5 rounded-xl border border-[#30391E] text-xs font-semibold text-[#F3E7C8] hover:text-[#FFF9ED] hover:border-[#65705A] transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-[#D8A934]" />
                {cartDrawerOpen ? 'ปิดรายละเอียด' : 'ดูรายละเอียดตะกร้า'}
              </button>

              <button
                onClick={() => onProceedToCheckout(cartItems)}
                disabled={!canBuyTickets || totalCartCount === 0}
                className="cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-xl shadow-[#D8A934]/25 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                ดำเนินการสั่งซื้อ (฿{totalAmount.toLocaleString()})
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cart Breakdown Drawer */}
          {cartDrawerOpen && (
            <div className="max-w-7xl mx-auto pt-4 mt-3 border-t border-[#30391E]/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
              {cartItems.map((item) => (
                <div
                  key={item.ticketType.id}
                  className="flex items-center justify-between bg-[#182719] p-3 rounded-lg border border-[#30391E] text-xs"
                >
                  <div className="truncate mr-2">
                    <p className="font-semibold text-[#FFF9ED] truncate">
                      {item.ticketType.name}{' '}
                      {item.ticketType.kind === 'VIP' ? '(1 โต๊ะ / 6 ที่นั่ง)' : '(ต่อคน)'}
                    </p>
                    <p className="text-[11px] text-[#65705A]">
                      ฿{item.ticketType.price.toLocaleString()} × {item.quantity} {item.ticketType.unitLabel}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono font-bold text-[#D8A934]">
                    ฿{(item.ticketType.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
