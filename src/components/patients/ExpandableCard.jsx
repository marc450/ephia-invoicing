import React, { useState } from "react";

// ═══════════════════ Expandable Card ═══════════════════

export default function ExpandableCard({ header, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`rounded-lg border transition ${open ? "border-gray-300 bg-white shadow-sm" : "border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300"}`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">{header}</div>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

