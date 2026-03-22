import React, { useState, useRef } from "react";
import { CONSENT_TEMPLATES } from "../consent/consentTemplates";
import { FACE_IMAGE_B64 } from "../../constants";
import TreatmentDocPreview from "./TreatmentDocumentPreview";
import PatientLeftSidebar from "./PatientLeftSidebar";
import PatientTimeline from "./PatientTimeline";
import BehandlungDetailPanel from "./BehandlungDetailPanel";
import BehandlungAddPanel from "./BehandlungAddPanel";
import PatientBehandlungenSidebar from "./PatientBehandlungenSidebar";

// ═══════════════════ Patient Detail View ═══════════════════

export default function PatientDetailView({ patient, invoices, behandlungen = [], docsMigrated, kleinunternehmer, practice, onBack, onView, onViewHV, onDownload, onDownloadHV, onPrint, onPrintHV, onDelete, onUpdateInvoice, onUpdatePatient, onCreateInvoice, onQuickInvoice, onNewHV, onStartConsent, onViewConsent, onDownloadConsent, onCreateBehandlung, onUpdateBehandlung, onDeleteBehandlung, onLinkDocToBehandlung, activityLog = [], onLogActivity }) {
  // ── Derived data ──
  const rawData = (patient._raw && typeof patient._raw.data === "object" && patient._raw.data) ? patient._raw.data : {};
  const email = (rawData.email || patient.email || "").toLowerCase();
  const patientDbId = patient._raw ? patient._raw.id : patient.id;

  // ── Shared state ──
  const [confirmDeleteTreatment, setConfirmDeleteTreatment] = useState(null);
  const [confirmDeleteBeh, setConfirmDeleteBeh] = useState(null);
  const [editingTreatmentInv, setEditingTreatmentInv] = useState(null);
  const [viewingTreatment, setViewingTreatment] = useState(null);
  const [editData, setEditData] = useState({
    vorname: rawData.vorname || patient.vorname || "",
    nachname: rawData.nachname || patient.nachname || "",
    email: rawData.email || patient.email || "",
    phone: rawData.phone || "",
    address1: rawData.address1 || "",
    address2: rawData.address2 || "",
    country: rawData.country || "Deutschland",
  });

  // Three-column layout: center view state
  const [centerView, setCenterView] = useState("timeline");
  const [newBehandlungOpen, setNewBehandlungOpen] = useState(false);
  const [newBehDatum, setNewBehDatum] = useState(new Date().toISOString().slice(0, 10));
  const [newBehZeit, setNewBehZeit] = useState("");
  const [expandedBeh, setExpandedBeh] = useState(null);

  // New treatment states (shared between add and detail panels via pendingQuickInvoice flow)
  const [newTreatmentMarkers, setNewTreatmentMarkers] = useState([]);
  const [newTreatmentInvoiceId, setNewTreatmentInvoiceId] = useState(null);
  const [newTreatmentEinheit, setNewTreatmentEinheit] = useState("SE");
  const [newTreatmentPraeparat, setNewTreatmentPraeparat] = useState("");
  const [newTreatmentDate, setNewTreatmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTreatmentNotes, setNewTreatmentNotes] = useState("");
  const [newTreatmentAmount, setNewTreatmentAmount] = useState("");
  const [newTreatmentFacePhoto, setNewTreatmentFacePhoto] = useState("");

  // Inline patient editing state
  const [patientEditField, setPatientEditField] = useState(null);

  // Quick invoice pending (bridges behandlungen_add -> behandlung_detail)
  const [pendingQuickInvoice, setPendingQuickInvoice] = useState(false);

  // Treatment doc PDF state
  const [treatmentDocTarget, setTreatmentDocTarget] = useState(null);

  // Sidebar collapsible states
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const [adressdatenOpen, setAdressdatenOpen] = useState(isDesktop);
  const [medizinischeOpen, setMedizinischeOpen] = useState(isDesktop);
  const [anamneseOpen, setAnamneseOpen] = useState(isDesktop);

  // Profile photo upload ref
  const profilePhotoInputRef = useRef(null);

  // ── Computed data ──
  const matchingInvoices = invoices.filter((inv) => {
    if (inv._patientDbId && patientDbId) return inv._patientDbId === patientDbId;
    const invEmail = ((inv.patient || {}).email || "").toLowerCase();
    return email && invEmail && invEmail === email;
  });
  const rechnungsInvoices = matchingInvoices.filter((inv) => !inv._standalone && !inv._hvOnly && !inv._consentForm);
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

  // Anamnese data
  const anamnese = (rawData.anamnese || []).slice().sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));

  // ── Helper functions (shared across components) ──
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

  // ── Patient edit helpers ──
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

  // ── Render ──
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Back button */}
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100">
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onBack}>&larr; Zur&uuml;ck zur Patient:innenliste</button>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-col lg:flex-row">
        {/* ═══════════════════ LEFT SIDEBAR ═══════════════════ */}
        <PatientLeftSidebar
          patient={patient} rawData={rawData} email={email}
          latestFacePhoto={latestFacePhoto} profilePhotoInputRef={profilePhotoInputRef} handleProfilePhotoUpload={handleProfilePhotoUpload}
          isEditing={isEditing} startEdit={startEdit} saveAll={saveAll} cancelAll={cancelAll} editData={editData} setEditData={setEditData} inputCls={inputCls}
          adressdatenOpen={adressdatenOpen} setAdressdatenOpen={setAdressdatenOpen}
          medizinischeOpen={medizinischeOpen} setMedizinischeOpen={setMedizinischeOpen}
          anamneseOpen={anamneseOpen} setAnamneseOpen={setAnamneseOpen}
          anamnese={anamnese}
        />

        {/* ═══════════════════ CENTER CONTENT ═══════════════════ */}
        <div className="flex-1 min-w-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          {centerView === "timeline" && (
            <PatientTimeline
              patient={patient} patientDbId={patientDbId}
              matchingInvoices={matchingInvoices} patientBeh={patientBeh}
              activityLog={activityLog} lastActivity={lastActivity}
              onViewConsent={onViewConsent} onViewHV={onViewHV} onView={onView}
              setViewingTreatment={setViewingTreatment} setCenterView={setCenterView}
            />
          )}

          {centerView === "behandlung_detail" && viewingTreatment && (
            <BehandlungDetailPanel
              viewingTreatment={viewingTreatment} setViewingTreatment={setViewingTreatment}
              setCenterView={setCenterView}
              patient={patient} rawData={rawData} invoices={invoices}
              kleinunternehmer={kleinunternehmer} practice={practice}
              onUpdateInvoice={onUpdateInvoice} onQuickInvoice={onQuickInvoice}
              setConfirmDeleteTreatment={setConfirmDeleteTreatment}
              downloadTreatmentDoc={downloadTreatmentDoc}
              pendingQuickInvoice={pendingQuickInvoice} setPendingQuickInvoice={setPendingQuickInvoice}
            />
          )}

          {centerView === "behandlungen_add" && (
            <BehandlungAddPanel
              patient={patient} email={email} rawData={rawData} patientDbId={patientDbId}
              matchingInvoices={matchingInvoices} rechnungsInvoices={rechnungsInvoices} practice={practice}
              editingTreatmentInv={editingTreatmentInv} setEditingTreatmentInv={setEditingTreatmentInv}
              newTreatmentMarkers={newTreatmentMarkers} setNewTreatmentMarkers={setNewTreatmentMarkers}
              newTreatmentInvoiceId={newTreatmentInvoiceId} setNewTreatmentInvoiceId={setNewTreatmentInvoiceId}
              newTreatmentEinheit={newTreatmentEinheit} setNewTreatmentEinheit={setNewTreatmentEinheit}
              newTreatmentPraeparat={newTreatmentPraeparat} setNewTreatmentPraeparat={setNewTreatmentPraeparat}
              newTreatmentDate={newTreatmentDate} setNewTreatmentDate={setNewTreatmentDate}
              newTreatmentNotes={newTreatmentNotes} setNewTreatmentNotes={setNewTreatmentNotes}
              newTreatmentAmount={newTreatmentAmount} setNewTreatmentAmount={setNewTreatmentAmount}
              newTreatmentFacePhoto={newTreatmentFacePhoto} setNewTreatmentFacePhoto={setNewTreatmentFacePhoto}
              onUpdateInvoice={onUpdateInvoice}
              setCenterView={setCenterView}
              setViewingTreatment={setViewingTreatment} setPendingQuickInvoice={setPendingQuickInvoice}
            />
          )}
        </div>

        {/* ═══════════════════ RIGHT SIDEBAR (Behandlungen) ═══════════════════ */}
        <PatientBehandlungenSidebar
          patientBeh={patientBeh} matchingInvoices={matchingInvoices} patientDbId={patientDbId} patient={patient}
          newBehandlungOpen={newBehandlungOpen} setNewBehandlungOpen={setNewBehandlungOpen}
          newBehDatum={newBehDatum} setNewBehDatum={setNewBehDatum}
          newBehZeit={newBehZeit} setNewBehZeit={setNewBehZeit}
          expandedBeh={expandedBeh} setExpandedBeh={setExpandedBeh}
          onCreateBehandlung={onCreateBehandlung} onDeleteBehandlung={onDeleteBehandlung}
          onStartConsent={onStartConsent} onNewHV={onNewHV} onCreateInvoice={onCreateInvoice}
          setCenterView={setCenterView}
          onViewConsent={onViewConsent} onViewHV={onViewHV} onView={onView}
          setViewingTreatment={setViewingTreatment} setConfirmDeleteBeh={setConfirmDeleteBeh}
          hasConsentRisks={hasConsentRisks} getDocLabel={getDocLabel} getDocStatus={getDocStatus} handleDocClick={handleDocClick}
        />
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
