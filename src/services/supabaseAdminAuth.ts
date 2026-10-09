const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
const SESSION_KEY = 'rhf26_admin_session_v1';

export interface AdminSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: { id: string; email?: string };
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('ระบบผู้ดูแลยังไม่ได้ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY');
  }
}

function saveSession(session: AdminSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof value.access_token !== 'string' ||
      typeof value.refresh_token !== 'string' ||
      typeof value.expires_at !== 'number' ||
      !value.user ||
      typeof value.user.id !== 'string'
    ) return null;
    return value as AdminSession;
  } catch {
    return null;
  }
}

async function requestAuth(path: string, body: Record<string, unknown>, accessToken?: string) {
  assertConfigured();
  const response = await fetch(SUPABASE_URL + '/auth/v1/' + path, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.msg === 'string'
      ? payload.msg
      : typeof payload.message === 'string'
        ? payload.message
        : 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน';
    throw new Error(message);
  }
  return payload;
}

function toSession(payload: Record<string, unknown>): AdminSession {
  const user = payload.user as { id?: string; email?: string } | undefined;
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
  const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : '';
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
  if (!user?.id || !accessToken || !refreshToken) {
    throw new Error('Supabase ไม่ส่งข้อมูลเซสชันกลับมา กรุณาลองเข้าสู่ระบบใหม่');
  }
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    token_type: typeof payload.token_type === 'string' ? payload.token_type : 'bearer',
    user: { id: user.id, email: user.email },
  };
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  const payload = await requestAuth('token?grant_type=password', {
    email: email.trim().toLowerCase(),
    password,
  });
  const session = toSession(payload);
  saveSession(session);
  return session;
}

export async function getAdminAccessToken(): Promise<string | null> {
  assertConfigured();
  const session = readSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session.access_token;

  try {
    const payload = await requestAuth('token?grant_type=refresh_token', {
      refresh_token: session.refresh_token,
    });
    const refreshed = toSession(payload);
    saveSession(refreshed);
    return refreshed.access_token;
  } catch {
    clearAdminSession();
    return null;
  }
}

export async function signOutAdmin(): Promise<void> {
  const session = readSession();
  clearAdminSession();
  if (!session) return;
  try {
    await requestAuth('logout', {}, session.access_token);
  } catch {
    // Local session is cleared even if server-side logout is unavailable.
  }
}

export function getCachedAdminEmail(): string {
  return readSession()?.user.email || '';
}
