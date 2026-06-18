import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const toText = (value) => {
  if (value == null) return "";
  return String(value);
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

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

  return `${yyyy}-${dd}-${mm} ${hh}:${minutes}:${seconds} ${ampm} ${CST}`;
};

export default function EngineeringChangeDetailAdd() {
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
          `${API_BASE_URL}/api/tables/engineering-changes-detail-add?${queryString}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            errText || `Failed to fetch add detail (${response.status})`
          );
        }

        const data = await response.json();
        setDetail(data);
      } catch (error) {
        console.error("Engineering add detail fetch error:", error);
        setApiError(error.message || "Failed to fetch engineering add detail");
      } finally {
        setLoading(false);
      }
    };

    if (queryString) {
      fetchDetail();
    } else {
      setApiError("Missing detail identifiers for Add change type.");
    }
  }, [queryString]);

  const createdRows = safeArray(detail?.createdRecords);

  const changeSummaryText = toText(
    detail?.changeSummary || passedState.changeSummary || ""
  ).toLowerCase();

  const isAddedIBRFlow =
    changeSummaryText.includes("added in item bom routing") ||
    changeSummaryText.includes("item bom routing");

  const styles = {
    page: {
      background: "#f5f5f7",
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
    subtitle: {
      fontSize: "14px",
      color: "#4b5563",
      marginBottom: "18px",
    },
    blueCard: {
      background: "#dff0fb",
      borderRadius: "4px",
      padding: "16px 18px",
      marginBottom: "16px",
      border: "1px solid #d2e9f8",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      maxWidth: "980px",
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
      width: "100%",
    },
    whiteCard: {
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      padding: "20px 18px",
      maxWidth: "980px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      marginBottom: "16px",
    },
    detailRow: {
      fontSize: "14px",
      color: "#111827",
      marginBottom: "12px",
      lineHeight: 1.4,
    },
    label: {
      fontWeight: 700,
      color: "#111827",
    },
    value: {
      fontWeight: 400,
      color: "#111827",
    },
    error: {
      color: "#d93025",
      fontSize: "14px",
      marginTop: "10px",
      whiteSpace: "pre-wrap",
    },
    loading: {
      fontSize: "14px",
      color: "#374151",
    },
    cardGrid: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      maxWidth: "980px",
    },
    cardTitle: {
      fontSize: "16px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "14px",
    },
    emptyBox: {
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      padding: "20px 18px",
      maxWidth: "980px",
      fontSize: "14px",
      color: "#6b7280",
    },
    sectionTitle: {
      fontSize: "15px",
      fontWeight: 700,
      color: "#111827",
      marginTop: "18px",
      marginBottom: "10px",
    },
    nestedTable: {
      width: "100%",
      borderCollapse: "collapse",
      border: "1px solid #e5e7eb",
      marginTop: "8px",
    },
    nestedTh: {
      textAlign: "left",
      padding: "10px 12px",
      fontSize: "12px",
      fontWeight: 700,
      color: "#374151",
      background: "#f3f4f6",
      borderBottom: "1px solid #e5e7eb",
    },
    nestedTd: {
      padding: "10px 12px",
      fontSize: "14px",
      color: "#111827",
      borderTop: "1px solid #e5e7eb",
      verticalAlign: "top",
    },
    emptySubText: {
      fontSize: "14px",
      color: "#6b7280",
      marginTop: "4px",
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

      <div style={styles.title}>Engineering Change Detail: Added BOM Records</div>
      <div style={styles.subtitle}>Read-only view of added records</div>

      {loading ? (
        <div style={styles.loading}>Loading engineering add detail...</div>
      ) : apiError ? (
        <div style={styles.error}>{apiError}</div>
      ) : (
        <>
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
                  {formatDisplayDate(detail?.changeDate || changeDate)}
                </span>
              </div>
              <div>
                <span style={styles.label}>User: </span>
                <span style={styles.value}>
                  {toText(detail?.user || changedBy) || "-"}
                </span>
              </div>
              <div>
                <span style={styles.label}>Change Type: </span>
                <span style={styles.value}>
                  {toText(detail?.changeType || "Added")}
                </span>
              </div>
              <div>
                <span style={styles.label}>Notes: </span>
                <span style={styles.value}>
                  {toText(detail?.summaryNotes) || "-"}
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

          {createdRows.length === 0 ? (
            <div style={styles.emptyBox}>No created BOM detail records found.</div>
          ) : (
            <div style={styles.cardGrid}>
              {createdRows.map((row, index) => {
                const components = safeArray(row.components);
                const coProducts = safeArray(row.coProducts);

                return (
                  <div key={row.key || index} style={styles.whiteCard}>
                    <div style={styles.cardTitle}>BOM Detail {index + 1}</div>

                    <div style={styles.detailRow}>
                      <span style={styles.label}>Item: </span>
                      <span style={styles.value}>
                        {toText(row.item || detail?.item || item) || "-"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.label}>Resource: </span>
                      <span style={styles.value}>
                        {toText(row.resource || detail?.resource || resource) || "-"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.label}>Routing ID: </span>
                      <span style={styles.value}>
                        {toText(row.routingId || detail?.routingId) || "-"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.label}>BOM ID: </span>
                      <span style={styles.value}>
                        {toText(row.bomId || detail?.bomId || bomId) || "-"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.label}>Item BOM Routing Priority: </span>
                      <span style={styles.value}>
                        {toText(
                          row.itemBomRoutingPriority ||
                            row.item_bom_routing_priority ||
                            detail?.itemBomRoutingPriority ||
                            detail?.item_bom_routing_priority
                        ) || "-"}
                      </span>
                    </div>

                    {!isAddedIBRFlow && (
                      <>
                        <div style={styles.sectionTitle}>Component Details</div>
                        {components.length === 0 ? (
                          <div style={styles.emptySubText}>No component items added.</div>
                        ) : (
                          <table style={styles.nestedTable}>
                            <thead>
                              <tr>
                                <th style={styles.nestedTh}>Component Item</th>
                                <th style={styles.nestedTh}>Standard Usage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {components.map((component, componentIndex) => (
                                <tr key={component.key || componentIndex}>
                                  <td style={styles.nestedTd}>
                                    {toText(component.componentItem) || "-"}
                                  </td>
                                  <td style={styles.nestedTd}>
                                    {toText(component.standardUsage) || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}

                    <div style={styles.sectionTitle}>Co-Product Details</div>
                    {coProducts.length === 0 ? (
                      <div style={styles.emptySubText}>No co-product items added.</div>
                    ) : (
                      <table style={styles.nestedTable}>
                        <thead>
                          <tr>
                            <th style={styles.nestedTh}>Co-Product Item</th>
                            <th style={styles.nestedTh}>Qty Produced Per</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coProducts.map((coProduct, coIndex) => (
                            <tr key={coProduct.key || coIndex}>
                              <td style={styles.nestedTd}>
                                {toText(coProduct.coProductItem) || "-"}
                              </td>
                              <td style={styles.nestedTd}>
                                {toText(coProduct.qtyProducedPer) || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}