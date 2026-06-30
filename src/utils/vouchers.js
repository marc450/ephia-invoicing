// Wertgutschein (value voucher) domain logic — pure functions over the
// DECRYPTED voucher object. The Supabase/crypto plumbing lives elsewhere;
// these functions never touch the network.
//
// Decrypted voucher shape (stored encrypted in vouchers.data):
//   {
//     nennwert:      number,   // original face value in EUR
//     restwert:      number,   // remaining balance in EUR
//     gueltigBis:    string,   // ISO date "YYYY-MM-DD" (validity end)
//     issuedAt:      string,   // ISO date the voucher was sold
//     purchaserName?: string,  // who bought it (optional)
//     purchaserEmail?: string,
//     anlass?:       string,   // free-text occasion ("Geschenk", etc.)
//     redemptions: [ { invoiceId, betrag, datum } ]  // consumption ledger
//   }
// The `code` and `status` live in plaintext columns, not in this object.

export const VOUCHER_STATUS = {
  AKTIV: "aktiv",
  TEIL: "teil_eingeloest",
  EINGELOEST: "eingeloest",
  STORNIERT: "storniert",
  ABGELAUFEN: "abgelaufen",
};

// Unambiguous alphabet — no 0/O/1/I/L to avoid hand-keying mistakes.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSuffix(len = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

// Build a human-friendly, collision-resistant code: GS-2026-0007-7K3F
// `seq` is the per-year running number (caller derives it from existing codes);
// the random suffix guards against races and guessing.
export function generateVoucherCode(year, seq) {
  const yr = String(year);
  const seqStr = String(seq).padStart(4, "0");
  return `GS-${yr}-${seqStr}-${randomSuffix(4)}`;
}

// Next sequence number for a given year, from the list of existing plaintext codes.
export function nextVoucherSeq(existingCodes, year) {
  const prefix = `GS-${year}-`;
  let max = 0;
  for (const code of existingCodes || []) {
    if (typeof code !== "string" || !code.startsWith(prefix)) continue;
    const m = code.slice(prefix.length).match(/^(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Construct a fresh voucher data object (decrypted form).
export function createVoucherObject({ nennwert, gueltigBis, issuedAt, purchaserName = "", purchaserEmail = "", anlass = "" }) {
  const value = round2(Number(nennwert) || 0);
  return {
    nennwert: value,
    restwert: value,
    gueltigBis: gueltigBis || "",
    issuedAt: issuedAt || "",
    purchaserName,
    purchaserEmail,
    anlass,
    redemptions: [],
  };
}

// Derive the plaintext status column from a voucher's current state.
// `today` is an ISO "YYYY-MM-DD" string (caller passes it; keeps this pure/testable).
export function computeStatus(voucher, today) {
  if (voucher._storniert) return VOUCHER_STATUS.STORNIERT;
  const rest = round2(voucher.restwert || 0);
  if (voucher.gueltigBis && today && voucher.gueltigBis < today && rest > 0) {
    return VOUCHER_STATUS.ABGELAUFEN;
  }
  if (rest <= 0) return VOUCHER_STATUS.EINGELOEST;
  if (rest < round2(voucher.nennwert || 0)) return VOUCHER_STATUS.TEIL;
  return VOUCHER_STATUS.AKTIV;
}

// Why a voucher can't currently be redeemed — returns a reason key or null if OK.
export function redeemBlockReason(voucher, today) {
  if (!voucher) return "not_found";
  if (voucher._storniert) return "storniert";
  if (round2(voucher.restwert || 0) <= 0) return "eingeloest";
  if (voucher.gueltigBis && today && voucher.gueltigBis < today) return "abgelaufen";
  return null;
}

// Apply a voucher to an invoice. Pure: returns the amount applied and a NEW
// voucher object; does not mutate the input. `gesamt` is the invoice gross total.
// Applied = min(restwert, gesamt). Appends to the redemption ledger.
export function applyRedemption(voucher, { invoiceId, gesamt, datum }) {
  const rest = round2(voucher.restwert || 0);
  const applied = round2(Math.min(rest, Math.max(0, Number(gesamt) || 0)));
  const updated = {
    ...voucher,
    restwert: round2(rest - applied),
    redemptions: [...(voucher.redemptions || []), { invoiceId, betrag: applied, datum }],
  };
  return { applied, voucher: updated };
}

// Reverse the redemption tied to one invoice (storno / invoice delete).
// Re-credits exactly that invoice's betrag and drops its ledger entry, so a
// partially-used voucher restores correctly. Idempotent: removing an entry that
// isn't there is a no-op. Returns { restored, voucher }.
export function restoreRedemption(voucher, invoiceId) {
  const entries = voucher.redemptions || [];
  const idx = entries.findIndex((r) => r.invoiceId === invoiceId);
  if (idx === -1) return { restored: 0, voucher };
  const restored = round2(entries[idx].betrag || 0);
  const remaining = entries.filter((_, i) => i !== idx);
  const updated = {
    ...voucher,
    restwert: round2((voucher.restwert || 0) + restored),
    redemptions: remaining,
  };
  return { restored, voucher: updated };
}
