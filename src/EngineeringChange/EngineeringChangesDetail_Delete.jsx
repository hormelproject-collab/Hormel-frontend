import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const toText = (value) => {
  if (value == null) return "";
  return String(value);
};

const formatDisplayDate = (value) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return toText(value) || "-";
  }

  const yyyy = parsed.getFullYear();
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");

  let hours = parsed.getHours();
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const CST = "CST";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${minutes}:${seconds} ${ampm} ${CST}`;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const isCoProductRow = (row) => {
  const value = String(
    row?.coProductAssociation ??
    row?.co_product_association ??
    row?.co_prod_association ??
    ""
  ).trim();

  return value === "1";
};

export default function EngineeringChangeDetailDeleteBOM() {
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const passedState = routerLocation.state || {};

  const engineeringChangeId =
    passedState.engineeringChangeNumber ||
    passedState.engineering_change_id ||
    passedState.engineeringChangeId ||
    "";

  const item =
    passedState.producedItem ||
    passedState.produced_item ||
    passedState.item ||
    "";

  const resource =
    passedState.resource ||
    (Array.isArray(passedState.resources) ? passedState.resources[0] : "") ||
    "";

  const bomId =
    passedState.bomId ||
    (Array.isArray(passedState.bomIds) ? passedState.bomIds[0] : "") ||
    "";

  const locationName =
    passedState.location ||
    (Array.isArray(passedState.locations) ? passedState.locations[0] : "") ||
    "";

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [detail, setDetail] = useState(null);
  const isConsolidatedDeleteFlow = String(
    passedState.changeSummary || passedState.change_summary || ""
  )
    .toLowerCase()
    .includes("all 4 consolidated tables");
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (engineeringChangeId) {
      params.append("engineeringChangeId", engineeringChangeId);
    }

    // IMPORTANT:
    // For consolidated delete flow, fetch all records for the engineering change ID.
    // Do not narrow using clicked row filters.
    if (!isConsolidatedDeleteFlow) {
      if (item) params.append("item", item);
      if (resource) params.append("resource", resource);
      if (bomId) params.append("bomId", bomId);
      if (locationName) params.append("location", locationName);
    }

    return params.toString();
  }, [
    engineeringChangeId,
    item,
    resource,
    bomId,
    locationName,
    isConsolidatedDeleteFlow,
  ]);
  ``

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setApiError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tables/engineering-changes-detail-delete-bom?${queryString}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Failed to fetch delete BOM detail (${response.status})`);
        }

        const payload = await response.json();
        setDetail(payload?.data || null);
      } catch (error) {
        console.error("Engineering delete BOM detail fetch error:", error);
        setApiError(error.message || "Failed to fetch engineering delete BOM detail");
      } finally {
        setLoading(false);
      }
    };

    if (queryString) {
      fetchDetail();
    } else {
      setApiError("Missing detail identifiers for Deleted BOM change type.");
    }
  }, [queryString]);

  const rows = safeArray(detail?.deletedBomRecords);
  const connectedRoutingRows = safeArray(detail?.connectedRoutingRecords);

  const showRoutingInDeletedTable = Boolean(detail?.showRoutingInDeletedTable);
  const showConnectedRoutingTable = Boolean(detail?.showConnectedRoutingTable);

  const styles = {
    page: {
      background: "#f3f4f6",
      minHeight: "100vh",
      padding: "32px 48px 48px 48px",
      fontFamily: "Segoe UI, Arial, sans-serif",
      color: "#111827",
    },

    coProductRow: {
      background: "#fef9c3",
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
    subtitle: {
      fontSize: "14px",
      color: "#4b5563",
      marginBottom: "18px",
    },
    warningCard: {
      background: "#efe4cf",
      border: "1px solid #e0cfaa",
      borderRadius: "4px",
      padding: "14px 18px",
      marginBottom: "16px",
      maxWidth: "960px",
      color: "#8a5a00",
      fontSize: "14px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    blueCard: {
      background: "#dff0fb",
      borderRadius: "4px",
      padding: "16px 18px",
      marginBottom: "14px",
      border: "1px solid #d2e9f8",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      maxWidth: "960px",
    },
    infoIcon: {
      color: "#0b79d0",
      fontSize: "18px",
      lineHeight: 1,
      marginTop: "1px",
    },
    blueCardContent: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      fontSize: "14px",
      color: "#0f172a",
    },
    label: {
      fontWeight: 700,
      color: "#111827",
    },
    value: {
      fontWeight: 400,
      color: "#111827",
    },
    tableCard: {
      background: "#ffffff",
      border: "1px solid #d5d7db",
      borderRadius: "4px",
      overflow: "hidden",
      maxWidth: "960px",
      boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
      marginBottom: "24px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    th: {
      textAlign: "left",
      fontSize: "13px",
      fontWeight: 500,
      padding: "14px 12px",
      borderBottom: "1px solid #d5d7db",
      color: "#111827",
      background: "#f3dede",
    },
    td: {
      fontSize: "13px",
      padding: "12px",
      borderBottom: "1px solid #d5d7db",
      color: "#111827",
      verticalAlign: "middle",
      wordBreak: "break-word",
    },
    neutralTh: {
      textAlign: "left",
      fontSize: "13px",
      fontWeight: 500,
      padding: "14px 12px",
      borderBottom: "1px solid #d5d7db",
      color: "#111827",
      background: "#f7f7f7",
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
    emptyRow: {
      textAlign: "center",
      color: "#6b7280",
      padding: "18px 12px",
      fontSize: "13px",
    },
    sectionTitle: {
      fontSize: "28px",
      fontWeight: 600,
      color: "#111827",
      marginBottom: "6px",
    },
    sectionSubText: {
      fontSize: "14px",
      color: "#2563eb",
      marginBottom: "12px",
      maxWidth: "960px",
    },
  };

  return (
    <div style={styles.page}>
      <button
        type="button"
        style={styles.backButton}
        onClick={() => navigate("/change-log")}
      >
        <span style={{ fontSize: "16px" }}>←</span>
        <span>BACK TO ENGINEERING CHANGE SUMMARY</span>
      </button>

      <div style={styles.title}>Engineering Change Detail: Deleted BOM Records</div>
      <div style={styles.subtitle}>Read-only view of deleted records</div>

      {loading ? (
        <div style={styles.loading}>Loading engineering delete BOM detail...</div>
      ) : apiError ? (
        <div style={styles.error}>{apiError}</div>
      ) : (
        <>
          <div style={styles.warningCard}>
            <span style={{ fontSize: "18px" }}>⚠</span>
            <span>Warning: The following records were permanently deleted</span>
          </div>

          <div style={styles.blueCard}>
            <div style={styles.infoIcon}>ⓘ</div>

            <div style={styles.blueCardContent}>
              <div>
                <span style={styles.label}>Engineering Change #: </span>
                <span style={styles.value}>
                  {toText(detail?.engineeringChangeId || engineeringChangeId) || "-"}
                </span>
              </div>

              <div>
                <span style={styles.label}>Change Date: </span>
                <span style={styles.value}>
                  {formatDisplayDate(detail?.changeDate)}
                </span>
              </div>

              <div>
                <span style={styles.label}>User: </span>
                <span style={styles.value}>{toText(detail?.user) || "-"}</span>
              </div>

              <div>
                <span style={styles.label}>Change Type: </span>
                <span style={styles.value}>
                  {toText(detail?.changeType || "Deleted")}
                </span>
              </div>

              <div>
                <span style={styles.label}>Notes: </span>
                <span style={styles.value}>
                  {toText(detail?.summaryNotes || detail?.notes) || "-"}
                </span>
              </div>

              <div>
                <span style={styles.label}>Change Summary: </span>
                <span style={styles.value}>
                  {toText(detail?.changeSummary) || "-"}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produced Item</th>
                  <th style={styles.th}>Item Description</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>BOM ID</th>
                  {showRoutingInDeletedTable && (
                    <th style={styles.th}>Routing ID</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showRoutingInDeletedTable ? 5 : 4}
                      style={styles.emptyRow}
                    >
                      No deleted BOM records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const highlighted = isCoProductRow(row);

                    return (
                      <tr
                        key={`${toText(row.recId || row.postgresqlRecId || row.bomId)}__${index}`}
                        style={highlighted ? styles.coProductRow : undefined}
                      >
                        <td style={styles.td}>{toText(row.producedItem) || "-"}</td>
                        <td style={styles.td}>{toText(row.itemDescription) || "-"}</td>
                        <td style={styles.td}>{toText(row.location) || "-"}</td>
                        <td style={styles.td}>{toText(row.bomId) || "-"}</td>
                        {showRoutingInDeletedTable && (
                          <td style={styles.td}>{toText(row.routingId) || "-"}</td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {showConnectedRoutingTable && (
            <>
              <div style={styles.sectionTitle}>Connected Routing IDs</div>
              <div style={styles.sectionSubText}>
                The following Routing IDs are connected to the BOM records and were also deleted
              </div>

              <div style={styles.tableCard}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.neutralTh}>BOM ID</th>
                      <th style={styles.neutralTh}>Resource</th>
                      <th style={styles.neutralTh}>Routing ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectedRoutingRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={styles.emptyRow}>
                          No connected routing records found.
                        </td>
                      </tr>
                    ) : (
                      connectedRoutingRows.map((row, index) => (
                        <tr key={`${toText(row.bomId)}__${toText(row.routingId)}__${index}`}>
                          <td style={styles.td}>{toText(row.bomId) || "-"}</td>
                          <td style={styles.td}>{toText(row.resource) || "-"}</td>
                          <td style={styles.td}>{toText(row.routingId) || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}