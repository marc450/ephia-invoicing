import React, { useState, useEffect } from "react";

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
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Reset password failed");
  return data;
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

async function supabaseCreateInvoice(accessToken, userId, invoiceData) {
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
      body: JSON.stringify({ user_id: userId, data: invoiceData }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Create invoice failed");
  return Array.isArray(data) ? data[0] : data;
}

async function supabaseUpdateInvoice(accessToken, invoiceId, invoiceData) {
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
      body: JSON.stringify({ data: invoiceData }),
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

// ═══════════════════ Constants ═══════════════════

const PUNKTWERT = 0.0582873; // GOÄ standard

const BOTOX_GOA_ITEMS = [
  { goaCode: "1", description: "Beratung, auch mittels Fernsprecher", punkte: 80, steigerung: 2.3, info: "Abrechnung der ärztlichen Beratung (auch telefonisch), wenn das Gespräch kürzer als 10 Minuten dauert. Regelhöchstsatz: 2,3-fach (10,72 €). Höchstsatz: 3,5-fach (16,32 €). Wird einmal pro Behandlungsfall (Kalendermonat) angesetzt." },
  { goaCode: "5", description: "Symptombezogene Untersuchung", punkte: 80, steigerung: 2.3, info: "Einfache, symptombezogene Untersuchung vor der Behandlung. In der ästhetischen Medizin üblich zur Bewertung des aktuellen Hautzustands und Festlegung der Behandlung. Regelhöchstsatz: 2,3-fach (10,72 €). Höchstsatz: 3,5-fach (16,32 €)." },
  { goaCode: "267", description: "Medikamentöse Infiltrationsbehandlung je Sitzung", punkte: 80, steigerung: 3.5, info: "Abrechnung der eigentlichen Botulinum-Injektion. Der Steigerungssatz wird automatisch berechnet, wenn ein gewünschter Nettobetrag angegeben wird. Einfachsatz: 4,66 €. Regelhöchstsatz: 3,5-fach (16,32 €). Über 3,5-fach: Honorarvereinbarung nach §2 GOÄ erforderlich." },
];

// GOÄ Zuschläge relevant to GOÄ 1 and 5 (Beratungen/Untersuchungen), excluding children (K1/K2)
// Zuschläge are "nicht steigerbar" (fixed factor 1.0)
const ZUSCHLAEGE = [
  { code: "A", label: "Zuschlag A: außerhalb der Sprechstunde", description: "Zuschlag A nach GOÄ Abschnitt B, außerhalb der Sprechstunde", punkte: 70, appliesTo: ["1", "5"], info: "Für Leistungen, die außerhalb der regulären Sprechstundenzeit erbracht werden." },
  { code: "B", label: "Zuschlag B: 20 bis 22 Uhr oder 6 bis 8 Uhr", description: "Zuschlag B nach GOÄ Abschnitt B, 20 bis 22 Uhr oder 6 bis 8 Uhr", punkte: 180, appliesTo: ["1", "5"], info: "Für Leistungen außerhalb der Sprechstunde zwischen 20 und 22 Uhr oder 6 und 8 Uhr." },
  { code: "C", label: "Zuschlag C: 22 bis 6 Uhr (Nacht)", description: "Zuschlag C nach GOÄ Abschnitt B, 22 bis 6 Uhr (Nacht)", punkte: 320, appliesTo: ["1", "5"], info: "Für Leistungen, die in der Nacht zwischen 22 und 6 Uhr erbracht werden." },
  { code: "D", label: "Zuschlag D: Sa, So & Feiertage", description: "Zuschlag D nach GOÄ Abschnitt B, Sa, So & Feiertage", punkte: 220, appliesTo: ["1", "5"], info: "Für Leistungen an Samstagen, Sonn- oder Feiertagen." },
];

const SACHKOSTEN_INFO = `Folgende Materialien dürfen nach GOÄ § 10 nicht an Patient:innen weiterverrechnet werden:

• Kleinmaterialien wie Zellstoff, Mulltupfer, Schnellverbandmaterial, Verbandspray, Gewebeklebstoff auf Histoacrylbasis, Mullkompressen, Holzspatel, Holzstäbchen, Wattestäbchen, Gummifingerlinge
• Reagenzien und Narkosemittel zur Oberflächenanästhesie
• Desinfektions- und Reinigungsmittel
• Augen-, Ohren-, Nasentropfen, Puder, Salben und geringwertige Arzneimittel zur sofortigen Anwendung sowie für
• Folgende Einmalartikel: Einmalspritzen, Einmalkanülen, Einmalhandschuhe, Einmalharnblasenkatheter, Einmalskalpelle, Einmalproktoskope, Einmaldarmrohre, Einmalspekula

Diese Liste ist abschließend.`;

const DIAGNOSE_TEXT =
  "Wahlleistung: Behandlung von als ästhetisch störend empfundenen mimischen Falten im Bereich der Zornesfalte, Stirn und Augenpartie mittels Botulinum.";

const DEFAULT_PRACTICE = {
  name: "Musterpraxis Dr. Muster",
  address1: "Musterstraße 1",
  address2: "12345 Musterstadt",
  address3: "",
  phone: "030 1234567",
  email: "praxis@muster.de",
  bankName: "Musterbank",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  kleinunternehmer: false,
};

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

function toDE(num) {
  return num.toString().replace(".", ",");
}

function buildLineItems(praeparat, ml, preisProMl, selectedZuschlaege, sachkosten, custom267Steigerung) {
  const goaLines = BOTOX_GOA_ITEMS.map((g) => {
    const steigerung = (g.goaCode === "267" && custom267Steigerung != null) ? custom267Steigerung : g.steigerung;
    return {
      ...g,
      steigerung,
      betrag: calcGoaBetrag(g.punkte, steigerung),
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
    description: `${ml}ml ${praeparat || "Präparat"}`,
    punkte: null,
    steigerung: null,
    betrag: Math.round(ml * preisProMl * 100) / 100,
    isProduct: true,
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

// Compute required GOÄ 267 Steigerungssatz to reach a desired Nettobetrag
function calc267Steigerung(desiredNetto, ml, preisProMl, selectedZuschlaege, sachkosten) {
  // Fixed costs: GOÄ 1 + GOÄ 5 + Zuschläge + Präparat + Sachkosten
  const goa1 = calcGoaBetrag(80, 2.3);
  const goa5 = calcGoaBetrag(80, 2.3);
  const zuschlagTotal = (selectedZuschlaege || []).reduce((sum, code) => {
    const z = ZUSCHLAEGE.find((zs) => zs.code === code);
    return sum + (z ? calcGoaBetrag(z.punkte, 1.0) : 0);
  }, 0);
  const productCost = Math.round(ml * preisProMl * 100) / 100;
  const sachkostenTotal = (sachkosten || []).reduce((sum, sk) => sum + parseDE(sk.betragStr), 0);

  const fixedCosts = goa1 + goa5 + zuschlagTotal + productCost + sachkostenTotal;
  const required267 = desiredNetto - fixedCosts;
  if (required267 <= 0) return 0;
  // Steigerungssatz = betrag / (punkte × PUNKTWERT)
  return Math.round((required267 / (80 * PUNKTWERT)) * 100) / 100;
}

function calcGesamt(lineItems, kleinunternehmer, isAusland) {
  const zwischensumme = lineItems.reduce((s, it) => s + it.betrag, 0);
  const noMwst = kleinunternehmer || isAusland;
  const mwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  return Math.round((zwischensumme + mwst) * 100) / 100;
}

// ═══════════════════ Auth Screens ═══════════════════

function LoginScreen({ onSignInClick, onSignUpClick, onResetClick, isLoading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-gray-800 tracking-tight mb-2">ephia</div>
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
          Sichere Authentifizierung mit Supabase
        </div>
      </div>
    </div>
  );
}

function SignUpScreen({ onSignUpClick, onBackClick, isLoading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const passwordsMatch = password && passwordConfirm && password === passwordConfirm;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-gray-800 tracking-tight mb-2">ephia</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Neues Konto</div>
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
          Sichere Authentifizierung mit Supabase
        </div>
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
          <div className="text-2xl font-bold text-gray-800 tracking-tight mb-2">ephia</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Passwort zurücksetzen</div>
        </div>

        {success && (
          <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Passwort-Reset-Link wurde an deine E-Mail gesendet. Bitte überprüfe dein Postfach.
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
          Sichere Authentifizierung mit Supabase
        </div>
      </div>
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
    <span className="relative inline-block ml-1">
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

// ═══════════════════ Settings Panel ═══════════════════

function SettingsPanel({ practice, setPractice, show, setShow, onSave }) {
  const f = (label, key, ph) => (
    <div className="mb-2">
      <label className="block text-xs font-medium text-gray-500 mb-0.5">{label}</label>
      <input
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={practice[key]}
        placeholder={ph}
        onChange={(e) => setPractice({ ...practice, [key]: e.target.value })}
      />
    </div>
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Praxis-Einstellungen</h3>
          <button className="text-gray-400 hover:text-gray-600 text-lg leading-none" onClick={() => setShow(false)}>✕</button>
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Praxisdaten</p>
            {f("Praxisname", "name", "Dr. Muster")}
            {f("Adresszeile 1", "address1", "Straße Nr.")}
            {f("Adresszeile 2", "address2", "PLZ Ort")}
            {f("Adresszeile 3 (optional)", "address3", "")}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Kontakt & Bank</p>
            {f("Telefon", "phone", "")}
            {f("E-Mail", "email", "")}
            {f("Bankname", "bankName", "")}
            {f("IBAN", "iban", "")}
            {f("BIC", "bic", "")}
          </div>
          <div className="col-span-2 mt-3 pt-3 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                checked={practice.kleinunternehmer}
                onChange={(e) => setPractice({ ...practice, kleinunternehmer: e.target.checked })}
              />
              <span className="text-sm text-gray-600">MwSt.-befreit (Kleinunternehmerregelung §19 UStG)</span>
            </label>
          </div>
        </div>
        <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
          <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setShow(false)}>
            Abbrechen
          </button>
          <button className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-700" onClick={() => { onSave(); setShow(false); }}>
            Speichern und schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Invoice Preview ═══════════════════

function InvoicePreview({ practice, patient, invoiceMeta, lineItems }) {
  const zwischensumme = lineItems.reduce((s, it) => s + it.betrag, 0);
  const isKlein = practice.kleinunternehmer;
  const isAusland = patient.country && patient.country !== "Deutschland";
  const noMwst = isKlein || isAusland;
  const mwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  const gesamt = Math.round((zwischensumme + mwst) * 100) / 100;
  const hasHonorarvereinbarung = lineItems.some((it) => it.steigerung != null && it.steigerung > 3.5);

  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a", padding: "40px 44px", width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden" },
    h: { fontSize: "16px", fontWeight: "700", color: "#222", marginBottom: "4px" },
    addr: { fontSize: "11px", color: "#444", marginBottom: "28px" },
    patLabel: { fontSize: "9.5px", color: "#999", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" },
    th: { textAlign: "left", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thR: { textAlign: "right", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    td: { padding: "5px 6px", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdR: { padding: "5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
  };

  return (
    <div id="invoice-preview" style={S.page}>
      <div style={S.h}>{practice.name || "Logo Arztpraxis"}</div>
      <div style={S.addr}>
        <div>{practice.address1}</div>
        <div>{practice.address2}</div>
        {practice.address3 && <div>{practice.address3}</div>}
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={S.patLabel}>Anschrift Patient:in</div>
        <div>{patient.name || ""}</div>
        <div>{patient.address1 || ""}</div>
        <div>{patient.address2 || ""}</div>
        {patient.country && patient.country !== "Deutschland" && (
          <div>{patient.country}</div>
        )}
      </div>

      <div style={{ marginBottom: "6px" }}>
        {invoiceMeta.ort}{invoiceMeta.ort && invoiceMeta.datum ? ", " : ""}{fmtDate(invoiceMeta.datum)}
      </div>
      <div style={{ fontWeight: "700", fontSize: "12px", marginBottom: "18px" }}>
        Rechnung Nr. {invoiceMeta.nummer || "X"}
      </div>

      <div style={{ fontWeight: "700", marginBottom: "4px" }}>Diagnose:</div>
      <div style={{ marginBottom: "22px" }}>{DIAGNOSE_TEXT}</div>

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
            <th style={S.th}>GOÄ-Ziffer</th>
            <th style={S.th}>Bezeichnung der Leistung</th>
            <th style={S.thR}>Punktzahl</th>
            <th style={S.thR}>Steigerungssatz</th>
            <th style={S.thR}>Betrag (€)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((it, i) => (
            <tr key={i}>
              <td style={S.td}>{it.goaCode}</td>
              <td style={S.td}>{it.description}</td>
              <td style={S.tdR}>{it.punkte ?? ""}</td>
              <td style={S.tdR}>{it.steigerung != null ? toDE(it.steigerung) : ""}</td>
              <td style={S.tdR}>{fmt(it.betrag)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {!noMwst && (
            <tr style={{ borderTop: "1.5px solid #222" }}>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zwischensumme</td>
              <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(zwischensumme)}</td>
            </tr>
          )}
          {!noMwst && (
            <tr>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zzgl. 19% MwSt.</td>
              <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(mwst)}</td>
            </tr>
          )}
          <tr style={{ fontWeight: "700", borderTop: noMwst ? "1.5px solid #222" : undefined }}>
            <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Gesamtbetrag</td>
            <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(gesamt)}</td>
          </tr>
          {isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 6px 0", fontSize: "9px", color: "#888" }}>
                Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
              </td>
            </tr>
          )}
          {isAusland && !isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 6px 0", fontSize: "9px", color: "#888" }}>
                Kein inländischer Wohnsitz. Umsatzsteuer entfällt.
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {hasHonorarvereinbarung && (
        <div style={{ fontSize: "10px", color: "#444", marginBottom: "16px", fontStyle: "italic" }}>
          Abrechnung gemäß § 2 GOÄ auf Grundlage einer vor Behandlungsbeginn geschlossenen Honorarvereinbarung.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#888", borderTop: "1px solid #ccc", paddingTop: "8px", position: "absolute", bottom: "40px", left: "44px", right: "44px" }}>
        <div>
          <div>{practice.phone}</div>
          <div>{practice.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>{practice.bankName}</div>
          <div>IBAN: {practice.iban}</div>
          <div>BIC: {practice.bic}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Honorarvereinbarung Preview ═══════════════════

function HonorarvereinbarungPreview({ practice, patient, invoiceMeta, lineItems }) {
  const zwischensumme = lineItems.reduce((s, it) => s + it.betrag, 0);
  const isKlein = practice.kleinunternehmer;
  const isAusland = patient.country && patient.country !== "Deutschland";
  const noMwst = isKlein || isAusland;
  const mwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  const gesamt = Math.round((zwischensumme + mwst) * 100) / 100;

  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a", padding: "40px 44px", width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden" },
    th: { textAlign: "left", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thR: { textAlign: "right", padding: "5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    td: { padding: "5px 6px", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdR: { padding: "5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
    line: { borderBottom: "1px solid #222", display: "inline-block", minWidth: "340px" },
  };

  return (
    <div id="hv-preview" style={S.page}>
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
        <span>Name der Patient:in: </span>
        <span style={{ ...S.line, minWidth: "320px" }}>
          {patient.name ? ` ${patient.name}` : ""}
        </span>
      </div>
      <div style={{ marginBottom: "24px" }}>
        <span>Adresse der Patient:in: </span>
        <span style={{ ...S.line, minWidth: "306px" }}>
          {[patient.address1, patient.address2, (patient.country && patient.country !== "Deutschland") ? patient.country : ""].filter(Boolean).join(", ") || ""}
        </span>
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
            <th style={S.th}>GOÄ-Ziffer</th>
            <th style={S.th}>Bezeichnung der Leistung</th>
            <th style={S.thR}>Punktzahl</th>
            <th style={S.thR}>Steigerungssatz</th>
            <th style={S.thR}>Betrag (€)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((it, i) => (
            <tr key={i}>
              <td style={S.td}>{it.goaCode}</td>
              <td style={S.td}>{it.description}</td>
              <td style={S.tdR}>{it.punkte != null ? it.punkte : ""}</td>
              <td style={S.tdR}>{it.steigerung != null ? toDE(it.steigerung) : ""}</td>
              <td style={S.tdR}>{fmt(it.betrag)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {!noMwst && (
            <tr style={{ borderTop: "1.5px solid #222" }}>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zwischensumme</td>
              <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(zwischensumme)}</td>
            </tr>
          )}
          {!noMwst && (
            <tr>
              <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Zzgl. 19% MwSt.</td>
              <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(mwst)}</td>
            </tr>
          )}
          <tr style={{ fontWeight: "700", borderTop: noMwst ? "1.5px solid #222" : undefined }}>
            <td colSpan={4} style={{ padding: "5px 6px", textAlign: "right" }}>Gesamtbetrag</td>
            <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmt(gesamt)}</td>
          </tr>
          {isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 6px 0", fontSize: "9px", color: "#888" }}>
                Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
              </td>
            </tr>
          )}
          {isAusland && !isKlein && (
            <tr>
              <td colSpan={5} style={{ padding: "8px 6px 0", fontSize: "9px", color: "#888" }}>
                Kein inländischer Wohnsitz. Umsatzsteuer entfällt.
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      <div style={{ borderTop: "1px solid #ccc", paddingTop: "14px", marginBottom: "20px" }}>
        <div style={{ fontWeight: "700", marginBottom: "4px" }}>Hinweis gemäß § 2 Abs. 2 Satz 2 GOÄ:</div>
        <div>
          Es wird ausdrücklich darauf hingewiesen, dass eine Erstattung der vereinbarten Vergütung durch
          Erstattungsstellen möglicherweise nicht in vollem Umfang gewährleistet ist.
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "80px", left: "44px", right: "44px" }}>
        <div style={{ marginBottom: "30px" }}>
          <span>Ort, Datum: </span>
          <span style={{ ...S.line, minWidth: "280px" }}>
            {invoiceMeta.ort ? ` ${invoiceMeta.ort}, ${fmtDate(invoiceMeta.datum)}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <span>Unterschrift Ärzt:in: </span>
            <span style={{ borderBottom: "1px solid #222", display: "inline-block", minWidth: "160px" }}></span>
          </div>
          <div>
            <span>Unterschrift Patient:in: </span>
            <span style={{ borderBottom: "1px solid #222", display: "inline-block", minWidth: "140px" }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Invoice List View ═══════════════════

function InvoiceListView({ invoices, kleinunternehmer, onView, onAmend, onDelete, onPrint, onPrintHV, onBack }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-300 text-4xl mb-3"></div>
        <p className="text-sm text-gray-500 mb-1">Noch keine Dokumente erstellt.</p>
        <p className="text-xs text-gray-400">Erstellen Sie Ihre erste Rechnung, um sie hier zu sehen.</p>
        <button className="mt-4 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={onBack}>
          ← Neue Rechnung erstellen
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Erstellte Dokumente</h2>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "90px" }}>Nr.</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Patient:in</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "90px" }}>Datum</th>
            <th className="text-right px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "100px" }}>Betrag</th>
            <th className="text-center px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "160px" }}>Download</th>
            <th className="text-right px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ width: "110px" }}>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const ausland = inv.patient.country && inv.patient.country !== "Deutschland";
            const gesamt = calcGesamt(inv.lineItems, kleinunternehmer, ausland);
            const hasHV = inv.hasHV != null ? inv.hasHV : inv.lineItems.some((it) => it.steigerung != null && it.steigerung > 3.5);
            return (
              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => onView(inv)}>
                <td className="px-5 py-3 align-top">
                  <span className="text-sm font-medium text-gray-700">{inv.invoiceMeta.nummer}</span>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="text-sm text-gray-700">{inv.patient.name}</div>
                  <div className="text-xs text-gray-400">{inv.mlStr || toDE(inv.ml)}ml {inv.praeparat}</div>
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="text-sm text-gray-500">{fmtDate(inv.invoiceMeta.datum)}</span>
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{fmt(gesamt)} €</span>
                </td>
                <td className="px-3 py-3 text-center align-top" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button className="px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition" onClick={() => onPrint(inv)}>Rechnung</button>
                    {hasHV && (
                      <button className="px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition" onClick={() => onPrintHV(inv)}>HV</button>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right align-top" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button className="px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition" onClick={() => onAmend(inv)}>Ändern</button>
                    <button className="px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" onClick={() => onDelete(inv.id)}>✕</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════ Main App ═══════════════════

export default function EphiaInvoice() {
  // ─── Auth State ───
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login"); // "login" | "signup" | "reset"
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);

  // ─── Main App State ───
  const [practice, setPractice] = useState(DEFAULT_PRACTICE);
  const [showSettings, setShowSettings] = useState(false);

  const [page, setPage] = useState("create");

  const [patient, setPatient] = useState({ name: "", address1: "", address2: "", country: "Deutschland" });
  const [invoiceMeta, setInvoiceMeta] = useState({
    nummer: "1",
    ort: "",
    datum: new Date().toISOString().slice(0, 10),
  });

  // Treatment inputs
  const [praeparat, setPraeparat] = useState("");
  const [mlStr, setMlStr] = useState("1");
  const [preisProMlStr, setPreisProMlStr] = useState("120,38");

  // Zuschläge
  const [selectedZuschlaege, setSelectedZuschlaege] = useState([]);

  // Sachkosten
  const [sachkosten, setSachkosten] = useState([]);
  const [nextSkId, setNextSkId] = useState(1);

  // Desired net amount → back-compute GOÄ 267 Steigerungssatz
  const [wunschNettoStr, setWunschNettoStr] = useState("");

  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [amendingId, setAmendingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [invoices, setInvoices] = useState([]);

  const [validationErrors, setValidationErrors] = useState({});
  const [previewTab, setPreviewTab] = useState("rechnung"); // "rechnung" | "honorar"

  // ─── Check session on mount ───
  useEffect(() => {
    const checkSession = async () => {
      try {
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
            await loadUserData(newSess.access_token, newSess.user.id);
          } catch (err) {
            console.error("Token refresh failed:", err);
            localStorage.removeItem("ephia_session");
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

  // ─── Load user data from Supabase ───
  const loadUserData = async (accessToken, userId) => {
    try {
      // Load practice data
      const profiles = await supabaseFetchProfiles(accessToken, userId);
      if (profiles.length > 0 && profiles[0].practice_data) {
        setPractice(profiles[0].practice_data);
      }

      // Load invoices
      const invoiceRecords = await supabaseFetchInvoices(accessToken, userId);
      const loadedInvoices = invoiceRecords.map((rec) => ({
        ...rec.data,
        _supabaseId: rec.id,
      }));
      setInvoices(loadedInvoices);
    } catch (err) {
      console.error("Failed to load user data:", err);
    }
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
      await loadUserData(data.access_token, data.user.id);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (email, password) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = await supabaseSignUp(email, password);
      // Auto-sign in after signup
      const signInData = await supabaseSignIn(email, password);
      const sess = {
        access_token: signInData.access_token,
        refresh_token: signInData.refresh_token,
        user: signInData.user,
      };
      localStorage.setItem("ephia_session", JSON.stringify(sess));
      setSession(sess);
      setUser(sess.user);
      setAuthPage("login");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (email) => {
    setAuthError("");
    setAuthSuccess(false);
    setAuthLoading(true);
    try {
      await supabaseResetPassword(email);
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
    setSession(null);
    setUser(null);
    setInvoices([]);
    setPractice(DEFAULT_PRACTICE);
    setAuthPage("login");
    setAuthError("");
  };

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
  const noMwst = isKlein || isAusland;
  const wunschNetto = parseDE(wunschNettoStr);
  const computed267Steigerung = wunschNetto > 0
    ? calc267Steigerung(wunschNetto, ml, preisProMl, selectedZuschlaege, sachkosten)
    : null;
  const liveItems = buildLineItems(praeparat || "Präparat", ml, preisProMl, selectedZuschlaege, sachkosten, computed267Steigerung);
  const zwischensumme = liveItems.reduce((s, it) => s + it.betrag, 0);
  const mwst = noMwst ? 0 : Math.round(zwischensumme * 0.19 * 100) / 100;
  const gesamt = Math.round((zwischensumme + mwst) * 100) / 100;
  const effective267Steigerung = computed267Steigerung != null ? computed267Steigerung : 3.5;

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
    if (!patient.name.trim()) errors.patientName = true;
    if (!patient.address1.trim()) errors.patientAddress1 = true;
    if (!patient.address2.trim()) errors.patientAddress2 = true;
    if (!invoiceMeta.nummer.trim()) errors.nummer = true;
    if (!invoiceMeta.ort.trim()) errors.ort = true;
    if (!invoiceMeta.datum) errors.datum = true;
    if (!praeparat.trim()) errors.praeparat = true;
    if (ml <= 0) errors.ml = true;
    if (preisProMl <= 0) errors.preisProMl = true;

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

    // Save practice settings
    if (session) {
      try {
        await supabaseUpdateProfile(session.access_token, user.id, practice);
      } catch (err) {
        console.error("Failed to save practice settings:", err);
      }
    }

    handleGenerate();
  };

  const savePracticeSettings = async () => {
    if (session) {
      try {
        await supabaseUpdateProfile(session.access_token, user.id, practice);
        alert("Praxis-Einstellungen gespeichert!");
      } catch (err) {
        console.error("Failed to save practice settings:", err);
        alert("Fehler beim Speichern: " + err.message);
      }
    }
  };

  const handleGenerate = async () => {
    const items = buildLineItems(praeparat, ml, preisProMl, selectedZuschlaege, sachkosten, computed267Steigerung);
    const hasHV = items.some((it) => it.steigerung != null && it.steigerung > 3.5);
    const entry = {
      id: amendingId || Date.now(),
      patient: { ...patient },
      invoiceMeta: { ...invoiceMeta },
      lineItems: items,
      hasHV,
      praeparat,
      ml,
      mlStr,
      preisProMl,
      preisProMlStr,
      wunschNettoStr,
      selectedZuschlaege: [...selectedZuschlaege],
      sachkosten: sachkosten.map((sk) => ({ ...sk })),
      savedAt: new Date().toISOString(),
    };

    // Persist to Supabase
    if (session) {
      try {
        const amendingEntry = invoices.find((inv) => inv.id === amendingId);
        if (amendingEntry && amendingEntry._supabaseId) {
          // Update existing
          await supabaseUpdateInvoice(session.access_token, amendingEntry._supabaseId, entry);
          setInvoices(invoices.map((inv) => (inv.id === amendingId ? { ...entry, _supabaseId: amendingEntry._supabaseId } : inv)));
        } else {
          // Create new
          const created = await supabaseCreateInvoice(session.access_token, user.id, entry);
          setInvoices([{ ...entry, _supabaseId: created.id }, ...invoices]);
          setViewingInvoice({ ...entry, _supabaseId: created.id });
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

    setAmendingId(null);
    setViewingInvoice(entry);
    setPreviewTab("rechnung");
    setPage("preview");
  };

  const handleNew = () => {
    const maxNr = invoices.reduce((max, inv) => Math.max(max, Number(inv.invoiceMeta.nummer) || 0), 0);
    setPatient({ name: "", address1: "", address2: "", country: "Deutschland" });
    setInvoiceMeta({ nummer: String(maxNr + 1), ort: invoiceMeta.ort, datum: new Date().toISOString().slice(0, 10) });
    setPraeparat("");
    setMlStr("1");
    setSelectedZuschlaege([]);
    setSachkosten([]);
    setWunschNettoStr("");
    setAmendingId(null);
    setPage("create");
  };

  const handleAmend = (inv) => {
    setPatient(inv.patient);
    setInvoiceMeta(inv.invoiceMeta);
    setPraeparat(inv.praeparat);
    setMlStr(inv.mlStr || toDE(inv.ml));
    setPreisProMlStr(inv.preisProMlStr || toDE(inv.preisProMl));
    setSelectedZuschlaege(inv.selectedZuschlaege || []);
    setSachkosten(inv.sachkosten || []);
    setWunschNettoStr(inv.wunschNettoStr || "");
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

    setInvoices(invoices.filter((inv) => inv.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    if (viewingInvoice && viewingInvoice.id === confirmDeleteId) {
      setPage("list");
      setViewingInvoice(null);
    }
  };

  const handleView = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("rechnung");
    setPage("preview");
  };

  const handlePrintInvoice = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("rechnung");
    setPage("preview");
    setTimeout(() => {
      const el = document.getElementById("invoice-preview");
      if (!el) return;
      const win = window.open("", "_blank", "width=800,height=1100");
      win.document.write(`<!DOCTYPE html><html><head><title>Rechnung ${inv.invoiceMeta.nummer}</title>
        <style>body{margin:0;padding:0;} @page{size:A4;margin:0;} @media print{body{-webkit-print-color-adjust:exact;}}</style>
        </head><body>${el.outerHTML}</body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }, 100);
  };

  const handlePrintCurrent = () => {
    const el = document.getElementById("invoice-preview");
    if (!el) return;
    const nr = viewingInvoice?.invoiceMeta?.nummer || "X";
    const win = window.open("", "_blank", "width=800,height=1100");
    win.document.write(`<!DOCTYPE html><html><head><title>Rechnung ${nr}</title>
      <style>body{margin:0;padding:0;} @page{size:A4;margin:0;} @media print{body{-webkit-print-color-adjust:exact;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const handlePrintCurrentHV = () => {
    const el = document.getElementById("hv-preview");
    if (!el) return;
    const nr = viewingInvoice?.invoiceMeta?.nummer || "X";
    const win = window.open("", "_blank", "width=800,height=1100");
    win.document.write(`<!DOCTYPE html><html><head><title>Honorarvereinbarung ${nr}</title>
      <style>body{margin:0;padding:0;} @page{size:A4;margin:0;} @media print{body{-webkit-print-color-adjust:exact;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const handlePrintHV = (inv) => {
    setViewingInvoice(inv);
    setPreviewTab("honorar");
    setPage("preview");
    setTimeout(() => {
      const el = document.getElementById("hv-preview");
      if (!el) return;
      const win = window.open("", "_blank", "width=800,height=1100");
      win.document.write(`<!DOCTYPE html><html><head><title>Honorarvereinbarung ${inv.invoiceMeta.nummer}</title>
        <style>body{margin:0;padding:0;} @page{size:A4;margin:0;} @media print{body{-webkit-print-color-adjust:exact;}}</style>
        </head><body>${el.outerHTML}</body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }, 100);
  };

  // ─── Show auth screens if not logged in ───
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 tracking-tight mb-2">ephia</div>
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
          onBackClick={() => { setAuthPage("login"); setAuthError(""); }}
          isLoading={authLoading}
          error={authError}
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
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ─── Top bar ─── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleNew} className="text-lg font-bold text-gray-800 tracking-tight hover:text-gray-600 transition">ephia</button>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">Rechnungen</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded border transition text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"
            onClick={() => setShowSettings(true)}
          >
            Praxis-Einstellungen
          </button>
          <button
            className={`text-xs px-3 py-1.5 rounded border transition ${page === "list" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"}`}
            onClick={() => setPage("list")}
          >
            Erstellte Dokumente{invoices.length > 0 ? ` (${invoices.length})` : ""}
          </button>
          <button
            className={`text-xs px-3 py-1.5 rounded border transition ${page === "create" && !amendingId ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50"}`}
            onClick={handleNew}
          >
            + Neue Rechnung
          </button>
          <div className="border-l border-gray-200 h-5 mx-1"></div>
          <button
            className="text-xs px-3 py-1.5 rounded border border-gray-200 text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition"
            onClick={handleSignOut}
          >
            Abmelden
          </button>
        </div>
      </div>

      {/* Delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Rechnung löschen?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Möchten Sie Rechnung Nr. {invoices.find((i) => i.id === confirmDeleteId)?.invoiceMeta.nummer} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setConfirmDeleteId(null)}>Abbrechen</button>
              <button className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      <SettingsPanel practice={practice} setPractice={setPractice} show={showSettings} setShow={setShowSettings} onSave={savePracticeSettings} />

      <div className={`mx-auto px-6 py-5 ${page === "preview" ? "max-w-4xl" : "max-w-3xl"}`}>
        {/* ═══ CREATE PAGE ═══ */}
        {page === "create" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              {amendingId ? "Rechnung ändern" : "Botulinum-Rechnung erstellen"}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {amendingId
                ? "Passen Sie die Daten an und speichern Sie die geänderte Rechnung."
                : "Geben Sie die Behandlungsdetails ein. Die Rechnung wird automatisch nach GOÄ erstellt."}
            </p>
            {amendingId && effective267Steigerung > 3.5 && (
              <div className="mb-6 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                Änderungen werden auch in der zugehörigen Honorarvereinbarung übernommen.
              </div>
            )}

            {/* Patient + Invoice meta */}
            <div className="grid grid-cols-2 gap-x-8 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Patient:in</p>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Name *</label>
                  <input id="field-patientName" className={inputCls("patientName")} value={patient.name} placeholder="Max Mustermann" onChange={(e) => { setPatient({ ...patient, name: e.target.value }); clearError("patientName"); }} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Adresse Zeile 1 *</label>
                  <input id="field-patientAddress1" className={inputCls("patientAddress1")} value={patient.address1} placeholder="Musterweg 5" onChange={(e) => { setPatient({ ...patient, address1: e.target.value }); clearError("patientAddress1"); }} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">PLZ & Stadt *</label>
                  <input id="field-patientAddress2" className={inputCls("patientAddress2")} value={patient.address2} placeholder="12345 Musterstadt" onChange={(e) => { setPatient({ ...patient, address2: e.target.value }); clearError("patientAddress2"); }} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Land</label>
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
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Rechnung</p>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Rechnungsnummer *</label>
                  <input id="field-nummer" className={inputCls("nummer")} value={invoiceMeta.nummer} onChange={(e) => { setInvoiceMeta({ ...invoiceMeta, nummer: e.target.value }); clearError("nummer"); }} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Ort der Behandlung *</label>
                  <input id="field-ort" className={inputCls("ort")} value={invoiceMeta.ort} placeholder="Berlin" onChange={(e) => { setInvoiceMeta({ ...invoiceMeta, ort: e.target.value }); clearError("ort"); }} />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Datum *</label>
                  <input id="field-datum" type="date" className={inputCls("datum")} value={invoiceMeta.datum} onChange={(e) => { setInvoiceMeta({ ...invoiceMeta, datum: e.target.value }); clearError("datum"); }} />
                </div>
              </div>
            </div>

            {/* Treatment inputs */}
            <div className="border-t border-gray-100 pt-6 mb-6">
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Verwendetes Präparat</p>
                <InfoTooltip wide>
                  <div>
                    <strong>Hinweis nach GOÄ §10 (Auslagen):</strong> Es dürfen nur die tatsächlich entstandenen Kosten berechnet werden, nicht der aktuelle Marktpreis, sondern der Einkaufspreis. Rabatte und Boni müssen an Patient:innen weitergegeben werden; Pauschalen sind nicht erlaubt.{"\n\n"}Ab einem Betrag von 25,56 € ist ein Beleg (z.B. Einkaufsrechnung, Lieferschein) beizufügen. Belege mit mehreren Posten sind zulässig, sofern der Einzelpreis des verwendeten Materials klar hervorgeht.
                  </div>
                </InfoTooltip>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Präparatsname *</label>
                  <input id="field-praeparat" className={inputCls("praeparat")} value={praeparat} placeholder="z.B. Bocouture, Botox" onChange={(e) => { setPraeparat(e.target.value); clearError("praeparat"); }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Anzahl verwendete ml *</label>
                  <input id="field-ml" type="text" inputMode="decimal" className={inputCls("ml")} value={mlStr} placeholder="z.B. 0,45" onChange={(e) => { setMlStr(e.target.value); clearError("ml"); }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Preis pro ml (€)</label>
                  <input id="field-preisProMl" type="text" inputMode="decimal" className={inputCls("preisProMl")} value={preisProMlStr} placeholder="z.B. 120,38" onChange={(e) => { setPreisProMlStr(e.target.value); clearError("preisProMl"); }} />
                </div>
              </div>
            </div>

            {/* Desired net amount */}
            <div className="border-t border-gray-100 pt-6 mb-6">
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Gewünschter Nettobetrag</p>
                <InfoTooltip>
                  <div>
                    Geben Sie den gewünschten <strong>Nettobetrag</strong> (vor MwSt.) ein. Der Steigerungssatz der GOÄ 267 wird automatisch so berechnet, dass die Rechnung diesen Betrag erreicht.{"\n\n"}
                    Lassen Sie das Feld leer, um den Standard-Steigerungssatz (3,5-fach) zu verwenden.
                  </div>
                </InfoTooltip>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Nettobetrag (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full border border-gray-200 rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={wunschNettoStr}
                    placeholder="z.B. 350"
                    onChange={(e) => setWunschNettoStr(e.target.value)}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    <span className="text-gray-400">GOÄ 267 Steigerungssatz: </span>
                    <span className="font-semibold text-gray-700">
                      {fmt(effective267Steigerung).replace(".", ",")}x
                    </span>
                    {effective267Steigerung > 3.5 && (
                      <span className="ml-1 text-gray-400 text-xs">§2 GOÄ</span>
                    )}
                  </div>
                </div>
              </div>
              {effective267Steigerung > 3.5 && (
                <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                  Über 3,5-fach: Eine Honorarvereinbarung gemäß §2 GOÄ wird zusätzlich zur Rechnung erstellt und ein Verweis auf die Honorarvereinbarung wird auf der Rechnung vermerkt.
                </div>
              )}
            </div>

            {/* ─── Zuschläge ─── */}
            <div className="border-t border-gray-100 pt-6 mb-6">
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Zuschläge <span className="normal-case font-normal">(nach GOÄ Abschnitt B)</span></p>
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
                    <div key={z.code} className="relative group">
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
                      <div className="absolute z-40 bottom-full left-0 mb-1 bg-gray-800 text-white text-xs rounded-lg p-2.5 shadow-lg w-60 hidden group-hover:block" style={{ lineHeight: "1.4" }}>
                        <div className="font-semibold mb-1">Zuschlag {z.code} · {z.punkte} Punkte · Faktor 1,0</div>
                        <div>{z.info}</div>
                        <div className="mt-1 text-gray-400">Gilt für GOÄ {z.appliesTo.join(", ")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Sachkosten ─── */}
            <div className="border-t border-gray-100 pt-6 mb-6">
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sachkosten</p>
                <InfoTooltip wide>
                  <div>
                    {SACHKOSTEN_INFO}{"\n\n"}
                    <a href="https://www.gesetze-im-internet.de/go__1982/__10.html" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>
                      Gesetzestext: GOÄ §10
                    </a>
                  </div>
                </InfoTooltip>
              </div>
              {sachkosten.length > 0 && (
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 font-medium">
                  <div className="flex-1">Bezeichnung</div>
                  <div style={{ width: "120px" }} className="text-right">Betrag (€)</div>
                  <div style={{ width: "20px" }}></div>
                </div>
              )}
              {sachkosten.map((sk) => (
                <div key={sk.id} className="flex items-center gap-2 mb-2 group">
                  <div className="flex-1">
                    <input
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={sk.description}
                      placeholder="z.B. Kühlpads zum Mitnehmen"
                      onChange={(e) => updateSachkosten(sk.id, "description", e.target.value)}
                    />
                  </div>
                  <div style={{ width: "120px" }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={sk.betragStr}
                      placeholder="0,00"
                      onChange={(e) => updateSachkosten(sk.id, "betragStr", e.target.value)}
                    />
                  </div>
                  <button
                    className="text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                    style={{ width: "20px" }}
                    onClick={() => removeSachkosten(sk.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1" onClick={addSachkosten}>
                + Sachkosten hinzufügen
              </button>
            </div>

            {/* Live cost summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Kostenvorschau</p>
              <div className="flex flex-col gap-1">
                {/* GOÄ lines */}
                {liveItems.filter((it) => !it.isProduct && !it.isZuschlag).map((it, i) => (
                  <div key={`goa-${i}`} className="flex justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      GOÄ {it.goaCode}: {it.description}
                      {it.info && <InfoTooltip>{it.info}</InfoTooltip>}
                    </span>
                    <span className="whitespace-nowrap ml-2">{fmt(it.betrag)} €</span>
                  </div>
                ))}
                {/* Zuschläge */}
                {liveItems.filter((it) => it.isZuschlag).length > 0 && (
                  <div className="border-t border-dashed border-gray-200 mt-1.5 pt-1.5">
                    <div className="text-xs text-gray-400 font-medium mb-1">Zuschläge</div>
                    {liveItems.filter((it) => it.isZuschlag).map((it, i) => (
                      <div key={`z-${i}`} className="flex justify-between text-xs text-gray-500">
                        <span>GOÄ {it.goaCode}: {it.description}</span>
                        <span>{fmt(it.betrag)} €</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Product + Sachkosten */}
                {liveItems.filter((it) => it.isProduct).length > 0 && (
                  <div className="border-t border-dashed border-gray-200 mt-1.5 pt-1.5">
                    <div className="text-xs text-gray-400 font-medium mb-1">Präparat & Sachkosten</div>
                    {liveItems.filter((it) => it.isProduct).map((it, i) => (
                      <div key={`sk-${i}`} className="flex justify-between text-xs text-gray-500">
                        <span>{it.description}</span>
                        <span>{fmt(it.betrag)} €</span>
                      </div>
                    ))}
                  </div>
                )}
                {!noMwst && (
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-xs text-gray-500">
                    <span>Zwischensumme</span><span>{fmt(zwischensumme)} €</span>
                  </div>
                )}
                {!noMwst && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Zzgl. 19% MwSt.</span><span>{fmt(mwst)} €</span>
                  </div>
                )}
                <div className={`flex justify-between text-sm font-bold text-gray-800 mt-1 pt-1 ${noMwst ? "border-t border-gray-200 mt-2" : "border-t border-gray-300"}`}>
                  <span>Gesamtbetrag</span><span>{fmt(gesamt)} €</span>
                </div>
                {isKlein && (
                  <div className="text-xs text-gray-400 mt-1">Gem. §19 UStG keine MwSt.</div>
                )}
                {isAusland && !isKlein && (
                  <div className="text-xs text-gray-400 mt-1">Kein inländischer Wohnsitz, MwSt. entfällt.</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" onClick={() => { setAmendingId(null); setPage("list"); }}>
                Abbrechen
              </button>
              <button
                className="px-6 py-2.5 text-sm rounded-lg font-medium transition bg-gray-800 text-white hover:bg-gray-700"
                onClick={handleSubmit}
              >
                {amendingId ? "Änderung speichern" : effective267Steigerung > 3.5 ? "Rechnung & Honorarvereinbarung erstellen" : "Rechnung erstellen"}
              </button>
            </div>
          </div>
        )}

        {/* ═══ LIST PAGE ═══ */}
        {page === "list" && (
          <InvoiceListView
            invoices={invoices}
            kleinunternehmer={practice.kleinunternehmer}
            onView={handleView}
            onAmend={handleAmend}
            onDelete={handleDelete}
            onPrint={handlePrintInvoice}
            onPrintHV={handlePrintHV}
            onBack={handleNew}
          />
        )}

        {/* ═══ PREVIEW PAGE ═══ */}
        {page === "preview" && viewingInvoice && (() => {
          const viewHasHV = viewingInvoice.hasHV != null ? viewingInvoice.hasHV : viewingInvoice.lineItems.some((it) => it.steigerung != null && it.steigerung > 3.5);
          return (
          <div>
            {/* Tab toggle (only show if HV exists) */}
            {viewHasHV && (
              <div className="flex gap-1 mb-3">
                <button
                  className={`px-4 py-2 text-xs rounded-lg border transition ${previewTab === "rechnung" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  onClick={() => setPreviewTab("rechnung")}
                >
                  Rechnung
                </button>
                <button
                  className={`px-4 py-2 text-xs rounded-lg border transition ${previewTab === "honorar" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  onClick={() => setPreviewTab("honorar")}
                >
                  Honorarvereinbarung
                </button>
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {previewTab === "rechnung" || !viewHasHV ? (
                <InvoicePreview
                  practice={practice}
                  patient={viewingInvoice.patient}
                  invoiceMeta={viewingInvoice.invoiceMeta}
                  lineItems={viewingInvoice.lineItems}
                />
              ) : (
                <HonorarvereinbarungPreview
                  practice={practice}
                  patient={viewingInvoice.patient}
                  invoiceMeta={viewingInvoice.invoiceMeta}
                  lineItems={viewingInvoice.lineItems}
                />
              )}
            </div>
            <div className="flex gap-3 mt-4 justify-between">
              <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setPage("list")}>
                ← Erstellte Dokumente
              </button>
              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-amber-600 hover:border-amber-200 hover:bg-amber-50" onClick={() => handleAmend(viewingInvoice)}>
                  Ändern
                </button>
                <button className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-700" onClick={previewTab === "honorar" ? handlePrintCurrentHV : handlePrintCurrent}>
                  PDF herunterladen
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        <div className="mt-8 text-center text-xs text-gray-300">
          ephia Rechnungs-Prototyp · Nur Botulinum-Behandlungen · Daten werden sicher in Supabase gespeichert
        </div>
      </div>
    </div>
  );
}
