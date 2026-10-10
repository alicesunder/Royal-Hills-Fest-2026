const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, omise-signature, omise-signature-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

type JsonObject = Record<string, unknown>;

function readJsonObject(name: string): Record<string, string> {
  const raw = Deno.env.get(name);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

function serverConfig() {
  const url = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const keyMap = readJsonObject("SUPABASE_SECRET_KEYS");
  const secretKey = keyMap.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const omiseKey = (Deno.env.get("OMISE_SECRET_KEY") || "").trim();
  const webhookSecret = (Deno.env.get("OMISE_WEBHOOK_SECRET") || "").trim();
  if (!url || !secretKey) throw new Error("Supabase server configuration is missing");
  if (!omiseKey || !webhookSecret) throw new Error("Omise webhook configuration is missing");
  return { url, secretKey, omiseKey, webhookSecret };
}

function serverHeaders(secretKey: string, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { apikey: secretKey, ...extra };
  if (secretKey.startsWith("eyJ")) headers.Authorization = "Bearer " + secretKey;
  return headers;
}

async function responseJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function base64Bytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}

async function verifySignature(rawBody: string, request: Request, secretBase64: string) {
  const signatureHeader = request.headers.get("Omise-Signature") || "";
  const timestamp = request.headers.get("Omise-Signature-Timestamp") || "";
  if (!signatureHeader || !/^\d{10,13}$/.test(timestamp)) return false;

  const timestampMs = timestamp.length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;

  let secretBytes: Uint8Array;
  try { secretBytes = base64Bytes(secretBase64); } catch { return false; }
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = new TextEncoder().encode(timestamp + "." + rawBody);
  const expected = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, payload)));
  return signatureHeader.split(",").some((signature) => constantTimeEqual(signature.trim().toLowerCase(), expected));
}

async function omiseGetCharge(chargeId: string, secretKey: string) {
  const response = await fetch("https://api.omise.co/charges/" + encodeURIComponent(chargeId), {
    headers: {
      Authorization: "Basic " + btoa(secretKey + ":"),
      "Cache-Control": "no-store",
    },
  });
  const data = await responseJson(response) as JsonObject | null;
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error("Could not independently verify Omise charge");
  }
  return data;
}

async function completeProviderPayment(
  config: ReturnType<typeof serverConfig>,
  args: { orderNumber: string; chargeId: string; amount: number; currency: string },
) {
  const response = await fetch(config.url + "/rest/v1/rpc/ticketing_complete_provider_payment", {
    method: "POST",
    headers: serverHeaders(config.secretKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      p_order_number: args.orderNumber,
      p_provider_payment_id: args.chargeId,
      p_amount_subunits: args.amount,
      p_currency: args.currency,
    }),
  });
  const data = await responseJson(response);
  if (!response.ok) {
    console.error("Provider payment completion failed:", {
      status: response.status,
      orderNumber: args.orderNumber,
      chargeId: args.chargeId,
    });
    throw new Error("Database could not complete provider payment");
  }
  return data;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 512 * 1024) {
      return Response.json({ error: "Payload too large" }, { status: 413, headers: corsHeaders });
    }

    const config = serverConfig();
    const rawBody = await request.text();
    if (rawBody.length > 512 * 1024) {
      return Response.json({ error: "Payload too large" }, { status: 413, headers: corsHeaders });
    }
    if (!await verifySignature(rawBody, request, config.webhookSecret)) {
      return Response.json({ error: "Invalid webhook signature" }, { status: 401, headers: corsHeaders });
    }

    let event: JsonObject;
    try {
      event = JSON.parse(rawBody) as JsonObject;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
    }

    const eventType = String(event.key || event.type || "");
    if (eventType !== "charge.complete") {
      return Response.json({ received: true, ignored: true }, { status: 200, headers: corsHeaders });
    }

    const eventData = (event.data && typeof event.data === "object" ? event.data : {}) as JsonObject;
    const chargeId = String(eventData.id || "");
    if (!/^chrg_(test_)?[A-Za-z0-9]+$/.test(chargeId)) {
      return Response.json({ error: "Invalid charge ID" }, { status: 400, headers: corsHeaders });
    }

    // Never trust the webhook payload's payment status alone; fetch the charge from Opn.
    const charge = await omiseGetCharge(chargeId, config.omiseKey);
    if (charge.id !== chargeId || charge.status !== "successful" || charge.paid !== true) {
      return Response.json({ received: true, ignored: true }, { status: 200, headers: corsHeaders });
    }

    const metadata = (charge.metadata && typeof charge.metadata === "object" ? charge.metadata : {}) as JsonObject;
    const orderNumber = String(metadata.order_number || "");
    const source = (charge.source && typeof charge.source === "object" ? charge.source : {}) as JsonObject;
    const sourceType = String(source.type || "");
    const allowedSource = sourceType === "promptpay" || [
      "mobile_banking_kbank",
      "mobile_banking_scb",
      "mobile_banking_ktb",
      "mobile_banking_bbl",
      "mobile_banking_bay",
    ].includes(sourceType);

    if (!/^RHF26-[A-Z0-9]{6,20}$/.test(orderNumber) || !allowedSource) {
      console.error("Omise charge does not match the expected ticket payment format:", { chargeId });
      return Response.json({ error: "Unrecognized ticket payment" }, { status: 400, headers: corsHeaders });
    }

    const result = await completeProviderPayment(config, {
      orderNumber,
      chargeId,
      amount: Number(charge.amount || 0),
      currency: String(charge.currency || ""),
    });
    return Response.json({ received: true, result }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("omise-webhook failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Webhook processing failed" }, { status: 500, headers: corsHeaders });
  }
});
