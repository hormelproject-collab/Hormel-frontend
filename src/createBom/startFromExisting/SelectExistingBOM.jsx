import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const SEARCH_FIELDS = [
  { label: "None", value: "" },
  { label: "Location", value: "location" },
  { label: "Produced Item", value: "produced_item" },
  { label: "Produced Item Description", value: "produced_item_desc" },
  { label: "BOM ID", value: "bom_id" },
  { label: "Resource", value: "resource" },
  { label: "Item Release Flag", value: "item_release_flag" },
  { label: "Component Item", value: "component_item" },
  { label: "Co-Product Item", value: "coproduct_item" },
];

const SelectExistingBOM = () => {
  const navigate = useNavigate();

  const [searchBy1, setSearchBy1] = useState("");
  const [searchBy2, setSearchBy2] = useState("");
  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ FETCH DATA
  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tables/item_bom_routing");
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        const formatted = data.map((row) => ({
          id: row.postgresql_rec_id,
          location: row.location || "Location 1",
          produced_item: row.item,
          produced_item_desc: "N/A",
          bom_id: row.bom_id,
          resource: row.routing_id,
          item_release_flag: "Release 1",
        }));

        setRows(formatted);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, []);

  // ✅ FILTER LOGIC (2 CRITERIA)
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
    const isWarn = String(flag).includes("3");
    return {
      color: isWarn ? "red" : "black",
      fontWeight: isWarn ? "600" : "400",
    };
  };

  return (
    <div style={styles.page}>
      <div style={styles.back} onClick={() => navigate(-1)}>
        ← BACK
      </div>

      <h1 style={styles.h1}>Step 1: Select Existing BOM</h1>
      <p style={styles.sub}>Find and select a BOM to copy</p>

      {/* ✅ SEARCH SECTION */}
      <div style={styles.searchContainer}>
        
        {/* CRITERIA 1 */}
        <div style={styles.searchBlock}>
          <label style={styles.label}>Search By (Criteria 1)</label>
          <select
            value={searchBy1}
            onChange={(e) => setSearchBy1(e.target.value)}
            style={styles.dropdown}
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Search..."
            value={query1}
            onChange={(e) => setQuery1(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* CRITERIA 2 */}
        <div style={styles.searchBlock}>
          <label style={styles.label}>Search By (Criteria 2)</label>
          <select
            value={searchBy2}
            onChange={(e) => setSearchBy2(e.target.value)}
            style={styles.dropdown}
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Search..."
            value={query2}
            onChange={(e) => setQuery2(e.target.value)}
            style={styles.input}
          />
        </div>

      </div>

      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "red" }}>{err}</div>}

      {/* ✅ TABLE */}
      <div style={styles.tableWrap}>
        <div style={styles.tableHeader}>
          <div>Location</div>
          <div>Produced Item</div>
          <div>Description</div>
          <div>BOM ID</div>
          <div>Resource</div>
          <div>Item Release Flag</div>
        </div>

        {filteredRows.map((r) => (
          <div
            key={r.id}
            style={styles.tableRow}
            onClick={() => navigate(`/modify-existing-bom/${r.id}`)}
          >
            <div>{r.location}</div>
            <div>{r.produced_item}</div>
            <div>{r.produced_item_desc}</div>
            <div>{r.bom_id}</div>
            <div>{r.resource}</div>
            <div style={getReleaseStyle(r.item_release_flag)}>
              {r.item_release_flag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectExistingBOM;

const styles = {
  page: { padding: 30, maxWidth: 1100, margin: "auto" },

  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: 10,
  },

  h1: { fontSize: 32, fontWeight: "600" },
  sub: { color: "#666", marginBottom: 20 },

  searchContainer: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
  },

  searchBlock: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  label: {
    fontSize: 13,
    color: "#444",
  },

  dropdown: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  tableWrap: {
    border: "1px solid #ddd",
    borderRadius: 6,
    overflow: "hidden",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    background: "#f3f4f6",
    padding: 10,
    fontWeight: "bold",
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    padding: 10,
    borderTop: "1px solid #eee",
    cursor: "pointer",
  },
};