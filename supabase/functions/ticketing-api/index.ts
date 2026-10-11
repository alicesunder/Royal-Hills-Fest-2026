const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

type JsonObject = Record<string, unknown>;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readJsonObject(name: string): Record<string, string> {
  const raw = Deno.env.get(name);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function config() {
  const url = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const publicKeys = readJsonObject("SUPABASE_PUBLISHABLE_KEYS");
  const secretKeys = readJsonObject("SUPABASE_SECRET_KEYS");
  const publicKey = publicKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !publicKey || !secretKey) {
    throw new ApiError(503, "ระบบยังตั้งค่า Supabase ไม่ครบ กรุณาติดต่อผู้ดูแล");
  }
  return { url, publicKey, secretKey };
}

function serverHeaders(extra: Record<string, string> = {}) {
  const secretKey = config().secretKey;
  const headers: Record<string, string> = { apikey: secretKey, ...extra };
  // Legacy service_role keys are JWTs; newer sb_secret_ keys must be sent as apikey only.
  if (secretKey.startsWith("eyJ")) headers.Authorization = "Bearer " + secretKey;
  return headers;
}

function publicHeaders(extra: Record<string, string> = {}) {
  return { apikey: config().publicKey, ...extra };
}

async function responseJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

async function rest(path: string, init: RequestInit = {}) {
  const root = config().url;
  const initHeaders = (init.headers || {}) as Record<string, string>;
  const headers = serverHeaders({
    ...(init.body && !(init.body instanceof ArrayBuffer) && !(init.body instanceof Uint8Array)
      ? { "Content-Type": "application/json" } : {}),
    ...initHeaders,
  });
  const response = await fetch(root + "/rest/v1/" + path, { ...init, headers });
  const result = await responseJson(response);
  if (!response.ok) {
    const message = (result && typeof result === "object" && "message" in result)
      ? String((result as { message: unknown }).message)
      : "Database request failed";
    throw new ApiError(response.status >= 500 ? 503 : response.status, message);
  }
  return result;
}

async function rpc(name: string, args: JsonObject = {}) {
  return await rest("rpc/" + name, { method: "POST", body: JSON.stringify(args) });
}

async function hashHex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function integer(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
}

async function getCustomerOrder(orderNumber: string, lookupToken: string) {
  if (!orderNumber || !/^[A-Z0-9-]{6,40}$/i.test(orderNumber) || lookupToken.length < 48 || lookupToken.length > 128) {
    throw new ApiError(400, "กรุณาตรวจสอบเลขลงทะเบียนและรหัสติดตาม");
  }
  return await rpc("ticketing_get_customer_order", {
    p_order_number: orderNumber,
    p_lookup_token_hash: await hashHex(lookupToken),
  });
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token || token.length > 4096) throw new ApiError(401, "กรุณาเข้าสู่ระบบผู้ดูแลก่อน");
  const cfg = config();
  const identityResponse = await fetch(cfg.url + "/auth/v1/user", {
    headers: publicHeaders({ Authorization: "Bearer " + token }),
  });
  const identity = await responseJson(identityResponse) as { id?: string; email?: string } | null;
  if (!identityResponse.ok || !identity?.id) {
    throw new ApiError(401, "เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
  const allowed = await rpc("ticketing_is_admin", { p_user_id: identity.id });
  if (allowed !== true) throw new ApiError(403, "บัญชีนี้ยังไม่ได้รับสิทธิ์ผู้ดูแลระบบ");
  return { id: identity.id, email: identity.email || "" };
}

function normalizeRegistrationProfile(value: unknown, label: string) {
  const data = (value && typeof value === "object" ? value : {}) as JsonObject;
  const profile = {
    rank: text(data.rank, 100),
    attendeeName: text(data.attendeeName, 150),
    attendeePhone: text(data.attendeePhone, 40),
    attendeeEmail: text(data.attendeeEmail, 254).toLowerCase(),
    organization: text(data.organization, 200),
    affiliation: text(data.affiliation, 200),
    vehiclePlate: text(data.vehiclePlate, 40).replace(/\s+/g, " ").toUpperCase(),
  };
  if (profile.attendeeName.length < 2) throw new ApiError(400, "กรุณากรอกชื่อผู้ลงทะเบียนของ" + label);
  if (profile.attendeePhone.length < 6) throw new ApiError(400, "กรุณากรอกเบอร์โทรศัพท์ของ" + label);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.attendeeEmail)) {
    throw new ApiError(400, "กรุณากรอกอีเมลของ" + label + "ให้ถูกต้อง");
  }
  if (!profile.organization) throw new ApiError(400, "กรุณาระบุหน่วยงานของ" + label);
  if (!profile.affiliation) throw new ApiError(400, "กรุณาระบุสังกัดของ" + label);
  if (!profile.vehiclePlate || profile.vehiclePlate.length < 2) throw new ApiError(400, "กรุณากรอกทะเบียนรถของ" + label);
  return profile;
}

async function createOrder(body: JsonObject) {
  const buyer = (body.buyer && typeof body.buyer === "object" ? body.buyer : {}) as JsonObject;
  const name = text(buyer.name, 150);
  const phone = text(buyer.phone, 40);
  const email = text(buyer.email, 254).toLowerCase();
  const items = Array.isArray(body.items) ? body.items : [];
  const lookupToken = text(body.lookupToken, 128);
  const idempotencyKey = text(body.idempotencyKey, 100);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6) {
    throw new ApiError(400, "กรุณากรอกชื่อ เบอร์โทร และอีเมลให้ถูกต้อง");
  }
  if (items.length < 1 || items.length > 2) throw new ApiError(400, "รายการบัตรไม่ถูกต้อง");
  if (!/^[a-f0-9]{64}$/i.test(lookupToken) || !/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) {
    throw new ApiError(400, "ข้อมูลความปลอดภัยของคำสั่งซื้อไม่ถูกต้อง กรุณาเริ่มรายการใหม่");
  }

  const codes = Array.from(new Set(items.map((value) => text((value as JsonObject)?.code, 32))));
  if (codes.some((code) => !["tt-normal", "tt-vip"].includes(code)) || codes.length !== items.length) {
    throw new ApiError(400, "ประเภทบัตรไม่ถูกต้อง");
  }

  await rpc("ticketing_expire_orders", {});

  const codeList = "(" + codes.join(",") + ")";
  const typeRows = await rest(
    "ticket_types?select=id,code,name,price_thb,max_per_order,is_active,sales_start_at,sales_end_at&code=in." + encodeURIComponent(codeList)
  ) as Array<{ id: string; code: string; name: string; price_thb: number; max_per_order: number; is_active: boolean; sales_start_at: string | null; sales_end_at: string | null }>;

  const typesByCode = new Map(typeRows.map((row) => [row.code, row]));
  const reservationItems: Array<{ ticket_type_id: string; quantity: number; attendee_data: unknown[] }> = [];

  for (const rawItem of items) {
    const item = rawItem as JsonObject;
    const code = text(item.code, 32);
    const type = typesByCode.get(code);
    if (!type || !type.is_active) throw new ApiError(409, "ขณะนี้ยังไม่เปิดลงทะเบียนประเภทนี้ กรุณาติดต่อผู้จัดงาน");
    if ((type.sales_start_at && Date.parse(type.sales_start_at) > Date.now()) ||
        (type.sales_end_at && Date.parse(type.sales_end_at) <= Date.now())) {
      throw new ApiError(409, "บัตรประเภทนี้อยู่นอกช่วงเวลาจำหน่าย");
    }

    const quantity = integer(item.quantity, 1, 10);
    if (!quantity || quantity > type.max_per_order) throw new ApiError(400, "จำนวนสิทธิ์ " + type.name + " เกินข้อกำหนด");

    if (!Array.isArray(item.attendeeData) || item.attendeeData.length !== quantity) {
      throw new ApiError(400, "ข้อมูลผู้เข้าร่วมไม่ครบตามจำนวนบัตร");
    }

    const attendeeData = item.attendeeData.map((value: unknown, index: number) => {
      const label = code === "tt-vip"
        ? "โต๊ะ VIP ที่ " + (index + 1)
        : "บัตรปกติใบที่ " + (index + 1);
      const profile = normalizeRegistrationProfile(value, label);
      if (code === "tt-normal") return profile;

      const data = (value && typeof value === "object" ? value : {}) as JsonObject;
      const attendeeNames = Array.isArray(data.attendeeNames)
        ? data.attendeeNames.slice(0, 6).map((entry) => text(entry, 150))
        : [];
      if (attendeeNames.length !== 6 || attendeeNames[0].length < 2) {
        throw new ApiError(400, "กรุณาระบุชื่อหัวหน้าโต๊ะ VIP และตรวจรายชื่อผู้เข้าร่วม");
      }
      // Make the VIP table owner match guest seat 1, avoiding mismatched parking records.
      attendeeNames[0] = profile.attendeeName;
      return { ...profile, attendeeNames };
    });

    reservationItems.push({ ticket_type_id: type.id, quantity, attendee_data: attendeeData });
  }

  const orderNumber = "RHF26-" + randomHex(6).toUpperCase();
  const result = await rpc("ticketing_reserve_order", {
    p_order_number: orderNumber,
    p_customer_name: name,
    p_customer_email: email,
    p_customer_phone: phone,
    p_idempotency_key: idempotencyKey,
    p_lookup_token_hash: await hashHex(lookupToken),
    p_items: reservationItems,
  }) as JsonObject;

  const resolvedOrderNumber = text(result.order_number, 40);
  if (!resolvedOrderNumber) throw new ApiError(500, "ระบบไม่ได้สร้างเลขลงทะเบียน กรุณาลองใหม่อีกครั้ง");

  // The server alone finalizes zero-value orders and issues unique QR tokens.
  // A repeated request is safe: the database function returns the existing tickets.
  const registration = await rpc("ticketing_register_free_order", {
    p_order_number: resolvedOrderNumber,
    p_lookup_token_hash: await hashHex(lookupToken),
  }) as JsonObject;

  return {
    orderNumber: resolvedOrderNumber,
    orderId: result.order_id,
    status: registration.status || result.status,
    amountTotalThb: Number(registration.amount_total_thb ?? result.amount_total_thb ?? 0),
    expiresAt: result.expires_at,
    lookupToken,
    idempotentReplay: result.idempotent_replay === true || registration.idempotent_replay === true,
    instructions: "ลงทะเบียนฟรีเรียบร้อย ระบบจะออกบัตรดิจิทัลและ QR Code ให้",
  };
}


async function checkInTicket(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const qrToken = text(body.qrToken, 256);
  const requestId = text(body.requestId, 64);
  const scannerDeviceId = text(body.scannerDeviceId, 100);
  const scanLocation = text(body.scanLocation, 150);

  if (qrToken.length < 24 || qrToken.length > 256) {
    throw new ApiError(400, "QR บัตรไม่ถูกต้อง");
  }
  if (requestId && !/^[0-9a-f-]{36}$/i.test(requestId)) {
    throw new ApiError(400, "รหัสคำขอสแกนไม่ถูกต้อง");
  }

  return await rpc("ticketing_check_in", {
    p_qr_token_hash: await hashHex(qrToken),
    p_scanned_by: admin.id,
    p_scanner_device_id: scannerDeviceId || null,
    p_scan_location: scanLocation || null,
    p_request_id: requestId || crypto.randomUUID(),
  });
}

async function checkVehiclePass(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const qrToken = text(body.qrToken, 256);
  const requestId = text(body.requestId, 64);
  const scannerDeviceId = text(body.scannerDeviceId, 100);
  const scanLocation = text(body.scanLocation, 150);

  if (qrToken.length < 24 || qrToken.length > 256) {
    throw new ApiError(400, "QR ป้ายรถไม่ถูกต้อง");
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    throw new ApiError(400, "รหัสคำขอสแกนไม่ถูกต้อง");
  }

  return await rpc("ticketing_check_vehicle_pass", {
    p_token_hash: await hashHex(qrToken),
    p_staff_id: admin.id,
    p_scanner_device_id: scannerDeviceId || null,
    p_scan_location: scanLocation || null,
    p_request_id: requestId,
  });
}


async function adminListVehiclePasses(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const limit = integer(body.limit, 1, 500) ?? 200;
  return await rpc("ticketing_admin_vehicle_passes", {
    p_staff_id: admin.id,
    p_limit: limit,
  });
}

async function adminAssignVehicleParking(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const registrationCode = text(body.registrationCode, 64);
  const parkingZone = text(body.parkingZone, 100);
  const parkingSlot = text(body.parkingSlot, 100);
  if (!registrationCode) throw new ApiError(400, "กรุณาระบุรหัสป้ายรถ");
  if (parkingSlot && !parkingZone) throw new ApiError(400, "กรุณาระบุโซนจอดก่อนเลือกช่องจอด");
  return await rpc("ticketing_assign_vehicle_parking", {
    p_staff_id: admin.id,
    p_registration_code: registrationCode,
    p_parking_zone: parkingZone || null,
    p_parking_slot: parkingSlot || null,
  });
}

async function adminRegisterLegacyVehiclePass(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const ticketCode = text(body.ticketCode, 64).toUpperCase();
  const ownerRank = text(body.ownerRank, 100);
  const ownerName = text(body.ownerName, 150);
  const ownerPhone = text(body.ownerPhone, 40);
  const ownerEmail = text(body.ownerEmail, 254).toLowerCase();
  const organization = text(body.organization, 200);
  const affiliation = text(body.affiliation, 200);
  const vehiclePlate = text(body.vehiclePlate, 40).replace(/\s+/g, " ").toUpperCase();

  if (!/^RHF26-[A-Z0-9-]{6,32}$/.test(ticketCode)) throw new ApiError(400, "รหัสบัตรเก่าไม่ถูกต้อง");
  if (ownerName.length < 2 || ownerPhone.length < 6 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) ||
      !organization || !affiliation || vehiclePlate.length < 2) {
    throw new ApiError(400, "กรุณากรอกชื่อ โทรศัพท์ อีเมล หน่วยงาน สังกัด และทะเบียนรถให้ครบถ้วน");
  }

  return await rpc("ticketing_admin_register_legacy_vehicle_pass", {
    p_staff_id: admin.id,
    p_ticket_code: ticketCode,
    p_owner_rank: ownerRank,
    p_owner_name: ownerName,
    p_owner_phone: ownerPhone,
    p_owner_email: ownerEmail,
    p_organization: organization,
    p_affiliation: affiliation,
    p_vehicle_plate: vehiclePlate,
  });
}

async function createSignedPaymentProofUrl(path: string): Promise<string | null> {
  const safePath = path.trim().replace(/^\/+/, "");
  if (!safePath || safePath.split("/").some((part) => !part || part === "." || part === "..")) return null;
  const cfg = config();
  const encodedPath = safePath.split("/").map((part) => encodeURIComponent(part)).join("/");
  const response = await fetch(cfg.url + "/storage/v1/object/sign/payment-proofs/" + encodedPath, {
    method: "POST",
    headers: serverHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!response.ok) {
    await responseJson(response);
    return null;
  }
  const payload = await responseJson(response) as JsonObject | null;
  const signed = text(payload?.signedURL ?? payload?.signedUrl, 3000);
  if (!signed) return null;
  if (/^https?:\/\//i.test(signed)) return signed;
  const relative = signed.startsWith("/") ? signed : "/" + signed;
  return cfg.url + "/storage/v1" + relative;
}

async function adminListPaymentReviewOrders(request: Request) {
  await requireAdmin(request);
  const query = new URLSearchParams();
  query.set("select", "id,order_number,customer_name,customer_email,amount_total_thb,expires_at,payment_submitted_at,payment_proof_path,created_at,order_items(quantity,unit_price_thb,ticket_types(code,name))");
  query.set("status", "eq.awaiting_review");
  query.set("order", "created_at.asc");
  query.set("limit", "100");
  const records = await rest("orders?" + query.toString()) as Array<JsonObject>;
  return await Promise.all(records.map(async (order) => {
    const proofPath = text(order.payment_proof_path, 500);
    let proofUrl: string | null = null;
    if (proofPath) {
      try { proofUrl = await createSignedPaymentProofUrl(proofPath); } catch { proofUrl = null; }
    }
    const rawItems = Array.isArray(order.order_items) ? order.order_items as Array<JsonObject> : [];
    return {
      id: text(order.id, 64),
      order_number: text(order.order_number, 40),
      customer_name: text(order.customer_name, 150),
      customer_email: text(order.customer_email, 254),
      amount_total_thb: Number(order.amount_total_thb || 0),
      expires_at: text(order.expires_at, 50),
      payment_submitted_at: text(order.payment_submitted_at, 50),
      created_at: text(order.created_at, 50),
      has_proof: Boolean(proofPath),
      proof_url: proofUrl,
      items: rawItems.map((item) => {
        const type = item.ticket_types && typeof item.ticket_types === "object" ? item.ticket_types as JsonObject : {};
        return {
          ticket_type: text(type.name, 100) || text(type.code, 32),
          quantity: Number(item.quantity || 0),
          unit_price_thb: Number(item.unit_price_thb || 0),
        };
      }),
    };
  }));
}

async function adminReviewPaymentOrder(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const orderId = text(body.orderId, 64);
  const action = text(body.reviewAction, 16);
  const note = text(body.note, 500);
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(orderId)) throw new ApiError(400, "รหัสคำสั่งซื้อไม่ถูกต้อง");
  if (action !== "approve" && action !== "reject") throw new ApiError(400, "คำสั่งตรวจสอบไม่ถูกต้อง");
  if (action === "reject" && note.length < 5) {
    throw new ApiError(400, "กรุณาระบุเหตุผลก่อนปฏิเสธหลักฐานและคืนโควตา");
  }
  return await rpc("ticketing_review_order", {
    p_order_id: orderId,
    p_action: action,
    p_reviewer_id: admin.id,
    p_note: note || null,
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 6 * 1024 * 1024) throw new ApiError(413, "คำขอใหญ่เกินไป");

    const body = await request.json() as JsonObject;
    const action = text(body.action, 40);

    let result: unknown;
    switch (action) {
      case "catalog": {
        const query = new URLSearchParams();
        query.set("select", "id,code,name,description,price_thb,max_per_order,sales_start_at,sales_end_at,sort_order,ticket_inventory(capacity_total,quantity_sold,quantity_reserved)");
        query.set("is_active", "eq.true");
        query.set("order", "sort_order.asc");
        result = await rest("ticket_types?" + query.toString());
        break;
      }
      case "create-order":
        result = await createOrder(body);
        break;
      case "get-order":
        result = await getCustomerOrder(text(body.orderNumber, 40), text(body.lookupToken, 128));
        break;
      case "check-in":
        result = await checkInTicket(request, body);
        break;
      case "check-vehicle":
        result = await checkVehiclePass(request, body);
        break;
      case "admin-vehicles":
        result = await adminListVehiclePasses(request, body);
        break;
      case "assign-parking":
        result = await adminAssignVehicleParking(request, body);
        break;
      case "register-legacy-vehicle":
        result = await adminRegisterLegacyVehiclePass(request, body);
        break;
      case "admin-payment-reviews":
      case "review-payment-order":
        throw new ApiError(410, "ยกเลิกระบบตรวจสอบการชำระเงินแล้ว เนื่องจากงานนี้เปิดลงทะเบียนฟรี");
      default:
        throw new ApiError(400, "ไม่รู้จักคำสั่งที่ร้องขอ");
    }

    return Response.json({ data: result }, { status: 200, headers: { ...corsHeaders, "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const internalMessage = error instanceof Error ? error.message : "Unknown error";
    const message = error instanceof ApiError
      ? error.message
      : "ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่ภายหลัง";
    console.error("ticketing-api request failed:", { status, message: internalMessage });
    return Response.json({ error: message }, { status, headers: { ...corsHeaders, "Cache-Control": "no-store" } });
  }
});
