import React from "react";

// ═══════════════════ Error Boundary ═══════════════════
// Catches render errors anywhere below it so a single bug shows a recoverable
// message instead of blanking the whole app (white screen). The error text is
// surfaced so it can be reported/diagnosed instead of silently swallowed.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a console record for diagnosis
    console.error("App crashed (caught by ErrorBoundary):", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#FAEBE1", fontFamily: "Roboto, 'Segoe UI', Arial, sans-serif" }}>
        <div style={{ maxWidth: "480px", width: "100%", background: "white", borderRadius: "10px", padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>Etwas ist schiefgelaufen</h1>
          <p style={{ fontSize: "14px", color: "#555", margin: "0 0 16px", lineHeight: 1.5 }}>
            Die Ansicht konnte nicht geladen werden. Deine Daten sind nicht verloren – Du kannst es erneut versuchen oder die Seite neu laden.
          </p>
          <pre style={{ fontSize: "12px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", margin: "0 0 18px", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "160px", overflow: "auto" }}>{msg}</pre>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={this.handleReset}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#0066FF", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #DFE3EB", background: "white", color: "#374151", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      </div>
    );
  }
}
