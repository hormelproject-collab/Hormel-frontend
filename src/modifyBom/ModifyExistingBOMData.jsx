import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MdDelete } from "react-icons/md";

import {
    selectModifyExistingBomState,
    setModifyExistingBomState,
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

                // console.log("Item Master Lookup", lookup);
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

                const res = await fetch(`http://localhost:3000/api/tables/item_bom_routing/${id}`);
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


    // Fetch component items and co-products based on bomId
    useEffect(() => {
        const bomId =
            state?.record?.bom_id ||
            state?.record?.BOMID ||
            state?.record?.bomId ||
            record?.bom_id ||
            record?.BOMID ||
            record?.bomId;
        if (!bomId) return;

        if (
            persistedBomState?.record &&
            (persistedBomState?.initialComponentItems?.length > 0 ||
                persistedBomState?.initialCoProducts?.length > 0)
        ) {
            return;
        }






        const buildComponentRow = (item) => {
            const componentItem = String(item.item ?? item.Item ?? item.component_item ?? item.componentItem ?? "").trim();
            const standardUsage = String(
                item.erp_bom_quantity_consumed_per ?? item.ERPBOMQuantityConsumedPer ?? item.standard_usage ?? item.qty_consumed_per ?? item.qtyConsumedPer ?? item.qty ?? ""
            ).trim();
            const componentDesc = String(
                item.item_desc ?? item.ItemDesc ?? item.description ?? item.desc ?? item.component_desc ?? ""
            ).trim();
            return {
                component_item: componentItem,
                original_component_item: componentItem,
                component_desc: componentDesc,
                original_component_desc: componentDesc,
                standard_usage: standardUsage,
                original_standard_usage: standardUsage,
            };
        };

        const buildCoProductRow = (item) => {
            const coProductItem = String(item.item ?? item.Item ?? item.component_item ?? item.componentItem ?? "").trim();
            const qty = String(
                item.erp_bom_qty_produced_per ?? item.ERPItemBOMRoutingPriority ?? item.qty_produced_per ?? item.qtyProducedPer ?? item.qty ?? ""
            ).trim();
            const desc = String(
                item.item_desc ?? item.ItemDesc ?? item.description ?? item.desc ?? item.component_desc ?? ""
            ).trim();
            return {
                item: coProductItem,
                original_item: coProductItem,
                desc,
                original_desc: desc,
                qty,
                original_qty: qty,
            };
        };

        const parseNumericValue = (value) => {
            const num = Number(String(value).trim());
            return Number.isFinite(num) ? num : NaN;
        };

        const hasQtyLessThanOne = (row) => {
            const value = parseNumericValue(
                row.erp_bom_qty_produced_per ??
                row.ERPItemBOMRoutingPriority ??
                row.qty_produced_per ??
                row.qtyProducedPer ??
                row.qty ??
                row.erp_bom_quantity_consumed_per ??
                row.ERPBOMQuantityConsumedPer ??
                row.standard_usage ??
                row.qty_consumed_per ??
                row.qtyConsumedPer ??
                ""
            );
            return !Number.isNaN(value) && value < 1;
        };

        const filterRowsByBomId = (rows, bomIdValue) => {
            const normalizedBomId = String(bomIdValue ?? "").trim().toLowerCase();
            return rows.filter((row) => {
                const rowBomId = String(row.bom_id ?? row.BOM_ID ?? row.BOMID ?? row.bomId ?? "").trim().toLowerCase();
                return rowBomId && normalizedBomId && rowBomId === normalizedBomId;
            });
        };

        const fetchItems = async () => {
            try {
                setItemsLoading(true);

                const fetchRows = async (directUrl, backupUrl) => {
                    let res = await fetch(directUrl);
                    if (!res.ok) {
                        res = await fetch(backupUrl);
                    }
                    if (!res.ok) {
                        throw new Error(`Failed to fetch data from ${directUrl}`);
                    }
                    const data = await res.json();
                    return normalizeApiArray(data);
                };

                // Fetch Component Items
                const componentRows = await fetchRows(
                    `http://localhost:3000/api/tables/bom_consumed/${encodeURIComponent(bomId)}`,
                    `http://localhost:3000/api/tables/bom_consumed`,
                );
                const filteredComponentRows = filterRowsByBomId(componentRows, bomId)
                    .filter(hasQtyLessThanOne);
                const builtComponentRows = filteredComponentRows.map(buildComponentRow);
                setComponentItemOptions(filteredComponentRows.map(buildOption));
                setComponentItems(builtComponentRows);
                setInitialComponentItems(builtComponentRows);
                
                // Fetch Co-Products
                const coProductRows = await fetchRows(
                    `http://localhost:3000/api/tables/bom_produced/${encodeURIComponent(bomId)}`,
                    `http://localhost:3000/api/tables/bom_produced`,
                );
                const filteredCoProductRows = filterRowsByBomId(coProductRows, bomId)
                    .filter(hasQtyLessThanOne);
                const builtCoProductRows = filteredCoProductRows.map(buildCoProductRow);
                setCoProductOptions(filteredCoProductRows.map(buildOption));
                setCoProducts(builtCoProductRows);
                setInitialCoProducts(builtCoProductRows);
                setProducedCoProduct(filteredCoProductRows.length > 0);
            } catch (e) {
                console.error("Error fetching items:", e.message);
            } finally {
                setItemsLoading(false);
            }
        };

        fetchItems();
    }, [state?.record?.bom_id, record?.bom_id]);

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
                // console.log("Fetched component items:", componentData);

                const componentRows = normalizeApiArray(componentData);
                // console.log("componentRows", componentRows);
                // console.log("first row", componentRows[0]);

                setAllComponentOptions(
                    componentRows.map(buildOption)
                );

                const coProductRes = await fetch(
                    "/api/bigquery/table/item_master"
                );
                const coProductData = await coProductRes.json();
                // console.log("Fetched co-product items:", coProductData);

                const coProductRows = normalizeApiArray(coProductData);
                // console.log("coRows", coProductRows);
                // console.log("first row", coProductRows[0]);
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

    const handleComponentItemChange = (index, value) => {
        const description =
            itemMasterLookup[value] || "";

        setComponentItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        component_item: value,
                        component_desc: description,
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
        return missingItem || missingQty;
    });

    const hasInvalidCoProductQty = coProducts.some((cp) => {
        if (!producedCoProduct) return false;
        const trimmed = String(cp.qty ?? "").trim();
        if (trimmed === "") return false;
        const num = Number(trimmed);
        return !Number.isNaN(num) && num >= 1;
    });

    const hasInvalidNumericValues = hasInvalidCoProductQty;

    useEffect(() => {
        if (!hasMissingStandardUsage && !hasMissingCoProductFields && !hasInvalidNumericValues) {
            setValidationError("");
        }
    }, [hasMissingStandardUsage, hasMissingCoProductFields, hasInvalidNumericValues]);

    const validateAndNavigate = () => {
        if (hasMissingStandardUsage) {
            setValidationError(
                "Please fill in Standard Usage for all component rows before moving forward."
            );
            return;
        }

        if (hasMissingCoProductFields) {
            setValidationError(
                "Please fill in Item and Qty Produced for all co-product rows before moving forward."
            );
            return;
        }

        if (hasInvalidNumericValues) {
            setValidationError(
                "Qty Produced values must be numeric and less than 1."
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
                component_desc: it.component_desc || itemMasterLookup[it.original_component_item || it.component_item] || "",
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
                    <div style={styles.back} onClick={() => navigate(-1)}>← BACK</div>
                    <div style={styles.error}>{error}</div>
                </div>
            </div>
        );
    }

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
                isNew: true,
            },
        ]);
    };

    const handleCoProductItemChange = (index, value) => {
        const updated = [...coProducts];

        updated[index] = {
            ...updated[index],
            item: value,
            desc: itemMasterLookup[value] || "",
        };

        setCoProducts(updated);
    };

    const updateCoProduct = (index, field, value) => {
        const updated = [...coProducts];
        updated[index] = { ...updated[index], [field]: value };
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

    return (
        <div style={styles.page}>
            <div style={styles.wrapper}>
                {/* Back */}
                <div style={styles.back} onClick={() => navigate(-1)}>
                    ← BACK
                </div>

                {/* Header */}
                <h1 style={styles.title}>Step 2: Modify Existing BOM Data</h1>
                <p style={styles.subtitle}>Modify the BOM record details</p>

                {/* Top info card */}
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
                            <label style={styles.label}>Location</label>
                            <input
                                value={record?.location || ""}
                                readOnly
                                style={styles.inputDisabled}
                                placeholder="Location"
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Resource</label>
                            <input
                                value={record?.resource || ""}
                                readOnly
                                style={styles.inputDisabled}
                                placeholder="Resource"
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

                {/* Component items section */}
                <div style={styles.card}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>Component Items</h2>
                        <button style={styles.addBtn} onClick={addComponent}>
                            + ADD COMPONENT
                        </button>
                    </div>

                    {componentItems.length === 0 ? (
                        <div style={styles.emptyBox}>
                            No component items. Click "Add Component" to add one.
                        </div>
                    ) : (
                        <div style={styles.subSectionBox}>
                            <div style={styles.fieldHeaderRow}>
                                <div style={styles.fieldHeader}>Component Item</div>
                                <div style={styles.fieldHeader}>Component Description</div>
                                <div style={styles.fieldHeader}>Standard Usage</div>
                                <div style={styles.fieldHeader}>Action</div>
                            </div>
                            <div style={styles.componentList}>
                                {componentItems.map((item, index) => (
                                    <div key={index} style={styles.componentRow}>
                                        <SearchableSelect
                                            options={item.isNew ? allComponentOptions : componentItemOptions}
                                            value={item.component_item}
                                            onChange={(val) => handleComponentItemChange(index, val)}
                                            disabled={!item.isNew}
                                            placeholder="Select item"
                                        />

                                        <input
                                            style={styles.inputDisabled}
                                            placeholder="Component Description"
                                            value={item.component_desc}
                                            readOnly
                                        />

                                        <input
                                            style={styles.input}
                                            placeholder="Standard Usage"
                                            value={item.standard_usage}
                                            onChange={(e) => {
                                                updateComponent(index, "standard_usage", e.target.value);
                                            }}
                                        />

                                        <button
                                            style={styles.removeBtn}
                                            onClick={() => removeComponent(index)}
                                        >
                                            <span style={styles.iconWrapper}>
                                                <MdDelete />
                                            </span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Co-product card */}
                <div style={styles.card}>
                    <label style={styles.coProductRow}>
                        <input
                            type="checkbox"
                            checked={producedCoProduct}
                            onChange={(e) => handleProducedCoProductToggle(e.target.checked)}
                            style={styles.checkbox}
                        />
                        <span style={styles.coProductText}>Produced Co-Product?</span>
                    </label>
                </div>

                {/* Text area */}
                {producedCoProduct && (
                    <div style={styles.card}>
                        {/* HEADER */}
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Co-Products</h2>
                            <button style={styles.addBtn} onClick={addCoProduct}>
                                + ADD CO-PRODUCT
                            </button>
                        </div>

                        {/* EMPTY STATE */}
                        {coProducts.length === 0 ? (
                            <div style={styles.emptyBox}>
                                No co-products. Click "Add Co-Product" to add one.
                            </div>
                        ) : (
                            <div style={styles.subSectionBox}>
                                <div style={styles.fieldHeaderRow}>
                                    <div style={styles.fieldHeader}>Co-Product Item</div>
                                    <div style={styles.fieldHeader}>Item Description</div>
                                    <div style={styles.fieldHeader}>Qty Produced</div>
                                    <div style={styles.fieldHeader}>Action</div>
                                </div>
                                <div style={styles.componentList}>
                                    {coProducts.map((cp, index) => (
                                        <div key={index} style={styles.componentRow}>
                                            <SearchableSelect
                                                options={cp.isNew ? allCoProductOptions : coProductOptions}
                                                value={cp.item}
                                                onChange={(val) => handleCoProductItemChange(index, val)}
                                                disabled={!cp.isNew}
                                                placeholder="Select item"
                                            />
                                            <input
                                                style={styles.inputDisabled}
                                                placeholder="Description"
                                                value={cp.desc}
                                                readOnly
                                            />
                                            <div style={styles.inputWithError}>
                                                <input
                                                    style={
                                                        getQtyProducedFieldError(cp.qty)
                                                            ? styles.inputError
                                                            : styles.input2
                                                    }
                                                    placeholder="Qty Produced"
                                                    value={cp.qty}
                                                    onChange={(e) => {
                                                        updateCoProduct(index, "qty", e.target.value);
                                                    }}
                                                />
                                                <div style={styles.inlineError}>
                                                    {getQtyProducedFieldError(cp.qty)}
                                                </div>
                                            </div>
                                            <button
                                                style={styles.removeBtn}
                                                onClick={() => removeCoProduct(index)}
                                            >
                                                <span style={styles.iconWrapper}>
                                                    <MdDelete />
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
        alignItems: "center",
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
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        padding: "0 12px",
        fontSize: "14px",
        background: "#f9fafb",
        color: "#9ca3af",
        boxSizing: "border-box",
        cursor: "not-allowed",
    },
    searchInput: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        padding: "0 12px",
        fontSize: "14px",
        boxSizing: "border-box",
    },
    dropdownList: {
        position: "absolute",
        top: "46px",
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
        marginTop: "20px"
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
        marginTop: "20px"
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
        marginTop: "20px"
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
        marginTop: "20px"
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
        padding: "10px",
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
};
