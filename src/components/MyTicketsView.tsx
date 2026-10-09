import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Order, IssuedTicket } from '../types';
import { ticketingApiService } from '../services/ticketingApiService';
import {
  Ticket,
  Search,
  Download,
  Copy,
  Check,
  Calendar,
  MapPin,
  CheckCircle2,
  Award,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Crown,
  Users,
  Printer,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface MyTicketsViewProps {
  initialOrder?: Order | null;
  onSimulateCheckIn?: (ticketIdOrToken: string) => void;
  onBuyMoreTickets?: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  initialOrder,
  onSimulateCheckIn,
  onBuyMoreTickets,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<IssuedTicket | null>(null);
  const [selectedOrderRecord, setSelectedOrderRecord] = useState<Order | null>(null);
  const [selectedTicketQr, setSelectedTicketQr] = useState<string>('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupTokenInput, setLookupTokenInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshingOrder, setRefreshingOrder] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Hybrid access: restore orders only from private lookup credentials saved in this browser.
  // On a different device, no credentials are present, so the buyer must use order number + access key.
  useEffect(() => {
    let active = true;
    setOrdersError('');

    if (initialOrder?.paymentStatus === 'PAID' && initialOrder.tickets?.length > 0) {
      setOrders([initialOrder]);
      setSelectedOrderRecord(initialOrder);
      setSelectedTicket(initialOrder.tickets[0] || null);
      setSelectedTicketQr('');
      setLoadingOrders(false);
      return () => { active = false; };
    }

    setLoadingOrders(true);
    ticketingApiService.getSavedOrders()
      .then((results) => {
        if (!active) return;
        const serverOrders = results
          .map((item) => item.order)
          .sort((a, b) => b.createdAt - a.createdAt);
        setOrders(serverOrders);

        // Prefer the newest paid order with a ticket; otherwise show the newest order's status.
        const latestPaid = serverOrders.find(
          (order) => order.paymentStatus === 'PAID' && order.tickets.length > 0
        );
        const wanted = latestPaid || serverOrders[0] || null;
        setSelectedOrderRecord(wanted);
        setSelectedTicket(wanted?.tickets?.[0] || null);
        setSelectedTicketQr('');
      })
      .catch((error) => {
        if (!active) return;
        setOrders([]);
        setSelectedOrderRecord(null);
        setSelectedTicket(null);
        setSelectedTicketQr('');
        setOrdersError(error instanceof Error ? error.message : 'โหลดคำสั่งซื้อที่บันทึกไว้ไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => { active = false; };
  }, [initialOrder]);

  const handleRefreshSelectedOrder = async () => {
    if (!selectedOrderRecord) return;
    const credential = ticketingApiService.getSavedCredentials()
      .find((item) => item.orderNumber === selectedOrderRecord.id);
    if (!credential) {
      setOrdersError('ไม่พบรหัสติดตามคำสั่งซื้อในอุปกรณ์นี้ กรุณาใช้ข้อมูลคำสั่งซื้อเดิม');
      return;
    }

    setRefreshingOrder(true);
    setOrdersError('');
    try {
      const result = await ticketingApiService.getOrder(credential.orderNumber, credential.lookupToken);
      const refreshed = result.order;
      setOrders((previous) => [refreshed, ...previous.filter((order) => order.id !== refreshed.id)]);
      setSelectedOrderRecord(refreshed);
      setSelectedTicket(refreshed.tickets[0] || null);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'ตรวจสอบสถานะไม่สำเร็จ');
    } finally {
      setRefreshingOrder(false);
    }
  };

  // Generate QR for selected ticket
  useEffect(() => {
    if (selectedTicket) {
      QRCode.toDataURL(selectedTicket.qrToken, {
        width: 340,
        margin: 2,
        color: {
          dark: '#10140F',
          light: '#FFF9ED',
        },
      })
        .then((url) => setSelectedTicketQr(url))
        .catch((err) => console.error('Failed to generate QR', err));
    }
  }, [selectedTicket]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const query = lookupQuery.trim();
    const normalized = query.toLowerCase();
    if (!query) {
      setLookupError('กรุณากรอกเลขคำสั่งซื้อ อีเมล หรือรหัสบัตร/โต๊ะ');
      return;
    }

    const savedCredential = ticketingApiService.getSavedCredentials()
      .find((item) => item.orderNumber.toLowerCase() === normalized);
    const accessKey = lookupTokenInput.trim() || savedCredential?.lookupToken || '';

    // Cross-device order lookup uses the order number plus its private access key.
    if (/^rhf26-[a-z0-9-]{6,40}$/i.test(query) && accessKey) {
      setLoadingOrders(true);
      try {
        const result = await ticketingApiService.getOrder(query, accessKey);
        ticketingApiService.saveCredentials(result.credentials);
        const order = result.order;
        setOrders((previous) => [order, ...previous.filter((item) => item.id !== order.id)]);
        setSelectedOrderRecord(order);
        setSelectedTicket(order.tickets[0] || null);
        setLookupQuery('');
        setLookupTokenInput('');
        return;
      } catch (error) {
        setLookupError(error instanceof Error
          ? error.message
          : 'ค้นหาคำสั่งซื้อไม่สำเร็จ กรุณาตรวจเลขคำสั่งซื้อและรหัสติดตาม');
        return;
      } finally {
        setLoadingOrders(false);
      }
    }

    const byOrder = orders.find((order) => order.id.toLowerCase() === normalized);
    if (byOrder) {
      setSelectedOrderRecord(byOrder);
      setSelectedTicket(byOrder.tickets[0] || null);
      setLookupQuery('');
      return;
    }

    const ticketOwner = orders.find((order) =>
      order.tickets.some((ticket) =>
        ticket.id.toLowerCase() === normalized || ticket.qrToken.toLowerCase() === normalized
      )
    );
    if (ticketOwner) {
      const ticket = ticketOwner.tickets.find((item) =>
        item.id.toLowerCase() === normalized || item.qrToken.toLowerCase() === normalized
      ) || null;
      setSelectedOrderRecord(ticketOwner);
      setSelectedTicket(ticket);
      setLookupQuery('');
      return;
    }

    const byEmail = orders.find((order) => order.buyerEmail.toLowerCase() === normalized);
    if (byEmail) {
      setSelectedOrderRecord(byEmail);
      setSelectedTicket(byEmail.tickets[0] || null);
      setLookupQuery('');
      return;
    }

    if (/^rhf26-/i.test(query) && !accessKey) {
      setLookupError('เพื่อความปลอดภัย ให้กรอกเลขคำสั่งซื้อพร้อมรหัสติดตามส่วนตัวที่ได้รับตอนสั่งซื้อ');
      return;
    }

    setLookupError('ไม่พบคำสั่งซื้อในอุปกรณ์นี้ กรุณาตรวจสอบข้อมูล หรือกรอกเลขคำสั่งซื้อพร้อมรหัสติดตาม');
  };

  const handleCopyTicketCode = () => {
    if (!selectedTicket) return;
    navigator.clipboard.writeText(selectedTicket.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadTicketQr = () => {
    if (!selectedTicketQr || !selectedTicket) return;
    const a = document.createElement('a');
    a.href = selectedTicketQr;
    a.download = `RoyalHillsFest2026_${selectedTicket.id}_Pass.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintTicket = () => {
    window.print();
  };

  // Find parent order of the selected ticket
  const parentOrder = selectedTicket
    ? orders.find((o) => o.id === selectedTicket.orderId) || selectedOrderRecord
    : selectedOrderRecord;

  const allTicketsList = orders.flatMap((o) => o.tickets);

  return (
    <section id="my-tickets" className="py-20 sm:py-28 bg-[#10140F] relative min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 no-print">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-[#D8A934] mb-2">
            OFFICIAL DIGITAL PASS & QR CODE
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#FFF9ED]">
            บัตรดิจิทัลของฉัน
          </h1>
          <div className="w-16 h-0.5 bg-[#D8A934] mx-auto mt-4 mb-4" />
          <p className="text-xs sm:text-sm text-[#F3E7C8]/80">
            แสดง QR Code นี้แก่เจ้าหน้าที่บริเวณประตูทางเข้างาน ณ Royal Hills เพื่อเช็กอินและรับริสแบนด์
          </p>
        </div>

        {/* Search Order / Lookup Card */}
        <div className="max-w-xl mx-auto mb-12 bg-[#182719] p-4 sm:p-5 rounded-2xl border border-[#30391E] shadow-xl no-print">
          <div className="mb-3 rounded-xl border border-[#30391E] bg-[#182719] px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-[#F3E7C8]/80">
              หากเคยซื้อบัตรจากเบราว์เซอร์นี้ ระบบจะโหลดคำสั่งซื้อที่บันทึกไว้ให้อัตโนมัติ
              หากเปลี่ยนอุปกรณ์ ให้กรอกเลขคำสั่งซื้อและรหัสติดตามส่วนตัวด้านล่าง
            </p>
          </div>
          <form onSubmit={handleLookup} className="space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#65705A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="เลขคำสั่งซื้อ (เช่น RHF26-...)"
                  className="w-full bg-[#10140F] border border-[#30391E] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                />
              </div>
              <button
                type="submit"
                disabled={loadingOrders}
                className="cursor-pointer bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-colors shrink-0 disabled:opacity-50"
              >
                {loadingOrders ? 'กำลังค้นหา…' : 'ค้นหา'}
              </button>
            </div>
            <div>
              <label htmlFor="order-lookup-key" className="block text-[11px] text-[#65705A] mb-1">
                รหัสติดตามส่วนตัว — จำเป็นเมื่อเปิดจากอุปกรณ์อื่น
              </label>
              <input
                id="order-lookup-key"
                type="password"
                autoComplete="off"
                value={lookupTokenInput}
                onChange={(e) => setLookupTokenInput(e.target.value)}
                placeholder="วางรหัสติดตามจากหน้าชำระเงิน"
                className="w-full bg-[#10140F] border border-[#30391E] rounded-xl px-4 py-2.5 text-xs text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
              />
            </div>
          </form>
          {lookupError && <p className="text-xs text-red-400 mt-2">{lookupError}</p>}
        </div>

        {/* Main Content Area */}
        {selectedTicket ? (
          <div className="rhf-ticket-page max-w-6xl mx-auto space-y-6">
            <article className="rhf-e-ticket printable-ticket-card" aria-label={"บัตรเข้างาน " + selectedTicket.id}>
              <div className="rhf-e-ticket-main">
                <div className="rhf-e-ticket-eyebrows">
                  <span>EVENT NAME</span>
                  <span className="rhf-e-ticket-mobile-type">TICKET TYPE · {selectedTicket.ticketKind === 'VIP' ? 'VIP TABLE' : 'GENERAL ADMISSION'}</span>
                </div>

                <div className="rhf-e-ticket-heading">
                  <div className="rhf-e-ticket-brand">
                    <h2 className="rhf-e-ticket-title">
                      <span>ROYAL HILLS </span><span className="rhf-gold-word">FEST</span><span> 2026</span>
                    </h2>
                    <div className="rhf-e-ticket-gold-rule"><span /></div>
                    <p className="rhf-e-ticket-date">14 November 2026</p>
                    <p className="rhf-e-ticket-venue">Royal Hills Golf Resort and Spa<br />Nakhon Nayok, Thailand</p>
                  </div>
                  <div className="rhf-e-ticket-type-panel">
                    <span className="rhf-e-ticket-type-label">TICKET TYPE</span>
                    <strong>{selectedTicket.ticketKind === 'VIP' ? 'VIP TABLE PASS' : 'GENERAL ADMISSION'}</strong>
                    <span>{selectedTicket.ticketKind === 'VIP' ? '1 Table · Up to 6 Guests' : '1 Person · Single Entry'}</span>
                    <span className="rhf-e-ticket-paid-label">
                      ฿{selectedTicket.ticketPrice.toLocaleString()} THB
                    </span>
                  </div>
                </div>

                <div className="rhf-e-ticket-bottom">
                  <span className="rhf-e-ticket-banner">E-TICKET</span>
                  <span className="rhf-e-ticket-full-id">TICKET ID · {selectedTicket.id}</span>
                </div>
                <span className="rhf-e-ticket-shine" aria-hidden="true" />
              </div>

              <aside className="rhf-e-ticket-stub" aria-label="ตั๋วส่วน QR Code">
                <div className="rhf-e-ticket-stub-top">
                  <span>OFFICIAL ENTRY PASS</span>
                  <strong>{selectedTicket.ticketKind === 'VIP' ? 'VIP' : 'ADMIT ONE'}</strong>
                </div>
                {selectedTicketQr ? (
                  <div className="rhf-e-ticket-qr">
                    <img src={selectedTicketQr} alt={"QR Code สำหรับเช็กอินบัตร " + selectedTicket.id} />
                  </div>
                ) : (
                  <div className="rhf-e-ticket-qr rhf-e-ticket-qr-loading">กำลังสร้าง QR…</div>
                )}
                <div className="rhf-e-ticket-barcode" aria-hidden="true">
                  <span className="rhf-barcode-guard" />
                  {Array.from(selectedTicket.id).flatMap((character, charIndex) =>
                    character.charCodeAt(0).toString(2).padStart(8, '0').split('').map((bit, bitIndex) => (
                      <span
                        key={charIndex * 8 + bitIndex}
                        style={{ width: bit === '1' ? '2.5px' : '1px' }}
                      />
                    ))
                  )}
                  <span className="rhf-barcode-guard" />
                </div>
                <div className="rhf-e-ticket-reference">
                  <span>REF:</span>
                  <strong>{selectedTicket.id.replace(/^RHF26-/i, '').slice(-6).toUpperCase()}</strong>
                </div>
                <span className="rhf-e-ticket-stub-note">SCAN QR FOR VALIDATION</span>
              </aside>
            </article>

            <div className="flex flex-wrap items-center gap-3 no-print ticket-print-hide">
              <button
                onClick={handlePrintTicket}
                className="cursor-pointer py-3 px-5 rounded-xl bg-gradient-to-r from-[#F5D061] via-[#D8A934] to-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(216,169,52,0.4)] transition-all"
                title="พิมพ์บัตรแนวนอน / บันทึกเป็น PDF"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์บัตร (Print Ticket)</span>
              </button>
              <button
                onClick={handleDownloadTicketQr}
                disabled={!selectedTicketQr}
                className="cursor-pointer py-3 px-4 rounded-xl bg-[#182719] hover:bg-[#223624] border border-[#D8A934]/60 text-[#FFF9ED] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-[#D8A934]" />
                บันทึก QR สำหรับเช็กอิน
              </button>
              <button
                onClick={handleCopyTicketCode}
                className="cursor-pointer py-3 px-4 rounded-xl bg-[#10140F] hover:bg-[#182719] border border-[#30391E] text-[#FFF9ED] text-xs font-semibold flex items-center gap-2 transition-all"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#D8A934]" />}
                {copiedId ? 'คัดลอกรหัสแล้ว' : 'คัดลอกรหัสบัตร'}
              </button>
              {onSimulateCheckIn && (
                <button
                  onClick={() => onSimulateCheckIn(selectedTicket.id)}
                  className="cursor-pointer py-3 px-4 rounded-xl bg-[#10140F] hover:bg-[#182719] border border-[#30391E] text-[#FFF9ED] text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <Shield className="w-4 h-4 text-[#D8A934]" />
                  จำลองสแกนเช็กอิน
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-5">
                {selectedTicket.ticketKind === 'NORMAL' && (
                  <div className="rounded-2xl bg-[#182719] border border-[#30391E] p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#65705A] block text-xs mb-1">ชื่อผู้เข้าร่วม</span>
                      <strong className="text-[#FFF9ED]">{selectedTicket.attendeeName || parentOrder?.buyerName || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[#65705A] block text-xs mb-1">เบอร์โทรศัพท์</span>
                      <strong className="text-[#FFF9ED]">{selectedTicket.attendeePhone || parentOrder?.buyerPhone || '-'}</strong>
                    </div>
                  </div>
                )}

                {selectedTicket.ticketKind === 'VIP' && selectedTicket.vipAttendees && (
                  <div className="rounded-2xl bg-[#182719] border border-[#D8A934]/40 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#30391E]">
                      <span className="font-display text-sm font-bold text-[#FFF9ED] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#D8A934]" />
                        รายชื่อผู้เข้าร่วมโต๊ะ VIP
                      </span>
                      <span className="text-xs font-mono text-[#D8A934]">
                        เช็กอินแล้ว: {selectedTicket.vipAttendees.filter((attendee) => attendee.checkedIn).length} / 6
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTicket.vipAttendees.map((attendee) => (
                        <div key={attendee.seatNumber} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#10140F] border border-[#30391E] text-xs">
                          <span className="text-[#F3E7C8]">
                            <span className="text-[#D8A934] font-mono mr-2">{String(attendee.seatNumber).padStart(2, '0')}</span>
                            {attendee.name || 'ผู้เข้าร่วมคนที่ ' + attendee.seatNumber}
                          </span>
                          <span className={attendee.checkedIn ? 'text-emerald-300' : 'text-[#65705A]'}>
                            {attendee.wristbandIssued ? 'รับริสแบนด์แล้ว' : attendee.checkedIn ? 'เช็กอินแล้ว' : 'ยังไม่เช็กอิน'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            {/* RIGHT: TICKET SWITCHER & ORDER SUMMARY (Col 5) */}
            <div className="lg:col-span-5 space-y-6 no-print">
              {/* Order Info Card */}
              {parentOrder && (
                <div className="bg-[#182719] p-6 rounded-2xl border border-[#30391E] text-xs space-y-4">
                  <h3 className="font-display text-sm font-bold text-[#D8A934] uppercase tracking-wider pb-2 border-b border-[#30391E]">
                    ข้อมูลคำสั่งซื้อ #{parentOrder.id}
                  </h3>

                  <div className="space-y-2 text-[#F3E7C8]/85">
                    <div className="flex justify-between">
                      <span className="text-[#65705A]">ผู้สั่งซื้อ:</span>
                      <strong className="text-[#FFF9ED]">{parentOrder.buyerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65705A]">เบอร์โทร:</span>
                      <span>{parentOrder.buyerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65705A]">อีเมล:</span>
                      <span>{parentOrder.buyerEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65705A]">สถานะการชำระ:</span>
                      <span className="text-emerald-400 font-bold">ชำระเงินเรียบร้อยแล้ว</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#30391E]">
                      <span className="text-[#65705A]">ยอดชำระ:</span>
                      <strong className="font-mono text-[#D8A934] text-sm">
                        ฿{parentOrder.totalAmount.toLocaleString()} THB
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Tickets Switcher in this Order */}
              {parentOrder && parentOrder.tickets.length > 1 && (
                <div className="bg-[#182719] p-6 rounded-2xl border border-[#30391E] space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#FFF9ED]">
                    บัตรทั้งหมดในคำสั่งซื้อนี้ ({parentOrder.tickets.length} รายการ):
                  </h3>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {parentOrder.tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          selectedTicket.id === t.id
                            ? 'border-[#D8A934] bg-[#10140F] text-[#FFF9ED]'
                            : 'border-[#30391E] bg-[#10140F]/60 text-[#65705A] hover:text-[#FFF9ED]'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-[#FFF9ED]">
                            {t.ticketKind === 'VIP' ? t.tableNumber || t.id : t.id}
                          </p>
                          <p className="text-[11px] text-[#65705A]">
                            {t.ticketKind === 'VIP' ? '1 โต๊ะ / 6 ที่นั่ง' : t.attendeeName}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D8A934]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Buy More Tickets Callout */}
              {onBuyMoreTickets && (
                <div className="text-center p-6 rounded-2xl bg-[#182719]/40 border border-[#30391E] space-y-3">
                  <p className="font-display text-sm font-bold text-[#FFF9ED]">
                    ต้องการซื้อบัตรหรือโต๊ะ VIP เพิ่มเติม?
                  </p>
                  <button
                    onClick={onBuyMoreTickets}
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow"
                  >
                    <Ticket className="w-4 h-4" />
                    สั่งซื้อบัตรเพิ่ม
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        ) : selectedOrderRecord ? (
          <div className="max-w-2xl mx-auto rounded-2xl border border-[#D8A934]/35 bg-[#182719] p-6 sm:p-8 space-y-5">
            <div className="text-center">
              <Clock className="w-10 h-10 text-[#D8A934] mx-auto mb-3" />
              <p className="text-xs uppercase tracking-widest text-[#D8A934]">ORDER STATUS</p>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#FFF9ED] mt-2">
                คำสั่งซื้อ {selectedOrderRecord.id}
              </h3>
              <p className="text-3xl font-bold text-[#D8A934] mt-3">
                ฿{selectedOrderRecord.totalAmount.toLocaleString()} <span className="text-xs text-[#65705A]">THB</span>
              </p>
            </div>

            <div className="rounded-xl border border-[#30391E] bg-[#10140F] p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#65705A]">สถานะคำสั่งซื้อ</span>
                <span className={selectedOrderRecord.paymentStatus === 'PAID' ? 'font-bold text-emerald-300' : selectedOrderRecord.paymentStatus === 'VERIFYING' ? 'font-bold text-amber-300' : 'font-bold text-[#F3E7C8]'}>
                  {selectedOrderRecord.paymentStatus === 'PAID' ? 'ชำระแล้ว · ออกบัตรแล้ว' :
                   selectedOrderRecord.paymentStatus === 'VERIFYING' ? 'ส่งสลิปแล้ว · รอตรวจสอบ' :
                   selectedOrderRecord.paymentStatus === 'FAILED' ? 'หมดอายุหรือไม่สำเร็จ' :
                   selectedOrderRecord.paymentStatus === 'CANCELLED' ? 'ยกเลิกคำสั่งซื้อ' : 'รอชำระเงิน'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#65705A]">ผู้สั่งซื้อ</span>
                <span className="text-[#FFF9ED] text-right">{selectedOrderRecord.buyerName}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#65705A]">อีเมล</span>
                <span className="text-[#FFF9ED] text-right break-all">{selectedOrderRecord.buyerEmail}</span>
              </div>
              {selectedOrderRecord.paymentStatus === 'VERIFYING' && (
                <p className="text-xs text-amber-200 pt-2">
                  เจ้าหน้าที่กำลังตรวจสอบยอดเงินจริงในบัญชี บัตรจะปรากฏหลังอนุมัติแล้วเท่านั้น
                </p>
              )}
              {selectedOrderRecord.paymentStatus === 'PENDING' && (
                <p className="text-xs text-[#F3E7C8]/75 pt-2">
                  คำสั่งซื้อยังรอการชำระเงิน กรุณากลับไปยังขั้นตอนชำระเงินหรือใช้รหัสติดตามที่บันทึกไว้
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshSelectedOrder()}
              disabled={refreshingOrder}
              className="w-full rounded-xl bg-[#D8A934] px-4 py-3 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={refreshingOrder ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
              {refreshingOrder ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะล่าสุด'}
            </button>
          </div>
        ) : (
          <div className="text-center py-16 bg-[#182719] rounded-2xl border border-[#30391E] max-w-xl mx-auto p-8 space-y-4">
            {loadingOrders ? (
              <RefreshCw className="w-12 h-12 text-[#D8A934] mx-auto animate-spin" />
            ) : (
              <Ticket className="w-12 h-12 text-[#65705A] mx-auto" />
            )}
            <h3 className="font-display text-xl font-bold text-[#FFF9ED]">
              {loadingOrders ? 'กำลังค้นหาคำสั่งซื้อ...' : 'ค้นหาคำสั่งซื้อเพื่อแสดงบัตรของคุณ'}
            </h3>
            <p className="text-xs text-[#F3E7C8]/75">
              {ordersError || 'กรอกเลขคำสั่งซื้อและรหัสติดตามส่วนตัว แล้วกดค้นหา ระบบจะแสดงบัตรเมื่อคำสั่งซื้อได้รับการอนุมัติแล้ว'}
            </p>
            {orders.length > 0 && (
              <div className="text-left pt-2 space-y-2">
                <p className="text-xs font-bold text-[#D8A934]">คำสั่งซื้อที่บันทึกไว้ในอุปกรณ์นี้</p>
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrderRecord(order);
                      setSelectedTicket(order.tickets[0] || null);
                    }}
                    className="w-full rounded-xl border border-[#30391E] bg-[#10140F] px-4 py-3 text-left flex items-center justify-between gap-3"
                  >
                    <span>
                      <span className="block text-xs font-bold text-[#FFF9ED]">{order.id}</span>
                      <span className="block text-[11px] text-[#65705A]">{order.paymentStatus === 'VERIFYING' ? 'รอตรวจสอบสลิป' : order.paymentStatus === 'PAID' ? 'ชำระแล้ว' : 'รอชำระเงิน'}</span>
                    </span>
                    <span className="text-xs font-bold text-[#D8A934]">฿{order.totalAmount.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
            {onBuyMoreTickets && (
              <button
                onClick={onBuyMoreTickets}
                className="cursor-pointer inline-flex items-center gap-2 bg-[#D8A934] text-[#10140F] font-bold text-xs uppercase px-6 py-3 rounded-xl"
              >
                ไปหน้าเลือกซื้อบัตร
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
