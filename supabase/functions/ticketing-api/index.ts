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
    throw new ApiError(400, "กรุณาตรวจสอบเลขคำสั่งซื้อและรหัสติดตาม");
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

async function uploadProof(file: File, orderId: string) {
  const allowedTypes: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = allowedTypes[file.type];
  if (!extension) throw new ApiError(400, "รองรับไฟล์สลิป JPEG, PNG หรือ WebP เท่านั้น");
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new ApiError(400, "ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if ((file.type === "image/png" && !isPng) ||
      (file.type === "image/jpeg" && !isJpeg) ||
      (file.type === "image/webp" && !isWebp)) {
    throw new ApiError(400, "รูปแบบไฟล์ไม่ตรงกับชนิดภาพที่อัปโหลด");
  }

  const path = orderId + "/" + crypto.randomUUID() + "." + extension;
  const root = config().url;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const uploadResponse = await fetch(root + "/storage/v1/object/payment-proofs/" + encodedPath, {
    method: "POST",
    headers: serverHeaders({
      "Content-Type": file.type,
      "cache-control": "3600",
      "x-upsert": "false",
    }),
    body: bytes,
  });
  if (!uploadResponse.ok) {
    await responseJson(uploadResponse);
    throw new ApiError(uploadResponse.status >= 500 ? 503 : uploadResponse.status, "อัปโหลดหลักฐานการโอนไม่สำเร็จ กรุณาลองใหม่");
  }
  return path;
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
    if (!type || !type.is_active) throw new ApiError(409, "ขณะนี้ยังไม่เปิดขายบัตรออนไลน์ กรุณาติดต่อผู้จัดงาน");
    if ((type.sales_start_at && Date.parse(type.sales_start_at) > Date.now()) ||
        (type.sales_end_at && Date.parse(type.sales_end_at) <= Date.now())) {
      throw new ApiError(409, "บัตรประเภทนี้อยู่นอกช่วงเวลาจำหน่าย");
    }

    const quantity = integer(item.quantity, 1, 10);
    if (!quantity || quantity > type.max_per_order) throw new ApiError(400, "จำนวนบัตร " + type.name + " เกินข้อกำหนด");

    if (!Array.isArray(item.attendeeData) || item.attendeeData.length !== quantity) {
      throw new ApiError(400, "ข้อมูลผู้เข้าร่วมไม่ครบตามจำนวนบัตร");
    }

    const attendeeData = item.attendeeData.map((value: unknown) => {
      const data = (value && typeof value === "object" ? value : {}) as JsonObject;
      if (code === "tt-normal") {
        const attendeeName = text(data.attendeeName, 150);
        if (attendeeName.length < 2) throw new ApiError(400, "กรุณากรอกชื่อผู้เข้าร่วมบัตรปกติทุกใบ");
        return { attendeeName };
      }
      const attendeeNames = Array.isArray(data.attendeeNames)
        ? data.attendeeNames.slice(0, 6).map((entry) => text(entry, 150))
        : [];
      if (attendeeNames.length !== 6 || attendeeNames[0].length < 2) {
        throw new ApiError(400, "กรุณาระบุชื่อหัวหน้าโต๊ะ VIP และกรอกข้อมูลให้ครบ 6 ที่นั่ง");
      }
      return { attendeeNames };
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

  return {
    orderNumber: result.order_number,
    orderId: result.order_id,
    status: result.status,
    amountTotalThb: Number(result.amount_total_thb),
    expiresAt: result.expires_at,
    lookupToken,
    idempotentReplay: result.idempotent_replay === true,
    instructions: "โอนผ่าน QR PromptPay แล้วส่งสลิปเพื่อรอเจ้าหน้าที่ตรวจสอบ",
  };
}

async function submitProof(form: FormData) {
  const orderNumber = text(form.get("orderNumber"), 40);
  const lookupToken = text(form.get("lookupToken"), 128);
  const paymentReference = text(form.get("paymentReference"), 100);
  const file = form.get("proof");

  if (!(file instanceof File)) throw new ApiError(400, "กรุณาแนบสลิปการโอนเงิน");
  if (paymentReference.length < 4) throw new ApiError(400, "กรุณากรอกเลขอ้างอิงการโอนอย่างน้อย 4 ตัวอักษร");

  const customerData = await getCustomerOrder(orderNumber, lookupToken) as JsonObject;
  const order = (customerData.order || {}) as JsonObject;
  if (order.status !== "pending") throw new ApiError(409, "คำสั่งซื้อนี้ไม่ได้รอรับหลักฐานการโอนแล้ว");

  const path = await uploadProof(file, String(order.id));
  try {
    return await rpc("ticketing_submit_payment_proof", {
      p_order_number: orderNumber,
      p_lookup_token_hash: await hashHex(lookupToken),
      p_payment_reference: paymentReference,
      p_proof_path: path,
    });
  } catch (error) {
    const root = config().url;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    await fetch(root + "/storage/v1/object/payment-proofs/" + encodedPath, {
      method: "DELETE",
      headers: serverHeaders(),
    }).catch(() => undefined);
    throw error;
  }
}

async function adminQueue(request: Request) {
  const admin = await requireAdmin(request);
  const query = new URLSearchParams();
  query.set("select", "id,order_number,status,customer_name,customer_email,customer_phone,amount_total_thb,payment_reference,payment_proof_path,payment_submitted_at,created_at,order_items(quantity,unit_price_thb,line_total_thb,attendee_data,ticket_types(code,name))");
  query.set("status", "eq.awaiting_review");
  query.set("order", "payment_submitted_at.desc");
  query.set("limit", "100");
  const rows = await rest("orders?" + query.toString()) as Array<JsonObject>;
  const root = config().url;

  const orders = await Promise.all(rows.map(async (row) => {
    let proofUrl: string | null = null;
    const path = typeof row.payment_proof_path === "string" ? row.payment_proof_path : "";
    if (path) {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const signed = await fetch(root + "/storage/v1/object/sign/payment-proofs/" + encodedPath, {
        method: "POST",
        headers: serverHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn: 300 }),
      });
      const signedData = await responseJson(signed) as { signedURL?: string; signedUrl?: string } | null;
      const rawSignedPath = signedData?.signedURL || signedData?.signedUrl || "";
      if (signed.ok && rawSignedPath) {
        // Supabase Storage returns paths such as /object/sign/<bucket>/<path>?token=...
        // The SDK's storage base normally adds /storage/v1; when constructing a URL
        // manually, add that prefix or Storage responds with "requested path is invalid".
        if (/^https?:\/\//i.test(rawSignedPath)) {
          const absolute = new URL(rawSignedPath);
          const expectedOrigin = new URL(root).origin;
          if (absolute.origin === expectedOrigin && absolute.pathname.startsWith("/storage/v1/object/sign/")) {
            proofUrl = absolute.toString();
          }
        } else {
          const normalizedPath = rawSignedPath.startsWith("/storage/v1/")
            ? rawSignedPath
            : rawSignedPath.startsWith("/object/")
              ? "/storage/v1" + rawSignedPath
              : rawSignedPath.startsWith("object/")
                ? "/storage/v1/" + rawSignedPath
                : "";
          if (normalizedPath.startsWith("/storage/v1/object/sign/")) {
            proofUrl = new URL(normalizedPath, root).toString();
          }
        }
      }
    }
    const sanitized = { ...row };
    delete sanitized.payment_proof_path;
    return { ...sanitized, payment_proof_url: proofUrl };
  }));

  return { orders, adminEmail: admin.email };
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

async function reviewOrder(request: Request, body: JsonObject) {
  const admin = await requireAdmin(request);
  const orderId = text(body.orderId, 64);
  const reviewAction = text(body.reviewAction, 16);
  const note = text(body.note, 500);
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !["approve", "reject"].includes(reviewAction)) {
    throw new ApiError(400, "คำขอตรวจสอบรายการไม่ถูกต้อง");
  }
  return await rpc("ticketing_review_order", {
    p_order_id: orderId,
    p_action: reviewAction,
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

    const contentType = request.headers.get("content-type") || "";
    let action = "";
    let body: JsonObject = {};
    let form: FormData | null = null;

    if (contentType.includes("multipart/form-data")) {
      form = await request.formData();
      action = text(form.get("action"), 40);
    } else {
      body = await request.json() as JsonObject;
      action = text(body.action, 40);
    }

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
      case "submit-proof":
        if (!form) throw new ApiError(400, "รูปแบบข้อมูลหลักฐานไม่ถูกต้อง");
        result = await submitProof(form);
        break;
      case "get-order":
        result = await getCustomerOrder(text(body.orderNumber, 40), text(body.lookupToken, 128));
        break;
      case "admin-list":
        result = await adminQueue(request);
        break;
      case "admin-review":
        result = await reviewOrder(request, body);
        break;
      case "check-in":
        result = await checkInTicket(request, body);
        break;
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
