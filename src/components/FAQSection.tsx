import React, { useState } from 'react';
import { Atmosphere } from './fx';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem { id: string; question: string; answer: string; category: string; }

const FAQS: FAQItem[] = [
  { id: 'faq-date-venue', category: 'GENERAL', question: 'วันและเวลาจัดงาน รวมถึงสถานที่จัดงานคือที่ใด?', answer: 'งาน ROYAL HILLS FEST 2026 จัดขึ้นในวันเสาร์ที่ 14 พฤศจิกายน 2569 ณ รอยัลฮิลส์ กอล์ฟ รีสอร์ท แอนด์ สปา จังหวัดนครนายก โดยกำหนดการและเวลาเปิดประตูเข้างานอย่างเป็นทางการอยู่ระหว่างการสรุป' },
  { id: 'faq-registration', category: 'TICKETS', question: 'ขั้นตอนการสมัครเข้าร่วมงานทำอย่างไร?', answer: 'ท่านสามารถสมัครเข้าร่วมงานล่วงหน้าผ่านเว็บไซต์นี้ได้ทันที โดยกดปุ่ม "สมัครเข้าร่วมงาน" กรอกข้อมูลส่วนบุคคลและข้อมูลการเข้าร่วมงาน เมื่อยืนยันเรียบร้อย ระบบจะออกรหัสการสมัครและสร้าง QR Code ดิจิทัลสำหรับใช้เข้างานให้ทันที' },
  { id: 'faq-qr-pass', category: 'TICKETS', question: 'บัตรเข้างานดิจิทัล (QR Code) คืออะไร และสามารถเปิดดูได้อย่างไร?', answer: 'ผู้สมัครทุกคนจะได้รับบัตรดิจิทัลเฉพาะบุคคล พร้อมรหัสการสมัคร (รูปแบบ RHF26-XXXXXX) และ QR Code ท่านสามารถเข้ามาที่หน้า "QR Code ของฉัน" เพื่อเปิดแสดง บันทึกภาพ หรือดาวน์โหลดเก็บไว้ในโทรศัพท์ได้ตลอดเวลา' },
  { id: 'faq-check-in-wristband', category: 'CHECK-IN', question: 'การเช็กอินหน้างานและการรับริสแบนด์ (Wristband) มีขั้นตอนอย่างไร?', answer: 'เมื่อเดินทางมาถึงบริเวณหน้างานในวันที่ 14 พฤศจิกายน 2569 ให้เปิดแสดง QR Code บนโทรศัพท์มือถือแก่เจ้าหน้าที่ เจ้าหน้าที่จะทำการสแกนตรวจสอบสิทธิ์เพื่อเช็กอินและมอบสายรัดข้อมือ (Wristband) ประจำตัวสำหรับผ่านเข้าพื้นที่กิจกรรม โดยระบบจะบันทึกและป้องกันการสแกนซ้ำ' },
  { id: 'faq-golf-tournament', category: 'GOLF', question: 'รูปแบบการแข่งขันกอล์ฟและกฎกติกาเป็นอย่างไร?', answer: 'รูปแบบการแข่งขัน การจัดกลุ่มแฮนดิแคป เวลาทีออฟ และการชิงรางวัล อยู่ระหว่างการกำหนดรายละเอียดอย่างเป็นทางการ และจะแจ้งให้ผู้สมัครทราบล่วงหน้า' },
  { id: 'faq-music-artists', category: 'MUSIC', question: 'ศิลปินและวงดนตรีที่จะมาแสดงในงานมีใครบ้าง?', answer: 'รายชื่อศิลปินและตารางการแสดงดนตรีสดยามค่ำคืนอยู่ระหว่างขั้นตอนการยืนยันสัญญา โดยจะประกาศอย่างเป็นทางการผ่านช่องทางประชาสัมพันธ์ของงาน' },
  { id: 'faq-accommodation', category: 'STAY', question: 'มีบริการที่พักภายในรีสอร์ทสำหรับผู้ร่วมงานหรือไม่?', answer: 'แพ็กเกจห้องพักและวิลล่าราคาพิเศษสำหรับผู้ร่วมงาน Royal Hills Fest อยู่ระหว่างการจัดสรร ท่านสามารถระบุความสนใจในช่องข้อความเพิ่มเติมระหว่างการสมัครได้' },
];

export const FAQSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(FAQS[0].id);

  return (
    <section id="faq" className="isolate relative py-24 sm:py-32 bg-[#10140F] border-t border-white/5 overflow-hidden">
      <Atmosphere fireflies={12} embers={6} />
      <div className="faq-orbit absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-[0.85fr_1.45fr] gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-28 faq-scene-heading">
            <div className="flex items-center gap-4 mb-4"><span className="section-index">04</span><p className="eyebrow">GOOD TO KNOW</p></div>
            <h2 className="font-display text-4xl sm:text-6xl font-bold text-[#FFF9ED] leading-[0.95]">QUESTIONS.<br /><span className="text-[#D8A934]">ANSWERED.</span></h2>
            <p className="text-sm sm:text-base text-[#F3E7C8]/65 leading-relaxed mt-6 max-w-md">ทุกข้อมูลสำคัญที่ช่วยให้คุณเตรียมตัวได้ง่ายขึ้น ตั้งแต่การสมัคร บัตรดิจิทัล เช็กอิน กอล์ฟ ไปจนถึงที่พัก</p>

            <div className="mt-8 flex flex-wrap gap-2">
              {[...new Set(FAQS.map((faq) => faq.category))].map((category) => (
                <span key={category} className="faq-chip">{category}</span>
              ))}
            </div>

            <div className="mt-10 hidden lg:block rounded-2xl border border-[#D8A934]/20 bg-[#D8A934]/6 p-5">
              <p className="text-[9px] tracking-[0.26em] text-[#D8A934]">ONE FESTIVAL / ONE DATE</p>
              <p className="font-display text-2xl font-bold text-[#FFF9ED] mt-2">14 NOVEMBER 2026</p>
              <p className="text-[11px] text-[#F3E7C8]/55 mt-1">Royal Hills · Nakhon Nayok</p>
            </div>
          </div>

          <div className="space-y-3 faq-scene-list">
            {FAQS.map((faq, index) => {
              const isOpen = openId === faq.id;
              return (
                <div key={faq.id} className={`faq-card rounded-2xl border overflow-hidden transition-all duration-300 ${isOpen ? 'border-[#D8A934]/45 bg-[#182719]/70 shadow-2xl shadow-black/20' : 'border-white/10 bg-white/[0.025]'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="w-full p-5 sm:p-6 text-left flex items-start gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className={`faq-number ${isOpen ? 'active' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-[9px] tracking-[0.25em] text-[#D8A934] block mb-1">{faq.category}</span>
                      <span className="font-display text-base sm:text-lg font-semibold text-[#FFF9ED] leading-snug">{faq.question}</span>
                    </span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-[#D8A934] transition-transform duration-300 mt-1 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`faq-answer-grid ${isOpen ? 'is-open' : ''}`}>
                    <div className="px-5 sm:px-6 pb-6 pl-[4.55rem] sm:pl-[4.9rem] text-xs sm:text-sm leading-relaxed text-[#F3E7C8]/72">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
