import React, { useState } from 'react';
import { Registration } from '../types';
import { storageService } from '../services/storageService';
import { User, Phone, Mail, Building, Users, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, X } from 'lucide-react';

interface RegistrationFlowProps {
  onSuccess: (registration: Registration) => void;
  onCancel: () => void;
}

const EVENT_CATEGORIES = [
  {
    id: 'cat-full',
    name: '[TBD] บัตรเข้างานแบบรวม (All-Access Pass)',
    description: 'สิทธิ์เข้าร่วมแข่งขันกอล์ฟ 18 หลุม, คอนเสิร์ตยามค่ำคืน, พื้นที่แคมป์ไฟเลานจ์ และบริการอาหารเครื่องดื่มต้อนรับ',
  },
  {
    id: 'cat-music',
    name: '[TBD] บัตรคอนเสิร์ตและแคมป์ไฟ (Night Fest Pass)',
    description: 'สิทธิ์เข้าชมการแสดงดนตรีสดภาคค่ำ โซนอาหารเครื่องดื่มเทศกาล และพื้นที่นั่งชิลล์รอบกองไฟ',
  },
  {
    id: 'cat-resort',
    name: '[TBD] แพ็กเกจรีสอร์ทพร้อมร่วมงาน (Weekend Package)',
    description: 'สิทธิ์เข้างานเทศกาลพร้อมห้องพักระดับพรีเมียม ณ รอยัลฮิลส์ กอล์ฟ รีสอร์ท แอนด์ สปา [รายละเอียดห้องพัก TBD]',
  },
];

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [participantsCount, setParticipantsCount] = useState(1);
  const [eventCategory, setEventCategory] = useState(EVENT_CATEGORIES[0].name);
  const [activityPreference, setActivityPreference] = useState('[TBD] ร่วมทั้งแข่งขันกอล์ฟ และ ดนตรีสด');
  const [notes, setNotes] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (!phoneNumber.trim()) errs.phoneNumber = 'กรุณากรอกหมายเลขโทรศัพท์';
    if (!email.trim()) {
      errs.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'กรุณากรอกอีเมลให้ถูกต้อง';
    }
    if (!organization.trim()) errs.organization = 'กรุณากรอกหน่วยงาน หรือระบุ "บุคคลทั่วไป"';
    if (participantsCount < 1) errs.participantsCount = 'จำนวนผู้เข้าร่วมงานต้องอย่างน้อย 1 ท่าน';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinalSubmit = () => {
    setSubmitting(true);

    setTimeout(() => {
      const newReg = storageService.createRegistration({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        organization: organization.trim(),
        participantsCount: Number(participantsCount),
        eventCategory,
        activityPreference,
        notes: notes.trim(),
      });

      setSubmitting(false);
      onSuccess(newReg);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#10140F]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#182719] border border-[#30391E] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="px-6 py-5 bg-[#10140F] border-b border-[#30391E] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#D8A934]">
              ROYAL HILLS FEST 2026
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#FFF9ED]">
              สมัครเข้าร่วมงาน
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="cursor-pointer text-[#F3E7C8]/70 hover:text-[#FFF9ED] text-xs font-medium px-3 py-1.5 rounded border border-[#30391E] hover:border-[#65705A] transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            ปิด
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-[#141d15] border-b border-[#30391E]/60">
          <div className="flex items-center justify-between text-xs font-medium tracking-wide">
            <span className={step >= 1 ? 'text-[#D8A934] font-semibold' : 'text-[#65705A]'}>
              1. ข้อมูลส่วนบุคคล
            </span>
            <span className="text-[#65705A]">/</span>
            <span className={step >= 2 ? 'text-[#D8A934] font-semibold' : 'text-[#65705A]'}>
              2. ข้อมูลการเข้าร่วมงาน
            </span>
            <span className="text-[#65705A]">/</span>
            <span className={step >= 3 ? 'text-[#D8A934] font-semibold' : 'text-[#65705A]'}>
              3. ตรวจสอบข้อมูล
            </span>
          </div>
          {/* Subtle Progress Bar */}
          <div className="w-full bg-[#10140F] h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#D8A934] h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8">
          {/* STEP 1: ข้อมูลส่วนบุคคล */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                  ชื่อ-นามสกุล <span className="text-[#C96F3D]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#65705A] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="เช่น วรภัทร เจริญรัตน์"
                    className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 pl-10 text-sm text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934] transition-colors"
                  />
                </div>
                {errors.fullName && <p className="text-xs text-[#C96F3D] mt-1">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                    หมายเลขโทรศัพท์ <span className="text-[#C96F3D]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#65705A] absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                      }}
                      placeholder="เช่น 081-234-5678"
                      className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 pl-10 text-sm text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934] transition-colors"
                    />
                  </div>
                  {errors.phoneNumber && <p className="text-xs text-[#C96F3D] mt-1">{errors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                    อีเมล <span className="text-[#C96F3D]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#65705A] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      placeholder="เช่น vorapat@gmail.com"
                      className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 pl-10 text-sm text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934] transition-colors"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-[#C96F3D] mt-1">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                    หน่วยงาน / บริษัท <span className="text-[#C96F3D]">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#65705A] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => {
                        setOrganization(e.target.value);
                        if (errors.organization) setErrors({ ...errors, organization: '' });
                      }}
                      placeholder="เช่น บุคคลทั่วไป หรือ ชมรมกอล์ฟ..."
                      className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 pl-10 text-sm text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934] transition-colors"
                    />
                  </div>
                  {errors.organization && <p className="text-xs text-[#C96F3D] mt-1">{errors.organization}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                    จำนวนผู้เข้าร่วมงาน <span className="text-[#C96F3D]">*</span>
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-[#65705A] absolute left-3.5 top-3.5" />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={participantsCount}
                      onChange={(e) => setParticipantsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 pl-10 text-sm text-[#FFF9ED] focus:outline-none focus:border-[#D8A934] transition-colors"
                    />
                  </div>
                  {errors.participantsCount && <p className="text-xs text-[#C96F3D] mt-1">{errors.participantsCount}</p>}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  className="cursor-pointer flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs tracking-wider px-6 py-3 rounded transition-all duration-200"
                >
                  ถัดไป
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ข้อมูลการเข้าร่วมงาน */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-2">
                  เลือกประเภทบัตรเข้าร่วมงาน [TBD]
                </label>
                <div className="space-y-3">
                  {EVENT_CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className={`block p-4 rounded-lg border cursor-pointer transition-all ${
                        eventCategory === cat.name
                          ? 'border-[#D8A934] bg-[#30391E]/50 ring-1 ring-[#D8A934]'
                          : 'border-[#30391E] bg-[#10140F]/60 hover:border-[#65705A]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="eventCategory"
                          value={cat.name}
                          checked={eventCategory === cat.name}
                          onChange={(e) => setEventCategory(e.target.value)}
                          className="mt-1 accent-[#D8A934]"
                        />
                        <div>
                          <p className="text-sm font-bold text-[#FFF9ED]">{cat.name}</p>
                          <p className="text-xs text-[#F3E7C8]/75 mt-0.5">{cat.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                  กิจกรรมที่สนใจเข้าร่วมเป็นพิเศษ [TBD]
                </label>
                <select
                  value={activityPreference}
                  onChange={(e) => setActivityPreference(e.target.value)}
                  className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 text-sm text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                >
                  <option value="[TBD] ร่วมทั้งแข่งขันกอล์ฟ และ ดนตรีสด">[TBD] ร่วมทั้งการแข่งขันกอล์ฟ และ เวทีดนตรีสดช่วงค่ำ</option>
                  <option value="[TBD] แข่งขันกอล์ฟ 18 หลุมเท่านั้น">[TBD] แข่งขันกอล์ฟ 18 หลุมเท่านั้น</option>
                  <option value="[TBD] เวทีดนตรีสดและแคมป์ไฟเท่านั้น">[TBD] เวทีดนตรีสดและแคมป์ไฟเท่านั้น</option>
                  <option value="[TBD] พักผ่อนรีสอร์ทและสปาเพื่อสุขภาพ">[TBD] พักผ่อนรีสอร์ทและสปาเพื่อสุขภาพ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-[#F3E7C8] mb-1.5">
                  ข้อความเพิ่มเติม / ความต้องการพิเศษ (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น อาหารเจ/มังสวิรัติ, อุปกรณ์กอล์ฟ, บริการรับส่ง..."
                  className="w-full bg-[#10140F] border border-[#30391E] rounded px-4 py-2.5 text-sm text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="cursor-pointer flex items-center gap-2 text-xs tracking-wide text-[#F3E7C8]/70 hover:text-[#FFF9ED] px-4 py-2.5 rounded border border-[#30391E]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="cursor-pointer flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs tracking-wider px-6 py-3 rounded transition-all duration-200"
                >
                  ตรวจสอบข้อมูล
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ตรวจสอบข้อมูล */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#10140F] border border-[#30391E]">
                <h4 className="font-display text-sm font-bold text-[#D8A934] tracking-wide mb-4 pb-2 border-b border-[#30391E]">
                  สรุปข้อมูลการสมัคร
                </h4>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <dt className="text-[#65705A]">ชื่อ-นามสกุล</dt>
                    <dd className="font-semibold text-sm text-[#FFF9ED] mt-0.5">{fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#65705A]">หมายเลขโทรศัพท์</dt>
                    <dd className="font-semibold text-sm text-[#FFF9ED] mt-0.5">{phoneNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-[#65705A]">อีเมล</dt>
                    <dd className="font-semibold text-[#F3E7C8] mt-0.5 truncate">{email}</dd>
                  </div>
                  <div>
                    <dt className="text-[#65705A]">หน่วยงาน / บริษัท</dt>
                    <dd className="font-semibold text-[#F3E7C8] mt-0.5">{organization}</dd>
                  </div>
                  <div>
                    <dt className="text-[#65705A]">จำนวนผู้เข้าร่วมงาน</dt>
                    <dd className="font-semibold text-[#FFF9ED] mt-0.5">{participantsCount} ท่าน</dd>
                  </div>
                  <div>
                    <dt className="text-[#65705A]">ประเภทบัตร</dt>
                    <dd className="font-semibold text-[#D8A934] mt-0.5">{eventCategory}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#65705A]">กิจกรรมที่สนใจ</dt>
                    <dd className="text-[#F3E7C8] mt-0.5">{activityPreference}</dd>
                  </div>
                  {notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-[#65705A]">ความต้องการพิเศษ</dt>
                      <dd className="text-[#F3E7C8] mt-0.5 italic">{notes}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="p-3.5 rounded bg-[#182719]/60 border border-[#65705A]/40 flex items-start gap-3 text-xs text-[#F3E7C8]/80 leading-relaxed">
                <ShieldCheck className="w-5 h-5 text-[#D8A934] shrink-0 mt-0.5" />
                <p>
                  เมื่อกดยืนยันการสมัคร ระบบจะออกรหัสการสมัคร (<span className="text-[#D8A934] font-mono">RHF26-XXXXXX</span>) และสร้าง QR Code บัตรเข้าร่วมงานทันที สำหรับแสดงแก่เจ้าหน้าที่หน้างานในวันที่ 14 พฤศจิกายน 2569
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="cursor-pointer flex items-center gap-2 text-xs tracking-wide text-[#F3E7C8]/70 hover:text-[#FFF9ED] px-4 py-2.5 rounded border border-[#30391E]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  แก้ไขข้อมูล
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="cursor-pointer flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] disabled:opacity-50 text-[#10140F] font-bold text-xs tracking-wider px-7 py-3.5 rounded shadow-lg shadow-[#D8A934]/30 transition-all duration-200"
                >
                  {submitting ? (
                    <>กำลังออกบัตรเข้าร่วมงาน...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      ยืนยันการสมัคร
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
