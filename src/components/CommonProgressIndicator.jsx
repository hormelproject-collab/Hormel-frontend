import React from "react";

const DEFAULT_BLUE = "#2563eb";

export const getShowingText = ({ start = 0, end = 0, total = 0, itemLabel = "item" } = {}) => {
  const safeTotal = Number(total || 0);
  const safeStart = safeTotal === 0 ? 0 : Number(start || 0);
  const safeEnd = safeTotal === 0 ? 0 : Number(end || 0);
  return `Showing ${safeStart}-${safeEnd} of ${safeTotal.toLocaleString()} ${itemLabel}(s)`;
};

export function ProgressIndicator({ label = "Loading...", size = 34 }) {
  return (
    <div style={styles.progressWrap} role="status" aria-live="polite" aria-label={label}>
      <div
        style={{
          ...styles.spinner,
          width: size,
          height: size,
          borderWidth: Math.max(3, Math.floor(size / 10)),
        }}
      />
      <div style={styles.progressText}>{label}</div>
    </div>
  );
}

export function TableLoadingOverlay({
  loading,
  label = "Loading records...",
  headerOffset = 44,
  minHeight = 120,
}) {
  if (!loading) return null;

  return (
    <div
      style={{
        ...styles.tableOverlay,
        top: headerOffset,
        minHeight,
      }}
    >
      <ProgressIndicator label={label} />
    </div>
  );
}

export function ShowingRecordsInfo({ start = 0, end = 0, total = 0, itemLabel = "item", style }) {
  return (
    <div style={{ ...styles.showingText, ...(style || {}) }}>
      {getShowingText({ start, end, total, itemLabel })}
    </div>
  );
}

export default ProgressIndicator;

const spinKeyframes = `
@keyframes common-progress-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;

if (typeof document !== "undefined" && !document.getElementById("common-progress-spin-style")) {
  const styleEl = document.createElement("style");
  styleEl.id = "common-progress-spin-style";
  styleEl.innerHTML = spinKeyframes;
  document.head.appendChild(styleEl);
}

const styles = {
  progressWrap: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px 18px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 8px 22px rgba(15,23,42,0.12)",
    color: "#111827",
  },
  spinner: {
    borderStyle: "solid",
    borderColor: "#dbeafe",
    borderTopColor: DEFAULT_BLUE,
    borderRadius: "50%",
    animation: "common-progress-spin 0.85s linear infinite",
    boxSizing: "border-box",
  },
  progressText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    whiteSpace: "nowrap",
  },
  tableOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.58)",
    backdropFilter: "blur(2px)",
    WebkitBackdropFilter: "blur(2px)",
    pointerEvents: "none",
  },
  showingText: {
    marginBottom: "12px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 500,
  },
};
