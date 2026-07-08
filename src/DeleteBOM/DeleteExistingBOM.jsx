import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ProgressIndicator from "../components/CommonProgressIndicator";
const EXISTING_BOM_API = `/api/tables/existing-bom-search`;
const CO_PRODUCT_YELLOW = "#fef08a";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#111827",
  },
  topRule: {
    height: "8px",
    background: "#e5e7eb",
    width: "100%",
  },
  shell: {
    maxWidth: "980px",
    margin: "0 auto",
    padding: "24px 18px 40px",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 500,
    padding: 0,
    cursor: "pointer",
    marginBottom: "8px",
  },
  title: {
    margin: "0 0 18px",
    fontSize: "20px",
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#111827",
  },
  filterStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "18px",
  },
  criteriaRow: {
    display: "grid",
    gridTemplateColumns: "474px 474px",
    gap: "12px",
    alignItems: "end",
  },
  fieldGroup: {
    position: "relative",
  },
  fieldLabel: {
    position: "absolute",
    top: "-8px",
    left: "12px",
    background: "#f3f4f6",
    padding: "0 4px",
    fontSize: "11px",
    color: "#2563eb",
    zIndex: 1,
  },
  selectWrap: {
    position: "relative",
  },
  select: {
    width: "100%",
    height: "42px",
    border: "1px solid #c7cbd1",
    borderRadius: "2px",
    padding: "0 38px 0 14px",
    fontSize: "13px",
    color: "#111827",
    outline: "none",
    appearance: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    height: "42px",
    border: "1px solid #c7cbd1",
    borderRadius: "2px",
    padding: "0 14px",
    fontSize: "13px",
    color: "#111827",
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  selectArrow: {
    position: "absolute",
    top: "50%",
    right: "12px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "#6b7280",
    fontSize: "12px",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  tableScroller: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  tableHeadRow: {
    background: "#f3f4f6",
  },
  th: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 500,
    color: "#111827",
    padding: "13px 12px",
    borderBottom: "1px solid #d1d5db",
    whiteSpace: "nowrap",
  },
  td: {
    fontSize: "12px",
    color: "#111827",
    padding: "12px 12px",
    borderBottom: "1px solid #d1d5db",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  checkboxCell: {
    width: "34px",
    textAlign: "center",
    padding: "0 0 0 12px",
  },
  checkbox: {
    width: "15px",
    height: "15px",
    cursor: "pointer",
  },
  releaseRed: {
    color: "#ff1f1f",
    fontWeight: 500,
  },
  coProductRow: {
    backgroundColor: CO_PRODUCT_YELLOW,
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
    gap: "16px",
  },
  selectionText: {
    fontSize: "12px",
    color: "#374151",
  },
  confirmBtn: {
    minWidth: "214px",
    height: "30px",
    border: "none",
    borderRadius: "3px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.1px",
    cursor: "pointer",
  },
  confirmBtnDisabled: {
    background: "#e5e5e5",
    color: "#a8a8a8",
    cursor: "not-allowed",
  },
  confirmBtnEnabled: {
    background: "#2563eb",
    color: "#ffffff",
  },
  stateBox: {
    marginBottom: "14px",
    padding: "10px 12px",
    borderRadius: "3px",
    fontSize: "12px",
  },
  loading: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
  },
  emptyRow: {
    textAlign: "center",
    color: "#6b7280",
    padding: "22px 12px",
    fontSize: "12px",
  },
  loadingBodyCell: {
    textAlign: "center",
    padding: "28px 12px",
    borderBottom: "1px solid #d1d5db",
    background: "#ffffff",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
    fontSize: "12px",
    color: "#374151",
    maxWidth: "1150px",
  },
  legendColor: {
    width: "18px",
    height: "14px",
    background: CO_PRODUCT_YELLOW,
    border: "1px solid #d1d5db",
    borderRadius: "2px",
    flexShrink: 0,
  },
};

const CRITERIA_OPTIONS = [
  { value: "", label: "None" },
  { value: "location", label: "Location" },
  { value: "bomId", label: "BOMID" },
  { value: "producedItem", label: "Produced Item" },
  { value: "producedItemDescription", label: "Produced Item Description" },
  { value: "releaseFlag", label: "Item Release Flag" },
];

const getRowValueByCriteria = (row, criteria) => {
  switch (criteria) {
    case "location":
      return row.location || "";
    case "bomId":
      return row.bomId || "";
    case "resource":
      return row.resource || "";
    case "producedItem":
      return row.producedItem || "";
    case "producedItemDescription":
      return row.producedItemDescription || "";
    case "releaseFlag":
      return row.releaseFlag || "";
    default:
      return "";
  }
};

const getValue = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const normalizeRecord = (row, index) => {
  const location = getValue(row, ["location", "Location", "LOCATION"]);

  const resource = getValue(row, [
    "resource",
    "Resource",
    "RESOURCE",
    "routing_resource",
    "RoutingResource",
  ]);

  const producedItem = getValue(row, [
    "produced_item",
    "ProducedItem",
    "producedItem",
    "item",
    "Item",
  ]);

  const producedItemDescription = getValue(row, [
    "produced_item_desc",
    "ProducedItemDescription",
    "produced_item_description",
    "item_description",
    "ItemDescription",
    "description",
  ]);

  const releaseFlag = getValue(row, [
    "release_flag",
    "ReleaseFlag",
    "item_release_flag",
    "itemReleaseFlag",
    "release",
  ]);

  const bomId = getValue(row, ["bom_id", "BOMID", "bomId", "BOM_ID"]);

  const erpCoProductAssociation = getValue(row, [
    "erp_co_product_association",
    "erpCoProductAssociation",
    "ERP_CO_PRODUCT_ASSOCIATION",
  ]);

  return {
    id: getValue(row, ["id", "ID"]) || `${bomId || location}__${producedItem}__${resource}__${index}`,
    location,
    producedItem,
    resource,
    producedItemDescription,
    releaseFlag,
    bomId,
    erpCoProductAssociation,
    raw: row,
  };
};

export default function DeleteExistingBomStep1() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [criteria1Field, setCriteria1Field] = useState("bomId");
  const [criteria1Value, setCriteria1Value] = useState("");
  const [criteria2Field, setCriteria2Field] = useState("producedItem");
  const [criteria2Value, setCriteria2Value] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(EXISTING_BOM_API, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.details || result?.error || "Failed to fetch existing BOM records"
          );
        }

        const list = Array.isArray(result?.data) ? result.data : [];
        const normalized = list.map((row, index) => normalizeRecord(row, index));

        if (!cancelled) {
          setRows(normalized);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to fetch existing BOM records");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRows();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const value1 = String(getRowValueByCriteria(row, criteria1Field) ?? "")
        .trim()
        .toLowerCase();
      const value2 = String(getRowValueByCriteria(row, criteria2Field) ?? "")
        .trim()
        .toLowerCase();
      const search1 = String(criteria1Value ?? "").trim().toLowerCase();
      const search2 = String(criteria2Value ?? "").trim().toLowerCase();

      const match1 = !criteria1Field || !search1 ? true : value1.includes(search1);
      const match2 = !criteria2Field || !search2 ? true : value2.includes(search2);

      return match1 && match2;
    });

    // Keep page ordering stable even after frontend filtering:
    // BOMID first, main item first, then co-products.
    return [...filtered].sort((a, b) => {
      const bomCompare = String(a.bomId || "").localeCompare(String(b.bomId || ""));
      if (bomCompare !== 0) return bomCompare;

      const aIsCoProduct = String(a.erpCoProductAssociation || "").trim() === "1";
      const bIsCoProduct = String(b.erpCoProductAssociation || "").trim() === "1";

      if (aIsCoProduct !== bIsCoProduct) {
        return aIsCoProduct ? 1 : -1;
      }

      return String(a.producedItem || "").localeCompare(String(b.producedItem || ""));
    });
  }, [rows, criteria1Field, criteria1Value, criteria2Field, criteria2Value]);

  const selectedCount = selectedIds.length;
  const totalItems = filteredRows.length;
  const startRecord = totalItems === 0 ? 0 : 1;
  const endRecord = totalItems;

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id));

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredRows.some((row) => row.id === id))
      );
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((row) => next.add(row.id));
      return Array.from(next);
    });
  };

  const handleToggleRow = (rowId) => {
    setSelectedIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleConfirm = () => {
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));

    navigate("/delete-bom-dashboard/delete-existing-bom/summary", {
      state: {
        selectedRows,
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.topRule} />

      <div style={styles.shell}>
        <button type="button" onClick={handleBack} style={styles.backBtn}>
          <span style={{ fontSize: "16px", lineHeight: 1 }}>←</span>
          <span>BACK</span>
        </button>

        <h1 style={styles.title}>Step 1: Select Existing BOM</h1>

        <div style={styles.filterStack}>
          <div style={styles.criteriaRow}>
            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>Search By (Criteria 1)</div>
              <div style={styles.selectWrap}>
                <select
                  value={criteria1Field}
                  onChange={(e) => setCriteria1Field(e.target.value)}
                  style={styles.select}
                >
                  {CRITERIA_OPTIONS.map((option) => (
                    <option key={option.value || "none-1"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▼</span>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <input
                type="text"
                value={criteria1Value}
                onChange={(e) => setCriteria1Value(e.target.value)}
                placeholder={
                  criteria1Field
                    ? `Search ${
                        CRITERIA_OPTIONS.find((x) => x.value === criteria1Field)?.label || ""
                      }`
                    : "Search"
                }
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.criteriaRow}>
            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>Search By (Criteria 2)</div>
              <div style={styles.selectWrap}>
                <select
                  value={criteria2Field}
                  onChange={(e) => setCriteria2Field(e.target.value)}
                  style={styles.select}
                >
                  {CRITERIA_OPTIONS.map((option) => (
                    <option key={option.value || "none-2"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▼</span>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <input
                type="text"
                value={criteria2Value}
                onChange={(e) => setCriteria2Value(e.target.value)}
                placeholder={
                  criteria2Field
                    ? `Search ${
                        CRITERIA_OPTIONS.find((x) => x.value === criteria2Field)?.label || ""
                      }`
                    : "Search"
                }
                style={styles.input}
              />
            </div>
          </div>
        </div>


        {error ? <div style={{ ...styles.stateBox, ...styles.error }}>{error}</div> : null}

        <div style={styles.tableCard}>
          <div style={styles.tableScroller}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={{ ...styles.th, ...styles.checkboxCell }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleAll}
                      disabled={loading}
                      style={styles.checkbox}
                      aria-label="Select all rows"
                    />
                  </th>
                  <th style={{ ...styles.th, width: "100px" }}>Location</th>
                  <th style={{ ...styles.th, width: "134px" }}>Produced Item</th>
                  <th style={{ ...styles.th, width: "230px" }}>
                    Produced Item Description
                  </th>
                  <th style={{ ...styles.th, width: "156px" }}>Item Release Flag</th>
                  <th style={{ ...styles.th, width: "186px" }}>BOM ID</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={styles.loadingBodyCell}>
                      <ProgressIndicator label="Loading existing BOM records..." />
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.emptyRow}>
                      No existing BOM records found.
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredRows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);
                  const showRedRelease =
                    /release\s*3/i.test(row.releaseFlag) || /\u26a0|△/.test(row.releaseFlag);
                  const releaseText = row.releaseFlag || "-";
                  const isCoProduct =
                    String(row.erpCoProductAssociation || "").trim() === "1";
                  const coProductCellStyle = isCoProduct ? styles.coProductRow : {};

                  return (
                    <tr key={row.id} style={coProductCellStyle}>
                      <td style={{ ...styles.td, ...styles.checkboxCell, ...coProductCellStyle }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(row.id)}
                          style={styles.checkbox}
                          aria-label={`Select BOM ${row.bomId || row.id}`}
                        />
                      </td>

                      <td style={{ ...styles.td, ...coProductCellStyle }}>{row.location || "-"}</td>
                      <td style={{ ...styles.td, ...coProductCellStyle }}>{row.producedItem || "-"}</td>
                      <td style={{ ...styles.td, ...coProductCellStyle }}>{row.producedItemDescription || "-"}</td>
                      <td style={{ ...styles.td, ...coProductCellStyle }}>
                        <span style={showRedRelease ? styles.releaseRed : undefined}>
                          {releaseText}
                          {showRedRelease && !/\u26a0|△/.test(releaseText) ? " △" : ""}
                        </span>
                      </td>
                      <td style={{ ...styles.td, ...coProductCellStyle }}>{row.bomId || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.legendRow}>
          <span style={styles.legendColor} />
          <span>Yellow color code represents co-products.</span>
        </div>

        <div style={styles.footerRow}>
          <div style={styles.selectionText}>{selectedCount} record(s) selected for deletion</div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            style={{
              ...styles.confirmBtn,
              ...(selectedCount === 0 ? styles.confirmBtnDisabled : styles.confirmBtnEnabled),
            }}
          >
            <span style={{ fontSize: "12px" }}>🗑</span>
            <span>CONFIRM AND SUBMIT DELETION</span>
          </button>
        </div>
      </div>
    </div>
  );
}
