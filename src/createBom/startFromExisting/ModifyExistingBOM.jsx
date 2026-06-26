import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MdDelete } from "react-icons/md";
import { setModifyExistingBomState, selectModifyExistingBomState } from "../../redux/bomSlice";

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

const getItemDescription = (itemMasterMap, item) => {
    const key = String(item ?? "").trim().toUpperCase();
    return itemMasterMap.get(key)?.description ?? "";
};

const getResourceRelevancy = (resourceMasterMap, resource) => {
    const key = String(resource ?? "").trim().toUpperCase();
    return resourceMasterMap.get(key)?.resourceRelevancy ?? "";
};

const makeComponentRow = (seed = {}) => ({
    id:
        seed.id ??
        `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    componentItem: seed.componentItem ?? seed.item ?? "",
    description: seed.description ?? "",
    standardUsage:
        seed.standardUsage ??
        seed.erp_bom_quantity_consumed_per ??
        seed.qtyConsumedPer ??
        "",
});

const makeCoProductRow = (seed = {}) => ({
    id:
        seed.id ??
        `coproduct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coProductItem: seed.coProductItem ?? seed.item ?? "",
    description: seed.description ?? "",
    qtyProduced:
        seed.qtyProduced ??
        seed.qtyProducedPer ??
        seed.erp_bom_qty_produced_per ??
        "",
});

const getCoProductAssociationValue = (row) => {
    return Number(
        row?.erp_co_product_association ??
        row?.coProductAssociation ??
        row?.co_product_association ??
        0
    );
};

const MultiSelectDropdown = ({
    options,
    selectedValues,
    onChange,
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
            <div
                style={styles.multiControl}
                onClick={() => setOpen((prev) => !prev)}
            >
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
    const dispatch = useDispatch();
    const reduxFormState = useSelector(selectModifyExistingBomState);

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
    const [allResourceOptions, setAllResourceOptions] = useState([]);
    const [allItemOptions, setAllItemOptions] = useState([]);
    const [itemMasterMap, setItemMasterMap] = useState(new Map());
    const [resourceMasterMap, setResourceMasterMap] = useState(new Map());

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            setErr("");

            try {
                let baseBom = normalizeSelectedBom(routerLocation?.state?.selectedBom);

                if (!baseBom && id) {
                    const one = await fetchJsonNoLimit(
                        `/api/bigquery/table/item_bom_routing/${encodeURIComponent(id)}`
                    );
                    baseBom = normalizeSelectedBom(one);
                }

                if (!baseBom) {
                    throw new Error("Selected BOM record not found.");
                }

                setSelectedBom(baseBom);

                const [
                    routingResconsRows,
                    resourceMasterRows,
                    itemMasterRows,
                    bomConsumedRows,
                    itemBomRoutingRows,
                    bomProducedRows,
                ] = await Promise.all([
                    fetchJsonNoLimit("/api/bigquery/table/routing_rescons"),
                    fetchJsonNoLimit("/api/bigquery/table/resource_master"),
                    fetchJsonNoLimit("/api/bigquery/table/item_master"),
                    fetchJsonNoLimit("/api/bigquery/table/bom_consumed"),
                    fetchJsonNoLimit("/api/bigquery/table/item_bom_routing"),
                    fetchJsonNoLimit("/api/bigquery/table/bom_produced"),
                ]);

                const itemMap = new Map();
                const itemOptions = [];
                const seenItems = new Set();

                (Array.isArray(itemMasterRows) ? itemMasterRows : []).forEach((row) => {
                    const itemValue = String(row.item ?? "").trim();
                    const itemKey = itemValue.toUpperCase();
                    if (!itemKey) return;

                    const description =
                        row.item_desc ?? row.item_description ?? row.description ?? "";

                    itemMap.set(itemKey, {
                        description,
                        status: row.item_status ?? row.status ?? "",
                    });

                    if (!seenItems.has(itemKey)) {
                        seenItems.add(itemKey);
                        itemOptions.push({
                            item: itemValue,
                            description,
                        });
                    }
                });

                setItemMasterMap(itemMap);
                setAllItemOptions(itemOptions);

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
                setResourceMasterMap(resourceMap);

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
                setAllResourceOptions(resourceOptions);

                const originalVersion = getOriginalBomVersion(baseBom.bom_id);
                const nextVersion =
                    BOM_VERSION_OPTIONS.find((v) => v !== originalVersion) ?? "";

                const selectedBomId = String(baseBom.bom_id ?? "").trim();

                const bomRoutingForBom = (Array.isArray(itemBomRoutingRows) ? itemBomRoutingRows : []).filter(
                    (row) => String(row.bom_id ?? "").trim() === selectedBomId
                );

                const bomRoutingIds = new Set(
                    bomRoutingForBom
                        .map((row) => String(row.routing_id ?? row.routingId ?? "").trim())
                        .filter(Boolean)
                );

                const preselectedResources = [];
                const seenSelectedResources = new Set();

                (Array.isArray(routingResconsRows) ? routingResconsRows : []).forEach((row) => {
                    const routingId = String(row.routing_id ?? row.routingId ?? "").trim();
                    const resource = String(row.resource ?? "").trim();

                    if (!routingId || !resource) return;
                    if (!bomRoutingIds.has(routingId)) return;

                    const key = resource.toUpperCase();
                    if (seenSelectedResources.has(key)) return;

                    seenSelectedResources.add(key);
                    preselectedResources.push(resource);
                });

                const hasSavedState = Boolean(
                    reduxFormState?.record &&
                    (String(reduxFormState.record?.id ?? reduxFormState.record?.bom_id ?? "") === String(baseBom.id ?? baseBom.bom_id ?? ""))
                );

                const savedStateForBom = hasSavedState ? reduxFormState : null;

                const initialSelectedResources = savedStateForBom?.selectedResources?.length
                    ? savedStateForBom.selectedResources
                    : preselectedResources;
                setSelectedResources(initialSelectedResources);

                const consumedForBom = (Array.isArray(bomConsumedRows) ? bomConsumedRows : []).filter(
                    (row) => String(row.bom_id ?? "").trim() === selectedBomId
                );

                const prefilledComponents = consumedForBom.map((row) =>
                    makeComponentRow({
                        componentItem: row.item ?? row.component_item ?? "",
                        description: getItemDescription(itemMap, row.item ?? row.component_item),
                        standardUsage:
                            row.erp_bom_quantity_consumed_per ??
                            row.standard_usage ??
                            row.qtyConsumedPer ??
                            "",
                    })
                );
                const initialComponentItems = savedStateForBom?.componentItems?.length
                    ? savedStateForBom.componentItems
                    : prefilledComponents;
                setComponentItems(initialComponentItems);

                const coProductRoutingRows = bomRoutingForBom.filter(
                    (row) => getCoProductAssociationValue(row) === 1
                );

                const producedForBom = (Array.isArray(bomProducedRows) ? bomProducedRows : []).filter(
                    (row) => String(row.bom_id ?? "").trim() === selectedBomId
                );

                const prefilledCoProducts = coProductRoutingRows.map((routeRow) => {
                    const item = routeRow.item ?? "";
                    const producedMatch = producedForBom.find(
                        (p) => String(p.item ?? "").trim() === String(item ?? "").trim()
                    );

                    return makeCoProductRow({
                        coProductItem: item,
                        description: getItemDescription(itemMap, item),
                        qtyProduced:
                            producedMatch?.erp_bom_qty_produced_per ??
                            producedMatch?.qtyProducedPer ??
                            producedMatch?.qty_produced_per ??
                            "",
                    });
                });

                const initialCoProducts = savedStateForBom?.coProducts?.length
                    ? savedStateForBom.coProducts
                    : prefilledCoProducts;
                setCoProducts(initialCoProducts);

                const initialProducedCoProduct =
                    savedStateForBom?.producedCoProduct ?? prefilledCoProducts.length > 0;
                setProducedCoProduct(initialProducedCoProduct);
                setBomVersion(savedStateForBom?.bomVersion ?? nextVersion);

                const generatedRows = initialSelectedResources.map((resource) => ({
                    resource,
                    resourceRelevancy: getResourceRelevancy(resourceMap, resource),
                    routingId: buildRoutingId(baseBom.produced_item, baseBom.location, resource),
                }));
                setRoutingRows(generatedRows);
            } catch (e) {
                setErr(e?.message ?? "Failed to load existing BOM details");
            } finally {
                setLoading(false);
            }
        };

        loadPage();
    }, [id, routerLocation?.state?.selectedBom]);

    // Generate unique key for this BOM's form data
    const bomStorageKey = useMemo(() => {
        if (!selectedBom?.id) return null;
        return `modifyBomData_${selectedBom.id}`;
    }, [selectedBom?.id]);

    useEffect(() => {
        if (!selectedBom) return;

        dispatch(
            setModifyExistingBomState({
                record: selectedBom,
                bomVersion,
                selectedResources,
                componentItems,
                coProducts,
                producedCoProduct,
            })
        );
    }, [dispatch, selectedBom, bomVersion, selectedResources, componentItems, coProducts, producedCoProduct]);

    // Persist form data to localStorage whenever it changes
    useEffect(() => {
        if (!bomStorageKey) return;

        const formData = {
            bomVersion,
            selectedResources,
            componentItems,
            coProducts,
            producedCoProduct,
        };

        localStorage.setItem(bomStorageKey, JSON.stringify(formData));
    }, [bomStorageKey, bomVersion, selectedResources, componentItems, coProducts, producedCoProduct]);

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
                    nextRow.description = getItemDescription(itemMasterMap, value);
                }

                return nextRow;
            })
        );
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
                    nextRow.description = getItemDescription(itemMasterMap, value);
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

                <h1 style={styles.h1}>Step 2: Modify Existing BOM Data</h1>
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
                                placeholder="Select resource(s)"
                            />
                            <div style={styles.helperText}>
                                If desired resource is not found, please check Oracle work definitions.
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
                                    <div key={`${row.resource}-${index}`} style={styles.innerTableRow}>
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

                            {componentItems.map((row) => (
                                <div key={row.id} style={styles.editTableRow}>
                                    <select
                                        value={row.componentItem}
                                        onChange={(e) =>
                                            updateComponent(row.id, "componentItem", e.target.value)
                                        }
                                        style={styles.tableInput}
                                    >
                                        <option value="">Component Item</option>
                                        {allItemOptions.map((option) => (
                                            <option key={option.item} value={option.item}>
                                                {option.item}
                                            </option>
                                        ))}
                                    </select>

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
                                            updateComponent(row.id, "standardUsage", e.target.value)
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
                            ))}
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
                                <div style={styles.editTableHeader}>
                                    <div>Co-Product Item</div>
                                    <div>Item Description</div>
                                    <div>Qty Produced Per</div>
                                    <div></div>
                                </div>

                                {coProducts.map((row) => (
                                    <div key={row.id} style={styles.editTableRow}>
                                        <select
                                            value={row.coProductItem}
                                            onChange={(e) =>
                                                updateCoProduct(row.id, "coProductItem", e.target.value)
                                            }
                                            style={styles.tableInput}
                                        >
                                            <option value="">Co-Product Item</option>
                                            {allItemOptions.map((option) => (
                                                <option key={option.item} value={option.item}>
                                                    {option.item}
                                                </option>
                                            ))}
                                        </select>

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
                                                updateCoProduct(row.id, "qtyProduced", e.target.value)
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
                                ))}
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
        overflow: "hidden",
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
