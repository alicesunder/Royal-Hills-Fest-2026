export type CheckInStatus = 'REGISTERED' | 'CHECKED_IN';
export type WristbandStatus = 'NOT_ISSUED' | 'WRISTBAND_ISSUED';
export type PaymentStatus = 'PENDING' | 'VERIFYING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'WRISTBAND_ISSUED' | 'CANCELLED' | 'EXPIRED';
export type TicketSaleStatus = 'ACTIVE' | 'CLOSED' | 'SOLD_OUT' | 'HIDDEN';

export type TicketKind = 'NORMAL' | 'VIP';

export interface TicketType {
  id: string; // "tt-normal" or "tt-vip"
  kind: TicketKind;
  name: string; // "บัตรปกติ" or "VIP"
  badge: string; // "NORMAL" or "VIP TABLE"
  description: string;
  price: number; // 555 for normal, 5555 for VIP
  unitType: 'PERSON' | 'TABLE';
  unitLabel: string; // "คน" or "โต๊ะ"
  seatsPerUnit: number; // 1 for normal, 6 for VIP
  totalQuantity: number; // total units (tickets or tables)
  soldQuantity: number;
  remainingQuantity: number;
  features: string[];
  saleStatus: TicketSaleStatus;
  isPopular?: boolean;
}

export interface CartItem {
  ticketType: TicketType;
  quantity: number; // number of normal tickets or number of VIP tables
}

export interface AttendeeInfo {
  ticketNumber: number;
  attendeeName: string;
  attendeePhone: string;
  attendeeEmail: string;
  notes?: string;
}

// VIP Table Attendee: 1 to 6 attendees per VIP table
export interface VipAttendee {
  seatNumber: number; // 1 to 6
  name: string; // can be empty if buyer leaves blank
  checkedIn: boolean;
  checkedInAt?: number;
  checkedInBy?: string;
  wristbandIssued: boolean;
  wristbandIssuedAt?: number;
  wristbandIssuedBy?: string;
}

export interface IssuedTicket {
  id: string; // e.g. "RHF26-T101" or VIP Table ID "RHF26-VIP-0001"
  orderId: string; // e.g. "RHF26-892401"
  ticketTypeId: string; // "tt-normal" or "tt-vip"
  ticketTypeName: string; // "บัตรปกติ" or "VIP"
  ticketPrice: number; // 555 or 5555
  ticketKind: TicketKind; // 'NORMAL' | 'VIP'
  seatsCount: number; // 1 for normal, 6 for VIP
  tableNumber?: string; // e.g. "VIP-001"
  // For Normal ticket: 1 attendee
  attendeeName: string;
  attendeePhone: string;
  attendeeEmail: string;
  // For VIP table: up to 6 attendees with individual check-in status
  vipAttendees?: VipAttendee[];
  qrToken: string; // unique code scanned at gate
  status: TicketStatus;
  checkedIn: boolean;
  checkedInAt?: number;
  checkedInBy?: string;
  wristbandIssued: boolean;
  wristbandIssuedAt?: number;
  wristbandIssuedBy?: string;
  issuedAt: number;
}

export interface Order {
  id: string; // e.g. "RHF26-892401"
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
  totalQuantity: number;
  totalAmount: number; // (normalQuantity * 555) + (vipTableQuantity * 5555)
  paymentMethod: 'QR_PROMPTPAY' | 'CREDIT_CARD' | 'BANK_TRANSFER';
  paymentStatus: PaymentStatus;
  createdAt: number;
  expiresAt: number; // 15-minute countdown for payment
  paidAt?: number;
  transactionRef?: string;
  tickets: IssuedTicket[];
}

export type ActiveView = 
  | 'home' 
  | 'tickets' 
  | 'about' 
  | 'experience' 
  | 'schedule' 
  | 'my-tickets' 
  | 'my-qr'
  | 'check-in' 
  | 'admin';

export interface Registration {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  organization: string;
  participantsCount: number;
  registrationTimestamp: number;
  qrCodeData: string;
  checkInStatus: CheckInStatus;
  checkInTimestamp?: number;
  checkInStaff?: string;
  wristbandStatus: WristbandStatus;
  wristbandIssuedTimestamp?: number;
  wristbandIssuedBy?: string;
  eventCategory: string;
  activityPreference?: string;
  notes?: string;
}

export interface CheckInResult {
  status: 'IDLE' | 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID_CODE';
  registration?: Registration;
  message: string;
  timestamp?: number;
}

export interface CheckInVerificationResult {
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'UNPAID' | 'CANCELLED' | 'NOT_FOUND';
  message: string;
  ticket?: IssuedTicket;
  order?: Order;
  isVipTable?: boolean;
  tableNumber?: string;
  totalSeats?: number;
  checkedInSeats?: number;
  remainingSeats?: number;
  vipAttendees?: VipAttendee[];
}
