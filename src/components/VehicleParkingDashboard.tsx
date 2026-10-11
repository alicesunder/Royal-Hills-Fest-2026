import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CarFront,
  CheckCircle2,
  Crown,
  ExternalLink,
  FileCheck2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { getAdminAccessToken, getCachedAdminEmail, signInAdmin, signOutAdmin } from '../services/supabaseAdminAuth';
import { ticketingApiService } from '../services/ticketingApiService';

type VehiclePassRow = {
  registration_code: string;
  ticket_code: string;
  order_number: string;
  ticket_type: string;
  owner_rank: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  organization: string;
  affiliation: string;
  vehicle_plate: string;
  parking_zone: string | null;
  parking_slot: string | null;
  status: string;
  arrival_verified_at: string | null;
  scan_count: number;
  created_at: string;
  attendee_names: string[];
  has_vehicle_pass: boolean;
};

type DashboardStats = {
  total: number;
  assigned: number;
  arrived: number;
  normal_people: number;
  vip_people: number;
  vip_tables: number;
  total_people: number;
  legacy_missing_vehicle: number;
};

const EMPTY_STATS: DashboardStats = {
  total: 0, assigned: 0, arrived: 0,
  normal_people: 0, vip_people: 0, vip_tables: 0, total_people: 0,
  legacy_missing_vehicle: 0,
};

type DraftAssignment = { zone: string; slot: string };
type LegacyVehicleDraft = {
  rank: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  affiliation: string;
  vehiclePlate: string;
};
type PaymentReviewOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount_total_thb: number;
  expires_at: string;
  payment_submitted_at: string;
  created_at: string;
  has_proof: boolean;
  proof_url: string | null;
  items: Array<{ ticket_type: string; quantity: number; unit_price_thb: number }>;
};
const reviewOrderFromJson = (raw: Record<string, unknown>): PaymentReviewOrder => ({
  id: stringValue(raw.id),
  order_number: stringValue(raw.order_number),
  customer_name: stringValue(raw.customer_name),
  customer_email: stringValue(raw.customer_email),
  amount_total_thb: Number(raw.amount_total_thb || 0),
  expires_at: stringValue(raw.expires_at),
  payment_submitted_at: stringValue(raw.payment_submitted_at),
  created_at: stringValue(raw.created_at),
  has_proof: raw.has_proof === true,
  proof_url: typeof raw.proof_url === 'string' ? raw.proof_url : null,
  items: Array.isArray(raw.items) ? raw.items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => ({
    ticket_type: stringValue(item.ticket_type),
    quantity: Number(item.quantity || 0),
    unit_price_thb: Number(item.unit_price_thb || 0),
  })) : [],
});

const stringValue = (value: unknown) => typeof value === 'string' ? value : '';
const rowFromJson = (raw: Record<string, unknown>): VehiclePassRow => ({
  registration_code: stringValue(raw.registration_code),
  ticket_code: stringValue(raw.ticket_code),
  order_number: stringValue(raw.order_number),
  ticket_type: stringValue(raw.ticket_type),
  owner_rank: stringValue(raw.owner_rank),
  owner_name: stringValue(raw.owner_name),
  owner_phone: stringValue(raw.owner_phone),
  owner_email: stringValue(raw.owner_email),
  organization: stringValue(raw.organization),
  affiliation: stringValue(raw.affiliation),
  vehicle_plate: stringValue(raw.vehicle_plate),
  parking_zone: typeof raw.parking_zone === 'string' ? raw.parking_zone : null,
  parking_slot: typeof raw.parking_slot === 'string' ? raw.parking_slot : null,
  status: stringValue(raw.status),
  arrival_verified_at: typeof raw.arrival_verified_at === 'string' ? raw.arrival_verified_at : null,
  scan_count: Number(raw.scan_count || 0),
  created_at: stringValue(raw.created_at),
  attendee_names: Array.isArray(raw.attendee_names)
    ? raw.attendee_names.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    : [],
  has_vehicle_pass: raw.has_vehicle_pass !== false,
});

export const VehicleParkingDashboard: React.FC = () => {
  const [email, setEmail] = useState(getCachedAdminEmail());
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingCode, setSavingCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicles, setVehicles] = useState<VehiclePassRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ ...EMPTY_STATS });
  const [drafts, setDrafts] = useState<Record<string, DraftAssignment>>({});
  const [legacyDrafts, setLegacyDrafts] = useState<Record<string, LegacyVehicleDraft>>({});
  const [reviewOrders, setReviewOrders] = useState<PaymentReviewOrder[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewingOrderId, setReviewingOrderId] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const loadVehicles = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await ticketingApiService.getVehiclePasses(token, 500);
      const next = result.vehicles.map((row) => rowFromJson(row));
      setVehicles(next);
      setStats(result.stats);
      setDrafts((previous) => {
        const merged = { ...previous };
        next.forEach((row) => {
          merged[row.registration_code] = {
            zone: row.parking_zone || '',
            slot: row.parking_slot || '',
          };
        });
        return merged;
      });
      setLegacyDrafts((previous) => {
        const merged = { ...previous };
        next.filter((row) => !row.has_vehicle_pass).forEach((row) => {
          merged[row.registration_code] = merged[row.registration_code] || {
            rank: row.owner_rank,
            name: row.owner_name,
            phone: row.owner_phone,
            email: row.owner_email,
            organization: row.organization,
            affiliation: row.affiliation,
            vehiclePlate: row.vehicle_plate,
          };
        });
        return merged;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดทะเบียนรถไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaymentReviewOrders = useCallback(async (token: string) => {
    setReviewLoading(true);
    try {
      const records = await ticketingApiService.getPaymentReviewOrders(token);
      setReviewOrders(records.map((row) => reviewOrderFromJson(row)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดรายการรอตรวจสอบไม่สำเร็จ');
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAdminAccessToken().then((token) => {
      if (!active || !token) return;
      setAccessToken(token);
      setEmail(getCachedAdminEmail());
      void loadVehicles(token);
      void loadPaymentReviewOrders(token);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loadVehicles, loadPaymentReviewOrders]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    setError('');
    try {
      const session = await signInAdmin(email, password);
      setAccessToken(session.access_token);
      setEmail(session.user.email || email);
      setPassword('');
      setNotice('เข้าสู่ระบบจัดสรรที่จอดรถแล้ว');
      await Promise.all([loadVehicles(session.access_token), loadPaymentReviewOrders(session.access_token)]);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setAccessToken(null);
    setPassword('');
    setVehicles([]);
    setStats({ ...EMPTY_STATS });
    setLegacyDrafts({});
    setReviewOrders([]);
    setReviewNotes({});
    setNotice('');
  };

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((row) => [
      row.registration_code, row.ticket_code, row.order_number, row.vehicle_plate,
      row.owner_rank, row.owner_name, row.owner_phone, row.owner_email,
      row.organization, row.affiliation, row.parking_zone, row.parking_slot,
      ...row.attendee_names,
    ].some((value) => (value || '').toLocaleLowerCase().includes(query)));
  }, [vehicles, searchQuery]);

  const handleSaveAssignment = async (row: VehiclePassRow) => {
    if (!accessToken) return;
    const draft = drafts[row.registration_code] || { zone: '', slot: '' };
    if (draft.slot.trim() && !draft.zone.trim()) {
      setError('กรุณากรอกโซนจอดก่อนกำหนดช่องจอด');
      return;
    }
    setSavingCode(row.registration_code);
    setError('');
    setNotice('');
    try {
      await ticketingApiService.assignVehicleParking(
        accessToken,
        row.registration_code,
        draft.zone.trim(),
        draft.slot.trim(),
      );
      setNotice('บันทึกการจัดสรรที่จอดรถให้ ' + row.vehicle_plate + ' แล้ว');
      await loadVehicles(accessToken);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกการจัดสรรไม่สำเร็จ');
    } finally {
      setSavingCode('');
    }
  };

  const dateText = (value: string | null) => value
    ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : 'ยังไม่บันทึก';

  const handleRegisterLegacyVehicle = async (row: VehiclePassRow) => {
    if (!accessToken) return;
    const draft = legacyDrafts[row.registration_code];
    if (!draft || !draft.name.trim() || !draft.phone.trim() || !draft.email.trim() ||
        !draft.organization.trim() || !draft.affiliation.trim() || !draft.vehiclePlate.trim()) {
      setError('กรุณากรอกชื่อ เบอร์โทร อีเมล หน่วยงาน สังกัด และทะเบียนรถให้ครบถ้วน');
      return;
    }
    setSavingCode(row.registration_code);
    setError('');
    setNotice('');
    try {
      await ticketingApiService.registerLegacyVehiclePass(accessToken, row.ticket_code, {
        rank: draft.rank,
        name: draft.name,
        phone: draft.phone,
        email: draft.email,
        organization: draft.organization,
        affiliation: draft.affiliation,
        vehiclePlate: draft.vehiclePlate,
      });
      setNotice('เพิ่มข้อมูลรถให้บัตรเก่า ' + row.ticket_code + ' แล้ว');
      await loadVehicles(accessToken);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'เพิ่มข้อมูลรถให้บัตรเก่าไม่สำเร็จ');
    } finally {
      setSavingCode('');
    }
  };

  const handleReviewPayment = async (row: PaymentReviewOrder, action: 'approve' | 'reject') => {
    if (!accessToken) return;
    const note = (reviewNotes[row.id] || '').trim();
    if (action === 'reject' && note.length < 5) {
      setError('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษรก่อนคืนโควตา');
      return;
    }
    if (row.has_proof && !row.proof_url) {
      setError('ยังเปิดหลักฐานการชำระเงินไม่ได้ จึงไม่สามารถตัดสินรายการนี้ได้ กรุณาตรวจสอบการเชื่อมต่อพื้นที่เก็บไฟล์');
      return;
    }
    const confirmMessage = action === 'approve'
      ? 'ยืนยันว่าตรวจสอบหลักฐานแล้วและยอดชำระถูกต้อง เพื่อออกบัตรให้คำสั่งซื้อ ' + row.order_number + ' ?'
      : 'ยืนยันว่าตรวจสอบหลักฐานแล้วและไม่รับการชำระเงิน รายการนี้จะหมดอายุและคืนโควตาบัตรให้ระบบใช่หรือไม่?';
    if (!window.confirm(confirmMessage)) return;
    setReviewingOrderId(row.id);
    setError('');
    setNotice('');
    try {
      const result = await ticketingApiService.reviewPaymentOrder(accessToken, row.id, action, note);
      setReviewOrders((previous) => previous.filter((item) => item.id !== row.id));
      setReviewNotes((previous) => ({ ...previous, [row.id]: '' }));
      setNotice(action === 'approve'
        ? 'อนุมัติคำสั่งซื้อ ' + row.order_number + ' แล้ว ระบบออกบัตรแล้ว กรุณาเติมข้อมูลรถเก่าต่อในรายการด้านล่าง'
        : 'ปฏิเสธหลักฐานและคืนโควตาให้คำสั่งซื้อ ' + row.order_number + ' แล้ว');
      await Promise.all([loadVehicles(accessToken), loadPaymentReviewOrders(accessToken)]);
      void result;
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'บันทึกผลตรวจสอบการชำระเงินไม่สำเร็จ');
    } finally {
      setReviewingOrderId('');
    }
  };

  return (
    <section className="min-h-screen bg-[#10140F] text-[#FFF9ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#30391E] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#D8A934] uppercase tracking-wider">
              <CarFront className="w-4 h-4" /> VEHICLE & PARKING CONTROL
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-2">ทะเบียนรถและจัดสรรที่จอด</h1>
            <p className="text-xs sm:text-sm text-[#F3E7C8]/70 mt-2 leading-relaxed">
              ค้นหารถจากทะเบียน ชื่อ หน่วยงาน หรือสังกัด แล้วกำหนดโซนและช่องจอดก่อนพิมพ์ป้ายรถ
            </p>
          </div>
          {accessToken && (
            <button type="button" onClick={() => void handleLogout()} className="self-start sm:self-auto rounded-lg border border-red-900/70 px-3 py-2 text-xs font-semibold text-red-300 flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          )}
        </header>

        {!accessToken ? (
          <form onSubmit={handleLogin} className="max-w-lg mx-auto rounded-2xl border border-[#30391E] bg-[#182719] p-5 sm:p-7 space-y-4">
            <h2 className="text-lg font-bold text-[#D8A934]">เข้าสู่ระบบเจ้าหน้าที่</h2>
            <div>
              <label htmlFor="parking-admin-email" className="block text-xs text-[#F3E7C8] mb-1">อีเมลผู้ดูแล</label>
              <input id="parking-admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm outline-none focus:border-[#D8A934]" />
            </div>
            <div>
              <label htmlFor="parking-admin-password" className="block text-xs text-[#F3E7C8] mb-1">รหัสผ่าน</label>
              <input id="parking-admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm outline-none focus:border-[#D8A934]" />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full rounded-xl bg-[#D8A934] px-4 py-3 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-50">
              <LogIn className="w-4 h-4" /> {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบเพื่อจัดการที่จอดรถ'}
            </button>
          </form>
        ) : (
          <>
            <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#65705A]">เจ้าหน้าที่</p>
                <p className="text-sm font-semibold text-[#F3E7C8]">{getCachedAdminEmail() || email}</p>
              </div>
              <button type="button" onClick={() => void loadVehicles(accessToken)} disabled={loading} className="self-start sm:self-auto rounded-lg border border-[#D8A934]/40 px-3 py-2 text-xs font-semibold text-[#D8A934] flex items-center gap-2 disabled:opacity-50">
                <RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> รีเฟรชทะเบียนรถ
              </button>
            </div>

            <section className="rounded-2xl border border-amber-800/50 bg-[#182719] p-4 sm:p-5 space-y-4" aria-label="รายการชำระเงินเก่ารอตรวจสอบ">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2"><FileCheck2 className="w-5 h-5" /> รายการเก่ารอตรวจสอบการชำระเงิน</h2>
                  <p className="text-xs text-[#B4B39C] mt-1 leading-relaxed">ตรวจหลักฐานก่อนเลือกอนุมัติหรือปฏิเสธ ระบบจะไม่คืนโควตาให้อัตโนมัติหากมีหลักฐานที่ส่งมา</p>
                </div>
                <button type="button" onClick={() => void loadPaymentReviewOrders(accessToken)} disabled={reviewLoading} className="self-start rounded-lg border border-amber-700/50 px-3 py-2 text-xs font-semibold text-amber-300 flex items-center gap-2 disabled:opacity-50">
                  <RefreshCw className={reviewLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> รีเฟรชรายการ
                </button>
              </div>
              {reviewLoading && reviewOrders.length === 0 ? (
                <p className="text-xs text-[#B4B39C] py-3">กำลังโหลดรายการรอตรวจสอบ...</p>
              ) : reviewOrders.length === 0 ? (
                <p className="rounded-xl border border-[#30391E] bg-[#10140F]/50 p-4 text-sm text-[#8D987E]">ไม่มีรายการชำระเงินที่รอตรวจสอบในขณะนี้</p>
              ) : (
                <div className="space-y-3">
                  {reviewOrders.map((order) => (
                    <article key={order.id} className="rounded-xl border border-amber-900/40 bg-[#10140F]/75 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-[#FFF9ED]">{order.order_number}</p>
                          <p className="text-sm font-semibold mt-1">{order.customer_name}</p>
                          <p className="text-xs text-[#8D987E] break-all">{order.customer_email}</p>
                          <p className="text-xs text-[#B4B39C] mt-2">ส่งหลักฐาน: {dateText(order.payment_submitted_at || order.created_at)}</p>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <p className="text-xl font-black text-[#D8A934]">฿{order.amount_total_thb.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</p>
                          <p className="text-[11px] text-[#8D987E] mt-1">{order.items.map((item) => item.ticket_type + ' × ' + item.quantity).join(' · ') || 'ไม่พบรายละเอียดบัตร'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {order.has_proof && order.proof_url ? (
                          <a href={order.proof_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#D8A934]/50 px-3 py-2 text-xs font-semibold text-[#D8A934] inline-flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" /> เปิดหลักฐานการชำระเงิน
                          </a>
                        ) : (
                          <span className="text-xs text-amber-300">{order.has_proof ? 'เปิดหลักฐานไม่ได้ — ห้ามตัดสินรายการจนกว่าจะตรวจสอบได้' : 'ไม่มีไฟล์หลักฐานแนบอยู่กับรายการนี้'}</span>
                        )}
                      </div>
                      <div>
                        <label htmlFor={'legacy-review-note-' + order.id} className="block text-xs text-[#B4B39C] mb-1">หมายเหตุการตรวจสอบ (จำเป็นเมื่อปฏิเสธ)</label>
                        <textarea id={'legacy-review-note-' + order.id} value={reviewNotes[order.id] || ''} onChange={(event) => setReviewNotes((previous) => ({ ...previous, [order.id]: event.target.value }))} rows={2} maxLength={500} placeholder="เช่น ตรวจไม่พบยอดเงินเข้าบัญชี หรือยืนยันยอดชำระแล้ว" className="w-full rounded-lg border border-[#30391E] bg-[#182719] px-3 py-2.5 text-sm text-[#FFF9ED] outline-none focus:border-[#D8A934] placeholder:text-[#65705A]" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" onClick={() => void handleReviewPayment(order, 'approve')} disabled={reviewingOrderId !== '' || (order.has_proof && !order.proof_url)} className="rounded-lg bg-[#D8A934] px-3 py-2.5 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-40">
                          <CheckCircle2 className="w-4 h-4" /> {reviewingOrderId === order.id ? 'กำลังบันทึก...' : 'ยืนยันชำระแล้วและออกบัตร'}
                        </button>
                        <button type="button" onClick={() => void handleReviewPayment(order, 'reject')} disabled={reviewingOrderId !== '' || (order.has_proof && !order.proof_url)} className="rounded-lg border border-red-800/60 bg-red-950/20 px-3 py-2.5 text-sm font-semibold text-red-300 flex items-center justify-center gap-2 disabled:opacity-40">
                          <AlertTriangle className="w-4 h-4" /> ปฏิเสธหลักฐานและคืนโควตา
                        </button>
                      </div>
                      <p className="text-[10px] text-[#65705A]">การปฏิเสธจะเก็บประวัติการตรวจสอบไว้ และคืนโควตาที่ถูกจองให้ระบบโดยไม่ลบคำสั่งซื้อ</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3" aria-label="สรุปจำนวนผู้ลงทะเบียน">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#FFF9ED]">สรุปจำนวนผู้เข้าร่วม</h2>
                <p className="text-[11px] sm:text-xs text-[#65705A] mt-1">บัตรปกตินับ 1 คนต่อบัตร ส่วน VIP คิดตามสิทธิ์ 6 ที่นั่งต่อโต๊ะ รายชื่อที่ระบุจะแสดงในการ์ดแต่ละโต๊ะ</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4">
                  <p className="text-xs text-[#65705A] flex items-center gap-2"><Ticket className="w-4 h-4" /> บัตรปกติ · คน</p>
                  <p className="text-3xl font-black text-[#FFF9ED] mt-2">{stats.normal_people}</p>
                </div>
                <div className="rounded-xl border border-[#D8A934]/40 bg-[#182719] p-4">
                  <p className="text-xs text-[#D8A934] flex items-center gap-2"><Crown className="w-4 h-4" /> VIP · สิทธิ์ที่นั่ง</p>
                  <p className="text-3xl font-black text-[#D8A934] mt-2">{stats.vip_people} <span className="text-sm font-semibold">คน</span></p>
                </div>
                <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4">
                  <p className="text-xs text-[#65705A] flex items-center gap-2"><Users className="w-4 h-4" /> โต๊ะ VIP</p>
                  <p className="text-3xl font-black text-[#FFF9ED] mt-2">{stats.vip_tables} <span className="text-sm font-semibold">โต๊ะ</span></p>
                </div>
                <div className="rounded-xl border border-emerald-800/60 bg-[#182719] p-4">
                  <p className="text-xs text-emerald-300 flex items-center gap-2"><Users className="w-4 h-4" /> รวมสิทธิ์เข้าร่วม</p>
                  <p className="text-3xl font-black text-emerald-300 mt-2">{stats.total_people} <span className="text-sm font-semibold">คน</span></p>
                </div>
              </div>
            </section>

            <section className="space-y-3" aria-label="สถานะรถและที่จอด">
              <h2 className="text-base sm:text-lg font-bold text-[#FFF9ED]">สถานะรถและที่จอด</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4">
                  <p className="text-xs text-[#65705A] flex items-center gap-2"><CarFront className="w-4 h-4" /> รถที่ลงทะเบียนแล้ว</p>
                  <p className="text-3xl font-black text-[#FFF9ED] mt-2">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-[#D8A934]/30 bg-[#182719] p-4">
                  <p className="text-xs text-[#D8A934] flex items-center gap-2"><MapPin className="w-4 h-4" /> จัดสรรโซนแล้ว</p>
                  <p className="text-3xl font-black text-[#D8A934] mt-2">{stats.assigned}</p>
                </div>
                <div className="rounded-xl border border-amber-800/40 bg-[#182719] p-4">
                  <p className="text-xs text-amber-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> บัตรเก่ารอเติมข้อมูลรถ</p>
                  <p className="text-3xl font-black text-amber-300 mt-2">{stats.legacy_missing_vehicle}</p>
                </div>
                <div className="rounded-xl border border-emerald-800/60 bg-[#182719] p-4">
                  <p className="text-xs text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> ตรวจรถขาเข้าแล้ว</p>
                  <p className="text-3xl font-black text-emerald-300 mt-2">{stats.arrived}</p>
                </div>
              </div>            </section>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-base sm:text-lg font-bold text-[#FFF9ED]">รายชื่อผู้ลงทะเบียนและผู้ถือบัตร</h2>
              <span className="text-[11px] text-[#65705A]">แสดงรายการรถ/สิทธิ์ลงทะเบียนล่าสุดสูงสุด 500 รายการ</span>
            </div>

            <div className="rounded-xl border border-[#30391E] bg-[#182719] p-3 sm:p-4 flex items-center gap-3">
              <Search className="w-5 h-5 text-[#65705A] shrink-0" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ค้นหาทะเบียนรถ ชื่อ หน่วยงาน สังกัด หรือรหัสป้ายรถ" className="w-full min-w-0 bg-transparent text-sm text-[#FFF9ED] outline-none placeholder:text-[#65705A]" />
              <span className="text-xs text-[#65705A] whitespace-nowrap">{filteredVehicles.length} รายการ</span>
            </div>

            {loading && vehicles.length === 0 && (
              <div className="rounded-2xl border border-[#30391E] bg-[#182719] p-8 text-center text-sm text-[#F3E7C8]/70">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D8A934]" /> กำลังโหลดทะเบียนรถ...
              </div>
            )}

            <div className="space-y-4">
              {filteredVehicles.map((row) => {
                const draft = drafts[row.registration_code] || { zone: row.parking_zone || '', slot: row.parking_slot || '' };
                const arrived = Boolean(row.arrival_verified_at);
                return (
                  <article key={row.registration_code} className="rounded-2xl border border-[#30391E] bg-[#182719] p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xl sm:text-3xl font-black tracking-wide text-[#D8A934]">{row.vehicle_plate || (row.has_vehicle_pass ? 'ไม่ระบุทะเบียน' : 'ข้อมูลรถยังไม่ครบ')}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${!row.has_vehicle_pass ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50' : arrived ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-700/50' : 'bg-[#10140F] text-[#F3E7C8]/70 border border-[#30391E]'}`}>
                            {!row.has_vehicle_pass ? 'บัตรเก่า · รอเติมข้อมูลรถ' : arrived ? 'ตรวจรถขาเข้าแล้ว' : 'ยังไม่เข้าพื้นที่'}
                          </span>
                          {row.ticket_type === 'tt-vip' ? (
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#D8A934]/15 text-[#D8A934] border border-[#D8A934]/40">VIP · 1 โต๊ะ / 6 ที่นั่ง</span>
                          ) : (
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#FFF9ED]/5 text-[#F3E7C8] border border-[#30391E]">บัตรปกติ · 1 คน</span>
                          )}
                        </div>
                        <h2 className="text-lg font-bold mt-2">{row.owner_rank ? row.owner_rank + ' ' : ''}{row.owner_name}</h2>
                        {row.ticket_type === 'tt-vip' && (
                          <div className="mt-4 rounded-xl border border-[#D8A934]/25 bg-[#10140F]/60 p-3 sm:p-4">
                            <p className="text-xs font-bold text-[#D8A934] mb-2">รายชื่อผู้ร่วมโต๊ะ VIP ({row.attendee_names.length}/6 คนที่ระบุชื่อ)</p>
                            {row.attendee_names.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {row.attendee_names.map((name, index) => (
                                  <p key={row.registration_code + '-guest-' + index} className="text-xs text-[#F3E7C8] flex gap-2">
                                    <span className="text-[#65705A] font-mono">{index + 1}.</span><span>{name}</span>
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#65705A]">ยังไม่มีการระบุชื่อผู้ร่วมโต๊ะเพิ่มเติม</p>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs text-[#F3E7C8]/85">
                          <p><span className="text-[#65705A]">หน่วยงาน: </span>{row.organization}</p>
                          <p><span className="text-[#65705A]">สังกัด: </span>{row.affiliation}</p>
                          <p><span className="text-[#65705A]">โทรศัพท์: </span>{row.owner_phone}</p>
                          <p className="break-all"><span className="text-[#65705A]">อีเมล: </span>{row.owner_email}</p>
                          <p><span className="text-[#65705A]">เลขลงทะเบียน: </span><span className="font-mono">{row.order_number}</span></p>
                          <p><span className="text-[#65705A]">{row.has_vehicle_pass ? 'รหัสป้ายรถ: ' : 'รหัสบัตรเดิม: '}</span><span className="font-mono">{row.has_vehicle_pass ? row.registration_code : row.ticket_code}</span></p>
                        </div>
                      </div>
                      {!row.has_vehicle_pass ? (
                        <div className="lg:w-80 shrink-0 rounded-xl border border-amber-800/50 bg-[#10140F] p-4 space-y-3">
                          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2"><CarFront className="w-4 h-4" /> เติมข้อมูลรถให้บัตรเก่า</h3>
                          <p className="text-[10px] text-[#8D987E]">บัตรนี้ออกก่อนระบบป้ายรถปัจจุบัน กรุณาตรวจข้อมูลและกรอกส่วนที่ขาด ระบบจะออก QR ป้ายรถใหม่โดยไม่ออกบัตรเข้างานซ้ำ</p>
                          {([
                            ['rank', 'ยศ / ตำแหน่ง (ถ้ามี)', 'เช่น ส.ต.ต.'],
                            ['name', 'ชื่อ-นามสกุล', 'ชื่อผู้ถือบัตร'],
                            ['phone', 'เบอร์โทรศัพท์', 'เบอร์ที่ติดต่อได้'],
                            ['email', 'อีเมล', 'name@example.com'],
                            ['organization', 'หน่วยงาน', 'หน่วยงาน'],
                            ['affiliation', 'สังกัด', 'สังกัด'],
                            ['vehiclePlate', 'ทะเบียนรถ', 'ทะเบียนรถ'],
                          ] as Array<[keyof LegacyVehicleDraft, string, string]>).map(([key, label, placeholder]) => (
                            <div key={key}>
                              <label className="block text-[11px] text-[#F3E7C8] mb-1" htmlFor={'legacy-' + key + '-' + row.ticket_code}>{label}</label>
                              <input
                                id={'legacy-' + key + '-' + row.ticket_code}
                                type={key === 'email' ? 'email' : 'text'}
                                value={legacyDraft[key]}
                                onChange={(event) => setLegacyDrafts((previous) => ({ ...previous, [row.registration_code]: { ...legacyDraft, [key]: event.target.value } }))}
                                placeholder={placeholder}
                                required={key !== 'rank'}
                                className="w-full rounded-lg border border-[#30391E] bg-[#182719] px-3 py-2.5 text-sm outline-none focus:border-[#D8A934]"
                              />
                            </div>
                          ))}
                          <button type="button" onClick={() => void handleRegisterLegacyVehicle(row)} disabled={savingCode === row.registration_code} className="w-full rounded-lg bg-[#D8A934] px-3 py-3 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-50">
                            <Save className="w-4 h-4" /> {savingCode === row.registration_code ? 'กำลังบันทึก...' : 'บันทึกและออก QR ป้ายรถ'}
                          </button>
                        </div>
                      ) : (
                        <div className="lg:w-80 shrink-0 rounded-xl border border-[#30391E] bg-[#10140F] p-4 space-y-3">
                          <h3 className="text-sm font-bold text-[#D8A934] flex items-center gap-2"><MapPin className="w-4 h-4" /> จัดสรรที่จอดรถ</h3>
                          <div>
                            <label className="block text-[11px] text-[#F3E7C8] mb-1" htmlFor={'parking-zone-' + row.registration_code}>โซนจอดรถ</label>
                            <input id={'parking-zone-' + row.registration_code} value={draft.zone} onChange={(event) => setDrafts((prev) => ({ ...prev, [row.registration_code]: { ...draft, zone: event.target.value } }))} placeholder="เช่น A / VIP / หน่วยงาน" className="w-full rounded-lg border border-[#30391E] bg-[#182719] px-3 py-2.5 text-sm outline-none focus:border-[#D8A934]" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#F3E7C8] mb-1" htmlFor={'parking-slot-' + row.registration_code}>ช่องจอดรถ (ถ้ามี)</label>
                            <input id={'parking-slot-' + row.registration_code} value={draft.slot} onChange={(event) => setDrafts((prev) => ({ ...prev, [row.registration_code]: { ...draft, slot: event.target.value } }))} placeholder="เช่น A-012" className="w-full rounded-lg border border-[#30391E] bg-[#182719] px-3 py-2.5 text-sm outline-none focus:border-[#D8A934]" />
                          </div>
                          <button type="button" onClick={() => void handleSaveAssignment(row)} disabled={savingCode === row.registration_code} className="w-full rounded-lg bg-[#D8A934] px-3 py-3 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-50">
                            <Save className="w-4 h-4" /> {savingCode === row.registration_code ? 'กำลังบันทึก...' : 'บันทึกการจัดสรร'}
                          </button>
                          <p className="text-[10px] text-[#65705A]">ช่องจอดหนึ่งช่องถูกจัดสรรให้รถที่ลงทะเบียนได้เพียงคันเดียว</p>
                        </div>
                      )}                      </div>
                    </div>
                  </article>
                );
              })}
              {!loading && filteredVehicles.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#30391E] p-10 text-center text-sm text-[#65705A]">
                  <Users className="w-7 h-7 mx-auto mb-2" />
                  {vehicles.length === 0 ? 'ยังไม่มีรายการรถลงทะเบียน' : 'ไม่พบรถที่ตรงกับคำค้นหา'}
                </div>
              )}
            </div>
          </>
        )}

        {notice && <p role="status" className="rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-3 text-xs text-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{notice}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-700/50 bg-red-950/20 p-3 text-xs text-red-200 flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</p>}
        <p className="text-[11px] text-[#65705A] flex items-start gap-2 leading-relaxed">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          ข้อมูลทะเบียนรถและข้อมูลส่วนบุคคลจะแสดงเฉพาะเจ้าหน้าที่ที่ผ่านการยืนยันสิทธิ์ในระบบเท่านั้น
        </p>
      </div>
    </section>
  );
};
