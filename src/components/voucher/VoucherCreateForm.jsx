import React, { useState } from "react";
import { parseDE } from "../../utils/helpers";

// Default validity: end of the 3rd year after issue (mirrors the regelmäßige
// Verjährung of 3 years from the end of the year the voucher was issued).
function defaultGueltigBis() {
  const y = new Date().getFullYear() + 3;
  return `${y}-12-31`;
}

export default function VoucherCreateForm({ suggestedNummer = "", practiceOrt = "", onCreate, onCancel, busy }) {
  const today = new Date().toISOString().slice(0, 10);
  const [nennwertStr, setNennwertStr] = useState("");
  const [gueltigBis, setGueltigBis] = useState(defaultGueltigBis());
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [anlass, setAnlass] = useState("");
  const [nummer, setNummer] = useState(suggestedNummer);
  const [ort, setOrt] = useState(practiceOrt);
  const [datum, setDatum] = useState(today);
  const [error, setError] = useState("");

  const nennwert = parseDE(nennwertStr);

  const submit = () => {
    if (!(nennwert > 0)) { setError("Bitte einen Gutscheinwert größer als 0 eingeben."); return; }
    setError("");
    onCreate({
      nennwert,
      gueltigBis,
      issuedAt: datum,
      purchaserName: purchaserName.trim(),
      purchaserEmail: purchaserEmail.trim(),
      anlass: anlass.trim(),
      receiptMeta: { nummer: nummer.trim(), ort: ort.trim(), datum },
    });
  };

  const label = "block text-xs font-semibold text-gray-600 mb-1";
  const input = "w-full px-3 py-2 rounded-lg border border-[#DFE3EB] text-sm focus:ring-2 focus:ring-gray-300 outline-none";

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button className="text-xs text-gray-400 hover:text-gray-600 mb-4" onClick={onCancel}>← Zurück zu Gutscheine</button>
      <h1 className="text-xl font-bold text-gray-800 mb-1">Neuer Wertgutschein</h1>
      <p className="text-sm text-gray-500 mb-6">Erzeugt einen Gutschein mit eindeutigem Code/QR sowie einen Beleg (Rechnung) für die Käufer:in.</p>

      <div className="space-y-4">
        <div>
          <label className={label}>Gutscheinwert (€) *</label>
          <input className={input} inputMode="decimal" placeholder="z.B. 100" value={nennwertStr} onChange={(e) => setNennwertStr(e.target.value)} />
        </div>

        <div>
          <label className={label}>Gültig bis</label>
          <input className={input} type="date" value={gueltigBis} onChange={(e) => setGueltigBis(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Käufer:in (Name)</label>
            <input className={input} placeholder="für den Beleg" value={purchaserName} onChange={(e) => setPurchaserName(e.target.value)} />
          </div>
          <div>
            <label className={label}>E-Mail (optional)</label>
            <input className={input} placeholder="zum Versand" value={purchaserEmail} onChange={(e) => setPurchaserEmail(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={label}>Anlass (optional)</label>
          <input className={input} placeholder="z.B. Geburtstag" value={anlass} onChange={(e) => setAnlass(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className={label}>Beleg-Nr.</label>
            <input className={input} placeholder="z.B. G-0001" value={nummer} onChange={(e) => setNummer(e.target.value)} />
          </div>
          <div>
            <label className={label}>Ort</label>
            <input className={input} value={ort} onChange={(e) => setOrt(e.target.value)} />
          </div>
          <div>
            <label className={label}>Datum</label>
            <input className={input} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          className="w-full text-sm font-bold text-white bg-[#0066FF] hover:opacity-90 transition rounded-[10px] px-5 py-3 disabled:opacity-50"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "Wird erstellt…" : "Gutschein erstellen"}
        </button>
      </div>
    </div>
  );
}
