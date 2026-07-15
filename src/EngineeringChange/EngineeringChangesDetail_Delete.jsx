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

  return `${yyyy}-${mm}-${dd} ${String(hours).padStart(
    2,
    "0"
  )}:${minutes}:${seconds} ${ampm} CST`;
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

    if (engineeringChangeId) {
      params.append("engineeringChangeId", engineeringChangeId);
    }

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
        setApiError(
          error.message || "Failed to fetch engineering delete BOM detail"
        );
      } finally {
        setLoading(false);
      }
    };

    if (queryString) {
      fetchDetail();
    } else {
      setApiError("Missing Engineering Change ID for Deleted BOM change type.");
    }
  }, [queryString]);

  const deletedBomRecords = safeArray(detail?.deletedBomRecords);

  const isBomRoutingDelete = Boolean(
    detail?.isBomRoutingDelete ||
      String(detail?.summaryDisplayType || "").toUpperCase() ===
        "DELETED_ITEM_BOM_ROUTING_RECORD_SUMMARY" ||
      (String(detail?.changeSummary || "")
        .toLowerCase()
        .includes("bom_produced") &&
        String(detail?.changeSummary || "")
          .toLowerCase()
          .includes("item_bom_routing"))
  );

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

  const deletedRoutingRows = useMemo(() => {
    return uniqueBy(
      deletedBomRecords
        .map((row) => ({
          location: toText(row.location),
          item: toText(row.producedItem || row.item),
          bomId: toText(row.bomId || row.bom_id),
          resource: toText(row.resource),
          priority: toText(row.itemBomRoutingPriority || row.priority),
          routingId: toText(row.routingId || row.routing_id),
        }))
        .filter(
          (row) =>
            row.location ||
            row.item ||
            row.bomId ||
            row.resource ||
            row.priority ||
            row.routingId
        ),
      (row) =>
        [
          row.location.toUpperCase(),
          row.item.toUpperCase(),
          row.bomId.toUpperCase(),
          row.resource.toUpperCase(),
          row.priority.toUpperCase(),
          row.routingId.toUpperCase(),
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
      fontSize: "28px",
      fontWeight: 700,
      color: "#081a33",
      marginBottom: "26px",
    },
    warningCard: {
      background: "#fff7ed",
      border: "1px solid #fdba74",
      borderRadius: "4px",
      padding: "16px 18px",
      marginBottom: "20px",
      maxWidth: "100%",
      color: "#b93800",
      fontSize: "16px",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    tableCard: {
      background: "#ffffff",
      border: "1px solid #d5d7db",
      borderRadius: "4px",
      overflow: "hidden",
      maxWidth: "100%",
      boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
      marginBottom: "26px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    thDeleted: {
      textAlign: "left",
      fontSize: "16px",
      fontWeight: 700,
      padding: "22px 18px",
      borderBottom: "1px solid #d5d7db",
      color: "#000000",
      background: "#efd4d4",
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
      fontSize: "16px",
      padding: "18px 22px",
      borderBottom: "1px solid #d5d7db",
      color: "#02142c",
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
    infoCard: {
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
    notesBox: {
      background: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: "4px",
      minHeight: "92px",
      maxWidth: "100%",
      marginTop: "0px",
      marginBottom: "24px",
      padding: "20px 16px",
      color: "#6b7280",
      fontSize: "20px",
      boxSizing: "border-box",
    },
    actionBar: {
      display: "flex",
      alignItems: "center",
      gap: "18px",
      marginTop: "6px",
    },
    deleteButton: {
      background: "#dc2b24",
      color: "#ffffff",
      border: "none",
      borderRadius: "4px",
      padding: "20px 46px",
      fontSize: "16px",
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 2px 4px rgba(0,0,0,0.18)",
    },
    mainMenuButton: {
      background: "#ffffff",
      color: "#1f5fbf",
      border: "1px solid #60a5fa",
      borderRadius: "4px",
      padding: "19px 28px",
      fontSize: "18px",
      fontWeight: 700,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
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
        <span>BACK</span>
      </button>

      <div style={styles.title}>
        {isBomRoutingDelete
          ? "Step 2: Deleted Item BOM Routing Record Summary"
          : "Step 2: Deleted BOM Summary"}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading engineering delete BOM detail...</div>
      ) : apiError ? (
        <div style={styles.error}>{apiError}</div>
      ) : (
        <>
          {!isBomRoutingDelete && (
            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <strong>Engineering Change #:</strong>{" "}
                {toText(detail?.engineeringChangeId || engineeringChangeId) ||
                  "-"}
              </div>

              <div style={styles.infoRow}>
                <strong>Change Date:</strong>{" "}
                {formatDisplayDate(detail?.changeDate)}
              </div>

              <div style={styles.infoRow}>
                <strong>User:</strong> {toText(detail?.user) || "-"}
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
                <strong>Notes:</strong> {toText(detail?.notes) || "-"}
              </div>
            </div>
          )}

          <div style={styles.warningCard}>
            <span>
              {isBomRoutingDelete
                ? "Warning: When a parent item is selected, the associated co-products are also deleted."
                : "Warning: The following records will be permanently deleted"}
            </span>
          </div>

          {isBomRoutingDelete ? (
            <>
              <div style={styles.tableCard}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.thDeleted}>Location</th>
                      <th style={styles.thDeleted}>Item</th>
                      <th style={styles.thDeleted}>BOM ID</th>
                      <th style={styles.thDeleted}>Resource</th>
                      <th style={styles.thDeleted}>Priority</th>
                      <th style={styles.thDeleted}>Routing ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {deletedRoutingRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={styles.emptyRow}>
                          No deleted routing records found.
                        </td>
                      </tr>
                    ) : (
                      deletedRoutingRows.map((row, index) => (
                        <tr
                          key={`${row.location}_${row.item}_${row.bomId}_${row.resource}_${row.routingId}_${index}`}
                        >
                          <td style={styles.td}>{row.location || "-"}</td>
                          <td style={styles.td}>{row.item || "-"}</td>
                          <td style={styles.td}>{row.bomId || "-"}</td>
                          <td style={styles.td}>{row.resource || "-"}</td>
                          <td style={styles.td}>{row.priority || "-"}</td>
                          <td style={styles.td}>{row.routingId || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={styles.notesBox}>
                {toText(detail?.notes || detail?.summaryNotes) ||
                  "Notes (Optional)"}
              </div>

              <div style={styles.actionBar}>
                <button type="button" style={styles.deleteButton}>
                  CONFIRM DELETION
                </button>

                <button
                  type="button"
                  style={styles.mainMenuButton}
                  onClick={() => navigate("/change-log")}
                >
                  <span style={{ fontSize: "14px" }}>⌂</span>
                  <span>RETURN TO MAIN MENU</span>
                </button>
              </div>
            </>
          ) : (
            <>
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
                        <td colSpan={4} style={styles.emptyRow}>
                          No deleted BOM records found.
                        </td>
                      </tr>
                    ) : (
                      summaryBomRows.map((row, index) => (
                        <tr
                          key={`${row.bomId}_${row.location}_${row.producedItem}_${index}`}
                        >
                          <td style={styles.td}>{row.producedItem || "-"}</td>
                          <td style={styles.td}>
                            {row.itemDescription || "-"}
                          </td>
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
                The following Routing IDs are connected to the BOM records and
                will also be deleted
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
                        <td colSpan={3} style={styles.emptyRow}>
                          No connected routing records found.
                        </td>
                      </tr>
                    ) : (
                      connectedRoutingRows.map((row, index) => (
                        <tr
                          key={`${row.bomId}_${row.resource}_${row.routingId}_${index}`}
                        >
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
        </>
      )}
    </div>
  );
}