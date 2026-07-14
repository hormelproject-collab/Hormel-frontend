import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  clearExistingIbrSelectedRows,
  selectExistingIbrSelectedRows,
} from "../redux/bomSlice";

const DELETE_ITEM_BOM_ROUTING_API = `/api/tables/delete-item-bom-routing/execute`;
const CO_PRODUCT_YELLOW = "#fef9c3";

const toText = (value) => String(value ?? "").trim();

const buildRoutingId = (item, resource, fallback = "") => {
  const cleanItem = toText(item);
  const cleanResource = toText(resource);
  if (cleanItem && cleanResource) return `ROUTING_${cleanItem}_${cleanResource}`;
  return toText(fallback);
};

const deriveLocationFromBomId = (bomId) => {
  const value = toText(bomId);
  if (!value) return "";
  const parts = value.split("_");
  if (parts.length < 3) return "";
  return parts.slice(2).join("_").trim();
};

const deriveResourceFromRoutingId = (routingId) => {
  const value = toText(routingId);
  if (!value) return "";
  const parts = value.split("_").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return "";
  return parts.slice(2).join("_");
};

const getRoutingGroupSortKey = (row) => {
  const resource = toText(row?.resource);
  if (resource) return resource;

  const routingId = toText(row?.routingId ?? row?.routing_id);
  const parts = routingId
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 2 && parts[0].toUpperCase() === "ROUTING") {
    return parts.slice(2).join("_");
  }

  return routingId;
};

const normalizeSelectedRow = (row, index) => {
  const bomId = toText(row?.bomId ?? row?.bom_id);
  const item = toText(row?.item);
  const rawRoutingId = toText(row?.routingId ?? row?.routing_id);
  const resource = toText(row?.resource) || deriveResourceFromRoutingId(rawRoutingId);
  const routingId = buildRoutingId(item, resource, rawRoutingId);
  const coProductAssociation = Number(
    toText(
      row?.coProductAssociation ??
      row?.co_product_association ??
      row?.erp_co_product_association
    ) || "0"
  ) >= 1 ? 1 : 0;
  const itemBomPriority = toText(
    row?.itemBomRoutingPriority ??
    row?.erp_item_bom_routing_priority ??
    row?.erpItemBomRoutingPriority ??
    row?.item_bom_routing_priority ??
    row?.itemBomPriority ??
    row?.item_bom_priority
  );

  return {
    id:
      toText(row?.id) ||
      toText(row?.recId) ||
      toText(row?.rec_id) ||
      `${bomId}__${routingId}__${item}__${index}`,
    recId: toText(row?.recId ?? row?.rec_id),
    item,
    bomId,
    routingId,
    location: toText(row?.location) || deriveLocationFromBomId(bomId),
    resource,
    itemBomPriority,
    coProductItem: toText(row?.coProductItem ?? row?.co_product_item),
    coProductAssociation,
    raw: row,
  };
};

const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    const bomCompare = toText(a.bomId).localeCompare(toText(b.bomId), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (bomCompare !== 0) return bomCompare;

    const routingGroupCompare = getRoutingGroupSortKey(a).localeCompare(
      getRoutingGroupSortKey(b),
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    );
    if (routingGroupCompare !== 0) return routingGroupCompare;

    const aPriority = Number(a.coProductAssociation || 0) >= 1 ? 1 : 0;
    const bPriority = Number(b.coProductAssociation || 0) >= 1 ? 1 : 0;
    if (aPriority !== bPriority) return aPriority - bPriority;

    return toText(a.item).localeCompare(toText(b.item), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

export default function DeleteItemBomRoutingSummaryStep2() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const reduxSelectedRows = useSelector(selectExistingIbrSelectedRows);
  const selectedRows = useMemo(() => {
    const rows = Array.isArray(location.state?.selectedRows) && location.state.selectedRows.length
      ? location.state.selectedRows
      : reduxSelectedRows;

    return sortRows(rows.map((row, index) => normalizeSelectedRow(row, index)));
  }, [location.state, reduxSelectedRows]);

  const [notes, setNotes] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteClick = () => {
    if (!selectedRows.length) return;
    setShowModal(true);
  };

  const handleContinueDelete = async () => {
    try {
      setSubmitting(true);
      setError("");
      setResult(null);

      const payloadRows = selectedRows.map((row) => ({
        rec_id: row.recId,
        bom_id: row.bomId,
        routing_id: row.routingId,
        item: row.item,
        location: row.location,
        erp_item_bom_routing_priority: row.itemBomPriority,
        item_bom_priority: row.itemBomPriority,
        co_product_item: row.coProductItem,
        co_product_association: row.coProductAssociation,
      }));

      const response = await fetch(DELETE_ITEM_BOM_ROUTING_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: payloadRows, notes }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.details || payload?.error || "Failed to delete item BOM routing records"
        );
      }

      setResult(payload);
      setShowModal(false);
      dispatch(clearExistingIbrSelectedRows());
    } catch (err) {
      setError(err?.message || "Failed to delete item BOM routing records");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <button type="button" onClick={handleBack} style={styles.backBtn}>
          <span style={{ fontSize: "16px", lineHeight: 1 }}>←</span>
          <span>BACK</span>
        </button>

        <h1 style={styles.title}>Step 2: Deleted Item BOM Routing Record Summary</h1>

        {error ? <div style={{ ...styles.stateBox, ...styles.errorBox }}>{error}</div> : null}

        <div style={styles.warningBox}>
          Warning: When a parent item is selected, the associated co-products are also deleted.
        </div>

        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headRow}>
                <th style={{ ...styles.th, width: "70px" }}>Location</th>
                <th style={{ ...styles.th, width: "90px" }}>Item</th>
                <th style={{ ...styles.th, width: "180px" }}>BOM ID</th>
                <th style={{ ...styles.th, width: "260px" }}>Resource</th>
                <th style={{ ...styles.th, width: "80px" }}>Priority</th>
                <th style={{ ...styles.th, width: "550px" }}>Routing ID</th>
                `
              </tr>
            </thead>
            <tbody>
              {selectedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyRow}>No item BOM routing records selected.</td>
                </tr>
              ) : null}
              {selectedRows.map((row) => {
                const isCoProduct = row.coProductAssociation === 1;
                return (
                  <tr key={row.id} style={isCoProduct ? styles.coProductRow : undefined}>
                    <td style={{ ...styles.td, ...(isCoProduct ? styles.coProductRow : {}) }}>{row.location || "-"}</td>
                    <td style={{ ...styles.td, ...(isCoProduct ? styles.coProductRow : {}) }}>{row.item || "-"}</td>
                    <td style={{ ...styles.td, ...(isCoProduct ? styles.coProductRow : {}) }}>{row.bomId || "-"}</td>
                    <td
                      style={{
                        ...styles.td,
                        ...(isCoProduct ? styles.coProductRow : {}),
                        whiteSpace: "normal",
                        overflow: "visible",
                        textOverflow: "unset",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.resource || "-"}
                    </td>  <td style={{ ...styles.td, ...(isCoProduct ? styles.coProductRow : {}) }}>{row.itemBomPriority || "-"}</td>
                    <td
                      style={{
                        ...styles.td,
                        ...(isCoProduct ? styles.coProductRow : {}),
                        whiteSpace: "normal",
                        overflow: "visible",
                        textOverflow: "unset",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.routingId || "-"}
                    </td>   </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <textarea
          style={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (Optional)"
        />

        <div style={styles.buttonRow}>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={!selectedRows.length || !!result}
            style={{ ...styles.confirmBtn, ...((!selectedRows.length || !!result) ? styles.disabledBtn : {}) }}
          >
            CONFIRM DELETION
          </button>
          <button type="button" onClick={handleReturnToMainMenu} style={styles.mainMenuButton}>
            <span style={{ fontSize: "13px" }}>⌂</span>
            <span>RETURN TO MAIN MENU</span>
          </button>
        </div>

        {result ? (
          <div style={{ ...styles.stateBox, ...styles.successBox }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>
              Item BOM Routing record deletion completed successfully
            </div>
            <div style={{ marginBottom: "5px" }}>
              <strong>Engineering Change ID:</strong> {toText(result.engineeringChangeId) || "-"}
            </div>
          </div>
        ) : null}
      </div>

      {showModal ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>Permanent Deletion Warning</div>
            <div style={styles.modalBody}>
              The selected Item BOM Routing record(s), including any associated co-products,
              will be permanently deleted from the live system. Related records will also be
              removed from the bom_consumed table. Do you still want to continue?
            </div>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setShowModal(false)} style={styles.subtleBtn}>Cancel</button>
              <button
                type="button"
                onClick={handleContinueDelete}
                disabled={submitting}
                style={{ ...styles.dangerBtn, ...(submitting ? styles.disabledBtn : {}) }}
              >
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
  page: { minHeight: "100vh", background: "#f3f4f6", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: "#111827", paddingTop: "28px" },
  shell: { width: "1180px", margin: "0 auto" },
  title: { margin: "0 0 18px", fontSize: "22px", lineHeight: 1.25, fontWeight: 700, color: "#111827" },
  card: { background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "3px", boxShadow: "0 2px 3px rgba(0,0,0,0.08)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  headRow: { background: "#efd6d6" },
  th: { textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#111827", padding: "13px 12px", borderBottom: "1px solid #d1d5db", whiteSpace: "nowrap" },
  td: { fontSize: "12px", color: "#111827", padding: "12px 12px", borderBottom: "1px solid #d1d5db", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  textarea: { width: "100%", minHeight: "76px", marginTop: "18px", border: "1px solid #bfc6cf", borderRadius: "3px", background: "#ffffff", padding: "12px 10px", resize: "vertical", boxSizing: "border-box", outline: "none", fontSize: "14px", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  buttonRow: { display: "flex", gap: "12px", alignItems: "center", marginTop: "12px" },
  confirmBtn: {
    height: "46px",
    minWidth: "180px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center", border: "none", borderRadius: "3px", background: "#d93025", color: "#ffffff", fontSize: "12px", fontWeight: 700, padding: "0 14px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.14)"
  },
  mainMenuButton: { height: "46px", border: "1px solid #6da0e1", borderRadius: "4px", background: "#ffffff", color: "#1e63b5", fontSize: "13px", fontWeight: 600, padding: "0 16px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" },
  disabledBtn: { opacity: 0.6, cursor: "not-allowed" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: "8px", border: "none", background: "transparent", color: "#2563eb", fontSize: "13px", fontWeight: 500, padding: 0, cursor: "pointer", marginBottom: "8px" },
  stateBox: { padding: "12px 14px", borderRadius: "4px", fontSize: "13px", marginBottom: "12px" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" },
  successBox: { background: "#ecfdf3", border: "1px solid #bbf7d0", color: "#166534", marginTop: "14px" },
  emptyRow: { textAlign: "center", color: "#6b7280", padding: "22px 12px", fontSize: "12px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modal: { width: "520px", background: "#ffffff", borderRadius: "6px", boxShadow: "0 16px 40px rgba(0,0,0,0.18)", overflow: "hidden" },
  modalHeader: { padding: "16px 18px", borderBottom: "1px solid #e5e7eb", fontSize: "17px", fontWeight: 700 },
  modalBody: { padding: "16px 18px 18px", fontSize: "14px", color: "#374151", lineHeight: 1.55 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", padding: "0 18px 18px" },
  subtleBtn: { border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", borderRadius: "4px", height: "34px", padding: "0 14px", cursor: "pointer" },
  dangerBtn: { border: "none", background: "#d93025", color: "#ffffff", borderRadius: "4px", height: "34px", padding: "0 16px", cursor: "pointer", fontWeight: 600 },
  warningBox: { marginBottom: "14px", padding: "10px 12px", borderRadius: "3px", fontSize: "12px", background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" },
  coProductRow: { background: CO_PRODUCT_YELLOW },
};
