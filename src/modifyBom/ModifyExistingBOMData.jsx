import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MdDelete } from "react-icons/md";

const ModifyExistingBOMData = () => {
    const [coProducts, setCoProducts] = useState([]);
    const [producedCoProduct, setProducedCoProduct] = useState(false);
    const navigate = useNavigate();
    const { state } = useLocation();
    const { id } = useParams();

    const [record, setRecord] = useState(state?.record || null);
    const [loading, setLoading] = useState(!state?.record);
    const [error, setError] = useState("");

    const [componentItems, setComponentItems] = useState([]);

    // State for fetched items
    const [componentItemOptions, setComponentItemOptions] = useState([]);
    const [coProductOptions, setCoProductOptions] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    // fallback API fetch if page is opened directly / refreshed
    useEffect(() => {
        if (record) return;

        const fetchRecord = async () => {
            try {
                setLoading(true);
                setError("");

                const res = await fetch(`/api/tables/item_bom_routing/${id}`);
                if (!res.ok) throw new Error("Failed to fetch record");

                const data = await res.json();

                // map backend response -> UI shape
                const mapped = {
                    id: data.postgresql_rec_id || data.id || id,
                    produced_item: data.item || "Item101",
                    location: data.location || "Location 1",
                    bom_version: data.bom_version || "PRIMARY",
                    item_release_flag: data.item_release_flag || data.release_flag || "Release 1",
                    bom_id: data.bom_id || "",
                    resource: data.resource || "",
                    routing_id:
                        data.routing_id ||
                        data.routingId ||
                        (data.item && data.resource ? `ROUTING_${data.item}_${data.resource}` : ""),
                };

                setRecord(mapped);
            } catch (e) {
                setError(e.message || "Failed to load record");
            } finally {
                setLoading(false);
            }
        };

        fetchRecord();
    }, [id, record]);

    // Fetch component items and co-products based on bomId
    useEffect(() => {
        const bomId = state?.record?.bom_id || record?.bom_id;
        if (!bomId) return;

        const normalizeApiArray = (payload) => {
            if (Array.isArray(payload)) return payload;
            if (Array.isArray(payload?.data)) return payload.data;
            if (Array.isArray(payload?.rows)) return payload.rows;
            return [];
        };

        const buildOption = (item) => {
            const value = String(
                item.Item ?? item.item_id ?? item.id ?? item.component_item ?? item.componentItem ?? ""
            ).trim();
            const label = String(
                item.item_name ?? item.Item ?? item.label ?? item.description ?? item.desc ?? item.component_item ?? item.componentItem ?? value
            ).trim();
            const desc = String(
                item.Description ?? item.desc ?? item.item_desc ?? item.item_description ?? item.component_desc ?? ""
            ).trim();
            return { value, label: label || value, desc };
        };

        const fetchItems = async () => {
            try {
                setItemsLoading(true);

                // Fetch Component Items
                const componentRes = await fetch(
                    `/api/bigquery/table/bom-consumed/${encodeURIComponent(bomId)}`
                );
                if (componentRes.ok) {
                    const componentData = await componentRes.json();
                    // console.log("Fetched component items:", componentData);
                    const componentRows = normalizeApiArray(componentData);
                    const transformed = componentRows.map(buildOption);
                    setComponentItemOptions(transformed);
                    console.log("Transformed component item options:", transformed);
                } else {
                    console.warn("Failed to fetch component items", componentRes.status);
                }

                // Fetch Co-Products
                const coProductRes = await fetch(
                    `/api/bigquery/table/item_bom_routing/${encodeURIComponent(bomId)}`
                );
                if (coProductRes.ok) {
                    const coProductData = await coProductRes.json();
                    // console.log("Fetched co-products:", coProductData);
                    const coProductRows = normalizeApiArray(coProductData);
                    const transformed = coProductRows.map(buildOption);
                    setCoProductOptions(transformed);
                    console.log("Transformed co-product options:", transformed);
                } else {
                    console.warn("Failed to fetch co-products", coProductRes.status);
                }
            } catch (e) {
                console.error("Error fetching items:", e.message);
            } finally {
                setItemsLoading(false);
            }
        };

        fetchItems();
    }, [state?.record?.bom_id, record?.bom_id]);

    const addComponent = () => {
        setComponentItems((prev) => [
            ...prev,
            {
                component_item: "",
                component_desc: "",
                standard_usage: "",
            },
        ]);
    };

    const handleComponentItemChange = (index, value) => {
        console.log(componentItemOptions);
        const selected = componentItemOptions.find((opt) => opt.value === value);
        setComponentItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        component_item: value,
                        component_desc: selected?.desc || "",
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

    const canProceed = !!record;

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
            { item: "", desc: "", qty: "" },
        ]);
    };

    const handleCoProductItemChange = (index, value) => {
        const selected = coProductOptions.find((opt) => opt.value === value);
        const updated = [...coProducts];
        updated[index] = {
            ...updated[index],
            item: value,
            desc: selected?.desc || "",
        };
        setCoProducts(updated);
    };

    const updateCoProduct = (index, field, value) => {
        const updated = [...coProducts];
        updated[index][field] = value;
        setCoProducts(updated);
    };

    const removeCoProduct = (index) => {
        setCoProducts(coProducts.filter((_, i) => i !== index));
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
                            <label style={styles.label}>Produced Item</label>
                            <input
                                value={record?.produced_item || ""}
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
                            <label style={styles.label}>BOM Version</label>
                            <input
                                value={record?.bom_version || "PRIMARY"}
                                readOnly
                                style={styles.inputDisabled}
                                placeholder="BOM Version"
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
                                        <select
                                            style={styles.select}
                                            value={item.component_item}
                                            onChange={(e) =>
                                                handleComponentItemChange(index, e.target.value)
                                            }
                                        >
                                            <option value="">Select item</option>
                                            {componentItemOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>

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
                                            onChange={(e) =>
                                                updateComponent(index, "standard_usage", e.target.value)
                                            }
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
                            onChange={(e) => setProducedCoProduct(e.target.checked)}
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
                                            <select
                                                style={styles.select}
                                                value={cp.item}
                                                onChange={(e) =>
                                                    handleCoProductItemChange(index, e.target.value)
                                                }
                                            >
                                                <option value="">Select item</option>
                                                {coProductOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                style={styles.inputDisabled}
                                                placeholder="Description"
                                                value={cp.desc}
                                                readOnly
                                            />
                                            <input
                                                style={styles.input}
                                                placeholder="Qty Produced"
                                                value={cp.qty}
                                                onChange={(e) =>
                                                    updateCoProduct(index, "qty", e.target.value)
                                                }
                                            />
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

                {/* Footer */}
                <div style={styles.footer}>
                    <button
                        disabled={!canProceed}
                        style={{
                            ...styles.nextBtn,
                            opacity: canProceed ? 1 : 0.65,
                            cursor: canProceed ? "pointer" : "not-allowed",
                        }}
                        onClick={() => {
                            const normalizedRecord = {
                                ...record,
                                routing_id:
                                    record?.routing_id ||
                                    record?.routingId ||
                                    (record?.produced_item && record?.resource
                                        ? `ROUTING_${record.produced_item}_${record.resource}`
                                        : ""),
                            };

                            navigate("/review-changes", {
                                state: {
                                    record: normalizedRecord,
                                    componentItems,
                                    coProducts,
                                },
                            });
                        }} >
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

    input: {
        width: "100%",
        height: "42px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        padding: "0 12px",
        fontSize: "14px",
        boxSizing: "border-box",
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
};
``