import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";

export async function supabaseFetchProfiles(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
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
  if (!res.ok) throw new Error(data.message || "Fetch profiles failed");
  return data;
}

export async function supabaseUpdateProfile(accessToken, userId, practiceData) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ practice_data: practiceData }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update profile failed");
  return data;
}
