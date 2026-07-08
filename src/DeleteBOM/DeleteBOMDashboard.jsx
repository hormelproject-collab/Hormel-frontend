import React from "react";
import { useNavigate } from "react-router-dom";

export default function DeleteBomHome() {
  const navigate = useNavigate();

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      color: "#111827",
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },

    header: {
      height: "36px",
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },

    headerTitle: {
      fontSize: "12px",
      fontWeight: 600,
      color: "#111827",
      letterSpacing: "0.1px",
    },

    content: {
      maxWidth: "760px",
      margin: "0 auto",
      padding: "28px 24px 80px",
    },

    backButton: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "transparent",
      border: "none",
      color: "#2563eb",
      fontSize: "13px",
      fontWeight: 500,
      cursor: "pointer",
      padding: 0,
      marginBottom: "8px",
    },

    backArrow: {
      fontSize: "18px",
      lineHeight: 1,
    },

    centerBlock: {
      maxWidth: "675px",
      margin: "0 auto",
      textAlign: "center",
      paddingTop: "6px",
    },

    title: {
      margin: 0,
      fontSize: "42px",
      lineHeight: 1.2,
      fontWeight: 700,
      color: "#111827",
    },

    subtitle: {
      margin: "10px 0 28px",
      fontSize: "15px",
      color: "#4b5563",
    },

    cardList: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },

    card: {
      width: "100%",
      textAlign: "left",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      padding: "18px 16px",
      cursor: "pointer",
      boxShadow: "0 2px 3px rgba(0, 0, 0, 0.08)",
      transition: "all 0.15s ease",
    },

    cardTitle: {
      fontSize: "16px",
      fontWeight: 600,
      color: "#111827",
      marginBottom: "8px",
    },

    cardSubtitle: {
      fontSize: "14px",
      color: "#4b5563",
      fontWeight: 400,
    },
  };

  const handleBack = () => {
    navigate("/"); // change if needed
  };

  const handleDeleteFullBom = () => {
    navigate("/delete-bom-dashboard/delete-existing-bom"); // change if needed
  };

  const handleDeleteRoutingRecord = () => {
    navigate("/delete-bom-dashboard/delete-existing-ibr"); // change if needed
  };

  return (
    <div style={styles.page}>
      
      <header style={styles.header}>
        <div style={styles.headerTitle}>BOM Data Management App</div>
      </header>

      
      <main style={styles.content}>
        <button
          type="button"
          onClick={handleBack}
          style={styles.backButton}
        >
          <span style={styles.backArrow}>←</span>
          <span>BACK TO MAIN MENU</span>
        </button>

        <section style={styles.centerBlock}>
          <h1 style={styles.title}>Delete BOM</h1>
          <p style={styles.subtitle}>
            Choose which type of deletion to perform
          </p>

          <div style={styles.cardList}>
            <button
              type="button"
              style={styles.card}
              onClick={handleDeleteFullBom}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 14px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 3px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div style={styles.cardTitle}>Delete Full BOM</div>
              <div style={styles.cardSubtitle}>Delete complete BOM records</div>
            </button>

            <button
              type="button"
              style={styles.card}
              onClick={handleDeleteRoutingRecord}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 14px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 3px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div style={styles.cardTitle}>Delete Item BOM Routing Record</div>
              <div style={styles.cardSubtitle}>Delete specific routing records</div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
