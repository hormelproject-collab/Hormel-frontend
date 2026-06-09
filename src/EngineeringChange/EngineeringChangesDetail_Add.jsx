import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const toText = (value) => {
  if (value == null) return "";
  return String(value);
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

    if (engineeringChangeId) params.append("engineeringChangeId", engineeringChangeId);
    if (item) params.append("item", item);
    if (resource) params.append("resource", resource);
    if (bomId) params.append("bomId", bomId);
    if (locationName) params.append("location", locationName);

    return params.toString();
  }, [engineeringChangeId, item, resource, bomId, locationName]);

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
          throw new Error(errText || `Failed to fetch add detail (${response.status})`);
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
      marginBottom: "14px",
      border: "1px solid #d2e9f8",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      maxWidth: "860px",
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
    whiteCard: {
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      padding: "20px 18px",
      maxWidth: "860px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },
    detailRow: {
      fontSize: "14px",
      color: "#111827",
      marginBottom: "14px",
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
    },
    loading: {
      fontSize: "14px",
      color: "#374151",
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

      <div style={styles.title}>Engineering Change Detail: Added Item BOM Routing Record</div>
      <div style={styles.subtitle}>Read-only view of added routing record</div>

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
                  {toText(detail?.engineeringChangeId || engineeringChangeId)}
                </span>
              </div>

              <div>
                <span style={styles.label}>Change Date: </span>
                <span style={styles.value}>
                  {toText(detail?.changeDate || changeDate)}
                </span>
              </div>

              <div>
                <span style={styles.label}>User: </span>
                <span style={styles.value}>
                  {toText(detail?.user || changedBy)}
                </span>
              </div>

              <div>
                <span style={styles.label}>Change Type: </span>
                <span style={styles.value}>Added</span>
              </div>
            </div>
          </div>

          <div style={styles.whiteCard}>
            <div style={styles.detailRow}>
              <span style={styles.label}>Item: </span>
              <span style={styles.value}>{toText(detail?.item)}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>Item Release Flag: </span>
              <span style={styles.value}>{toText(detail?.itemReleaseFlag)}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>Resource: </span>
              <span style={styles.value}>{toText(detail?.resource)}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>Resource Relevancy: </span>
              <span style={styles.value}>{toText(detail?.resourceRelevancy)}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>Routing ID: </span>
              <span style={styles.value}>{toText(detail?.routingId)}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>BOM ID: </span>
              <span style={styles.value}>{toText(detail?.bomId)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
