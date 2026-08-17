import { Router, type IRouter } from "express";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const piBackendModule = require("pi-backend");
const PiNetwork =
  typeof piBackendModule === "function"
    ? piBackendModule
    : typeof piBackendModule?.default === "function"
      ? piBackendModule.default
      : typeof piBackendModule?.PiNetwork === "function"
        ? piBackendModule.PiNetwork
        : null;

if (!PiNetwork) {
  throw new Error("Unable to load the Pi Network backend SDK constructor.");
}

const router: IRouter = Router();

type A2UType = "payout" | "refund";
interface A2URequest {
  bookingId?: string;
  amountPi?: number;
  providerPiUid?: string;
  providerWalletAddress?: string;
  clientPiUid?: string;
}

const getPiBackend = () => {
  const apiKey = process.env.PI_API_KEY?.trim();
  const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED?.trim();
  if (!apiKey) throw new Error("Server configuration error: PI_API_KEY missing.");
  if (!walletPrivateSeed) throw new Error("Server configuration error: PI_WALLET_PRIVATE_SEED missing.");
  return new PiNetwork(apiKey, walletPrivateSeed);
};

const normalizeUid = (uid: string) => uid.trim().replace(/^@/, "");

const describePiError = (err: any): { message: string; detail?: unknown } => {
  if (err?.isAxiosError) {
    const data = err.response?.data;
    const status = err.response?.status;
    const apiMessage = data?.error_message || data?.error || (typeof data === "string" ? data : undefined);
    return {
      message: apiMessage
        ? `Pi API error${status ? ` (${status})` : ""}: ${apiMessage}`
        : `Pi API request failed${status ? ` with status ${status}` : ""}: ${err.message}`,
      detail: data,
    };
  }

  const horizonExtras = err?.response?.data?.extras || err?.extras;
  if (horizonExtras?.result_codes) {
    const codes = horizonExtras.result_codes;
    const code = codes.operations?.[0] || codes.transaction || "unknown_error";
    return { message: `Pi blockchain transaction rejected: ${code}`, detail: horizonExtras };
  }

  return { message: err?.message || String(err) };
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
};

const lookupBookingClientUid = async (bookingId: string): Promise<string | null> => {
  const config = getSupabaseConfig();
  if (!config) return null;

  const response = await fetch(
    `${config.url}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=client_pi_uid&limit=1`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Supabase booking lookup failed (${response.status}).`);
  }

  const rows = (await response.json()) as Array<{ client_pi_uid?: string | null }>;
  return rows[0]?.client_pi_uid?.trim() || null;
};

const findExistingPayment = async (pi: any, bookingId: string, type: A2UType) => {
  const response = await pi.getIncompleteServerPayments();
  const payments = Array.isArray(response)
    ? response
    : Array.isArray(response?.incomplete_server_payments)
      ? response.incomplete_server_payments
      : [];

  return payments.find(
    (payment: any) =>
      payment?.metadata?.bookingId === bookingId &&
      payment?.metadata?.type === type,
  );
};

const executeA2U = async ({ bookingId, amountPi, uid, memo, type, req }: {
  bookingId: string;
  amountPi: number;
  uid: string;
  memo: string;
  type: A2UType;
  req: any;
}) => {
  const pi = getPiBackend();
  const cleanUid = normalizeUid(uid);
  if (!cleanUid) throw new Error("Pi recipient UID is required.");

  const existing = await findExistingPayment(pi, bookingId, type);
  if (existing) {
    const paymentId = existing.identifier;
    const existingTxid = existing.transaction?.txid;
    if (existingTxid) {
      throw new Error(`An incomplete payment for this ${type} already has a blockchain transaction (${existingTxid}). Resolve it before retrying.`);
    }
    req.log.warn({ bookingId, type, paymentId }, "Found existing incomplete A2U payment; refusing duplicate");
    throw new Error(`An incomplete ${type} payment already exists for this booking (payment ${paymentId}). Resolve that payment before retrying.`);
  }

  let paymentId: string;
  try {
    paymentId = await pi.createPayment({ amount: Number(amountPi), memo, metadata: { bookingId, type }, uid: cleanUid });
  } catch (err) {
    const { message, detail } = describePiError(err);
    req.log.error({ err: detail ?? err, bookingId, type }, `Pi A2U payment creation failed: ${message}`);
    throw new Error(message);
  }
  if (!paymentId) throw new Error("Pi Network did not return a payment identifier.");

  let txid: string;
  try {
    txid = await pi.submitPayment(paymentId);
  } catch (err) {
    const { message, detail } = describePiError(err);
    req.log.error({ err: detail ?? err, bookingId, type, paymentId }, `Pi A2U blockchain submission failed: ${message}`);
    throw new Error(message);
  }
  if (!txid) throw new Error(`Pi Network did not return a transaction ID for ${type}.`);

  try {
    await pi.completePayment(paymentId, txid);
  } catch (err) {
    const { message, detail } = describePiError(err);
    req.log.error({ err: detail ?? err, bookingId, type, paymentId, txid }, `Pi A2U payment completion failed: ${message}`);
    throw new Error(message);
  }

  return { paymentId, txid };
};

router.post("/pi/payouts/release", async (req, res) => {
  const { bookingId, amountPi, providerPiUid, providerWalletAddress } = req.body as A2URequest;
  if (!bookingId || typeof bookingId !== "string" || !bookingId.trim()) return void res.status(400).json({ error: "bookingId is required." });
  if (typeof amountPi !== "number" || !Number.isFinite(amountPi) || amountPi <= 0) return void res.status(400).json({ error: "amountPi must be a positive number." });
  if (!providerPiUid || typeof providerPiUid !== "string" || !providerPiUid.trim()) return void res.status(400).json({ error: "providerPiUid is required." });

  try {
    const result = await executeA2U({ bookingId: bookingId.trim(), amountPi, uid: providerPiUid, memo: `Escrow payout for booking ${bookingId.trim()}`, type: "payout", req });
    res.status(200).json({ success: true, txid: result.txid, paymentId: result.paymentId, providerWalletAddress: providerWalletAddress || undefined });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "A2U payout failed");
    res.status(500).json({ error: err?.message || "Failed to process Pi A2U payout." });
  }
});

router.post("/pi/payouts/refund", async (req, res) => {
  const { bookingId, amountPi, clientPiUid } = req.body as A2URequest;
  if (!bookingId || typeof bookingId !== "string" || !bookingId.trim()) return void res.status(400).json({ error: "bookingId is required." });
  if (typeof amountPi !== "number" || !Number.isFinite(amountPi) || amountPi <= 0) return void res.status(400).json({ error: "amountPi must be a positive number." });

  try {
    // The provider UI historically sent clientPiUsername in this field. Never trust that as a Pi UID.
    // Resolve the authoritative UID stored on the booking first.
    const storedClientPiUid = await lookupBookingClientUid(bookingId.trim());
    const requestLooksLikeUid = typeof clientPiUid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientPiUid.trim());
    const resolvedClientPiUid = storedClientPiUid || (requestLooksLikeUid ? clientPiUid!.trim() : null);

    if (!resolvedClientPiUid) {
      return void res.status(409).json({ error: "Client Pi UID is missing from this booking. The refund cannot be sent safely." });
    }

    req.log.info({ bookingId, clientPiUidSource: storedClientPiUid ? "booking" : "validated_request" }, "Resolved Pi refund recipient UID");

    const result = await executeA2U({
      bookingId: bookingId.trim(),
      amountPi,
      uid: resolvedClientPiUid,
      memo: `Refund for booking ${bookingId.trim()}`,
      type: "refund",
      req,
    });
    res.status(200).json({ success: true, txid: result.txid, paymentId: result.paymentId });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "A2U refund failed");
    res.status(500).json({ error: err?.message || "Failed to process Pi A2U refund." });
  }
});

export default router;
