import { Registration } from '../types';

const STORAGE_KEY = 'royal_hills_fest_2026_registrations_v2';
const CURRENT_USER_REG_KEY = 'royal_hills_fest_2026_last_reg_id';

const INITIAL_DEMO_DATA: Registration[] = [
  {
    id: 'RHF26-892401',
    fullName: 'ศิริพร กิตติวัฒน์',
    phoneNumber: '081-445-8892',
    email: 'siriporn.k@bangkokgolf.co.th',
    organization: 'ราชกรีฑาสโมสร (RBSC)',
    participantsCount: 2,
    registrationTimestamp: Date.now() - 86400000 * 3,
    qrCodeData: 'RHF26-892401',
    checkInStatus: 'CHECKED_IN',
    checkInTimestamp: Date.now() - 3600000 * 2,
    checkInStaff: 'เจ้าหน้าที่ สมชาย',
    wristbandStatus: 'WRISTBAND_ISSUED',
    wristbandIssuedTimestamp: Date.now() - 3600000 * 1.8,
    wristbandIssuedBy: 'เจ้าหน้าที่ สมชาย',
    eventCategory: '[TBD] บัตร VIP Mountain Pass',
    activityPreference: '[TBD] แข่งขันกอล์ฟ และ คอนเสิร์ตภาคค่ำ',
    notes: 'สมาชิกกอล์ฟคลับ RBSC',
  },
  {
    id: 'RHF26-551920',
    fullName: 'ธนวัฒน์ บุญประเสริฐ',
    phoneNumber: '089-231-9901',
    email: 'tanawat.bp@siamgreens.com',
    organization: 'สยาม กรีน แฟร์เวย์ คลับ',
    participantsCount: 1,
    registrationTimestamp: Date.now() - 86400000 * 2,
    qrCodeData: 'RHF26-551920',
    checkInStatus: 'CHECKED_IN',
    checkInTimestamp: Date.now() - 3600000 * 0.5,
    checkInStaff: 'เจ้าหน้าที่ ณัฐพล',
    wristbandStatus: 'NOT_ISSUED',
    wristbandIssuedTimestamp: undefined,
    wristbandIssuedBy: undefined,
    eventCategory: '[TBD] บัตรเข้างานมาตรฐาน (Standard Pass)',
    activityPreference: '[TBD] เวทีดนตรี และ แคมป์ไฟเลานจ์',
    notes: '',
  },
  {
    id: 'RHF26-319804',
    fullName: 'ณัฐชา แวนซ์',
    phoneNumber: '092-881-4410',
    email: 'natasha.vance@mountainwanderers.org',
    organization: 'ชมรมวิ่งเทรลและเอาท์ดอร์ กรุงเทพฯ',
    participantsCount: 4,
    registrationTimestamp: Date.now() - 86400000 * 1,
    qrCodeData: 'RHF26-319804',
    checkInStatus: 'REGISTERED',
    checkInTimestamp: undefined,
    checkInStaff: undefined,
    wristbandStatus: 'NOT_ISSUED',
    wristbandIssuedTimestamp: undefined,
    wristbandIssuedBy: undefined,
    eventCategory: '[TBD] บัตรแคมป์ไฟและดนตรี (Campfire Pass)',
    activityPreference: '[TBD] ดนตรีสดอะคูสติกท่ามกลางป่าสน',
    notes: 'เดินทางถึงช่วงเย็น 4 ท่าน',
  },
  {
    id: 'RHF26-728114',
    fullName: 'กรกนก เทพประสิทธิ์',
    phoneNumber: '084-990-1283',
    email: 'kornkanok.t@horizonholdings.th',
    organization: 'ฮอไรซอน แอลไพน์ คลับ',
    participantsCount: 2,
    registrationTimestamp: Date.now() - 86400000 * 4,
    qrCodeData: 'RHF26-728114',
    checkInStatus: 'REGISTERED',
    checkInTimestamp: undefined,
    checkInStaff: undefined,
    wristbandStatus: 'NOT_ISSUED',
    wristbandIssuedTimestamp: undefined,
    wristbandIssuedBy: undefined,
    eventCategory: '[TBD] แพ็กเกจรีสอร์ทพร้อมเข้างาน',
    activityPreference: '[TBD] กอล์ฟ 18 หลุม และ คอนเสิร์ตยามค่ำ',
    notes: '',
  },
];

export const storageService = {
  getRegistrations(): Registration[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
        return INITIAL_DEMO_DATA;
      }
      return JSON.parse(data) as Registration[];
    } catch {
      return INITIAL_DEMO_DATA;
    }
  },

  getRegistrationById(id: string): Registration | null {
    const trimmed = id.trim().toUpperCase();
    const list = this.getRegistrations();
    return list.find((r) => r.id.toUpperCase() === trimmed || r.qrCodeData.toUpperCase() === trimmed) || null;
  },

  getRegistrationByEmail(email: string): Registration | null {
    const trimmed = email.trim().toLowerCase();
    const list = this.getRegistrations();
    return list.find((r) => r.email.toLowerCase() === trimmed) || null;
  },

  getLastRegisteredId(): string | null {
    return localStorage.getItem(CURRENT_USER_REG_KEY);
  },

  setLastRegisteredId(id: string): void {
    localStorage.setItem(CURRENT_USER_REG_KEY, id);
  },

  createRegistration(data: {
    fullName: string;
    phoneNumber: string;
    email: string;
    organization: string;
    participantsCount: number;
    eventCategory: string;
    activityPreference?: string;
    notes?: string;
  }): Registration {
    // Generate unique ID in format RHF26-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const id = `RHF26-${randomDigits}`;

    const newRegistration: Registration = {
      ...data,
      id,
      registrationTimestamp: Date.now(),
      qrCodeData: id,
      checkInStatus: 'REGISTERED',
      wristbandStatus: 'NOT_ISSUED',
    };

    const currentList = this.getRegistrations();
    const updated = [newRegistration, ...currentList];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.setLastRegisteredId(id);

    return newRegistration;
  },

  checkInParticipant(idOrCode: string, staffName = 'เจ้าหน้าที่จุดลงทะเบียน 1'): {
    status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'NOT_FOUND';
    registration?: Registration;
    message: string;
  } {
    const list = this.getRegistrations();
    const index = list.findIndex(
      (r) => r.id.toUpperCase() === idOrCode.trim().toUpperCase() || r.qrCodeData.toUpperCase() === idOrCode.trim().toUpperCase()
    );

    if (index === -1) {
      return {
        status: 'NOT_FOUND',
        message: 'ไม่พบข้อมูลการลงทะเบียน กรุณาตรวจสอบ QR Code',
      };
    }

    const reg = list[index];

    if (reg.checkInStatus === 'CHECKED_IN') {
      const timeStr = new Date(reg.checkInTimestamp || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return {
        status: 'ALREADY_CHECKED_IN',
        registration: reg,
        message: `QR Code นี้เช็กอินแล้ว เมื่อเวลา ${timeStr} น. โดย ${reg.checkInStaff || 'เจ้าหน้าที่'}`,
      };
    }

    // Mark as checked in
    const updatedReg: Registration = {
      ...reg,
      checkInStatus: 'CHECKED_IN',
      checkInTimestamp: Date.now(),
      checkInStaff: staffName,
    };

    list[index] = updatedReg;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    return {
      status: 'SUCCESS',
      registration: updatedReg,
      message: 'เช็กอินสำเร็จ สามารถรับริสแบนด์ได้ที่จุดรับริสแบนด์',
    };
  },

  issueWristband(id: string, staffName = 'จุดแจกริสแบนด์ 1'): {
    success: boolean;
    registration?: Registration;
    message: string;
  } {
    const list = this.getRegistrations();
    const index = list.findIndex((r) => r.id.toUpperCase() === id.trim().toUpperCase());

    if (index === -1) {
      return { success: false, message: 'ไม่พบข้อมูลผู้เข้าร่วมงาน' };
    }

    const reg = list[index];

    if (reg.wristbandStatus === 'WRISTBAND_ISSUED') {
      const timeStr = new Date(reg.wristbandIssuedTimestamp || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return {
        success: false,
        registration: reg,
        message: `รับริสแบนด์แล้ว เมื่อเวลา ${timeStr} น.`,
      };
    }

    const updatedReg: Registration = {
      ...reg,
      wristbandStatus: 'WRISTBAND_ISSUED',
      wristbandIssuedTimestamp: Date.now(),
      wristbandIssuedBy: staffName,
    };

    list[index] = updatedReg;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    return {
      success: true,
      registration: updatedReg,
      message: 'มอบริสแบนด์เรียบร้อยแล้ว',
    };
  },

  resetToDemo(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
  },

  exportToCsv(): void {
    const list = this.getRegistrations();
    const headers = [
      'รหัสการสมัคร (Registration ID)',
      'ชื่อ-นามสกุล (Full Name)',
      'เบอร์โทรศัพท์ (Phone)',
      'อีเมล (Email)',
      'หน่วยงาน/บริษัท (Organization)',
      'จำนวนผู้เข้าร่วม (Participants)',
      'ประเภทบัตร (Category)',
      'เวลาลงทะเบียน (Registered At)',
      'สถานะเช็กอิน (Check-in Status)',
      'เวลาเช็กอิน (Check-in Time)',
      'เจ้าหน้าที่เช็กอิน (Checked In By)',
      'สถานะริสแบนด์ (Wristband Status)',
      'เวลารับริสแบนด์ (Wristband Time)',
      'เจ้าหน้าที่แจกริสแบนด์ (Wristband By)',
    ];

    const rows = list.map((r) => [
      r.id,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.phoneNumber}"`,
      `"${r.email}"`,
      `"${r.organization.replace(/"/g, '""')}"`,
      r.participantsCount,
      `"${r.eventCategory}"`,
      new Date(r.registrationTimestamp).toISOString(),
      r.checkInStatus === 'CHECKED_IN' ? 'เช็กอินแล้ว' : 'ยังไม่ได้เช็กอิน',
      r.checkInTimestamp ? new Date(r.checkInTimestamp).toISOString() : '',
      `"${r.checkInStaff || ''}"`,
      r.wristbandStatus === 'WRISTBAND_ISSUED' ? 'รับริสแบนด์แล้ว' : 'ยังไม่ได้รับริสแบนด์',
      r.wristbandIssuedTimestamp ? new Date(r.wristbandIssuedTimestamp).toISOString() : '',
      `"${r.wristbandIssuedBy || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `royal_hills_fest_2026_attendees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
