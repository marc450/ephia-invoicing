import React from "react";

// ═══════════════════ Datenschutzerklärung ═══════════════════

export default function DatenschutzPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8">
        {onBack && (
          <button onClick={onBack} className="mb-6 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            &larr; Zurück
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-800 mb-1">Datenschutzerklärung</h1>
        <p className="text-xs text-gray-400 mb-6">EPHIA Medical GmbH · Stand: März 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed space-y-5">
          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">1. Verantwortliche:r</h2>
            <p>Verantwortlich für die Datenverarbeitung im Sinne der DSGVO:</p>
            <p>EPHIA Medical GmbH<br />Dorfstraße 30<br />15913 Märkische Heide<br />Deutschland<br />E-Mail: customerlove@ephia.de</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p>Wir verarbeiten Deine personenbezogenen Daten nur, soweit dies zur Bereitstellung unserer App und der damit verbundenen Leistungen erforderlich ist. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">3. Kategorien verarbeiteter Daten</h2>
            <p><strong>Kontodaten:</strong> Deine E-Mail-Adresse und ein Passwort-Hash zur Authentifizierung.</p>
            <p><strong>Praxisdaten:</strong> Praxisname, Anschrift, Steuernummer, Bankverbindung und weitere geschäftliche Angaben. Diese Daten werden unverschlüsselt gespeichert, um die Geschäftsabwicklung zu ermöglichen.</p>
            <p><strong>Rechnungsdaten:</strong> Rechnungsnummern, Leistungspositionen (GOÄ-Ziffern), Beträge und Datumsangaben. Diese Daten werden unverschlüsselt gespeichert.</p>
            <p><strong>Patient:innendaten:</strong> Name, Adresse, Geburtsdatum und E-Mail-Adresse Deiner Patient:innen. Diese Daten werden vor der Übertragung an den Server in Deinem Browser Ende-zu-Ende-verschlüsselt (siehe Abschnitt 5). Auf unseren Servern werden ausschließlich verschlüsselte, nicht lesbare Daten gespeichert. Wir haben zu keinem Zeitpunkt Zugriff auf Patient:innendaten im Klartext — nur Du selbst kannst diese mit Deinem persönlichen Schlüssel entschlüsseln.</p>
            <p><strong>Technische Daten:</strong> Bei der Nutzung der App werden automatisch technische Informationen wie IP-Adresse, Browsertyp und Zugriffszeiten erfasst. Diese Daten werden ausschließlich zur Sicherstellung des Betriebs und zur Fehlerbehebung verwendet.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">4. Verarbeitung von Gesundheitsdaten</h2>
            <p>Im Rahmen der Rechnungsstellung können mittelbar Gesundheitsdaten gemäß Art. 9 DSGVO verarbeitet werden, da aus Behandlungspositionen auf den Gesundheitszustand geschlossen werden kann. Die Verarbeitung erfolgt auf Grundlage von Art. 9 Abs. 2 lit. h DSGVO (Gesundheitsversorgung). Durch die Ende-zu-Ende-Verschlüsselung (siehe Abschnitt 5) sind patient:innenidentifizierende Daten auf unseren Servern jedoch zu keinem Zeitpunkt im Klartext gespeichert oder für EPHIA einsehbar — Rechnungspositionen können serverseitig keiner identifizierbaren Person zugeordnet werden.</p>
            <p>Du bist als verantwortliche Stelle für die von Dir eingegebenen Patient:innendaten verantwortlich und stellst sicher, dass Du über die erforderliche Rechtsgrundlage verfügst.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">5. Ende-zu-Ende-Verschlüsselung (E2EE)</h2>
            <p>Patient:innendaten werden mittels Ende-zu-Ende-Verschlüsselung mit AES-256-GCM geschützt. Die Verschlüsselung erfolgt direkt in Deinem Browser, bevor Daten an unsere Server übertragen werden.</p>
            <p><strong>Schlüsselhierarchie:</strong> Aus Deinem Passwort wird mittels PBKDF2 ein Schlüsselableitungsschlüssel (PDK) erzeugt. Dieser schützt den eigentlichen Datenverschlüsselungsschlüssel (Master Encryption Key, MEK). Der MEK wird ausschließlich in Deinem Browser entschlüsselt.</p>
            <p><strong>Konsequenz:</strong> Auf unseren Servern befinden sich ausschließlich verschlüsselte, nicht lesbare Zeichenketten. Wir speichern keine Patient:innendaten im Klartext und können diese auch nicht einsehen. Selbst im Falle eines unbefugten Datenbankzugriffs durch Dritte bleiben Patient:innendaten vollständig geschützt, da sie ohne Deinen persönlichen Schlüssel nicht entschlüsselt werden können.</p>
            <p><strong>Wiederherstellung:</strong> Ein Recovery-Mechanismus ermöglicht es, den MEK bei Passwortverlust über eine E-Mail-Verifizierung wiederherzustellen.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">6. Hosting und Datenverarbeitung</h2>
            <p><strong>Hosting:</strong> Die App wird über GitHub Pages (GitHub, Inc.) als statische Webanwendung bereitgestellt. Es werden dabei keine personenbezogenen Daten serverseitig durch GitHub verarbeitet.</p>
            <p><strong>Datenbank:</strong> Sämtliche Daten werden auf Servern innerhalb der Europäischen Union gespeichert. Als Datenbankdienstleister wird Supabase mit EU-Serverstandort eingesetzt. Patient:innendaten werden zusätzlich durch Ende-zu-Ende-Verschlüsselung geschützt (siehe Abschnitt 5).</p>
            <p><strong>Authentifizierung:</strong> Die Authentifizierung erfolgt über Supabase Auth. Dabei werden E-Mail-Adresse und Passwort-Hash verarbeitet.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">7. Cookies und Tracking</h2>
            <p>Die App verwendet keine Cookies zu Marketing- oder Trackingzwecken. Es werden lediglich technisch notwendige Sitzungsdaten im Browser (sessionStorage) gespeichert, um die Verschlüsselungsfunktionalität während einer Sitzung aufrechtzuerhalten. Diese Daten werden beim Schließen des Browsers automatisch gelöscht.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">8. Deine Rechte</h2>
            <p>Du hast gemäß DSGVO folgende Rechte:</p>
            <p><strong>Auskunftsrecht (Art. 15):</strong> Du kannst Auskunft über die zu Deiner Person gespeicherten Daten verlangen.</p>
            <p><strong>Berichtigungsrecht (Art. 16):</strong> Du kannst die Berichtigung unrichtiger Daten verlangen.</p>
            <p><strong>Löschungsrecht (Art. 17):</strong> Du kannst die Löschung Deiner Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
            <p><strong>Einschränkung der Verarbeitung (Art. 18):</strong> Du kannst die Einschränkung der Verarbeitung Deiner Daten verlangen.</p>
            <p><strong>Datenübertragbarkeit (Art. 20):</strong> Du kannst Deine Daten in einem gängigen Format erhalten.</p>
            <p><strong>Widerspruchsrecht (Art. 21):</strong> Du kannst der Verarbeitung Deiner Daten widersprechen.</p>
            <p>Zur Ausübung Deiner Rechte schreib uns einfach an: customerlove@ephia.de</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">9. Beschwerderecht</h2>
            <p>Du hast das Recht, Dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Deiner personenbezogenen Daten zu beschweren. Die für uns zuständige Aufsichtsbehörde ist:</p>
            <p>Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg<br />Stahnsdorfer Damm 77<br />14532 Kleinmachnow</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">10. Speicherdauer</h2>
            <p>Personenbezogene Daten werden gelöscht, sobald der Zweck der Speicherung entfällt. Nach Kündigung Deines Kontos werden alle personenbezogenen Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten (z. B. steuerrechtliche Aufbewahrungsfristen von bis zu 10 Jahren) entgegenstehen.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">11. Änderungen dieser Datenschutzerklärung</h2>
            <p>Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die aktuelle Version ist jederzeit in der App einsehbar.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 mt-6 mb-2">Kontakt</h2>
            <p>EPHIA Medical GmbH<br />E-Mail: customerlove@ephia.de</p>
          </section>
        </div>
      </div>
    </div>
  );
}

