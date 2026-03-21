import React from "react";

// ═══════════════════ Mobile Scaled Preview ═══════════════════

export default function MobileScaledPreview({ children, a4Width, className }) {
  const wrapperRef = React.useRef(null);
  const innerRef = React.useRef(null);
  const [dims, setDims] = React.useState({ scale: 1, h: 0 });

  React.useEffect(() => {
    const update = () => {
      if (!wrapperRef.current || !innerRef.current) return;
      const containerW = wrapperRef.current.clientWidth;
      const s = Math.min(1, containerW / a4Width);
      const h = innerRef.current.offsetHeight;
      setDims({ scale: s, h });
    };
    // Delay to allow children to render
    const t = setTimeout(update, 50);
    window.addEventListener("resize", update);
    return () => { clearTimeout(t); window.removeEventListener("resize", update); };
  }, [a4Width]);

  return (
    <div ref={wrapperRef} className={className} style={{ overflow: "hidden", height: dims.h ? dims.h * dims.scale : "auto" }}>
      <div
        ref={innerRef}
        style={{
          width: a4Width,
          transform: `scale(${dims.scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

