import { AttendeeInfo, CartItem, IssuedTicket, Order, TicketType, VipAttendee } from '../types';
import { OFFICIAL_TICKET_TYPES } from './ticketStoreService';

const CREDENTIALS_STORAGE_KEY = 'rhf26_secure_order_lookup_v1';

export interface OrderLookupCredentials {
  orderNumber: string;
  lookupToken: string;
  createdAt: number;
}

export interface TicketingOrderInput {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  cart: CartItem[];
  normalAttendees: AttendeeInfo[];
  vipTables: { tableIndex: number; attendeeNames: string[] }[];
  idempotencyKey: string;
  lookupToken: string;
}

export interface TicketingOrderResult {
  order: Order;
  credentials: OrderLookupCredentials;
  reviewNote?: string | null;
}

type JsonRecord = Record<string, unknown>;

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
// The static QR preserves the original PromptPay payload decoded from the user's supplied SCB image.
export const PROMPTPAY_QR_URL = String(import.meta.env.VITE_PROMPTPAY_QR_URL || '/promptpay-qr.svg');

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('ระบบสั่งซื้อยังไม่ได้ตั้งค่า Supabase URL และ Publishable Key');
  }
}

function toPaymentStatus(value: unknown): Order['paymentStatus'] {
  if (value === 'paid') return 'PAID';
  if (value === 'awaiting_review') return 'VERIFYING';
  if (value === 'cancelled') return 'CANCELLED';
  if (value === 'expired' || value === 'refunded') return 'FAILED';
  return 'PENDING';
}

function toTicketStatus(value: unknown): IssuedTicket['status'] {
  if (value === 'checked_in') return 'CHECKED_IN';
  if (value === 'cancelled') return 'CANCELLED';
  if (value === 'refunded') return 'CANCELLED';
  return 'VALID';
}

function mapCustomerOrder(payload: JsonRecord): TicketingOrderResult {
  const rawOrder = (payload.order && typeof payload.order === 'object' ? payload.order : {}) as JsonRecord;
  const rawItems = Array.isArray(payload.items) ? payload.items as JsonRecord[] : [];
  const rawTickets = Array.isArray(payload.tickets) ? payload.tickets as JsonRecord[] : [];
  const itemByTypeId = new Map<string, JsonRecord>(rawItems.map((item) => [String(item.ticket_type_id), item]));

  const items = rawItems.map((item) => {
    const code = String(item.code || '');
    const isVip = code === 'tt-vip';
    const quantity = Number(item.quantity || 0);
    return {
      ticketTypeId: code,
      ticketTypeName: String(item.name || (isVip ? 'VIP' : 'บัตรปกติ')),
      unitPrice: Number(item.unit_price_thb || 0),
      unitLabel: isVip ? 'โต๊ะ' : 'คน',
      quantity,
      subtotal: Number(item.line_total_thb || 0),
    };
  });

  const tickets: IssuedTicket[] = rawTickets.map((ticket) => {
    const typeId = String(ticket.ticket_type_id || '');
    const type = itemByTypeId.get(typeId);
    const code = String(type?.code || '');
    const isVip = code === 'tt-vip';
    const status = toTicketStatus(ticket.status);
    const attendeeRaw = Array.isArray(ticket.attendee_data) ? ticket.attendee_data : [];
    const vipAttendees: VipAttendee[] | undefined = isVip
      ? attendeeRaw.slice(0, 6).map((entry, index) => {
          const attendee = entry && typeof entry === 'object' ? entry as JsonRecord : {};
          const name = typeof entry === 'string' ? entry : String(attendee.name || '');
          return {
            seatNumber: index + 1,
            name,
            checkedIn: status === 'CHECKED_IN',
            wristbandIssued: false,
          };
        })
      : undefined;
    return {
      id: String(ticket.ticket_code || ticket.id || ''),
      orderId: String(rawOrder.order_number || ''),
      ticketTypeId: code,
      ticketTypeName: String(type?.name || (isVip ? 'VIP' : 'บัตรปกติ')),
      ticketPrice: Number(type?.unit_price_thb || type?.price_thb || 0),
      ticketKind: isVip ? 'VIP' : 'NORMAL',
      seatsCount: isVip ? 6 : 1,
      tableNumber: isVip ? String(ticket.ticket_code || '') : undefined,
      attendeeName: String(ticket.attendee_name || ''),
      attendeePhone: String(rawOrder.customer_phone || ''),
      attendeeEmail: String(rawOrder.customer_email || ''),
      vipAttendees,
      qrToken: String(ticket.qr_token || ''),
      status,
      checkedIn: status === 'CHECKED_IN',
      checkedInAt: ticket.checked_in_at ? new Date(String(ticket.checked_in_at)).getTime() : undefined,
      wristbandIssued: false,
      issuedAt: ticket.issued_at ? new Date(String(ticket.issued_at)).getTime() : Date.now(),
    };
  });

  const createdAt = rawOrder.created_at ? new Date(String(rawOrder.created_at)).getTime() : Date.now();
  const expiresAt = rawOrder.expires_at ? new Date(String(rawOrder.expires_at)).getTime() : createdAt + 30 * 60 * 1000;
  const order: Order = {
    id: String(rawOrder.order_number || ''),
    buyerName: String(rawOrder.customer_name || ''),
    buyerPhone: String(rawOrder.customer_phone || ''),
    buyerEmail: String(rawOrder.customer_email || ''),
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: Number(rawOrder.amount_total_thb || 0),
    paymentMethod: 'QR_PROMPTPAY',
    paymentStatus: toPaymentStatus(rawOrder.status),
    createdAt,
    expiresAt,
    paidAt: rawOrder.paid_at ? new Date(String(rawOrder.paid_at)).getTime() : undefined,
    transactionRef: rawOrder.payment_reference ? String(rawOrder.payment_reference) : undefined,
    tickets,
  };

  return { order, credentials: { orderNumber: order.id, lookupToken: '', createdAt }, reviewNote: rawOrder.payment_review_note ? String(rawOrder.payment_review_note) : null };
}

async function invoke(action: string, body: JsonRecord) {
  assertConfigured();
  const response = await fetch(SUPABASE_URL + '/functions/v1/ticketing-api', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบบัตร');
  }
  return payload.data as JsonRecord;
}

export const ticketingApiService = {
  async checkInTicket(accessToken: string, qrToken: string, scannerDeviceId = 'gate-1'): Promise<JsonRecord> {
    assertConfigured();
    const response = await fetch(SUPABASE_URL + '/functions/v1/ticketing-api', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'check-in',
        qrToken,
        requestId: crypto.randomUUID(),
        scannerDeviceId,
        scanLocation: 'ROYAL HILLS GATE 1',
      }),
    });
    const payload = await response.json().catch(() => ({})) as JsonRecord;
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'ตรวจสอบ QR บัตรไม่สำเร็จ');
    }
    return (payload.data || {}) as JsonRecord;
  },

  async getPaymentReviewQueue(accessToken: string): Promise<JsonRecord[]> {
    assertConfigured();
    const response = await fetch(SUPABASE_URL + '/functions/v1/ticketing-api', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'admin-list' }),
    });
    const payload = await response.json().catch(() => ({})) as JsonRecord;
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'โหลดรายการรอตรวจสอบไม่สำเร็จ');
    }
    const data = payload.data as JsonRecord | undefined;
    return Array.isArray(data?.orders) ? data.orders as JsonRecord[] : [];
  },

  async getPaymentReviewHistory(accessToken: string, limit = 100): Promise<{
    events: JsonRecord[];
    stats: {
      approved_orders: number;
      approved_tickets: number;
      approved_amount_thb: number;
      review_actions: number;
    };
  }> {
    assertConfigured();
    const response = await fetch(SUPABASE_URL + '/functions/v1/ticketing-api', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'admin-history', limit }),
    });
    const payload = await response.json().catch(() => ({})) as JsonRecord;
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'โหลดประวัติการอนุมัติไม่สำเร็จ');
    }
    const data = (payload.data && typeof payload.data === 'object' ? payload.data : {}) as JsonRecord;
    const rawStats = (data.stats && typeof data.stats === 'object' ? data.stats : {}) as JsonRecord;
    return {
      events: Array.isArray(data.events) ? data.events as JsonRecord[] : [],
      stats: {
        approved_orders: Number(rawStats.approved_orders || 0),
        approved_tickets: Number(rawStats.approved_tickets || 0),
        approved_amount_thb: Number(rawStats.approved_amount_thb || 0),
        review_actions: Number(rawStats.review_actions || 0),
      },
    };
  },

  async reviewPaymentOrder(accessToken: string, orderId: string, action: 'approve' | 'reject', note = ''): Promise<JsonRecord> {
    assertConfigured();
    const response = await fetch(SUPABASE_URL + '/functions/v1/ticketing-api', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'admin-review', orderId, reviewAction: action, note }),
    });
    const payload = await response.json().catch(() => ({})) as JsonRecord;
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'ดำเนินการตรวจสอบไม่สำเร็จ');
    }
    return (payload.data || {}) as JsonRecord;
  },

  createCredentials(): { idempotencyKey: string; lookupToken: string } {
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    return {
      idempotencyKey: crypto.randomUUID() + '-' + crypto.randomUUID(),
      lookupToken: Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join(''),
    };
  },

  saveCredentials(credentials: OrderLookupCredentials) {
    try {
      const existing = ticketingApiService.getSavedCredentials();
      const next = [credentials, ...existing.filter((item) => item.orderNumber !== credentials.orderNumber)].slice(0, 10);
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Checkout still works in private browsing; the buyer must keep the order lookup details.
    }
  },

  getSavedCredentials(): OrderLookupCredentials[] {
    try {
      const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is OrderLookupCredentials =>
        item && typeof item.orderNumber === 'string' &&
        typeof item.lookupToken === 'string' &&
        item.lookupToken.length >= 48
      );
    } catch {
      return [];
    }
  },

  async getCatalog(): Promise<TicketType[]> {
    const rows = await invoke('catalog', {}) as unknown;
    if (!Array.isArray(rows)) return [];

    const templates = new Map<string, TicketType>(
      OFFICIAL_TICKET_TYPES.map((item) => [item.id, item])
    );

    return rows.map((raw) => {
      const item = raw as JsonRecord;
      const code = String(item.code || '');
      const template = templates.get(code);
      if (!template) return null;

      const inventoryRaw = item.ticket_inventory;
      const inventory = Array.isArray(inventoryRaw)
        ? (inventoryRaw[0] || {}) as JsonRecord
        : (inventoryRaw && typeof inventoryRaw === 'object' ? inventoryRaw as JsonRecord : {});
      const capacity = Math.max(0, Number(inventory.capacity_total ?? template.totalQuantity));
      const sold = Math.max(0, Number(inventory.quantity_sold ?? 0));
      const reserved = Math.max(0, Number(inventory.quantity_reserved ?? 0));
      const remaining = Math.max(0, capacity - sold - reserved);
      const isSoldOut = capacity > 0 && sold + reserved >= capacity;
      const now = Date.now();
      const startsAt = item.sales_start_at ? Date.parse(String(item.sales_start_at)) : null;
      const endsAt = item.sales_end_at ? Date.parse(String(item.sales_end_at)) : null;
      const withinWindow = (startsAt === null || startsAt <= now) && (endsAt === null || endsAt > now);

      const saleStatus: TicketType['saleStatus'] = isSoldOut
        ? 'SOLD_OUT'
        : remaining > 0 && withinWindow
          ? 'ACTIVE'
          : 'CLOSED';
      const catalogItem: TicketType = {
        ...template,
        name: String(item.name || template.name),
        description: String(item.description || template.description),
        price: Number(item.price_thb ?? template.price),
        maxPerOrder: Math.max(1, Number(item.max_per_order ?? template.maxPerOrder ?? (code === 'tt-vip' ? 6 : 10))),
        totalQuantity: capacity,
        soldQuantity: sold,
        remainingQuantity: remaining,
        saleStatus,
      };
      return catalogItem;
    }).filter((item): item is TicketType => item !== null);
  },

  async createOrder(input: TicketingOrderInput): Promise<TicketingOrderResult> {
    const items = input.cart.map((cartItem) => {
      const isVip = cartItem.ticketType.id === 'tt-vip';
      const attendeeData = isVip
        ? input.vipTables.map((table) => ({ attendeeNames: table.attendeeNames.slice(0, 6) }))
        : input.normalAttendees.map((attendee) => ({ attendeeName: attendee.attendeeName.trim() }));
      return {
        code: cartItem.ticketType.id,
        quantity: cartItem.quantity,
        attendeeData,
      };
    });

    const created = await invoke('create-order', {
      buyer: {
        name: input.buyerName.trim(),
        phone: input.buyerPhone.trim(),
        email: input.buyerEmail.trim(),
      },
      items,
      idempotencyKey: input.idempotencyKey,
      lookupToken: input.lookupToken,
    });

    const orderNumber = String(created.orderNumber || '');
    if (!orderNumber) throw new Error('ระบบไม่ได้ส่งเลขที่คำสั่งซื้อกลับมา กรุณาลองอีกครั้ง');

    const credentials: OrderLookupCredentials = {
      orderNumber,
      lookupToken: input.lookupToken,
      createdAt: Date.now(),
    };
    ticketingApiService.saveCredentials(credentials);

    const lookedUp = await ticketingApiService.getOrder(orderNumber, input.lookupToken);
    return { ...lookedUp, credentials };
  },

  async getOrder(orderNumber: string, lookupToken: string): Promise<TicketingOrderResult> {
    const payload = await invoke('get-order', { orderNumber, lookupToken });
    const mapped = mapCustomerOrder(payload);
    return {
      ...mapped,
      credentials: { orderNumber, lookupToken, createdAt: Date.now() },
    };
  },

  async submitProof(input: {
    orderNumber: string;
    lookupToken: string;
    paymentReference: string;
    proof: File;
  }): Promise<JsonRecord> {
    assertConfigured();
    const form = new FormData();
    form.set('action', 'submit-proof');
    form.set('orderNumber', input.orderNumber);
    form.set('lookupToken', input.lookupToken);
    form.set('paymentReference', input.paymentReference.trim());
    form.set('proof', input.proof);

    const response = await fetch(SUPABASE_URL + '/functions/v1/ticketing-api', {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      body: form,
    });
    const payload = await response.json().catch(() => ({})) as JsonRecord;
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'ส่งหลักฐานไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
    return (payload.data || {}) as JsonRecord;
  },

  async getSavedOrders(): Promise<TicketingOrderResult[]> {
    const credentials = ticketingApiService.getSavedCredentials();
    const results = await Promise.all(credentials.map(async (item) => {
      try {
        const result = await ticketingApiService.getOrder(item.orderNumber, item.lookupToken);
        result.credentials = item;
        return result;
      } catch {
        return null;
      }
    }));
    return results.filter((item): item is TicketingOrderResult => Boolean(item));
  },
};
