import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";

export async function supabaseFetchDocuments(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?user_id=eq.${userId}`,
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
  if (!res.ok) throw new Error(data.message || "Fetch documents failed");
  return data;
}

export async function supabaseCreateDocument(accessToken, userId, patientId, behandlungId, docType, docData, iv, encryptionVersion, legacyInvoiceId) {
  const payload = { user_id: userId, doc_type: docType, data: docData };
  if (patientId != null) payload.patient_id = patientId;
  if (behandlungId != null) payload.behandlung_id = behandlungId;
  if (iv != null) payload.iv = iv;
  if (encryptionVersion != null) payload.encryption_version = encryptionVersion;
  if (legacyInvoiceId != null) payload.legacy_invoice_id = legacyInvoiceId;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents`,
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
  if (!res.ok) throw new Error(data.message || "Create document failed");
  return Array.isArray(data) ? data[0] : data;
}

export async function supabaseUpdateDocument(accessToken, documentId, docData, iv, encryptionVersion) {
  const payload = { data: docData };
  if (iv != null) payload.iv = iv;
  if (encryptionVersion != null) payload.encryption_version = encryptionVersion;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}`,
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
  if (!res.ok) throw new Error(data.message || "Update document failed");
  return data;
}

export async function supabaseDeleteDocument(accessToken, documentId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}`,
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

export async function supabaseUpdateDocumentBehandlung(accessToken, documentId, behandlungId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ behandlung_id: behandlungId }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update document behandlung failed");
  return data;
}
