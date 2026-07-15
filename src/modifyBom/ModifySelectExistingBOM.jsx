import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setModifySelectState,
  selectModifySelectState,
  clearModifyExistingBomState,
} from "../redux/bomSlice";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "../components/CommonProgressIndicator";

const PAGE_SIZE = 50;
const TABLE_GRID_COLUMNS =
  "110px 180px minmax(330px, 2.2fr) minmax(240px, 1.3fr) 180px";

const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

const SEARCH_FIELDS = [
  { label: "None", value: "" },
  { label: "Location", value: "location" },
  { label: "Produced Item", value: "produced_item" },
  { label: "Produced Item Desc", value: "produced_item_desc" },
  { label: "BOMID", value: "bom_id" },
  { label: "Item Release Flag", value: "item_release_flag" },
];

const normalizeApiArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

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

const buildRoutingId = (producedItem, resource) => {
  const item = String(producedItem || "").trim();
  const res = String(resource || "").trim();
  if (!item || !res) return "";
  return `ROUTING_${item}_${res}`;
};

const mapExistingBomRow = (row, index) => ({
  id: row.id || `${row.bom_id || "BOM"}__${row.routing_id || row.resource || index}`,
  location: row.location || "-",
  produced_item: row.produced_item || "-",
  produced_item_desc: row.produced_item_desc || "-",
  bom_id: row.bom_id || "-",
  resource: row.resource || "-",
  routing_id: row.routing_id || buildRoutingId(row.produced_item, row.resource),
  item_release_flag: row.item_release_flag || "-",
  __raw: row.__raw ?? row,
});

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
      resource !== "-" &&
      !groupedRow.resourceList.some(
        (existing) => String(existing).trim().toUpperCase() === resource.toUpperCase()
      )
    ) {
      groupedRow.resourceList.push(resource);
    }

    const routingId = String(row?.routing_id ?? "").trim();
    if (
      routingId &&
      routingId !== "-" &&
      !groupedRow.routingIdList.some(
        (existing) => String(existing).trim().toUpperCase() === routingId.toUpperCase()
      )
    ) {
      groupedRow.routingIdList.push(routingId);
    }

    groupedRow.__groupedRows.push(row);
    groupedRow.resource = groupedRow.resourceList.join(", ") || "-";
    groupedRow.routing_id = groupedRow.routingIdList.join(", ") || "-";
    groupedRow.__raw = groupedRow.__groupedRows.map((x) => x.__raw ?? x);
  }

  return Array.from(groupedMap.values());
};

const ModifySelectExistingBOM = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const modifySelectState = useSelector(selectModifySelectState) || {};

  const {
    searchBy1 = "resource",
    searchBy2 = "location",
    query1 = "",
    query2 = "",
    rows = [],
    pagination = DEFAULT_PAGINATION,
    selectedRowId = "",
  } = modifySelectState;

  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);

  const safePagination = {
    ...DEFAULT_PAGINATION,
    ...(pagination || {}),
  };

  const page = Math.max(1, Number(safePagination.page) || 1);
  const pageSize = Math.max(1, Number(safePagination.pageSize) || PAGE_SIZE);
  const total = Math.max(0, Number(safePagination.total) || 0);
  const totalPages = Math.max(1, Number(safePagination.totalPages) || 1);
  const hasPrev = Boolean(safePagination.hasPrev ?? page > 1);
  const hasNext = Boolean(safePagination.hasNext ?? page < totalPages);
  const shownCount = Array.isArray(rows) ? rows.length : 0;
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = total === 0 ? 0 : Math.min((page - 1) * pageSize + shownCount, total);

  const uniqueRows = useMemo(() => {
    return mergeRowsByLocationItemBom(rows);
  }, [rows]);

  const fetchBomData = useCallback(
    async ({ page: requestedPage = 1 } = {}) => {
      try {
        setTableLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", String(requestedPage));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("searchBy1", String(searchBy1 || ""));
        params.set("query1", searchBy1 ? String(query1 || "").trim() : "");
        params.set("searchBy2", String(searchBy2 || ""));
        params.set("query2", searchBy2 ? String(query2 || "").trim() : "");

        const response = await fetch(`/api/tables/existing-bom-search?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.details || payload?.error || "Failed to fetch existing BOM search data"
          );
        }

        const apiRows = normalizeApiArray(payload);
        const mappedRows = apiRows.map((row, index) => mapExistingBomRow(row, index));

        dispatch(
          setModifySelectState({
            rows: mappedRows,
            pagination: {
              ...DEFAULT_PAGINATION,
              ...(payload?.pagination || {}),
            },
          })
        );
      } catch (e) {
        console.error("Failed to load existing BOM rows:", e);
        setError(e.message || "Failed to load BOM data");
        dispatch(
          setModifySelectState({
            rows: [],
            pagination: DEFAULT_PAGINATION,
          })
        );
      } finally {
        setTableLoading(false);
      }
    },
    [dispatch, searchBy1, searchBy2, query1, query2]
  );

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchBomData({ page });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;

    const timer = setTimeout(() => {
      fetchBomData({ page });
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchBomData, page]);

  const updateSearchState = (payload) => {
    dispatch(
      setModifySelectState({
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
    if (!hasPrev || tableLoading) return;

    dispatch(
      setModifySelectState({
        pagination: {
          page: page - 1,
          pageSize: PAGE_SIZE,
        },
      })
    );
  };

  const goToNextPage = () => {
    if (!hasNext || tableLoading) return;

    dispatch(
      setModifySelectState({
        pagination: {
          page: page + 1,
          pageSize: PAGE_SIZE,
        },
      })
    );
  };

  const handleRowClick = (row) => {
    dispatch(clearModifyExistingBomState());
    dispatch(setModifySelectState({ selectedRowId: row.id }));

    navigate(`/modify-existing-bom-data/${encodeURIComponent(row.id)}`, {
      state: {
        record: row,
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
        <p style={styles.sub}>Find and select a BOM to modify</p>

        <div style={styles.searchSection}>
          <div style={styles.searchRow}>
            <div style={styles.searchColLeft}>
              <div style={styles.criteriaLabel}>Search By (Criteria 1)</div>
              <select
                value={searchBy1}
                onChange={(e) => updateSearchState({ searchBy1: e.target.value })}
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
                onChange={(e) => updateSearchState({ searchBy2: e.target.value })}
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

        {error ? <div style={styles.errorText}>Error: {error}</div> : null}

        <div style={styles.paginationInfo}>
          {uniqueRows.length === 0
            ? "Showing 0 unique BOM record(s)"
            : `Showing ${uniqueRows.length.toLocaleString()} unique BOM record(s)`}
        </div>

        <div style={styles.tableScrollWrap}>
          <div style={{ ...styles.tableCard, position: "relative" }}>
            <div style={styles.tableHeader}>
              <div>Location</div>
              <div>Produced Item</div>
              <div>Produced Item Description</div>
              <div>BOMID</div>
              <div>Item Release Flag</div>
            </div>

            {tableLoading ? (
              <div style={styles.loadingBodyRow}>
                <ProgressIndicator label="Loading BOM records..." />
              </div>
            ) : uniqueRows.length === 0 ? (
              <div style={styles.emptyState}>No BOM records found.</div>
            ) : (
              uniqueRows.map((row, index) => {
                const safeKey =
                  row.id || `${row.bom_id}-${row.location || "NOLOCATION"}-${row.produced_item || "NOITEM"}-${index}`;
                const isSelected = selectedRowId === row.id;

                return (
                  <div
                    key={safeKey}
                    style={{
                      ...styles.tableRow,
                      ...(isSelected ? styles.tableRowSelected : {}),
                    }}
                    onClick={() => handleRowClick(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRowClick(row);
                    }}
                    tabIndex={0}
                  >
                    <div style={styles.cell}>{row.location || "-"}</div>
                    <div style={styles.cell}>{row.produced_item || "-"}</div>
                    <div style={styles.cell}>{row.produced_item_desc || "-"}</div>
                    <div style={styles.cell}>{row.bom_id || "-"}</div>
                    
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
            disabled={!hasPrev || tableLoading}
            onClick={goToPrevPage}
            style={{
              ...styles.pageButton,
              ...(!hasPrev || tableLoading ? styles.pageButtonDisabled : {}),
            }}
          >
            ← Prev
          </button>
          <span style={styles.pageText}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!hasNext || tableLoading}
            onClick={goToNextPage}
            style={{
              ...styles.pageButton,
              ...(!hasNext || tableLoading ? styles.pageButtonDisabled : {}),
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifySelectExistingBOM;

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
