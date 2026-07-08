import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchLocationsByItems,
  toggleLocation,
  setLocationsSearch,
  setLocationsPagination,
  selectAllLocations,
  selectSelectedLocationIds,
  selectSelectedLocations,
  selectHasInactiveLocationsSelected,
  clearSelectedLocations,
  selectLocationsLoading,
  selectLocationsError,
  selectLocationsPagination,
  selectLocationsSearch,
  selectSelectedProducedItems,
} from "../../redux/bomSlice";

import ProgressIndicator, { ShowingRecordsInfo } from "../../components/CommonProgressIndicator";
const PAGE_SIZE = 50;

const normalizeStatus = (value) => String(value ?? "").trim().toUpperCase();

const isActiveLocation = (value) => {
  const s = normalizeStatus(value);
  return s === "A" || s === "ACTIVE" || s === "1" || s === "Y" || s === "TRUE";
};

const SelectedLocation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  const selectedProducedItems = useSelector(selectSelectedProducedItems);
  const locations = useSelector(selectAllLocations);
  const selectedIds = useSelector(selectSelectedLocationIds);
  const selectedLocations = useSelector(selectSelectedLocations);
  const hasInactiveSelected = useSelector(selectHasInactiveLocationsSelected);
  const loading = useSelector(selectLocationsLoading);
  const error = useSelector(selectLocationsError);
  const locationPagination = useSelector(selectLocationsPagination);
  const search = useSelector(selectLocationsSearch);

  const currentPage = locationPagination?.page || 1;

  useEffect(() => {
    const itemNumbers = selectedProducedItems
      .map((x) => x.item)
      .filter(Boolean);

    // Keep selected locations in Redux when user comes back from the next page.
    // The create-BOM flow is cleared only after successful submit from Summary.
    if (itemNumbers.length > 0) {
      dispatch(fetchLocationsByItems(itemNumbers));
    }
  }, [dispatch, selectedProducedItems]);

  const filteredLocations = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return locations;

    return locations.filter((x) => {
      return (
        String(x.location ?? "").toLowerCase().includes(q) ||
        String(x.name ?? "").toLowerCase().includes(q) ||
        String(x.status ?? "").toLowerCase().includes(q) ||
        String(x.country ?? "").toLowerCase().includes(q) ||
        String(x.region ?? "").toLowerCase().includes(q)
      );
    });
  }, [locations, search]);

  const totalRecords = filteredLocations.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startRecord = totalRecords === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(safePage * PAGE_SIZE, totalRecords);

  useEffect(() => {
    dispatch(
      setLocationsPagination({
        page: safePage,
        pageSize: PAGE_SIZE,
        total: totalRecords,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
      })
    );
  }, [dispatch, safePage, totalRecords, totalPages]);

  const paginatedLocations = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLocations.slice(start, start + PAGE_SIZE);
  }, [filteredLocations, safePage]);

  const goToPrevPage = () => {
    dispatch(setLocationsPagination({ page: Math.max(1, safePage - 1) }));
  };

  const goToNextPage = () => {
    dispatch(setLocationsPagination({ page: Math.min(totalPages, safePage + 1) }));
  };

  const onToggle = (row) => {
    const active = isActiveLocation(row.status);

    if (!active) {
      setShowInactiveWarning(true);
      return;
    }

    setShowInactiveWarning(false);
    dispatch(toggleLocation(row.id));
  };

  const producedItemCount = selectedProducedItems.length;

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 2: Location(s)</h1>

        <p style={styles.subTitle}>
          Select one or more locations for the produced items
        </p>

        <input
          type="text"
          placeholder="Search Location"
          value={search}
          onChange={(e) => dispatch(setLocationsSearch(e.target.value))}
          style={styles.search}
        />

        {error && <div style={styles.error}>Error: {String(error)}</div>}

        {!loading && !error && producedItemCount === 0 && (
          <div style={styles.warningBox}>
            Please go back and select at least one produced item.
          </div>
        )}

        {!loading && !error && producedItemCount > 0 && (
          <ShowingRecordsInfo
            start={startRecord}
            end={endRecord}
            total={totalRecords}
            itemLabel="item"
            style={styles.paginationInfo}
          />
        )}

        <div style={{ ...styles.table, position: "relative" }}>
          <div style={styles.headerRow}>
            <div style={styles.checkboxCell}>
              <input type="checkbox" disabled />
            </div>
            <div>Location ID</div>
            <div>Name</div>
            <div>Location Status</div>
          </div>

          {loading ? (
            <div style={styles.loadingBodyRow}>
              <ProgressIndicator label="Loading locations..." />
            </div>
          ) : null}

          {!loading && paginatedLocations.map((row) => {
            const active = isActiveLocation(row.status);
            const checked = selectedIds.includes(row.id);

            return (
              <div
                key={row.id}
                style={{
                  ...styles.dataRow,
                  backgroundColor: active ? "#ffffff" : "#f8ecec",
                }}
              >
                <div style={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!active}
                    onChange={() => onToggle(row)}
                    style={{ cursor: active ? "pointer" : "not-allowed" }}
                  />
                </div>

                <div style={styles.cellText}>{row.location || "-"}</div>
                <div style={styles.cellText}>{row.name || "-"}</div>
                <div
                  style={{
                    ...styles.statusText,
                    color: active ? "#16a34a" : "#dc2626",
                  }}
                >
                  {active ? "Active" : "Inactive"}
                </div>
              </div>
            );
          })}

          {!loading && !error && producedItemCount > 0 && totalRecords === 0 && (
            <div style={styles.noRecords}>No locations found.</div>
          )}
        </div>

        {!loading && !error && producedItemCount > 0 && totalRecords > 0 && (
          <div style={styles.paginationContainer}>
            <button
              type="button"
              disabled={safePage === 1 || loading}
              onClick={goToPrevPage}
              style={{
                ...styles.pageButton,
                ...((safePage === 1 || loading) ? styles.pageButtonDisabled : {}),
              }}
            >
              ← Prev
            </button>

            <span style={styles.pageText}>
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage === totalPages || loading}
              onClick={goToNextPage}
              style={{
                ...styles.pageButton,
                ...((safePage === totalPages || loading) ? styles.pageButtonDisabled : {}),
              }}
            >
              Next →
            </button>
          </div>
        )}

        {(showInactiveWarning || hasInactiveSelected) && (
          <div style={styles.warningBox}>
            Warning: Inactive locations cannot be selected. Please select only active locations.
          </div>
        )}

        {selectedLocations.length > 0 && (
          <div style={styles.selectedCard}>
            <div style={styles.selectedToolbar}>
              <div style={styles.selectedTitle}>
                Selected Location(s) ({selectedLocations.length})
              </div>
              <button
                type="button"
                onClick={() => dispatch(clearSelectedLocations())}
                style={styles.deselectAllBtn}
              >
                DE-SELECT ALL
              </button>
            </div>
            <div style={styles.selectedScroller}>
              <table style={styles.selectedHtmlTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.selectedTh, width: "48px" }} />
                    <th style={styles.selectedTh}>Location ID</th>
                    <th style={styles.selectedTh}>Name</th>
                    <th style={styles.selectedTh}>Location Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLocations.map((row) => {
                    const active = isActiveLocation(row.status);
                    return (
                      <tr key={`selected-${row.id}`}>
                        <td style={{ ...styles.selectedTd, ...styles.selectedCheckboxCell }}>
                          <input
                            type="checkbox"
                            checked
                            onChange={() => onToggle(row)}
                            style={{ cursor: "pointer" }}
                            aria-label={`Deselect location ${row.location || row.id}`}
                          />
                        </td>
                        <td style={styles.selectedTd}>{row.location || "-"}</td>
                        <td style={styles.selectedTd}>{row.name || "-"}</td>
                        <td
                          style={{
                            ...styles.selectedTd,
                            color: active ? "#16a34a" : "#dc2626",
                            fontWeight: 500,
                          }}
                        >
                          {active ? "Active" : "Inactive"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div style={styles.bottomBar}>
          <div style={styles.selectedCount}>
            {selectedIds.length} location(s) selected
          </div>

          <button
            type="button"
            disabled={
              selectedIds.length === 0 ||
              hasInactiveSelected ||
              producedItemCount === 0
            }
            onClick={() => navigate("/resource-component")}
            style={{
              ...styles.nextBtn,
              ...(selectedIds.length === 0 ||
              hasInactiveSelected ||
              producedItemCount === 0
                ? styles.nextBtnDisabled
                : styles.nextBtnEnabled),
            }}
          >
            NEXT: RESOURCE &amp; COMPONENT INFO →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectedLocation;

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f6f8",
    padding: "22px 26px 40px",
    boxSizing: "border-box",
  },
  inner: {
    maxWidth: "1120px",
    margin: "0 auto",
  },
  back: {
    color: "#2563eb",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "10px",
    userSelect: "none",
    width: "fit-content",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "42px",
    lineHeight: 1.15,
    fontWeight: 600,
    color: "#111827",
  },
  subTitle: {
    margin: "0 0 18px 0",
    color: "#4b5563",
    fontSize: "15px",
  },
  search: {
    width: "100%",
    height: "42px",
    padding: "0 14px",
    borderRadius: "4px",
    border: "1px solid #cfd4dc",
    backgroundColor: "#ffffff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "18px",
  },
  info: {
    marginBottom: "12px",
    color: "#4b5563",
    fontSize: "14px",
  },
  error: {
    marginBottom: "12px",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 600,
    whiteSpace: "pre-wrap",
  },
  paginationInfo: {
    marginBottom: "12px",
    color: "#4b5563",
    fontSize: "14px",
  },
  table: {
    border: "1px solid #d5d9df",
    borderRadius: "4px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "48px 1.3fr 1.2fr 1fr",
    alignItems: "center",
    minHeight: "42px",
    padding: "0 16px",
    backgroundColor: "#f1f3f5",
    borderBottom: "1px solid #d9dde3",
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
    columnGap: "10px",
  },
  dataRow: {
    display: "grid",
    gridTemplateColumns: "48px 1.3fr 1.2fr 1fr",
    alignItems: "center",
    minHeight: "40px",
    padding: "0 16px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
    color: "#111827",
    columnGap: "10px",
  },
  checkboxCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    color: "#111827",
    fontSize: "14px",
  },
  statusText: {
    fontSize: "14px",
    fontWeight: 500,
  },
  noRecords: {
    padding: "18px 16px",
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center",
  },
  loadingBodyRow: {
    padding: "28px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
  paginationContainer: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
  },
  pageButton: {
    padding: "8px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    backgroundColor: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontSize: "14px",
  },
  pageButtonDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  pageText: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
  },
  warningBox: {
    marginTop: "14px",
    padding: "12px 14px",
    borderRadius: "4px",
    border: "1px solid #f5c2c7",
    backgroundColor: "#fdecef",
    color: "#b42318",
    fontSize: "14px",
  },
  selectedCard: {
    marginTop: "18px",
    border: "1px solid #d5d9df",
    borderRadius: "4px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  selectedToolbar: {
    minHeight: "42px",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    backgroundColor: "#f1f3f5",
    borderBottom: "1px solid #d9dde3",
  },
  selectedTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
  },
  deselectAllBtn: {
    height: "30px",
    padding: "0 12px",
    border: "1px solid #c7cbd1",
    borderRadius: "4px",
    backgroundColor: "#ffffff",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  selectedScroller: {
    overflowX: "auto",
  },
  selectedHtmlTable: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  selectedTh: {
    textAlign: "left",
    backgroundColor: "#f1f3f5",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 500,
    padding: "13px 12px",
    borderBottom: "1px solid #d9dde3",
    whiteSpace: "nowrap",
  },
  selectedTd: {
    fontSize: "14px",
    color: "#111827",
    padding: "13px 12px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  selectedCheckboxCell: {
    textAlign: "center",
  },
  bottomBar: {
    marginTop: "12px",
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
    minWidth: "236px",
    height: "40px",
    padding: "0 18px",
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
