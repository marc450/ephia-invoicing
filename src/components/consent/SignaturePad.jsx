import React, { useState, useRef, useEffect } from "react";

// ═══════════════════ Signature Pad ═══════════════════

export default function SignaturePad({ onSave, label, width = 320, height = 160 }) {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);
  const [hasStrokes, setHasStrokes] = React.useState(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = (e) => {
    if (e) e.preventDefault();
    setDrawing(false);
  };

  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (!hasStrokes) return onSave(null);
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{ width, height, cursor: "crosshair" }}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm">Hier unterschreiben</span>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button className="px-4 py-2 text-xs rounded-lg border border-[#DFE3EB] text-gray-500 hover:bg-gray-50 transition" onClick={clear}>Löschen</button>
        <button className={`px-5 py-2 text-xs rounded-lg transition ${hasStrokes ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} onClick={save}>Bestätigen</button>
      </div>
    </div>
  );
}

export function SignatureModal({ onComplete, onClose, existingSignatures }) {
  const handlePatientSave = (dataUrl) => {
    onComplete({ patient: dataUrl, doctor: existingSignatures?.doctor || null });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Unterschrift Patient:in</h3>
          <button className="p-1 text-gray-400 hover:text-gray-600" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mb-3">Die Unterschrift der Ärztin/des Arztes kann später hinzugefügt werden.</p>
        <SignaturePad key="patient-sig" label="Unterschrift Patient:in" onSave={handlePatientSave} />
        <button className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition py-1" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

