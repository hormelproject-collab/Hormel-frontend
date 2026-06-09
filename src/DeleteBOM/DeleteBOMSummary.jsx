import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const DELETE_BOM_SUMMARY_API = `${BASE_URL}/api/tables/delete-bom/summary`;
const DELETE_BOM_EXECUTE_API = `${BASE_URL}/api/tables/delete-bom/execute`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#111827",
    padding: "24px 0 40px",
  },
  shell: {
    width: "1060px",
    margin: "0 auto",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    margin: "0 0 18px",
    color: "#111827",
  },
  warningBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff3e0",
    color: "#9a5200",
    borderRadius: "3px",
    padding: "12px 14px",
    marginBottom: "12px",
    border: "1px solid #f3dfbe",
    fontSize: "14px",
    fontWeight: 600,
  },
  sectionCard: {
    background: "#fff",
    border: "1px solid #d5d7db",
    borderRadius: "3px",
    boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  summaryHeader: {
    background: "#f3dede",
  },
  routingHeader: {
    background: "#f3f4f6",
  },
  th: {
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 500,
    padding: "14px 12px",
    borderBottom: "1px solid #d5d7db",
    color: "#111827",
  },
  td: {
    fontSize: "13px",
    padding: "12px",
    borderBottom: "1px solid #d5d7db",
    color: "#111827",
    verticalAlign: "middle",
  },
  sectionTitle: {
    margin: "18px 0 6px",
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
  },
  sectionHint: {
    margin: "0 0 10px",
    fontSize: "13px",
    color: "#385b84",
  },
  notesBox: {
    width: "100%",
    minHeight: "76px",
    border: "1px solid #bfc6cf",
    borderRadius: "3px",
    background: "#fff",
    padding: "12px 10px",
    resize: "vertical",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "2px",
    alignItems: "center",
  },
  primaryBtn: {
    border: "none",
    borderRadius: "3px",
    height: "28px",
    padding: "0 14px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fff",
    background: "#d93025",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.14)",
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
  disabledBtn: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  modal: {
    width: "500px",
    background: "#fff",
    borderRadius: "6px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "16px 18px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "17px",
    fontWeight: 700,
  },
  modalBody: {
    padding: "16px 18px 18px",
    fontSize: "14px",
    color: "#374151",
    lineHeight: 1.55,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "0 18px 18px",
  },
  subtleBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: "4px",
    height: "34px",
    padding: "0 14px",
    cursor: "pointer",
  },
  dangerBtn: {
    border: "none",
    background: "#d93025",
    color: "#fff",
    borderRadius: "4px",
    height: "34px",
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
  stateBox: {
    padding: "12px 14px",
    borderRadius: "4px",
    fontSize: "13px",
    marginBottom: "12px",
  },
  loadingBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
  },
  successPanel: {
    marginTop: "16px",
    background: "#ecfdf3",
    border: "1px solid #bbf7d0",
    borderRadius: "6px",
    padding: "14px 16px",
    color: "#166534",
  },
  successTitle: {
    margin: "0 0 10px",
    fontSize: "15px",
    fontWeight: 700,
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
    fontSize: "13px",
    lineHeight: 1.7,
  },
  emptyRow: {
    textAlign: "center",
    color: "#6b7280",
    padding: "18px 12px",
    fontSize: "13px",
  },
};

const toText = (value) => String(value ?? "").trim();

const uniqueByKey = (arr, key) => {
  const seen = new Set();
  return arr.filter((item) => {
    const value = toText(item?.[key]);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export default function DeleteBomSummaryStep2() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedRows = Array.isArray(location.state?.selectedRows)
    ? location.state.selectedRows
    : [];

  const bomIds = useMemo(
    () =>
      Array.from(
        new Set(
          selectedRows.map((row) => toText(row.bomId)).filter(Boolean)
        )
      ),
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
        setError(
          "No BOM records were selected. Please go back and select at least one BOM."
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        bomIds.forEach((bomId) => params.append("bomIds", bomId));

        const response = await fetch(
          `${DELETE_BOM_SUMMARY_API}?${params.toString()}`
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.details ||
              payload?.error ||
              "Failed to load delete BOM summary"
          );
        }

        if (!cancelled) {
          setSummaryRows(
            Array.isArray(payload?.data?.bomSummary)
              ? payload.data.bomSummary
              : []
          );
          setRoutingRows(
            Array.isArray(payload?.data?.routingSummary)
              ? payload.data.routingSummary
              : []
          );
          
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load delete BOM summary");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [bomIds]);

  const dedupedSummaryRows = useMemo(
    () => uniqueByKey(summaryRows, "bom_id"),
    [summaryRows]
  );

  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleDeleteClick = () => {
    setShowModal(true);
  };

  const handleContinueDelete = async () => {
    try {
      setSubmitting(true);
      setError("");
      setResult(null);

      const response = await fetch(DELETE_BOM_EXECUTE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bomIds,
          notes,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.details ||
            payload?.error ||
            "Failed to delete selected BOM records"
        );
      }

      setResult(payload);
      setShowModal(false);
    } catch (err) {
      setError(err?.message || "Failed to delete selected BOM records");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <h1 style={styles.title}>Step 2: Deleted BOM Summary</h1>

        <div style={styles.warningBox}>
          <span style={{ fontSize: "16px" }}>⚠</span>
          <span>Warning: The following records will be permanently deleted</span>
        </div>

        {loading ? (
          <div style={{ ...styles.stateBox, ...styles.loadingBox }}>
            Loading deleted BOM summary...
          </div>
        ) : null}

        {error ? (
          <div style={{ ...styles.stateBox, ...styles.errorBox }}>{error}</div>
        ) : null}

        <div style={styles.sectionCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.summaryHeader}>
                <th style={styles.th}>Produced Item</th>
                <th style={styles.th}>Item Description</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>BOM ID</th>
              </tr>
            </thead>
            <tbody>
              {!loading && dedupedSummaryRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyRow}>
                    No BOM summary rows found.
                  </td>
                </tr>
              ) : null}

              {dedupedSummaryRows.map((row) => (
                <tr key={row.bom_id}>
                  <td style={styles.td}>{toText(row.produced_item) || "-"}</td>
                  <td style={styles.td}>
                    {toText(row.produced_item_desc) || "-"}
                  </td>
                  <td style={styles.td}>{toText(row.location) || "-"}</td>
                  <td style={styles.td}>{toText(row.bom_id) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.sectionTitle}>Connected Routing IDs</div>
        <p style={styles.sectionHint}>
          The following Routing IDs are connected to the BOM records and will
          also be deleted
        </p>

        <div style={styles.sectionCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.routingHeader}>
                <th style={styles.th}>BOM ID</th>
                <th style={styles.th}>Resource</th>
                <th style={styles.th}>Routing ID</th>
              </tr>
            </thead>
            <tbody>
              {!loading && routingRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyRow}>
                    No connected routing rows found.
                  </td>
                </tr>
              ) : null}

              {routingRows.map((row, index) => (
                <tr
                  key={`${toText(row.bom_id)}__${toText(
                    row.routing_id
                  )}__${index}`}
                >
                  <td style={styles.td}>{toText(row.bom_id) || "-"}</td>
                  <td style={styles.td}>{toText(row.resource) || "-"}</td>
                  <td style={styles.td}>{toText(row.routing_id) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "18px" }}>
          <textarea
            style={styles.notesBox}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (Optional)"
          />
        </div>

        <div style={styles.buttonRow}>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={loading || !!result || !bomIds.length}
            style={{
              ...styles.primaryBtn,
              ...(loading || !!result || !bomIds.length
                ? styles.disabledBtn
                : {}),
            }}
          >
            CONFIRM DELETION
          </button>

          <button
            type="button"
            onClick={handleReturnToMainMenu}
            style={styles.secondaryBtn}
          >
            <span style={{ fontSize: "13px" }}>⌂</span>
            <span>RETURN TO MAIN MENU</span>
          </button>
        </div>

        {result ? (
          <div style={styles.successPanel}>
            <h3 style={styles.successTitle}>Deletion completed successfully</h3>

            <div style={{ fontSize: "13px", marginBottom: "8px" }}>
              <strong>Engineering Change ID:</strong>{" "}
              {toText(result.engineeringChangeId) || "-"}
            </div>
          </div>
        ) : null}
      </div>

      {showModal ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>Permanent Deletion Warning</div>

            <div style={styles.modalBody}>
              This action will permanently delete the selected BOM record(s)
              from the system. Do you want to continue?
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={styles.subtleBtn}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleContinueDelete}
                disabled={submitting}
                style={{
                  ...styles.dangerBtn,
                  ...(submitting ? styles.disabledBtn : {}),
                }}
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
