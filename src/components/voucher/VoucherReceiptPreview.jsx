import React from "react";
import { fmtDate, fmt, fmtPhone } from "../../utils/helpers";

// ═══════════════════ Voucher Sale Receipt (Rechnung über einen Wertgutschein) ═══════════════════
// The invoice the PURCHASER receives when buying the voucher. Mirrors InvoicePreview.
// As a Mehrzweckgutschein (§ 3 Abs. 14 UStG) the sale itself is NOT a taxable supply —
// VAT only arises on redemption, when the treatment is rendered. So no MwSt here.

export default function VoucherReceiptPreview({ practice, purchaser: rawPurchaser, voucher, receiptMeta }) {
  const purchaser = rawPurchaser || {};
  const nennwert = Number(voucher?.nennwert) || 0;

  const S = {
    page: { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px", lineHeight: "1.55", color: "#1a1a1a", padding: "40px 44px", width: "210mm", minHeight: "297mm", margin: "0 auto", background: "white", position: "relative", boxSizing: "border-box", overflow: "hidden" },
    h: { fontSize: "16px", fontWeight: "700", color: "#222", marginBottom: "4px" },
    addr: { fontSize: "11px", color: "#444", marginBottom: "28px" },
    patLabel: { fontSize: "9.5px", color: "#999", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" },
    thFirst: { textAlign: "left", padding: "5px 6px 5px 0", fontWeight: "600", borderBottom: "1.5px solid #222" },
    thRLast: { textAlign: "right", padding: "5px 0 5px 6px", fontWeight: "600", borderBottom: "1.5px solid #222" },
    tdFirst: { padding: "5px 6px 5px 0", borderBottom: "0.5px solid #e5e5e5", wordWrap: "break-word", overflow: "hidden" },
    tdRLast: { padding: "5px 0 5px 6px", textAlign: "right", borderBottom: "0.5px solid #e5e5e5" },
  };

  return (
    <div id="voucher-receipt-preview" style={S.page}>
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
        <div style={S.patLabel}>Rechnungsempfänger:in</div>
        <div>{[purchaser.vorname, purchaser.nachname].filter(Boolean).join(" ") || purchaser.name || "—"}</div>
        <div>{purchaser.address1 || ""}</div>
        <div>{purchaser.address2 || ""}</div>
        {purchaser.country && purchaser.country !== "Deutschland" && <div>{purchaser.country}</div>}
      </div>

      <div style={{ marginBottom: "6px" }}>
        {receiptMeta.ort}{receiptMeta.ort && receiptMeta.datum ? ", " : ""}{fmtDate(receiptMeta.datum)}
      </div>
      <div style={{ fontWeight: "700", fontSize: "12px", marginBottom: "18px" }}>
        Rechnung Nr. {receiptMeta.nummer || "X"}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "74%" }} />
          <col style={{ width: "26%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.thFirst}>Bezeichnung</th>
            <th style={S.thRLast}>Betrag (€)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={S.tdFirst}>
              Wertgutschein Nr. {voucher?.code || "—"}
              {voucher?.gueltigBis ? ` · gültig bis ${fmtDate(voucher.gueltigBis)}` : ""}
            </td>
            <td style={S.tdRLast}>{fmt(nennwert)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: "700", borderTop: "1.5px solid #222" }}>
            <td style={{ padding: "5px 6px 5px 0", textAlign: "right" }}>Gesamtbetrag</td>
            <td style={{ padding: "5px 0 5px 6px", textAlign: "right" }}>{fmt(nennwert)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: "8px 0 0 0", fontSize: "9px", color: "#888" }}>
              Mehrzweckgutschein gemäß § 3 Abs. 14 UStG. Die Umsatzsteuer entsteht erst bei Einlösung
              im Rahmen der erbrachten Leistung, nicht beim Erwerb des Gutscheins.
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ fontSize: "10px", color: "#444", marginBottom: "16px" }}>
        Dieser Gutschein ist übertragbar und kann auf eine Behandlung bei {practice.name || "uns"} angerechnet werden.
        Eine Barauszahlung des Gutscheinwerts ist nicht möglich.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#888", borderTop: "1px solid #ccc", paddingTop: "8px", position: "absolute", bottom: "40px", left: "44px", right: "44px" }}>
        <div>
          <div>{fmtPhone(practice.phone)}</div>
          <div>{practice.email}</div>
          {practice.steuernummer && <div>Steuernummer: {practice.steuernummer}</div>}
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
