import React, { useState, useEffect } from 'react';
import { ActiveView } from '../types';
import { Menu, X, Ticket, QrCode, ScanLine, Shield } from 'lucide-react';
import { ScrollProgressBar } from './fx';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onBuyTicketsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onBuyTicketsClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [spy, setSpy] = useState<string>('home');

  // highlight the section currently on screen (homepage only)
  useEffect(() => {
    const ids = ['about', 'experience', 'schedule'];
    const on = () => {
      const probe = window.scrollY + window.innerHeight * 0.35;
      let cur = 'home';
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= probe) cur = id;
      });
      const tp = document.getElementById('tickets-preview');
      if (tp && tp.getBoundingClientRect().top + window.scrollY <= probe) cur = 'tickets';
      setSpy(cur);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileMenuOpen]);

  const homeLike = ['home', 'about', 'experience', 'schedule'].includes(activeView);
  const current = homeLike ? spy : activeView;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    if (view === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(view);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`site-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#10140F]/90 backdrop-blur-md border-b border-[#30391E]/60 py-3 shadow-lg shadow-black/30'
          : 'bg-gradient-to-b from-[#10140F]/85 via-[#10140F]/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Zone 1: Brand wordmark */}
        <button
          onClick={() => handleNavClick('home')}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <span className="font-display text-[13px] min-[400px]:text-base sm:text-xl lg:text-base xl:text-xl font-bold tracking-wide sm:tracking-widest lg:tracking-wider xl:tracking-widest text-[#FFF9ED] group-hover:text-[#D8A934] transition-colors whitespace-nowrap">
            ROYAL HILLS <span className="text-[#D8A934]">FEST</span> 2026
          </span>
        </button>

        {/* Zone 2: Navigation Links in Thai (never wraps) */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-5 mx-4 xl:mx-6 text-xs xl:text-sm font-medium tracking-wide text-[#F3E7C8]/85 whitespace-nowrap">
          {[
            { v: 'home' as ActiveView, label: 'หน้าหลัก' },
            { v: 'tickets' as ActiveView, label: 'ซื้อบัตร', gold: true },
            { v: 'about' as ActiveView, label: 'เกี่ยวกับงาน' },
            { v: 'experience' as ActiveView, label: 'ประสบการณ์' },
            { v: 'schedule' as ActiveView, label: 'กำหนดการ' },
            { v: 'my-tickets' as ActiveView, label: 'บัตรของฉัน', icon: <Ticket className="w-3.5 h-3.5 text-[#D8A934]" /> },
            { v: 'check-in' as ActiveView, label: 'เช็กอินหน้างาน', icon: <ScanLine className="w-3.5 h-3.5 text-[#C96F3D]" />, compact: true },
            { v: 'admin' as ActiveView, label: 'ระบบจัดการ', icon: <Shield className="w-3.5 h-3.5 text-[#65705A]" />, compact: true },
          ].map((item) => {
            const on = current === item.v;
            return (
              <button
                key={item.v}
                onClick={() => handleNavClick(item.v)}
                title={item.label}
                className={`cursor-pointer transition-colors hover:text-[#FFF9ED] py-1 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  item.gold ? 'font-semibold text-[#D8A934]' : ''
                } ${on ? 'border-[#D8A934] text-[#FFF9ED]' : 'border-transparent'}`}
              >
                {item.icon}
                <span className={item.compact ? 'hidden xl:inline' : ''}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={onBuyTicketsClick}
            className="cursor-pointer bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs sm:text-sm px-3 sm:px-5 py-2.5 rounded transition-all duration-200 tracking-wider shadow-md shadow-[#D8A934]/20 hover:shadow-[#D8A934]/30 whitespace-nowrap active:scale-[0.98] flex items-center gap-2"
          >
            <Ticket className="w-4 h-4 hidden min-[400px]:block" />
            <span className="hidden sm:inline">ซื้อบัตรเข้าร่วมงาน</span>
            <span className="sm:hidden">ซื้อบัตร</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#F3E7C8] hover:text-[#FFF9ED] focus:outline-none"
            type="button"
            aria-label={mobileMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="เมนูหลักบนมือถือ"
          className="mobile-nav-drawer lg:hidden bg-[#10140F]/98 border-b border-[#30391E] px-4 sm:px-5 py-4 sm:py-6 space-y-3 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150"
        >
          <div className="mobile-nav-links flex flex-col space-y-1.5 text-sm font-medium tracking-wide text-[#F3E7C8]">
            <button
              onClick={() => handleNavClick('home')}
              className="text-left py-2 hover:text-[#D8A934] transition-colors"
            >
              หน้าหลัก
            </button>
            <button
              onClick={() => handleNavClick('tickets')}
              className="text-left py-2 hover:text-[#D8A934] text-[#D8A934] font-semibold transition-colors flex items-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              ซื้อบัตรเข้าร่วมงาน (Ticket Store)
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="text-left py-2 hover:text-[#D8A934] transition-colors"
            >
              เกี่ยวกับงาน
            </button>
            <button
              onClick={() => handleNavClick('experience')}
              className="text-left py-2 hover:text-[#D8A934] transition-colors"
            >
              ประสบการณ์ภายในงาน
            </button>
            <button
              onClick={() => handleNavClick('schedule')}
              className="text-left py-2 hover:text-[#D8A934] transition-colors"
            >
              กำหนดการ
            </button>
            <button
              onClick={() => handleNavClick('my-tickets')}
              className="text-left py-2 hover:text-[#D8A934] transition-colors flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-[#D8A934]" />
              บัตรของฉัน (Digital Tickets / QR Code)
            </button>
            <div className="mobile-nav-staff-group mt-2 pt-3 border-t border-[#30391E]">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#65705A]">สำหรับเจ้าหน้าที่</p>
              <button
                onClick={() => handleNavClick('check-in')}
                className="mobile-nav-staff-link text-left py-2 hover:text-[#D8A934] transition-colors flex items-center gap-2"
            >
              <ScanLine className="w-4 h-4 text-[#C96F3D]" />
              เช็กอินหน้างาน (สแกนบัตร)
            </button>
              <button
                onClick={() => handleNavClick('admin')}
                className="mobile-nav-staff-link text-left py-2 hover:text-[#D8A934] transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-[#65705A]" />
                ระบบจัดการหน้างาน / แดชบอร์ดบัตร
              </button>
            </div>
          </div>
          <div className="pt-2 border-t border-[#30391E]">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onBuyTicketsClick();
              }}
              className="w-full bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-center py-3 rounded text-sm tracking-wider flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              ซื้อบัตรเข้าร่วมงาน
            </button>
          </div>
        </nav>
      )}
      <ScrollProgressBar />
    </header>
  );
};
