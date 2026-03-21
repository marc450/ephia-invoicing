import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";

export async function supabaseDeletePatient(accessToken, patientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}`,
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

export async function supabaseFetchPatients(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?user_id=eq.${userId}`,
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
  if (!res.ok) throw new Error(data.message || "Fetch patients failed");
  return data;
}

export async function supabaseUpsertPatient(accessToken, userId, patientData) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Prefer": "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: userId,
        email: patientData.email.toLowerCase().trim(),
        data: patientData,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upsert patient failed");
  return Array.isArray(data) ? data[0] : data;
}
