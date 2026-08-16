import { Router, type IRouter } from "express";
import PiNetwork from "pi-backend";

const router: IRouter = Router();

type A2UType = "payout" | "refund";
interface A2URequest { bookingId?: string; amountPi?: number; providerPiUid?: string; providerWalletAddress?: string; clientPiUid?: string; }

const getPiBackend = () => {
  const apiKey = process.env.PI_API_KEY?.trim();
  const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED?.trim();
  if (!apiKey) throw new Error("Server configuration error: PI_API_KEY missing.");
  if (!walletPrivateSeed) throw new Error("Server configuration error: PI_WALLET_PRIVATE_SEED missing.");
  return new PiNetwork(apiKey, walletPrivateSeed);
};
const normalizeUid = (uid: string) => uid.trim().replace(/^@/, "");

const findExistingPayment = async (pi: PiNetwork, bookingId: string, type: A2UType) => {
  const payments = await pi.getIncompleteServerPayments();
  return payments.find((payment: any) => payment?.metadata?.bookingId === bookingId && payment?.metadata?.type === type);
};

const executeA2U = async ({ bookingId, amountPi, uid, memo, type, req }: { bookingId: string; amountPi: number; uid: string; memo: string; type: A2UType; req: any; }) => {
  const pi = getPiBackend();
  const cleanUid = normalizeUid(uid);
  if (!cleanUid) throw new Error("Pi recipient UID is required.");

  const existing = await findExistingPayment(pi, bookingId, type);
  if (existing) {
    const paymentId = existing.identifier;
    const existingTxid = existing.transaction?.txid;
    if (existingTxid) throw new Error(`An incomplete payment for this ${type} already has a blockchain transaction (${existingTxid}). Resolve it before retrying.`);
    req.log.warn({ bookingId, type, paymentId }, "Found existing incomplete A2U payment; refusing duplicate");
    throw new Error(`An incomplete ${type} payment already exists for this booking (payment ${paymentId}). Resolve that payment before retrying.`);
  }

  const paymentId = await pi.createPayment({ amount: Number(amountPi), memo, metadata: { bookingId, type }, uid: cleanUid });
  if (!paymentId) throw new Error("Pi Network did not return a payment identifier.");
  let txid: string;
  try { txid = await pi.submitPayment(paymentId); }
  catch (err) { req.log.error({ err, bookingId, type, paymentId }, "Pi A2U blockchain submission failed"); throw err; }
  if (!txid) throw new Error(`Pi Network did not return a transaction ID for ${type}.`);
  await pi.completePayment(paymentId, txid);
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
  } catch (err: any) { req.log.error({ err, bookingId }, "A2U payout failed"); res.status(500).json({ error: err?.message || "Failed to process Pi A2U payout." }); }
});

router.post("/pi/payouts/refund", async (req, res) => {
  const { bookingId, amountPi, clientPiUid } = req.body as A2URequest;
  if (!bookingId || typeof bookingId !== "string" || !bookingId.trim()) return void res.status(400).json({ error: "bookingId is required." });
  if (typeof amountPi !== "number" || !Number.isFinite(amountPi) || amountPi <= 0) return void res.status(400).json({ error: "amountPi must be a positive number." });
  if (!clientPiUid || typeof clientPiUid !== "string" || !clientPiUid.trim()) return void res.status(400).json({ error: "clientPiUid is required." });
  try {
    const result = await executeA2U({ bookingId: bookingId.trim(), amountPi, uid: clientPiUid, memo: `Refund for booking ${bookingId.trim()}`, type: "refund", req });
    res.status(200).json({ success: true, txid: result.txid, paymentId: result.paymentId });
  } catch (err: any) { req.log.error({ err, bookingId }, "A2U refund failed"); res.status(500).json({ error: err?.message || "Failed to process Pi A2U refund." }); }
});

export default router;
