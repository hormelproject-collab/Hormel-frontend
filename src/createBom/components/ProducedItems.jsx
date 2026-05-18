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
} from "../../redux/bomSlice";

// small helper for responsive inline styling (you said you want breakpoints)
const useWindowWidth = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
};

const ProducedItems = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const width = useWindowWidth();

  const [search, setSearch] = useState("");
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  // redux state
  const items = useSelector(selectAllItemMaster);
  const selectedIds = useSelector(selectSelectedProducedItemIds);
  const hasInactiveSelected = useSelector(selectHasInactiveSelected);
  const loading = useSelector(selectItemsLoading);
  const error = useSelector(selectItemsError);

  // fetch on mount
  useEffect(() => {
    dispatch(fetchItemMaster(10));
  }, [dispatch]);

  // filter on search (memoized)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => (x.item || "").toLowerCase().includes(q));
  }, [items, search]);

  const onToggle = (row) => {
    // hard block inactive (best UX)
    if (row.status === "INACTIVE") {
      setShowInactiveWarning(true);
      return;
    }
    setShowInactiveWarning(false);
    dispatch(toggleProducedItem(row.id));
  };

  // responsive grid columns
  const gridCols =
    width < 600
      ? "40px 1fr 1fr"               // hide desc/status in mobile? we’ll show status under item
      : "50px 1fr 2fr 1fr";

  return (
    <div style={styles.container}>
      <div style={styles.back} onClick={() => navigate(-1)}>
        ← BACK
      </div>

      <h2>Step 1: Produced Item(s)</h2>
      <p>Select one or more items to produce</p>

      <input
        type="text"
        placeholder="Search Item Number"
        style={styles.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Loading / Error */}
      {loading && <div style={styles.info}>Loading items...</div>}
      {error && <div style={styles.error}>Error: {String(error)}</div>}

      {/* Table */}
      <div style={styles.table}>
        {/* Header */}
        <div style={{ ...styles.rowHeader, gridTemplateColumns: gridCols }}>
          <div></div>
          <div>Item</div>
          {width >= 600 && <div>Item Description</div>}
          {width >= 600 && <div>Item Status</div>}
        </div>

        {filteredItems.map((row) => {
          const isInactive = row.status === "INACTIVE";
          const checked = selectedIds.includes(row.id);

          return (
            <div
              key={row.id}
              style={{
                ...styles.row,
                gridTemplateColumns: gridCols,
                backgroundColor: isInactive ? "rgb(245, 218, 218)" : "white",
                opacity: isInactive ? 0.9 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isInactive}
                onChange={() => onToggle(row)}
              />

              <div style={{ fontWeight: 500 }}>
                {row.item}
                {width < 600 && (
                  <div
                    style={{
                      marginTop: 4,
                      color: isInactive ? "red" : "green",
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {isInactive ? "Inactive" : "Active"}
                  </div>
                )}
              </div>

              {width >= 600 && <div>{row.desc}</div>}

              {width >= 600 && (
                <div
                  style={{
                    color: isInactive ? "red" : "green",
                    fontWeight: "bold",
                  }}
                >
                  {isInactive ? "Inactive" : "Active"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* warning */}
      {(showInactiveWarning || hasInactiveSelected) && (
        <div style={styles.warningBox}>
          <span style={{ marginRight: "8px" }}>⚠️</span>
          Warning: Inactive items cannot be selected. Please select only Active items.
        </div>
      )}

      {/* Bottom */}
      <div style={styles.bottom}>
        <span>{selectedIds.length} item(s) selected</span>

        <button
          style={{
            ...styles.nextBtn,
            backgroundColor:
              selectedIds.length === 0 || hasInactiveSelected ? "#d1d5db" : "rgb(37, 99, 235)",
            color:
              selectedIds.length === 0 || hasInactiveSelected ? "rgb(102, 102, 102)" : "white",
            cursor:
              selectedIds.length === 0 || hasInactiveSelected ? "not-allowed" : "pointer",
          }}
          disabled={selectedIds.length === 0 || hasInactiveSelected}
          onClick={() => navigate("/select-location")}
        >
          NEXT: SELECT LOCATIONS →
        </button>
      </div>
    </div>
  );
};

export default ProducedItems;

const styles = {
  container: {
    padding: "30px",
    maxWidth: "900px",
    margin: "auto",
  },
  back: {
    color: "blue",
    cursor: "pointer",
    marginBottom: "10px",
  },
  search: {
    width: "100%",
    padding: "10px",
    margin: "20px 0",
    borderRadius: "6px",
    border: "1px solid rgb(204,204,204)",
  },
  table: {
    border: "1px solid rgb(221,221,221)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  rowHeader: {
    display: "grid",
    background: "rgb(243, 244, 246)",
    padding: "10px",
    fontWeight: "bold",
    alignItems: "center",
  },
  row: {
    display: "grid",
    padding: "10px",
    borderTop: "1px solid rgb(238,238,238)",
    alignItems: "center",
    gap: "10px",
  },
  bottom: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  nextBtn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "6px",
  },
  warningBox: {
    marginTop: "20px",
    padding: "12px",
    backgroundColor: "rgb(254, 226, 226)",
    border: "1px solid rgb(252, 165, 165)",
    borderRadius: "6px",
    color: "rgb(185, 28, 28)",
    display: "flex",
    alignItems: "center",
  },
  info: {
    marginBottom: "10px",
    color: "rgb(75, 85, 99)",
  },
  error: {
    marginBottom: "10px",
    color: "rgb(185, 28, 28)",
    fontWeight: "bold",
  },
};