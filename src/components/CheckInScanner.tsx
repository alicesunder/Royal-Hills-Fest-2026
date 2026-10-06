import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { IssuedTicket, Order, CheckInVerificationResult } from '../types';
import { ticketStoreService } from '../services/ticketStoreService';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  RefreshCw,
  Search,
  Clock,
  User,
  Shield,
  Ticket,
  Users,
  Crown,
  ChevronRight,
} from 'lucide-react';

interface CheckInScannerProps {
  initialCode?: string;
  onViewDashboard?: () => void;
}

export const CheckInScanner: React.FC<CheckInScannerProps> = ({
  initialCode,
  onViewDashboard,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [manualCode, setManualCode] = useState(initialCode || '');
  const [staffName, setStaffName] = useState('เจ้าหน้าที่ จุดตรวจ 1');

  // Verification result state
  const [result, setResult] = useState<CheckInVerificationResult | null>(null);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialCode) {
      processCode(initialCode);
    }
  }, [initialCode]);

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError('');
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraPermission('granted');
      startScanningLoop();
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraPermission('denied');
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'ไม่อนุญาตให้เข้าถึงกล้อง กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์ หรือใช้การค้นหารหัสบัตรด้านล่าง'
          : 'ไม่สามารถเปิดกล้องบนอุปกรณ์นี้ได้ ท่านสามารถตรวจสอบรหัสการสมัคร/รหัสบัตรผ่านช่องค้นหาด้านล่าง'
      );
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Continuous frame scanning loop
  const startScanningLoop = () => {
    const scanFrame = () => {
      if (
        videoRef.current &&
        canvasRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && !processing) {
            processCode(code.data);
            return;
          }
        }
      }
      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  // Process code
  const processCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setProcessing(true);

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}

    const checkResult = ticketStoreService.verifyAndCheckInTicket(code, staffName);
    setResult(checkResult);
    setProcessing(false);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processCode(manualCode);
  };

  // NORMAL: Issue Wristband
  const handleIssueWristband = () => {
    if (!result?.ticket) return;
    const res = ticketStoreService.issueWristbandToTicket(result.ticket.id, staffName);
    if (res.success && res.ticket) {
      setResult({
        ...result,
        ticket: res.ticket,
        message: 'มอบริสแบนด์เรียบร้อยแล้ว',
      });
    }
  };

  // VIP: Check in individual attendee
  const handleVipAttendeeCheckIn = (seatNum: number) => {
    if (!result?.ticket) return;
    const res = ticketStoreService.checkInVipAttendee(result.ticket.id, seatNum, staffName);
    if (res.success && res.ticket) {
      const checkedInCount = res.ticket.vipAttendees?.filter((a) => a.checkedIn).length || 0;
      setResult({
        ...result,
        ticket: res.ticket,
        vipAttendees: res.ticket.vipAttendees,
        checkedInSeats: checkedInCount,
        remainingSeats: (res.ticket.vipAttendees?.length || 6) - checkedInCount,
        message: res.message,
      });
    }
  };

  // VIP: Issue wristband to individual attendee
  const handleVipAttendeeWristband = (seatNum: number) => {
    if (!result?.ticket) return;
    const res = ticketStoreService.issueWristbandToVipAttendee(result.ticket.id, seatNum, staffName);
    if (res.success && res.ticket) {
      setResult({
        ...result,
        ticket: res.ticket,
        vipAttendees: res.ticket.vipAttendees,
        message: res.message,
      });
    }
  };

  // VIP: Check in entire table
  const handleVipEntireTableCheckIn = () => {
    if (!result?.ticket) return;
    const res = ticketStoreService.checkInEntireVipTable(result.ticket.id, staffName);
    if (res.success && res.ticket) {
      const checkedInCount = res.ticket.vipAttendees?.filter((a) => a.checkedIn).length || 6;
      setResult({
        ...result,
        ticket: res.ticket,
        vipAttendees: res.ticket.vipAttendees,
        checkedInSeats: checkedInCount,
        remainingSeats: 0,
        message: res.message,
      });
    }
  };

  // VIP: Issue wristbands to entire table
  const handleVipEntireTableWristbands = () => {
    if (!result?.ticket) return;
    const res = ticketStoreService.issueWristbandsToEntireVipTable(result.ticket.id, staffName);
    if (res.success && res.ticket) {
      setResult({
        ...result,
        ticket: res.ticket,
        vipAttendees: res.ticket.vipAttendees,
        checkedInSeats: 6,
        remainingSeats: 0,
        message: res.message,
      });
    }
  };

  const handleResetScanner = () => {
    setResult(null);
    setManualCode('');
    if (cameraActive) {
      startScanningLoop();
    }
  };

  return (
    <div className="py-20 sm:py-28 bg-[#10140F] min-h-screen text-[#FFF9ED]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#30391E]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#D8A934] uppercase tracking-wider mb-1">
              <Shield className="w-3.5 h-3.5" />
              STAFF ON-SITE GATE CHECK-IN
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FFF9ED]">
              ระบบสแกนเช็กอินหน้างาน
            </h1>
            <p className="text-xs text-[#F3E7C8]/75 mt-0.5">
              รองรับทั้งบัตรปกติ (รายบุคคล) และ บัตร VIP (เช็กอินทั้งโต๊ะหรือรายบุคคล)
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {onViewDashboard && (
              <button
                onClick={onViewDashboard}
                className="cursor-pointer text-xs font-semibold px-4 py-2 rounded-lg bg-[#182719] hover:bg-[#30391E] border border-[#30391E] text-[#D8A934] transition-colors"
              >
                เปิดแดชบอร์ด &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Staff Identifier Tag */}
        <div className="mb-6 p-3 rounded-xl bg-[#182719] border border-[#30391E] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#F3E7C8]/80">
            <User className="w-4 h-4 text-[#D8A934]" />
            <span>เจ้าหน้าที่ประจำจุด:</span>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="bg-[#10140F] border border-[#30391E] rounded px-2.5 py-1 text-xs text-[#FFF9ED] font-semibold focus:outline-none focus:border-[#D8A934]"
            />
          </div>
          <span className="text-[11px] font-mono text-[#65705A]">GATE 1 · ROYAL HILLS RESORT</span>
        </div>

        {/* Verification Result Drawer */}
        {result ? (
          <div className="mb-8 rounded-2xl bg-[#182719] border border-[#30391E] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Status Header Bar */}
            <div
              className={`p-5 flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
                result.status === 'SUCCESS'
                  ? 'bg-emerald-950/80 border-b border-emerald-800 text-emerald-300'
                  : result.status === 'ALREADY_CHECKED_IN'
                  ? 'bg-amber-950/80 border-b border-amber-800 text-amber-300'
                  : 'bg-red-950/80 border-b border-red-800 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {result.status === 'SUCCESS' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : result.status === 'ALREADY_CHECKED_IN' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-sm">
                  {result.status === 'SUCCESS'
                    ? 'สแกนสำเร็จ'
                    : result.status === 'ALREADY_CHECKED_IN'
                    ? 'บัตรนี้เช็กอินแล้ว'
                    : 'ไม่สามารถเช็กอินได้'}
                </span>
              </div>
              <span className="font-mono text-[11px]">{result.ticket?.id}</span>
            </div>

            {/* Main Result Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Message Banner */}
              <p className="text-sm text-[#F3E7C8]/90 bg-[#10140F] p-3.5 rounded-xl border border-[#30391E]">
                {result.message}
              </p>

              {/* CASE 1: VIP TABLE CHECK-IN */}
              {result.ticket && result.ticket.ticketKind === 'VIP' && (
                <div className="space-y-6">
                  {/* VIP Table Summary Card */}
                  <div className="p-5 rounded-2xl bg-[#10140F] border border-[#D8A934]/50 shadow-inner">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#30391E]">
                      <div>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#10140F] bg-gradient-to-r from-[#D8A934] to-[#c4982c] px-3 py-0.5 rounded-full uppercase">
                          <Crown className="w-3.5 h-3.5" />
                          {result.ticket.tableNumber || 'VIP โต๊ะ'}
                        </span>
                        <h3 className="font-display text-2xl font-bold text-[#FFF9ED] mt-1.5">
                          {result.ticket.id}
                        </h3>
                        <p className="text-xs text-[#65705A]">
                          ผู้จอง: {result.ticket.attendeeName} ({result.ticket.attendeePhone})
                        </p>
                      </div>

                      {/* Seats & Check-in Progress Tracker */}
                      <div className="flex items-center gap-3">
                        <div className="text-center bg-[#182719] px-4 py-2 rounded-xl border border-[#30391E]">
                          <span className="block text-[10px] text-[#65705A]">ที่นั่งทั้งหมด</span>
                          <span className="font-mono text-xl font-bold text-[#FFF9ED]">
                            {result.totalSeats || 6}
                          </span>
                        </div>

                        <div className="text-center bg-emerald-950/40 px-4 py-2 rounded-xl border border-emerald-700/50">
                          <span className="block text-[10px] text-emerald-400">เช็กอินแล้ว</span>
                          <span className="font-mono text-xl font-bold text-emerald-300">
                            {result.checkedInSeats || 0} / {result.totalSeats || 6}
                          </span>
                        </div>

                        <div className="text-center bg-amber-950/40 px-4 py-2 rounded-xl border border-amber-700/50">
                          <span className="block text-[10px] text-amber-400">ยังไม่เช็กอิน</span>
                          <span className="font-mono text-xl font-bold text-amber-300">
                            {result.remainingSeats ?? 6} / {result.totalSeats || 6}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Batch Actions for Entire Table */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={handleVipEntireTableCheckIn}
                        disabled={result.remainingSeats === 0}
                        className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#D8A934] hover:bg-[#c4982c] disabled:opacity-40 disabled:cursor-not-allowed text-[#10140F] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        เช็กอินทั้งโต๊ะ ({result.remainingSeats} ที่นั่ง)
                      </button>

                      <button
                        onClick={handleVipEntireTableWristbands}
                        className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#182719] hover:bg-[#30391E] border border-[#D8A934]/60 text-[#D8A934] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow"
                      >
                        <Award className="w-4 h-4" />
                        มอบริสแบนด์ทั้งโต๊ะ (ครบ 6 เส้น)
                      </button>
                    </div>
                  </div>

                  {/* Individual VIP Attendees Roster List */}
                  <div className="space-y-3">
                    <h4 className="font-display text-sm font-bold text-[#FFF9ED] flex items-center justify-between">
                      <span>รายชื่อผู้เข้าร่วมโต๊ะ VIP ({result.ticket.vipAttendees?.length || 6} ที่นั่ง):</span>
                      <span className="text-xs text-[#65705A] font-normal">
                        สมาชิกสามารถเช็กอินแยกตามเวลาที่มาถึงได้
                      </span>
                    </h4>

                    <div className="space-y-2">
                      {result.ticket.vipAttendees?.map((att) => {
                        return (
                          <div
                            key={att.seatNumber}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                              att.checkedIn
                                ? 'bg-[#182719] border-emerald-800/60'
                                : 'bg-[#10140F] border-[#30391E]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-[#10140F] border border-[#65705A] flex items-center justify-center font-mono font-bold text-xs text-[#D8A934]">
                                {att.seatNumber}
                              </span>
                              <div>
                                <p className="font-bold text-[#FFF9ED] text-sm">
                                  {att.name || `ผู้เข้าร่วมคนที่ ${att.seatNumber}`}
                                </p>
                                <div className="flex items-center gap-3 text-[11px] text-[#65705A] mt-0.5">
                                  <span>
                                    สถานะเช็กอิน:{' '}
                                    <strong className={att.checkedIn ? 'text-emerald-400' : 'text-amber-400'}>
                                      {att.checkedIn ? 'เช็กอินแล้ว' : 'ยังไม่เช็กอิน'}
                                    </strong>
                                  </span>
                                  <span>·</span>
                                  <span>
                                    ริสแบนด์:{' '}
                                    <strong className={att.wristbandIssued ? 'text-emerald-400' : 'text-[#65705A]'}>
                                      {att.wristbandIssued ? 'รับริสแบนด์แล้ว' : 'ยังไม่ได้รับ'}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions per attendee */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {!att.checkedIn && (
                                <button
                                  onClick={() => handleVipAttendeeCheckIn(att.seatNumber)}
                                  className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[#FFF9ED] font-bold text-xs flex items-center gap-1 shadow"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  เช็กอินคนที่ {att.seatNumber}
                                </button>
                              )}

                              {att.checkedIn && !att.wristbandIssued && (
                                <button
                                  onClick={() => handleVipAttendeeWristband(att.seatNumber)}
                                  className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs flex items-center gap-1 shadow"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  มอบริสแบนด์
                                </button>
                              )}

                              {att.checkedIn && att.wristbandIssued && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  เสร็จสมบูรณ์
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 2: NORMAL TICKET CHECK-IN */}
              {result.ticket && result.ticket.ticketKind === 'NORMAL' && (
                <div className="p-5 rounded-2xl bg-[#10140F] border border-[#30391E] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#30391E]">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#D8A934] uppercase tracking-wider block">
                        บัตรปกติ (555 บาท / คน)
                      </span>
                      <h3 className="font-display text-2xl font-bold text-[#FFF9ED]">
                        {result.ticket.attendeeName}
                      </h3>
                      <p className="text-xs text-[#65705A]">
                        เบอร์โทร: {result.ticket.attendeePhone || '-'} · รหัสบัตร: {result.ticket.id}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono ${
                          result.ticket.wristbandIssued
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {result.ticket.wristbandIssued ? 'รับริสแบนด์แล้ว' : 'ยังไม่ได้รับริสแบนด์'}
                      </span>
                    </div>
                  </div>

                  {!result.ticket.wristbandIssued && (
                    <button
                      onClick={handleIssueWristband}
                      className="cursor-pointer w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D8A934] to-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Award className="w-4 h-4" />
                      มอบริสแบนด์ให้ผู้เข้าร่วม
                    </button>
                  )}
                </div>
              )}

              {/* Action Button: Scan Next */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleResetScanner}
                  className="cursor-pointer px-6 py-3 rounded-xl bg-[#182719] hover:bg-[#30391E] border border-[#30391E] text-[#FFF9ED] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-[#D8A934]" />
                  สแกนใบถัดไป
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SCANNER ACTIVE INTERFACE */
          <div className="space-y-6">
            {/* Camera Viewfinder */}
            <div className="relative aspect-video max-w-xl mx-auto rounded-3xl overflow-hidden bg-black border-2 border-[#30391E] shadow-2xl flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanning Reticle Frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-[#D8A934] rounded-2xl relative shadow-[0_0_50px_rgba(216,169,52,0.3)]">
                      {/* Reticle corner accents */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#FFF9ED] rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#FFF9ED] rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#FFF9ED] rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#FFF9ED] rounded-br" />

                      {/* Animated Laser Scan Bar */}
                      <div
                        className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8A934] to-transparent absolute shadow-[0_0_15px_#D8A934] animate-bounce"
                        style={{ animationDuration: '2s' }}
                      />
                    </div>
                  </div>

                  {/* Stop Camera Overlay Button */}
                  <button
                    onClick={stopCamera}
                    className="cursor-pointer absolute top-4 right-4 bg-[#10140F]/80 hover:bg-[#10140F] text-[#FFF9ED] px-3 py-1.5 rounded-lg border border-[#30391E] text-xs flex items-center gap-1.5"
                  >
                    <CameraOff className="w-3.5 h-3.5 text-red-400" />
                    ปิดกล้อง
                  </button>
                </>
              ) : (
                <div className="text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#182719] border border-[#30391E] flex items-center justify-center mx-auto text-[#D8A934]">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#FFF9ED]">
                      เปิดกล้องสแกน QR Code หน้างาน
                    </h3>
                    <p className="text-xs text-[#F3E7C8]/70 max-w-xs mx-auto mt-1">
                      วาง QR Code ของผู้เข้าร่วมให้อยู่ในกรอบ หรือกรอกรหัสบัตรด้านล่าง
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-[#D8A934]/25 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    เปิดกล้องสแกน
                  </button>
                  {cameraError && (
                    <p className="text-xs text-red-400 max-w-xs mx-auto mt-2">{cameraError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Manual Code Lookup Form */}
            <div className="max-w-xl mx-auto bg-[#182719] p-5 rounded-2xl border border-[#30391E] shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#65705A] block mb-1">
                MANUAL CODE LOOKUP
              </span>
              <p className="text-xs font-semibold text-[#FFF9ED] mb-3">
                ค้นหาด้วยรหัสบัตร (Ticket ID) หรือ โต๊ะ VIP (เช่น RHF26-VIP-0001, RHF26-T551)
              </p>

              <form onSubmit={handleManualSearch} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="เช่น RHF26-VIP-0001 หรือ RHF26-T551"
                  className="flex-1 bg-[#10140F] border border-[#30391E] rounded-xl px-4 py-3 text-xs text-[#FFF9ED] font-mono focus:outline-none focus:border-[#D8A934]"
                />
                <button
                  type="submit"
                  className="cursor-pointer bg-[#D8A934] hover:bg-[#c4982c] text-[#10140F] font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Search className="w-4 h-4" />
                  ตรวจสอบ
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
