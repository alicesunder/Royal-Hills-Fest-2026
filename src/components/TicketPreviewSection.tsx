import React, { useEffect, useState } from 'react';
import { Atmosphere, CountUp } from './fx';
import { TicketType } from '../types';
import { OFFICIAL_TICKET_TYPES } from '../services/ticketStoreService';
import { ticketingApiService } from '../services/ticketingApiService';
import {
  ArrowRight,
  Check,
  Crown,
  Flame,
  Gem,
  Sparkles,
  Ticket,
  Users,
  Waves,
} from 'lucide-react';

import musicImg from '../assets/images/exp_music_stage_1791251823402.jpg';
import campfireImg from '../assets/images/exp_campfire_lounge_1791251835632.jpg';
import golfResortImg from '../assets/images/exp_golf_resort_1791251812446.jpg';

interface TicketPreviewSectionProps {
  onSelectTicketType: (typeId: string) => void;
  onViewAllTickets: () => void;
}

type MousePoint = { x: number; y: number };

export const TicketPreviewSection: React.FC<TicketPreviewSectionProps> = ({
  onSelectTicketType,
  onViewAllTickets,
}) => {
  const closedTemplates = () => OFFICIAL_TICKET_TYPES.map((ticket) => ({
    ...ticket,
    soldQuantity: 0,
    remainingQuantity: 0,
    saleStatus: 'CLOSED' as const,
  }));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cardMousePos, setCardMousePos] = useState<Record<string, MousePoint>>({});
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(closedTemplates);

  useEffect(() => {
    let cancelled = false;
    ticketingApiService.getCatalog()
      .then((liveTypes) => {
        if (cancelled) return;
        const liveByCode = new Map(liveTypes.map((ticket) => [ticket.id, ticket]));
        setTicketTypes(OFFICIAL_TICKET_TYPES.map((template) => liveByCode.get(template.id) || {
          ...template,
          soldQuantity: 0,
          remainingQuantity: 0,
          saleStatus: 'CLOSED' as const,
        }));
      })
      .catch(() => {
        if (!cancelled) setTicketTypes(closedTemplates());
      });
    return () => { cancelled = true; };
  }, []);

  const normalTicket = ticketTypes.find((t) => t.id === 'tt-normal') || ticketTypes[0];
  const vipTicket = ticketTypes.find((t) => t.id === 'tt-vip') || ticketTypes[1];

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardMousePos((prev) => ({ ...prev, [id]: { x, y } }));
  };

  const handleMouseLeave = (id: string) => {
    setHoveredId(null);
    setCardMousePos((prev) => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const renderCard = (ticket: TicketType | undefined, kind: 'normal' | 'vip') => {
    if (!ticket) return null;

    const isVip = kind === 'vip';
    const isHovered = hoveredId === ticket.id;
    const isAnotherHovered = hoveredId !== null && hoveredId !== ticket.id;
    const isSoldOut = ticket.saleStatus === 'SOLD_OUT' ||
      (ticket.saleStatus === 'ACTIVE' && ticket.remainingQuantity <= 0);
    const isNotOnSale = ticket.saleStatus !== 'ACTIVE' && !isSoldOut;
    const isUnavailable = isSoldOut || isNotOnSale;
    const pos = cardMousePos[ticket.id] || { x: 0, y: 0 };
    const rotateX = isHovered ? -pos.y * 6 : 0;
    const rotateY = isHovered ? pos.x * 8 : 0;
    const image = isVip ? campfireImg : musicImg;

    return (
      <article
        key={ticket.id}
        onMouseEnter={() => setHoveredId(ticket.id)}
        onMouseMove={(e) => handleMouseMove(e, ticket.id)}
        onMouseLeave={() => handleMouseLeave(ticket.id)}
        onFocus={() => setHoveredId(ticket.id)}
        onBlur={() => setHoveredId(null)}
        tabIndex={0}
        className={`ticket-showcase-card ${isVip ? 'ticket-showcase-card--vip' : 'ticket-showcase-card--normal'} ${
          isHovered ? 'is-active' : ''
        } ${isAnotherHovered ? 'is-dimmed' : ''} ${isUnavailable ? 'is-sold-out' : ''}`}
        style={
          {
            '--mx': `${50 + pos.x * 22}%`,
            '--my': `${50 + pos.y * 22}%`,
            '--rx': `${rotateX}deg`,
            '--ry': `${rotateY}deg`,
          } as React.CSSProperties
        }
      >
        <div className="ticket-card-backdrop">
          <img src={image} alt="" className="ticket-card-backdrop-image" />
          <div className="ticket-card-backdrop-tint" />
          <div className="ticket-card-noise" />
        </div>

        <div className="ticket-card-spotlight" />
        <div className="ticket-card-beam" />
        <div className="ticket-card-orbit ticket-card-orbit--one" />
        <div className="ticket-card-orbit ticket-card-orbit--two" />
        <div className="ticket-card-glint" />
        <div className="ticket-card-particle ticket-card-particle--a" />
        <div className="ticket-card-particle ticket-card-particle--b" />
        <div className="ticket-card-particle ticket-card-particle--c" />

        <div className="ticket-card-frame" />
        <div className="ticket-ticket-notch ticket-ticket-notch--left" />
        <div className="ticket-ticket-notch ticket-ticket-notch--right" />

        <div className="ticket-card-content">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`ticket-status-badge ${isVip ? 'ticket-status-badge--vip' : ''}`}>
                {isVip ? <Crown className="h-3.5 w-3.5" /> : <Ticket className="h-3.5 w-3.5" />}
                {isVip ? 'VIP TABLE PASS' : 'FESTIVAL PASS'}
              </div>
              <div className="mt-4 flex items-end gap-3">
                <span className="ticket-number">0{isVip ? '2' : '1'}</span>
                <div className="pb-1">
                  <span className="ticket-kicker">OFFICIAL 2026</span>
                  <span className="ticket-kicker ticket-kicker--sub">ROYAL HILLS FEST</span>
                </div>
              </div>
            </div>

            <div className={`ticket-availability ${isSoldOut ? 'is-sold' : ''}`}>
              {isSoldOut ? 'SOLD OUT' : isNotOnSale ? 'ยังไม่เปิดจำหน่าย' : isVip ? `เหลือ ${ticket.remainingQuantity} โต๊ะ` : `เหลือ ${ticket.remainingQuantity} ใบ`}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="ticket-card-eyebrow">{isVip ? 'PRIVATE STAGE EXPERIENCE' : 'ONE DAY FESTIVAL EXPERIENCE'}</p>
                <h3 className="ticket-card-title">{isVip ? 'VIP' : 'บัตรปกติ'}</h3>
                <p className="ticket-card-description">{ticket.description}</p>
              </div>
              {isVip ? (
                <div className="ticket-icon-orb"><Crown className="h-6 w-6" /></div>
              ) : (
                <div className="ticket-icon-orb"><Waves className="h-6 w-6" /></div>
              )}
            </div>
          </div>

          <div className="ticket-price-panel">
            <div>
              <span className="ticket-price-label">{isVip ? 'VIP TABLE PRICE' : 'ENTRY PRICE'}</span>
              <div className={`ticket-price-value ${isVip ? 'ticket-price-value--gold' : ''}`}>
                ฿<CountUp to={ticket.price} />
                <span className="ticket-price-currency">THB</span>
              </div>
            </div>
            <div className="ticket-unit-badge">
              <span>{isVip ? 'โต๊ะ' : 'คน'}</span>
              <small>{isVip ? '6 ที่นั่ง' : '1 ใบ / 1 คน'}</small>
            </div>
          </div>

          <div className="ticket-feature-grid">
            {ticket.features.slice(0, isVip ? 6 : 5).map((feature, index) => (
              <div key={index} className="ticket-feature-item">
                <span className="ticket-feature-icon"><Check className="h-3.5 w-3.5" /></span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="ticket-card-footer">
            <div className="ticket-microcopy">
              <span>{isVip ? 'EXCLUSIVE ACCESS' : 'LIVE MUSIC · FESTIVAL · GOLF'}</span>
              <small>{isVip ? 'สูงสุด 6 ท่าน / โต๊ะ' : 'เข้าได้ 1 ท่าน / ใบ'}</small>
            </div>
            <button
              type="button"
              disabled={isUnavailable}
              onClick={() => onSelectTicketType(ticket.id)}
              className={`ticket-buy-button ${isVip ? 'ticket-buy-button--vip' : ''} ${isUnavailable ? 'is-disabled' : ''}`}
            >
              {isSoldOut ? 'SOLD OUT' : isNotOnSale ? 'ยังไม่เปิดจำหน่าย' : isVip ? 'เลือกโต๊ะ VIP' : 'เลือกบัตร'}
              {!isUnavailable && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      id="tickets-preview"
      className="ticket-showcase-section"
      style={{ backgroundImage: `url(${golfResortImg})` }}
    >
      <div className="ticket-showcase-overlay" />
      <div className="ticket-showcase-vignette" />
      <Atmosphere embers={16} mist lights />

      <div className="ticket-showcase-light ticket-showcase-light--top" />
      <div className="ticket-showcase-light ticket-showcase-light--bottom" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <header className="ticket-showcase-heading">
          <div className="ticket-official-pill">
            <Sparkles className="h-3.5 w-3.5" />
            OFFICIAL TICKETS · 2026
          </div>
          <h2 className="ticket-showcase-title">เลือกบัตรเข้าร่วมงาน</h2>
          <div className="ticket-showcase-divider">
            <span />
            <Gem className="h-4 w-4" />
            <span />
          </div>
          <p className="ticket-showcase-copy">
            เลือกประสบการณ์ของคุณ — จากบัตรเข้าร่วมงานแบบเต็มวัน ไปจนถึงโต๊ะ VIP ส่วนตัวที่รายล้อมด้วยแสงทองของ Royal Hills Fest
          </p>
        </header>

        <div className="ticket-showcase-stage">
          {renderCard(normalTicket, 'normal')}
          {renderCard(vipTicket, 'vip')}
        </div>

        <div className="ticket-selection-rail">
          <div className="ticket-selection-rail-mark"><Sparkles className="h-3.5 w-3.5" /></div>
          <div>
            <span className="ticket-rail-eyebrow">OFFICIAL BOX OFFICE</span>
            <strong>พร้อมเลือกประสบการณ์ของคุณ?</strong>
            <small>เปิดหน้าร้านเพื่อระบุจำนวนบัตร กรอกข้อมูลผู้เข้าร่วม และชำระเงินรับ QR Code</small>
          </div>
          <button type="button" onClick={onViewAllTickets} className="ticket-rail-button">
            เปิดหน้าร้านซื้อบัตร
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="ticket-showcase-footer-note">
          <span><Flame className="h-3.5 w-3.5" /> LIMITED CAPACITY</span>
          <span><Users className="h-3.5 w-3.5" /> 1 วัน · 1 สถานที่ · 1 ความทรงจำ</span>
        </div>
      </div>
    </section>
  );
};
