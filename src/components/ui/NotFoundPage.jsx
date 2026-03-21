import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="text-center px-6">
        <div className="mb-6 flex justify-center">
          <img src="/logo.svg" alt="EPHIA" style={{ height: "42px" }} />
        </div>
        <p className="text-6xl font-light text-gray-300 mb-4">404</p>
        <p className="text-sm font-medium text-gray-600 mb-1">Seite nicht gefunden</p>
        <p className="text-xs text-gray-400 mb-8">Diese Seite existiert nicht oder wurde verschoben.</p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition"
        >
          Zurück zur Startseite
        </button>
      </div>
    </div>
  );
}
