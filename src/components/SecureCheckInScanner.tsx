import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, LogIn, LogOut, QrCode, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { getAdminAccessToken, getCachedAdminEmail, signInAdmin, signOutAdmin } from '../services/supabaseAdminAuth';
import { ticketingApiService } from '../services/ticketingApiService';

type ScanResult = {
  outcome: string;
  ticket_code?: string | null;
  ticket_id?: string | null;
  idempotent_replay?: boolean;
};

const outcomeCopy: Record<string, { title: string; body: string; style: string }> = {
  accepted: {
    title: 'เช็กอินสำเร็จ',
    body: 'ระบบบันทึกการใช้บัตรนี้แล้ว',
    style: 'border-emerald-700/70 bg-emerald-950/30 text-emerald-200',
  },
  duplicate: {
    title: 'บัตรนี้เช็กอินไปแล้ว',
    body: 'ไม่สามารถใช้บัตรใบเดิมเช็กอินซ้ำได้',
    style: 'border-amber-700/70 bg-amber-950/30 text-amber-200',
  },
  unpaid: {
    title: 'ยังไม่ชำระเงิน',
    body: 'คำสั่งซื้อยังไม่ได้รับการอนุมัติชำระเงินจริง',
    style: 'border-red-700/70 bg-red-950/30 text-red-200',
  },
  invalid: {
    title: 'ไม่พบบัตรนี้',
    body: 'QR ไม่ถูกต้องหรือไม่ใช่บัตรที่ออกจากระบบนี้',
    style: 'border-red-700/70 bg-red-950/30 text-red-200',
  },
  cancelled: {
    title: 'บัตรถูกยกเลิก',
    body: 'โปรดติดต่อผู้ดูแลก่อนให้เข้าร่วมงาน',
    style: 'border-red-700/70 bg-red-950/30 text-red-200',
  },
  refunded: {
    title: 'บัตรถูกคืนเงิน',
    body: 'ไม่สามารถใช้บัตรที่คืนเงินแล้วได้',
    style: 'border-red-700/70 bg-red-950/30 text-red-200',
  },
};

export const SecureCheckInScanner: React.FC = () => {
  const [email, setEmail] = useState(getCachedAdminEmail());
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    let active = true;
    getAdminAccessToken().then((token) => {
      if (!active || !token) return;
      setAccessToken(token);
      setEmail(getCachedAdminEmail());
    }).catch(() => undefined);
    return () => {
      active = false;
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const processCode = useCallback(async (raw: string) => {
    const qrToken = raw.trim();
    if (!qrToken || !accessToken || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setScanResult(null);
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    try {
      const result = await ticketingApiService.checkInTicket(accessToken, qrToken);
      const normalized = String(result.outcome || 'invalid');
      setScanResult({
        outcome: normalized,
        ticket_code: typeof result.ticket_code === 'string' ? result.ticket_code : null,
        ticket_id: typeof result.ticket_id === 'string' ? result.ticket_id : null,
        idempotent_replay: result.idempotent_replay === true,
      });
      setManualCode('');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'ตรวจสอบบัตรไม่สำเร็จ';
      setError(message);
      if (/เข้าสู่ระบบ|เซสชัน|สิทธิ์ผู้ดูแล/i.test(message)) {
        await signOutAdmin();
        setAccessToken(null);
        stopCamera();
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [accessToken, stopCamera]);

  const startScanningLoop = useCallback(() => {
    const scanFrame = () => {
      if (!cameraActive || busyRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
            void processCode(code.data);
            return;
          }
        }
      }
      animationRef.current = requestAnimationFrame(scanFrame);
    };
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [cameraActive, processCode]);

  useEffect(() => {
    if (cameraActive && !busy && !scanResult) startScanningLoop();
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [cameraActive, busy, scanResult, startScanningLoop]);

  const handleStartCamera = async () => {
    setCameraError('');
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('เบราว์เซอร์นี้เปิดกล้องไม่ได้ กรุณาใช้ช่องกรอกรหัสบัตรด้านล่าง');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      await videoRef.current.play();
      setCameraActive(true);
      setScanResult(null);
    } catch (cameraException) {
      const name = cameraException instanceof Error ? cameraException.name : '';
      setCameraError(name === 'NotAllowedError'
        ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์หรือกรอกรหัสบัตรด้วยตนเอง'
        : 'ไม่สามารถเปิดกล้องได้ กรุณากรอกรหัส QR ด้วยตนเอง');
    }
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    setError('');
    try {
      const session = await signInAdmin(email, password);
      setAccessToken(session.access_token);
      setEmail(session.user.email || email);
      setPassword('');
      setNotice('เข้าสู่ระบบแล้ว ระบบจะตรวจสิทธิ์ผู้ดูแลอีกครั้งก่อนทุกการสแกน');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    stopCamera();
    await signOutAdmin();
    setAccessToken(null);
    setPassword('');
    setScanResult(null);
    setNotice('');
    setError('');
  };

  const handleManualSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualCode.trim()) return;
    void processCode(manualCode);
  };

  const resultView = scanResult ? outcomeCopy[scanResult.outcome] : null;

  return (
    <section className="py-16 sm:py-24 bg-[#10140F] min-h-screen text-[#FFF9ED]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="pb-6 border-b border-[#30391E]">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#D8A934] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> SECURE GATE CHECK-IN
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-2">ระบบสแกนเช็กอินหน้างาน</h1>
          <p className="text-xs sm:text-sm text-[#F3E7C8]/70 mt-2 leading-relaxed">
            ต้องเข้าสู่ระบบผู้ดูแลก่อนทุกครั้ง ระบบจะตรวจว่าบัตรชำระเงินแล้วและยังไม่เคยเช็กอิน
          </p>
        </header>

        {!accessToken ? (
          <form onSubmit={handleSignIn} className="max-w-lg mx-auto rounded-2xl border border-[#30391E] bg-[#182719] p-5 sm:p-7 space-y-4">
            <h2 className="text-lg font-bold text-[#D8A934]">เข้าสู่ระบบเจ้าหน้าที่</h2>
            <div>
              <label htmlFor="secure-gate-email" className="block text-xs text-[#F3E7C8] mb-1">อีเมลผู้ดูแล</label>
              <input
                id="secure-gate-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm outline-none focus:border-[#D8A934]"
              />
            </div>
            <div>
              <label htmlFor="secure-gate-password" className="block text-xs text-[#F3E7C8] mb-1">รหัสผ่าน</label>
              <input
                id="secure-gate-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm outline-none focus:border-[#D8A934]"
              />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full rounded-xl bg-[#D8A934] px-4 py-3 text-sm font-bold text-[#10140F] flex items-center justify-center gap-2 disabled:opacity-50">
              <LogIn className="w-4 h-4" /> {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
            <p className="text-[11px] text-[#65705A] leading-relaxed">
              ต้องเป็นบัญชี Supabase Auth ที่ถูกเพิ่มไว้ในรายการผู้ดูแลของระบบเท่านั้น
            </p>
          </form>
        ) : (
          <>
            <div className="rounded-xl border border-[#30391E] bg-[#182719] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#65705A]">เจ้าหน้าที่ที่เข้าสู่ระบบ</p>
                <p className="text-sm font-semibold text-[#F3E7C8]">{getCachedAdminEmail() || email}</p>
              </div>
              <button onClick={() => void handleSignOut()} type="button" className="self-start sm:self-auto rounded-lg border border-red-900/70 px-3 py-2 text-xs font-semibold text-red-300 flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-[#30391E] bg-[#182719] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-[#D8A934] flex items-center gap-2"><Camera className="w-4 h-4" /> กล้องสแกน QR</h2>
                  {!cameraActive ? (
                    <button type="button" onClick={() => void handleStartCamera()} disabled={busy} className="rounded-lg bg-[#D8A934] px-3 py-2 text-xs font-bold text-[#10140F] flex items-center gap-2 disabled:opacity-50">
                      <Camera className="w-4 h-4" /> เปิดกล้อง
                    </button>
                  ) : (
                    <button type="button" onClick={stopCamera} className="rounded-lg border border-[#30391E] px-3 py-2 text-xs font-semibold text-[#F3E7C8] flex items-center gap-2">
                      <CameraOff className="w-4 h-4" /> ปิดกล้อง
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-[#30391E] relative">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#65705A]">
                      <QrCode className="w-10 h-10" />
                      <p className="text-xs">เปิดกล้องเพื่อสแกนบัตร</p>
                    </div>
                  )}
                  {busy && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-sm text-[#D8A934]">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> กำลังตรวจสอบบัตร...
                    </div>
                  )}
                </div>
                {cameraError && <p role="alert" className="text-xs text-amber-200">{cameraError}</p>}
                <form onSubmit={handleManualSearch} className="space-y-2">
                  <label htmlFor="secure-gate-code" className="block text-xs text-[#F3E7C8]">หรือกรอกรหัส QR ด้วยตนเอง</label>
                  <input
                    id="secure-gate-code"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    autoComplete="off"
                    placeholder="วางรหัส QR ที่อ่านได้"
                    className="w-full rounded-xl bg-[#10140F] border border-[#30391E] px-4 py-3 text-sm outline-none focus:border-[#D8A934]"
                  />
                  <button type="submit" disabled={busy || !manualCode.trim()} className="w-full rounded-xl border border-[#D8A934]/50 px-4 py-3 text-sm font-bold text-[#D8A934] disabled:opacity-50">
                    ตรวจสอบและเช็กอิน
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-[#30391E] bg-[#182719] p-4 sm:p-5 space-y-4">
                <h2 className="font-bold text-[#D8A934]">ผลการตรวจสอบ</h2>
                {!scanResult && !error && !notice && (
                  <div className="rounded-xl border border-dashed border-[#30391E] p-8 text-center text-sm text-[#65705A]">
                    สแกน QR หรือกรอกรหัสบัตรเพื่อเริ่มตรวจสอบ
                  </div>
                )}
                {notice && <p role="status" className="rounded-xl border border-emerald-700/60 bg-emerald-950/20 p-3 text-xs text-emerald-200">{notice}</p>}
                {error && <p role="alert" className="rounded-xl border border-red-700/60 bg-red-950/20 p-3 text-xs text-red-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</p>}
                {scanResult && (
                  <div className={'rounded-xl border p-5 space-y-3 ' + (resultView?.style || 'border-[#30391E] bg-[#10140F]')}>
                    <div className="flex items-center gap-2">
                      {scanResult.outcome === 'accepted'
                        ? <CheckCircle2 className="w-6 h-6" />
                        : <XCircle className="w-6 h-6" />}
                      <h3 className="text-lg font-bold">{resultView?.title || 'ผลตรวจสอบ'}</h3>
                    </div>
                    <p className="text-sm leading-relaxed">{resultView?.body || 'ระบบคืนสถานะที่ไม่รู้จัก กรุณาตรวจสอบกับผู้ดูแล'}</p>
                    {scanResult.ticket_code && (
                      <div className="rounded-lg bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider opacity-70">รหัสบัตร</p>
                        <p className="font-mono text-sm font-bold mt-1">{scanResult.ticket_code}</p>
                      </div>
                    )}
                    {scanResult.idempotent_replay && <p className="text-[11px]">คำขอนี้ได้รับการประมวลผลแล้ว</p>}
                    <button type="button" onClick={() => { setScanResult(null); setError(''); setNotice(''); setManualCode(''); }} className="w-full rounded-lg bg-[#10140F]/50 px-3 py-2.5 text-xs font-bold">
                      สแกนบัตรใบถัดไป
                    </button>
                  </div>
                )}
                <div className="rounded-xl border border-amber-700/40 bg-amber-950/15 p-4 text-xs text-amber-100/90 leading-relaxed">
                  <p className="font-bold mb-1">หมายเหตุการเช็กอิน</p>
                  ระบบนี้เช็กอินตาม QR ของบัตรทั้งใบ: บัตรปกติ 1 ใบต่อ 1 คน และ VIP 1 QR ต่อ 1 โต๊ะ ระบบปัจจุบันยังไม่แยกเช็กอินทีละที่นั่ง VIP
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
