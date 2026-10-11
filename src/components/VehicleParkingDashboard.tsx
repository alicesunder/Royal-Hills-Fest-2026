import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CarFront,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
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
};

type DraftAssignment = { zone: string; slot: string };

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
  const [stats, setStats] = useState({ total: 0, assigned: 0, arrived: 0 });
  const [drafts, setDrafts] = useState<Record<string, DraftAssignment>>({});

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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดทะเบียนรถไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAdminAccessToken().then((token) => {
      if (!active || !token) return;
      setAccessToken(token);
      setEmail(getCachedAdminEmail());
      void loadVehicles(token);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loadVehicles]);

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
      await loadVehicles(session.access_token);
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
    setStats({ total: 0, assigned: 0, arrived: 0 });
    setNotice('');
  };

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((row) => [
      row.registration_code, row.ticket_code, row.order_number, row.vehicle_plate,
      row.owner_rank, row.owner_name, row.owner_phone, row.owner_email,
      row.organization, row.affiliation, row.parking_zone, row.parking_slot,
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4">
                <p className="text-xs text-[#65705A] flex items-center gap-2"><CarFront className="w-4 h-4" /> รถที่ลงทะเบียน</p>
                <p className="text-3xl font-black text-[#FFF9ED] mt-2">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4">
                <p className="text-xs text-[#65705A] flex items-center gap-2"><MapPin className="w-4 h-4" /> จัดสรรโซนแล้ว</p>
                <p className="text-3xl font-black text-[#D8A934] mt-2">{stats.assigned}</p>
              </div>
              <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4">
                <p className="text-xs text-[#65705A] flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> ตรวจรถขาเข้าแล้ว</p>
                <p className="text-3xl font-black text-emerald-300 mt-2">{stats.arrived}</p>
              </div>
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
                          <span className="text-2xl sm:text-3xl font-black tracking-wide text-[#D8A934]">{row.vehicle_plate}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${arrived ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-700/50' : 'bg-[#10140F] text-[#F3E7C8]/70 border border-[#30391E]'}`}>
                            {arrived ? 'ตรวจรถขาเข้าแล้ว' : 'ยังไม่เข้าพื้นที่'}
                          </span>
                          {row.ticket_type === 'tt-vip' && <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#D8A934]/15 text-[#D8A934] border border-[#D8A934]/40">VIP</span>}
                        </div>
                        <h2 className="text-lg font-bold mt-2">{row.owner_rank ? row.owner_rank + ' ' : ''}{row.owner_name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs text-[#F3E7C8]/85">
                          <p><span className="text-[#65705A]">หน่วยงาน: </span>{row.organization}</p>
                          <p><span className="text-[#65705A]">สังกัด: </span>{row.affiliation}</p>
                          <p><span className="text-[#65705A]">โทรศัพท์: </span>{row.owner_phone}</p>
                          <p className="break-all"><span className="text-[#65705A]">อีเมล: </span>{row.owner_email}</p>
                          <p><span className="text-[#65705A]">เลขลงทะเบียน: </span><span className="font-mono">{row.order_number}</span></p>
                          <p><span className="text-[#65705A]">รหัสป้ายรถ: </span><span className="font-mono">{row.registration_code}</span></p>
                        </div>
                      </div>
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
