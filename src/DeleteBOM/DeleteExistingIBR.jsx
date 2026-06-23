import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ITEM_BOM_ROUTING_API = `${BASE_URL}/api/tables/existing-item-bom-routing-search`;

const styles = {
    page: {
        minHeight: "100vh",
        background: "#ececec",
        fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#111827",
    },
    shell: {
        maxWidth: "1220px",
        margin: "0 auto",
        padding: "18px 24px 40px",
    },
    backBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        border: "none",
        background: "transparent",
        color: "#2563eb",
        fontSize: "13px",
        fontWeight: 500,
        padding: 0,
        cursor: "pointer",
        marginBottom: "10px",
    },
    title: {
        margin: "0 0 22px",
        fontSize: "24px",
        lineHeight: 1.2,
        fontWeight: 700,
        color: "#111827",
    },

    filterStack: {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        marginBottom: "20px",
        maxWidth: "1150px",
    },
    criteriaRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
        alignItems: "center",
    },
    fieldGroup: {
        position: "relative",
    },
    fieldLabel: {
        position: "absolute",
        top: "-7px",
        left: "14px",
        fontSize: "11px",
        color: "#2563eb",
        background: "#ececec",
        padding: "0 4px",
        zIndex: 2,
        lineHeight: 1,
    },
    selectWrap: {
        position: "relative",
    },
    select: {
        width: "100%",
        height: "50px",
        border: "1px solid #bcc3cc",
        borderRadius: "2px",
        padding: "0 42px 0 16px",
        fontSize: "14px",
        color: "#111827",
        outline: "none",
        appearance: "none",
        background: "#ffffff",
        boxSizing: "border-box",
    },
    input: {
        width: "100%",
        height: "50px",
        border: "1px solid #bcc3cc",
        borderRadius: "2px",
        padding: "0 16px",
        fontSize: "14px",
        color: "#111827",
        outline: "none",
        background: "#ffffff",
        boxSizing: "border-box",
    },
    selectArrow: {
        position: "absolute",
        top: "50%",
        right: "14px",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "#6b7280",
        fontSize: "12px",
    },

    stateBox: {
        marginBottom: "14px",
        padding: "10px 12px",
        borderRadius: "3px",
        fontSize: "12px",
    },
    loading: {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
    },
    error: {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
    },
    warningBox: {
        marginBottom: "14px",
        padding: "10px 12px",
        borderRadius: "3px",
        fontSize: "12px",
        background: "#fff7ed",
        color: "#9a3412",
        border: "1px solid #fdba74",
        maxWidth: "1150px",
    },

    tableCard: {
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "3px",
        boxShadow: "0 2px 3px rgba(0,0,0,0.08)",
        overflow: "hidden",
        maxWidth: "1150px",
    },
    tableScroller: {
        overflowX: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
    },
    tableHeadRow: {
        background: "#f3f4f6",
    },
    th: {
        textAlign: "left",
        fontSize: "12px",
        fontWeight: 600,
        color: "#111827",
        padding: "13px 12px",
        borderBottom: "1px solid #d1d5db",
        whiteSpace: "nowrap",
    },
    td: {
        fontSize: "12px",
        color: "#111827",
        padding: "12px 12px",
        borderBottom: "1px solid #d1d5db",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        background: "#ffffff",
    },
    checkboxCell: {
        width: "34px",
        textAlign: "center",
        padding: "0 0 0 12px",
    },
    checkbox: {
        width: "15px",
        height: "15px",
        cursor: "pointer",
    },
    emptyRow: {
        textAlign: "center",
        color: "#6b7280",
        padding: "22px 12px",
        fontSize: "12px",
    },

    highlightedCoProductRow: {
        background: "#fef08a",
    },

    legendRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "12px",
        fontSize: "12px",
        color: "#374151",
        maxWidth: "1150px",
    },
    legendColor: {
        width: "18px",
        height: "14px",
        background: "#fef08a",
        border: "1px solid #d1d5db",
        borderRadius: "2px",
        flexShrink: 0,
    },

    footerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "18px",
        gap: "16px",
        maxWidth: "1150px",
    },
    selectionText: {
        fontSize: "12px",
        color: "#374151",
    },
    confirmBtn: {
        minWidth: "214px",
        height: "32px",
        border: "none",
        borderRadius: "3px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontSize: "12px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1px",
        cursor: "pointer",
    },
    confirmBtnDisabled: {
        background: "#e5e5e5",
        color: "#a8a8a8",
        cursor: "not-allowed",
    },
    confirmBtnEnabled: {
        background: "#2563eb",
        color: "#ffffff",
    },
};

const CRITERIA_OPTIONS = [
    { value: "", label: "None" },
    { value: "location", label: "Location" },
    { value: "item", label: "Produced Item" },
    { value: "bomId", label: "BOMID" },
    { value: "resource", label: "Resource" },
    { value: "routingId", label: "Routing ID" },
    { value: "componentItem", label: "Component Item" },
    { value: "coProductItem", label: "Co-Product Item" },
];

const getValue = (obj, keys) => {
    for (const key of keys) {
        const value = obj?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
};

const deriveLocationFromBomId = (bomId) => {
    const value = String(bomId || "").trim();
    if (!value) return "";
    const parts = value.split("_");
    if (parts.length < 3) return "";
    return parts.slice(2).join("_").trim();
};

const deriveResourceFromRoutingId = (routingId) => {
    const value = String(routingId || "").trim();
    if (!value) return "";
    const parts = value.split("_");
    if (parts.length < 4) return "";
    return parts[parts.length - 1].trim();
};

const normalizeRoutingRecord = (row, index) => {
    const item = getValue(row, ["item", "Item", "ITEM"]);
    const routingId = getValue(row, [
        "routing_id",
        "RoutingID",
        "routingId",
        "ROUTING_ID",
    ]);
    const bomId = getValue(row, ["bom_id", "BOMID", "bomId", "BOM_ID"]);
    const resource =
        getValue(row, ["resource", "Resource", "RESOURCE"]) ||
        deriveResourceFromRoutingId(routingId);
    const recId = getValue(row, ["rec_id", "recId", "REC_ID"]);
    const location = deriveLocationFromBomId(bomId);
    const componentItem = getValue(row, [
        "component_item",
        "componentItem",
        "ComponentItem",
        "COMPONENT_ITEM",
    ]);
    const coProductItem = getValue(row, [
        "co_product_item",
        "coProductItem",
        "CoProductItem",
        "coproduct_item",
        "COPRODUCT_ITEM",
    ]);
    const rawCoProductAssociation = getValue(row, [
        "erp_co_product_association",
        "co_product_association",
        "erpCoProductAssociation",
        "coProductAssociation",
        "ERP_CO_PRODUCT_ASSOCIATION",
    ]);

    const coProductAssociation =
        String(rawCoProductAssociation).trim() === "1" ? 1 : 0;

    return {
        id: recId || `${bomId}__${routingId}__${item}__${index}`,
        recId,
        item,
        routingId,
        bomId,
        location,
        resource,
        componentItem,
        coProductItem,
        coProductAssociation,
        raw: row,
    };
};

const getCriteriaValue = (row, field) => {
    switch (field) {
        case "location":
            return row.location || "";
        case "item":
            return row.item || "";
        case "bomId":
            return row.bomId || "";
        case "resource":
            return row.resource || "";
        case "routingId":
            return row.routingId || "";
        case "componentItem":
            return row.componentItem || "";
        case "coProductItem":
            return row.coProductItem || "";
        default:
            return "";
    }
};

const buildParentGroupKey = (row) =>
    `${String(row?.bomId || "").trim()}__${String(row?.routingId || "").trim()}`;

export default function DeleteExistingItemBomRoutingStep1() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [criteria1Field, setCriteria1Field] = useState("bomId");
    const [criteria1Value, setCriteria1Value] = useState("");
    const [criteria2Field, setCriteria2Field] = useState("item");
    const [criteria2Value, setCriteria2Value] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadRows = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(ITEM_BOM_ROUTING_API, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.details ||
                            result?.error ||
                            "Failed to fetch item BOM routing records"
                    );
                }

                const list = Array.isArray(result?.data) ? result.data : [];
                const normalized = list.map((row, index) =>
                    normalizeRoutingRecord(row, index)
                );

                if (!cancelled) {
                    setRows(normalized);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || "Failed to fetch item BOM routing records");
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadRows();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const value1 = String(getCriteriaValue(row, criteria1Field) ?? "")
                .trim()
                .toLowerCase();
            const value2 = String(getCriteriaValue(row, criteria2Field) ?? "")
                .trim()
                .toLowerCase();

            const search1 = String(criteria1Value ?? "").trim().toLowerCase();
            const search2 = String(criteria2Value ?? "").trim().toLowerCase();

            const match1 = !criteria1Field || !search1 ? true : value1 === search1;
            const match2 = !criteria2Field || !search2 ? true : value2 === search2;

            return match1 && match2;
        });
    }, [rows, criteria1Field, criteria1Value, criteria2Field, criteria2Value]);

    const selectedCount = selectedIds.length;

    const allVisibleSelected =
        filteredRows.length > 0 &&
        filteredRows.every((row) => selectedIds.includes(row.id));

    const handleToggleAll = () => {
        if (allVisibleSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !filteredRows.some((row) => row.id === id))
            );
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set(prev);
            filteredRows.forEach((row) => next.add(row.id));
            return Array.from(next);
        });
    };

    const handleToggleRow = (rowId) => {
        setSelectedIds((prev) =>
            prev.includes(rowId)
                ? prev.filter((id) => id !== rowId)
                : [...prev, rowId]
        );
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleConfirm = () => {
        const directlySelectedRows = rows.filter((row) => selectedIds.includes(row.id));
        const expandedMap = new Map();

        directlySelectedRows.forEach((selectedRow) => {
            expandedMap.set(selectedRow.id, selectedRow);

            const isParentRow = selectedRow.coProductAssociation !== 1;

            if (isParentRow) {
                const parentGroupKey = buildParentGroupKey(selectedRow);

                rows
                    .filter(
                        (candidate) =>
                            buildParentGroupKey(candidate) === parentGroupKey &&
                            candidate.coProductAssociation === 1
                    )
                    .forEach((coProductRow) => {
                        expandedMap.set(coProductRow.id, coProductRow);
                    });
            }
        });

        const selectedRows = Array.from(expandedMap.values());

        navigate("/delete-bom-dashboard/delete-existing-ibr/summary", {
            state: {
                selectedRows,
                originallySelectedRows: directlySelectedRows,
            },
        });
    };

    const criteria1Label =
        CRITERIA_OPTIONS.find((x) => x.value === criteria1Field)?.label || "";
    const criteria2Label =
        CRITERIA_OPTIONS.find((x) => x.value === criteria2Field)?.label || "";

    return (
        <div style={styles.page}>
            <div style={styles.shell}>
                <button type="button" onClick={handleBack} style={styles.backBtn}>
                    <span style={{ fontSize: "16px", lineHeight: 1 }}>←</span>
                    <span>BACK</span>
                </button>

                <h1 style={styles.title}>Step 1: Select Existing BOM</h1>

                <div style={styles.filterStack}>
                    <div style={styles.criteriaRow}>
                        <div style={styles.fieldGroup}>
                            <div style={styles.fieldLabel}>Search By (Criteria 1)</div>
                            <div style={styles.selectWrap}>
                                <select
                                    value={criteria1Field}
                                    onChange={(e) => setCriteria1Field(e.target.value)}
                                    style={styles.select}
                                >
                                    {CRITERIA_OPTIONS.map((option) => (
                                        <option
                                            key={option.value || "criteria1"}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span style={styles.selectArrow}>▼</span>
                            </div>
                        </div>

                        <div style={styles.fieldGroup}>
                            <div style={styles.fieldLabel}>
                                Search {criteria1Label || "Value"}
                            </div>
                            <input
                                type="text"
                                value={criteria1Value}
                                onChange={(e) => setCriteria1Value(e.target.value)}
                                placeholder={`Search ${criteria1Label || ""}`}
                                style={styles.input}
                            />
                        </div>
                    </div>

                    <div style={styles.criteriaRow}>
                        <div style={styles.fieldGroup}>
                            <div style={styles.fieldLabel}>Search By (Criteria 2)</div>
                            <div style={styles.selectWrap}>
                                <select
                                    value={criteria2Field}
                                    onChange={(e) => setCriteria2Field(e.target.value)}
                                    style={styles.select}
                                >
                                    {CRITERIA_OPTIONS.map((option) => (
                                        <option
                                            key={option.value || "criteria2"}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span style={styles.selectArrow}>▼</span>
                            </div>
                        </div>

                        <div style={styles.fieldGroup}>
                            <div style={styles.fieldLabel}>
                                Search {criteria2Label || "Value"}
                            </div>
                            <input
                                type="text"
                                value={criteria2Value}
                                onChange={(e) => setCriteria2Value(e.target.value)}
                                placeholder={`Search ${criteria2Label || ""}`}
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ ...styles.stateBox, ...styles.loading }}>
                        Loading item BOM routing records...
                    </div>
                ) : null}

                {error ? (
                    <div style={{ ...styles.stateBox, ...styles.error }}>{error}</div>
                ) : null}

                <div style={styles.warningBox}>
                    Warning: If a parent item is selected for deletion, any associated
                    co-products will also be included in the deletion.
                </div>

                <div style={styles.tableCard}>
                    <div style={styles.tableScroller}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeadRow}>
                                    <th style={{ ...styles.th, ...styles.checkboxCell }}>
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={handleToggleAll}
                                            style={styles.checkbox}
                                            aria-label="Select all rows"
                                        />
                                    </th>
                                    <th style={{ ...styles.th, width: "120px" }}>Location</th>
                                    <th style={{ ...styles.th, width: "105px" }}>Item</th>
                                    <th style={{ ...styles.th, width: "220px" }}>BOM ID</th>
                                    <th style={{ ...styles.th, width: "120px" }}>Resource</th>
                                    <th style={{ ...styles.th, width: "360px" }}>Routing ID</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!loading && filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={styles.emptyRow}>
                                            No existing item BOM routing records found.
                                        </td>
                                    </tr>
                                ) : null}

                                {filteredRows.map((row) => {
                                    const isSelected = selectedIds.includes(row.id);
                                    const highlighted =
                                        row.coProductAssociation === 1
                                            ? styles.highlightedCoProductRow
                                            : undefined;

                                    return (
                                        <tr key={row.id}>
                                            <td
                                                style={{
                                                    ...styles.td,
                                                    ...styles.checkboxCell,
                                                    ...(highlighted || {}),
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleRow(row.id)}
                                                    style={styles.checkbox}
                                                    aria-label={`Select routing record ${
                                                        row.routingId || row.id
                                                    }`}
                                                />
                                            </td>
                                            <td style={{ ...styles.td, ...(highlighted || {}) }}>
                                                {row.location || "-"}
                                            </td>
                                            <td style={{ ...styles.td, ...(highlighted || {}) }}>
                                                {row.item || "-"}
                                            </td>
                                            <td style={{ ...styles.td, ...(highlighted || {}) }}>
                                                {row.bomId || "-"}
                                            </td>
                                            <td style={{ ...styles.td, ...(highlighted || {}) }}>
                                                {row.resource || "-"}
                                            </td>
                                            <td style={{ ...styles.td, ...(highlighted || {}) }}>
                                                {row.routingId || "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={styles.legendRow}>
                    <span style={styles.legendColor} />
                    <span>Yellow color code represents co-products.</span>
                </div>

                <div style={styles.footerRow}>
                    <div style={styles.selectionText}>
                        {selectedCount} record(s) selected for deletion
                    </div>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={selectedCount === 0}
                        style={{
                            ...styles.confirmBtn,
                            ...(selectedCount === 0
                                ? styles.confirmBtnDisabled
                                : styles.confirmBtnEnabled),
                        }}
                    >
                        <span style={{ fontSize: "12px" }}>🗑</span>
                        <span>CONFIRM AND SUBMIT DELETION</span>
                    </button>
                </div>
            </div>
        </div>
    );
}