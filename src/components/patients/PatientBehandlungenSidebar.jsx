import React from "react";
import { fmtDate } from "../../utils/helpers";

export default function PatientBehandlungenSidebar({
  patientBeh, matchingInvoices, patientDbId, patient,
  newBehandlungOpen, setNewBehandlungOpen, newBehDatum, setNewBehDatum, newBehZeit, setNewBehZeit,
  expandedBeh, setExpandedBeh,
  onCreateBehandlung, onDeleteBehandlung, onStartConsent, onNewHV, onCreateInvoice,
  setCenterView, setNewTreatmentBehId,
  onViewConsent, onViewHV, onView,
  setViewingTreatment, setConfirmDeleteBeh,
  hasConsentRisks, getDocLabel, getDocStatus, handleDocClick,
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Behandlungen ({patientBeh.length})</h3>
      </div>

      {/* New Behandlung button */}
      <div className="px-5 py-3 border-b border-gray-100">
        <button className="text-sm text-blue-500 hover:text-blue-700 font-medium transition" onClick={() => setNewBehandlungOpen(true)}>+ Neue Behandlung</button>
      </div>

      {/* New Behandlung form */}
      {newBehandlungOpen && (
        <div className="mx-5 my-3 p-4 border border-blue-100 rounded-lg bg-blue-50/50">
          <div className="text-sm font-semibold text-gray-700 mb-3">Neue Behandlung</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Datum</label>
              <input type="date" value={newBehDatum} onChange={e => setNewBehDatum(e.target.value)} className="w-full border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Uhrzeit (optional)</label>
              <input type="time" value={newBehZeit} onChange={e => setNewBehZeit(e.target.value)} className="w-full border rounded-md px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm rounded-md bg-gray-800 text-white hover:bg-gray-700 transition" onClick={async () => {
              if (!newBehDatum) return;
              try {
                const newId = await onCreateBehandlung(patientDbId, { datum: newBehDatum, zeit: newBehZeit || "", status: "planned" });
                setNewBehandlungOpen(false);
                setNewBehDatum(new Date().toISOString().slice(0, 10));
                setNewBehZeit("");
                if (newId) setExpandedBeh(newId);
              } catch (e) { alert("Fehler: " + e.message); }
            }}>Erstellen</button>
            <button className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition" onClick={() => setNewBehandlungOpen(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Behandlung cards */}
      {patientBeh.length === 0 && !newBehandlungOpen && (
        <div className="text-center py-12 text-gray-400 text-sm px-5">Noch keine Behandlungen vorhanden.</div>
      )}

      <div className="px-4 py-3">
        {patientBeh.map(beh => {
          const behDocs = matchingInvoices.filter(inv => inv._behandlungId === beh._id);
          const isExpanded = expandedBeh === beh._id;
          return (
            <div key={beh._id} className="mb-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
              <button className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition" onClick={() => setExpandedBeh(isExpanded ? null : beh._id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold text-gray-800">{fmtDate(beh.datum)}</span>
                  {beh.zeit && <span className="text-sm text-gray-500">{beh.zeit} Uhr</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${beh.status === "completed" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                    {beh.status === "completed" ? "Abgeschlossen" : "Geplant"}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{behDocs.length} Dok.</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {behDocs.length === 0 && (
                    <div className="px-4 py-5 text-center text-gray-400 text-sm">Noch keine Dokumente in dieser Behandlung.</div>
                  )}
                  {behDocs.map(doc => {
                    const status = getDocStatus(doc);
                    return (
                      <button key={doc._supabaseId || doc.id} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0" onClick={() => handleDocClick(doc)}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm text-gray-400">{"\u{1F4C4}"}</span>
                          <span className="text-sm text-gray-700">{getDocLabel(doc)}</span>
                          {doc.invoiceMeta?.nummer && doc.invoiceMeta.nummer !== "\u2014" && <span className="text-xs text-gray-400">#{doc.invoiceMeta.nummer}</span>}
                          {status.risk && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Risiko</span>}
                        </div>
                        <span className={`text-xs ${status.color}`}>{status.label}</span>
                      </button>
                    );
                  })}
                  {/* Add document to Behandlung */}
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                    <button className="text-xs text-blue-500 hover:text-blue-700 font-medium" onClick={() => { onStartConsent && onStartConsent(patient, beh._id); }}>+ Aufkl&auml;rung</button>
                    <button className="text-xs text-blue-500 hover:text-blue-700 font-medium" onClick={() => { onNewHV && onNewHV(beh._id); }}>+ HV</button>
                    <button className="text-xs text-blue-500 hover:text-blue-700 font-medium" onClick={() => { if (setNewTreatmentBehId) setNewTreatmentBehId(beh._id); setCenterView("behandlungen_add"); }}>+ Behandlungsdoku</button>
                    <button className="text-xs text-blue-500 hover:text-blue-700 font-medium" onClick={() => { onCreateInvoice && onCreateInvoice(patient, beh._id); }}>+ Rechnung</button>
                  </div>
                  {/* Delete Behandlung */}
                  <div className="px-4 py-2.5 border-t border-gray-100 flex justify-end">
                    <button className="text-xs text-red-400 hover:text-red-600" onClick={() => setConfirmDeleteBeh(beh)}>Behandlung l&ouml;schen</button>
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
          <div className="px-4 pb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-1">Einzelne Dokumente</div>
            {standaloneDocs.map(doc => {
              const status = getDocStatus(doc);
              return (
                <button key={doc._supabaseId || doc.id} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition border-b border-gray-50" onClick={() => handleDocClick(doc)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm text-gray-400">{"\u{1F4C4}"}</span>
                    <span className="text-sm text-gray-700">{getDocLabel(doc)}</span>
                    {doc.invoiceMeta?.nummer && doc.invoiceMeta.nummer !== "\u2014" && <span className="text-xs text-gray-400">#{doc.invoiceMeta.nummer}</span>}
                    {doc.invoiceMeta?.datum && <span className="text-xs text-gray-400">{fmtDate(doc.invoiceMeta.datum)}</span>}
                    {status.risk && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Risiko</span>}
                  </div>
                  <span className={`text-xs ${status.color}`}>{status.label}</span>
                </button>
              );
            })}
          </div>
        ) : null;
      })()}
    </div>
  );
}
