import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { fetchEngineeringChangeDetail } from "../Services/EngineeringChangeDetailServices";

export default function EngineeringChangeDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

const location = useLocation();
console.log("engineeringchange",location.state);
const engineeringChangeId = location.state;

  

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    // ✅ If ID missing, don’t call API
    if (!engineeringChangeId) {
      setData(null);
      setLoading(false);
      setErr("Engineering Change ID is missing. Please open this page from Engineering Changes list.");
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setErr("");

    fetchEngineeringChangeDetail(engineeringChangeId)
      .then((d) => {
        if (!mounted) return;
        setData(d);
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e?.message || "Something went wrong");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [engineeringChangeId]);

  const styles = useMemo(
    () => ({
      page: { background: "#fff", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" },
      headerWrap: { padding: "26px 34px 18px", borderBottom: "1px solid #eee" },

      headerRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      },

      titleWrap: { display: "flex", flexDirection: "column" },
      title: { fontSize: 34, fontWeight: 700, color: "#111", margin: 0 },
      subtitle: { marginTop: 6, color: "#6b7280", fontSize: 14 },

      backBtn: {
        border: "1px solid #e5e7eb",
        background: "#fff",
        padding: "10px 14px",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 700,
        color: "#111",
      },

      container: { maxWidth: 1220, margin: "0 auto", padding: "22px 26px 60px" },

      topCard: {
        marginTop: 10,
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        padding: "26px 28px",
      },

      topRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 18,
        alignItems: "center",
      },

      topItem: { display: "flex", gap: 14, alignItems: "center" },
      iconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "#f3f4f6",
        display: "grid",
        placeItems: "center",
        border: "1px solid #e5e7eb",
      },
      topLabel: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
      topValue: { fontSize: 22, fontWeight: 700, color: "#111" },

      pill: {
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 14px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 16,
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fde68a",
      },

      sectionCard: {
        marginTop: 22,
        border: "1px solid #eee",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      },

      sectionHeader: {
        background: "#fff9e6",
        padding: "22px 24px",
        borderBottom: "1px solid #f1e7c7",
      },
      sectionTitle: { margin: 0, fontSize: 26, fontWeight: 800, color: "#111" },
      sectionSub: { marginTop: 8, color: "#6b7280", fontSize: 14 },

      table: { width: "100%", borderCollapse: "collapse" },
      thRow: { background: "#fff" },
      th: {
        textAlign: "left",
        fontSize: 12,
        letterSpacing: 0.8,
        color: "#6b7280",
        padding: "14px 24px",
        borderBottom: "1px solid #eee",
      },
      td: { padding: "18px 24px", borderBottom: "1px solid #eee", verticalAlign: "middle" },

      fieldCell: { fontWeight: 700, color: "#111", display: "flex", alignItems: "center", gap: 10 },
      changedTag: {
        fontSize: 12,
        fontWeight: 800,
        padding: "6px 10px",
        borderRadius: 10,
        background: "#fde68a",
        color: "#92400e",
        border: "1px solid #fcd34d",
      },

      changedRow: { background: "#fffdf3" },
      updatedChangedCell: { background: "#fff6cf", fontWeight: 800 },

      arrowCell: { width: 40, color: "#d97706", fontSize: 22, textAlign: "center" },

      coProductWrap: { padding: "22px 24px" },
      coProductTitle: { margin: "0 0 14px", fontSize: 18, fontWeight: 800, color: "#111" },
      coGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
      boxLabel: { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 },
      inputBox: {
        width: "100%",
        padding: "14px 14px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#fff",
        color: "#111",
        fontSize: 14,
      },

      status: { padding: "16px 26px", color: "#374151" },
      error: { padding: "16px 26px", color: "#b91c1c", fontWeight: 700 },
    }),
    []
  );

  const DocIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="#6b7280" strokeWidth="1.8" />
      <path d="M14 3v6h6" stroke="#6b7280" strokeWidth="1.8" />
    </svg>
  );

  const CalIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 3v3M17 3v3" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M4 8h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="#6b7280"
        strokeWidth="1.8"
      />
    </svg>
  );

  const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="#6b7280" strokeWidth="1.8" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  const TagIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 12l-8 8-10-10V2h8l10 10Z" stroke="#6b7280" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 7h.01" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  return (
    <div style={styles.page}>
      <div style={styles.headerWrap}>
        <div style={styles.headerRow}>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Engineering Change Detail</h1>
            <div style={styles.subtitle}>View detailed information about this change</div>
          </div>

          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>

      <div style={styles.container}>
        {loading && <div style={styles.status}>Loading…</div>}
        {!!err && !loading && <div style={styles.error}>{err}</div>}

        {!loading && !err && data && (
          <>
            {/* Top Summary Card */}
            <div style={styles.topCard}>
              <div style={styles.topRow}>
                <div style={styles.topItem}>
                  <div style={styles.iconBox}>
                    <DocIcon />
                  </div>
                  <div>
                    <div style={styles.topLabel}>Engineering Change #</div>
                    <div style={styles.topValue}>{data.engineeringChangeId}</div>
                  </div>
                </div>

                <div style={styles.topItem}>
                  <div style={styles.iconBox}>
                    <CalIcon />
                  </div>
                  <div>
                    <div style={styles.topLabel}>Change Date</div>
                    <div style={styles.topValue}>{data.changeDate}</div>
                  </div>
                </div>

                <div style={styles.topItem}>
                  <div style={styles.iconBox}>
                    <TagIcon />
                  </div>
                  <div>
                    <div style={styles.topLabel}>Change Type</div>
                    <span style={styles.pill}>{data.changeType}</span>
                  </div>
                </div>

                <div style={styles.topItem}>
                  <div style={styles.iconBox}>
                    <UserIcon />
                  </div>
                  <div>
                    <div style={styles.topLabel}>Changed By</div>
                    <div style={styles.topValue}>{data.changedBy}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOM Record Changes */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>BOM Record Changes</h2>
                <div style={styles.sectionSub}>Changed fields are highlighted</div>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>FIELD</th>
                    <th style={styles.th}>ORIGINAL VALUE</th>
                    <th style={styles.th}></th>
                    <th style={styles.th}>UPDATED VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bomRecordChanges?.map((row, idx) => {
                    const rowStyle = row.changed ? styles.changedRow : undefined;
                    const updatedCellStyle = row.changed ? { ...styles.td, ...styles.updatedChangedCell } : styles.td;

                    return (
                      <tr key={idx} style={rowStyle}>
                        <td style={styles.td}>
                          <div style={styles.fieldCell}>
                            <span>{row.field}</span>
                            {row.changed && <span style={styles.changedTag}>Changed</span>}
                          </div>
                        </td>
                        <td style={styles.td}>{row.originalValue}</td>
                        <td style={{ ...styles.td, ...styles.arrowCell }}>{row.changed ? "→" : ""}</td>
                        <td style={updatedCellStyle}>{row.updatedValue}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Co-Product Information */}
              <div style={styles.coProductWrap}>
                <div style={styles.coProductTitle}>Co-Product Information</div>
                <div style={styles.coGrid}>
                  <div>
                    <div style={styles.boxLabel}>Original</div>
                    <input style={styles.inputBox} value={data.coProductInformation?.original || ""} readOnly />
                  </div>
                  <div>
                    <div style={styles.boxLabel}>Updated</div>
                    <input style={styles.inputBox} value={data.coProductInformation?.updated || ""} readOnly />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}