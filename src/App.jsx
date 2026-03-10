import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ═══════════════════ Supabase Configuration ═══════════════════

const SUPABASE_URL = "https://grfngjgjiipbgntsduom.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZm5namdqaWlwYmdudHNkdW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQ0MTgsImV4cCI6MjA4Nzk2MDQxOH0.zXQPceMagDNR4JcAz7f4PkywClG0CLBKrdrOpOeliTU";

// ═══════════════════ Supabase Auth Helpers ═══════════════════

async function supabaseSignUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Signup failed");
  return data;
}

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.message || "Login failed");
  return data;
}

async function supabaseSignOut(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return res.ok;
}

async function supabaseResetPassword(email) {
  // Store code verifier for PKCE flow
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  sessionStorage.setItem("ephia_pkce_verifier", codeVerifier);

  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      redirect_to: "https://invoicing.ephia.de/",
      code_challenge: codeChallenge,
      code_challenge_method: "s256",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || data.error || "Passwort-Reset fehlgeschlagen");
  return data;
}

function generateCodeVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function supabaseGetUser(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Get user failed");
  return data;
}

async function supabaseRefreshToken(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Token refresh failed");
  return data;
}

async function supabaseFetchProfiles(accessToken, userId) {
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

async function supabaseUpdateProfile(accessToken, userId, practiceData) {
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

async function supabaseFetchInvoices(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/invoices?user_id=eq.${userId}`,
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
  if (!res.ok) throw new Error(data.message || "Fetch invoices failed");
  return data;
}

async function supabaseCreateInvoice(accessToken, userId, invoiceData, iv, encryptionVersion) {
  const payload = { user_id: userId, data: invoiceData };
  if (iv != null) payload.iv = iv;
  if (encryptionVersion != null) payload.encryption_version = encryptionVersion;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/invoices`,
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
  if (!res.ok) throw new Error(data.message || "Create invoice failed");
  return Array.isArray(data) ? data[0] : data;
}

async function supabaseUpdateInvoice(accessToken, invoiceId, invoiceData, iv, encryptionVersion) {
  const payload = { data: invoiceData };
  if (iv != null) payload.iv = iv;
  if (encryptionVersion != null) payload.encryption_version = encryptionVersion;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/invoices?id=eq.${invoiceId}`,
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
  if (!res.ok) throw new Error(data.message || "Update invoice failed");
  return data;
}

async function supabaseDeleteInvoice(accessToken, invoiceId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/invoices?id=eq.${invoiceId}`,
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

async function supabaseDeletePatient(accessToken, patientId) {
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

// ═══════════════════ Supabase Patient Helpers ═══════════════════

async function supabaseFetchPatients(accessToken, userId) {
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

async function supabaseUpsertPatient(accessToken, userId, patientData) {
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

// ═══════════════════ Analytics ═══════════════════

function trackEvent(eventName, metadata = {}, accessToken = null) {
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

// ═══════════════════ E2EE Crypto Helpers ═══════════════════

const MEK_SESSION_KEY = "ephia_mek";
let currentMEK = null; // Module-level: holds CryptoKey during session

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(str) {
  const binary = atob(str);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function derivePDK(password, saltBase64, iterations = 100000) {
  const enc = new TextEncoder();
  const salt = base64ToBuf(saltBase64);
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

async function generateMEK() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function generateRecoveryKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["wrapKey", "unwrapKey"]);
}

function generateSalt() {
  return bufToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

async function wrapMEK(mek, wrappingKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey("raw", mek, wrappingKey, { name: "AES-GCM", iv });
  return { encrypted: bufToBase64(wrapped), iv: bufToBase64(iv.buffer) };
}

async function unwrapMEK(encryptedBase64, ivBase64, unwrappingKey) {
  const encrypted = base64ToBuf(encryptedBase64);
  const iv = base64ToBuf(ivBase64);
  return crypto.subtle.unwrapKey("raw", encrypted, unwrappingKey, { name: "AES-GCM", iv }, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function encryptData(obj, mek) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, mek, plaintext);
  return { ciphertext: bufToBase64(ciphertext), iv: bufToBase64(iv.buffer) };
}

async function decryptData(ciphertextBase64, ivBase64, mek) {
  const ciphertext = base64ToBuf(ciphertextBase64);
  const iv = base64ToBuf(ivBase64);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, mek, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function computePatientHash(identifier, mek) {
  // identifier can be email or "vorname|nachname" fallback
  const enc = new TextEncoder();
  const mekRaw = await crypto.subtle.exportKey("raw", mek);
  const hmacKey = await crypto.subtle.importKey("raw", mekRaw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(identifier.toLowerCase().trim()));
  return bufToBase64(signature);
}
function getPatientIdentifier(patientData) {
  if (patientData.email && patientData.email.trim()) return patientData.email.toLowerCase().trim();
  return `${(patientData.vorname || "").trim()}|${(patientData.nachname || "").trim()}`.toLowerCase();
}

async function exportMEKToBase64(mek) {
  const raw = await crypto.subtle.exportKey("raw", mek);
  return bufToBase64(raw);
}

async function importMEKFromBase64(b64) {
  const raw = base64ToBuf(b64);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

function storeMEKInSession(mekBase64) {
  try { sessionStorage.setItem(MEK_SESSION_KEY, mekBase64); } catch (e) { /* ignore */ }
}

function loadMEKFromSession() {
  try { return sessionStorage.getItem(MEK_SESSION_KEY); } catch (e) { return null; }
}

function clearMEKFromSession() {
  try { sessionStorage.removeItem(MEK_SESSION_KEY); } catch (e) { /* ignore */ }
}

// ═══════════════════ Constants ═══════════════════

const PUNKTWERT = 0.0582873; // GOÄ standard

const BOTOX_GOA_ITEMS = [
  { goaCode: "1", description: "Beratung, auch mittels Fernsprecher", punkte: 80, steigerung: 2.3, info: "Abrechnung der ärztlichen Beratung (auch telefonisch), wenn das Gespräch kürzer als 10 Minuten dauert. Regelhöchstsatz: 2,3-fach (10,72 €). Höchstsatz: 3,5-fach (16,32 €). Wird einmal pro Behandlungsfall (Kalendermonat) angesetzt." },
  { goaCode: "5", description: "Symptombezogene Untersuchung", punkte: 80, steigerung: 2.3, info: "Einfache, symptombezogene Untersuchung vor der Behandlung. In der ästhetischen Medizin üblich zur Bewertung des aktuellen Hautzustands und Festlegung der Behandlung. Regelhöchstsatz: 2,3-fach (10,72 €). Höchstsatz: 3,5-fach (16,32 €)." },
  { goaCode: "267", description: "Medikamentöse Infiltrationsbehandlung je Sitzung", punkte: 80, steigerung: 3.5, info: "Abrechnung der eigentlichen Botulinum-Injektion. Der Steigerungssatz wird automatisch berechnet, wenn ein gewünschter Gesamtbetrag angegeben wird. Einfachsatz: 4,66 €. Regelhöchstsatz: 3,5-fach (16,32 €). Über 3,5-fach: Honorarvereinbarung nach §2 GOÄ erforderlich." },
];

// GOÄ Zuschläge relevant to GOÄ 1 and 5 (Beratungen/Untersuchungen), excluding children (K1/K2)
// Zuschläge are "nicht steigerbar" (fixed factor 1.0)
const ZUSCHLAEGE = [
  { code: "A", label: "Zuschlag A: außerhalb der Sprechstunde", description: "Zuschlag A nach GOÄ Abschnitt B, außerhalb der Sprechstunde", punkte: 70, appliesTo: ["1", "3", "5"], info: "Für Leistungen, die außerhalb der regulären Sprechstundenzeit erbracht werden." },
  { code: "B", label: "Zuschlag B: 20 bis 22 Uhr oder 6 bis 8 Uhr", description: "Zuschlag B nach GOÄ Abschnitt B, 20 bis 22 Uhr oder 6 bis 8 Uhr", punkte: 180, appliesTo: ["1", "3", "5"], info: "Für Leistungen außerhalb der Sprechstunde zwischen 20 und 22 Uhr oder 6 und 8 Uhr." },
  { code: "C", label: "Zuschlag C: 22 bis 6 Uhr (Nacht)", description: "Zuschlag C nach GOÄ Abschnitt B, 22 bis 6 Uhr (Nacht)", punkte: 320, appliesTo: ["1", "3", "5"], info: "Für Leistungen, die in der Nacht zwischen 22 und 6 Uhr erbracht werden." },
  { code: "D", label: "Zuschlag D: Sa, So & Feiertage", description: "Zuschlag D nach GOÄ Abschnitt B, Sa, So & Feiertage", punkte: 220, appliesTo: ["1", "3", "5"], info: "Für Leistungen an Samstagen, Sonn- oder Feiertagen." },
];

const SACHKOSTEN_INFO = `Folgende Materialien dürfen nach GOÄ § 10 nicht an Patient:innen weiterverrechnet werden:

• Kleinmaterialien wie Zellstoff, Mulltupfer, Schnellverbandmaterial, Verbandspray, Gewebeklebstoff auf Histoacrylbasis, Mullkompressen, Holzspatel, Holzstäbchen, Wattestäbchen, Gummifingerlinge
• Reagenzien und Narkosemittel zur Oberflächenanästhesie
• Desinfektions- und Reinigungsmittel
• Augen-, Ohren-, Nasentropfen, Puder, Salben und geringwertige Arzneimittel zur sofortigen Anwendung sowie für
• Folgende Einmalartikel: Einmalspritzen, Einmalkanülen, Einmalhandschuhe, Einmalharnblasenkatheter, Einmalskalpelle, Einmalproktoskope, Einmaldarmrohre, Einmalspekula

Diese Liste ist abschließend.`;


const DEFAULT_PRACTICE = {
  name: "",
  address1: "",
  address2: "",
  address3: "",
  phone: "",
  email: "",
  bankName: "",
  iban: "",
  bic: "",
  paypal: "",
  kleinunternehmer: false,
  autoLogoutEnabled: true,
  logo: "",
  city: "",
  zahlungsfrist: 14,
  praeparate: [],
};

const AUTO_LOGOUT_MS = 15 * 60 * 1000; // 15 minutes

const ICD10_CODES = [
  { diagnosis: "Bruxismus", icd10: "F45.8", keywords: ["bruxismus","zähneknirschen","zähnepressen","masseter","kieferpressen"], description: "Unwillkürliches Zähnepressen oder -knirschen, häufig mit Schmerzen im Kiefer oder vergrößertem Masseter-Muskel." },
  { diagnosis: "Schlafbruxismus", icd10: "G47.8", keywords: ["schlafbruxismus","bruxismus schlaf","nächtliches knirschen"], description: "Bruxismus, der hauptsächlich während des Schlafs auftritt." },
  { diagnosis: "Hyperhidrose", icd10: "R61", keywords: ["hyperhidrose","schwitzen","übermäßiges schwitzen"], description: "Übermäßiges Schwitzen, z. B. an Achseln, Händen, Füßen oder Stirn." },
  { diagnosis: "Chronische Migräne", icd10: "G43.7", keywords: ["migräne","chronische migräne","starke kopfschmerzen"], description: "Wiederkehrende starke Kopfschmerzen, häufig einseitig, oft mit Übelkeit." },
  { diagnosis: "Migräne mit Aura", icd10: "G43.1", keywords: ["migräne aura","aura migräne","sehstörungen migräne"], description: "Migräneattacken mit neurologischen Vorzeichen wie Sehstörungen." },
  { diagnosis: "Migräne ohne Aura", icd10: "G43.0", keywords: ["migräne ohne aura"], description: "Migräneattacken ohne neurologische Vorboten." },
  { diagnosis: "Spannungskopfschmerz", icd10: "G44.2", keywords: ["spannungskopfschmerz","kopfschmerz spannung","druck kopfschmerz"], description: "Dumpfer, drückender Kopfschmerz, meist beidseitig." },
  { diagnosis: "Muskulärer Hartspann", icd10: "M62.8", keywords: ["hartspann","muskelhartspann","muskelverspannung","muskelspasmus"], description: "Dauerhafte Muskelverspannung oder übermäßige Muskelaktivität." },
  { diagnosis: "Blepharospasmus", icd10: "G24.5", keywords: ["blepharospasmus","lidkrampf","augenlidkrampf"], description: "Unwillkürliche, wiederholte Krämpfe der Augenlidmuskulatur." },
  { diagnosis: "Hemifazialer Spasmus", icd10: "G51.3", keywords: ["hemifazialer spasmus","gesichtszucken","einseitiger gesichtskrampf"], description: "Unwillkürliche Muskelzuckungen einer Gesichtshälfte." },
  { diagnosis: "Dystonie", icd10: "G24.9", keywords: ["dystonie","muskelkrampf","unwillkürliche muskelbewegung"], description: "Unwillkürliche Muskelkontraktionen, die zu abnormalen Bewegungen führen." },
];

const FACE_IMAGE_B64 = "data:image/png;base64,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";

const PRIORITY_COUNTRIES = ["Deutschland", "Österreich", "Schweiz", "Dänemark", "Frankreich", "Polen"];
const OTHER_COUNTRIES = [
  "Belgien", "Bulgarien", "Estland", "Finnland", "Griechenland", "Irland", "Italien",
  "Kroatien", "Lettland", "Litauen", "Luxemburg", "Malta", "Niederlande", "Portugal",
  "Rumänien", "Schweden", "Slowakei", "Slowenien", "Spanien", "Tschechien", "Ungarn", "Zypern",
  "Großbritannien", "Norwegen", "Liechtenstein", "Island", "Türkei", "USA", "Kanada", "Australien",
  "Brasilien", "China", "Indien", "Japan", "Mexiko", "Russland", "Südkorea", "Vereinigte Arabische Emirate",
];

// ═══════════════════ Helpers ═══════════════════

function calcGoaBetrag(punkte, steigerung) {
  return Math.round(punkte * PUNKTWERT * steigerung * 100) / 100;
}

function fmt(val) {
  return val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsePlzOrt(address2) {
  if (!address2) return { plz: "", ort: "" };
  // Match leading digits (any length, to support partial typing) followed by optional separator and city
  const m = address2.match(/^(\d+)\s*,?\s*(.*)$/);
  if (m) return { plz: m[1], ort: m[2] };
  return { plz: "", ort: address2 };
}
function combinePlzOrt(plz, ort) {
  if (plz && ort) return `${plz} ${ort}`;
  return plz || ort || "";
}

// Flash animation on auto-filled Ort input
function flashOrtField(inputEl) {
  if (!inputEl) return;
  inputEl.classList.remove("plz-autofilled");
  void inputEl.offsetWidth; // force reflow to restart animation
  inputEl.classList.add("plz-autofilled");
}

// Auto-lookup city name from German PLZ via free API
const plzCache = {};
async function lookupPlz(plz) {
  if (!plz || plz.length !== 5 || !/^\d{5}$/.test(plz)) return null;
  if (plzCache[plz] !== undefined) return plzCache[plz];
  try {
    const res = await fetch(`https://api.zippopotam.us/de/${plz}`);
    if (!res.ok) { plzCache[plz] = null; return null; }
    const data = await res.json();
    const place = data.places?.[0]?.["place name"] || null;
    plzCache[plz] = place;
    return place;
  } catch { plzCache[plz] = null; return null; }
}

function fmtPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d+]/g, "");
  // +49 format: +49 XXX XXXX XXXX
  if (digits.startsWith("+49") && digits.length >= 12) {
    const rest = digits.slice(3);
    // Mobile (15x, 16x, 17x): +49 1XX XXXX XXXX
    if (rest.startsWith("1")) return `+49 ${rest.slice(0, 3)} ${rest.slice(3, 7)} ${rest.slice(7)}`.trim();
    // Landline: +49 XX XXXX XXXX or +49 XXX XXXX XXX
    return `+49 ${rest.slice(0, 2)} ${rest.slice(2, 6)} ${rest.slice(6)}`.trim();
  }
  // 0-prefix: 0XXX XXXX XXXX
  if (digits.startsWith("0") && digits.length >= 10) {
    if (digits.startsWith("01")) return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`.trim();
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`.trim();
  }
  // Other international: group in chunks of 4 after country code
  if (digits.startsWith("+") && digits.length > 6) {
    const cc = digits.match(/^\+\d{1,3}/)?.[0] || "";
    const rest = digits.slice(cc.length);
    return `${cc} ${rest.replace(/(\d{4})(?=\d)/g, "$1 ")}`.trim();
  }
  return phone; // Return as-is if no pattern matched
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseDE(str) {
  if (!str || str === "" || str === "," || str === "-") return 0;
  const cleaned = str.replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Evaluate simple math expressions in amount fields, e.g. "6 x 3", "6*3", "6×3", "2x3x4"
function evalAmount(str) {
  if (!str || typeof str !== "string") return parseFloat(String(str || "0").replace(",", ".")) || 0;
  const s = str.trim().replace(/,/g, ".");
  // Split on multiplication operators: x, X, ×, *
  const parts = s.split(/\s*[xX×*]\s*/);
  if (parts.length > 1) {
    return parts.reduce((acc, p) => {
      const v = parseFloat(p);
      return isNaN(v) ? acc : acc * v;
    }, 1);
  }
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function fmtUnits(markers) {
  const total = Math.round(markers.reduce((s, m) => s + evalAmount(m.amount), 0) * 100) / 100;
  return total % 1 === 0 ? total.toString() : total.toFixed(2).replace(/0+$/, "").replace(".", ",");
}

// Detect pattern in invoice number and suggest the next one
// e.g. "RE-0003" → "RE-0004", "2026-005" → "2026-006", "17" → "18"
function nextInvoiceNumber(nummer) {
  if (!nummer || typeof nummer !== "string") return "";
  // Find the LAST group of digits — this is the sequential counter
  // Handles: RE-0001, 2024/RE/001, R2024/003, INV-2024-0042, 001, etc.
  const match = nummer.match(/^(.*\D)?(\d+)(\D.*)?$/);
  if (!match) {
    // Entire string is digits
    const allDigits = nummer.match(/^(\d+)$/);
    if (!allDigits) return "";
    const n = (parseInt(allDigits[1], 10) + 1).toString();
    return n.length < allDigits[1].length ? n.padStart(allDigits[1].length, "0") : n;
  }
  const prefix = match[1] || "";
  const numPart = match[2];
  const suffix = match[3] || "";
  const nextNum = (parseInt(numPart, 10) + 1).toString();
  // Preserve zero-padding: if original was "003", next is "004"
  const padded = nextNum.length < numPart.length ? nextNum.padStart(numPart.length, "0") : nextNum;
  return prefix + padded + suffix;
}

function toDE(num) {
  return num.toString().replace(".", ",");
}

function buildLineItems(praeparat, ml, preisProMl, selectedZuschlaege, sachkosten, customS, einheit, useGoa3) {
  // customS can be: { s1, s5, s267 } from calcWeightedForGesamt, or null
  const goaLines = BOTOX_GOA_ITEMS.map((g) => {
    // Swap GOÄ 1 → GOÄ 3 if extended consultation
    if (g.goaCode === "1" && useGoa3) {
      g = { ...g, goaCode: "3", description: "Eingehende Beratung (mehr als 10 Min.)", punkte: 150 };
    }
    if (customS != null) {
      const sMap = { "1": customS.s1, "3": customS.s1, "5": customS.s5, "267": customS.s267 };
      const s = sMap[g.goaCode] || g.steigerung;
      return { ...g, steigerung: s, betrag: calcGoaBetrag(g.punkte, s), isProduct: false };
    }
    return {
      ...g,
      betrag: calcGoaBetrag(g.punkte, g.steigerung),
      isProduct: false,
    };
  });

  // Add Zuschläge (factor 1.0, nicht steigerbar)
  const zuschlagLines = (selectedZuschlaege || []).map((code) => {
    const z = ZUSCHLAEGE.find((zs) => zs.code === code);
    if (!z) return null;
    return {
      goaCode: z.code,
      description: z.description,
      punkte: z.punkte,
      steigerung: 1.0,
      betrag: calcGoaBetrag(z.punkte, 1.0),
      isProduct: false,
      isZuschlag: true,
    };
  }).filter(Boolean);

  const productLine = {
    goaCode: "",
    description: `${ml}${einheit || "ml"} ${praeparat || "Präparat"}`,
    punkte: null,
    steigerung: null,
    betrag: Math.round(ml * preisProMl * 100) / 100,
    isProduct: true,
    isPraeparat: true,
    unitPrice: preisProMl,
    quantity: ml,
    einheit: einheit || "ml",
    praeparatName: praeparat || "Präparat",
  };

  // Add Sachkosten lines
  const sachkostenLines = (sachkosten || []).map((sk) => ({
    goaCode: "",
    description: sk.description,
    punkte: null,
    steigerung: null,
    betrag: parseDE(sk.betragStr),
    isProduct: true,
  }));

  return [...goaLines, ...zuschlagLines, productLine, ...sachkostenLines];
}

// Compute weighted Steigerungssätze to reach a desired Gesamtbetrag (inkl. MwSt.)
// Distribution ratio: GOÄ 1/3 and GOÄ 5 get weight 1, GOÄ 267 gets weight 3
// All start at base 2.3x, then excess is distributed by weight
function calcWeightedForGesamt(desiredGesamt, ml, preisProMl, selectedZuschlaege, sachkosten, noMwst, useGoa3) {
  const p1 = useGoa3 ? 150 : 80; // GOÄ 1 or 3
  const p5 = 80;                  // GOÄ 5
  const p267 = 80;                // GOÄ 267
  const productCost = Math.round(ml * preisProMl * 100) / 100;
  const sachkostenTotal = (sachkosten || []).reduce((sum, sk) => sum + parseDE(sk.betragStr), 0);
  const zuschlagTotal = (selectedZuschlaege || []).reduce((sum, code) => {
    const z = ZUSCHLAEGE.find((zs) => zs.code === code);
    return z ? sum + calcGoaBetrag(z.punkte, 1.0) : sum;
  }, 0);

  const desiredNetto = noMwst ? desiredGesamt : Math.round((desiredGesamt / 1.19) * 100) / 100;

  // Target netto that GOÄ lines must cover
  const goaTarget = desiredNetto - productCost - sachkostenTotal - zuschlagTotal;
  if (goaTarget <= 0) return { s1: 2.3, s5: 2.3, s267: 2.3 };

  // Strategy: round s1 and s5 to 2 decimals, then derive s267 with full precision
  // so that calcGoaBetrag(p267, s267) lands on the exact cent needed.
  // The invoice display uses targetGesamt to force the exact total, so any tiny
  // MwSt rounding difference is absorbed there.
  const solveS267 = (s1v, s5v) => {
    const usedByOthers = calcGoaBetrag(p1, s1v) + calcGoaBetrag(p5, s5v);
    const targetBetrag267 = Math.round((goaTarget - usedByOthers) * 100) / 100;
    const s267 = targetBetrag267 / (p267 * PUNKTWERT);
    return { s1: s1v, s5: s5v, s267 };
  };

  // Base cost at 2.3x
  const baseCost = (p1 + p5 + p267) * PUNKTWERT * 2.3;
  const excess = goaTarget - baseCost;

  if (excess <= 0) {
    const uniformS = Math.round((goaTarget / ((p1 + p5 + p267) * PUNKTWERT)) * 100) / 100;
    return solveS267(uniformS, uniformS);
  }

  // When GOÄ 3 is used (150 Punkte), lock it at 2.3x to avoid disproportional increases.
  if (useGoa3) {
    const weightedPunkte = p5 * 1 + p267 * 3;
    const d = excess / (PUNKTWERT * weightedPunkte);
    const s5 = Math.round((2.3 + d * 1) * 100) / 100;
    return solveS267(2.3, s5);
  }

  // Normal case (GOÄ 1): distribute across all three with weight 1:1:3
  const weightedPunkte = p1 * 1 + p5 * 1 + p267 * 3;
  const d = excess / (PUNKTWERT * weightedPunkte);
  const s1 = Math.round((2.3 + d * 1) * 100) / 100;
  const s5 = Math.round((2.3 + d * 1) * 100) / 100;
  return solveS267(s1, s5);
}

function calcGesamt(lineItems, kleinunternehmer, isAusland, isMedical) {
  const zwischensumme = lineItems.reduce((s, it) => s + it.betrag, 0);
  const noMwst = kleinunternehmer || isAusland || isMedical;
  const mwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  return Math.round((zwischensumme + mwst) * 100) / 100;
}

// ═══════════════════ Impressum ═══════════════════

function ImpressumPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8">
        {onBack && (
          <button onClick={onBack} className="mb-6 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            &larr; Zurück
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-800 mb-6">Impressum</h1>
        <div className="text-sm text-gray-700 leading-relaxed space-y-4">
          <p>invoicing.ephia.de ist ein Portal der EPHIA Medical GmbH</p>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Anschrift</p>
            <p>EPHIA Medical GmbH<br />Dorfstraße 30<br />15913 Märkische Heide<br />Deutschland</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Kontakt</p>
            <p>customerlove@ephia.de</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Verantwortliche Geschäftsführerin</p>
            <p>Dr. Sophia Wilk-Vollmann</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Handelsregister</p>
            <p>HRB 279383 B</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Steuernummer</p>
            <p>049/108/01622</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">USt-IdNr.</p>
            <p>DE456748337</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Datenschutzerklärung ═══════════════════

function DatenschutzPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8">
        {onBack && (
          <button onClick={onBack} className="mb-6 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            &larr; Zurück
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-800 mb-1">Datenschutzerklärung</h1>
        <p className="text-xs text-gray-400 mb-6">EPHIA Medical GmbH · Stand: März 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed space-y-5">
          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">1. Verantwortliche:r</h2>
            <p>Verantwortlich für die Datenverarbeitung im Sinne der DSGVO:</p>
            <p>EPHIA Medical GmbH<br />Dorfstraße 30<br />15913 Märkische Heide<br />Deutschland<br />E-Mail: customerlove@ephia.de</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p>Wir verarbeiten Deine personenbezogenen Daten nur, soweit dies zur Bereitstellung unserer App und der damit verbundenen Leistungen erforderlich ist. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">3. Kategorien verarbeiteter Daten</h2>
            <p><strong>Kontodaten:</strong> Deine E-Mail-Adresse und ein Passwort-Hash zur Authentifizierung.</p>
            <p><strong>Praxisdaten:</strong> Praxisname, Anschrift, Steuernummer, Bankverbindung und weitere geschäftliche Angaben. Diese Daten werden unverschlüsselt gespeichert, um die Geschäftsabwicklung zu ermöglichen.</p>
            <p><strong>Rechnungsdaten:</strong> Rechnungsnummern, Leistungspositionen (GOÄ-Ziffern), Beträge und Datumsangaben. Diese Daten werden unverschlüsselt gespeichert.</p>
            <p><strong>Patient:innendaten:</strong> Name, Adresse, Geburtsdatum und E-Mail-Adresse Deiner Patient:innen. Diese Daten werden vor der Übertragung an den Server in Deinem Browser Ende-zu-Ende-verschlüsselt (siehe Abschnitt 5). Auf unseren Servern werden ausschließlich verschlüsselte, nicht lesbare Daten gespeichert. Wir haben zu keinem Zeitpunkt Zugriff auf Patient:innendaten im Klartext — nur Du selbst kannst diese mit Deinem persönlichen Schlüssel entschlüsseln.</p>
            <p><strong>Technische Daten:</strong> Bei der Nutzung der App werden automatisch technische Informationen wie IP-Adresse, Browsertyp und Zugriffszeiten erfasst. Diese Daten werden ausschließlich zur Sicherstellung des Betriebs und zur Fehlerbehebung verwendet.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">4. Verarbeitung von Gesundheitsdaten</h2>
            <p>Im Rahmen der Rechnungsstellung können mittelbar Gesundheitsdaten gemäß Art. 9 DSGVO verarbeitet werden, da aus Behandlungspositionen auf den Gesundheitszustand geschlossen werden kann. Die Verarbeitung erfolgt auf Grundlage von Art. 9 Abs. 2 lit. h DSGVO (Gesundheitsversorgung). Durch die Ende-zu-Ende-Verschlüsselung (siehe Abschnitt 5) sind patient:innenidentifizierende Daten auf unseren Servern jedoch zu keinem Zeitpunkt im Klartext gespeichert oder für EPHIA einsehbar — Rechnungspositionen können serverseitig keiner identifizierbaren Person zugeordnet werden.</p>
            <p>Du bist als verantwortliche Stelle für die von Dir eingegebenen Patient:innendaten verantwortlich und stellst sicher, dass Du über die erforderliche Rechtsgrundlage verfügst.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">5. Ende-zu-Ende-Verschlüsselung (E2EE)</h2>
            <p>Patient:innendaten werden mittels Ende-zu-Ende-Verschlüsselung mit AES-256-GCM geschützt. Die Verschlüsselung erfolgt direkt in Deinem Browser, bevor Daten an unsere Server übertragen werden.</p>
            <p><strong>Schlüsselhierarchie:</strong> Aus Deinem Passwort wird mittels PBKDF2 ein Schlüsselableitungsschlüssel (PDK) erzeugt. Dieser schützt den eigentlichen Datenverschlüsselungsschlüssel (Master Encryption Key, MEK). Der MEK wird ausschließlich in Deinem Browser entschlüsselt.</p>
            <p><strong>Konsequenz:</strong> Auf unseren Servern befinden sich ausschließlich verschlüsselte, nicht lesbare Zeichenketten. Wir speichern keine Patient:innendaten im Klartext und können diese auch nicht einsehen. Selbst im Falle eines unbefugten Datenbankzugriffs durch Dritte bleiben Patient:innendaten vollständig geschützt, da sie ohne Deinen persönlichen Schlüssel nicht entschlüsselt werden können.</p>
            <p><strong>Wiederherstellung:</strong> Ein Recovery-Mechanismus ermöglicht es, den MEK bei Passwortverlust über eine E-Mail-Verifizierung wiederherzustellen.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">6. Hosting und Datenverarbeitung</h2>
            <p><strong>Hosting:</strong> Die App wird über GitHub Pages (GitHub, Inc.) als statische Webanwendung bereitgestellt. Es werden dabei keine personenbezogenen Daten serverseitig durch GitHub verarbeitet.</p>
            <p><strong>Datenbank:</strong> Sämtliche Daten werden auf Servern innerhalb der Europäischen Union gespeichert. Als Datenbankdienstleister wird Supabase mit EU-Serverstandort eingesetzt. Patient:innendaten werden zusätzlich durch Ende-zu-Ende-Verschlüsselung geschützt (siehe Abschnitt 5).</p>
            <p><strong>Authentifizierung:</strong> Die Authentifizierung erfolgt über Supabase Auth. Dabei werden E-Mail-Adresse und Passwort-Hash verarbeitet.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">7. Cookies und Tracking</h2>
            <p>Die App verwendet keine Cookies zu Marketing- oder Trackingzwecken. Es werden lediglich technisch notwendige Sitzungsdaten im Browser (sessionStorage) gespeichert, um die Verschlüsselungsfunktionalität während einer Sitzung aufrechtzuerhalten. Diese Daten werden beim Schließen des Browsers automatisch gelöscht.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">8. Deine Rechte</h2>
            <p>Du hast gemäß DSGVO folgende Rechte:</p>
            <p><strong>Auskunftsrecht (Art. 15):</strong> Du kannst Auskunft über die zu Deiner Person gespeicherten Daten verlangen.</p>
            <p><strong>Berichtigungsrecht (Art. 16):</strong> Du kannst die Berichtigung unrichtiger Daten verlangen.</p>
            <p><strong>Löschungsrecht (Art. 17):</strong> Du kannst die Löschung Deiner Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
            <p><strong>Einschränkung der Verarbeitung (Art. 18):</strong> Du kannst die Einschränkung der Verarbeitung Deiner Daten verlangen.</p>
            <p><strong>Datenübertragbarkeit (Art. 20):</strong> Du kannst Deine Daten in einem gängigen Format erhalten.</p>
            <p><strong>Widerspruchsrecht (Art. 21):</strong> Du kannst der Verarbeitung Deiner Daten widersprechen.</p>
            <p>Zur Ausübung Deiner Rechte schreib uns einfach an: customerlove@ephia.de</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">9. Beschwerderecht</h2>
            <p>Du hast das Recht, Dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Deiner personenbezogenen Daten zu beschweren. Die für uns zuständige Aufsichtsbehörde ist:</p>
            <p>Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg<br />Stahnsdorfer Damm 77<br />14532 Kleinmachnow</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">10. Speicherdauer</h2>
            <p>Personenbezogene Daten werden gelöscht, sobald der Zweck der Speicherung entfällt. Nach Kündigung Deines Kontos werden alle personenbezogenen Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten (z. B. steuerrechtliche Aufbewahrungsfristen von bis zu 10 Jahren) entgegenstehen.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">11. Änderungen dieser Datenschutzerklärung</h2>
            <p>Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die aktuelle Version ist jederzeit in der App einsehbar.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">Kontakt</h2>
            <p>EPHIA Medical GmbH<br />E-Mail: customerlove@ephia.de</p>
          </section>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ AGB / Terms & Conditions ═══════════════════

function AGBPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8">
        {onBack && (
          <button onClick={onBack} className="mb-6 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            &larr; Zurück
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-800 mb-1">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-xs text-gray-400 mb-6">EPHIA Medical GmbH · Stand: März 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed space-y-5">
          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 1 Geltungsbereich</h2>
            <p>Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der webbasierten Anwendung „EPHIA Rechnungsverwaltung" (nachfolgend „App"), bereitgestellt von der EPHIA Medical GmbH (nachfolgend „Anbieter"). Mit der Registrierung und Nutzung der App erklärst Du Dich mit diesen Bedingungen einverstanden.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 2 Leistungsbeschreibung</h2>
            <p>Die App ermöglicht niedergelassenen Ärzt:innen und Praxen die digitale Erstellung, Verwaltung und den Export von Rechnungen für Privatpatient:innen. Der Anbieter stellt die App als Software-as-a-Service (SaaS) über das Internet zur Verfügung. Ein Anspruch auf ständige Verfügbarkeit besteht nicht.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 3 Registrierung und Konto</h2>
            <p>(1) Zur Nutzung der App ist eine Registrierung mit einer gültigen E-Mail-Adresse und einem Passwort erforderlich.</p>
            <p>(2) Du bist verpflichtet, Deine Zugangsdaten vertraulich zu behandeln und nicht an Dritte weiterzugeben.</p>
            <p>(3) Du bist für alle Aktivitäten verantwortlich, die über Dein Konto ausgeführt werden.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 4 Datenschutz und Ende-zu-Ende-Verschlüsselung</h2>
            <p>(1) Der Schutz personenbezogener Daten hat für uns höchste Priorität. Die Verarbeitung personenbezogener Daten erfolgt ausschließlich im Einklang mit der Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).</p>
            <p>(2) Patient:innendaten (Name, Adresse, Geburtsdatum und weitere personenbezogene Informationen) werden mittels Ende-zu-Ende-Verschlüsselung (E2EE) mit AES-256-GCM geschützt. Die Verschlüsselung erfolgt direkt in Deinem Browser, bevor Daten an den Server übermittelt werden. Der Anbieter hat zu keinem Zeitpunkt Zugriff auf unverschlüsselte Patient:innendaten.</p>
            <p>(3) Der Verschlüsselungsschlüssel (Master Encryption Key) wird aus Deinem Passwort abgeleitet und ist ausschließlich Dir zugänglich. Eine Wiederherstellung des Schlüssels ist über einen per E-Mail verifizierten Recovery-Mechanismus möglich.</p>
            <p>(4) Praxisdaten (Praxisname, Adresse, Steuernummer etc.) sowie Rechnungsbeträge und Leistungspositionen werden nicht verschlüsselt gespeichert, um eine ordnungsgemäße Geschäftsabwicklung zu ermöglichen.</p>
            <p>(5) Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 9 Abs. 2 lit. h DSGVO für die Verarbeitung von Gesundheitsdaten im Rahmen der Gesundheitsversorgung.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 5 Umgang mit Gesundheitsdaten</h2>
            <p>(1) Die App verarbeitet im Rahmen der Rechnungsstellung mittelbar Gesundheitsdaten im Sinne von Art. 9 DSGVO, da aus Rechnungspositionen auf Behandlungen und somit auf den Gesundheitszustand geschlossen werden kann. Durch die in § 4 beschriebene Ende-zu-Ende-Verschlüsselung sind patient:innenidentifizierende Daten auf den Servern von EPHIA jedoch zu keinem Zeitpunkt im Klartext gespeichert oder einsehbar — Rechnungspositionen können serverseitig keiner identifizierbaren Person zugeordnet werden.</p>
            <p>(2) Du bist als verantwortliche Stelle im Sinne der DSGVO für die von Dir eingegebenen Patient:innendaten verantwortlich. Du stellst sicher, dass Du über die erforderliche Rechtsgrundlage zur Verarbeitung der jeweiligen Patient:innendaten verfügst.</p>
            <p>(3) Die technischen und organisatorischen Maßnahmen umfassen insbesondere die unter § 4 beschriebene Ende-zu-Ende-Verschlüsselung.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 6 Deine Pflichten</h2>
            <p>(1) Du verpflichtest Dich, die App nur im Rahmen der geltenden Gesetze zu nutzen.</p>
            <p>(2) Du bist für die Richtigkeit und Vollständigkeit der eingegebenen Rechnungsdaten selbst verantwortlich.</p>
            <p>(3) Du bist verpflichtet, Dein Passwort sicher zu wählen und regelmäßig zu ändern. Bei Verdacht auf unbefugten Zugriff informiere uns bitte unverzüglich.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 7 Haftung</h2>
            <p>(1) Der Anbieter haftet unbeschränkt für Schäden, die auf vorsätzlichem oder grob fahrlässigem Verhalten beruhen.</p>
            <p>(2) Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten. Die Haftung ist in diesen Fällen auf den vorhersehbaren, vertragstypischen Schaden begrenzt.</p>
            <p>(3) Die App ersetzt keine steuerliche oder rechtliche Beratung. Der Anbieter übernimmt keine Haftung für die steuerliche oder rechtliche Korrektheit der erstellten Rechnungen.</p>
            <p>(4) Bei Verlust Deines Passworts und Nichtfunktionieren des Recovery-Mechanismus können wir verschlüsselte Patient:innendaten nicht wiederherstellen. Der Anbieter haftet nicht für Datenverluste, die auf den Verlust des Verschlüsselungsschlüssels zurückzuführen sind.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 8 Laufzeit und Kündigung</h2>
            <p>(1) Das Nutzungsverhältnis beginnt mit der Registrierung und wird auf unbestimmte Zeit geschlossen.</p>
            <p>(2) Beide Parteien können das Nutzungsverhältnis jederzeit ohne Angabe von Gründen kündigen.</p>
            <p>(3) Bei Kündigung werden alle Deine personenbezogenen Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 9 Änderungen der AGB</h2>
            <p>Wir behalten uns vor, diese AGB jederzeit zu ändern. Du wirst über Änderungen per E-Mail informiert. Widersprichst Du nicht innerhalb von vier Wochen nach Zugang der Änderungsmitteilung, gelten die geänderten Bedingungen als akzeptiert.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">§ 10 Schlussbestimmungen</h2>
            <p>(1) Es gilt das Recht der Bundesrepublik Deutschland.</p>
            <p>(2) Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
            <p>(3) Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Anbieters.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">Kontakt</h2>
            <p>EPHIA Medical GmbH<br />E-Mail: customerlove@ephia.de</p>
          </section>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Auth Screens ═══════════════════

function LoginScreen({ onSignInClick, onSignUpClick, onResetClick, onAGBClick, onImpressumClick, onDatenschutzClick, isLoading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><img src="/logo.svg" alt="EPHIA" style={{ height: "42px" }} /></div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Rechnungsverwaltung</div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">E-Mail</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Passwort</label>
          <input
            type="password"
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button
          className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onSignInClick(email, password)}
          disabled={isLoading}
        >
          {isLoading ? "Wird angemeldet..." : "Anmelden"}
        </button>

        <div className="my-4 flex items-center gap-2">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="text-xs text-gray-400">oder</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        <button
          className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition disabled:opacity-50"
          onClick={() => onSignUpClick(email, password)}
          disabled={isLoading}
        >
          Neues Konto erstellen
        </button>

        <div className="mt-4 text-center">
          <button
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => onResetClick(email)}
            disabled={isLoading}
          >
            Passwort vergessen?
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Sichere Authentifizierung · <button className="text-blue-500 hover:text-blue-600 underline" onClick={onAGBClick}>AGB</button> · <button className="text-blue-500 hover:text-blue-600 underline" onClick={onDatenschutzClick}>Datenschutz</button> · <button className="text-blue-500 hover:text-blue-600 underline" onClick={onImpressumClick}>Impressum</button>
        </div>
      </div>
    </div>
  );
}

function SignUpScreen({ onSignUpClick, onBackClick, isLoading, error, success, successEmail }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const passwordsMatch = password && passwordConfirm && password === passwordConfirm;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><img src="/logo.svg" alt="EPHIA" style={{ height: "42px" }} /></div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Neues Konto</div>
        </div>

        {success ? (
          <div>
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
              <p className="text-sm font-medium text-green-800 mb-1">Fast geschafft!</p>
              <p className="text-xs text-green-700">Wir haben eine Bestätigungsmail an <strong>{successEmail}</strong> geschickt. Öffne die E-Mail und klicke auf den Link, um Dein Konto zu aktivieren.</p>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">Sobald Du Deine E-Mail bestätigt hast, kannst Du Dich anmelden.</p>
            <button
              className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition"
              onClick={onBackClick}
            >
              Zur Anmeldung
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">E-Mail</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Passwort</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Passwort wiederholen</label>
              <input
                type="password"
                className={`w-full border rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  password && !passwordsMatch ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"
                }`}
                placeholder="Passwort wiederholen"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLoading}
              />
              {password && !passwordsMatch && (
                <p className="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein</p>
              )}
            </div>

            <button
              className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSignUpClick(email, password)}
              disabled={isLoading || !passwordsMatch}
            >
              {isLoading ? "Wird erstellt..." : "Konto erstellen"}
            </button>

            <div className="mt-4 text-center">
              <button
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                onClick={onBackClick}
                disabled={isLoading}
              >
                ← Zurück zur Anmeldung
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
              Sichere Authentifizierung
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResetPasswordScreen({ onResetClick, onBackClick, isLoading, error, success }) {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><img src="/logo.svg" alt="EPHIA" style={{ height: "42px" }} /></div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Passwort zurücksetzen</div>
        </div>

        {success && (
          <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Passwort-Reset-Link wurde an deine E-Mail gesendet. Bitte überprüfe dein Postfach.<br /><strong>Wichtig:</strong> Der Link muss im selben Browser geöffnet werden, in dem du ihn angefordert hast.
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">E-Mail-Adresse</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || success}
          />
        </div>

        <button
          className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onResetClick(email)}
          disabled={isLoading || success}
        >
          {isLoading ? "Wird gesendet..." : "Passwort-Reset-Link senden"}
        </button>

        <div className="mt-4 text-center">
          <button
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            onClick={onBackClick}
            disabled={isLoading}
          >
            ← Zurück zur Anmeldung
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Sichere Authentifizierung
        </div>
      </div>
    </div>
  );
}

function SetNewPasswordScreen({ onSubmit, onBackClick, isLoading, error, success }) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const passwordsMatch = password && passwordConfirm && password === passwordConfirm;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><img src="/logo.svg" alt="EPHIA" style={{ height: "42px" }} /></div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Neues Passwort festlegen</div>
        </div>

        {success && (
          <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {!success && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Neues Passwort</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Passwort bestätigen</label>
              <input
                type="password"
                className={`w-full border rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${password && passwordConfirm && !passwordsMatch ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`}
                placeholder="Passwort wiederholen"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSubmit(password)}
              disabled={isLoading || !passwordsMatch || password.length < 6}
            >
              {isLoading ? "Wird gespeichert..." : "Passwort speichern"}
            </button>
          </>
        )}

        <div className="mt-4 text-center">
          <button
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            onClick={onBackClick}
          >
            ← Zurück zur Anmeldung
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Preview Scaler ═══════════════════

const A4_WIDTH_PX = 794; // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi
const A4_RATIO = A4_HEIGHT_PX / A4_WIDTH_PX; // ~1.4142

function PreviewScaler({ children }) {
  const containerRef = React.useRef(null);
  const [scale, setScale] = useState(0.5);
  const pad = 6;

  React.useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const w = containerRef.current.getBoundingClientRect().width - pad * 2;
      setScale(w / A4_WIDTH_PX);
    };
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const scaledH = A4_HEIGHT_PX * scale + pad * 2;

  return (
    <div ref={containerRef} style={{ background: "#f0f0f0", padding: pad, height: scaledH, overflow: "hidden" }}>
      <div style={{ position: "relative", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_WIDTH_PX, height: A4_HEIGHT_PX, background: "white" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Confetti Burst ═══════════════════

function spawnConfetti(buttonEl) {
  if (!buttonEl) return;
  const rect = buttonEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ["#22c55e", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#f97316"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);
  for (let i = 0; i < 24; i++) {
    const el = document.createElement("div");
    const size = 4 + Math.random() * 5;
    const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.5;
    const velocity = 60 + Math.random() * 80;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 30;
    const rotation = Math.random() * 720 - 360;
    el.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.5 ? "50%" : "1px"};opacity:1;transition:none;`;
    container.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transition = "all 0.7s cubic-bezier(.25,.46,.45,.94)";
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
      el.style.opacity = "0";
    });
  }
  setTimeout(() => container.remove(), 800);
}

// ═══════════════════ Präparat Autocomplete ═══════════════════

function PraeparatAutocomplete({ value, onChange, onSelect, suggestions, placeholder, className, id }) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const filtered = value.trim()
    ? suggestions.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  // close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (p) => {
    onSelect(p);
    setOpen(false);
    setFocusIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && focusIdx >= 0) { e.preventDefault(); handleSelect(filtered[focusIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setFocusIdx(-1); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition ${i === focusIdx ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              onMouseEnter={() => setFocusIdx(i)}
            >
              <span className="font-medium">{p.name}</span>
              {(p.einheit || p.preisStr) && (
                <span className="text-gray-400 ml-1.5 text-xs">
                  {p.einheit && p.einheit}{p.preisStr ? ` · ${p.preisStr} €` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════ Info Tooltip ═══════════════════

function InfoTooltip({ children, wide }) {
  const [show, setShow] = useState(false);
  const hideTimeout = React.useRef(null);
  const scheduleHide = () => {
    hideTimeout.current = setTimeout(() => setShow(false), 150);
  };
  const cancelHide = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  };
  return (
    <span className="relative inline-flex items-center">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help font-bold leading-none"
        onMouseEnter={() => { cancelHide(); setShow(true); }}
        onMouseLeave={scheduleHide}
        onClick={() => setShow(!show)}
      >
        ?
      </span>
      {show && (
        <div
          className={`absolute z-50 bottom-6 left-0 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg ${wide ? "w-96" : "w-64"}`}
          style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          {children}
        </div>
      )}
    </span>
  );
}

// ═══════════════════ Consent Form Templates ═══════════════════

const CONSENT_TEMPLATES = [
  {
    id: "botox_v2",
    name: "Injektion von Botulinumtoxin A zur Faltenkorrektur",
    title: "Aufklärungsbogen — Botulinumtoxin Faltenkorrektur",
    shortName: "Botox Faltenkorrektur",
    version: "2.0",
    reference: "PO 19/Derma 27 · 10/2016v2 · Thieme Compliance",
    sections: [
      { type: "info", title: "Die Faltenkorrektur", html: `<p>Die Ursachen für Falten im Gesicht liegen im natürlichen Alterungsprozess der Haut und in der individuellen Veranlagung, in äußeren Einflüssen (z.B. Sonneneinstrahlung) sowie in den Lebensgewohnheiten (z.B. Rauchen). Wesentlich zur Faltenbildung trägt auch die mimische Aktivität der feinen, kleinen Muskeln unter der Haut bei, die wir oft unbewusst einsetzen, z.B. beim Stirnrunzeln.</p><p>Störende Falten lassen sich, je nach Art und Ursache, durch verschiedene Methoden korrigieren, deren unterschiedliche Belastungen, Risiken und Erfolgschancen wir Ihnen im Aufklärungsgespräch näher erläutern werden.</p><p>In Ihrem Fall empfehlen wir das Einspritzen von <strong>Botulinumtoxin A</strong> in die Gesichtsmuskeln. Dieses Mittel hemmt die Übertragung von Nervenimpulsen, die das Zusammenziehen der Muskeln auslösen und damit zur Bildung der mimischen Falten beitragen. Je nach Dosierung wird die Bewegung gehemmt oder nur stark eingeschränkt. Da aber lediglich ein Teil der mimischen Muskulatur betroffen ist, entsteht kein maskenhaftes Gesicht.</p><p>In den behandelten Arealen lässt die Muskelanspannung nach, dies führt in den folgenden Tagen zu einer deutlichen Entspannung der Haut und zu einem Rückgang der Falten. Die anderen Gesichtsmuskeln werden nicht beeinflusst. Botulinumtoxin A eignet sich insbesondere zur Verminderung von Stirnfalten, „Zornesfalten" und „Krähenfüßen". Nur bedingt eignet sich Botulinumtoxin A für Falten im mittleren Gesicht, da dann auch die Mimik, wie z.B. Lächeln, beeinträchtigt werden kann. Bei bestimmten Vorerkrankungen (z.B. angeborene Muskelschwäche) kann die Injektion nicht durchgeführt werden. Bitte füllen Sie daher den anhängenden Fragebogen sorgfältig aus.</p><p>Botulinumtoxin A wird seit Langem vor allem zur Behandlung krankhafter Spasmen (z.B. unwillkürlicher Bewegungen der Lid- und Nackenmuskulatur) eingesetzt. Nicht alle Botulinumtoxin-Präparate sind formell zur Behandlung mimischer Muskeln zugelassen. Dies schließt jedoch die Anwendung zur Behandlung von Faltenbildung durch den Arzt außerhalb des Zulassungsbereichs nicht aus, falls Sie sich nach näherer Aufklärung, insbesondere über die bekannten Risiken, dafür entscheiden sollten (Off-Label Use). Unbekannte Risiken lassen sich aber nicht ausschließen, auch besteht möglicherweise keine Haftung seitens der Hersteller.</p><p>Falten, die nicht durch Muskelaktivität (Mimik), sondern durch Hautalterung oder UV-Schädigung eingetreten sind, können durch Laserbehandlung, Eigenfetttransfer oder Unterspritzung mit anderen Füllmaterialien gebessert werden. Manchmal ist auch eine operative Korrektur in Form eines Facelifts, Brauenlifts oder einer Lidstraffung erforderlich.</p>` },
      { type: "info", title: "Kostenübernahme", html: `<p>In der Regel übernimmt die gesetzliche Krankenkasse die Kosten dieser Behandlung und eventuell daraus resultierender behandlungsbedürftiger Komplikationen nicht. Es empfiehlt sich in jedem Fall, die Kostenfragen im Vorfeld mit Ihrem Arzt/Ihrer Krankenkasse zu klären.</p>` },
      { type: "info", title: "Wie erfolgt die Behandlung?", html: `<p>Die ambulante Behandlung erfolgt, indem mit einer dünnen Nadel eine bestimmte Menge Botulinumtoxin A exakt an den Stellen im Gesicht eingespritzt wird, die dafür angezeigt sind. Der Schmerz, der beim Einspritzen entsteht, ist mit dem eines Mückenstichs vergleichbar. Bei besonders schmerzempfindlichen Patienten ist zur Betäubung der Einstichstelle das Auftragen einer Betäubungscreme möglich, diese muss jedoch ca. 20 Minuten einwirken.</p><p>Während der Schwangerschaft und Stillzeit, bei neuromuskulären Erkrankungen wie z.B. Myasthenia gravis (schwere, allgemeine Muskelschwäche), Lidheberschwäche, vorliegender Blutgerinnungsstörung, bekannter Überempfindlichkeit gegenüber Botulinumtoxin oder Humanalbumin (Bluteiweiß) sollte eine Behandlung mit Botulinumtoxin nur nach sorgfältiger Abwägung möglicher Risiken erfolgen.</p>` },
      { type: "info", title: "Risiken und mögliche Komplikationen", html: `<p>Trotz aller Sorgfalt kann es zu – u.U. auch lebensbedrohlichen – Komplikationen kommen, die weitere Behandlungsmaßnahmen/Operationen erfordern. Die Häufigkeitsangaben sind eine allgemeine Einschätzung und sollen helfen, die Risiken untereinander zu gewichten.</p><ul><li>Unmittelbar nach der Injektion kann sich an der Injektionsstelle ein kleiner <strong>Bluterguss</strong> (Hämatom) bilden, der sich durch Make-up abdecken lässt und sich nach einigen Tagen, selten erst nach 2–3 Wochen, zurückbildet. Patienten, die Medikamente zur Beeinflussung der Blutgerinnung nehmen, müssen mit einer verstärkten Hämatombildung rechnen.</li><li>Verteilt sich die Substanz im Gewebe, kann es vorübergehend zum <strong>Hängen des Oberlids oder der Braue</strong> kommen. Bei der Behandlung von Krähenfüßen kann eine Verteilung der Substanz im Augenbereich vorübergehende <strong>Sehstörungen</strong> (Doppelbilder) verursachen. Diese Erscheinungen verschwinden innerhalb einiger Wochen wieder.</li><li><strong>Funktionsbeeinträchtigungen von Nerven</strong> (Missempfindungen, Gefühlsstörungen), die nur vorübergehend sind und sich von selbst innerhalb einiger Wochen bessern.</li><li>Botulinumtoxin-Präparate enthalten geringe Mengen an menschlichem Bluteiweiß. Das Risiko, sich durch die Verabreichung der Präparate zu <strong>infizieren</strong> (z.B. mit Hepatitis, AIDS), ist jedoch äußerst unwahrscheinlich.</li><li>Bei <strong>Allergie oder Überempfindlichkeit</strong> (z.B. gegen Medikamente, Betäubungsmittel, Desinfektionsmittel, Latex) können vorübergehend Schwellung, Juckreiz, Niesen, Hautausschlag, Kopfschmerzen, Schwindel, Erbrechen und ähnliche leichtere Reaktionen auftreten. <strong>Stärkere Reaktionen</strong> können zu einem akuten <strong>Kreislaufschock</strong> führen, der intensivmedizinische Maßnahmen erfordert. Sehr selten sind schwerwiegende, u.U. bleibende Schäden (z.B. Organversagen, Hirnschädigung, Lähmungen).</li><li>Als weitere <strong>seltene Nebenwirkungen</strong> können auftreten: leichtes Unwohlsein, Müdigkeit, Gliederschmerzen, Mund-, Schleimhaut- und Augentrockenheit, Schwund von Muskeln, in die das Botulinumtoxin A eingespritzt wurde, Infektion an der Injektionsstelle und Pigmentverschiebungen der Haut.</li><li>Bei Vorliegen einer Schwangerschaft sollte ganz auf eine Botulinumtoxin-Behandlung verzichtet werden.</li></ul>` },
      { type: "info", title: "Erfolgsaussichten", html: `<p>Eine erste Wirkung der Behandlung ist nach ca. 1–3 Tagen sichtbar, die maximal erreichbare nach ca. 1–2 Wochen. Die Wirkung der Injektion hält bei den meisten Patienten ca. 3–6 Monate an, nach wiederholter Anwendung von Botulinumtoxin A verlängert sich die Wirkdauer oft. Extrem selten bilden sich Antikörper gegen den Wirkstoff, wodurch es zu einem schnelleren Abbau bis hin zum Wirkverlust kommt.</p><p>Ein zufriedenstellendes Behandlungsergebnis kann <strong>nicht garantiert</strong> werden. In Einzelfällen kann trotz sorgfältiger und korrekter Durchführung des Eingriffs das angestrebte Ergebnis verfehlt und der bestehende Zustand sogar verschlechtert werden.</p>` },
      { type: "info", title: "Bitte unbedingt beachten!", html: `<p><strong>Vor der Behandlung:</strong> Bitte legen Sie einschlägige Unterlagen wie z.B. Ausweise/Pässe (Allergie, Mutterschaft, Röntgen, Implantate etc.), Befunde und Bilder – soweit vorhanden – vor. Bitte geben Sie im Fragebogen alle Medikamente an, die Sie derzeit einnehmen. Dies betrifft vor allem <strong>blutgerinnungshemmende Medikamente</strong> (z.B. Marcumar®, Aspirin®, Plavix®, Iscover®, Pradaxa®, Xarelto®, Eliquis® etc.). Das Gesicht bitte gründlich reinigen und nicht schminken. Bitte weisen Sie uns unbedingt darauf hin, wenn Sie an einer <strong>Allergie</strong> leiden oder eine <strong>Unverträglichkeit</strong> besteht.</p><p><strong>Nach der Behandlung:</strong> Tragen Sie bitte erst wieder Make-up auf, wenn die Einstichstellen nicht mehr bluten. Am Tag der Injektion sollten Sie keinen Sport treiben und sich auch keiner kosmetischen Gesichtsbehandlung unterziehen.</p>` },
    ],
    questions: [
      { id: "q1_medikamente", label: "Werden regelmäßig oder derzeit Medikamente eingenommen?", details: "(z.B. gerinnungshemmende Mittel, Schmerzmittel, Herz-/Kreislauf-Medikamente, Hormonpräparate, Schlaf- oder Beruhigungsmittel, Antidiabetika)", followUp: "Wenn ja, welche?" },
      { id: "q2_allergie", label: "Besteht eine Allergie wie Heuschnupfen oder allergisches Asthma oder eine Unverträglichkeit bestimmter Substanzen?", details: "(z.B. Medikamente, Latex, Desinfektionsmittel, Betäubungsmittel, Röntgenkontrastmittel, Jod, Pflaster, Pollen)", followUp: "Wenn ja, welche?" },
      { id: "q3_blutungsneigung", label: "Besteht bei Ihnen oder in Ihrer Blutsverwandtschaft eine erhöhte Blutungsneigung?", details: "(z.B. häufig Nasen-/Zahnfleischbluten, blaue Flecken, Nachbluten nach Operationen)" },
      { id: "q4_infektionskrankheit", label: "Besteht/Bestand eine Infektionskrankheit?", details: "(z.B. Hepatitis, Tuberkulose, HIV/AIDS)", followUp: "Wenn ja, welche?" },
      { id: "q5_herzkreislauf", label: "Besteht/Bestand eine Herz-Kreislauf-Erkrankung?", details: "(z.B. Herzfehler, Herzklappenfehler, Angina pectoris, Herzinfarkt, Schlaganfall, Rhythmusstörungen, Herzmuskelentzündung, hoher Blutdruck)", followUp: "Wenn ja, welche?" },
      { id: "q6_nervensystem", label: "Besteht/Bestand eine Erkrankung des Nervensystems?", details: "(z.B. Lähmungen, Krampfleiden [Epilepsie], chronische Schmerzen)", followUp: "Wenn ja, welche?" },
      { id: "q7_psychisch", label: "Liegt eine psychische Erkrankung vor?", details: "(z.B. Depression, Borderline-Syndrom)", followUp: "Wenn ja, welche?" },
      { id: "q8_erbkrankheit", label: "Besteht eine Erbkrankheit (z.B. angeborene Muskelschwäche, Myasthenie) oder sind ähnliche Erkrankungen in der Blutsverwandtschaft bekannt?", followUp: "Wenn ja, welche?" },
      { id: "q9_wundheilung", label: "Kam es schon einmal zu Wundheilungsstörungen?", details: "(z.B. Entzündung, Abszess, Fistel)" },
      { id: "q10_narbenwucherung", label: "Kam es schon einmal zu einer Narbenwucherung?", details: "(z.B. Keloid)" },
      { id: "q11_lichtempfindlichkeit", label: "Liegt eine verstärkte Lichtempfindlichkeit und/oder eine Neigung zu Pigmentstörungen vor?" },
      { id: "q12_lippenherpes", label: "Treten immer wieder Lippenbläschen (Herpesinfektion) auf?" },
      { id: "q13_botox_vorher", label: "Erfolgten früher schon einmal Einspritzungen von Botulinumtoxin A?", followUp: "Wenn ja, gab es dabei Komplikationen?", subQuestion: true },
      { id: "q14_gesichts_op", label: "Gab es bereits Operationen im Gesichtsbereich?", followUp: "Wenn ja, welche?" },
      { id: "q15_tabak", label: "Regelmäßiger Tabakkonsum?", followUp: "Wenn ja, was und wie viel?" },
    ],
    additionalQuestionsWomen: [
      { id: "zf1_schwanger", label: "Könnten Sie schwanger sein?" },
      { id: "zf2_stillen", label: "Stillen Sie?" },
    ],
    consentText: "Den Aufklärungsbogen habe ich gelesen und verstanden. Ich konnte im Aufklärungsgespräch alle mich interessierenden Fragen stellen. Sie wurden vollständig und verständlich beantwortet. Ich fühle mich ausreichend informiert, habe mir meine Entscheidung gründlich überlegt und benötige keine weitere Überlegungsfrist.\n\nIch willige in die vorgeschlagene Behandlung ein.\n\nMit dem eventuellen Auftragen einer schmerzstillenden Salbe vor der Behandlung sowie mit u.U. erforderlichen Neben- und Folgemaßnahmen (z.B. Desinfektion) bin ich ebenfalls einverstanden.\n\nDen Fragebogen habe ich nach bestem Wissen ausgefüllt. Die Verhaltenshinweise werde ich beachten.\n\nIch bin bereit, die Kosten für den Eingriff und eventuelle behandlungsbedürftige Komplikationen zu übernehmen, wenn oder soweit die Krankenkasse keine Kostenerstattung leistet.",
    refusalText: "Ich willige in die vorgeschlagene Behandlung nicht ein. Ich habe den Aufklärungsbogen gelesen und verstanden.",
    plannedTreatment: "Injektion von Botulinumtoxin A.",
  },
];

// ═══════════════════ Consent Form Components ═══════════════════

function ConsentFormView({ template, patient, practice, onComplete, onCancel }) {
  const scrollRef = React.useRef(null);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [hasScrolledToEnd, setHasScrolledToEnd] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [showSignature, setShowSignature] = React.useState(false);
  const [sigStep, setSigStep] = React.useState(1); // 1=patient, 2=doctor
  const patientSigRef = React.useRef(null);
  const [refused, setRefused] = React.useState(false);
  const [showHandback, setShowHandback] = React.useState(false);

  // Demographics (pre-populate from patient profile if available)
  const _patientRaw = (patient._raw && typeof patient._raw.data === "object" && patient._raw.data) ? patient._raw.data : {};
  const [geburtsdatum, setGeburtsdatum] = React.useState(_patientRaw.geburtsdatum || "");
  const [groesse, setGroesse] = React.useState(_patientRaw.groesse || "");
  const [gewicht, setGewicht] = React.useState(_patientRaw.gewicht || "");
  const [geschlecht, setGeschlecht] = React.useState(_patientRaw.geschlecht || "");

  // Questionnaire answers (yes/no + text)
  const allQ = [...template.questions, ...(template.additionalQuestionsWomen || [])];
  const initAnswers = {};
  allQ.forEach(q => { initAnswers[q.id] = null; initAnswers[q.id + "_text"] = ""; });
  // For q13 sub-question
  initAnswers["q13_komplikationen"] = null; initAnswers["q13_komplikationen_text"] = "";
  const [answers, setAnswers] = React.useState(initAnswers);
  const [doctorNotes, setDoctorNotes] = React.useState("");
  const [treatmentDate, setTreatmentDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [ort, setOrt] = React.useState(practice.city || practice.stadt || practice.ort || "");
  const [validationErrors, setValidationErrors] = React.useState(new Set());

  const setAnswer = (id, val) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setValidationErrors(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleValidateAndSign = () => {
    const errors = new Set();
    // Check demographics
    if (!geburtsdatum.trim()) errors.add("geburtsdatum");
    if (!geschlecht) errors.add("geschlecht");
    if (!groesse.trim()) errors.add("groesse");
    if (!gewicht.trim()) errors.add("gewicht");
    // Check all visible questions
    template.questions.forEach(q => {
      if (answers[q.id] === null) errors.add(q.id);
      if (answers[q.id] === true && q.followUp && !answers[q.id + "_text"]?.trim()) errors.add(q.id + "_text");
      if (q.subQuestion && answers[q.id] === true && answers["q13_komplikationen"] === null) errors.add("q13_komplikationen");
      if (q.subQuestion && answers[q.id] === true && answers["q13_komplikationen"] === true && !answers["q13_komplikationen_text"]?.trim()) errors.add("q13_komplikationen_text");
    });
    // Check women's additional questions if visible
    if (geschlecht === "w" && template.additionalQuestionsWomen) {
      template.additionalQuestionsWomen.forEach(q => {
        if (answers[q.id] === null) errors.add(q.id);
      });
    }
    if (errors.size > 0) {
      setValidationErrors(errors);
      // Scroll to first error
      const firstErr = [...errors][0];
      const el = scrollRef.current?.querySelector(`[data-field="${firstErr}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("animate-pulse");
        setTimeout(() => el.classList.remove("animate-pulse"), 2000);
      }
      return;
    }
    setValidationErrors(new Set());
    setShowSignature(true);
    setSigStep(1);
  };

  const handleScroll = (e) => {
    const el = e.target;
    const pct = (el.scrollTop + el.clientHeight) / el.scrollHeight;
    setScrollProgress(Math.min(pct, 1));
    if (pct >= 0.95) setHasScrolledToEnd(true);
  };

  const handlePatientSign = (dataUrl) => {
    // Save immediately after patient signature; doctor signs later from preview
    const sigs = { patient: dataUrl, doctor: null };
    onComplete({
      templateId: template.id,
      templateVersion: template.version,
      answers: { geburtsdatum, groesse, gewicht, geschlecht, ...answers },
      doctorNotes,
      treatmentDate,
      ort,
      refused,
      _signatures: sigs,
      signedAt: new Date().toISOString(),
    });
  };

  // Keep handleDoctorSign for refusal flow (patient + immediate save)
  const handleDoctorSign = (dataUrl) => {
    const sigs = { patient: patientSigRef.current, doctor: dataUrl };
    onComplete({
      templateId: template.id,
      templateVersion: template.version,
      answers: { geburtsdatum, groesse, gewicht, geschlecht, ...answers },
      doctorNotes,
      treatmentDate,
      ort,
      refused,
      _signatures: sigs,
      signedAt: new Date().toISOString(),
    });
  };

  const handleRefuse = () => {
    setRefused(true);
    setShowSignature(true);
    setSigStep(1);
  };

  if (showSignature) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm md:max-w-md">
          <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-1 text-center">
            {refused ? "Unterschrift Patient:in (Ablehnung)" : "Unterschrift Patient:in"}
          </h3>
          <p className="text-xs text-gray-400 text-center mb-1">{patient.vorname} {patient.nachname}</p>
          {!refused && <p className="text-[10px] text-gray-400 text-center mb-3">Die Unterschrift der Ärztin/des Arztes kann später hinzugefügt werden.</p>}
          <SignaturePad key="consent-patient" label="Unterschrift Patient:in" onSave={refused ? (d) => { patientSigRef.current = d; handleDoctorSign(null); } : handlePatientSign} />
          <div className="mt-3 flex items-center justify-between">
            <button className="text-xs md:text-sm text-gray-400 hover:text-gray-600 py-1 flex items-center gap-1" onClick={() => {
              if (sigStep === 2) { setSigStep(1); patientSigRef.current = null; }
              else { setShowSignature(false); setRefused(false); }
            }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div className="fixed inset-0 z-40 bg-white md:bg-gray-50 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 md:h-1.5 bg-gray-100 flex-shrink-0">
        <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-8 py-3 md:py-4 border-b border-gray-100 bg-white flex items-center justify-between">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-lg font-semibold text-gray-800">{template.name}</h2>
            <p className="text-xs md:text-sm text-gray-500">{patient.vorname} {patient.nachname} · {fmtDate(new Date().toISOString().split("T")[0])}</p>
          </div>
          <button className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 ml-4" onClick={() => setShowHandback(true)}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden" onScroll={handleScroll}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 md:py-8 space-y-6 md:space-y-8">
        {/* Info text */}
        <p className="text-xs md:text-sm text-gray-500 italic">Dieser Aufklärungsbogen dient der Vorbereitung des Aufklärungsgesprächs. Bitte lesen Sie ihn vor dem Gespräch aufmerksam durch und füllen Sie den Fragebogen gewissenhaft aus.</p>

        {template.sections.map((section, i) => (
          <div key={i}>
            <h3 className="text-sm md:text-base font-bold text-teal-700 mb-2 md:mb-3">{section.title}</h3>
            <div className="text-sm md:text-base text-gray-700 leading-relaxed prose prose-sm md:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: section.html }} />
          </div>
        ))}

        {/* Questionnaire */}
        <div className="border-t border-gray-200 pt-4 md:pt-6">
          <h3 className="text-sm md:text-base font-bold text-teal-700 mb-3">Fragebogen (Anamnese)</h3>
          <p className="text-xs md:text-sm text-gray-500 mb-4">Bitte beantworten Sie die folgenden Fragen sorgfältig, damit wir etwaigen Risiken besser vorbeugen können.</p>

          {/* Demographics */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div data-field="geburtsdatum" className="col-span-3 md:col-span-1"><label className={`text-xs md:text-sm mb-1 block ${validationErrors.has("geburtsdatum") ? "text-red-500 font-medium" : "text-gray-500"}`}>Geburtsdatum</label><input type="date" className={inputCls + (validationErrors.has("geburtsdatum") ? " border-red-400 ring-1 ring-red-400" : "")} value={geburtsdatum} onChange={e => { setGeburtsdatum(e.target.value); setValidationErrors(prev => { const n = new Set(prev); n.delete("geburtsdatum"); return n; }); }} /></div>
            <div data-field="geschlecht"><label className={`text-xs md:text-sm mb-1 block ${validationErrors.has("geschlecht") ? "text-red-500 font-medium" : "text-gray-500"}`}>Geschlecht</label>
              <select className={inputCls + (validationErrors.has("geschlecht") ? " border-red-400 ring-1 ring-red-400" : "")} value={geschlecht} onChange={e => { setGeschlecht(e.target.value); setValidationErrors(prev => { const n = new Set(prev); n.delete("geschlecht"); return n; }); }}>
                <option value="">–</option><option value="w">Weiblich</option><option value="m">Männlich</option><option value="d">Divers</option>
              </select>
            </div>
            <div data-field="groesse"><label className={`text-xs md:text-sm mb-1 block ${validationErrors.has("groesse") ? "text-red-500 font-medium" : "text-gray-500"}`}>Größe (cm)</label><input className={inputCls + (validationErrors.has("groesse") ? " border-red-400 ring-1 ring-red-400" : "")} value={groesse} onChange={e => { setGroesse(e.target.value); setValidationErrors(prev => { const n = new Set(prev); n.delete("groesse"); return n; }); }} placeholder="cm" /></div>
            <div data-field="gewicht"><label className={`text-xs md:text-sm mb-1 block ${validationErrors.has("gewicht") ? "text-red-500 font-medium" : "text-gray-500"}`}>Gewicht (kg)</label><input className={inputCls + (validationErrors.has("gewicht") ? " border-red-400 ring-1 ring-red-400" : "")} value={gewicht} onChange={e => { setGewicht(e.target.value); setValidationErrors(prev => { const n = new Set(prev); n.delete("gewicht"); return n; }); }} placeholder="kg" /></div>
          </div>

          {/* Yes/No questions */}
          {template.questions.map((q, qi) => (
            <div key={q.id} data-field={q.id} className={`mb-4 p-3 md:p-4 rounded-lg transition-colors ${validationErrors.has(q.id) ? "bg-red-50 md:bg-red-50 md:border md:border-red-300 ring-1 ring-red-300" : "bg-gray-50 md:bg-white md:border md:border-gray-200"}`}>
              <div className="flex items-start gap-2 md:gap-3">
                <span className={`text-xs md:text-sm font-bold mt-0.5 flex-shrink-0 w-5 md:w-6 text-right ${validationErrors.has(q.id) ? "text-red-500" : "text-gray-400"}`}>{qi + 1}.</span>
                <div className="flex-1">
                  <div className="md:flex md:items-start md:justify-between md:gap-4">
                    <div className="flex-1">
                      <p className="text-sm md:text-base text-gray-800 font-medium">{q.label}</p>
                      {q.details && <p className="text-xs md:text-sm text-gray-500 mt-0.5">{q.details}</p>}
                    </div>
                    <div className="flex gap-3 mt-2 md:mt-0 md:flex-shrink-0">
                      <button className={`px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-full border transition ${answers[q.id] === false ? "bg-gray-200 text-gray-700 border-gray-300" : "bg-white text-gray-400 border-gray-200"}`} onClick={() => setAnswer(q.id, false)}>Nein</button>
                      <button className={`px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-full border transition ${answers[q.id] === true ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-400 border-gray-200"}`} onClick={() => setAnswer(q.id, true)}>Ja</button>
                    </div>
                  </div>
                  {answers[q.id] && q.followUp && (
                    <div className="mt-2 md:mt-3" data-field={q.id + "_text"}>
                      <label className={`text-xs md:text-sm ${validationErrors.has(q.id + "_text") ? "text-red-500 font-medium" : "text-gray-500"}`}>{q.followUp}</label>
                      <input className={inputCls + " mt-1" + (validationErrors.has(q.id + "_text") ? " border-red-400 ring-1 ring-red-400" : "")} value={answers[q.id + "_text"]} onChange={e => setAnswer(q.id + "_text", e.target.value)} />
                    </div>
                  )}
                  {q.subQuestion && answers[q.id] && (
                    <div className={`mt-2 md:mt-3 p-2 md:p-3 rounded border ${validationErrors.has("q13_komplikationen") ? "bg-red-50 border-red-300" : "bg-white md:bg-gray-50 border-gray-200"}`} data-field="q13_komplikationen">
                      <p className="text-xs md:text-sm text-gray-700">Gab es dabei Komplikationen?</p>
                      <div className="flex gap-3 mt-1 md:mt-2">
                        <button className={`px-3 md:px-5 py-1 md:py-2 text-xs md:text-sm rounded-full border transition ${answers["q13_komplikationen"] === false ? "bg-gray-200 text-gray-700 border-gray-300" : "bg-white text-gray-400 border-gray-200"}`} onClick={() => setAnswer("q13_komplikationen", false)}>Nein</button>
                        <button className={`px-3 md:px-5 py-1 md:py-2 text-xs md:text-sm rounded-full border transition ${answers["q13_komplikationen"] === true ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-400 border-gray-200"}`} onClick={() => setAnswer("q13_komplikationen", true)}>Ja</button>
                      </div>
                      {answers["q13_komplikationen"] && (
                        <div data-field="q13_komplikationen_text">
                          <input className={inputCls + " mt-1 md:mt-2" + (validationErrors.has("q13_komplikationen_text") ? " border-red-400 ring-1 ring-red-400" : "")} value={answers["q13_komplikationen_text"]} onChange={e => setAnswer("q13_komplikationen_text", e.target.value)} placeholder="Welche Komplikationen?" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Additional questions for women */}
          {template.additionalQuestionsWomen && (
            <>
              <h4 className="text-xs md:text-sm font-bold text-gray-600 mt-4 mb-2">Zusatzfragen bei Frauen</h4>
              {template.additionalQuestionsWomen.map((q, qi) => (
                <div key={q.id} data-field={q.id} className={`mb-4 p-3 md:p-4 rounded-lg transition-colors ${validationErrors.has(q.id) ? "bg-red-50 md:bg-red-50 md:border md:border-red-300 ring-1 ring-red-300" : "bg-gray-50 md:bg-white md:border md:border-gray-200"}`}>
                  <div className="flex items-start gap-2 md:gap-3">
                    <span className={`text-xs md:text-sm font-bold mt-0.5 flex-shrink-0 w-5 md:w-6 text-right ${validationErrors.has(q.id) ? "text-red-500" : "text-gray-400"}`}>{template.questions.length + qi + 1}.</span>
                    <div className="flex-1">
                      <div className="md:flex md:items-start md:justify-between md:gap-4">
                        <div className="flex-1">
                          <p className="text-sm md:text-base text-gray-800 font-medium">{q.label}</p>
                        </div>
                        <div className="flex gap-3 mt-2 md:mt-0 md:flex-shrink-0">
                          <button className={`px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-full border transition ${answers[q.id] === false ? "bg-gray-200 text-gray-700 border-gray-300" : "bg-white text-gray-400 border-gray-200"}`} onClick={() => setAnswer(q.id, false)}>Nein</button>
                          <button className={`px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-full border transition ${answers[q.id] === true ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-400 border-gray-200"}`} onClick={() => setAnswer(q.id, true)}>Ja</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Doctor notes */}
        <div className="border-t border-gray-200 pt-4 md:pt-6">
          <h3 className="text-sm md:text-base font-bold text-teal-700 mb-2 md:mb-3">Vermerke der Ärztin/des Arztes zum Aufklärungsgespräch</h3>
          <textarea className={inputCls + " h-24 md:h-32"} value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} placeholder="Erörtert wurden z.B.: Ziel der Behandlung, Wahl des Verfahrens, Risiken und mögliche Komplikationen, Erfolgsaussichten..." />
        </div>

        {/* Treatment date */}
        <div>
          <h3 className="text-sm md:text-base font-bold text-teal-700 mb-2 md:mb-3">Vorgesehene Behandlung</h3>
          <p className="text-sm md:text-base text-gray-700 mb-2">{template.plannedTreatment}</p>
          <div className="flex flex-col md:flex-row gap-3 md:gap-6">
            <div>
              <label className="text-xs md:text-sm text-gray-500">Vorgesehener Behandlungsbeginn</label>
              <input type="date" className={inputCls + " mt-1 block"} value={treatmentDate} onChange={e => setTreatmentDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs md:text-sm text-gray-500">Ort</label>
              <input type="text" className={inputCls + " mt-1 block"} value={ort} onChange={e => setOrt(e.target.value)} placeholder="z.B. Basel" />
            </div>
          </div>
        </div>

        {/* Consent text */}
        <div className="border-t border-gray-200 pt-4 md:pt-6">
          <h3 className="text-sm md:text-base font-bold text-teal-700 mb-2 md:mb-3">Einwilligung</h3>
          <div className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">{template.consentText}</div>
        </div>

        {/* Spacer so user can scroll to show the bottom bar */}
        <div className="h-6 md:h-8" />
        </div>
      </div>

      {/* Bottom sticky bar */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 md:px-8 py-3 md:py-4">
        <div className="max-w-3xl mx-auto space-y-3">
        <label className={`flex items-start gap-2 md:gap-3 ${hasScrolledToEnd ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 md:mt-1 rounded md:w-5 md:h-5" disabled={!hasScrolledToEnd} />
          <span className="text-xs md:text-sm text-gray-700">Ich habe den Aufklärungsbogen vollständig gelesen und verstanden.</span>
        </label>
        <div className="flex gap-2 md:gap-3">
          <button
            className={`flex-1 py-2.5 md:py-3 text-sm md:text-base font-medium rounded-lg transition ${confirmed ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            disabled={!confirmed}
            onClick={handleValidateAndSign}
          >
            Unterschreiben
          </button>
          <button className="px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition" onClick={() => setShowHandback(true)}>
            Ablehnen
          </button>
        </div>
        </div>
      </div>

      {/* Handback modal */}
      {showHandback && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 md:p-8 text-center">
            <div className="text-4xl mb-4">
              <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2">Bitte geben Sie das Gerät an Ihre:n Ärzt:in zurück</h3>
            <p className="text-xs md:text-sm text-gray-500 mb-6">Der Aufklärungsbogen wurde nicht abgeschlossen. Ihre:e Ärzt:in wird den Vorgang fortsetzen.</p>
            <button
              className="w-full py-3 text-sm md:text-base font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition"
              onClick={onCancel}
            >
              Weiter als Ärzt:in
            </button>
            <button className="mt-2 w-full py-2 text-xs md:text-sm text-gray-400 hover:text-gray-600 transition" onClick={() => setShowHandback(false)}>
              Zurück zum Aufklärungsbogen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Consent Form Preview for PDF generation
function ConsentFormPreview({ template, consentData, patient, practice, onDoctorSign }) {
  const a = consentData.answers || {};
  const datumStr = fmtDate(consentData.treatmentDate || new Date().toISOString().split("T")[0]);
  const ortStr = consentData.ort || practice.city || practice.stadt || practice.ort || "";

  const measRefA = React.useRef(null);
  const measRefB = React.useRef(null);
  const measRefC = React.useRef(null);
  const [pagesA, setPagesA] = React.useState(1);
  const [pagesB, setPagesB] = React.useState(1);
  const [pagesC, setPagesC] = React.useState(1);

  const baseFont = { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a" };
  const pageStyle = { ...baseFont, width: "210mm", height: "297mm", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", borderRadius: "2px" };
  const h2Style = { fontSize: "12px", fontWeight: "700", color: "#222", margin: "14px 0 6px" };
  const h3Style = { fontSize: "11px", fontWeight: "600", color: "#444", margin: "10px 0 4px" };
  const bodyText = { fontSize: "9.5px", lineHeight: "1.55", color: "#333" };
  const hiddenMeas = { position: "absolute", left: "-9999px", top: 0, visibility: "hidden", ...baseFont, width: "calc(210mm - 88px)" };

  const CONTENT_H = 893;

  // Split template.sections at "Erfolgsaussichten"
  const erfIdx = template.sections.findIndex(s => s.title === "Erfolgsaussichten");
  const sectionsGroupA = erfIdx >= 0 ? template.sections.slice(0, erfIdx) : template.sections;
  const sectionsGroupB = erfIdx >= 0 ? template.sections.slice(erfIdx) : [];

  // Measure each content group independently
  React.useLayoutEffect(() => {
    if (measRefA.current) setPagesA(Math.max(1, Math.ceil(measRefA.current.scrollHeight / CONTENT_H)));
    if (measRefB.current) setPagesB(Math.max(1, Math.ceil(measRefB.current.scrollHeight / CONTENT_H)));
    if (measRefC.current) setPagesC(Math.max(1, Math.ceil(measRefC.current.scrollHeight / CONTENT_H)));
  }, [template, consentData]);

  const totalPages = pagesA + pagesB + pagesC;

  // Build question rows
  const questionRows = [];
  template.questions.forEach((q, qi) => {
    questionRows.push({ type: "q", num: qi + 1, label: q.label, answer: a[q.id] === true ? "Ja" : a[q.id] === false ? "Nein" : "–" });
    if (a[q.id] && a[q.id + "_text"]) questionRows.push({ type: "detail", text: a[q.id + "_text"] });
    if (q.subQuestion && a[q.id]) {
      questionRows.push({ type: "sub", label: "Komplikationen?", answer: a["q13_komplikationen"] === true ? "Ja" : a["q13_komplikationen"] === false ? "Nein" : "–" });
      if (a["q13_komplikationen"] && a["q13_komplikationen_text"]) questionRows.push({ type: "detail", text: a["q13_komplikationen_text"] });
    }
  });
  let nextNum = template.questions.length + 1;
  if (a.geschlecht === "w" && template.additionalQuestionsWomen) {
    template.additionalQuestionsWomen.forEach(q => {
      questionRows.push({ type: "q", num: nextNum++, label: q.label, answer: a[q.id] === true ? "Ja" : a[q.id] === false ? "Nein" : "–" });
    });
  }

  const PageHeader = ({ pageNum }) => (
    <div style={{ padding: "30px 44px 0 44px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {practice.logo && !practice.logoReplacesName && (
            <img src={practice.logo} alt="Logo" style={{ maxHeight: "44px", maxWidth: "140px", objectFit: "contain", marginBottom: "4px", display: "block" }} />
          )}
          {practice.logo && practice.logoReplacesName ? (
            <img src={practice.logo} alt="Logo" style={{ maxHeight: "44px", maxWidth: "140px", objectFit: "contain", display: "block", marginBottom: "4px" }} />
          ) : (
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#222", marginBottom: "4px" }}>{practice.name || "Praxis"}</div>
          )}
          <div style={{ fontSize: "9.5px", color: "#444" }}>
            <div>{practice.address1}</div>
            <div>{practice.address2}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>Seite {pageNum} von {totalPages}</div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#222" }}>Aufklärungsbogen</div>
        </div>
      </div>
    </div>
  );

  const PageFooter = () => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#888", borderTop: "1px solid #ccc", paddingTop: "8px", position: "absolute", bottom: "30px", left: "44px", right: "44px" }}>
      <div>
        {practice.phone && <div>{fmtPhone(practice.phone)}</div>}
        {practice.email && <div>{practice.email}</div>}
      </div>
      <div style={{ textAlign: "center", fontSize: "7.5px", color: "#aaa" }}>
        {consentData.pdfHash ? `SHA-256: ${consentData.pdfHash.substring(0, 16)}…` : ""}
      </div>
      <div style={{ textAlign: "right" }}>
        {practice.bankName && <div>{practice.bankName}</div>}
        {practice.iban && <div>IBAN: {practice.iban}</div>}
        {practice.bic && <div>BIC: {practice.bic}</div>}
      </div>
    </div>
  );

  const sectionHtml = (sections) => sections.map((section, i) => (
    <div key={i}>
      <div style={h2Style}>{section.title}</div>
      <div className="consent-section-html" style={bodyText} dangerouslySetInnerHTML={{ __html: section.html }} />
    </div>
  ));

  const cssReset = <style>{`.consent-section-html p, .consent-section-html ul, .consent-section-html ol, .consent-section-html li, .consent-section-html div, .consent-section-html blockquote { margin-left: 0; padding-left: 0; } .consent-section-html p { margin-top: 0.4em; margin-bottom: 0.4em; }`}</style>;

  // ── Group A: Template name + sections before Erfolgsaussichten ──
  const ContentA = () => (
    <div style={{ ...baseFont, width: "calc(210mm - 88px)" }}>
      <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "12px", color: "#222" }}>{template.name}</div>
      {sectionHtml(sectionsGroupA)}
      {cssReset}
    </div>
  );

  // ── Group B: Erfolgsaussichten + remaining sections + questionnaire ──
  const ContentB = () => (
    <div style={{ ...baseFont, width: "calc(210mm - 88px)" }}>
      {sectionHtml(sectionsGroupB)}
      {cssReset}

      <div style={h2Style}>Fragebogen (Anamnese)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px 12px", fontSize: "10px", marginBottom: "12px", padding: "8px 10px", background: "#f8f8f8", borderRadius: "4px" }}>
        <div>Alter: <strong>{a.geburtsdatum ? (() => { const b = new Date(a.geburtsdatum); const t = new Date(); let age = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--; return age; })() : (a.alter || "–")}</strong></div>
        <div>Geschlecht: <strong>{a.geschlecht === "w" ? "Weiblich" : a.geschlecht === "m" ? "Männlich" : a.geschlecht === "d" ? "Divers" : "–"}</strong></div>
        <div>Größe: <strong>{a.groesse || "–"}</strong> cm</div>
        <div>Gewicht: <strong>{a.gewicht || "–"}</strong> kg</div>
      </div>
      <table style={{ width: "100%", fontSize: "9.5px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 6px 4px 0", fontWeight: "600", borderBottom: "1.5px solid #222", width: "24px" }}>#</th>
            <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" }}>Frage</th>
            <th style={{ textAlign: "center", padding: "4px 6px", fontWeight: "600", borderBottom: "1.5px solid #222", width: "50px" }}>Antwort</th>
          </tr>
        </thead>
        <tbody>
          {questionRows.map((row, i) => {
            if (row.type === "q") return (
              <tr key={i} style={{ borderBottom: "0.5px solid #e5e5e5" }}>
                <td style={{ padding: "4px 6px 4px 0", verticalAlign: "top", color: "#888" }}>{row.num || ""}</td>
                <td style={{ padding: "4px 6px" }}>{row.label}</td>
                <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: "600" }}>{row.answer}</td>
              </tr>
            );
            if (row.type === "sub") return (
              <tr key={i} style={{ borderBottom: "0.5px solid #e5e5e5", background: "#fafafa" }}>
                <td style={{ padding: "3px 6px 3px 0" }}></td>
                <td style={{ padding: "3px 6px", fontSize: "9px", color: "#555" }}>↳ {row.label}</td>
                <td style={{ padding: "3px 6px", textAlign: "center", fontWeight: "600", fontSize: "9px" }}>{row.answer}</td>
              </tr>
            );
            if (row.type === "detail") return (
              <tr key={i} style={{ borderBottom: "0.5px solid #e5e5e5" }}>
                <td></td>
                <td colSpan={2} style={{ padding: "2px 6px", fontStyle: "italic", color: "#666", fontSize: "9px" }}>→ {row.text}</td>
              </tr>
            );
            return null;
          })}
        </tbody>
      </table>
      {consentData.doctorNotes && (
        <div style={{ marginTop: "14px" }}>
          <div style={h3Style}>Vermerke der Ärztin/des Arztes</div>
          <div style={{ fontSize: "9.5px", whiteSpace: "pre-wrap", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "4px", background: "#fafafa", minHeight: "15mm" }}>{consentData.doctorNotes}</div>
        </div>
      )}
    </div>
  );

  // ── Group C: Vorgesehene Behandlung + Consent/Refusal + Signatures ──
  const ContentC = () => (
    <div style={{ ...baseFont, width: "calc(210mm - 88px)" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={h2Style}>Vorgesehene Behandlung</div>
        <div style={bodyText}>{template.plannedTreatment}</div>
        <div style={{ fontSize: "10px", marginTop: "6px" }}>
          <strong>Vorgesehener Behandlungsbeginn:</strong> {datumStr}
        </div>
        {ortStr && (
          <div style={{ fontSize: "10px", marginTop: "4px" }}>
            <strong>Ort:</strong> {ortStr}
          </div>
        )}
      </div>
      <div style={{ border: "1.5px solid #222", borderRadius: "4px", padding: "14px 16px", marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#222", marginBottom: "8px" }}>{consentData.refused ? "Ablehnung der Behandlung" : "Einwilligungserklärung"}</div>
        <div style={{ ...bodyText, whiteSpace: "pre-line" }}>
          {consentData.refused ? template.refusalText : template.consentText}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: "30px" }}>
        <div style={{ textAlign: "center", minWidth: "160px" }}>
          {consentData._signatures?.patient && (
            <img src={consentData._signatures.patient} alt="Patient" style={{ height: "55px", display: "block", margin: "0 auto 6px" }} />
          )}
          <div style={{ borderTop: "1.5px solid #222", paddingTop: "6px", fontSize: "10px" }}>
            <div style={{ fontWeight: "600" }}>{patient.vorname} {patient.nachname}</div>
            <div style={{ fontSize: "9px", color: "#888" }}>Patient:in</div>
          </div>
        </div>
        {!consentData.refused && (
          <div
            style={{ textAlign: "center", minWidth: "160px", ...(onDoctorSign && !consentData._signatures?.doctor ? { cursor: "pointer", borderRadius: "6px", padding: "8px", border: "2px dashed #93c5fd", background: "#eff6ff" } : {}) }}
            onClick={onDoctorSign && !consentData._signatures?.doctor ? onDoctorSign : undefined}
            title={onDoctorSign && !consentData._signatures?.doctor ? "Klicken zum Unterschreiben" : undefined}
          >
            {consentData._signatures?.doctor ? (
              <img src={consentData._signatures.doctor} alt="Arzt" style={{ height: "55px", display: "block", margin: "0 auto 6px" }} />
            ) : onDoctorSign ? (
              <div style={{ height: "55px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "#3b82f6" }}>Hier unterschreiben</span>
              </div>
            ) : null}
            <div style={{ borderTop: "1.5px solid #222", paddingTop: "6px", fontSize: "10px" }}>
              <div style={{ fontWeight: "600" }}>{practice.name || "Ärzt:in"}</div>
              <div style={{ fontSize: "9px", color: "#888" }}>Ärzt:in</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", fontSize: "9px", color: "#888", marginTop: "16px" }}>
        {consentData.refused ? "Abgelehnt" : "Unterschrieben"} am {new Date(consentData.signedAt).toLocaleString("de-DE")}{ortStr ? ` · ${ortStr}` : ""}
      </div>
    </div>
  );

  // Helper to render clipped pages for a content group
  const renderPages = (ContentComp, groupPages, pageOffset) =>
    Array.from({ length: groupPages }).map((_, i) => (
      <div key={pageOffset + i} data-pdf-page={pageOffset + i + 1} style={pageStyle}>
        <PageHeader pageNum={pageOffset + i + 1} />
        <div style={{ height: CONTENT_H, overflow: "hidden", padding: "0 44px" }}>
          <div style={{ marginTop: -(i * CONTENT_H) }}>
            <ContentComp />
          </div>
        </div>
        <PageFooter />
      </div>
    ));

  return (
    <>
      {/* Hidden measurement divs */}
      <div ref={measRefA} style={hiddenMeas}><ContentA /></div>
      <div ref={measRefB} style={hiddenMeas}><ContentB /></div>
      <div ref={measRefC} style={hiddenMeas}><ContentC /></div>

      {/* Visible A4 pages */}
      <div id="consent-form-pdf-target" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {renderPages(ContentA, pagesA, 0)}
        {renderPages(ContentB, pagesB, pagesA)}
        {renderPages(ContentC, pagesC, pagesA + pagesB)}
      </div>
    </>
  );
}

// ═══════════════════ Signature Pad ═══════════════════

function SignaturePad({ onSave, label, width = 320, height = 160 }) {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);
  const [hasStrokes, setHasStrokes] = React.useState(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = (e) => {
    if (e) e.preventDefault();
    setDrawing(false);
  };

  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (!hasStrokes) return onSave(null);
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{ width, height, cursor: "crosshair" }}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm">Hier unterschreiben</span>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={clear}>Löschen</button>
        <button className={`px-5 py-2 text-xs rounded-lg transition ${hasStrokes ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} onClick={save}>Bestätigen</button>
      </div>
    </div>
  );
}

function SignatureModal({ onComplete, onClose, existingSignatures }) {
  const handlePatientSave = (dataUrl) => {
    onComplete({ patient: dataUrl, doctor: existingSignatures?.doctor || null });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Unterschrift Patient:in</h3>
          <button className="p-1 text-gray-400 hover:text-gray-600" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mb-3">Die Unterschrift der Ärztin/des Arztes kann später hinzugefügt werden.</p>
        <SignaturePad key="patient-sig" label="Unterschrift Patient:in" onSave={handlePatientSave} />
        <button className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition py-1" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ═══════════════════ Treatment Map ═══════════════════

function compressImage(file, maxSize = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const result = canvas.toDataURL("image/jpeg", quality);
        resolve(result);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TreatmentMap({ markers, setMarkers, einheit, readOnly, notes, autoOpen, onAutoSave, onAutoCancel, facePhoto, onFacePhotoChange, planMode }) {
  const faceImg = facePhoto || FACE_IMAGE_B64;
  const photoInputRef = React.useRef(null);
  const [modalOpen, setModalOpen] = React.useState(!!autoOpen);
  const [saved, setSaved] = React.useState(markers.length > 0);
  React.useEffect(() => { if (markers.length > 0) setSaved(true); }, [markers]);
  const modalRef = React.useRef(null);

  // Pinch-to-zoom state for the modal face map
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const lastTouchDist = React.useRef(null);
  const lastTouchCenter = React.useRef(null);
  const isPinching = React.useRef(false);
  const justPinched = React.useRef(false);

  // Reset zoom when modal opens
  React.useEffect(() => { if (modalOpen) { setZoom(1); setPan({ x: 0, y: 0 }); } }, [modalOpen]);

  // Keep saved in sync when markers change externally (e.g. loading existing data)
  React.useEffect(() => { if (markers.length > 0 && !modalOpen) setSaved(true); }, []);

  const getTouchDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const getTouchCenter = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching.current = true;
      lastTouchDist.current = getTouchDist(e.touches[0], e.touches[1]);
      lastTouchCenter.current = getTouchCenter(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches[0], e.touches[1]);
      const newCenter = getTouchCenter(e.touches[0], e.touches[1]);
      if (lastTouchDist.current) {
        const scale = newDist / lastTouchDist.current;
        setZoom((z) => Math.min(5, Math.max(1, z * scale)));
      }
      if (lastTouchCenter.current) {
        const dx = newCenter.x - lastTouchCenter.current.x;
        const dy = newCenter.y - lastTouchCenter.current.y;
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
      lastTouchDist.current = newDist;
      lastTouchCenter.current = newCenter;
    }
  };

  const handleTouchEnd = (e) => {
    if (isPinching.current) {
      isPinching.current = false;
      justPinched.current = true;
      setTimeout(() => { justPinched.current = false; }, 300);
      lastTouchDist.current = null;
      lastTouchCenter.current = null;
      // Clamp pan to keep face visible
      setPan((p) => clampPan(p, zoom));
    }
  };

  const clampPan = (p, z) => {
    if (z <= 1) return { x: 0, y: 0 };
    const maxP = ((z - 1) / z) * 150; // rough limit
    return { x: Math.min(maxP, Math.max(-maxP, p.x)), y: Math.min(maxP, Math.max(-maxP, p.y)) };
  };

  const handleClick = (e) => {
    if (!modalRef.current || justPinched.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    // Account for zoom and pan: convert screen coords to face % coords
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const faceW = rect.width;
    const faceH = rect.height;
    const x = (rawX / faceW) * 100;
    const y = (rawY / faceH) * 100;
    setMarkers([...markers, { id: Date.now(), x, y, amount: "" }]);
  };

  const updateAmount = (id, val) => {
    setMarkers(markers.map((m) => (m.id === id ? { ...m, amount: val } : m)));
  };

  const removeMarker = (id) => {
    setMarkers(markers.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    setSaved(true);
    setModalOpen(false);
    if (onAutoSave) onAutoSave(markers);
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const faceSize = isMobile ? "min(85vw, 340px)" : "min(85vh - 100px, 700px)";
  const markerSize = isMobile ? Math.max(10, 21 / zoom) : 21;
  const markerFontSize = isMobile ? Math.max(6, 11 / zoom) : 11;

  // ── Read-only view (viewing existing Behandlungen) ──
  if (readOnly) {
    return (
      <div className="flex flex-col sm:flex-row gap-4" style={{ alignItems: "flex-start" }}>
        <div className="relative border border-gray-200 rounded-lg overflow-hidden select-none flex-shrink-0" style={{ width: 250, height: 250, background: "#fafafa" }}>
          <img src={faceImg} alt="Gesicht" className="w-full h-full object-contain pointer-events-none" draggable={false} />
          {markers.map((m, idx) => (
            <div key={m.id} className="absolute flex items-center justify-center" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}>
              <div className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold select-none" style={{ width: 17, height: 17, fontSize: 9, lineHeight: 1, boxShadow: "0 0 3px rgba(0,0,0,0.3)" }}>{idx + 1}</div>
            </div>
          ))}
        </div>
        {(markers.length > 0 || notes) && (
          <div className="flex gap-6" style={{ alignItems: "flex-start" }}>
            {markers.length > 0 && (
              <div className="space-y-1.5" style={{ minWidth: 140 }}>
                {markers.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold flex-shrink-0" style={{ width: 20, height: 20, fontSize: 10 }}>{idx + 1}</span>
                    <input type="text" inputMode="decimal" className="w-20 px-2 py-1 text-sm border border-gray-200 rounded bg-gray-50" value={m.amount} readOnly />
                    <span className="text-xs text-gray-400">{einheit}</span>
                  </div>
                ))}
              </div>
            )}
            {notes && (
              <div style={{ maxWidth: 220 }}>
                <span className="text-xs font-medium text-gray-500">Notizen: </span>
                <span className="text-xs text-gray-600">{notes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Editable view ──
  return (
    <div>
      {/* Trigger button or saved state (hidden when autoOpen — only modal needed) */}
      {!autoOpen && (
        saved && markers.length > 0 ? (() => {
          const totalUnits = Math.round(markers.reduce((s, m) => s + evalAmount(m.amount), 0) * 100) / 100;
          const totalStr = totalUnits % 1 === 0 ? totalUnits.toString() : totalUnits.toFixed(2).replace(/0+$/, "").replace(".", ",");
          return (
          <div>
            <div className="relative border border-gray-200 rounded-lg overflow-hidden select-none cursor-pointer hover:opacity-90 transition" style={{ width: 200, height: 200, background: "#fafafa" }} onClick={() => setModalOpen(true)} title="Klicken zum Bearbeiten">
              <img src={faceImg} alt="Gesicht" className="w-full h-full object-contain pointer-events-none" draggable={false} />
              {markers.map((m, idx) => (
                <div key={m.id} className="absolute flex items-center justify-center" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}>
                  <div className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold select-none" style={{ width: 15, height: 15, fontSize: 8, lineHeight: 1, boxShadow: "0 0 3px rgba(0,0,0,0.3)" }}>{idx + 1}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="text-xs text-gray-500">{markers.length} {markers.length === 1 ? "Punkt" : "Punkte"}{totalUnits > 0 && ` · ${totalStr} ${einheit}`} dokumentiert</span>
              <button className="text-xs text-blue-500 hover:text-blue-700" onClick={() => setModalOpen(true)}>Bearbeiten</button>
            </div>
          </div>
          );
        })() : (
          <button className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-700 font-medium transition py-1.5" onClick={() => setModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {planMode ? "Injektionspunkte planen" : "Injektionspunkte dokumentieren"}
          </button>
        )
      )}

      {/* Large modal for precise placement */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 sm:flex sm:items-center sm:justify-center sm:p-4" onClick={() => { setModalOpen(false); if (onAutoCancel) onAutoCancel(); }}>
          <div className="bg-white sm:rounded-xl shadow-2xl flex flex-col w-full h-full sm:h-auto" style={{ maxWidth: 1100, maxHeight: isMobile ? "100vh" : "95vh" }} onClick={(e) => e.stopPropagation()}>
            {/* Fixed header on mobile */}
            <div className="flex-shrink-0 p-4 sm:p-5 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Injektionspunkte setzen</h3>
                <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => { setModalOpen(false); if (onAutoCancel) onAutoCancel(); }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {!readOnly && (
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const compressed = await compressImage(file);
                    if (onFacePhotoChange) onFacePhotoChange(compressed);
                    trackEvent("face_photo_uploaded");
                  } catch (err) { console.error("Photo compress error", err); }
                  e.target.value = "";
                }} />
              )}
              <p className="text-xs text-gray-400 mb-1">
                <span className="hidden sm:inline">Klicke auf das Gesicht, um Injektionspunkte zu setzen.</span>
                <span className="sm:hidden">Tippe auf das Gesicht um Punkte zu setzen. Zwei Finger zum Zoomen.</span>
              </p>
              <p className="text-xs text-amber-500 mb-3">Die eingegebenen Mengen werden automatisch als Gesamtmenge des Präparats übernommen.</p>
              {zoom > 1 && (
                <button className="text-xs text-blue-500 hover:text-blue-700 mb-2 sm:hidden" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Zoom zurücksetzen</button>
              )}
            </div>
            {/* Single scrollable area on mobile, side-by-side on desktop */}
            <div className="flex-1 overflow-y-auto sm:overflow-y-auto px-4 sm:px-5">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <div className="flex-shrink-0">
                  <div
                    className="relative border border-gray-200 rounded-lg overflow-hidden select-none"
                    style={{ width: faceSize, height: faceSize, cursor: "crosshair", background: "#fafafa", touchAction: "none" }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div
                      ref={modalRef}
                      onClick={handleClick}
                      className="relative w-full h-full"
                      style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: "center center", transition: isPinching.current ? "none" : "transform 0.15s ease-out" }}
                    >
                      <img src={faceImg} alt="Gesicht" className="w-full h-full object-contain pointer-events-none" draggable={false} />
                      {markers.map((m, idx) => (
                        <div key={m.id} className="absolute flex items-center justify-center" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}>
                          <div className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold select-none" style={{ width: markerSize, height: markerSize, fontSize: markerFontSize, lineHeight: 1, boxShadow: "0 0 3px rgba(0,0,0,0.3)" }}>{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                    {!readOnly && facePhoto && (
                      <button
                        className="absolute bottom-2 right-2 rounded-full bg-white bg-opacity-90 shadow-md hover:bg-opacity-100 transition flex items-center justify-center"
                        style={{ width: 36, height: 36, zIndex: 20 }}
                        title="Foto entfernen"
                        onClick={(e) => { e.stopPropagation(); onFacePhotoChange?.(""); }}
                      >
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="mt-2">
                      {facePhoto ? (
                        <button
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                          Foto ändern
                        </button>
                      ) : (
                        <button
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                          <span className="sm:hidden">Patient:innenfoto aufnehmen</span><span className="hidden sm:inline">Patient:innenfoto hochladen</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 sm:overflow-y-auto" style={{ width: isMobile ? "100%" : 220, maxHeight: isMobile ? "none" : faceSize }}>
                  <div className="space-y-1.5">
                    {markers.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <span className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold flex-shrink-0" style={{ width: 18, height: 18, fontSize: 9 }}>{idx + 1}</span>
                        <input type="text" inputMode="text" className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" value={m.amount} placeholder={idx % 2 === 0 ? "z.B. 1,90" : "z.B. 2x3"} onChange={(e) => updateAmount(m.id, e.target.value)} />
                        <span className="text-xs text-gray-400">{einheit}</span>
                        <button className="p-1 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition flex-shrink-0" onClick={() => removeMarker(m.id)} title="Löschen">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Fixed footer */}
            <div className="flex-shrink-0 flex justify-end p-4 sm:px-5 sm:pb-5 pt-3 border-t border-gray-100">
              <button className="px-4 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition" onClick={handleSave}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ Mobile Scaled Preview ═══════════════════

function MobileScaledPreview({ children, a4Width, className }) {
  const wrapperRef = React.useRef(null);
  const innerRef = React.useRef(null);
  const [dims, setDims] = React.useState({ scale: 1, h: 0 });

  React.useEffect(() => {
    const update = () => {
      if (!wrapperRef.current || !innerRef.current) return;
      const containerW = wrapperRef.current.clientWidth;
      const s = Math.min(1, containerW / a4Width);
      const h = innerRef.current.offsetHeight;
      setDims({ scale: s, h });
    };
    // Delay to allow children to render
    const t = setTimeout(update, 50);
    window.addEventListener("resize", update);
    return () => { clearTimeout(t); window.removeEventListener("resize", update); };
  }, [a4Width]);

  return (
    <div ref={wrapperRef} className={className} style={{ overflow: "hidden", height: dims.h ? dims.h * dims.scale : "auto" }}>
      <div
        ref={innerRef}
        style={{
          width: a4Width,
          transform: `scale(${dims.scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ═══════════════════ Settings Panel ═══════════════════

function SettingsPanel({ practice, setPractice, show, setShow, onSave, isFirstTime, session, currentMEK, userId, patients, invoices, setPatients, setInvoices }) {
  const [pwCurrent, setPwCurrent] = React.useState("");
  const [pwNew, setPwNew] = React.useState("");
  const [pwConfirm, setPwConfirm] = React.useState("");
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwMsg, setPwMsg] = React.useState(null);

  const handleChangePassword = async () => {
    if (!pwNew || pwNew !== pwConfirm) return;
    if (pwNew.length < 6) { setPwMsg({ type: "error", text: "Neues Passwort muss mindestens 6 Zeichen lang sein." }); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      // Verify current password by attempting sign-in
      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: session.user.email, password: pwCurrent }),
      });
      if (!verifyRes.ok) { setPwMsg({ type: "error", text: "Aktuelles Passwort ist falsch." }); setPwLoading(false); return; }

      // Update password via Supabase Auth API
      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ password: pwNew }),
      });
      if (!updateRes.ok) { const err = await updateRes.json(); throw new Error(err.message || "Fehler beim Ändern des Passworts"); }

      // Re-wrap MEK with new password if E2EE is active
      if (currentMEK && userId) {
        try {
          const newSalt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
          const newPdk = await derivePDK(pwNew, newSalt);
          const { ciphertext: newWrapped, iv: newIv } = await encryptData(
            btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", currentMEK)))),
            newPdk
          );
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
            body: JSON.stringify({ mek_wrapped: newWrapped, mek_iv: newIv, mek_salt: newSalt }),
          });
        } catch (e) {
          console.error("Failed to re-wrap MEK with new password:", e);
        }
      }

      setPwMsg({ type: "success", text: "Passwort erfolgreich geändert." });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.message || "Fehler beim Ändern des Passworts." });
    }
    setPwLoading(false);
  };

  const [exportLoading, setExportLoading] = React.useState(false);
  const handleExportData = () => {
    setExportLoading(true);
    try {
      // Build decrypted patient list (full data for restore)
      const exportPatients = (patients || []).map(p => {
        const d = (typeof p.data === "object" && p.data) || {};
        return { id: p.id, ...d };
      });

      // Build invoice list — include ALL fields so restore is lossless
      const exportInvoices = (invoices || []).map(inv => {
        const { _supabaseId, encrypted_patient, patient_iv, ...rest } = inv;
        return rest;
      });

      const exportData = {
        _exportVersion: 2,
        _exportDate: new Date().toISOString(),
        _appVersion: "ephia-invoicing-mvp",
        practice: { ...practice },
        patients: exportPatients,
        invoices: exportInvoices,
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ephia-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export fehlgeschlagen: " + e.message);
    }
    setExportLoading(false);
  };

  const [importLoading, setImportLoading] = React.useState(false);
  const importFileRef = React.useRef(null);

  const handleImportData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._exportVersion || !data.invoices || !data.patients) {
        throw new Error("Ungültiges Backup-Format.");
      }
      const confirmed = window.confirm(
        `Backup vom ${new Date(data._exportDate).toLocaleDateString("de-DE")} gefunden.\n\n` +
        `${data.patients.length} Patient:innen und ${data.invoices.length} Rechnungen.\n\n` +
        `ACHTUNG: Alle vorhandenen Daten werden durch die importierten Daten ersetzt. Fortfahren?`
      );
      if (!confirmed) { setImportLoading(false); return; }

      const accessToken = session?.access_token;
      const uid = session?.user?.id || userId;
      if (!accessToken || !uid) throw new Error("Keine aktive Sitzung.");

      // 1. Restore practice settings
      if (data.practice) {
        const restoredPractice = { ...data.practice };
        await supabaseUpdateProfile(accessToken, uid, restoredPractice);
        setPractice(restoredPractice);
      }

      // 2. Delete existing patients and invoices
      for (const inv of invoices || []) {
        if (inv._supabaseId) {
          try { await supabaseDeleteInvoice(accessToken, inv._supabaseId); } catch (err) { console.warn("Delete invoice failed:", err); }
        }
      }
      for (const p of patients || []) {
        if (p.id) {
          try { await supabaseDeletePatient(accessToken, p.id); } catch (err) { console.warn("Delete patient failed:", err); }
        }
      }

      // 3. Re-create patients (encrypt if MEK available)
      const newPatients = [];
      for (const p of data.patients) {
        const { id, ...patientData } = p;
        let toStore = patientData;
        if (currentMEK) {
          const { ciphertext, iv } = await encryptData(patientData, currentMEK);
          toStore = { encrypted: ciphertext, iv, encryption_version: 1 };
        }
        try {
          const created = await supabaseUpsertPatient(accessToken, uid, toStore);
          const rec = Array.isArray(created) ? created[0] : created;
          newPatients.push({ ...rec, data: patientData });
        } catch (err) { console.warn("Create patient failed:", err); }
      }
      setPatients(newPatients);

      // 4. Re-create invoices (encrypt patient data if MEK available)
      const newInvoices = [];
      for (const inv of data.invoices) {
        let invoiceData = { ...inv };
        // Remove internal fields that shouldn't be stored
        delete invoiceData._supabaseId;
        delete invoiceData._createdAt;
        if (currentMEK && invoiceData.patient) {
          const { ciphertext, iv } = await encryptData(invoiceData.patient, currentMEK);
          invoiceData = { ...invoiceData, encrypted_patient: ciphertext, patient_iv: iv };
          delete invoiceData.patient;
        }
        try {
          const created = await supabaseCreateInvoice(accessToken, uid, invoiceData);
          // Restore patient for in-memory use
          const memInv = { ...inv, _supabaseId: created.id, _createdAt: created.created_at };
          delete memInv._supabaseId; // will be set from created
          newInvoices.push({ ...inv, _supabaseId: created.id, _createdAt: created.created_at });
        } catch (err) { console.warn("Create invoice failed:", err); }
      }
      setInvoices(newInvoices);

      alert(`Import erfolgreich: ${newPatients.length} Patient:innen und ${newInvoices.length} Rechnungen wiederhergestellt.`);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Import fehlgeschlagen: " + err.message);
    }
    setImportLoading(false);
  };

  const inputCls2 = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

  const f = (label, key, ph, required = true) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required ? " *" : ""}</label>
      <input
        className={inputCls2}
        value={practice[key]}
        placeholder={ph}
        onChange={(e) => setPractice({ ...practice, [key]: e.target.value })}
      />
    </div>
  );

  if (!show) return null;

  const sectionHeading = (text) => (
    <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">{text}</p>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl mx-0 sm:mx-4 my-auto flex flex-col" style={{ maxWidth: 900, width: "100%", maxHeight: "95vh" }}>
        {/* Sticky header */}
        <div className="flex-shrink-0 px-5 sm:px-8 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Praxis-Einstellungen</h3>
              {isFirstTime && (
                <p className="text-xs text-gray-400 mt-1">Willkommen! Bitte trag Deine Praxisdaten ein, bevor Du Deine erste Rechnung erstellst.</p>
              )}
            </div>
            {!isFirstTime && <button className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1" onClick={() => setShow(false)}>✕</button>}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          {/* ── Praxisdaten ── */}
          {sectionHeading("Praxisdaten")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            {f("Praxisname", "name", "Dr. Muster")}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                Stadt (Behandlungsort) *
                <InfoTooltip>Gib die Stadt ein, in der Du üblicherweise praktizierst. Dieser Ort wird automatisch als Behandlungsort auf neuen Rechnungen vorausgefüllt.</InfoTooltip>
              </label>
              <input className={inputCls2} value={practice.city} placeholder="z.B. Berlin" onChange={(e) => setPractice({ ...practice, city: e.target.value })} />
            </div>
            {f("Adresszeile 1", "address1", "Straße Nr.")}
            {f("Adresszeile 2", "address2", "PLZ Ort")}
            {f("Adresszeile 3 (optional)", "address3", "", false)}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Land</label>
              <input className={inputCls2 + " bg-gray-50 text-gray-400 cursor-not-allowed"} value="Deutschland" disabled />
            </div>
          </div>

          {/* ── Logo ── */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-2">Praxis-Logo</label>
            {practice.logo ? (
              <div className="flex items-center gap-4">
                <img src={practice.logo} alt="Logo" style={{ maxHeight: 48, maxWidth: 120, objectFit: "contain" }} className="rounded" />
                <div className="flex flex-col gap-1.5">
                  <button className="text-xs text-red-500 hover:text-red-700 text-left" onClick={() => setPractice({ ...practice, logo: "", logoReplacesName: false })}>Entfernen</button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400" checked={!!practice.logoReplacesName} onChange={(e) => setPractice({ ...practice, logoReplacesName: e.target.checked })} />
                    <span className="text-xs text-gray-600">Logo ersetzt Praxisname</span>
                  </label>
                </div>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Logo hochladen
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) { alert("Logo darf max. 500 KB groß sein."); return; }
                  const reader = new FileReader();
                  reader.onload = () => setPractice({ ...practice, logo: reader.result });
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }} />
              </label>
            )}
          </div>

          {/* ── Kontakt & Bankverbindung ── */}
          {sectionHeading("Kontakt & Bankverbindung")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            {f("Telefon", "phone", "")}
            {f("E-Mail", "email", "")}
            {f("Bankname", "bankName", "")}
            {f("IBAN", "iban", "")}
            {f("BIC", "bic", "")}
            {f("PayPal", "paypal", "name@email.de", false)}
          </div>

          {/* ── Rechnungseinstellungen ── */}
          {sectionHeading("Rechnungseinstellungen")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition sm:col-span-2">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400 mt-0.5" checked={practice.kleinunternehmer} onChange={(e) => setPractice({ ...practice, kleinunternehmer: e.target.checked })} />
              <div>
                <span className="text-sm text-gray-700">MwSt.-befreit (Kleinunternehmer&shy;regelung §19 UStG)</span>
                <p className="text-[10px] text-gray-400 mt-0.5">Keine Umsatzsteuer auf Rechnungen ausweisen</p>
              </div>
            </label>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Standard-Zahlungsfrist (Tage)</label>
              <input type="number" min="0" className={inputCls2} value={practice.zahlungsfrist ?? 14} placeholder="14" onChange={(e) => setPractice({ ...practice, zahlungsfrist: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })} />
              <p className="text-[10px] text-gray-400 mt-1">Wird automatisch auf neuen Rechnungen eingesetzt</p>
            </div>
          </div>

          {/* ── Gespeicherte Präparate ── */}
          {sectionHeading("Gespeicherte Präparate")}
          <div className="mb-8">
            <p className="text-[10px] text-gray-400 mb-4">Definiere Deine häufig verwendeten Präparate. Beim Erstellen einer Rechnung kannst Du sie mit einem Klick auswählen.</p>
            {(practice.praeparate || []).map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 mb-2">
                <input className={inputCls2 + " flex-1"} value={p.name} placeholder="Präparatsname" onChange={(e) => { const arr = [...(practice.praeparate || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setPractice({ ...practice, praeparate: arr }); }} />
                <select className={inputCls2 + " w-20"} value={p.einheit || "ml"} onChange={(e) => { const arr = [...(practice.praeparate || [])]; arr[idx] = { ...arr[idx], einheit: e.target.value }; setPractice({ ...practice, praeparate: arr }); }}>
                  <option value="ml">ml</option>
                  <option value="SE">SE</option>
                  <option value="IE">IE</option>
                </select>
                <div className="relative">
                  <input className={inputCls2 + " w-28 pr-8"} type="text" inputMode="decimal" value={p.preisStr ?? ""} placeholder="0,00" onChange={(e) => { const v = e.target.value.replace(/[^\d,.\- ]/g, ""); const arr = [...(practice.praeparate || [])]; arr[idx] = { ...arr[idx], preisStr: v }; setPractice({ ...practice, praeparate: arr }); }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                </div>
                <button className="p-1.5 text-gray-400 hover:text-red-500 transition flex-shrink-0" onClick={() => { const arr = [...(practice.praeparate || [])]; arr.splice(idx, 1); setPractice({ ...practice, praeparate: arr }); }} title="Entfernen">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <button
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 transition"
              onClick={() => setPractice({ ...practice, praeparate: [...(practice.praeparate || []), { name: "", einheit: "ml", preisStr: "" }] })}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Präparat hinzufügen
            </button>
          </div>

          {/* ── Sicherheit ── */}
          {sectionHeading("Sicherheit")}
          <div className="space-y-4 mb-8">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400 mt-0.5" checked={practice.autoLogoutEnabled !== false} onChange={(e) => setPractice({ ...practice, autoLogoutEnabled: e.target.checked })} />
              <div>
                <span className="text-sm text-gray-700">Automatischer Logout nach 15 Min. Inaktivität</span>
                <p className="text-[10px] text-gray-400 mt-0.5">Empfohlen zum Schutz von Patient:innendaten</p>
              </div>
            </label>
            {practice.autoLogoutEnabled === false && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <strong>Achtung:</strong> Ohne Auto-Logout bist Du selbst dafür verantwortlich, dass keine unbefugten Personen Zugriff erhalten.
              </p>
            )}
            {!isFirstTime && session && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-3">Passwort ändern</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="password" className={inputCls2} placeholder="Aktuelles Passwort" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} />
                  <input type="password" className={inputCls2} placeholder="Neues Passwort" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
                  <input type="password" className={`${inputCls2} ${pwNew && pwConfirm && pwNew !== pwConfirm ? "!border-red-300 !ring-red-400" : ""}`} placeholder="Bestätigen" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />
                </div>
                {pwMsg && (
                  <p className={`text-xs mt-2 ${pwMsg.type === "error" ? "text-red-500" : "text-green-600"}`}>{pwMsg.text}</p>
                )}
                <button
                  className="mt-3 px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                  disabled={pwLoading || !pwCurrent || !pwNew || pwNew !== pwConfirm}
                  onClick={handleChangePassword}
                >
                  {pwLoading ? "Wird geändert..." : "Passwort ändern"}
                </button>
              </div>
            )}
          </div>

          {/* ── Daten ── */}
          {!isFirstTime && session && (
            <>
              {sectionHeading("Daten")}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">Export</p>
                  <p className="text-[10px] text-gray-400 mb-3">Alle Daten als JSON-Datei herunterladen.</p>
                  <button
                    className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition"
                    disabled={exportLoading}
                    onClick={handleExportData}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {exportLoading ? "Exportiert..." : "Alle Daten exportieren"}
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">Import</p>
                  <p className="text-[10px] text-gray-400 mb-3">Daten aus Backup wiederherstellen. Bestehende Daten werden ersetzt.</p>
                  <input ref={importFileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportData} />
                  <button
                    className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition"
                    disabled={importLoading}
                    onClick={() => importFileRef.current?.click()}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                    {importLoading ? "Importiert..." : "Backup wiederherstellen"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className={`flex-shrink-0 px-5 sm:px-8 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl ${isFirstTime ? "flex justify-end" : "flex justify-between"}`}>
          {!isFirstTime && (
            <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition" onClick={() => setShow(false)}>
              Abbrechen
            </button>
          )}
          <button className="px-5 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition" onClick={() => { onSave(); setShow(false); }}>
            {isFirstTime ? "Speichern und loslegen" : "Speichern und schließen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Invoice Preview ═══════════════════

function InvoicePreview({ practice, patient: rawPatient, invoiceMeta, lineItems, begruendung, targetGesamt }) {
  const patient = rawPatient || {};
  const zwischensumme = lineItems.reduce((s, it) => s + it.betrag, 0);
  const isKlein = practice.kleinunternehmer;
  const isAusland = patient.country && patient.country !== "Deutschland";
  const isMedical = !!(invoiceMeta && invoiceMeta.diagnose);
  const noMwst = isKlein || isAusland || isMedical;
  // When targetGesamt is set, force the total to match and derive MwSt as the difference
  const standardMwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  const standardGesamt = Math.round((zwischensumme + standardMwst) * 100) / 100;
  const gesamt = (targetGesamt && !noMwst && targetGesamt !== standardGesamt) ? targetGesamt : standardGesamt;
  const mwst = (targetGesamt && !noMwst && targetGesamt !== standardGesamt) ? Math.round((targetGesamt - zwischensumme) * 100) / 100 : standardMwst;
  const hasHonorarvereinbarung = lineItems.some((it) => it.steigerung != null && it.steigerung > 3.5);

  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a", padding: "40px 44px", width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden" },
    h: { fontSize: "16px", fontWeight: "700", color: "#222", marginBottom: "4px" },
    addr: { fontSize: "11px", color: "#444", marginBottom: "28px" },
    patLabel: { fontSize: "9.5px", color: "#999", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" },
    th: { textAlign: "left", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thFirst: { textAlign: "left", padding: "5px 6px 5px 0", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thR: { textAlign: "right", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thRLast: { textAlign: "right", padding: "5px 0 5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    td: { padding: "5px 6px", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdFirst: { padding: "5px 6px 5px 0", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdR: { padding: "5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
    tdRLast: { padding: "5px 0 5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
  };

  return (
    <div id="invoice-preview" style={S.page}>
      {practice.logo && !practice.logoReplacesName && (
        <img src={practice.logo} alt="Logo" style={{ position: "absolute", top: "40px", right: "44px", maxHeight: "60px", maxWidth: "160px", objectFit: "contain" }} />
      )}
      {practice.logo && practice.logoReplacesName ? (
        <div style={{ marginBottom: "8px" }}>
          <img src={practice.logo} alt="Logo" style={{ maxHeight: "60px", maxWidth: "200px", objectFit: "contain", display: "block" }} />
        </div>
      ) : (
        <div style={S.h}>{practice.name || "Logo Arztpraxis"}</div>
      )}
      {practice.logo && practice.logoReplacesName && practice.name && (
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#222", marginBottom: "2px" }}>{practice.name}</div>
      )}
      <div style={S.addr}>
        <div>{practice.address1}</div>
        <div>{practice.address2}</div>
        {practice.address3 && <div>{practice.address3}</div>}
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={S.patLabel}>Anschrift Patient:in</div>
        <div>{[patient.vorname, patient.nachname].filter(Boolean).join(" ") || patient.name || ""}</div>
        <div>{patient.address1 || ""}</div>
        <div>{patient.address2 || ""}</div>
        {patient.country && patient.country !== "Deutschland" && (
          <div>{patient.country}</div>
        )}
      </div>

      <div style={{ marginBottom: "6px" }}>
        {invoiceMeta.ort}{invoiceMeta.ort && invoiceMeta.datum ? ", " : ""}{fmtDate(invoiceMeta.datum)}
      </div>
      <div style={{ fontWeight: "700", fontSize: "12px", marginBottom: invoiceMeta.diagnose ? "6px" : "18px" }}>
        Rechnung Nr. {invoiceMeta.nummer || "X"}
      </div>
      {invoiceMeta.diagnose && (
        <div style={{ fontSize: "10px", color: "#444", marginBottom: "14px" }}>
          Diagnose: {invoiceMeta.diagnose}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.thFirst}>GOÄ-Ziffer</th>
            <th style={S.th}>Bezeichnung der Leistung</th>
            <th style={S.thR}>Punktzahl</th>
            <th style={S.thR}>Steigerungssatz</th>
            <th style={S.thRLast}>Betrag (€)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((it, i) => (
            <tr key={i}>
              <td style={S.tdFirst}>{it.goaCode}</td>
              <td style={S.td}>{it.description}</td>
              <td style={S.tdR}>{it.punkte ?? ""}</td>
              <td style={S.tdR}>{it.steigerung != null ? (Math.round(it.steigerung * 100) / 100).toFixed(2).replace(".", ",") : ""}</td>
              <td style={S.tdRLast}>{fmt(it.betrag)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {!noMwst && (
            <tr style={{ borderTop: "1.5px solid #222" }}>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zwischensumme</td>
              <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(zwischensumme)}</td>
            </tr>
          )}
          {!noMwst && (
            <tr>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zzgl. 19% MwSt.</td>
              <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(mwst)}</td>
            </tr>
          )}
          <tr style={{ fontWeight: "700", borderTop: noMwst ? "1.5px solid #222" : undefined }}>
            <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Gesamtbetrag</td>
            <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(gesamt)}</td>
          </tr>
          {isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
                Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
              </td>
            </tr>
          )}
          {isAusland && !isKlein && !isMedical && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
                Kein inländischer Wohnsitz. Umsatzsteuer entfällt.
              </td>
            </tr>
          )}
          {isMedical && !isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
                Umsatzsteuerbefreit gemäß §4 Nr. 14a UStG (Heilbehandlung im Bereich der Humanmedizin).
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {begruendung && (
        <div style={{ fontSize: "10px", color: "#444", marginBottom: "16px" }}>
          <span style={{ fontWeight: 600 }}>Begründung gemäß §5 Abs. 2 GOÄ:</span>{" "}
          <span style={{ fontStyle: "italic" }}>{begruendung}</span>
        </div>
      )}

      {hasHonorarvereinbarung && (
        <div style={{ fontSize: "10px", color: "#444", marginBottom: "16px", fontStyle: "italic" }}>
          Abrechnung gemäß § 2 GOÄ auf Grundlage einer vor Behandlungsbeginn geschlossenen Honorarvereinbarung.
        </div>
      )}

      {invoiceMeta.zahlungsfrist != null && invoiceMeta.zahlungsfrist !== "" && (
        <div style={{ fontSize: "10px", color: "#444", marginBottom: "16px" }}>
          Bitte überweisen Sie den Rechnungsbetrag innerhalb von {invoiceMeta.zahlungsfrist} Tagen
          {invoiceMeta.datum ? (() => { const d = new Date(invoiceMeta.datum); d.setDate(d.getDate() + Number(invoiceMeta.zahlungsfrist)); return ` (bis zum ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })})`; })() : ""}
          {" "}auf das unten angegebene Konto.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#888", borderTop: "1px solid #ccc", paddingTop: "8px", position: "absolute", bottom: "40px", left: "44px", right: "44px" }}>
        <div>
          <div>{fmtPhone(practice.phone)}</div>
          <div>{practice.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>{practice.bankName}</div>
          <div>IBAN: {practice.iban}</div>
          <div>BIC: {practice.bic}</div>
          {practice.paypal && <div>PayPal: {practice.paypal}</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Honorarvereinbarung Preview ═══════════════════

function HonorarvereinbarungPreview({ practice, patient: rawPatient, invoiceMeta, lineItems, isStandalone, signatures, onSignatureClick, onDoctorSign }) {
  const patient = rawPatient || {};
  const goaItems = lineItems.filter((it) => !it.isProduct);
  const praeparatItems = lineItems.filter((it) => it.isPraeparat);
  // For standalone HV: include all items (GOÄ + Präparat) in the table
  const tableItems = isStandalone ? lineItems.filter((it) => !it.isProduct || it.isPraeparat) : goaItems;
  const tableZwischensumme = tableItems.reduce((s, it) => s + it.betrag, 0);
  const isKlein = practice.kleinunternehmer;
  const isAusland = patient.country && patient.country !== "Deutschland";
  const isMedical = !!(invoiceMeta && invoiceMeta.diagnose);
  const noMwst = isKlein || isAusland || isMedical;
  const tableMwst = noMwst ? 0 : Math.round(tableZwischensumme * 0.19 * 100) / 100;
  const tableGesamt = Math.round((tableZwischensumme + tableMwst) * 100) / 100;
  // For non-standalone, keep old variable names for backwards compat
  const goaZwischensumme = isStandalone ? tableZwischensumme : goaItems.reduce((s, it) => s + it.betrag, 0);
  const goaMwst = isStandalone ? tableMwst : (noMwst ? 0 : Math.round(goaZwischensumme * 0.19 * 100) / 100);
  const goaGesamt = isStandalone ? tableGesamt : Math.round((goaZwischensumme + goaMwst) * 100) / 100;
  const hasPraeparat = praeparatItems.length > 0;

  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a", padding: "40px 44px", width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden" },
    th: { textAlign: "left", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thFirst: { textAlign: "left", padding: "5px 6px 5px 0", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thR: { textAlign: "right", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thRLast: { textAlign: "right", padding: "5px 0 5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    td: { padding: "5px 6px", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdFirst: { padding: "5px 6px 5px 0", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdR: { padding: "5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
    tdRLast: { padding: "5px 0 5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
    line: { borderBottom: "1px solid #222", display: "inline-block", minWidth: "340px" },
  };

  return (
    <div id="hv-preview" style={S.page}>
      {practice.logo && !practice.logoReplacesName && (
        <img src={practice.logo} alt="Logo" style={{ position: "absolute", top: "40px", right: "44px", maxHeight: "60px", maxWidth: "160px", objectFit: "contain" }} />
      )}
      {practice.logo && practice.logoReplacesName && (
        <div style={{ marginBottom: "8px" }}>
          <img src={practice.logo} alt="Logo" style={{ maxHeight: "60px", maxWidth: "200px", objectFit: "contain", display: "block" }} />
        </div>
      )}
      <div style={{ fontSize: "16px", fontWeight: "700", color: "#222", marginBottom: "24px" }}>
        Honorarvereinbarung gemäß § 2 GOÄ
      </div>

      <div style={{ marginBottom: "6px" }}>Zwischen</div>
      <div style={{ marginBottom: "4px" }}>{practice.name || "Name der Ärztin/des Arztes"}</div>
      <div style={{ marginBottom: "20px" }}>
        {practice.address1}{practice.address2 ? `, ${practice.address2}` : ""}
        {practice.address3 ? `, ${practice.address3}` : ""}
      </div>

      <div style={{ marginBottom: "20px" }}>und</div>

      <div style={{ marginBottom: "14px" }}>
        {[patient.vorname, patient.nachname].filter(Boolean).join(" ") || patient.name || ""}
      </div>
      <div style={{ marginBottom: "24px" }}>
        {[patient.address1, patient.address2, (patient.country && patient.country !== "Deutschland") ? patient.country : ""].filter(Boolean).join(", ") || ""}
      </div>

      <div style={{ marginBottom: "18px" }}>
        wird folgende Vereinbarung über ärztliche Leistungen geschlossen:
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.thFirst}>GOÄ-Ziffer</th>
            <th style={S.th}>Bezeichnung der Leistung</th>
            <th style={S.thR}>Punktzahl</th>
            <th style={S.thR}>Steigerungssatz</th>
            <th style={S.thRLast}>Betrag (€)</th>
          </tr>
        </thead>
        <tbody>
          {tableItems.map((it, i) => (
            <tr key={i}>
              <td style={S.tdFirst}>{it.goaCode || (it.isPraeparat ? "—" : "")}</td>
              <td style={S.td}>{it.isPraeparat ? `${it.quantity || ""}${it.einheit || "ml"} ${it.praeparatName || it.description} (Präparat, ${fmt(it.unitPrice || 0)} €/${it.einheit || "ml"})` : it.description}</td>
              <td style={S.tdR}>{it.punkte != null ? it.punkte : ""}</td>
              <td style={S.tdR}>{it.steigerung != null ? (Math.round(it.steigerung * 100) / 100).toFixed(2).replace(".", ",") : ""}</td>
              <td style={S.tdRLast}>{fmt(it.betrag)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {!noMwst && (
            <tr style={{ borderTop: "1.5px solid #222" }}>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zwischensumme</td>
              <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(tableZwischensumme)}</td>
            </tr>
          )}
          {!noMwst && (
            <tr>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zzgl. 19% MwSt.</td>
              <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(tableMwst)}</td>
            </tr>
          )}
          <tr style={{ fontWeight: "700", borderTop: noMwst ? "1.5px solid #222" : undefined }}>
            <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Gesamtbetrag</td>
            <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(tableGesamt)}</td>
          </tr>
          {isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
                Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
              </td>
            </tr>
          )}
          {isAusland && !isKlein && !isMedical && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
                Kein inländischer Wohnsitz. Umsatzsteuer entfällt.
              </td>
            </tr>
          )}
          {isMedical && !isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
                Umsatzsteuerbefreit gemäß §4 Nr. 14a UStG (Heilbehandlung im Bereich der Humanmedizin).
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {hasPraeparat && isStandalone && (
        <div style={{ marginBottom: "16px", fontSize: "10px", color: "#444" }}>
          Die tatsächlichen Kosten für das Präparat können je nach Behandlungsverlauf von den oben genannten geplanten Kosten abweichen.
        </div>
      )}
      {hasPraeparat && !isStandalone && (
        <div style={{ marginBottom: "16px", fontSize: "10px", color: "#444" }}>
          {praeparatItems.map((it, i) => (
            <div key={i}>Präparat: {it.praeparatName || it.description} — {fmt(it.unitPrice)} € pro {it.einheit || "ml"} (nach tatsächlichem Verbrauch)</div>
          ))}
          <div style={{ marginTop: "4px" }}>
            Die Kosten für Präparate und Sachkosten richten sich nach dem tatsächlichen Verbrauch im Rahmen der Behandlung und werden in der abschließenden Rechnung gesondert ausgewiesen.
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid #ccc", paddingTop: "14px", marginBottom: "20px" }}>
        <div style={{ fontWeight: "700", marginBottom: "4px" }}>Hinweis gemäß § 2 Abs. 2 Satz 2 GOÄ:</div>
        <div>
          Es wird ausdrücklich darauf hingewiesen, dass eine Erstattung der vereinbarten Vergütung durch
          Erstattungsstellen möglicherweise nicht in vollem Umfang gewährleistet ist.
        </div>
      </div>

      <div style={{ marginTop: "30px", marginBottom: "60px" }}>
        <span>Ort, Datum: {invoiceMeta.ort ? `${invoiceMeta.ort}, ${fmtDate(invoiceMeta.datum)}` : ""}</span>
      </div>
      <div style={{ borderRadius: "8px", padding: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div
            style={{ textAlign: "center", minWidth: "140px", ...(onDoctorSign && !signatures?.doctor ? { cursor: "pointer", borderRadius: "6px", padding: "8px", border: "2px dashed #93c5fd", background: "#eff6ff" } : {}) }}
            onClick={onDoctorSign && !signatures?.doctor ? onDoctorSign : undefined}
            title={onDoctorSign && !signatures?.doctor ? "Klicken zum Unterschreiben" : undefined}
          >
            {signatures?.doctor ? (
              <img src={signatures.doctor} alt="Unterschrift Ärzt:in" style={{ height: "60px", marginBottom: "4px", display: "block", margin: "0 auto 4px" }} />
            ) : onDoctorSign ? (
              <div style={{ height: "55px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", color: "#3b82f6" }}>Hier unterschreiben</span>
              </div>
            ) : null}
            <div style={{ borderTop: signatures?.doctor ? "1px solid #999" : "none", paddingTop: signatures?.doctor ? "4px" : (onDoctorSign ? "4px" : "40px"), minWidth: "140px" }}>
              <span>Unterschrift Ärzt:in</span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            {signatures?.patient && (
              <img src={signatures.patient} alt="Unterschrift Patient:in" style={{ height: "60px", marginBottom: "4px", display: "block", margin: "0 auto 4px" }} />
            )}
            <div style={{ borderTop: signatures?.patient ? "1px solid #999" : "none", paddingTop: signatures?.patient ? "4px" : "40px", minWidth: "140px" }}>
              <span>Unterschrift Patient:in</span>
            </div>
          </div>
        </div>
        {onSignatureClick && (
          <div style={{ textAlign: "center", marginTop: "8px", fontSize: "11px", color: "#3b82f6", fontWeight: 500 }}>
            ✍️ Tippen zum Unterschreiben
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════ Patient List View ═══════════════════

function PatientListView({ patients, invoices, kleinunternehmer, onSelectPatient, onDeletePatient, onBack, onAddPatient }) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key) => {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  // Build patient list from patients table, enriched with invoice counts
  // Safely handle both decrypted (object) and still-encrypted (string) patient data
  const patientList = patients.map((p) => {
    const d = (typeof p.data === "object" && p.data !== null) ? p.data : {};
    const email = (d.email || "").toLowerCase();
    const dbId = p.id;
    const matchingInvoices = invoices.filter((inv) => {
      if (inv._standalone) return false;
      if (inv._patientDbId && dbId) return inv._patientDbId === dbId;
      const invEmail = ((inv.patient || {}).email || "").toLowerCase();
      return email && invEmail && invEmail === email;
    });
    const hvCount = matchingInvoices.filter((inv) => inv.hasHV != null ? inv.hasHV : (inv.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5)).length;
    const currentYear = new Date().getFullYear();
    const thisYearInvoices = matchingInvoices.filter((inv) => {
      const d2 = inv.invoiceMeta?.datum || inv.savedAt || "";
      return d2.startsWith(String(currentYear));
    });
    const invoiceGesamt = (inv) => {
      const netto = (inv.lineItems || []).reduce((s, it) => s + (it.betrag || 0), 0);
      const isAusland = (inv.patient || {}).country && (inv.patient || {}).country !== "Deutschland";
      const invIsMedical = !!(inv.invoiceMeta && inv.invoiceMeta.diagnose) || inv.indicationType === "medical";
      const invKlein = inv._kleinunternehmer != null ? inv._kleinunternehmer : kleinunternehmer;
      const noMwst = invKlein || isAusland || invIsMedical;
      const mwst = noMwst ? 0 : Math.round(netto * 0.19 * 100) / 100;
      return Math.round((netto + mwst) * 100) / 100;
    };
    const outstandingInvs = thisYearInvoices.filter((inv) => inv.paymentStatus !== "bezahlt" && !inv._hvOnly && !inv._standalone);
    const paidInvs = thisYearInvoices.filter((inv) => inv.paymentStatus === "bezahlt" && !inv._hvOnly && !inv._standalone);
    const offen = outstandingInvs.reduce((s, inv) => s + invoiceGesamt(inv), 0);
    const paidThisYear = paidInvs.reduce((s, inv) => s + invoiceGesamt(inv), 0);
    return {
      email,
      vorname: d.vorname || "",
      nachname: d.nachname || "",
      invoiceCount: matchingInvoices.length,
      hvCount,
      offen: Math.round(offen * 100) / 100,
      paidThisYear: Math.round(paidThisYear * 100) / 100,
      lastInvoiceDate: matchingInvoices.length > 0 ? matchingInvoices.sort((a, b) => (b.invoiceMeta.datum || "").localeCompare(a.invoiceMeta.datum || ""))[0].invoiceMeta.datum : null,
      _raw: p,
    };
  });

  const filtered = search.trim()
    ? patientList.filter((p) => {
        const s = search.toLowerCase();
        return p.vorname.toLowerCase().includes(s) || p.nachname.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || String(p.invoiceCount).includes(s) || (p.lastInvoiceDate ? fmtDate(p.lastInvoiceDate).toLowerCase().includes(s) : false);
      })
    : patientList;

  const getters = {
    vorname: (p) => p.vorname,
    nachname: (p) => p.nachname,
    email: (p) => p.email,
    invoiceCount: (p) => p.invoiceCount,
    offen: (p) => p.offen,
    paidThisYear: (p) => p.paidThisYear,
    lastDate: (p) => p.lastInvoiceDate || "",
  };

  const sorted = (() => {
    if (!sortKey || !getters[sortKey]) return filtered;
    const getter = getters[sortKey];
    return [...filtered].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "de");
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  const thCls = "text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none whitespace-nowrap";

  if (patients.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-300 text-4xl mb-3">👤</div>
        <p className="text-sm text-gray-500 mb-1">Noch keine Patient:innen vorhanden.</p>
        <p className="text-xs text-gray-400 mb-3">Patient:innen werden automatisch beim Erstellen einer Rechnung angelegt.</p>
        <div className="flex items-center justify-center gap-3">
          <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={onBack}>
            ← Neue Rechnung erstellen
          </button>
          {onAddPatient && <button className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition" onClick={onAddPatient}>+ Patient:in hinzufügen</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-800">Patient:innen</h2>
          {onAddPatient && <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition" onClick={onAddPatient}>+ Patient:in hinzufügen</button>}
        </div>
        <div className="relative">
          <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-full sm:w-56"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className={thCls} onClick={() => handleSort("vorname")}>Vorname{sortIndicator("vorname")}</th>
            <th className={thCls} onClick={() => handleSort("nachname")}>Nachname{sortIndicator("nachname")}</th>
            <th className={thCls} onClick={() => handleSort("email")}>E-Mail{sortIndicator("email")}</th>
            <th className={thCls + " hidden sm:table-cell"} onClick={() => handleSort("invoiceCount")}>Rechnungen{sortIndicator("invoiceCount")}</th>
            <th className={thCls + " hidden md:table-cell"} onClick={() => handleSort("offen")}>Offen{sortIndicator("offen")}</th>
            <th className={thCls + " hidden md:table-cell"} onClick={() => handleSort("paidThisYear")}>Bezahlt {new Date().getFullYear()}{sortIndicator("paidThisYear")}</th>
            <th className={thCls + " hidden lg:table-cell"} onClick={() => handleSort("lastDate")}>Letzte Rechnung{sortIndicator("lastDate")}</th>
            <th className="px-3 py-2 w-10 hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.email} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onSelectPatient(p)}>
              <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-700">{p.vorname}</span></td>
              <td className="px-3 py-3 align-middle"><span className="text-sm font-medium text-gray-700">{p.nachname}</span></td>
              <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500 break-all">{p.email}</span></td>
              <td className="px-3 py-3 align-middle hidden sm:table-cell"><span className="text-sm text-gray-500">{p.invoiceCount}</span></td>
              <td className="px-3 py-3 align-middle hidden md:table-cell"><span className={`text-sm ${p.offen > 0 ? "text-amber-600 font-medium" : "text-gray-400"}`}>{p.offen > 0 ? p.offen.toFixed(2).replace(".", ",") + " €" : "–"}</span></td>
              <td className="px-3 py-3 align-middle hidden md:table-cell"><span className={`text-sm ${p.paidThisYear > 0 ? "text-green-600" : "text-gray-400"}`}>{p.paidThisYear > 0 ? p.paidThisYear.toFixed(2).replace(".", ",") + " €" : "–"}</span></td>
              <td className="px-3 py-3 align-middle hidden lg:table-cell"><span className="text-sm text-gray-500">{p.lastInvoiceDate ? fmtDate(p.lastInvoiceDate) : "–"}</span></td>
              <td className="px-3 py-3 align-middle hidden sm:table-cell">
                <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={(e) => { e.stopPropagation(); onDeletePatient(p._raw); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ═══════════════════ Expandable Card ═══════════════════

function ExpandableCard({ header, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`rounded-lg border transition ${open ? "border-gray-300 bg-white shadow-sm" : "border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300"}`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">{header}</div>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ═══════════════════ Treatment Document Preview (for PDF) ═══════════════════

// Pre-render a numbered circle as a tiny canvas → data URL image
// html2canvas renders <img> tags perfectly, unlike CSS text centering
function makeDotImage(number) {
  const size = 40; // draw at 2x for sharpness
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ef4444";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = `bold ${Math.round(size * 0.5)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), size / 2, size / 2);
  return c.toDataURL("image/png");
}

function TreatmentDocPreview({ practice, patient, treatmentDoc, einheit, id: previewId, facePhoto }) {
  const td = treatmentDoc || {};
  const markers = td.markers || [];
  const praep = td.praeparat || "";
  const einh = einheit || td.einheit || "SE";
  const datumStr = td.behandlungsDatum ? fmtDate(td.behandlungsDatum) : "–";
  const totalUnits = Math.round(markers.reduce((s, m) => s + evalAmount(m.amount), 0) * 100) / 100;
  const totalStr = totalUnits % 1 === 0 ? totalUnits.toString() : totalUnits.toFixed(2).replace(/0+$/, "").replace(".", ",");
  const pat = patient || {};
  const patName = [pat.vorname, pat.nachname].filter(Boolean).join(" ") || pat.name || "";

  // Pre-generate dot images for all markers (memoized per render)
  const dotImages = React.useMemo(() => markers.map((_, i) => makeDotImage(i + 1)), [markers.length]);

  // Build multi-column legend: fill columns to match face height (340px), ~18px per row
  const colSize = 18;
  const columns = [];
  for (let i = 0; i < markers.length; i += colSize) {
    columns.push(markers.slice(i, i + colSize));
  }

  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a", padding: "40px 44px", width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden" },
    h: { fontSize: "16px", fontWeight: "700", color: "#222", marginBottom: "4px" },
    addr: { fontSize: "11px", color: "#444", marginBottom: "28px" },
    patLabel: { fontSize: "9.5px", color: "#999", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" },
    sectionTitle: { fontSize: "12px", fontWeight: "600", color: "#333", marginBottom: "6px", marginTop: "20px" },
  };

  return (
    <div id={previewId || "treatment-doc-preview"} style={S.page}>
      {/* Practice Header — same as InvoicePreview */}
      {practice.logo && !practice.logoReplacesName && (
        <img src={practice.logo} alt="Logo" style={{ position: "absolute", top: "40px", right: "44px", maxHeight: "60px", maxWidth: "160px", objectFit: "contain" }} />
      )}
      {practice.logo && practice.logoReplacesName ? (
        <div style={{ marginBottom: "8px" }}>
          <img src={practice.logo} alt="Logo" style={{ maxHeight: "60px", maxWidth: "200px", objectFit: "contain", display: "block" }} />
        </div>
      ) : (
        <div style={S.h}>{practice.name || ""}</div>
      )}
      <div style={S.addr}>
        <div>{practice.address1}</div>
        <div>{practice.address2}</div>
        {practice.address3 && <div>{practice.address3}</div>}
      </div>

      {/* Patient address block */}
      <div style={{ marginBottom: "28px" }}>
        <div style={S.patLabel}>Patient:in</div>
        <div>{patName}</div>
        {pat.address1 && <div>{pat.address1}</div>}
        {pat.address2 && <div>{pat.address2}</div>}
        {pat.country && pat.country !== "Deutschland" && <div>{pat.country}</div>}
      </div>

      {/* Title + Date */}
      <div style={{ fontSize: "15px", fontWeight: "700", color: "#222", marginBottom: "4px" }}>Behandlungsdokumentation</div>
      <div style={{ fontSize: "11px", color: "#444", marginBottom: "20px" }}>Datum: {datumStr}</div>

      {/* Präparat + Menge */}
      {praep && (
        <div style={{ marginBottom: "16px" }}>
          <div style={S.sectionTitle}>Präparat</div>
          <div style={{ fontSize: "11px", color: "#333" }}>
            {praep}{totalUnits > 0 ? ` — ${totalStr} ${einh} gesamt` : td.amount ? ` — ${td.amount} ${einh} gesamt` : ""}
          </div>
        </div>
      )}

      {/* Injection points — face diagram with legend on the right */}
      {markers.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={S.sectionTitle}>Injektionspunkte</div>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {/* Face diagram */}
            <div style={{ position: "relative", width: "340px", height: "340px", flexShrink: 0, border: "1px solid #e5e5e5", borderRadius: "6px", overflow: "hidden", background: "#fafafa" }}>
              <img src={facePhoto || FACE_IMAGE_B64} alt="Gesicht" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              {markers.map((m, idx) => (
                <img key={idx} src={dotImages[idx]} alt={String(idx + 1)} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 20, height: 20, marginLeft: -10, marginTop: -10, zIndex: 10 }} />
              ))}
            </div>
            {/* Legend to the right, columns as tall as the face */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignContent: "flex-start", maxHeight: "340px" }}>
              {columns.map((col, ci) => (
                <div key={ci} style={{ fontSize: "11px", color: "#333" }}>
                  {col.map((m, idx) => {
                    const globalIdx = ci * colSize + idx;
                    const val = evalAmount(m.amount);
                    const displayVal = val % 1 === 0 ? val.toString() : val.toFixed(2).replace(/0+$/, "").replace(".", ",");
                    return (
                      <div key={globalIdx} style={{ marginBottom: "1px" }}>
                        <span style={{ fontWeight: 600 }}>{globalIdx + 1}:</span> {displayVal} {einh}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact info footer */}
      <div style={{ marginTop: "40px", fontSize: "10.5px", color: "#666", borderTop: "1px solid #e5e5e5", paddingTop: "14px" }}>
        Bei Fragen zu Deiner Behandlung erreichst Du uns
        {practice.phone ? ` unter ${fmtPhone(practice.phone)}` : ""}
        {practice.phone && practice.email ? " oder " : !practice.phone && practice.email ? " unter " : ""}
        {practice.email ? practice.email : ""}
        {practice.phone || practice.email ? "." : " jederzeit."}
      </div>
    </div>
  );
}

// ═══════════════════ Patient Detail View ═══════════════════

function PatientDetailView({ patient, invoices, kleinunternehmer, practice, onBack, onView, onViewHV, onDownload, onDownloadHV, onPrint, onPrintHV, onDelete, onUpdateInvoice, onUpdatePatient, onCreateInvoice, onQuickInvoice, onNewHV, onStartConsent, onViewConsent, onDownloadConsent }) {
  const rawData = (patient._raw && typeof patient._raw.data === "object" && patient._raw.data) ? patient._raw.data : {};
  const email = (rawData.email || patient.email || "").toLowerCase();
  const [editingPatient, setEditingPatient] = React.useState(false);
  const [confirmDeleteTreatment, setConfirmDeleteTreatment] = React.useState(null);
  const [editingTreatmentInv, setEditingTreatmentInv] = React.useState(null);
  const [viewingTreatment, setViewingTreatment] = React.useState(null);
  const [editData, setEditData] = React.useState({
    vorname: rawData.vorname || patient.vorname || "",
    nachname: rawData.nachname || patient.nachname || "",
    email: rawData.email || patient.email || "",
    phone: rawData.phone || "",
    address1: rawData.address1 || "",
    address2: rawData.address2 || "",
    country: rawData.country || "Deutschland",
  });
  const patientDbId = patient._raw ? patient._raw.id : patient.id;
  const matchingInvoices = invoices.filter((inv) => {
    if (inv._patientDbId && patientDbId) return inv._patientDbId === patientDbId;
    const invEmail = ((inv.patient || {}).email || "").toLowerCase();
    return email && invEmail && invEmail === email;
  });
  const rechnungsInvoices = matchingInvoices.filter((inv) => !inv._standalone && !inv._hvOnly && !inv._consentForm);
  const hvInvoices = matchingInvoices.filter((inv) => !inv._standalone && !inv._consentForm && (inv.hasHV != null ? inv.hasHV : (inv.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5)));
  const consentInvoices = matchingInvoices.filter((inv) => inv._consentForm);

  const [tab, setTab] = React.useState("consent");
  const [newTreatmentMarkers, setNewTreatmentMarkers] = React.useState([]);
  const [newTreatmentInvoiceId, setNewTreatmentInvoiceId] = React.useState(null);
  const [newTreatmentEinheit, setNewTreatmentEinheit] = React.useState("SE");
  const [newTreatmentPraeparat, setNewTreatmentPraeparat] = React.useState("");
  const [newTreatmentDate, setNewTreatmentDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [newTreatmentNotes, setNewTreatmentNotes] = React.useState("");
  const [newTreatmentAmount, setNewTreatmentAmount] = React.useState("");
  const [newTreatmentFacePhoto, setNewTreatmentFacePhoto] = React.useState("");

  // Inline editing states for patient info
  const [patientEditField, setPatientEditField] = React.useState(null);

  // Inline editing states for behandlung detail
  const [editFace, setEditFace] = React.useState(false);
  const [editDate, setEditDate] = React.useState(false);
  const [editPraep, setEditPraep] = React.useState(false);
  const [editNotes, setEditNotes] = React.useState(false);
  const [editInvoiceLink, setEditInvoiceLink] = React.useState(false);
  const [inlineTempDate, setInlineTempDate] = React.useState("");
  const [inlineTempPraep, setInlineTempPraep] = React.useState("");
  const [inlineTempEinheit, setInlineTempEinheit] = React.useState("SE");
  const [inlineTempNotes, setInlineTempNotes] = React.useState("");
  const [inlineTempInvoiceId, setInlineTempInvoiceId] = React.useState(null);
  const [inlineTempMarkers, setInlineTempMarkers] = React.useState([]);
  const faceModalRef = React.useRef(null);

  // Quick-invoice modal states
  const [quickInvoiceOpen, setQuickInvoiceOpen] = React.useState(false);
  const [quickInvoiceNummer, setQuickInvoiceNummer] = React.useState("");
  const [quickInvoiceWunschStr, setQuickInvoiceWunschStr] = React.useState("");
  const [quickInvoicePreisStr, setQuickInvoicePreisStr] = React.useState("");
  const [quickInvoiceAttachTreatment, setQuickInvoiceAttachTreatment] = React.useState(false);
  const [quickInvoiceSaving, setQuickInvoiceSaving] = React.useState(false);
  const [pendingQuickInvoice, setPendingQuickInvoice] = React.useState(false);

  // Treatment doc PDF state
  const [treatmentDocTarget, setTreatmentDocTarget] = React.useState(null);

  const downloadTreatmentDoc = async (inv) => {
    setTreatmentDocTarget(inv);
    // Wait for render then generate PDF
    await new Promise(r => setTimeout(r, 150));
    const el = document.getElementById("treatment-doc-preview");
    if (!el) { setTreatmentDocTarget(null); return; }
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      const td = inv.treatmentDoc || {};
      const dateStr = td.behandlungsDatum || new Date().toISOString().slice(0, 10);
      const patName = [patient.vorname || rawData.vorname || "", patient.nachname || rawData.nachname || ""].filter(Boolean).join("_") || "Patient";
      const filename = `Behandlung_${patName}_${dateStr}.pdf`;
      // Share on mobile, download on desktop
      const blob = pdf.output("blob");
      const file = new File([blob], filename, { type: "application/pdf" });
      const isMobile = window.innerWidth < 640;
      if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: filename }); } catch (e) { if (e.name !== "AbortError") pdf.save(filename); }
      } else {
        pdf.save(filename);
      }
    } catch (e) {
      console.error("Treatment doc PDF error:", e);
    } finally {
      setTreatmentDocTarget(null);
    }
  };

  // Auto-open quick invoice modal after saving treatment with "Speichern & Schnellrechnung"
  React.useEffect(() => {
    if (pendingQuickInvoice && tab === "behandlung_detail" && viewingTreatment) {
      const realInv = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
      const latestInv = realInv.length > 0 ? realInv.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, realInv[0]) : null;
      setQuickInvoiceNummer(latestInv ? nextInvoiceNumber(latestInv.invoiceMeta.nummer) || latestInv.invoiceMeta.nummer : "");
      setQuickInvoiceWunschStr("");
      setQuickInvoicePreisStr("");
      setQuickInvoiceOpen(true);
      setPendingQuickInvoice(false);
    }
  }, [pendingQuickInvoice, tab, viewingTreatment]);

  const tabBtnCls = (active) =>
    `px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition ${
      active ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
    }`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 sm:px-5 py-4 border-b border-gray-100">
        <button className="text-xs text-gray-400 hover:text-gray-600 mb-2" onClick={onBack}>← Zurück zur Patient:innenliste</button>
        {(() => {
          const isEditing = patientEditField === "all";
          const startEdit = () => { setPatientEditField("all"); setEditData({ vorname: patient.vorname || rawData.vorname || "", nachname: patient.nachname || rawData.nachname || "", email: rawData.email || patient.email || "", phone: rawData.phone || "", address1: rawData.address1 || "", address2: rawData.address2 || "", country: rawData.country || "Deutschland" }); };
          const saveAll = () => { if (onUpdatePatient) onUpdatePatient(editData); setPatientEditField(null); };
          const cancelAll = () => setPatientEditField(null);
          const inputCls = "border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400";
          return (
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input className={inputCls + " w-28"} value={editData.vorname} placeholder="Vorname" onChange={(e) => setEditData({ ...editData, vorname: e.target.value })} autoFocus />
                    <input className={inputCls + " w-28"} value={editData.nachname} placeholder="Nachname" onChange={(e) => setEditData({ ...editData, nachname: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">E-Mail</label>
                      <input type="email" className={inputCls + " w-full mt-1"} value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Telefon</label>
                      <input type="tel" className={inputCls + " w-full mt-1"} value={editData.phone} placeholder="+49 123 456789" onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Straße</label>
                      <input className={inputCls + " w-full mt-1"} value={editData.address1} placeholder="Musterstraße 5" onChange={(e) => setEditData({ ...editData, address1: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-20">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">PLZ</label>
                        <input className={inputCls + " w-full mt-1"} value={parsePlzOrt(editData.address2).plz} placeholder="PLZ" maxLength={5} inputMode="numeric" onChange={(e) => { const v = e.target.value; const { ort } = parsePlzOrt(editData.address2); setEditData({ ...editData, address2: combinePlzOrt(v, ort) }); if (v.length === 5 && !ort && (!editData.country || editData.country === "Deutschland")) lookupPlz(v).then(city => { if (city) { setEditData(d => ({ ...d, address2: combinePlzOrt(v, parsePlzOrt(d.address2).ort || city) })); } }); }} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Ort</label>
                        <input data-ort-field className={inputCls + " w-full mt-1"} value={parsePlzOrt(editData.address2).ort} placeholder="Ort" onChange={(e) => { const { plz } = parsePlzOrt(editData.address2); setEditData({ ...editData, address2: combinePlzOrt(plz, e.target.value) }); }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Land</label>
                      <select className={inputCls + " w-full mt-1 bg-white"} value={editData.country} onChange={(e) => setEditData({ ...editData, country: e.target.value })}>
                        {PRIORITY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        <option disabled>────────────</option>
                        {OTHER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition" onClick={saveAll}>Speichern</button>
                    <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={cancelAll}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Name + edit */}
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-base font-semibold text-gray-800">{patient.vorname} {patient.nachname}</h2>
                    <button className="p-1 rounded text-gray-300 hover:text-blue-500 transition" title="Patient:in bearbeiten" onClick={startEdit}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>
                  {/* Data grid */}
                  <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                    <span className="text-gray-400">E-Mail</span>
                    <span>{email ? <a href={`mailto:${email}`} className="text-blue-500 hover:text-blue-700">{email}</a> : <span className="text-gray-400">—</span>}</span>
                    <span className="text-gray-400">Telefon</span>
                    <span className="text-gray-600">{rawData.phone ? (
                      <>
                        <a href={`tel:${rawData.phone.replace(/[^\d+]/g, "")}`} className="sm:hidden text-blue-500 hover:text-blue-700">{fmtPhone(rawData.phone)}</a>
                        <span className="hidden sm:inline">{fmtPhone(rawData.phone)}</span>
                      </>
                    ) : <span className="text-gray-400">—</span>}</span>
                    <span className="text-gray-400">Adresse</span>
                    <span className="text-gray-600">{rawData.address1 ? `${rawData.address1}, ${rawData.address2 || ""}` : "—"}</span>
                    <span className="text-gray-400">Land</span>
                    <span className="text-gray-600">{rawData.country || "Deutschland"}</span>
                    {rawData.geschlecht && <><span className="text-gray-400">Geschlecht</span><span className="text-gray-600">{rawData.geschlecht === "w" ? "Weiblich" : rawData.geschlecht === "m" ? "Männlich" : rawData.geschlecht === "d" ? "Divers" : rawData.geschlecht}</span></>}
                    {rawData.geburtsdatum && <><span className="text-gray-400">Geburtsdatum</span><span className="text-gray-600">{new Date(rawData.geburtsdatum).toLocaleDateString("de-DE")}</span></>}
                    {!rawData.geburtsdatum && rawData.alter && <><span className="text-gray-400">Alter</span><span className="text-gray-600">{rawData.alter} Jahre</span></>}
                    {rawData.groesse && <><span className="text-gray-400">Größe</span><span className="text-gray-600">{rawData.groesse} cm</span></>}
                    {rawData.gewicht && <><span className="text-gray-400">Gewicht</span><span className="text-gray-600">{rawData.gewicht} kg</span></>}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {(() => {
        const currentYear = new Date().getFullYear();
        const yearInvoices = rechnungsInvoices.filter(inv => {
          const d = inv.invoiceMeta.datum || inv.savedAt || "";
          return d.startsWith(String(currentYear));
        });
        const calcInvGesamt = (inv) => {
          const zw = (inv.lineItems || []).reduce((s, it) => s + (it.betrag || 0), 0);
          const isAusland = (inv.patient || {}).country && (inv.patient || {}).country !== "Deutschland";
          const invIsMedical = !!(inv.invoiceMeta && inv.invoiceMeta.diagnose);
          const invKlein = inv._kleinunternehmer != null ? inv._kleinunternehmer : kleinunternehmer;
          const noMwst = invKlein || isAusland || invIsMedical;
          const mwst = noMwst ? 0 : Math.round(zw * 0.19 * 100) / 100;
          return Math.round((zw + mwst) * 100) / 100;
        };
        const paidInvs = yearInvoices.filter(inv => inv.paymentStatus === "bezahlt");
        const outstandingInvs = yearInvoices.filter(inv => inv.paymentStatus !== "bezahlt");
        const totalPaid = paidInvs.reduce((s, inv) => s + calcInvGesamt(inv), 0);
        const totalOutstanding = outstandingInvs.reduce((s, inv) => s + calcInvGesamt(inv), 0);
        return (yearInvoices.length > 0) ? (
          <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1">
            <span className="text-xs text-gray-400">{currentYear}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Bezahlt:</span>
              <span className="text-xs font-medium text-green-600">{totalPaid.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Ausstehend:</span>
              <span className="text-xs font-medium text-amber-600">{totalOutstanding.toFixed(2).replace(".", ",")} €</span>
            </div>
          </div>
        ) : null;
      })()}

      <div className="relative border-b border-gray-100">
        <div className="py-2 flex items-center gap-0 overflow-x-auto hide-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex-shrink-0 w-3 sm:w-5"></div>
          <button className={tabBtnCls(tab === "consent") + " whitespace-nowrap flex-shrink-0"} onClick={() => setTab("consent")}>
            <span className="sm:hidden">Aufkl. ({consentInvoices.length})</span><span className="hidden sm:inline">Aufklärungsbögen ({consentInvoices.length})</span>
          </button>
          <button className={tabBtnCls(tab === "hv") + " whitespace-nowrap flex-shrink-0 ml-3 sm:ml-4"} onClick={() => setTab("hv")}>
            <span className="sm:hidden">HV ({hvInvoices.length})</span><span className="hidden sm:inline">Honorarvereinbarungen ({hvInvoices.length})</span>
          </button>
          <button className={tabBtnCls(tab === "behandlungen") + " whitespace-nowrap flex-shrink-0 ml-3 sm:ml-4"} onClick={() => setTab("behandlungen")}>
            Behandlungen ({matchingInvoices.filter(inv => inv.treatmentDoc).length})
          </button>
          <button className={tabBtnCls(tab === "rechnungen") + " whitespace-nowrap flex-shrink-0 ml-3 sm:ml-4"} onClick={() => setTab("rechnungen")}>
            Rechnungen ({rechnungsInvoices.length})
          </button>
          <div className="flex-shrink-0 w-3 sm:w-5"></div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none sm:hidden" style={{ background: "linear-gradient(to right, transparent, white)" }}></div>
      </div>

      {tab === "rechnungen" && (
        <>
        {onCreateInvoice && (
          <div className="px-3 sm:px-5 py-3 border-b border-gray-50">
            <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition" onClick={() => onCreateInvoice(patient)}>+ Neue Rechnung erstellen</button>
          </div>
        )}
        {rechnungsInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Keine Rechnungen für diese:n Patient:in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide"><span className="sm:hidden">Nr.</span><span className="hidden sm:inline">Rechnungsnr.</span></th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide"><span className="sm:hidden">Datum</span><span className="hidden sm:inline">Rechnungsdatum</span></th>
                <th className="hidden sm:table-cell text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Betrag</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "140px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rechnungsInvoices.map((inv) => {
                const isPaidP = inv.paymentStatus === "bezahlt";
                const zwP = (inv.lineItems || []).reduce((s, it) => s + (it.betrag || 0), 0);
                const isAuslandP = (inv.patient || {}).country && (inv.patient || {}).country !== "Deutschland";
                const isMedicalP = !!(inv.invoiceMeta && inv.invoiceMeta.diagnose);
                const invKleinP = inv._kleinunternehmer != null ? inv._kleinunternehmer : kleinunternehmer;
                const noMwstP = invKleinP || isAuslandP || isMedicalP;
                const gesamtP = zwP + (noMwstP ? 0 : Math.round(zwP * 0.19 * 100) / 100);
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onView(inv)}>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-700">{inv.invoiceMeta.nummer}</span></td>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span></td>
                    <td className="hidden sm:table-cell px-3 py-3 align-middle"><span className="text-sm text-gray-700">{fmt(gesamtP)} €</span></td>
                    <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${isPaidP ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                        style={{ minWidth: 80 }}
                        onClick={(e) => { if (!isPaidP) spawnConfetti(e.currentTarget); if (onUpdateInvoice) onUpdateInvoice({ ...inv, paymentStatus: isPaidP ? "ausstehend" : "bezahlt" }); }}
                      >
                        {isPaidP ? "Bezahlt" : "Ausstehend"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="Teilen" onClick={() => onDownload(inv)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                        <button className="hidden sm:inline-flex p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition" title="Drucken" onClick={() => onPrint(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        </>
      )}

      {tab === "hv" && (
        <>
        {onNewHV && (
          <div className="px-3 sm:px-5 py-3 border-b border-gray-50">
            <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition" onClick={onNewHV}>+ Neue Honorarvereinbarung erstellen</button>
          </div>
        )}
        {hvInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Keine Honorarvereinbarungen für diese:n Patient:in.</p>
          </div>
        ) : (
          <div>
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide"><span className="sm:hidden">Nr.</span><span className="hidden sm:inline">Rechnungsnr.</span></th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide"><span className="sm:hidden">Datum</span><span className="hidden sm:inline">Rechnungsdatum</span></th>
                <th className="hidden sm:table-cell text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Erstellt am</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "140px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {hvInvoices.map((inv) => {
                const createdAt = inv._createdAt ? fmtDate(inv._createdAt.slice(0, 10)) : (inv.savedAt ? fmtDate(inv.savedAt.slice(0, 10)) : "–");
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onViewHV(inv)}>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-500">{inv.invoiceMeta.nummer}</span>
                      {inv._signedHvUpload && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Unterschrieben</span>}
                      {!inv._signedHvUpload && inv._signatures?.patient && inv._signatures?.doctor && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Vollständig</span>}
                      {!inv._signedHvUpload && inv._signatures?.patient && !inv._signatures?.doctor && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Ärzt:in fehlt</span>}
                    </td>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span></td>
                    <td className="hidden sm:table-cell px-3 py-3 align-middle"><span className="text-xs text-gray-400">{createdAt}</span></td>
                    <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Upload signed HV */}
                        <label className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition cursor-pointer" title="Unterschriebene HV hochladen">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            e.target.value = "";
                            try {
                              const isPdf = file.type === "application/pdf";
                              let data;
                              if (isPdf) {
                                data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
                              } else {
                                data = await compressImage(file, 1200, 0.85);
                              }
                              const updated = { ...inv, _signedHvUpload: { type: isPdf ? "pdf" : "image", data, filename: file.name, uploadedAt: new Date().toISOString() } };
                              if (onUpdateInvoice) onUpdateInvoice(updated);
                            } catch (err) { console.error("HV upload error:", err); }
                          }} />
                        </label>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="Teilen" onClick={() => onDownloadHV(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                        <button className="hidden sm:inline-flex p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition" title="Drucken" onClick={() => onPrintHV(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </div>
        )}
        </>
      )}

      {tab === "consent" && (
        <>
        {onStartConsent && (
          <div className="px-3 sm:px-5 py-3 border-b border-gray-50">
            <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition" onClick={() => onStartConsent(patient)}>+ Neuer Aufklärungsbogen erstellen</button>
          </div>
        )}
        {consentInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Keine Aufklärungsbögen für diese:n Patient:in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Vorlage</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Datum</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="hidden sm:table-cell text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Erstellt am</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "100px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {consentInvoices.map((inv) => {
                const cd = inv.consentData || {};
                const tpl = CONSENT_TEMPLATES.find(t => t.id === cd.templateId);
                const templateName = tpl ? tpl.title.replace("Aufklärungsbogen — ", "") : cd.templateId || "–";
                const createdAt = inv._createdAt ? fmtDate(inv._createdAt.slice(0, 10)) : (inv.savedAt ? fmtDate(inv.savedAt.slice(0, 10)) : "–");
                const isRefused = cd.refused;
                const hasPatientSig = !!cd._signatures?.patient;
                const hasDoctorSig = !!cd._signatures?.doctor;
                const consentStatus = isRefused ? "refused" : (hasPatientSig && hasDoctorSig) ? "complete" : hasPatientSig ? "pending_doctor" : "draft";
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onViewConsent && onViewConsent(inv)}>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-700">{templateName}</span></td>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span></td>
                    <td className="px-3 py-3 align-middle">
                      {consentStatus === "refused"
                        ? <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">Abgelehnt</span>
                        : consentStatus === "complete"
                        ? <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Vollständig</span>
                        : consentStatus === "pending_doctor"
                        ? <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Ärzt:in fehlt</span>
                        : <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">Entwurf</span>
                      }
                    </td>
                    <td className="hidden sm:table-cell px-3 py-3 align-middle"><span className="text-xs text-gray-400">{createdAt}</span></td>
                    <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="PDF herunterladen" onClick={() => onDownloadConsent && onDownloadConsent(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        </>
      )}

      {tab === "behandlungen" && (() => {
        const treatmentInvoices = matchingInvoices.filter(inv => inv.treatmentDoc)
          .sort((a, b) => ((b.treatmentDoc.behandlungsDatum || b.invoiceMeta.datum || "").localeCompare(a.treatmentDoc.behandlungsDatum || a.invoiceMeta.datum || "")));
        return (
          <div>
            <div className="px-3 sm:px-5 py-3 border-b border-gray-50">
              <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition" onClick={() => { setEditingTreatmentInv(null); setNewTreatmentMarkers([]); setNewTreatmentInvoiceId(null); setNewTreatmentPraeparat(""); setNewTreatmentEinheit("SE"); setNewTreatmentDate(new Date().toISOString().slice(0, 10)); setNewTreatmentNotes(""); setNewTreatmentAmount(""); setNewTreatmentFacePhoto(""); setTab("behandlungen_add"); }}>+ Neue Behandlung erstellen</button>
            </div>
            {treatmentInvoices.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-500">Keine Behandlungen dokumentiert.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2" style={{ width: 50 }}></th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Datum</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Präparat</th>
                    <th className="hidden sm:table-cell text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Punkte</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Rechnung</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "100px" }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentInvoices.map((inv) => {
                    const td = inv.treatmentDoc;
                    const markerCount = (td.markers || []).length;
                    const totalUnitsStr = fmtUnits(td.markers || []);
                    const einh = td.einheit || inv.einheit || "SE";
                    const praep = td.praeparat || inv.praeparat || "";
                    const datumStr = td.behandlungsDatum ? fmtDate(td.behandlungsDatum) : "–";
                    const hasInvoice = inv.invoiceMeta.nummer && inv.invoiceMeta.nummer !== "—";
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => { setViewingTreatment(inv); setTab("behandlung_detail"); }}>
                        <td className="px-3 py-2 align-middle">
                          <div className="relative rounded border border-gray-200 overflow-hidden" style={{ width: 36, height: 36, background: "#fafafa" }}>
                            <img src={td.facePhoto || FACE_IMAGE_B64} alt="" className="w-full h-full object-contain" draggable={false} />
                            {(td.markers || []).map((m, i) => (
                              <div key={i} className="absolute rounded-full bg-red-500" style={{ width: 4, height: 4, left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-50%)" }} />
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-700">{datumStr}</span></td>
                        <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500">{praep || "–"}</span></td>
                        <td className="hidden sm:table-cell px-3 py-3 align-middle"><span className="text-sm text-gray-500">{markerCount > 0 ? `${markerCount} (${totalUnitsStr} ${einh})` : td.amount ? `${td.amount} ${einh}` : "–"}</span></td>
                        <td className="px-3 py-3 align-middle">{hasInvoice ? <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{inv.invoiceMeta.nummer}</span> : <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Offen</span>}</td>
                        <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition" title="Bearbeiten" onClick={() => {
                              setEditingTreatmentInv(inv);
                              setNewTreatmentDate(td.behandlungsDatum || new Date().toISOString().slice(0, 10));
                              setNewTreatmentInvoiceId(inv._standalone ? null : inv.id);
                              setNewTreatmentPraeparat(td.praeparat || inv.praeparat || "");
                              setNewTreatmentEinheit(td.einheit || inv.einheit || "SE");
                              setNewTreatmentMarkers((td.markers || []).map((m, i) => ({ id: Date.now() + i, ...m })));
                              setNewTreatmentNotes(td.notes || "");
                              setNewTreatmentFacePhoto(td.facePhoto || "");
                              const existingTotal = (td.markers || []).reduce((s, m) => s + evalAmount(m.amount), 0);
                              setNewTreatmentAmount(td.amount || (existingTotal > 0 ? fmtUnits(td.markers || []) : ""));
                              setTab("behandlungen_add");
                            }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition" title="PDF herunterladen" onClick={() => downloadTreatmentDoc(inv)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => setConfirmDeleteTreatment(inv)}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Behandlung Detail View ── */}
      {tab === "behandlung_detail" && viewingTreatment && (() => {
        const inv = viewingTreatment;
        const td = inv.treatmentDoc;
        const einh = td.einheit || inv.einheit || "SE";
        const praep = td.praeparat || inv.praeparat || "";
        const datumStr = td.behandlungsDatum ? fmtDate(td.behandlungsDatum) : "–";
        const hasInvoice = inv.invoiceMeta.nummer && inv.invoiceMeta.nummer !== "—";
        const markerCount = (td.markers || []).length;
        const totalUnits = Math.round((td.markers || []).reduce((s, m) => s + evalAmount(m.amount), 0) * 100) / 100;
        const totalUnitsStr = fmtUnits(td.markers || []);

        const pencilIcon = (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        );
        const editBtnCls = "p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition";

        const saveInlineField = (field, value) => {
          const updatedTd = { ...td };
          if (field === "date") updatedTd.behandlungsDatum = value;
          if (field === "praeparat") { updatedTd.praeparat = value.praep; updatedTd.einheit = value.einh; }
          if (field === "notes") updatedTd.notes = value;
          if (field === "markers") updatedTd.markers = value.map(m => ({ x: m.x, y: m.y, amount: m.amount }));
          const updated = { ...inv, treatmentDoc: updatedTd };
          if (onUpdateInvoice) onUpdateInvoice(updated);
          setViewingTreatment(updated);
        };

        return (
          <div className="px-3 sm:px-5 py-4">
            <button className="text-xs text-gray-400 hover:text-gray-600 mb-4" onClick={() => { setViewingTreatment(null); setTab("behandlungen"); }}>← Zurück zur Behandlungsübersicht</button>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Left: Face map large */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {markerCount > 0 ? (
                    <div className="relative border border-gray-200 rounded-lg overflow-hidden select-none" style={{ width: 500, maxWidth: "100%", aspectRatio: "1", background: "#fafafa" }}>
                      <img src={td.facePhoto || FACE_IMAGE_B64} alt="Gesicht" className="w-full h-full object-contain pointer-events-none" draggable={false} />
                      {(td.markers || []).map((m, idx) => (
                        <div key={idx} className="absolute flex items-center justify-center" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}>
                          <div className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold select-none" style={{ width: 26, height: 26, fontSize: 12, lineHeight: 1, boxShadow: "0 0 4px rgba(0,0,0,0.3)" }}>{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center border border-gray-200 rounded-lg" style={{ width: 500, maxWidth: "100%", aspectRatio: "1", background: "#fafafa" }}>
                      <p className="text-xs text-gray-400">Keine Injektionspunkte dokumentiert</p>
                    </div>
                  )}
                  <button className="absolute bottom-3 right-3 p-1.5 bg-white rounded border border-gray-200 shadow-sm text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition" title="Injektionspunkte bearbeiten" onClick={() => { setInlineTempMarkers((td.markers || []).map((m, i) => ({ id: Date.now() + i, ...m }))); setEditFace(true); }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
                {markerCount > 0 ? (
                  <p className="text-xs text-gray-500 mt-2">Gesamt: {totalUnitsStr} {einh} an {markerCount} {markerCount === 1 ? "Stelle" : "Stellen"}</p>
                ) : td.amount ? (
                  <p className="text-xs text-gray-500 mt-2">Menge: {td.amount} {einh}</p>
                ) : null}
                {/* Face edit modal is rendered outside this IIFE, at component root level */}
              </div>
              {/* Right: Details with inline edit icons */}
              <div className="flex-1 min-w-0">
                {/* Datum */}
                <div className="mb-4">
                  {!editDate ? (
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Behandlung vom {datumStr}</h3>
                      <button className={editBtnCls} title="Datum bearbeiten" onClick={() => { setInlineTempDate(td.behandlungsDatum || ""); setEditDate(true); }}>{pencilIcon}</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="date" className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" style={{ WebkitAppearance: "none", appearance: "none", colorScheme: "light" }} value={inlineTempDate} onChange={(e) => setInlineTempDate(e.target.value)} />
                      <button className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={() => { saveInlineField("date", inlineTempDate); setEditDate(false); }}>✓</button>
                      <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={() => setEditDate(false)}>✕</button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Präparat */}
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Präparat</span>
                    {!editPraep ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-gray-700">{praep || "—"}</p>
                        <button className={editBtnCls} title="Präparat bearbeiten" onClick={() => { setInlineTempPraep(praep); setInlineTempEinheit(einh); setEditPraep(true); }}>{pencilIcon}</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <input className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-36" value={inlineTempPraep} placeholder="z.B. Bocouture" onChange={(e) => setInlineTempPraep(e.target.value)} />
                        <select className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={inlineTempEinheit} onChange={(e) => setInlineTempEinheit(e.target.value)}>
                          <option value="ml">ml</option><option value="SE">SE</option><option value="IE">IE</option>
                        </select>
                        <button className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={() => { saveInlineField("praeparat", { praep: inlineTempPraep, einh: inlineTempEinheit }); setEditPraep(false); }}>✓</button>
                        <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={() => setEditPraep(false)}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Injektionspunkte — always show individually */}
                  {markerCount > 0 && (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Injektionspunkte</span>
                        <button className={editBtnCls} title="Injektionspunkte bearbeiten" onClick={() => { setInlineTempMarkers((td.markers || []).map((m, i) => ({ id: Date.now() + i, ...m }))); setEditFace(true); }}>{pencilIcon}</button>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {(td.markers || []).map((m, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold flex-shrink-0" style={{ width: 22, height: 22, fontSize: 11 }}>{idx + 1}</span>
                            <span className="text-sm text-gray-700">{m.amount}{String(m.amount).match(/[xX×*]/) ? ` = ${evalAmount(m.amount)}` : ""} {einh}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verknüpfte Rechnung */}
                  {hasInvoice && (
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Verknüpfte Rechnung</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-gray-700">{inv.invoiceMeta.nummer} vom {fmtDate(inv.invoiceMeta.datum)}</p>
                      </div>
                    </div>
                  )}

                  {/* Notizen */}
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notizen</span>
                    {!editNotes ? (
                      <div className="flex items-start gap-2 mt-0.5">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{td.notes || "—"}</p>
                        <button className={editBtnCls + " flex-shrink-0 mt-0.5"} title="Notizen bearbeiten" onClick={() => { setInlineTempNotes(td.notes || ""); setEditNotes(true); }}>{pencilIcon}</button>
                      </div>
                    ) : (
                      <div className="mt-0.5">
                        <textarea className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" rows={3} value={inlineTempNotes} onChange={(e) => setInlineTempNotes(e.target.value)} />
                        <div className="flex gap-2 mt-1">
                          <button className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={() => { saveInlineField("notes", inlineTempNotes); setEditNotes(false); }}>Speichern</button>
                          <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={() => setEditNotes(false)}>Abbrechen</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 flex-wrap">
                  {!hasInvoice && markerCount > 0 && praep && (
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm"
                      onClick={() => {
                        const ri = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
                        const latest = ri.length > 0 ? ri.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, ri[0]) : null;
                        setQuickInvoiceNummer(latest ? nextInvoiceNumber(latest.invoiceMeta.nummer) || latest.invoiceMeta.nummer : "");
                        setQuickInvoiceWunschStr("");
                        setQuickInvoicePreisStr("");
                        setQuickInvoiceOpen(true);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Rechnung erstellen
                    </button>
                  )}
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition"
                    onClick={() => downloadTreatmentDoc(inv)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    PDF herunterladen
                  </button>
                  <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition" onClick={() => setConfirmDeleteTreatment(inv)}>Behandlung löschen</button>
                </div>
              </div>
            </div>

            {/* Quick-Invoice Modal */}
            {quickInvoiceOpen && (() => {
              const qPreisProMl = parseDE(quickInvoicePreisStr);
              const isAusland = (patient._raw?.data?.country || patient.country || "Deutschland") !== "Deutschland";
              const qiIsMedical = false; // Quick invoices are aesthetic by default
              const noMwst = kleinunternehmer || isAusland || qiIsMedical;
              const qMl = totalUnits;

              // Default 3.5x calculation (no Wunsch)
              const defaultItems = buildLineItems(praep, qMl, qPreisProMl, [], [], null, einh);
              const defaultNetto = defaultItems.reduce((s, it) => s + it.betrag, 0);
              const defaultGesamt = noMwst ? defaultNetto : Math.round((defaultNetto * 1.19) * 100) / 100;

              // Wunsch calculation
              const wunschVal = parseDE(quickInvoiceWunschStr);
              const defaultStr = qPreisProMl > 0 ? defaultGesamt.toFixed(2).replace(".", ",") : "";
              const effectiveWunsch = quickInvoiceWunschStr ? wunschVal : (qPreisProMl > 0 ? defaultGesamt : 0);
              const customS = quickInvoiceWunschStr && wunschVal > 0 ? calcWeightedForGesamt(wunschVal, qMl, qPreisProMl, [], [], noMwst, false) : null;
              const lineItems = effectiveWunsch > 0 ? buildLineItems(praep, qMl, qPreisProMl, [], [], customS, einh, false) : [];
              const gesamt = effectiveWunsch > 0 ? calcGesamt(lineItems, kleinunternehmer, isAusland, qiIsMedical) : 0;
              const effectiveMax = customS != null ? Math.max(customS.s1, customS.s5, customS.s267) : 3.5;
              const materialkosten = Math.round(qMl * qPreisProMl * 100) / 100;
              const netto = lineItems.reduce((s, it) => s + it.betrag, 0);
              const verdienst = netto > 0 ? Math.round((netto - materialkosten) * 100) / 100 : 0;
              const isValid = effectiveWunsch > 0 && qPreisProMl > 0 && quickInvoiceNummer.trim() && effectiveMax > 0;

              // Find last used invoice number for hint (exclude standalone treatments with nummer "—")
              const realInvoices = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
              const latestInv = realInvoices.length > 0 ? realInvoices.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, realInvoices[0]) : null;

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setQuickInvoiceOpen(false)}>
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="px-5 pt-5 pb-3">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">Schnellrechnung erstellen</h3>
                      <p className="text-xs text-gray-400 mb-1">{praep} · {totalUnitsStr} {einh} · {markerCount} {markerCount === 1 ? "Punkt" : "Punkte"}</p>
                      {totalUnits <= 0 && markerCount > 0 && (
                        <p className="text-xs text-amber-600 mb-2">Hinweis: Bitte trage zuerst die Mengen an den Injektionspunkten ein.</p>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-0.5">Rechnungsnummer</label>
                          <input
                            type="text"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={quickInvoiceNummer}
                            onChange={(e) => setQuickInvoiceNummer(e.target.value)}
                          />
                          {latestInv && <p className="text-xs text-gray-400 mt-0.5">Letzte: {latestInv.invoiceMeta.nummer}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-0.5">Preis pro {einh} (€)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="z.B. 4,50"
                            value={quickInvoicePreisStr}
                            onChange={(e) => setQuickInvoicePreisStr(e.target.value)}
                            autoFocus
                          />
                          {qPreisProMl > 0 && <p className="text-xs text-gray-400 mt-0.5">Materialkosten: {materialkosten.toFixed(2).replace(".", ",")} €</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-0.5">Gesamtbetrag (€)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={quickInvoiceWunschStr}
                            placeholder={qPreisProMl > 0 ? defaultStr : "z.B. 350"}
                            onChange={(e) => setQuickInvoiceWunschStr(e.target.value)}
                          />
                          {qPreisProMl > 0 && (
                            <div className="mt-1.5">
                              <div className="text-xs text-gray-500">
                                <span className="text-gray-400">Max. Steigerungssatz: </span>
                                <span className="font-semibold text-gray-700">{effectiveMax.toFixed(2).replace(".", ",")}x</span>
                                {effectiveMax > 3.5 && <span className="ml-1 text-gray-400 text-xs">§2 GOÄ</span>}
                              </div>
                              {effectiveMax > 3.5 && (
                                <div className="mt-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                                  Über 3,5-fach: Eine Honorarvereinbarung gemäß §2 GOÄ wird zusätzlich erstellt.
                                </div>
                              )}
                              {effectiveMax <= 0 && quickInvoiceWunschStr && (
                                <div className="text-xs text-red-500 mt-1">Betrag ist zu niedrig für die Materialkosten.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {qPreisProMl > 0 && gesamt > 0 && (
                        <div className="mt-4 flex justify-between items-center text-sm font-semibold text-green-600">
                          <span>Dein Verdienst</span>
                          <span>{verdienst > 0 ? verdienst.toFixed(2).replace(".", ",") : "–"} €</span>
                        </div>
                      )}

                      {inv.treatmentDoc && (inv.treatmentDoc.markers?.length > 0 || inv.treatmentDoc.amount) && (
                        <label className="flex items-start gap-2 cursor-pointer select-none mt-3">
                          <input type="checkbox" className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border-gray-300 text-blue-500 focus:ring-blue-400" checked={quickInvoiceAttachTreatment} onChange={(e) => setQuickInvoiceAttachTreatment(e.target.checked)} />
                          <span className="text-xs text-gray-500">Behandlungsdokumentation ohne Notizen an Rechnung anhängen</span>
                        </label>
                      )}
                    </div>

                    <div className="px-5 pb-5 pt-2 flex gap-2">
                      <button className="flex-1 px-3 py-2 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition" onClick={() => setQuickInvoiceOpen(false)}>Abbrechen</button>
                      <button
                        className={`flex-1 px-3 py-2 text-xs rounded text-white transition flex items-center justify-center gap-1.5 ${quickInvoiceSaving ? "bg-blue-400 cursor-not-allowed" : isValid ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-300 cursor-not-allowed"}`}
                        disabled={!isValid || quickInvoiceSaving}
                        onClick={async () => {
                          if (!isValid || quickInvoiceSaving) return;
                          setQuickInvoiceSaving(true);
                          try {
                            if (onQuickInvoice) await onQuickInvoice({
                              treatment: inv,
                              nummer: quickInvoiceNummer.trim(),
                              wunschGesamt: effectiveWunsch,
                              customS,
                              lineItems,
                              gesamt,
                              hasHV: lineItems.some((it) => it.steigerung != null && it.steigerung > 3.5),
                              praeparat: praep,
                              einheit: einh,
                              ml: qMl,
                              preisProMl: qPreisProMl,
                              attachTreatmentPdf: quickInvoiceAttachTreatment,
                            });
                            setQuickInvoiceOpen(false);
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setQuickInvoiceSaving(false);
                          }
                        }}
                      >
                        {quickInvoiceSaving && (
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {quickInvoiceSaving ? "Wird erstellt…" : (effectiveMax > 3.5 ? "Dokumente erstellen" : "Rechnung erstellen")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {tab === "behandlungen_add" && (() => {
        const linkedInv = newTreatmentInvoiceId ? matchingInvoices.find(i => i.id === newTreatmentInvoiceId) : null;
        const showPraeparatFields = !linkedInv;
        const activeEinheit = linkedInv ? (linkedInv.einheit || "SE") : newTreatmentEinheit;
        return (
          <div className="px-3 sm:px-5 py-4" style={{ maxWidth: 780 }}>
            <button className="text-xs text-gray-400 hover:text-gray-600 mb-3" onClick={() => { setTab("behandlungen"); setEditingTreatmentInv(null); }}>← Zurück</button>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{editingTreatmentInv ? "Behandlung bearbeiten" : "Neue Behandlung dokumentieren"}</h3>

            <div className="flex flex-col sm:flex-row gap-5">
              {/* ── Left column: Details + Notizen ── */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">Behandlungsdetails</p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Datum *</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      style={{ WebkitAppearance: "none", appearance: "none", colorScheme: "light" }}
                      value={newTreatmentDate}
                      onChange={(e) => setNewTreatmentDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Rechnung verknüpfen</label>
                    <select
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      value={newTreatmentInvoiceId || ""}
                      onChange={(e) => setNewTreatmentInvoiceId(e.target.value || null)}
                    >
                      <option value="">— Keine —</option>
                      {rechnungsInvoices.filter((inv) => {
                        if (!inv.treatmentDoc) return true;
                        if (editingTreatmentInv && inv.id === editingTreatmentInv.id) return true;
                        return false;
                      }).map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceMeta.nummer} — {fmtDate(inv.invoiceMeta.datum)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">Notizen</p>
                <textarea
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  rows={4}
                  placeholder="Optionale Notizen zur Behandlung…"
                  value={newTreatmentNotes}
                  onChange={(e) => setNewTreatmentNotes(e.target.value)}
                />
              </div>

              {/* ── Right column: Präparat + Injektionspunkte ── */}
              <div className="flex-1 min-w-0">
                {showPraeparatFields && (
                  <>
                    <div className="flex items-center gap-1 mb-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Präparat</p>
                      <InfoTooltip>Häufig verwendete Präparate kannst Du in den Praxis-Einstellungen speichern, um sie hier schnell auszuwählen.</InfoTooltip>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-0.5">Name</label>
                        <PraeparatAutocomplete
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={newTreatmentPraeparat}
                          placeholder="z.B. Bocouture"
                          suggestions={(practice.praeparate || []).filter(p => p.name)}
                          onChange={(v) => setNewTreatmentPraeparat(v)}
                          onSelect={(p) => {
                            setNewTreatmentPraeparat(p.name);
                            if (p.einheit) setNewTreatmentEinheit(p.einheit);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-0.5 flex items-center gap-1">
                          Menge
                          <span className="relative group">
                            <svg className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] leading-tight text-white bg-gray-800 rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">Wird automatisch berechnet, wenn<br/>Injektionspunkte dokumentiert werden.</span>
                          </span>
                        </label>
                        <input
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={newTreatmentMarkers.length > 0 ? fmtUnits(newTreatmentMarkers) : newTreatmentAmount}
                          placeholder="z.B. 8,4"
                          readOnly={newTreatmentMarkers.length > 0}
                          onChange={(e) => { if (newTreatmentMarkers.length === 0) setNewTreatmentAmount(e.target.value); }}
                          style={newTreatmentMarkers.length > 0 ? { background: "#f9fafb", color: "#6b7280" } : {}}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-0.5">Einheit</label>
                        <select className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={newTreatmentEinheit} onChange={(e) => setNewTreatmentEinheit(e.target.value)}>
                          <option value="ml">ml</option>
                          <option value="SE">SE</option>
                          <option value="IE">IE</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">Injektionspunkte <span className="normal-case tracking-normal text-gray-300">(optional)</span></p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <TreatmentMap markers={newTreatmentMarkers} setMarkers={setNewTreatmentMarkers} einheit={activeEinheit} facePhoto={newTreatmentFacePhoto} onFacePhotoChange={setNewTreatmentFacePhoto} />
                </div>
              </div>
            </div>

            {newTreatmentDate && (() => {
              const saveTreatment = (openQuickInvoice) => {
                const effectiveAmount = newTreatmentMarkers.length > 0 ? fmtUnits(newTreatmentMarkers) : newTreatmentAmount;
                const treatmentData = {
                  markers: newTreatmentMarkers.map(m => ({ x: m.x, y: m.y, amount: m.amount })),
                  behandlungsDatum: newTreatmentDate,
                  praeparat: linkedInv ? (linkedInv.praeparat || "") : newTreatmentPraeparat,
                  einheit: activeEinheit,
                  notes: newTreatmentNotes.trim() || "",
                  amount: effectiveAmount || "",
                  facePhoto: newTreatmentFacePhoto || "",
                };
                let savedEntry = null;
                if (editingTreatmentInv) {
                  const updated = { ...editingTreatmentInv, treatmentDoc: { ...editingTreatmentInv.treatmentDoc, ...treatmentData } };
                  if (onUpdateInvoice) onUpdateInvoice(updated);
                  savedEntry = updated;
                } else if (linkedInv) {
                  const updated = { ...linkedInv, treatmentDoc: treatmentData };
                  if (onUpdateInvoice) onUpdateInvoice(updated);
                  savedEntry = updated;
                } else {
                  const standaloneId = "treat-" + Date.now();
                  const standaloneEntry = {
                    id: standaloneId,
                    patient: { vorname: patient.vorname, nachname: patient.nachname, email: patient.email || email },
                    _patientDbId: patientDbId || null,
                    invoiceMeta: { nummer: "—", datum: "" },
                    lineItems: [],
                    treatmentDoc: treatmentData,
                    savedAt: new Date().toISOString(),
                    _standalone: true,
                  };
                  if (onUpdateInvoice) onUpdateInvoice(standaloneEntry, true);
                  trackEvent("treatment_doc_created", { standalone: true }, null);
                  savedEntry = standaloneEntry;
                }
                setNewTreatmentMarkers([]);
                setNewTreatmentInvoiceId(null);
                setNewTreatmentPraeparat("");
                setNewTreatmentEinheit("SE");
                setNewTreatmentDate(new Date().toISOString().slice(0, 10));
                setNewTreatmentNotes("");
                setNewTreatmentAmount("");
                setEditingTreatmentInv(null);

                if (openQuickInvoice && savedEntry) {
                  setViewingTreatment(savedEntry);
                  setPendingQuickInvoice(true);
                  setTab("behandlung_detail");
                } else {
                  setTab("behandlungen");
                }
              };

              const hasPraep = linkedInv ? (linkedInv.praeparat || "") : newTreatmentPraeparat;
              const hasAmount = newTreatmentMarkers.length > 0 || newTreatmentAmount;
              const quickEnabled = !editingTreatmentInv && !linkedInv && hasPraep && hasAmount;

              return (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                    onClick={() => saveTreatment(false)}
                  >
                    Behandlung speichern
                  </button>
                  <button
                    className={`px-4 py-2 text-sm rounded-lg text-white transition ${quickEnabled ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 cursor-not-allowed"}`}
                    disabled={!quickEnabled}
                    onClick={() => quickEnabled && saveTreatment(true)}
                  >
                    Speichern & Schnellrechnung erstellen
                  </button>
                </div>
              );
            })()}
          </div>
        );
      })()}
      {confirmDeleteTreatment && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Behandlung löschen?</h3>
            <p className="text-xs text-gray-500 mb-4">Diese Behandlungsdokumentation wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setConfirmDeleteTreatment(null)}>Abbrechen</button>
              <button className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={() => {
                const inv = confirmDeleteTreatment;
                if (inv._standalone) {
                  if (onUpdateInvoice) onUpdateInvoice({ ...inv, _deleted: true });
                } else {
                  const updated = { ...inv };
                  delete updated.treatmentDoc;
                  if (onUpdateInvoice) onUpdateInvoice(updated);
                }
                setConfirmDeleteTreatment(null);
                setTab("rechnungen");
                setTimeout(() => setTab("behandlungen"), 0);
              }}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Face Edit Modal (rendered at component root, outside all IIFEs) ── */}
      {editFace && viewingTreatment && (() => {
        const isMobileFE = typeof window !== "undefined" && window.innerWidth < 640;
        const faceSzFE = isMobileFE ? "min(85vw, 340px)" : "min(85vh - 100px, 700px)";
        const handleFaceClickFE = (e) => {
          if (!faceModalRef.current) return;
          const rect = faceModalRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          const hit = inlineTempMarkers.find((m) => Math.abs(m.x - x) < 3.5 && Math.abs(m.y - y) < 3.5);
          if (hit) { setInlineTempMarkers(inlineTempMarkers.filter((m) => m.id !== hit.id)); return; }
          const tooClose = inlineTempMarkers.some((m) => Math.abs(m.x - x) < 2 && Math.abs(m.y - y) < 2);
          if (tooClose) return;
          setInlineTempMarkers([...inlineTempMarkers, { id: Date.now(), x, y, amount: "" }]);
        };
        const saveFaceMarkers = () => {
          const inv = viewingTreatment;
          const updatedTd = { ...inv.treatmentDoc, markers: inlineTempMarkers.map(m => ({ x: m.x, y: m.y, amount: m.amount })) };
          const updated = { ...inv, treatmentDoc: updatedTd };
          if (onUpdateInvoice) onUpdateInvoice(updated);
          setViewingTreatment(updated);
          setEditFace(false);
        };
        return (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4" onClick={() => setEditFace(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 flex flex-col w-full" style={{ maxWidth: 1100, maxHeight: "95vh" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Injektionspunkte setzen</h3>
                <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => setEditFace(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-1">Klicke auf das Gesicht, um Injektionspunkte zu setzen.</p>
              <p className="text-xs text-amber-500 mb-3">Die eingegebenen Mengen werden automatisch als Gesamtmenge des Präparats übernommen.</p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 overflow-y-auto">
                <div className="flex-shrink-0">
                  <div className="relative border border-gray-200 rounded-lg overflow-hidden select-none" style={{ width: faceSzFE, height: faceSzFE, cursor: "crosshair", background: "#fafafa" }}>
                    <div ref={faceModalRef} onClick={handleFaceClickFE} className="relative w-full h-full">
                      <img src={td.facePhoto || FACE_IMAGE_B64} alt="Gesicht" className="w-full h-full object-contain pointer-events-none" draggable={false} />
                      {inlineTempMarkers.map((m, idx) => (
                        <div key={m.id} className="absolute flex items-center justify-center" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}>
                          <div className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold select-none" style={{ width: 21, height: 21, fontSize: 11, lineHeight: 1, boxShadow: "0 0 3px rgba(0,0,0,0.3)" }}>{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 overflow-y-auto" style={{ width: 220, maxHeight: faceSzFE }}>
                  <div className="space-y-1.5">
                    {inlineTempMarkers.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <span className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold flex-shrink-0" style={{ width: 18, height: 18, fontSize: 9 }}>{idx + 1}</span>
                        <input type="text" inputMode="text" className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" value={m.amount} placeholder={idx % 2 === 0 ? "z.B. 1,90" : "z.B. 2x3"} onChange={(e) => setInlineTempMarkers(inlineTempMarkers.map((mk) => mk.id === m.id ? { ...mk, amount: e.target.value } : mk))} />
                        <span className="text-xs text-gray-400">{inlineTempEinheit}</span>
                        <button className="p-1 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" onClick={() => setInlineTempMarkers(inlineTempMarkers.filter((mk) => mk.id !== m.id))} title="Löschen">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                <button className="px-4 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition" onClick={saveFaceMarkers}>Speichern</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hidden treatment document preview for PDF generation */}
      {treatmentDocTarget && (() => {
        const tInv = treatmentDocTarget;
        const tTd = tInv.treatmentDoc || {};
        const tEinheit = tTd.einheit || tInv.einheit || "SE";
        const tPatData = (patient._raw && typeof patient._raw.data === "object" && patient._raw.data) || {};
        const tPat = { vorname: tPatData.vorname || patient.vorname || "", nachname: tPatData.nachname || patient.nachname || "", address1: tPatData.address1 || "", address2: tPatData.address2 || "", country: tPatData.country || "Deutschland" };
        return (
          <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <TreatmentDocPreview
              practice={tInv._practice || practice}
              patient={tPat}
              treatmentDoc={tTd}
              einheit={tEinheit}
              facePhoto={tTd.facePhoto || ""}
            />
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════ Invoice List View ═══════════════════

function InvoiceListView({ invoices, kleinunternehmer, onView, onViewHV, onViewTD, onDelete, onPrint, onPrintHV, onPrintTD, onDownload, onDownloadHV, onDownloadTD, onDownloadConsent, onBack, onUpdateInvoice, patients, onNewForPatient, onNewHVForPatient, onNewConsentForPatient }) {
  const [tab, setTab] = React.useState("rechnungen");
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("asc");
  const [search, setSearch] = React.useState("");
  const [showNewPicker, setShowNewPicker] = React.useState(false);
  const [newPickerSearch, setNewPickerSearch] = React.useState("");
  const newPickerRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (newPickerRef.current && !newPickerRef.current.contains(e.target)) setShowNewPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fullName = (p) => [p?.vorname, p?.nachname].filter(Boolean).join(" ") || p?.name || "";
  const safePatient = (inv) => inv.patient || {};

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-300 text-4xl mb-3"></div>
        <p className="text-sm text-gray-500 mb-1">Noch keine Dokumente erstellt.</p>
        <p className="text-xs text-gray-400">Erstelle Deine erste Rechnung, um sie hier zu sehen.</p>
        <button className="mt-4 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={onBack}>
          ← Neue Rechnung erstellen
        </button>
      </div>
    );
  }

  const hvInvoices = invoices.filter((inv) => !inv._standalone && !inv._consentForm && (inv.hasHV != null ? inv.hasHV : (inv.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5)));

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key) => {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const sortedList = (list, getters) => {
    if (!sortKey || !getters[sortKey]) return list;
    const getter = getters[sortKey];
    return [...list].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "de");
      return sortDir === "asc" ? cmp : -cmp;
    });
  };

  const thCls = "text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none whitespace-nowrap";
  const thClsR = "text-right px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none whitespace-nowrap";

  const tabBtnCls = (active) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition ${
      active ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
    }`;

  const parseNummer = (nr) => { const m = String(nr || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; };
  const rechnungGetters = {
    vorname: (inv) => safePatient(inv).vorname || (safePatient(inv).name || "").split(" ")[0] || "",
    nachname: (inv) => safePatient(inv).nachname || (safePatient(inv).name || "").split(" ").slice(1).join(" ") || "",
    nummer: (inv) => parseNummer(inv.invoiceMeta.nummer),
    datum: (inv) => inv.invoiceMeta.datum || "",
    betrag: (inv) => { const zw = (inv.lineItems || []).reduce((s, it) => s + (it.betrag || 0), 0); const isAusland = (inv.patient || {}).country && (inv.patient || {}).country !== "Deutschland"; const invMed = !!(inv.invoiceMeta && inv.invoiceMeta.diagnose); const invK = inv._kleinunternehmer != null ? inv._kleinunternehmer : kleinunternehmer; const noMwst = invK || isAusland || invMed; return zw + (noMwst ? 0 : Math.round(zw * 0.19 * 100) / 100); },
    status: (inv) => inv.paymentStatus || "ausstehend",
  };

  const hvGetters = {
    vorname: (inv) => safePatient(inv).vorname || (safePatient(inv).name || "").split(" ")[0] || "",
    nachname: (inv) => safePatient(inv).nachname || (safePatient(inv).name || "").split(" ").slice(1).join(" ") || "",
    erstelltAm: (inv) => inv._createdAt || inv.savedAt || "",
    datum: (inv) => inv.invoiceMeta.datum || "",
    nummer: (inv) => parseNummer(inv.invoiceMeta.nummer),
  };

  const matchInvoice = (inv, s) => {
    const p = safePatient(inv);
    const vorname = (p.vorname || (p.name || "").split(" ")[0] || "").toLowerCase();
    const nachname = (p.nachname || (p.name || "").split(" ").slice(1).join(" ") || "").toLowerCase();
    const nummer = (inv.invoiceMeta.nummer || "").toLowerCase();
    const datum = inv.invoiceMeta.datum ? fmtDate(inv.invoiceMeta.datum).toLowerCase() : "";
    const datumRaw = (inv.invoiceMeta.datum || "").toLowerCase();
    const createdAt = inv._createdAt ? fmtDate(inv._createdAt.slice(0, 10)).toLowerCase() : (inv.savedAt ? fmtDate(inv.savedAt.slice(0, 10)).toLowerCase() : "");
    return vorname.includes(s) || nachname.includes(s) || nummer.includes(s) || datum.includes(s) || datumRaw.includes(s) || createdAt.includes(s);
  };

  const rechnungenOnly = invoices.filter(inv => !inv._hvOnly && !inv._standalone && !inv._consentForm);
  const searchFiltered = search.trim()
    ? rechnungenOnly.filter((inv) => matchInvoice(inv, search.toLowerCase()))
    : rechnungenOnly;

  const hvSearchFiltered = search.trim()
    ? hvInvoices.filter((inv) => matchInvoice(inv, search.toLowerCase()))
    : hvInvoices;

  const tdInvoices = invoices.filter((inv) => inv.treatmentDoc && !inv._consentForm);
  const tdSearchFiltered = search.trim()
    ? tdInvoices.filter((inv) => matchInvoice(inv, search.toLowerCase()))
    : tdInvoices;

  const consentListInvoices = invoices.filter((inv) => inv._consentForm);
  const consentSearchFiltered = search.trim()
    ? consentListInvoices.filter((inv) => matchInvoice(inv, search.toLowerCase()))
    : consentListInvoices;

  const tdGetters = {
    vorname: (inv) => safePatient(inv).vorname || (safePatient(inv).name || "").split(" ")[0] || "",
    nachname: (inv) => safePatient(inv).nachname || (safePatient(inv).name || "").split(" ").slice(1).join(" ") || "",
    behandlungsDatum: (inv) => (inv.treatmentDoc || {}).behandlungsDatum || inv.invoiceMeta.datum || "",
    praeparat: (inv) => (inv.treatmentDoc || {}).praeparat || inv.praeparat || "",
    nummer: (inv) => parseNummer(inv.invoiceMeta.nummer),
    erstelltAm: (inv) => inv._createdAt || inv.savedAt || "",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 relative z-10">
        <div className="flex items-center gap-4 overflow-x-auto">
          <button className={tabBtnCls(tab === "rechnungen") + " whitespace-nowrap flex-shrink-0"} onClick={() => { setTab("rechnungen"); setSortKey(null); }}>
            Rechnungen
          </button>
          <button className={tabBtnCls(tab === "hv") + " whitespace-nowrap flex-shrink-0"} onClick={() => { setTab("hv"); setSortKey(null); }}>
            <span className="sm:hidden">HV</span><span className="hidden sm:inline">Honorarvereinbarungen</span>
          </button>
          <button className={tabBtnCls(tab === "td") + " whitespace-nowrap flex-shrink-0"} onClick={() => { setTab("td"); setSortKey(null); }}>
            <span className="sm:hidden">Behandl.</span><span className="hidden sm:inline">Behandlungsdokumentationen</span>
          </button>
          <button className={tabBtnCls(tab === "consent") + " whitespace-nowrap flex-shrink-0"} onClick={() => { setTab("consent"); setSortKey(null); }}>
            <span className="sm:hidden">Aufkl.</span><span className="hidden sm:inline">Aufklärungsbögen</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {patients && patients.length > 0 && (tab === "rechnungen" || tab === "hv" || tab === "consent") && (
            <div ref={newPickerRef} className="relative">
              <button
                onClick={() => { setShowNewPicker(!showNewPicker); setNewPickerSearch(""); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Neu</span>
              </button>
              {showNewPicker && (() => {
                const filtered = (patients || []).filter(p => {
                  if (!newPickerSearch.trim()) return true;
                  const s = newPickerSearch.toLowerCase();
                  const d = p.data || p._raw?.data || p;
                  return (d.vorname || "").toLowerCase().includes(s) || (d.nachname || "").toLowerCase().includes(s);
                });
                return (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        autoFocus
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Patient suchen..."
                        value={newPickerSearch}
                        onChange={(e) => setNewPickerSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filtered.slice(0, 20).map((p, i) => {
                        const d = p.data || p._raw?.data || p;
                        return (
                          <button
                            key={p.id || i}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowNewPicker(false);
                              if (tab === "consent") onNewConsentForPatient(p);
                              else if (tab === "hv") onNewHVForPatient(p);
                              else onNewForPatient(p);
                            }}
                          >
                            <span className="font-medium">{d.vorname} {d.nachname}</span>
                          </button>
                        );
                      })}
                      {filtered.length === 0 && (
                        <p className="text-xs text-gray-400 px-3 py-2">Kein Patient gefunden</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="relative">
            <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-full sm:w-56"
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {tab === "rechnungen" && (
        <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className={thCls} onClick={() => handleSort("vorname")}>Vorname{sortIndicator("vorname")}</th>
              <th className={thCls} onClick={() => handleSort("nachname")}>Nachname{sortIndicator("nachname")}</th>
              <th className={thCls} onClick={() => handleSort("nummer")}>Rechnungsnr.{sortIndicator("nummer")}</th>
              <th className={thCls} onClick={() => handleSort("datum")}>Rechnungsdatum{sortIndicator("datum")}</th>
              <th className={thCls} onClick={() => handleSort("betrag")}>Betrag{sortIndicator("betrag")}</th>
              <th className={thCls} onClick={() => handleSort("status")}>Status{sortIndicator("status")}</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "140px" }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sortedList(searchFiltered, rechnungGetters).map((inv) => {
              const p = safePatient(inv);
              const vorname = p.vorname || (p.name || "").split(" ")[0] || "";
              const nachname = p.nachname || (p.name || "").split(" ").slice(1).join(" ") || "";
              const isPaid = inv.paymentStatus === "bezahlt";
              const zw = (inv.lineItems || []).reduce((s, it) => s + (it.betrag || 0), 0);
              const isAusland = (inv.patient || {}).country && (inv.patient || {}).country !== "Deutschland";
              const invIsMedical = !!(inv.invoiceMeta && inv.invoiceMeta.diagnose);
              const invKlein = inv._kleinunternehmer != null ? inv._kleinunternehmer : kleinunternehmer;
              const noMwst = invKlein || isAusland || invIsMedical;
              const gesamt = zw + (noMwst ? 0 : Math.round(zw * 0.19 * 100) / 100);
              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onView(inv)}>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-sm text-gray-700">{vorname}</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-sm font-medium text-gray-700">{nachname}</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-sm text-gray-500">{inv.invoiceMeta.nummer}</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-sm text-gray-700">{fmt(gesamt)} €</span>
                  </td>
                  <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${isPaid ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                      style={{ minWidth: 80 }}
                      onClick={(e) => { if (!isPaid) spawnConfetti(e.currentTarget); if (onUpdateInvoice) onUpdateInvoice({ ...inv, paymentStatus: isPaid ? "ausstehend" : "bezahlt" }); }}
                    >
                      {isPaid ? "Bezahlt" : "Ausstehend"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="PDF herunterladen" onClick={() => onDownload(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                      </button>
                      <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition" title="Drucken" onClick={() => onPrint(inv)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      </button>
                      <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {tab === "hv" && (
        hvInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Keine Honorarvereinbarungen vorhanden.</p>
            <p className="text-xs text-gray-400 mt-1">Honorarvereinbarungen werden automatisch erstellt, wenn der Steigerungssatz über 3,5 liegt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className={thCls} onClick={() => handleSort("vorname")}>Vorname{sortIndicator("vorname")}</th>
                <th className={thCls} onClick={() => handleSort("nachname")}>Nachname{sortIndicator("nachname")}</th>
                <th className={thCls} onClick={() => handleSort("nummer")}>Rechnungsnr.{sortIndicator("nummer")}</th>
                <th className={thCls} onClick={() => handleSort("datum")}>Rechnungsdatum{sortIndicator("datum")}</th>
                <th className={thCls} onClick={() => handleSort("erstelltAm")}>Erstellt am{sortIndicator("erstelltAm")}</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "140px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {sortedList(hvSearchFiltered, hvGetters).map((inv) => {
                const createdAt = inv._createdAt ? fmtDate(inv._createdAt.slice(0, 10)) : (inv.savedAt ? fmtDate(inv.savedAt.slice(0, 10)) : "–");
                const p = safePatient(inv);
                const vorname = p.vorname || (p.name || "").split(" ")[0] || "";
                const nachname = p.nachname || (p.name || "").split(" ").slice(1).join(" ") || "";
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onViewHV(inv)}>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-700">{vorname}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm font-medium text-gray-700">{nachname}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-500">{inv.invoiceMeta.nummer}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-xs text-gray-400">{createdAt}</span>
                    </td>
                    <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="PDF herunterladen" onClick={() => onDownloadHV(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition" title="Drucken" onClick={() => onPrintHV(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )
      )}

      {tab === "td" && (
        tdInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Keine Behandlungsdokumentationen vorhanden.</p>
            <p className="text-xs text-gray-400 mt-1">Behandlungsdokumentationen werden auf der Patient:innenebene erstellt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className={thCls} onClick={() => handleSort("vorname")}>Vorname{sortIndicator("vorname")}</th>
                <th className={thCls} onClick={() => handleSort("nachname")}>Nachname{sortIndicator("nachname")}</th>
                <th className={thCls} onClick={() => handleSort("behandlungsDatum")}>Behandlungsdatum{sortIndicator("behandlungsDatum")}</th>
                <th className={thCls} onClick={() => handleSort("praeparat")}>Präparat{sortIndicator("praeparat")}</th>
                <th className={thCls} onClick={() => handleSort("nummer")}>Rechnungsnr.{sortIndicator("nummer")}</th>
                <th className={thCls} onClick={() => handleSort("erstelltAm")}>Erstellt am{sortIndicator("erstelltAm")}</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "140px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {sortedList(tdSearchFiltered, tdGetters).map((inv) => {
                const td = inv.treatmentDoc || {};
                const p = safePatient(inv);
                const vorname = p.vorname || (p.name || "").split(" ")[0] || "";
                const nachname = p.nachname || (p.name || "").split(" ").slice(1).join(" ") || "";
                const datumStr = td.behandlungsDatum ? fmtDate(td.behandlungsDatum) : fmtDate(inv.invoiceMeta.datum);
                const praep = td.praeparat || inv.praeparat || "–";
                const hasInvoice = inv.invoiceMeta.nummer && inv.invoiceMeta.nummer !== "—";
                const createdAt = inv._createdAt ? fmtDate(inv._createdAt.slice(0, 10)) : (inv.savedAt ? fmtDate(inv.savedAt.slice(0, 10)) : "–");
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onViewTD(inv)}>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-700">{vorname}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm font-medium text-gray-700">{nachname}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-500">{datumStr}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-sm text-gray-500">{praep}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {hasInvoice ? <span className="text-sm text-gray-500">{inv.invoiceMeta.nummer}</span> : <span className="text-xs text-gray-400">–</span>}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-xs text-gray-400">{createdAt}</span>
                    </td>
                    <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="PDF herunterladen" onClick={() => onDownloadTD(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition" title="Drucken" onClick={() => onPrintTD(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )
      )}

      {tab === "consent" && (
        consentSearchFiltered.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Keine Aufklärungsbögen vorhanden.</p>
            <p className="text-xs text-gray-400 mt-1">Aufklärungsbögen werden auf der Patient:innenebene erstellt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className={thCls}>Vorname</th>
                <th className={thCls}>Nachname</th>
                <th className={thCls}>Vorlage</th>
                <th className={thCls}>Datum</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Erstellt am</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "100px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {consentSearchFiltered.map((inv) => {
                const p = safePatient(inv);
                const vorname = p.vorname || (p.name || "").split(" ")[0] || "";
                const nachname = p.nachname || (p.name || "").split(" ").slice(1).join(" ") || "";
                const cd = inv.consentData || {};
                const tpl = CONSENT_TEMPLATES.find(t => t.id === cd.templateId);
                const templateName = tpl ? tpl.title.replace("Aufklärungsbogen — ", "").substring(0, 30) : cd.templateId || "–";
                const createdAt = inv._createdAt ? fmtDate(inv._createdAt.slice(0, 10)) : (inv.savedAt ? fmtDate(inv.savedAt.slice(0, 10)) : "–");
                const isRefused = cd.refused;
                const hasPatientSig = !!cd._signatures?.patient;
                const hasDoctorSig = !!cd._signatures?.doctor;
                const consentStatus = isRefused ? "refused" : (hasPatientSig && hasDoctorSig) ? "complete" : hasPatientSig ? "pending_doctor" : "draft";
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onClick={() => onView(inv)}>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-700">{vorname}</span></td>
                    <td className="px-3 py-3 align-middle"><span className="text-sm font-medium text-gray-700">{nachname}</span></td>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500">{templateName}</span></td>
                    <td className="px-3 py-3 align-middle"><span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span></td>
                    <td className="px-3 py-3 align-middle">
                      {consentStatus === "refused"
                        ? <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">Abgelehnt</span>
                        : consentStatus === "complete"
                        ? <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Vollständig</span>
                        : consentStatus === "pending_doctor"
                        ? <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Ärzt:in fehlt</span>
                        : <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">Entwurf</span>
                      }
                    </td>
                    <td className="px-3 py-3 align-middle"><span className="text-xs text-gray-400">{createdAt}</span></td>
                    <td className="px-5 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="PDF herunterladen" onClick={() => onDownloadConsent && onDownloadConsent(inv)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                        </button>
                        <button className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" title="Löschen" onClick={() => onDelete(inv.id)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )
      )}
    </div>
  );
}

// ═══════════════════ Main App ═══════════════════

export default function EphiaInvoice() {
  // ─── Auth State ───
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login"); // "login" | "signup" | "reset" | "set_new_password"
  const [recoveryAccessToken, setRecoveryAccessToken] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authSuccessEmail, setAuthSuccessEmail] = useState("");

  // ─── Main App State ───
  const [practice, setPractice] = useState(DEFAULT_PRACTICE);
  const [showSettings, setShowSettings] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showVerdienst, setShowVerdienst] = useState(false);

  const [page, setPage] = useState("patients");

  const [patient, setPatient] = useState({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
  const [invoiceMeta, setInvoiceMeta] = useState({
    nummer: "1",
    ort: "",
    datum: new Date().toISOString().slice(0, 10),
    zahlungsfrist: 14,
  });

  // Indication type & Diagnose (medical vs aesthetic)
  const [showIndicationModal, setShowIndicationModal] = useState(false);
  const [indicationType, setIndicationType] = useState("aesthetic"); // "aesthetic" | "medical"
  const [diagnose, setDiagnose] = useState("");

  // Autofill Behandlungsort from practice city
  React.useEffect(() => {
    if (practice.city && !invoiceMeta.ort) {
      setInvoiceMeta((prev) => ({ ...prev, ort: practice.city }));
    }
  }, [practice.city]);

  // Treatment inputs
  const [praeparat, setPraeparat] = useState("");
  const [einheit, setEinheit] = useState("SE");
  const [mlStr, setMlStr] = useState("1");
  const [preisProMlStr, setPreisProMlStr] = useState("");

  // Zuschläge
  const [selectedZuschlaege, setSelectedZuschlaege] = useState([]);

  // Sachkosten
  const [sachkosten, setSachkosten] = useState([]);
  const [nextSkId, setNextSkId] = useState(1);

  // Treatment documentation (optional)
  const [treatmentMarkers, setTreatmentMarkers] = useState([]);
  const [treatmentFacePhoto, setTreatmentFacePhoto] = useState("");

  // Sync treatment marker amounts → Menge field
  React.useEffect(() => {
    if (treatmentMarkers.length === 0) return;
    const total = treatmentMarkers.reduce((sum, m) => sum + evalAmount(m.amount), 0);
    if (total > 0) setMlStr(total % 1 === 0 ? String(total) : total.toFixed(2).replace(".", ","));
  }, [treatmentMarkers]);

  // Desired total amount (inkl. MwSt.) → back-compute weighted Steigerungssätze
  const [wunschGesamtStr, setWunschGesamtStr] = useState("");
  const [useBeratungLang, setUseBeratungLang] = useState(false);
  const [begruendung, setBegruendung] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [attachTreatmentPdf, setAttachTreatmentPdf] = useState(false);
  const [hvOnlyMode, setHvOnlyMode] = useState(false);
  const [fromHvId, setFromHvId] = useState(null); // ID of imported HV
  const [hvBaseGesamt, setHvBaseGesamt] = useState(null); // original HV Gesamtbetrag (brutto)
  const [hvBaseProductCost, setHvBaseProductCost] = useState(null); // original HV product cost (ml * preisProMl)
  const [hvBaseSachkosten, setHvBaseSachkosten] = useState(0); // original HV sachkosten (always 0 for HVs)
  const [isSaving, setIsSaving] = useState(false);

  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [amendingId, setAmendingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeletePatient, setConfirmDeletePatient] = useState(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showConsentDoctorSign, setShowConsentDoctorSign] = useState(false);
  const [showHvDoctorSign, setShowHvDoctorSign] = useState(false);
  const [consentPatient, setConsentPatient] = useState(null); // patient for active consent flow
  const [consentTemplate, setConsentTemplate] = useState(null); // active consent template
  const [consentWarningPatient, setConsentWarningPatient] = useState(null); // patient pending consent warning confirmation
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [createForPatient, setCreateForPatient] = useState(null); // patient object when creating invoice from patient profile
  const [createSource, setCreateSource] = useState("patientDetail"); // "patientDetail" or "list"

  const [validationErrors, setValidationErrors] = useState({});
  const [previewTab, setPreviewTab] = useState("rechnung"); // "rechnung" | "honorar"
  const [saveToast, setSaveToast] = useState("");  // empty = hidden, string = message

  // ─── Force patients page when no patients exist ───
  useEffect(() => {
    if (dataLoaded && patients.length === 0 && page !== "patients") {
      setPage("patients");
    }
  }, [dataLoaded, patients.length, page]);

  // ─── Scroll to top on page change ───
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // ─── Check session on mount (restore MEK from sessionStorage) ───
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Detect password recovery redirect from Supabase
        // Case 1: Hash fragment flow (#access_token=...&type=recovery)
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get("access_token");
          if (token) {
            setRecoveryAccessToken(token);
            setAuthPage("set_new_password");
            window.history.replaceState(null, "", window.location.pathname);
            setAuthLoading(false);
            return;
          }
        }
        // Case 2: PKCE flow (?code=...) — exchange code for session
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get("code");
        if (authCode) {
          try {
            const codeVerifier = sessionStorage.getItem("ephia_pkce_verifier") || "";
            sessionStorage.removeItem("ephia_pkce_verifier");
            const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
              body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }),
            });
            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              if (tokenData.access_token) {
                setRecoveryAccessToken(tokenData.access_token);
                setAuthPage("set_new_password");
                window.history.replaceState(null, "", window.location.pathname);
                setAuthLoading(false);
                return;
              }
            } else {
              const errData = await tokenRes.json();
              console.error("PKCE exchange failed:", errData);
              setAuthError("Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.");
            }
          } catch (e) {
            console.error("Failed to exchange recovery code:", e);
            setAuthError("Fehler beim Verarbeiten des Reset-Links.");
          }
          window.history.replaceState(null, "", window.location.pathname);
        }
        // Case 3: Error/error_description in hash (Supabase error redirect)
        if (hash && hash.includes("error")) {
          const params = new URLSearchParams(hash.substring(1));
          const errorDesc = params.get("error_description");
          if (errorDesc) {
            setAuthError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
          }
          window.history.replaceState(null, "", window.location.pathname);
        }

        const stored = localStorage.getItem("ephia_session");
        if (stored) {
          const sess = JSON.parse(stored);
          // Try to refresh token
          try {
            const refreshed = await supabaseRefreshToken(sess.refresh_token);
            const newSess = {
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token || sess.refresh_token,
              user: refreshed.user,
            };
            localStorage.setItem("ephia_session", JSON.stringify(newSess));
            setSession(newSess);
            setUser(newSess.user);

            // Restore MEK from sessionStorage (survives page reload within same tab)
            const mekB64 = loadMEKFromSession();
            if (mekB64) {
              try {
                currentMEK = await importMEKFromBase64(mekB64);
              } catch (e) {
                console.error("Failed to restore MEK from session:", e);
                clearMEKFromSession();
              }
            }

            // If MEK couldn't be restored, check if user has encryption set up
            // If so, force re-login so password can unlock the MEK
            if (!currentMEK) {
              try {
                const profiles = await supabaseFetchProfiles(newSess.access_token, newSess.user.id);
                const profile = profiles.length > 0 ? profiles[0] : null;
                if (profile && profile.encrypted_mek) {
                  console.log("[E2EE] MEK lost from session, forcing re-login to unlock encryption");
                  localStorage.removeItem("ephia_session");
                  clearMEKFromSession();
                  setSession(null);
                  setUser(null);
                  setAuthLoading(false);
                  return; // Exit early — user must re-enter password
                }
              } catch (e) {
                console.error("Failed to check encryption profile:", e);
              }
            }

            await loadUserData(newSess.access_token, newSess.user.id, newSess.user.email);
          } catch (err) {
            console.error("Token refresh failed:", err);
            localStorage.removeItem("ephia_session");
            clearMEKFromSession();
          }
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  // ─── Auto-logout after inactivity ───
  const autoLogoutTimerRef = useRef(null);
  const handleSignOutRef = useRef(null);
  const hvUploadRef = useRef(null);

  useEffect(() => {
    if (!session || !practice.autoLogoutEnabled) {
      if (autoLogoutTimerRef.current) { clearTimeout(autoLogoutTimerRef.current); autoLogoutTimerRef.current = null; }
      return;
    }
    const resetTimer = () => {
      if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current);
      autoLogoutTimerRef.current = setTimeout(() => {
        if (handleSignOutRef.current) handleSignOutRef.current();
      }, AUTO_LOGOUT_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current);
    };
  }, [session, practice.autoLogoutEnabled]);

  // ─── Load user data from Supabase (with E2EE decryption) ───
  const loadUserData = async (accessToken, userId, userEmail) => {
    try {
      // Load practice data
      const profiles = await supabaseFetchProfiles(accessToken, userId);
      if (profiles.length > 0 && profiles[0].practice_data) {
        const practiceData = profiles[0].practice_data;
        // practice_data is kept as plaintext (doctor's own business data, not patient data)
        if (typeof practiceData === "object" && practiceData !== null) {
          setPractice(practiceData);
          setIsFirstTimeUser(false);
        } else {
          if (userEmail) setPractice((prev) => ({ ...prev, email: userEmail }));
          setIsFirstTimeUser(true);
          setShowSettings(true);
        }
      } else {
        // First-time user: pre-fill email and prompt to fill in practice settings
        if (userEmail) setPractice((prev) => ({ ...prev, email: userEmail }));
        setIsFirstTimeUser(true);
        setShowSettings(true);
      }

      // Load invoices (decrypt E2EE data)
      const invoiceRecords = await supabaseFetchInvoices(accessToken, userId);
      const loadedInvoices = [];
      for (const rec of invoiceRecords) {
        let invoiceData = rec.data;
        // Handle fully-encrypted invoices (v1 old format, v2 full E2EE)
        if (currentMEK && rec.encryption_version >= 1 && rec.iv && typeof invoiceData === "string") {
          try {
            invoiceData = await decryptData(invoiceData, rec.iv, currentMEK);
          } catch (e) {
            console.error("Failed to decrypt invoice:", rec.id, e);
            continue;
          }
        }
        // Handle patient-only encryption (encrypted_patient field inside data)
        if (currentMEK && invoiceData.encrypted_patient && invoiceData.patient_iv) {
          try {
            invoiceData.patient = await decryptData(invoiceData.encrypted_patient, invoiceData.patient_iv, currentMEK);
            delete invoiceData.encrypted_patient;
            delete invoiceData.patient_iv;
          } catch (e) {
            console.error("Failed to decrypt patient in invoice:", rec.id, e);
            invoiceData.patient = { vorname: "[verschlüsselt]", nachname: "", email: "", phone: "", address1: "", address2: "", country: "" };
          }
        }
        loadedInvoices.push({ ...invoiceData, _supabaseId: rec.id, _createdAt: rec.created_at });
      }
      setInvoices(loadedInvoices);

      // Load patients (decrypt if needed)
      try {
        const patientRecords = await supabaseFetchPatients(accessToken, userId);
        const decryptedPatients = [];
        for (const rec of patientRecords) {
          let patientData = rec.data;
          if (currentMEK && rec.encryption_version >= 1 && rec.iv && typeof patientData === "string") {
            try {
              patientData = await decryptData(patientData, rec.iv, currentMEK);
            } catch (e) {
              console.error("Failed to decrypt patient:", rec.id, e);
              continue;
            }
          }
          decryptedPatients.push({ ...rec, data: patientData });
        }
        setPatients(decryptedPatients);

        // Repair invoices with missing patient data (caused by earlier status-update bug)
        let repaired = false;
        const isMissing = (inv) => !inv.patient || (!inv.patient.vorname && !inv.patient.nachname && !inv.patient.name);
        // Build a map: patient email -> patient data from intact invoices
        const emailToPatient = {};
        for (const inv of loadedInvoices) {
          if (!isMissing(inv) && inv.patient.email) {
            emailToPatient[inv.patient.email.toLowerCase()] = inv.patient;
          }
        }
        // Also build from patient table
        const patientsByEmail = {};
        for (const p of decryptedPatients) {
          const pd = p.data || {};
          if (pd.email) patientsByEmail[pd.email.toLowerCase()] = pd;
        }
        // If there's only one patient, use that for all orphaned invoices
        const allPatientEmails = Object.keys(patientsByEmail);
        const singlePatient = allPatientEmails.length === 1 ? patientsByEmail[allPatientEmails[0]] : null;

        for (const inv of loadedInvoices) {
          if (isMissing(inv)) {
            // Try matching by email if partially available
            let match = null;
            if (inv.patient && inv.patient.email) {
              const em = inv.patient.email.toLowerCase();
              match = emailToPatient[em] || patientsByEmail[em];
            }
            // If no match and only one patient exists, use that
            if (!match && singlePatient) {
              match = singlePatient;
            }
            if (match) {
              inv.patient = { vorname: match.vorname || "", nachname: match.nachname || "", email: match.email || "", phone: match.phone || "", address1: match.address1 || "", address2: match.address2 || "", country: match.country || "Deutschland" };
              repaired = true;
              // Persist repair to Supabase (E2EE: fetch, decrypt, modify, re-encrypt)
              if (inv._supabaseId && currentMEK) {
                try {
                  const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${inv._supabaseId}&select=data,iv,encryption_version`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } });
                  const rows = await fetchRes.json();
                  if (rows.length > 0) {
                    let stored = rows[0].data;
                    if (rows[0].encryption_version >= 1 && rows[0].iv && typeof stored === "string") stored = await decryptData(stored, rows[0].iv, currentMEK);
                    if (stored.encrypted_patient && stored.patient_iv) { stored.patient = await decryptData(stored.encrypted_patient, stored.patient_iv, currentMEK); delete stored.encrypted_patient; delete stored.patient_iv; }
                    stored.patient = inv.patient;
                    const enc = await encryptData(stored, currentMEK);
                    await supabaseUpdateInvoice(accessToken, inv._supabaseId, enc.ciphertext, enc.iv, 2);
                  }
                } catch (e) { console.error("Failed to repair invoice patient:", inv._supabaseId, e); }
              }
            } else {
              // No match found — set placeholder so UI doesn't crash. User can fix via "Ändern".
              inv.patient = { vorname: "[Patient:in", nachname: "unbekannt]", email: "", phone: "", address1: "", address2: "", country: "Deutschland" };
              repaired = true;
              console.warn("[REPAIR] No match for invoice", inv.invoiceMeta?.nummer, "- using placeholder. Please amend this invoice to assign the correct patient.");
            }
          }
        }
        if (repaired) setInvoices([...loadedInvoices]);
      } catch (err) {
        console.error("Failed to load patients:", err);
      }
      setDataLoaded(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Failed to load user data:", err);
      setDataLoaded(true);
      window.scrollTo(0, 0);
    }
  };

  // ─── E2EE: Initialize encryption for new user ───
  const initializeEncryption = async (accessToken, userId, password) => {
    console.log("[E2EE] Initializing encryption for user", userId);
    const mek = await generateMEK();
    const salt = generateSalt();
    const pdk = await derivePDK(password, salt);
    const { encrypted: encryptedMek, iv: mekIv } = await wrapMEK(mek, pdk);
    // Recovery key: random AES key stored server-side for email-based recovery
    const rk = await generateRecoveryKey();
    const { encrypted: recoveryWrappedMek, iv: recoveryIv } = await wrapMEK(mek, rk);
    const rkRaw = await crypto.subtle.exportKey("raw", rk);
    const recoveryKeyBase64 = bufToBase64(rkRaw);
    // Store all crypto params in profile
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`, "Prefer": "return=representation" },
      body: JSON.stringify({
        encrypted_mek: encryptedMek, mek_salt: salt, mek_iv: mekIv,
        mek_params: { iterations: 100000, hash: "SHA-256" },
        recovery_wrapped_mek: recoveryWrappedMek, recovery_iv: recoveryIv,
        recovery_key: recoveryKeyBase64, encryption_version: 1,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[E2EE] Failed to store encryption keys:", res.status, err);
      throw new Error("Failed to initialize encryption: " + err);
    }
    console.log("[E2EE] Encryption keys stored successfully");
    currentMEK = mek;
    const mekB64 = await exportMEKToBase64(mek);
    storeMEKInSession(mekB64);
  };

  // ─── E2EE: Unlock MEK from password ───
  const unlockMEK = async (password, profile, accessToken) => {
    const pdk = await derivePDK(password, profile.mek_salt, profile.mek_params?.iterations || 100000);
    try {
      const mek = await unwrapMEK(profile.encrypted_mek, profile.mek_iv, pdk);
      currentMEK = mek;
      const mekB64 = await exportMEKToBase64(mek);
      storeMEKInSession(mekB64);
    } catch (e) {
      // MEK unwrap failed — likely password was reset. Try recovery key.
      console.warn("MEK unwrap with password failed, trying recovery key...", e);
      if (profile.recovery_key && profile.recovery_wrapped_mek && profile.recovery_iv) {
        const rkRaw = base64ToBuf(profile.recovery_key);
        const rk = await crypto.subtle.importKey("raw", rkRaw, { name: "AES-GCM", length: 256 }, false, ["unwrapKey"]);
        const mek = await unwrapMEK(profile.recovery_wrapped_mek, profile.recovery_iv, rk);
        currentMEK = mek;
        // Re-wrap MEK with new password
        const newSalt = generateSalt();
        const newPdk = await derivePDK(password, newSalt);
        const { encrypted: newEncMek, iv: newMekIv } = await wrapMEK(mek, newPdk);
        // Also generate a new recovery key
        const newRk = await generateRecoveryKey();
        const { encrypted: newRecWrapped, iv: newRecIv } = await wrapMEK(mek, newRk);
        const newRkRaw = await crypto.subtle.exportKey("raw", newRk);
        // Update profile with new wrapping
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`, "Prefer": "return=representation" },
          body: JSON.stringify({
            encrypted_mek: newEncMek, mek_salt: newSalt, mek_iv: newMekIv,
            recovery_wrapped_mek: newRecWrapped, recovery_iv: newRecIv,
            recovery_key: bufToBase64(newRkRaw),
          }),
        });
        const mekB64 = await exportMEKToBase64(mek);
        storeMEKInSession(mekB64);
      } else {
        throw new Error("Entschlüsselung fehlgeschlagen. Bitte kontaktiere den Support.");
      }
    }
  };

  // ─── E2EE: Migrate data to full encryption (version 2) ───
  // Runs on every login; encrypts entire data object for any record not yet at version 2
  const migrateToEncrypted = async (accessToken, userId) => {
    if (!currentMEK) return;
    console.log("[E2EE] Checking for data needing migration...");
    let migratedInvoices = 0;

    // Migrate invoices: entire data object should be encrypted (version 2)
    const invoiceRecords = await supabaseFetchInvoices(accessToken, userId);
    for (const rec of invoiceRecords) {
      // Already at version 2 — skip
      if (rec.encryption_version >= 2) continue;

      let invoiceData = rec.data;

      // Case 1: Old fully encrypted (version 1, iv set, data is string) — decrypt first
      if (rec.encryption_version >= 1 && rec.iv && typeof invoiceData === "string") {
        try {
          console.log("[E2EE] Decrypting v1 invoice:", rec.id);
          invoiceData = await decryptData(invoiceData, rec.iv, currentMEK);
        } catch (e) {
          console.error("[E2EE] Failed to decrypt invoice:", rec.id, e);
          continue;
        }
      }

      // Case 2: Patient-only encryption (version 0) — decrypt patient field first
      if (typeof invoiceData === "object" && invoiceData?.encrypted_patient) {
        try {
          invoiceData.patient = await decryptData(invoiceData.encrypted_patient, invoiceData.patient_iv, currentMEK);
          delete invoiceData.encrypted_patient;
          delete invoiceData.patient_iv;
        } catch (e) {
          console.error("[E2EE] Failed to decrypt patient in invoice:", rec.id, e);
          continue;
        }
      }

      // Now encrypt entire data object as version 2
      if (typeof invoiceData === "object") {
        try {
          const { ciphertext, iv } = await encryptData(invoiceData, currentMEK);
          const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${rec.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`, "Prefer": "return=representation" },
            body: JSON.stringify({ data: ciphertext, iv, encryption_version: 2 }),
          });
          if (!res.ok) console.error("[E2EE] Failed to migrate invoice:", rec.id, await res.text());
          else migratedInvoices++;
        } catch (e) {
          console.error("[E2EE] Failed to encrypt invoice for v2:", rec.id, e);
        }
      }
    }
    if (migratedInvoices > 0) console.log("[E2EE] Invoices migrated:", migratedInvoices);

    // Migrate patients: encrypt data, hash email, clear plaintext email
    let migratedPatients = 0;
    const patientRecords = await supabaseFetchPatients(accessToken, userId);
    for (const rec of patientRecords) {
      if (rec.encryption_version >= 1) continue; // already encrypted
      const patientEmail = rec.email || rec.data?.email || "";
      const patientHash = await computePatientHash(patientEmail, currentMEK);
      const { ciphertext, iv } = await encryptData(rec.data, currentMEK);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`, "Prefer": "return=representation" },
        body: JSON.stringify({ data: ciphertext, iv, patient_hash: patientHash, email: null, encryption_version: 1 }),
      });
      if (!res.ok) console.error("[E2EE] Failed to migrate patient:", rec.id, await res.text());
      else migratedPatients++;
    }
    if (migratedPatients > 0) console.log("[E2EE] Patients migrated:", migratedPatients);
    if (migratedInvoices === 0 && migratedPatients === 0) console.log("[E2EE] All data already migrated");
  };

  // ─── Auth functions ───
  const handleSignIn = async (email, password) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = await supabaseSignIn(email, password);
      const sess = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      };
      localStorage.setItem("ephia_session", JSON.stringify(sess));
      setSession(sess);
      setUser(sess.user);
      trackEvent("login", {}, sess.access_token);

      // E2EE: Check if user has encryption set up
      console.log("[E2EE] Checking encryption status...");
      const profiles = await supabaseFetchProfiles(data.access_token, data.user.id);
      const profile = profiles.length > 0 ? profiles[0] : null;
      console.log("[E2EE] Profile found:", !!profile, "encrypted_mek:", !!profile?.encrypted_mek);
      if (profile && profile.encrypted_mek) {
        // Existing encrypted user: unlock MEK
        console.log("[E2EE] Unlocking existing MEK...");
        await unlockMEK(password, profile, data.access_token);
        console.log("[E2EE] MEK unlocked successfully");
      } else {
        // New or pre-E2EE user: initialize encryption
        console.log("[E2EE] No encryption found, initializing...");
        await initializeEncryption(data.access_token, data.user.id, password);
      }

      // Always run migration to ensure all data is properly encrypted
      await migrateToEncrypted(data.access_token, data.user.id);

      await loadUserData(data.access_token, data.user.id, data.user.email);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (email, password) => {
    setAuthError("");
    setAuthSuccess(false);
    setAuthLoading(true);
    try {
      await supabaseSignUp(email, password);
      trackEvent("account_created");
      setAuthSuccessEmail(email);
      setAuthSuccess(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (email) => {
    setAuthError("");
    setAuthSuccess(false);
    if (!email || !email.includes("@")) {
      setAuthError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setAuthLoading(true);
    try {
      await supabaseResetPassword(email.trim().toLowerCase());
      setAuthSuccess(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (session) {
      try {
        await supabaseSignOut(session.access_token);
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    localStorage.removeItem("ephia_session");
    currentMEK = null;
    clearMEKFromSession();
    setSession(null);
    setUser(null);
    setInvoices([]);
    setPatients([]);
    setPractice(DEFAULT_PRACTICE);
    setDataLoaded(false);
    setAuthPage("login");
    setAuthError("");
  };
  handleSignOutRef.current = handleSignOut;

  const ml = parseDE(mlStr);
  const preisProMl = parseDE(preisProMlStr);

  const inputCls = (field) =>
    `w-full border rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 ${
      validationErrors[field]
        ? "border-red-400 bg-red-50 focus:ring-red-400"
        : "border-gray-200 focus:ring-blue-400"
    }`;
  const clearError = (field) => {
    if (validationErrors[field]) setValidationErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  // Compute live preview
  const isKlein = practice.kleinunternehmer;
  const isAusland = patient.country && patient.country !== "Deutschland";
  const isMedical = indicationType === "medical";
  const noMwst = isKlein || isAusland || isMedical;
  // HV cost deviation: auto-adjust Gesamtbetrag when costs exceed HV base
  const currentProductCost = Math.round(ml * preisProMl * 100) / 100;
  const currentSachkostenTotal = (sachkosten || []).reduce((sum, sk) => sum + parseDE(sk.betragStr), 0);
  const hvProductDelta = hvBaseGesamt != null && hvBaseProductCost != null ? Math.round((currentProductCost - hvBaseProductCost) * 100) / 100 : 0;
  const hvSachkostenDelta = hvBaseGesamt != null ? Math.round((currentSachkostenTotal - hvBaseSachkosten) * 100) / 100 : 0;
  const hvExtraNetto = Math.max(0, hvProductDelta) + Math.max(0, hvSachkostenDelta);
  const hvExtraBrutto = hvBaseGesamt != null && hvExtraNetto > 0 ? (noMwst ? hvExtraNetto : Math.round(hvExtraNetto * 1.19 * 100) / 100) : 0;
  const hvAdjustedGesamt = hvBaseGesamt != null && hvExtraBrutto > 0 ? Math.round((hvBaseGesamt + hvExtraBrutto) * 100) / 100 : null;

  useEffect(() => {
    if (hvBaseGesamt != null && hvAdjustedGesamt != null && hvAdjustedGesamt !== hvBaseGesamt) {
      const adjusted = hvAdjustedGesamt.toFixed(2).replace(".", ",");
      setWunschGesamtStr(adjusted);
    } else if (hvBaseGesamt != null && hvExtraBrutto === 0) {
      // Reset to original HV value if no extra costs
      const original = hvBaseGesamt.toFixed(2).replace(".", ",");
      if (parseDE(wunschGesamtStr) !== hvBaseGesamt) {
        // Don't overwrite if user manually changed it to something else
      } else {
        setWunschGesamtStr(original);
      }
    }
  }, [hvAdjustedGesamt, hvBaseGesamt, hvExtraBrutto]);

  const wunschGesamt = parseDE(wunschGesamtStr);
  const computedS = wunschGesamt > 0
    ? calcWeightedForGesamt(wunschGesamt, ml, preisProMl, selectedZuschlaege, sachkosten, noMwst, useBeratungLang)
    : null;
  const liveItems = buildLineItems(praeparat || "Präparat", ml, preisProMl, selectedZuschlaege, sachkosten, computedS, einheit, useBeratungLang);
  const zwischensumme = liveItems.reduce((s, it) => s + it.betrag, 0);
  const defaultItems = buildLineItems(praeparat || "Präparat", ml, preisProMl, [], sachkosten, null, einheit, useBeratungLang);
  const defaultNetto = defaultItems.reduce((s, it) => s + it.betrag, 0);
  const defaultGesamt = noMwst ? defaultNetto : Math.round((defaultNetto * 1.19) * 100) / 100;
  const mwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  const gesamt = Math.round((zwischensumme + mwst) * 100) / 100;
  const effectiveMaxSteigerung = computedS != null ? Math.max(computedS.s1, computedS.s5, computedS.s267) : 3.5;
  const hasAbove23 = computedS != null && (computedS.s1 > 2.3 || computedS.s5 > 2.3 || computedS.s267 > 2.3);
  const needsBegruendung = hasAbove23 && effectiveMaxSteigerung <= 3.5;

  // Zuschlag toggle
  const toggleZuschlag = (code) => {
    setSelectedZuschlaege((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Sachkosten helpers
  const addSachkosten = () => {
    setSachkosten([...sachkosten, { id: nextSkId, description: "", betragStr: "" }]);
    setNextSkId(nextSkId + 1);
  };
  const updateSachkosten = (id, field, value) => {
    setSachkosten(sachkosten.map((sk) => (sk.id === id ? { ...sk, [field]: value } : sk)));
  };
  const removeSachkosten = (id) => {
    setSachkosten(sachkosten.filter((sk) => sk.id !== id));
  };

  const handleSubmit = async () => {
    const errors = {};
    if (!patient.vorname.trim()) errors.patientVorname = true;
    if (!patient.nachname.trim()) errors.patientNachname = true;
    if (patient.email && patient.email.trim() && !/\S+@\S+\.\S+/.test(patient.email)) errors.patientEmail = true;
    // Address fields are optional
    if (!hvOnlyMode && !invoiceMeta.nummer.trim()) errors.nummer = true;
    if (!hvOnlyMode && invoiceMeta.nummer.trim()) {
      const dupInvoice = invoices.find(inv => !inv._hvOnly && !inv._consentForm && inv.invoiceMeta?.nummer === invoiceMeta.nummer.trim() && inv.id !== amendingId);
      if (dupInvoice) errors.nummerDuplicate = true;
    }
    if (!invoiceMeta.datum) errors.datum = true;
    if (!praeparat.trim()) errors.praeparat = true;
    if (ml <= 0) errors.ml = true;
    if (preisProMlStr === "" || preisProMl < 0) errors.preisProMl = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }
    setValidationErrors({});
    setIsSaving(true);

    // Save practice settings (plaintext — doctor's own business data)
    if (session) {
      try {
        await supabaseUpdateProfile(session.access_token, user.id, practice);
      } catch (err) {
        console.error("Failed to save practice settings:", err);
      }
    }

    try {
      await handleGenerate();
    } finally {
      setIsSaving(false);
    }
  };

  const savePracticeSettings = async () => {
    if (session) {
      try {
        // practice_data stays plaintext (doctor's own business data)
        await supabaseUpdateProfile(session.access_token, user.id, practice);
        trackEvent("practice_settings_saved", {}, session.access_token);
        setSaveToast("Praxiseinstellungen gespeichert");
        setTimeout(() => setSaveToast(""), 3000);
        setShowSettings(false);
        setIsFirstTimeUser(false);
      } catch (err) {
        console.error("Failed to save practice settings:", err);
        alert("Fehler beim Speichern: " + err.message);
      }
    }
  };

  const handleGenerate = async () => {
    const items = buildLineItems(praeparat, ml, preisProMl, selectedZuschlaege, hvOnlyMode ? [] : sachkosten, computedS, einheit, useBeratungLang);
    const hasHV = hvOnlyMode ? true : (fromHvId ? false : items.some((it) => it.steigerung != null && it.steigerung > 3.5));
    const patientDbId = createForPatient?._raw?.id || createForPatient?.id || null;
    const entry = {
      id: amendingId || Date.now(),
      patient: { ...patient },
      _patientDbId: patientDbId,
      invoiceMeta: hvOnlyMode ? { ...invoiceMeta, nummer: invoiceMeta.nummer || "—" } : { ...invoiceMeta, diagnose: indicationType === "medical" ? diagnose : "" },
      lineItems: items,
      hasHV,
      _hvOnly: hvOnlyMode || undefined,
      praeparat,
      einheit,
      ml,
      mlStr,
      preisProMl,
      preisProMlStr,
      wunschGesamtStr,
      targetGesamt: wunschGesamt > 0 ? wunschGesamt : undefined,
      useBeratungLang,
      begruendung: needsBegruendung ? (begruendung || "Überdurchschnittlicher Zeitaufwand und erhöhte Schwierigkeit aufgrund individueller anatomischer Gegebenheiten.") : "",
      selectedZuschlaege: [...selectedZuschlaege],
      sachkosten: hvOnlyMode ? [] : sachkosten.map((sk) => ({ ...sk })),
      treatmentDoc: treatmentMarkers.length > 0 ? { markers: treatmentMarkers.map(m => ({ x: m.x, y: m.y, amount: m.amount })), behandlungsDatum: invoiceMeta.datum, praeparat, einheit, facePhoto: treatmentFacePhoto || "" } : null,
      attachTreatmentPdf: hvOnlyMode ? false : attachTreatmentPdf,
      paymentStatus: hvOnlyMode ? "ausstehend" : (markAsPaid ? "bezahlt" : "ausstehend"),
      indicationType: hvOnlyMode ? undefined : indicationType,
      _fromHvId: fromHvId || undefined,
      _kleinunternehmer: !!practice.kleinunternehmer,
      _practice: { ...practice, logo: practice.logo || "" },
      savedAt: new Date().toISOString(),
    };

    // Persist to Supabase (E2EE: encrypt entire data object)
    if (session) {
      try {
        let serverData = entry, serverIv = null, serverEncVer = null;
        if (currentMEK) {
          const enc = await encryptData(entry, currentMEK);
          serverData = enc.ciphertext; serverIv = enc.iv; serverEncVer = 2;
        }

        const amendingEntry = invoices.find((inv) => inv.id === amendingId);
        if (amendingEntry && amendingEntry._supabaseId) {
          // Update existing
          await supabaseUpdateInvoice(session.access_token, amendingEntry._supabaseId, serverData, serverIv, serverEncVer);
          setInvoices(invoices.map((inv) => (inv.id === amendingId ? { ...entry, _supabaseId: amendingEntry._supabaseId } : inv)));
        } else {
          // Create new
          const created = await supabaseCreateInvoice(session.access_token, user.id, serverData, serverIv, serverEncVer);
          setInvoices([{ ...entry, _supabaseId: created.id, _createdAt: created.created_at || new Date().toISOString() }, ...invoices]);
          setViewingInvoice({ ...entry, _supabaseId: created.id, _createdAt: created.created_at || new Date().toISOString() });
        }

        // Upsert patient (encrypted: manual find-then-insert/update)
        try {
          if (currentMEK) {
            const patientHash = await computePatientHash(getPatientIdentifier(patient), currentMEK);
            const { ciphertext: ptCipher, iv: ptIv } = await encryptData(patient, currentMEK);
            // Check if patient with this hash already exists (E2EE records)
            const existingRes = await fetch(
              `${SUPABASE_URL}/rest/v1/patients?user_id=eq.${user.id}&patient_hash=eq.${encodeURIComponent(patientHash)}`,
              { headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` } }
            );
            const existing = await existingRes.json();
            if (existing.length > 0) {
              // Update existing patient (found by hash)
              await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${existing[0].id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
                body: JSON.stringify({ data: ptCipher, iv: ptIv, patient_hash: patientHash, encryption_version: 1 }),
              });
            } else {
              // Also check for pre-E2EE record by plain email (only if email exists)
              let legacy = [];
              if (patient.email && patient.email.trim()) {
                const legacyRes = await fetch(
                  `${SUPABASE_URL}/rest/v1/patients?user_id=eq.${user.id}&email=eq.${encodeURIComponent(patient.email.toLowerCase().trim())}`,
                  { headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` } }
                );
                legacy = await legacyRes.json();
              }
              if (legacy.length > 0) {
                // Migrate pre-E2EE patient to encrypted
                await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${legacy[0].id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
                  body: JSON.stringify({ data: ptCipher, iv: ptIv, patient_hash: patientHash, email: patientHash, encryption_version: 1 }),
                });
              } else {
                // Insert new patient
                const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
                  body: JSON.stringify({ user_id: user.id, email: patientHash, patient_hash: patientHash, data: ptCipher, iv: ptIv, encryption_version: 1 }),
                });
                if (!insertRes.ok) console.error("[E2EE] Failed to insert patient:", await insertRes.text());
              }
            }
          } else {
            await supabaseUpsertPatient(session.access_token, user.id, patient);
          }
          // Reload patients (decrypted)
          const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
          const decryptedPatients = [];
          for (const rec of patientRecords) {
            let pd = rec.data;
            if (currentMEK && rec.encryption_version >= 1 && rec.iv && typeof pd === "string") {
              try { pd = await decryptData(pd, rec.iv, currentMEK); } catch (e) { continue; }
            }
            decryptedPatients.push({ ...rec, data: pd });
          }
          setPatients(decryptedPatients);
        } catch (err) {
          console.error("Failed to upsert patient:", err);
        }
      } catch (err) {
        console.error("Failed to save invoice:", err);
        alert("Fehler beim Speichern der Rechnung: " + err.message);
        return;
      }
    } else {
      // Fallback: local only
      if (amendingId) {
        setInvoices(invoices.map((inv) => (inv.id === amendingId ? entry : inv)));
      } else {
        setInvoices([entry, ...invoices]);
      }
    }

    const docType = hvOnlyMode ? "hv" : (hasHV ? "invoice_with_hv" : "invoice");
    trackEvent(amendingId ? "document_edited" : "document_created", { type: docType, has_treatment_doc: !!entry.treatmentDoc }, session?.access_token);
    setAmendingId(null);
    setViewingInvoice(entry);
    setPreviewTab(hvOnlyMode ? "honorar" : "rechnung");
    setHvOnlyMode(false);
    setPage("preview");
    window.scrollTo(0, 0);
    setSaveToast(hvOnlyMode ? "Honorarvereinbarung gespeichert" : (fromHvId ? "Rechnung gespeichert (HV verknüpft)" : (hasHV ? "Dokumente gespeichert" : "Dokument gespeichert")));
    setTimeout(() => setSaveToast(""), 3000);
    // Signature modal is now triggered from the HV preview signature area tap
  };

  const handleNew = () => {
    const maxNr = invoices.reduce((max, inv) => Math.max(max, Number(inv.invoiceMeta.nummer) || 0), 0);
    setPatient({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
    const realInv = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
    const latestInv = realInv.length > 0 ? realInv.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, realInv[0]) : null;
    const suggestedNummer = latestInv ? nextInvoiceNumber(latestInv.invoiceMeta.nummer) || "" : "";
    setInvoiceMeta({ nummer: suggestedNummer, ort: invoiceMeta.ort, datum: new Date().toISOString().slice(0, 10), zahlungsfrist: practice.zahlungsfrist ?? 14 });
    setPraeparat("");
    setEinheit("SE");
    setMlStr("1");
    setSelectedZuschlaege([]);
    setSachkosten([]);
    setWunschGesamtStr(""); setUseBeratungLang(false);

    setTreatmentMarkers([]);
    setTreatmentFacePhoto("");
    setMarkAsPaid(false);
    setHvOnlyMode(false);
    setAmendingId(null);
    setCreateForPatient(null);
    setIndicationType("aesthetic");
    setDiagnose("");
    setShowIndicationModal(true);
    setPage("create");
  };

  const handleNewHV = () => {
    setPatient({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
    setInvoiceMeta({ nummer: "", ort: invoiceMeta.ort || practice.city || "", datum: new Date().toISOString().slice(0, 10), zahlungsfrist: practice.zahlungsfrist ?? 14 });
    setPraeparat("");
    setEinheit("SE");
    setMlStr("1");
    setSelectedZuschlaege([]);
    setSachkosten([]);
    setWunschGesamtStr(""); setUseBeratungLang(false);
    setTreatmentMarkers([]);
    setTreatmentFacePhoto("");
    setMarkAsPaid(false);
    setHvOnlyMode(true);
    setAmendingId(null);
    setCreateForPatient(null);
    setPage("create");
  };

  const handleNewHVForPatient = (patientObj) => {
    const d = patientObj.data || patientObj._raw?.data || patientObj;
    setPatient({
      vorname: d.vorname || patientObj.vorname || "",
      nachname: d.nachname || patientObj.nachname || "",
      email: d.email || patientObj.email || "",
      phone: d.phone || "",
      address1: d.address1 || "",
      address2: d.address2 || "",
      country: d.country || "Deutschland",
    });
    setInvoiceMeta({ nummer: "", ort: invoiceMeta.ort || practice.city || "", datum: new Date().toISOString().slice(0, 10), zahlungsfrist: practice.zahlungsfrist ?? 14 });
    setPraeparat("");
    setEinheit("SE");
    setMlStr("1");
    setSelectedZuschlaege([]);
    setSachkosten([]);
    setWunschGesamtStr(""); setUseBeratungLang(false);
    setTreatmentMarkers([]);
    setTreatmentFacePhoto("");
    setMarkAsPaid(false);
    setHvOnlyMode(true);
    setAmendingId(null);
    setFromHvId(null);
    setHvBaseGesamt(null);
    setHvBaseProductCost(null);
    setHvBaseSachkosten(0);
    setCreateForPatient(patientObj);
    setCreateSource("list");
    setPage("create");
  };

  const handleNewForPatient = (patientObj) => {
    const d = patientObj.data || patientObj._raw?.data || patientObj;
    const realInv = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
    const latestInv = realInv.length > 0 ? realInv.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, realInv[0]) : null;
    const suggestedNummer = latestInv ? nextInvoiceNumber(latestInv.invoiceMeta.nummer) || "" : "";
    setPatient({
      vorname: d.vorname || patientObj.vorname || "",
      nachname: d.nachname || patientObj.nachname || "",
      email: d.email || patientObj.email || "",
      phone: d.phone || "",
      address1: d.address1 || "",
      address2: d.address2 || "",
      country: d.country || "Deutschland",
    });
    setInvoiceMeta({ nummer: suggestedNummer, ort: invoiceMeta.ort, datum: new Date().toISOString().slice(0, 10), zahlungsfrist: practice.zahlungsfrist ?? 14 });
    setPraeparat("");
    setEinheit("SE");
    setMlStr("1");
    setSelectedZuschlaege([]);
    setSachkosten([]);
    setWunschGesamtStr(""); setUseBeratungLang(false);
    setTreatmentMarkers([]);
    setTreatmentFacePhoto("");
    setMarkAsPaid(false);
    setHvOnlyMode(false);
    setAmendingId(null);
    setFromHvId(null);
    setHvBaseGesamt(null);
    setHvBaseProductCost(null);
    setHvBaseSachkosten(0);
    setCreateForPatient(patientObj);
    setCreateSource("list");
    setIndicationType("aesthetic");
    setDiagnose("");
    setShowIndicationModal(true);
    setPage("create");
  };

  const handleAmend = (inv, fromTab) => {
    setPatient(inv.patient || { vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
    setInvoiceMeta({ zahlungsfrist: practice.zahlungsfrist ?? 14, ...(inv.invoiceMeta || { nummer: "", ort: "", datum: "" }) });
    setPraeparat(inv.praeparat || "");
    setEinheit(inv.einheit || "ml");
    setMlStr(inv.mlStr || (inv.ml != null ? toDE(inv.ml) : ""));
    setPreisProMlStr(inv.preisProMlStr || (inv.preisProMl != null ? toDE(inv.preisProMl) : ""));
    setSelectedZuschlaege(inv.selectedZuschlaege || []);
    setSachkosten(inv.sachkosten || []);
    setWunschGesamtStr(inv.wunschGesamtStr || inv.wunschNettoStr || ""); setUseBeratungLang(inv.useBeratungLang || false); setBegruendung(inv.begruendung || "");
    if (inv.treatmentDoc && inv.treatmentDoc.markers) {
      setTreatmentMarkers(inv.treatmentDoc.markers.map((m, i) => ({ id: Date.now() + i, ...m })));
      setTreatmentFacePhoto(inv.treatmentDoc.facePhoto || "");
    } else {
      setTreatmentMarkers([]);
      setTreatmentFacePhoto("");
    }
    setMarkAsPaid(inv.paymentStatus === "bezahlt");
    setIndicationType(inv.indicationType || (inv.invoiceMeta?.diagnose ? "medical" : "aesthetic"));
    setDiagnose(inv.invoiceMeta?.diagnose || "");
    setShowIndicationModal(false);
    setHvOnlyMode(fromTab === "honorar" ? true : !!inv._hvOnly);
    setFromHvId(inv._fromHvId || null);
    setHvBaseGesamt(null);
    setHvBaseProductCost(null);
    setHvBaseSachkosten(0);
    setAmendingId(inv.id);
    setPage("create");
  };

  const handleDelete = (id) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    const toDelete = invoices.find((inv) => inv.id === confirmDeleteId);

    // Delete from Supabase
    if (session && toDelete && toDelete._supabaseId) {
      try {
        await supabaseDeleteInvoice(session.access_token, toDelete._supabaseId);
      } catch (err) {
        console.error("Failed to delete invoice from Supabase:", err);
        alert("Fehler beim Löschen: " + err.message);
        return;
      }
    }

    trackEvent("document_deleted", { type: toDelete?._hvOnly ? "hv" : toDelete?._standalone ? "treatment_doc" : "invoice" }, session?.access_token);
    setInvoices(invoices.filter((inv) => inv.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    if (viewingInvoice && viewingInvoice.id === confirmDeleteId) {
      setPage("list");
      setViewingInvoice(null);
    }
  };

  const confirmDeleteKeepHV = async () => {
    const toConvert = invoices.find((inv) => inv.id === confirmDeleteId);
    if (!toConvert) return;

    // Convert to standalone HV: keep GOÄ line items, remove invoice-specific data
    const converted = {
      ...toConvert,
      _hvOnly: true,
      hasHV: true,
      attachTreatmentPdf: false,
      paymentStatus: "ausstehend",
      sachkosten: [],
      lineItems: toConvert.lineItems.filter((it) => !it.isProduct || it.isPraeparat),
    };

    // Update in Supabase (E2EE: encrypt entire data object)
    if (session && converted._supabaseId) {
      try {
        let serverData = converted, serverIv = null, serverEncVer = null;
        if (currentMEK) {
          const enc = await encryptData(converted, currentMEK);
          serverData = enc.ciphertext; serverIv = enc.iv; serverEncVer = 2;
        }
        await supabaseUpdateInvoice(session.access_token, converted._supabaseId, serverData, serverIv, serverEncVer);
      } catch (err) {
        console.error("Failed to convert invoice to standalone HV:", err);
        alert("Fehler: " + err.message);
        return;
      }
    }

    trackEvent("invoice_deleted_keep_hv", {}, session?.access_token);
    setInvoices(invoices.map((inv) => (inv.id === confirmDeleteId ? converted : inv)));
    setConfirmDeleteId(null);
    if (viewingInvoice && viewingInvoice.id === confirmDeleteId) {
      setViewingInvoice(converted);
      setPreviewTab("honorar");
    }
  };

  const confirmDeletePatientAction = async () => {
    if (!confirmDeletePatient) return;
    const patientEmail = (confirmDeletePatient.data?.email || confirmDeletePatient.email || "").toLowerCase();

    // Find all invoices for this patient
    const matchingInvoices = invoices.filter((inv) => (inv.patient?.email || "").toLowerCase() === patientEmail);

    // Delete all matching invoices from Supabase
    if (session) {
      try {
        for (const inv of matchingInvoices) {
          if (inv._supabaseId) {
            await supabaseDeleteInvoice(session.access_token, inv._supabaseId);
          }
        }
        // Delete the patient record
        if (confirmDeletePatient.id) {
          await supabaseDeletePatient(session.access_token, confirmDeletePatient.id);
        }
      } catch (err) {
        console.error("Failed to delete patient:", err);
        alert("Fehler beim Löschen: " + err.message);
        return;
      }
    }

    // Update local state
    trackEvent("patient_deleted", { invoices_deleted: matchingInvoices.length }, session?.access_token);
    const deletedInvoiceIds = new Set(matchingInvoices.map((inv) => inv.id));
    setInvoices(invoices.filter((inv) => !deletedInvoiceIds.has(inv.id)));
    setPatients(patients.filter((p) => p.id !== confirmDeletePatient.id));
    setConfirmDeletePatient(null);
    setSelectedPatient(null);
    setPage("patients");
  };

  const handleView = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab(inv._consentForm ? "consent" : "rechnung");
    setPage("preview");
  };

  // ─── PDF download helper (html2canvas → jsPDF) ───
  const downloadPDF = async (elementId, filename) => {
    const result = await generatePDFBlob(elementId);
    if (!result) return;
    result.pdf.save(filename);
  };

  // ─── Print helper (opens print dialog) ───
  const printElement = (elementId, title) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const win = window.open("", "_blank", "width=800,height=1100");
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{margin:0;padding:0;} @page{size:A4;margin:0;} @media print{body{-webkit-print-color-adjust:exact;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const handlePrintInvoice = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("rechnung");
    setPage("preview");
    setTimeout(() => printElement("invoice-preview", `Rechnung ${inv.invoiceMeta.nummer}`), 100);
  };

  const handleDownloadCurrent = async () => {
    const nr = viewingInvoice?.invoiceMeta?.nummer || "X";
    const elementId = previewTab === "behandlung" ? "invoice-treatment-doc-preview" : previewTab === "honorar" ? "hv-preview" : "invoice-preview";
    const filename = previewTab === "behandlung" ? `Behandlungsdokumentation_${nr}.pdf` : previewTab === "honorar" ? `Honorarvereinbarung_${nr}.pdf` : `Rechnung_${nr}.pdf`;
    const result = await generatePDFBlob(elementId);
    if (!result) return;
    const { pdf } = result;
    // Append treatment doc as page 2 for invoices (not HV/behandlung) when flag is set
    if (previewTab === "rechnung" && viewingInvoice?.attachTreatmentPdf && viewingInvoice?.treatmentDoc) {
      await appendPageToPDF(pdf, "invoice-treatment-doc-preview");
    }
    trackEvent("pdf_downloaded", { type: previewTab }, session?.access_token);
    pdf.save(filename);
  };

  // E2EE helper: fetch invoice from Supabase, decrypt, apply modifier, re-encrypt, save
  const e2eeFetchModifySave = async (token, supabaseId, modifier) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${supabaseId}&select=data,iv,encryption_version`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    const rows = await res.json();
    if (rows.length === 0) return;
    let stored = rows[0].data;
    if (currentMEK && rows[0].encryption_version >= 1 && rows[0].iv && typeof stored === "string") stored = await decryptData(stored, rows[0].iv, currentMEK);
    if (currentMEK && stored.encrypted_patient && stored.patient_iv) { stored.patient = await decryptData(stored.encrypted_patient, stored.patient_iv, currentMEK); delete stored.encrypted_patient; delete stored.patient_iv; }
    const modified = typeof modifier === "function" ? modifier(stored) : { ...stored, ...modifier };
    if (currentMEK) { const enc = await encryptData(modified, currentMEK); await supabaseUpdateInvoice(token, supabaseId, enc.ciphertext, enc.iv, 2); }
    else await supabaseUpdateInvoice(token, supabaseId, modified);
  };

  // Helper: update the currently viewing invoice (and any linked docs) and persist
  const updateViewingInvoiceData = async (updates) => {
    if (!viewingInvoice) return;
    const updated = { ...viewingInvoice, ...updates };
    setViewingInvoice(updated);
    setInvoices((prev) => prev.map((inv) => inv.id === updated.id ? updated : inv));
    if (session && updated._supabaseId) {
      try {
        await e2eeFetchModifySave(session.access_token, updated._supabaseId, updates);
      } catch (e) { console.error("Failed to persist update:", e); }
    }
  };

  // ─── Consent Form Completion Handler ───
  const handleConsentComplete = async (consentData) => {
    if (!consentPatient) return;
    const rawData = (consentPatient._raw && typeof consentPatient._raw.data === "object" && consentPatient._raw.data) ? consentPatient._raw.data : {};
    const patientDbId = consentPatient._raw ? consentPatient._raw.id : consentPatient.id;
    const entry = {
      id: "consent_" + crypto.randomUUID(),
      _consentForm: true,
      _patientDbId: patientDbId,
      patient: { vorname: rawData.vorname || consentPatient.vorname || "", nachname: rawData.nachname || consentPatient.nachname || "", email: rawData.email || consentPatient.email || "", phone: rawData.phone || "", address1: rawData.address1 || "", address2: rawData.address2 || "", country: rawData.country || "Deutschland" },
      invoiceMeta: { datum: consentData.treatmentDate || new Date().toISOString().slice(0, 10), ort: practice.city || "" },
      consentData: { ...consentData, templateId: consentTemplate?.id, templateVersion: consentTemplate?.version },
      _practice: { ...practice, logo: practice.logo || "" },
      _kleinunternehmer: false,
      savedAt: new Date().toISOString(),
    };
    // Only generate PDF hash if both signatures are present (document is complete)
    const hasBothSigs = entry.consentData._signatures?.patient && entry.consentData._signatures?.doctor;
    if (hasBothSigs) {
      try {
        setViewingInvoice(entry);
        await new Promise(r => setTimeout(r, 300));
        const result = await generateMultiPagePDF("consent-form-pdf-target");
        if (result) {
          const pdfArrayBuffer = result.pdf.output("arraybuffer");
          const hashBuffer = await crypto.subtle.digest("SHA-256", pdfArrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const pdfHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
          entry.consentData.pdfHash = pdfHash;
        }
      } catch (e) { console.error("Consent PDF hash error:", e); }
    }
    // Persist to Supabase with E2EE
    if (session) {
      try {
        let serverData = entry, serverIv = null, serverEncVer = null;
        if (currentMEK) {
          const enc = await encryptData(entry, currentMEK);
          serverData = enc.ciphertext; serverIv = enc.iv; serverEncVer = 2;
        }
        const created = await supabaseCreateInvoice(session.access_token, user.id, serverData, serverIv, serverEncVer);
        entry._supabaseId = created.id;
        entry._createdAt = created.created_at || new Date().toISOString();
      } catch (e) { console.error("Failed to save consent form:", e); }
    }
    // Auto-sync demographics from consent form to patient profile
    try {
      const demoFields = {};
      if (consentData.answers) {
        if (consentData.answers.geburtsdatum) demoFields.geburtsdatum = consentData.answers.geburtsdatum;
        if (consentData.answers.groesse) demoFields.groesse = consentData.answers.groesse;
        if (consentData.answers.gewicht) demoFields.gewicht = consentData.answers.gewicht;
        if (consentData.answers.geschlecht) demoFields.geschlecht = consentData.answers.geschlecht;
      }
      if (Object.keys(demoFields).length > 0 && session && currentMEK && consentPatient._raw) {
        const raw = consentPatient._raw;
        const existingData = (typeof raw.data === "object" && raw.data) ? raw.data : {};
        const updatedPatientData = { ...existingData, ...demoFields };
        const newPatientHash = await computePatientHash(getPatientIdentifier(updatedPatientData), currentMEK);
        const { ciphertext, iv } = await encryptData(updatedPatientData, currentMEK);
        await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${raw.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
          body: JSON.stringify({ data: ciphertext, iv, patient_hash: newPatientHash, encryption_version: 1 }),
        });
        // Reload patients to reflect changes
        const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
        const decryptedPatients = [];
        for (const rec of patientRecords) {
          let pd = rec.data;
          if (rec.encryption_version === 1 && rec.iv && currentMEK) {
            try { pd = await decryptData(rec.data, rec.iv, currentMEK); } catch (e) { continue; }
          }
          decryptedPatients.push({ ...rec, data: pd });
        }
        setPatients(decryptedPatients);
        // Update selectedPatient
        const updated = decryptedPatients.find(p => p.id === raw.id);
        if (updated) {
          const ud = (typeof updated?.data === "object" && updated?.data) || {};
          setSelectedPatient({ vorname: ud.vorname || "", nachname: ud.nachname || "", email: ud.email || "", _raw: updated });
        }
      }
    } catch (e) { console.error("Error syncing consent demographics to patient:", e); }

    setInvoices(prev => [entry, ...prev]);
    setViewingInvoice(entry);
    setPreviewTab("consent");
    setPage("preview");
    setConsentPatient(null);
    setConsentTemplate(null);
    setSaveToast("Aufklärungsbogen gespeichert");
    setTimeout(() => setSaveToast(""), 2500);
  };

  const handleSignatureComplete = async (sigs) => {
    setShowSignatureModal(false);
    if (!sigs) return;
    const signatures = {};
    if (sigs.doctor) signatures.doctor = sigs.doctor;
    if (sigs.patient) signatures.patient = sigs.patient;
    // Merge with existing signatures
    const merged = { ...(viewingInvoice?._signatures || {}), ...signatures };
    await updateViewingInvoiceData({ _signatures: merged });
    setSaveToast("Unterschrift gespeichert");
    setTimeout(() => setSaveToast(""), 2500);
  };

  const handleHvDoctorSignComplete = async (doctorSigDataUrl) => {
    setShowHvDoctorSign(false);
    if (!doctorSigDataUrl) return;
    const targetInv = viewingInvoice._fromHvId
      ? invoices.find((inv) => inv.id === viewingInvoice._fromHvId)
      : viewingInvoice;
    const merged = { ...(targetInv?._signatures || {}), doctor: doctorSigDataUrl };
    await updateViewingInvoiceData({ _signatures: merged });
    setSaveToast("Ärzt:in Unterschrift gespeichert");
    setTimeout(() => setSaveToast(""), 2500);
  };

  const handleHvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const isPdf = file.type === "application/pdf";
      let data;
      if (isPdf) {
        data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        data = await compressImage(file, 1200, 0.85);
      }
      const targetInv = viewingInvoice._fromHvId
        ? invoices.find((inv) => inv.id === viewingInvoice._fromHvId)
        : (viewingInvoice._hvOnly || viewingInvoice.hasHV) ? viewingInvoice : null;
      if (!targetInv) {
        // Upload to the current viewing invoice
        await updateViewingInvoiceData({
          _signedHvUpload: { type: isPdf ? "pdf" : "image", data, filename: file.name, uploadedAt: new Date().toISOString() },
        });
      } else if (targetInv.id === viewingInvoice.id) {
        await updateViewingInvoiceData({
          _signedHvUpload: { type: isPdf ? "pdf" : "image", data, filename: file.name, uploadedAt: new Date().toISOString() },
        });
      } else {
        // Update the linked HV entry
        const updatedHv = { ...targetInv, _signedHvUpload: { type: isPdf ? "pdf" : "image", data, filename: file.name, uploadedAt: new Date().toISOString() } };
        setInvoices((prev) => prev.map((inv) => inv.id === targetInv.id ? updatedHv : inv));
        if (session && targetInv._supabaseId) {
          try {
            await e2eeFetchModifySave(session.access_token, targetInv._supabaseId, { _signedHvUpload: updatedHv._signedHvUpload });
          } catch (err) { console.error("Failed to persist HV upload:", err); }
        }
      }
      setSaveToast("Unterschriebene HV hochgeladen");
      setTimeout(() => setSaveToast(""), 2500);
    } catch (err) {
      console.error("HV upload error:", err);
      alert("Fehler beim Hochladen: " + err.message);
    }
  };

  const handleShareCurrent = async () => {
    const nr = viewingInvoice?.invoiceMeta?.nummer || "X";
    const elementId = previewTab === "behandlung" ? "invoice-treatment-doc-preview" : previewTab === "honorar" ? "hv-preview" : "invoice-preview";
    const filename = previewTab === "behandlung" ? `Behandlungsdokumentation_${nr}.pdf` : previewTab === "honorar" ? `Honorarvereinbarung_${nr}.pdf` : `Rechnung_${nr}.pdf`;
    try {
      const result = await generatePDFBlob(elementId);
      if (!result) return;
      const { pdf } = result;
      // Append treatment doc as page 2 for invoices (not HV/behandlung) when flag is set
      if (previewTab === "rechnung" && viewingInvoice?.attachTreatmentPdf && viewingInvoice?.treatmentDoc) {
        await appendPageToPDF(pdf, "invoice-treatment-doc-preview");
      }
      const blob = pdf.output("blob");
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        trackEvent("pdf_shared", { type: previewTab }, session?.access_token);
        await navigator.share({ files: [file], title: filename });
      } else {
        trackEvent("pdf_downloaded", { type: previewTab }, session?.access_token);
        pdf.save(filename);
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("Share failed:", e);
    }
  };

  const handlePrintCurrentDoc = () => {
    const nr = viewingInvoice?.invoiceMeta?.nummer || "X";
    const elementId = previewTab === "behandlung" ? "invoice-treatment-doc-preview" : previewTab === "honorar" ? "hv-preview" : "invoice-preview";
    const title = previewTab === "behandlung" ? `Behandlungsdokumentation ${nr}` : previewTab === "honorar" ? `Honorarvereinbarung ${nr}` : `Rechnung ${nr}`;
    trackEvent("pdf_printed", { type: previewTab }, session?.access_token);
    printElement(elementId, title);
  };

  const handleViewHV = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("honorar");
    setPage("preview");
  };

  const handlePrintHV = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("honorar");
    setPage("preview");
    setTimeout(() => printElement("hv-preview", `Honorarvereinbarung ${inv.invoiceMeta.nummer}`), 100);
  };

  // Generate PDF blob from element (handles hidden elements on mobile)
  const generatePDFBlob = async (elementId) => {
    let el = document.getElementById(elementId);
    if (!el) return null;
    // If element or parent is hidden (display:none), temporarily make it visible offscreen for capture
    const hiddenParents = [];
    let node = el;
    while (node && node !== document.body) {
      if (window.getComputedStyle(node).display === "none") {
        hiddenParents.push({ node, prev: node.style.cssText });
        node.style.cssText += ";display:block !important;position:absolute !important;left:-9999px !important;top:0 !important;";
      }
      node = node.parentElement;
    }
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      return { pdf, blob: pdf.output("blob") };
    } finally {
      // Restore hidden parents
      hiddenParents.forEach(({ node: n, prev }) => { n.style.cssText = prev; });
    }
  };

  // Append a second page (from another DOM element) to an existing jsPDF instance
  const appendPageToPDF = async (pdf, elementId) => {
    let el = document.getElementById(elementId);
    if (!el) return;
    const hiddenParents = [];
    let node = el;
    while (node && node !== document.body) {
      if (window.getComputedStyle(node).display === "none") {
        hiddenParents.push({ node, prev: node.style.cssText });
        node.style.cssText += ";display:block !important;position:absolute !important;left:-9999px !important;top:0 !important;";
      }
      node = node.parentElement;
    }
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    } finally {
      hiddenParents.forEach(({ node: n, prev }) => { n.style.cssText = prev; });
    }
  };

  // Generate a multi-page A4 PDF by capturing each [data-pdf-page] element as a separate page,
  // or by flowing content across pages with header/footer when data-pdf-mode="flow" is set.
  const generateMultiPagePDF = async (elementId) => {
    let el = document.getElementById(elementId);
    if (!el) return null;
    const hiddenParents = [];
    let node = el;
    while (node && node !== document.body) {
      if (window.getComputedStyle(node).display === "none") {
        hiddenParents.push({ node, prev: node.style.cssText });
        node.style.cssText += ";display:block !important;position:absolute !important;left:-9999px !important;top:0 !important;";
      }
      node = node.parentElement;
    }
    try {
      // ── Flow mode: slice one tall content canvas across pages with header/footer ──
      if (el.dataset.pdfMode === "flow") {
        const headerEl = el.querySelector("[data-pdf-header]");
        const footerEl = el.querySelector("[data-pdf-footer]");
        const contentEl = el.querySelector("[data-pdf-content]");
        if (!contentEl) return null;

        // Make hidden templates visible for capture
        const prevH = headerEl.style.cssText;
        const prevF = footerEl.style.cssText;
        headerEl.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;padding:30px 44px 0 44px;background:white;box-sizing:border-box;display:block;";
        footerEl.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;padding:0 44px 30px 44px;background:white;box-sizing:border-box;display:block;";

        const scale = 2;
        const headerCanvas = await html2canvas(headerEl, { scale, useCORS: true, backgroundColor: "#fff" });
        const footerCanvas = await html2canvas(footerEl, { scale, useCORS: true, backgroundColor: "#fff" });
        const contentCanvas = await html2canvas(contentEl, { scale, useCORS: true, backgroundColor: "#fff" });

        headerEl.style.cssText = prevH;
        footerEl.style.cssText = prevF;

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth(); // 210mm
        const pdfH = pdf.internal.pageSize.getHeight(); // 297mm

        // Convert canvas pixel heights to mm (at our capture scale, the element width = 210mm)
        const pxPerMm = contentCanvas.width / 210;
        const headerHmm = headerCanvas.height / pxPerMm;
        const footerHmm = footerCanvas.height / pxPerMm;
        const contentHmm = contentCanvas.height / pxPerMm;
        const availablePerPage = pdfH - headerHmm - footerHmm;
        const totalPdfPages = Math.ceil(contentHmm / availablePerPage);

        for (let p = 0; p < totalPdfPages; p++) {
          if (p > 0) pdf.addPage();

          // Draw header
          const headerImg = headerCanvas.toDataURL("image/png");
          pdf.addImage(headerImg, "PNG", 0, 0, pdfW, headerHmm);

          // Draw page number over header placeholder
          pdf.setFontSize(7);
          pdf.setTextColor(153, 153, 153);
          pdf.text(`Seite ${p + 1} von ${totalPdfPages}`, pdfW - 44, 34, { align: "right" });

          // Draw content slice
          const sliceTopPx = p * availablePerPage * pxPerMm;
          const sliceHeightPx = Math.min(availablePerPage * pxPerMm, contentCanvas.height - sliceTopPx);
          const sliceHmm = sliceHeightPx / pxPerMm;

          // Create a temporary canvas for this slice
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = contentCanvas.width;
          sliceCanvas.height = Math.ceil(sliceHeightPx);
          const ctx = sliceCanvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(contentCanvas, 0, sliceTopPx, contentCanvas.width, sliceHeightPx, 0, 0, contentCanvas.width, sliceHeightPx);

          const sliceImg = sliceCanvas.toDataURL("image/png");
          pdf.addImage(sliceImg, "PNG", 0, headerHmm, pdfW, sliceHmm);

          // Draw footer
          const footerImg = footerCanvas.toDataURL("image/png");
          pdf.addImage(footerImg, "PNG", 0, pdfH - footerHmm, pdfW, footerHmm);
        }

        return { pdf, blob: pdf.output("blob") };
      }

      // ── Page mode: each [data-pdf-page] is a separate page ──
      const pages = el.querySelectorAll("[data-pdf-page]");
      if (!pages || pages.length === 0) {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
        return { pdf, blob: pdf.output("blob") };
      }
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: "#fff" });
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      }
      return { pdf, blob: pdf.output("blob") };
    } finally {
      hiddenParents.forEach(({ node: n, prev }) => { n.style.cssText = prev; });
    }
  };

  // Share or download PDF depending on device capability
  const shareOrDownloadPDF = async (elementId, filename, extraPageElementId) => {
    const result = await generatePDFBlob(elementId);
    if (!result) return;
    const { pdf } = result;
    // Optionally append a second page (e.g., treatment doc)
    if (extraPageElementId) {
      await appendPageToPDF(pdf, extraPageElementId);
    }
    const blob = pdf.output("blob");
    const file = new File([blob], filename, { type: "application/pdf" });
    const isMobile = window.innerWidth < 640;
    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename }); } catch (e) { if (e.name !== "AbortError") pdf.save(filename); }
    } else {
      pdf.save(filename);
    }
  };

  const handleDownloadInvoice = (inv) => {
    const prevPage = page;
    const prevViewing = viewingInvoice;
    setViewingInvoice(inv);
    setPreviewTab("rechnung");
    setPage("preview");
    setTimeout(async () => {
      await shareOrDownloadPDF("invoice-preview", `Rechnung_${inv.invoiceMeta.nummer}.pdf`);
      setPage(prevPage);
      setViewingInvoice(prevViewing);
    }, 200);
  };

  const handleDownloadHV = (inv) => {
    const prevPage = page;
    const prevViewing = viewingInvoice;
    setViewingInvoice(inv);
    setPreviewTab("honorar");
    setPage("preview");
    setTimeout(async () => {
      await shareOrDownloadPDF("hv-preview", `Honorarvereinbarung_${inv.invoiceMeta.nummer}.pdf`);
      setPage(prevPage);
      setViewingInvoice(prevViewing);
    }, 200);
  };

  const handleViewTD = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("behandlung");
    setPage("preview");
  };

  const handleDownloadTD = (inv) => {
    const prevPage = page;
    const prevViewing = viewingInvoice;
    setViewingInvoice(inv);
    setPreviewTab("behandlung");
    setPage("preview");
    setTimeout(async () => {
      const td = inv.treatmentDoc || {};
      const dateStr = td.behandlungsDatum || inv.invoiceMeta.datum || new Date().toISOString().slice(0, 10);
      const patName = [(inv.patient || {}).vorname || "", (inv.patient || {}).nachname || ""].filter(Boolean).join("_") || "Patient";
      await shareOrDownloadPDF("invoice-treatment-doc-preview", `Behandlung_${patName}_${dateStr}.pdf`);
      setPage(prevPage);
      setViewingInvoice(prevViewing);
    }, 200);
  };

  const handlePrintTD = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("behandlung");
    setPage("preview");
    const td = inv.treatmentDoc || {};
    const dateStr = td.behandlungsDatum || inv.invoiceMeta.datum || "";
    setTimeout(() => printElement("invoice-treatment-doc-preview", `Behandlungsdokumentation ${dateStr}`), 100);
  };

  // ─── Show auth screens if not logged in ───
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div className="text-center">
          <div className="mb-2 flex justify-center"><img src="/logo.svg" alt="EPHIA" style={{ height: "42px" }} /></div>
          <p className="text-xs text-gray-400">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authPage === "signup") {
      return (
        <SignUpScreen
          onSignUpClick={handleSignUp}
          onBackClick={() => { setAuthPage("login"); setAuthError(""); setAuthSuccess(false); }}
          isLoading={authLoading}
          error={authError}
          success={authSuccess}
          successEmail={authSuccessEmail}
        />
      );
    }
    if (authPage === "reset") {
      return (
        <ResetPasswordScreen
          onResetClick={handleResetPassword}
          onBackClick={() => { setAuthPage("login"); setAuthError(""); setAuthSuccess(false); }}
          isLoading={authLoading}
          error={authError}
          success={authSuccess}
        />
      );
    }
    if (authPage === "set_new_password") {
      return (
        <SetNewPasswordScreen
          onSubmit={async (newPassword) => {
            setAuthError("");
            setAuthSuccess(false);
            setAuthLoading(true);
            try {
              // Use recovery access token to set new password
              const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${recoveryAccessToken}` },
                body: JSON.stringify({ password: newPassword }),
              });
              const updateData = await updateRes.json();
              if (!updateRes.ok) { throw new Error(updateData.message || updateData.msg || "Fehler beim Setzen des Passworts"); }

              // Re-wrap MEK using recovery key if available
              try {
                const userId = updateData.id;
                // Fetch profile to get recovery key
                const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`, {
                  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${recoveryAccessToken}` },
                });
                const profiles = await profRes.json();
                if (profiles.length > 0) {
                  const profile = profiles[0];
                  if (profile.recovery_key && profile.recovery_wrapped_mek && profile.recovery_iv) {
                    // Unwrap MEK with recovery key
                    const rkRaw = base64ToBuf(profile.recovery_key);
                    const rk = await crypto.subtle.importKey("raw", rkRaw, "AES-GCM", false, ["decrypt"]);
                    const mek = await unwrapMEK(profile.recovery_wrapped_mek, profile.recovery_iv, rk);

                    // Re-wrap MEK with new password
                    const newSalt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
                    const newPdk = await derivePDK(newPassword, newSalt);
                    const { ciphertext: newWrapped, iv: newIv } = await encryptData(
                      btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", mek)))),
                      newPdk
                    );

                    // Generate new recovery key
                    const newRkRaw = crypto.getRandomValues(new Uint8Array(32));
                    const newRk = await crypto.subtle.importKey("raw", newRkRaw, "AES-GCM", false, ["encrypt"]);
                    const mekRawExport = await crypto.subtle.exportKey("raw", mek);
                    const mekB64 = btoa(String.fromCharCode(...new Uint8Array(mekRawExport)));
                    const { ciphertext: newRecWrapped, iv: newRecIv } = await encryptData(mekB64, newRk);

                    await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${recoveryAccessToken}` },
                      body: JSON.stringify({
                        mek_wrapped: newWrapped, mek_iv: newIv, mek_salt: newSalt,
                        recovery_wrapped_mek: newRecWrapped, recovery_iv: newRecIv,
                        recovery_key: bufToBase64(newRkRaw),
                      }),
                    });
                  }
                }
              } catch (e) {
                console.error("Failed to re-wrap MEK during recovery:", e);
              }

              setRecoveryAccessToken(null);
              setAuthSuccess(true);
            } catch (err) {
              setAuthError(err.message || "Fehler beim Setzen des Passworts.");
            } finally {
              setAuthLoading(false);
            }
          }}
          onBackClick={() => { setAuthPage("login"); setAuthError(""); setAuthSuccess(false); setRecoveryAccessToken(null); }}
          isLoading={authLoading}
          error={authError}
          success={authSuccess}
        />
      );
    }
    if (authPage === "agb") {
      return <AGBPage onBack={() => setAuthPage("login")} />;
    }
    if (authPage === "impressum") {
      return <ImpressumPage onBack={() => setAuthPage("login")} />;
    }
    if (authPage === "datenschutz") {
      return <DatenschutzPage onBack={() => setAuthPage("login")} />;
    }
    return (
      <LoginScreen
        onSignInClick={(email, password) => {
          setAuthError("");
          handleSignIn(email, password);
        }}
        onSignUpClick={() => {
          setAuthError("");
          setAuthPage("signup");
        }}
        onResetClick={() => {
          setAuthError("");
          setAuthSuccess(false);
          setAuthPage("reset");
        }}
        onAGBClick={() => setAuthPage("agb")}
        onImpressumClick={() => setAuthPage("impressum")}
        onDatenschutzClick={() => setAuthPage("datenschutz")}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", overflowX: "clip" }}>
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none} .hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none} @keyframes plz-flash{0%{background-color:#d1fae5}100%{background-color:transparent}} .plz-autofilled{animation:plz-flash 1.2s ease-out}`}</style>
      {/* ─── Top bar ─── */}
      {page !== "consent" && <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <button onClick={() => setPage("patients")} className="hover:opacity-70 transition flex-shrink-0"><img src="/logo.svg" alt="EPHIA" style={{ height: "28px" }} className="sm:hidden" /><img src="/logo.svg" alt="EPHIA" style={{ height: "33px" }} className="hidden sm:block" /></button>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <button
              className={`text-xs px-2 sm:px-3 py-1.5 rounded border transition ${page === "patients" || page === "patientDetail" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              onClick={() => setPage("patients")}
            >
              <span className="sm:hidden"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></span><span className="hidden sm:inline">Patient:innen</span>
            </button>
            {patients.length > 0 && (<button
              className={`text-xs px-2 sm:px-3 py-1.5 rounded border transition ${page === "list" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              onClick={() => setPage("list")}
            >
              <span className="sm:hidden"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></span><span className="hidden sm:inline">Dokumente</span>
            </button>)}
            <div className="border-l border-gray-200 h-5 mx-0.5 sm:mx-1 hidden sm:block"></div>
            <button
              className="text-xs px-2 sm:px-3 py-1.5 rounded border transition text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"
              onClick={() => setShowSettings(true)}
            >
              <span className="sm:hidden"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span><span className="hidden sm:inline">Praxis-Einstellungen</span>
            </button>
            <button
              className="text-xs px-2 sm:px-3 py-1.5 rounded border border-gray-200 text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition"
              onClick={handleSignOut}
            >
              <span className="sm:hidden"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></span><span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>}

      {/* Delete modal */}
      {confirmDeleteId && (() => {
        const delInv = invoices.find((i) => i.id === confirmDeleteId);
        const delHasHV = delInv && !delInv._hvOnly && !delInv._standalone && (delInv.hasHV != null ? delInv.hasHV : (delInv.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5));
        return (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{delInv?._consentForm ? "Aufklärungsbogen löschen?" : delInv?._hvOnly ? "Honorarvereinbarung löschen?" : "Rechnung löschen?"}</h3>
              <p className="text-xs text-gray-500 mb-4">
                {delInv?._consentForm
                  ? "Möchtest Du diesen Aufklärungsbogen wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
                  : delHasHV
                  ? `Rechnung Nr. ${delInv?.invoiceMeta.nummer} hat eine zugehörige Honorarvereinbarung. Möchtest Du beides löschen oder nur die Rechnung löschen und die HV behalten?`
                  : `Möchtest Du ${delInv?._hvOnly ? "diese Honorarvereinbarung" : `Rechnung Nr. ${delInv?.invoiceMeta.nummer}`} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
                }
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setConfirmDeleteId(null)}>Abbrechen</button>
                {delHasHV && (
                  <button className="px-3 py-1.5 text-xs rounded border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100" onClick={confirmDeleteKeepHV}>Nur Rechnung löschen</button>
                )}
                <button className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>{delHasHV ? "Beides löschen" : "Löschen"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Consent form risk warning modal */}
      {consentWarningPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-5 sm:p-6 w-full max-w-sm sm:max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.54 20h18.92a1 1 0 00.85-1.28l-8.6-14.86a1 1 0 00-1.72 0z" /></svg>
              <h3 className="text-sm font-semibold text-gray-800">Wichtiger Hinweis</h3>
            </div>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Dieser Aufklärungsbogen wurde nach bestem Wissen erstellt, kann jedoch keine rechtliche Garantie auf Vollständigkeit oder Rechtskonformität bieten. Die Verwendung erfolgt auf eigenes Risiko. Bitte prüfe, ob der Bogen den Anforderungen Deiner Praxis und der geltenden Rechtslage entspricht, und passe ihn gegebenenfalls an. EPHIA übernimmt keine Haftung für etwaige rechtliche Folgen.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button className="px-3 py-2 sm:py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 w-full sm:w-auto" onClick={() => setConsentWarningPatient(null)}>Abbrechen</button>
              <button className="px-3 py-2 sm:py-1.5 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 font-medium w-full sm:w-auto" onClick={() => {
                const p = consentWarningPatient;
                setConsentWarningPatient(null);
                setConsentPatient(p);
                setConsentTemplate(CONSENT_TEMPLATES[0]);
                setPage("consent");
              }}>Verstanden, fortfahren</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeletePatient && (() => {
        const pEmail = (confirmDeletePatient.data?.email || confirmDeletePatient.email || "").toLowerCase();
        const pDbId = confirmDeletePatient.id;
        const pInvoices = invoices.filter((inv) => {
          if (inv._patientDbId && pDbId) return inv._patientDbId === pDbId;
          const invEmail = (inv.patient?.email || "").toLowerCase();
          return pEmail && invEmail && invEmail === pEmail;
        });
        const pHVs = pInvoices.filter((inv) => inv.hasHV != null ? inv.hasHV : (inv.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5));
        const pName = [confirmDeletePatient.data?.vorname || confirmDeletePatient.vorname, confirmDeletePatient.data?.nachname || confirmDeletePatient.nachname].filter(Boolean).join(" ") || pEmail;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Patient:in löschen?</h3>
              <p className="text-xs text-gray-500 mb-4">
                <strong>{pName}</strong> und alle zugehörigen Rechnungen ({pInvoices.length}) und Honorarvereinbarungen ({pHVs.length}) werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setConfirmDeletePatient(null)}>Abbrechen</button>
                <button className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={confirmDeletePatientAction}>Löschen</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Save toast */}
      {saveToast && (
        <div className="fixed top-16 right-6 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {saveToast}
        </div>
      )}

      <SettingsPanel practice={practice} setPractice={setPractice} show={showSettings} setShow={setShowSettings} onSave={savePracticeSettings} isFirstTime={isFirstTimeUser} session={session} currentMEK={currentMEK} userId={user?.id} patients={patients} invoices={invoices} setPatients={setPatients} setInvoices={setInvoices} />

      {/* Verdienst Popup */}
      {showVerdienst && (() => {
        const praeparatKosten = ml * preisProMl;
        const sachkostenTotal = (sachkosten || []).reduce((sum, sk) => sum + parseDE(sk.betragStr), 0);
        const zuschlagTotal = (selectedZuschlaege || []).reduce((sum, code) => {
          const z = ZUSCHLAEGE.find((zs) => zs.code === code);
          return sum + (z ? calcGoaBetrag(z.punkte, 1.0) : 0);
        }, 0);
        const netto = zwischensumme;
        const liveMwst = noMwst ? 0 : Math.round(netto * 0.19 * 100) / 100;
        const liveGesamt = Math.round((netto + liveMwst) * 100) / 100;
        const verdienst = netto - praeparatKosten - sachkostenTotal;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center" onClick={() => setShowVerdienst(false)}>
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">{hvOnlyMode ? "Dein geplanter Verdienst" : "Dein Verdienst"}</h3>
                <button className="text-gray-400 hover:text-gray-600 text-lg leading-none" onClick={() => setShowVerdienst(false)}>✕</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Gesamtbetrag (Rechnung)</span>
                  <span className="font-medium text-gray-700">{fmt(liveGesamt).replace(".", ",")} €</span>
                </div>
                {!noMwst && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">MwSt. (19%)</span>
                    <span className="text-gray-700">− {fmt(liveMwst).replace(".", ",")} €</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Präparatkosten ({mlStr || "0"} × {preisProMlStr || "0"} €)</span>
                  <span className="text-gray-700">{praeparatKosten > 0 ? "−" : ""} {fmt(praeparatKosten).replace(".", ",")} €</span>
                </div>
                {sachkostenTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Weitere Sachkosten</span>
                    <span className="text-gray-700">− {fmt(sachkostenTotal).replace(".", ",")} €</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-800">{hvOnlyMode ? "Dein geplanter Verdienst" : "Dein Verdienst"}</span>
                  <span className="font-semibold text-gray-800">{fmt(verdienst).replace(".", ",")} €</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Vor Einkommensteuer.</p>
            </div>
          </div>
        );
      })()}

      {page === "agb" && <AGBPage onBack={() => setPage("patients")} />}
      {page === "impressum" && <ImpressumPage onBack={() => setPage("patients")} />}
      {page === "datenschutz" && <DatenschutzPage onBack={() => setPage("patients")} />}

      {page === "consent" && consentTemplate && consentPatient && (
        <ConsentFormView
          template={consentTemplate}
          patient={consentPatient}
          practice={practice}
          onComplete={handleConsentComplete}
          onCancel={() => { setConsentPatient(null); setConsentTemplate(null); setPage("patientDetail"); }}
        />
      )}

      {page !== "agb" && page !== "impressum" && page !== "datenschutz" && page !== "consent" && <div className={`mx-auto px-3 sm:px-6 py-3 sm:py-5 ${page === "create" ? "max-w-7xl" : page === "list" || page === "patients" || page === "patientDetail" ? "max-w-6xl" : page === "preview" ? "max-w-5xl" : "max-w-3xl"}`}>
        {/* ═══ CREATE PAGE ═══ */}
        {page === "create" && (
          <>
          {/* ═══ Indication Type Modal ═══ */}
          {showIndicationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8" style={{ maxWidth: 480, width: "100%" }}>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Art der Abrechnung</h3>
                <p className="text-xs text-gray-400 mb-5">Wähle, ob die Rechnung für eine ästhetische oder therapeutische Indikation erstellt werden soll.</p>
                <div className="flex flex-col gap-3">
                  <button
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-left group"
                    onClick={() => { setIndicationType("aesthetic"); setDiagnose(""); setShowIndicationModal(false); }}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700">Ästhetische Indikation</div>
                      <div className="text-xs text-gray-400">Selbstzahler-Rechnung ohne Diagnose</div>
                    </div>
                  </button>
                  <button
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-left group"
                    onClick={() => { setIndicationType("medical"); setShowIndicationModal(false); }}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700">Therapeutische Indikation</div>
                      <div className="text-xs text-gray-400">Rechnung mit Diagnose (z. B. für Private Krankenkasse)</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-6 items-start">
          {/* Left side: Form */}
          <div className="w-full lg:w-[400px] flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            {createForPatient && !amendingId && (
              <button className="text-xs text-gray-400 hover:text-gray-600 mb-2" onClick={() => { setCreateForPatient(null); setPage(createSource === "list" ? "list" : "patientDetail"); }}>{createSource === "list" ? "← Zurück zu Dokumente" : `← Zurück zu ${patient.vorname} ${patient.nachname}`}</button>
            )}
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              {hvOnlyMode
                ? (amendingId ? "Honorarvereinbarung ändern" : createForPatient ? `Honorarvereinbarung für ${patient.vorname} ${patient.nachname}` : "Neue Honorarvereinbarung")
                : (amendingId ? "Rechnung ändern" : createForPatient ? `Rechnung für ${patient.vorname} ${patient.nachname}` : "Botulinum-Rechnung erstellen")}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {hvOnlyMode
                ? (amendingId
                  ? "Passe die Daten an und speichere die geänderte Honorarvereinbarung."
                  : "Hinweis: Eine Honorarvereinbarung nach §2 GOÄ ist nur erforderlich, wenn der Steigerungssatz einer Leistung über 3,5 liegt.")
                : (amendingId
                  ? "Passe die Daten an und speichere die geänderte Rechnung."
                  : "Trag einfach die Behandlungsdetails ein. Deine Rechnung wird automatisch nach GOÄ erstellt.")}
            </p>
            {amendingId && !hvOnlyMode && effectiveMaxSteigerung > 3.5 && (
              <div className="mb-6 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                Änderungen werden auch in der zugehörigen Honorarvereinbarung übernommen.
              </div>
            )}

            {/* HV import banner */}
            {createForPatient && !hvOnlyMode && !amendingId && (() => {
              const pDbId = createForPatient?._raw?.id || createForPatient?.id || null;
              const pEmail = (createForPatient?.data?.email || createForPatient?.email || createForPatient?._raw?.data?.email || "").toLowerCase();
              // Find HVs belonging to this patient
              const patientHVs = invoices.filter((inv) => {
                if (!inv._hvOnly) return false;
                if (inv._patientDbId && pDbId) return inv._patientDbId === pDbId;
                const invEmail = (inv.patient?.email || "").toLowerCase();
                return pEmail && invEmail && invEmail === pEmail;
              });
              // An HV is "linked" if any regular invoice references it via _fromHvId
              const linkedHvIds = new Set(invoices.filter((inv) => inv._fromHvId && !inv._hvOnly && !inv._standalone).map((inv) => inv._fromHvId));
              const unlinkedHVs = patientHVs.filter((hv) => !linkedHvIds.has(hv.id));
              if (unlinkedHVs.length === 0) return null;

              const importFromHV = (hv) => {
                setPraeparat(hv.praeparat || "");
                setEinheit(hv.einheit || "SE");
                setMlStr(hv.mlStr || (hv.ml != null ? (hv.ml % 1 === 0 ? String(hv.ml) : hv.ml.toFixed(2).replace(".", ",")) : "1"));
                setPreisProMlStr(hv.preisProMlStr || (hv.preisProMl != null ? hv.preisProMl.toFixed(2).replace(".", ",") : ""));
                setSelectedZuschlaege(hv.selectedZuschlaege || []);
                setWunschGesamtStr(hv.wunschGesamtStr || "");
                setUseBeratungLang(hv.useBeratungLang || false);
                setBegruendung(hv.begruendung || "");
                if (hv.treatmentDoc && hv.treatmentDoc.markers && hv.treatmentDoc.markers.length > 0) {
                  setTreatmentMarkers(hv.treatmentDoc.markers.map((m, i) => ({ id: Date.now() + i, ...m })));
                  setTreatmentFacePhoto(hv.treatmentDoc.facePhoto || "");
                  setAttachTreatmentPdf(true);
                } else {
                  setTreatmentMarkers([]);
                  setTreatmentFacePhoto("");
                }
                // Store HV base values for cost deviation tracking
                const hvGesamt = parseDE(hv.wunschGesamtStr || "0");
                const hvMl = hv.ml != null ? hv.ml : parseDE(hv.mlStr || "0");
                const hvPpm = hv.preisProMl != null ? hv.preisProMl : parseDE(hv.preisProMlStr || "0");
                setHvBaseGesamt(hvGesamt > 0 ? hvGesamt : null);
                setHvBaseProductCost(Math.round(hvMl * hvPpm * 100) / 100);
                setHvBaseSachkosten(0);
                setSachkosten([]);
                setFromHvId(hv.id);
              };

              return (
                <div className="mb-4 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 mb-1.5">Honorarvereinbarung vorhanden</p>
                  <p className="text-xs text-blue-600 mb-2">Daten aus einer bestehenden HV übernehmen:</p>
                  <div className="space-y-1.5">
                    {unlinkedHVs.map((hv) => {
                      const hvDate = hv.invoiceMeta?.datum || "";
                      const hvPraep = hv.praeparat || "Unbekannt";
                      const hvMl = hv.mlStr || (hv.ml != null ? String(hv.ml) : "");
                      const hvPatientName = [hv.patient?.vorname, hv.patient?.nachname].filter(Boolean).join(" ");
                      return (
                        <button key={hv.id} className="w-full text-left px-2.5 py-1.5 bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors text-xs text-blue-800" onClick={() => importFromHV(hv)}>
                          {hvPatientName ? `${hvPatientName}, ` : ""}{hvPraep}, {hvMl} {hv.einheit || "SE"}{hvDate ? `, ${hvDate.split("-").reverse().join(".")}` : ""}
                        </button>
                      );
                    })}
                  </div>
                  {fromHvId && <p className="text-xs text-green-600 mt-2 font-medium">✓ Daten aus HV übernommen</p>}
                </div>
              );
            })()}

            {/* Rechnung meta */}
            <div className="mb-6 pb-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-4">{hvOnlyMode ? "Honorarvereinbarung" : "Rechnung"}</p>
              <div className="space-y-4">
                <div className={`grid grid-cols-1 ${hvOnlyMode ? "" : "sm:grid-cols-2"} gap-4`}>
                  {!hvOnlyMode && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Rechnungsnummer *</label>
                    <input id="field-nummer" className={inputCls(validationErrors.nummerDuplicate ? "nummerDuplicate" : "nummer")} value={invoiceMeta.nummer} placeholder={(() => { const ri = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—"); if (ri.length === 0) return ""; const lt = ri.reduce((b, i) => { const t = i._createdAt || i.savedAt || ""; const bt = b._createdAt || b.savedAt || ""; return t > bt ? i : b; }, ri[0]); return nextInvoiceNumber(lt.invoiceMeta.nummer); })()} onChange={(e) => { setInvoiceMeta({ ...invoiceMeta, nummer: e.target.value }); clearError("nummer"); clearError("nummerDuplicate"); }} />
                    {validationErrors.nummerDuplicate && <p className="text-xs text-red-500 mt-0.5">Diese Rechnungsnummer existiert bereits.</p>}
                    {invoices.length > 0 && !amendingId && (() => {
                      const realInv = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
                      if (realInv.length === 0) return null;
                      const latest = realInv.reduce((best, inv) => {
                        const t = inv._createdAt || inv.savedAt || "";
                        const bt = best._createdAt || best.savedAt || "";
                        return t > bt ? inv : best;
                      }, realInv[0]);
                      const suggested = nextInvoiceNumber(latest.invoiceMeta.nummer);
                      return (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Letzte: {latest.invoiceMeta.nummer}
                          {suggested && !invoiceMeta.nummer && <span> · <button type="button" className="text-blue-500 hover:text-blue-700" onClick={() => setInvoiceMeta({ ...invoiceMeta, nummer: suggested })}>{suggested} übernehmen</button></span>}
                        </p>
                      );
                    })()}
                  </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{hvOnlyMode ? "Datum der Behandlung" : "Datum"} *</label>
                    <input id="field-datum" type="date" className={inputCls("datum") + " bg-white text-left"} style={{ WebkitAppearance: "none", appearance: "none", colorScheme: "light" }} value={invoiceMeta.datum} onChange={(e) => { setInvoiceMeta({ ...invoiceMeta, datum: e.target.value }); clearError("datum"); }} />
                  </div>
                </div>
                <div className={`grid grid-cols-1 ${hvOnlyMode ? "" : "sm:grid-cols-2"} gap-4`}>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">Ort der Behandlung <InfoTooltip>Wird automatisch aus Deinen Praxiseinstellungen übernommen. Du kannst den Ort dort unter „Stadt (Behandlungsort)" ändern.</InfoTooltip></label>
                    <input id="field-ort" className={inputCls("ort")} value={invoiceMeta.ort} placeholder="Berlin" onChange={(e) => { setInvoiceMeta({ ...invoiceMeta, ort: e.target.value }); clearError("ort"); }} />
                  </div>
                  {!hvOnlyMode && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">Zahlungsfrist (Tage) <InfoTooltip>Standardwert aus den Praxiseinstellungen. Du kannst ihn hier für diese Rechnung anpassen.</InfoTooltip></label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded px-1.5 sm:px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={invoiceMeta.zahlungsfrist ?? ""} placeholder="14" onChange={(e) => setInvoiceMeta({ ...invoiceMeta, zahlungsfrist: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })} />
                  </div>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnose (medical indication) */}
            {!hvOnlyMode && indicationType === "medical" && (
              <div className="mb-6 pb-5 border-b border-gray-100">
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Diagnose (Therapeutische Indikation)</p>
                </div>
                <div className="relative">
                  <input
                    className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={diagnose}
                    placeholder="z. B. Bruxismus (F45.8)"
                    onChange={(e) => setDiagnose(e.target.value)}
                    autoComplete="off"
                  />
                  {(() => {
                    const q = diagnose.toLowerCase().trim();
                    if (!q || q.length < 2) return null;
                    const matches = ICD10_CODES.filter(c =>
                      c.diagnosis.toLowerCase().includes(q) ||
                      c.icd10.toLowerCase().includes(q) ||
                      c.keywords.some(k => k.includes(q))
                    ).slice(0, 5);
                    if (matches.length === 0) return null;
                    // Don't show if already exactly selected
                    if (matches.length === 1 && diagnose === `${matches[0].diagnosis} (${matches[0].icd10})`) return null;
                    return (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                        {matches.map((c) => (
                          <button
                            key={c.icd10}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 transition border-b border-gray-50 last:border-0"
                            onClick={() => setDiagnose(`${c.diagnosis} (${c.icd10})`)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.icd10}</span>
                              <span className="text-sm font-medium text-gray-800">{c.diagnosis}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  <svg className="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Wir empfehlen die Verwendung von ICD-10-Codes für eine reibungslose Erstattung bei der Privaten Krankenkasse.
                </p>
              </div>
            )}


            {/* Patient:in */}
            {!createForPatient && (
            <div className="mb-6 pb-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-4">Patient:in</p>
              {createForPatient ? null : (
                <>
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vorname *</label>
                  <input id="field-patientVorname" className={inputCls("patientVorname")} value={patient.vorname} placeholder="Max" onChange={(e) => { setPatient({ ...patient, vorname: e.target.value }); clearError("patientVorname"); }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nachname *</label>
                  <input id="field-patientNachname" className={inputCls("patientNachname")} value={patient.nachname} placeholder="Mustermann" onChange={(e) => { setPatient({ ...patient, nachname: e.target.value }); clearError("patientNachname"); }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail</label>
                <input id="field-patientEmail" type="email" className={inputCls("patientEmail")} value={patient.email} placeholder="max@beispiel.de" onChange={(e) => { setPatient({ ...patient, email: e.target.value }); clearError("patientEmail"); }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                <input type="tel" className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={patient.phone} placeholder="+49 123 456789" onChange={(e) => setPatient({ ...patient, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Straße & Hausnummer</label>
                <input id="field-patientAddress1" className={inputCls("patientAddress1")} value={patient.address1} placeholder="Musterstraße 5" onChange={(e) => { setPatient({ ...patient, address1: e.target.value }); clearError("patientAddress1"); }} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">PLZ</label>
                  <input id="field-patientAddress2" className={inputCls("patientAddress2")} value={parsePlzOrt(patient.address2).plz} placeholder="10117" maxLength={5} inputMode="numeric" onChange={(e) => { const v = e.target.value; const { ort } = parsePlzOrt(patient.address2); setPatient({ ...patient, address2: combinePlzOrt(v, ort) }); clearError("patientAddress2"); if (v.length === 5 && !ort && (!patient.country || patient.country === "Deutschland")) lookupPlz(v).then(city => { if (city) { setPatient(p => ({ ...p, address2: combinePlzOrt(v, parsePlzOrt(p.address2).ort || city) })); const ortEl = e.target.closest(".grid")?.querySelector("[data-ort-field]"); flashOrtField(ortEl); } }); }} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ort</label>
                  <input data-ort-field className={inputCls("patientAddress2")} value={parsePlzOrt(patient.address2).ort} placeholder="Berlin" onChange={(e) => { const { plz } = parsePlzOrt(patient.address2); setPatient({ ...patient, address2: combinePlzOrt(plz, e.target.value) }); clearError("patientAddress2"); }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Land</label>
                <select
                    className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                    value={patient.country}
                    onChange={(e) => setPatient({ ...patient, country: e.target.value })}
                  >
                    {PRIORITY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option disabled>────────────</option>
                    {OTHER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {patient.country !== "Deutschland" && (
                    <p className="text-xs text-gray-500 mt-1">Kein inländischer Wohnsitz: MwSt. entfällt.</p>
                  )}
              </div>
              </div>
                </>
              )}
            </div>
            )}

            {/* ─── GOÄ 3 toggle ─── */}
            {!hvOnlyMode && (
            <div className="mb-6 pb-5 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 flex-shrink-0 rounded border-gray-300 text-blue-500 focus:ring-blue-400" checked={useBeratungLang} onChange={(e) => setUseBeratungLang(e.target.checked)} />
                <span className="text-xs text-gray-600">Beratung &gt; 10 Min. <span className="text-gray-400">(GOÄ 3 statt GOÄ 1)</span></span>
              </label>
            </div>
            )}

            {/* Treatment inputs */}
            <div className="mb-6 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-1 mb-4">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Verwendetes Präparat</p>
                <InfoTooltip wide>
                  <div>
                    <strong>Hinweis nach GOÄ §10 (Auslagen):</strong> Es dürfen nur die tatsächlich entstandenen Kosten berechnet werden, nicht der aktuelle Marktpreis, sondern der Einkaufspreis. Rabatte und Boni müssen an Patient:innen weitergegeben werden; Pauschalen sind nicht erlaubt.{"\n\n"}Ab einem Betrag von 25,56 € ist ein Beleg (z.B. Einkaufsrechnung, Lieferschein) beizufügen. Belege mit mehreren Posten sind zulässig, sofern der Einzelpreis des verwendeten Materials klar hervorgeht.{"\n\n"}<strong>Tipp:</strong> Häufig verwendete Präparate kannst Du in den Praxis-Einstellungen speichern, um sie hier schnell auszuwählen.
                  </div>
                </InfoTooltip>
              </div>
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Präparatsname *</label>
                  <PraeparatAutocomplete
                    id="field-praeparat"
                    className={inputCls("praeparat")}
                    value={praeparat}
                    placeholder="z.B. Bocouture, Botox"
                    suggestions={(practice.praeparate || []).filter(p => p.name)}
                    onChange={(v) => { setPraeparat(v); clearError("praeparat"); }}
                    onSelect={(p) => {
                      setPraeparat(p.name); clearError("praeparat");
                      if (p.einheit) setEinheit(p.einheit);
                      if (p.preisStr) { setPreisProMlStr(p.preisStr); clearError("preisProMl"); }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Einheit</label>
                  <select className="w-full border border-gray-200 rounded px-1.5 sm:px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={einheit} onChange={(e) => setEinheit(e.target.value)}>
                    <option value="ml">ml</option>
                    <option value="SE">SE</option>
                    <option value="IE">IE</option>
                  </select>
                </div>
              </div>
              {/* ── Behandlungsdokumentation / Injektionsplanung (inside Präparat) ── */}
              <div>
                <TreatmentMap markers={treatmentMarkers} setMarkers={setTreatmentMarkers} einheit={einheit} facePhoto={treatmentFacePhoto} onFacePhotoChange={setTreatmentFacePhoto} planMode={hvOnlyMode} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{hvOnlyMode ? "Geplante Menge" : "Menge"} *</label>
                  <input id="field-ml" type="text" inputMode="decimal" className={inputCls("ml")} value={mlStr} placeholder="0,45" onChange={(e) => { const v = e.target.value.replace(/[^\d,.+*×x\- ]/g, ""); setMlStr(v); clearError("ml"); }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1"><span className="hidden sm:inline">Preis / </span><span className="sm:hidden">€ / </span>{einheit}<span className="hidden sm:inline"> (€)</span> *</label>
                  <input id="field-preisProMl" type="text" inputMode="decimal" className={inputCls("preisProMl")} value={preisProMlStr} placeholder="" onChange={(e) => { const v = e.target.value.replace(/[^\d,.+*×x\- ]/g, ""); setPreisProMlStr(v); clearError("preisProMl"); }} />
                </div>
              </div>
              </div>
            </div>

            {/* ── Sachkosten ── */}
            {!hvOnlyMode && (
            <div className="mb-6 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Weitere Sachkosten</p>
                <InfoTooltip wide>
                  <div style={{ whiteSpace: "pre-line" }}>{SACHKOSTEN_INFO}</div>
                </InfoTooltip>
              </div>
              {sachkosten.map((sk) => (
                <div key={sk.id} className="flex gap-3 items-center mt-2">
                  <input className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-gray-300 outline-none" placeholder="z.B. Kühlbeutel z. Mitnahme" value={sk.description} onChange={(e) => updateSachkosten(sk.id, "description", e.target.value)} />
                  <input className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm text-right focus:ring-2 focus:ring-gray-300 outline-none" placeholder="z.B. 4,50" value={sk.betragStr} onChange={(e) => updateSachkosten(sk.id, "betragStr", e.target.value)} />
                  <button className="text-gray-400 hover:text-red-500 transition" onClick={() => removeSachkosten(sk.id)} title="Entfernen">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <button className="flex items-center gap-1.5 mt-2 text-sm text-blue-500 hover:text-blue-700 font-medium transition py-1.5" onClick={addSachkosten}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Weitere Sachkosten hinzufügen
              </button>
            </div>
            )}



            {/* ─── Zuschläge ─── */}
            <div className="mb-6 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Zuschläge <span className="normal-case font-normal">(nach GOÄ Abschnitt B)</span></p>
                <InfoTooltip>
                  <div>
                    <strong>GOÄ-Zuschläge</strong> können für Leistungen außerhalb der regulären Sprechstundenzeit berechnet werden. Sie gelten für die Ziffern 1 und 5 und sind nicht steigerbar (Faktor 1,0).{"\n\n"}
                    <a href="https://abrechnungsstelle.com/goae-zuschlaege/" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>
                      Mehr Informationen zu GOÄ-Zuschlägen
                    </a>
                  </div>
                </InfoTooltip>
              </div>
              <div className="flex flex-wrap gap-2">
                {ZUSCHLAEGE.map((z) => {
                  const active = selectedZuschlaege.includes(z.code);
                  return (
                    <div key={z.code} className="flex items-center gap-0.5">
                      <button
                        className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                          active
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => toggleZuschlag(z.code)}
                      >
                        <span>{z.label}</span>
                        <span className="ml-1.5 text-gray-400">({fmt(calcGoaBetrag(z.punkte, 1.0))} €)</span>
                      </button>
                      <InfoTooltip>
                        <div>
                          <div className="font-semibold mb-1">Zuschlag {z.code} · {z.punkte} Punkte · Faktor 1,0</div>
                          <div>{z.info}</div>
                          <div className="mt-1 text-gray-400">Gilt für GOÄ {z.appliesTo.join(", ")}</div>
                        </div>
                      </InfoTooltip>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desired total amount */}
            <div className="mb-6 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-1 mb-4">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Gewünschter Gesamtbetrag</p>
                <InfoTooltip>
                  <div>
                    Gib den gewünschten <strong>Gesamtbetrag</strong> {noMwst ? "" : "(inkl. MwSt.) "}ein. Der Steigerungssatz der GOÄ 267 wird automatisch so berechnet, dass die Rechnung diesen Betrag erreicht.{"\n\n"}
                    Lass das Feld leer, um den Standard-Steigerungssatz (3,5-fach) zu verwenden.
                  </div>
                </InfoTooltip>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Gesamtbetrag (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={wunschGesamtStr}
                  placeholder={fmt(defaultGesamt).replace(".", ",")}
                  onChange={(e) => setWunschGesamtStr(e.target.value)}
                />
              </div>
              {hvBaseGesamt != null && hvExtraBrutto > 0 && (
                <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <p className="font-medium mb-1">Gesamtbetrag angepasst (+{fmt(hvExtraBrutto).replace(".", ",")} €)</p>
                  <p className="text-amber-600">
                    HV-Betrag: {fmt(hvBaseGesamt).replace(".", ",")} €
                    {Math.max(0, hvProductDelta) > 0 && <><br />+ Präparat-Mehrkosten: {fmt(Math.max(0, noMwst ? hvProductDelta : Math.round(hvProductDelta * 1.19 * 100) / 100)).replace(".", ",")} €{noMwst ? "" : " (brutto)"}</>}
                    {Math.max(0, hvSachkostenDelta) > 0 && <><br />+ Sachkosten: {fmt(Math.max(0, noMwst ? hvSachkostenDelta : Math.round(hvSachkostenDelta * 1.19 * 100) / 100)).replace(".", ",")} €{noMwst ? "" : " (brutto)"}</>}
                  </p>
                </div>
              )}
              {hvOnlyMode ? (
                wunschGesamt > 0 && (
                  effectiveMaxSteigerung > 3.5
                    ? <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        Steigerungssatz über 3,5-fach — Honorarvereinbarung ist erforderlich.
                      </div>
                    : <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                        Steigerungssatz unter 3,5-fach — keine Honorarvereinbarung nötig.
                      </div>
                )
              ) : (
                <>
                  {effectiveMaxSteigerung > 3.5 && fromHvId ? (
                    <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      Honorarvereinbarung ist verknüpft. Anforderungen gemäß §2 GOÄ sind erfüllt.
                    </div>
                  ) : effectiveMaxSteigerung > 3.5 ? (
                    <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                      Über 3,5-fach: Eine Honorarvereinbarung gemäß §2 GOÄ wird zusätzlich zur Rechnung erstellt und ein Verweis auf die Honorarvereinbarung wird auf der Rechnung vermerkt.
                    </div>
                  ) : null}
                  {needsBegruendung && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      Über 2,3-fach: Eine Begründung für den erhöhten Steigerungssatz ist erforderlich.
                    </div>
                  )}
                  {needsBegruendung && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 mb-1 block">Begründung gemäß §5 Abs. 2 GOÄ</label>
                      <textarea
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                        rows={2}
                        value={begruendung}
                        onChange={(e) => setBegruendung(e.target.value)}
                        placeholder="Überdurchschnittlicher Zeitaufwand und erhöhte Schwierigkeit aufgrund individueller anatomischer Gegebenheiten."
                      />
                    </div>
                  )}
                </>
              )}
              <button className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition" onClick={() => setShowVerdienst(true)}>
                {hvOnlyMode ? "Mein geplanter Verdienst zeigen" : "Mein Verdienst zeigen"}
              </button>
            </div>

            {/* Actions */}
            <div className="mt-8">
              {!hvOnlyMode && (
              <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                <input type="checkbox" className="w-4 h-4 flex-shrink-0 rounded border-gray-300 text-green-500 focus:ring-green-400" checked={markAsPaid} onChange={(e) => setMarkAsPaid(e.target.checked)} />
                <span className="text-xs text-gray-500">Als bezahlt markieren</span>
              </label>
              )}
              {!hvOnlyMode && treatmentMarkers.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer select-none mb-4">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border-gray-300 text-blue-500 focus:ring-blue-400" checked={attachTreatmentPdf} onChange={(e) => setAttachTreatmentPdf(e.target.checked)} />
                  <span className="text-xs text-gray-500">Behandlungsdokumentation ohne Notizen an Rechnung anhängen</span>
                </label>
              )}
              <div className="flex items-center justify-between">
                <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" onClick={() => { setAmendingId(null); setHvOnlyMode(false); setPage("list"); }}>
                  Abbrechen
                </button>
                <button
                  className={`px-6 py-2.5 text-sm rounded-lg font-medium transition flex items-center gap-2 ${isSaving ? "bg-gray-500 cursor-not-allowed" : "bg-gray-800 hover:bg-gray-700"} text-white`}
                  onClick={handleSubmit}
                  disabled={isSaving}
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isSaving ? "Wird gespeichert…" : (hvOnlyMode ? (amendingId ? "Änderung speichern" : "Dokument erstellen") : (amendingId ? "Änderung speichern" : (effectiveMaxSteigerung > 3.5 && !fromHvId) ? "Dokumente erstellen" : "Rechnung erstellen"))}
                </button>
              </div>
            </div>
          </div>
          {/* Right side: Live Preview (hidden on mobile) */}
          <div className="flex-1 min-w-0 sticky top-4 self-start hidden lg:block">
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{hvOnlyMode ? "Vorschau Honorarvereinbarung" : "Vorschau Rechnung"}</p>
              </div>
              <PreviewScaler>
                {hvOnlyMode ? (
                  <HonorarvereinbarungPreview
                    practice={practice}
                    patient={patient}
                    invoiceMeta={invoiceMeta}
                    lineItems={liveItems}
                    isStandalone
                  />
                ) : (
                  <InvoicePreview
                    practice={practice}
                    patient={patient}
                    invoiceMeta={{ ...invoiceMeta, diagnose: indicationType === "medical" ? diagnose : "" }}
                    lineItems={liveItems}
                    begruendung={needsBegruendung ? (begruendung || "Überdurchschnittlicher Zeitaufwand und erhöhte Schwierigkeit aufgrund individueller anatomischer Gegebenheiten.") : ""}
                    targetGesamt={wunschGesamt > 0 ? wunschGesamt : undefined}
                  />
                )}
              </PreviewScaler>
            </div>
          </div>
          </div>
          </>
        )}

        {/* ═══ MOBILE PREVIEW FAB (create page only) ═══ */}
        {page === "create" && (
          <button
            className="lg:hidden fixed bottom-6 right-5 z-40 bg-gray-800 text-white rounded-full shadow-lg flex items-center gap-1.5 pl-3 pr-3.5 py-2.5 text-xs font-medium hover:bg-gray-700 active:bg-gray-600 transition"
            onClick={() => setMobilePreviewOpen(true)}
            style={{ boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {hvOnlyMode ? "HV-Vorschau" : "Rechnungsvorschau"}
          </button>
        )}

        {/* ═══ MOBILE PREVIEW MODAL ═══ */}
        {mobilePreviewOpen && (
          <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col" style={{ overscrollBehavior: "contain" }}>
            {/* Sticky close button bar */}
            <div className="flex-shrink-0 flex justify-end px-3 py-2 bg-white border-b border-gray-100" style={{ zIndex: 60 }}>
              <button
                className="bg-gray-800 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg active:bg-gray-600 transition"
                onClick={() => setMobilePreviewOpen(false)}
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,.3)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Scrollable + zoomable preview area */}
            <div className="flex-1 overflow-auto pb-6 px-2" style={{ WebkitOverflowScrolling: "touch" }}>
              <MobileScaledPreview a4Width={794} className="w-full">
                {hvOnlyMode ? (
                  <HonorarvereinbarungPreview
                    practice={practice}
                    patient={patient}
                    invoiceMeta={invoiceMeta}
                    lineItems={liveItems}
                    isStandalone
                  />
                ) : (
                  <InvoicePreview
                    practice={practice}
                    patient={patient}
                    invoiceMeta={{ ...invoiceMeta, diagnose: indicationType === "medical" ? diagnose : "" }}
                    lineItems={liveItems}
                    begruendung={needsBegruendung ? (begruendung || "Überdurchschnittlicher Zeitaufwand und erhöhte Schwierigkeit aufgrund individueller anatomischer Gegebenheiten.") : ""}
                    targetGesamt={wunschGesamt > 0 ? wunschGesamt : undefined}
                  />
                )}
              </MobileScaledPreview>
            </div>
          </div>
        )}

        {/* ═══ LIST PAGE ═══ */}
        {page === "list" && (
          <InvoiceListView
            invoices={invoices}
            kleinunternehmer={practice.kleinunternehmer}
            onView={handleView}
            onViewHV={handleViewHV}
            onViewTD={handleViewTD}
            onDelete={handleDelete}
            onPrint={handlePrintInvoice}
            onPrintHV={handlePrintHV}
            onPrintTD={handlePrintTD}
            onDownload={handleDownloadInvoice}
            onDownloadHV={handleDownloadHV}
            onDownloadTD={handleDownloadTD}
            onDownloadConsent={(inv) => {
              setViewingInvoice(inv);
              setPreviewTab("consent");
              setPage("preview");
              setTimeout(async () => {
                const tpl = CONSENT_TEMPLATES.find(t => t.id === inv.consentData?.templateId);
                const templateName = tpl ? tpl.title.replace("Aufklärungsbogen — ", "").replace(/\s+/g, "_") : "Aufklaerung";
                const patName = [inv.patient?.vorname, inv.patient?.nachname].filter(Boolean).join("_") || "Patient";
                const filename = `Aufklaerung_${templateName}_${patName}_${inv.invoiceMeta.datum}.pdf`;
                const result = await generateMultiPagePDF("consent-form-pdf-target");
                if (result) {
                  const blob = result.pdf.output("blob");
                  const file = new File([blob], filename, { type: "application/pdf" });
                  const isMobile = window.innerWidth < 640;
                  if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try { await navigator.share({ files: [file], title: filename }); } catch (e) { if (e.name !== "AbortError") result.pdf.save(filename); }
                  } else { result.pdf.save(filename); }
                }
                setPage("invoices");
                setViewingInvoice(null);
              }, 500);
            }}
            onBack={() => setPage("patients")}
            patients={patients}
            onNewForPatient={handleNewForPatient}
            onNewHVForPatient={handleNewHVForPatient}
            onNewConsentForPatient={(p) => {
              const patientData = p.data || p._raw?.data || p;
              const patientObj = { ...patientData, id: p.id, _raw: p._raw || p };
              setConsentWarningPatient(patientObj);
            }}
            onUpdateInvoice={async (updated) => {
              setInvoices(invoices.map(inv => inv.id === updated.id ? updated : inv));
              if (session && updated._supabaseId) {
                try {
                  await e2eeFetchModifySave(session.access_token, updated._supabaseId, { paymentStatus: updated.paymentStatus });
                } catch (e) { console.error("Failed to persist status:", e); }
              }
            }}
          />
        )}

        {/* ═══ WELCOME / ONBOARDING SCREEN ═══ */}
        {page === "patients" && patients.length === 0 && dataLoaded && !showSettings && (
          <div className="max-w-lg mx-auto mt-12 sm:mt-20 px-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-8 text-center">
                <div className="text-3xl mb-3">👋</div>
                <h1 className="text-xl font-semibold text-gray-800 mb-2">Willkommen bei EPHIA!</h1>
                <p className="text-sm text-gray-500 mb-1">Schön, dass Du da bist.</p>
                <p className="text-sm text-gray-500 mb-6">Um loszulegen, lege bitte Deine:n erste:n Patient:in an. Alles in EPHIA — Rechnungen, Honorarvereinbarungen und Behandlungen — wird auf der Patient:innenebene erstellt.</p>
                <p className="text-xs text-gray-400 mb-6 italic">Tipp: Du kannst auch mit erfundenen Daten starten, um das System kennenzulernen. Der Eintrag lässt sich jederzeit wieder löschen.</p>
              </div>
              <div className="border-t border-gray-100 px-6 py-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">Erste:n Patient:in anlegen
                  <span className="relative group">
                    <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 rounded-lg bg-gray-800 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 leading-relaxed shadow-lg">Alle Patient:innendaten werden Ende-zu-Ende-verschlüsselt (AES-256-GCM) — die Verschlüsselung erfolgt direkt in Deinem Browser, bevor die Daten unseren Server erreichen. EPHIA hat zu keinem Zeitpunkt Zugriff auf die Klartextdaten. Damit erfüllen wir die Anforderungen der DSGVO an den Schutz personenbezogener Gesundheitsdaten (Art. 9, 32 DSGVO).</span>
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Vorname *</label>
                    <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.vorname} placeholder="Maria" onChange={(e) => setNewPatientData({ ...newPatientData, vorname: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Nachname *</label>
                    <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.nachname} placeholder="Müller" onChange={(e) => setNewPatientData({ ...newPatientData, nachname: e.target.value })} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">E-Mail</label>
                  <input type="email" className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.email} placeholder="maria.mueller@beispiel.de" onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Telefon</label>
                  <input type="tel" className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.phone} placeholder="+49 123 456789" onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Straße & Hausnummer</label>
                  <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.address1} placeholder="Musterstraße 5" onChange={(e) => setNewPatientData({ ...newPatientData, address1: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">PLZ</label>
                    <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={parsePlzOrt(newPatientData.address2).plz} placeholder="10117" maxLength={5} inputMode="numeric" onChange={(e) => { const v = e.target.value; const { ort } = parsePlzOrt(newPatientData.address2); setNewPatientData({ ...newPatientData, address2: combinePlzOrt(v, ort) }); if (v.length === 5 && !ort && (!newPatientData.country || newPatientData.country === "Deutschland")) lookupPlz(v).then(city => { if (city) { setNewPatientData(d => ({ ...d, address2: combinePlzOrt(v, parsePlzOrt(d.address2).ort || city) })); const ortEl = e.target.closest(".grid")?.querySelector("[data-ort-field]"); flashOrtField(ortEl); } }); }} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Ort</label>
                    <input data-ort-field className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={parsePlzOrt(newPatientData.address2).ort} placeholder="Berlin" onChange={(e) => { const { plz } = parsePlzOrt(newPatientData.address2); setNewPatientData({ ...newPatientData, address2: combinePlzOrt(plz, e.target.value) }); }} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Land</label>
                  <select className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={newPatientData.country} onChange={(e) => setNewPatientData({ ...newPatientData, country: e.target.value })}>
                    {PRIORITY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option disabled>────────────</option>
                    {OTHER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button
                  className="w-full px-4 py-2.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  disabled={!newPatientData.vorname.trim() || !newPatientData.nachname.trim()}
                  onClick={async () => {
                    try {
                      if (session && currentMEK) {
                        const patientHash = await computePatientHash(getPatientIdentifier(newPatientData), currentMEK);
                        const { ciphertext: ptCipher, iv: ptIv } = await encryptData(newPatientData, currentMEK);
                        await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
                          body: JSON.stringify({ user_id: user.id, email: patientHash, patient_hash: patientHash, data: ptCipher, iv: ptIv, encryption_version: 1 }),
                        });
                        trackEvent("patient_created", { source: "welcome" }, session.access_token);
                        const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
                        const decryptedPatients = [];
                        for (const rec of patientRecords) {
                          let pd = rec.data;
                          if (rec.encryption_version === 1 && rec.iv && currentMEK) {
                            try { pd = await decryptData(rec.data, rec.iv, currentMEK); } catch (e) { continue; }
                          }
                          decryptedPatients.push({ ...rec, data: pd });
                        }
                        setPatients(decryptedPatients);
                      } else if (session) {
                        await supabaseUpsertPatient(session.access_token, user.id, newPatientData);
                        const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
                        setPatients(patientRecords.map((r) => ({ ...r, data: r.data || {} })));
                      }
                    } catch (e) { console.error("Error creating patient:", e); }
                    setNewPatientData({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
                    window.scrollTo(0, 0);
                  }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Patient:in verschlüsselt anlegen & loslegen
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PATIENTS PAGE ═══ */}
        {page === "patients" && patients.length > 0 && !showAddPatient && (
          <PatientListView
            patients={patients}
            invoices={invoices}
            kleinunternehmer={practice.kleinunternehmer}
            onSelectPatient={(p) => { setSelectedPatient(p); setPage("patientDetail"); }}
            onDeletePatient={(p) => setConfirmDeletePatient(p)}
            onAddPatient={() => setShowAddPatient(true)}
            onBack={() => setPage("patients")}
          />
        )}

        {page === "patients" && patients.length > 0 && showAddPatient && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <button className="text-xs text-gray-400 hover:text-gray-600 mb-2" onClick={() => { setShowAddPatient(false); setNewPatientData({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" }); }}>← Zurück zur Patient:innenliste</button>
              <h2 className="text-base font-semibold text-gray-800">Neue:n Patient:in anlegen</h2>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Vorname *</label>
                  <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.vorname} placeholder="Maria" onChange={(e) => setNewPatientData({ ...newPatientData, vorname: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Nachname *</label>
                  <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.nachname} placeholder="Müller" onChange={(e) => setNewPatientData({ ...newPatientData, nachname: e.target.value })} />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-0.5">E-Mail</label>
                <input type="email" className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.email} placeholder="maria.mueller@beispiel.de" onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Telefon</label>
                <input type="tel" className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.phone} placeholder="+49 123 456789" onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Straße & Hausnummer</label>
                <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={newPatientData.address1} placeholder="Musterstraße 5" onChange={(e) => setNewPatientData({ ...newPatientData, address1: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">PLZ</label>
                  <input className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={parsePlzOrt(newPatientData.address2).plz} placeholder="10117" maxLength={5} inputMode="numeric" onChange={(e) => { const v = e.target.value; const { ort } = parsePlzOrt(newPatientData.address2); setNewPatientData({ ...newPatientData, address2: combinePlzOrt(v, ort) }); if (v.length === 5 && !ort && (!newPatientData.country || newPatientData.country === "Deutschland")) lookupPlz(v).then(city => { if (city) { setNewPatientData(d => ({ ...d, address2: combinePlzOrt(v, parsePlzOrt(d.address2).ort || city) })); const ortEl = e.target.closest(".grid")?.querySelector("[data-ort-field]"); flashOrtField(ortEl); } }); }} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Ort</label>
                  <input data-ort-field className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" value={parsePlzOrt(newPatientData.address2).ort} placeholder="Berlin" onChange={(e) => { const { plz } = parsePlzOrt(newPatientData.address2); setNewPatientData({ ...newPatientData, address2: combinePlzOrt(plz, e.target.value) }); }} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Land</label>
                <select className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={newPatientData.country} onChange={(e) => setNewPatientData({ ...newPatientData, country: e.target.value })}>
                  {PRIORITY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option disabled>────────────</option>
                  {OTHER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newPatientData.vorname.trim() || !newPatientData.nachname.trim()}
                onClick={async () => {
                  try {
                    if (session && currentMEK) {
                      const patientHash = await computePatientHash(getPatientIdentifier(newPatientData), currentMEK);
                      const { ciphertext: ptCipher, iv: ptIv } = await encryptData(newPatientData, currentMEK);
                      await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
                        body: JSON.stringify({ user_id: user.id, email: patientHash, patient_hash: patientHash, data: ptCipher, iv: ptIv, encryption_version: 1 }),
                      });
                      trackEvent("patient_created", { source: "patient_list" }, session.access_token);
                      const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
                      const decryptedPatients = [];
                      for (const rec of patientRecords) {
                        let pd = rec.data;
                        if (rec.encryption_version === 1 && rec.iv && currentMEK) {
                          try { pd = await decryptData(rec.data, rec.iv, currentMEK); } catch (e) { continue; }
                        }
                        decryptedPatients.push({ ...rec, data: pd });
                      }
                      setPatients(decryptedPatients);
                    } else if (session) {
                      await supabaseUpsertPatient(session.access_token, user.id, newPatientData);
                      const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
                      setPatients(patientRecords.map((r) => ({ ...r, data: r.data || {} })));
                    }
                  } catch (e) { console.error("Error creating patient:", e); }
                  setShowAddPatient(false);
                  setNewPatientData({ vorname: "", nachname: "", email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
                }}
              >
                Patient:in anlegen
              </button>
              <span className="relative group inline-flex ml-2">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 rounded-lg bg-gray-800 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 leading-relaxed shadow-lg">Alle Patient:innendaten werden Ende-zu-Ende-verschlüsselt (AES-256-GCM) — die Verschlüsselung erfolgt direkt in Deinem Browser, bevor die Daten unseren Server erreichen. EPHIA hat zu keinem Zeitpunkt Zugriff auf die Klartextdaten. Damit erfüllen wir die Anforderungen der DSGVO an den Schutz personenbezogener Gesundheitsdaten (Art. 9, 32 DSGVO).</span>
              </span>
            </div>
          </div>
        )}

        {/* ═══ PATIENT DETAIL PAGE ═══ */}
        {page === "patientDetail" && selectedPatient && (
          <PatientDetailView
            patient={selectedPatient}
            invoices={invoices}
            kleinunternehmer={practice.kleinunternehmer}
            practice={practice}
            onBack={() => setPage("patients")}
            onView={(inv) => { setViewingInvoice(inv); setPreviewTab("rechnung"); setPage("preview"); }}
            onViewHV={(inv) => { setViewingInvoice(inv); setPreviewTab("honorar"); setPage("preview"); }}
            onDownload={handleDownloadInvoice}
            onDownloadHV={handleDownloadHV}
            onCreateInvoice={(p) => handleNewForPatient(p)}
            onNewHV={() => handleNewHVForPatient(selectedPatient)}
            onStartConsent={(p) => {
              setConsentWarningPatient(p);
            }}
            onViewConsent={(inv) => { setViewingInvoice(inv); setPreviewTab("consent"); setPage("preview"); }}
            onDownloadConsent={(inv) => {
              const prevPage = page;
              setViewingInvoice(inv);
              setPreviewTab("consent");
              setPage("preview");
              setTimeout(async () => {
                const tpl = CONSENT_TEMPLATES.find(t => t.id === inv.consentData?.templateId);
                const templateName = tpl ? tpl.title.replace("Aufklärungsbogen — ", "").replace(/\s+/g, "_") : "Aufklaerung";
                const patName = [inv.patient?.vorname, inv.patient?.nachname].filter(Boolean).join("_") || "Patient";
                const filename = `Aufklaerung_${templateName}_${patName}_${inv.invoiceMeta.datum}.pdf`;
                const result = await generateMultiPagePDF("consent-form-pdf-target");
                if (result) {
                  const blob = result.pdf.output("blob");
                  const file = new File([blob], filename, { type: "application/pdf" });
                  const isMobile = window.innerWidth < 640;
                  if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try { await navigator.share({ files: [file], title: filename }); } catch (e) { if (e.name !== "AbortError") result.pdf.save(filename); }
                  } else { result.pdf.save(filename); }
                }
                setPage(prevPage);
              }, 500);
            }}
            onPrint={(inv) => { setViewingInvoice(inv); setPreviewTab("rechnung"); setPage("preview"); setTimeout(() => printElement("invoice-preview", `Rechnung ${inv.invoiceMeta.nummer}`), 100); }}
            onPrintHV={handlePrintHV}
            onDelete={(id) => setConfirmDeleteId(id)}
            onUpdateInvoice={async (updated, isNew) => {
              if (updated._deleted) {
                // Delete from Supabase if persisted
                if (session && updated._supabaseId) {
                  try { await supabaseDeleteInvoice(session.access_token, updated._supabaseId); }
                  catch (e) { console.error("Failed to delete treatment from Supabase:", e); }
                }
                setInvoices(invoices.filter(inv => inv.id !== updated.id));
              }
              else if (isNew) {
                // Persist new standalone treatment to Supabase (E2EE)
                if (session) {
                  try {
                    let serverData = updated, serverIv = null, serverEncVer = null;
                    if (currentMEK) {
                      const enc = await encryptData(updated, currentMEK);
                      serverData = enc.ciphertext; serverIv = enc.iv; serverEncVer = 2;
                    }
                    const created = await supabaseCreateInvoice(session.access_token, user.id, serverData, serverIv, serverEncVer);
                    updated._supabaseId = created.id;
                    updated._createdAt = created.created_at || new Date().toISOString();
                  } catch (e) { console.error("Failed to persist standalone treatment:", e); }
                }
                setInvoices([updated, ...invoices]);
              }
              else {
                setInvoices(invoices.map(inv => inv.id === updated.id ? updated : inv));
                if (session && updated._supabaseId) {
                  try {
                    await e2eeFetchModifySave(session.access_token, updated._supabaseId, { paymentStatus: updated.paymentStatus });
                  } catch (e) { console.error("Failed to persist:", e); }
                }
              }
            }}
            onQuickInvoice={async ({ treatment, nummer, wunschGesamt, customS, lineItems, gesamt, hasHV, praeparat: qPraep, einheit: qEinh, ml: qMl, preisProMl: qPpm, attachTreatmentPdf: qAttachTreatment }) => {
              try {
                // Resolve decrypted patient data: _raw.data (from edit flows) > .data (from list) > top-level fields
                const rawData = selectedPatient._raw?.data;
                const pd = (typeof rawData === "object" && rawData) || (typeof selectedPatient.data === "object" && selectedPatient.data) || { vorname: selectedPatient.vorname || "", nachname: selectedPatient.nachname || "", email: selectedPatient.email || "" };
                const patientDbId = selectedPatient._raw?.id || selectedPatient?.id || null;
                const isAusland = (pd.country || "Deutschland") !== "Deutschland";

                const entry = {
                  id: Date.now(),
                  patient: { vorname: pd.vorname || "", nachname: pd.nachname || "", email: pd.email || "", phone: pd.phone || "", address1: pd.address1 || "", address2: pd.address2 || "", country: pd.country || "Deutschland" },
                  _patientDbId: patientDbId,
                  invoiceMeta: { nummer, ort: practice.city || "", datum: treatment.treatmentDoc?.behandlungsDatum || new Date().toISOString().slice(0, 10) },
                  lineItems,
                  hasHV,
                  praeparat: qPraep,
                  einheit: qEinh,
                  ml: qMl,
                  mlStr: String(qMl).replace(".", ","),
                  preisProMl: qPpm,
                  preisProMlStr: String(qPpm).replace(".", ","),
                  wunschGesamtStr: String(wunschGesamt).replace(".", ","),
                  selectedZuschlaege: [],
                  sachkosten: [],
                  treatmentDoc: treatment.treatmentDoc || null,
                  attachTreatmentPdf: !!qAttachTreatment,
                  begruendung: (customS && (customS.s1 > 2.3 || customS.s5 > 2.3 || customS.s267 > 2.3) && Math.max(customS.s1, customS.s5, customS.s267) <= 3.5) ? "Überdurchschnittlicher Zeitaufwand und erhöhte Schwierigkeit aufgrund individueller anatomischer Gegebenheiten." : "",
                  paymentStatus: "ausstehend",
                  _kleinunternehmer: !!practice.kleinunternehmer,
                  _practice: { ...practice, logo: practice.logo || "" },
                  savedAt: new Date().toISOString(),
                };

                // Persist to Supabase (E2EE)
                if (session) {
                  let serverData = entry, serverIv = null, serverEncVer = null;
                  if (currentMEK) {
                    const enc = await encryptData(entry, currentMEK);
                    serverData = enc.ciphertext; serverIv = enc.iv; serverEncVer = 2;
                  }
                  const created = await supabaseCreateInvoice(session.access_token, user.id, serverData, serverIv, serverEncVer);
                  entry._supabaseId = created.id;
                  entry._createdAt = created.created_at || new Date().toISOString();
                }

                setInvoices([entry, ...invoices]);

                // Link the treatment to the new invoice by updating it
                const updatedTreatment = { ...treatment, invoiceMeta: { ...treatment.invoiceMeta, nummer } };
                if (treatment._supabaseId && session) {
                  try {
                    await e2eeFetchModifySave(session.access_token, treatment._supabaseId, (stored) => ({ ...stored, invoiceMeta: { ...stored.invoiceMeta, nummer } }));
                  } catch (e) { console.error("Failed to link treatment:", e); }
                }
                setInvoices(prev => prev.map(inv => inv.id === treatment.id ? updatedTreatment : inv));

                // Show the new invoice
                setViewingInvoice(entry);
                setPreviewTab("rechnung");
                setPage("preview");
              } catch (err) {
                console.error("Quick invoice error:", err);
                alert("Fehler beim Erstellen der Rechnung: " + err.message);
              }
            }}
            onUpdatePatient={async (updatedData) => {
              try {
                const raw = selectedPatient._raw;
                if (session && currentMEK && raw) {
                  const newPatientHash = await computePatientHash(getPatientIdentifier(updatedData), currentMEK);
                  const { ciphertext, iv } = await encryptData(updatedData, currentMEK);
                  await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${raw.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Prefer": "return=representation" },
                    body: JSON.stringify({ data: ciphertext, iv, patient_hash: newPatientHash, encryption_version: 1 }),
                  });
                  // Reload patients
                  const patientRecords = await supabaseFetchPatients(session.access_token, user.id);
                  const decryptedPatients = [];
                  for (const rec of patientRecords) {
                    let pd = rec.data;
                    if (rec.encryption_version === 1 && rec.iv && currentMEK) {
                      try { pd = await decryptData(rec.data, rec.iv, currentMEK); } catch (e) { continue; }
                    }
                    decryptedPatients.push({ ...rec, data: pd });
                  }
                  setPatients(decryptedPatients);
                  // Update selectedPatient to reflect changes
                  const updated = decryptedPatients.find(p => p.id === raw.id);
                  const ud = (typeof updated?.data === "object" && updated?.data) || {};
                  if (updated) setSelectedPatient({ vorname: ud.vorname || "", nachname: ud.nachname || "", email: ud.email || "", _raw: updated });
                }
              } catch (e) { console.error("Error updating patient:", e); }
            }}
          />
        )}

        {/* ═══ CONSENT FORM PREVIEW ═══ */}
        {page === "preview" && viewingInvoice && viewingInvoice._consentForm && (() => {
          const cd = viewingInvoice.consentData || {};
          const tpl = CONSENT_TEMPLATES.find(t => t.id === cd.templateId) || CONSENT_TEMPLATES[0];
          const viewPractice = viewingInvoice._practice || practice;
          const needsDoctorSig = !cd.refused && cd._signatures?.patient && !cd._signatures?.doctor;
          const isComplete = cd._signatures?.patient && cd._signatures?.doctor;
          const handleConsentDoctorSign = () => {
            setShowConsentDoctorSign(true);
          };
          const handleConsentDoctorSignComplete = async (doctorSigDataUrl) => {
            setShowConsentDoctorSign(false);
            if (!doctorSigDataUrl) return;
            const merged = { ...(cd._signatures || {}), doctor: doctorSigDataUrl };
            const updatedCd = { ...cd, _signatures: merged };
            // Generate PDF hash now that both signatures are present
            try {
              const tempInv = { ...viewingInvoice, consentData: updatedCd };
              setViewingInvoice(tempInv);
              setInvoices(prev => prev.map(inv => inv.id === tempInv.id ? tempInv : inv));
              await new Promise(r => setTimeout(r, 400));
              const result = await generateMultiPagePDF("consent-form-pdf-target");
              if (result) {
                const pdfArrayBuffer = result.pdf.output("arraybuffer");
                const hashBuffer = await crypto.subtle.digest("SHA-256", pdfArrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                updatedCd.pdfHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
              }
            } catch (e) { console.error("PDF hash error:", e); }
            await updateViewingInvoiceData({ consentData: updatedCd });
            setSaveToast("Arzt Unterschrift gespeichert");
            setTimeout(() => setSaveToast(""), 2500);
          };
          return (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 mx-auto" style={{ maxWidth: "210mm" }}>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-gray-700">Aufklärungsbogen</h2>
                {cd.refused
                  ? <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">Abgelehnt</span>
                  : isComplete
                  ? <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Vollständig</span>
                  : needsDoctorSig
                  ? <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Ärzt:in fehlt</span>
                  : <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">Entwurf</span>
                }
              </div>
              <div className="flex gap-1.5 ml-auto">
                <button className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition sm:hidden" title="Teilen" onClick={async () => {
                  const patName = [viewingInvoice.patient?.vorname, viewingInvoice.patient?.nachname].filter(Boolean).join("_") || "Patient";
                  const templateName = tpl.title.replace("Aufklärungsbogen — ", "").replace(/\s+/g, "_");
                  const filename = `Aufklaerung_${templateName}_${patName}_${viewingInvoice.invoiceMeta.datum}.pdf`;
                  try {
                    const result = await generateMultiPagePDF("consent-form-pdf-target");
                    if (result) {
                      const blob = result.pdf.output("blob");
                      const file = new File([blob], filename, { type: "application/pdf" });
                      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: filename });
                      } else { result.pdf.save(filename); }
                    }
                  } catch (e) { if (e.name !== "AbortError") console.error("Share failed:", e); }
                }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                <button className="p-2 rounded-lg border border-gray-200 text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" title="PDF herunterladen" onClick={async () => {
                  const patName = [viewingInvoice.patient?.vorname, viewingInvoice.patient?.nachname].filter(Boolean).join("_") || "Patient";
                  const templateName = tpl.title.replace("Aufklärungsbogen — ", "").replace(/\s+/g, "_");
                  const filename = `Aufklaerung_${templateName}_${patName}_${viewingInvoice.invoiceMeta.datum}.pdf`;
                  const result = await generateMultiPagePDF("consent-form-pdf-target");
                  if (result) { result.pdf.save(filename); }
                }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                </button>
                <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition" onClick={() => { setViewingInvoice(null); setPage("patientDetail"); }} title="Zurück">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* A4 Preview: desktop shows full size, mobile uses scaled preview */}
            <div className="hidden lg:block mx-auto space-y-4" style={{ maxWidth: "210mm" }}>
              <ConsentFormPreview template={tpl} consentData={cd} patient={viewingInvoice.patient} practice={viewPractice} onDoctorSign={needsDoctorSig ? handleConsentDoctorSign : undefined} />
            </div>
            <MobileScaledPreview className="lg:hidden" a4Width={794}>
              <ConsentFormPreview template={tpl} consentData={cd} patient={viewingInvoice.patient} practice={viewPractice} onDoctorSign={needsDoctorSig ? handleConsentDoctorSign : undefined} />
            </MobileScaledPreview>
            {/* Hidden render target for PDF */}
            <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
              <ConsentFormPreview template={tpl} consentData={cd} patient={viewingInvoice.patient} practice={viewPractice} />
            </div>
            {/* Doctor signature modal for consent */}
            {showConsentDoctorSign && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowConsentDoctorSign(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">Unterschrift Ärzt:in</h3>
                    <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => setShowConsentDoctorSign(false)}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <SignaturePad key="consent-doctor-sig" label="Unterschrift Ärzt:in" onSave={handleConsentDoctorSignComplete} />
                  <button className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition py-1" onClick={() => setShowConsentDoctorSign(false)}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ═══ PREVIEW PAGE ═══ */}
        {page === "preview" && viewingInvoice && !viewingInvoice._consentForm && (() => {
          const isHvOnly = !!viewingInvoice._hvOnly;
          const isStandaloneTD = !!viewingInvoice._standalone;
          const linkedHV = viewingInvoice._fromHvId ? invoices.find((inv) => inv.id === viewingInvoice._fromHvId) : null;
          const viewHasHV = isHvOnly || (!isStandaloneTD && (linkedHV || (viewingInvoice.hasHV != null ? viewingInvoice.hasHV : (viewingInvoice.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5))));
          const viewHasTD = !isHvOnly && !!(viewingInvoice.treatmentDoc && (viewingInvoice.treatmentDoc.markers?.length > 0 || viewingInvoice.treatmentDoc.amount));
          const hasTabs = !isHvOnly && !isStandaloneTD && (viewHasHV || viewHasTD);
          const previewFacePhoto = viewingInvoice.treatmentDoc?.facePhoto || "";
          const a4Px = 793; // 210mm in px
          // Use practice settings from when document was created (fall back to current for older docs)
          const viewPractice = viewingInvoice._practice || practice;
          // Check for signed HV upload (on the HV itself, or on the linked HV)
          const hvSource = linkedHV || viewingInvoice;
          const signedHvUpload = hvSource._signedHvUpload || null;
          return (
          <div>
            {/* Toolbar - aligned with document */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 mx-auto" style={{ maxWidth: "210mm" }}>
              {/* Tab toggle */}
              {hasTabs ? (
                <div className="flex gap-1">
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs rounded-lg border transition ${previewTab === "rechnung" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                    onClick={() => setPreviewTab("rechnung")}
                  >
                    {/* Invoice icon on mobile */}
                    <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="hidden sm:inline">Rechnung</span>
                  </button>
                  {viewHasHV && (
                    <button
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs rounded-lg border transition ${previewTab === "honorar" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                      onClick={() => setPreviewTab("honorar")}
                    >
                      {/* Handshake/contract icon on mobile */}
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      <span className="hidden sm:inline">Honorarvereinbarung</span>
                    </button>
                  )}
                  {viewHasTD && (
                    <button
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs rounded-lg border transition ${previewTab === "behandlung" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                      onClick={() => setPreviewTab("behandlung")}
                    >
                      {/* Face icon on mobile */}
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="hidden sm:inline">Behandlungsdokumentation</span>
                    </button>
                  )}
                </div>
              ) : <div />}
              {/* HV status badge */}
              {(previewTab === "honorar" || isHvOnly) && (() => {
                const hvSigs = (linkedHV || viewingInvoice)?._signatures;
                const hvSignedUpload = (linkedHV || viewingInvoice)?._signedHvUpload;
                if (hvSignedUpload) return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Unterschrieben</span>;
                if (hvSigs?.patient && hvSigs?.doctor) return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">Vollständig</span>;
                if (hvSigs?.patient && !hvSigs?.doctor) return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Ärzt:in fehlt</span>;
                return null;
              })()}
              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button className="p-2 rounded-lg border border-gray-200 text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition" onClick={() => handleAmend(viewingInvoice, previewTab)} title="Ändern">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                {/* Sign button — shown on HV tab */}
                {(previewTab === "honorar" || isHvOnly) && (
                  <button className="p-2 rounded-lg border border-gray-200 text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition" onClick={() => setShowSignatureModal(true)} title="Unterschreiben">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18" /></svg>
                  </button>
                )}
                {/* Upload signed HV — shown on HV tab */}
                {(previewTab === "honorar" || isHvOnly) && (
                  <button className="p-2 rounded-lg border border-gray-200 text-green-600 hover:border-green-200 hover:bg-green-50 transition" onClick={() => hvUploadRef.current?.click()} title="Unterschriebene HV hochladen">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </button>
                )}
                <button className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition" onClick={handlePrintCurrentDoc} title="Drucken">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                {/* Share on mobile, Download on desktop */}
                <button className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition sm:hidden" onClick={handleShareCurrent} title="Teilen">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                <button className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition hidden sm:block" onClick={handleDownloadCurrent} title="PDF herunterladen">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              </div>
            </div>
            {previewTab === "honorar" && viewHasHV && !isHvOnly && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 sm:px-4 py-2.5 text-xs text-amber-800 mb-3 mx-auto" style={{ maxWidth: "210mm" }}>
                {linkedHV
                  ? <><strong>Verknüpfte Honorarvereinbarung:</strong> Diese HV wurde vor der Rechnung erstellt und ist mit dieser Rechnung verknüpft.</>
                  : <><strong>Hinweis:</strong> Die Honorarvereinbarung enthält ausschließlich die ärztlichen Leistungen (GOÄ-Ziffern). Sachkosten und Präparatskosten werden in der Rechnung gesondert ausgewiesen.</>
                }
              </div>
            )}
            {/* Single document render — desktop shows full size, mobile scales it down */}
            <div className="hidden lg:flex flex-col items-center gap-6">
              <div className="shadow-lg border border-gray-200" style={{ width: "210mm" }}>
                {(previewTab === "behandlung" || isStandaloneTD) ? (
                  <TreatmentDocPreview
                    practice={viewPractice}
                    patient={viewingInvoice.patient}
                    treatmentDoc={viewingInvoice.treatmentDoc}
                    einheit={viewingInvoice.einheit || viewingInvoice.treatmentDoc?.einheit || "SE"}
                    facePhoto={previewFacePhoto}
                  />
                ) : previewTab === "honorar" && viewHasHV ? (
                  signedHvUpload ? (
                    signedHvUpload.type === "image" ? (
                      <div style={{ width: "210mm", minHeight: "297mm", background: "white", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px" }}>
                        <img src={signedHvUpload.data} alt="Unterschriebene HV" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                      </div>
                    ) : (
                      <div style={{ width: "210mm", minHeight: "200px", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", gap: "16px" }}>
                        <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-sm font-medium text-gray-700">{signedHvUpload.filename || "Unterschriebene HV"}</p>
                        <p className="text-xs text-green-600 font-medium">PDF hochgeladen</p>
                        <a href={signedHvUpload.data} download={signedHvUpload.filename || "Honorarvereinbarung_signed.pdf"} className="px-4 py-2 text-xs rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition">
                          PDF herunterladen
                        </a>
                      </div>
                    )
                  ) : (
                    <HonorarvereinbarungPreview practice={viewPractice} patient={(linkedHV || viewingInvoice).patient} invoiceMeta={(linkedHV || viewingInvoice).invoiceMeta} lineItems={(linkedHV || viewingInvoice).lineItems} isStandalone={!!(linkedHV ? linkedHV._hvOnly : viewingInvoice._hvOnly)} signatures={(linkedHV || viewingInvoice)._signatures} onSignatureClick={() => setShowSignatureModal(true)} onDoctorSign={(linkedHV || viewingInvoice)._signatures?.patient && !(linkedHV || viewingInvoice)._signatures?.doctor ? () => setShowHvDoctorSign(true) : undefined} />
                  )
                ) : (
                  <InvoicePreview practice={viewPractice} patient={viewingInvoice.patient} invoiceMeta={viewingInvoice.invoiceMeta} lineItems={viewingInvoice.lineItems} begruendung={viewingInvoice.begruendung} targetGesamt={viewingInvoice.targetGesamt} />
                )}
              </div>
              {previewTab === "rechnung" && !isStandaloneTD && viewingInvoice.attachTreatmentPdf && viewingInvoice.treatmentDoc && (
                <div>
                  <p className="text-xs text-gray-400 text-center mb-2">Seite 2 — Behandlungsdokumentation</p>
                  <div className="shadow-lg border border-gray-200" style={{ width: "210mm" }}>
                    <TreatmentDocPreview
                      practice={viewPractice}
                      patient={viewingInvoice.patient}
                      treatmentDoc={viewingInvoice.treatmentDoc}
                      einheit={viewingInvoice.einheit || viewingInvoice.treatmentDoc?.einheit || "SE"}
                      facePhoto={previewFacePhoto}
                    />
                  </div>
                </div>
              )}
            </div>
            <MobileScaledPreview className="lg:hidden" a4Width={a4Px}>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="shadow-lg border border-gray-200" style={{ width: a4Px }}>
                  {(previewTab === "behandlung" || isStandaloneTD) ? (
                    <TreatmentDocPreview
                      practice={viewPractice}
                      patient={viewingInvoice.patient}
                      treatmentDoc={viewingInvoice.treatmentDoc}
                      einheit={viewingInvoice.einheit || viewingInvoice.treatmentDoc?.einheit || "SE"}
                      facePhoto={previewFacePhoto}
                    />
                  ) : previewTab === "honorar" && viewHasHV ? (
                    signedHvUpload ? (
                      signedHvUpload.type === "image" ? (
                        <div style={{ width: a4Px, minHeight: 200, background: "white", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" }}>
                          <img src={signedHvUpload.data} alt="Unterschriebene HV" style={{ maxWidth: "100%" }} />
                        </div>
                      ) : (
                        <div style={{ width: a4Px, minHeight: 200, background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", gap: "12px" }}>
                          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <p className="text-xs font-medium text-gray-700">{signedHvUpload.filename || "Unterschriebene HV"}</p>
                          <p className="text-xs text-green-600 font-medium">PDF hochgeladen</p>
                          <a href={signedHvUpload.data} download={signedHvUpload.filename || "Honorarvereinbarung_signed.pdf"} className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition">
                            PDF herunterladen
                          </a>
                        </div>
                      )
                    ) : (
                      <HonorarvereinbarungPreview practice={viewPractice} patient={viewingInvoice.patient} invoiceMeta={viewingInvoice.invoiceMeta} lineItems={viewingInvoice.lineItems} isStandalone={!!viewingInvoice._hvOnly} signatures={viewingInvoice._signatures} onSignatureClick={() => setShowSignatureModal(true)} onDoctorSign={viewingInvoice._signatures?.patient && !viewingInvoice._signatures?.doctor ? () => setShowHvDoctorSign(true) : undefined} />
                    )
                  ) : (
                    <InvoicePreview practice={viewPractice} patient={viewingInvoice.patient} invoiceMeta={viewingInvoice.invoiceMeta} lineItems={viewingInvoice.lineItems} begruendung={viewingInvoice.begruendung} targetGesamt={viewingInvoice.targetGesamt} />
                  )}
                </div>
                {previewTab === "rechnung" && !isStandaloneTD && viewingInvoice.attachTreatmentPdf && viewingInvoice.treatmentDoc && (
                  <div>
                    <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", marginBottom: 8 }}>Seite 2 — Behandlungsdokumentation</p>
                    <div className="shadow-lg border border-gray-200" style={{ width: a4Px }}>
                      <TreatmentDocPreview
                        practice={viewPractice}
                        patient={viewingInvoice.patient}
                        treatmentDoc={viewingInvoice.treatmentDoc}
                        einheit={viewingInvoice.einheit || viewingInvoice.treatmentDoc?.einheit || "SE"}
                        facePhoto={previewFacePhoto}
                      />
                    </div>
                  </div>
                )}
              </div>
            </MobileScaledPreview>
            <p className="text-center text-xs text-gray-400 mt-2 lg:hidden">Zum Teilen oben auf das Teilen-Symbol tippen</p>
            {/* Hidden TreatmentDocPreview for PDF generation (offscreen) */}
            {viewingInvoice.treatmentDoc && (
              <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <TreatmentDocPreview
                  id="invoice-treatment-doc-preview"
                  practice={viewPractice}
                  patient={viewingInvoice.patient}
                  treatmentDoc={viewingInvoice.treatmentDoc}
                  einheit={viewingInvoice.einheit || viewingInvoice.treatmentDoc?.einheit || "SE"}
                  facePhoto={previewFacePhoto}
                />
              </div>
            )}
            {/* Hidden file input for HV upload */}
            <input ref={hvUploadRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleHvUpload} />
            {/* Signature Modal — patient only */}
            {showSignatureModal && (
              <SignatureModal
                onComplete={handleSignatureComplete}
                onClose={() => setShowSignatureModal(false)}
                existingSignatures={viewingInvoice._signatures}
              />
            )}
            {/* Doctor signature modal for HV */}
            {showHvDoctorSign && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowHvDoctorSign(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">Unterschrift Ärzt:in</h3>
                    <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => setShowHvDoctorSign(false)}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <SignaturePad key="hv-doctor-sig" label="Unterschrift Ärzt:in" onSave={handleHvDoctorSignComplete} />
                  <button className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition py-1" onClick={() => setShowHvDoctorSign(false)}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        <div className="mt-8 text-center text-xs text-gray-300">
          EPHIA Rechnungs-Prototyp · Daten von Patient:innen werden gemäß DSGVO gespeichert · <button className="text-gray-400 hover:text-gray-500 underline" onClick={() => setPage("agb")}>AGB</button> · <button className="text-gray-400 hover:text-gray-500 underline" onClick={() => setPage("datenschutz")}>Datenschutz</button> · <button className="text-gray-400 hover:text-gray-500 underline" onClick={() => setPage("impressum")}>Impressum</button>
        </div>
      </div>}
    </div>
  );
}
