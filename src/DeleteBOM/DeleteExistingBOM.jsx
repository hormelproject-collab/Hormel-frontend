import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ProgressIndicator from "../components/CommonProgressIndicator";
import {
  fetchDeleteBomSearchRows,
  setExistingBomSearchState,
  toggleExistingBomSelectedRow,
  toggleExistingBomSelectedPageRows,
  clearExistingBomSelectedRows,
  selectExistingBomSearchRows,
  selectExistingBomSearchLoading,
  selectExistingBomSearchError,
  selectExistingBomSearchPagination,
  selectExistingBomSearchState,
  selectExistingBomSelectedRowIds,
  selectExistingBomSelectedRows,
} from "../redux/bomSlice";

const PAGE_SIZE = 50;
const CO_PRODUCT_YELLOW = "#fef08a";

const CRITERIA_OPTIONS = [
  { value: "", label: "None" },
  { value: "location", label: "Location" },
  { value: "bomId", label: "BOMID" },
  { value: "producedItem", label: "Produced Item" },
  { value: "producedItemDescription", label: "Produced Item Description" },
  { value: "releaseFlag", label: "Item Release Flag" },
];

const toText = (value) => String(value ?? "").trim();
const getRowBomId = (row) => toText(row?.bom_id ?? row?.bomId);
const getRowResource = (row) => toText(row?.resource);
const getRowLocation = (row) => toText(row?.location ?? row?.location_id);
const getRowProducedItem = (row) => toText(row?.produced_item ?? row?.producedItem ?? row?.item);
const getRowProducedDesc = (row) =>
  toText(
    row?.produced_item_desc ??
    row?.producedItemDescription ??
    row?.item_description ??
    row?.item_desc
  );
const getRowReleaseFlag = (row) =>
  toText(
    row?.item_release_flag ??
    row?.item_releaseflag ??
    row?.release_flag ??
    row?.release
  );
const isCoProductRow = (row) =>
  toText(row?.erp_co_product_association ?? row?.erpCoProductAssociation) === "1";

const getStableRowId = (row) =>
  [
    getRowBomId(row) || "NOBOM",
    getRowLocation(row) || "NOLOCATION",
    getRowProducedItem(row) || "NOITEM",
    isCoProductRow(row) ? "COPRODUCT" : "MAIN",
  ].join("__");
const getConnectedGroupKey = (row) =>
  [getRowBomId(row), getRowLocation(row)]
    .map((value) => toText(value).toUpperCase())
    .join("__");
const normalizeRowForSelection = (row) => ({
  ...row,
  id: getStableRowId(row),
});

const getShowingText = ({ page, pageSize, shownCount, total }) => {
  const safeTotal = Number(total || 0);
  if (!safeTotal) return "Showing 0 of 0 item(s)";

  const start = (Number(page || 1) - 1) * Number(pageSize || PAGE_SIZE) + 1;
  const end = Math.min(start + Number(shownCount || 0) - 1, safeTotal);

  return `Showing ${start}-${end} of ${safeTotal.toLocaleString()} item(s)`;
};

const sortBomRows = (a, b) => {
  const bomCompare = getRowBomId(a).localeCompare(getRowBomId(b));
  if (bomCompare !== 0) return bomCompare;

  const aIsCoProduct = isCoProductRow(a);
  const bIsCoProduct = isCoProductRow(b);

  // Main item first, co-products after
  if (aIsCoProduct !== bIsCoProduct) {
    return aIsCoProduct ? 1 : -1;
  }

  const locationCompare = getRowLocation(a).localeCompare(getRowLocation(b));
  if (locationCompare !== 0) return locationCompare;

  return getRowProducedItem(a).localeCompare(getRowProducedItem(b));
};

export default function DeleteExistingBomStep1() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const rows = useSelector(selectExistingBomSearchRows);
  const loading = useSelector(selectExistingBomSearchLoading);
  const error = useSelector(selectExistingBomSearchError);
  const pagination = useSelector(selectExistingBomSearchPagination);
  const searchState = useSelector(selectExistingBomSearchState);
  const selectedIds = useSelector(selectExistingBomSelectedRowIds);
  const selectedRows = useSelector(selectExistingBomSelectedRows);

  const criteria1Field = searchState?.searchBy1 ?? "bomId";
  const criteria1Value = searchState?.query1 ?? "";
  const criteria2Field = searchState?.searchBy2 ?? "location";
  const criteria2Value = searchState?.query2 ?? "";

  const page = Math.max(1, Number(pagination?.page || 1));
  const pageSize = Math.max(1, Number(pagination?.pageSize || PAGE_SIZE));
  const total = Math.max(0, Number(pagination?.total || 0));
  const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
  const hasPrev = Boolean(pagination?.hasPrev ?? page > 1);
  const hasNext = Boolean(pagination?.hasNext ?? page < totalPages);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchDeleteBomSearchRows({
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
    return [...rows].map(normalizeRowForSelection).sort(sortBomRows);
  }, [rows]);

  const selectedSummaryRows = useMemo(() => {
    return [...selectedRows].map(normalizeRowForSelection).sort(sortBomRows);
  }, [selectedRows]);

  const selectedCount = selectedIds.length;
  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));
  const showingText = getShowingText({ page, pageSize, shownCount: pageRows.length, total });

  const updateSearchState = (payload) => {
    dispatch(
      setExistingBomSearchState({
        ...payload,
        pagination: { page: 1, pageSize: PAGE_SIZE },
      })
    );
  };

  const handlePrevPage = () => {
    if (!hasPrev || loading) return;
    dispatch(
      setExistingBomSearchState({
        pagination: { page: Math.max(1, page - 1), pageSize: PAGE_SIZE },
      })
    );
  };

  const handleNextPage = () => {
    if (!hasNext || loading) return;
    dispatch(
      setExistingBomSearchState({
        pagination: { page: page + 1, pageSize: PAGE_SIZE },
      })
    );
  };

  const getBomConnectedRows = (row) => {
    const stableRow = normalizeRowForSelection(row);
    const groupKey = getConnectedGroupKey(stableRow);

    if (!groupKey) return [stableRow];

    const connectedRows = pageRows.filter(
      (candidate) => getConnectedGroupKey(candidate) === groupKey
    );

    const byId = new Map();

    [stableRow, ...connectedRows].forEach((candidate) => {
      const stableCandidate = normalizeRowForSelection(candidate);
      byId.set(stableCandidate.id, stableCandidate);
    });

    return Array.from(byId.values());
  };

  const toggleRowsKeepingRedux = (rowsToToggle) => {
    const stableRows = rowsToToggle.map(normalizeRowForSelection);
    const selectedIdSet = new Set(selectedIds);

    const allRowsAlreadySelected = stableRows.every((row) =>
      selectedIdSet.has(row.id)
    );

    stableRows.forEach((row) => {
      const isSelected = selectedIdSet.has(row.id);

      if (allRowsAlreadySelected) {
        if (isSelected) dispatch(toggleExistingBomSelectedRow(row));
        return;
      }

      if (!isSelected) dispatch(toggleExistingBomSelectedRow(row));
    });
  };

  const handleRowSelection = (row) => {
    const stableRow = normalizeRowForSelection(row);
    toggleRowsKeepingRedux(getBomConnectedRows(stableRow));
  };

  const handleDeselectAll = () => {
    dispatch(clearExistingBomSelectedRows());
  };

  const handleSelectVisiblePageRows = () => {
    dispatch(toggleExistingBomSelectedPageRows(pageRows));
  };

  const handleConfirm = () => {
    navigate("/delete-bom-dashboard/delete-existing-bom/summary", {
      state: {
        selectedRows: selectedSummaryRows,
        from: "/delete-bom-dashboard/delete-existing-bom",
      },
    });
  };
  const renderSearchRow = ({ label, value, query, searchByKey, queryKey }) => (
    <div style={styles.criteriaRow}>
      <div style={styles.fieldGroup}>
        <div style={styles.fieldLabel}>{label}</div>
        <div style={styles.selectWrap}>
          <select
            value={value}
            onChange={(e) => updateSearchState({ [searchByKey]: e.target.value })}
            style={styles.select}
          >
            {CRITERIA_OPTIONS.map((option) => (
              <option key={`${option.value || "none"}-${searchByKey}`} value={option.value}>
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
          value={query}
          onChange={(e) => updateSearchState({ [queryKey]: e.target.value })}
          placeholder={
            value
              ? `Search ${CRITERIA_OPTIONS.find((x) => x.value === value)?.label || ""}`
              : "Search"
          }
          style={styles.input}
        />
      </div>
    </div>
  );

  const renderResultRow = (row) => {
    const stableRow = normalizeRowForSelection(row);
    const isSelected = selectedIds.includes(stableRow.id);
    const releaseText = getRowReleaseFlag(stableRow) || "-";
    const showRedRelease = /release\s*3/i.test(releaseText) || /⚠|△/.test(releaseText);
    const coProductCellStyle = isCoProductRow(stableRow) ? styles.coProductRow : {};

    return (
      <tr key={stableRow.id} style={coProductCellStyle}>
        <td style={{ ...styles.td, ...styles.checkboxCell, ...coProductCellStyle }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleRowSelection(stableRow)}
            style={styles.checkbox}
            aria-label={`Select BOM ${getRowBomId(stableRow) || stableRow.id}`}
          />
        </td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowLocation(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowProducedItem(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowProducedDesc(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>
          <span style={showRedRelease ? styles.releaseRed : undefined}>
            {releaseText}
            {showRedRelease && !/⚠|△/.test(releaseText) ? " △" : ""}
          </span>
        </td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowBomId(stableRow) || "-"}</td>
      </tr>
    );
  };

  const renderSelectedRow = (row) => {
    const stableRow = normalizeRowForSelection(row);
    const coProductCellStyle = isCoProductRow(stableRow) ? styles.coProductRow : {};

    return (
      <tr key={`selected-${stableRow.id}`} style={coProductCellStyle}>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowLocation(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowProducedItem(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowProducedDesc(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowResource(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowReleaseFlag(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>{getRowBomId(stableRow) || "-"}</td>
        <td style={{ ...styles.td, ...coProductCellStyle }}>
          <button type="button" onClick={() => handleRowSelection(stableRow)} style={styles.removeSelectedBtn}>
            Remove
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.topRule} />
      <div style={styles.shell}>
        <button type="button" onClick={() => navigate("/delete-bom-dashboard")} style={styles.backBtn}>
          <span style={{ fontSize: "16px", lineHeight: 1 }}>←</span>
          <span>BACK</span>
        </button>

        <h1 style={styles.title}>Step 1: Select Existing BOM</h1>

        <div style={styles.filterStack}>
          {renderSearchRow({
            label: "Search By (Criteria 1)",
            value: criteria1Field,
            query: criteria1Value,
            searchByKey: "searchBy1",
            queryKey: "query1",
          })}
          {renderSearchRow({
            label: "Search By (Criteria 2)",
            value: criteria2Field,
            query: criteria2Value,
            searchByKey: "searchBy2",
            queryKey: "query2",
          })}
        </div>

        {error ? <div style={{ ...styles.stateBox, ...styles.error }}>{error}</div> : null}
        <div style={styles.showingText}>{showingText}</div>

        <div style={styles.tableCard}>
          <div style={styles.tableScroller}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={{ ...styles.th, ...styles.checkboxCell }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleSelectVisiblePageRows}
                      disabled={loading || pageRows.length === 0}
                      style={styles.checkbox}
                      aria-label="Select all rows on current page"
                    />
                  </th>
                  <th style={{ ...styles.th, width: "100px" }}>Location</th>
                  <th style={{ ...styles.th, width: "134px" }}>Produced Item</th>
                  <th style={{ ...styles.th, width: "230px" }}>Produced Item Description</th>
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

                {!loading && pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.emptyRow}>No existing BOM records found.</td>
                  </tr>
                ) : null}

                {!loading && pageRows.map(renderResultRow)}
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
                <div style={styles.selectedTitle}>Selected BOM Records</div>
                <div style={styles.selectedSubText}>
                  Main produced item and all attached co-products with the same BOM ID
                  are selected together for full BOM deletion. Co-products are highlighted in yellow.
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
                      <th style={{ ...styles.th, width: "95px" }}>Location</th>
                      <th style={{ ...styles.th, width: "130px" }}>Produced Item</th>
                      <th style={{ ...styles.th, width: "210px" }}>Produced Item Description</th>
                      <th style={{ ...styles.th, width: "170px" }}>Resource</th>
                      <th style={{ ...styles.th, width: "140px" }}>Item Release Flag</th>
                      <th style={{ ...styles.th, width: "170px" }}>BOM ID</th>
                      <th style={{ ...styles.th, width: "80px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>{selectedSummaryRows.map(renderSelectedRow)}</tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <div style={styles.footerRow}>
          <div style={styles.selectionText}>{selectedCount} record(s) selected for full BOM deletion</div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            style={{
              ...styles.confirmBtn,
              ...(selectedCount === 0 ? styles.confirmBtnDisabled : styles.confirmBtnEnabled),
            }}
          >
            <span>CONFIRM AND SUBMIT DELETION</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#111827",
  },
  topRule: { height: "8px", background: "#e5e7eb", width: "100%" },
  shell: { maxWidth: "980px", margin: "0 auto", padding: "24px 18px 40px" },
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
  title: { margin: "0 0 18px", fontSize: "20px", lineHeight: 1.2, fontWeight: 700, color: "#111827" },
  filterStack: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" },
  criteriaRow: { display: "grid", gridTemplateColumns: "474px 474px", gap: "12px", alignItems: "end" },
  fieldGroup: { position: "relative" },
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
  selectWrap: { position: "relative" },
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
  showingText: { marginBottom: "12px", color: "#374151", fontSize: "13px", fontWeight: 500 },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  selectedTableCard: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
    overflow: "hidden",
    marginTop: "8px",
  },
  tableScroller: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  tableHeadRow: { background: "#f3f4f6" },
  selectedTableHeadRow: { background: "#e8f0fe" },
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
  checkboxCell: { width: "34px", textAlign: "center", padding: "0 0 0 12px" },
  checkbox: { width: "15px", height: "15px", cursor: "pointer" },
  releaseRed: { color: "#ff1f1f", fontWeight: 500 },
  coProductRow: { backgroundColor: CO_PRODUCT_YELLOW },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
    gap: "16px",
  },
  selectionText: { fontSize: "12px", color: "#374151" },
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
  confirmBtnDisabled: { background: "#e5e5e5", color: "#a8a8a8", cursor: "not-allowed" },
  confirmBtnEnabled: { background: "#2563eb", color: "#ffffff" },
  stateBox: { marginBottom: "14px", padding: "10px 12px", borderRadius: "3px", fontSize: "12px" },
  error: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  emptyRow: { textAlign: "center", color: "#6b7280", padding: "22px 12px", fontSize: "12px" },
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
  paginationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
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
  pageButtonDisabled: { color: "#9ca3af", background: "#f3f4f6", cursor: "not-allowed" },
  pageNoText: { minWidth: "72px", textAlign: "center", fontSize: "12px", color: "#111827", fontWeight: 600 },
  selectedSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "18px",
    gap: "12px",
  },
  selectedTitle: { fontSize: "14px", fontWeight: 700, color: "#111827" },
  selectedSubText: { fontSize: "12px", color: "#6b7280", marginTop: "2px" },
  deselectAllBtn: {
    height: "28px",
    padding: "0 12px",
    border: "1px solid #dc2626",
    borderRadius: "3px",
    background: "#ffffff",
    color: "#dc2626",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  removeSelectedBtn: {
    border: "none",
    background: "transparent",
    color: "#dc2626",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
};
