import React, { useState } from "react";
import { fmtPhone, parsePlzOrt, combinePlzOrt, lookupPlz } from "../../utils/helpers";
import { PRIORITY_COUNTRIES, OTHER_COUNTRIES } from "../../constants";

const inputCls = "border border-[#DFE3EB] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400";

function PencilIcon({ onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="ml-2 text-gray-300 hover:text-blue-400 transition flex-shrink-0"
      title="Bearbeiten"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414A2 2 0 019.586 13z" />
      </svg>
    </button>
  );
}

export default function PatientLeftSidebar({
  patient, rawData, email, latestFacePhoto, profilePhotoInputRef, handleProfilePhotoUpload,
  adressdatenOpen, setAdressdatenOpen, medizinischeOpen, setMedizinischeOpen, anamneseOpen, setAnamneseOpen,
  anamnese, onUpdatePatient,
}) {
  const [editingSection, setEditingSection] = useState(null);
  const [nameData, setNameData] = useState({ vorname: "", nachname: "" });
  const [adresseData, setAdresseData] = useState({ email: "", phone: "", address1: "", address2: "", country: "Deutschland" });
  const [medizinData, setMedizinData] = useState({ geschlecht: "", geburtsdatum: "", groesse: "", gewicht: "" });

  const startEditName = () => {
    setNameData({ vorname: rawData.vorname || patient.vorname || "", nachname: rawData.nachname || patient.nachname || "" });
    setEditingSection("name");
  };
  const startEditAdresse = () => {
    setAdresseData({ email: rawData.email || patient.email || "", phone: rawData.phone || "", address1: rawData.address1 || "", address2: rawData.address2 || "", country: rawData.country || "Deutschland" });
    setEditingSection("adresse");
    if (!adressdatenOpen) setAdressdatenOpen(true);
  };
  const startEditMedizin = () => {
    setMedizinData({ geschlecht: rawData.geschlecht || "", geburtsdatum: rawData.geburtsdatum || "", groesse: rawData.groesse || "", gewicht: rawData.gewicht || "" });
    setEditingSection("medizin");
    if (!medizinischeOpen) setMedizinischeOpen(true);
  };
  const saveName = () => { if (onUpdatePatient) onUpdatePatient({ ...rawData, vorname: nameData.vorname, nachname: nameData.nachname }); setEditingSection(null); };
  const saveAdresse = () => { if (onUpdatePatient) onUpdatePatient({ ...rawData, ...adresseData }); setEditingSection(null); };
  const saveMedizin = () => { if (onUpdatePatient) onUpdatePatient({ ...rawData, ...medizinData }); setEditingSection(null); };
  const cancel = () => setEditingSection(null);

  return (
    <div className="lg:w-72 xl:w-80 lg:sticky lg:top-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
      {/* Patient photo + name */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex flex-col items-center text-center">
          <button
            className="rounded-full overflow-hidden border-2 border-[#DFE3EB] hover:border-blue-300 transition mb-3"
            style={{ width: 72, height: 72 }}
            onClick={() => profilePhotoInputRef.current?.click()}
            title="Foto hochladen"
          >
            {latestFacePhoto ? (
              <img src={latestFacePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </button>
          <input ref={profilePhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
          {editingSection === "name" ? (
            <div className="space-y-2 w-full">
              <input className={inputCls + " w-full"} value={nameData.vorname} placeholder="Vorname" autoFocus onChange={(e) => setNameData({ ...nameData, vorname: e.target.value })} />
              <input className={inputCls + " w-full"} value={nameData.nachname} placeholder="Nachname" onChange={(e) => setNameData({ ...nameData, nachname: e.target.value })} />
              <div className="flex gap-2 pt-1 justify-center">
                <button className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition" onClick={saveName}>Speichern</button>
                <button className="px-3 py-1.5 text-xs rounded-md border border-[#DFE3EB] text-gray-500 hover:bg-gray-50 transition" onClick={cancel}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <h2 className="text-lg font-semibold text-gray-800">{patient.vorname} {patient.nachname}</h2>
              <PencilIcon onClick={startEditName} />
            </div>
          )}
        </div>
      </div>

      {/* Adressdaten section */}
      <div className="border-b border-gray-100">
        <button className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition" onClick={() => setAdressdatenOpen(!adressdatenOpen)}>
          <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Adressdaten</span>
            <PencilIcon onClick={startEditAdresse} />
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${adressdatenOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {adressdatenOpen && (
          <div className="px-5 pb-4">
            {editingSection === "adresse" ? (
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">E-Mail</label>
                  <input type="email" className={inputCls + " w-full mt-1"} value={adresseData.email} onChange={(e) => setAdresseData({ ...adresseData, email: e.target.value })} autoFocus />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Telefon</label>
                  <input type="tel" className={inputCls + " w-full mt-1"} value={adresseData.phone} placeholder="+49 123 456789" onChange={(e) => setAdresseData({ ...adresseData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Straße</label>
                  <input className={inputCls + " w-full mt-1"} value={adresseData.address1} placeholder="Musterstraße 5" onChange={(e) => setAdresseData({ ...adresseData, address1: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">PLZ</label>
                    <input
                      className={inputCls + " w-full mt-1"} value={parsePlzOrt(adresseData.address2).plz} placeholder="PLZ" maxLength={5} inputMode="numeric"
                      onChange={(e) => {
                        const v = e.target.value;
                        const { ort } = parsePlzOrt(adresseData.address2);
                        setAdresseData({ ...adresseData, address2: combinePlzOrt(v, ort) });
                        if (v.length === 5 && !ort && (!adresseData.country || adresseData.country === "Deutschland")) {
                          lookupPlz(v).then(city => {
                            if (city) setAdresseData(d => ({ ...d, address2: combinePlzOrt(v, parsePlzOrt(d.address2).ort || city) }));
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Ort</label>
                    <input
                      className={inputCls + " w-full mt-1"} value={parsePlzOrt(adresseData.address2).ort} placeholder="Ort"
                      onChange={(e) => { const { plz } = parsePlzOrt(adresseData.address2); setAdresseData({ ...adresseData, address2: combinePlzOrt(plz, e.target.value) }); }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Land</label>
                  <select className={inputCls + " w-full mt-1 bg-white"} value={adresseData.country} onChange={(e) => setAdresseData({ ...adresseData, country: e.target.value })}>
                    {PRIORITY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option disabled>{"────────────"}</option>
                    {OTHER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition" onClick={saveAdresse}>Speichern</button>
                  <button className="px-3 py-1.5 text-xs rounded-md border border-[#DFE3EB] text-gray-500 hover:bg-gray-50 transition" onClick={cancel}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">E-Mail</span>
                  <span className="text-sm">{email ? <a href={`mailto:${email}`} className="text-blue-500 hover:text-blue-700">{email}</a> : <span className="text-gray-400">--</span>}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Telefon</span>
                  <span className="text-sm text-gray-700">{rawData.phone ? (
                    <>
                      <a href={`tel:${rawData.phone.replace(/[^\d+]/g, "")}`} className="lg:hidden text-blue-500 hover:text-blue-700">{fmtPhone(rawData.phone)}</a>
                      <span className="hidden lg:inline">{fmtPhone(rawData.phone)}</span>
                    </>
                  ) : <span className="text-gray-400">--</span>}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Adresse</span>
                  <span className="text-sm text-gray-700 text-right">{rawData.address1 ? `${rawData.address1}, ${rawData.address2 || ""}` : "--"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Land</span>
                  <span className="text-sm text-gray-700">{rawData.country || "Deutschland"}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Medizinische Daten section */}
      <div className="border-b border-gray-100">
        <button className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition" onClick={() => setMedizinischeOpen(!medizinischeOpen)}>
          <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Medizinische Daten</span>
            <PencilIcon onClick={startEditMedizin} />
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${medizinischeOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {medizinischeOpen && (
          <div className="px-5 pb-4">
            {editingSection === "medizin" ? (
              <div className="space-y-2.5">
                <p className="text-xs text-gray-400 italic">Felder werden automatisch aus Aufklärungsbögen übernommen.</p>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Geschlecht</label>
                  <select className={inputCls + " w-full mt-1 bg-white"} value={medizinData.geschlecht} onChange={(e) => setMedizinData({ ...medizinData, geschlecht: e.target.value })} autoFocus>
                    <option value="">--</option>
                    <option value="w">Weiblich</option>
                    <option value="m">Männlich</option>
                    <option value="d">Divers</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Geburtsdatum</label>
                  <input type="date" className={inputCls + " w-full mt-1"} value={medizinData.geburtsdatum} onChange={(e) => setMedizinData({ ...medizinData, geburtsdatum: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Größe (cm)</label>
                  <input type="number" className={inputCls + " w-full mt-1"} value={medizinData.groesse} placeholder="170" onChange={(e) => setMedizinData({ ...medizinData, groesse: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Gewicht (kg)</label>
                  <input type="number" className={inputCls + " w-full mt-1"} value={medizinData.gewicht} placeholder="70" onChange={(e) => setMedizinData({ ...medizinData, gewicht: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition" onClick={saveMedizin}>Speichern</button>
                  <button className="px-3 py-1.5 text-xs rounded-md border border-[#DFE3EB] text-gray-500 hover:bg-gray-50 transition" onClick={cancel}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Geschlecht</span>
                  <span className="text-sm text-gray-700">{rawData.geschlecht === "w" ? "Weiblich" : rawData.geschlecht === "m" ? "Männlich" : rawData.geschlecht === "d" ? "Divers" : rawData.geschlecht || "--"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Geburtsdatum</span>
                  <span className="text-sm text-gray-700">{rawData.geburtsdatum ? new Date(rawData.geburtsdatum).toLocaleDateString("de-DE") : "--"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Größe</span>
                  <span className="text-sm text-gray-700">{rawData.groesse ? `${rawData.groesse} cm` : "--"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-400">Gewicht</span>
                  <span className="text-sm text-gray-700">{rawData.gewicht ? `${rawData.gewicht} kg` : "--"}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Anamnese section */}
      <div className="border-b border-gray-100">
        <button className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition" onClick={() => setAnamneseOpen(!anamneseOpen)}>
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Anamnese</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${anamneseOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {anamneseOpen && (
          <div className="px-5 pb-4">
            {anamnese.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Noch keine Einträge. Einträge werden automatisch aus ausgefüllten Aufklärungsbögen übernommen.</p>
            ) : (
              <div className="space-y-0">
                {anamnese.map((entry, i) => (
                  <div key={entry.questionId || i} className="py-3.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs text-gray-400">
                        {entry.addedAt ? new Date(entry.addedAt).toLocaleDateString("de-DE") : "--"}
                      </span>
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-0.5" title="Positiver Befund" />
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{entry.questionLabel}</p>
                    {entry.detailText && (
                      <p className="text-sm text-amber-700 mt-1 leading-relaxed">{entry.detailText}</p>
                    )}
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
