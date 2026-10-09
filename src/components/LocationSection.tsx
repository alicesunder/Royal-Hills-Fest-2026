import React from 'react';
import { Atmosphere } from './fx';
import venueImg from '../assets/images/venue_resort_spa_1791251845700.jpg';
import { MapPin, Navigation, Car, Mountain, ArrowRight } from 'lucide-react';

const JOURNEY = [
  { no: '01', title: 'BANGKOK', meta: 'ต้นทาง', icon: Car },
  { no: '02', title: 'NAKHON NAYOK', meta: 'เดินทางประมาณ 1.5–2 ชม.', icon: Navigation },
  { no: '03', title: 'ROYAL HILLS', meta: 'จุดหมายปลายทาง', icon: Mountain },
];

export const LocationSection: React.FC = () => {
  return (
    <section id="location" className="isolate relative py-24 sm:py-32 bg-[#10140F] overflow-hidden border-t border-white/5">
      <Atmosphere stars={36} mist fireflies={8} />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="location-contour contour-a" />
        <div className="location-contour contour-b" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12 sm:mb-16 location-heading">
          <div>
            <div className="flex items-center gap-4 mb-4"><span className="section-index">03</span><p className="eyebrow">THE DESTINATION</p></div>
            <h2 className="font-display text-4xl sm:text-6xl font-bold text-[#FFF9ED] leading-[0.95]">ARRIVE AT<br /><span className="text-[#D8A934]">ROYAL HILLS.</span></h2>
          </div>
          <p className="max-w-md text-sm sm:text-base text-[#F3E7C8]/72 leading-relaxed">สถานที่ที่ทำให้คำว่า “ออกไปพัก” มีภาพชัดเจนขึ้น — ขุนเขา สนามกอล์ฟ ป่าสน และรีสอร์ทในพื้นที่เดียวกัน</p>
        </div>

        <div className="relative rounded-[30px] overflow-hidden border border-white/10 shadow-2xl location-scene-card">
          <div className="relative h-[420px] sm:h-[540px] location-hero-media">
            <img src={venueImg} alt="Royal Hills Golf Resort and Spa" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#10140F] via-[#10140F]/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10140F]/70 via-transparent to-[#10140F]/30" />
            <div className="absolute top-5 left-5 sm:top-7 sm:left-7 flex items-center gap-2 px-3 py-2 rounded-full bg-[#10140F]/55 backdrop-blur-xl border border-white/10 text-[9px] tracking-[0.25em] text-[#FFF9ED]/85">
              <MapPin className="w-3.5 h-3.5 text-[#D8A934]" /> SARIKA · NAKHON NAYOK
            </div>
            <div className="absolute bottom-6 left-5 right-5 sm:left-8 sm:right-8 sm:bottom-8">
              <div className="max-w-2xl">
                <p className="text-[10px] tracking-[0.28em] text-[#D8A934] mb-2">THE VENUE</p>
                <h3 className="font-display text-3xl sm:text-5xl font-bold text-[#FFF9ED] leading-tight">ROYAL HILLS GOLF RESORT & SPA</h3>
                <p className="text-xs sm:text-sm text-[#F3E7C8]/80 mt-3 leading-relaxed">ตำบลสาริกา อำเภอเมือง จังหวัดนครนายก · โอบล้อมด้วยแนวทิวเขา ป่าสนธรรมชาติ และทะเลสาบ</p>
              </div>
            </div>
          </div>

          <div className="relative bg-[#141A12]/96 backdrop-blur-xl p-5 sm:p-7">
            <div className="grid md:grid-cols-3 gap-0 border border-white/10 rounded-2xl overflow-hidden">
              {JOURNEY.map(({ no, title, meta, icon: Icon }, index) => (
                <div key={title} className="relative p-5 sm:p-6 bg-white/[0.02] flex gap-4 items-start">
                  <div className="shrink-0 h-10 w-10 rounded-full border border-[#D8A934]/35 bg-[#D8A934]/10 flex items-center justify-center"><Icon className="w-4 h-4 text-[#D8A934]" /></div>
                  <div><p className="font-mono text-[9px] text-[#65705A]">{no}</p><p className="font-display text-lg sm:text-xl font-bold text-[#FFF9ED] mt-0.5">{title}</p><p className="text-[10px] text-[#F3E7C8]/55 mt-1">{meta}</p></div>
                  {index < JOURNEY.length - 1 && <ArrowRight className="hidden md:block absolute right-[-8px] top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[#D8A934] bg-[#141A12]" />}
                </div>
              ))}
            </div>

            <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="rounded-2xl border border-white/10 bg-[#10140F]/70 px-5 py-4">
                <p className="text-[9px] tracking-[0.25em] text-[#D8A934]">GOOD TO KNOW</p>
                <p className="text-xs sm:text-sm text-[#F3E7C8]/72 mt-1">พิกัดโดยประมาณ 14.3039° N, 101.3284° E · เตรียมตัวเผื่อเวลาสำหรับการเช็กอินและรับ Wristband หน้างาน</p>
              </div>
              <a href="https://www.google.com/maps/search/?api=1&query=Royal+Hills+Golf+Resort+and+Spa+Nakhon+Nayok" target="_blank" rel="noopener noreferrer" className="luxury-btn luxury-btn-primary whitespace-nowrap">
                เปิด Google Maps <Navigation className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
