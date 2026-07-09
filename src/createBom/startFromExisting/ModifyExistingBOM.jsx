import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MdDelete } from "react-icons/md";

const NEXT_ROUTE = "/summary";
const BOM_VERSION_OPTIONS = [
    "PRIMARY",
    ...Array.from({ length: 20 }, (_, i) => `BOM${i + 1}`),
];

const buildRoutingId = (item, location, resource) =>
    `ROUTING_${String(item ?? "").trim()}_${String(location ?? "").trim()}_${String(
        resource ?? ""
    ).trim()}`;

const getOriginalBomVersion = (bomId) => {
    const text = String(bomId ?? "").trim();
    if (!text) return "";
    const parts = text.split("_");
    return parts[0] ?? "";
};

const toNumberOrEmpty = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
};

const normalizeItemAndDescription = (itemValue, descriptionValue = "") => ({
    item: String(itemValue ?? "").trim(),
    description: String(descriptionValue ?? "").trim(),
});
const getItemOptionLabel = (option) => {
    const item = String(option?.item ?? "").trim();
    const description = String(
        option?.item_desc ?? option?.description ?? option?.desc ?? option?.item_description ?? ""
    ).trim();
    return description ? `${item} - ${description}` : item;
};

const fetchJsonNoLimit = async (baseUrl) => {
    const urlsToTry = [`${baseUrl}`, baseUrl];
    let lastError = null;

    for (const url of urlsToTry) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                lastError = new Error(await res.text());
                continue;
            }
            const data = await res.json();
            return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data;
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError ?? new Error(`Failed to fetch ${baseUrl}`);
};

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

const normalizeSelectedBom = (row) => {
    if (!row || typeof row !== "object") return null;

    return {
        id: row.id ?? row.postgresql_rec_id ?? row.rec_id ?? row.bom_id ?? "",
        location: row.location ?? row.location_id ?? row.locationName ?? "",
        produced_item: row.produced_item ?? row.item ?? row.producedItem ?? "",
        produced_item_desc:
            row.produced_item_desc ?? row.item_desc ?? row.item_description ?? "",
        bom_id: row.bom_id ?? row.bomId ?? "",
        resource: row.resource ?? row.routing_id ?? "",
        item_release_flag:
            row.item_release_flag ??
            row.item_releaseflag ??
            row.release_flag ??
            row.release ??
            "",
        raw: row.__raw ?? row,
    };
};


const getResourceRelevancy = (resourceMasterMap, resource) => {
    const key = String(resource ?? "").trim().toUpperCase();
    return resourceMasterMap.get(key)?.resourceRelevancy ?? "";
};

const makeComponentRow = (seed = {}) => {
    const normalized = normalizeItemAndDescription(
        seed.componentItem ?? seed.item ?? seed.component_item ?? "",
        seed.description ?? seed.item_description ?? seed.component_description ?? ""
    );

    return {
        id:
            seed.id ??
            `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        componentItem: normalized.item,
        description: normalized.description,
        standardUsage:
            seed.standardUsage ??
            seed.erp_bom_quantity_consumed_per ??
            seed.qtyConsumedPer ??
            seed.standard_usage ??
            "",
    };
};

const makeCoProductRow = (seed = {}) => {
    const normalized = normalizeItemAndDescription(
        seed.coProductItem ?? seed.item ?? seed.co_product_item ?? "",
        seed.description ?? seed.item_description ?? seed.co_product_description ?? ""
    );

    return {
        id:
            seed.id ??
            `coproduct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        coProductItem: normalized.item,
        description: normalized.description,
        qtyProduced:
            seed.qtyProduced ??
            seed.qtyProducedPer ??
            seed.erp_bom_qty_produced_per ??
            seed.qty_produced_per ??
            "",
    };
};

const MultiSelectDropdown = ({
    options,
    selectedValues,
    onChange,
    onOpen,
    placeholder = "Select resource(s)",
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDocClick = (event) => {
            if (!ref.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const selectedSet = new Set(selectedValues.map((v) => String(v)));

    const toggleDropdown = async () => {
        const nextOpen = !open;
        setOpen(nextOpen);

        if (nextOpen && onOpen) {
            await onOpen();
        }
    };

    const toggleValue = (value) => {
        const strValue = String(value);
        if (selectedSet.has(strValue)) {
            onChange(selectedValues.filter((x) => String(x) !== strValue));
        } else {
            onChange([...selectedValues, strValue]);
        }
    };

    const removeValue = (value) => {
        const strValue = String(value);
        onChange(selectedValues.filter((x) => String(x) !== strValue));
    };

    return (
        <div style={styles.multiWrap} ref={ref}>
            <div style={styles.multiControl} onClick={toggleDropdown}>
                <div style={styles.chipWrap}>
                    {selectedValues.length === 0 ? (
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
                    {options.length === 0 ? (
                        <div style={styles.multiMenuEmpty}>No resources found.</div>
                    ) : (
                        options.map((opt) => {
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
                </div>
            ) : null}
        </div>
    );
};

const ModifyExistingBOM = () => {
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const { id } = useParams();

    const [selectedBom, setSelectedBom] = useState(
        normalizeSelectedBom(routerLocation?.state?.selectedBom)
    );
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [bomVersion, setBomVersion] = useState("");

    const [selectedResources, setSelectedResources] = useState([]);
    const [componentItems, setComponentItems] = useState([]);
    const [coProducts, setCoProducts] = useState([]);
    const [producedCoProduct, setProducedCoProduct] = useState(false);
    const [routingRows, setRoutingRows] = useState([]);

    // Lazy-loaded GCP option states
    const [allResourceOptions, setAllResourceOptions] = useState([]);
    const [resourceMasterMap, setResourceMasterMap] = useState(new Map());

    const [resourceOptionsLoaded, setResourceOptionsLoaded] = useState(false);
    const [loadingResourceOptions, setLoadingResourceOptions] = useState(false);
    const itemSearchTimerRef = useRef({});
    const itemSearchCacheRef = useRef({});
    const [activeItemDropdownKey, setActiveItemDropdownKey] = useState(null);
    const [itemSearchByKey, setItemSearchByKey] = useState({});
    const [itemOptionsByKey, setItemOptionsByKey] = useState({});
    const [itemLoadingByKey, setItemLoadingByKey] = useState({});
    const [itemPaginationByKey, setItemPaginationByKey] = useState({});

    const loadGcpResourceOptions = async () => {
        if (resourceOptionsLoaded || loadingResourceOptions) return;

        setLoadingResourceOptions(true);
        try {
            const [routingResconsRows, resourceMasterRows] = await Promise.all([
                fetchJsonNoLimit("/api/bigquery/table/routing_rescons"),
                fetchJsonNoLimit("/api/bigquery/table/resource_master"),
            ]);

            const resourceMap = new Map();
            (Array.isArray(resourceMasterRows) ? resourceMasterRows : []).forEach((row) => {
                const resourceKey = String(row.resource ?? "").trim().toUpperCase();
                if (!resourceKey) return;

                resourceMap.set(resourceKey, {
                    resourceRelevancy:
                        row.resource_planning_relevance ??
                        row.resource_relevancy ??
                        row.relevancy ??
                        "",
                });
            });

            const resourceOptions = [];
            const seenResources = new Set();

            (Array.isArray(routingResconsRows) ? routingResconsRows : []).forEach((row) => {
                const resource = String(row.resource ?? "").trim();
                if (!resource) return;

                const key = resource.toUpperCase();
                if (seenResources.has(key)) return;

                seenResources.add(key);
                resourceOptions.push({
                    resource,
                    resourceRelevancy: resourceMap.get(key)?.resourceRelevancy ?? "",
                });
            });

            setResourceMasterMap(resourceMap);
            setAllResourceOptions(resourceOptions);
            setResourceOptionsLoaded(true);
        } catch (e) {
            console.error("Error fetching GCP resource options:", e);
        } finally {
            setLoadingResourceOptions(false);
        }
    };

    const loadLazyItemOptions = async ({
        rowKey,
        searchText = "",
        page = 1,
        append = false,
    }) => {
        const cleanSearch = String(searchText || "").trim();
        const cacheKey = `${cleanSearch.toLowerCase()}__${page}`;

        setItemSearchByKey((prev) => ({
            ...prev,
            [rowKey]: searchText,
        }));

        if (itemSearchCacheRef.current[cacheKey]) {
            const cached = itemSearchCacheRef.current[cacheKey];
            setItemOptionsByKey((prev) => ({
                ...prev,
                [rowKey]: append
                    ? [...(prev[rowKey] || []), ...(cached.rows || [])]
                    : cached.rows || [],
            }));
            setItemPaginationByKey((prev) => ({
                ...prev,
                [rowKey]: cached.pagination,
            }));
            return;
        }

        setItemLoadingByKey((prev) => ({
            ...prev,
            [rowKey]: true,
        }));

        try {
            const result = await searchItemMasterOptions({
                search: cleanSearch,
                page,
                pageSize: 50,
            });
            itemSearchCacheRef.current[cacheKey] = result;
            setItemOptionsByKey((prev) => ({
                ...prev,
                [rowKey]: append
                    ? [...(prev[rowKey] || []), ...(result.rows || [])]
                    : result.rows || [],
            }));
            setItemPaginationByKey((prev) => ({
                ...prev,
                [rowKey]: result.pagination,
            }));
        } catch (error) {
            console.error("Item master lazy search failed:", error);
            setItemOptionsByKey((prev) => ({
                ...prev,
                [rowKey]: [],
            }));
            setItemPaginationByKey((prev) => ({
                ...prev,
                [rowKey]: { page: 1, pageSize: 50, total: 0, totalPages: 1, hasNext: false },
            }));
        } finally {
            setItemLoadingByKey((prev) => ({
                ...prev,
                [rowKey]: false,
            }));
        }
    };

    const handleLazyItemDropdownOpen = (rowKey, currentValue = "") => {
        setActiveItemDropdownKey(rowKey);
        const existingOptions = itemOptionsByKey[rowKey] || [];
        const existingSearchText = itemSearchByKey[rowKey] ?? currentValue ?? "";
        if (existingOptions.length > 0) return;
        loadLazyItemOptions({
            rowKey,
            searchText: existingSearchText,
            page: 1,
            append: false,
        });
    };

    const handleLazyItemSearchChange = (rowKey, value) => {
        setActiveItemDropdownKey(rowKey);
        setItemSearchByKey((prev) => ({
            ...prev,
            [rowKey]: value,
        }));
        if (itemSearchTimerRef.current[rowKey]) {
            clearTimeout(itemSearchTimerRef.current[rowKey]);
        }
        itemSearchTimerRef.current[rowKey] = setTimeout(() => {
            loadLazyItemOptions({
                rowKey,
                searchText: value,
                page: 1,
                append: false,
            });
        }, 350);
    };

    const handleLazyItemLoadMore = (rowKey) => {
        const searchText = itemSearchByKey[rowKey] || "";
        const pagination = itemPaginationByKey[rowKey] || {};
        const nextPage = Number(pagination.page || 1) + 1;
        loadLazyItemOptions({
            rowKey,
            searchText,
            page: nextPage,
            append: true,
        });
    };

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            setErr("");

            try {
                let baseBom = normalizeSelectedBom(routerLocation?.state?.selectedBom);

                // Fallback: if page reload occurred and route state is missing,
                // rely on id param only if backend can resolve it.
                if (!baseBom && id) {
                    const detailsById = await fetchJsonNoLimit(
                        `/api/tables/existing-bom-details-by-id/${encodeURIComponent(id)}`
                    );

                    baseBom = normalizeSelectedBom(
                        detailsById?.selectedBom ?? detailsById?.bomHeader ?? detailsById
                    );

                    if (detailsById && baseBom) {
                        setSelectedBom(baseBom);

                        const originalVersion = getOriginalBomVersion(baseBom.bom_id);
                        const nextVersion =
                            BOM_VERSION_OPTIONS.find((v) => v !== originalVersion) ?? "";
                        setBomVersion(nextVersion);

                        const resourceRows = Array.isArray(detailsById?.resources)
                            ? detailsById.resources
                            : [];
                        const componentRows = Array.isArray(detailsById?.components)
                            ? detailsById.components
                            : [];
                        const coProductRows = Array.isArray(detailsById?.coProducts)
                            ? detailsById.coProducts
                            : [];

                        const preselectedResources = resourceRows
                            .map((row) => String(row.resource ?? "").trim())
                            .filter(Boolean);

                        setSelectedResources(preselectedResources);

                        setComponentItems(
                            componentRows.map((row) =>
                                makeComponentRow({
                                    id: row.id ?? row.rec_id,
                                    componentItem: row.component_item ?? row.item ?? "",
                                    item_desc: row.item_desc ?? row.description ?? row.item_description ?? "",
                                    description:
                                        row.item_desc ?? row.description ?? row.item_description ?? "",
                                    standardUsage:
                                        row.standard_usage ??
                                        row.erp_bom_quantity_consumed_per ??
                                        row.qtyConsumedPer ??
                                        "",
                                })
                            )
                        );

                        setCoProducts(
                            coProductRows.map((row) =>
                                makeCoProductRow({
                                    id: row.id ?? row.rec_id,
                                    coProductItem: row.co_product_item ?? row.item ?? "",
                                    item_desc: row.item_desc ?? row.description ?? row.item_description ?? "",
                                    description:
                                        row.item_desc ?? row.description ?? row.item_description ?? "",
                                    qtyProduced:
                                        row.qty_produced_per ??
                                        row.erp_bom_qty_produced_per ??
                                        row.qtyProducedPer ??
                                        "",
                                })
                            )
                        );

                        setProducedCoProduct(coProductRows.length > 0);

                        setRoutingRows(
                            preselectedResources.map((resource) => ({
                                resource,
                                resourceRelevancy: "",
                                routingId: buildRoutingId(
                                    baseBom.produced_item,
                                    baseBom.location,
                                    resource
                                ),
                            }))
                        );

                        setLoading(false);
                        return;
                    }
                }

                if (!baseBom) {
                    throw new Error("Selected BOM record not found.");
                }

                setSelectedBom(baseBom);

                // PostgreSQL-only initial load
                const details = await fetchJsonNoLimit(
                    `/api/tables/existing-bom-details?bomId=${encodeURIComponent(
                        baseBom.bom_id
                    )}&location=${encodeURIComponent(
                        baseBom.location
                    )}&producedItem=${encodeURIComponent(baseBom.produced_item)}`
                );

                const originalVersion = getOriginalBomVersion(baseBom.bom_id);
                const nextVersion =
                    BOM_VERSION_OPTIONS.find((v) => v !== originalVersion) ?? "";

                setBomVersion(nextVersion);

                const resourceRows = Array.isArray(details?.resources) ? details.resources : [];
                const componentRows = Array.isArray(details?.components)
                    ? details.components
                    : [];
                const coProductRows = Array.isArray(details?.coProducts)
                    ? details.coProducts
                    : [];

                const preselectedResources = resourceRows
                    .map((row) => String(row.resource ?? "").trim())
                    .filter(Boolean);

                setSelectedResources(preselectedResources);

                setComponentItems(
                    componentRows.map((row) =>
                        makeComponentRow({
                            id: row.id ?? row.rec_id,
                            componentItem: row.component_item ?? row.item ?? "",
                            item_desc: row.item_desc ?? row.description ?? row.item_description ?? "",
                            description: row.item_desc ?? row.description ?? row.item_description ?? "",
                            standardUsage:
                                row.standard_usage ??
                                row.erp_bom_quantity_consumed_per ??
                                row.qtyConsumedPer ??
                                "",
                        })
                    )
                );

                setCoProducts(
                    coProductRows.map((row) =>
                        makeCoProductRow({
                            id: row.id ?? row.rec_id,
                            coProductItem: row.co_product_item ?? row.item ?? "",
                            item_desc: row.item_desc ?? row.description ?? row.item_description ?? "",
                            description: row.item_desc ?? row.description ?? row.item_description ?? "",
                            qtyProduced:
                                row.qty_produced_per ??
                                row.erp_bom_qty_produced_per ??
                                row.qtyProducedPer ??
                                "",
                        })
                    )
                );

                setProducedCoProduct(coProductRows.length > 0);

                setRoutingRows(
                    preselectedResources.map((resource) => ({
                        resource,
                        resourceRelevancy: "",
                        routingId: buildRoutingId(
                            baseBom.produced_item,
                            baseBom.location,
                            resource
                        ),
                    }))
                );
            } catch (e) {
                setErr(e?.message ?? "Failed to load existing BOM details");
            } finally {
                setLoading(false);
            }
        };

        loadPage();
    }, [id, routerLocation?.state?.selectedBom]);

    useEffect(() => {
        if (!selectedBom) return;

        const nextRows = selectedResources.map((resource) => ({
            resource,
            resourceRelevancy: getResourceRelevancy(resourceMasterMap, resource),
            routingId: buildRoutingId(selectedBom.produced_item, selectedBom.location, resource),
        }));

        setRoutingRows(nextRows);
    }, [selectedResources, selectedBom, resourceMasterMap]);

    const originalBomVersion = useMemo(
        () => getOriginalBomVersion(selectedBom?.bom_id),
        [selectedBom]
    );

    const bomVersionOptions = useMemo(() => {
        return BOM_VERSION_OPTIONS.filter((v) => v !== originalBomVersion);
    }, [originalBomVersion]);

    const bomVersionError =
        bomVersion && bomVersion === originalBomVersion
            ? "BOM Version must be different from the original selected BOM version."
            : "";

    const addComponent = () => {
        setComponentItems((prev) => [...prev, makeComponentRow()]);
    };

    const removeComponent = (rowId) => {
        setComponentItems((prev) => prev.filter((row) => row.id !== rowId));
    };

    const updateComponent = (rowId, field, value) => {
        setComponentItems((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;

                const nextRow = {
                    ...row,
                    [field]: value,
                };

                if (field === "componentItem") {
                    nextRow.description = "";
                }

                return nextRow;
            })
        );
    };

    const applyComponentItemSelection = (rowId, option) => {
        setComponentItems((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        componentItem: String(option?.item ?? "").trim(),
                        description: String(option?.item_desc ?? option?.description ?? "").trim(),
                    }
                    : row
            )
        );
        setActiveItemDropdownKey(null);
    };

    const applyCoProductItemSelection = (rowId, option) => {
        setCoProducts((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        coProductItem: String(option?.item ?? "").trim(),
                        description: String(option?.item_desc ?? option?.description ?? "").trim(),
                    }
                    : row
            )
        );
        setActiveItemDropdownKey(null);
    };

    const addCoProduct = () => {
        setProducedCoProduct(true);
        setCoProducts((prev) => [...prev, makeCoProductRow()]);
    };

    const removeCoProduct = (rowId) => {
        setCoProducts((prev) => prev.filter((row) => row.id !== rowId));
    };

    const updateCoProduct = (rowId, field, value) => {
        setCoProducts((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;

                const nextRow = {
                    ...row,
                    [field]: value,
                };

                if (field === "coProductItem") {
                    nextRow.description = "";
                }

                return nextRow;
            })
        );
    };

    const handleNext = () => {
        if (!selectedBom) return;
        if (!bomVersion || bomVersion === originalBomVersion) return;

        navigate(NEXT_ROUTE, {
            state: {
                flow: "modify-existing-bom",
                selectedBom,
                modifiedBomData: {
                    originalBomId: selectedBom.bom_id,
                    producedItem: selectedBom.produced_item,
                    producedItemDescription: selectedBom.produced_item_desc,
                    location: selectedBom.location,
                    itemReleaseFlag: selectedBom.item_release_flag,
                    originalBomVersion,
                    bomVersion,
                    newBomId: `${bomVersion}_${selectedBom.produced_item}_${selectedBom.location}`,
                    selectedResources: [...selectedResources],
                    generatedRoutingRows: routingRows.map((row) => ({
                        resource: row.resource ?? "",
                        resourceRelevancy: row.resourceRelevancy ?? "",
                        routingId: row.routingId ?? "",
                    })),
                    componentItems: componentItems.map((row) => ({
                        id: row.id,
                        componentItem: row.componentItem ?? "",
                        description: row.description ?? "",
                        standardUsage: toNumberOrEmpty(row.standardUsage),
                    })),
                    producedCoProduct: !!producedCoProduct,
                    coProducts: coProducts.map((row) => ({
                        id: row.id,
                        coProductItem: row.coProductItem ?? "",
                        description: row.description ?? "",
                        qtyProduced: toNumberOrEmpty(row.qtyProduced),
                    })),
                },
            },
        });
    };

    if (loading) {
        return <div style={styles.page}>Loading...</div>;
    }

    if (err) {
        return <div style={styles.page}>Error: {err}</div>;
    }

    if (!selectedBom) {
        return <div style={styles.page}>No data</div>;
    }

    return (
        <div style={styles.pageBg}>
            <div style={styles.page}>
                <div style={styles.back} onClick={() => navigate(-1)}>
                    ← BACK
                </div>

                <h1 style={styles.h1}>Step 2: Create BOM From Existing BOM Data</h1>
                <p style={styles.sub}>Modify the BOM record details</p>

                <div style={styles.card}>
                    <div style={styles.topGrid}>
                        <div style={styles.field}>
                            <label style={styles.label}>Produced Item</label>
                            <input
                                value={selectedBom.produced_item ?? ""}
                                style={styles.inputDisabled}
                                disabled
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Location</label>
                            <input
                                value={selectedBom.location ?? ""}
                                style={styles.inputDisabled}
                                disabled
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>BOM Version</label>
                            <select
                                value={bomVersion}
                                onChange={(e) => setBomVersion(e.target.value)}
                                style={styles.input}
                            >
                                <option value="">Select BOM Version</option>
                                {bomVersionOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>

                            {bomVersionError ? (
                                <div style={styles.errorHint}>{bomVersionError}</div>
                            ) : (
                                <div style={styles.helperText}>
                                    Must be different from the original BOM version (
                                    {originalBomVersion ?? "N/A"}).
                                </div>
                            )}
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Resource(s)</label>
                            <MultiSelectDropdown
                                options={allResourceOptions}
                                selectedValues={selectedResources}
                                onChange={setSelectedResources}
                                onOpen={loadGcpResourceOptions}
                                placeholder={
                                    loadingResourceOptions
                                        ? "Loading resources..."
                                        : "Select resource(s)"
                                }
                            />
                            <div style={styles.helperText}>
                                If desired resource is not found, please check Oracle work
                                definitions.
                            </div>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Item Release Flag</label>
                            <input
                                value={selectedBom.item_release_flag ?? ""}
                                style={styles.inputDisabled}
                                disabled
                            />
                            <div style={styles.helperText}>Auto-populated from produced item</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 18 }}>
                        <div style={styles.sectionTitleSmall}>Generated Routing IDs</div>
                        <div style={styles.innerTableWrap}>
                            <div style={styles.innerTableHeader}>
                                <div>Resource</div>
                                <div>Resource Relevancy</div>
                                <div>Routing ID</div>
                            </div>

                            {routingRows.length === 0 ? (
                                <div style={styles.innerEmptyState}>No resources selected.</div>
                            ) : (
                                routingRows.map((row, index) => (
                                    <div
                                        key={`${row.resource}-${index}`}
                                        style={styles.innerTableRow}
                                    >
                                        <div>{row.resource ?? "-"}</div>
                                        <div>{row.resourceRelevancy ?? "-"}</div>
                                        <div>{row.routingId ?? "-"}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ ...styles.card, marginTop: 14 }}>
                    <div style={styles.sectionHeaderRow}>
                        <div style={styles.sectionTitle}>Component Items</div>
                        <button
                            type="button"
                            style={styles.secondaryBtn}
                            onClick={addComponent}
                        >
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

                            {componentItems.map((row) => {
                                const currentComponentItem = String(row.componentItem ?? "").trim();

                                return (
                                    <div key={row.id} style={styles.editTableRow}>
                                        {(() => {
                                            const rowKey = `component-${row.id}`;
                                            const options = itemOptionsByKey[rowKey] || [];
                                            const loading = !!itemLoadingByKey[rowKey];
                                            const pagination = itemPaginationByKey[rowKey] || {};
                                            return (
                                                <div style={styles.lazyDropdownWrap}>
                                                    <input
                                                        type="text"
                                                        value={currentComponentItem}
                                                        placeholder="Search Component Item"
                                                        onFocus={() => handleLazyItemDropdownOpen(rowKey, currentComponentItem)}
                                                        onClick={() => handleLazyItemDropdownOpen(rowKey, currentComponentItem)}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            updateComponent(row.id, "componentItem", value);
                                                            handleLazyItemSearchChange(rowKey, value);
                                                        }}
                                                        style={styles.tableInput}
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
                                                                                applyComponentItemSelection(row.id, option);
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

                                    <input
                                        value={row.description}
                                        style={styles.tableInputDisabled}
                                        disabled
                                        placeholder="Item Description"
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={row.standardUsage}
                                        onChange={(e) =>
                                            updateComponent(
                                                row.id,
                                                "standardUsage",
                                                e.target.value
                                            )
                                        }
                                        style={styles.tableInput}
                                        placeholder="Standard Usage"
                                    />

                                    <div style={styles.deleteBtnContainer}>
                                        <button
                                            type="button"
                                            style={styles.deleteBtn}
                                            onClick={() => removeComponent(row.id)}
                                        >
                                            <span style={styles.iconWrapper}>
                                                <MdDelete />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ ...styles.card, marginTop: 14 }}>
                    <label style={styles.checkboxRow}>
                        <input
                            type="checkbox"
                            checked={producedCoProduct}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setProducedCoProduct(checked);
                                if (!checked) {
                                    setCoProducts([]);
                                }
                            }}
                        />
                        <span>Produced Co-Product?</span>
                    </label>
                </div>

                {producedCoProduct ? (
                    <div style={{ ...styles.card, marginTop: 14 }}>
                        <div style={styles.sectionHeaderRow}>
                            <div style={styles.sectionTitle}>Co-Product Items</div>
                            <button
                                type="button"
                                style={styles.secondaryBtn}
                                onClick={addCoProduct}
                            >
                                + ADD CO-PRODUCT
                            </button>
                        </div>

                        {coProducts.length === 0 ? (
                            <div style={styles.emptyBox}>
                                No co-product items. Click "Add Co-Product" to add one.
                            </div>
                        ) : (
                            <div style={styles.editTableWrap}>
                                <div style={styles.editTableHeader}>
                                    <div>Co-Product Item</div>
                                    <div>Item Description</div>
                                    <div>Qty Produced Per</div>
                                    <div></div>
                                </div>

                                {coProducts.map((row) => {
                                    const currentCoProductItem = String(row.coProductItem ?? "").trim();

                                    return (
                                        <div key={row.id} style={styles.editTableRow}>
                                            {(() => {
                                                const rowKey = `coproduct-${row.id}`;
                                                const options = itemOptionsByKey[rowKey] || [];
                                                const loading = !!itemLoadingByKey[rowKey];
                                                const pagination = itemPaginationByKey[rowKey] || {};
                                                return (
                                                    <div style={styles.lazyDropdownWrap}>
                                                        <input
                                                            type="text"
                                                            value={currentCoProductItem}
                                                            placeholder="Search Co-Product Item"
                                                            onFocus={() => handleLazyItemDropdownOpen(rowKey, currentCoProductItem)}
                                                            onClick={() => handleLazyItemDropdownOpen(rowKey, currentCoProductItem)}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                updateCoProduct(row.id, "coProductItem", value);
                                                                handleLazyItemSearchChange(rowKey, value);
                                                            }}
                                                            style={styles.tableInput}
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
                                                                                    applyCoProductItemSelection(row.id, option);
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

                                        <input
                                            value={row.description}
                                            style={styles.tableInputDisabled}
                                            disabled
                                            placeholder="Item Description"
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={row.qtyProduced}
                                            onChange={(e) =>
                                                updateCoProduct(
                                                    row.id,
                                                    "qtyProduced",
                                                    e.target.value
                                                )
                                            }
                                            style={styles.tableInput}
                                            placeholder="Qty Produced Per"
                                        />

                                        <div style={styles.deleteBtnContainer}>
                                            <button
                                                type="button"
                                                style={styles.deleteBtn}
                                                onClick={() => removeCoProduct(row.id)}
                                            >
                                                <span style={styles.iconWrapper}>
                                                    <MdDelete />
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : null}

                <div style={styles.bottom}>
                    <button
                        style={{
                            ...styles.primaryBtn,
                            ...(bomVersionError || !bomVersion ? styles.primaryBtnDisabled : {}),
                        }}
                        disabled={!!bomVersionError || !bomVersion}
                        onClick={handleNext}
                    >
                        NEXT: REVIEW SUMMARY →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModifyExistingBOM;

const styles = {
    pageBg: {
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "24px 0 40px",
    },
    page: {
        maxWidth: 980,
        margin: "0 auto",
        padding: "0 18px",
        boxSizing: "border-box",
    },
    back: {
        color: "#2563eb",
        cursor: "pointer",
        marginBottom: 12,
        fontSize: 14,
        fontWeight: 400,
        width: "fit-content",
    },
    h1: {
        fontSize: 22,
        lineHeight: "30px",
        fontWeight: 600,
        color: "#111827",
        margin: "0 0 6px",
    },
    sub: {
        color: "#6b7280",
        margin: "0 0 18px",
        fontSize: 14,
    },
    card: {
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        background: "#ffffff",
        padding: 18,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        overflow: "visible",
    },
    topGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
        alignItems: "start",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    label: {
        fontSize: 12,
        color: "#374151",
        fontWeight: 600,
    },
    input: {
        height: 40,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        padding: "0 12px",
        fontSize: 14,
        outline: "none",
        background: "#ffffff",
        boxSizing: "border-box",
    },
    inputDisabled: {
        height: 40,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        padding: "0 12px",
        fontSize: 14,
        outline: "none",
        background: "#f9fafb",
        color: "#6b7280",
        boxSizing: "border-box",
    },
    helperText: {
        fontSize: 11,
        color: "#6b7280",
        marginTop: 2,
    },
    errorHint: {
        fontSize: 11,
        color: "#dc2626",
        marginTop: 2,
    },
    sectionTitleSmall: {
        fontSize: 13,
        fontWeight: 600,
        color: "#111827",
        marginBottom: 8,
    },
    innerTableWrap: {
        border: "1px solid #dfe3ea",
        borderRadius: 4,
        overflow: "hidden",
    },
    innerTableHeader: {
        display: "grid",
        gridTemplateColumns: "1.2fr 1.3fr 2fr",
        background: "#f3f4f6",
        padding: "10px 12px",
        fontSize: 12,
        fontWeight: 600,
        color: "#111827",
    },
    innerTableRow: {
        display: "grid",
        gridTemplateColumns: "1.2fr 1.3fr 2fr",
        padding: "10px 12px",
        fontSize: 13,
        color: "#111827",
        borderTop: "1px solid #eceff3",
    },
    innerEmptyState: {
        padding: "14px 12px",
        fontSize: 13,
        color: "#6b7280",
        background: "#ffffff",
    },
    sectionHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: "#111827",
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
    emptyBox: {
        border: "1px dashed #d1d5db",
        borderRadius: 4,
        minHeight: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#6b7280",
        background: "#ffffff",
        textAlign: "center",
        padding: 12,
    },
    checkboxRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        color: "#111827",
        fontWeight: 500,
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
    iconWrapper: {
        all: "unset",
        color: "#dc2626",
        fontSize: "28px",
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
    lazyDropdownWrap: {
        position: "relative",
        width: "100%",
    },
    lazyDropdownMenu: {
        position: "absolute",
        top: "40px",
        left: 0,
        right: 0,
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        zIndex: 9999,
        maxHeight: "240px",
        overflowY: "auto",
        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    },
    lazyDropdownRow: {
        padding: "8px 10px",
        cursor: "pointer",
        borderBottom: "1px solid #f3f4f6",
    },
    lazyDropdownItem: {
        fontSize: "13px",
        fontWeight: 600,
        color: "#111827",
    },
    lazyDropdownDesc: {
        fontSize: "12px",
        color: "#6b7280",
        marginTop: "2px",
    },
    lazyDropdownEmpty: {
        padding: "10px",
        fontSize: "13px",
        color: "#6b7280",
    },
    lazyLoadMoreBtn: {
        width: "100%",
        border: "none",
        backgroundColor: "#f3f4f6",
        color: "#2563eb",
        padding: "9px 10px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 600,
    },
    bottom: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 16,
    },
    primaryBtn: {
        background: "#2563eb",
        color: "#ffffff",
        border: "none",
        borderRadius: 4,
        padding: "12px 18px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    },
    primaryBtnDisabled: {
        opacity: 0.6,
        cursor: "not-allowed",
    },
    multiWrap: {
        position: "relative",
        width: "100%",
    },
    multiControl: {
        minHeight: 40,
        borderRadius: 3,
        border: "1px solid #cfd4dc",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 10px",
        cursor: "pointer",
        boxSizing: "border-box",
    },
    chipWrap: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        flex: 1,
    },
    chip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#f3f4f6",
        border: "1px solid #d1d5db",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 12,
        color: "#111827",
    },
    chipClose: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1,
        padding: 0,
        color: "#6b7280",
    },
    placeholderText: {
        fontSize: 14,
        color: "#9ca3af",
    },
    dropdownArrow: {
        marginLeft: 10,
        color: "#6b7280",
        fontSize: 12,
    },
    multiMenu: {
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        maxHeight: 220,
        overflowY: "auto",
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: 4,
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        zIndex: 20,
    },
    multiMenuRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        fontSize: 14,
        color: "#111827",
        cursor: "pointer",
        borderTop: "1px solid #f3f4f6",
    },
    multiMenuEmpty: {
        padding: "12px",
        fontSize: 13,
        color: "#6b7280",
    },
};