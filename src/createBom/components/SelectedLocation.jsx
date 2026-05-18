
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchLocationMaster,
  toggleLocation,
  selectAllLocations,
  selectSelectedLocationIds,
  selectHasInactiveLocationsSelected,
  selectLocationsLoading,
  selectLocationsError,
} from "../../redux/bomSlice";

const SelectedLocation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  // ✅ redux state
  const locations = useSelector(selectAllLocations);
  const selectedIds = useSelector(selectSelectedLocationIds);
  const hasInactiveSelected = useSelector(selectHasInactiveLocationsSelected);
  const loading = useSelector(selectLocationsLoading);
  const error = useSelector(selectLocationsError);

  // ✅ fetch on mount
  useEffect(() => {
    dispatch(fetchLocationMaster(10));
  }, [dispatch]);

  // ✅ filter
  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (x) =>
        String(x.location || "").toLowerCase().includes(q) ||
        String(x.name || "").toLowerCase().includes(q)
    );
  }, [locations, search]);

  const onToggle = (row) => {
    // ✅ hard block inactive (Active is "A")
    if (row.status !== "A") {
      setShowInactiveWarning(true);
      return;
    }
    setShowInactiveWarning(false);
    dispatch(toggleLocation(row.id));
  };

  return (
    <div style={styles.container}>
      <div style={styles.back} onClick={() => navigate(-1)}>
        ← BACK
      </div>

      <h2>Step 2: Location(s)</h2>
      <p>Select one or more locations for the produced items</p>

      <input
        type="text"
        placeholder="Search Location"
        style={styles.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <div style={styles.info}>Loading locations...</div>}
      {error && <div style={styles.error}>Error: {String(error)}</div>}

      <div style={styles.table}>
        <div style={styles.rowHeader}>
          <div></div>
          <div>Location ID</div>
          <div>Name</div>
          <div>Location Status</div>
        </div>

        {filteredLocations.map((row) => {
          const isInactive = row.status !== "A";
          const checked = selectedIds.includes(row.id);

          return (
            <div
              key={row.id}
              style={{
                ...styles.row,
                backgroundColor: isInactive ? "#fdeaea" : "white",
                opacity: isInactive ? 0.9 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isInactive}
                onChange={() => onToggle(row)}
              />

              <div>{row.location}</div>
              <div>{row.name}</div>

              <div
                style={{
                  color: isInactive ? "red" : "green",
                  fontWeight: "bold",
                }}
              >
                {isInactive ? "Inactive" : "Active"}
              </div>
            </div>
          );
        })}
      </div>

      {(showInactiveWarning || hasInactiveSelected) && (
        <div style={styles.warningBox}>
          ⚠️ Warning: Inactive locations cannot be selected. Please select only Active locations.
        </div>
      )}

      <div style={styles.bottom}>
        <span>{selectedIds.length} location(s) selected</span>

        <button
          style={{
            ...styles.nextBtn,
            backgroundColor:
              selectedIds.length === 0 || hasInactiveSelected
                ? "#d1d5db"
                : "#2563eb",
            color:
              selectedIds.length === 0 || hasInactiveSelected ? "#666" : "white",
            cursor:
              selectedIds.length === 0 || hasInactiveSelected
                ? "not-allowed"
                : "pointer",
          }}
          disabled={selectedIds.length === 0 || hasInactiveSelected}
          onClick={() => navigate("/resource-component")}   
        >
          NEXT: RESOURCE & COMPONENT INFO →
        </button>
      </div>
    </div>
  );
};

export default SelectedLocation;

const styles = {
  container: { padding: "30px", maxWidth: "900px", margin: "auto" },
  back: { color: "#2563eb", cursor: "pointer", marginBottom: "10px" },
  search: {
    width: "100%",
    padding: "10px",
    margin: "20px 0",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  table: { border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" },
  rowHeader: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 2fr 1fr",
    background: "#f3f4f6",
    padding: "10px",
    fontWeight: "bold",
    alignItems: "center",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 2fr 1fr",
    padding: "10px",
    borderTop: "1px solid #eee",
    alignItems: "center",
  },
  bottom: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  nextBtn: { padding: "10px 20px", border: "none", borderRadius: "6px" },
  warningBox: {
    marginTop: "20px",
    padding: "12px",
    backgroundColor: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: "6px",
    color: "#b91c1c",
  },
  info: { marginBottom: "10px", color: "rgb(75, 85, 99)" },
  error: { marginBottom: "10px", color: "rgb(185, 28, 28)", fontWeight: "bold" },
};
