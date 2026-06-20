import React from "react";

// ═══════════════════ Impressum ═══════════════════

export default function ImpressumPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow border border-[#DFE3EB] p-8">
        {onBack && (
          <button onClick={onBack} className="mb-6 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            &larr; Zurück
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-800 mb-6">Impressum</h1>
        <div className="text-sm text-gray-700 leading-relaxed space-y-4">
          <p>invoicing.ephia.de ist ein Portal der EPHIA Medical GmbH</p>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Anschrift</p>
            <p>EPHIA Medical GmbH<br />Dorfstraße 30<br />15913 Märkische Heide<br />Deutschland</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Kontakt</p>
            <p>customerlove@ephia.de</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Verantwortliche Geschäftsführerin</p>
            <p>Dr. Sophia Wilk-Vollmann</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Handelsregister</p>
            <p>HRB 279383 B</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Steuernummer</p>
            <p>049/108/01622</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">USt-IdNr.</p>
            <p>DE456748337</p>
          </div>
        </div>
      </div>
    </div>
  );
}

