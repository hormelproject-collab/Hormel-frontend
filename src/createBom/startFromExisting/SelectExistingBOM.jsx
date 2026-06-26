import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:3000";

const SEARCH_FIELDS = [
  { label: "None", value: "" },
  { label: "Location", value: "location" },
  { label: "Produced Item", value: "produced_item" },
  { label: "Produced Item Desc", value: "produced_item_desc" },
  { label: "BOMID", value: "bom_id" },
  { label: "Resource", value: "resource" },
  { label: "Item Release Flag", value: "item_release_flag" },
];

const normalizeRow = (row, index) => {
  const location = String(row.location ?? "").trim();
  const producedItem = String(row.produced_item ?? row.item ?? "").trim();
  const producedItemDesc = String(
    row.produced_item_desc ?? row.item_description ?? row.item_desc ?? ""
  ).trim();
  const bomId = String(row.bom_id ?? row.bomId ?? "").trim();
  const resource = String(row.resource ?? "").trim();
  const itemReleaseFlag = String(
    row.item_release_flag ??
      row.item_releaseflag ??
      row.release_flag ??
      row.release ??
      ""
  ).trim();

  return {
    id: row.id ?? `${bomId}-${resource || "NORESOURCE"}-${index}`,
    location,
    produced_item: producedItem,
    produced_item_desc: producedItemDesc,
    bom_id: bomId,
    resource,
    item_release_flag: itemReleaseFlag,
    __raw: row,
  };
};

const getReleaseStyle = (flag) => {
  const text = String(flag ?? "").trim();
  const isWarn =
    text.includes("3") || /warning/i.test(text) || text.includes("△");

  return {
    color: isWarn ? "#dc2626" : "#111827",
    fontWeight: isWarn ? 500 : 400,
  };
};

const getSearchPlaceholder = (fieldValue) => {
  const selectedField = SEARCH_FIELDS.find((f) => f.value === fieldValue);

  if (!selectedField || !selectedField.value) {
    return "Search...";
  }

  return `Search ${selectedField.label}`;
};

const SelectExistingBOM = () => {
  const navigate = useNavigate();

  const [searchBy1, setSearchBy1] = useState("resource");
  const [searchBy2, setSearchBy2] = useState("location");
  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedRowId, setSelectedRowId] = useState("");

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`${API_BASE_URL}/api/tables/existing-bom-search`);

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const result = await res.json();

        const sourceRows = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];

        const formatted = sourceRows.map((row, index) =>
          normalizeRow(row, index)
        );

        setRows(formatted);
      } catch (e) {
        setErr(e?.message || "Failed to fetch existing BOM records");
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, []);


  const getSearchValue = (row, field) => {
  switch (field) {
    case "location":
      return row.location ?? "";

    case "produced_item":
      return row.produced_item ?? "";

    case "produced_item_desc":
      return row.produced_item_desc ?? "";

    case "bom_id":
      return row.bom_id ?? "";

    case "resource":
      return row.resource ?? "";

    case "item_release_flag":
      return row.item_release_flag ?? "";

    default:
      return "";
  }
};

const filteredRows = useMemo(() => {
  const q1 = String(query1 ?? "").trim().toLowerCase();
  const q2 = String(query2 ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    const rowValue1 = String(getSearchValue(row, searchBy1) ?? "")
      .trim()
      .toLowerCase();

    const rowValue2 = String(getSearchValue(row, searchBy2) ?? "")
      .trim()
      .toLowerCase();

    const match1 = searchBy1 && q1 ? rowValue1 === q1 : true;
    const match2 = searchBy2 && q2 ? rowValue2 === q2 : true;

    return match1 && match2;
  });
}, [rows, searchBy1, searchBy2, query1, query2]);


  const handleRowClick = (row) => {
    setSelectedRowId(row.id);

    navigate(`/modify-existing-bom/${encodeURIComponent(row.id)}`, {
      state: {
        selectedBom: row,
        selectedBomId: row.id,
        selectedBomRaw: row.__raw,
      },
    });
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.page}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.h1}>Step 1: Select Existing BOM</h1>
        <p style={styles.sub}>Find and select a BOM to copy</p>

        <div style={styles.searchSection}>
          <div style={styles.searchRow}>
            <div style={styles.searchColLeft}>
              <div style={styles.criteriaLabel}>Search By (Criteria 1)</div>
              <select
                value={searchBy1}
                onChange={(e) => setSearchBy1(e.target.value)}
                style={styles.dropdown}
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={`criteria1-${f.value}`} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.searchColRight}>
              <input
                type="text"
                value={query1}
                onChange={(e) => setQuery1(e.target.value)}
                placeholder={getSearchPlaceholder(searchBy1)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.searchRow}>
            <div style={styles.searchColLeft}>
              <div style={styles.criteriaLabel}>Search By (Criteria 2)</div>
              <select
                value={searchBy2}
                onChange={(e) => setSearchBy2(e.target.value)}
                style={styles.dropdown}
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={`criteria2-${f.value}`} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.searchColRight}>
              <input
                type="text"
                value={query2}
                onChange={(e) => setQuery2(e.target.value)}
                placeholder={getSearchPlaceholder(searchBy2)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {loading ? <div style={styles.infoText}>Loading...</div> : null}
        {err ? <div style={styles.errorText}>Error: {err}</div> : null}

        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div>Location</div>
            <div>Produced Item</div>
            <div>Produced Item Description</div>
            <div>BOMID</div>
            <div>Resource</div>
            <div>Item Release Flag</div>
          </div>

       {!loading && filteredRows.length === 0 ? (
  <div style={styles.emptyState}>No BOM records found.</div>
) : (
  filteredRows.map((row, index) => {
    const safeKey =
      row.id || `${row.bom_id}-${row.resource || "NORESOURCE"}-${index}`;

    const isSelected = selectedRowId === row.id;

    return (
      <div
        key={safeKey}
        style={{
          ...styles.tableRow,
          ...(isSelected ? styles.tableRowSelected : {}),
        }}
        onClick={() => handleRowClick(row)}
      >
        <div style={styles.cell}>{row.location || "-"}</div>
        <div style={styles.cell}>{row.produced_item || "-"}</div>
        <div style={styles.cell}>{row.produced_item_desc || "-"}</div>
        <div style={styles.cell}>{row.bom_id || "-"}</div>
        <div style={styles.cell}>{row.resource || "-"}</div>
        <div
          style={{
            ...styles.cell,
            ...getReleaseStyle(row.item_release_flag),
          }}
        >
          {row.item_release_flag || "-"}
        </div>
      </div>
    );
  })
)}
        </div>
      </div>
    </div>
  );
};

export default SelectExistingBOM;

const styles = {
  pageBg: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px 0 40px",
  },
  page: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 18px",
    boxSizing: "border-box",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: 10,
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
    margin: "0 0 14px",
    fontSize: 14,
  },
  searchSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    maxWidth: 980,
    marginBottom: 18,
  },
  searchRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    width: "100%",
  },
  searchColLeft: {
    width: 490,
    maxWidth: "100%",
  },
  searchColRight: {
    flex: 1,
    minWidth: 240,
  },
  criteriaLabel: {
    fontSize: 10,
    color: "#2563eb",
    marginBottom: 4,
    marginLeft: 2,
    lineHeight: 1.2,
  },
  dropdown: {
    width: "100%",
    height: 40,
    padding: "0 12px",
    borderRadius: 3,
    border: "1px solid #cfd4dc",
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  searchInput: {
    width: "100%",
    height: 40,
    padding: "0 14px",
    borderRadius: 3,
    border: "1px solid #cfd4dc",
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.3fr 2fr 1.8fr 1.2fr 1.5fr",
    background: "#f3f4f6",
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.3fr 2fr 1.8fr 1.2fr 1.5fr",
    padding: "0 14px",
    minHeight: 40,
    alignItems: "center",
    borderTop: "1px solid #eeeeee",
    cursor: "pointer",
    background: "#ffffff",
  },
  tableRowSelected: {
    background: "#f9fafb",
  },
  cell: {
    padding: "11px 0",
    fontSize: 14,
    color: "#111827",
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  emptyState: {
    padding: "18px 12px",
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    background: "#ffffff",
  },
};