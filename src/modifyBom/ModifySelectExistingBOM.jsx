import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setModifySelectState, selectModifySelectState } from "../redux/bomSlice";
import { useNavigate } from "react-router-dom";

const SEARCH_FIELDS = [
  { label: "Location", value: "location" },
  { label: "Produced Item", value: "produced_item" },
  { label: "Produced Item Description", value: "produced_item_desc" },
  { label: "BOM ID", value: "bom_id" },
  // { label: "Resource", value: "resource" },
  { label: "Item Release Flag", value: "item_release_flag" },
];

const normalizeApiArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const buildRoutingId = (producedItem, resource) => {
  const item = String(producedItem || "").trim();
  const res = String(resource || "").trim();
  if (!item || !res) return "";
  return `ROUTING_${item}_${res}`;
};

const ModifySelectExistingBOM = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { searchBy1, searchBy2, query1, query2, rows } = useSelector(
    selectModifySelectState
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBomData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:3000/api/tables/existing-bom-search"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch existing BOM search data");
        }

        const payload = await response.json();
        const apiRows = normalizeApiArray(payload);

        const mappedRows = apiRows.map((row, index) => ({
          id: row.id || `${row.bom_id || "BOM"}__${row.resource || index}`,
          location: row.location || "-",
          produced_item: row.produced_item || "-",
          produced_item_desc: row.produced_item_desc || "-",
          bom_id: row.bom_id || "-",
          resource: row.resource || "-",
          routing_id:
            row.routing_id ||
            buildRoutingId(row.produced_item, row.resource),
          item_release_flag: row.item_release_flag || "-",
        }));

        dispatch(
          setModifySelectState({
            rows: mappedRows,
          })
        );
      } catch (e) {
        console.error("Failed to load existing BOM rows:", e);
        setError(e.message || "Failed to load BOM data");
        dispatch(setModifySelectState({ rows: [] }));
      } finally {
        setLoading(false);
      }
    };

    if (!rows || rows.length === 0) {
      fetchBomData();
    } else {
      setLoading(false);
    }
  }, []);

   const filteredRows = useMemo(() => {
  return rows.filter((row) => {
    const value1 = String(row[searchBy1] ?? "").trim().toLowerCase();
    const value2 = String(row[searchBy2] ?? "").trim().toLowerCase();

    const search1 = String(query1 ?? "").trim().toLowerCase();
    const search2 = String(query2 ?? "").trim().toLowerCase();

    const match1 =
      !searchBy1 || !search1
        ? true
        : searchBy1 === "bom_id"
        ? value1 === search1
        : value1.includes(search1);

    const match2 =
      !searchBy2 || !search2
        ? true
        : searchBy2 === "bom_id"
        ? value2 === search2
        : value2.includes(search2);

    return match1 && match2; // AND logic
  });
}, [rows, searchBy1, searchBy2, query1, query2]);

  const getReleaseStyle = (flag) => {
    const text = String(flag || "");
    const isWarn = text.includes("3");

    return {
      color: isWarn ? "red" : "black",
      fontWeight: isWarn ? 600 : 400,
    };
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 1: Select Existing BOM</h1>
        <p style={styles.subtitle}>Find and select a BOM to modify</p>

        {loading && (
          <div style={styles.card}>
            <div style={styles.loadingBox}>Loading BOM records...</div>
          </div>
        )}

        {error && (
          <div style={styles.card}>
            <div style={styles.errorBox}>{error}</div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={styles.searchContainer}>
              <div style={styles.searchRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Search By (Criteria 1)</label>
                  <select
                    value={searchBy1}
                    onChange={(e) =>
                      dispatch(setModifySelectState({ searchBy1: e.target.value }))
                    }
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

                <div style={styles.field}>
                  <label style={styles.label}>Search Value</label>
                  <input
                    value={query1}
                    onChange={(e) =>
                      dispatch(setModifySelectState({ query1: e.target.value }))
                    }
                    placeholder={searchBy1 ? `Search ${searchBy1}` : ""}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.searchRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Search By (Criteria 2)</label>
                  <select
                    value={searchBy2}
                    onChange={(e) =>
                      dispatch(setModifySelectState({ searchBy2: e.target.value }))
                    }
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

                <div style={styles.field}>
                  <label style={styles.label}>Search Value</label>
                  <input
                    value={query2}
                    onChange={(e) =>
                      dispatch(setModifySelectState({ query2: e.target.value }))
                    }
                    placeholder={searchBy2 ? `Search ${searchBy2}` : ""}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            <div style={styles.table}>
              <div style={styles.header}>
                <div>Location</div>
                <div>Produced Item</div>
                <div>Produced Item Description</div>
                <div>BOM ID</div>
                {/* <div>Resource</div> */}
                <div>Item Release Flag</div>
              </div>

              {filteredRows.map((r) => (
                <div
                  key={r.id}
                  style={styles.row}
                  onClick={() =>
                    navigate(`/modify-existing-bom-data/${r.id}`, {
                      state: { record: r },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate(`/modify-existing-bom-data/${r.id}`, {
                        state: { record: r },
                      });
                    }
                  }}
                  tabIndex={0}
                >
                  <div>{r.location}</div>
                  <div>{r.produced_item}</div>
                  <div>{r.produced_item_desc}</div>
                  <div>{r.bom_id}</div>
                  {/* <div>{r.resource}</div> */}
                  <div style={getReleaseStyle(r.item_release_flag)}>
                    {r.item_release_flag}
                    {String(r.item_release_flag || "").includes("3") && " ⚠️"}
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
    gridTemplateColumns: "1fr 1fr",
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
  },
  input: {
    width: "100%",
    height: "44px",
    borderRadius: "4px",
    border: "1px solid #c7c7c7",
    padding: "0 10px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  table: {
    border: "1px solid #ddd",
    borderRadius: 6,
    overflow: "hidden",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "0.5fr 0.6fr 1.5fr 1.5fr 1fr",
    background: "#e5e7eb",
    padding: 10,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "0.5fr 0.6fr 1.5fr 1.5fr 1fr",
    padding: 10,
    borderTop: "1px solid #eee",
    cursor: "pointer",
  },
};