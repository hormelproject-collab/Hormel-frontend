import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ProgressIndicator, { ShowingRecordsInfo } from "../components/CommonProgressIndicator";
import {
  fetchExistingItemBomRoutingSearchRows,
  setExistingItemBomRoutingSearchState,
  toggleExistingIbrSelectedRow,
  toggleExistingIbrSelectedPageRows,
  clearExistingIbrSelectedRows,
  selectExistingItemBomRoutingSearchRows,
  selectExistingItemBomRoutingSearchLoading,
  selectExistingItemBomRoutingSearchError,
  selectExistingItemBomRoutingSearchPagination,
  selectExistingItemBomRoutingSearchState,
  selectExistingIbrSelectedRowIds,
  selectExistingIbrSelectedRows,
  selectExistingIbrAssociatedCoProductsByGroup,
} from "../redux/bomSlice";

const PAGE_SIZE = 50;
const CO_PRODUCT_YELLOW = "#fef08a";

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

const toText = (value) => String(value ?? "").trim();
const getItem = (row) => toText(row?.item);
const getBomId = (row) => toText(row?.bom_id ?? row?.bomId);
const getRoutingId = (row) => toText(row?.routing_id ?? row?.routingId);
const getLocation = (row) => toText(row?.location);
const getResource = (row) => toText(row?.resource);
const getRecId = (row) => toText(row?.rec_id ?? row?.recId);
const getCoProductAssociation = (row) =>
  Number(
    toText(
      row?.co_product_association ??
      row?.coProductAssociation ??
      row?.erp_co_product_association
    ) || "0"
  ) >= 1
    ? 1
    : 0;
const isCoProductRow = (row) => getCoProductAssociation(row) === 1;

const buildRoutingId = (item, resource, fallback = "") => {
  const cleanItem = toText(item);
  const cleanResource = toText(resource);
  if (cleanItem && cleanResource) return `ROUTING_${cleanItem}_${cleanResource}`;
  return toText(fallback);
};

const deriveResourceFromRoutingId = (routingId) => {
  const value = toText(routingId);
  if (!value) return "";
  const parts = value
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 3 ? parts.slice(2).join("_") : "";
};

const normalizeDisplayRow = (row, index = 0) => {
  const item = getItem(row);
  const rawRoutingId = getRoutingId(row);
  const resource = getResource(row) || deriveResourceFromRoutingId(rawRoutingId);
  const routingId = buildRoutingId(item, resource, rawRoutingId);
  const coProductAssociation = getCoProductAssociation(row);
  const recId = getRecId(row);
  const rowType = coProductAssociation === 1 ? "COPRODUCT" : "MAIN";
  const stableId =
    toText(row?.id) ||
    recId ||
    [getBomId(row) || "NOBOM", resource || "NORESOURCE", item || "NOITEM", rowType, index].join("__");

  return {
    ...row,
    id: stableId,
    recId,
    rec_id: recId,
    item,
    bomId: getBomId(row),
    bom_id: getBomId(row),
    routingId,
    routing_id: routingId,
    location: getLocation(row),
    resource,
    componentItem: coProductAssociation === 1 ? "" : item,
    component_item: coProductAssociation === 1 ? "" : item,
    coProductItem: coProductAssociation === 1 ? item : "",
    co_product_item: coProductAssociation === 1 ? item : "",
    coProductAssociation,
    co_product_association: coProductAssociation,
    erpCoProductAssociation: toText(row?.erp_co_product_association ?? row?.erpCoProductAssociation),
    erp_co_product_association: toText(row?.erp_co_product_association ?? row?.erpCoProductAssociation),
  };
};

const buildParentGroupKey = (row) =>
  // Main item and co-products share BOM ID + Resource.
  // Do not group by routing ID because display routing ID is ROUTING_item_resource and item differs.
  [getBomId(row), getResource(row)]
    .map((value) => toText(value).toUpperCase())
    .join("__");

const sortIbrRows = (rows) =>
  [...rows].sort((a, b) => {
    const bomCompare = getBomId(a).localeCompare(getBomId(b));
    if (bomCompare !== 0) return bomCompare;

    const aPriority = isCoProductRow(a) ? 1 : 0;
    const bPriority = isCoProductRow(b) ? 1 : 0;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const resourceCompare = getResource(a).localeCompare(getResource(b));
    if (resourceCompare !== 0) return resourceCompare;

    const routingCompare = getRoutingId(a).localeCompare(getRoutingId(b));
    if (routingCompare !== 0) return routingCompare;

    return getItem(a).localeCompare(getItem(b));
  });

export default function DeleteExistingItemBomRoutingStep1() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const rows = useSelector(selectExistingItemBomRoutingSearchRows);
  const loading = useSelector(selectExistingItemBomRoutingSearchLoading);
  const error = useSelector(selectExistingItemBomRoutingSearchError);
  const pagination = useSelector(selectExistingItemBomRoutingSearchPagination);
  const searchState = useSelector(selectExistingItemBomRoutingSearchState);
  const selectedIds = useSelector(selectExistingIbrSelectedRowIds);
  const selectedRows = useSelector(selectExistingIbrSelectedRows);
  const associatedCoProductsByGroup = useSelector(
    selectExistingIbrAssociatedCoProductsByGroup
  );

  const criteria1Field = searchState?.searchBy1 ?? "bomId";
  const criteria1Value = searchState?.query1 ?? "";
  const criteria2Field = searchState?.searchBy2 ?? "item";
  const criteria2Value = searchState?.query2 ?? "";

  const page = Math.max(1, Number(pagination?.page || 1));
  const pageSize = Math.max(1, Number(pagination?.pageSize || PAGE_SIZE));
  const total = Math.max(0, Number(pagination?.total || 0));
  const hasPrev = Boolean(pagination?.hasPrev ?? page > 1);
  const hasNext = Boolean(pagination?.hasNext ?? false);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchExistingItemBomRoutingSearchRows({
          page,
          pageSize: PAGE_SIZE,
          searchBy1: criteria1Field,
          query1: criteria1Value,
          searchBy2: criteria2Field,
          query2: criteria2Value,
        })
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [dispatch, page, criteria1Field, criteria1Value, criteria2Field, criteria2Value]);

  const pageRows = useMemo(() => {
    return sortIbrRows(rows.map((row, index) => normalizeDisplayRow(row, index)));
  }, [rows]);

  const selectedSummaryRows = useMemo(() => {
    return sortIbrRows(selectedRows.map((row, index) => normalizeDisplayRow(row, index)));
  }, [selectedRows]);

  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));
  const selectedCount = selectedIds.length;

  const updateSearchState = (payload) => {
    dispatch(
      setExistingItemBomRoutingSearchState({
        ...payload,
        pagination: { page: 1, pageSize: PAGE_SIZE },
      })
    );
  };

  const getCoProductsForMainRow = (row) => {
    const groupKey = buildParentGroupKey(row);
    const fromRedux = associatedCoProductsByGroup[groupKey] || [];
    const fromPage = pageRows.filter(
      (candidate) => buildParentGroupKey(candidate) === groupKey && isCoProductRow(candidate)
    );
    const byId = new Map();

    [...fromRedux, ...fromPage].forEach((candidate, index) => {
      const normalized = normalizeDisplayRow(candidate, index);
      byId.set(normalized.id, normalized);
    });

    return Array.from(byId.values());
  };

  const toggleRowsKeepingRedux = (rowsToToggle) => {
    const normalizedRows = rowsToToggle.map((row, index) => normalizeDisplayRow(row, index));
    const selectedIdSet = new Set(selectedIds);
    const allRowsAlreadySelected = normalizedRows.every((row) => selectedIdSet.has(row.id));

    normalizedRows.forEach((row) => {
      const isSelected = selectedIdSet.has(row.id);

      if (allRowsAlreadySelected) {
        if (isSelected) dispatch(toggleExistingIbrSelectedRow(row));
        return;
      }

      if (!isSelected) dispatch(toggleExistingIbrSelectedRow(row));
    });
  };

  const handleToggleRow = (row) => {
    const normalized = normalizeDisplayRow(row);

    // Co-product selection should select/remove only that row.
    if (isCoProductRow(normalized)) {
      toggleRowsKeepingRedux([normalized]);
      return;
    }

    // Main item selection should select/remove main item + associated co-products.
    toggleRowsKeepingRedux([normalized, ...getCoProductsForMainRow(normalized)]);
  };

  const handleToggleAll = () => {
    dispatch(toggleExistingIbrSelectedPageRows(pageRows));
  };

  const handleDeselectAll = () => {
    dispatch(clearExistingIbrSelectedRows());
  };

  const handleBack = () => navigate(-1);

  const handlePrevPage = () => {
    if (!hasPrev || loading) return;
    dispatch(
      setExistingItemBomRoutingSearchState({
        pagination: { page: Math.max(1, page - 1), pageSize: PAGE_SIZE },
      })
    );
  };

  const handleNextPage = () => {
    if (!hasNext || loading) return;
    dispatch(
      setExistingItemBomRoutingSearchState({
        pagination: { page: page + 1, pageSize: PAGE_SIZE },
      })
    );
  };

  const handleConfirm = () => {
    navigate("/delete-bom-dashboard/delete-existing-ibr/summary", {
      state: {
        selectedRows: selectedSummaryRows,
      },
    });
  };

  const criteria1Label = CRITERIA_OPTIONS.find((x) => x.value === criteria1Field)?.label || "";
  const criteria2Label = CRITERIA_OPTIONS.find((x) => x.value === criteria2Field)?.label || "";
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(start + pageRows.length - 1, total);

  const renderDataRow = (row, selectedTable = false) => {
    const highlighted = isCoProductRow(row) ? styles.highlightedCoProductRow : undefined;
    const isSelected = selectedIds.includes(row.id);

    return (
      <tr key={`${selectedTable ? "selected-" : ""}${row.id}`}>
        {!selectedTable ? (
          <td style={{ ...styles.td, ...styles.checkboxCell, ...(highlighted || {}) }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleRow(row)}
              style={styles.checkbox}
              aria-label={`Select routing record ${row.routingId || row.id}`}
            />
          </td>
        ) : null}
        <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.location || "-"}</td>
        <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.item || "-"}</td>
        <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.bomId || "-"}</td>
        <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.resource || "-"}</td>
        <td style={{ ...styles.td, ...(highlighted || {}) }}>{row.routingId || "-"}</td>
        {selectedTable ? (
          <td style={{ ...styles.td, ...(highlighted || {}) }}>
            <button type="button" onClick={() => handleToggleRow(row)} style={styles.removeSelectedBtn}>
              Remove
            </button>
          </td>
        ) : null}
      </tr>
    );
  };

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
                  onChange={(e) => updateSearchState({ searchBy1: e.target.value })}
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
                onChange={(e) => updateSearchState({ query1: e.target.value })}
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
                  onChange={(e) => updateSearchState({ searchBy2: e.target.value })}
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
                onChange={(e) => updateSearchState({ query2: e.target.value })}
                placeholder={`Search ${criteria2Label || ""}`}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {error ? <div style={{ ...styles.stateBox, ...styles.error }}>{error}</div> : null}

        <div style={styles.warningBox}>
          Warning: If a parent item is selected for deletion, any associated co-products will also be included in the deletion.
        </div>

        <div style={styles.tableMetaRow}>
          <ShowingRecordsInfo start={start} end={end} total={total} itemLabel="item" style={styles.showingText} />
        </div>

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
                      disabled={loading || pageRows.length === 0}
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
                {!loading && pageRows.map((row) => renderDataRow(row, false))}
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
            disabled={!hasPrev || loading}
            style={{ ...styles.pageButton, ...(!hasPrev || loading ? styles.pageButtonDisabled : {}) }}
          >
            ← Prev
          </button>
          <div style={styles.pageNoText}>{page}</div>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!hasNext || loading}
            style={{ ...styles.pageButton, ...(!hasNext || loading ? styles.pageButtonDisabled : {}) }}
          >
            Next →
          </button>
        </div>

        {selectedSummaryRows.length > 0 ? (
          <>
            <div style={styles.selectedSectionHeader}>
              <div>
                <div style={styles.selectedTitle}>Selected Item BOM Routing Records</div>
                <div style={styles.selectedSubText}>
                  Main item selection includes associated co-products. Co-products are highlighted in yellow.
                </div>
              </div>
              <button type="button" onClick={handleDeselectAll} style={styles.deselectAllBtn}>
                DESELECT ALL
              </button>
            </div>
            <div style={styles.selectedTableCard}>
              <div style={styles.tableScroller}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.selectedTableHeadRow}>
                      <th style={{ ...styles.th, width: "120px" }}>Location</th>
                      <th style={{ ...styles.th, width: "105px" }}>Item</th>
                      <th style={{ ...styles.th, width: "220px" }}>BOM ID</th>
                      <th style={{ ...styles.th, width: "120px" }}>Resource</th>
                      <th style={{ ...styles.th, width: "360px" }}>Routing ID</th>
                      <th style={{ ...styles.th, width: "90px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>{selectedSummaryRows.map((row) => renderDataRow(row, true))}</tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <div style={styles.footerRow}>
          <div style={styles.selectionText}>{selectedCount} record(s) selected for deletion</div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            style={{ ...styles.confirmBtn, ...(selectedCount === 0 ? styles.confirmBtnDisabled : styles.confirmBtnEnabled) }}
          >
            <span style={{ fontSize: "12px" }}>🗑</span>
            <span>CONFIRM AND SUBMIT DELETION</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#ececec", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: "#111827" },
  shell: { maxWidth: "1220px", margin: "0 auto", padding: "18px 24px 40px" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: "8px", border: "none", background: "transparent", color: "#2563eb", fontSize: "13px", fontWeight: 500, padding: 0, cursor: "pointer", marginBottom: "10px" },
  title: { margin: "0 0 22px", fontSize: "24px", lineHeight: 1.2, fontWeight: 700, color: "#111827" },
  filterStack: { display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px", maxWidth: "1150px" },
  criteriaRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center" },
  fieldGroup: { position: "relative" },
  fieldLabel: { position: "absolute", top: "-7px", left: "14px", fontSize: "11px", color: "#2563eb", background: "#ececec", padding: "0 4px", zIndex: 2, lineHeight: 1 },
  selectWrap: { position: "relative" },
  select: { width: "100%", height: "50px", border: "1px solid #bcc3cc", borderRadius: "2px", padding: "0 42px 0 16px", fontSize: "14px", color: "#111827", outline: "none", appearance: "none", background: "#ffffff", boxSizing: "border-box" },
  input: { width: "100%", height: "50px", border: "1px solid #bcc3cc", borderRadius: "2px", padding: "0 16px", fontSize: "14px", color: "#111827", outline: "none", background: "#ffffff", boxSizing: "border-box" },
  selectArrow: { position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7280", fontSize: "12px" },
  stateBox: { marginBottom: "14px", padding: "10px 12px", borderRadius: "3px", fontSize: "12px" },
  error: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  warningBox: { marginBottom: "14px", padding: "10px 12px", borderRadius: "3px", fontSize: "12px", background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74", maxWidth: "1150px" },
  tableMetaRow: { display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1150px", marginBottom: "8px", gap: "12px" },
  showingText: { fontSize: "12px", color: "#374151" },
  tableCard: { background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "3px", boxShadow: "0 2px 3px rgba(0,0,0,0.08)", overflow: "hidden", maxWidth: "1150px" },
  selectedTableCard: { background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "3px", boxShadow: "0 2px 3px rgba(0,0,0,0.08)", overflow: "hidden", maxWidth: "1150px", marginTop: "8px" },
  tableScroller: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  tableHeadRow: { background: "#f3f4f6" },
  selectedTableHeadRow: { background: "#e8f0fe" },
  th: { textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#111827", padding: "13px 12px", borderBottom: "1px solid #d1d5db", whiteSpace: "nowrap" },
  td: { fontSize: "12px", color: "#111827", padding: "12px 12px", borderBottom: "1px solid #d1d5db", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "#ffffff" },
  checkboxCell: { width: "34px", textAlign: "center", padding: "0 0 0 12px" },
  checkbox: { width: "15px", height: "15px", cursor: "pointer" },
  emptyRow: { textAlign: "center", color: "#6b7280", padding: "22px 12px", fontSize: "12px" },
  loadingBodyCell: { textAlign: "center", padding: "28px 12px", borderBottom: "1px solid #d1d5db", background: "#ffffff" },
  highlightedCoProductRow: { background: CO_PRODUCT_YELLOW },
  legendRow: { display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "12px", color: "#374151", maxWidth: "1150px" },
  legendColor: { width: "18px", height: "14px", background: CO_PRODUCT_YELLOW, border: "1px solid #d1d5db", borderRadius: "2px", flexShrink: 0 },
  paginationRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", maxWidth: "1150px", marginTop: "14px" },
  pageButton: { minWidth: "74px", height: "30px", border: "1px solid #c7cbd1", borderRadius: "3px", background: "#ffffff", color: "#2563eb", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  pageButtonDisabled: { color: "#9ca3af", background: "#f3f4f6", cursor: "not-allowed" },
  pageNoText: { minWidth: "72px", textAlign: "center", fontSize: "12px", color: "#111827", fontWeight: 600 },
  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px", gap: "16px", maxWidth: "1150px" },
  selectionText: { fontSize: "12px", color: "#374151" },
  selectedSectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1150px", marginTop: "18px", gap: "12px" },
  selectedTitle: { fontSize: "14px", fontWeight: 700, color: "#111827" },
  selectedSubText: { fontSize: "12px", color: "#6b7280", marginTop: "2px" },
  deselectAllBtn: { height: "28px", padding: "0 12px", border: "1px solid #dc2626", borderRadius: "3px", background: "#ffffff", color: "#dc2626", fontSize: "12px", fontWeight: 700, cursor: "pointer" },
  removeSelectedBtn: { border: "none", background: "transparent", color: "#dc2626", fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: 0 },
  confirmBtn: { minWidth: "214px", height: "32px", border: "none", borderRadius: "3px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1px", cursor: "pointer" },
  confirmBtnDisabled: { background: "#e5e5e5", color: "#a8a8a8", cursor: "not-allowed" },
  confirmBtnEnabled: { background: "#2563eb", color: "#ffffff" },
};
