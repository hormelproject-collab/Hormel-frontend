import React from "react";
import { tokens, buttons } from "../styles/layout";

export default function ResponseModal({ response, onClose }) {
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.40)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 16,
    boxSizing: "border-box",
  };

  const modalStyle = {
    background: "#fff",
    borderRadius: tokens.radius.lg,
    width: "min(900px, 96vw)",
    maxHeight: "80vh",
    overflow: "auto",
    border: `1px solid ${tokens.colors.border}`,
    boxShadow: tokens.shadow.elevated,
  };

  const headerStyle = {
    padding: "14px 16px",
    borderBottom: `1px solid ${tokens.colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: tokens.colors.headerBg,
  };

  const closeBtn = {
    ...buttons.base,
    ...buttons.primary,
    padding: "8px 14px",
    borderRadius: tokens.radius.md,
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ fontWeight: 800, color: tokens.colors.textPrimary }}>API Response</div>
          <button style={closeBtn} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}