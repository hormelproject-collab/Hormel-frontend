/* =========================
   Design Tokens
========================= */

export const tokens = {
  fontFamily: "Inter, Segoe UI, Arial, sans-serif",

  colors: {
    background: "#f9fafb",
    surface: "#ffffff",
    border: "#e5e7eb",

    textPrimary: "#111827",
    textSecondary: "#6b7280",
    textMuted: "#64748b",

    primary: "#2563eb",
    primarySoft: "#cbd5f5",
    success: "#16a34a",
    danger: "#dc2626",

    headerBg: "#f8fafc",
  },

  radius: {
    sm: 6,
    md: 8,
    lg: 12,
  },

  shadow: {
    soft: "0 1px 2px rgba(0,0,0,0.04)",
    elevated: "0 10px 25px rgba(0,0,0,0.08)",
  },
};

/* =========================
   Layout Helpers
========================= */

export const layout = {
  page: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: tokens.colors.background,
    fontFamily: tokens.fontFamily,
    boxSizing: "border-box",
  },

  container: (screen) => ({
    padding: screen.isMobile ? 16 : 32,
    boxSizing: "border-box",
    width: "100%",
  }),

  sectionGap: (screen) => ({
    marginTop: screen.isMobile ? 16 : 24,
  }),
};

/* =========================
   Typography
========================= */

export const typography = {
  pageTitle: (screen) => ({
    fontSize: screen.isMobile ? 22 : 28,
    fontWeight: 700,
    color: tokens.colors.textPrimary,
    margin: 0,
  }),

  subtitle: (screen) => ({
    fontSize: screen.isMobile ? 13 : 14,
    color: tokens.colors.textSecondary,
    marginTop: 6,
  }),

  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: tokens.colors.textPrimary,
  },

  helperText: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
};

/* =========================
   Cards
========================= */

export const cards = {
  container: {
    backgroundColor: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    boxShadow: tokens.shadow.soft,
  },

  padding: (screen) => ({
    padding: screen.isMobile ? 16 : 24,
  }),

  header: (screen) => ({
    padding: screen.isMobile ? "16px 16px 8px" : "20px 24px 8px",
  }),
};

/* =========================
   Buttons
========================= */

export const buttons = {
  base: {
    border: "none",
    borderRadius: tokens.radius.md,
    fontWeight: 600,
    cursor: "pointer",
    padding: "10px 24px",
  },

  primary: {
    backgroundColor: tokens.colors.primary,
    color: "#fff",
  },

  success: {
    backgroundColor: tokens.colors.success,
    color: "#fff",
  },

  disabled: {
    backgroundColor: tokens.colors.primarySoft,
    cursor: "not-allowed",
    opacity: 0.75,
  },
};

/* =========================
   Form Controls
========================= */

export const forms = {
  input: (screen) => ({
    width: "100%",
    padding: screen.isMobile ? "12px" : "10px 12px",
    fontSize: 14,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border}`,
    outline: "none",
    backgroundColor: "#fff",
    boxSizing: "border-box",
  }),

  label: {
    fontSize: 12,
    fontWeight: 600,
    color: tokens.colors.textMuted,
  },
};

/* =========================
   Tables
========================= */

export const tables = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: 12,
    backgroundColor: tokens.colors.headerBg,
    fontSize: 12,
    fontWeight: 700,
    color: tokens.colors.textSecondary,
  },

  td: {
    padding: 12,
    borderTop: `1px solid ${tokens.colors.border}`,
    fontSize: 14,
    color: tokens.colors.textPrimary,
  },
};
