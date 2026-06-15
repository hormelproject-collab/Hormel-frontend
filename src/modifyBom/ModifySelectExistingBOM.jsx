import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SEARCH_FIELDS = [
    { label: "Location", value: "location" },
    { label: "Produced Item", value: "produced_item" },
    { label: "Produced Item Description", value: "produced_item_desc" },
    { label: "BOM ID", value: "bom_id" },
    { label: "Resource", value: "resource" },
    { label: "Item Release Flag", value: "item_release_flag" },
];

const ModifySelectExistingBOM = () => {
    const navigate = useNavigate();

    const [searchBy1, setSearchBy1] = useState("");
    const [searchBy2, setSearchBy2] = useState("");
    const [query1, setQuery1] = useState("");
    const [query2, setQuery2] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const normalizeApiRows = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.value)) return payload.value;
        if (Array.isArray(payload?.data)) return payload.data;
        return [];
    };

    // Fetch data from API
    useEffect(() => {
        const fetchBomData = async () => {
            try {
                setLoading(true);
                setError("");

                // Fetch BOM data
                const bomRes = await fetch("http://localhost:3000/api/tables/bom_produced");
                if (!bomRes.ok) throw new Error("Failed to fetch BOM data");

                const bomData = await bomRes.json();
                const bomRows = normalizeApiRows(bomData);
                if (!Array.isArray(bomRows)) {
                    throw new Error("Invalid BOM API response");
                }

                // Fetch Item Master data
                const itemRes = await fetch("http://localhost:3000/api/bigquery/table/item_master");
                if (!itemRes.ok) throw new Error("Failed to fetch item master data");

                const itemDataRaw = await itemRes.json();
                const itemData = normalizeApiRows(itemDataRaw);

                // Fetch Item Release Flag data
                const releaseFlagRes = await fetch("http://localhost:3000/api/bigquery/table/item_releaseflag");
                if (!releaseFlagRes.ok) throw new Error("Failed to fetch item release flag data");

                const releaseFlagDataRaw = await releaseFlagRes.json();
                const releaseFlagData = normalizeApiRows(releaseFlagDataRaw);

                // Create lookup map: item -> item_desc
                const itemDescMap = {};
                itemData.forEach((item) => {
                    if (item?.item) {
                        itemDescMap[item.item] = item.item_desc || "-";
                    }
                });

                // Create lookup map: item -> release
                const releaseFlagMap = {};
                releaseFlagData.forEach((record) => {
                    if (record?.item) {
                        releaseFlagMap[record.item] = record.release || "-";
                    }
                });

                // Fetch Routing Resource Constraints data
                const routingRes = await fetch("http://localhost:3000/api/bigquery/table/routing_rescons?limit=100");
                if (!routingRes.ok) throw new Error("Failed to fetch routing resource data");

                const routingDataRaw = await routingRes.json();
                const routingData = normalizeApiRows(routingDataRaw);

                // Create lookup map: item -> Resource
                const resourceMap = {};
                routingData.forEach((record) => {
                    if (record?.item) {
                        resourceMap[record.item] = record.resource || "-";
                    }
                });
                // Map API response to table format with enriched item descriptions and release flags
                const mappedRows = bomRows.map((record, index) => ({
                    id: record.postgresql_rec_id || record.rec_id || index + 1,
                    location: record.location || "-",
                    produced_item: record.item || "-",
                    produced_item_desc: itemDescMap[record.item] || record.item_desc || "-",
                    bom_id: record.bom_id || "-",
                    resource: resourceMap[record.item] || record.resource || "-",
                    item_release_flag: releaseFlagMap[record.item] || record.item_release_flag || "-",
                }));

                setRows(mappedRows);
            } catch (e) {
                setError(e.message || "Failed to load BOM data");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBomData();
    }, []);

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const match1 =
                !query1 ||
                String(row[searchBy1] || "")
                    .toLowerCase()
                    .includes(query1.toLowerCase());

            const match2 =
                !query2 ||
                String(row[searchBy2] || "")
                    .toLowerCase()
                    .includes(query2.toLowerCase());

            return match1 && match2;
        });
    }, [rows, query1, query2, searchBy1, searchBy2]);

    const getReleaseStyle = (flag) => {
        const isWarn = flag.includes("3");
        return {
            color: isWarn ? "red" : "black",
            fontWeight: isWarn ? 600 : 400,
        };
    };

    return (
        <div style={styles.page}>
            <div style={styles.wrapper}>

                {/* BACK */}
                <div style={styles.back} onClick={() => navigate(-1)}>
                    ← BACK
                </div>

                {/* HEADER */}
                <h1 style={styles.title}>Step 1: Select Existing BOM</h1>
                <p style={styles.subtitle}>Find and select a BOM to modify</p>

                {/* LOADING STATE */}
                {loading && (
                    <div style={styles.card}>
                        <div style={styles.loadingBox}>Loading BOM records...</div>
                    </div>
                )}

                {/* ERROR STATE */}
                {error && (
                    <div style={styles.card}>
                        <div style={styles.errorBox}>{error}</div>
                    </div>
                )}

                {/* SEARCH & TABLE SECTION */}
                {!loading && !error && (
                    <>
                        {/* ✅ SEARCH SECTION */}

                        <div style={styles.searchContainer}>

                            {/* ROW 1 */}
                            <div style={styles.searchRow}>

                                {/* LEFT */}
                                <div style={styles.field}>
                                    <label style={styles.label}>Search By (Criteria 1)</label>
                                    <select
                                        value={searchBy1}
                                        onChange={(e) => setSearchBy1(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">Select</option>
                                        {SEARCH_FIELDS.map((f) => (
                                            <option key={f.value} value={f.value}>
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* RIGHT */}
                                <div style={styles.field}>
                                    <label style={styles.label}>Search Value</label>
                                    <input
                                        value={query1}
                                        onChange={(e) => setQuery1(e.target.value)}
                                        placeholder={searchBy1 ? `Search ${searchBy1}` : ""}
                                        style={styles.input}
                                    />
                                </div>

                            </div>

                            {/* ROW 2 */}
                            <div style={styles.searchRow}>

                                {/* LEFT */}
                                <div style={styles.field}>
                                    <label style={styles.label}>Search By (Criteria 2)</label>
                                    <select
                                        value={searchBy2}
                                        onChange={(e) => setSearchBy2(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">Select</option>
                                        {SEARCH_FIELDS.map((f) => (
                                            <option key={f.value} value={f.value}>
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* RIGHT */}
                                <div style={styles.field}>
                                    <label style={styles.label}>Search Value</label>
                                    <input
                                        value={query2}
                                        onChange={(e) => setQuery2(e.target.value)}
                                        placeholder={searchBy2 ? `Search ${searchBy2}` : ""}
                                        style={styles.input}
                                    />
                                </div>

                            </div>

                        </div>


                        {/* ✅ TABLE */}
                        <div style={styles.table}>
                            <div style={styles.header}>
                                <div>Location</div>
                                <div>Produced Item</div>
                                <div>Produced Item Description</div>
                                <div>BOM ID</div>
                                <div>Resource</div>
                                <div>Item Release Flag</div>
                            </div>

                            {filteredRows.map((r) => (
                                <div
                                    key={r.id}
                                    style={styles.row}

                                    onClick={() =>
                                        navigate(`/modify-existing-bom-data/${r.id}`, {
                                            state: { record: r  },
                                        })
                                    }

                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            navigate(`/modify-existing-bom-data/${r.id}`, {
                                            });
                                        }
                                    }}
                                    tabIndex={0}
                                >
                                    <div>{r.location}</div>
                                    <div>{r.produced_item}</div>
                                    <div>{r.produced_item_desc}</div>
                                    <div>{r.bom_id}</div>
                                    <div>{r.resource}</div>
                                    <div style={getReleaseStyle(r.item_release_flag)}>
                                        {r.item_release_flag}
                                        {r.item_release_flag.includes("3") && " ⚠️"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

            export default ModifySelectExistingBOM;


            const styles = {
                page: {
                background: "#f3f4f6",
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
    },

            wrapper: {
                maxWidth: "1000px",
            width: "100%",
            padding: "20px",
    },

            back: {
                color: "#2563eb",
            cursor: "pointer",
            marginBottom: 10,
    },

            title: {
                fontSize: 30,
            fontWeight: 700,
    },

            subtitle: {
                color: "#666",
            marginBottom: 20,
    },

            card: {
                background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "20px",
            marginBottom: "18px",
    },

            loadingBox: {
                padding: "20px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "14px",
    },

            errorBox: {
                padding: "16px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "14px",
    },

            searchContainer: {
                display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "20px",
    },

            searchRow: {
                display: "grid",
            gridTemplateColumns: "1fr 1fr",   // ✅ PERFECT ALIGNMENT
            gap: "20px",
    },

            field: {
                display: "flex",
            flexDirection: "column",
    },

            label: {
                fontSize: "13px",
            marginBottom: "6px",
            color: "#6b7280",
    },

            select: {
                width: "100%",
            height: "44px",
            borderRadius: "4px",
            border: "1px solid #c7c7c7",
            padding: "0 10px",
            fontSize: "14px",
        //   boxSizing: "border-box"
    },

            input: {
                width: "100%",
            height: "44px",
            borderRadius: "4px",
            border: "1px solid #c7c7c7",
            padding: "0 10px",
            fontSize: "14px",
            boxSizing: "border-box"
    },


            table: {
                border: "1px solid #ddd",
            borderRadius: 6,
            overflow: "hidden",
    },

            header: {
                display: "grid",
            // gridTemplateColumns: "1fr 1fr 2fr 2fr 1fr 1fr",
            gridTemplateColumns: "0.5fr 0.6fr 1.5fr 1.5fr 2fr 1fr",
            background: "#e5e7eb",
            padding: 10,
            // fontWeight: "bold",
        },
        
        row: {
            display: "grid",
            // gridTemplateColumns: "1fr 1fr 2fr 2fr 1fr 1fr", 
            gridTemplateColumns: "0.5fr 0.6fr 1.5fr 1.5fr 2fr 1fr",
            padding: 10,
            borderTop: "1px solid #eee",
            cursor: "pointer",
    },
};