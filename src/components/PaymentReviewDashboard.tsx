import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, FileImage, LogIn, LogOut, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { getAdminAccessToken, getCachedAdminEmail, signInAdmin, signOutAdmin } from '../services/supabaseAdminAuth';
import { ticketingApiService } from '../services/ticketingApiService';

type PaymentOrder = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  amount_total_thb: number;
  payment_reference?: string | null;
  payment_submitted_at?: string | null;
  created_at: string;
  payment_proof_url?: string | null;
  order_items?: Array<{
    quantity: number;
    unit_price_thb: number;
    line_total_thb: number;
    ticket_types?: { code?: string; name?: string } | null;
    attendee_data?: unknown;
  }>;
};

const money = (value: unknown) =>
  Number(value || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const PaymentReviewDashboard: React.FC = () => {
  const [email, setEmail] = useState(getCachedAdminEmail());
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQueue = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const rows = await ticketingApiService.getPaymentReviewQueue(token);
      setOrders(rows as unknown as PaymentOrder[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'โหลดรายการตรวจสอบไม่สำเร็จ';
      setError(message);
      if (/เข้าสู่ระบบ|เซสชัน|สิทธิ์ผู้ดูแล/i.test(message)) {
        await signOutAdmin();
        setAccessToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAdminAccessToken().then((token) => {
      if (!active || !token) return;
      setAccessToken(token);
      void loadQueue(token);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loadQueue]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const session = await signInAdmin(email, password);
      setPassword('');
      setAccessToken(session.access_token);
      await loadQueue(session.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setAccessToken(null);
    setOrders([]);
    setNotice('');
    setError('');
  };

  const handleReview = async (order: PaymentOrder, action: 'approve' | 'reject') => {
    if (!accessToken) return;
    const isApprove = action === 'approve';
    const promptText = isApprove
      ? 'ยืนยันว่าตรวจสอบยอดเงินจริงเข้าบัญชีแล้วครบ ' + money(order.amount_total_thb) + ' สำหรับ ' + order.order_number + ' ใช่หรือไม่? ระบบจะออกบัตรหลังอนุมัติ'
      : 'ปฏิเสธหลักฐานของ ' + order.order_number + ' ใช่หรือไม่? ลูกค้าจะต้องส่งหลักฐานใหม่';
    if (!window.confirm(promptText)) return;

    let note = '';
    if (!isApprove) note = window.prompt('ระบุเหตุผลที่ปฏิเสธ (แนะนำให้กรอก)', '') || '';

    setSubmitting(order.id);
    setError('');
    setNotice('');
    try {
      const result = await ticketingApiService.reviewPaymentOrder(accessToken, order.id, action, note);
      setNotice(isApprove
        ? 'อนุมัติ ' + order.order_number + ' และออกบัตร ' + String(result.tickets_issued || 0) + ' รายการเรียบร้อย'
        : 'ปฏิเสธหลักฐาน ' + order.order_number + ' แล้ว');
      await loadQueue(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ตรวจสอบรายการไม่สำเร็จ');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[#30391E] bg-[#141d15] p-4 sm:p-6 space-y-5">
      {!accessToken ? (
        <div className="max-w-lg mx-auto py-5">
          <div className="w-14 h-14 rounded-2xl bg-[#D8A934]/10 border border-[#D8A934]/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-[#D8A934]" />
          </div>
          <h2 className="text-xl font-bold text-[#FFF9ED] text-center">ตรวจสอบการชำระเงิน</h2>
          <p className="text-sm text-[#F3E7C8]/70 text-center mt-2 mb-6">
            เข้าสู่ระบบด้วยบัญชีผู้ดูแล Supabase ที่ได้รับสิทธิ์เท่านั้น
          </p>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="payment-admin-email" className="block text-xs font-semibold text-[#F3E7C8] mb-1">อีเมลผู้ดูแล</label>
              <input
                id="payment-admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm text-[#FFF9ED] outline-none focus:border-[#D8A934]"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label htmlFor="payment-admin-password" className="block text-xs font-semibold text-[#F3E7C8] mb-1">รหัสผ่าน</label>
              <input
                id="payment-admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm text-[#FFF9ED] outline-none focus:border-[#D8A934]"
                placeholder="รหัสผ่าน Supabase Auth"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#D8A934] px-4 py-3 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบผู้ดูแล'}
            </button>
          </form>
          <p className="mt-4 text-[11px] text-[#65705A] text-center leading-relaxed">
            หากล็อกอินได้แต่เข้าไม่ได้ ให้ผู้ดูแลหลักเพิ่ม User ID นี้ลงรายการผู้มีสิทธิ์ในฐานข้อมูลก่อน
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[#D8A934] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Secure Payment Review
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#FFF9ED] mt-1">รายการรอตรวจสอบสลิป</h2>
              <p className="text-xs text-[#F3E7C8]/65 mt-1">ล็อกอินแล้ว: {getCachedAdminEmail() || email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadQueue(accessToken)}
                disabled={loading}
                className="rounded-xl border border-[#30391E] px-3 py-2 text-xs font-semibold text-[#F3E7C8] flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> รีเฟรช
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-xl border border-red-900/70 px-3 py-2 text-xs font-semibold text-red-300 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#30391E] bg-[#10140F] p-4">
              <p className="text-xs text-[#65705A]">คำสั่งซื้อรอตรวจ</p>
              <p className="text-2xl font-bold text-[#D8A934] mt-1">{orders.length}</p>
            </div>
            <div className="rounded-xl border border-[#30391E] bg-[#10140F] p-4">
              <p className="text-xs text-[#65705A]">ยอดเงินรอตรวจสอบ</p>
              <p className="text-2xl font-bold text-[#FFF9ED] mt-1">{money(orders.reduce((sum, order) => sum + Number(order.amount_total_thb || 0), 0))}</p>
            </div>
            <div className="rounded-xl border border-[#30391E] bg-[#10140F] p-4">
              <p className="text-xs text-[#65705A]">เงื่อนไขการอนุมัติ</p>
              <p className="text-sm font-bold text-emerald-300 mt-2">ต้องตรวจยอดเงินจริง</p>
            </div>
          </div>
        </>
      )}

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-700/60 bg-emerald-950/20 p-3 text-sm text-emerald-200 flex gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-700/60 bg-red-950/20 p-3 text-sm text-red-200 flex gap-2">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {accessToken && !loading && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30391E] p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#FFF9ED]">ไม่มีคำสั่งซื้อที่รอตรวจสอบ</p>
          <p className="text-xs text-[#65705A] mt-1">คำสั่งซื้อที่ลูกค้าส่งสลิปจะปรากฏในหน้านี้</p>
        </div>
      )}

      {accessToken && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-[#30391E] bg-[#10140F] overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#D8A934]">{order.order_number}</span>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-[10px] font-bold text-amber-200">รอตรวจสลิป</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs">
                    <p><span className="text-[#65705A]">ผู้ซื้อ: </span><span className="text-[#FFF9ED]">{order.customer_name}</span></p>
                    <p><span className="text-[#65705A]">ยอดชำระ: </span><span className="text-[#D8A934] font-bold">{money(order.amount_total_thb)}</span></p>
                    <p><span className="text-[#65705A]">อีเมล: </span><span className="text-[#FFF9ED] break-all">{order.customer_email}</span></p>
                    <p><span className="text-[#65705A]">โทรศัพท์: </span><span className="text-[#FFF9ED]">{order.customer_phone || '—'}</span></p>
                    <p><span className="text-[#65705A]">เลขอ้างอิงโอน: </span><span className="text-[#FFF9ED] font-mono">{order.payment_reference || '—'}</span></p>
                    <p><span className="text-[#65705A]">ส่งหลักฐานเมื่อ: </span><span className="text-[#FFF9ED]">{dateTime(order.payment_submitted_at)}</span></p>
                  </div>
                  <div className="pt-3 border-t border-[#30391E] space-y-1">
                    <p className="text-[11px] font-bold text-[#65705A] uppercase tracking-wide">รายการบัตร</p>
                    {(order.order_items || []).map((item, index) => (
                      <p key={index} className="text-xs text-[#F3E7C8]">
                        {(item.ticket_types && (item.ticket_types.name || item.ticket_types.code)) || 'บัตร'} × {item.quantity} · {money(item.line_total_thb)}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-48 shrink-0 space-y-2">
                  {order.payment_proof_url ? (
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full rounded-xl border border-[#30391E] bg-[#182719] px-3 py-3 text-xs font-bold text-[#D8A934] flex items-center justify-center gap-2"
                    >
                      <FileImage className="w-4 h-4" /> เปิดสลิป <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <div className="rounded-xl border border-[#30391E] px-3 py-3 text-xs text-[#65705A] flex items-center justify-center gap-2">
                      <FileImage className="w-4 h-4" /> ไม่พบลิงก์สลิป
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={submitting === order.id || !order.payment_proof_url}
                    onClick={() => void handleReview(order, 'approve')}
                    className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-3 text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting === order.id ? 'กำลังดำเนินการ...' : 'อนุมัติและออกบัตร'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting === order.id}
                    onClick={() => void handleReview(order, 'reject')}
                    className="w-full rounded-xl border border-red-900/70 hover:bg-red-950/30 px-3 py-3 text-xs font-bold text-red-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> ปฏิเสธหลักฐาน
                  </button>
                  <p className="text-[10px] text-[#65705A] text-center flex justify-center gap-1">
                    <Clock className="w-3 h-3" /> ลิงก์สลิปใช้ได้ 5 นาที
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
