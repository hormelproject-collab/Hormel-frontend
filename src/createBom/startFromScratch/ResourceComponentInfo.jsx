import { useEffect, useMemo, useRef, useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MdDelete } from "react-icons/md";
import {
  fetchLocationMaster,
  fetchResourcesLazyOptions,
  selectAllLocations,
  selectSelectedProducedItemIds,
  selectSelectedLocationIds,
  selectSelectedProducedItems,
  selectSelectedLocations,
  selectLocationsLoading,
  selectLocationsError,
  selectHasInactiveSelected,
  selectHasInactiveLocationsSelected,
  selectResourceMetaLoading,
  selectResourceMetaError,
  selectBomVersions,
  selectResourceOptionsByKey,
  selectResourceComponentConfigs,
  ensureResourceComponentConfig,
  setResourceComponentConfig,
} from "../../redux/bomSlice";

const buildConfigKey = (item, location) => `${item}__${location}`;
const buildBomId = (bomVersion, item, location) =>
  `${bomVersion}_${item}_${location}`;
const buildRoutingId = (item, location, resource) =>
  `ROUTING_${item}_${resource}`;
const RESOURCE_PAGE_SIZE = 50;

const getResourceRelevancy = (resourceOptions = [], resource) => {
  const key = String(resource ?? "").trim().toUpperCase();
  const matched = (resourceOptions || []).find(
    (row) => String(row?.resource ?? "").trim().toUpperCase() === key
  );

  return (
    matched?.resourceRelevancy ??
    matched?.resourcePlanningRelevance ??
    matched?.resource_relevancy ??
    matched?.resource_planning_relevance ??
    ""
  );
};

const makeUniqueId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cloneComponentRows = (rows = []) =>
  rows.map((row) => ({
    id: makeUniqueId("component"),
    componentItem: row.componentItem ?? "",
    description: row.description ?? "",
    standardUsage: row.standardUsage ?? "",
  }));

const cloneCoProductRows = (rows = []) =>
  rows.map((row) => ({
    id: makeUniqueId("coproduct"),
    coProductItem: row.coProductItem ?? "",
    description: row.description ?? "",
    qtyProduced: row.qtyProduced ?? "",
  }));

const searchItemMasterOptions = async ({ search = "", page = 1, pageSize = 50 }) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("filterBy", "item");
  params.set("search", String(search || "").trim());

  const response = await fetch(
    `/api/bigquery/table/item-master-with-releaseflag?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return {
    rows: rows.map((row) => ({
      item: row.item ?? row.item_id ?? "",
      item_desc:
        row.item_desc ??
        row.item_description ??
        row.description ??
        "",
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

const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  onOpen,
  searchValue,
  onSearchChange,
  onLoadMore,
  loading = false,
  hasNext = false,
  placeholder = "Select resource(s)",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedSet = useMemo(
    () => new Set((selectedValues || []).map((v) => String(v))),
    [selectedValues]
  );

  const visibleOptions = useMemo(() => {
    const seen = new Set();
    const merged = [];

    (selectedValues || []).forEach((value) => {
      const resource = String(value ?? "").trim();
      if (!resource) return;
      const key = resource.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({ resource });
    });

    (options || []).forEach((opt) => {
      const resource = String(opt?.resource ?? "").trim();
      if (!resource) return;
      const key = resource.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(opt);
    });

    return merged;
  }, [options, selectedValues]);

  const openDropdown = async () => {
    setOpen(true);
    await onOpen?.();
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const toggleValue = (value) => {
    const strValue = String(value);
    if (selectedSet.has(strValue)) {
      onChange((selectedValues || []).filter((x) => String(x) !== strValue));
    } else {
      onChange([...(selectedValues || []), strValue]);
    }
  };

  const removeValue = (value) => {
    const strValue = String(value);
    onChange((selectedValues || []).filter((x) => String(x) !== strValue));
  };

  return (
    <div style={styles.multiWrap} ref={ref}>
      <div style={styles.multiControl} onClick={openDropdown}>
        <div style={styles.chipWrap}>
          {(selectedValues || []).length === 0 ? (
            <span style={styles.placeholderText}>{placeholder}</span>
          ) : (
            selectedValues.map((value) => (
              <span key={value} style={styles.chip}>
                <span>{value}</span>
                <button
                  type="button"
                  style={styles.chipClose}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(value);
                  }}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <div style={styles.dropdownArrow}>▾</div>
      </div>

      {open ? (
        <div style={styles.multiMenu}>
          <div style={styles.resourceSearchBox}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              placeholder="Search resource..."
              style={styles.resourceSearchInput}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>

          {loading && visibleOptions.length === 0 ? (
            <div style={styles.multiMenuEmpty}>Loading resources...</div>
          ) : visibleOptions.length === 0 ? (
            <div style={styles.multiMenuEmpty}>No resources found.</div>
          ) : (
            visibleOptions.map((opt) => {
              const checked = selectedSet.has(String(opt.resource));
              return (
                <label key={opt.resource} style={styles.multiMenuRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(opt.resource)}
                  />
                  <span>{opt.resource}</span>
                </label>
              );
            })
          )}

          {hasNext ? (
            <button
              type="button"
              style={styles.resourceLoadMoreBtn}
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                onLoadMore?.();
              }}
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const ResourceComponentInfo = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const dispatch = useDispatch();

  const producedItems = useSelector(selectSelectedProducedItems);
  const locations = useSelector(selectSelectedLocations);
  const locationIds = useSelector(selectSelectedLocationIds);
  const allLocations = useSelector(selectAllLocations);
  const locationsLoading = useSelector(selectLocationsLoading);
  const locationsError = useSelector(selectLocationsError);
  const resourceMetaLoading = useSelector(selectResourceMetaLoading);
  const resourceMetaError = useSelector(selectResourceMetaError);
  const hasInactiveItems = useSelector(selectHasInactiveSelected);
  const hasInactiveLocs = useSelector(selectHasInactiveLocationsSelected);
  const bomVersions = useSelector(selectBomVersions);
  const resourceOptionsByKey = useSelector(selectResourceOptionsByKey);
  const resourceComponentConfigs = useSelector(selectResourceComponentConfigs);

  const [loadingResourceOptionsByKey, setLoadingResourceOptionsByKey] = useState({});
  const [resourcePageByKey, setResourcePageByKey] = useState({});
  const [resourceHasNextByKey, setResourceHasNextByKey] = useState({});
  const resourceSearchTimerRef = useRef({});

  const [openItem, setOpenItem] = useState(null);
  const [openLocationKey, setOpenLocationKey] = useState(null);
  const [resourceSearchByKey, setResourceSearchByKey] = useState({});
  const [pageError, setPageError] = useState("");
  const metadataFetchKeyRef = useRef("");
  const itemSearchTimerRef = useRef({});
  const itemSearchCacheRef = useRef({});
  const [activeItemDropdownKey, setActiveItemDropdownKey] = useState(null);
  const [itemSearchByKey, setItemSearchByKey] = useState({});
  const [itemOptionsByKey, setItemOptionsByKey] = useState({});
  const [itemLoadingByKey, setItemLoadingByKey] = useState({});
  const [itemPaginationByKey, setItemPaginationByKey] = useState({});

  useEffect(() => {
    if (locationIds.length > 0 && allLocations.length === 0 && !locationsLoading) {
      dispatch(fetchLocationMaster());
    }
  }, [dispatch, locationIds.length, allLocations.length, locationsLoading]);

  useEffect(() => {
    if (!openItem && producedItems.length > 0) {
      setOpenItem(producedItems[0].id);
    }
  }, [producedItems, openItem]);

  useEffect(() => {
    if (!openLocationKey && producedItems.length > 0 && locations.length > 0) {
      setOpenLocationKey(buildConfigKey(producedItems[0].item, locations[0].location));
    }
  }, [producedItems, locations, openLocationKey]);

  useEffect(() => {
    producedItems.forEach((item) => {
      locations.forEach((loc) => {
        const key = buildConfigKey(item.item, loc.location);
        dispatch(
          ensureResourceComponentConfig({
            key,
            item: item.item,
            location: loc.location,
          })
        );
      });
    });
  }, [dispatch, producedItems, locations]);

  const loadLazyItemOptions = async ({ rowKey, searchText = "", page = 1, append = false }) => {
    const cleanSearch = String(searchText || "").trim();
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
      const result = await searchItemMasterOptions({ search: cleanSearch, page, pageSize: 50 });
      itemSearchCacheRef.current[cacheKey] = result;
      setItemOptionsByKey((prev) => ({
        ...prev,
        [rowKey]: append ? [...(prev[rowKey] || []), ...(result.rows || [])] : result.rows || [],
      }));
      setItemPaginationByKey((prev) => ({ ...prev, [rowKey]: result.pagination }));
    } catch (error) {
      console.error("Item master lazy search failed:", error);
      setItemOptionsByKey((prev) => ({ ...prev, [rowKey]: [] }));
      setItemPaginationByKey((prev) => ({
        ...prev,
        [rowKey]: { page: 1, pageSize: 50, total: 0, totalPages: 1, hasNext: false },
      }));
    } finally {
      setItemLoadingByKey((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  const handleLazyItemDropdownOpen = (rowKey, currentValue = "") => {
    setActiveItemDropdownKey(rowKey);
    const existingOptions = itemOptionsByKey[rowKey] || [];
    const existingSearchText = itemSearchByKey[rowKey] ?? currentValue ?? "";
    if (existingOptions.length > 0) return;
    loadLazyItemOptions({ rowKey, searchText: existingSearchText, page: 1, append: false });
  };

  const handleLazyItemSearchChange = (rowKey, value) => {
    setActiveItemDropdownKey(rowKey);
    setItemSearchByKey((prev) => ({ ...prev, [rowKey]: value }));
    if (itemSearchTimerRef.current[rowKey]) clearTimeout(itemSearchTimerRef.current[rowKey]);
    itemSearchTimerRef.current[rowKey] = setTimeout(() => {
      loadLazyItemOptions({ rowKey, searchText: value, page: 1, append: false });
    }, 350);
  };

  const handleLazyItemLoadMore = (rowKey) => {
    const searchText = itemSearchByKey[rowKey] || "";
    const pagination = itemPaginationByKey[rowKey] || {};
    const nextPage = Number(pagination.page || 1) + 1;
    loadLazyItemOptions({ rowKey, searchText, page: nextPage, append: true });
  };

  const isBlocked =
    producedItems.length === 0 ||
    locations.length === 0 ||
    hasInactiveItems ||
    hasInactiveLocs ||
    locationsLoading ||
    resourceMetaLoading;

  const getConfig = (item, location) => {
    const key = buildConfigKey(item, location);
    return (
      resourceComponentConfigs[key] || {
        item,
        location,
        resources: [],
        bomVersion: "PRIMARY",
        noComponentItems: false,
        producedCoProduct: true,
        replicateToAll: false,
        components: [],
        coproducts: [],
      }
    );
  };

  const updateConfig = (item, location, patch) => {
    const key = buildConfigKey(item, location);
    dispatch(setResourceComponentConfig({ key, config: patch }));
  };

  const handleBOMVersionChange = (item, location, value) => {
    updateConfig(item, location, { bomVersion: value });
  };

  const loadResourceOptionsFromBomSlice = async ({
    key,
    producedItem,
    location,
    searchText = "",
    page = 1,
    append = false,
  } = {}) => {
    if (!key || !producedItem || loadingResourceOptionsByKey[key]) return;

    setLoadingResourceOptionsByKey((prev) => ({ ...prev, [key]: true }));

    try {
      const resultAction = await dispatch(
        fetchResourcesLazyOptions({
          key,
          producedItem,
          location,
          search: searchText,
          page,
          pageSize: RESOURCE_PAGE_SIZE,
          append,
        })
      );

      if (fetchResourcesLazyOptions.fulfilled.match(resultAction)) {
        setResourcePageByKey((prev) => ({ ...prev, [key]: page }));
        setResourceHasNextByKey((prev) => ({
          ...prev,
          [key]: !!resultAction.payload?.pagination?.hasNext,
        }));
      } else {
        setResourceHasNextByKey((prev) => ({ ...prev, [key]: false }));
      }
    } catch (error) {
      console.error("Error fetching resource options from bomSlice:", error);
      setResourceHasNextByKey((prev) => ({ ...prev, [key]: false }));
    } finally {
      setLoadingResourceOptionsByKey((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleResourceSearchChange = (key, value) => {
    setResourceSearchByKey((prev) => ({ ...prev, [key]: value }));

    if (resourceSearchTimerRef.current[key]) {
      clearTimeout(resourceSearchTimerRef.current[key]);
    }

    resourceSearchTimerRef.current[key] = setTimeout(() => {
      const [producedItem, selectedLocation] = key.split("__");
      loadResourceOptionsFromBomSlice({
        key,
        producedItem,
        location: selectedLocation,
        searchText: value,
        page: 1,
        append: false,
      });
    }, 300);
  };

  const handleResourceLoadMore = (key) => {
    if (!resourceHasNextByKey[key] || loadingResourceOptionsByKey[key]) return;
    const [producedItem, selectedLocation] = key.split("__");
    loadResourceOptionsFromBomSlice({
      key,
      producedItem,
      location: selectedLocation,
      searchText: resourceSearchByKey[key] || "",
      page: Number(resourcePageByKey[key] || 1) + 1,
      append: true,
    });
  };

  const handleResourceSelectionChange = (item, location, nextResources) => {
    updateConfig(item, location, { resources: nextResources });
  };

  const handleNoComponentItems = (item, location, checked) => {
    updateConfig(item, location, {
      noComponentItems: checked,
      components: checked ? [] : getConfig(item, location).components,
    });
  };

  const handleProducedCoProduct = (item, location, checked) => {
    updateConfig(item, location, { producedCoProduct: checked });
  };

  const addComponentRow = (item, location) => {
    const config = getConfig(item, location);
    updateConfig(item, location, {
      components: [
        ...(config.components || []),
        { id: makeUniqueId("component"), componentItem: "", description: "", standardUsage: "" },
      ],
    });
  };

  const removeComponentRow = (item, location, rowId) => {
    const config = getConfig(item, location);
    updateConfig(item, location, {
      components: (config.components || []).filter((row) => row.id !== rowId),
    });
  };

  const changeComponentRow = (item, location, rowId, patch) => {
    const config = getConfig(item, location);
    const nextRows = (config.components || []).map((row) => {
      if (row.id !== rowId) return row;
      const nextRow = { ...row, ...patch };
      if (patch.componentItem !== undefined && patch.description === undefined) {
        nextRow.description = row.description ?? "";
      }
      return nextRow;
    });
    updateConfig(item, location, { components: nextRows });
  };

  const addCoProductRow = (item, location) => {
    const config = getConfig(item, location);
    updateConfig(item, location, {
      coproducts: [
        ...(config.coproducts || []),
        { id: makeUniqueId("coproduct"), coProductItem: "", description: "", qtyProduced: "" },
      ],
    });
  };

  const removeCoProductRow = (item, location, rowId) => {
    const config = getConfig(item, location);
    updateConfig(item, location, {
      coproducts: (config.coproducts || []).filter((row) => row.id !== rowId),
    });
  };

  const changeCoProductRow = (item, location, rowId, patch) => {
    const config = getConfig(item, location);
    const nextRows = (config.coproducts || []).map((row) => {
      if (row.id !== rowId) return row;
      const nextRow = { ...row, ...patch };
      if (patch.coProductItem !== undefined && patch.description === undefined) {
        nextRow.description = row.description ?? "";
      }
      return nextRow;
    });
    updateConfig(item, location, { coproducts: nextRows });
  };

  const handleReplicate = (item, location, checked) => {
    const sourceConfig = getConfig(item, location);
    updateConfig(item, location, { replicateToAll: checked });
    if (!checked) return;

    const componentPayload = {
      noComponentItems: !!sourceConfig.noComponentItems,
      components: cloneComponentRows(sourceConfig.components || []),
      producedCoProduct: !!sourceConfig.producedCoProduct,
      coproducts: cloneCoProductRows(sourceConfig.coproducts || []),
    };

    producedItems.forEach((targetItem) => {
      locations.forEach((targetLoc) => {
        const isSameSource =
          String(targetItem.item) === String(item) &&
          String(targetLoc.location) === String(location);
        if (isSameSource) return;
        updateConfig(targetItem.item, targetLoc.location, componentPayload);
      });
    });
  };

  const validateAllConfigs = () => {
    for (const item of producedItems) {
      for (const loc of locations) {
        const config = getConfig(item.item, loc.location);

        if (!config.bomVersion) return "BOM Version is required for every item and location.";
        if (!Array.isArray(config.resources) || config.resources.length === 0) {
          return "Please select at least one resource for every Item";
        }

        if (!config.noComponentItems) {
          const componentRows = Array.isArray(config.components) ? config.components : [];
          const hasAtLeastOneComponent = componentRows.some(
            (row) => String(row.componentItem ?? "").trim() !== ""
          );

          if (!hasAtLeastOneComponent) {
            return `Please add at least one component item or select "No Component Items" for ${item.item} / ${loc.location}.`;
          }

          for (const row of componentRows) {
            const componentItem = String(row.componentItem ?? "").trim();
            const usageText = String(row.standardUsage ?? "").trim();
            if (!componentItem && !usageText) continue;
            if (!componentItem) return `Please select a component item for ${item.item} / ${loc.location}.`;
            if (!(Number(usageText) > 0)) {
              return `Standard Usage must be greater than 0 for component ${componentItem} in ${item.item} / ${loc.location}.`;
            }
          }
        }

        const coRows = Array.isArray(config.coproducts) ? config.coproducts : [];
        for (const row of coRows) {
          const coProductItem = String(row.coProductItem ?? "").trim();
          const qtyText = String(row.qtyProduced ?? "").trim();
          if (!coProductItem && !qtyText) continue;
          if (!coProductItem) return `Please select a co-product item for ${item.item} / ${loc.location}.`;
          if (!(Number(qtyText) < 1)) {
            return `Qty Produced must be less than 1 for co-product ${coProductItem} in ${item.item} / ${loc.location}.`;
          }
        }
      }
    }
    return "";
  };

  const handleNext = () => {
    const validationMessage = validateAllConfigs();
    if (validationMessage) {
      setPageError(validationMessage);
      return;
    }

    setPageError("");

    const summaryConfigSnapshot = producedItems.flatMap((item) =>
      locations.map((loc) => {
        const key = buildConfigKey(item.item, loc.location);
        const config = getConfig(item.item, loc.location);
        const selectedResources = Array.isArray(config.resources) ? config.resources : [];
        const resourceOptions = resourceOptionsByKey[key] || [];

        const selectedResourceRows = selectedResources.map((resource) => ({
          resource,
          resourceRelevancy: getResourceRelevancy(resourceOptions, resource),
        }));

        const bomVersion = config.bomVersion || "PRIMARY";
        const bomId = buildBomId(bomVersion, item.item, loc.location);

        return {
          key,
          producedItem: item.item,
          producedItemDescription: item.description ?? item.desc ?? item.item_description ?? "",
          location: loc.location,
          locationName: loc.name ?? loc.location_description ?? loc.location ?? "",
          bomVersion,
          bomId,
          selectedResources: [...selectedResources],
          generatedRoutingRows: selectedResourceRows.map((row) => ({
            resource: row.resource ?? "",
            resourceRelevancy: row.resourceRelevancy ?? row.resource_relevancy ?? "",
            routingId: buildRoutingId(item.item, loc.location, row.resource),
          })),
          noComponentItems: !!config.noComponentItems,
          producedCoProduct: !!config.producedCoProduct,
          replicateToAll: !!config.replicateToAll,
          components: (config.components || []).map((row) => ({
            id: row.id,
            componentItem: row.componentItem ?? "",
            description: row.description ?? "",
            standardUsage: row.standardUsage ?? "",
          })),
          coproducts: (config.coproducts || []).map((row) => ({
            id: row.id,
            coProductItem: row.coProductItem ?? "",
            description: row.description ?? "",
            qtyProduced: row.qtyProduced ?? "",
          })),
        };
      })
    );

    navigate("/summary", {
      state: {
        flow: "create-bom",
        producedItems,
        locations,
        resourceComponentConfigs,
        resourceOptionsByKey,
        summaryConfigSnapshot,
        previousState: routerLocation?.state ?? null,
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 3: Resource & Component Info</h1>
        <p style={styles.subTitle}>Configure resources and components for each item and location</p>

        {(locationsLoading || resourceMetaLoading) && <div style={styles.infoBox}>Loading data...</div>}

        {(locationsError || resourceMetaError || pageError) && (
          <div style={styles.errorBox}>
            {locationsError ? `Locations Error: ${locationsError}` : null}
            {locationsError && (resourceMetaError || pageError) ? <br /> : null}
            {resourceMetaError ? `Step 3 Error: ${resourceMetaError}` : null}
            {resourceMetaError && pageError ? <br /> : null}
            {pageError || null}
          </div>
        )}

        {producedItems.length === 0 || locations.length === 0 ? (
          <div style={styles.warningBox}>
            No selected Produced Items / Locations found. Please complete Step 1 and Step 2 first.
          </div>
        ) : null}

        {(hasInactiveItems || hasInactiveLocs) && (
          <div style={styles.warningBox}>
            Inactive item/location selected. Please deselect inactive entries in previous steps before continuing.
          </div>
        )}

        {producedItems.map((item) => {
          const itemOpen = openItem === item.id;

          return (
            <div key={item.id} style={styles.itemCard}>
              <div style={styles.itemHeader} onClick={() => setOpenItem(itemOpen ? null : item.id)}>
                <div>
                  <div style={styles.itemTitle}>{item.item}</div>
                  <div style={styles.itemDesc}>{item.desc}</div>
                </div>
                <span>{itemOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}</span>
              </div>

              {itemOpen && (
                <div style={styles.itemBody}>
                  {locations.map((loc) => {
                    const key = buildConfigKey(item.item, loc.location);
                    const config = getConfig(item.item, loc.location);
                    const isOpenLoc = openLocationKey === key;
                    const resourceOptions = resourceOptionsByKey[key] || [];
                    const selectedResources = Array.isArray(config.resources) ? config.resources : [];
                    const searchValue = resourceSearchByKey[key] || "";
                    const loadingResourceOptions = !!loadingResourceOptionsByKey[key];
                    const resourceHasNext = !!resourceHasNextByKey[key];
                    const selectedResourceRows = selectedResources.map((resource) => ({
                      resource,
                      resourceRelevancy: getResourceRelevancy(resourceOptions, resource),
                    }));
                    const bomVersion = config.bomVersion || "PRIMARY";
                    const bomId = buildBomId(bomVersion, item.item, loc.location);

                    return (
                      <div key={key} style={styles.locationCard}>
                        <div style={styles.locationHeader} onClick={() => setOpenLocationKey(isOpenLoc ? null : key)}>
                          <div style={styles.locationHeaderText}>{loc.name || `Location ${loc.location}`}</div>
                          <span>{isOpenLoc ? <IoIosArrowUp /> : <IoIosArrowDown />}</span>
                        </div>

                        {isOpenLoc && (
                          <div style={styles.locationBody}>
                            <div style={styles.topGrid}>
                              <div>
                                <div style={styles.label}>Resource(s) *</div>
                                <MultiSelectDropdown
                                  options={resourceOptions}
                                  selectedValues={selectedResources}
                                  onChange={(nextResources) =>
                                    handleResourceSelectionChange(item.item, loc.location, nextResources)
                                  }
                                  onOpen={() =>
                                    loadResourceOptionsFromBomSlice({
                                      key,
                                      producedItem: item.item,
                                      location: loc.location,
                                      searchText: searchValue,
                                      page: 1,
                                      append: false,
                                    })
                                  }
                                  searchValue={searchValue}
                                  onSearchChange={(value) => handleResourceSearchChange(key, value)}
                                  onLoadMore={() => handleResourceLoadMore(key)}
                                  loading={loadingResourceOptions}
                                  hasNext={resourceHasNext}
                                  placeholder={loadingResourceOptions ? "Loading resources..." : "Select resource(s)"}
                                />
                                <div style={styles.helperText}>
                                  If desired resource is not found, please check Oracle work definitions.
                                </div>
                              </div>

                              <div>
                                <div style={styles.label}>BOM Version *</div>
                                <select
                                  style={styles.input}
                                  value={bomVersion}
                                  onChange={(e) => handleBOMVersionChange(item.item, loc.location, e.target.value)}
                                >
                                  {(bomVersions.length > 0
                                    ? bomVersions
                                    : ["PRIMARY", ...Array.from({ length: 20 }, (_, index) => `BOM${index + 1}`)]
                                  ).map((version) => (
                                    <option key={version} value={version}>
                                      {version}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div style={styles.singleFieldWrap}>
                              <div style={styles.label}>BOM ID</div>
                              <input value={bomId} readOnly style={styles.inputDisabled} />
                            </div>

                            {selectedResourceRows.length > 0 && (
                              <div style={styles.generatedBox}>
                                <div style={styles.generatedTitle}>Generated Routing IDs</div>
                                <div style={styles.generatedTable}>
                                  <div style={styles.generatedHeader}>
                                    <div>Resource</div>
                                    <div>Resource Relevancy</div>
                                    <div>Routing ID</div>
                                  </div>

                                  {selectedResourceRows.map((row) => (
                                    <div key={row.resource} style={styles.generatedRow}>
                                      <div>{row.resource}</div>
                                      <div>{row.resourceRelevancy || "-"}</div>
                                      <div>{buildRoutingId(item.item, loc.location, row.resource)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div style={styles.sectionGreen}>
                              <div style={styles.sectionHeader}>
                                <span style={styles.sectionTitle}>Component Items</span>
                                <button
                                  type="button"
                                  style={styles.linkBtn}
                                  onClick={() => addComponentRow(item.item, loc.location)}
                                  disabled={config.noComponentItems}
                                >
                                  + ADD COMPONENT
                                </button>
                              </div>

                              {!config.noComponentItems &&
                                (config.components || []).map((row) => (
                                  <div key={row.id} style={styles.rowForm}>
                                    <div style={styles.fieldWithLabel}>
                                      <div style={styles.inlineFieldLabel}>Component Item</div>
                                      {(() => {
                                        const rowKey = `component-${key}-${row.id}`;
                                        const options = itemOptionsByKey[rowKey] || [];
                                        const loading = !!itemLoadingByKey[rowKey];
                                        const pagination = itemPaginationByKey[rowKey] || {};

                                        return (
                                          <div style={styles.lazyDropdownWrap}>
                                            <input
                                              type="text"
                                              style={styles.input}
                                              value={row.componentItem}
                                              placeholder="Search Component Item"
                                              onFocus={() => handleLazyItemDropdownOpen(rowKey, row.componentItem)}
                                              onClick={() => handleLazyItemDropdownOpen(rowKey, row.componentItem)}
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                changeComponentRow(item.item, loc.location, row.id, {
                                                  componentItem: value,
                                                  description: "",
                                                });
                                                handleLazyItemSearchChange(rowKey, value);
                                              }}
                                            />

                                            {activeItemDropdownKey === rowKey && (
                                              <div style={styles.lazyDropdownMenu}>
                                                {loading && options.length === 0 ? (
                                                  <div style={styles.lazyDropdownEmpty}>Loading...</div>
                                                ) : options.length === 0 ? (
                                                  <div style={styles.lazyDropdownEmpty}>No items found</div>
                                                ) : (
                                                  <>
                                                    {options.map((option) => (
                                                      <div
                                                        key={option.item}
                                                        style={styles.lazyDropdownRow}
                                                        onMouseDown={(e) => {
                                                          e.preventDefault();
                                                          changeComponentRow(item.item, loc.location, row.id, {
                                                            componentItem: option.item,
                                                            description: option.item_desc || "",
                                                          });
                                                          setActiveItemDropdownKey(null);
                                                        }}
                                                      >
                                                        <div style={styles.lazyDropdownItem}>{option.item}</div>
                                                        <div style={styles.lazyDropdownDesc}>{option.item_desc || "-"}</div>
                                                      </div>
                                                    ))}
                                                    {pagination.hasNext && (
                                                      <button
                                                        type="button"
                                                        style={styles.lazyLoadMoreBtn}
                                                        disabled={loading}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => handleLazyItemLoadMore(rowKey)}
                                                      >
                                                        {loading ? "Loading..." : "Load More"}
                                                      </button>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    <div style={styles.fieldWithLabel}>
                                      <div style={styles.inlineFieldLabel}>Item Description</div>
                                      <input value={row.description} readOnly placeholder="Description" style={styles.inputDisabled} />
                                    </div>

                                    <div style={styles.fieldWithLabel}>
                                      <div style={styles.inlineFieldLabel}>Standard Usage</div>
                                      <input
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        placeholder="Standard Usage"
                                        value={row.standardUsage}
                                        onChange={(e) =>
                                          changeComponentRow(item.item, loc.location, row.id, { standardUsage: e.target.value })
                                        }
                                        style={styles.input}
                                      />
                                    </div>

                                    <div style={styles.deleteBtnContainer}>
                                      <button
                                        type="button"
                                        style={styles.deleteBtn}
                                        onClick={() => removeComponentRow(item.item, loc.location, row.id)}
                                      >
                                        <span style={styles.iconWrapper}><MdDelete /></span>
                                      </button>
                                    </div>
                                  </div>
                                ))}

                              <label style={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  checked={!!config.noComponentItems}
                                  onChange={(e) => handleNoComponentItems(item.item, loc.location, e.target.checked)}
                                />
                                <span>No Component Items</span>
                              </label>
                            </div>

                            <div style={styles.sectionBlue}>
                              <div style={styles.sectionHeader}>
                                <span style={styles.sectionTitle}>Co-Products</span>
                                <button type="button" style={styles.linkBtn} onClick={() => addCoProductRow(item.item, loc.location)}>
                                  + ADD CO-PRODUCT
                                </button>
                              </div>

                              {(config.coproducts || []).map((row) => (
                                <div key={row.id} style={styles.rowForm}>
                                  <div style={styles.fieldWithLabel}>
                                    <div style={styles.inlineFieldLabel}>Co-Product Item</div>
                                    {(() => {
                                      const rowKey = `coproduct-${key}-${row.id}`;
                                      const options = itemOptionsByKey[rowKey] || [];
                                      const loading = !!itemLoadingByKey[rowKey];
                                      const pagination = itemPaginationByKey[rowKey] || {};

                                      return (
                                        <div style={styles.lazyDropdownWrap}>
                                          <input
                                            type="text"
                                            style={styles.input}
                                            value={row.coProductItem}
                                            placeholder="Search Co-Product Item"
                                            onFocus={() => handleLazyItemDropdownOpen(rowKey, row.coProductItem)}
                                            onClick={() => handleLazyItemDropdownOpen(rowKey, row.coProductItem)}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              changeCoProductRow(item.item, loc.location, row.id, {
                                                coProductItem: value,
                                                description: "",
                                              });
                                              handleLazyItemSearchChange(rowKey, value);
                                            }}
                                          />

                                          {activeItemDropdownKey === rowKey && (
                                            <div style={styles.lazyDropdownMenu}>
                                              {loading && options.length === 0 ? (
                                                <div style={styles.lazyDropdownEmpty}>Loading...</div>
                                              ) : options.length === 0 ? (
                                                <div style={styles.lazyDropdownEmpty}>No items found</div>
                                              ) : (
                                                <>
                                                  {options.map((option) => (
                                                    <div
                                                      key={option.item}
                                                      style={styles.lazyDropdownRow}
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        changeCoProductRow(item.item, loc.location, row.id, {
                                                          coProductItem: option.item,
                                                          description: option.item_desc || "",
                                                        });
                                                        setActiveItemDropdownKey(null);
                                                      }}
                                                    >
                                                      <div style={styles.lazyDropdownItem}>{option.item}</div>
                                                      <div style={styles.lazyDropdownDesc}>{option.item_desc || "-"}</div>
                                                    </div>
                                                  ))}
                                                  {pagination.hasNext && (
                                                    <button
                                                      type="button"
                                                      style={styles.lazyLoadMoreBtn}
                                                      disabled={loading}
                                                      onMouseDown={(e) => e.preventDefault()}
                                                      onClick={() => handleLazyItemLoadMore(rowKey)}
                                                    >
                                                      {loading ? "Loading..." : "Load More"}
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div style={styles.fieldWithLabel}>
                                    <div style={styles.inlineFieldLabel}>Item Description</div>
                                    <input value={row.description} readOnly placeholder="Description" style={styles.inputDisabled} />
                                  </div>

                                  <div style={styles.fieldWithLabel}>
                                    <div style={styles.inlineFieldLabel}>Qty Produced</div>
                                    <input
                                      type="number"
                                      min="0"
                                      max="0.9999"
                                      step="0.0001"
                                      placeholder="Qty Produced"
                                      value={row.qtyProduced}
                                      onChange={(e) => changeCoProductRow(item.item, loc.location, row.id, { qtyProduced: e.target.value })}
                                      style={styles.input}
                                    />
                                  </div>

                                  <div style={styles.deleteBtnContainer}>
                                    <button
                                      type="button"
                                      style={styles.deleteBtn}
                                      onClick={() => removeCoProductRow(item.item, loc.location, row.id)}
                                    >
                                      <span style={styles.iconWrapper}><MdDelete /></span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <label style={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={!!config.producedCoProduct}
                                onChange={(e) => handleProducedCoProduct(item.item, loc.location, e.target.checked)}
                              />
                              <span>Produced Co-Product?</span>
                            </label>

                            <label style={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={!!config.replicateToAll}
                                onChange={(e) => handleReplicate(item.item, loc.location, e.target.checked)}
                              />
                              <span>Replicate Co-Product / Component Information for Selected Locations</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div style={styles.bottomBar}>
          <button
            style={{
              ...styles.nextBtn,
              backgroundColor: isBlocked ? "#e5e7eb" : "#2563eb",
              color: isBlocked ? "#9ca3af" : "#ffffff",
              cursor: isBlocked ? "not-allowed" : "pointer",
            }}
            disabled={isBlocked}
            onClick={handleNext}
          >
            NEXT: REVIEW SUMMARY →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceComponentInfo;

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f5f6f8", padding: "24px", boxSizing: "border-box" },
  inner: { maxWidth: "980px", margin: "0 auto" },
  back: { color: "#2563eb", cursor: "pointer", marginBottom: "10px", width: "fit-content", fontSize: "14px" },
  title: { margin: "0 0 6px 0", fontSize: "40px", fontWeight: 600, color: "#111827" },
  subTitle: { margin: "0 0 20px 0", color: "#4b5563", fontSize: "15px" },
  infoBox: { marginBottom: "12px", padding: "10px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af" },
  warningBox: { marginBottom: "12px", padding: "10px", borderRadius: "6px", background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" },
  errorBox: { marginBottom: "12px", padding: "10px", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", whiteSpace: "pre-wrap" },
  itemCard: { border: "1px solid #d1d5db", borderRadius: "6px", marginBottom: "18px", background: "#ffffff", overflow: "hidden" },
  itemHeader: { padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  itemTitle: { fontWeight: 600, fontSize: "14px", color: "#111827" },
  itemDesc: { color: "#6b7280", fontSize: "13px", marginTop: "2px" },
  itemBody: { padding: "0 14px 14px" },
  locationCard: { border: "1px solid #e5e7eb", borderRadius: "6px", marginTop: "10px", overflow: "hidden" },
  locationHeader: { padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", backgroundColor: "#ffffff" },
  locationHeaderText: { fontWeight: 600, fontSize: "14px", color: "#111827" },
  locationBody: { padding: "14px", borderTop: "1px solid #e5e7eb" },
  topGrid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "14px", alignItems: "start" },
  label: { fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" },
  fieldWithLabel: { display: "flex", flexDirection: "column" },
  inlineFieldLabel: { fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" },
  removeBtn: { cursor: "pointer", border: "none", background: "transparent", padding: "10px" },
  iconWrapper: { all: "unset", color: "#dc2626", fontSize: "28px" },
  deleteBtnContainer: { display: "flex", alignItems: "flex-end", height: "100%" },
  input: { width: "100%", height: "36px", padding: "0 10px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "#ffffff", boxSizing: "border-box", fontSize: "14px" },
  inputDisabled: { width: "100%", height: "36px", padding: "0 10px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "#f3f4f6", color: "#6b7280", boxSizing: "border-box", fontSize: "14px" },
  singleFieldWrap: { marginTop: "10px", maxWidth: "380px" },
  helperText: { marginTop: "4px", fontSize: "11px", color: "#6b7280" },
  multiSelectWrap: { position: "relative" },
  multiSelectBox: { minHeight: "36px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", gap: "8px", cursor: "pointer" },
  chipsWrap: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", flex: 1 },
  chip: { display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "12px", padding: "2px 8px", fontSize: "12px" },
  chipX: { cursor: "pointer", fontWeight: 600 },
  resourceSearchInput: { width: "100%", height: "34px", borderRadius: "3px", border: "1px solid #cfd4dc", padding: "0 10px", fontSize: "13px", outline: "none", boxSizing: "border-box" },
  dropdownArrow: { color: "#6b7280", fontSize: "12px", cursor: "pointer", userSelect: "none" },
  dropdownMenu: { position: "absolute", top: "40px", left: 0, right: 0, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", zIndex: 30, maxHeight: "180px", overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.08)" },
  dropdownRow: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", fontSize: "14px", cursor: "pointer" },
  dropdownEmpty: { padding: "10px", fontSize: "13px", color: "#6b7280" },
  generatedBox: { marginTop: "14px" },
  generatedTitle: { fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "8px" },
  generatedTable: { border: "1px solid #d1d5db", borderRadius: "4px", overflow: "hidden" },
  generatedHeader: { display: "grid", gridTemplateColumns: "1fr 1fr 2fr", backgroundColor: "#f3f4f6", padding: "8px 10px", fontSize: "12px", fontWeight: 600, color: "#374151", borderBottom: "1px solid #d1d5db" },
  generatedRow: { display: "grid", gridTemplateColumns: "1fr 1fr 2fr", padding: "8px 10px", fontSize: "12px", color: "#111827", borderBottom: "1px solid #e5e7eb" },
  sectionGreen: { marginTop: "16px", padding: "12px", borderRadius: "4px", backgroundColor: "#edf7f0", border: "1px solid #d5eadb" },
  sectionBlue: { marginTop: "14px", padding: "12px", borderRadius: "4px", backgroundColor: "#eef4fb", border: "1px solid #d8e4f2" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  sectionTitle: { fontSize: "14px", fontWeight: 600, color: "#111827" },
  linkBtn: { border: "none", background: "none", color: "#2563eb", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  rowForm: { display: "grid", gridTemplateColumns: "1fr 1fr 180px 36px", gap: "8px", alignItems: "center", marginBottom: "8px" },
  deleteBtn: { width: "36px", height: "36px", border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" },
  checkboxRow: { marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#111827" },
  lazyDropdownWrap: { position: "relative", width: "100%" },
  lazyDropdownMenu: { position: "absolute", top: "40px", left: 0, right: 0, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", zIndex: 80, maxHeight: "240px", overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" },
  lazyDropdownRow: { padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" },
  lazyDropdownItem: { fontSize: "13px", fontWeight: 600, color: "#111827" },
  lazyDropdownDesc: { fontSize: "12px", color: "#6b7280", marginTop: "2px" },
  lazyDropdownEmpty: { padding: "10px", fontSize: "13px", color: "#6b7280" },
  lazyLoadMoreBtn: { width: "100%", border: "none", backgroundColor: "#f3f4f6", color: "#2563eb", padding: "9px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  multiWrap: { position: "relative", width: "100%" },
  multiControl: { minHeight: "36px", border: "1px solid #d1d5db", borderRadius: "4px", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", cursor: "pointer", boxSizing: "border-box" },
  chipWrap: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", flex: 1 },
  placeholderText: { fontSize: "14px", color: "#9ca3af" },
  chipClose: { border: "none", background: "transparent", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: 0, color: "#6b7280" },
  multiMenu: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: "260px", overflowY: "auto", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 9999 },
  resourceSearchBox: { padding: "8px", background: "#ffffff", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, zIndex: 2 },
  multiMenuRow: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", fontSize: "14px", color: "#111827", cursor: "pointer", borderTop: "1px solid #f3f4f6" },
  multiMenuEmpty: { padding: "12px", fontSize: "13px", color: "#6b7280" },
  resourceLoadMoreBtn: { width: "100%", border: "none", borderTop: "1px solid #f3f4f6", backgroundColor: "#f3f4f6", color: "#2563eb", padding: "9px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },
  bottomBar: { marginTop: "20px", display: "flex", justifyContent: "flex-end" },
  nextBtn: { padding: "10px 18px", borderRadius: "4px", border: "none", fontSize: "13px", fontWeight: 500, letterSpacing: "0.2px" },
};
