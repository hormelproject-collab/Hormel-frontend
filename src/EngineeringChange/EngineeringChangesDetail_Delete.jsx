import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = "";

const toText = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const formatDisplayDate = (value) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toText(value) || "-";

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");

  let hours = parsed.getHours();
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) hours = 12;

  return `${yyyy}-${mm}-${dd} ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm} CST`;
};

const uniqueBy = (rows, keyFn) => {
  const map = new Map();
  for (const row of rows || []) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, row);
  }
  return Array.from(map.values());
};

export default function EngineeringChangeDetailDeleteBOM() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const passedState = routerLocation.state || {};

  const engineeringChangeId =
    passedState.engineeringChangeNumber ||
    passedState.engineering_change_id ||
    passedState.engineeringChangeId ||
    passedState.raw?.engineering_change_id ||
    "";

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [detail, setDetail] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (engineeringChangeId) params.append("engineeringChangeId", engineeringChangeId);
    return params.toString();
  }, [engineeringChangeId]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setApiError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tables/engineering-changes-detail-delete-bom?${queryString}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        const payload = await response.json();

        if (!response.ok || payload?.success === false) {
          throw new Error(
            payload?.error ||
            payload?.message ||
            payload?.details ||
            `Failed to fetch delete BOM detail (${response.status})`
          );
        }

        setDetail(payload?.data || null);
      } catch (error) {
        console.error("Engineering delete BOM detail fetch error:", error);
        setApiError(error.message || "Failed to fetch engineering delete BOM detail");
      } finally {
        setLoading(false);
      }
    };

    if (queryString) fetchDetail();
    else setApiError("Missing Engineering Change ID for Deleted BOM change type.");
  }, [queryString]);

  const deletedBomRecords = safeArray(detail?.deletedBomRecords);

  const summaryBomRows = useMemo(() => {
    return uniqueBy(
      deletedBomRecords.map((row) => ({
        producedItem: toText(row.producedItem || row.item),
        itemDescription: toText(row.itemDescription || row.description),
        location: toText(row.location),
        bomId: toText(row.bomId || row.bom_id),
      })),
      (row) =>
        [
          row.bomId.toUpperCase(),
          row.location.toUpperCase(),
          row.producedItem.toUpperCase(),
        ].join("__")
    );
  }, [deletedBomRecords]);

  const connectedRoutingRows = useMemo(() => {
    const apiRows = safeArray(detail?.connectedRoutingRecords);
    const sourceRows = apiRows.length ? apiRows : deletedBomRecords;

    return uniqueBy(
      sourceRows
        .map((row) => ({
          bomId: toText(row.bomId || row.bom_id),
          resource: toText(row.resource),
          routingId: toText(row.routingId || row.routing_id),
        }))
        .filter((row) => row.bomId || row.resource || row.routingId),
      (row) =>
        [
          row.bomId.toUpperCase(),
          row.resource.toUpperCase(),
          row.routingId.toUpperCase(),
        ].join("__")
    );
  }, [detail, deletedBomRecords]);

  const styles = {
    page: {
      background: "#f3f4f6",
      minHeight: "100vh",
      padding: "32px 48px 48px 48px",
      fontFamily: "Segoe UI, Arial, sans-serif",
      color: "#111827",
    },
    backButton: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      border: "none",
      background: "transparent",
      color: "#2563eb",
      fontSize: "14px",
      cursor: "pointer",
      padding: 0,
      marginBottom: "8px",
    },
    title: {
      fontSize: "22px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "18px",
    },
    warningCard: {
      background: "#fff3df",
      border: "1px solid #f5d39b",
      borderRadius: "4px",
      padding: "14px 18px",
      marginBottom: "16px",
      maxWidth: "1270px",
      color: "#a15c00",
      fontSize: "14px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    tableCard: {
      background: "#ffffff",
      border: "1px solid #d5d7db",
      borderRadius: "4px",
      overflow: "hidden",
      maxWidth: "1270px",
      boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
      marginBottom: "24px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    thDeleted: {
      textAlign: "left",
      fontSize: "14px",
      fontWeight: 700,
      padding: "16px 18px",
      borderBottom: "1px solid #d5d7db",
      color: "#111827",
      background: "#f1dada",
    },
    thNeutral: {
      textAlign: "left",
      fontSize: "14px",
      fontWeight: 700,
      padding: "16px 18px",
      borderBottom: "1px solid #d5d7db",
      color: "#111827",
      background: "#f7f7f7",
    },
    td: {
      fontSize: "14px",
      padding: "16px 18px",
      borderBottom: "1px solid #d5d7db",
      color: "#111827",
      verticalAlign: "middle",
      wordBreak: "break-word",
      background: "#ffffff",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "8px",
      maxWidth: "1270px",
    },
    sectionSubText: {
      fontSize: "14px",
      color: "#1f5597",
      marginBottom: "12px",
      maxWidth: "1270px",
    },
    emptyRow: {
      textAlign: "center",
      color: "#6b7280",
      padding: "18px 12px",
      fontSize: "14px",
    },
    error: {
      color: "#d93025",
      fontSize: "14px",
      marginTop: "10px",
    },
    loading: {
      fontSize: "14px",
      color: "#374151",
    },
    metaLine: {
      maxWidth: "1270px",
      fontSize: "13px",
      color: "#4b5563",
      marginTop: "-12px",
      marginBottom: "16px",
    },infoCard: {
  background: "#dbeaf4",
  border: "1px solid #bfd3df",
  borderRadius: "4px",
  padding: "18px 22px",
  marginBottom: "24px",
  maxWidth: "1270px",
},

infoRow: {
  fontSize: "14px",
  color: "#0f3f66",
  marginBottom: "10px",
},

  };

  return (
    <div style={styles.page}>
      <button type="button" style={styles.backButton} onClick={() => navigate("/change-log")}>
        <span style={{ fontSize: "16px" }}>←</span>
        <span>BACK</span>
      </button>

      <div style={styles.title}>Step 2: Deleted BOM Summary</div>

      {loading ? (
        <div style={styles.loading}>Loading engineering delete BOM detail...</div>
      ) : apiError ? (
        <div style={styles.error}>{apiError}</div>
      ) : (
        <>
          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <strong>Engineering Change #:</strong>{" "}
              {toText(detail?.engineeringChangeId || engineeringChangeId) || "-"}
            </div>

            <div style={styles.infoRow}>
              <strong>Change Date:</strong>{" "}
              {formatDisplayDate(detail?.changeDate)}
            </div>

            <div style={styles.infoRow}>
              <strong>User:</strong>{" "}
              {toText(detail?.user) || "-"}
            </div>

            <div style={styles.infoRow}>
              <strong>Change Type:</strong>{" "}
              {toText(detail?.changeType) || "Deleted"}
            </div>

            <div style={styles.infoRow}>
              <strong>Change Summary:</strong>{" "}
              {toText(detail?.changeSummary) || "-"}
            </div>

            <div style={styles.infoRow}>
              <strong>Notes:</strong>{" "}
              {toText(detail?.notes) || "-"}
            </div>
          </div>

          <div style={styles.warningCard}>
            <span style={{ fontSize: "18px" }}>⚠</span>
            <span>Warning: The following records will be permanently deleted</span>
          </div>

          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thDeleted}>Produced Item</th>
                  <th style={styles.thDeleted}>Item Description</th>
                  <th style={styles.thDeleted}>Location</th>
                  <th style={styles.thDeleted}>BOM ID</th>
                </tr>
              </thead>
              <tbody>
                {summaryBomRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={styles.emptyRow}>No deleted BOM records found.</td>
                  </tr>
                ) : (
                  summaryBomRows.map((row, index) => (
                    <tr key={`${row.bomId}__${row.location}__${row.producedItem}__${index}`}>
                      <td style={styles.td}>{row.producedItem || "-"}</td>
                      <td style={styles.td}>{row.itemDescription || "-"}</td>
                      <td style={styles.td}>{row.location || "-"}</td>
                      <td style={styles.td}>{row.bomId || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.sectionTitle}>Connected Routing IDs</div>
          <div style={styles.sectionSubText}>
            The following Routing IDs are connected to the BOM records and will also be deleted
          </div>

          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thNeutral}>BOM ID</th>
                  <th style={styles.thNeutral}>Resource</th>
                  <th style={styles.thNeutral}>Routing ID</th>
                </tr>
              </thead>
              <tbody>
                {connectedRoutingRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={styles.emptyRow}>No connected routing records found.</td>
                  </tr>
                ) : (
                  connectedRoutingRows.map((row, index) => (
                    <tr key={`${row.bomId}__${row.resource}__${row.routingId}__${index}`}>
                      <td style={styles.td}>{row.bomId || "-"}</td>
                      <td style={styles.td}>{row.resource || "-"}</td>
                      <td style={styles.td}>{row.routingId || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
