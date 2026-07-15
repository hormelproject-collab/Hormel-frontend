import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResourcesLazyOptions,
  selectItemBomRoutingCreateState,
  setItemBomRoutingCreateState,
} from "../../redux/bomSlice";
import { IoIosArrowBack, IoIosArrowDown, IoMdTrash } from "react-icons/io";

const PAGE_SIZE = 50;

const createCoProductRow = () => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  coProductItem: "",
  itemDescription: "",
  qtyProduced: "",
});

const parseBomIdParts = (bomId = "") => {
  const parts = String(bomId || "").trim().split("_").filter(Boolean);
  if (parts.length < 3) {
    return { bomVersion: "", producedItem: "", location: "" };
  }

  return {
    bomVersion: parts[0] || "",
    producedItem: parts[1] || "",
    location: parts.slice(2).join("_") || "",
  };
};

const getResourceRelevancyFromRow = (row = {}) =>
  row.resourcePlanningRelevance ??
  row.resourceRelevancy ??
  row.resource_relevancy ??
  row.resource_planning_relevance ??
  "";

const dedupeRowsByKey = (rows = [], getKey) => {
  const seen = new Set();
  const result = [];

  rows.forEach((row) => {
    const key = String(getKey(row) ?? "").trim();
    if (!key) return;
    const normalizedKey = key.toUpperCase();
    if (seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    result.push(row);
  });

  return result;
};

const LazyDropdown = ({
  label = "",
  placeholder = "Select",
  value = "",
  displayValue = "",
  fetchUrl,
  loadOptions,
  getOptionKey,
  getOptionLabel,
  onSelect,
  disabled = false,
  searchPlaceholder = "Search...",
  minWidth = "100%",
}) => {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRows = async ({ nextPage = 1, append = false, searchText = search } = {}) => {
    if (!fetchUrl && !loadOptions) return;

    try {
      setLoading(true);
      setError("");

      let data = [];
      let pagination = {};

      if (loadOptions) {
        const result = await loadOptions({
          page: nextPage,
          pageSize: PAGE_SIZE,
          search: String(searchText || "").trim(),
          append,
        });
        data = Array.isArray(result?.data) ? result.data : [];
        pagination = result?.pagination || {};
      } else {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("search", String(searchText || "").trim());

        const res = await fetch(`${fetchUrl}?${params.toString()}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.details || json?.error || "Failed to fetch dropdown data");
        }

        data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        pagination = json?.pagination || {};
      }

      setRows((prev) => {
        const nextRows = append ? [...prev, ...data] : data;
        return dedupeRowsByKey(nextRows, getOptionKey);
      });
      setPage(Number(pagination.page || nextPage));
      setHasNext(Boolean(pagination.hasNext));
    } catch (err) {
      setError(err?.message || "Failed to fetch dropdown data");
      if (!append) setRows([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (disabled) return;

    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      await loadRows({ nextPage: 1, append: false, searchText: search });
    }
  };

  const handleSearchChange = async (e) => {
    const text = e.target.value;
    setSearch(text);
    setPage(1);
    await loadRows({ nextPage: 1, append: false, searchText: text });
  };

  const handleLoadMore = async (e) => {
    e.stopPropagation();
    if (!hasNext || loading) return;
    await loadRows({ nextPage: page + 1, append: true, searchText: search });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setRows([]);
    setSearch("");
    setPage(1);
    setHasNext(false);
    setError("");
  }, [fetchUrl, loadOptions]);

  return (
    <div ref={wrapperRef} style={{ ...styles.lazyDropdownBlock, minWidth }}>
      {label ? <label style={styles.label}>{label}</label> : null}

      <div
        style={{
          ...styles.lazyDropdownControl,
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={handleOpen}
      >
        <span style={value ? styles.lazyDropdownValue : styles.lazyDropdownPlaceholder}>
          {displayValue || placeholder}
        </span>
        <IoIosArrowDown style={styles.selectIconStatic} />
      </div>

      {open && !disabled ? (
        <div style={styles.lazyDropdownMenu} onClick={(e) => e.stopPropagation()}>
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            style={styles.lazyDropdownSearch}
            autoFocus
          />

          <div style={styles.lazyDropdownList}>
            {rows.map((opt) => {
              const key = getOptionKey(opt);
              return (
                <div
                  key={key}
                  style={styles.lazyDropdownOption}
                  onClick={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                >
                  {getOptionLabel(opt)}
                </div>
              );
            })}

            {!loading && rows.length === 0 ? (
              <div style={styles.lazyDropdownEmpty}>No records found</div>
            ) : null}

            {loading ? <div style={styles.lazyDropdownEmpty}>Loading...</div> : null}
            {error ? <div style={styles.lazyDropdownError}>{error}</div> : null}
          </div>

          {hasNext ? (
            <button
              type="button"
              style={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const CreateItemBOMRoutingRecord = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const savedCreateState = useSelector(selectItemBomRoutingCreateState);

  const [selectedBomId, setSelectedBomId] = useState(savedCreateState?.bomId || "");
  const [producedItem, setProducedItem] = useState(savedCreateState?.producedItem || "");
  const [itemReleaseFlag, setItemReleaseFlag] = useState(savedCreateState?.itemReleaseFlag || "");
  const [location, setLocation] = useState(savedCreateState?.location || "");
  const [selectedResource, setSelectedResource] = useState(savedCreateState?.resource || "");
  const [resourceRelevancy, setResourceRelevancy] = useState(savedCreateState?.resourceRelevancy || "");
  const [routingPriority, setRoutingPriority] = useState(savedCreateState?.routingPriority || "");
  const [addConnectedCoProduct, setAddConnectedCoProduct] = useState(!!savedCreateState?.addConnectedCoProduct);
  const [coProductRows, setCoProductRows] = useState(() => {
    const savedRows = Array.isArray(savedCreateState?.coProducts)
      ? savedCreateState.coProducts
      : [];

    return savedRows.length
      ? savedRows.map((row) => ({
        id: row.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        coProductItem: row.coProductItem || "",
        itemDescription: row.itemDescription || "",
        qtyProduced: row.qtyProduced || "",
      }))
      : [createCoProductRow()];
  });

  const [loading, setLoading] = useState({
    bomDetails: false,
    itemReleaseFlag: false,
    resourceRelevancy: false,
  });
  const [error, setError] = useState("");

  const parsedBom = useMemo(() => parseBomIdParts(selectedBomId), [selectedBomId]);
  const resourceFetchKey = useMemo(
    () => `${producedItem || parsedBom.producedItem}__${location || parsedBom.location}`,
    [producedItem, location, parsedBom.producedItem, parsedBom.location]
  );

  const routingId = useMemo(() => {
    if (!producedItem || !selectedResource) return "";
    return `ROUTING_${String(producedItem ?? "").trim()}_${String(selectedResource ?? "").trim()}`;
  }, [producedItem, selectedResource]);

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

  useEffect(() => {
    dispatch(
      setItemBomRoutingCreateState({
        bomId: selectedBomId,
        producedItem,
        itemReleaseFlag,
        location,
        resource: selectedResource,
        resourceRelevancy,
        routingPriority,
        routingId,
        addConnectedCoProduct,
        coProductItem: validCoProductRows[0]?.coProductItem || "",
        coProducts: validCoProductRows.map((row) => ({
          id: row.id,
          coProductItem: row.coProductItem || "",
          itemDescription: row.itemDescription || "",
          qtyProduced: row.qtyProduced || "",
        })),
      })
    );
  }, [
    dispatch,
    selectedBomId,
    producedItem,
    itemReleaseFlag,
    location,
    selectedResource,
    resourceRelevancy,
    routingPriority,
    routingId,
    addConnectedCoProduct,
    validCoProductRows,
  ]);

  const loadItemReleaseFlag = async (item) => {
    if (!item) {
      setItemReleaseFlag("");
      return "";
    }

    try {
      setLoading((prev) => ({ ...prev, itemReleaseFlag: true }));
      const res = await fetch(
        `/api/bigquery/table/bom-routing-step1/item-releaseflag/${encodeURIComponent(item)}`
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.details || json?.error || "Failed to fetch item release flag");
      }

      const releaseFlag =
        json?.data?.release ||
        json?.data?.item_releaseflag ||
        json?.data?.itemReleaseFlag ||
        json?.data?.releaseFlag ||
        "";

      setItemReleaseFlag(releaseFlag || "");
      return releaseFlag || "";
    } catch (err) {
      setItemReleaseFlag("");
      setError(err?.message || "Failed to fetch item release flag");
      return "";
    } finally {
      setLoading((prev) => ({ ...prev, itemReleaseFlag: false }));
    }
  };

  const loadResourcesByBomIdParts = async ({ page = 1, pageSize = PAGE_SIZE, search = "", append = false } = {}) => {
    const producedItemForFetch = producedItem || parsedBom.producedItem;
    const locationForFetch = location || parsedBom.location;

    if (!producedItemForFetch || !locationForFetch) {
      return {
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 1, hasNext: false },
      };
    }

    const resultAction = await dispatch(
      fetchResourcesLazyOptions({
        key: `${producedItemForFetch}__${locationForFetch}`,
        producedItem: producedItemForFetch,
        location: locationForFetch,
        search,
        page,
        pageSize,
        append,
      })
    );

    if (!fetchResourcesLazyOptions.fulfilled.match(resultAction)) {
      throw new Error(resultAction.payload || "Failed to fetch resources");
    }

    return {
      data: resultAction.payload?.rows || resultAction.payload?.data || [],
      pagination: resultAction.payload?.pagination || {},
    };
  };

  useEffect(() => {
    const loadBomDetails = async () => {
      const shouldPreserveSavedCoProducts =
        selectedBomId === String(savedCreateState?.bomId || "") &&
        Array.isArray(savedCreateState?.coProducts) &&
        savedCreateState.coProducts.length > 0;

      if (!selectedBomId) {
        setProducedItem("");
        setItemReleaseFlag("");
        setLocation("");
        setSelectedResource("");
        setResourceRelevancy("");
        setCoProductRows([createCoProductRow()]);
        return;
      }

      const parsed = parseBomIdParts(selectedBomId);

      if (parsed.producedItem) {
        setProducedItem(parsed.producedItem);
      }
      if (parsed.location) {
        setLocation(parsed.location);
      }

      setSelectedResource("");
      setResourceRelevancy("");

      try {
        setLoading((prev) => ({ ...prev, bomDetails: true }));
        setError("");

        const res = await fetch(
          `/api/bigquery/table/bom-routing-step1/bom-details/${encodeURIComponent(selectedBomId)}`
        );
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.details || json?.error || "Failed to fetch BOM details");
        }

        const data = json?.data || {};
        const finalProducedItem = data.producedItem || data.item || parsed.producedItem || "";
        const finalLocation = data.location || parsed.location || "";
        const finalReleaseFlag = data.itemReleaseFlag || data.item_release_flag || "";

        setProducedItem(finalProducedItem);
        setLocation(finalLocation);

        if (finalReleaseFlag) {
          setItemReleaseFlag(finalReleaseFlag);
        } else if (finalProducedItem) {
          await loadItemReleaseFlag(finalProducedItem);
        } else {
          setItemReleaseFlag("");
        }

        if (!shouldPreserveSavedCoProducts) {
          setCoProductRows([createCoProductRow()]);
        }
      } catch (err) {
        setProducedItem(parsed.producedItem || "");
        setItemReleaseFlag("");
        setLocation(parsed.location || "");
        if (!shouldPreserveSavedCoProducts) {
          setCoProductRows([createCoProductRow()]);
        }
        setError(err?.message || "Failed to load BOM details");
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

        const result = await loadResourcesByBomIdParts({ page: 1, pageSize: PAGE_SIZE, search: selectedResource });
        const matched = (result.data || []).find(
          (row) => String(row?.resource ?? "").trim().toUpperCase() === String(selectedResource).trim().toUpperCase()
        );

        setResourceRelevancy(getResourceRelevancyFromRow(matched || {}));
      } catch (err) {
        setResourceRelevancy("");
        setError(err?.message || "Failed to fetch resource relevancy");
      } finally {
        setLoading((prev) => ({ ...prev, resourceRelevancy: false }));
      }
    };

    loadResourceRelevancy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResource, resourceFetchKey]);

  const handleCoProductToggle = (checked) => {
    setAddConnectedCoProduct(checked);
    setCoProductRows([createCoProductRow()]);
  };

  const isQtyProducedInvalid = (qtyProduced) => {
    if (String(qtyProduced || "").trim() === "") return false;
    const qty = Number(qtyProduced);
    return Number.isNaN(qty) || qty >= 1;
  };

  const handleCoProductQtyChange = (rowId, qtyProduced) => {
    setCoProductRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, qtyProduced } : row))
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

    setError("");

    const coProducts = addConnectedCoProduct
      ? validCoProductRows.map((row) => ({
        id: row.id,
        coProductItem: row.coProductItem,
        itemDescription: row.itemDescription,
        qtyProduced: row.qtyProduced,
      }))
      : [];

    const summaryState = {
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
    };

    dispatch(setItemBomRoutingCreateState(summaryState));

    navigate("/review-summary", {
      state: summaryState,
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
            <LazyDropdown
              label="BOM ID *"
              placeholder="Select BOM ID"
              value={selectedBomId}
              displayValue={selectedBomId}
              fetchUrl="/api/bigquery/table/bom-routing-step1/bom-ids-lazy"
              getOptionKey={(opt) => opt.bomId}
              getOptionLabel={(opt) => opt.bomId}
              onSelect={(opt) => {
                const nextBomId = opt.bomId || "";
                const parsed = parseBomIdParts(nextBomId);
                setSelectedBomId(nextBomId);
                setProducedItem(parsed.producedItem || "");
                setLocation(parsed.location || "");
                setSelectedResource("");
                setResourceRelevancy("");
              }}
              searchPlaceholder="Search BOM ID..."
            />
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
              value={loading.bomDetails || loading.itemReleaseFlag ? "Loading..." : itemReleaseFlag}
              readOnly
              placeholder="Item Release Flag"
              style={styles.inputDisabled}
            />
          </div>

          <div style={styles.fieldBlock}>
            <LazyDropdown
              label="Resource *"
              placeholder={producedItem && location ? "Select Resource" : "Select BOM ID first"}
              value={selectedResource}
              displayValue={selectedResource}
              loadOptions={loadResourcesByBomIdParts}
              disabled={!producedItem || !location}
              getOptionKey={(opt) => opt.resource}
              getOptionLabel={(opt) => opt.resource}
              onSelect={(opt) => {
                setSelectedResource(opt.resource);
                setResourceRelevancy(getResourceRelevancyFromRow(opt));
              }}
              searchPlaceholder="Search Resource..."
            />
          </div>

          <div style={styles.fieldBlock}>
            <label style={styles.label}>Item BOM Routing Priority *</label>
            <input
              type="number"
              min="1"
              value={routingPriority}
              onChange={(e) => {
                setRoutingPriority(e.target.value);
              }}
              placeholder="Enter Routing Priority"
              style={styles.input}
            />
            <div style={styles.helperText}>Enter routing priority for this Resource / Routing ID</div>
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
            <input value={routingId} readOnly placeholder="Routing ID" style={styles.inputDisabled} />
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
                <button type="button" style={styles.addCoProductButton} onClick={handleAddCoProductRow}>
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
                    <LazyDropdown
                      placeholder="Co-Product Item"
                      value={row.coProductItem}
                      displayValue={row.coProductItem}
                      fetchUrl="/api/bigquery/table/bom-routing-step1/co-product-items-lazy"
                      getOptionKey={(opt) => opt.item}
                      getOptionLabel={(opt) => `${opt.item}${opt.item_desc ? ` - ${opt.item_desc}` : ""}`}
                      onSelect={(opt) => {
                        setCoProductRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? {
                                ...r,
                                coProductItem: opt.item || "",
                                itemDescription: opt.item_desc || opt.description || "",
                              }
                              : r
                          )
                        );
                      }}
                      searchPlaceholder="Search item or description..."
                    />
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
                      <div style={styles.qtyWarningText}>Qty Produced should always be less than 1</div>
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
    alignItems: "start",
    marginBottom: "10px",
  },
  coProductCell: {
    minWidth: 0,
  },
  coProductDeleteCell: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: "7px",
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
  qtyWarningText: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#dc2626",
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
  selectIconStatic: {
    color: "#6b7280",
    flexShrink: 0,
  },
  clearResourceButton: {
    marginTop: "8px",
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    padding: 0,
  },
  lazyDropdownBlock: {
    position: "relative",
    width: "100%",
  },
  lazyDropdownControl: {
    width: "100%",
    minHeight: "42px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    backgroundColor: "#fff",
    padding: "0 14px",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxSizing: "border-box",
    gap: "10px",
  },
  lazyDropdownValue: {
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  lazyDropdownPlaceholder: {
    color: "#9ca3af",
  },
  lazyDropdownMenu: {
    position: "absolute",
    zIndex: 999,
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    boxShadow: "0 8px 18px rgba(0,0,0,0.14)",
    padding: "8px",
  },
  lazyDropdownSearch: {
    width: "100%",
    height: "36px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    padding: "0 10px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: "8px",
  },
  lazyDropdownList: {
    maxHeight: "220px",
    overflowY: "auto",
  },
  lazyDropdownOption: {
    padding: "9px 10px",
    fontSize: "14px",
    cursor: "pointer",
    borderRadius: "4px",
    color: "#111827",
    wordBreak: "break-word",
  },
  lazyDropdownEmpty: {
    padding: "10px",
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center",
  },
  lazyDropdownError: {
    padding: "10px",
    fontSize: "13px",
    color: "#dc2626",
    textAlign: "center",
  },
  loadMoreButton: {
    width: "100%",
    marginTop: "8px",
    height: "34px",
    border: "1px solid #2563eb",
    borderRadius: "4px",
    backgroundColor: "#fff",
    color: "#2563eb",
    fontWeight: 600,
    cursor: "pointer",
  },
};
