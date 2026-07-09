import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  clearExistingBomSelectedRows,
  selectExistingBomSelectedRows,
} from "../redux/bomSlice";

const DELETE_BOM_SUMMARY_API = `/api/tables/delete-bom/summary`;
const DELETE_BOM_EXECUTE_API = `/api/tables/delete-bom/execute`;
const CO_PRODUCT_YELLOW = "#fef08a";

const toText = (value) => String(value ?? "").trim();
const getRowBomId = (row) => toText(row?.bom_id ?? row?.bomId);
const getRowProducedItem = (row) => toText(row?.produced_item ?? row?.producedItem ?? row?.item);
const getRowProducedDesc = (row) =>
  toText(row?.produced_item_desc ?? row?.producedItemDescription ?? row?.item_description ?? row?.item_desc);
const getRowLocation = (row) => toText(row?.location ?? row?.location_id);
const getRowResource = (row) => toText(row?.resource);
const isCoProductRow = (row) => toText(row?.erp_co_product_association ?? row?.erpCoProductAssociation) === "1";

const buildRoutingId = (item, resource) => {
  const cleanItem = toText(item);
  const cleanResource = toText(resource);
  if (!cleanItem || !cleanResource) return "";
  return `ROUTING_${cleanItem}_${cleanResource}`;
};

const deriveResourceFromRoutingId = (routingId, producedItem = "") => {
  const text = toText(routingId);
  const item = toText(producedItem);
  if (!text) return "";

  const prefixWithItem = item ? `ROUTING_${item}_` : "";
  if (prefixWithItem && text.startsWith(prefixWithItem)) {
    return text.slice(prefixWithItem.length);
  }

  const parts = text.split("_").map((part) => part.trim()).filter(Boolean);
  // Expected display format is ROUTING_item_resource.
  // If only routing_id is available, resource is everything after ROUTING + item.
  return parts.length >= 3 ? parts.slice(2).join("_") : "";
};

const uniqueByBomId = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    const bomId = getRowBomId(row).toUpperCase();
    if (!bomId || seen.has(bomId)) return false;
    seen.add(bomId);
    return true;
  });
};

const uniqueRoutingRows = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    const bomIdValue = toText(row?.bom_id ?? row?.bomId).toUpperCase();
    const routingIdValue = toText(row?.routing_id ?? row?.routingId).toUpperCase();
    const resourceValue = toText(row?.resource).toUpperCase();
    const key = [bomIdValue, routingIdValue, resourceValue].join("__");

    if (!bomIdValue && !routingIdValue && !resourceValue) return false;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export default function DeleteBomSummaryStep2() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const reduxSelectedRows = useSelector(selectExistingBomSelectedRows);
  const navigationSelectedRows = Array.isArray(location.state?.selectedRows) ? location.state.selectedRows : [];
  const selectedRows = navigationSelectedRows.length ? navigationSelectedRows : reduxSelectedRows;
  const backRoute = location.state?.from || "/delete-bom-dashboard/delete-existing-bom";

  const bomIds = useMemo(
    () => Array.from(new Set(selectedRows.map((row) => getRowBomId(row)).filter(Boolean))),
    [selectedRows]
  );

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summaryRows, setSummaryRows] = useState([]);
  const [routingRows, setRoutingRows] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      if (!bomIds.length) {
        setLoading(false);
        setSummaryRows([]);
        setRoutingRows([]);
        setError("No BOM records were selected. Please go back and select at least one BOM.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        bomIds.forEach((bomId) => params.append("bomIds", bomId));

        const response = await fetch(`${DELETE_BOM_SUMMARY_API}?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.details || payload?.error || "Failed to load delete BOM summary");
        }

        if (!cancelled) {
          setSummaryRows(Array.isArray(payload?.data?.bomSummary) ? payload.data.bomSummary : []);
          setRoutingRows(Array.isArray(payload?.data?.routingSummary) ? payload.data.routingSummary : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load delete BOM summary");
          // Keep selected records visible even if connected routing summary fetch fails.
          setSummaryRows([]);
          setRoutingRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [bomIds]);

  const displaySummaryRows = useMemo(() => {
    // Prefer exact selected rows from Redux/navigation because those include selected co-products.
    if (selectedRows.length) return selectedRows;
    return uniqueByBomId(summaryRows);
  }, [selectedRows, summaryRows]);

  const bomIdToProducedItem = useMemo(() => {
    const map = new Map();
    displaySummaryRows.forEach((row) => {
      const bomId = getRowBomId(row).toUpperCase();
      const item = getRowProducedItem(row);
      if (bomId && item && !map.has(bomId)) map.set(bomId, item);
    });
    return map;
  }, [displaySummaryRows]);

  const dedupedRoutingRows = useMemo(() => uniqueRoutingRows(routingRows), [routingRows]);

  const handleBack = () => {
    navigate(backRoute);
  };

  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleDeleteClick = () => setShowModal(true);

  const handleContinueDelete = async () => {
    try {
      setSubmitting(true);
      setError("");
      setResult(null);

      const response = await fetch(DELETE_BOM_EXECUTE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bomIds, notes }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || "Failed to delete selected BOM records");
      }

      setResult(payload);
      setShowModal(false);
      dispatch(clearExistingBomSelectedRows());
    } catch (err) {
      setError(err?.message || "Failed to delete selected BOM records");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <button type="button" onClick={handleBack} style={styles.backButton}>
          <span style={styles.backArrow}>←</span>
          <span>BACK</span>
        </button>

        <h1 style={styles.title}>Step 2: Deleted BOM Summary</h1>

        <div style={styles.warningBox}>
          <span style={{ fontSize: "16px" }}>⚠</span>
          <span>Warning: The following records will be permanently deleted</span>
        </div>

        {loading ? <div style={{ ...styles.stateBox, ...styles.loadingBox }}>Loading deleted BOM summary...</div> : null}
        {error ? <div style={{ ...styles.stateBox, ...styles.errorBox }}>{error}</div> : null}

        <div style={styles.sectionCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.summaryHeader}>
                <th style={{ ...styles.th, ...styles.summaryProducedCol }}>Produced Item</th>
                <th style={{ ...styles.th, ...styles.summaryDescCol }}>Item Description</th>
                <th style={{ ...styles.th, ...styles.summaryLocationCol }}>Location</th>
                <th style={{ ...styles.th, ...styles.summaryBomCol }}>BOM ID</th>
              </tr>
            </thead>
            <tbody>
              {!loading && displaySummaryRows.length === 0 ? (
                <tr><td colSpan={4} style={styles.emptyRow}>No BOM summary rows found.</td></tr>
              ) : null}

              {displaySummaryRows.map((row, index) => {
                const bomId = getRowBomId(row);
                const rowHighlightStyle = isCoProductRow(row) ? styles.coProductRow : {};

                return (
                  <tr key={`${bomId || "bom"}-${index}`} style={rowHighlightStyle}>
                    <td style={{ ...styles.td, ...styles.summaryProducedCol, ...rowHighlightStyle }}>{getRowProducedItem(row) || "-"}</td>
                    <td style={{ ...styles.td, ...styles.summaryDescCol, ...rowHighlightStyle }}>{getRowProducedDesc(row) || "-"}</td>
                    <td style={{ ...styles.td, ...styles.summaryLocationCol, ...rowHighlightStyle }}>{getRowLocation(row) || "-"}</td>
                    <td style={{ ...styles.td, ...styles.summaryBomCol, ...rowHighlightStyle }}>{bomId || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={styles.sectionTitle}>Connected Routing IDs</div>
        <p style={styles.sectionHint}>The following Routing IDs are connected to the BOM records and will also be deleted</p>

        <div style={styles.sectionCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.routingHeader}>
                <th style={{ ...styles.th, ...styles.bomIdCol }}>BOM ID</th>
                <th style={{ ...styles.th, ...styles.resourceCol }}>Resource</th>
                <th style={{ ...styles.th, ...styles.routingIdCol }}>Routing ID</th>
              </tr>
            </thead>
            <tbody>
              {!loading && dedupedRoutingRows.length === 0 ? (
                <tr><td colSpan={3} style={styles.emptyRow}>No connected routing rows found.</td></tr>
              ) : null}

              {dedupedRoutingRows.map((row, index) => {
                const bomIdValue = toText(row.bom_id ?? row.bomId);
                const producedItem = bomIdToProducedItem.get(bomIdValue.toUpperCase()) || toText(row.produced_item ?? row.item);
                const rawRoutingId = toText(row.routing_id ?? row.routingId);
                const resourceValue = getRowResource(row) || deriveResourceFromRoutingId(rawRoutingId, producedItem);
                const formattedRoutingId = buildRoutingId(producedItem, resourceValue) || rawRoutingId || "-";

                return (
                  <tr key={`${bomIdValue}__${formattedRoutingId}__${resourceValue}__${index}`}>
                    <td style={{ ...styles.td, ...styles.bomIdCol }}>{bomIdValue || "-"}</td>
                    <td style={{ ...styles.td, ...styles.resourceCol }}>{resourceValue || "-"}</td>
                    <td style={{ ...styles.td, ...styles.routingIdCol }}>{formattedRoutingId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "18px" }}>
          <textarea style={styles.notesBox} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (Optional)" />
        </div>

        <div style={styles.buttonRow}>
          <button type="button" onClick={handleDeleteClick} disabled={loading || !!result || !bomIds.length} style={{ ...styles.primaryBtn, ...(loading || !!result || !bomIds.length ? styles.disabledBtn : {}) }}>
            CONFIRM DELETION
          </button>
          <button type="button" onClick={handleReturnToMainMenu} style={styles.mainMenuButton}>
            <span style={{ fontSize: "13px" }}>⌂</span>
            <span>RETURN TO MAIN MENU</span>
          </button>
        </div>

        {result ? (
          <div style={styles.successPanel}>
            <h3 style={styles.successTitle}>Deletion completed successfully</h3>
            <div style={{ fontSize: "13px", marginBottom: "8px" }}>
              <strong>Engineering Change ID:</strong> {toText(result.engineeringChangeId) || "-"}
            </div>
          </div>
        ) : null}
      </div>

      {showModal ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>Permanent Deletion Warning</div>
            <div style={styles.modalBody}>This action will permanently delete the selected BOM record(s) from the system. Do you want to continue?</div>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setShowModal(false)} style={styles.subtleBtn}>Cancel</button>
              <button type="button" onClick={handleContinueDelete} disabled={submitting} style={{ ...styles.dangerBtn, ...(submitting ? styles.disabledBtn : {}) }}>
                {submitting ? "Deleting..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f3f4f6", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: "#111827", padding: "24px 0 40px" },
  backButton: { display: "inline-flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: "8px" },
  backArrow: { fontSize: "18px", lineHeight: 1 },
  shell: { width: "1060px", margin: "0 auto" },
  title: { fontSize: "22px", fontWeight: 700, margin: "0 0 18px", color: "#111827" },
  warningBox: { display: "flex", alignItems: "center", gap: "10px", background: "#fff3e0", color: "#9a5200", borderRadius: "3px", padding: "12px 14px", marginBottom: "12px", border: "1px solid #f3dfbe", fontSize: "14px", fontWeight: 600 },
  sectionCard: { background: "#fff", border: "1px solid #d5d7db", borderRadius: "3px", boxShadow: "0 2px 3px rgba(0,0,0,0.08)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  summaryHeader: { background: "#f3dede" },
  routingHeader: { background: "#f3f4f6" },
  coProductRow: { backgroundColor: CO_PRODUCT_YELLOW },
  th: { textAlign: "left", fontSize: "13px", fontWeight: 600, padding: "13px 14px", borderBottom: "1px solid #d5d7db", color: "#111827", whiteSpace: "nowrap" },
  td: { fontSize: "13px", padding: "13px 14px", borderBottom: "1px solid #d5d7db", color: "#111827", verticalAlign: "middle", wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.45 },
  summaryProducedCol: { width: "22%" },
  summaryDescCol: { width: "34%" },
  summaryLocationCol: { width: "18%" },
  summaryBomCol: { width: "26%" },
  bomIdCol: { width: "22%" },
  resourceCol: { width: "20%" },
  routingIdCol: { width: "58%" },
  sectionTitle: { margin: "18px 0 6px", fontSize: "15px", fontWeight: 700, color: "#111827" },
  sectionHint: { margin: "0 0 10px", fontSize: "13px", color: "#385b84" },
  notesBox: { width: "100%", minHeight: "76px", border: "1px solid #bfc6cf", borderRadius: "3px", background: "#fff", padding: "12px 10px", resize: "vertical", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: "14px", outline: "none", boxSizing: "border-box" },
  buttonRow: { display: "flex", gap: "14px", marginTop: "16px", alignItems: "center" },
  primaryBtn: { border: "none", borderRadius: "4px", height: "44px", minWidth: "176px", padding: "0 18px", fontSize: "13px", fontWeight: 700, color: "#fff", background: "#d93025", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.14)", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  mainMenuButton: { height: "44px", minWidth: "210px", border: "1px solid #6da0e1", borderRadius: "4px", background: "#ffffff", color: "#1e63b5", fontSize: "13px", fontWeight: 700, padding: "0 18px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  disabledBtn: { opacity: 0.6, cursor: "not-allowed" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modal: { width: "500px", background: "#fff", borderRadius: "6px", boxShadow: "0 16px 40px rgba(0,0,0,0.18)", overflow: "hidden" },
  modalHeader: { padding: "16px 18px", borderBottom: "1px solid #e5e7eb", fontSize: "17px", fontWeight: 700 },
  modalBody: { padding: "16px 18px 18px", fontSize: "14px", color: "#374151", lineHeight: 1.55 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", padding: "0 18px 18px" },
  subtleBtn: { border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: "4px", height: "34px", padding: "0 14px", cursor: "pointer" },
  dangerBtn: { border: "none", background: "#d93025", color: "#ffffff", borderRadius: "4px", height: "34px", padding: "0 16px", cursor: "pointer", fontWeight: 600 },
  stateBox: { padding: "12px 14px", borderRadius: "4px", fontSize: "13px", marginBottom: "12px" },
  loadingBox: { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" },
  successPanel: { marginTop: "16px", background: "#ecfdf3", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "14px 16px", color: "#166534" },
  successTitle: { margin: "0 0 10px", fontSize: "15px", fontWeight: 700 },
  emptyRow: { textAlign: "center", color: "#6b7280", padding: "18px 12px", fontSize: "13px" },
};
