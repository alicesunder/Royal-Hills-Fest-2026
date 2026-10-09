import React, { useState, useEffect } from 'react';
import { TicketType, Order, IssuedTicket, TicketSaleStatus } from '../types';
import { ticketStoreService } from '../services/ticketStoreService';
import { PaymentReviewDashboard } from './PaymentReviewDashboard';
import {
  Ticket,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Edit2,
  Search,
  Eye,
  RefreshCw,
  Award,
  Sparkles,
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  Crown,
} from 'lucide-react';

interface AdminTicketDashboardProps {
  onOpenTicketPass?: (ticketId: string) => void;
  onOpenCheckInScanner?: (ticketId?: string) => void;
}

export const AdminTicketDashboard: React.FC<AdminTicketDashboardProps> = ({
  onOpenTicketPass,
  onOpenCheckInScanner,
}) => {
  const [tab, setTab] = useState<'OVERVIEW' | 'INVENTORY' | 'ORDERS' | 'ATTENDEES' | 'PAYMENTS'>('OVERVIEW');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Modal states for editing inventory quota
  const [editingType, setEditingType] = useState<TicketType | null>(null);
  const [editPrice, setEditPrice] = useState(555);
  const [editTotalQty, setEditTotalQty] = useState(500);
  const [editStatus, setEditStatus] = useState<TicketSaleStatus>('ACTIVE');

  // Selected Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = () => {
    setTicketTypes(ticketStoreService.getTicketTypes());
    setOrders(ticketStoreService.getOrders());
  };

  useEffect(() => {
    loadData();
  }, []);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const normalType = ticketTypes.find((t) => t.id === 'tt-normal');
  const vipType = ticketTypes.find((t) => t.id === 'tt-vip');

  // Specific Business Rules for Normal & VIP Inventory:
  // NORMAL:
  const normalTotal = normalType?.totalQuantity || 500;
  const normalSold = normalType?.soldQuantity || 0;
  const normalRemaining = normalType?.remainingQuantity || 0;

  // VIP:
  const vipTotalTables = vipType?.totalQuantity || 20;
  const vipSoldTables = vipType?.soldQuantity || 0;
  const vipRemainingTables = vipType?.remainingQuantity || 0;
  const vipSeatsSold = vipSoldTables * 6; // VIP tables sold × 6

  // Total Revenue:
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const totalOrdersCount = orders.length;
  const paidOrdersCount = orders.filter((o) => o.paymentStatus === 'PAID').length;
  const pendingOrdersCount = orders.filter((o) => o.paymentStatus === 'PENDING').length;

  const allIssuedTickets = ticketStoreService.getAllIssuedTickets();

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = searchOrderQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.buyerName.toLowerCase().includes(q) ||
      o.buyerPhone.toLowerCase().includes(q) ||
      o.buyerEmail.toLowerCase().includes(q);

    if (!matchesQuery) return false;
    if (orderStatusFilter === 'PAID') return o.paymentStatus === 'PAID';
    if (orderStatusFilter === 'PENDING') return o.paymentStatus === 'PENDING';
    if (orderStatusFilter === 'CANCELLED') return o.paymentStatus === 'CANCELLED';
    return true;
  });

  // Open Inventory Edit
  const handleOpenEdit = (t: TicketType) => {
    setEditingType(t);
    setEditPrice(t.price);
    setEditTotalQty(t.totalQuantity);
    setEditStatus(t.saleStatus);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    ticketStoreService.updateTicketType(editingType.id, {
      price: Number(editPrice),
      totalQuantity: Number(editTotalQty),
      saleStatus: editStatus,
    });

    setEditingType(null);
    loadData();
    notify('อัปเดตการตั้งค่าคลังบัตรเรียบร้อยแล้ว');
  };

  // Cancel Order Action
  const handleCancelOrder = (orderId: string) => {
    if (window.confirm(`ยืนยันการยกเลิกคำสั่งซื้อ ${orderId} หรือไม่? (ระบบจะคืนบัตรเข้าคลัง)`)) {
      const res = ticketStoreService.cancelOrder(orderId);
      if (res.success) {
        loadData();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
        notify(res.message);
      } else {
        alert(res.message);
      }
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Ticket/Table ID',
      'Order ID',
      'Type',
      'Seat/Attendee',
      'Buyer Name',
      'Phone',
      'Email',
      'Checked-In',
      'Wristband',
    ];

    const rows: string[][] = [];

    orders.forEach((o) => {
      o.tickets.forEach((t) => {
        if (t.ticketKind === 'VIP' && t.vipAttendees) {
          t.vipAttendees.forEach((att) => {
            rows.push([
              t.id,
              o.id,
              'VIP TABLE',
              `ที่นั่ง ${att.seatNumber}: ${att.name || 'ไม่ระบุชื่อ'}`,
              o.buyerName,
              o.buyerPhone,
              o.buyerEmail,
              att.checkedIn ? 'YES' : 'NO',
              att.wristbandIssued ? 'YES' : 'NO',
            ]);
          });
        } else {
          rows.push([
            t.id,
            o.id,
            'NORMAL',
            t.attendeeName,
            o.buyerName,
            t.attendeePhone || o.buyerPhone,
            t.attendeeEmail || o.buyerEmail,
            t.checkedIn ? 'YES' : 'NO',
            t.wristbandIssued ? 'YES' : 'NO',
          ]);
        }
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RoyalHillsFest2026_Official_Attendees_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-20 sm:py-28 bg-[#10140F] min-h-screen text-[#FFF9ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 bg-[#182719] border border-[#D8A934] text-[#FFF9ED] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#D8A934]" />
            <span>{notification}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#30391E]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#D8A934] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              ROYAL HILLS FEST 2026 · OFFICIAL INVENTORY & SALES SYSTEM
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FFF9ED]">
              ระบบบริหารจัดการคลังบัตรและคำสั่งซื้อ
            </h1>
            <p className="text-xs text-[#F3E7C8]/75 mt-0.5">
              คลังบัตรทางการ 2 ประเภท: บัตรปกติ (ต่อคน) และ VIP (ต่อโต๊ะ 6 ที่นั่ง)
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {onOpenCheckInScanner && (
              <button
                onClick={() => onOpenCheckInScanner()}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#182719] hover:bg-[#30391E] border border-[#30391E] text-xs font-bold text-[#D8A934] transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                เปิดระบบสแกนเกต
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider transition-colors shadow"
            >
              <Download className="w-3.5 h-3.5" />
              ส่งออก CSV
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-[#30391E]/60 text-xs">
          <button
            onClick={() => setTab('OVERVIEW')}
            className={`cursor-pointer px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
              tab === 'OVERVIEW'
                ? 'bg-[#D8A934] text-[#10140F] shadow'
                : 'text-[#65705A] hover:text-[#FFF9ED]'
            }`}
          >
            ภาพรวมและยอดขาย (Overview)
          </button>
          <button
            onClick={() => setTab('INVENTORY')}
            className={`cursor-pointer px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
              tab === 'INVENTORY'
                ? 'bg-[#D8A934] text-[#10140F] shadow'
                : 'text-[#65705A] hover:text-[#FFF9ED]'
            }`}
          >
            คลังบัตร 2 ประเภท (Inventory)
          </button>
          <button
            onClick={() => setTab('ORDERS')}
            className={`cursor-pointer px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
              tab === 'ORDERS'
                ? 'bg-[#D8A934] text-[#10140F] shadow'
                : 'text-[#65705A] hover:text-[#FFF9ED]'
            }`}
          >
            คำสั่งซื้อทั้งหมด ({orders.length})
          </button>
          <button
            onClick={() => setTab('PAYMENTS')}
            className={`cursor-pointer px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
              tab === 'PAYMENTS'
                ? 'bg-[#D8A934] text-[#10140F] shadow'
                : 'text-[#65705A] hover:text-[#FFF9ED]'
            }`}
          >
            ตรวจสอบสลิปและออกบัตร
          </button>
          <button
            onClick={() => setTab('ATTENDEES')}
            className={`cursor-pointer px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
              tab === 'ATTENDEES'
                ? 'bg-[#D8A934] text-[#10140F] shadow'
                : 'text-[#65705A] hover:text-[#FFF9ED]'
            }`}
          >
            รายชื่อผู้เข้าร่วมและโต๊ะ VIP
          </button>
        </div>

        {tab === 'PAYMENTS' && <PaymentReviewDashboard />}

        {/* TAB 1: OVERVIEW */}
        {tab === 'OVERVIEW' && (
          <div className="space-y-8">
            {/* SEPARATE INVENTORY KPI CARDS (NORMAL & VIP SEPARATE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: บัตรปกติ (Normal) */}
              <div className="bg-[#182719] p-5 rounded-2xl border border-[#30391E] shadow-xl">
                <div className="flex items-center justify-between text-[#FFF9ED] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-[#D8A934]" />
                    บัตรปกติ (555 บาท / คน)
                  </span>
                  <span className="font-mono text-xs text-[#65705A]">
                    {Math.round((normalSold / normalTotal) * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <span className="text-[11px] text-[#65705A] block">ขายแล้ว</span>
                    <span className="font-mono text-3xl font-bold text-[#FFF9ED]">
                      {normalSold}
                    </span>
                    <span className="text-xs text-[#65705A] ml-1">ใบ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#65705A] block">คงเหลือ</span>
                    <span className="font-mono text-2xl font-bold text-[#D8A934]">
                      {normalRemaining}
                    </span>
                    <span className="text-xs text-[#65705A] ml-1">ใบ</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#30391E] text-[11px] text-[#65705A]">
                  โควตาทั้งหมด: {normalTotal} ใบ
                </div>
              </div>

              {/* Card 2: บัตร VIP (VIP Tables) */}
              <div className="bg-[#182719] p-5 rounded-2xl border border-[#D8A934]/50 shadow-xl">
                <div className="flex items-center justify-between text-[#D8A934] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />
                    VIP (5,555 บาท / โต๊ะ)
                  </span>
                  <span className="font-mono text-xs text-[#D8A934]">
                    {Math.round((vipSoldTables / vipTotalTables) * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <span className="text-[11px] text-[#65705A] block">ขายแล้ว</span>
                    <span className="font-mono text-3xl font-bold text-[#D8A934]">
                      {vipSoldTables}
                    </span>
                    <span className="text-xs text-[#65705A] ml-1">โต๊ะ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#65705A] block">คงเหลือ</span>
                    <span className="font-mono text-2xl font-bold text-[#FFF9ED]">
                      {vipRemainingTables}
                    </span>
                    <span className="text-xs text-[#65705A] ml-1">โต๊ะ</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#30391E] text-[11px] text-[#D8A934] font-medium">
                  โควตาทั้งหมด: {vipTotalTables} โต๊ะ
                </div>
              </div>

              {/* Card 3: VIP Seats Sold (Calculated as VIP tables sold × 6) */}
              <div className="bg-[#182719] p-5 rounded-2xl border border-[#30391E] shadow-xl">
                <div className="flex items-center justify-between text-[#F3E7C8] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#D8A934]" />
                    จำนวนที่นั่ง VIP ที่ขาย
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-mono text-3xl font-bold text-[#FFF9ED]">
                    {vipSeatsSold}
                  </span>
                  <span className="text-xs text-[#65705A] ml-1">ที่นั่ง</span>
                  <span className="block text-[11px] text-[#65705A] mt-1 font-mono">
                    คำนวณจาก: {vipSoldTables} โต๊ะ × 6 ที่นั่ง
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#30391E] text-[11px] text-[#65705A]">
                  ความจุ VIP สูงสุด: {vipTotalTables * 6} ที่นั่ง
                </div>
              </div>

              {/* Card 4: Total Revenue */}
              <div className="bg-[#182719] p-5 rounded-2xl border border-[#30391E] shadow-xl">
                <div className="flex items-center justify-between text-[#F3E7C8] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    ยอดขายรวม (Paid Revenue)
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-mono text-3xl font-bold text-emerald-400">
                    ฿{totalRevenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#65705A] ml-1 font-mono">THB</span>
                  <span className="block text-[11px] text-[#65705A] mt-1">
                    ชำระเงินแล้ว: {paidOrdersCount} คำสั่งซื้อ
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#30391E] text-[11px] text-[#65705A]">
                  รอดำเนินการ: {pendingOrdersCount} คำสั่งซื้อ
                </div>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#182719] via-[#30391E]/60 to-[#182719] border border-[#30391E] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#FFF9ED]">
                  ต้องการปรับเปลี่ยนจำนวนโควตาหรือราคาจำหน่าย?
                </h3>
                <p className="text-xs text-[#F3E7C8]/75 mt-0.5">
                  ท่านสามารถปรับยอดโควตาบัตรปกติและโต๊ะ VIP ได้ที่แท็บ &ldquo;คลังบัตร 2 ประเภท&rdquo;
                </p>
              </div>
              <button
                onClick={() => setTab('INVENTORY')}
                className="cursor-pointer shrink-0 px-5 py-2.5 rounded-xl bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase"
              >
                จัดการคลังบัตร &rarr;
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY SETTINGS */}
        {tab === 'INVENTORY' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#182719] border border-[#30391E] text-xs text-[#F3E7C8]/80">
              <strong className="text-[#D8A934]">เงื่อนไขทางธุรกิจ:</strong> ระบบจำหน่ายบัตรมีเพียง 2
              ประเภททางการเท่านั้น คือ <strong>บัตรปกติ (555 บาท / คน)</strong> และ{' '}
              <strong>บัตร VIP (5,555 บาท / โต๊ะ · 1 โต๊ะ 6 ที่นั่ง)</strong>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ticketTypes.map((t) => (
                <div
                  key={t.id}
                  className={`p-6 rounded-2xl bg-[#182719] border-2 shadow-xl ${
                    t.kind === 'VIP' ? 'border-[#D8A934]' : 'border-[#30391E]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#30391E] mb-4">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#D8A934]">
                        {t.kind === 'VIP' ? 'VIP TABLE PASS' : 'NORMAL ATTENDEE'}
                      </span>
                      <h3 className="font-display text-2xl font-bold text-[#FFF9ED] mt-0.5">
                        {t.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#10140F] hover:bg-[#30391E] border border-[#30391E] text-xs font-semibold text-[#D8A934] flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      แก้ไขโควตา/ราคา
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#F3E7C8]/85 mb-6">
                    <div className="flex justify-between py-1 border-b border-[#30391E]/50">
                      <span className="text-[#65705A]">ราคาจำหน่าย:</span>
                      <strong className="font-mono text-sm text-[#FFF9ED]">
                        ฿{t.price.toLocaleString()} บาท / {t.unitLabel}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#30391E]/50">
                      <span className="text-[#65705A]">จำนวนโควตาทั้งหมด:</span>
                      <strong className="font-mono text-sm text-[#FFF9ED]">
                        {t.totalQuantity} {t.unitLabel}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#30391E]/50">
                      <span className="text-[#65705A]">จำหน่ายแล้ว:</span>
                      <strong className="font-mono text-sm text-[#D8A934]">
                        {t.soldQuantity} {t.unitLabel}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#30391E]/50">
                      <span className="text-[#65705A]">คงเหลือจำหน่ายได้:</span>
                      <strong className="font-mono text-sm text-emerald-400">
                        {t.remainingQuantity} {t.unitLabel}
                      </strong>
                    </div>

                    {t.kind === 'VIP' && (
                      <div className="flex justify-between py-1 border-b border-[#30391E]/50">
                        <span className="text-[#65705A]">จำนวนที่นั่ง VIP ที่ขาย:</span>
                        <strong className="font-mono text-sm text-[#D8A934]">
                          {t.soldQuantity * 6} ที่นั่ง ({t.soldQuantity} โต๊ะ × 6)
                        </strong>
                      </div>
                    )}

                    <div className="flex justify-between py-1">
                      <span className="text-[#65705A]">สถานะการเปิดขาย:</span>
                      <span
                        className={`font-bold uppercase text-[11px] ${
                          t.saleStatus === 'ACTIVE'
                            ? 'text-emerald-400'
                            : t.saleStatus === 'SOLD_OUT'
                            ? 'text-red-400'
                            : 'text-[#65705A]'
                        }`}
                      >
                        {t.saleStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {tab === 'ORDERS' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="p-4 bg-[#182719] rounded-2xl border border-[#30391E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#65705A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchOrderQuery}
                  onChange={(e) => setSearchOrderQuery(e.target.value)}
                  placeholder="ค้นหา Order ID, ผู้ซื้อ, เบอร์โทร..."
                  className="w-full bg-[#10140F] border border-[#30391E] rounded-xl pl-9 pr-3 py-2 text-[#FFF9ED] focus:outline-none focus:border-[#D8A934]"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {['ALL', 'PAID', 'PENDING', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg font-bold ${
                      orderStatusFilter === st
                        ? 'bg-[#D8A934] text-[#10140F]'
                        : 'bg-[#10140F] text-[#65705A] hover:text-[#FFF9ED]'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'ทั้งหมด'
                      : st === 'PAID'
                      ? 'ชำระแล้ว'
                      : st === 'PENDING'
                      ? 'รอชำระ'
                      : 'ยกเลิก'}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-[#182719] rounded-2xl border border-[#30391E] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#10140F] border-b border-[#30391E] text-[#D8A934] font-mono uppercase text-[11px]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">ผู้ซื้อ</th>
                      <th className="py-3 px-4">รายการบัตร</th>
                      <th className="py-3 px-4 text-right">ยอดเงิน</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                      <th className="py-3 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30391E]/50">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#10140F]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FFF9ED]">
                          {o.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#FFF9ED]">{o.buyerName}</p>
                          <p className="text-[11px] text-[#65705A]">{o.buyerPhone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {o.items.map((i, idx) => (
                            <span key={idx} className="block text-[11px] text-[#F3E7C8]/85">
                              {i.ticketTypeName} × {i.quantity} {i.unitLabel}
                            </span>
                          ))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#D8A934]">
                          ฿{o.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              o.paymentStatus === 'PAID'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : o.paymentStatus === 'PENDING'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : 'bg-red-950 text-red-300 border border-red-700'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="cursor-pointer p-1.5 rounded-lg bg-[#10140F] hover:bg-[#30391E] text-[#FFF9ED]"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ATTENDEES ROSTER */}
        {tab === 'ATTENDEES' && (
          <div className="space-y-4">
            <div className="bg-[#182719] rounded-2xl border border-[#30391E] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#10140F] border-b border-[#30391E] text-[#D8A934] font-mono uppercase text-[11px]">
                      <th className="py-3 px-4">รหัสบัตร/โต๊ะ</th>
                      <th className="py-3 px-4">ประเภท</th>
                      <th className="py-3 px-4">ชื่อผู้เข้าร่วม</th>
                      <th className="py-3 px-4">ข้อมูลผู้ซื้อ / ติดต่อ</th>
                      <th className="py-3 px-4 text-center">เช็กอิน</th>
                      <th className="py-3 px-4 text-center">ริสแบนด์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30391E]/50">
                    {allIssuedTickets.map((t) => {
                      if (t.ticketKind === 'VIP' && t.vipAttendees) {
                        return t.vipAttendees.map((att) => (
                          <tr
                            key={`${t.id}-seat-${att.seatNumber}`}
                            className="hover:bg-[#10140F]/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-[#D8A934]">
                              {t.id}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[10px] font-bold text-[#10140F] bg-[#D8A934] px-2 py-0.5 rounded">
                                {t.tableNumber || 'VIP โต๊ะ'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-[#FFF9ED]">
                                {att.name || `ผู้เข้าร่วมคนที่ ${att.seatNumber}`}
                              </p>
                              <p className="text-[10px] text-[#65705A]">ที่นั่ง {att.seatNumber} / 6</p>
                            </td>
                            <td className="py-3 px-4 text-[#65705A]">
                              {t.attendeeName} ({t.attendeePhone})
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-mono text-[10px] font-bold ${
                                  att.checkedIn ? 'text-emerald-400' : 'text-[#65705A]'
                                }`}
                              >
                                {att.checkedIn ? 'CHECKED-IN' : 'PENDING'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-mono text-[10px] font-bold ${
                                  att.wristbandIssued ? 'text-emerald-400' : 'text-[#65705A]'
                                }`}
                              >
                                {att.wristbandIssued ? 'ISSUED' : 'NONE'}
                              </span>
                            </td>
                          </tr>
                        ));
                      }

                      return (
                        <tr key={t.id} className="hover:bg-[#10140F]/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#FFF9ED]">{t.id}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-[#65705A]">
                            NORMAL (บัตรปกติ)
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#FFF9ED]">
                            {t.attendeeName}
                          </td>
                          <td className="py-3 px-4 text-[#65705A]">
                            {t.attendeePhone || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-mono text-[10px] font-bold ${
                                t.checkedIn ? 'text-emerald-400' : 'text-[#65705A]'
                              }`}
                            >
                              {t.checkedIn ? 'CHECKED-IN' : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-mono text-[10px] font-bold ${
                                t.wristbandIssued ? 'text-emerald-400' : 'text-[#65705A]'
                              }`}
                            >
                              {t.wristbandIssued ? 'ISSUED' : 'NONE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT TICKET QUOTA / PRICE */}
        {editingType && (
          <div className="fixed inset-0 z-50 bg-[#10140F]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#182719] border border-[#30391E] rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#30391E] mb-4">
                <h3 className="font-display text-lg font-bold text-[#FFF9ED]">
                  ปรับการตั้งค่า: {editingType.name}
                </h3>
                <button
                  onClick={() => setEditingType(null)}
                  className="cursor-pointer text-[#65705A] hover:text-[#FFF9ED]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#65705A] mb-1">
                    ราคาต่อหน่วย ({editingType.unitLabel}):
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-[#10140F] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#65705A] mb-1">
                    โควตารวมทั้งหมด ({editingType.unitLabel}):
                  </label>
                  <input
                    type="number"
                    value={editTotalQty}
                    onChange={(e) => setEditTotalQty(Number(e.target.value))}
                    className="w-full bg-[#10140F] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED] font-mono"
                  />
                  <p className="text-[10px] text-[#65705A] mt-1">
                    จำหน่ายแล้ว: {editingType.soldQuantity} {editingType.unitLabel}
                  </p>
                </div>

                <div>
                  <label className="block text-[#65705A] mb-1">สถานะการเปิดขาย:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#10140F] border border-[#30391E] rounded-lg px-3 py-2 text-[#FFF9ED]"
                  >
                    <option value="ACTIVE">เปิดจำหน่าย (ACTIVE)</option>
                    <option value="CLOSED">ปิดการจำหน่าย (CLOSED)</option>
                    <option value="SOLD_OUT">บัตรหมด (SOLD_OUT)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingType(null)}
                    className="cursor-pointer px-4 py-2 rounded-lg bg-[#10140F] text-[#65705A] hover:text-[#FFF9ED]"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-5 py-2 rounded-lg bg-[#D8A934] text-[#10140F] font-bold"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ORDER DETAILS */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-[#10140F]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#182719] border border-[#30391E] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#30391E]">
                <div>
                  <span className="font-mono text-[10px] font-bold text-[#D8A934]">
                    ORDER DETAILS
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#FFF9ED]">
                    {selectedOrder.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="cursor-pointer text-[#65705A] hover:text-[#FFF9ED]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[#F3E7C8]/85">
                <div className="flex justify-between">
                  <span className="text-[#65705A]">ผู้ซื้อ:</span>
                  <strong className="text-[#FFF9ED]">{selectedOrder.buyerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65705A]">เบอร์โทร:</span>
                  <span>{selectedOrder.buyerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65705A]">อีเมล:</span>
                  <span>{selectedOrder.buyerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65705A]">สถานะการชำระ:</span>
                  <span
                    className={`font-bold font-mono ${
                      selectedOrder.paymentStatus === 'PAID'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#30391E]">
                  <span className="text-[#65705A]">ยอดรวม:</span>
                  <strong className="font-mono text-[#D8A934] text-sm">
                    ฿{selectedOrder.totalAmount.toLocaleString()} THB
                  </strong>
                </div>
              </div>

              {/* Tickets/Tables List */}
              <div className="pt-2 border-t border-[#30391E]">
                <p className="text-xs font-bold text-[#FFF9ED] mb-2">
                  รายการบัตรในคำสั่งซื้อ ({selectedOrder.tickets.length} รายการ):
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedOrder.tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-[#10140F] border border-[#30391E] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#D8A934]">{t.id}</span>
                        <span className="text-[#65705A] ml-2">
                          {t.ticketKind === 'VIP' ? `${t.tableNumber || 'VIP โต๊ะ'} (6 ที่นั่ง)` : t.attendeeName}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#65705A]">{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Actions */}
              <div className="pt-3 border-t border-[#30391E] flex items-center justify-between">
                {selectedOrder.paymentStatus !== 'CANCELLED' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="cursor-pointer text-xs text-red-400 hover:underline"
                  >
                    ยกเลิกคำสั่งซื้อนี้
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-[#10140F] text-xs font-semibold text-[#FFF9ED]"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
