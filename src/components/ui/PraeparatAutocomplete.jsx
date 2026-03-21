import React, { useState, useRef, useEffect } from "react";

// ═══════════════════ Präparat Autocomplete ═══════════════════

export default function PraeparatAutocomplete({ value, onChange, onSelect, suggestions, placeholder, className, id }) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const filtered = value.trim()
    ? suggestions.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  // close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (p) => {
    onSelect(p);
    setOpen(false);
    setFocusIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && focusIdx >= 0) { e.preventDefault(); handleSelect(filtered[focusIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setFocusIdx(-1); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition ${i === focusIdx ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              onMouseEnter={() => setFocusIdx(i)}
            >
              <span className="font-medium">{p.name}</span>
              {(p.einheit || p.preisStr) && (
                <span className="text-gray-400 ml-1.5 text-xs">
                  {p.einheit && p.einheit}{p.preisStr ? ` · ${p.preisStr} €` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

