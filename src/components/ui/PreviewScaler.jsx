import React from "react";

// ═══════════════════ Preview Scaler ═══════════════════

const A4_WIDTH_PX = 794; // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi
const A4_RATIO = A4_HEIGHT_PX / A4_WIDTH_PX; // ~1.4142

export default function PreviewScaler({ children }) {
  const containerRef = React.useRef(null);
  const [scale, setScale] = useState(0.5);
  const pad = 6;

  React.useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const w = containerRef.current.getBoundingClientRect().width - pad * 2;
      setScale(w / A4_WIDTH_PX);
    };
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const scaledH = A4_HEIGHT_PX * scale + pad * 2;

  return (
    <div ref={containerRef} style={{ background: "#f0f0f0", padding: pad, height: scaledH, overflow: "hidden" }}>
      <div style={{ position: "relative", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_WIDTH_PX, height: A4_HEIGHT_PX, background: "white" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

