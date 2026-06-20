import { SUPABASE_URL, SUPABASE_ANON_KEY, pgv } from "./client";

export async function supabaseDeletePatient(accessToken, patientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?id=eq.${pgv(patientId)}`,
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
    `${SUPABASE_URL}/rest/v1/patients?user_id=eq.${pgv(userId)}`,
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
