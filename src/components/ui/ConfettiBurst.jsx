import React from "react";

// ═══════════════════ Confetti Burst ═══════════════════

export function spawnConfetti(buttonEl) {
  if (!buttonEl) return;
  const rect = buttonEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ["#22c55e", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#f97316"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);
  for (let i = 0; i < 24; i++) {
    const el = document.createElement("div");
    const size = 4 + Math.random() * 5;
    const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.5;
    const velocity = 60 + Math.random() * 80;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 30;
    const rotation = Math.random() * 720 - 360;
    el.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.5 ? "50%" : "1px"};opacity:1;transition:none;`;
    container.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transition = "all 0.7s cubic-bezier(.25,.46,.45,.94)";
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
      el.style.opacity = "0";
    });
  }
  setTimeout(() => container.remove(), 800);
}

