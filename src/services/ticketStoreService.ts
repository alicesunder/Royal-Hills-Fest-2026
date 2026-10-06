import {
  TicketType,
  Order,
  IssuedTicket,
  AttendeeInfo,
  VipAttendee,
  CheckInVerificationResult,
} from '../types';

const STORAGE_TICKET_TYPES = 'rhf26_official_ticket_types_v2';
const STORAGE_ORDERS = 'rhf26_official_orders_v2';
const STORAGE_CURRENT_ORDER = 'rhf26_official_last_order_id_v2';

// EXACTLY 2 OFFICIAL TICKET TYPES
export const OFFICIAL_TICKET_TYPES: TicketType[] = [
  {
    id: 'tt-normal',
    kind: 'NORMAL',
    name: 'บัตรปกติ',
    badge: 'NORMAL',
    description: 'บัตรเข้าร่วมงานสำหรับผู้เข้าร่วมทั่วไป สัมผัสเทศกาลดนตรีและธรรมชาติ 14 พ.ย. 2569',
    price: 555,
    unitType: 'PERSON',
    unitLabel: 'คน',
    seatsPerUnit: 1,
    totalQuantity: 500,
    soldQuantity: 120,
    remainingQuantity: 380,
    features: [
      'สิทธิ์เข้าชมงานเทศกาล 1 ท่าน',
      'เข้าชมเวทีดนตรีสดและคอนเสิร์ตใหญ่ใต้แสงดาว',
      'โซนแคมป์ไฟเลานจ์และร้านอาหารเทศกาลริมทะเลสาบ',
      'ริสแบนด์ที่ระลึกประจำตัว 1 เส้น',
      'บริการรถรับส่งภายในบริเวณรีสอร์ท',
    ],
    saleStatus: 'ACTIVE',
  },
  {
    id: 'tt-vip',
    kind: 'VIP',
    name: 'VIP',
    badge: 'VIP TABLE',
    description: 'บัตร VIP แบบเหมาโต๊ะ 1 โต๊ะ พร้อม 6 เก้าอี้ (สำหรับผู้เข้าร่วมสูงสุด 6 คน) โซนหน้าเวที เครื่องดื่มต้อนรับ และของที่ระลึก',
    price: 5555,
    unitType: 'TABLE',
    unitLabel: 'โต๊ะ',
    seatsPerUnit: 6,
    totalQuantity: 20,
    soldQuantity: 15,
    remainingQuantity: 5,
    features: [
      '1 โต๊ะส่วนตัว พร้อม 6 เก้าอี้ (สำหรับสูงสุด 6 ท่าน)',
      'พื้นที่ชมคอนเสิร์ต VIP ด้านหน้าเวทีวิวพาโนรามา',
      'เครื่องดื่มต้อนรับและคานาเป้เซ็ตประจำโต๊ะ',
      'ริสแบนด์ VIP ประจำบุคคล (สูงสุด 6 เส้น)',
      'สิทธิ์เช็กอินแบบทั้งโต๊ะหรือแยกเช็กอินตามเวลาที่มาถึง',
      'ที่จอดรถพิเศษ VIP 2 คันต่อโต๊ะ',
    ],
    saleStatus: 'ACTIVE',
    isPopular: true,
  },
];

// Initial demo orders showing real Normal & VIP table examples
const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'RHF26-892401',
    buyerName: 'ศิริพร กิตติวัฒน์',
    buyerPhone: '081-445-8892',
    buyerEmail: 'siriporn.k@bangkokgolf.co.th',
    items: [
      {
        ticketTypeId: 'tt-vip',
        ticketTypeName: 'VIP',
        unitPrice: 5555,
        unitLabel: 'โต๊ะ',
        quantity: 1,
        subtotal: 5555,
      },
    ],
    totalQuantity: 1,
    totalAmount: 5555,
    paymentMethod: 'QR_PROMPTPAY',
    paymentStatus: 'PAID',
    createdAt: Date.now() - 86400000 * 2,
    expiresAt: Date.now() - 86400000 * 2 + 900000,
    paidAt: Date.now() - 86400000 * 2 + 120000,
    transactionRef: 'TXN-98421039',
    tickets: [
      {
        id: 'RHF26-VIP-0001',
        orderId: 'RHF26-892401',
        ticketTypeId: 'tt-vip',
        ticketTypeName: 'VIP',
        ticketPrice: 5555,
        ticketKind: 'VIP',
        seatsCount: 6,
        tableNumber: 'VIP โต๊ะ 001',
        attendeeName: 'ศิริพร กิตติวัฒน์ (หัวหน้าโต๊ะ)',
        attendeePhone: '081-445-8892',
        attendeeEmail: 'siriporn.k@bangkokgolf.co.th',
        qrToken: 'RHF26-VIP-0001-SEC-A91',
        status: 'CHECKED_IN',
        checkedIn: true,
        checkedInAt: Date.now() - 3600000 * 2,
        checkedInBy: 'เจ้าหน้าที่ สมชาย',
        wristbandIssued: true,
        wristbandIssuedAt: Date.now() - 3600000 * 1.8,
        wristbandIssuedBy: 'เจ้าหน้าที่ สมชาย',
        issuedAt: Date.now() - 86400000 * 2,
        vipAttendees: [
          {
            seatNumber: 1,
            name: 'ศิริพร กิตติวัฒน์',
            checkedIn: true,
            checkedInAt: Date.now() - 3600000 * 2,
            checkedInBy: 'เจ้าหน้าที่ สมชาย',
            wristbandIssued: true,
            wristbandIssuedAt: Date.now() - 3600000 * 1.8,
            wristbandIssuedBy: 'เจ้าหน้าที่ สมชาย',
          },
          {
            seatNumber: 2,
            name: 'พชร กิตติวัฒน์',
            checkedIn: true,
            checkedInAt: Date.now() - 3600000 * 2,
            checkedInBy: 'เจ้าหน้าที่ สมชาย',
            wristbandIssued: true,
            wristbandIssuedAt: Date.now() - 3600000 * 1.8,
            wristbandIssuedBy: 'เจ้าหน้าที่ สมชาย',
          },
          {
            seatNumber: 3,
            name: 'ธีรเดช วงศ์สวรรค์',
            checkedIn: true,
            checkedInAt: Date.now() - 3600000 * 1.5,
            checkedInBy: 'เจ้าหน้าที่ สมชาย',
            wristbandIssued: true,
            wristbandIssuedAt: Date.now() - 3600000 * 1.4,
            wristbandIssuedBy: 'เจ้าหน้าที่ สมชาย',
          },
          {
            seatNumber: 4,
            name: 'กมลพร จารุภัทร์',
            checkedIn: true,
            checkedInAt: Date.now() - 3600000 * 1.2,
            checkedInBy: 'เจ้าหน้าที่ สมชาย',
            wristbandIssued: true,
            wristbandIssuedAt: Date.now() - 3600000 * 1.1,
            wristbandIssuedBy: 'เจ้าหน้าที่ สมชาย',
          },
          {
            seatNumber: 5,
            name: 'อภิเชษฐ์ ปัญญาสิริ',
            checkedIn: false,
            wristbandIssued: false,
          },
          {
            seatNumber: 6,
            name: 'นลินี สุวรรณเวช',
            checkedIn: false,
            wristbandIssued: false,
          },
        ],
      },
    ],
  },
  {
    id: 'RHF26-551920',
    buyerName: 'ธนวัฒน์ บุญประเสริฐ',
    buyerPhone: '089-231-9901',
    buyerEmail: 'tanawat.bp@siamgreens.com',
    items: [
      {
        ticketTypeId: 'tt-normal',
        ticketTypeName: 'บัตรปกติ',
        unitPrice: 555,
        unitLabel: 'คน',
        quantity: 2,
        subtotal: 1110,
      },
    ],
    totalQuantity: 2,
    totalAmount: 1110,
    paymentMethod: 'QR_PROMPTPAY',
    paymentStatus: 'PAID',
    createdAt: Date.now() - 86400000,
    expiresAt: Date.now() - 86400000 + 900000,
    paidAt: Date.now() - 86400000 + 60000,
    transactionRef: 'TXN-55190021',
    tickets: [
      {
        id: 'RHF26-T551',
        orderId: 'RHF26-551920',
        ticketTypeId: 'tt-normal',
        ticketTypeName: 'บัตรปกติ',
        ticketPrice: 555,
        ticketKind: 'NORMAL',
        seatsCount: 1,
        attendeeName: 'ธนวัฒน์ บุญประเสริฐ',
        attendeePhone: '089-231-9901',
        attendeeEmail: 'tanawat.bp@siamgreens.com',
        qrToken: 'RHF26-T551-SEC-K12',
        status: 'WRISTBAND_ISSUED',
        checkedIn: true,
        checkedInAt: Date.now() - 3600000 * 4,
        checkedInBy: 'เจ้าหน้าที่ วรรณา',
        wristbandIssued: true,
        wristbandIssuedAt: Date.now() - 3600000 * 3.9,
        wristbandIssuedBy: 'เจ้าหน้าที่ วรรณา',
        issuedAt: Date.now() - 86400000,
      },
      {
        id: 'RHF26-T552',
        orderId: 'RHF26-551920',
        ticketTypeId: 'tt-normal',
        ticketTypeName: 'บัตรปกติ',
        ticketPrice: 555,
        ticketKind: 'NORMAL',
        seatsCount: 1,
        attendeeName: 'กัลยาณี บุญประเสริฐ',
        attendeePhone: '089-231-9902',
        attendeeEmail: 'kalyanee.bp@siamgreens.com',
        qrToken: 'RHF26-T552-SEC-X88',
        status: 'VALID',
        checkedIn: false,
        wristbandIssued: false,
        issuedAt: Date.now() - 86400000,
      },
    ],
  },
];

class TicketStoreService {
  // 1. TICKET TYPES (EXACTLY 2 OFFICIAL TYPES)
  getTicketTypes(): TicketType[] {
    try {
      const data = localStorage.getItem(STORAGE_TICKET_TYPES);
      if (!data) {
        localStorage.setItem(STORAGE_TICKET_TYPES, JSON.stringify(OFFICIAL_TICKET_TYPES));
        return OFFICIAL_TICKET_TYPES;
      }
      const parsed = JSON.parse(data) as TicketType[];
      // Guarantee exactly the 2 official types are present
      if (!parsed.some((t) => t.id === 'tt-normal') || !parsed.some((t) => t.id === 'tt-vip')) {
        localStorage.setItem(STORAGE_TICKET_TYPES, JSON.stringify(OFFICIAL_TICKET_TYPES));
        return OFFICIAL_TICKET_TYPES;
      }
      return parsed.filter((t) => t.id === 'tt-normal' || t.id === 'tt-vip');
    } catch {
      return OFFICIAL_TICKET_TYPES;
    }
  }

  saveTicketTypes(types: TicketType[]): void {
    const filtered = types.filter((t) => t.id === 'tt-normal' || t.id === 'tt-vip');
    localStorage.setItem(STORAGE_TICKET_TYPES, JSON.stringify(filtered));
  }

  updateTicketType(id: string, updates: Partial<TicketType>): TicketType | null {
    const types = this.getTicketTypes();
    const index = types.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const current = types[index];
    const totalQuantity = updates.totalQuantity !== undefined ? updates.totalQuantity : current.totalQuantity;
    const soldQuantity = updates.soldQuantity !== undefined ? updates.soldQuantity : current.soldQuantity;
    const remainingQuantity = Math.max(0, totalQuantity - soldQuantity);

    let saleStatus = updates.saleStatus !== undefined ? updates.saleStatus : current.saleStatus;
    if (remainingQuantity <= 0 && saleStatus === 'ACTIVE') {
      saleStatus = 'SOLD_OUT';
    }

    const updated: TicketType = {
      ...current,
      ...updates,
      totalQuantity,
      soldQuantity,
      remainingQuantity,
      saleStatus,
    };

    types[index] = updated;
    this.saveTicketTypes(types);
    return updated;
  }

  // 2. ORDERS MANAGEMENT
  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_ORDERS);
      if (!data) {
        localStorage.setItem(STORAGE_ORDERS, JSON.stringify(INITIAL_DEMO_ORDERS));
        return INITIAL_DEMO_ORDERS;
      }
      return JSON.parse(data) as Order[];
    } catch {
      return INITIAL_DEMO_ORDERS;
    }
  }

  saveOrders(orders: Order[]): void {
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  }

  getOrderById(id: string): Order | null {
    const trimmed = id.trim().toUpperCase();
    const orders = this.getOrders();
    return orders.find((o) => o.id.toUpperCase() === trimmed) || null;
  }

  getOrdersByEmail(email: string): Order[] {
    const trimmed = email.trim().toLowerCase();
    const orders = this.getOrders();
    return orders.filter((o) => o.buyerEmail.toLowerCase() === trimmed);
  }

  getLastOrderId(): string | null {
    return localStorage.getItem(STORAGE_CURRENT_ORDER);
  }

  setLastOrderId(id: string): void {
    localStorage.setItem(STORAGE_CURRENT_ORDER, id);
  }

  // CREATE ORDER & DEDUCT INVENTORY
  createOrder(data: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    items: {
      ticketTypeId: string;
      ticketTypeName: string;
      unitPrice: number;
      unitLabel: string;
      quantity: number;
      subtotal: number;
    }[];
    normalAttendees?: AttendeeInfo[];
    vipTables?: {
      tableIndex: number;
      attendeeNames: string[]; // up to 6 names
    }[];
    paymentMethod: 'QR_PROMPTPAY' | 'CREDIT_CARD' | 'BANK_TRANSFER';
  }): { success: boolean; order?: Order; message?: string } {
    const ticketTypes = this.getTicketTypes();

    // Verify inventory first
    for (const item of data.items) {
      const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (!tt) {
        return { success: false, message: `ไม่พบประเภทบัตร: ${item.ticketTypeName}` };
      }
      if (tt.remainingQuantity < item.quantity) {
        const unitName = tt.unitLabel || 'ใบ';
        return {
          success: false,
          message: `บัตร "${tt.name}" มีจำนวนคงเหลือไม่เพียงพอ (คงเหลือ ${tt.remainingQuantity} ${unitName})`,
        };
      }
    }

    // Deduct inventory
    data.items.forEach((item) => {
      const index = ticketTypes.findIndex((t) => t.id === item.ticketTypeId);
      if (index !== -1) {
        ticketTypes[index].soldQuantity += item.quantity;
        ticketTypes[index].remainingQuantity = Math.max(
          0,
          ticketTypes[index].totalQuantity - ticketTypes[index].soldQuantity
        );
        if (ticketTypes[index].remainingQuantity === 0) {
          ticketTypes[index].saleStatus = 'SOLD_OUT';
        }
      }
    });
    this.saveTicketTypes(ticketTypes);

    // Generate Order ID format: RHF26-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const orderId = `RHF26-${randomDigits}`;

    const totalQuantity = data.items.reduce((acc, i) => acc + i.quantity, 0);
    const totalAmount = data.items.reduce((acc, i) => acc + i.subtotal, 0);
    const createdAt = Date.now();
    const expiresAt = createdAt + 15 * 60 * 1000; // 15 mins

    const issuedTickets: IssuedTicket[] = [];

    // Process Normal Tickets: 1 ticket = 1 person = 1 unique QR
    const normalItem = data.items.find((i) => i.ticketTypeId === 'tt-normal');
    if (normalItem && normalItem.quantity > 0) {
      for (let i = 0; i < normalItem.quantity; i++) {
        const ticketNum = i + 1;
        const att = data.normalAttendees?.[i] || {
          ticketNumber: ticketNum,
          attendeeName: i === 0 ? data.buyerName : `ผู้เข้าร่วมคนที่ ${ticketNum}`,
          attendeePhone: i === 0 ? data.buyerPhone : '',
          attendeeEmail: i === 0 ? data.buyerEmail : '',
        };

        const ticketId = `RHF26-T${randomDigits.slice(0, 3)}${ticketNum}`;
        const randomSalt = Math.random().toString(36).substring(2, 6).toUpperCase();
        const qrToken = `${ticketId}-SEC-${randomSalt}`;

        issuedTickets.push({
          id: ticketId,
          orderId,
          ticketTypeId: 'tt-normal',
          ticketTypeName: 'บัตรปกติ',
          ticketPrice: 555,
          ticketKind: 'NORMAL',
          seatsCount: 1,
          attendeeName: att.attendeeName.trim() || data.buyerName,
          attendeePhone: att.attendeePhone.trim() || data.buyerPhone,
          attendeeEmail: att.attendeeEmail.trim() || data.buyerEmail,
          qrToken,
          status: 'VALID',
          checkedIn: false,
          wristbandIssued: false,
          issuedAt: createdAt,
        });
      }
    }

    // Process VIP Tables: 1 table = 1 VIP Table ID = 1 VIP QR = up to 6 attendees
    const vipItem = data.items.find((i) => i.ticketTypeId === 'tt-vip');
    if (vipItem && vipItem.quantity > 0) {
      // Find current VIP count to create sequential table numbers
      const allOrders = this.getOrders();
      let existingVipCount = 0;
      allOrders.forEach((o) => {
        o.tickets.forEach((t) => {
          if (t.ticketKind === 'VIP') existingVipCount++;
        });
      });

      for (let tIdx = 0; tIdx < vipItem.quantity; tIdx++) {
        const tableNumInt = existingVipCount + tIdx + 1;
        const tableStr = tableNumInt.toString().padStart(4, '0');
        const vipTableId = `RHF26-VIP-${tableStr}`;
        const randomSalt = Math.random().toString(36).substring(2, 6).toUpperCase();
        const qrToken = `${vipTableId}-SEC-${randomSalt}`;

        const tableInput = data.vipTables?.[tIdx];
        const vipAttendees: VipAttendee[] = [];

        for (let s = 1; s <= 6; s++) {
          const providedName = tableInput?.attendeeNames?.[s - 1] || '';
          // If first seat of first table and empty, default to buyer
          const nameToUse = (s === 1 && tIdx === 0 && !providedName.trim())
            ? data.buyerName
            : providedName.trim();

          vipAttendees.push({
            seatNumber: s,
            name: nameToUse,
            checkedIn: false,
            wristbandIssued: false,
          });
        }

        issuedTickets.push({
          id: vipTableId,
          orderId,
          ticketTypeId: 'tt-vip',
          ticketTypeName: 'VIP',
          ticketPrice: 5555,
          ticketKind: 'VIP',
          seatsCount: 6,
          tableNumber: `VIP โต๊ะ ${tableNumInt}`,
          attendeeName: data.buyerName,
          attendeePhone: data.buyerPhone,
          attendeeEmail: data.buyerEmail,
          vipAttendees,
          qrToken,
          status: 'VALID',
          checkedIn: false,
          wristbandIssued: false,
          issuedAt: createdAt,
        });
      }
    }

    const newOrder: Order = {
      id: orderId,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerEmail: data.buyerEmail,
      items: data.items,
      totalQuantity,
      totalAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'PENDING',
      createdAt,
      expiresAt,
      tickets: issuedTickets,
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);
    this.saveOrders(orders);
    this.setLastOrderId(orderId);

    return { success: true, order: newOrder };
  }

  // CONFIRM ORDER PAYMENT
  confirmOrderPayment(
    orderId: string,
    transactionRef?: string
  ): { success: boolean; order?: Order; message?: string } {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id.toUpperCase() === orderId.trim().toUpperCase());
    if (index === -1) {
      return { success: false, message: 'ไม่พบคำสั่งซื้อ' };
    }

    const order = orders[index];
    if (order.paymentStatus === 'PAID') {
      return { success: true, order, message: 'คำสั่งซื้อนี้ชำระเงินเรียบร้อยแล้ว' };
    }

    const paidAt = Date.now();
    const ref = transactionRef || `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const updatedOrder: Order = {
      ...order,
      paymentStatus: 'PAID',
      paidAt,
      transactionRef: ref,
    };

    orders[index] = updatedOrder;
    this.saveOrders(orders);

    return { success: true, order: updatedOrder, message: 'ยืนยันการชำระเงินสำเร็จ' };
  }

  // CANCEL ORDER & RESTORE INVENTORY
  cancelOrder(orderId: string): { success: boolean; message: string } {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id.toUpperCase() === orderId.trim().toUpperCase());
    if (index === -1) {
      return { success: false, message: 'ไม่พบคำสั่งซื้อ' };
    }

    const order = orders[index];
    if (order.paymentStatus === 'PAID') {
      return { success: false, message: 'ไม่สามารถยกเลิกคำสั่งซื้อที่ชำระเงินแล้วได้โดยตรง (ต้องทำการคืนเงิน)' };
    }

    order.paymentStatus = 'CANCELLED';
    order.tickets.forEach((t) => (t.status = 'CANCELLED'));

    // Restore inventory
    const ticketTypes = this.getTicketTypes();
    order.items.forEach((item) => {
      const ttIndex = ticketTypes.findIndex((t) => t.id === item.ticketTypeId);
      if (ttIndex !== -1) {
        ticketTypes[ttIndex].soldQuantity = Math.max(0, ticketTypes[ttIndex].soldQuantity - item.quantity);
        ticketTypes[ttIndex].remainingQuantity =
          ticketTypes[ttIndex].totalQuantity - ticketTypes[ttIndex].soldQuantity;
        if (ticketTypes[ttIndex].saleStatus === 'SOLD_OUT' && ticketTypes[ttIndex].remainingQuantity > 0) {
          ticketTypes[ttIndex].saleStatus = 'ACTIVE';
        }
      }
    });
    this.saveTicketTypes(ticketTypes);
    this.saveOrders(orders);

    return { success: true, message: 'ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว' };
  }

  // 3. TICKET SEARCH & LOOKUP
  getTicketByIdOrToken(tokenOrId: string): { ticket: IssuedTicket; order: Order } | null {
    const query = tokenOrId.trim().toUpperCase();
    const orders = this.getOrders();

    for (const order of orders) {
      for (const ticket of order.tickets) {
        if (
          ticket.id.toUpperCase() === query ||
          ticket.qrToken.toUpperCase() === query ||
          (order.id.toUpperCase() === query && order.tickets.length === 1)
        ) {
          return { ticket, order };
        }
      }
    }
    return null;
  }

  // 4. GATE VERIFICATION
  verifyAndCheckInTicket(tokenOrId: string, staffName = 'เจ้าหน้าที่จุดตรวจ'): CheckInVerificationResult {
    const match = this.getTicketByIdOrToken(tokenOrId);
    if (!match) {
      return {
        status: 'NOT_FOUND',
        message: 'ไม่พบข้อมูลบัตรหรือโต๊ะ VIP กรุณาตรวจสอบ QR Code',
      };
    }

    const { ticket, order } = match;

    if (order.paymentStatus !== 'PAID') {
      return {
        status: 'UNPAID',
        message: 'คำสั่งซื้อนี้ยังไม่เสร็จสมบูรณ์ (ยังไม่ได้ชำระเงิน)',
        ticket,
        order,
      };
    }

    if (ticket.status === 'CANCELLED') {
      return {
        status: 'CANCELLED',
        message: 'บัตรหรือโต๊ะนี้ถูกยกเลิก ไม่สามารถใช้เข้างานได้',
        ticket,
        order,
      };
    }

    // IF VIP TABLE
    if (ticket.ticketKind === 'VIP' && ticket.vipAttendees) {
      const attendees = ticket.vipAttendees;
      const checkedInCount = attendees.filter((a) => a.checkedIn).length;
      const remainingCount = attendees.length - checkedInCount;

      return {
        status: 'SUCCESS',
        message: 'สแกน QR Code โต๊ะ VIP สำเร็จ',
        ticket,
        order,
        isVipTable: true,
        tableNumber: ticket.tableNumber || ticket.id,
        totalSeats: ticket.seatsCount || 6,
        checkedInSeats: checkedInCount,
        remainingSeats: remainingCount,
        vipAttendees: attendees,
      };
    }

    // NORMAL TICKET
    if (ticket.checkedIn) {
      const timeStr = new Date(ticket.checkedInAt || Date.now()).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        status: 'ALREADY_CHECKED_IN',
        message: `บัตรนี้เช็กอินแล้ว เมื่อเวลา ${timeStr} น. โดย ${ticket.checkedInBy || 'เจ้าหน้าที่'}`,
        ticket,
        order,
      };
    }

    // Check in normal ticket
    ticket.checkedIn = true;
    ticket.checkedInAt = Date.now();
    ticket.checkedInBy = staffName;
    ticket.status = 'CHECKED_IN';

    this.saveOrders(this.getOrders());

    return {
      status: 'SUCCESS',
      message: 'เช็กอินสำเร็จ สามารถรับริสแบนด์เข้างานได้',
      ticket,
      order,
      isVipTable: false,
    };
  }

  // 5. VIP CHECK-IN OPERATIONS
  checkInVipAttendee(
    ticketId: string,
    seatNumber: number,
    staffName = 'เจ้าหน้าที่จุดตรวจ VIP'
  ): { success: boolean; message: string; ticket?: IssuedTicket } {
    const match = this.getTicketByIdOrToken(ticketId);
    if (!match || match.ticket.ticketKind !== 'VIP') {
      return { success: false, message: 'ไม่พบโต๊ะ VIP ที่ระบุ' };
    }

    const { ticket } = match;
    const vipAttendees = ticket.vipAttendees;
    if (!vipAttendees) {
      return { success: false, message: 'ไม่พบข้อมูลที่นั่งของโต๊ะ VIP' };
    }

    const attIndex = vipAttendees.findIndex((a) => a.seatNumber === seatNumber);
    if (attIndex === -1) {
      return { success: false, message: 'ไม่พบที่นั่งที่ระบุ' };
    }

    const att = vipAttendees[attIndex];
    if (att.checkedIn) {
      return { success: false, message: 'ที่นั่งนี้ทำการเช็กอินเรียบร้อยแล้ว' };
    }

    att.checkedIn = true;
    att.checkedInAt = Date.now();
    att.checkedInBy = staffName;

    // Check if at least one attendee checked in
    ticket.checkedIn = true;
    ticket.checkedInAt = ticket.checkedInAt || Date.now();
    ticket.checkedInBy = staffName;
    ticket.status = 'CHECKED_IN';

    this.saveOrders(this.getOrders());
    return { success: true, message: `เช็กอินที่นั่งที่ ${seatNumber} สำเร็จ`, ticket };
  }

  checkInEntireVipTable(
    ticketId: string,
    staffName = 'เจ้าหน้าที่จุดตรวจ VIP'
  ): { success: boolean; message: string; ticket?: IssuedTicket } {
    const match = this.getTicketByIdOrToken(ticketId);
    if (!match || match.ticket.ticketKind !== 'VIP') {
      return { success: false, message: 'ไม่พบโต๊ะ VIP ที่ระบุ' };
    }

    const { ticket } = match;
    const vipAttendees = ticket.vipAttendees;
    if (!vipAttendees) {
      return { success: false, message: 'ไม่พบข้อมูลที่นั่งของโต๊ะ VIP' };
    }

    const now = Date.now();

    vipAttendees.forEach((att) => {
      if (!att.checkedIn) {
        att.checkedIn = true;
        att.checkedInAt = now;
        att.checkedInBy = staffName;
      }
    });

    ticket.checkedIn = true;
    ticket.checkedInAt = now;
    ticket.checkedInBy = staffName;
    ticket.status = 'CHECKED_IN';

    this.saveOrders(this.getOrders());
    return { success: true, message: 'เช็กอินทั้งโต๊ะ VIP เรียบร้อยแล้ว (ครบ 6 ที่นั่ง)', ticket };
  }

  issueWristbandToVipAttendee(
    ticketId: string,
    seatNumber: number,
    staffName = 'เจ้าหน้าที่จุดแจกริสแบนด์ VIP'
  ): { success: boolean; message: string; ticket?: IssuedTicket } {
    const match = this.getTicketByIdOrToken(ticketId);
    if (!match || match.ticket.ticketKind !== 'VIP') {
      return { success: false, message: 'ไม่พบโต๊ะ VIP ที่ระบุ' };
    }

    const { ticket } = match;
    const vipAttendees = ticket.vipAttendees;
    if (!vipAttendees) {
      return { success: false, message: 'ไม่พบข้อมูลที่นั่งของโต๊ะ VIP' };
    }

    const att = vipAttendees.find((a) => a.seatNumber === seatNumber);
    if (!att) return { success: false, message: 'ไม่พบที่นั่ง' };

    if (!att.checkedIn) {
      return { success: false, message: 'ต้องเช็กอินก่อนจึงจะสามารถรับริสแบนด์ได้' };
    }
    if (att.wristbandIssued) {
      return { success: false, message: 'ที่นั่งนี้ได้รับริสแบนด์ไปแล้ว' };
    }

    att.wristbandIssued = true;
    att.wristbandIssuedAt = Date.now();
    att.wristbandIssuedBy = staffName;

    // If all checked-in attendees have wristband, set table wristbandIssued
    const allHaveWristband = vipAttendees.every((a) => !a.checkedIn || a.wristbandIssued);
    if (allHaveWristband) {
      ticket.wristbandIssued = true;
      ticket.wristbandIssuedAt = Date.now();
      ticket.wristbandIssuedBy = staffName;
      ticket.status = 'WRISTBAND_ISSUED';
    }

    this.saveOrders(this.getOrders());
    return { success: true, message: `มอบริสแบนด์ที่นั่งที่ ${seatNumber} สำเร็จ`, ticket };
  }

  issueWristbandsToEntireVipTable(
    ticketId: string,
    staffName = 'เจ้าหน้าที่จุดแจกริสแบนด์ VIP'
  ): { success: boolean; message: string; ticket?: IssuedTicket } {
    const match = this.getTicketByIdOrToken(ticketId);
    if (!match || match.ticket.ticketKind !== 'VIP') {
      return { success: false, message: 'ไม่พบโต๊ะ VIP ที่ระบุ' };
    }

    const { ticket } = match;
    const vipAttendees = ticket.vipAttendees;
    if (!vipAttendees) {
      return { success: false, message: 'ไม่พบข้อมูลที่นั่งของโต๊ะ VIP' };
    }

    const now = Date.now();

    vipAttendees.forEach((att) => {
      // Auto check-in if issuing all
      if (!att.checkedIn) {
        att.checkedIn = true;
        att.checkedInAt = now;
        att.checkedInBy = staffName;
      }
      if (!att.wristbandIssued) {
        att.wristbandIssued = true;
        att.wristbandIssuedAt = now;
        att.wristbandIssuedBy = staffName;
      }
    });

    ticket.checkedIn = true;
    ticket.checkedInAt = now;
    ticket.checkedInBy = staffName;
    ticket.wristbandIssued = true;
    ticket.wristbandIssuedAt = now;
    ticket.wristbandIssuedBy = staffName;
    ticket.status = 'WRISTBAND_ISSUED';

    this.saveOrders(this.getOrders());
    return { success: true, message: 'มอบริสแบนด์ทั้งโต๊ะ VIP เรียบร้อยแล้ว (ครบ 6 เส้น)', ticket };
  }

  // 6. NORMAL TICKET WRISTBAND
  issueWristbandToTicket(
    ticketId: string,
    staffName = 'เจ้าหน้าที่จุดแจกริสแบนด์'
  ): { success: boolean; message: string; ticket?: IssuedTicket } {
    const match = this.getTicketByIdOrToken(ticketId);
    if (!match) {
      return { success: false, message: 'ไม่พบข้อมูลบัตร' };
    }

    const { ticket } = match;
    if (ticket.wristbandIssued) {
      const timeStr = new Date(ticket.wristbandIssuedAt || Date.now()).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        success: false,
        message: `รับริสแบนด์แล้ว เมื่อเวลา ${timeStr} น.`,
        ticket,
      };
    }

    ticket.wristbandIssued = true;
    ticket.wristbandIssuedAt = Date.now();
    ticket.wristbandIssuedBy = staffName;
    ticket.status = 'WRISTBAND_ISSUED';

    this.saveOrders(this.getOrders());

    return {
      success: true,
      message: 'มอบริสแบนด์เรียบร้อยแล้ว',
      ticket,
    };
  }

  // 7. ALL ISSUED TICKETS FLAT LIST
  getAllIssuedTickets(): IssuedTicket[] {
    const orders = this.getOrders();
    const tickets: IssuedTicket[] = [];
    orders.forEach((o) => {
      tickets.push(...o.tickets);
    });
    return tickets;
  }

  // 8. RESET TO INITIAL DEMO DATA
  resetToDemo(): void {
    localStorage.setItem(STORAGE_TICKET_TYPES, JSON.stringify(OFFICIAL_TICKET_TYPES));
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(INITIAL_DEMO_ORDERS));
    localStorage.removeItem(STORAGE_CURRENT_ORDER);
  }
}

export const ticketStoreService = new TicketStoreService();
