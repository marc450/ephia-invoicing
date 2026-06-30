import { SUPABASE_URL, SUPABASE_ANON_KEY, pgv } from "./client";

// Wertgutscheine (value vouchers). Schema mirrors documents/behandlungen:
//   data (encrypted ciphertext) + iv + encryption_version, scoped by user_id.
// Extra columns: `code` (plaintext serial, redemption lookup key) and
// `status` (plaintext, so the list can filter without bulk-decrypt).

export async function supabaseFetchVouchers(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vouchers?user_id=eq.${pgv(userId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Fetch vouchers failed");
  return data;
}

// Look up a single voucher by its plaintext code (redemption scanning).
// Returns the raw row (or null) — caller decrypts `data` with the MEK.
export async function supabaseFetchVoucherByCode(accessToken, userId, code) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vouchers?user_id=eq.${pgv(userId)}&code=eq.${pgv(code)}&limit=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Fetch voucher by code failed");
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function supabaseCreateVoucher(accessToken, userId, code, status, voucherData, iv, encryptionVersion) {
  const payload = { user_id: userId, code, status, data: voucherData };
  if (iv != null) payload.iv = iv;
  if (encryptionVersion != null) payload.encryption_version = encryptionVersion;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vouchers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error((Array.isArray(data) ? data[0]?.message : data.message) || "Create voucher failed");
  return Array.isArray(data) ? data[0] : data;
}

// Patch the encrypted blob and/or status (e.g. after redemption or storno-restore).
export async function supabaseUpdateVoucher(accessToken, voucherId, voucherData, iv, encryptionVersion, status) {
  const payload = {};
  if (voucherData != null) payload.data = voucherData;
  if (iv != null) payload.iv = iv;
  if (encryptionVersion != null) payload.encryption_version = encryptionVersion;
  if (status != null) payload.status = status;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vouchers?id=eq.${pgv(voucherId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update voucher failed");
  return data;
}

export async function supabaseDeleteVoucher(accessToken, voucherId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vouchers?id=eq.${pgv(voucherId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return res.ok;
}
