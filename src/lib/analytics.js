import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/client";

export function trackEvent(eventName, metadata = {}, accessToken = null) {
  try {
    const payload = {
      event_name: eventName,
      metadata,
      created_at: new Date().toISOString(),
    };
    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }).catch(() => {}); // Fire-and-forget, never block UI
  } catch (_) {
    // Analytics should never crash the app
  }
}
