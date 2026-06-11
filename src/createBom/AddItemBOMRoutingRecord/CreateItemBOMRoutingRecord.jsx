import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosArrowBack, IoIosArrowDown, IoMdClose } from "react-icons/io";

const API_BASE_URL = "http://localhost:3000";

const CreateItemBOMRoutingRecord = () => {
  const navigate = useNavigate();

  const [bomOptions, setBomOptions] = useState([]);
  const [resourceOptions, setResourceOptions] = useState([]);
  const [coProductOptions, setCoProductOptions] = useState([]);

  const [selectedBomId, setSelectedBomId] = useState("");
  const [producedItem, setProducedItem] = useState("");
  const [itemReleaseFlag, setItemReleaseFlag] = useState("");
  const [location, setLocation] = useState("");

  const [selectedResource, setSelectedResource] = useState("");
  const [resourceRelevancy, setResourceRelevancy] = useState("");

  const [routingPriority, setRoutingPriority] = useState("");

  const [addConnectedCoProduct, setAddConnectedCoProduct] = useState(false);
  const [coProductItem, setCoProductItem] = useState("");

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

  const canProceed =
    !!selectedBomId &&
    !!selectedResource &&
    !!routingPriority &&
    (!addConnectedCoProduct || !!coProductItem);

  const deriveItemAndLocationFromBomId = (bomId) => {
    const value = String(bomId || "").trim();
    if (!value) {
      return {
        item: "",
        location: "",
      };
    }

    const parts = value.split("_").map((p) => p.trim()).filter(Boolean);

    if (parts.length < 3) {
      return {
        item: "",
        location: "",
      };
    }

    return {
      item: parts[1] || "",
      location: parts.slice(2).join("_") || "",
    };
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading((prev) => ({ ...prev, initial: true }));
        setError("");

        const [bomRes, resourceRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/bigquery/table/bom-routing-step1/bom-ids`),
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
        throw new Error(
          json?.details || json?.error || "Failed to fetch item release flag"
        );
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
      setCoProductItem("");
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

      setCoProductOptions(Array.isArray(json.data) ? json.data : []);
      setCoProductItem("");
    } catch (err) {
      setCoProductOptions([]);
      setCoProductItem("");
      setError(err.message || "Failed to fetch co-products");
    } finally {
      setLoading((prev) => ({ ...prev, coProducts: false }));
    }
  };
  ``

  useEffect(() => {
    const loadBomDetails = async () => {
      if (!selectedBomId) {
        setProducedItem("");
        setItemReleaseFlag("");
        setLocation("");
        setCoProductOptions([]);
        setCoProductItem("");
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, bomDetails: true }));
        setError("");

        const derived = deriveItemAndLocationFromBomId(selectedBomId);

        // Get location / any additional bom detail if backend already supports it
        const res = await fetch(
          `${API_BASE_URL}/api/bigquery/table/bom-routing-step1/bom-details/${encodeURIComponent(selectedBomId)}`
        );
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.details || json?.error || "Failed to fetch BOM details");
        }

        const data = json?.data || {};

        const finalProducedItem = data.producedItem || derived.item || "";
        const finalLocation = data.location || derived.location || "";

        setProducedItem(finalProducedItem);
        setLocation(finalLocation);

        // Prefer dedicated item_releaseflag fetch from GCP table using derived item
        if (finalProducedItem) {
          const releaseFlag =
            (await loadItemReleaseFlag(finalProducedItem)) ||
            data.itemReleaseFlag ||
            "";

          if (!releaseFlag && data.itemReleaseFlag) {
            setItemReleaseFlag(data.itemReleaseFlag);
          }
        } else {
          setItemReleaseFlag(data.itemReleaseFlag || "");
        }

        // Fetch co-products for this item when checkbox is enabled

        if (addConnectedCoProduct && selectedBomId) {
          await loadCoProducts(selectedBomId);
        } else {
          setCoProductOptions([]);
          setCoProductItem("");
        }

      } catch (err) {
        setProducedItem("");
        setItemReleaseFlag("");
        setLocation("");
        setCoProductOptions([]);
        setCoProductItem("");
        setError(err.message || "Failed to fetch BOM details");
      } finally {
        setLoading((prev) => ({ ...prev, bomDetails: false }));
      }
    };

    loadBomDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBomId]);

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
      setCoProductItem("");
      return;
    }

    if (selectedBomId) {
      await loadCoProducts(selectedBomId);
    }

  };

  const handleNext = () => {
    if (!canProceed) return;

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
        coProductItem: addConnectedCoProduct ? coProductItem : "",
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.contentWrapper}>
        {/* Back */}
        <div style={styles.backRow} onClick={() => navigate(-1)}>
          <IoIosArrowBack />
          <span style={styles.backText}>BACK</span>
        </div>

        {/* Header */}
        <h2 style={styles.title}>Step 1: Create Item BOM Routing Record</h2>
        <p style={styles.subtitle}>Enter routing record details</p>

        {/* Error */}
        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {/* Main card */}
        <div style={styles.card}>
          {/* BOM ID */}
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

          {/* Produced Item */}
          <div style={styles.fieldBlock}>
            <input
              value={loading.bomDetails ? "Loading..." : producedItem}
              readOnly
              placeholder="Produced Item"
              style={styles.inputDisabled}
            />
          </div>

          {/* Item Release Flag */}
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

          {/* Resource */}
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

          {/* Item BOM Routing Priority */}
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

          {/* Resource Relevancy */}
          <div style={styles.fieldBlock}>
            <input
              value={loading.resourceRelevancy ? "Loading..." : resourceRelevancy}
              readOnly
              placeholder="Resource Relevancy"
              style={styles.inputDisabled}
            />
          </div>

          {/* Routing ID */}
          <div style={styles.fieldBlock}>
            <input
              value={routingId}
              readOnly
              placeholder="Routing ID"
              style={styles.inputDisabled}
            />
          </div>

          {/* Checkbox */}
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
            <div style={styles.fieldBlock}>
              <label style={styles.label}>Co-Product Item Number *</label>
              <div style={styles.resourceWrap}>
                <select
                  value={coProductItem}
                  onChange={(e) => setCoProductItem(e.target.value)}
                  style={styles.resourceSelect}
                  disabled={loading.coProducts || !producedItem}
                >
                  <option value="">
                    {loading.coProducts
                      ? "Loading Co-Products..."
                      : "Select Co-Product Item"}
                  </option>

                  {coProductOptions.map((opt) => (
                    <option key={opt.item} value={opt.item}>
                      {opt.item}
                    </option>
                  ))}
                </select>

                <div style={styles.resourceRightIcons}>
                  {coProductItem ? (
                    <IoMdClose
                      style={styles.clearIcon}
                      onClick={() => setCoProductItem("")}
                    />
                  ) : null}
                  <IoIosArrowDown style={styles.selectIconStatic} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
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
  },
  select: {
    width: "100%",
    height: "56px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    backgroundColor: "#fff",
    padding: "0 44px 0 14px",
    fontSize: "16px",
    appearance: "none",
    outline: "none",
    boxSizing: "border-box",
  },
  selectIcon: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7a7a7a",
    pointerEvents: "none",
  },
  inputDisabled: {
    width: "100%",
    height: "56px",
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
    height: "56px",
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