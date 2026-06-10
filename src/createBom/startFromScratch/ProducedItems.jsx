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

  const [search, setSearch] = useState("");
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  const items = useSelector(selectAllItemMaster);
  const selectedIds = useSelector(selectSelectedProducedItemIds);
  const hasInactiveSelected = useSelector(selectHasInactiveSelected);
  const loading = useSelector(selectItemsLoading);
  const error = useSelector(selectItemsError);

  useEffect(() => {
    // fetch ALL records
    dispatch(fetchItemMaster());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      return (
        String(x.item || "").toLowerCase().includes(q) ||
        String(x.desc || "").toLowerCase().includes(q) ||
        String(x.status || "").toLowerCase().includes(q) ||
        String(x.itemReleaseFlag || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const onToggle = (row) => {
    const isInactive = getNormalizedStatus(row.status) === "INACTIVE";

    if (isInactive) {
      setShowInactiveWarning(true);
      return;
    }

    setShowInactiveWarning(false);
    dispatch(toggleProducedItem(row.id));
  };

  const gridCols =
    width < 700
      ? "44px 1.2fr 1fr 1fr"
      : "44px 1.2fr 2fr 1fr 1.2fr";

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 1: Produced Item(s)</h1>
        <div style={styles.subTitle}>Select one or more items to produce</div>

        <input
          type="text"
          placeholder="Search Item Number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        {loading && <div style={styles.info}>Loading items...</div>}
        {error && <div style={styles.error}>Error: {String(error)}</div>}

        <div style={styles.table}>
          <div
            style={{
              ...styles.headerRow,
              gridTemplateColumns: gridCols,
            }}
          >
            <div style={styles.checkboxCell}>
              <input type="checkbox" disabled />
            </div>
            <div>Item</div>
            {width >= 700 && <div>Item Description</div>}
            <div>Item Status</div>
            <div>Item Release Flag</div>
          </div>

          {filteredItems.map((row) => {
            const isInactive = getNormalizedStatus(row.status) === "INACTIVE";
            const checked = selectedIds.includes(row.id);

            const normalizedReleaseFlag = getNormalizedReleaseFlag(
              row.itemReleaseFlag
            );
            const isRelease3 = normalizedReleaseFlag === "RELEASE3";

            return (
              <div
                key={row.id}
                style={{
                  ...styles.dataRow,
                  gridTemplateColumns: gridCols,
                  backgroundColor: isInactive ? "#f9eded" : "#ffffff",
                }}
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
                  <div>{row.item}</div>
                  {width < 700 && (
                    <div style={styles.mobileDesc}>{row.desc || "-"}</div>
                  )}
                </div>

                {width >= 700 && <div>{row.desc || "-"}</div>}

                <div
                  style={{
                    color: isInactive ? "#ff0000" : "#0a9f32",
                    fontWeight: 500,
                  }}
                >
                  {isInactive ? "Inactive" : "Active"}
                </div>

                <div
                  style={{
                    color: isRelease3 ? "#ff0000" : "#111827",
                    fontWeight: isRelease3 ? 500 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{row.itemReleaseFlag || "-"}</span>
                  {isRelease3 && (
                    <span style={styles.warningIcon} title="Release3 warning">
                      ⚠
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(showInactiveWarning || hasInactiveSelected) && (
          <div style={styles.warningBox}>
            Warning: Inactive items cannot be selected. Please select only active items.
          </div>
        )}

        <div style={styles.bottomBar}>
          <div style={styles.selectedCount}>
            {selectedIds.length} item(s) selected
          </div>


          <button
            style={{
              ...styles.nextBtn,
              ...(selectedIds.length === 0
                ? styles.nextBtnDisabled
                : styles.nextBtnEnabled),
            }}
            disabled={selectedIds.length === 0}
            onClick={() => navigate("/select-location")}
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
  search: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    outline: "none",
    marginBottom: "18px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
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
  warningIcon: {
    color: "#ff0000",
    fontSize: "14px",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
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
    cursor: "pointer",
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