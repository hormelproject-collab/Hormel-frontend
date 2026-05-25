import { useEffect, useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// ✅ import from your bomSlice file
import {
  fetchItemMaster,
  fetchLocationMaster,
  selectAllItemMaster,
  selectAllLocations,
  selectSelectedProducedItemIds,
  selectSelectedLocationIds,
  selectSelectedProducedItems,
  selectSelectedLocations,
  selectItemsLoading,
  selectItemsError,
  selectLocationsLoading,
  selectLocationsError,
  selectHasInactiveSelected,
  selectHasInactiveLocationsSelected,
} from "../../redux/bomSlice";

const ResourceComponentInfo = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ✅ selected entities from redux
  const producedItems = useSelector(selectSelectedProducedItems);
  const locations = useSelector(selectSelectedLocations);

  // ✅ ids (useful for refresh scenario)
  const producedItemIds = useSelector(selectSelectedProducedItemIds);
  const locationIds = useSelector(selectSelectedLocationIds);

  // ✅ master adapter data (to know if we need to fetch)
  const allItems = useSelector(selectAllItemMaster);
  const allLocations = useSelector(selectAllLocations);

  // ✅ loading + error
  const itemsLoading = useSelector(selectItemsLoading);
  const itemsError = useSelector(selectItemsError);
  const locationsLoading = useSelector(selectLocationsLoading);
  const locationsError = useSelector(selectLocationsError);

  // ✅ inactive checks (safe guard)
  const hasInactiveItems = useSelector(selectHasInactiveSelected);
  const hasInactiveLocs = useSelector(selectHasInactiveLocationsSelected);

  // ✅ Accordion state
  const [openItem, setOpenItem] = useState(null);
  const [openLocationKey, setOpenLocationKey] = useState(null); // unique key per item+location

  // ✅ If user refreshes Step 3, selected IDs exist but master lists may be empty
  useEffect(() => {
    if (producedItemIds.length > 0 && allItems.length === 0 && !itemsLoading) {
      dispatch(fetchItemMaster(500));
    }
    if (locationIds.length > 0 && allLocations.length === 0 && !locationsLoading) {
      dispatch(fetchLocationMaster(500));
    }
  }, [
    dispatch,
    producedItemIds.length,
    locationIds.length,
    allItems.length,
    allLocations.length,
    itemsLoading,
    locationsLoading,
  ]);

  // ✅ Default open first item when data arrives
  useEffect(() => {
    if (!openItem && producedItems.length > 0) {
      setOpenItem(producedItems[0].id);
    }
  }, [producedItems, openItem]);

  const isBlocked =
    producedItems.length === 0 ||
    locations.length === 0 ||
    hasInactiveItems ||
    hasInactiveLocs;

  return (
    <div style={styles.container}>
      {/* Back */}
      <div style={styles.back} onClick={() => navigate(-1)}>
        ← BACK
      </div>

      <h2 style={styles.title}>Step 3: Resource & Component Info</h2>
      <p style={styles.sub}>
        Configure resources and components for each item and location
      </p>

      {/* ✅ Loading / Error states */}
      {(itemsLoading || locationsLoading) && (
        <div style={styles.infoBox}>Loading data...</div>
      )}

      {(itemsError || locationsError) && (
        <div style={styles.errorBox}>
          {itemsError ? `Items Error: ${itemsError}` : null}
          {itemsError && locationsError ? <br /> : null}
          {locationsError ? `Locations Error: ${locationsError}` : null}
        </div>
      )}

      {/* ✅ Missing selections */}
      {producedItems.length === 0 || locations.length === 0 ? (
        <div style={styles.warningBox}>
          ⚠️ No selected Produced Items / Locations found. Please complete Step 1
          and Step 2 first.
        </div>
      ) : null}

      {/* ✅ Safety warning if somehow inactive got through */}
      {(hasInactiveItems || hasInactiveLocs) && (
        <div style={styles.warningBox}>
          ⚠️ Inactive item/location selected. Please deselect inactive entries in previous steps before continuing.
        </div>
      )}

      {/* ✅ Actual UI */}
      {producedItems.map((item) => (
        <div key={item.id} style={styles.card}>
          {/* ITEM HEADER */}
          <div
            style={styles.header}
            onClick={() => setOpenItem(openItem === item.id ? null : item.id)}
          >
            <div>
              {/* show item number + desc from redux */}
              <div style={{ fontWeight: "600" }}>{item.item}</div>
              <div style={{ color: "#666", fontSize: "13px" }}>{item.desc}</div>
            </div>

            <span>
              {openItem === item.id ? <IoIosArrowUp /> : <IoIosArrowDown />}
            </span>
          </div>

          {/* ITEM BODY */}
          {openItem === item.id && (
            <div style={styles.innerArea}>
              {locations.map((loc) => {
                const locKey = `${item.id}|${loc.id}`;
                const isOpenLoc = openLocationKey === locKey;

                // display text
                const locLabel = loc.name || `Location ${loc.location || ""}`;

                return (
                  <div key={locKey} style={styles.cardInner}>
                    {/* LOCATION HEADER */}
                    <div
                      style={styles.headerInner}
                      onClick={() =>
                        setOpenLocationKey(isOpenLoc ? null : locKey)
                      }
                    >
                      <span style={{ fontWeight: 600 }}>
                        {locLabel}
                      </span>

                      <span>
                        {isOpenLoc ? <IoIosArrowUp /> : <IoIosArrowDown />}
                      </span>
                    </div>

                    {/* LOCATION BODY */}
                    {isOpenLoc && (
                      <div style={styles.formArea}>
                        {/* GRID FORM */}
                        <div style={styles.grid}>
                          <select style={styles.input} defaultValue="">
                            <option value="" disabled>
                              Resource *
                            </option>
                            <option>Resource A</option>
                            <option>Resource B</option>
                          </select>

                          <input
                            placeholder="Resource Relevancy"
                            style={styles.inputDisabled}
                            disabled
                          />

                          <input
                            placeholder="Item BOM Routing Priority"
                            style={styles.input}
                          />

                          <select style={styles.input} defaultValue="">
                            <option value="" disabled>
                              BOM Version *
                            </option>
                            <option>V1</option>
                            <option>V2</option>
                          </select>

                          <input
                            placeholder="BOM ID"
                            style={styles.inputDisabled}
                            disabled
                          />

                          <input
                            placeholder="Routing ID"
                            style={styles.inputDisabled}
                            disabled
                          />
                        </div>

                        {/* CHECKBOXES */}
                        <div style={styles.checkRow}>
                          <label style={styles.chkLabel}>
                            <input type="checkbox" />
                            <span style={styles.chkText}>Produced Co-Product?</span>
                          </label>

                          <label style={styles.chkLabel}>
                            <input type="checkbox" />
                            <span style={styles.chkText}>No Component Items</span>
                          </label>
                        </div>

                        {/* COMPONENT SECTION */}
                        <div style={styles.componentBox}>
                          <div style={styles.componentHeader}>
                            <span style={{ fontWeight: 600 }}>Component Items</span>
                            <button type="button" style={styles.addBtn}>
                              + ADD COMPONENT
                            </button>
                          </div>
                        </div>

                        {/* REPLICATE */}
                        <label style={styles.replicateRow}>
                          <input type="checkbox" />
                          <span style={styles.chkText}>
                            Replicate for All Selected Locations
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* NEXT BUTTON */}
      <div style={styles.bottom}>
        <button
          style={{
            ...styles.nextBtn,
            backgroundColor: isBlocked ? "#d1d5db" : "#2563eb",
            color: isBlocked ? "#666" : "white",
            cursor: isBlocked ? "not-allowed" : "pointer",
          }}
          disabled={isBlocked}
          onClick={() => navigate("/summary")}   // ✅ change to your actual summary route
        >
          NEXT: REVIEW SUMMARY →
        </button>
      </div>
    </div>
  );
};

export default ResourceComponentInfo;

/* ✅ Styles (same as yours + a few small additions) */
const styles = {
  container: {
    padding: "30px",
    maxWidth: "900px",
    margin: "auto",
  },

  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "10px",
    width: "fit-content",
  },

  title: {
    fontSize: "26px",
    fontWeight: "600",
  },

  sub: {
    color: "#666",
    marginBottom: "20px",
  },

  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginBottom: "20px",
    background: "white",
  },

  header: {
    padding: "15px",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    alignItems: "center",
  },

  innerArea: {
    padding: "15px",
  },

  cardInner: {
    border: "1px solid #eee",
    borderRadius: "6px",
    marginTop: "10px",
    overflow: "hidden",
  },

  headerInner: {
    padding: "10px",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    background: "#f9fafb",
    alignItems: "center",
  },

  formArea: {
    padding: "15px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  input: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "white",
  },

  inputDisabled: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#f3f4f6",
    color: "#666",
  },

  checkRow: {
    marginTop: "15px",
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },

  chkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  chkText: {
    fontSize: "13px",
  },

  componentBox: {
    marginTop: "15px",
    padding: "10px",
    background: "#ecfdf5",
    borderRadius: "6px",
    border: "1px solid #bbf7d0",
  },

  componentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  addBtn: {
    border: "none",
    background: "none",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
  },

  replicateRow: {
    marginTop: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  bottom: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
  },

  nextBtn: {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
  },

  infoBox: {
    marginBottom: "12px",
    padding: "10px",
    borderRadius: "6px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e40af",
  },

  warningBox: {
    marginBottom: "12px",
    padding: "10px",
    borderRadius: "6px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
  },

  errorBox: {
    marginBottom: "12px",
    padding: "10px",
    borderRadius: "6px",
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
  },
};