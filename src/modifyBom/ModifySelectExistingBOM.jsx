import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setModifySelectState, selectModifySelectState } from "../redux/bomSlice";
import { useNavigate } from "react-router-dom";

import { TableLoadingOverlay, ShowingRecordsInfo } from "../components/CommonProgressIndicator";
const PAGE_SIZE = 50;

const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

const SEARCH_FIELDS = [
  { label: "Location", value: "location" },
  { label: "Produced Item", value: "produced_item" },
  { label: "Produced Item Description", value: "produced_item_desc" },
  { label: "BOM ID", value: "bom_id" },
  { label: "Item Release Flag", value: "item_release_flag" },
];

const normalizeApiArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
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
});

const ModifySelectExistingBOM = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const modifySelectState = useSelector(selectModifySelectState) || {};
  const {
    searchBy1 = "",
    searchBy2 = "",
    query1 = "",
    query2 = "",
    rows = [],
    pagination = DEFAULT_PAGINATION,
  } = modifySelectState;

  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  const safePagination = {
    ...DEFAULT_PAGINATION,
    ...(pagination || {}),
  };

  const fetchBomData = useCallback(
    async ({ page = 1 } = {}) => {
      try {
        setTableLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("searchBy1", String(searchBy1 || ""));
        params.set("query1", String(query1 || "").trim());
        params.set("searchBy2", String(searchBy2 || ""));
        params.set("query2", String(query2 || "").trim());

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
    fetchBomData({ page: safePagination.page || 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCriteriaChange = (payload) => {
    dispatch(
      setModifySelectState({
        ...payload,
        pagination: {
          ...safePagination,
          page: 1,
        },
      })
    );
  };

  const handleSearch = () => {
    fetchBomData({ page: 1 });
  };

  const handleClear = () => {
    dispatch(
      setModifySelectState({
        searchBy1: "",
        searchBy2: "",
        query1: "",
        query2: "",
        rows: [],
        pagination: DEFAULT_PAGINATION,
      })
    );
    setTimeout(() => fetchBomData({ page: 1 }), 0);
  };

  const goToPage = (page) => {
    const targetPage = Math.min(Math.max(1, page), safePagination.totalPages || 1);
    if (targetPage === safePagination.page || tableLoading) return;
    fetchBomData({ page: targetPage });
  };

  const showingText = useMemo(() => {
    const shownCount = rows.length;
    const total = Number(safePagination.total || 0);
    const page = Number(safePagination.page || 1);
    const pageSize = Number(safePagination.pageSize || 50);

    if (total === 0) {
      return "Showing 0 of 0 item(s)";
    }

    const startRecord = (page - 1) * pageSize + 1;
    const endRecord = Math.min(startRecord + shownCount - 1, total);

    return `Showing ${startRecord}-${endRecord} of ${total} item(s)`;
  }, [rows.length, safePagination.total, safePagination.page, safePagination.pageSize]);

  const getReleaseStyle = (flag) => {
    const text = String(flag || "");
    const isWarn = text.includes("3");
    return {
      color: isWarn ? "red" : "black",
      fontWeight: isWarn ? 600 : 400,
    };
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 1: Select Existing BOM</h1>
        <p style={styles.subtitle}>Find and select a BOM to modify</p>

        <div style={styles.searchContainer}>
          <div style={styles.searchRow}>
            <div style={styles.field}>
              <label style={styles.label}>Search By (Criteria 1)</label>
              <select
                value={searchBy1}
                onChange={(e) => handleCriteriaChange({ searchBy1: e.target.value })}
                style={styles.select}
              >
                <option value="">Select</option>
                {SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Search Value</label>
              <input
                value={query1}
                onChange={(e) => handleCriteriaChange({ query1: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder={searchBy1 ? `Search ${searchBy1}` : ""}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.searchRow}>
            <div style={styles.field}>
              <label style={styles.label}>Search By (Criteria 2)</label>
              <select
                value={searchBy2}
                onChange={(e) => handleCriteriaChange({ searchBy2: e.target.value })}
                style={styles.select}
              >
                <option value="">Select</option>
                {SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Search Value</label>
              <input
                value={query2}
                onChange={(e) => handleCriteriaChange({ query2: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder={searchBy2 ? `Search ${searchBy2}` : ""}
                style={styles.input}
              />
            </div>
          </div>

        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        <div style={styles.tableTopBar}>
          <div style={styles.showingText}>{showingText}</div>
          <div style={styles.pageText}>
            Page {safePagination.page || 1} of {safePagination.totalPages || 1}
          </div>
        </div>

        <div style={styles.tableWrap}>
          <TableLoadingOverlay loading={tableLoading} label="Loading BOM records..." headerOffset={43} />

          <div style={{ ...styles.table, position: "relative" }}>
            <div style={styles.header}>
              <div style={styles.headerCell}>Location</div>
              <div style={styles.headerCell}>Produced Item</div>
              <div style={styles.headerCell}>Produced Item Description</div>
              <div style={styles.headerCell}>BOM ID</div>
              <div style={styles.headerCell}>Item Release Flag</div>
            </div>

            {!tableLoading && rows.length === 0 ? (
              <div style={styles.noRows}>No records found.</div>
            ) : null}

            {rows.map((r) => (
              <div
                key={r.id}
                style={styles.row}
                onClick={() =>
                  navigate(`/modify-existing-bom-data/${encodeURIComponent(r.id)}`, {
                    state: { record: r },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(`/modify-existing-bom-data/${encodeURIComponent(r.id)}`, {
                      state: { record: r },
                    });
                  }
                }}
                tabIndex={0}
              >
                <div style={styles.cell}>{r.location}</div>
                <div style={styles.cell}>{r.produced_item}</div>
                <div style={styles.cell}>{r.produced_item_desc}</div>
                <div style={styles.cell}>{r.bom_id}</div>
                <div style={{ ...styles.cell, ...getReleaseStyle(r.item_release_flag) }}>
                  {r.item_release_flag}
                  {String(r.item_release_flag || "").includes("3") && " ⚠️"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.paginationBar}>
          <button
            type="button"
            style={{
              ...styles.pageButton,
              opacity: safePagination.hasPrev && !tableLoading ? 1 : 0.5,
            }}
            disabled={!safePagination.hasPrev || tableLoading}
            onClick={() => goToPage((safePagination.page || 1) - 1)}
          >
            ← Prev
          </button>

          <span style={styles.currentPage}>{safePagination.page || 1}</span>

          <button
            type="button"
            style={{
              ...styles.pageButton,
              opacity: safePagination.hasNext && !tableLoading ? 1 : 0.5,
            }}
            disabled={!safePagination.hasNext || tableLoading}
            onClick={() => goToPage((safePagination.page || 1) + 1)}
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
  page: {
    background: "#f3f4f6",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
  },
  wrapper: {
    maxWidth: "1200px",
    width: "100%",
    padding: "20px",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: 700,
    margin: "0 0 6px",
  },
  subtitle: {
    color: "#666",
    marginBottom: 20,
  },
  errorBox: {
    padding: "16px",
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: "6px",
    color: "#991b1b",
    fontSize: "14px",
    marginBottom: "14px",
  },
  searchContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "18px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "16px",
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "13px",
    marginBottom: "6px",
    color: "#6b7280",
  },
  select: {
    width: "100%",
    height: "44px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    padding: "0 10px",
    fontSize: "14px",
    background: "#fff",
  },
  input: {
    width: "100%",
    height: "44px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    padding: "0 10px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  searchActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  searchButton: {
    height: "38px",
    padding: "0 18px",
    border: "none",
    borderRadius: "4px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  clearButton: {
    height: "38px",
    padding: "0 18px",
    border: "1px solid #c7c7c7",
    borderRadius: "4px",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
  },
  tableTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    color: "#374151",
    fontSize: "14px",
  },
  showingText: {
    fontWeight: 600,
  },
  pageText: {
    color: "#6b7280",
  },
  tableWrap: {
    position: "relative",
  },
  tableLoadingOverlay: {
    position: "absolute",
    zIndex: 5,
    inset: 0,
    minHeight: "120px",
    background: "rgba(255,255,255,0.72)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#374151",
    fontWeight: 600,
  },
  table: {
    border: "1px solid #ddd",
    borderRadius: 6,
    overflowX: "auto",
    overflowY: "hidden",
    background: "#fff",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "110px 150px minmax(260px, 1.6fr) minmax(230px, 1.4fr) 150px",
    columnGap: "14px",
    alignItems: "stretch",
    minWidth: "900px",
    background: "#e5e7eb",
    padding: "0 14px",
    borderBottom: "1px solid #d1d5db",
  },
  headerCell: {
    padding: "12px 0",
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
    minWidth: 0,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "110px 150px minmax(260px, 1.6fr) minmax(230px, 1.4fr) 150px",
    columnGap: "14px",
    alignItems: "stretch",
    minWidth: "900px",
    padding: "0 14px",
    borderTop: "1px solid #eee",
    cursor: "pointer",
    background: "#fff",
  },
  cell: {
    padding: "12px 0",
    fontSize: "13px",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    lineHeight: 1.35,
  },
  noRows: {
    padding: "22px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
  },
  paginationBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
    marginTop: "16px",
  },
  pageButton: {
    height: "36px",
    padding: "0 14px",
    border: "1px solid #2563eb",
    borderRadius: "4px",
    background: "#fff",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: 600,
  },
  currentPage: {
    minWidth: "34px",
    height: "34px",
    borderRadius: "4px",
    background: "#2563eb",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
};
