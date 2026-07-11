import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MdDelete } from "react-icons/md";

import {
    selectModifyExistingBomState,
    setModifyExistingBomState,
    clearModifyExistingBomState,
} from "../redux/bomSlice";

const ModifyExistingBOMData = () => {

    // Simple in-file searchable select component to avoid new deps
    const SearchableSelect = ({ options = [], value = "", onChange, disabled = false, placeholder = "Select item" }) => {
        const [query, setQuery] = useState("");
        const [open, setOpen] = useState(false);
        const wrapperRef = useRef(null);

        useEffect(() => {
            const handler = (e) => {
                if (!wrapperRef.current) return;
                if (!wrapperRef.current.contains(e.target)) setOpen(false);
            };
            document.addEventListener("click", handler);
            return () => document.removeEventListener("click", handler);
        }, []);

        useEffect(() => {
            const selected = options.find((o) => String(o.value) === String(value));
            setQuery(selected ? selected.label : value || "");
        }, [value, options]);

        const filtered = options.filter((o) =>
            String(o.label).toLowerCase().includes(String(query).toLowerCase()) || String(o.value).toLowerCase().includes(String(query).toLowerCase())
        );

        return (
            <div ref={wrapperRef} style={{ position: "relative" }}>
                <input
                    style={disabled ? styles.selectDisabled : styles.searchInput}
                    value={query}
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        if (!disabled && onChange && e.target.value === "") onChange("");
                    }}
                    onFocus={() => setOpen(true)}
                />
                {open && !disabled && (
                    <div style={styles.dropdownList}>
                        {filtered.length === 0 ? (
                            <div style={styles.dropdownItem}>No matches</div>
                        ) : (
                            filtered.map((opt) => (
                                <div
                                    key={opt.value}
                                    style={styles.dropdownItem}
                                    onMouseDown={() => {
                                        // use onMouseDown to avoid blur before click
                                        onChange && onChange(opt.value);
                                        setQuery(opt.label);
                                        setOpen(false);
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };
    const dispatch = useDispatch();
    const persistedBomState = useSelector(selectModifyExistingBomState);
    const [coProducts, setCoProducts] = useState(
        (persistedBomState?.coProducts || []).map((c) => ({ ...c }))
    );
    const [initialCoProducts, setInitialCoProducts] = useState(
        (persistedBomState?.initialCoProducts || []).map((c) => ({ ...c }))
    );
    const [producedCoProduct, setProducedCoProduct] = useState(
        persistedBomState?.producedCoProduct || false
    );
    const navigate = useNavigate();
    const { state } = useLocation();
    const { id } = useParams();

    const [record, setRecord] = useState(
        state?.record || (persistedBomState?.record ? { ...persistedBomState.record } : null) || null
    );
    const [loading, setLoading] = useState(
        !state?.record && !persistedBomState?.record
    );
    const [error, setError] = useState("");

    const [componentItems, setComponentItems] = useState(
        (persistedBomState?.componentItems || []).map((c) => ({ ...c }))
    );
    const [initialComponentItems, setInitialComponentItems] = useState(
        (persistedBomState?.initialComponentItems || []).map((c) => ({ ...c }))
    );
    const [validationError, setValidationError] = useState("");

    // State for fetched items
    const [componentItemOptions, setComponentItemOptions] = useState([]);
    const [coProductOptions, setCoProductOptions] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    //for dropdown options
    const [allComponentOptions, setAllComponentOptions] = useState([]);
    const [allCoProductOptions, setAllCoProductOptions] = useState([]);

    // Lazy loading + search inside Component / Co-Product dropdowns
    const itemSearchTimerRef = useRef({});
    const itemSearchCacheRef = useRef({});
    const [activeItemDropdownKey, setActiveItemDropdownKey] = useState(null);
    const [itemSearchByKey, setItemSearchByKey] = useState({});
    const [itemOptionsByKey, setItemOptionsByKey] = useState({});
    const [itemLoadingByKey, setItemLoadingByKey] = useState({});
    const [itemPaginationByKey, setItemPaginationByKey] = useState({});

    // Lazy Resource dropdown for Co-Product / Resource / BOM ID combinations
    const RESOURCE_PAGE_SIZE = 50;
    const resourceSearchTimerRef = useRef({});
    const resourceOptionsLoadedRef = useRef(false);
    const [allGcpResourceOptions, setAllGcpResourceOptions] = useState([]);
    const [activeResourceDropdownKey, setActiveResourceDropdownKey] = useState(null);
    const [resourceSearchByKey, setResourceSearchByKey] = useState({});
    const [resourceOptionsByKey, setResourceOptionsByKey] = useState({});
    const [resourceLoadingByKey, setResourceLoadingByKey] = useState({});
    const [resourcePaginationByKey, setResourcePaginationByKey] = useState({});

    // lookup to get item descriptions for both co products and component items 
    const [itemMasterLookup, setItemMasterLookup] = useState({});

    //useeffect for item descriptions
    useEffect(() => {
        const fetchItemMaster = async () => {
            try {
                const res = await fetch(
                    "/api/bigquery/table/item_master"
                );

                const data = await res.json();

                const rows = Array.isArray(data?.data)
                    ? data.data
                    : [];

                const lookup = {};

                rows.forEach((row) => {
                    lookup[row.item] = row.item_desc || "";
                });

                setItemMasterLookup(lookup);

               
            } catch (err) {
                console.error("Failed to fetch item master", err);
            }
        };

        fetchItemMaster();
    }, []);

    //laoding the description 
    useEffect(() => {
        if (!Object.keys(itemMasterLookup).length) return;

        setComponentItems((prev) =>
            prev.map((row) => ({
                ...row,
                component_desc:
                    itemMasterLookup[row.component_item] || "",
            }))
        );
        setInitialComponentItems((prev) =>
            prev.map((row) => ({
                ...row,
                component_desc: itemMasterLookup[row.component_item] || "",
            }))
        );

        setCoProducts((prev) =>
            prev.map((row) => ({
                ...row,
                desc:
                    itemMasterLookup[row.item] || "",
            }))
        );
        setInitialCoProducts((prev) =>
            prev.map((row) => ({
                ...row,
                desc: itemMasterLookup[row.item] || "",
            }))
        );
    }, [itemMasterLookup]);

    // fallback API fetch if page is opened directly / refreshed
    useEffect(() => {
        if (record) return;
        if (persistedBomState?.record) return;

        const fetchRecord = async () => {
            try {
                setLoading(true);
                setError("");

                const res = await fetch(`/api/tables/item_bom_routing/${id}`);
                if (!res.ok) throw new Error("Failed to fetch record");

                const data = await res.json();
                const rows = normalizeApiArray(data);

                // map backend response -> UI shape
                const mappedRows = rows.map((row, index) => ({
                    id: row.id || `${row.bom_id || "BOM"}__${row.routing_id || index}`,
                    location: row.location || "-",
                    produced_item: row.produced_item || "-",
                    produced_item_desc: row.produced_item_desc || "-",
                    bom_id: row.bom_id || "-",
                    resource: row.resource || "-",
                    routing_id: row.routing_id || "",
                    item_release_flag: row.item_release_flag || "-",
                }));

                setRecord(mappedRows[0] || null);
            } catch (e) {
                setError(e.message || "Failed to load record");
            } finally {
                setLoading(false);
            }
        };

        fetchRecord();
    }, [id, record]);

    const normalizeApiArray = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.rows)) return payload.rows;
        if (Array.isArray(payload?.value)) return payload.value;
        if (payload && typeof payload === "object") return [payload];
        return [];
    };

    const searchItemMasterOptions = async ({ search = "", page = 1, pageSize = 50 }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("filterBy", "item");
        params.set("search", String(search || "").trim());
        const response = await fetch(`/api/bigquery/table/item-master-with-releaseflag?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        return {
            rows: rows.map((row) => ({
                item: row.item ?? row.item_id ?? "",
                item_desc: row.item_desc ?? row.item_description ?? row.description ?? "",
            })),
            pagination: payload?.pagination || { page, pageSize, total: rows.length, totalPages: 1, hasNext: false },
        };
    };

    const fetchJsonNoLimit = async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return normalizeApiArray(data);
    };

    const getResourceFromRoutingId = (routingId) => {
        const parts = String(routingId || "")
            .split("_")
            .map((part) => part.trim())
            .filter(Boolean);
        return parts.length >= 3 ? parts.slice(2).join("_") : "";
    };

    const isCoProductRoutingRow = (row) =>
        String(row?.erp_co_product_association ?? row?.co_product_association ?? "").trim() === "1";

    const getRowItem = (row) =>
        String(row?.item ?? row?.Item ?? row?.component_item ?? row?.componentItem ?? "").trim();

    const getRowResource = (row) =>
        String(row?.resource ?? row?.Resource ?? "").trim() || getResourceFromRoutingId(row?.routing_id ?? row?.routingId);

    const buildOption = (item) => {
        const value = String(
            item.item ?? item.Item ?? item.item_id ?? item.id ?? item.component_item ?? item.componentItem ?? item.routing_id ?? item.RoutingID ?? ""
        ).trim();
        const label = String(
            item.item_name ?? item.ItemName ?? item.item ?? item.Item ?? item.label ?? item.description ?? item.desc ?? item.component_item ?? item.componentItem ?? value
        ).trim();
        const desc = String(
            item.description ?? item.desc ?? item.item_desc ?? item.ItemDesc ?? item.item_description ?? item.component_desc ?? ""
        ).trim();
        return { value, label: label || value, desc };
    };


    
    const getItemDescriptionFromItemDetails = async (items = []) => {
        const uniqueItems = Array.from(new Set(items.map((x) => String(x || "").trim()).filter(Boolean)));
        if (!uniqueItems.length) return {};

        const lookup = {};

        try {
            const res = await fetch("/api/tables/item-details/by-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: uniqueItems }),
            });

            if (res.ok) {
                const data = await res.json();
                const rows = normalizeApiArray(data);

                rows.forEach((row) => {
                    const item = String(row.item ?? row.Item ?? row.item_id ?? "").trim();
                    const desc = String(
                        row.item_desc ??
                        row.item_description ??
                        row.ItemDesc ??
                        row.ItemDescription ??
                        row.description ??
                        row.desc ??
                        ""
                    ).trim();

                    if (item && desc) {
                        lookup[item] = desc;
                        lookup[item.toUpperCase()] = desc;
                    }
                });
            }
        } catch (err) {
            console.error("Failed to fetch descriptions from item_details", err);
        }

        return lookup;
    };

// Fetch component items and co-products based on selected BOM / produced item / location / resource / routing id
    useEffect(() => {
        const selectedRecord = state?.record || record || {};

        const bomId =
            selectedRecord?.bom_id ||
            selectedRecord?.BOMID ||
            selectedRecord?.bomId ||
            "";

        const producedItem =
            selectedRecord?.produced_item ||
            selectedRecord?.producedItem ||
            selectedRecord?.item ||
            "";

        const selectedLocation =
            selectedRecord?.location ||
            selectedRecord?.Location ||
            "";

        const selectedResource =
            selectedRecord?.resource ||
            selectedRecord?.Resource ||
            getResourceFromRoutingId(selectedRecord?.routing_id || selectedRecord?.routingId) ||
            "";

        const selectedRoutingId =
            selectedRecord?.routing_id ||
            selectedRecord?.routingId ||
            (producedItem && selectedResource
                ? `ROUTING_${producedItem}_${selectedResource}`
                : "");

        if (!bomId) return;
        // Always refetch for the currently selected BOM record. Do not reuse persisted Redux rows here.

        const fetchItems = async () => {
            try {
                setItemsLoading(true);
                setError("");

                const params = new URLSearchParams();
                params.set("bomId", String(bomId || "").trim());
                params.set("producedItem", String(producedItem || "").trim());
                params.set("location", String(selectedLocation || "").trim());
                params.set("resource", String(selectedResource || "").trim());
                params.set("routingId", String(selectedRoutingId || "").trim());

                const response = await fetch(
                    `/api/tables/modify-existing-bom-details?${params.toString()}`
                );

                const payload = await response.json().catch(() => ({}));

                if (!response.ok || payload?.success === false) {
                    throw new Error(
                        payload?.details
                            ? `${payload?.error || "Failed to fetch modify existing BOM details"}: ${typeof payload.details === "string" ? payload.details : JSON.stringify(payload.details)}`
                            : payload?.error || "Failed to fetch modify existing BOM details"
                    );
                }

                const data = payload?.data || {};
                const fetchedComponents = Array.isArray(data.componentItems)
                    ? data.componentItems
                    : [];
                const fetchedCoProducts = Array.isArray(data.coProducts)
                    ? data.coProducts
                    : [];

                const normalizedComponents = fetchedComponents.map((row) => ({
                    component_item: row.component_item || "",
                    original_component_item:
                        row.original_component_item || row.component_item || "",
                    component_desc:
                        row.component_desc ||
                        row.item_desc ||
                        row.item_description ||
                        row.description ||
                        row.desc ||
                        "",
                    original_component_desc:
                        row.original_component_desc ||
                        row.component_desc ||
                        row.item_desc ||
                        row.item_description ||
                        row.description ||
                        row.desc ||
                        "",
                    standard_usage: row.standard_usage || "",
                    original_standard_usage:
                        row.original_standard_usage || row.standard_usage || "",
                }));

                const normalizedCoProducts = fetchedCoProducts.map((row) => ({
                    item: row.item || "",
                    original_item: row.original_item || row.item || "",
                    desc: row.desc || "",
                    original_desc: row.original_desc || row.desc || "",
                    qty: row.qty || "",
                    original_qty: row.original_qty || row.qty || "",
                    resource: row.resource || selectedResource || "",
                    original_resource:
                        row.original_resource || row.resource || selectedResource || "",
                    routing_id: row.routing_id || selectedRoutingId || "",
                    original_routing_id:
                        row.original_routing_id || row.routing_id || selectedRoutingId || "",
                    erp_co_product_association:
                        row.erp_co_product_association || "1",
                    itemBomRoutingPriority:
                        row.itemBomRoutingPriority ||
                        row.item_bom_routing_priority ||
                        row.erp_item_bom_routing_priority ||
                        "",
                }));

                setComponentItemOptions(
                    normalizedComponents.map((row) => ({
                        value: row.component_item,
                        label: row.component_item,
                        desc: row.component_desc,
                    }))
                );

                setCoProductOptions(
                    normalizedCoProducts.map((row) => ({
                        value: row.item,
                        label: row.item,
                        desc: row.desc,
                    }))
                );

                setComponentItems(normalizedComponents);
                setInitialComponentItems(normalizedComponents.map((row) => ({ ...row })));

                setCoProducts(normalizedCoProducts);
                setInitialCoProducts(normalizedCoProducts.map((row) => ({ ...row })));

                setProducedCoProduct(normalizedCoProducts.length > 0);
            } catch (e) {
                console.error("Error fetching modify existing BOM details:", e);
                setError(e.message || "Failed to fetch modify existing BOM details");
                setComponentItems([]);
                setInitialComponentItems([]);
                setCoProducts([]);
                setInitialCoProducts([]);
                setProducedCoProduct(false);
            } finally {
                setItemsLoading(false);
            }
        };

        fetchItems();
    }, [
        state?.record,
        record,
        persistedBomState?.record,
        persistedBomState?.initialComponentItems?.length,
        persistedBomState?.initialCoProducts?.length,
    ]);

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

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const componentRes = await fetch(
                    "/api/bigquery/table/item_master"
                );
                const componentData = await componentRes.json();
                

                const componentRows = normalizeApiArray(componentData);
                

                setAllComponentOptions(
                    componentRows.map(buildOption)
                );

                const coProductRes = await fetch(
                    "/api/bigquery/table/item_master"
                );
                const coProductData = await coProductRes.json();
               

                const coProductRows = normalizeApiArray(coProductData);
              
                setAllCoProductOptions(
                    coProductRows.map(buildOption)
                );
            } catch (err) {
                console.error(err);
            }
        };

        fetchDropdownData();
    }, []);

    const addComponent = () => {
        setComponentItems((prev) => [
            ...prev,
            {
                component_item: "",
                component_desc: "",
                original_component_desc: "",
                standard_usage: "",
                original_standard_usage: "",
                isNew: true,
            },
        ]);
    };

    const handleComponentItemChange = (index, value, description = "") => {
        const descValue = description || itemMasterLookup[value] || "";
        setComponentItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        component_item: value,
                        component_desc: descValue,
                    }
                    : item
            )
        );
    };

    const updateComponent = (index, field, value) => {
        setComponentItems((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    const removeComponent = (index) => {
        setComponentItems((prev) => prev.filter((_, i) => i !== index));
    };

    const getQtyProducedFieldError = (value) => {
        const trimmed = String(value).trim();
        if (trimmed === "") return "";
        const num = Number(trimmed);
        if (Number.isNaN(num)) return "Qty Produced must be numeric.";
        if (num >= 1) return "Qty Produced must be less than 1.";
        return "";
    };

    const hasMissingStandardUsage = componentItems.some(
        (item) => String(item.standard_usage).trim() === ""
    );

    const hasMissingCoProductFields = coProducts.some((cp) => {
        if (!producedCoProduct) return false;
        const missingItem = String(cp.item ?? "").trim() === "";
        const missingQty = String(cp.qty ?? "").trim() === "";
        const missingResource = String(cp.resource ?? "").trim() === "";
        const missingPriority =
            !!cp.isNew && String(cp.itemBomRoutingPriority ?? "").trim() === "";
        return missingItem || missingQty || missingResource || missingPriority;
    });

    const hasInvalidCoProductQty = coProducts.some((cp) => {
        if (!producedCoProduct) return false;
        const trimmed = String(cp.qty ?? "").trim();
        if (trimmed === "") return false;
        const num = Number(trimmed);
        return !Number.isNaN(num) && num >= 1;
    });

    const hasInvalidCoProductPriority = coProducts.some((cp) => {
        if (!producedCoProduct || !cp.isNew) return false;
        const trimmed = String(cp.itemBomRoutingPriority ?? "").trim();
        if (trimmed === "") return false;
        const num = Number(trimmed);
        return Number.isNaN(num);
    });

    const hasInvalidNumericValues = hasInvalidCoProductQty || hasInvalidCoProductPriority;

    useEffect(() => {
        if (!hasMissingStandardUsage && !hasMissingCoProductFields && !hasInvalidNumericValues) {
            setValidationError("");
        }
    }, [hasMissingStandardUsage, hasMissingCoProductFields, hasInvalidNumericValues]);

    const loadLazyItemOptions = async ({ rowKey, searchText = "", page = 1, append = false }) => {
        const cleanSearch = String(searchText || "").trim();
        const cacheKey = `${cleanSearch.toLowerCase()}__${page}`;
        setItemSearchByKey((prev) => ({ ...prev, [rowKey]: searchText }));
        if (itemSearchCacheRef.current[cacheKey]) {
            const cached = itemSearchCacheRef.current[cacheKey];
            setItemOptionsByKey((prev) => ({ ...prev, [rowKey]: append ? [...(prev[rowKey] || []), ...(cached.rows || [])] : cached.rows || [] }));
            setItemPaginationByKey((prev) => ({ ...prev, [rowKey]: cached.pagination }));
            return;
        }
        setItemLoadingByKey((prev) => ({ ...prev, [rowKey]: true }));
        try {
            const result = await searchItemMasterOptions({ search: cleanSearch, page, pageSize: 50 });
            itemSearchCacheRef.current[cacheKey] = result;
            setItemOptionsByKey((prev) => ({ ...prev, [rowKey]: append ? [...(prev[rowKey] || []), ...(result.rows || [])] : result.rows || [] }));
            setItemPaginationByKey((prev) => ({ ...prev, [rowKey]: result.pagination }));
        } catch (error) {
            console.error("Item master lazy search failed:", error);
            setItemOptionsByKey((prev) => ({ ...prev, [rowKey]: [] }));
            setItemPaginationByKey((prev) => ({ ...prev, [rowKey]: { page: 1, pageSize: 50, total: 0, totalPages: 1, hasNext: false } }));
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
        loadLazyItemOptions({ rowKey, searchText, page: Number(pagination.page || 1) + 1, append: true });
    };

    const loadAllGcpResourceOptions = async () => {
        if (resourceOptionsLoadedRef.current && allGcpResourceOptions.length > 0) return allGcpResourceOptions;
        const routingResconsRows = await fetchJsonNoLimit("/api/bigquery/table/routing_rescons");
        const seenResources = new Set();
        const resourceOptions = [];
        routingResconsRows.forEach((row) => {
            const resource = String(row.resource ?? "").trim();
            if (!resource) return;
            const key = resource.toUpperCase();
            if (seenResources.has(key)) return;
            seenResources.add(key);
            resourceOptions.push({ resource });
        });
        setAllGcpResourceOptions(resourceOptions);
        resourceOptionsLoadedRef.current = true;
        return resourceOptions;
    };

    const loadLazyResourceOptions = async ({ rowKey, searchText = "", page = 1 } = {}) => {
        setResourceLoadingByKey((prev) => ({ ...prev, [rowKey]: true }));
        try {
            const allResources = await loadAllGcpResourceOptions();
            const cleanSearch = String(searchText || "").trim().toLowerCase();
            const filteredOptions = cleanSearch
                ? allResources.filter((opt) => String(opt.resource ?? "").toLowerCase().includes(cleanSearch))
                : allResources;
            const endIndex = Number(page || 1) * RESOURCE_PAGE_SIZE;
            setResourceOptionsByKey((prev) => ({ ...prev, [rowKey]: filteredOptions.slice(0, endIndex) }));
            setResourcePaginationByKey((prev) => ({ ...prev, [rowKey]: { page, hasNext: endIndex < filteredOptions.length } }));
        } catch (error) {
            console.error("Resource lazy search failed:", error);
            setResourceOptionsByKey((prev) => ({ ...prev, [rowKey]: [] }));
            setResourcePaginationByKey((prev) => ({ ...prev, [rowKey]: { page: 1, hasNext: false } }));
        } finally {
            setResourceLoadingByKey((prev) => ({ ...prev, [rowKey]: false }));
        }
    };

    const handleLazyResourceDropdownOpen = (rowKey, currentValue = "") => {
        setActiveResourceDropdownKey(rowKey);
        const existingOptions = resourceOptionsByKey[rowKey] || [];
        const existingSearchText = resourceSearchByKey[rowKey] ?? currentValue ?? "";
        if (existingOptions.length > 0) return;
        loadLazyResourceOptions({ rowKey, searchText: existingSearchText, page: 1 });
    };

    const handleLazyResourceSearchChange = (rowKey, value) => {
        setActiveResourceDropdownKey(rowKey);
        setResourceSearchByKey((prev) => ({ ...prev, [rowKey]: value }));
        if (resourceSearchTimerRef.current[rowKey]) clearTimeout(resourceSearchTimerRef.current[rowKey]);
        resourceSearchTimerRef.current[rowKey] = setTimeout(() => {
            loadLazyResourceOptions({ rowKey, searchText: value, page: 1 });
        }, 300);
    };

    const handleLazyResourceLoadMore = (rowKey) => {
        const searchText = resourceSearchByKey[rowKey] || "";
        const pagination = resourcePaginationByKey[rowKey] || {};
        loadLazyResourceOptions({ rowKey, searchText, page: Number(pagination.page || 1) + 1 });
    };

    const renderLazyResourceInput = ({ rowKey, value, updateValue }) => {
        const options = resourceOptionsByKey[rowKey] || [];
        const isLoading = !!resourceLoadingByKey[rowKey];
        const pagination = resourcePaginationByKey[rowKey] || {};
        return (
            <div style={styles.lazyDropdownWrap}>
                <input type="text" value={value} placeholder="Search Resource" onFocus={() => handleLazyResourceDropdownOpen(rowKey, value)} onClick={() => handleLazyResourceDropdownOpen(rowKey, value)} onChange={(e) => { updateValue(e.target.value); handleLazyResourceSearchChange(rowKey, e.target.value); }} style={styles.tableInput} />
                {activeResourceDropdownKey === rowKey ? (
                    <div style={styles.lazyDropdownMenu}>
                        {isLoading && options.length === 0 ? <div style={styles.lazyDropdownEmpty}>Loading resources...</div> : options.length === 0 ? <div style={styles.lazyDropdownEmpty}>No resources found</div> : (
                            <>
                                {options.map((option) => <div key={option.resource} style={styles.lazyDropdownRow} onMouseDown={(e) => { e.preventDefault(); updateValue(option.resource); setActiveResourceDropdownKey(null); }}><div style={styles.lazyDropdownItem}>{option.resource}</div></div>)}
                                {pagination.hasNext ? <button type="button" style={styles.lazyLoadMoreBtn} disabled={isLoading} onMouseDown={(e) => e.preventDefault()} onClick={() => handleLazyResourceLoadMore(rowKey)}>{isLoading ? "Loading..." : "Load More"}</button> : null}
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    const renderLazyItemInput = ({ rowKey, value, placeholder, updateValue, applySelection }) => {
        const options = itemOptionsByKey[rowKey] || [];
        const isLoading = !!itemLoadingByKey[rowKey];
        const pagination = itemPaginationByKey[rowKey] || {};
        return (
            <div style={styles.lazyDropdownWrap}>
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onFocus={() => handleLazyItemDropdownOpen(rowKey, value)}
                    onClick={() => handleLazyItemDropdownOpen(rowKey, value)}
                    onChange={(e) => { updateValue(e.target.value); handleLazyItemSearchChange(rowKey, e.target.value); }}
                    style={styles.tableInput}
                />
                {activeItemDropdownKey === rowKey ? (
                    <div style={styles.lazyDropdownMenu}>
                        {isLoading && options.length === 0 ? <div style={styles.lazyDropdownEmpty}>Loading...</div> : options.length === 0 ? <div style={styles.lazyDropdownEmpty}>No items found</div> : (
                            <>
                                {options.map((option) => (
                                    <div key={option.item} style={styles.lazyDropdownRow} onMouseDown={(e) => { e.preventDefault(); applySelection(option); setActiveItemDropdownKey(null); }}>
                                        <div style={styles.lazyDropdownItem}>{option.item}</div>
                                        <div style={styles.lazyDropdownDesc}>{option.item_desc || "-"}</div>
                                    </div>
                                ))}
                                {pagination.hasNext ? <button type="button" style={styles.lazyLoadMoreBtn} disabled={isLoading} onMouseDown={(e) => e.preventDefault()} onClick={() => handleLazyItemLoadMore(rowKey)}>{isLoading ? "Loading..." : "Load More"}</button> : null}
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    const validateAndNavigate = () => {
        if (hasMissingStandardUsage) {
            setValidationError(
                "Please fill in Standard Usage for all component rows before moving forward."
            );
            return;
        }

        if (hasMissingCoProductFields) {
            setValidationError(
                "Please fill in Item, Resource, Item BOM Routing Priority and Qty Produced for all new co-product rows before moving forward."
            );
            return;
        }

        if (hasInvalidNumericValues) {
            setValidationError(
                "Qty Produced must be numeric and less than 1. Item BOM Routing Priority must be numeric for newly added co-products."
            );
            return;
        }

        const normalizedRecord = {
            ...record,
            routing_id:
                record?.routing_id ||
                record?.routingId ||
                "",
        };

        if (!normalizedRecord.routing_id) {
            setValidationError(
                "Routing ID is missing for the selected BOM record."
            );
            return;
        }

        setValidationError("");

        // detect removed original component items (present in initial fetch but not in current list)
        const removedComponentItems = initialComponentItems
            .filter((orig) => {
                const key = String(orig.original_component_item || orig.component_item || "").trim();
                if (!key) return false;
                return !componentItems.some((ci) => String(ci.original_component_item || ci.component_item || "").trim() === key);
            })
            .map((it) => ({
                ...it,
                removed: true,
                component_desc:
                    it.component_desc ||
                    it.original_component_desc ||
                    it.item_desc ||
                    it.item_description ||
                    it.description ||
                    "",
            }));

        const removedCoProducts = initialCoProducts
            .filter((orig) => {
                const key = String(orig.original_item || orig.item || "").trim();
                if (!key) return false;
                return !coProducts.some((cp) => String(cp.original_item || cp.item || "").trim() === key);
            })
            .map((it) => ({
                ...it,
                removed: true,
                desc: it.desc || itemMasterLookup[it.original_item || it.item] || "",
            }));

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

    const canProceed =
        !!record &&
        !hasMissingStandardUsage &&
        !hasMissingCoProductFields &&
        !hasInvalidNumericValues;

    if (loading) {
        return <div style={styles.page}><div style={styles.wrapper}>Loading...</div></div>;
    }

    if (error) {
        return (
            <div style={styles.page}>
                <div style={styles.wrapper}>
                    <div style={styles.back} onClick={handleBack}>← BACK</div>
                    <div style={styles.error}>{error}</div>
                </div>
            </div>
        );
    }

    const isExistingComponentRow = (item) => {
        return !item?.isNew && String(item?.original_component_item || "").trim() !== "";
    };

    const isExistingCoProductRow = (cp) => {
        return !cp?.isNew && String(cp?.original_item || "").trim() !== "";
    };

    //   checkBox function 
    const addCoProduct = () => {
        setCoProducts([
            ...coProducts,
            {
                item: "",
                original_item: "",
                desc: "",
                original_desc: "",
                qty: "",
                original_qty: "",
                resource: "",
                original_resource: "",
                itemBomRoutingPriority: "",
                isNew: true,
            },
        ]);
    };

    const handleCoProductItemChange = (index, value, description = "") => {
        const updated = [...coProducts];

        updated[index] = {
            ...updated[index],
            item: value,
            desc: description || itemMasterLookup[value] || itemMasterLookup[String(value).toUpperCase()] || "",
        };

        setCoProducts(updated);
    };

    const updateCoProduct = (index, field, value) => {
        const updated = [...coProducts];
        updated[index] = { ...updated[index], [field]: value };
        setCoProducts(updated);
    };

    const handleCoProductResourceChange = (index, value) => {
        const updated = [...coProducts];
        updated[index] = { ...updated[index], resource: value };
        setCoProducts(updated);
    };

    const removeCoProduct = (index) => {
        setCoProducts(coProducts.filter((_, i) => i !== index));
    };

    const handleProducedCoProductToggle = (checked) => {
        setProducedCoProduct(checked);
        if (!checked) {
            // User disabled co-products: clear any current co-product entries.
            // Keep `initialCoProducts` so they are treated as "removed" in review.
            setCoProducts([]);
        }
    };

    const handleBack = () => {
        dispatch(clearModifyExistingBomState());
        navigate(-1);
    };

    return (
        <div style={styles.page}>
            <div style={styles.wrapper}>
                
                <div style={styles.back} onClick={handleBack}>
                    ← BACK
                </div>

                
                <h1 style={styles.title}>Step 2: Modify Existing BOM Data</h1>
                <p style={styles.subtitle}>Modify the BOM record details</p>

               
                <div style={styles.card}>
                    <div style={styles.grid}>
                        <div style={styles.field}>
                            <label style={styles.label}>BOM ID</label>
                            <input
                                value={record?.bom_id || ""}
                                readOnly
                                style={styles.inputDisabled}
                                placeholder="BOM ID"
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Produced Item</label>
                            <input
                                value={record?.produced_item || record?.producedItem || record?.item || ""}
                                readOnly
                                style={styles.inputDisabled}
                                placeholder="Produced Item"
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Location</label>
                            <input
                                value={record?.location || ""}
                                readOnly
                                style={styles.inputDisabled}
                                placeholder="Location"
                            />
                        </div>



                        <div style={styles.field}>
                            <label style={styles.label}>Item Release Flag</label>
                            <input
                                value={record?.item_release_flag || ""}
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
                        <button type="button" style={styles.secondaryBtn} onClick={addComponent}>
                            + ADD COMPONENT
                        </button>
                    </div>

                    {componentItems.length === 0 ? (
                        <div style={styles.emptyBox}>
                            No component items. Click "Add Component" to add one.
                        </div>
                    ) : (
                        <div style={styles.editTableWrap}>
                            <div style={styles.editTableHeader}>
                                <div>Component Item</div>
                                <div>Item Description</div>
                                <div>Standard Usage</div>
                                <div></div>
                            </div>

                            {componentItems.map((item, index) => (
                                <div
                                    key={item.id || item.original_component_item || item.component_item || index}
                                    style={styles.editTableRow}
                                >
                                    {isExistingComponentRow(item) ? (
                                        <input
                                            value={String(item.component_item || "").trim()}
                                            disabled
                                            style={styles.tableInputDisabled}
                                            placeholder="Component Item"
                                        />
                                    ) : (
                                        renderLazyItemInput({
                                            rowKey: `component-${item.id || item.original_component_item || index}`,
                                            value: String(item.component_item || "").trim(),
                                            placeholder: "Search Component Item",
                                            updateValue: (value) => handleComponentItemChange(index, value),
                                            applySelection: (option) => handleComponentItemChange(index, option.item, option.item_desc || option.description || ""),
                                        })
                                    )}

                                    <input
                                        style={styles.tableInputDisabled}
                                        placeholder="Item Description"
                                        value={item.component_desc || ""}
                                        readOnly
                                    />

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
                                        <button
                                            type="button"
                                            style={styles.deleteBtn}
                                            onClick={() => removeComponent(index)}
                                        >
                                            <span style={styles.iconWrapper}>
                                                <MdDelete />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ ...styles.card, marginTop: 14 }}>
                    <label style={styles.checkboxRow}>
                        <input
                            type="checkbox"
                            checked={producedCoProduct}
                            onChange={(e) => handleProducedCoProductToggle(e.target.checked)}
                        />
                        <span>Produced Co-Product?</span>
                    </label>
                </div>

                {producedCoProduct ? (
                    <div style={{ ...styles.card, marginTop: 14 }}>
                        <div style={styles.sectionHeaderRow}>
                            <div style={styles.sectionTitle}>Co-Product Items</div>
                            <button type="button" style={styles.secondaryBtn} onClick={addCoProduct}>
                                + ADD CO-PRODUCT
                            </button>
                        </div>

                        {coProducts.length === 0 ? (
                            <div style={styles.emptyBox}>
                                No co-product items. Click "Add Co-Product" to add one.
                            </div>
                        ) : (
                            <div style={styles.editTableWrap}>
                                <div style={styles.coProductEditTableHeader}>
                                    <div>Co-Product Item</div>
                                    <div>Item Description</div>
                                    <div>Resource</div>
                                    <div>Item BOM Routing Priority</div>
                                    <div>Qty Produced Per</div>
                                    <div></div>
                                </div>

                                {coProducts.map((cp, index) => (
                                    <div
                                        key={cp.id || cp.original_item || cp.item || index}
                                        style={styles.coProductEditTableRow}
                                    >
                                        {isExistingCoProductRow(cp) ? (
                                            <input
                                                value={String(cp.item || "").trim()}
                                                disabled
                                                style={styles.tableInputDisabled}
                                                placeholder="Co-Product Item"
                                            />
                                        ) : (
                                            renderLazyItemInput({
                                                rowKey: `coproduct-${cp.id || cp.original_item || index}`,
                                                value: String(cp.item || "").trim(),
                                                placeholder: "Search Co-Product Item",
                                                updateValue: (value) => handleCoProductItemChange(index, value),
                                                applySelection: (option) => handleCoProductItemChange(index, option.item, option.item_desc || option.description || ""),
                                            })
                                        )}

                                        <input
                                            style={styles.tableInputDisabled}
                                            placeholder="Item Description"
                                            value={cp.desc || ""}
                                            readOnly
                                        />

                                        {isExistingCoProductRow(cp) ? (
                                            <input
                                                value={String(cp.resource || "").trim()}
                                                disabled
                                                style={styles.tableInputDisabled}
                                                placeholder="Resource"
                                            />
                                        ) : (
                                            renderLazyResourceInput({
                                                rowKey: `coproduct-resource-${cp.id || cp.original_item || index}`,
                                                value: String(cp.resource || "").trim(),
                                                updateValue: (value) => handleCoProductResourceChange(index, value),
                                            })
                                        )}

                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            disabled={!cp.isNew}
                                            value={cp.itemBomRoutingPriority || ""}
                                            onChange={(e) =>
                                                updateCoProduct(index, "itemBomRoutingPriority", e.target.value)
                                            }
                                            style={cp.isNew ? styles.tableInput : styles.tableInputDisabled}
                                            placeholder="Priority"
                                        />

                                        <div style={styles.inputWithError}>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                style={
                                                    getQtyProducedFieldError(cp.qty)
                                                        ? styles.tableInputError
                                                        : styles.tableInput
                                                }
                                                placeholder="Qty Produced Per"
                                                value={cp.qty || ""}
                                                onChange={(e) => updateCoProduct(index, "qty", e.target.value)}
                                            />
                                            {getQtyProducedFieldError(cp.qty) ? (
                                                <div style={styles.inlineError}>
                                                    {getQtyProducedFieldError(cp.qty)}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div style={styles.deleteBtnContainer}>
                                            <button
                                                type="button"
                                                style={styles.deleteBtn}
                                                onClick={() => removeCoProduct(index)}
                                            >
                                                <span style={styles.iconWrapper}>
                                                    <MdDelete />
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}

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
};

export default ModifyExistingBOMData;

const styles = {
    page: {
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
    },

    wrapper: {
        width: "100%",
        maxWidth: "1100px",
        padding: "20px",
        boxSizing: "border-box",
    },

    back: {
        color: "#2563eb",
        cursor: "pointer",
        marginBottom: "12px",
        fontSize: "14px",
    },

    title: {
        fontSize: "30px",
        fontWeight: 700,
        margin: 0,
        color: "#111827",
    },

    subtitle: {
        marginTop: "8px",
        marginBottom: "20px",
        color: "#6b7280",
        fontSize: "15px",
    },

    card: {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "22px",
        marginBottom: "18px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px 24px",
    },

    field: {
        display: "flex",
        flexDirection: "column",
    },

    label: {
        fontSize: "13px",
        color: "#374151",
        marginBottom: "6px",
        fontWeight: 500,
    },

    inputDisabled: {
        width: "100%",
        height: "44px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        background: "#fff",
        padding: "0 12px",
        fontSize: "15px",
        color: "#9ca3af",
        boxSizing: "border-box",
        outline: "none",
    },

    helperText: {
        marginTop: "4px",
        fontSize: "12px",
        color: "#9ca3af",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "14px",
    },

    sectionTitle: {
        margin: 0,
        fontSize: "16px",
        fontWeight: 600,
        color: "#111827",
    },

    addBtn: {
        border: "1px solid #60a5fa",
        background: "#fff",
        color: "#2563eb",
        borderRadius: "4px",
        padding: "8px 14px",
        fontSize: "13px",
        cursor: "pointer",
    },

    emptyBox: {
        border: "1px dashed #d1d5db",
        borderRadius: "4px",
        minHeight: "68px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
        fontSize: "14px",
        background: "#fafafa",
    },

    componentList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },

    componentRow: {
        display: "grid",
        gridTemplateColumns: "295px 300px 295px auto",
        gap: "12px",
        alignItems: "start",
        marginLeft: "5px",
    },

    subSectionBox: {
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#f8fafc",
    },

    fieldHeaderRow: {
        display: "grid",
        gridTemplateColumns: "295px 300px 295px auto",
        gap: "12px",
        alignItems: "center",
        marginBottom: "14px",
        marginLeft: "5px",
    },

    fieldHeader: {
        color: "#6b7280",
        fontSize: "12px",
        fontWeight: 600,
        textTransform: "uppercase",
    },

    select: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        padding: "0 12px",
        fontSize: "14px",
        background: "#fff",
        boxSizing: "border-box",
    },
    selectDisabled: {
        height: 36,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        padding: "0 10px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        width: "100%",
        background: "#f9fafb",
        color: "#6b7280",
        cursor: "not-allowed",
    },
    searchInput: {
        height: 36,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        padding: "0 10px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        width: "100%",
        background: "#ffffff",
    },
    dropdownList: {
        position: "absolute",
        top: "40px",
        left: 0,
        right: 0,
        maxHeight: "220px",
        overflow: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        background: "#fff",
        zIndex: 50,
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    },
    dropdownItem: {
        padding: "8px 12px",
        cursor: "pointer",
    },

    input: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        padding: "0 12px",
        fontSize: "14px",
        boxSizing: "border-box",
    },

    inputWithError: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: "4px",
    },

    inputError: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #ef4444",
        padding: "0 12px",
        fontSize: "14px",
        boxSizing: "border-box",
    },

    inlineError: {
        color: "#dc2626",
        fontSize: "12px",
        fontWeight: 600,
        minHeight: "18px",
    },
    input2: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        padding: "0 12px",
        fontSize: "14px",
        boxSizing: "border-box",
    },

    inputWithError: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: "4px",
    },

    inputError: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #ef4444",
        padding: "0 12px",
        fontSize: "14px",
        boxSizing: "border-box",
    },

    inlineError: {
        color: "#dc2626",
        fontSize: "12px",
        fontWeight: 600,
        minHeight: "18px",
    },

    removeBtn: {
        cursor: "pointer",
        border: "none",
        background: "transparent",
        padding: "5px 10px",
        height: "42px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    iconWrapper: {
        all: "unset",
        color: "#dc2626",
        fontSize: "32px",
    },
    coProductRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
    },

    checkbox: {
        width: "16px",
        height: "16px",
        margin: 0,
    },

    coProductText: {
        fontSize: "15px",
        color: "#111827",
    },

    footer: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "8px",
    },

    nextBtn: {
        background: "#1976d2",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        padding: "12px 18px",
        fontSize: "14px",
        cursor: "pointer",
    },

    error: {
        color: "#b91c1c",
        fontWeight: 600,
        marginTop: "16px",
    },
    validationBanner: {
        background: "#fee2e2",
        color: "#b91c1c",
        border: "1px solid #fca5a5",
        borderRadius: "6px",
        padding: "14px 16px",
        margin: "16px 0",
        fontSize: "14px",
        fontWeight: 600,
    },
    sectionHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    secondaryBtn: {
        height: 32,
        padding: "0 12px",
        borderRadius: 3,
        border: "1px solid #93c5fd",
        background: "#ffffff",
        color: "#2563eb",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
    },
    editTableWrap: {
        border: "1px solid #dfe3ea",
        borderRadius: 4,
        overflow: "visible",
    },
    editTableHeader: {
        display: "grid",
        gridTemplateColumns: "1.2fr 1.5fr 1fr 110px",
        background: "#f3f4f6",
        padding: "10px 12px",
        fontSize: 12,
        fontWeight: 600,
        color: "#111827",
    },
    editTableRow: {
        display: "grid",
        gridTemplateColumns: "1.2fr 1.5fr 1fr 110px",
        gap: 10,
        padding: "10px 12px",
        borderTop: "1px solid #eceff3",
        alignItems: "center",
        background: "#ffffff",
    },
    tableInput: {
        height: 36,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        padding: "0 10px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        width: "100%",
        background: "#ffffff",
    },
    tableInputDisabled: {
        height: 36,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        padding: "0 10px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        width: "100%",
        background: "#f9fafb",
        color: "#6b7280",
    },
    tableInputError: {
        height: 36,
        borderRadius: 3,
        border: "1px solid #ef4444",
        padding: "0 10px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        width: "100%",
        background: "#ffffff",
    },
    deleteBtnContainer: {
        display: "flex",
        alignItems: "flex-end",
        height: "100%",
    },
    deleteBtn: {
        width: "36px",
        height: "36px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "16px",
    },
    checkboxRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        color: "#111827",
        fontWeight: 500,
    },

    lazyDropdownWrap: { position: "relative", width: "100%" },
    lazyDropdownMenu: { position: "absolute", top: "40px", left: 0, right: 0, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", zIndex: 9999, maxHeight: "240px", overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" },
    lazyDropdownRow: { padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" },
    lazyDropdownItem: { fontSize: "13px", fontWeight: 600, color: "#111827" },
    lazyDropdownDesc: { fontSize: "12px", color: "#6b7280", marginTop: "2px" },
    lazyDropdownEmpty: { padding: "10px", fontSize: "13px", color: "#6b7280" },
    lazyLoadMoreBtn: { width: "100%", border: "none", backgroundColor: "#f3f4f6", color: "#2563eb", padding: "9px 10px", cursor: "pointer", fontSize: "13px", fontWeight: 600 },

    coProductEditTableHeader: {
        display: "grid",
        gridTemplateColumns: "1.1fr 1.25fr 1fr 1fr 0.85fr 70px",
        background: "#f3f4f6",
        padding: "10px 12px",
        fontSize: 12,
        fontWeight: 600,
        color: "#111827",
    },
    coProductEditTableRow: {
        display: "grid",
        gridTemplateColumns: "1.1fr 1.25fr 1fr 1fr 0.85fr 70px",
        gap: 10,
        padding: "10px 12px",
        borderTop: "1px solid #eceff3",
        alignItems: "center",
        background: "#ffffff",
    },

};
