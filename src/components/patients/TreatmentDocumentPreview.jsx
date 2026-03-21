import React from "react";
import { fmtDate, fmtPhone } from "../../utils/helpers";

// ═══════════════════ Treatment Document Preview (for PDF) ═══════════════════

// Pre-render a numbered circle as a tiny canvas → data URL image
// html2canvas renders <img> tags perfectly, unlike CSS text centering
export function makeDotImage(number) {
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

export default function TreatmentDocPreview({ practice, patient, treatmentDoc, einheit, id: previewId, facePhoto }) {
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

