import React from "react";
import { fmtPhone, parsePlzOrt, combinePlzOrt, lookupPlz } from "../../utils/helpers";
import { PRIORITY_COUNTRIES, OTHER_COUNTRIES } from "../../constants";

export default function PatientLeftSidebar({
  patient, rawData, email, latestFacePhoto, profilePhotoInputRef, handleProfilePhotoUpload,
  isEditing, startEdit, saveAll, cancelAll, editData, setEditData, inputCls,
  adressdatenOpen, setAdressdatenOpen, medizinischeOpen, setMedizinischeOpen, anamneseOpen, setAnamneseOpen,
  anamnese,
}) {
  return (
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
                <option disabled>{"────────────"}</option>
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
  );
}
