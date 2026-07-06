import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchItemMaster,
  toggleProducedItem,
  selectAllItemMaster,
  selectSelectedProducedItemIds,
  selectHasInactiveSelected,
  selectItemsLoading,
  selectItemsError,
  selectItemsPagination,
} from "../../redux/bomSlice";

const ITEMS_PER_PAGE = 50;

const FILTER_OPTIONS = [
  { value: "item", label: "Item" },
  { value: "item_description", label: "Item Description" },
  { value: "status", label: "Status" },
  { value: "releaseflag", label: "Release Flag" },
];

const useWindowWidth = () => {
  const [w, setW] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return w;
};

const getNormalizedStatus = (status) =>
  String(status ?? "").trim().toUpperCase();

const getNormalizedReleaseFlag = (flag) =>
  String(flag ?? "").trim().toUpperCase().replace(/\s+/g, "");

const ProducedItems = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const width = useWindowWidth();

  const [filterBy, setFilterBy] = useState("item");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  const items = useSelector(selectAllItemMaster);
  const selectedIds = useSelector(selectSelectedProducedItemIds);
  const hasInactiveSelected = useSelector(selectHasInactiveSelected);
  const loading = useSelector(selectItemsLoading);
  const error = useSelector(selectItemsError);
  const pagination = useSelector(selectItemsPagination);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search, filterBy]);

  useEffect(() => {
    dispatch(
      fetchItemMaster({
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        search: debouncedSearch,
        filterBy,
      })
    );
  }, [dispatch, currentPage, debouncedSearch, filterBy]);

  const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
  const totalItems = Number(pagination?.total || 0);
  const pageStart = totalItems ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const searchPlaceholder = useMemo(() => {
    const selected = FILTER_OPTIONS.find((option) => option.value === filterBy);
    return `Search by ${selected?.label || "Item"}`;
  }, [filterBy]);

  const goPrev = () => {
    if (currentPage <= 1 || loading) return;
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goNext = () => {
    if (currentPage >= totalPages || loading) return;
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const onToggle = (row) => {
    const isInactive = getNormalizedStatus(row.status) === "INACTIVE";

    if (isInactive) {
      setShowInactiveWarning(true);
      return;
    }

    setShowInactiveWarning(false);
    dispatch(toggleProducedItem(row));
  };

  const gridCols =
    width < 700 ? "44px 1.2fr 1fr 1fr" : "44px 1.2fr 2fr 1fr 1.2fr";

  const isNextDisabled = selectedIds.length === 0 || hasInactiveSelected;
  const visibleItems = useMemo(() => items || [], [items]);

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 1: Produced Item(s)</h1>
        <div style={styles.subTitle}>Select one or more items to produce</div>

        <div style={styles.searchRow}>
          <select
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />
        </div>

        {loading && <div style={styles.info}>Loading items...</div>}
        {error && <div style={styles.error}>Error: {String(error)}</div>}

        {!error && (
          <div style={styles.recordsInfo}>
            Showing {pageStart}-{pageEnd} of {totalItems} item(s)
          </div>
        )}

        <div style={styles.table}>
          <div style={{ ...styles.headerRow, gridTemplateColumns: gridCols }}>
            <div />
            <div>Item</div>
            {width >= 700 && <div>Item Description</div>}
            <div>Item Status</div>
            <div>Item Release Flag</div>
          </div>

          {visibleItems.length === 0 && !loading ? (
            <div style={styles.emptyRow}>No items found.</div>
          ) : (
            visibleItems.map((row) => {
              const isInactive = getNormalizedStatus(row.status) === "INACTIVE";
              const checked = selectedIds.includes(row.id);
              const normalizedReleaseFlag = getNormalizedReleaseFlag(
                row.itemReleaseFlag
              );
              const isRelease3 = normalizedReleaseFlag === "RELEASE3";

              return (
                <div
                  key={row.id}
                  style={{ ...styles.dataRow, gridTemplateColumns: gridCols }}
                >
                  <div style={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isInactive}
                      onChange={() => onToggle(row)}
                      style={{ cursor: isInactive ? "not-allowed" : "pointer" }}
                    />
                  </div>

                  <div style={styles.itemCell}>
                    <div>{row.item || "-"}</div>
                    {width < 700 && (
                      <div style={styles.mobileDesc}>{row.desc || "-"}</div>
                    )}
                  </div>

                  {width >= 700 && <div>{row.desc || "-"}</div>}

                  <div>{isInactive ? "Inactive" : "Active"}</div>

                  <div style={styles.releaseFlagCell}>
                    <span>{row.itemReleaseFlag || "-"}</span>
                    {isRelease3 && <span style={styles.warningIcon}>⚠</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.paginationBar}>
          <button
            type="button"
            onClick={goPrev}
            disabled={currentPage === 1 || loading}
            style={{
              ...styles.pageButton,
              ...(currentPage === 1 || loading
                ? styles.pageButtonDisabled
                : styles.pageButtonEnabled),
            }}
          >
            ← Prev
          </button>

          <span style={styles.pageText}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={goNext}
            disabled={currentPage === totalPages || loading}
            style={{
              ...styles.pageButton,
              ...(currentPage === totalPages || loading
                ? styles.pageButtonDisabled
                : styles.pageButtonEnabled),
            }}
          >
            Next →
          </button>
        </div>

        {(showInactiveWarning || hasInactiveSelected) && (
          <div style={styles.warningBox}>
            Warning: Inactive items cannot be selected. Please select only active
            items.
          </div>
        )}

        <div style={styles.bottomBar}>
          <div style={styles.selectedCount}>{selectedIds.length} item(s) selected</div>

          <button
            type="button"
            disabled={isNextDisabled}
            onClick={() => navigate("/select-location")}
            style={{
              ...styles.nextBtn,
              ...(isNextDisabled ? styles.nextBtnDisabled : styles.nextBtnEnabled),
            }}
          >
            NEXT: SELECT LOCATIONS →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProducedItems;

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f6f8",
    padding: "24px",
    boxSizing: "border-box",
  },
  inner: {
    maxWidth: "980px",
    margin: "0 auto",
  },
  back: {
    color: "#2563eb",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "8px",
    userSelect: "none",
    width: "fit-content",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "38px",
    fontWeight: 600,
    color: "#111827",
  },
  subTitle: {
    color: "#4b5563",
    fontSize: "15px",
    marginBottom: "24px",
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "210px 1fr",
    gap: "10px",
    marginBottom: "12px",
  },
  filterSelect: {
    width: "100%",
    padding: "0 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    height: "44px",
  },
  search: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
  },
  recordsInfo: {
    marginBottom: "12px",
    color: "#374151",
    fontSize: "13px",
  },
  info: {
    marginBottom: "12px",
    color: "#374151",
    fontSize: "14px",
  },
  error: {
    marginBottom: "12px",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 600,
  },
  table: {
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  headerRow: {
    display: "grid",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderBottom: "1px solid #d1d5db",
    minHeight: "44px",
    padding: "0 10px",
    columnGap: "14px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
  },
  dataRow: {
    display: "grid",
    alignItems: "center",
    minHeight: "48px",
    padding: "0 10px",
    columnGap: "14px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
    color: "#111827",
  },
  emptyRow: {
    padding: "18px 14px",
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center",
  },
  checkboxCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  itemCell: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  mobileDesc: {
    fontSize: "12px",
    color: "#6b7280",
  },
  releaseFlagCell: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  warningIcon: {
    color: "#ff0000",
    fontSize: "14px",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
  },
  paginationBar: {
    marginTop: "18px",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  pageButton: {
    padding: "8px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: 500,
  },
  pageButtonEnabled: {
    backgroundColor: "#ffffff",
    color: "#111827",
    cursor: "pointer",
  },
  pageButtonDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  pageText: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
  },
  warningBox: {
    marginTop: "16px",
    padding: "12px 14px",
    borderRadius: "4px",
    border: "1px solid #f5c2c7",
    backgroundColor: "#fdecef",
    color: "#b42318",
    fontSize: "14px",
  },
  bottomBar: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  selectedCount: {
    fontSize: "14px",
    color: "#374151",
  },
  nextBtn: {
    padding: "10px 18px",
    borderRadius: "4px",
    border: "none",
    fontSize: "13px",
    fontWeight: 500,
    letterSpacing: "0.2px",
  },
  nextBtnEnabled: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  },
  nextBtnDisabled: {
    backgroundColor: "#e5e7eb",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
};
