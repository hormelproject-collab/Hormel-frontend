import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchLocationsByItems,
  toggleLocation,
  clearLocations,
  selectAllLocations,
  selectSelectedLocationIds,
  selectHasInactiveLocationsSelected,
  selectLocationsLoading,
  selectLocationsError,
  selectSelectedProducedItems,
} from "../../redux/bomSlice";

const normalizeStatus = (value) => String(value ?? "").trim().toUpperCase();

const isActiveLocation = (value) => {
  const s = normalizeStatus(value);
  return s === "A" || s === "ACTIVE" || s === "1" || s === "Y" || s === "TRUE";
};

const SelectedLocation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  // ✅ retain integration with selected produced items from step 1
  const selectedProducedItems = useSelector(selectSelectedProducedItems);

  // ✅ retain integration with redux locations state
  const locations = useSelector(selectAllLocations);
  const selectedIds = useSelector(selectSelectedLocationIds);
  const hasInactiveSelected = useSelector(selectHasInactiveLocationsSelected);
  const loading = useSelector(selectLocationsLoading);
  const error = useSelector(selectLocationsError);

  // ✅ retain API integration: fetch locations based on produced items
  useEffect(() => {
    const itemNumbers = selectedProducedItems
      .map((x) => x.item)
      .filter(Boolean);

    dispatch(clearLocations());

    if (itemNumbers.length > 0) {
      dispatch(fetchLocationsByItems(itemNumbers));
    }
  }, [dispatch, selectedProducedItems]);

  // Persist selectedIds to localStorage for Step 2 selections
  useEffect(() => {
    if (selectedIds.length > 0) {
      localStorage.setItem(
        "step2SelectedLocationIds",
        JSON.stringify(selectedIds)
      );
    }
  }, [selectedIds]);

  // Restore selectedIds from localStorage if not already selected
  useEffect(() => {
    if (selectedIds.length === 0 && locations.length > 0) {
      const backup = localStorage.getItem("step2SelectedLocationIds");
      if (backup) {
        try {
          const restoredIds = JSON.parse(backup);
          // Toggle each restored location
          restoredIds.forEach((id) => {
            const location = locations.find((x) => x.id === id);
            if (location && isActiveLocation(location.status)) {
              dispatch(toggleLocation(id));
            }
          });
        } catch (err) {
          console.error("Failed to restore Step 2 selections from localStorage", err);
        }
      }
    }
  }, [dispatch, locations, selectedIds.length]);

  // ✅ retain search behavior
  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
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
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        {loading && <div style={styles.info}>Loading locations...</div>}
        {error && <div style={styles.error}>Error: {String(error)}</div>}

        {!loading && !error && producedItemCount === 0 && (
          <div style={styles.warningBox}>
            Please go back and select at least one produced item.
          </div>
        )}

        <div style={styles.table}>
          <div style={styles.headerRow}>
            <div style={styles.checkboxCell}>
              <input type="checkbox" disabled />
            </div>
            <div>Location ID</div>
            <div>Name</div>
            <div>Location Status</div>
          </div>

          {filteredLocations.map((row) => {
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
        </div>

        {(showInactiveWarning || hasInactiveSelected) && (
          <div style={styles.warningBox}>
            Warning: Inactive locations cannot be selected. Please select only active locations.
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
  warningBox: {
    marginTop: "14px",
    padding: "12px 14px",
    borderRadius: "4px",
    border: "1px solid #f5c2c7",
    backgroundColor: "#fdecef",
    color: "#b42318",
    fontSize: "14px",
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
}
};