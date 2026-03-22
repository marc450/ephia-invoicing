import React, { useState, useMemo } from "react";
import { fmtDate } from "../../utils/helpers";

export default function PatientTimeline({
  patient, patientDbId, matchingInvoices, patientBeh, activityLog, lastActivity,
  onViewConsent, onViewHV, onView,
  setViewingTreatment, setCenterView,
}) {
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("alle");

  // Build timeline entries from activity log + legacy invoices/behandlungen
  const buildTimeline = useMemo(() => {
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

  return (
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
          <input type="text" placeholder="Aktivitäten durchsuchen..." className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} />
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
                    {entry.actionType === "created" ? "Erstellt" : entry.actionType === "updated" ? "Aktualisiert" : entry.actionType === "deleted" ? "Gelöscht" : ""}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
