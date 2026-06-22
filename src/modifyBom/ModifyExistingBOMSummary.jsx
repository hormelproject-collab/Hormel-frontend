import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ModifyExistingBOMSummary = () => {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const record = routerLocation?.state?.record ?? {};
  const componentItems = routerLocation?.state?.componentItems ?? [];
  const coProducts = routerLocation?.state?.coProducts ?? [];

  const resolvedRoutingId = useMemo(() => {
    const directRoutingId =
      record?.routing_id ||
      record?.routingId ||
      record?.resourceInfo?.routingId ||
      record?.resourceInfo?.routing_id ||
      "";

    if (directRoutingId) {
      return directRoutingId;
    }

    const produced =
      record?.produced_item ||
      record?.item ||
      "";

    const resource =
      record?.resource ||
      record?.resourceInfo?.resource ||
      "";

    if (produced && resource) {
      return `ROUTING_${produced}_${resource}`;
    }

    return "";
  }, [record]);

  const resolvedPriority = useMemo(() => {
    const value = record?.priority;
    if (value === "" || value === null || value === undefined) {
      return "";
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : "";
  }, [record]);

  const resolvedCreationDate = useMemo(() => {
    return (
      record?.creation_date ||
      record?.creationDate ||
      record?.load_datetime ||
      record?.change_date ||
      ""
    );
  }, [record]);

  const componentChanges = componentItems.flatMap((item, index) => [
    {
      field: `Component Item ${index + 1}`,
      original: item.original_component_item || item.component_item || "-",
      updated: item.component_item || "-",
    },
    {
      field: `Component Item Description ${index + 1}`,
      original: item.original_component_desc || "-",
      updated: item.component_desc || "-",
    },
    {
      field: `Standard Usage ${index + 1}`,
      original: item.original_standard_usage || "-",
      updated: item.standard_usage || "-",
    },
  ]);

  const coProductChanges = coProducts.flatMap((cp, index) => [
    {
      field: `Co-Product Item ${index + 1}`,
      original: cp.original_item || cp.item || "-",
      updated: cp.item || "-",
    },
    {
      field: `Co-Product Item Description ${index + 1}`,
      original: cp.original_desc || "-",
      updated: cp.desc || "-",
    },
    {
      field: `Co-Product Quantity Produced ${index + 1}`,
      original: cp.original_qty || "-",
      updated: cp.qty || "-",
    },
  ]);
  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSuccessMessage("");

      const payload = {
        bomId: record?.bom_id || "",
        engineeringChange: {
          ecNumber: record?.ec_number || record?.ecNumber || "",
          creationDate: resolvedCreationDate,
        },
        producedItem: {
          item: record?.produced_item || "",
          status: record?.item_release_flag || "",
        },
        locations: [
          {
            locationName: record?.location || "",
            resourceInfo: {
              routingId: resolvedRoutingId,
              priority:
                record?.priority === "" || record?.priority == null
                  ? ""
                  : Number(record.priority),
              coProductAssociation: coProducts.length > 0 ? 1 : 0,
            },
            componentItems: componentItems.map((item) => {
              const parsedStandardUsage = Number(item?.standard_usage);
              return {
                componentItem: item?.component_item || "",
                standardUsage: Number.isFinite(parsedStandardUsage)
                  ? parsedStandardUsage
                  : "",
              };
            }),
            coProductItems: coProducts.map((cp) => {
              const parsedStandardUsage = Number(
                cp?.standard_usage ?? cp?.qty ?? cp?.qty_produced_per
              );
              return {
                coProductItem: cp?.item || cp?.co_product_item || "",
                standardUsage: Number.isFinite(parsedStandardUsage)
                  ? parsedStandardUsage
                  : "",
              };
            }),
          },
        ],

        notes: notes || "",
      };

      console.log("Submitting BOM modification:", payload);

      const response = await fetch("http://localhost:3000/api/tables/modify-bom", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
          result?.error ||
          `Failed to submit BOM changes (${response.status})`
        );
      }

      console.log("BOM modification successful:", result);
      setSuccessMessage("✓ BOM changes submitted successfully!");

    } catch (error) {
      console.error("Error submitting BOM changes:", error);
      setSuccessMessage(`✗ Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.back} onClick={() => navigate(-1)}>
            ← BACK
          </div>

          <h1 style={styles.title}>Step 3: Modified BOM Summary</h1>
          <p style={styles.subtitle}>Review the changes to the BOM record</p>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>BOM Record Details</h2>
            <table style={styles.summaryTable}>
              <tbody>
                <tr style={styles.summaryHeaderRow}>
                  <th style={styles.summaryHeader}>Field</th>
                  <th style={styles.summaryHeader}>Value</th>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>Location</td>
                  <td style={styles.summaryCell}>{record.location || "-"}</td>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>BOM ID</td>
                  <td style={styles.summaryCell}>{record.bom_id || "-"}</td>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>Produced Item</td>
                  <td style={styles.summaryCell}>{record.produced_item || "-"}</td>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>Produced Item Description</td>
                  <td style={styles.summaryCell}>
                    {record.produced_item_desc || record.component_desc || "-"}
                  </td>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>Item Release Flag</td>
                  <td style={styles.summaryCell}>{record.item_release_flag || "-"}</td>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>Routing ID</td>
                  <td style={styles.summaryCell}>{resolvedRoutingId || "-"}</td>
                </tr>
                <tr style={styles.summaryRow}>
                  <td style={styles.summaryCell}>Priority</td>
                  <td style={styles.summaryCell}>
                    {resolvedPriority === "" ? "-" : resolvedPriority}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Component Item Changes</h2>
            {componentChanges.length === 0 ? (
              <div style={styles.emptyBox}>No component item changes were made.</div>
            ) : (
              <table style={styles.changesTable}>
                <thead>
                  <tr>
                    <th style={styles.changesHeader}>Field</th>
                    <th style={styles.changesHeader}>Original Value</th>
                    <th style={styles.changesHeader}>Updated Value</th>
                  </tr>
                </thead>
                <tbody>
                  {componentChanges.map((row, index) => (
                    <tr
                      key={index}
                      style={
                        row.field.includes("Standard Usage") &&
                          String(row.original).trim() !== String(row.updated).trim()
                          ? styles.changesAltRow
                          : styles.changesRow
                      }
                    >
                      <td style={styles.changesCell}>{row.field}</td>
                      <td style={styles.changesCell}>{row.original}</td>
                      <td style={styles.changesCell}>{row.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Co-Product Changes</h2>
            {coProductChanges.length === 0 ? (
              <div style={styles.emptyBox}>No co-product changes were made.</div>
            ) : (
              <table style={styles.changesTable}>
                <thead>
                  <tr>
                    <th style={styles.changesHeader}>Field</th>
                    <th style={styles.changesHeader}>Original Value</th>
                    <th style={styles.changesHeader}>Updated Value</th>
                  </tr>
                </thead>
                <tbody>
                  {coProductChanges.map((row, index) => (
                    <tr
                      key={index}
                      style={
                        row.field.includes("Co-Product Quantity Produced") &&
                          String(row.original).trim() !== String(row.updated).trim()
                          ? styles.changesAltRow
                          : styles.changesRow
                      }
                    >
                      <td style={styles.changesCell}>{row.field}</td>
                      <td style={styles.changesCell}>{row.original}</td>
                      <td style={styles.changesCell}>{row.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.card}>
            <label style={styles.noteLabel}>Notes (Optional)</label>
            <textarea
              style={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the BOM changes"
            />
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={handleReturnToMainMenu}
              style={styles.secondaryBtn}
            >
              <span style={{ fontSize: "13px" }}>⌂</span>
              <span>RETURN TO MAIN MENU</span>
            </button>
            <button
              style={styles.confirmBtn}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "SUBMITTING..." : "✓ CONFIRM AND SUBMIT BOM CHANGES"}
            </button>
          </div>

          {successMessage && (
            <div
              style={
                successMessage.includes("✓")
                  ? styles.successNotification
                  : styles.errorNotification
              }
            >
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    justifyContent: "center",
    padding: "24px 0",
  },
  wrapper: {
    width: "100%",
    maxWidth: "1080px",
    padding: "0 16px",
    boxSizing: "border-box",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "16px",
    fontSize: "14px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: "18px",
    color: "#6b7280",
    fontSize: "15px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
  },
  sectionTitle: {
    margin: 0,
    marginBottom: "16px",
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
  },
  summaryTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  summaryHeaderRow: {
    background: "#f3f4f6",
  },
  summaryHeader: {
    textAlign: "left",
    color: "#374151",
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
  },
  summaryRow: {
    background: "#fff",
  },
  summaryCell: {
    padding: "14px 16px",
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: "14px",
  },
  changesTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  changesHeader: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
  },
  changesRow: {
    background: "#fff",
  },
  changesAltRow: {
    background: "lightyellow",
  },
  changesCell: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: "14px",
  },
  emptyBox: {
    padding: "18px",
    border: "1px dashed #d1d5db",
    borderRadius: "6px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "14px",
  },
  noteLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 500,
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    padding: "12px",
    fontSize: "14px",
    color: "#111827",
    boxSizing: "border-box",
    resize: "vertical",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  secondaryBtn: {
    border: "1px solid #6da0e1",
    borderRadius: "3px",
    height: "28px",
    padding: "0 12px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#1e63b5",
    background: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  confirmBtn: {
    background: "#166534",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "14px 20px",
    fontSize: "14px",
    cursor: "pointer",
  },
  successNotification: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: "#10b981",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    animation: "slideIn 0.3s ease-out",
    zIndex: 1000,
  },
  errorNotification: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: "#ef4444",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    animation: "slideIn 0.3s ease-out",
    zIndex: 1000,
  },
};

export default ModifyExistingBOMSummary;