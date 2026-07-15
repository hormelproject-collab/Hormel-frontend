import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchExistingBomSearchRows,
  setExistingBomSearchState,
  setModifyExistingBomSearchCriteria,
  selectExistingBomSearchRows,
  selectExistingBomSearchLoading,
  selectExistingBomSearchError,
  selectExistingBomSearchPagination,
  selectExistingBomSearchState,
} from "../../redux/bomSlice";

import ProgressIndicator from "../../components/CommonProgressIndicator";

const PAGE_SIZE = 50;

const TABLE_GRID_COLUMNS =
  "90px 150px minmax(300px, 2.2fr) minmax(190px, 1.2fr) minmax(260px, 1.8fr) 140px";

const SEARCH_FIELDS = [
  { label: "None", value: "" },
  { label: "Location", value: "location" },
  { label: "Produced Item", value: "produced_item" },
  { label: "Produced Item Desc", value: "produced_item_desc" },
  { label: "BOMID", value: "bom_id" },
  { label: "Resource", value: "resource" },
  { label: "Item Release Flag", value: "item_release_flag" },
];

const getReleaseStyle = (flag) => {
  const text = String(flag ?? "").trim();
  const isWarn =
    text.includes("3") || /warning/i.test(text) || text.includes("△");

  return {
    color: isWarn ? "#dc2626" : "#111827",
    fontWeight: isWarn ? 500 : 400,
  };
};

const getSearchPlaceholder = (fieldValue) => {
  const selectedField = SEARCH_FIELDS.find((f) => f.value === fieldValue);
  if (!selectedField || !selectedField.value) return "Search...";
  return `Search ${selectedField.label}`;
};

const makeGroupKey = (row) => {
  const location = String(row?.location ?? "").trim().toUpperCase();
  const producedItem = String(row?.produced_item ?? "").trim().toUpperCase();
  const bomId = String(row?.bom_id ?? "").trim().toUpperCase();

  return `${location}__${producedItem}__${bomId}`;
};

const mergeRowsByLocationItemBom = (rows = []) => {
  const groupedMap = new Map();

  for (const row of rows || []) {
    const key = makeGroupKey(row);

    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        ...row,
        id: `GROUP__${key}`,
        resourceList: [],
        routingIdList: [],
        __groupedRows: [],
      });
    }

    const groupedRow = groupedMap.get(key);

    const resource = String(row?.resource ?? "").trim();
    if (
      resource &&
      !groupedRow.resourceList.some(
        (existing) => String(existing).trim().toUpperCase() === resource.toUpperCase()
      )
    ) {
      groupedRow.resourceList.push(resource);
    }

    const routingId = String(row?.routing_id ?? "").trim();
    if (
      routingId &&
      !groupedRow.routingIdList.some(
        (existing) => String(existing).trim().toUpperCase() === routingId.toUpperCase()
      )
    ) {
      groupedRow.routingIdList.push(routingId);
    }

    groupedRow.__groupedRows.push(row);

    groupedRow.resource = groupedRow.resourceList.join(", ");
    groupedRow.routing_id = groupedRow.routingIdList.join(", ");
    groupedRow.__raw = groupedRow.__groupedRows.map((x) => x.__raw ?? x);
  }

  return Array.from(groupedMap.values());
};

const SelectExistingBOM = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const rows = useSelector(selectExistingBomSearchRows);
  const loading = useSelector(selectExistingBomSearchLoading);
  const err = useSelector(selectExistingBomSearchError);
  const pagination = useSelector(selectExistingBomSearchPagination);
  const searchState = useSelector(selectExistingBomSearchState);

  const searchBy1 = searchState?.searchBy1 ?? "resource";
  const searchBy2 = searchState?.searchBy2 ?? "location";
  const query1 = searchState?.query1 ?? "";
  const query2 = searchState?.query2 ?? "";
  const selectedRowId = searchState?.selectedRowId ?? "";

  const reloadTokenRef = useRef(0);
  const mountedRef = useRef(false);

  const page = Math.max(1, Number(pagination?.page) || 1);
  const pageSize = Math.max(1, Number(pagination?.pageSize) || PAGE_SIZE);
  const total = Math.max(0, Number(pagination?.total) || 0);
  const totalPages = Math.max(1, Number(pagination?.totalPages) || 1);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const shownCount = Array.isArray(rows) ? rows.length : 0;
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord =
    total === 0 ? 0 : Math.min((page - 1) * pageSize + shownCount, total);

  const groupedRows = useMemo(() => {
    return mergeRowsByLocationItemBom(rows);
  }, [rows]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      reloadTokenRef.current += 1;
    }
  }, []);

  useEffect(() => {
    const requestPayload = {
      page,
      pageSize: PAGE_SIZE,
      searchBy1: searchBy1 || "",
      query1: searchBy1 ? query1 : "",
      searchBy2: searchBy2 || "",
      query2: searchBy2 ? query2 : "",
      reloadToken: reloadTokenRef.current,
    };

    const timer = setTimeout(() => {
      dispatch(fetchExistingBomSearchRows(requestPayload));
    }, 250);

    return () => clearTimeout(timer);
  }, [dispatch, page, searchBy1, query1, searchBy2, query2]);

  const updateSearchState = (payload) => {
    dispatch(
      setExistingBomSearchState({
        ...payload,
        selectedRowId: "",
        pagination: {
          page: 1,
          pageSize: PAGE_SIZE,
        },
      })
    );
  };

  const goToPrevPage = () => {
    if (!hasPrev) return;

    dispatch(
      setExistingBomSearchState({
        pagination: {
          page: page - 1,
          pageSize: PAGE_SIZE,
        },
      })
    );
  };

  const goToNextPage = () => {
    if (!hasNext) return;

    dispatch(
      setExistingBomSearchState({
        pagination: {
          page: page + 1,
          pageSize: PAGE_SIZE,
        },
      })
    );
  };

  const handleRowClick = (row) => {
    dispatch(setExistingBomSearchState({ selectedRowId: row.id }));

    navigate(`/modify-existing-bom/${encodeURIComponent(row.id)}`, {
      state: {
        selectedBom: row,
        selectedBomId: row.id,
        selectedBomRaw: row.__raw,
      },
    });
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.page}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.h1}>Step 1: Select Existing BOM</h1>
        <p style={styles.sub}>Find and select a BOM to copy</p>

        <div style={styles.searchSection}>
          <div style={styles.searchRow}>
            <div style={styles.searchColLeft}>
              <div style={styles.criteriaLabel}>Search By (Criteria 1)</div>
              <select
                value={searchBy1}
                onChange={(e) =>
                  updateSearchState({ searchBy1: e.target.value })
                }
                style={styles.dropdown}
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={`criteria1-${f.value}`} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.searchColRight}>
              <div style={styles.criteriaLabel}>Search Value</div>
              <input
                type="text"
                value={query1}
                onChange={(e) => updateSearchState({ query1: e.target.value })}
                placeholder={getSearchPlaceholder(searchBy1)}
                style={styles.searchInput}
                disabled={!searchBy1}
              />
            </div>
          </div>

          <div style={styles.searchRow}>
            <div style={styles.searchColLeft}>
              <div style={styles.criteriaLabel}>Search By (Criteria 2)</div>
              <select
                value={searchBy2}
                onChange={(e) =>
                  updateSearchState({ searchBy2: e.target.value })
                }
                style={styles.dropdown}
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={`criteria2-${f.value}`} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.searchColRight}>
              <div style={styles.criteriaLabel}>Search Value</div>
              <input
                type="text"
                value={query2}
                onChange={(e) => updateSearchState({ query2: e.target.value })}
                placeholder={getSearchPlaceholder(searchBy2)}
                style={styles.searchInput}
                disabled={!searchBy2}
              />
            </div>
          </div>
        </div>

        {err ? <div style={styles.errorText}>Error: {err}</div> : null}

        <div style={styles.paginationInfo}>
          {total === 0
            ? "Showing 0 of 0 item(s)"
            : `Showing ${startRecord}-${endRecord} of ${total.toLocaleString()} item(s)`}
        </div>

        <div style={styles.tableScrollWrap}>
          <div style={{ ...styles.tableCard, position: "relative" }}>
            <div style={styles.tableHeader}>
              <div>Location</div>
              <div>Produced Item</div>
              <div>Produced Item Description</div>
              <div>BOMID</div>
              <div>Resource</div>
              <div>Item Release Flag</div>
            </div>

            {loading ? (
              <div style={styles.loadingBodyRow}>
                <ProgressIndicator label="Loading BOM records..." />
              </div>
            ) : groupedRows.length === 0 ? (
              <div style={styles.emptyState}>No BOM records found.</div>
            ) : (
              groupedRows.map((row, index) => {
                const safeKey =
                  row.id ||
                  `${row.bom_id}-${row.resource || "NORESOURCE"}-${index}`;

                const isSelected = selectedRowId === row.id;

                return (
                  <div
                    key={safeKey}
                    style={{
                      ...styles.tableRow,
                      ...(isSelected ? styles.tableRowSelected : {}),
                    }}
                    onClick={() => handleRowClick(row)}
                  >
                    <div style={styles.cell}>{row.location || "-"}</div>
                    <div style={styles.cell}>{row.produced_item || "-"}</div>
                    <div style={styles.cell}>
                      {row.produced_item_desc || "-"}
                    </div>
                    <div style={styles.cell}>{row.bom_id || "-"}</div>
                    <div style={styles.cell}>{row.resource || "-"}</div>
                    <div
                      style={{
                        ...styles.cell,
                        ...getReleaseStyle(row.item_release_flag),
                      }}
                    >
                      {row.item_release_flag || "-"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.paginationContainer}>
          <button
            type="button"
            disabled={!hasPrev || loading}
            onClick={goToPrevPage}
            style={{
              ...styles.pageButton,
              ...(!hasPrev || loading ? styles.pageButtonDisabled : {}),
            }}
          >
            ← Prev
          </button>

          <span style={styles.pageText}>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={!hasNext || loading}
            onClick={goToNextPage}
            style={{
              ...styles.pageButton,
              ...(!hasNext || loading ? styles.pageButtonDisabled : {}),
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectExistingBOM;

const styles = {
  pageBg: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px 0 40px",
  },
  page: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 18px",
    boxSizing: "border-box",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 400,
    width: "fit-content",
  },
  h1: {
    fontSize: 22,
    lineHeight: "30px",
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 6px",
  },
  sub: {
    color: "#6b7280",
    margin: "0 0 14px",
    fontSize: 14,
  },
  searchSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 980,
    marginBottom: 18,
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 14,
    alignItems: "end",
    width: "100%",
  },
  searchColLeft: {
    width: "100%",
    minWidth: 0,
  },
  searchColRight: {
    width: "100%",
    minWidth: 0,
  },
  criteriaLabel: {
    fontSize: 11,
    color: "#2563eb",
    marginBottom: 6,
    marginLeft: 2,
    lineHeight: "14px",
    minHeight: 14,
  },
  dropdown: {
    width: "100%",
    height: 42,
    padding: "0 12px",
    borderRadius: 3,
    border: "1px solid #cfd4dc",
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  searchInput: {
    width: "100%",
    height: 42,
    padding: "0 14px",
    borderRadius: 3,
    border: "1px solid #cfd4dc",
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  },
  paginationInfo: {
    marginBottom: 12,
    fontSize: 14,
    color: "#4b5563",
  },
  tableScrollWrap: {
    width: "100%",
    overflowX: "auto",
  },
  tableCard: {
    minWidth: 1180,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: TABLE_GRID_COLUMNS,
    columnGap: 16,
    background: "#f3f4f6",
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    alignItems: "center",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: TABLE_GRID_COLUMNS,
    columnGap: 16,
    padding: "0 14px",
    minHeight: 52,
    alignItems: "center",
    borderTop: "1px solid #eeeeee",
    cursor: "pointer",
    background: "#ffffff",
  },
  tableRowSelected: {
    background: "#f9fafb",
  },
  cell: {
    padding: "11px 0",
    fontSize: 14,
    color: "#111827",
    lineHeight: 1.35,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    minWidth: 0,
  },
  loadingBodyRow: {
    padding: "28px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    minHeight: "120px",
  },
  emptyState: {
    padding: "18px 12px",
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    background: "#ffffff",
  },
  paginationContainer: {
    marginTop: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  pageButton: {
    padding: "8px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
  },
  pageButtonDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  pageText: {
    fontSize: 14,
    fontWeight: 500,
    color: "#111827",
  },
};