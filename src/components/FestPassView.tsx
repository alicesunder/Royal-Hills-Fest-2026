import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Registration } from '../types';
import { storageService } from '../services/storageService';
import { Download, Copy, Check, Search, Calendar, MapPin, Ticket } from 'lucide-react';

interface FestPassViewProps {
  initialRegistration?: Registration | null;
  onGoToCheckIn?: (registrationId: string) => void;
}

export const FestPassView: React.FC<FestPassViewProps> = ({
  initialRegistration,
  onGoToCheckIn,
}) => {
  const [currentReg, setCurrentReg] = useState<Registration | null>(initialRegistration || null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [copied, setCopied] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);

  // If no initial registration passed in, check localStorage for last registered pass
  useEffect(() => {
    if (!currentReg) {
      const lastId = storageService.getLastRegisteredId();
      if (lastId) {
        const found = storageService.getRegistrationById(lastId);
        if (found) {
          setCurrentReg(found);
          return;
        }
      }
      // If none, default to one of the demo attendees
      const list = storageService.getRegistrations();
      if (list.length > 0) {
        setCurrentReg(list[0]);
      }
    }
  }, [currentReg]);

  // Generate QR Code data URL when currentReg changes
  useEffect(() => {
    if (currentReg) {
      QRCode.toDataURL(currentReg.id, {
        width: 320,
        margin: 2,
        color: {
          dark: '#10140F',
          light: '#F3E7C8',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [currentReg]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const query = lookupQuery.trim();
    if (!query) {
      setLookupError('กรุณากรอกรหัสการสมัคร หรือ อีเมล');
      return;
    }

    const byId = storageService.getRegistrationById(query);
    if (byId) {
      setCurrentReg(byId);
      storageService.setLastRegisteredId(byId.id);
      setLookupQuery('');
      return;
    }

    const byEmail = storageService.getRegistrationByEmail(query);
    if (byEmail) {
      setCurrentReg(byEmail);
      storageService.setLastRegisteredId(byEmail.id);
      setLookupQuery('');
      return;
    }

    setLookupError(`ไม่พบข้อมูลการสมัครสำหรับ "${query}" กรุณาตรวจสอบรหัสหรืออีเมลอีกครั้ง`);
  };

  const handleCopyId = () => {
    if (!currentReg) return;
    navigator.clipboard.writeText(currentReg.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !currentReg) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `RoyalHillsFest2026_${currentReg.id}_Pass.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section id="my-qr" className="py-20 sm:py-28 bg-[#10140F] relative min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-[#D8A934] mb-2">
            บัตรเข้าร่วมงานดิจิทัล
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#FFF9ED]">
            QR Code ของฉัน
          </h2>
          <div className="w-16 h-0.5 bg-[#D8A934] mx-auto mt-4 mb-4" />
          <p className="text-sm sm:text-base text-[#F3E7C8]/90 font-medium">
            แสดง QR Code นี้แก่เจ้าหน้าที่เมื่อเดินทางมาถึงหน้างาน
          </p>
          <p className="text-xs text-[#65705A] mt-1">
            เพื่อใช้สำหรับการเช็กอินและรับสายรัดข้อมือ (Wristband) เข้าพื้นที่งาน
          </p>
        </div>

        {/* Pass Card Container */}
        {currentReg ? (
          <div className="max-w-md mx-auto">
            {/* The Physical-Style Pass Card */}
            <div
              ref={passCardRef}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#182719] via-[#141d15] to-[#10140F] border-2 border-[#D8A934]/60 shadow-2xl p-6 sm:p-8"
            >
              {/* Top Accent Strip */}
              <div className="flex items-center justify-between border-b border-[#30391E] pb-4 mb-6">
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#D8A934] font-bold block">
                    บัตรเข้าร่วมงานอย่างเป็นทางการ
                  </span>
                  <h3 className="font-display text-lg font-bold text-[#FFF9ED] tracking-wider">
                    ROYAL HILLS <span className="text-[#D8A934]">FEST</span> 2026
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] tracking-wider text-[#65705A] block">
                    สถานะบัตร
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      currentReg.wristbandStatus === 'WRISTBAND_ISSUED'
                        ? 'text-[#D8A934]'
                        : currentReg.checkInStatus === 'CHECKED_IN'
                        ? 'text-emerald-400'
                        : 'text-[#F3E7C8]'
                    }`}
                  >
                    {currentReg.wristbandStatus === 'WRISTBAND_ISSUED'
                      ? 'รับริสแบนด์แล้ว'
                      : currentReg.checkInStatus === 'CHECKED_IN'
                      ? 'เช็กอินแล้ว'
                      : 'ยังไม่ได้เช็กอิน'}
                  </span>
                </div>
              </div>

              {/* Dominant QR Code Block */}
              <div className="my-4 flex flex-col items-center justify-center">
                <div className="p-3.5 bg-[#F3E7C8] rounded-xl shadow-inner border-2 border-[#D8A934] flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code สำหรับ ${currentReg.fullName}`}
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-xs text-[#10140F]">
                      กำลังสร้าง QR Code...
                    </div>
                  )}
                </div>

                {/* ID badge under QR */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold tracking-widest text-[#D8A934] bg-[#10140F] px-3 py-1 rounded border border-[#30391E]">
                    {currentReg.id}
                  </span>
                  <button
                    onClick={handleCopyId}
                    title="คัดลอกรหัสการสมัคร"
                    className="p-1.5 rounded bg-[#10140F] border border-[#30391E] text-[#F3E7C8] hover:text-[#D8A934] hover:border-[#D8A934] transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Attendee Details */}
              <div className="border-t border-[#30391E] pt-5 mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#65705A]">
                    ชื่อผู้เข้าร่วม
                  </span>
                  <span className="font-display text-base font-bold text-[#FFF9ED] text-right">
                    {currentReg.fullName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#65705A]">
                    หน่วยงาน / บริษัท
                  </span>
                  <span className="text-xs text-[#F3E7C8] text-right">
                    {currentReg.organization}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#65705A]">
                    ประเภทบัตร
                  </span>
                  <span className="text-xs font-semibold text-[#D8A934] text-right">
                    {currentReg.eventCategory}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#65705A]">
                    จำนวนผู้เข้าร่วม
                  </span>
                  <span className="text-xs text-[#FFF9ED] font-mono">
                    {currentReg.participantsCount} ท่าน
                  </span>
                </div>

                <div className="pt-2 border-t border-[#30391E]/60 text-xs text-[#F3E7C8]/80 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#D8A934] shrink-0" />
                    <span>14 พฤศจิกายน 2569 (14 NOVEMBER 2026)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C96F3D] shrink-0" />
                    <span className="truncate">รอยัลฮิลส์ กอล์ฟ รีสอร์ท แอนด์ สปา นครนายก</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pass Actions: Save / Download QR */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadQr}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs tracking-wider py-3.5 px-4 rounded shadow-lg shadow-[#D8A934]/25 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด QR Code
              </button>
              {onGoToCheckIn && (
                <button
                  onClick={() => onGoToCheckIn(currentReg.id)}
                  className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-[#182719] hover:bg-[#30391E] text-[#FFF9ED] border border-[#65705A]/50 font-semibold text-xs tracking-wider py-3.5 px-4 rounded transition-all duration-200"
                >
                  <Ticket className="w-4 h-4 text-[#D8A934]" />
                  จำลองการสแกนหน้างาน
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 p-8 rounded-xl border border-[#30391E] bg-[#182719]/40 max-w-md mx-auto">
            <Ticket className="w-12 h-12 text-[#65705A] mx-auto mb-4" />
            <p className="text-sm text-[#F3E7C8]">ไม่พบบัตรที่ลงทะเบียนไว้ในอุปกรณ์นี้</p>
            <p className="text-xs text-[#65705A] mt-1">
              กรุณาสมัครเข้าร่วมงาน หรือค้นหาด้วยรหัสการสมัคร / อีเมลด้านล่าง
            </p>
          </div>
        )}

        {/* Pass Lookup Form for returning users */}
        <div className="mt-14 max-w-md mx-auto pt-8 border-t border-[#30391E]/60">
          <h4 className="text-xs font-bold tracking-wide text-[#F3E7C8]/90 mb-3 text-center">
            ค้นหาบัตรลงทะเบียนของคุณ
          </h4>
          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#65705A] absolute left-3 top-3" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => {
                  setLookupQuery(e.target.value);
                  if (lookupError) setLookupError('');
                }}
                placeholder="รหัสการสมัคร (เช่น RHF26-892401) หรือ อีเมล"
                className="w-full bg-[#182719] border border-[#30391E] rounded px-3 py-2.5 pl-9 text-xs text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934]"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer bg-[#30391E] hover:bg-[#65705A] text-[#FFF9ED] text-xs font-semibold px-4 py-2.5 rounded transition-colors whitespace-nowrap"
            >
              ค้นหา
            </button>
          </form>
          {lookupError && (
            <p className="text-xs text-[#C96F3D] mt-2 text-center">{lookupError}</p>
          )}
        </div>
      </div>
    </section>
  );
};
