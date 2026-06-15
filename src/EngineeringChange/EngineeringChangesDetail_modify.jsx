import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, "0");

  return `${yyyy}-${dd}-${mm} ${hh}:${minutes}:${seconds} ${ampm}`;
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f2f2f2",
    padding: "24px 32px 40px 32px",
    fontFamily: "Segoe UI, Arial, sans-serif",
    color: "#000",
  },
  backLink: {
    border: "none",
    background: "none",
    color: "#0f62fe",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
    marginBottom: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    margin: "0 0 8px 0",
    color: "#000",
  },
  subtitle: {
    fontSize: "14px",
    color: "#555",
    margin: "0 0 18px 0",
  },
  infoCard: {
    background: "#dcedf8",
    border: "1px solid #cbdde9",
    padding: "14px 18px",
    marginBottom: "28px",
  },
  infoLine: {
    fontSize: "14px",
    lineHeight: "1.9",
    color: "#003b5c",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  infoLabel: {
    fontWeight: 600,
  },
  section: {
    marginBottom: "28px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    margin: "0 0 12px 0",
    color: "#000",
  },
  tableWrapper: {
    background: "#fff",
    border: "1px solid #d9d9d9",
    borderRadius: "2px",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  th: {
    background: "#f3f3f3",
    color: "#222",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: 500,
    padding: "12px",
    borderBottom: "1px solid #d9d9d9",
  },
  td: {
    fontSize: "14px",
    color: "#111",
    padding: "12px",
    borderBottom: "1px solid #e6e6e6",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  changedRow: {
    background: "#f6f2dd",
  },
  updatedValueChanged: {
    color: "#0f62fe",
    fontWeight: 600,
  },
  empty: {
    textAlign: "center",
    color: "#777",
    padding: "24px",
  },
  loadingBox: {
    background: "#fff",
    border: "1px solid #d9d9d9",
    padding: "20px",
    fontSize: "15px",
  },
  errorBox: {
    background: "#fff",
    border: "1px solid #d9d9d9",
    padding: "20px",
    fontSize: "15px",
    color: "#c62828",
  },
};

const ChangeTable = ({ title, rows }) => {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Field</th>
              <th style={styles.th}>Original Value</th>
              <th style={styles.th}>Updated Value</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, index) => {
                const baseCellStyle = row.changed
                  ? { ...styles.td, ...styles.changedRow }
                  : styles.td;

                return (
                  <tr key={`${row.field}-${index}`}>
                    <td style={baseCellStyle}>{row.field || "-"}</td>
                    <td style={baseCellStyle}>{row.originalValue || "-"}</td>
                    <td
                      style={
                        row.changed
                          ? {
                              ...baseCellStyle,
                              ...styles.updatedValueChanged,
                            }
                          : baseCellStyle
                      }
                    >
                      {row.updatedValue || "-"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td style={{ ...styles.td, ...styles.empty }} colSpan={3}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EngineeringChangeDetailModify = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const passedState = routerLocation.state || {};

  const engineeringChangeId =
    passedState.engineeringChangeNumber ||
    passedState.engineering_change_id ||
    passedState.engineeringChangeId ||
    "";

  const changeDate =
    passedState.changeDateDisplay ||
    passedState.change_date ||
    passedState.changeDate ||
    "";

  const changedBy =
    passedState.user ||
    passedState.changed_by ||
    passedState.changedBy ||
    "";

  const producedItem =
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

  const componentItem =
    (Array.isArray(passedState.componentItems)
      ? passedState.componentItems[0]
      : passedState.componentItems) || "";

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [detail, setDetail] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (engineeringChangeId) params.append("engineeringChangeId", engineeringChangeId);
    if (bomId) params.append("bomId", bomId);
    if (locationName) params.append("location", locationName);
    if (resource) params.append("resource", resource);
    if (producedItem) params.append("producedItem", producedItem);
    if (componentItem) params.append("componentItem", componentItem);

    return params.toString();
  }, [engineeringChangeId, bomId, locationName, resource, producedItem, componentItem]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setApiError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tables/engineering-changes-detail-modify?${queryString}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message ||
            result?.details ||
            `Failed to fetch engineering modify detail (${response.status})`
          );
        }

        setDetail(result.data || null);
      } catch (error) {
        console.error("Engineering modify detail fetch error:", error);
        setApiError(error.message || "Failed to fetch engineering modify detail");
      } finally {
        setLoading(false);
      }
    };

    if (queryString) {
      fetchDetail();
    } else {
      setApiError("Missing detail identifiers for Modify change type.");
    }
  }, [queryString]);

  const header = useMemo(() => detail?.header || {}, [detail]);
  const bomRecordDetails = useMemo(
    () => detail?.bomRecordDetails || [],
    [detail]
  );
  const componentItemChanges = useMemo(
    () => detail?.componentItemChanges || [],
    [detail]
  );
  const coProductChanges = useMemo(
    () => detail?.coProductChanges || [],
    [detail]
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingBox}>Loading engineering change detail...</div>
      </div>
    );
  }

  const DetailsTable = ({ title, rows }) => {
    return (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Field</th>
                <th style={styles.th}>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows?.length ? (
                rows.map((row, index) => (
                  <tr key={`${row.field}-${index}`}>
                    <td style={styles.td}>{row.field || "-"}</td>
                    <td style={styles.td}>{row.value || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ ...styles.td, ...styles.empty }} colSpan={2}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (apiError) {
    return (
      <div style={styles.page}>
        <button
          style={styles.backLink}
          onClick={() => navigate("/change-log")}
        >
          ← BACK TO ENGINEERING CHANGE SUMMARY
        </button>

        <div style={styles.errorBox}>{apiError}</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button
        style={styles.backLink}
        onClick={() => navigate("/change-log")}
      >
        ← BACK TO ENGINEERING CHANGE SUMMARY
      </button>

      <h1 style={styles.title}>Engineering Change Detail: Modified BOM Record</h1>
      <p style={styles.subtitle}>Read-only view of change details</p>

      <div style={styles.infoCard}>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>ⓘ Engineering Change #:</span>
          <span>{toText(header.engineeringChangeId || engineeringChangeId) || "-"}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>Change Date:</span>
          <span>{formatDisplayDate(header.changeDate || changeDate)}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>User:</span>
          <span>{toText(header.userName || changedBy) || "-"}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>Change Type:</span>
          <span>{toText(header.changeType) || "Modified"}</span>
        </div>

        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>Notes:</span>
          <span>{header.summaryNotes || "-"}</span>
        </div>
      </div>

      <DetailsTable
        title="BOM Record Details"
        rows={bomRecordDetails}
      />

      <ChangeTable
        title="Component Item Changes"
        rows={componentItemChanges}
      />

      <ChangeTable
        title="Co-Product Changes"
        rows={coProductChanges}
      />
    </div>
  );
};

export default EngineeringChangeDetailModify;
