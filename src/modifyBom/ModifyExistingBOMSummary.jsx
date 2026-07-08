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
  const removedComponentItems = routerLocation?.state?.removedComponentItems ?? [];
  const removedCoProducts = routerLocation?.state?.removedCoProducts ?? [];
  const initialComponentItemsFromState = routerLocation?.state?.initialComponentItems ?? [];
  const initialCoProductsFromState = routerLocation?.state?.initialCoProducts ?? [];

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

  const existingComponentItems = componentItems
    .filter((item) => !item.isNew && item.original_component_item)
    .map((item) => {
      const originalUsage = String(item.original_standard_usage ?? item.standard_usage ?? "");
      const updatedUsage = String(item.standard_usage ?? "");
      const hasStandardUsageChanged = originalUsage.trim() !== updatedUsage.trim();
      return {
        ...item,
        original_standard_usage: originalUsage,
        updated_standard_usage: hasStandardUsageChanged ? updatedUsage : "No Changes",
        hasStandardUsageChanged,
      };
    });

  // Include removed original component items (marked as removed in navigation state)
  const removedMappedComponentItems = removedComponentItems.map((item) => {
    
    const originalUsage = String(item.original_standard_usage ?? item.standard_usage ?? "");
    const key = String(item.original_component_item || item.component_item || "");
    const fallback =
      initialComponentItemsFromState.find((it) =>
        String(it.original_component_item || it.component_item || "").trim() === key.trim()
      ) || {};
    const compDesc =
      item.component_desc ||
      item.desc ||
      item.original_component_desc ||
      item.original_desc ||
      fallback.component_desc ||
      fallback.componentDesc ||
      fallback.desc ||
      "";
    return {
      ...item,
      original_standard_usage: originalUsage,
      component_desc: compDesc,
      updated_standard_usage: "Item Removed",
      hasStandardUsageChanged: true,
    };
  });

  const finalExistingComponentItems = [...existingComponentItems, ...removedMappedComponentItems];

  const addedComponentItems = componentItems.filter(
    (item) => item.isNew || !item.original_component_item
  );

  const existingCoProducts = coProducts
    .filter((cp) => !cp.isNew && cp.original_item)
    .map((cp) => {
      const originalQty = String(cp.original_qty ?? cp.qty ?? "");
      const updatedQty = String(cp.qty ?? "");
      const hasQtyChanged = originalQty.trim() !== updatedQty.trim();
      return {
        ...cp,
        original_qty: originalQty,
        updated_qty: hasQtyChanged ? updatedQty : "No Changes",
        hasQtyChanged,
      };
    });

  const removedMappedCoProducts = removedCoProducts.map((cp) => {
    const originalQty = String(cp.original_qty ?? cp.qty ?? "");
    const key = String(cp.original_item || cp.item || "");
    const fallback =
      initialCoProductsFromState.find((it) =>
        String(it.original_item || it.item || "").trim() === key.trim()
      ) || {};
    const coDesc =
      cp.desc ||
      cp.component_desc ||
      cp.original_desc ||
      cp.original_component_desc ||
      fallback.desc ||
      fallback.component_desc ||
      fallback.original_desc ||
      "";
    return {
      ...cp,
      original_qty: originalQty,
      desc: coDesc,
      updated_qty: "Item Removed",
      hasQtyChanged: true,
    };
  });

  const finalExistingCoProducts = [...existingCoProducts, ...removedMappedCoProducts];

  const addedCoProducts = coProducts.filter(
    (cp) => cp.isNew || !cp.original_item
  );
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

  const componentChanges = componentItems.flatMap((item, index) => [
    {
      field: `Component Item ${index + 1}`,
      original: item.original_component_item || item.component_item || "-",
      updated: item.component_item || "-",
    },
    {
      field: `Component Item Description ${index + 1}`,
      original: item.original_component_desc || item.component_desc || "-",
      updated: item.component_desc || "-",
    },
    {
      field: `Component Standard Usage ${index + 1}`,
      original: item.original_standard_usage || item.standard_usage || "-",
      updated: item.standard_usage || "-",
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

      

      const response = await fetch("/api/tables/modify-bom", {
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

      
      setSuccessMessage("✓ BOM changes submitted successfully!");

    } catch (error) {
      console.error("Error submitting BOM changes:", error);
      setSuccessMessage(`✗ Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={styles.wrapper}>
        <div style={styles.back} onClick={() => navigate(-1)}>← BACK</div>

        <h1 style={styles.title}>Step 3: Modified BOM Summary</h1>
        <p style={styles.subtitle}>Review the changes to the BOM record</p>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>BOM Record Details</h2>
          <table style={styles.summaryTable}>
            <tbody>
              <tr style={styles.summaryHeaderRow}><th style={styles.summaryHeader}>Field</th><th style={styles.summaryHeader}>Value</th></tr>
              <tr style={styles.summaryRow}><td style={styles.summaryCell}>Location</td><td style={styles.summaryCell}>{record.location || "-"}</td></tr>
              <tr style={styles.summaryRow}><td style={styles.summaryCell}>BOM ID</td><td style={styles.summaryCell}>{record.bom_id || "-"}</td></tr>
              <tr style={styles.summaryRow}><td style={styles.summaryCell}>Produced Item</td><td style={styles.summaryCell}>{record.produced_item || "-"}</td></tr>
              <tr style={styles.summaryRow}><td style={styles.summaryCell}>Produced Item Description</td><td style={styles.summaryCell}>{record.produced_item_desc || record.component_desc || "-"}</td></tr>
              <tr style={styles.summaryRow}><td style={styles.summaryCell}>Item Release Flag</td><td style={styles.summaryCell}>{record.item_release_flag || "-"}</td></tr>
            </tbody>
          </table>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Existing Component Item Values</h2>
          {finalExistingComponentItems.length === 0 ? (
            <div style={styles.emptyBox}>No existing component item values were changed.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead><tr><th style={styles.changesHeader}>Component Item</th><th style={styles.changesHeader}>Description</th><th style={styles.changesHeader}>Original Standard Usage</th><th style={styles.changesHeader}>Updated Standard Usage</th></tr></thead>
              <tbody>{finalExistingComponentItems.map((item, index) => (
                <tr key={index} style={item.hasStandardUsageChanged ? styles.changesAltRow : styles.changesRow}>
                  <td style={styles.changesCell}>{item.component_item || "-"}</td>
                  <td style={styles.changesCell}>{item.component_desc || "-"}</td>
                  <td style={styles.changesCell}>{item.original_standard_usage || "-"}</td>
                  <td style={styles.changesCell}>{item.updated_standard_usage || "-"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Added Component Values</h2>
          {addedComponentItems.length === 0 ? (
            <div style={styles.emptyBox}>No new component items were added.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead><tr><th style={styles.changesHeader}>Component Item</th><th style={styles.changesHeader}>Description</th><th style={styles.changesHeader}>Standard Usage</th></tr></thead>
              <tbody>{addedComponentItems.map((item, index) => (
                <tr key={index} style={styles.changesAltRow}><td style={styles.changesCell}>{item.component_item || "-"}</td><td style={styles.changesCell}>{item.component_desc || "-"}</td><td style={styles.changesCell}>{item.standard_usage || "-"}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Existing Co-Product Values</h2>
          {finalExistingCoProducts.length === 0 ? (
            <div style={styles.emptyBox}>No existing co-product values were changed.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead><tr><th style={styles.changesHeader}>Co-Product Item</th><th style={styles.changesHeader}>Description</th><th style={styles.changesHeader}>Original Qty Produced</th><th style={styles.changesHeader}>Updated Qty Produced</th></tr></thead>
              <tbody>{finalExistingCoProducts.map((item, index) => (
                <tr key={index} style={item.hasQtyChanged ? styles.changesAltRow : styles.changesRow}><td style={styles.changesCell}>{item.item || "-"}</td><td style={styles.changesCell}>{item.desc || "-"}</td><td style={styles.changesCell}>{item.original_qty || "-"}</td><td style={styles.changesCell}>{item.updated_qty || "-"}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Added Co-Product Values</h2>
          {addedCoProducts.length === 0 ? (
            <div style={styles.emptyBox}>No new co-product values were added.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead><tr><th style={styles.changesHeader}>Co-Product Item</th><th style={styles.changesHeader}>Description</th><th style={styles.changesHeader}>Qty Produced</th></tr></thead>
              <tbody>{addedCoProducts.map((item, index) => (
                <tr key={index} style={styles.changesAltRow}><td style={styles.changesCell}>{item.item || "-"}</td><td style={styles.changesCell}>{item.desc || "-"}</td><td style={styles.changesCell}>{item.qty || "-"}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={styles.card}><label style={styles.noteLabel}>Notes (Optional)</label><textarea style={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes about the BOM changes" /></div>

        <div style={styles.footer}>
          <button type="button" onClick={handleReturnToMainMenu} style={styles.secondaryBtn}><span style={{ fontSize: "13px" }}>⌂</span><span>RETURN TO MAIN MENU</span></button>
          <button style={styles.confirmBtn} onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "SUBMITTING..." : "✓ CONFIRM AND SUBMIT BOM CHANGES"}</button>
        </div>

        {successMessage && (<div style={successMessage.includes("✓") ? styles.successNotification : styles.errorNotification}>{successMessage}</div>)}

      </div>
    </div>
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
    marginRight: "15px",
    marginTop: "10px",
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