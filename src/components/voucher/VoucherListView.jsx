import React, { useState } from "react";
import { fmt, fmtDate } from "../../utils/helpers";
import { computeStatus, VOUCHER_STATUS } from "../../utils/vouchers";

const STATUS_LABEL = {
  [VOUCHER_STATUS.AKTIV]: { text: "Aktiv", cls: "bg-green-100 text-green-700" },
  [VOUCHER_STATUS.TEIL]: { text: "Teilweise eingelöst", cls: "bg-amber-100 text-amber-700" },
  [VOUCHER_STATUS.EINGELOEST]: { text: "Eingelöst", cls: "bg-gray-200 text-gray-600" },
  [VOUCHER_STATUS.ABGELAUFEN]: { text: "Abgelaufen", cls: "bg-red-100 text-red-700" },
  [VOUCHER_STATUS.STORNIERT]: { text: "Storniert", cls: "bg-gray-200 text-gray-500" },
};

export default function VoucherListView({ vouchers = [], onNew, onView, onDelete, onBack }) {
  const [q, setQ] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...vouchers].sort((a, b) => String(b.issuedAt || b._createdAt || "").localeCompare(String(a.issuedAt || a._createdAt || "")));
  const filtered = q.trim()
    ? sorted.filter((v) => {
        const hay = `${v.code} ${v.purchaserName || ""} ${v.anlass || ""}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      })
    : sorted;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onBack}>← Zurück</button>
        <button
          className="text-sm font-medium text-white bg-[#0066FF] hover:opacity-90 transition rounded-[10px] px-4 py-2"
          onClick={onNew}
        >
          + Neuer Gutschein
        </button>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-1">Wertgutscheine</h1>
      <p className="text-sm text-gray-500 mb-5">Geschenk- und Wertgutscheine, die auf Behandlungen angerechnet werden können.</p>

      {vouchers.length > 0 && (
        <input
          className="w-full mb-4 px-3 py-2 rounded-lg border border-[#DFE3EB] text-sm focus:ring-2 focus:ring-gray-300 outline-none"
          placeholder="Suche nach Code, Käufer:in oder Anlass…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-16 border border-dashed border-[#DFE3EB] rounded-[10px]">
          {vouchers.length === 0 ? "Noch keine Gutscheine erstellt." : "Keine Treffer."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => {
            const status = computeStatus(v, today);
            const badge = STATUS_LABEL[status] || STATUS_LABEL[VOUCHER_STATUS.AKTIV];
            const rest = Math.round((v.restwert || 0) * 100) / 100;
            const nenn = Math.round((v.nennwert || 0) * 100) / 100;
            return (
              <div key={v.id || v.code} className="flex items-center gap-3 bg-white rounded-[10px] px-4 py-3 shadow-sm">
                <button className="flex-1 text-left" onClick={() => onView(v)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-gray-800">{v.code}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {v.purchaserName ? `${v.purchaserName} · ` : ""}
                    {v.gueltigBis ? `gültig bis ${fmtDate(v.gueltigBis)}` : "ohne Ablauf"}
                  </div>
                </button>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{fmt(rest)} €</div>
                  {rest !== nenn && <div className="text-[11px] text-gray-400">von {fmt(nenn)} €</div>}
                </div>
                <button className="text-gray-300 hover:text-red-500 transition" title="Löschen" onClick={() => onDelete(v)}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a1 1 0 011-1h2a1 1 0 011 1v2" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
