import React, { useEffect, useRef, useState } from "react";
import { fmt } from "../../utils/helpers";

const SCAN_REGION_ID = "voucher-scan-region";

// Redemption control for the invoice form. Resolves a code (scanned or typed)
// and hands it to the parent via onApply(code); the parent does the DB lookup +
// decrypt and sets `applied` / `error`. Pure UI + camera handling here.
export default function VoucherRedeemField({ applied, gesamt, onApply, onClear, error, looking }) {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState("");
  const scannerRef = useRef(null);

  const stopScanner = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) { try { await s.stop(); } catch (e) { /* already stopped */ } try { await s.clear(); } catch (e) { /* noop */ } }
    setScanning(false);
  };

  useEffect(() => () => { stopScanner(); }, []);

  const startScanner = async () => {
    setScanning(true);
    setCamError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // Wait a tick so the region div is mounted.
      await new Promise((r) => setTimeout(r, 0));
      const scanner = new Html5Qrcode(SCAN_REGION_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          await stopScanner();
          const clean = String(decodedText).trim();
          setCode(clean);
          onApply(clean);
        },
        () => {}
      );
    } catch (e) {
      console.error("Scanner start failed:", e);
      await stopScanner();
      setCamError("Kamera konnte nicht gestartet werden. Bitte Code manuell eingeben.");
    }
  };

  const applied_betrag = applied ? Math.min(Math.round((applied.restwert || 0) * 100) / 100, Math.max(0, Math.round((Number(gesamt) || 0) * 100) / 100)) : 0;

  if (applied) {
    return (
      <div className="mb-6 pb-5 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Gutschein einlösen</p>
        <div className="flex items-start justify-between gap-3 bg-green-50 rounded-lg px-3 py-2.5">
          <div className="min-w-0">
            <div className="font-mono text-sm font-semibold text-gray-800 break-all">{applied.code}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Guthaben {fmt(applied.restwert || 0)} € · angerechnet <span className="font-semibold text-green-700">−{fmt(applied_betrag)} €</span>
            </div>
          </div>
          <button className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0 mt-0.5" onClick={onClear}>Entfernen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 pb-5 border-b border-gray-100">
      <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Gutschein einlösen</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="w-full sm:flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#DFE3EB] text-sm font-mono focus:ring-2 focus:ring-gray-300 outline-none"
          placeholder="Gutscheincode eingeben"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) { e.preventDefault(); onApply(code.trim()); } }}
        />
        <div className="flex gap-2">
          <button
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-[#DFE3EB] text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            onClick={() => onApply(code.trim())}
            disabled={!code.trim() || looking}
          >
            {looking ? "…" : "Anwenden"}
          </button>
          <button
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-[#DFE3EB] text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap inline-flex items-center justify-center gap-1.5"
            onClick={scanning ? stopScanner : startScanner}
            title="QR-Code scannen"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6zM14 14h2v2h-2v-2zM18 14h2v2h-2v-2zM16 18h2v2h-2v-2zM18 18h2v2h-2v-2z" /></svg>
            {scanning ? "Stop" : "Scannen"}
          </button>
        </div>
      </div>
      {scanning && <div id={SCAN_REGION_ID} className="mt-3 rounded-lg overflow-hidden w-full" style={{ maxWidth: 320 }} />}
      {(error || camError) && <div className="text-sm text-red-600 mt-2">{error || camError}</div>}
    </div>
  );
}
