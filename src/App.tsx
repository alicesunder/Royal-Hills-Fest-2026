import React, { useState } from 'react';
import { ActiveView, CartItem, Order, IssuedTicket } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { ExperienceSection } from './components/ExperienceSection';
import { ScheduleTimeline } from './components/ScheduleTimeline';
import { LocationSection } from './components/LocationSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { TicketStore } from './components/TicketStore';
import { TicketPreviewSection } from './components/TicketPreviewSection';
import { CheckoutModal } from './components/CheckoutModal';
import { MyTicketsView } from './components/MyTicketsView';
import { CheckInScanner } from './components/CheckInScanner';
import { AdminTicketDashboard } from './components/AdminTicketDashboard';
import { ticketStoreService } from './services/ticketStoreService';
import { ArrowRight, Ticket, CheckCircle2 } from 'lucide-react';
import { AutoReveal, ScrollRail, Atmosphere, MotionDirector } from './components/fx';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [activeCart, setActiveCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [checkInTargetCode, setCheckInTargetCode] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // User starts checkout with cart items
  const handleProceedToCheckout = (cart: CartItem[]) => {
    setActiveCart(cart);
    setIsCheckoutOpen(true);
  };

  // User clicks a ticket type from Homepage preview
  const handleSelectFromPreview = (typeId: string) => {
    const types = ticketStoreService.getTicketTypes();
    const found = types.find((t) => t.id === typeId);
    if (found) {
      setActiveCart([{ ticketType: found, quantity: 1 }]);
      setIsCheckoutOpen(true);
    }
  };

  // User completes order and payment
  const handleOrderCompleted = (order: Order) => {
    setCurrentOrder(order);
    setIsCheckoutOpen(false);
    setActiveCart([]);
    setActiveView('my-tickets');
    showNotification(`ชำระเงินสำเร็จ! ได้รับบัตรดิจิทัล ${order.tickets.length} ใบสำหรับคำสั่งซื้อ ${order.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Simulate scanning a specific ticket code at check-in gate
  const handleSimulateCheckIn = (code: string) => {
    setCheckInTargetCode(code);
    setActiveView('check-in');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#10140F] text-[#FFF9ED] flex flex-col font-sans selection:bg-[#D8A934] selection:text-[#10140F]">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view !== 'home' && view !== 'about' && view !== 'experience' && view !== 'schedule') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onBuyTicketsClick={() => {
          setActiveView('tickets');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Success Banner Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#182719] border-2 border-[#D8A934] text-[#FFF9ED] px-6 py-3 rounded-full shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#D8A934]" />
          <span>{notification}</span>
        </div>
      )}

      {/* VIEW ROUTING */}
      <main className="flex-1">
        {/* VIEW 1: TICKET STORE */}
        {activeView === 'tickets' ? (
          <TicketStore
            onProceedToCheckout={handleProceedToCheckout}
            onOpenMyTickets={() => {
              setActiveView('my-tickets');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeView === 'my-tickets' ? (
          /* VIEW 2: MY TICKETS (Digital Passes with unique QR codes) */
          <MyTicketsView
            initialOrder={currentOrder}
            onSimulateCheckIn={handleSimulateCheckIn}
            onBuyMoreTickets={() => {
              setActiveView('tickets');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeView === 'check-in' ? (
          /* VIEW 3: ON-SITE GATE CHECK-IN SCANNER */
          <CheckInScanner
            initialCode={checkInTargetCode}
            onViewDashboard={() => setActiveView('admin')}
          />
        ) : activeView === 'admin' ? (
          /* VIEW 4: ADMIN TICKET & SALES DASHBOARD */
          <AdminTicketDashboard
            onOpenTicketPass={(ticketId) => {
              const match = ticketStoreService.getTicketByIdOrToken(ticketId);
              if (match) {
                setCurrentOrder(match.order);
                setActiveView('my-tickets');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onOpenCheckInScanner={(ticketId) => {
              setCheckInTargetCode(ticketId);
              setActiveView('check-in');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          /* VIEW 5: MAIN FESTIVAL HOMEPAGE */
          <div>
            <MotionDirector />
            <AutoReveal />
            <ScrollRail />
            {/* 1. Hero */}
            <Hero
              onRegisterClick={() => {
                setActiveView('tickets');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onExploreClick={() => {
                const el = document.getElementById('tickets-preview');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else {
                  setActiveView('tickets');
                }
              }}
            />

            {/* 2. Event Introduction (About) */}
            <AboutSection />

            {/* 3. Event Experience (Golf, Music, Mountain, Campfire, Resort, Good Times) */}
            <ExperienceSection />

            {/* 4. Event Schedule Preview */}
            <ScheduleTimeline />

            {/* 5. Homepage Ticket Preview Section ("เลือกประสบการณ์ของคุณ") */}
            <div id="tickets-preview">
              <TicketPreviewSection
                onSelectTicketType={handleSelectFromPreview}
                onViewAllTickets={() => {
                  setActiveView('tickets');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* 6. Mid-Page Callout Banner */}
            <section className="isolate py-20 bg-gradient-to-b from-[#10140F] via-[#182719] to-[#10140F] relative border-y border-[#30391E]/50 overflow-hidden rh-mid-cta">
              <Atmosphere embers={16} mist rise={420} />
              <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#D8A934] block mb-3">
                  จำกัดจำนวนผู้เข้าร่วมงาน · 14 พฤศจิกายน 2569
                </span>
                <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#FFF9ED] mb-4">
                  สำรองสิทธิ์เข้าร่วมงานเทศกาล
                </h2>
                <p className="text-sm sm:text-base text-[#F3E7C8]/85 max-w-xl mx-auto mb-8 font-light leading-relaxed">
                  ร่วมเป็นส่วนหนึ่งของวันพักผ่อนสุดพิเศษ ที่รวมการออกรอบกอล์ฟ ดนตรีสดใต้แสงดาว และบรรยากาศแคมป์ไฟอบอุ่นท่ามกลางขุนเขานครนายก
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      setActiveView('tickets');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="cursor-pointer w-full sm:w-auto px-8 py-4 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider rounded shadow-xl shadow-[#D8A934]/25 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    ซื้อบัตรเข้าร่วมงาน
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('my-tickets');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="cursor-pointer w-full sm:w-auto px-8 py-4 bg-[#10140F] hover:bg-[#182719] text-[#FFF9ED] border border-[#30391E] hover:border-[#D8A934] font-semibold text-xs tracking-wider rounded transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4 text-[#D8A934]" />
                    มีบัตรแล้ว? ตรวจสอบบัตรของฉัน
                  </button>
                </div>
              </div>
            </section>

            {/* 7. Location / Venue */}
            <LocationSection />

            {/* 8. FAQ */}
            <FAQSection />

            {/* 9. Final CTA */}
            <section className="py-24 bg-[#10140F] relative text-center border-t border-[#30391E]/30 rh-final-cta">
              <div className="max-w-3xl mx-auto px-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#65705A] mb-3">
                  ROYAL HILLS GOLF RESORT AND SPA NAKHON NAYOK
                </p>
                <h2 className="font-display text-4xl sm:text-6xl font-bold text-[#FFF9ED] mb-6">
                  GOLF · MUSIC · GOOD TIMES
                </h2>
                <button
                  onClick={() => {
                    setActiveView('tickets');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="cursor-pointer inline-flex items-center gap-3 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-8 py-4 rounded shadow-xl shadow-[#D8A934]/30 transition-all duration-200"
                >
                  <Ticket className="w-4 h-4" />
                  ซื้อบัตรเข้าร่วมงาน วันที่ 14 พฤศจิกายน 2569
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Checkout & Payment Modal */}
      {isCheckoutOpen && activeCart.length > 0 && (
        <CheckoutModal
          cart={activeCart}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderCompleted={handleOrderCompleted}
        />
      )}

      {/* Footer */}
      <Footer
        onNavClick={(view) => {
          setActiveView(view);
          if (view === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            const el = document.getElementById(view);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        }}
        onRegisterClick={() => {
          setActiveView('tickets');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
