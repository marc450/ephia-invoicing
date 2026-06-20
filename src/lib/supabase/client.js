export const SUPABASE_URL = "https://grfngjgjiipbgntsduom.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZm5namdqaWlwYmdudHNkdW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQ0MTgsImV4cCI6MjA4Nzk2MDQxOH0.zXQPceMagDNR4JcAz7f4PkywClG0CLBKrdrOpOeliTU";

// Encode a value before interpolating it into a PostgREST filter (e.g. `id=eq.${pgv(id)}`).
// Prevents query-param / operator injection if a value is ever attacker-influenced.
// UUIDs and emails pass through unchanged, so this is behaviour-preserving for valid input.
export const pgv = (v) => encodeURIComponent(v);
