import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ProgressIndicator, { ShowingRecordsInfo } from "../components/CommonProgressIndicator";


const ITEM_BOM_ROUTING_API = `/api/tables/existing-item-bom-routing-search`;
const PAGE_SIZE = 50;
const CO_PRODUCT_YELLOW = "#fef08a";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#ececec",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#111827",
  },
  shell: {
    maxWidth: "1220px",
    margin: "0 auto",
    padding: "18px 24px 40px",
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
    marginBottom: "10px",
  },
  title: {
    margin: "0 0 22px",
    fontSize: "24px",
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#111827",
  },
  filterStack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginBottom: "20px",
    maxWidth: "1150px",
  },
  criteriaRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    alignItems: "center",
  },
  fieldGroup: {
    position: "relative",
  },
  fieldLabel: {
    position: "absolute",
    top: "-7px",
    left: "14px",
    fontSize: "11px",
    color: "#2563eb",
    background: "#ececec",
    padding: "0 4px",
    zIndex: 2,
    lineHeight: 1,
  },
  selectWrap: {
    position: "relative",
  },
  select: {
    width: "100%",
    height: "50px",
    border: "1px solid #bcc3cc",
    borderRadius: "2px",
    padding: "0 42px 0 16px",
    fontSize: "14px",
    color: "#111827",
    outline: "none",
    appearance: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    height: "50px",
    border: "1px solid #bcc3cc",
    borderRadius: "2px",
    padding: "0 16px",
    fontSize: "14px",
    color: "#111827",
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  selectArrow: {
    position: "absolute",
    top: "50%",
    right: "14px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "#6b7280",
    fontSize: "12px",
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
  warningBox: {
    marginBottom: "14px",
    padding: "10px 12px",
    borderRadius: "3px",
    fontSize: "12px",
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fdba74",
    maxWidth: "1150px",
  },
  tableMetaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: "1150px",
    marginBottom: "8px",
    gap: "12px",
  },
  showingText: {
    fontSize: "12px",
    color: "#374151",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
    overflow: "hidden",
    maxWidth: "1150px",
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
    fontWeight: 600,
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
    background: "#ffffff",
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
  highlightedCoProductRow: {
    background: CO_PRODUCT_YELLOW,
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
  paginationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    maxWidth: "1150px",
    marginTop: "14px",
  },
  pageButton: {
    minWidth: "74px",
    height: "30px",
    border: "1px solid #c7cbd1",
    borderRadius: "3px",
    background: "#ffffff",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  pageButtonDisabled: {
    color: "#9ca3af",
    background: "#f3f4f6",
    cursor: "not-allowed",
  },
  pageNoText: {
    minWidth: "72px",
    textAlign: "center",
    fontSize: "12px",
    color: "#111827",
    fontWeight: 600,
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
    gap: "16px",
    maxWidth: "1150px",
  },
  selectionText: {
    fontSize: "12px",
    color: "#374151",
  },
  confirmBtn: {
    minWidth: "214px",
    height: "32px",
    border: "none",
    borderRadius: "3px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: 600,
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
};

const CRITERIA_OPTIONS = [
  { value: "", label: "None" },
  { value: "location", label: "Location" },
  { value: "item", label: "Produced Item" },
  { value: "bomId", label: "BOMID" },
  { value: "resource", label: "Resource" },
  { value: "routingId", label: "Routing ID" },
  { value: "componentItem", label: "Component Item" },
  { value: "coProductItem", label: "Co-Product Item" },
];

const getValue = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const deriveLocationFromBomId = (bomId) => {
  const value = String(bomId || "").trim();
  if (!value) return "";
  const parts = value.split("_");
  if (parts.length < 3) return "";
  return parts.slice(2).join("_").trim();
};

const deriveResourceFromRoutingId = (routingId) => {
  const value = String(routingId || "").trim();
  if (!value) return "";
  const parts = value.split("_");
  if (parts.length < 4) return "";
  return parts[parts.length - 1].trim();
};

const normalizeRoutingRecord = (row, index) => {
  const item = getValue(row, ["item", "Item", "ITEM"]);

  const routingId = getValue(row, [
    "routing_id",
    "RoutingID",
    "routingId",
    "ROUTING_ID",
  ]);

  const bomId = getValue(row, ["bom_id", "BOMID", "bomId", "BOM_ID"]);

  const resource =
    getValue(row, ["resource", "Resource", "RESOURCE"]) ||
    deriveResourceFromRoutingId(routingId);

  const recId = getValue(row, ["rec_id", "recId", "REC_ID"]);

  const location =
    getValue(row, ["location", "Location", "LOCATION"]) || deriveLocationFromBomId(bomId);

  const rawCoProductAssociation = getValue(row, [
    "erp_co_product_association",
    "co_product_association",
    "erpCoProductAssociation",
    "coProductAssociation",
    "ERP_CO_PRODUCT_ASSOCIATION",
  ]);

  const coProductAssociation =
    Number(String(rawCoProductAssociation || "0").trim()) >= 1 ? 1 : 0;

  const componentItem = coProductAssociation === 1 ? "" : item;
  const coProductItem = coProductAssociation === 1 ? item : "";

  return {
    id: recId || `${bomId}__${routingId}__${item}__${index}`,
    recId,
    item,
    routingId,
    bomId,
    location,
    resource,
    componentItem,
    coProductItem,
    erpCoProductAssociation: rawCoProductAssociation,
    coProductAssociation,
    raw: row,
  };
};

const buildParentGroupKey = (row) =>
  `${String(row?.bomId || "").trim()}__${String(row?.routingId || "").trim()}`;

export default function DeleteExistingItemBomRoutingStep1() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRowsById, setSelectedRowsById] = useState({});
  const [criteria1Field, setCriteria1Field] = useState("bomId");
  const [criteria1Value, setCriteria1Value] = useState("");
  const [criteria2Field, setCriteria2Field] = useState("item");
  const [criteria2Value, setCriteria2Value] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [criteria1Field, criteria1Value, criteria2Field, criteria2Value]);

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("searchBy1", criteria1Field || "");
        params.set("query1", criteria1Value || "");
        params.set("searchBy2", criteria2Field || "");
        params.set("query2", criteria2Value || "");

        const response = await fetch(`${ITEM_BOM_ROUTING_API}?${params.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.details || result?.error || "Failed to fetch item BOM routing records"
          );
        }

        const list = Array.isArray(result?.data) ? result.data : [];
        const normalized = list.map((row, index) => normalizeRoutingRecord(row, index));

        if (!cancelled) {
          setRows(normalized);
          setPagination({
            page: Number(result?.pagination?.page || page),
            pageSize: Number(result?.pagination?.pageSize || PAGE_SIZE),
            total: Number(result?.pagination?.total || 0),
            totalPages: Math.max(1, Number(result?.pagination?.totalPages || 1)),
            hasPrev: Boolean(result?.pagination?.hasPrev),
            hasNext: Boolean(result?.pagination?.hasNext),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to fetch item BOM routing records");
          setRows([]);
          setPagination({
            page,
            pageSize: PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasPrev: page > 1,
            hasNext: false,
          });
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
  }, [page, criteria1Field, criteria1Value, criteria2Field, criteria2Value]);

  const pageRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const bomCompare = String(a.bomId || "").localeCompare(String(b.bomId || ""));
      if (bomCompare !== 0) return bomCompare;

      const aPriority = Number(a.coProductAssociation || 0) < 1 ? 0 : 1;
      const bPriority = Number(b.coProductAssociation || 0) < 1 ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const routingCompare = String(a.routingId || "").localeCompare(String(b.routingId || ""));
      if (routingCompare !== 0) return routingCompare;

      return String(a.item || "").localeCompare(String(b.item || ""));
    });
  }, [rows]);

  const selectedCount = selectedIds.length;

  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));

  const showingText = useMemo(() => {
    const total = Number(pagination.total || 0);
    if (!total) return "Showing 0 of 0 item(s)";

    const start = (Number(pagination.page || 1) - 1) * Number(pagination.pageSize || PAGE_SIZE) + 1;
    const end = Math.min(start + pageRows.length - 1, total);

    return `Showing ${start}-${end} of ${total} item(s)`;
  }, [pagination, pageRows.length]);

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageRows.some((row) => row.id === id)));
      setSelectedRowsById((prev) => {
        const next = { ...prev };
        pageRows.forEach((row) => delete next[row.id]);
        return next;
      });
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((row) => next.add(row.id));
      return Array.from(next);
    });

    setSelectedRowsById((prev) => {
      const next = { ...prev };
      pageRows.forEach((row) => {
        next[row.id] = row;
      });
      return next;
    });
  };

  const handleToggleRow = (row) => {
    setSelectedIds((prev) => {
      if (prev.includes(row.id)) return prev.filter((id) => id !== row.id);
      return [...prev, row.id];
    });

    setSelectedRowsById((prev) => {
      const next = { ...prev };
      if (next[row.id]) {
        delete next[row.id];
      } else {
        next[row.id] = row;
      }
      return next;
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handlePrevPage = () => {
    if (!pagination.hasPrev || loading) return;
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (!pagination.hasNext || loading) return;
    setPage((prev) => prev + 1);
  };

  const handleConfirm = () => {
    const directlySelectedRows = selectedIds
      .map((id) => selectedRowsById[id])
      .filter(Boolean);

    const expandedMap = new Map();

    directlySelectedRows.forEach((selectedRow) => {
      expandedMap.set(selectedRow.id, selectedRow);

      const isParentRow = selectedRow.coProductAssociation !== 1;
      if (isParentRow) {
        const parentGroupKey = buildParentGroupKey(selectedRow);

        pageRows
          .filter(
            (candidate) =>
              buildParentGroupKey(candidate) === parentGroupKey &&
              candidate.coProductAssociation === 1
          )
          .forEach((coProductRow) => {
            expandedMap.set(coProductRow.id, coProductRow);
          });
      }
    });

    const selectedRows = Array.from(expandedMap.values());

    navigate("/delete-bom-dashboard/delete-existing-ibr/summary", {
      state: {
        selectedRows,
        originallySelectedRows: directlySelectedRows,
      },
    });
  };

  const criteria1Label =
    CRITERIA_OPTIONS.find((x) => x.value === criteria1Field)?.label || "";
  const criteria2Label =
    CRITERIA_OPTIONS.find((x) => x.value === criteria2Field)?.label || "";

  return (
    <div style={styles.page}>
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
                    <option key={option.value || "criteria1"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▼</span>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>Search {criteria1Label || "Value"}</div>
              <input
                type="text"
                value={criteria1Value}
                onChange={(e) => setCriteria1Value(e.target.value)}
                placeholder={`Search ${criteria1Label || ""}`}
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
                    <option key={option.value || "criteria2"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▼</span>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>Search {criteria2Label || "Value"}</div>
              <input
                type="text"
                value={criteria2Value}
                onChange={(e) => setCriteria2Value(e.target.value)}
                placeholder={`Search ${criteria2Label || ""}`}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {error ? <div style={{ ...styles.stateBox, ...styles.error }}>{error}</div> : null}

        <div style={styles.warningBox}>
          Warning: If a parent item is selected for deletion, any associated co-products will
          also be included in the deletion.
        </div>

        <div style={styles.tableMetaRow}>
          <ShowingRecordsInfo
            start={Number(pagination.total || 0) === 0 ? 0 : (Number(pagination.page || 1) - 1) * Number(pagination.pageSize || PAGE_SIZE) + 1}
            end={Number(pagination.total || 0) === 0 ? 0 : Math.min(((Number(pagination.page || 1) - 1) * Number(pagination.pageSize || PAGE_SIZE) + 1) + pageRows.length - 1, Number(pagination.total || 0))}
            total={Number(pagination.total || 0)}
            itemLabel="item"
            style={styles.showingText}
          />
        </div>

        <div style={{ ...styles.tableCard, position: "relative" }}>
          <div style={styles.tableScroller}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={{ ...styles.th, ...styles.checkboxCell }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleAll}
                      style={styles.checkbox}
                      aria-label="Select all rows on current page"
                    />
                  </th>
                  <th style={{ ...styles.th, width: "120px" }}>Location</th>
                  <th style={{ ...styles.th, width: "105px" }}>Item</th>
                  <th style={{ ...styles.th, width: "220px" }}>BOM ID</th>
                  <th style={{ ...styles.th, width: "120px" }}>Resource</th>
                  <th style={{ ...styles.th, width: "360px" }}>Routing ID</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={styles.loadingBodyCell}>
                      <ProgressIndicator label="Loading item BOM routing records..." />
                    </td>
                  </tr>
                ) : null}

                {!loading && pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.emptyRow}>
                      No existing item BOM routing records found.
                    </td>
                  </tr>
                ) : null}

                {!loading && pageRows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);
                  const highlighted =
                    row.coProductAssociation === 1 ? styles.highlightedCoProductRow : undefined;

                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          ...styles.td,
                          ...styles.checkboxCell,
                          ...(highlighted || {}),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(row)}
                          style={styles.checkbox}
                          aria-label={`Select routing record ${row.routingId || row.id}`}
                        />
                      </td>
                      <td style={{ ...styles.td, ...(highlighted || {}) }}>
                        {row.location || "-"}
                      </td>
                      <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.item || "-"}</td>
                      <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.bomId || "-"}</td>
                      <td style={{ ...styles.td, ...(highlighted || {}) }}>
                        {row.resource || "-"}
                      </td>
                      <td style={{ ...styles.td, ...(highlighted || {}) }}>
                        {row.routingId || "-"}
                      </td>
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
        <div style={styles.paginationRow}>
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={!pagination.hasPrev || loading}
            style={{
              ...styles.pageButton,
              ...(!pagination.hasPrev || loading ? styles.pageButtonDisabled : {}),
            }}
          >
            ← Prev
          </button>

          <div style={styles.pageNoText}>{pagination.page}</div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={!pagination.hasNext || loading}
            style={{
              ...styles.pageButton,
              ...(!pagination.hasNext || loading ? styles.pageButtonDisabled : {}),
            }}
          >
            Next →
          </button>
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
