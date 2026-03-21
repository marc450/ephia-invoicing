import React, { useState } from "react";

// ═══════════════════ Info Tooltip ═══════════════════

export default function InfoTooltip({ children, wide }) {
  const [show, setShow] = useState(false);
  const [tooltipStyle, setTooltipStyle] = React.useState({});
  const triggerRef = React.useRef(null);
  const hideTimeout = React.useRef(null);
  const scheduleHide = () => {
    hideTimeout.current = setTimeout(() => setShow(false), 150);
  };
  const cancelHide = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  };
  const handleShow = () => {
    cancelHide();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipW = wide ? 384 : 256;
      let left = rect.left;
      if (left + tooltipW > window.innerWidth - 8) left = window.innerWidth - tooltipW - 8;
      if (left < 8) left = 8;
      setTooltipStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 6, left, width: tooltipW, zIndex: 9999 });
    }
    setShow(true);
  };
  return (
    <span className="inline-flex items-center">
      <span
        ref={triggerRef}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help font-bold leading-none"
        onMouseEnter={handleShow}
        onMouseLeave={scheduleHide}
        onClick={() => show ? setShow(false) : handleShow()}
      >
        ?
      </span>
      {show && (
        <div
          className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg"
          style={{ whiteSpace: "pre-wrap", lineHeight: "1.5", ...tooltipStyle }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          {children}
        </div>
      )}
    </span>
  );
}

