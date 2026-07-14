import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MdDelete } from "react-icons/md";

import {
  selectModifyExistingBomState,
  setModifyExistingBomState,
  clearModifyExistingBomState,
} from "../redux/bomSlice";

const toText = (value) => String(value ?? "").trim();

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const firstArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getResourceFromRoutingId = (routingId) => {
  const parts = String(routingId || "")
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 3 ? parts.slice(2).join("_") : "";
};

const buildRoutingId = (producedItem, resource) => {
  const cleanProducedItem = toText(producedItem);
  const cleanResource = toText(resource);
  if (!cleanProducedItem || !cleanResource) return "";
  return `ROUTING_${cleanProducedItem}_${cleanResource}`;
};

const getBomIdFromRecord = (row = {}) =>
  row?.bom_id || row?.BOMID || row?.bomId || "";

const getProducedItemFromRecord = (row = {}) =>
  row?.produced_item || row?.producedItem || row?.item || "";

const getLocationFromRecord = (row = {}) =>
  row?.location || row?.Location || "";

const getComponentItem = (item) =>
  toText(item?.component_item || item?.componentItem || item?.item || "");

const getComponentDescription = (item) =>
  toText(
    item?.component_desc ||
      item?.componentDesc ||
      item?.item_desc ||
      item?.item_description ||
      item?.description ||
      item?.desc ||
      ""
  );

const getComponentStandardUsage = (item) =>
  item?.standard_usage ??
  item?.standardUsage ??
  item?.erp_bom_quantity_consumed_per ??
  item?.qtyConsumedPer ??
  "";

const getCoProductItem = (item) =>
  toText(item?.item || item?.coProductItem || item?.co_product_item || "");

const getCoProductDescription = (item) =>
  toText(
    item?.desc ||
      item?.description ||
      item?.item_desc ||
      item?.item_description ||
      item?.component_desc ||
      ""
  );

const getCoProductQty = (item) =>
  item?.qty ??
  item?.qtyProduced ??
  item?.qtyProducedPer ??
  item?.standardUsage ??
  item?.standard_usage ??
  item?.qty_produced_per ??
  item?.erp_bom_qty_produced_per ??
  "";

const getCoProductPriority = (item) =>
  item?.itemBomRoutingPriority ??
  item?.item_bom_routing_priority ??
  item?.erp_item_bom_routing_priority ??
  item?.routingPriority ??
  "";

const normalizeComponentRowsFromSearch = (rows = []) =>
  normalizeArray(rows).map((row) => {
    const componentItem = getComponentItem(row);
    const componentDesc = getComponentDescription(row);
    const standardUsage = getComponentStandardUsage(row);
    return {
      ...row,
      component_item: componentItem,
      original_component_item:
        row.original_component_item || row.originalComponentItem || componentItem,
      component_desc: componentDesc,
      original_component_desc:
        row.original_component_desc || row.originalComponentDesc || componentDesc,
      standard_usage: standardUsage === null || standardUsage === undefined ? "" : String(standardUsage),
      original_standard_usage:
        row.original_standard_usage ?? row.originalStandardUsage ?? standardUsage ?? "",
      isNew: !!row.isNew,
    };
  });

const normalizeCoProductRowsFromSearch = (
  rows = [],
  selectedResource = "",
  selectedRoutingId = ""
) =>
  normalizeArray(rows).map((row) => {
    const item = getCoProductItem(row);
    const desc = getCoProductDescription(row);
    const qty = getCoProductQty(row);
    const resource = toText(row.resource || row.Resource || selectedResource);
    const routingId =
      toText(row.routing_id || row.routingId) ||
      selectedRoutingId ||
      buildRoutingId(row.produced_item || row.producedItem || "", resource);
    const priority = getCoProductPriority(row);

    return {
      ...row,
      item,
      original_item: row.original_item || row.originalItem || item,
      desc,
      original_desc: row.original_desc || row.originalDesc || desc,
      qty: qty === null || qty === undefined ? "" : String(qty),
      original_qty: row.original_qty ?? row.originalQty ?? qty ?? "",
      resource,
      original_resource: row.original_resource || row.originalResource || resource,
      routing_id: routingId,
      original_routing_id: row.original_routing_id || row.originalRoutingId || routingId,
      erp_co_product_association:
        row.erp_co_product_association || row.co_product_association || "1",
      itemBomRoutingPriority:
        priority === null || priority === undefined ? "" : String(priority),
      isNew: !!row.isNew,
    };
  });

export default function ModifyExistingBOMData() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const persistedBomState = useSelector(selectModifyExistingBomState);

  const itemSearchTimerRef = useRef({});
  const itemSearchCacheRef = useRef({});
  const resourceSearchTimerRef = useRef({});
  const resourceOptionsLoadedRef = useRef(false);
  const hydratedKeyRef = useRef("");

  const RESOURCE_PAGE_SIZE = 50;
  const ITEM_SEARCH_DEBOUNCE_MS = 650;
  const RESOURCE_SEARCH_DEBOUNCE_MS = 450;
  const MIN_SEARCH_CHARS = 2;

  const [record, setRecord] = useState(
    state?.record ||
      state?.selectedBom ||
      (persistedBomState?.record ? { ...persistedBomState.record } : null)
  );
  const [componentItems, setComponentItems] = useState(
    normalizeArray(persistedBomState?.componentItems).map((row) => ({ ...row }))
  );
  const [initialComponentItems, setInitialComponentItems] = useState(
    normalizeArray(persistedBomState?.initialComponentItems).map((row) => ({ ...row }))
  );
  const [coProducts, setCoProducts] = useState(
    normalizeArray(persistedBomState?.coProducts).map((row) => ({ ...row }))
  );
  const [initialCoProducts, setInitialCoProducts] = useState(
    normalizeArray(persistedBomState?.initialCoProducts).map((row) => ({ ...row }))
  );
  const [producedCoProduct, setProducedCoProduct] = useState(
    !!persistedBomState?.producedCoProduct
  );
  const [validationError, setValidationError] = useState("");
  const [error, setError] = useState("");

  const [activeItemDropdownKey, setActiveItemDropdownKey] = useState(null);
  const [itemSearchByKey, setItemSearchByKey] = useState({});
  const [itemOptionsByKey, setItemOptionsByKey] = useState({});
  const [itemLoadingByKey, setItemLoadingByKey] = useState({});
  const [itemPaginationByKey, setItemPaginationByKey] = useState({});

  const [allGcpResourceOptions, setAllGcpResourceOptions] = useState([]);
  const [activeResourceDropdownKey, setActiveResourceDropdownKey] = useState(null);
  const [resourceSearchByKey, setResourceSearchByKey] = useState({});
  const [resourceOptionsByKey, setResourceOptionsByKey] = useState({});
  const [resourceLoadingByKey, setResourceLoadingByKey] = useState({});
  const [resourcePaginationByKey, setResourcePaginationByKey] = useState({});

  const selectedBomId = getBomIdFromRecord(record || {});
  const selectedProducedItem = getProducedItemFromRecord(record || {});
  const selectedLocation = getLocationFromRecord(record || {});
  const selectedResource =
    toText(record?.resource || record?.Resource) ||
    getResourceFromRoutingId(record?.routing_id || record?.routingId);
  const selectedRoutingId =
    toText(record?.routing_id || record?.routingId) ||
    buildRoutingId(selectedProducedItem, selectedResource);

  // Fetch the existing component/co-product values once from backend.
  // This API has the exact data needed for this page:
  // record, componentItems, and coProducts.
  // Other frontend fetches remain only for lazy dropdowns.
  useEffect(() => {
    const selectedRecord = state?.record || state?.selectedBom || record || {};
    const bomId = getBomIdFromRecord(selectedRecord);
    const producedItem = getProducedItemFromRecord(selectedRecord);
    const location = getLocationFromRecord(selectedRecord);
    const resource =
      toText(selectedRecord?.resource || selectedRecord?.Resource) ||
      getResourceFromRoutingId(selectedRecord?.routing_id || selectedRecord?.routingId);
    const routingId =
      toText(selectedRecord?.routing_id || selectedRecord?.routingId) ||
      buildRoutingId(producedItem, resource);

    if (!bomId) {
      setError(
        "Selected BOM details were not found. Please go back and select the BOM again."
      );
      return;
    }

    const hydrateKey = `${bomId}__${producedItem}__${location}`;
    if (hydratedKeyRef.current === hydrateKey) return;

    let cancelled = false;

    const fetchModifyExistingBomDetails = async () => {
      try {
        setError("");

        const params = new URLSearchParams();
        params.set("bomId", toText(bomId));
        params.set("producedItem", toText(producedItem));
        params.set("location", toText(location));

        const response = await fetch(
          `/api/tables/modify-existing-bom-details?${params.toString()}`
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.success === false) {
          throw new Error(
            payload?.details ||
              payload?.error ||
              "Failed to fetch modify existing BOM details"
          );
        }

        if (cancelled) return;

        const data = payload?.data || {};
        const responseRecord = data.record || {};
        const normalizedComponents = normalizeComponentRowsFromSearch(
          data.componentItems || []
        );
        const normalizedCoProducts = normalizeCoProductRowsFromSearch(
          data.coProducts || [],
          resource,
          routingId
        );

        setRecord((prev) => ({
          ...(prev || {}),
          ...selectedRecord,
          ...responseRecord,
          resource: selectedRecord?.resource || selectedRecord?.Resource || resource,
          routing_id: selectedRecord?.routing_id || selectedRecord?.routingId || routingId,
        }));
        setComponentItems(normalizedComponents);
        setInitialComponentItems(normalizedComponents.map((row) => ({ ...row })));
        setCoProducts(normalizedCoProducts);
        setInitialCoProducts(normalizedCoProducts.map((row) => ({ ...row })));
        setProducedCoProduct(normalizedCoProducts.length > 0);
        hydratedKeyRef.current = hydrateKey;
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching modify existing BOM details:", err);
        setError(err?.message || "Failed to load modify existing BOM details");
        setComponentItems([]);
        setInitialComponentItems([]);
        setCoProducts([]);
        setInitialCoProducts([]);
        setProducedCoProduct(false);
      }
    };

    fetchModifyExistingBomDetails();

    return () => {
      cancelled = true;
    };
  }, [state?.record, state?.selectedBom, record?.bom_id, record?.bomId]);

  useEffect(() => {
    dispatch(
      setModifyExistingBomState({
        record,
        componentItems,
        initialComponentItems,
        coProducts,
        initialCoProducts,
        producedCoProduct,
      })
    );
  }, [
    dispatch,
    record,
    componentItems,
    initialComponentItems,
    coProducts,
    initialCoProducts,
    producedCoProduct,
  ]);

  const searchItemMasterOptions = async ({ search = "", page = 1, pageSize = 100 }) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("filterBy", "item");
    params.set("search", toText(search));

    const response = await fetch(
      `/api/bigquery/table/item-master-with-releaseflag?${params.toString()}`
    );
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];

    return {
      rows: rows.map((row) => ({
        item: row.item ?? row.item_id ?? "",
        item_desc: row.item_desc ?? row.item_description ?? row.description ?? "",
      })),
      pagination: payload?.pagination || {
        page,
        pageSize,
        total: rows.length,
        totalPages: 1,
        hasNext: false,
      },
    };
  };

  const fetchResourceOptions = async () => {
    const response = await fetch("/api/bigquery/table/routing_rescons");
    if (!response.ok) throw new Error(await response.text());
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.rows)) return payload.rows;
    return [];
  };

  const loadLazyItemOptions = async ({ rowKey, searchText = "", page = 1, append = false }) => {
    const cleanSearch = toText(searchText);
    const cacheKey = `${cleanSearch.toLowerCase()}__${page}`;
    setItemSearchByKey((prev) => ({ ...prev, [rowKey]: searchText }));

    if (itemSearchCacheRef.current[cacheKey]) {
      const cached = itemSearchCacheRef.current[cacheKey];
      setItemOptionsByKey((prev) => ({
        ...prev,
        [rowKey]: append ? [...(prev[rowKey] || []), ...(cached.rows || [])] : cached.rows || [],
      }));
      setItemPaginationByKey((prev) => ({ ...prev, [rowKey]: cached.pagination }));
      return;
    }

    setItemLoadingByKey((prev) => ({ ...prev, [rowKey]: true }));
    try {
      const result = await searchItemMasterOptions({ search: cleanSearch, page, pageSize: 100 });
      itemSearchCacheRef.current[cacheKey] = result;
      setItemOptionsByKey((prev) => ({
        ...prev,
        [rowKey]: append ? [...(prev[rowKey] || []), ...(result.rows || [])] : result.rows || [],
      }));
      setItemPaginationByKey((prev) => ({ ...prev, [rowKey]: result.pagination }));
    } catch (err) {
      console.error("Item master lazy search failed:", err);
      setItemOptionsByKey((prev) => ({ ...prev, [rowKey]: [] }));
      setItemPaginationByKey((prev) => ({
        ...prev,
        [rowKey]: { page: 1, pageSize: 100, total: 0, totalPages: 1, hasNext: false },
      }));
    } finally {
      setItemLoadingByKey((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  const handleLazyItemDropdownOpen = (rowKey, currentValue = "") => {
    setActiveItemDropdownKey(rowKey);
    setItemSearchByKey((prev) => ({
      ...prev,
      [rowKey]: prev[rowKey] ?? currentValue ?? "",
    }));
    if ((itemOptionsByKey[rowKey] || []).length > 0) return;
    loadLazyItemOptions({
      rowKey,
      searchText: itemSearchByKey[rowKey] ?? currentValue ?? "",
      page: 1,
      append: false,
    });
  };

  const handleLazyItemSearchChange = (rowKey, value) => {
    setActiveItemDropdownKey(rowKey);
    setItemSearchByKey((prev) => ({ ...prev, [rowKey]: value }));

    if (itemSearchTimerRef.current[rowKey]) {
      clearTimeout(itemSearchTimerRef.current[rowKey]);
    }

    const cleanValue = toText(value);
    if (cleanValue && cleanValue.length < MIN_SEARCH_CHARS) {
      setItemOptionsByKey((prev) => ({ ...prev, [rowKey]: [] }));
      setItemPaginationByKey((prev) => ({
        ...prev,
        [rowKey]: { page: 1, pageSize: 100, total: 0, totalPages: 1, hasNext: false },
      }));
      return;
    }

    itemSearchTimerRef.current[rowKey] = setTimeout(() => {
      loadLazyItemOptions({ rowKey, searchText: cleanValue, page: 1, append: false });
    }, ITEM_SEARCH_DEBOUNCE_MS);
  };

  const handleLazyItemLoadMore = (rowKey) => {
    const searchText = itemSearchByKey[rowKey] || "";
    const pagination = itemPaginationByKey[rowKey] || {};
    loadLazyItemOptions({
      rowKey,
      searchText,
      page: Number(pagination.page || 1) + 1,
      append: true,
    });
  };

  const loadAllGcpResourceOptions = async () => {
    if (resourceOptionsLoadedRef.current && allGcpResourceOptions.length > 0) {
      return allGcpResourceOptions;
    }

    const rows = await fetchResourceOptions();
    const seen = new Set();
    const options = [];

    rows.forEach((row) => {
      const resource = toText(row.resource ?? row.Resource);
      if (!resource) return;
      const key = resource.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push({ resource });
    });

    setAllGcpResourceOptions(options);
    resourceOptionsLoadedRef.current = true;
    return options;
  };

  const loadLazyResourceOptions = async ({ rowKey, searchText = "", page = 1 } = {}) => {
    setResourceLoadingByKey((prev) => ({ ...prev, [rowKey]: true }));
    try {
      const allResources = await loadAllGcpResourceOptions();
      const cleanSearch = toText(searchText).toLowerCase();
      const filteredOptions = cleanSearch
        ? allResources.filter((opt) => toText(opt.resource).toLowerCase().includes(cleanSearch))
        : allResources;
      const endIndex = Number(page || 1) * RESOURCE_PAGE_SIZE;

      setResourceOptionsByKey((prev) => ({
        ...prev,
        [rowKey]: filteredOptions.slice(0, endIndex),
      }));
      setResourcePaginationByKey((prev) => ({
        ...prev,
        [rowKey]: { page, hasNext: endIndex < filteredOptions.length },
      }));
    } catch (err) {
      console.error("Resource lazy search failed:", err);
      setResourceOptionsByKey((prev) => ({ ...prev, [rowKey]: [] }));
      setResourcePaginationByKey((prev) => ({
        ...prev,
        [rowKey]: { page: 1, hasNext: false },
      }));
    } finally {
      setResourceLoadingByKey((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  const handleLazyResourceDropdownOpen = (rowKey, currentValue = "") => {
    setActiveResourceDropdownKey(rowKey);
    setResourceSearchByKey((prev) => ({
      ...prev,
      [rowKey]: prev[rowKey] ?? currentValue ?? "",
    }));
    if ((resourceOptionsByKey[rowKey] || []).length > 0) return;
    loadLazyResourceOptions({
      rowKey,
      searchText: resourceSearchByKey[rowKey] ?? currentValue ?? "",
      page: 1,
    });
  };

  const handleLazyResourceSearchChange = (rowKey, value) => {
    setActiveResourceDropdownKey(rowKey);
    setResourceSearchByKey((prev) => ({ ...prev, [rowKey]: value }));

    if (resourceSearchTimerRef.current[rowKey]) {
      clearTimeout(resourceSearchTimerRef.current[rowKey]);
    }

    resourceSearchTimerRef.current[rowKey] = setTimeout(() => {
      loadLazyResourceOptions({ rowKey, searchText: value, page: 1 });
    }, RESOURCE_SEARCH_DEBOUNCE_MS);
  };

  const handleLazyResourceLoadMore = (rowKey) => {
    const searchText = resourceSearchByKey[rowKey] || "";
    const pagination = resourcePaginationByKey[rowKey] || {};
    loadLazyResourceOptions({ rowKey, searchText, page: Number(pagination.page || 1) + 1 });
  };

  const renderLazyItemInput = ({ rowKey, value, placeholder, updateValue, applySelection }) => {
    const options = itemOptionsByKey[rowKey] || [];
    const isLoading = !!itemLoadingByKey[rowKey];
    const pagination = itemPaginationByKey[rowKey] || {};
    const displayValue =
      activeItemDropdownKey === rowKey ? itemSearchByKey[rowKey] ?? value : value;

    return (
      <div style={styles.lazyDropdownWrap}>
        <input
          type="text"
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => handleLazyItemDropdownOpen(rowKey, value)}
          onClick={() => handleLazyItemDropdownOpen(rowKey, value)}
          onChange={(e) => {
            handleLazyItemSearchChange(rowKey, e.target.value);
          }}
          style={styles.tableInput}
        />
        {activeItemDropdownKey === rowKey ? (
          <div style={styles.lazyDropdownMenu}>
            {isLoading && options.length === 0 ? (
              <div style={styles.lazyDropdownEmpty}>Loading...</div>
            ) : options.length === 0 ? (
              <div style={styles.lazyDropdownEmpty}>{toText(itemSearchByKey[rowKey]).length > 0 && toText(itemSearchByKey[rowKey]).length < MIN_SEARCH_CHARS ? "Type at least 2 characters" : "No items found"}</div>
            ) : (
              <>
                {options.map((option) => (
                  <div
                    key={`${rowKey}-${option.item}`}
                    style={styles.lazyDropdownRow}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySelection(option);
                      setItemSearchByKey((prev) => ({ ...prev, [rowKey]: option.item }));
                      setActiveItemDropdownKey(null);
                    }}
                  >
                    <div style={styles.lazyDropdownItem}>{option.item}</div>
                    <div style={styles.lazyDropdownDesc}>{option.item_desc || "-"}</div>
                  </div>
                ))}
                {pagination.hasNext ? (
                  <button
                    type="button"
                    style={styles.lazyLoadMoreBtn}
                    disabled={isLoading}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleLazyItemLoadMore(rowKey)}
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderLazyResourceInput = ({ rowKey, value, updateValue }) => {
    const options = resourceOptionsByKey[rowKey] || [];
    const isLoading = !!resourceLoadingByKey[rowKey];
    const pagination = resourcePaginationByKey[rowKey] || {};
    const displayValue =
      activeResourceDropdownKey === rowKey ? resourceSearchByKey[rowKey] ?? value : value;

    return (
      <div style={styles.lazyDropdownWrap}>
        <input
          type="text"
          value={displayValue}
          placeholder="Search Resource"
          onFocus={() => handleLazyResourceDropdownOpen(rowKey, value)}
          onClick={() => handleLazyResourceDropdownOpen(rowKey, value)}
          onChange={(e) => {
            handleLazyResourceSearchChange(rowKey, e.target.value);
          }}
          style={styles.tableInput}
        />
        {activeResourceDropdownKey === rowKey ? (
          <div style={styles.lazyDropdownMenu}>
            {isLoading && options.length === 0 ? (
              <div style={styles.lazyDropdownEmpty}>Loading resources...</div>
            ) : options.length === 0 ? (
              <div style={styles.lazyDropdownEmpty}>No resources found</div>
            ) : (
              <>
                {options.map((option) => (
                  <div
                    key={`${rowKey}-${option.resource}`}
                    style={styles.lazyDropdownRow}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      updateValue(option.resource);
                      setResourceSearchByKey((prev) => ({ ...prev, [rowKey]: option.resource }));
                      setActiveResourceDropdownKey(null);
                    }}
                  >
                    <div style={styles.lazyDropdownItem}>{option.resource}</div>
                  </div>
                ))}
                {pagination.hasNext ? (
                  <button
                    type="button"
                    style={styles.lazyLoadMoreBtn}
                    disabled={isLoading}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleLazyResourceLoadMore(rowKey)}
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const addComponent = () => {
    setComponentItems((prev) => [
      ...prev,
      {
        component_item: "",
        component_desc: "",
        original_component_item: "",
        original_component_desc: "",
        standard_usage: "",
        original_standard_usage: "",
        isNew: true,
      },
    ]);
  };

  const updateComponent = (index, field, value) => {
    setComponentItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleComponentItemChange = (index, value, description = "") => {
    setComponentItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              component_item: value,
              component_desc: description || "",
            }
          : item
      )
    );
  };

  const removeComponent = (index) => {
    setComponentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addCoProduct = () => {
    setCoProducts((prev) => [
      ...prev,
      {
        item: "",
        original_item: "",
        desc: "",
        original_desc: "",
        qty: "",
        original_qty: "",
        resource: "",
        original_resource: "",
        routing_id: "",
        original_routing_id: "",
        itemBomRoutingPriority: "",
        isNew: true,
      },
    ]);
  };

  const updateCoProduct = (index, field, value) => {
    setCoProducts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCoProductItemChange = (index, value, description = "") => {
    setCoProducts((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              item: value,
              desc: description || "",
            }
          : item
      )
    );
  };

  const handleCoProductResourceChange = (index, value) => {
    setCoProducts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, resource: value } : item))
    );
  };

  const removeCoProduct = (index) => {
    setCoProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProducedCoProductToggle = (checked) => {
    setProducedCoProduct(checked);
    if (!checked) setCoProducts([]);
  };

  const isExistingComponentRow = (item) =>
    !item?.isNew && toText(item?.original_component_item) !== "";

  const isExistingCoProductRow = (cp) =>
    !cp?.isNew && toText(cp?.original_item) !== "";

  const getQtyProducedFieldError = (value) => {
    const trimmed = toText(value);
    if (trimmed === "") return "";
    const num = Number(trimmed);
    if (Number.isNaN(num)) return "Qty Produced must be numeric.";
    if (!(num > 0 && num < 1)) return "Qty Produced must be greater than 0 and less than 1.";
    return "";
  };

  const getPriorityFieldError = (value) => {
    const trimmed = toText(value);
    if (trimmed === "") return "";
    const num = Number(trimmed);
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      return "Priority must be a whole number.";
    }
    return "";
  };

  const hasMissingStandardUsage = componentItems.some(
    (item) => toText(item.standard_usage) === ""
  );

  const hasMissingCoProductFields = producedCoProduct
    ? coProducts.some((cp) => {
        return (
          toText(cp.item) === "" ||
          toText(cp.qty) === "" ||
          toText(cp.resource) === "" ||
          toText(cp.itemBomRoutingPriority) === ""
        );
      })
    : false;

  const hasInvalidComponentUsage = componentItems.some((item) => {
    const value = toText(item.standard_usage);
    if (!value) return false;
    const num = Number(value);
    return !Number.isFinite(num) || num <= 0;
  });

  const hasInvalidCoProductQty = producedCoProduct
    ? coProducts.some((cp) => !!getQtyProducedFieldError(cp.qty))
    : false;

  const hasInvalidCoProductPriority = producedCoProduct
    ? coProducts.some((cp) => !!getPriorityFieldError(cp.itemBomRoutingPriority))
    : false;

  const hasInvalidNumericValues =
    hasInvalidComponentUsage || hasInvalidCoProductQty || hasInvalidCoProductPriority;

  useEffect(() => {
    if (!hasMissingStandardUsage && !hasMissingCoProductFields && !hasInvalidNumericValues) {
      setValidationError("");
    }
  }, [hasMissingStandardUsage, hasMissingCoProductFields, hasInvalidNumericValues]);

  const canProceed =
    !!record &&
    !hasMissingStandardUsage &&
    !hasMissingCoProductFields &&
    !hasInvalidNumericValues;

  const validateAndNavigate = () => {
    if (!record) {
      setValidationError("Selected BOM details are missing. Please go back and select the BOM again.");
      return;
    }

    if (hasMissingStandardUsage) {
      setValidationError("Please fill in Standard Usage for all component rows before moving forward.");
      return;
    }

    if (hasMissingCoProductFields) {
      setValidationError(
        "Please fill in Item, Resource, Item BOM Routing Priority and Qty Produced for all co-product rows before moving forward."
      );
      return;
    }

    if (hasInvalidNumericValues) {
      setValidationError(
        "Standard Usage must be greater than 0. Qty Produced must be greater than 0 and less than 1. Item BOM Routing Priority must be a whole number."
      );
      return;
    }

    const normalizedRecord = {
      ...record,
      bom_id: selectedBomId,
      produced_item: selectedProducedItem,
      location: selectedLocation,
      resource: selectedResource,
      routing_id: selectedRoutingId,
    };

    if (!normalizedRecord.routing_id) {
      setValidationError("Routing ID is missing for the selected BOM record.");
      return;
    }

    const removedComponentItems = initialComponentItems
      .filter((orig) => {
        const key = toText(orig.original_component_item || orig.component_item);
        if (!key) return false;
        return !componentItems.some(
          (ci) => toText(ci.original_component_item || ci.component_item) === key
        );
      })
      .map((item) => ({ ...item, removed: true }));

    const removedCoProducts = initialCoProducts
      .filter((orig) => {
        const key = toText(orig.original_item || orig.item);
        if (!key) return false;
        return !coProducts.some((cp) => toText(cp.original_item || cp.item) === key);
      })
      .map((item) => ({ ...item, removed: true }));

    setValidationError("");

    navigate("/review-changes", {
      state: {
        record: normalizedRecord,
        componentItems,
        coProducts,
        removedComponentItems,
        removedCoProducts,
        initialComponentItems,
        initialCoProducts,
      },
    });
  };

  const handleBack = () => {
    dispatch(clearModifyExistingBomState());
    navigate(-1);
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.back} onClick={handleBack}>← BACK</div>

        <h1 style={styles.title}>Step 2: Modify Existing BOM Data</h1>
        <p style={styles.subtitle}>Modify the BOM record details</p>

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.card}>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>BOM ID</label>
              <input value={selectedBomId} readOnly style={styles.inputDisabled} placeholder="BOM ID" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Produced Item</label>
              <input value={selectedProducedItem} readOnly style={styles.inputDisabled} placeholder="Produced Item" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Location</label>
              <input value={selectedLocation} readOnly style={styles.inputDisabled} placeholder="Location" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Item Release Flag</label>
              <input
                value={record?.item_release_flag || record?.itemReleaseFlag || ""}
                readOnly
                style={styles.inputDisabled}
                placeholder="Item Release Flag"
              />
              <div style={styles.helperText}>Auto-populated from Produced Item</div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, marginTop: 14 }}>
          <div style={styles.sectionHeaderRow}>
            <div style={styles.sectionTitle}>Component Items</div>
            <button type="button" style={styles.secondaryBtn} onClick={addComponent}>+ ADD COMPONENT</button>
          </div>

          {componentItems.length === 0 ? (
            <div style={styles.emptyBox}>No component items. Click "Add Component" to add one.</div>
          ) : (
            <div style={styles.editTableWrap}>
              <div style={styles.editTableHeader}>
                <div>Component Item</div>
                <div>Item Description</div>
                <div>Standard Usage</div>
                <div />
              </div>

              {componentItems.map((item, index) => (
                <div key={item.id || item.original_component_item || item.component_item || index} style={styles.editTableRow}>
                  {isExistingComponentRow(item) ? (
                    <input value={toText(item.component_item)} disabled style={styles.tableInputDisabled} placeholder="Component Item" />
                  ) : (
                    renderLazyItemInput({
                      rowKey: `component-${item.id || item.original_component_item || index}`,
                      value: toText(item.component_item),
                      placeholder: "Search Component Item",
                      updateValue: (value) => handleComponentItemChange(index, value),
                      applySelection: (option) => handleComponentItemChange(index, option.item, option.item_desc || option.description || ""),
                    })
                  )}

                  <input title={item.component_desc} style={styles.tableInputDisabled} placeholder="Item Description" value={item.component_desc || ""} readOnly />

                  <input
                    type="number"
                    min="0"
                    step="any"
                    style={styles.tableInput}
                    placeholder="Standard Usage"
                    value={item.standard_usage || ""}
                    onChange={(e) => updateComponent(index, "standard_usage", e.target.value)}
                  />

                  <div style={styles.deleteBtnContainer}>
                    <button type="button" style={styles.deleteBtn} onClick={() => removeComponent(index)}>
                      <span style={styles.iconWrapper}><MdDelete /></span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...styles.card, marginTop: 14 }}>
          <label style={styles.checkboxRow}>
            <input type="checkbox" checked={producedCoProduct} onChange={(e) => handleProducedCoProductToggle(e.target.checked)} />
            <span>Produced Co-Product?</span>
          </label>
        </div>

        {producedCoProduct ? (
          <div style={{ ...styles.card, marginTop: 14 }}>
            <div style={styles.sectionHeaderRow}>
              <div style={styles.sectionTitle}>Co-Product Items</div>
              <button type="button" style={styles.secondaryBtn} onClick={addCoProduct}>+ ADD CO-PRODUCT</button>
            </div>

            {coProducts.length === 0 ? (
              <div style={styles.emptyBox}>No co-product items. Click "Add Co-Product" to add one.</div>
            ) : (
              <div style={styles.editTableWrap}>
                <div style={styles.coProductEditTableHeader}>
                  <div>Co-Product Item</div>
                  <div>Item Description</div>
                  <div>Resource</div>
                  <div>Item BOM Routing Priority</div>
                  <div>Qty Produced Per</div>
                  <div />
                </div>

                {coProducts.map((cp, index) => (
                  <div key={cp.id || cp.original_item || cp.item || index} style={styles.coProductEditTableRow}>
                    {isExistingCoProductRow(cp) ? (
                      <input value={toText(cp.item)} disabled style={styles.tableInputDisabled} placeholder="Co-Product Item" />
                    ) : (
                      renderLazyItemInput({
                        rowKey: `coproduct-${cp.id || cp.original_item || index}`,
                        value: toText(cp.item),
                        placeholder: "Search Co-Product Item",
                        updateValue: (value) => handleCoProductItemChange(index, value),
                        applySelection: (option) => handleCoProductItemChange(index, option.item, option.item_desc || option.description || ""),
                      })
                    )}

                    <input title={cp.desc} style={styles.tableInputDisabled} placeholder="Item Description" value={cp.desc || ""} readOnly />

                    {isExistingCoProductRow(cp) ? (
                      <input title={cp.resource} value={toText(cp.resource)} disabled style={styles.tableInputDisabled} placeholder="Resource" />
                    ) : (
                      renderLazyResourceInput({
                        rowKey: `coproduct-resource-${cp.id || cp.original_item || index}`,
                        value: toText(cp.resource),
                        updateValue: (value) => handleCoProductResourceChange(index, value),
                      })
                    )}

                    <div style={styles.inputWithError}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={cp.itemBomRoutingPriority || ""}
                        onChange={(e) => updateCoProduct(index, "itemBomRoutingPriority", e.target.value)}
                        style={getPriorityFieldError(cp.itemBomRoutingPriority) ? styles.tableInputError : styles.tableInput}
                        placeholder="Priority"
                      />
                      {getPriorityFieldError(cp.itemBomRoutingPriority) ? (
                        <div style={styles.inlineError}>{getPriorityFieldError(cp.itemBomRoutingPriority)}</div>
                      ) : null}
                    </div>

                    <div style={styles.inputWithError}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        style={getQtyProducedFieldError(cp.qty) ? styles.tableInputError : styles.tableInput}
                        placeholder="Qty Produced Per"
                        value={cp.qty || ""}
                        onChange={(e) => updateCoProduct(index, "qty", e.target.value)}
                      />
                      {getQtyProducedFieldError(cp.qty) ? (
                        <div style={styles.inlineError}>{getQtyProducedFieldError(cp.qty)}</div>
                      ) : null}
                    </div>

                    <div style={styles.deleteBtnContainer}>
                      <button type="button" style={styles.deleteBtn} onClick={() => removeCoProduct(index)}>
                        <span style={styles.iconWrapper}><MdDelete /></span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {validationError ? <div style={styles.validationBanner}>{validationError}</div> : null}

        <div style={styles.footer}>
          <button
            disabled={!canProceed}
            style={{
              ...styles.nextBtn,
              opacity: canProceed ? 1 : 0.65,
              cursor: canProceed ? "pointer" : "not-allowed",
            }}
            onClick={validateAndNavigate}
          >
            NEXT: REVIEW CHANGES →
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f3f4f6", display: "flex", justifyContent: "center" },
  wrapper: { width: "100%", maxWidth: "1100px", padding: "20px", boxSizing: "border-box" },
  back: { color: "#2563eb", cursor: "pointer", marginBottom: "12px", fontSize: "14px" },
  title: { fontSize: "30px", fontWeight: 700, margin: 0, color: "#111827" },
  subtitle: { marginTop: "8px", marginBottom: "20px", color: "#6b7280", fontSize: "15px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "22px", marginBottom: "18px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" },
  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: "13px", color: "#374151", marginBottom: "6px", fontWeight: 500 },
  inputDisabled: { width: "100%", height: "44px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff", padding: "0 12px", fontSize: "15px", color: "#9ca3af", boxSizing: "border-box", outline: "none" },
  helperText: { marginTop: "4px", fontSize: "12px", color: "#9ca3af" },
  sectionHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: "16px", fontWeight: 600, color: "#111827" },
  secondaryBtn: { height: 32, padding: "0 12px", borderRadius: 3, border: "1px solid #93c5fd", background: "#ffffff", color: "#2563eb", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  emptyBox: { border: "1px dashed #d1d5db", borderRadius: "4px", minHeight: "68px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "14px", background: "#fafafa" },
  editTableWrap: { border: "1px solid #dfe3ea", borderRadius: 4, overflow: "visible" },
  editTableHeader: { display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 110px", background: "#f3f4f6", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#111827" },
  editTableRow: { display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 110px", gap: 10, padding: "10px 12px", borderTop: "1px solid #eceff3", alignItems: "center", background: "#ffffff" },
  coProductEditTableHeader: { display: "grid", gridTemplateColumns: "1.1fr 1.25fr 1fr 1fr 0.85fr 70px", background: "#f3f4f6", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#111827" },
  coProductEditTableRow: { display: "grid", gridTemplateColumns: "1.1fr 1.25fr 1fr 1fr 0.85fr 70px", gap: 10, padding: "10px 12px", borderTop: "1px solid #eceff3", alignItems: "center", background: "#ffffff" },
  tableInput: { height: 36, borderRadius: 3, border: "1px solid #cfd4dc", padding: "0 10px", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%", background: "#ffffff" },
  tableInputDisabled: { height: 36, borderRadius: 3, border: "1px solid #cfd4dc", padding: "0 10px", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%", background: "#f9fafb", color: "#6b7280" },
  tableInputError: { height: 36, borderRadius: 3, border: "1px solid #ef4444", padding: "0 10px", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%", background: "#ffffff" },
  inputWithError: { display: "flex", flexDirection: "column", width: "100%", gap: "4px" },
  inlineError: { color: "#dc2626", fontSize: "12px", fontWeight: 600, minHeight: "18px" },
  deleteBtnContainer: { display: "flex", alignItems: "flex-end", height: "100%" },
  deleteBtn: { width: "36px", height: "36px", border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" },
  iconWrapper: { all: "unset", color: "#dc2626", fontSize: "32px" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#111827", fontWeight: 500 },
  footer: { display: "flex", justifyContent: "flex-end", marginTop: "8px" },
  nextBtn: { background: "#1976d2", color: "#fff", border: "none", borderRadius: "4px", padding: "12px 18px", fontSize: "14px", cursor: "pointer" },
  error: { color: "#b91c1c", fontWeight: 600, marginTop: "16px", marginBottom: "16px" },
  validationBanner: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "6px", padding: "14px 16px", margin: "16px 0", fontSize: "14px", fontWeight: 600 },
  lazyDropdownWrap: { position: "relative", width: "100%" },
  lazyDropdownMenu: { position: "absolute", top: "40px", left: 0, right: 0, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", zIndex: 9999, maxHeight: "240px", overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" },
  lazyDropdownRow: { padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" },
  lazyDropdownItem: { fontSize: "13px", fontWeight: 600, color: "#111827" },
  lazyDropdownDesc: { fontSize: "12px", color: "#6b7280", marginTop: "2px" },
  lazyDropdownEmpty: { padding: "10px", fontSize: "13px", color: "#6b7280" },
  lazyLoadMoreBtn: { width: "100%", border: "none", backgroundColor: "#f3f4f6", color: "#2563eb", padding: "9px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
};
