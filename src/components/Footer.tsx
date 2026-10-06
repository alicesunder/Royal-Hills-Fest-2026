import React from 'react';
import { ActiveView } from '../types';
import { Calendar, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import heroImg from '../assets/images/hero_royal_hills_1791251800907.jpg';

interface FooterProps {
  onNavClick: (view: ActiveView) => void;
  onRegisterClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavClick, onRegisterClick }) => {
  return (
    <>
      <section className="final-scene relative overflow-hidden min-h-[560px] flex items-end">
        <img src={heroImg} alt="Royal Hills landscape" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e0a] via-[#0b0e0a]/55 to-[#0b0e0a]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e0a]/65 via-transparent to-[#0b0e0a]/45" />
        <div className="final-scene-stars absolute inset-0 pointer-events-none" />
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-5"><Sparkles className="w-4 h-4 text-[#D8A934]" /><p className="text-[10px] tracking-[0.3em] text-[#D8A934]">UNTIL WE MEET AGAIN</p></div>
            <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.9] text-[#FFF9ED]">
              GOLF.
              <span className="text-[#D8A934]"> MUSIC.</span>
              <br />GOOD TIMES.
            </h2>
            <p className="font-editorial text-lg sm:text-2xl text-[#F3E7C8]/78 mt-6 max-w-2xl">หนึ่งวันในนครนายก ที่อยากให้คุณได้กลับมาเล่าอีกครั้ง</p>
            <button onClick={onRegisterClick} className="luxury-btn luxury-btn-primary mt-8">
              เข้าสู่ Royal Hills Fest 2026 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-[#0b0e0a] border-t border-white/10 pt-14 pb-10 text-[#F3E7C8]/70 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
            <div className="md:col-span-6 space-y-5">
              <div>
                <p className="text-[10px] tracking-[0.28em] text-[#D8A934] mb-2">ROYAL HILLS FEST</p>
                <h3 className="font-display text-3xl sm:text-4xl font-bold tracking-widest text-[#FFF9ED]">2026</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#F3E7C8]/75 max-w-xl leading-relaxed">เทศกาลที่รวมกอล์ฟ ดนตรี ธรรมชาติ และช่วงเวลาแห่งความสุขไว้ในบรรยากาศรีสอร์ทท่ามกลางขุนเขา ณ รอยัลฮิลส์ จังหวัดนครนายก</p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="footer-meta"><Calendar className="w-3.5 h-3.5 text-[#D8A934]" /><span>14 พฤศจิกายน 2569</span></div>
                <div className="footer-meta"><MapPin className="w-3.5 h-3.5 text-[#C96F3D]" /><span>นครนายก, ประเทศไทย</span></div>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <p className="text-[10px] tracking-[0.23em] text-[#FFF9ED]">EXPLORE</p>
              <div className="grid gap-2 text-xs">
                <button onClick={() => onNavClick('home')} className="footer-link">หน้าหลัก</button>
                <button onClick={() => onNavClick('about')} className="footer-link">เกี่ยวกับงาน</button>
                <button onClick={() => onNavClick('experience')} className="footer-link">ประสบการณ์</button>
                <button onClick={() => onNavClick('schedule')} className="footer-link">กำหนดการ</button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <p className="text-[10px] tracking-[0.23em] text-[#FFF9ED]">STAY IN THE LOOP</p>
              <p className="text-[11px] leading-relaxed text-[#65705A]">ช่องทางโซเชียลมีเดียและข้อมูลเพิ่มเติมจะเปิดให้บริการเร็ว ๆ นี้</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Facebook', 'Instagram', 'TikTok'].map((name) => <span key={name} className="footer-social">{name}</span>)}
              </div>
              <p className="text-[10px] text-[#65705A] pt-2">ติดต่อสอบถาม: จะประกาศเร็ว ๆ นี้</p>
            </div>
          </div>

          <div className="pt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] tracking-wide text-[#65705A]">
            <p>© 2026 ROYAL HILLS FEST. สงวนลิขสิทธิ์ทุกประการ</p>
            <p className="flex items-center gap-1.5 text-[#D8A934]/90"><Sparkles className="w-3.5 h-3.5" /> GOLF · MUSIC · GOOD TIMES</p>
          </div>
        </div>
      </footer>
    </>
  );
};
