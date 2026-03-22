import React, { useState, useRef, useEffect } from "react";
import { fmtDate, fmt, fmtPhone, parseDE, evalAmount, buildLineItems, calcWeightedForGesamt, calcGesamt, calcGoaBetrag, parsePlzOrt, combinePlzOrt, nextInvoiceNumber, toDE, fmtUnits, lookupPlz } from "../../utils/helpers";
import { CONSENT_TEMPLATES } from "../consent/consentTemplates";
import { spawnConfetti } from "../ui/ConfettiBurst";
import { FACE_IMAGE_B64, ZUSCHLAEGE, PRIORITY_COUNTRIES, OTHER_COUNTRIES } from "../../constants";
import InfoTooltip from "../ui/InfoTooltip";
import PraeparatAutocomplete from "../ui/PraeparatAutocomplete";
import TreatmentMap from "../treatment/TreatmentMap";
import TreatmentDocPreview from "./TreatmentDocumentPreview";
// ═══════════════════ Patient Detail View ═══════════════════

export default function PatientDetailView({ patient, invoices, behandlungen = [], docsMigrated, kleinunternehmer, practice, onBack, onView, onViewHV, onDownload, onDownloadHV, onPrint, onPrintHV, onDelete, onUpdateInvoice, onUpdatePatient, onCreateInvoice, onQuickInvoice, onNewHV, onStartConsent, onViewConsent, onDownloadConsent, onCreateBehandlung, onUpdateBehandlung, onDeleteBehandlung, onLinkDocToBehandlung, activityLog = [], onLogActivity }) {
  const rawData = (patient._raw && typeof patient._raw.data === "object" && patient._raw.data) ? patient._raw.data : {};
  const email = (rawData.email || patient.email || "").toLowerCase();
  const [editingPatient, setEditingPatient] = React.useState(false);
  const [confirmDeleteTreatment, setConfirmDeleteTreatment] = React.useState(null);
  const [confirmDeleteBeh, setConfirmDeleteBeh] = React.useState(null);
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

  // Check if a consent form has any "Ja" (risk) answers
  const hasConsentRisks = (inv) => {
    const a = inv.consentData?.answers || inv.consentData || {};
    const tpl = CONSENT_TEMPLATES.find(t => t.id === (inv.consentData?.templateId));
    if (!tpl) return false;
    for (const q of tpl.questions) { if (a[q.id] === true) return true; }
    if (tpl.additionalQuestionsWomen && a.geschlecht === "w") {
      for (const q of tpl.additionalQuestionsWomen) { if (a[q.id] === true) return true; }
    }
    return false;
  };
  const matchingInvoices = invoices.filter((inv) => {
    if (inv._patientDbId && patientDbId) return inv._patientDbId === patientDbId;
    const invEmail = ((inv.patient || {}).email || "").toLowerCase();
    return email && invEmail && invEmail === email;
  });
  const rechnungsInvoices = matchingInvoices.filter((inv) => !inv._standalone && !inv._hvOnly && !inv._consentForm);
  const hvInvoices = matchingInvoices.filter((inv) => !inv._standalone && !inv._consentForm && (inv.hasHV != null ? inv.hasHV : (inv.lineItems || []).some((it) => it.steigerung != null && it.steigerung > 3.5)));
  const consentInvoices = matchingInvoices.filter((inv) => inv._consentForm);

  // Three-column layout: center view state replaces old tab state
  const [centerView, setCenterView] = React.useState("timeline");
  const [newBehandlungOpen, setNewBehandlungOpen] = React.useState(false);
  const [newBehDatum, setNewBehDatum] = React.useState(new Date().toISOString().slice(0, 10));
  const [newBehZeit, setNewBehZeit] = React.useState("");
  const [expandedBeh, setExpandedBeh] = React.useState(null);
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

  // Timeline states
  const [timelineSearch, setTimelineSearch] = React.useState("");
  const [timelineFilter, setTimelineFilter] = React.useState("alle");

  // Sidebar collapsible states
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const [adressdatenOpen, setAdressdatenOpen] = React.useState(isDesktop);
  const [medizinischeOpen, setMedizinischeOpen] = React.useState(isDesktop);
  const [anamneseOpen, setAnamneseOpen] = React.useState(isDesktop);

  // Profile photo upload ref
  const profilePhotoInputRef = React.useRef(null);

  const downloadTreatmentDoc = async (inv) => {
    setTreatmentDocTarget(inv);
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
    if (pendingQuickInvoice && centerView === "behandlung_detail" && viewingTreatment) {
      const realInv = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "—");
      const latestInv = realInv.length > 0 ? realInv.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, realInv[0]) : null;
      setQuickInvoiceNummer(latestInv ? nextInvoiceNumber(latestInv.invoiceMeta.nummer) || latestInv.invoiceMeta.nummer : "");
      setQuickInvoiceWunschStr("");
      setQuickInvoicePreisStr("");
      setQuickInvoiceOpen(true);
      setPendingQuickInvoice(false);
    }
  }, [pendingQuickInvoice, centerView, viewingTreatment]);

  // Computed data for overview/right sidebar
  const patientBeh = behandlungen.filter(b => b._patientId === patientDbId).sort((a, b) => (b.datum || b._createdAt || "").localeCompare(a.datum || a._createdAt || ""));
  const lastActivity = matchingInvoices.length > 0 ? matchingInvoices.reduce((best, inv) => {
    const t = inv._createdAt || inv.savedAt || "";
    const bt = best ? (best._createdAt || best.savedAt || "") : "";
    return t > bt ? inv : best;
  }, null) : null;

  // Auto-pull latest face photo from treatment docs
  const latestFacePhoto = React.useMemo(() => {
    if (rawData.profilePhoto) return rawData.profilePhoto;
    const treatmentDocs = matchingInvoices
      .filter(inv => inv.treatmentDoc?.facePhoto && inv.treatmentDoc.facePhoto !== FACE_IMAGE_B64)
      .sort((a, b) => (b._createdAt || b.savedAt || "").localeCompare(a._createdAt || a.savedAt || ""));
    return treatmentDocs[0]?.treatmentDoc?.facePhoto || null;
  }, [matchingInvoices, rawData.profilePhoto]);

  // Helper functions for right sidebar
  const getDocLabel = (inv) => {
    if (inv._consentForm || inv._docType === "aufklaerung") return "Aufklärungsbogen";
    if (inv._hvOnly || inv._docType === "hv") return "Honorarvereinbarung";
    if ((inv._standalone || inv._treatmentDocOnly) || inv._docType === "behandlungsdoku") return "Behandlungsdoku";
    return "Rechnung";
  };
  const getDocStatus = (inv) => {
    if (inv._consentForm || inv._docType === "aufklaerung") {
      const sigs = inv.consentData?._signatures;
      const risk = hasConsentRisks(inv);
      if (inv.consentData?.refused) return { label: "Abgelehnt", color: "text-red-500", risk };
      if (sigs?.patient && sigs?.doctor) return { label: "Unterschrieben", color: "text-green-600", risk };
      if (sigs?.patient) return { label: "Ärzt:in fehlt", color: "text-amber-500", risk };
      return { label: "Entwurf", color: "text-gray-400", risk };
    }
    if (inv._hvOnly || inv._docType === "hv") {
      const sigs = inv._signatures;
      if (inv._signedHvUpload) return { label: "Hochgeladen", color: "text-green-600" };
      if (sigs?.patient && sigs?.doctor) return { label: "Unterschrieben", color: "text-green-600" };
      if (sigs?.patient) return { label: "Ärzt:in fehlt", color: "text-amber-500" };
      return { label: "—", color: "text-gray-400" };
    }
    if (inv.paymentStatus === "bezahlt") return { label: "Bezahlt", color: "text-green-600" };
    return { label: "Ausstehend", color: "text-amber-500" };
  };
  const handleDocClick = (inv) => {
    if (inv._consentForm || inv._docType === "aufklaerung") { onViewConsent && onViewConsent(inv); }
    else if (inv._hvOnly || inv._docType === "hv") { onViewHV && onViewHV(inv); }
    else if ((inv._standalone || inv._treatmentDocOnly) || inv._docType === "behandlungsdoku") {
      setViewingTreatment(inv);
      setCenterView("behandlung_detail");
    }
    else { onView && onView(inv); }
  };

  // Timeline building
  const buildTimeline = React.useMemo(() => {
    const patientActivities = (activityLog || []).filter(a => a._patientId === patientDbId);
    const trackedEntityIds = new Set(patientActivities.map(a => a.entityId));
    const legacyEntries = matchingInvoices
      .filter(inv => inv._supabaseId && !trackedEntityIds.has(inv._supabaseId))
      .map(inv => ({
        _id: `legacy-${inv._supabaseId}`,
        entityType: inv._docType || (inv._consentForm ? "aufklaerung" : inv._hvOnly ? "hv" : inv._standalone ? "behandlungsdoku" : "rechnung"),
        entityId: inv._supabaseId,
        actionType: "created",
        description: `${inv._consentForm || inv._docType === "aufklaerung" ? "Aufklärungsbogen" : inv._hvOnly || inv._docType === "hv" ? "Honorarvereinbarung" : inv._standalone || inv._docType === "behandlungsdoku" ? "Behandlungsdoku" : "Rechnung"} erstellt${inv.invoiceMeta?.nummer && inv.invoiceMeta.nummer !== "—" ? ` (${inv.invoiceMeta.nummer})` : ""}`,
        _createdAt: inv._createdAt || inv.savedAt,
        _inv: inv,
      }));
    const trackedBehIds = new Set(patientActivities.filter(a => a.entityType === "behandlung").map(a => a.entityId));
    const legacyBeh = patientBeh
      .filter(b => b._id && !trackedBehIds.has(b._id))
      .map(b => ({
        _id: `legacy-beh-${b._id}`,
        entityType: "behandlung",
        entityId: b._id,
        actionType: "created",
        description: `Behandlung am ${fmtDate(b.datum)} erstellt`,
        _createdAt: b._createdAt,
      }));
    return [...patientActivities, ...legacyEntries, ...legacyBeh]
      .sort((a, b) => (b._createdAt || "").localeCompare(a._createdAt || ""));
  }, [activityLog, patientDbId, matchingInvoices, patientBeh]);

  const filteredTimeline = buildTimeline.filter(entry => {
    if (timelineFilter !== "alle" && entry.entityType !== timelineFilter) return false;
    if (timelineSearch && !(entry.description || "").toLowerCase().includes(timelineSearch.toLowerCase())) return false;
    return true;
  });

  const groupedTimeline = {};
  for (const entry of filteredTimeline) {
    const date = entry._createdAt ? new Date(entry._createdAt) : new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    if (!groupedTimeline[key]) groupedTimeline[key] = { label, entries: [] };
    groupedTimeline[key].entries.push(entry);
  }

  const entityIcon = (type) => {
    switch(type) {
      case "aufklaerung": return "\u{1F4CB}";
      case "hv": return "\u{1F4DD}";
      case "behandlungsdoku": return "\u{1F489}";
      case "rechnung": return "\u{1F4C4}";
      case "behandlung": return "\u{1F5D3}";
      case "patient": return "\u{1F464}";
      default: return "\u{1F4CC}";
    }
  };
  const entityActionColor = (action) => {
    switch(action) {
      case "created": return "text-green-600";
      case "updated": return "text-blue-600";
      case "deleted": return "text-red-500";
      default: return "text-gray-600";
    }
  };

  const handleTimelineClick = (entry) => {
    if (entry._inv) {
      const inv = entry._inv;
      if (inv._consentForm || inv._docType === "aufklaerung") { onViewConsent && onViewConsent(inv); }
      else if (inv._hvOnly || inv._docType === "hv") { onViewHV && onViewHV(inv); }
      else if (inv._standalone || inv._docType === "behandlungsdoku") { setViewingTreatment(inv); setCenterView("behandlung_detail"); }
      else { onView && onView(inv); }
    } else if (entry.entityId) {
      const inv = matchingInvoices.find(i => i._supabaseId === entry.entityId);
      if (inv) {
        if (inv._consentForm || inv._docType === "aufklaerung") { onViewConsent && onViewConsent(inv); }
        else if (inv._hvOnly || inv._docType === "hv") { onViewHV && onViewHV(inv); }
        else if (inv._standalone || inv._docType === "behandlungsdoku") { setViewingTreatment(inv); setCenterView("behandlung_detail"); }
        else { onView && onView(inv); }
      }
    }
  };

  // Patient edit helpers
  const isEditing = patientEditField === "all";
  const startEdit = () => { setPatientEditField("all"); setEditData({ vorname: patient.vorname || rawData.vorname || "", nachname: patient.nachname || rawData.nachname || "", email: rawData.email || patient.email || "", phone: rawData.phone || "", address1: rawData.address1 || "", address2: rawData.address2 || "", country: rawData.country || "Deutschland" }); };
  const saveAll = () => { if (onUpdatePatient) onUpdatePatient(editData); setPatientEditField(null); };
  const cancelAll = () => setPatientEditField(null);
  const inputCls = "border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400";

  // Profile photo upload handler
  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      if (onUpdatePatient) onUpdatePatient({ ...rawData, profilePhoto: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Anamnese data
  const anamnese = (rawData.anamnese || []).slice().sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Back button */}
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100">
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onBack}>&larr; Zur&uuml;ck zur Patient:innenliste</button>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-col lg:flex-row">
        {/* ═══════════════════ LEFT SIDEBAR ═══════════════════ */}
        <div className="lg:w-64 xl:w-72 border-b lg:border-b-0 lg:border-r border-gray-100 lg:sticky lg:top-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          {/* Patient photo + name */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button className="flex-shrink-0 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition" style={{ width: 48, height: 48 }} onClick={() => profilePhotoInputRef.current?.click()} title="Foto hochladen">
                {latestFacePhoto ? (
                  <img src={latestFacePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  </div>
                )}
              </button>
              <input ref={profilePhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-800 truncate">{patient.vorname} {patient.nachname}</h2>
                <button className="text-[10px] text-blue-500 hover:text-blue-700 transition" onClick={startEdit}>Bearbeiten</button>
              </div>
            </div>
          </div>

          {/* Patient edit form (inline in sidebar) */}
          {isEditing && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input className={inputCls + " w-full"} value={editData.vorname} placeholder="Vorname" onChange={(e) => setEditData({ ...editData, vorname: e.target.value })} autoFocus />
                  <input className={inputCls + " w-full"} value={editData.nachname} placeholder="Nachname" onChange={(e) => setEditData({ ...editData, nachname: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">E-Mail</label>
                  <input type="email" className={inputCls + " w-full mt-0.5"} value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Telefon</label>
                  <input type="tel" className={inputCls + " w-full mt-0.5"} value={editData.phone} placeholder="+49 123 456789" onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Stra&szlig;e</label>
                  <input className={inputCls + " w-full mt-0.5"} value={editData.address1} placeholder="Musterstra&szlig;e 5" onChange={(e) => setEditData({ ...editData, address1: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <div className="w-20">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">PLZ</label>
                    <input className={inputCls + " w-full mt-0.5"} value={parsePlzOrt(editData.address2).plz} placeholder="PLZ" maxLength={5} inputMode="numeric" onChange={(e) => { const v = e.target.value; const { ort } = parsePlzOrt(editData.address2); setEditData({ ...editData, address2: combinePlzOrt(v, ort) }); if (v.length === 5 && !ort && (!editData.country || editData.country === "Deutschland")) lookupPlz(v).then(city => { if (city) { setEditData(d => ({ ...d, address2: combinePlzOrt(v, parsePlzOrt(d.address2).ort || city) })); } }); }} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Ort</label>
                    <input data-ort-field className={inputCls + " w-full mt-0.5"} value={parsePlzOrt(editData.address2).ort} placeholder="Ort" onChange={(e) => { const { plz } = parsePlzOrt(editData.address2); setEditData({ ...editData, address2: combinePlzOrt(plz, e.target.value) }); }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Land</label>
                  <select className={inputCls + " w-full mt-0.5 bg-white"} value={editData.country} onChange={(e) => setEditData({ ...editData, country: e.target.value })}>
                    {PRIORITY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option disabled>────────────</option>
                    {OTHER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition" onClick={saveAll}>Speichern</button>
                  <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={cancelAll}>Abbrechen</button>
                </div>
              </div>
            </div>
          )}

          {/* Adressdaten section */}
          <div className="border-b border-gray-100">
            <button className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition" onClick={() => setAdressdatenOpen(!adressdatenOpen)}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Adressdaten</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${adressdatenOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {adressdatenOpen && (
              <div className="px-4 pb-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">E-Mail</span>
                    <span>{email ? <a href={`mailto:${email}`} className="text-blue-500 hover:text-blue-700">{email}</a> : <span className="text-gray-400">--</span>}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Telefon</span>
                    <span className="text-gray-600">{rawData.phone ? (
                      <>
                        <a href={`tel:${rawData.phone.replace(/[^\d+]/g, "")}`} className="lg:hidden text-blue-500 hover:text-blue-700">{fmtPhone(rawData.phone)}</a>
                        <span className="hidden lg:inline">{fmtPhone(rawData.phone)}</span>
                      </>
                    ) : <span className="text-gray-400">--</span>}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Adresse</span>
                    <span className="text-gray-600 text-right">{rawData.address1 ? `${rawData.address1}, ${rawData.address2 || ""}` : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Land</span>
                    <span className="text-gray-600">{rawData.country || "Deutschland"}</span>
                  </div>
                </div>
                <button className="mt-2 text-[10px] text-blue-500 hover:text-blue-700 transition" onClick={startEdit}>Bearbeiten</button>
              </div>
            )}
          </div>

          {/* Medizinische Daten section */}
          <div className="border-b border-gray-100">
            <button className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition" onClick={() => setMedizinischeOpen(!medizinischeOpen)}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Medizinische Daten</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${medizinischeOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {medizinischeOpen && (
              <div className="px-4 pb-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Geschlecht</span>
                    <span className="text-gray-600">{rawData.geschlecht === "w" ? "Weiblich" : rawData.geschlecht === "m" ? "M\u00e4nnlich" : rawData.geschlecht === "d" ? "Divers" : rawData.geschlecht || "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Geburtsdatum</span>
                    <span className="text-gray-600">{rawData.geburtsdatum ? new Date(rawData.geburtsdatum).toLocaleDateString("de-DE") : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gr\u00f6\u00dfe</span>
                    <span className="text-gray-600">{rawData.groesse ? `${rawData.groesse} cm` : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gewicht</span>
                    <span className="text-gray-600">{rawData.gewicht ? `${rawData.gewicht} kg` : "--"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Anamnese section */}
          <div className="border-b border-gray-100">
            <button className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition" onClick={() => setAnamneseOpen(!anamneseOpen)}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Anamnese</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${anamneseOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {anamneseOpen && (
              <div className="px-4 pb-3">
                {anamnese.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Noch keine Eintr\u00e4ge. Eintr\u00e4ge werden automatisch aus ausgef\u00fcllten Aufkl\u00e4rungsb\u00f6gen \u00fcbernommen.</p>
                ) : (
                  <div className="space-y-2">
                    {anamnese.map((entry, i) => (
                      <div key={entry.questionId || i} className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex-shrink-0 w-16">
                          <span className="text-[10px] text-gray-400 font-mono">
                            {entry.addedAt ? new Date(entry.addedAt).toLocaleDateString("de-DE") : "--"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 leading-snug">{entry.questionLabel}</p>
                          {entry.detailText && (
                            <p className="text-xs text-amber-700 mt-0.5 leading-snug">{entry.detailText}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mt-1" title="Positiver Befund" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ CENTER CONTENT ═══════════════════ */}
        <div className="flex-1 min-w-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          {centerView === "timeline" && (
            <>
              {/* Data Highlights bar */}
              <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Erstellt am</div>
                  <div className="text-xs text-gray-700 font-medium mt-0.5">{fmtDate(patient._raw?.created_at?.slice(0, 10))}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Behandlungen</div>
                  <div className="text-xs text-gray-700 font-medium mt-0.5">{patientBeh.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Letzte Aktivit&auml;t</div>
                  <div className="text-xs text-gray-700 font-medium mt-0.5">{lastActivity ? fmtDate(lastActivity._createdAt?.slice(0, 10)) : "--"}</div>
                </div>
              </div>

              {/* Timeline section */}
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Historie</h3>
                <div className="flex gap-2 items-center">
                  <input type="text" placeholder="Aktivit\u00e4ten durchsuchen..." className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} />
                  <select className="border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" value={timelineFilter} onChange={e => setTimelineFilter(e.target.value)}>
                    <option value="alle">Alle</option>
                    <option value="aufklaerung">Aufkl&auml;rung</option>
                    <option value="hv">HV</option>
                    <option value="behandlungsdoku">Behandlungsdoku</option>
                    <option value="rechnung">Rechnung</option>
                    <option value="behandlung">Behandlung</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>
              </div>

              {/* Timeline entries grouped by month */}
              <div>
                {Object.keys(groupedTimeline).length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400 text-xs">Noch keine Aktivit&auml;ten vorhanden.</div>
                )}
                {Object.keys(groupedTimeline).sort().reverse().map(key => {
                  const group = groupedTimeline[key];
                  return (
                    <div key={key}>
                      <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group.label}</span>
                      </div>
                      {group.entries.map(entry => (
                        <div key={entry._id || entry.entityId || Math.random()} className="flex gap-3 py-2.5 px-4 hover:bg-gray-50 transition cursor-pointer border-b border-gray-50" onClick={() => handleTimelineClick(entry)}>
                          <span className="text-sm flex-shrink-0 mt-0.5">{entityIcon(entry.entityType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700">{entry.description}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{entry._createdAt ? new Date(entry._createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                          </div>
                          <span className={`text-[10px] flex-shrink-0 mt-0.5 ${entityActionColor(entry.actionType)}`}>
                            {entry.actionType === "created" ? "Erstellt" : entry.actionType === "updated" ? "Aktualisiert" : entry.actionType === "deleted" ? "Gel\u00f6scht" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Behandlung Detail View ── */}
          {centerView === "behandlung_detail" && viewingTreatment && (() => {
            const inv = viewingTreatment;
            const td = inv.treatmentDoc;
            const einh = td.einheit || inv.einheit || "SE";
            const praep = td.praeparat || inv.praeparat || "";
            const datumStr = td.behandlungsDatum ? fmtDate(td.behandlungsDatum) : "\u2013";
            const hasInvoice = inv.invoiceMeta.nummer && inv.invoiceMeta.nummer !== "\u2014";
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
              const updated = { ...inv, treatmentDoc: updatedTd, lastModifiedAt: new Date().toISOString() };
              if (onUpdateInvoice) onUpdateInvoice(updated);
              setViewingTreatment(updated);
            };

            return (
              <div className="px-3 sm:px-5 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => { setViewingTreatment(null); setCenterView("timeline"); }}>&larr; Zur&uuml;ck zur &Uuml;bersicht</button>
                  {inv.lastModifiedAt && inv.lastModifiedAt !== inv.savedAt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded" title={`Zuletzt ge\u00e4ndert: ${new Date(inv.lastModifiedAt).toLocaleString("de-DE")}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Ge&auml;ndert {new Date(inv.lastModifiedAt).toLocaleDateString("de-DE")}
                    </span>
                  )}
                </div>
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
                          <button className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={() => { saveInlineField("date", inlineTempDate); setEditDate(false); }}>{"\u2713"}</button>
                          <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={() => setEditDate(false)}>{"\u2715"}</button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Praeparat */}
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pr&auml;parat</span>
                        {!editPraep ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-gray-700">{praep || "\u2014"}</p>
                            <button className={editBtnCls} title="Pr&auml;parat bearbeiten" onClick={() => { setInlineTempPraep(praep); setInlineTempEinheit(einh); setEditPraep(true); }}>{pencilIcon}</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-0.5">
                            <input className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-36" value={inlineTempPraep} placeholder="z.B. Bocouture" onChange={(e) => setInlineTempPraep(e.target.value)} />
                            <select className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" value={inlineTempEinheit} onChange={(e) => setInlineTempEinheit(e.target.value)}>
                              <option value="ml">ml</option><option value="SE">SE</option><option value="IE">IE</option>
                            </select>
                            <button className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={() => { saveInlineField("praeparat", { praep: inlineTempPraep, einh: inlineTempEinheit }); setEditPraep(false); }}>{"\u2713"}</button>
                            <button className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition" onClick={() => setEditPraep(false)}>{"\u2715"}</button>
                          </div>
                        )}
                      </div>

                      {/* Injektionspunkte */}
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
                                <span className="text-sm text-gray-700">{m.amount}{String(m.amount).match(/[xX\u00d7*]/) ? ` = ${evalAmount(m.amount)}` : ""} {einh}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verkn&uuml;pfte Rechnung */}
                      {hasInvoice && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Verkn&uuml;pfte Rechnung</span>
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
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{td.notes || "\u2014"}</p>
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
                            const ri = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "\u2014");
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
                      <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition" onClick={() => setConfirmDeleteTreatment(inv)}>Behandlung l&ouml;schen</button>
                    </div>
                  </div>
                </div>

                {/* Quick-Invoice Modal */}
                {quickInvoiceOpen && (() => {
                  const qPreisProMl = parseDE(quickInvoicePreisStr);
                  const isAusland = (patient._raw?.data?.country || patient.country || "Deutschland") !== "Deutschland";
                  const qiIsMedical = false;
                  const noMwst = kleinunternehmer || isAusland || qiIsMedical;
                  const qMl = totalUnits;

                  const defaultItems = buildLineItems(praep, qMl, qPreisProMl, [], [], null, einh);
                  const defaultNetto = defaultItems.reduce((s, it) => s + it.betrag, 0);
                  const defaultGesamt = noMwst ? defaultNetto : Math.round((defaultNetto * 1.19) * 100) / 100;

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

                  const realInvoices = invoices.filter(i => i.invoiceMeta?.nummer && i.invoiceMeta.nummer !== "\u2014");
                  const latestInv = realInvoices.length > 0 ? realInvoices.reduce((best, i) => { const t = i._createdAt || i.savedAt || ""; const bt = best._createdAt || best.savedAt || ""; return t > bt ? i : best; }, realInvoices[0]) : null;

                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setQuickInvoiceOpen(false)}>
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-3">
                          <h3 className="text-sm font-semibold text-gray-800 mb-1">Schnellrechnung erstellen</h3>
                          <p className="text-xs text-gray-400 mb-1">{praep} &middot; {totalUnitsStr} {einh} &middot; {markerCount} {markerCount === 1 ? "Punkt" : "Punkte"}</p>
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
                              <label className="block text-xs font-medium text-gray-500 mb-0.5">Preis pro {einh} (&euro;)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="z.B. 4,50"
                                value={quickInvoicePreisStr}
                                onChange={(e) => setQuickInvoicePreisStr(e.target.value)}
                                autoFocus
                              />
                              {qPreisProMl > 0 && <p className="text-xs text-gray-400 mt-0.5">Materialkosten: {materialkosten.toFixed(2).replace(".", ",")} &euro;</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-0.5">Gesamtbetrag (&euro;)</label>
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
                                    {effectiveMax > 3.5 && <span className="ml-1 text-gray-400 text-xs">&sect;2 GO&Auml;</span>}
                                  </div>
                                  {effectiveMax > 3.5 && (
                                    <div className="mt-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                                      &Uuml;ber 3,5-fach: Eine Honorarvereinbarung gem&auml;&szlig; &sect;2 GO&Auml; wird zus&auml;tzlich erstellt.
                                    </div>
                                  )}
                                  {effectiveMax <= 0 && quickInvoiceWunschStr && (
                                    <div className="text-xs text-red-500 mt-1">Betrag ist zu niedrig f&uuml;r die Materialkosten.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {qPreisProMl > 0 && gesamt > 0 && (
                            <div className="mt-4 flex justify-between items-center text-sm font-semibold text-green-600">
                              <span>Dein Verdienst</span>
                              <span>{verdienst > 0 ? verdienst.toFixed(2).replace(".", ",") : "\u2013"} &euro;</span>
                            </div>
                          )}

                          {inv.treatmentDoc && (inv.treatmentDoc.markers?.length > 0 || inv.treatmentDoc.amount) && (
                            <label className="flex items-start gap-2 cursor-pointer select-none mt-3">
                              <input type="checkbox" className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border-gray-300 text-blue-500 focus:ring-blue-400" checked={quickInvoiceAttachTreatment} onChange={(e) => setQuickInvoiceAttachTreatment(e.target.checked)} />
                              <span className="text-xs text-gray-500">Behandlungsdokumentation ohne Notizen an Rechnung anh&auml;ngen</span>
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
                            {quickInvoiceSaving ? "Wird erstellt\u2026" : (effectiveMax > 3.5 ? "Dokumente erstellen" : "Rechnung erstellen")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* ── Behandlungen Add View ── */}
          {centerView === "behandlungen_add" && (() => {
            const linkedInv = newTreatmentInvoiceId ? matchingInvoices.find(i => i.id === newTreatmentInvoiceId) : null;
            const showPraeparatFields = !linkedInv;
            const activeEinheit = linkedInv ? (linkedInv.einheit || "SE") : newTreatmentEinheit;
            return (
              <div className="px-3 sm:px-5 py-4" style={{ maxWidth: 780 }}>
                <button className="text-xs text-gray-400 hover:text-gray-600 mb-3" onClick={() => { setCenterView("timeline"); setEditingTreatmentInv(null); }}>&larr; Zur&uuml;ck</button>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">{editingTreatmentInv ? "Behandlung bearbeiten" : "Neue Behandlung dokumentieren"}</h3>

                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Left column: Details + Notizen */}
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
                        <label className="block text-xs font-medium text-gray-500 mb-0.5">Rechnung verkn&uuml;pfen</label>
                        <select
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                          value={newTreatmentInvoiceId || ""}
                          onChange={(e) => setNewTreatmentInvoiceId(e.target.value || null)}
                        >
                          <option value="">&mdash; Keine &mdash;</option>
                          {rechnungsInvoices.filter((inv) => {
                            if (!inv.treatmentDoc) return true;
                            if (editingTreatmentInv && inv.id === editingTreatmentInv.id) return true;
                            return false;
                          }).map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceMeta.nummer} &mdash; {fmtDate(inv.invoiceMeta.datum)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">Notizen</p>
                    <textarea
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      rows={4}
                      placeholder="Optionale Notizen zur Behandlung\u2026"
                      value={newTreatmentNotes}
                      onChange={(e) => setNewTreatmentNotes(e.target.value)}
                    />
                  </div>

                  {/* Right column: Praeparat + Injektionspunkte */}
                  <div className="flex-1 min-w-0">
                    {showPraeparatFields && (
                      <>
                        <div className="flex items-center gap-1 mb-1.5">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Pr&auml;parat</p>
                          <InfoTooltip>H&auml;ufig verwendete Pr&auml;parate kannst Du in den Praxis-Einstellungen speichern, um sie hier schnell auszuw&auml;hlen.</InfoTooltip>
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
                        invoiceMeta: { nummer: "\u2014", datum: "" },
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
                      setCenterView("behandlung_detail");
                    } else {
                      setCenterView("timeline");
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
                        Speichern &amp; Schnellrechnung erstellen
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        {/* ═══════════════════ RIGHT SIDEBAR (Behandlungen) ═══════════════════ */}
        <div className="lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-gray-100 lg:sticky lg:top-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Behandlungen ({patientBeh.length})</h3>
          </div>

          {/* New Behandlung button */}
          <div className="px-4 py-2 border-b border-gray-100">
            <button className="text-xs text-blue-500 hover:text-blue-700 font-medium transition" onClick={() => setNewBehandlungOpen(true)}>+ Neue Behandlung</button>
          </div>

          {/* New Behandlung form */}
          {newBehandlungOpen && (
            <div className="mx-4 my-2 p-3 border border-blue-100 rounded-lg bg-blue-50/50">
              <div className="text-xs font-semibold text-gray-700 mb-2">Neue Behandlung</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Datum</label>
                  <input type="date" value={newBehDatum} onChange={e => setNewBehDatum(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Uhrzeit (optional)</label>
                  <input type="time" value={newBehZeit} onChange={e => setNewBehZeit(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs rounded bg-gray-800 text-white hover:bg-gray-700 transition" onClick={async () => {
                  if (!newBehDatum) return;
                  try {
                    await onCreateBehandlung(patientDbId, { datum: newBehDatum, zeit: newBehZeit || "", status: "planned" });
                    setNewBehandlungOpen(false);
                    setNewBehDatum(new Date().toISOString().slice(0, 10));
                    setNewBehZeit("");
                  } catch (e) { alert("Fehler: " + e.message); }
                }}>Erstellen</button>
                <button className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition" onClick={() => setNewBehandlungOpen(false)}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* Behandlung cards */}
          {patientBeh.length === 0 && !newBehandlungOpen && (
            <div className="text-center py-8 text-gray-400 text-xs px-4">Noch keine Behandlungen vorhanden.</div>
          )}

          <div className="px-3 py-2">
            {patientBeh.map(beh => {
              const behDocs = matchingInvoices.filter(inv => inv._behandlungId === beh._id);
              const isExpanded = expandedBeh === beh._id;
              return (
                <div key={beh._id} className="mb-2 border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <button className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition" onClick={() => setExpandedBeh(isExpanded ? null : beh._id)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-gray-800">{fmtDate(beh.datum)}</span>
                      {beh.zeit && <span className="text-xs text-gray-500">{beh.zeit} Uhr</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${beh.status === "completed" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                        {beh.status === "completed" ? "Abgeschlossen" : "Geplant"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-400">{behDocs.length} Dok.</span>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {behDocs.length === 0 && (
                        <div className="px-3 py-4 text-center text-gray-400 text-xs">Noch keine Dokumente in dieser Behandlung.</div>
                      )}
                      {behDocs.map(doc => {
                        const status = getDocStatus(doc);
                        return (
                          <button key={doc._supabaseId || doc.id} className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0" onClick={() => handleDocClick(doc)}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-gray-400 w-3">{"\u{1F4C4}"}</span>
                              <span className="text-xs text-gray-700">{getDocLabel(doc)}</span>
                              {doc.invoiceMeta?.nummer && doc.invoiceMeta.nummer !== "\u2014" && <span className="text-[10px] text-gray-400">#{doc.invoiceMeta.nummer}</span>}
                              {status.risk && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Risiko</span>}
                            </div>
                            <span className={`text-[10px] ${status.color}`}>{status.label}</span>
                          </button>
                        );
                      })}
                      {/* Add document to Behandlung */}
                      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                        <button className="text-[10px] text-blue-500 hover:text-blue-700" onClick={() => { onStartConsent && onStartConsent(patient); }}>+ Aufkl&auml;rung</button>
                        <button className="text-[10px] text-blue-500 hover:text-blue-700" onClick={() => { onNewHV && onNewHV(); }}>+ HV</button>
                        <button className="text-[10px] text-blue-500 hover:text-blue-700" onClick={() => { setCenterView("behandlungen_add"); }}>+ Behandlungsdoku</button>
                        <button className="text-[10px] text-blue-500 hover:text-blue-700" onClick={() => { onCreateInvoice && onCreateInvoice(patient); }}>+ Rechnung</button>
                      </div>
                      {/* Delete Behandlung */}
                      <div className="px-3 py-1.5 border-t border-gray-100 flex justify-end">
                        <button className="text-[10px] text-red-400 hover:text-red-600" onClick={() => setConfirmDeleteBeh(beh)}>Behandlung l&ouml;schen</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Standalone documents */}
          {(() => {
            const standaloneDocs = matchingInvoices.filter(inv => !inv._behandlungId);
            return standaloneDocs.length > 0 ? (
              <div className="px-3 pb-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Einzelne Dokumente</div>
                {standaloneDocs.map(doc => {
                  const status = getDocStatus(doc);
                  return (
                    <button key={doc._supabaseId || doc.id} className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition border-b border-gray-50" onClick={() => handleDocClick(doc)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-gray-400">{"\u{1F4C4}"}</span>
                        <span className="text-xs text-gray-700">{getDocLabel(doc)}</span>
                        {doc.invoiceMeta?.nummer && doc.invoiceMeta.nummer !== "\u2014" && <span className="text-[10px] text-gray-400">#{doc.invoiceMeta.nummer}</span>}
                        {doc.invoiceMeta?.datum && <span className="text-[10px] text-gray-400">{fmtDate(doc.invoiceMeta.datum)}</span>}
                        {status.risk && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Risiko</span>}
                      </div>
                      <span className={`text-[10px] ${status.color}`}>{status.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {/* Delete treatment doc confirmation */}
      {confirmDeleteTreatment && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Behandlung l&ouml;schen?</h3>
            <p className="text-xs text-gray-500 mb-4">Diese Behandlungsdokumentation wird unwiderruflich gel&ouml;scht. Diese Aktion kann nicht r&uuml;ckg&auml;ngig gemacht werden.</p>
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
                setCenterView("timeline");
              }}>L&ouml;schen</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Behandlung confirmation */}
      {confirmDeleteBeh && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Behandlung l&ouml;schen?</h3>
            <p className="text-xs text-gray-500 mb-4">Die zugeh&ouml;rigen Dokumente bleiben erhalten.</p>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setConfirmDeleteBeh(null)}>Abbrechen</button>
              <button className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={async () => {
                try { await onDeleteBehandlung(confirmDeleteBeh._id); } catch (e) { console.error("Delete Behandlung error:", e); }
                setConfirmDeleteBeh(null);
              }}>L&ouml;schen</button>
            </div>
          </div>
        </div>
      )}

      {/* Face Edit Modal */}
      {editFace && viewingTreatment && (() => {
        const td = viewingTreatment.treatmentDoc || {};
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
          const updated = { ...inv, treatmentDoc: updatedTd, lastModifiedAt: new Date().toISOString() };
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
              <p className="text-xs text-amber-500 mb-3">Die eingegebenen Mengen werden automatisch als Gesamtmenge des Pr&auml;parats &uuml;bernommen.</p>
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
                        <button className="p-1 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition" onClick={() => setInlineTempMarkers(inlineTempMarkers.filter((mk) => mk.id !== m.id))} title="L&ouml;schen">
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
