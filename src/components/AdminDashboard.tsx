import React, { useState, useEffect } from 'react';
import { Registration } from '../types';
import { storageService } from '../services/storageService';
import {
  Users,
  UserCheck,
  Award,
  Clock,
  Search,
  Download,
  RefreshCw,
  Eye,
  X,
  Phone,
  Mail,
  Building,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenPass?: (registration: Registration) => void;
  onOpenScanner?: (registrationId?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenPass,
  onOpenScanner,
}) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REGISTERED' | 'CHECKED_IN' | 'WRISTBAND_ISSUED'>('ALL');
  const [selectedAttendee, setSelectedAttendee] = useState<Registration | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = () => {
    const list = storageService.getRegistrations();
    setRegistrations(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // KPIs
  const totalRegistered = registrations.reduce((acc, r) => acc + (r.participantsCount || 1), 0);
  const totalPassCount = registrations.length;
  const checkedInCount = registrations.filter((r) => r.checkInStatus === 'CHECKED_IN').length;
  const wristbandsIssuedCount = registrations.filter((r) => r.wristbandStatus === 'WRISTBAND_ISSUED').length;
  const remainingCount = totalPassCount - checkedInCount;

  // Filtered List
  const filteredList = registrations.filter((reg) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      reg.id.toLowerCase().includes(query) ||
      reg.fullName.toLowerCase().includes(query) ||
      reg.phoneNumber.toLowerCase().includes(query) ||
      reg.email.toLowerCase().includes(query) ||
      reg.organization.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (statusFilter === 'REGISTERED') return reg.checkInStatus === 'REGISTERED';
    if (statusFilter === 'CHECKED_IN') return reg.checkInStatus === 'CHECKED_IN';
    if (statusFilter === 'WRISTBAND_ISSUED') return reg.wristbandStatus === 'WRISTBAND_ISSUED';
    return true;
  });

  const handleQuickCheckIn = (id: string) => {
    const res = storageService.checkInParticipant(id, 'ระบบแอดมิน');
    loadData();
    if (selectedAttendee && selectedAttendee.id === id && res.registration) {
      setSelectedAttendee(res.registration);
    }
    showNotification(res.message);
  };

  const handleQuickIssueWristband = (id: string) => {
    const res = storageService.issueWristband(id, 'ระบบแอดมิน');
    loadData();
    if (selectedAttendee && selectedAttendee.id === id && res.registration) {
      setSelectedAttendee(res.registration);
    }
    showNotification(res.message);
  };

  const handleResetDemoData = () => {
    if (window.confirm('ต้องการรีเซ็ตฐานข้อมูลเป็นตัวอย่างเริ่มต้นหรือไม่?')) {
      storageService.resetToDemo();
      loadData();
      showNotification('รีเซ็ตข้อมูลตัวอย่างเรียบร้อยแล้ว');
    }
  };

  return (
    <section id="admin" className="py-20 sm:py-28 bg-[#10140F] relative min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 bg-[#30391E] border border-[#D8A934] text-[#FFF9ED] px-4 py-2.5 rounded shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-[#D8A934]" />
            {notification}
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#30391E]">
          <div>
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#D8A934]">
              ระบบจัดการหน้างานและสถิติ
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#FFF9ED]">
              ระบบจัดการหน้างาน (แดชบอร์ดผู้ดูแลระบบ)
            </h2>
            <p className="text-xs sm:text-sm text-[#F3E7C8]/80 mt-1">
              ระบบตรวจสอบรายชื่อผู้สมัคร เช็กอินผู้เข้าร่วมงาน และแจกริสแบนด์แบบเรียลไทม์ ROYAL HILLS FEST 2026
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => storageService.exportToCsv()}
              className="cursor-pointer inline-flex items-center gap-2 bg-[#182719] hover:bg-[#30391E] text-[#FFF9ED] text-xs font-semibold px-4 py-2.5 rounded border border-[#30391E] hover:border-[#65705A] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#D8A934]" />
              ส่งออกข้อมูล (CSV)
            </button>
            <button
              onClick={handleResetDemoData}
              title="รีเซ็ตข้อมูลตัวอย่าง"
              className="cursor-pointer p-2.5 rounded bg-[#182719] border border-[#30391E] text-[#F3E7C8]/70 hover:text-[#FFF9ED] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Scorecard Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <div className="p-5 rounded-xl border border-[#30391E] bg-[#182719]/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[#65705A] mb-2">
              <span className="text-xs font-semibold">ผู้สมัครทั้งหมด</span>
              <Users className="w-4 h-4 text-[#D8A934]" />
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#FFF9ED] tabular-nums">
              {totalPassCount}
            </div>
            <div className="text-[11px] text-[#F3E7C8]/70 mt-1 font-mono">
              รวม {totalRegistered} ท่าน
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#30391E] bg-[#182719]/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[#65705A] mb-2">
              <span className="text-xs font-semibold">เช็กอินแล้ว</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-emerald-400 tabular-nums">
              {checkedInCount}
            </div>
            <div className="text-[11px] text-[#F3E7C8]/70 mt-1 font-mono">
              {totalPassCount ? Math.round((checkedInCount / totalPassCount) * 100) : 0}% ของผู้ลงทะเบียน
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#30391E] bg-[#182719]/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[#65705A] mb-2">
              <span className="text-xs font-semibold">แจกริสแบนด์แล้ว</span>
              <Award className="w-4 h-4 text-[#D8A934]" />
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#D8A934] tabular-nums">
              {wristbandsIssuedCount}
            </div>
            <div className="text-[11px] text-[#F3E7C8]/70 mt-1 font-mono">
              รอรับริสแบนด์ {checkedInCount - wristbandsIssuedCount} ราย
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#30391E] bg-[#182719]/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[#65705A] mb-2">
              <span className="text-xs font-semibold">คงเหลือ</span>
              <Clock className="w-4 h-4 text-[#C96F3D]" />
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-bold text-[#C96F3D] tabular-nums">
              {remainingCount}
            </div>
            <div className="text-[11px] text-[#F3E7C8]/70 mt-1 font-mono">
              ยังไม่เดินทางมาถึง
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="bg-[#182719] border border-[#30391E] rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#65705A] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือรหัสการสมัคร..."
              className="w-full bg-[#10140F] border border-[#30391E] rounded px-3 py-2 pl-9 text-xs text-[#FFF9ED] placeholder-[#65705A] focus:outline-none focus:border-[#D8A934]"
            />
          </div>

          {/* Filter segment tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {(['ALL', 'REGISTERED', 'CHECKED_IN', 'WRISTBAND_ISSUED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`cursor-pointer px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-[#D8A934] text-[#10140F]'
                    : 'bg-[#10140F] text-[#F3E7C8]/70 hover:text-[#FFF9ED] border border-[#30391E]'
                }`}
              >
                {tab === 'ALL'
                  ? 'ทั้งหมด'
                  : tab === 'REGISTERED'
                  ? 'ลงทะเบียนแล้ว'
                  : tab === 'CHECKED_IN'
                  ? 'เช็กอินแล้ว'
                  : 'รับริสแบนด์แล้ว'}
              </button>
            ))}
          </div>
        </div>

        {/* Attendee Registry Table */}
        <div className="bg-[#182719] border border-[#30391E] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#10140F] border-b border-[#30391E] text-[#65705A] font-semibold">
                <tr>
                  <th className="py-3.5 px-4">รหัสการสมัคร</th>
                  <th className="py-3.5 px-4">ชื่อผู้เข้าร่วม</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">เบอร์โทรศัพท์ / สโมสร</th>
                  <th className="py-3.5 px-4">สถานะเช็กอิน</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">สถานะริสแบนด์</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30391E]/60">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#65705A]">
                      ไม่พบข้อมูลผู้เข้าร่วมงานที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredList.map((attendee) => (
                    <tr
                      key={attendee.id}
                      className="hover:bg-[#141d15] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#D8A934] whitespace-nowrap">
                        {attendee.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#FFF9ED]">{attendee.fullName}</div>
                        <div className="text-[11px] text-[#65705A]">
                          {attendee.participantsCount} ท่าน
                        </div>
                      </td>

                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="text-[#F3E7C8]">{attendee.phoneNumber}</div>
                        <div className="text-[11px] text-[#65705A] truncate max-w-[200px]">
                          {attendee.organization}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {attendee.checkInStatus === 'CHECKED_IN' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            เช็กอินแล้ว
                            {attendee.checkInTimestamp && (
                              <span className="text-[10px] text-[#65705A] font-mono ml-1">
                                {new Date(attendee.checkInTimestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[#F3E7C8]/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#65705A]" />
                            ยังไม่ได้เช็กอิน
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap">
                        {attendee.wristbandStatus === 'WRISTBAND_ISSUED' ? (
                          <span className="inline-flex items-center gap-1.5 text-[#D8A934] font-semibold">
                            <Award className="w-3.5 h-3.5" />
                            รับริสแบนด์แล้ว
                          </span>
                        ) : (
                          <span className="text-[#65705A]">ยังไม่ได้รับริสแบนด์</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAttendee(attendee)}
                            title="ดูรายละเอียด"
                            className="p-1.5 rounded bg-[#10140F] hover:bg-[#30391E] text-[#F3E7C8] hover:text-[#FFF9ED] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {attendee.checkInStatus !== 'CHECKED_IN' ? (
                            <button
                              onClick={() => handleQuickCheckIn(attendee.id)}
                              className="cursor-pointer bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors"
                            >
                              เช็กอิน
                            </button>
                          ) : attendee.wristbandStatus !== 'WRISTBAND_ISSUED' ? (
                            <button
                              onClick={() => handleQuickIssueWristband(attendee.id)}
                              className="cursor-pointer bg-[#D8A934]/20 hover:bg-[#D8A934]/40 text-[#D8A934] border border-[#D8A934]/40 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors"
                            >
                              มอบริสแบนด์
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-semibold px-2">
                              ✓ เสร็จสมบูรณ์
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Participant Details Modal */}
        {selectedAttendee && (
          <div className="fixed inset-0 z-50 bg-[#10140F]/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#182719] border border-[#30391E] rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in duration-150">
              <button
                onClick={() => setSelectedAttendee(null)}
                className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full bg-[#10140F] text-[#65705A] hover:text-[#FFF9ED]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6">
                <span className="text-[10px] tracking-wider text-[#D8A934] uppercase font-semibold">
                  ข้อมูลผู้เข้าร่วมงาน
                </span>
                <h3 className="font-display text-2xl font-bold text-[#FFF9ED] mt-0.5">
                  {selectedAttendee.fullName}
                </h3>
                <span className="font-mono text-xs text-[#D8A934] bg-[#10140F] px-2 py-0.5 rounded border border-[#30391E] mt-1 inline-block">
                  {selectedAttendee.id}
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-2 text-[#F3E7C8]">
                  <Phone className="w-4 h-4 text-[#65705A]" />
                  <span>เบอร์โทร: {selectedAttendee.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-[#F3E7C8]">
                  <Mail className="w-4 h-4 text-[#65705A]" />
                  <span>อีเมล: {selectedAttendee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[#F3E7C8]">
                  <Building className="w-4 h-4 text-[#65705A]" />
                  <span>สังกัด/สโมสร: {selectedAttendee.organization}</span>
                </div>
                <div className="flex items-center gap-2 text-[#F3E7C8]">
                  <Calendar className="w-4 h-4 text-[#65705A]" />
                  <span>เวลาลงทะเบียน: {new Date(selectedAttendee.registrationTimestamp).toLocaleString('th-TH')}</span>
                </div>
                <div className="p-3 rounded bg-[#10140F] border border-[#30391E] space-y-1">
                  <p className="text-[11px] text-[#65705A]">ประเภทบัตร</p>
                  <p className="font-semibold text-[#D8A934]">{selectedAttendee.eventCategory}</p>
                  <p className="text-[11px] text-[#F3E7C8]/70">{selectedAttendee.activityPreference}</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="mt-5 pt-4 border-t border-[#30391E] grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-[#10140F] border border-[#30391E]">
                  <span className="text-[10px] text-[#65705A] block">การเช็กอิน</span>
                  <span className="text-xs font-bold text-[#FFF9ED]">
                    {selectedAttendee.checkInStatus === 'CHECKED_IN' ? 'เช็กอินแล้ว' : 'ยังไม่ได้เช็กอิน'}
                  </span>
                  {selectedAttendee.checkInTimestamp && (
                    <span className="text-[10px] text-[#65705A] block mt-0.5">
                      {new Date(selectedAttendee.checkInTimestamp).toLocaleTimeString('th-TH')} น.
                    </span>
                  )}
                </div>

                <div className="p-3 rounded bg-[#10140F] border border-[#30391E]">
                  <span className="text-[10px] text-[#65705A] block">สายรัดข้อมือ</span>
                  <span className="text-xs font-bold text-[#D8A934]">
                    {selectedAttendee.wristbandStatus === 'WRISTBAND_ISSUED' ? 'รับริสแบนด์แล้ว' : 'ยังไม่ได้รับริสแบนด์'}
                  </span>
                  {selectedAttendee.wristbandIssuedTimestamp && (
                    <span className="text-[10px] text-[#65705A] block mt-0.5">
                      {new Date(selectedAttendee.wristbandIssuedTimestamp).toLocaleTimeString('th-TH')} น.
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                {onOpenPass && (
                  <button
                    onClick={() => {
                      onOpenPass(selectedAttendee);
                      setSelectedAttendee(null);
                    }}
                    className="cursor-pointer text-xs font-semibold px-3.5 py-2 rounded bg-[#30391E] hover:bg-[#65705A] text-[#FFF9ED]"
                  >
                    ดูบัตร QR Code
                  </button>
                )}

                {selectedAttendee.checkInStatus !== 'CHECKED_IN' ? (
                  <button
                    onClick={() => handleQuickCheckIn(selectedAttendee.id)}
                    className="cursor-pointer text-xs font-bold px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    เช็กอินทันที
                  </button>
                ) : selectedAttendee.wristbandStatus !== 'WRISTBAND_ISSUED' ? (
                  <button
                    onClick={() => handleQuickIssueWristband(selectedAttendee.id)}
                    className="cursor-pointer text-xs font-bold px-4 py-2 rounded bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F]"
                  >
                    มอบริสแบนด์
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
