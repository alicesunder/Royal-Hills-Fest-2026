import React, { useState, useEffect } from 'react';
import { CartItem, Order, AttendeeInfo } from '../types';
import { PROMPTPAY_QR_URL, ticketingApiService } from '../services/ticketingApiService';
import {
  X,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
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
  // Step 1: Customer & Attendees, Step 2: Summary, Step 3: Payment, Step 4: Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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

  // Preview the total from the selected cart; the server recalculates it from trusted database prices.
  const totalAmount = cart.reduce((sum, item) => sum + item.ticketType.price * item.quantity, 0);

  // Normal Ticket Attendees
  const [normalAttendees, setNormalAttendees] = useState<AttendeeInfo[]>([]);

  // VIP Tables Attendee Rosters: 1 entry per VIP table, each has 6 attendee names
  const [vipTablesRoster, setVipTablesRoster] = useState<{ tableIndex: number; attendeeNames: string[] }[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'QR_PROMPTPAY' | 'CREDIT_CARD' | 'BANK_TRANSFER'>('QR_PROMPTPAY');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Server-created order and manual PromptPay proof workflow.
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [checkoutCredentials, setCheckoutCredentials] = useState<{ idempotencyKey: string; lookupToken: string } | null>(null);
  const [lookupToken, setLookupToken] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(30 * 60);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
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

  // Timer countdown for payment
  useEffect(() => {
    if (step === 3 && timeLeftSeconds > 0) {
      const interval = setInterval(() => {
        setTimeLeftSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timeLeftSeconds]);

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

  const handleProceedToPayment = async () => {
    setCheckoutError('');
    setPaymentNotice('');
    setIsCreatingOrder(true);
    try {
      // Keep the same idempotency key and lookup token when the network fails and the buyer retries.
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
      setPaymentReference('');
      setPaymentProofFile(null);
      setPaymentNotice('');
      setTimeLeftSeconds(Math.max(0, Math.floor((result.order.expiresAt - Date.now()) / 1000)));
      setStep(result.order.paymentStatus === 'PAID' ? 4 : 3);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!createdOrder || !lookupToken) return;
    setCheckoutError('');
    setPaymentNotice('');
    if (!PROMPTPAY_QR_URL) {
      setCheckoutError('ผู้ดูแลยังไม่ได้ตั้งค่าภาพ QR PromptPay สำหรับรับเงิน กรุณาติดต่อผู้จัดงาน');
      return;
    }
    if (!paymentReference.trim() || paymentReference.trim().length < 4) {
      setCheckoutError('กรุณากรอกเลขอ้างอิงการโอนอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (!paymentProofFile) {
      setCheckoutError('กรุณาแนบภาพสลิปการโอนเงิน');
      return;
    }

    setIsSubmittingProof(true);
    try {
      await ticketingApiService.submitProof({
        orderNumber: createdOrder.id,
        lookupToken,
        paymentReference: paymentReference.trim(),
        proof: paymentProofFile,
      });
      const refreshed = await ticketingApiService.getOrder(createdOrder.id, lookupToken);
      setCreatedOrder(refreshed.order);
      setPaymentProofFile(null);
      setPaymentNotice('ส่งหลักฐานแล้ว ระบบกำลังรอเจ้าหน้าที่ตรวจสอบยอดเงินจริงก่อนออกบัตร');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'ส่งหลักฐานไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleRefreshPaymentStatus = async () => {
    if (!createdOrder || !lookupToken) return;
    setCheckoutError('');
    setIsRefreshingStatus(true);
    try {
      const refreshed = await ticketingApiService.getOrder(createdOrder.id, lookupToken);
      setCreatedOrder(refreshed.order);
      if (refreshed.order.paymentStatus === 'PAID') {
        setStep(4);
      } else if (refreshed.order.paymentStatus === 'VERIFYING') {
        setPaymentNotice('ได้รับหลักฐานแล้ว ยังรอเจ้าหน้าที่ตรวจสอบยอดเงินในบัญชี');
      } else if (refreshed.order.paymentStatus === 'PENDING' && refreshed.reviewNote) {
        setPaymentNotice('เจ้าหน้าที่ปฏิเสธหลักฐาน: ' + refreshed.reviewNote + ' · กรุณาส่งสลิปใหม่ภายใน 15 นาที');
      } else {
        setPaymentNotice('สถานะล่าสุด: ' + (
          refreshed.order.paymentStatus === 'CANCELLED' ? 'ยกเลิกแล้ว' :
          refreshed.order.paymentStatus === 'FAILED' ? 'หมดอายุหรือไม่สำเร็จ' : 'รอการชำระเงิน'
        ));
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'ตรวจสอบสถานะไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsRefreshingStatus(false);
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
    const details = 'ROYAL HILLS FEST 2026\nเลขคำสั่งซื้อ: ' + createdOrder.id +
      '\nรหัสติดตามส่วนตัว: ' + lookupToken +
      '\nเก็บรหัสนี้เป็นส่วนตัว ใช้ตรวจสอบสถานะคำสั่งซื้อของคุณ';
    try {
      await navigator.clipboard.writeText(details);
      setCopiedLookupDetails(true);
      setTimeout(() => setCopiedLookupDetails(false), 2500);
    } catch {
      setCheckoutError('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกและคัดลอกรหัสติดตามด้วยตนเอง');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
              {step === 3 && 'ชำระเงินค่าบัตร'}
              {step === 4 && 'ชำระเงินสำเร็จ'}
            </h3>
          </div>
          {step !== 4 && (
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
          <span className={step >= 3 ? 'text-[#D8A934] font-semibold' : ''}>3. ชำระเงิน</span>
          <span>&rarr;</span>
          <span className={step === 4 ? 'text-emerald-400 font-semibold' : ''}>4. รับบัตร</span>
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
                      <p className="text-[10px] text-[#65705A] mt-1">ใช้ค้นหาและอ้างอิงคำสั่งซื้อ · ขณะนี้ยังไม่มีการส่งบัตรทางอีเมลอัตโนมัติ</p>
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
                        <span className="font-mono text-[11px] text-[#FFF9ED]">5,555 บาท</span>
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
                        <span className="font-mono text-[11px] text-[#65705A]">555 บาท / คน</span>
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
                  ถัดไป (ตรวจสอบคำสั่งซื้อ)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: สรุปรายการสั่งซื้อ & เลือกวิธีชำระเงิน */}
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
                        <p className="text-[#65705A]">฿{(normalItem?.ticketType.price || 555).toLocaleString()} × {normalQty} คน</p>
                      </div>
                      <div className="font-mono font-bold text-[#FFF9ED]">
                        ฿{(normalQty * (normalItem?.ticketType.price || 555)).toLocaleString()}
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
                          ฿{(vipItem?.ticketType.price || 5555).toLocaleString()} × {vipTableQty} โต๊ะ ({vipTableQty * 6} ที่นั่ง)
                        </p>
                      </div>
                      <div className="font-mono font-bold text-[#D8A934]">
                        ฿{(vipTableQty * (vipItem?.ticketType.price || 5555)).toLocaleString()}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 text-sm font-bold">
                    <span className="text-[#FFF9ED]">ยอดรวมทั้งหมด</span>
                    <span className="font-mono text-2xl text-[#D8A934]">
                      ฿{totalAmount.toLocaleString()}{' '}
                      <span className="text-xs text-[#65705A] font-normal">THB</span>
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
                    <span>อีเมลรับบัตร:</span>{' '}
                    <strong className="text-[#FFF9ED]">{buyerEmail}</strong>
                  </div>
                </div>
              </div>

              {checkoutError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-200">{checkoutError}</p>}

              {/* Manual PromptPay: no gateway or card payments wired yet. */}
              <div className="rounded-xl border border-[#D8A934]/40 bg-[#10140F] p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-[#D8A934] font-bold text-sm">
                  <QrCode className="w-4 h-4" />
                  ชำระเงินผ่าน PromptPay
                </div>
                <p className="text-xs text-[#F3E7C8]/80 leading-relaxed">
                  โอนตามยอดคำสั่งซื้อ แล้วแนบสลิปเพื่อรอเจ้าหน้าที่ตรวจสอบจากรายการเงินจริงในบัญชี
                  ระบบจะออกบัตรหลังได้รับการอนุมัติเท่านั้น
                </p>
                <p className="text-[11px] text-[#65705A]">
                  ขณะนี้ยังไม่เปิดรับชำระผ่านบัตรเครดิตหรือธนาคารอัตโนมัติ
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
                  onClick={handleProceedToPayment}
                  disabled={isCreatingOrder}
                  className="cursor-pointer flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-[#D8A934]/25 transition-all disabled:opacity-50"
                >
                  {isCreatingOrder ? 'กำลังสร้างคำสั่งซื้อ...' : 'ยืนยันและไปหน้าชำระเงิน'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: หน้าชำระเงิน (Payment Gateway) */}
          {step === 3 && createdOrder && (
            <div className="space-y-6 text-center">
              {/* Payment Timer */}
              <div className="inline-flex items-center gap-2 bg-[#10140F] px-4 py-1.5 rounded-full border border-[#30391E] text-xs font-mono text-[#D8A934]">
                <Clock className="w-3.5 h-3.5" />
                <span>เวลาที่เหลือสำหรับชำระเงิน: {formatTimer(timeLeftSeconds)}</span>
              </div>

              <div className="bg-[#10140F] p-6 rounded-2xl border border-[#30391E] max-w-sm mx-auto shadow-inner">
                <p className="text-xs uppercase text-[#65705A] tracking-wider mb-1">
                  ยอดชำระเงินทั้งหมด
                </p>
                <p className="font-mono text-3xl font-bold text-[#D8A934] mb-3">
                  ฿{createdOrder.totalAmount.toLocaleString()} <span className="text-xs text-[#65705A]">THB</span>
                </p>

                {/* Use only the exact registered PromptPay QR image; never synthesize a fake payload. */}
                {PROMPTPAY_QR_URL ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl inline-block shadow-md">
                      <img src={PROMPTPAY_QR_URL} alt="QR PromptPay สำหรับโอนเงินเข้าบัญชีผู้จัดงาน" className="w-52 h-52 mx-auto object-contain" />
                    </div>
                    <p className="text-[11px] text-[#F3E7C8]/80">
                      สแกนด้วยแอปธนาคาร แล้วกรอกยอดให้ตรงกับคำสั่งซื้อด้านบน
                    </p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      QR นี้ใช้สำหรับรับโอนโดยตรง ไม่ได้ตรวจจับยอดโอนอัตโนมัติ กรุณาตรวจสอบชื่อบัญชีและยอดก่อนยืนยันการโอน
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-left text-xs text-amber-100">
                    ผู้ดูแลยังไม่ได้ตั้งค่าภาพ QR PromptPay กรุณาติดต่อผู้จัดงาน และอย่าโอนเงินจนกว่าจะยืนยัน QR ทางการ
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#D8A934]/40 bg-[#10140F] p-4 sm:p-5 text-left space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#65705A]">เลขคำสั่งซื้อ</p>
                  <p className="font-mono text-sm font-bold text-[#D8A934] break-all">{createdOrder.id}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#65705A]">รหัสติดตามส่วนตัว (Order access key)</p>
                  <p className="font-mono text-xs text-[#F3E7C8] break-all select-all">{lookupToken}</p>
                </div>
                <p className="text-[11px] text-[#F3E7C8]/70 leading-relaxed">
                  เก็บเลขคำสั่งซื้อและรหัสติดตามนี้ไว้ ใช้เปิดดูสถานะหรือบัตรภายหลัง ห้ามแชร์รหัสติดตามกับผู้อื่น
                </p>
                <button
                  type="button"
                  onClick={handleCopyLookupDetails}
                  className="w-full rounded-lg border border-[#30391E] bg-[#182719] px-3 py-2.5 text-xs font-bold text-[#D8A934] flex items-center justify-center gap-2"
                >
                  {copiedLookupDetails ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLookupDetails ? 'คัดลอกข้อมูลแล้ว' : 'คัดลอกเลขคำสั่งซื้อและรหัสติดตาม'}
                </button>
              </div>

              {createdOrder.paymentStatus === 'VERIFYING' ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-left space-y-2">
                  <p className="text-sm font-bold text-emerald-300">ได้รับหลักฐานแล้ว · รอตรวจสอบ</p>
                  <p className="text-xs leading-relaxed text-[#F3E7C8]/80">
                    เจ้าหน้าที่จะตรวจสอบยอดเงินที่เข้าบัญชีจริงก่อนอนุมัติและออกบัตร
                  </p>
                  {paymentNotice && <p className="text-xs text-emerald-200">{paymentNotice}</p>}
                  <button
                    type="button"
                    onClick={handleRefreshPaymentStatus}
                    disabled={isRefreshingStatus}
                    className="w-full py-3 rounded-xl border border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isRefreshingStatus ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-[#F3E7C8] mb-1">
                      เลขอ้างอิงการโอน / Transaction reference
                    </label>
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      maxLength={100}
                      placeholder="กรอกเลขอ้างอิงจากสลิป"
                      className="w-full bg-[#10140F] border border-[#30391E] rounded-lg px-3 py-3 text-sm text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#F3E7C8] mb-1">
                      แนบภาพสลิปการโอน (JPG, PNG หรือ WebP ไม่เกิน 5 MB)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-[#F3E7C8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#D8A934] file:px-3 file:py-2 file:font-bold file:text-[#10140F] file:cursor-pointer"
                    />
                    {paymentProofFile && (
                      <p className="mt-1 text-[11px] text-[#65705A]">
                        ไฟล์ที่เลือก: {paymentProofFile.name} ({(paymentProofFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitPaymentProof}
                    disabled={isSubmittingProof || !PROMPTPAY_QR_URL || timeLeftSeconds <= 0}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D8A934] to-[#c4982c] hover:brightness-110 text-[#10140F] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isSubmittingProof ? 'กำลังส่งหลักฐาน...' : 'แจ้งโอนเงินและส่งสลิป'}
                  </button>
                  <p className="text-[11px] text-[#65705A] leading-relaxed">
                    การแนบสลิปเป็นเพียงการแจ้งโอน ไม่ถือว่ายืนยันการชำระเงิน ระบบจะยังไม่ออกบัตรจนกว่าแอดมินตรวจยอดเงินและกดยืนยัน
                  </p>
                </div>
              )}

              {paymentNotice && createdOrder.paymentStatus !== 'VERIFYING' && (
                <p className="text-xs text-emerald-200">{paymentNotice}</p>
              )}
              {checkoutError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-200">{checkoutError}</p>}
            </div>
          )}

          {/* STEP 4: สำเร็จ (Success) */}
          {step === 4 && createdOrder && createdOrder.paymentStatus === 'PAID' && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  PAYMENT SUCCESSFUL
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#FFF9ED] mt-1">
                  ชำระเงินและออกบัตรสำเร็จ!
                </h3>
                <p className="text-xs sm:text-sm text-[#F3E7C8]/80 mt-2 max-w-md mx-auto">
                  ขอบคุณที่ร่วมเป็นส่วนหนึ่งของเทศกาล ROYAL HILLS FEST 2026 บัตรดิจิทัลและ QR Code พร้อมใช้งานแล้ว
                </p>
              </div>

              {/* Order ID Pill */}
              <div className="inline-flex items-center gap-2 bg-[#10140F] px-4 py-2 rounded-xl border border-[#30391E] text-xs font-mono text-[#D8A934]">
                <span>เลขที่คำสั่งซื้อ: {createdOrder.id}</span>
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
