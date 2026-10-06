import React from 'react';
import { Atmosphere } from './fx';
import venueImg from '../assets/images/venue_resort_spa_1791251845700.jpg';
import golfImg from '../assets/images/exp_golf_resort_1791251812446.jpg';
import { Compass, Music, Flame, Trees, ArrowUpRight } from 'lucide-react';

const PILLARS = [
  { icon: Trees, no: '01', title: 'MOUNTAIN', body: 'สายหมอก ลมหนาว และวิวขุนเขาที่ทำให้ทั้งวันรู้สึกช้าลง', accent: 'text-[#9BA98D]' },
  { icon: Compass, no: '02', title: 'GOLF', body: '18 หลุมท่ามกลางสนามธรรมชาติและอากาศบริสุทธิ์', accent: 'text-[#D8A934]' },
  { icon: Music, no: '03', title: 'MUSIC', body: 'เสียงดนตรีสดเปลี่ยนบรรยากาศยามเย็นให้กลายเป็นค่ำคืนที่น่าจดจำ', accent: 'text-[#E7B5A0]' },
  { icon: Flame, no: '04', title: 'CAMPFIRE', body: 'พื้นที่นั่งชิลล์รอบกองไฟสำหรับบทสนทนาและความทรงจำดี ๆ', accent: 'text-[#C96F3D]' },
];

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="isolate section-editorial relative overflow-hidden bg-[#10140F] border-t border-white/5">
      <Atmosphere fireflies={14} mist lights />
      <div className="absolute -left-20 top-20 w-72 h-72 bg-[#5B6D42]/12 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute right-0 bottom-20 w-96 h-96 bg-[#D8A934]/6 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 about-copy-scene">
            <div className="flex items-start gap-4 mb-8">
              <span className="section-index">01</span>
              <div>
                <p className="eyebrow">THE FESTIVAL</p>
                <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold text-[#FFF9ED] leading-[0.95] tracking-tight">
                  ONE DAY.
                  <span className="block text-[#D8A934]">ONE PLACE.</span>
                  <span className="block">ONE FEELING.</span>
                </h2>
              </div>
            </div>

            <p className="font-editorial text-xl sm:text-2xl text-[#F3E7C8]/92 max-w-2xl leading-relaxed">
              Royal Hills Fest 2026 คือการออกแบบ “หนึ่งวัน” ให้กลายเป็นความทรงจำเต็มรูปแบบ — จากแฟร์เวย์ยามเช้า สู่เสียงเพลงยามเย็น และแสงไฟรอบกองไฟในค่ำคืนเดียวกัน
            </p>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 border-y border-white/10">
              {[
                ['18', 'HOLES'],
                ['01', 'DAY'],
                ['05', 'MOMENTS'],
                ['01', 'DESTINATION'],
              ].map(([big, label]) => (
                <div key={label} className="py-5 px-3 border-r last:border-r-0 border-white/10">
                  <p className="font-display text-3xl sm:text-4xl font-bold text-[#FFF9ED]">{big}</p>
                  <p className="text-[9px] tracking-[0.25em] text-[#D8A934] mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid sm:grid-cols-2 gap-4 about-pillars">
              {PILLARS.map(({ icon: Icon, no, title, body, accent }) => (
                <div key={title} className="pillar-card group">
                  <div className="flex items-start gap-4">
                    <div className={`pillar-icon ${accent}`}><Icon className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] text-[#65705A]">{no}</span>
                        <span className="text-[10px] tracking-[0.25em] font-semibold text-[#D8A934]">{title}</span>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed text-[#F3E7C8]/75">{body}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#65705A] ml-auto opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 lg:pt-12 about-visual-scene">
            <div className="about-photo-stack relative">
              <div className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-2xl aspect-[0.82] group about-hero-photo">
                <img src={venueImg} alt="รอยัลฮิลส์ กอล์ฟ รีสอร์ท แอนด์ สปา" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10140F]/95 via-[#10140F]/20 to-transparent" />
                <div className="absolute top-5 left-5 px-3 py-1.5 rounded-full bg-[#10140F]/55 backdrop-blur-md border border-white/10 text-[9px] tracking-[0.23em] text-[#FFF9ED]/85">SARIKA · NAKHON NAYOK</div>
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-[10px] tracking-[0.28em] text-[#D8A934] mb-2">THE SETTING</p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-[#FFF9ED] leading-tight">ธรรมชาติที่กลายเป็นเวที</p>
                </div>
              </div>
              <div className="about-photo-float absolute -bottom-8 -left-8 w-40 sm:w-52 rounded-2xl overflow-hidden border border-[#D8A934]/30 shadow-2xl hidden sm:block">
                <img src={golfImg} alt="สนามกอล์ฟท่ามกลางสายหมอก" className="w-full aspect-[0.82] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10140F]/90 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-[9px] tracking-[0.2em] text-[#F3E7C8]/90">MORNING FAIRWAY</div>
              </div>
              <div className="absolute -right-3 top-8 h-24 w-px bg-gradient-to-b from-transparent via-[#D8A934] to-transparent hidden lg:block" />
            </div>
          </div>
        </div>

        <div className="mt-20 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] tracking-[0.18em] text-[#65705A] uppercase">
          <span>ROYAL HILLS GOLF RESORT AND SPA</span>
          <span>14 NOVEMBER 2026 · NAKHON NAYOK, THAILAND</span>
        </div>
      </div>
    </section>
  );
};
