import React, { useState, useEffect } from 'react';
import { CartItem, Order, AttendeeInfo } from '../types';
import {
  X,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Ticket,
  Copy,
  Check,
  Users,
  Crown,
} from 'lucide-react';

interface CheckoutModalProps {
  cart: CartItem[];
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  onClose,
  onOrderCompleted,
}) => {
  // Step 1: attendee details, Step 2: review and register, Step 3: QR tickets
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Buyer Info
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [useBuyerAsFirstAttendee, setUseBuyerAsFirstAttendee] = useState(true);

  // Determine items in cart
  const normalItem = cart.find((i) => i.ticketType.id === 'tt-normal');
  const vipItem = cart.find((i) => i.ticketType.id === 'tt-vip');

  const normalQty = normalItem?.quantity || 0;
  const vipTableQty = vipItem?.quantity || 0;

  // Normal Ticket Attendees
  const [normalAttendees, setNormalAttendees] = useState<AttendeeInfo[]>([]);

  // VIP Tables Attendee Rosters: 1 entry per VIP table, each has 6 attendee names
  const [vipTablesRoster, setVipTablesRoster] = useState<{ tableIndex: number; attendeeNames: string[] }[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Server-created free registration and secure ticket lookup.
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [checkoutCredentials, setCheckoutCredentials] = useState<{ idempotencyKey: string; lookupToken: string } | null>(null);
  const [lookupToken, setLookupToken] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedLookupDetails, setCopiedLookupDetails] = useState(false);

  // Initialize Normal attendees
  useEffect(() => {
    const list: AttendeeInfo[] = [];
    for (let i = 0; i < normalQty; i++) {
      list.push({
        ticketNumber: i + 1,
        attendeeName: i === 0 && useBuyerAsFirstAttendee && vipTableQty === 0 ? buyerName : '',
        attendeePhone: i === 0 && useBuyerAsFirstAttendee && vipTableQty === 0 ? buyerPhone : '',
        attendeeEmail: i === 0 && useBuyerAsFirstAttendee && vipTableQty === 0 ? buyerEmail : '',
      });
    }
    setNormalAttendees(list);
  }, [normalQty, vipTableQty]);

  // Initialize VIP tables rosters (each table has 6 seats)
  useEffect(() => {
    const rosters: { tableIndex: number; attendeeNames: string[] }[] = [];
    for (let t = 0; t < vipTableQty; t++) {
      const names: string[] = [];
      for (let s = 0; s < 6; s++) {
        names.push(t === 0 && s === 0 && useBuyerAsFirstAttendee ? buyerName : '');
      }
      rosters.push({ tableIndex: t + 1, attendeeNames: names });
    }
    setVipTablesRoster(rosters);
  }, [vipTableQty]);

  // Auto-fill buyer into seat 1
  useEffect(() => {
    if (useBuyerAsFirstAttendee && buyerName) {
      if (vipTableQty > 0) {
        setVipTablesRoster((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          next[0] = {
            ...next[0],
            attendeeNames: [buyerName, ...next[0].attendeeNames.slice(1)],
          };
          return next;
        });
      } else if (normalAttendees.length > 0) {
        setNormalAttendees((prev) => {
          const next = [...prev];
          next[0] = {
            ...next[0],
            attendeeName: buyerName,
            attendeePhone: buyerPhone,
            attendeeEmail: buyerEmail,
          };
          return next;
        });
      }
    }
  }, [buyerName, buyerPhone, buyerEmail, useBuyerAsFirstAttendee, vipTableQty]);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!buyerName.trim()) errs.buyerName = 'กรุณากรอกชื่อ-นามสกุลผู้ซื้อ';
    if (!buyerPhone.trim()) errs.buyerPhone = 'กรุณากรอกหมายเลขโทรศัพท์';
    if (!buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      errs.buyerEmail = 'กรุณากรอกอีเมลให้ถูกต้อง';
    }

    // Normal tickets validation: each normal ticket must have attendee name
    normalAttendees.forEach((att, idx) => {
      if (!att.attendeeName.trim()) {
        errs[`norm_name_${idx}`] = `กรุณากรอกชื่อผู้เข้าร่วมสำหรับบัตรใบที่ ${idx + 1}`;
      }
    });

    // VIP tables: only attendee 1 (or buyer) is required per table, attendees 2-6 can be blank
    vipTablesRoster.forEach((tbl, tIdx) => {
      const firstPerson = tbl.attendeeNames[0];
      if (!firstPerson || !firstPerson.trim()) {
        errs[`vip_${tIdx}_seat_0`] = `กรุณาระบุชื่อผู้เข้าร่วมคนที่ 1 สำหรับโต๊ะที่ ${tbl.tableIndex}`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegisterFree = async () => {
    setCheckoutError('');
    setIsCreatingOrder(true);

    try {
      // Reuse the same idempotency key on retries so a double-click cannot
      // reserve extra stock or issue duplicate QR tickets.
      const credentials = checkoutCredentials || ticketingApiService.createCredentials();
      if (!checkoutCredentials) setCheckoutCredentials(credentials);

      const result = await ticketingApiService.createOrder({
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerEmail: buyerEmail.trim(),
        cart,
        normalAttendees,
        vipTables: vipTablesRoster,
        idempotencyKey: credentials.idempotencyKey,
        lookupToken: credentials.lookupToken,
      });

      setCreatedOrder(result.order);
      setLookupToken(result.credentials.lookupToken);

      if (result.order.paymentStatus !== 'PAID' || result.order.tickets.length < 1) {
        throw new Error('ระบบยังยืนยันการลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้จัดงาน');
      }

      setStep(3);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCopyOrderId = () => {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCopyLookupDetails = async () => {
    if (!createdOrder || !lookupToken) return;
    const details = 'ROYAL HILLS FEST 2026\nเลขลงทะเบียน: ' + createdOrder.id +
      '\nรหัสติดตามส่วนตัว: ' + lookupToken +
      '\nเก็บรหัสนี้เป็นส่วนตัว ใช้ตรวจสอบสถานะการลงทะเบียนของคุณ';
    try {
      await navigator.clipboard.writeText(details);
      setCopiedLookupDetails(true);
      setTimeout(() => setCopiedLookupDetails(false), 2500);
    } catch {
      setCheckoutError('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกและคัดลอกรหัสติดตามด้วยตนเอง');
    }
  };

  return (
    <div className="checkout-backdrop fixed inset-0 z-50 overflow-y-auto bg-[#10140F]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="checkout-panel relative w-full max-w-2xl bg-[#182719] border border-[#30391E] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="checkout-panel-header px-6 py-4 bg-[#10140F] border-b border-[#30391E] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#D8A934]">
              ROYAL HILLS FEST 2026
            </span>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#FFF9ED]">
              {step === 1 && 'ข้อมูลผู้ซื้อและผู้เข้าร่วมงาน'}
              {step === 2 && 'สรุปรายการสั่งซื้อ'}
              {step === 3 && 'ลงทะเบียนสำเร็จ'}
              {step === 3 && 'ลงทะเบียนสำเร็จ'}
            </h3>
          </div>
          {step !== 3 && (
            <button
              onClick={onClose}
              className="cursor-pointer text-[#F3E7C8]/70 hover:text-[#FFF9ED] p-1 rounded-full hover:bg-[#30391E] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress Line */}
        <div className="checkout-step-progress px-6 py-2.5 bg-[#141d15] border-b border-[#30391E]/60 flex items-center justify-between text-[11px] text-[#65705A]">
          <span className={step >= 1 ? 'text-[#D8A934] font-semibold' : ''}>1. ข้อมูล</span>
          <span>&rarr;</span>
          <span className={step >= 2 ? 'text-[#D8A934] font-semibold' : ''}>2. ตรวจสอบ</span>
          <span>&rarr;</span>
          <span className={step === 3 ? 'text-emerald-400 font-semibold' : ''}>3. รับ QR</span>
        </div>

        {/* BODY CONTENT */}
        <div className="checkout-body p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: ข้อมูลผู้ซื้อ & ผู้เข้าร่วม */}
          {step === 1 && (
            <form onSubmit={handleProceedToSummary} className="space-y-6">
              {/* Buyer Section */}
              <div className="bg-[#10140F] p-5 rounded-xl border border-[#30391E]">
                <h4 className="font-display text-sm font-bold text-[#D8A934] uppercase tracking-wider mb-4 pb-2 border-b border-[#30391E] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  ข้อมูลผู้ซื้อ (Buyer Information)
                </h4>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#F3E7C8] font-semibold mb-1">
                      ชื่อ-นามสกุล ผู้ซื้อ <span className="text-[#C96F3D]">*</span>
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => {
                        setBuyerName(e.target.value);
                        if (errors.buyerName) setErrors({ ...errors, buyerName: '' });
                      }}
                      placeholder="เช่น ชัยโรจน์ สหัสภูริพัฒน์"
                      className="w-full bg-[#182719] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                    />
                    {errors.buyerName && <p className="text-red-400 mt-1">{errors.buyerName}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#F3E7C8] font-semibold mb-1">
                        หมายเลขโทรศัพท์ <span className="text-[#C96F3D]">*</span>
                      </label>
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={(e) => {
                          setBuyerPhone(e.target.value);
                          if (errors.buyerPhone) setErrors({ ...errors, buyerPhone: '' });
                        }}
                        placeholder="เช่น 0656541786"
                        className="w-full bg-[#182719] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                      />
                      {errors.buyerPhone && <p className="text-red-400 mt-1">{errors.buyerPhone}</p>}
                    </div>

                    <div>
                      <label className="block text-[#F3E7C8] font-semibold mb-1">
                        อีเมลติดต่อผู้ซื้อ <span className="text-[#C96F3D]">*</span>
                      </label>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => {
                          setBuyerEmail(e.target.value);
                          if (errors.buyerEmail) setErrors({ ...errors, buyerEmail: '' });
                        }}
                        placeholder="เช่น nakanosachiko1@gmail.com"
                        className="w-full bg-[#182719] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                      />
                      <p className="text-[10px] text-[#65705A] mt-1">ใช้อ้างอิงข้อมูลลงทะเบียน · กรุณาเก็บเลขลงทะเบียนและรหัสติดตามไว้</p>
                      {errors.buyerEmail && <p className="text-red-400 mt-1">{errors.buyerEmail}</p>}
                    </div>
                  </div>
                </div>

                {/* Auto-fill checkbox */}
                <label className="flex items-center gap-2 mt-4 cursor-pointer text-xs text-[#F3E7C8]/90">
                  <input
                    type="checkbox"
                    checked={useBuyerAsFirstAttendee}
                    onChange={(e) => setUseBuyerAsFirstAttendee(e.target.checked)}
                    className="accent-[#D8A934]"
                  />
                  <span>
                    {vipTableQty > 0
                      ? 'ใช้ข้อมูลผู้ซื้อเป็นหัวหน้าโต๊ะ VIP (ผู้เข้าร่วมคนที่ 1)'
                      : 'ใช้ข้อมูลผู้ซื้อเป็นข้อมูลผู้เข้าร่วมงานสำหรับบัตรใบแรก'}
                  </span>
                </label>
              </div>

              {/* SECTION: VIP ATTENDEE INFORMATION (ข้อมูลผู้เข้าร่วมโต๊ะ VIP) */}
              {vipTableQty > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#30391E]">
                    <h4 className="font-display text-sm font-bold text-[#D8A934] flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#D8A934]" />
                      ข้อมูลผู้เข้าร่วมโต๊ะ VIP ({vipTableQty} โต๊ะ · โต๊ะละ 6 ที่นั่ง)
                    </h4>
                    <span className="text-[11px] text-[#65705A]">1 โต๊ะต่อ 1 VIP QR Code</span>
                  </div>

                  <p className="text-xs text-[#F3E7C8]/75 bg-[#10140F] p-3 rounded-lg border border-[#30391E]">
                    * แต่ละโต๊ะ VIP รองรับผู้เข้าร่วมได้สูงสุด 6 คน ท่านสามารถเว้นว่างชื่อผู้เข้าร่วมบางท่านได้
                    หากยังไม่ทราบรายชื่อครบทั้ง 6 ท่านในขณะนี้
                  </p>

                  {vipTablesRoster.map((table, tIdx) => (
                    <div
                      key={tIdx}
                      className="bg-[#10140F] p-5 rounded-xl border border-[#D8A934]/40 text-xs space-y-4"
                    >
                      <div className="flex items-center justify-between text-[#D8A934] font-semibold border-b border-[#30391E] pb-2">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          โต๊ะ VIP ที่ {table.tableIndex} (1 โต๊ะ / 6 ที่นั่ง)
                        </span>
                        <span className="font-mono text-[11px] text-[#FFF9ED]">ฟรี / โต๊ะ</span>
                      </div>

                      {/* 6 Attendee Name Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((seatNum) => {
                          const seatIdx = seatNum - 1;
                          const isLead = seatNum === 1;

                          return (
                            <div key={seatNum}>
                              <label className="block text-[#F3E7C8]/80 mb-1">
                                ผู้เข้าร่วมคนที่ {seatNum}{' '}
                                {isLead ? (
                                  <span className="text-[#D8A934] font-semibold">
                                    (หัวหน้าโต๊ะ / ผู้จอง) *
                                  </span>
                                ) : (
                                  <span className="text-[#65705A]">(ระบุหรือไม่ก็ได้)</span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={table.attendeeNames[seatIdx] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVipTablesRoster((prev) => {
                                    const next = [...prev];
                                    const names = [...next[tIdx].attendeeNames];
                                    names[seatIdx] = val;
                                    next[tIdx].attendeeNames = names;
                                    return next;
                                  });
                                }}
                                placeholder={`ชื่อ-นามสกุล คนที่ ${seatNum}`}
                                className="w-full bg-[#182719] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                              />
                              {errors[`vip_${tIdx}_seat_${seatIdx}`] && (
                                <p className="text-red-400 mt-1">
                                  {errors[`vip_${tIdx}_seat_${seatIdx}`]}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: NORMAL TICKETS ATTENDEES */}
              {normalQty > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#30391E]">
                    <h4 className="font-display text-sm font-bold text-[#FFF9ED] flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#D8A934]" />
                      ข้อมูลผู้เข้าร่วมงาน (บัตรปกติ {normalQty} ใบ)
                    </h4>
                    <span className="text-[11px] text-[#65705A]">1 ใบต่อ 1 ผู้เข้าร่วม</span>
                  </div>

                  {normalAttendees.map((att, idx) => (
                    <div
                      key={idx}
                      className="bg-[#10140F] p-4 rounded-xl border border-[#30391E] text-xs space-y-3"
                    >
                      <div className="flex items-center justify-between text-[#D8A934] font-semibold">
                        <span>บัตรปกติ ใบที่ #{idx + 1}</span>
                        <span className="font-mono text-[11px] text-[#65705A]">ฟรี / คน</span>
                      </div>

                      <div>
                        <label className="block text-[#65705A] mb-1">
                          ชื่อ-นามสกุล ผู้เข้าร่วม <span className="text-[#C96F3D]">*</span>
                        </label>
                        <input
                          type="text"
                          value={att.attendeeName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNormalAttendees((prev) => {
                              const next = [...prev];
                              next[idx].attendeeName = val;
                              return next;
                            });
                          }}
                          placeholder="ชื่อ-นามสกุล"
                          className="w-full bg-[#182719] border border-[#30391E] rounded px-3 py-1.5 text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                        />
                        {errors[`norm_name_${idx}`] && (
                          <p className="text-red-400 mt-1">{errors[`norm_name_${idx}`]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  className="cursor-pointer flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-[#D8A934]/25 transition-all duration-200"
                >
                  ถัดไป (ตรวจสอบข้อมูล)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ตรวจสอบข้อมูลการลงทะเบียน */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-[#10140F] p-5 rounded-xl border border-[#30391E] space-y-4">
                <h4 className="font-display text-sm font-bold text-[#D8A934] uppercase tracking-wider pb-2 border-b border-[#30391E]">
                  สรุปรายการสั่งซื้อ
                </h4>

                {/* Items list */}
                <div className="space-y-2 text-xs">
                  {normalQty > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-[#30391E]/40">
                      <div>
                        <p className="font-semibold text-[#FFF9ED]">บัตรปกติ</p>
                        <p className="text-[#65705A]">สมัครฟรี · {normalQty} คน</p>
                      </div>
                      <div className="font-mono font-bold text-[#FFF9ED]">
                        ฟรี
                      </div>
                    </div>
                  )}

                  {vipTableQty > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-[#30391E]/40">
                      <div>
                        <p className="font-semibold text-[#D8A934] flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5" />
                          บัตร VIP (1 โต๊ะ / 6 ที่นั่ง)
                        </p>
                        <p className="text-[#65705A]">
                          สมัครฟรี · {vipTableQty} โต๊ะ ({vipTableQty * 6} ที่นั่ง)
                        </p>
                      </div>
                      <div className="font-mono font-bold text-[#D8A934]">
                        ฟรี
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 text-sm font-bold">
                    <span className="text-[#FFF9ED]">ยอดรวมทั้งหมด</span>
                    <span className="font-mono text-2xl text-[#D8A934]">
                      ฟรี
                    </span>
                  </div>
                </div>

                {/* Customer summary */}
                <div className="pt-3 border-t border-[#30391E] text-xs grid grid-cols-2 gap-2 text-[#65705A]">
                  <div>
                    <span>ผู้ซื้อ:</span> <strong className="text-[#FFF9ED]">{buyerName}</strong>
                  </div>
                  <div>
                    <span>เบอร์โทร:</span> <strong className="text-[#FFF9ED]">{buyerPhone}</strong>
                  </div>
                  <div className="col-span-2">
                    <span>อีเมลติดต่อ:</span>{' '}
                    <strong className="text-[#FFF9ED]">{buyerEmail}</strong>
                  </div>
                </div>
              </div>

              {checkoutError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-200">{checkoutError}</p>}

              <div className="rounded-xl border border-[#D8A934]/40 bg-[#10140F] p-4 sm:p-5 space-y-2 text-left">
                <h4 className="text-sm font-bold text-[#D8A934] flex items-center gap-2">
                  <Ticket className="w-4 h-4" /> ลงทะเบียนโดยไม่มีค่าใช้จ่าย
                </h4>
                <p className="text-xs leading-relaxed text-[#F3E7C8]/80">
                  ไม่มีการชำระเงินและไม่ต้องแนบสลิป เมื่อยืนยันแล้วระบบจะบันทึกข้อมูลผู้เข้าร่วม ออกบัตรดิจิทัลพร้อม QR Code และเก็บจำนวนสิทธิ์ไว้ในระบบ
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="cursor-pointer flex items-center gap-2 text-xs text-[#65705A] hover:text-[#FFF9ED]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ย้อนกลับแก้ไขข้อมูล
                </button>

                <button
                  type="button"
                  onClick={handleRegisterFree}
                  disabled={isCreatingOrder}
                  className="cursor-pointer flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-[#D8A934]/25 transition-all disabled:opacity-50"
                >
                  {isCreatingOrder ? 'กำลังลงทะเบียน...' : 'ยืนยันการลงทะเบียนฟรี'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: สำเร็จ (Success) */}
          {step === 3 && createdOrder && createdOrder.paymentStatus === 'PAID' && createdOrder.tickets.length > 0 && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  REGISTRATION COMPLETE
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#FFF9ED] mt-1">
                  ลงทะเบียนสำเร็จและออกบัตรแล้ว!
                </h3>
                <p className="text-xs sm:text-sm text-[#F3E7C8]/80 mt-2 max-w-md mx-auto">
                  ขอบคุณที่ร่วมเป็นส่วนหนึ่งของเทศกาล ROYAL HILLS FEST 2026 บัตรดิจิทัลและ QR Code พร้อมใช้งานแล้ว
                </p>
              </div>

              {/* Order ID Pill */}
              <div className="inline-flex items-center gap-2 bg-[#10140F] px-4 py-2 rounded-xl border border-[#30391E] text-xs font-mono text-[#D8A934]">
                <span>เลขลงทะเบียน: {createdOrder.id}</span>
                <button
                  onClick={handleCopyOrderId}
                  className="cursor-pointer text-[#65705A] hover:text-[#FFF9ED] ml-2"
                >
                  {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Issued Tickets Summary */}
              <div className="bg-[#10140F] p-5 rounded-xl border border-[#30391E] max-w-md mx-auto text-left text-xs space-y-2">
                <p className="font-semibold text-[#FFF9ED] border-b border-[#30391E] pb-2">
                  รายการบัตรที่ได้รับ ({createdOrder.tickets.length} รายการ):
                </p>
                {createdOrder.tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-[#F3E7C8]/85 py-1">
                    <div>
                      <span className="font-bold text-[#D8A934]">
                        {t.ticketKind === 'VIP' ? `${t.tableNumber || t.id} (6 ที่นั่ง)` : t.id}
                      </span>
                      <span className="text-[#65705A] ml-2">
                        {t.ticketKind === 'VIP' ? 'โต๊ะ VIP' : t.attendeeName}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">ออกบัตรแล้ว</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onOrderCompleted(createdOrder)}
                className="cursor-pointer w-full py-4 rounded-xl bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#D8A934]/30 active:scale-98 transition-all"
              >
                <Ticket className="w-4 h-4" />
                เปิดดูบัตรดิจิทัลและ QR Code สำหรับเข้างาน
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
