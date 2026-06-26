
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IoIosArrowBack, IoIosArrowDown, IoMdClose, IoMdTrash } from "react-icons/io";
import { selectItemBomRoutingForm, setItemBomRoutingForm } from "../../redux/bomSlice";

const API_BASE_URL = "http://localhost:3000";
const FORM_STORAGE_KEY = "create-item-bom-routing-record-form";

const createCoProductRow = () => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  coProductItem: "",
  itemDescription: "",
  qtyProduced: "",
});

const CreateItemBOMRoutingRecord = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const persistedForm = useSelector(selectItemBomRoutingForm);
  const hasHydratedRef = useRef(false);

  const [bomOptions, setBomOptions] = useState([]);
  const [resourceOptions, setResourceOptions] = useState([]);
  const [coProductOptions, setCoProductOptions] = useState([]);
  const [selectedBomId, setSelectedBomId] = useState(persistedForm?.selectedBomId ?? "");
  const [producedItem, setProducedItem] = useState(persistedForm?.producedItem ?? "");
  const [itemReleaseFlag, setItemReleaseFlag] = useState(persistedForm?.itemReleaseFlag ?? "");
  const [location, setLocation] = useState(persistedForm?.location ?? "");
  const [selectedResource, setSelectedResource] = useState(persistedForm?.selectedResource ?? "");
  const [resourceRelevancy, setResourceRelevancy] = useState(persistedForm?.resourceRelevancy ?? "");
  const [routingPriority, setRoutingPriority] = useState(persistedForm?.routingPriority ?? "");
  const [addConnectedCoProduct, setAddConnectedCoProduct] = useState(persistedForm?.addConnectedCoProduct ?? false);
  const [coProductRows, setCoProductRows] = useState(
    Array.isArray(persistedForm?.coProductRows) && persistedForm.coProductRows.length > 0
      ? persistedForm.coProductRows
      : [createCoProductRow()]
  );

  const [loading, setLoading] = useState({
    initial: false,
    bomDetails: false,
    itemReleaseFlag: false,
    resourceRelevancy: false,
    coProducts: false,
  });
  const [error, setError] = useState("");

  const routingId = useMemo(() => {
    if (!producedItem || !location || !selectedResource) return "";
    return `${producedItem}_${location}_${selectedResource}`;
  }, [producedItem, location, selectedResource]);

  const validCoProductRows = useMemo(() => {
    return coProductRows.filter(
      (row) =>
        String(row.coProductItem || "").trim() ||
        String(row.qtyProduced || "").trim() ||
        String(row.itemDescription || "").trim()
    );
  }, [coProductRows]);

  const allCoProductRowsValid = useMemo(() => {
    if (!addConnectedCoProduct) return true;
    if (!validCoProductRows.length) return false;

    return validCoProductRows.every((row) => {
      const qty = Number(row.qtyProduced);

      return (
        String(row.coProductItem || "").trim() &&
        String(row.qtyProduced || "").trim() &&
        !Number.isNaN(qty) &&
        qty < 1
      );
    });
  }, [addConnectedCoProduct, validCoProductRows]);


  const canProceed =
    !!selectedBomId &&
    !!selectedResource &&
    !!routingPriority &&
    (!addConnectedCoProduct || allCoProductRowsValid);

  const deriveItemAndLocationFromBomId = (bomId) => {
    const value = String(bomId || "").trim();
    if (!value) {
      return { item: "", location: "" };
    }

    const parts = value.split("_").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      return { item: "", location: "" };
    }

    return {
      item: parts[1] || "",
      location: parts.slice(2).join("_") || "",
    };
  };

  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      try {
        const stored = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            dispatch(setItemBomRoutingForm(parsed));
          }
        }
      } catch (err) {
        console.error("Failed to restore routing form from session", err);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const payload = {
      selectedBomId,
      producedItem,
      itemReleaseFlag,
      location,
      selectedResource,
      resourceRelevancy,
      routingPriority,
      addConnectedCoProduct,
      coProductRows,
    };

    dispatch(setItemBomRoutingForm(payload));
    sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(payload));
  }, [
    dispatch,
    selectedBomId,
    producedItem,
    itemReleaseFlag,
    location,
    selectedResource,
    resourceRelevancy,
    routingPriority,
    addConnectedCoProduct,
    coProductRows,
  ]);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const hasReduxFormValues =
      Boolean(persistedForm?.selectedBomId) ||
      Boolean(persistedForm?.producedItem) ||
      Boolean(persistedForm?.itemReleaseFlag) ||
      Boolean(persistedForm?.location) ||
      Boolean(persistedForm?.selectedResource) ||
      Boolean(persistedForm?.resourceRelevancy) ||
      Boolean(persistedForm?.routingPriority) ||
      Boolean(persistedForm?.addConnectedCoProduct) ||
      (Array.isArray(persistedForm?.coProductRows) && persistedForm.coProductRows.length > 0);

    if (hasReduxFormValues) {
      return;
    }

    try {
      const stored = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") return;

      setSelectedBomId(parsed.selectedBomId ?? "");
      setProducedItem(parsed.producedItem ?? "");
      setItemReleaseFlag(parsed.itemReleaseFlag ?? "");
      setLocation(parsed.location ?? "");
      setSelectedResource(parsed.selectedResource ?? "");
      setResourceRelevancy(parsed.resourceRelevancy ?? "");
      setRoutingPriority(parsed.routingPriority ?? "");
      setAddConnectedCoProduct(parsed.addConnectedCoProduct ?? false);
      setCoProductRows(
        Array.isArray(parsed.coProductRows) && parsed.coProductRows.length > 0
          ? parsed.coProductRows
          : [createCoProductRow()]
      );
      dispatch(setItemBomRoutingForm(parsed));
    } catch (err) {
      console.error("Failed to restore routing form from session", err);
    }
  }, [dispatch, persistedForm]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading((prev) => ({ ...prev, initial: true }));
        setError("");

        const [bomRes, resourceRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/tables/bom-routing-step1/bom-ids`),
          fetch(`${API_BASE_URL}/api/bigquery/table/bom-routing-step1/resources`),
        ]);

        const bomJson = await bomRes.json();
        const resourceJson = await resourceRes.json();

        if (!bomRes.ok) {
          throw new Error(bomJson?.details || bomJson?.error || "Failed to fetch BOM IDs");
        }
        if (!resourceRes.ok) {
          throw new Error(
            resourceJson?.details || resourceJson?.error || "Failed to fetch resources"
          );
        }

        setBomOptions(Array.isArray(bomJson.data) ? bomJson.data : []);
        setResourceOptions(Array.isArray(resourceJson.data) ? resourceJson.data : []);
      } catch (err) {
        setError(err.message || "Failed to load page data");
      } finally {
        setLoading((prev) => ({ ...prev, initial: false }));
      }
    };

    loadInitialData();
  }, []);

  const loadItemReleaseFlag = async (item) => {
    if (!item) {
      setItemReleaseFlag("");
      return "";
    }

    try {
      setLoading((prev) => ({ ...prev, itemReleaseFlag: true }));
      const res = await fetch(
        `${API_BASE_URL}/api/bigquery/table/bom-routing-step1/item-releaseflag/${encodeURIComponent(item)}`
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.details || json?.error || "Failed to fetch item release flag");
      }

      const releaseFlag =
        json?.data?.release ||
        json?.data?.item_releaseflag ||
        json?.data?.releaseFlag ||
        "";

      setItemReleaseFlag(releaseFlag || "");
      return releaseFlag || "";
    } catch (err) {
      setItemReleaseFlag("");
      setError(err.message || "Failed to fetch item release flag");
      return "";
    } finally {
      setLoading((prev) => ({ ...prev, itemReleaseFlag: false }));
    }
  };

  const loadCoProducts = async (bomId) => {
    if (!bomId) {
      setCoProductOptions([]);
      setCoProductRows([createCoProductRow()]);
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, coProducts: true }));
      setError("");

      const res = await fetch(
        `${API_BASE_URL}/api/bigquery/table/bom-routing-step1/co-products/${encodeURIComponent(bomId)}`
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.details || json?.error || "Failed to fetch co-products");
      }

      const options = Array.isArray(json.data) ? json.data : [];
      setCoProductOptions(options);
      setCoProductRows([createCoProductRow()]);
    } catch (err) {
      setCoProductOptions([]);
      setCoProductRows([createCoProductRow()]);
      setError(err.message || "Failed to fetch co-products");
    } finally {
      setLoading((prev) => ({ ...prev, coProducts: false }));
    }
  };

  useEffect(() => {
    const loadBomDetails = async () => {
      if (!selectedBomId) {
        setProducedItem("");
        setItemReleaseFlag("");
        setLocation("");
        setCoProductOptions([]);
        setCoProductRows([createCoProductRow()]);
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, bomDetails: true }));
        setError("");

        const selectedBom = bomOptions.find(
          (opt) => String(opt.bomId || "").trim() === String(selectedBomId || "").trim()
        );

        const derived = deriveItemAndLocationFromBomId(selectedBomId);

        const finalProducedItem =
          selectedBom?.producedItem ||
          selectedBom?.item ||
          derived.item ||
          "";

        const finalLocation =
          selectedBom?.location ||
          derived.location ||
          "";

        setProducedItem(finalProducedItem);
        setLocation(finalLocation);

        if (finalProducedItem) {
          await loadItemReleaseFlag(finalProducedItem);
        } else {
          setItemReleaseFlag("");
        }

        if (addConnectedCoProduct) {
          await loadCoProducts(selectedBomId);
        } else {
          setCoProductOptions([]);
          setCoProductRows([createCoProductRow()]);
        }
      } catch (err) {
        setProducedItem("");
        setItemReleaseFlag("");
        setLocation("");
        setCoProductOptions([]);
        setCoProductRows([createCoProductRow()]);
        setError(err.message || "Failed to load BOM details");
      } finally {
        setLoading((prev) => ({ ...prev, bomDetails: false }));
      }
    };

    loadBomDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBomId, bomOptions]);

  useEffect(() => {
    const loadResourceRelevancy = async () => {
      if (!selectedResource) {
        setResourceRelevancy("");
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, resourceRelevancy: true }));
        setError("");
        const res = await fetch(
          `${API_BASE_URL}/api/bigquery/table/bom-routing-step1/resource-relevancy/${encodeURIComponent(
            selectedResource
          )}`
        );
        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json?.details || json?.error || "Failed to fetch resource relevancy"
          );
        }

        setResourceRelevancy(json?.data?.resourcePlanningRelevance || "");
      } catch (err) {
        setResourceRelevancy("");
        setError(err.message || "Failed to fetch resource relevancy");
      } finally {
        setLoading((prev) => ({ ...prev, resourceRelevancy: false }));
      }
    };

    loadResourceRelevancy();
  }, [selectedResource]);

  const handleCoProductToggle = async (checked) => {
    setAddConnectedCoProduct(checked);

    if (!checked) {
      setCoProductOptions([]);
      setCoProductRows([createCoProductRow()]);
      return;
    }

    if (selectedBomId) {
      await loadCoProducts(selectedBomId);
    }
  };

  const handleCoProductItemChange = (rowId, itemValue) => {
    const matched = coProductOptions.find((option) => option.item === itemValue);

    setCoProductRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
            ...row,
            coProductItem: itemValue,
            itemDescription: matched?.description || "",
          }
          : row
      )
    );
  };
  const isQtyProducedInvalid = (qtyProduced) => {
    if (String(qtyProduced || "").trim() === "") return false;

    const qty = Number(qtyProduced);
    return Number.isNaN(qty) || qty >= 1;
  };
  const handleCoProductQtyChange = (rowId, qtyProduced) => {
    setCoProductRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
            ...row,
            qtyProduced,
          }
          : row
      )
    );
  };

  const handleAddCoProductRow = () => {
    setCoProductRows((prev) => [...prev, createCoProductRow()]);
  };

  const handleRemoveCoProductRow = (rowId) => {
    setCoProductRows((prev) => {
      const filtered = prev.filter((row) => row.id !== rowId);
      return filtered.length ? filtered : [createCoProductRow()];
    });
  };

  const handleNext = () => {
    if (!canProceed) return;

    const coProducts = addConnectedCoProduct
      ? validCoProductRows.map((row) => ({
        coProductItem: row.coProductItem,
        itemDescription: row.itemDescription,
        qtyProduced: row.qtyProduced,
      }))
      : [];

    navigate("/review-summary", {
      state: {
        bomId: selectedBomId,
        producedItem,
        itemReleaseFlag,
        location,
        resource: selectedResource,
        resourceRelevancy,
        routingPriority,
        routingId,
        addConnectedCoProduct,
        coProductItem: coProducts[0]?.coProductItem || "",
        coProducts,
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.contentWrapper}>
        <div style={styles.backRow} onClick={() => navigate(-1)}>
          <IoIosArrowBack />
          <span style={styles.backText}>BACK</span>
        </div>

        <h2 style={styles.title}>Step 1: Create Item BOM Routing Record</h2>
        <p style={styles.subtitle}>Enter routing record details</p>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        <div style={styles.card}>
          <div style={styles.fieldBlock}>
            <label style={styles.label}>BOM ID *</label>
            <div style={styles.selectWrap}>
              <select
                value={selectedBomId}
                onChange={(e) => setSelectedBomId(e.target.value)}
                style={styles.select}
                disabled={loading.initial}
              >
                <option value="">
                  {loading.initial ? "Loading BOM IDs..." : "Select BOM ID"}
                </option>
                {bomOptions.map((opt) => (
                  <option key={opt.bomId} value={opt.bomId}>
                    {opt.bomId}
                  </option>
                ))}
              </select>
              <IoIosArrowDown style={styles.selectIcon} />
            </div>
          </div>

          <div style={styles.fieldBlock}>
            <input
              value={loading.bomDetails ? "Loading..." : producedItem}
              readOnly
              placeholder="Produced Item"
              style={styles.inputDisabled}
            />
          </div>

          <div style={styles.fieldBlock}>
            <input
              value={
                loading.bomDetails || loading.itemReleaseFlag
                  ? "Loading..."
                  : itemReleaseFlag
              }
              readOnly
              placeholder="Item Release Flag"
              style={styles.inputDisabled}
            />
          </div>

          <div style={styles.fieldBlock}>
            <label style={styles.label}>Resource *</label>
            <div style={styles.resourceWrap}>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                style={styles.resourceSelect}
                disabled={loading.initial}
              >
                <option value="">
                  {loading.initial ? "Loading Resources..." : "Select Resource"}
                </option>
                {resourceOptions.map((opt) => (
                  <option key={opt.resource} value={opt.resource}>
                    {opt.resource}
                  </option>
                ))}
              </select>
              <div style={styles.resourceRightIcons}>
                {selectedResource ? (
                  <IoMdClose
                    style={styles.clearIcon}
                    onClick={() => setSelectedResource("")}
                  />
                ) : null}
                <IoIosArrowDown style={styles.selectIconStatic} />
              </div>
            </div>
          </div>

          <div style={styles.fieldBlock}>
            <label style={styles.label}>Item BOM Routing Priority *</label>
            <input
              type="number"
              min="1"
              value={routingPriority}
              onChange={(e) => setRoutingPriority(e.target.value)}
              placeholder="Enter Routing Priority"
              style={styles.input}
            />
            <div style={styles.helperText}>
              Enter routing priority for this Resource / Routing ID
            </div>
          </div>

          <div style={styles.fieldBlock}>
            <input
              value={loading.resourceRelevancy ? "Loading..." : resourceRelevancy}
              readOnly
              placeholder="Resource Relevancy"
              style={styles.inputDisabled}
            />
          </div>

          <div style={styles.fieldBlock}>
            <input
              value={routingId}
              readOnly
              placeholder="Routing ID"
              style={styles.inputDisabled}
            />
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={addConnectedCoProduct}
              onChange={(e) => handleCoProductToggle(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxLabel}>Add Connected Co-Product</span>
          </label>

          {addConnectedCoProduct && (
            <div style={styles.coProductCard}>
              <div style={styles.coProductHeader}>
                <div style={styles.coProductTitle}>Co-Products</div>
                <button
                  type="button"
                  style={styles.addCoProductButton}
                  onClick={handleAddCoProductRow}
                >
                  + ADD CO-PRODUCT
                </button>
              </div>

              <div style={styles.coProductGridHeader}>
                <div style={styles.gridHeaderCell}>Co-Product Item</div>
                <div style={styles.gridHeaderCell}>Item Description</div>
                <div style={styles.gridHeaderCell}>Qty Produced*</div>
                <div style={styles.gridActionHeader}></div>
              </div>

              {coProductRows.map((row) => (
                <div key={row.id} style={styles.coProductGridRow}>
                  <div style={styles.coProductCell}>
                    <div style={styles.selectWrap}>
                      <select
                        value={row.coProductItem}
                        onChange={(e) => handleCoProductItemChange(row.id, e.target.value)}
                        style={styles.select}
                        disabled={loading.coProducts || !selectedBomId}
                      >
                        <option value="">
                          {loading.coProducts
                            ? "Loading Co-Products..."
                            : "Co-Product Item"}
                        </option>
                        {coProductOptions.map((opt) => (
                          <option key={opt.item} value={opt.item}>
                            {opt.item}
                          </option>
                        ))}
                      </select>
                      <IoIosArrowDown style={styles.selectIcon} />
                    </div>
                  </div>

                  <div style={styles.coProductCell}>
                    <input
                      value={row.itemDescription}
                      readOnly
                      placeholder="Description"
                      style={styles.inputDisabled}
                    />
                  </div>

                  <div style={styles.coProductCell}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.qtyProduced}
                      onChange={(e) => handleCoProductQtyChange(row.id, e.target.value)}
                      placeholder="Qty Produced"
                      style={{
                        ...styles.input,
                        borderColor: isQtyProducedInvalid(row.qtyProduced) ? "#dc2626" : "#c7c7c7",
                      }}
                    />

                    {isQtyProducedInvalid(row.qtyProduced) ? (
                      <div style={styles.qtyWarningText}>
                        Qty Produced should always be less than 1
                      </div>
                    ) : null}
                  </div>

                  <div style={styles.coProductDeleteCell}>
                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => handleRemoveCoProductRow(row.id)}
                      aria-label="Delete co-product row"
                    >
                      <IoMdTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={{
              ...styles.nextButton,
              opacity: canProceed ? 1 : 0.6,
              cursor: canProceed ? "pointer" : "not-allowed",
            }}
            disabled={!canProceed}
            onClick={handleNext}
          >
            NEXT: REVIEW SUMMARY <span style={styles.arrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateItemBOMRoutingRecord;

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    padding: "24px 0 36px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  contentWrapper: {
    width: "100%",
    maxWidth: "860px",
  },
  backRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "12px",
    userSelect: "none",
    fontSize: "15px",
    fontWeight: 500,
  },
  backText: {
    letterSpacing: "0.2px",
  },
  title: {
    margin: "0",
    fontSize: "32px",
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    margin: "8px 0 24px",
    fontSize: "16px",
    color: "#6b7280",
  },
  errorBox: {
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "6px",
    backgroundColor: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "14px",
  },
  card: {
    maxWidth: "860px",
    backgroundColor: "#f7f7f7",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "24px",
    boxSizing: "border-box",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  fieldBlock: {
    marginBottom: "14px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    marginBottom: "8px",
    fontWeight: 500,
  },
  selectWrap: {
    position: "relative",
    width: "100%",
  },
  select: {
    width: "100%",
    height: "42px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    backgroundColor: "#fff",
    padding: "0 40px 0 14px",
    fontSize: "16px",
    appearance: "none",
    outline: "none",
    boxSizing: "border-box",
  },
  selectIcon: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7a7a7a",
    pointerEvents: "none",
  },
  inputDisabled: {
    width: "100%",
    height: "42px",
    borderRadius: "4px",
    border: "1px solid #cfcfcf",
    backgroundColor: "#fff",
    padding: "0 14px",
    fontSize: "16px",
    color: "#6b7280",
    boxSizing: "border-box",
    outline: "none",
  },
  input: {
    width: "100%",
    height: "42px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    backgroundColor: "#fff",
    padding: "0 14px",
    fontSize: "16px",
    color: "#111827",
    boxSizing: "border-box",
    outline: "none",
  },
  helperText: {
    marginTop: "6px",
    marginLeft: "14px",
    fontSize: "13px",
    color: "#9ca3af",
  },
  resourceWrap: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #111827",
    borderRadius: "4px",
    backgroundColor: "#fff",
    height: "56px",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  resourceSelect: {
    flex: 1,
    height: "100%",
    border: "none",
    backgroundColor: "transparent",
    padding: "0 14px",
    fontSize: "16px",
    appearance: "none",
    outline: "none",
  },
  resourceRightIcons: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingRight: "14px",
    color: "#6b7280",
  },
  clearIcon: {
    cursor: "pointer",
  },
  selectIconStatic: {
    color: "#6b7280",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "8px",
    cursor: "pointer",
    userSelect: "none",
    marginBottom: "8px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    margin: 0,
    accentColor: "#2563eb",
  },
  checkboxLabel: {
    fontSize: "15px",
    color: "#111827",
  },
  coProductCard: {
    marginTop: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    backgroundColor: "#eef2f7",
    padding: "14px 14px 10px",
  },
  coProductHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  coProductTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
  },
  addCoProductButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  coProductGridHeader: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.2fr 0.65fr 44px",
    gap: "10px",
    marginBottom: "8px",
    alignItems: "center",
  },
  gridHeaderCell: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#111827",
  },
  gridActionHeader: {},
  coProductGridRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.2fr 0.65fr 44px",
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
  },
  coProductCell: {
    minWidth: 0,
  },
  coProductDeleteCell: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    border: "none",
    background: "transparent",
    color: "#dc2626",
    fontSize: "26px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  footer: {
    width: "100%",
    maxWidth: "860px",
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "24px",
  },
  nextButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "12px 18px",
    fontSize: "15px",
    fontWeight: 500,
  },
  arrow: {
    fontSize: "18px",
    lineHeight: 1,
  },
};
