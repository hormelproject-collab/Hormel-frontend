import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ModifyExistingBOM = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const fetchOne = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/tables/item_bom_routing/${id}`);
        if (!res.ok) throw new Error(await res.text());
        setData(await res.json());
      } catch (e) {
        setErr(e.message || "Failed to load record");
      } finally {
        setLoading(false);
      }
    };
    fetchOne();
  }, [id]);

  if (loading) return <div style={styles.page}>Loading...</div>;
  if (err) return <div style={styles.page}>Error: {err}</div>;
  if (!data) return <div style={styles.page}>No data</div>;

  return (
    <div style={styles.page}>
      <div style={styles.back} onClick={() => navigate(-1)}>
        ← BACK
      </div>

      <h1 style={styles.h1}>Step 2: Modify Existing BOM Data</h1>
      <p style={styles.sub}>Record selected from Step 1 is prefilled below</p>

      <div style={styles.card}>
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>Location</label>
            <input value={data.location || ""} style={styles.inputDisabled} disabled />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Produced Item</label>
            <input value={data.produced_item || ""} style={styles.inputDisabled} disabled />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Produced Item Description</label>
            <input value={data.produced_item_desc || ""} style={styles.inputDisabled} disabled />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>BOM ID</label>
            <input value={data.bom_id || ""} style={styles.inputDisabled} disabled />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Resource</label>
            <input
              defaultValue={data.resource || ""}
              style={styles.input}
              placeholder="Edit resource"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Item Release Flag</label>
            <input value={data.item_release_flag || ""} style={styles.inputDisabled} disabled />
          </div>
        </div>
      </div>

      <div style={styles.bottom}>
        <button style={styles.primaryBtn} onClick={() => navigate("/summary")}>
          NEXT: SUMMARY →
        </button>
      </div>
    </div>
  );
};

export default ModifyExistingBOM;

const styles = {
  page: { padding: 30, maxWidth: 1100, margin: "0 auto" },
  back: { color: "#2563eb", cursor: "pointer", marginBottom: 10, width: "fit-content" },
  h1: { fontSize: 30, fontWeight: 700, margin: "10px 0 6px" },
  sub: { color: "#666", marginBottom: 18 },

  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "white",
    padding: 16,
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#555" },
  input: { padding: 10, borderRadius: 6, border: "1px solid #d1d5db" },
  inputDisabled: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#f3f4f6",
    color: "#666",
  },

  bottom: { display: "flex", justifyContent: "flex-end", marginTop: 18 },
  primaryBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "10px 18px",
    cursor: "pointer",
  },
};