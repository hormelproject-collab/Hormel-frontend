import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function EngineeringChangeDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const engineeringChangeId = location.state?.engineeringChangeId;
  console.log(engineeringChangeId);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ FIXED FUNCTION
  const fetchEngineeringChangeDetail = async (engineeringChangeId) => {
    if (!engineeringChangeId) {
      throw new Error("EngineeringchangeID is required to fetch detail");
    }

    const url = `http://localhost:3000/api/engineering-changes/detail?EngineeringchangeID=${encodeURIComponent(
      engineeringChangeId
    )}`;

    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body?.message || "Failed to fetch engineering change detail");
    }

    return body?.data ?? body?.item;
  };

  useEffect(() => {
    console.log("ID:", engineeringChangeId); // ✅ debug

    if (!engineeringChangeId) {
      setErr("Engineering Change ID missing");
      return;
    }

    setLoading(true);

    fetchEngineeringChangeDetail(engineeringChangeId)
      .then((res) => {
        console.log("DATA:", res); // ✅ debug
        setData(res);
      })
      .catch((e) => {
        console.error(e);
        setErr("Failed to load detail");
      })
      .finally(() => setLoading(false));
  }, [engineeringChangeId]);

  return (
    <div style={{ padding: 24 }}>
      
      <div
        onClick={() => navigate(-1)}
        style={{ cursor: "pointer", color: "#2563eb", marginBottom: 10 }}
      >
        ← BACK TO ENGINEERING CHANGE SUMMARY
      </div>

      {loading && <p>Loading...</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}

      {data && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>
            Engineering Change Detail: {data.changeType} BOM Record
          </h1>

          <p style={{ color: "#6b7280" }}>
            Read-only view of change details
          </p>

          {/* INFO CARD */}
          <div style={{
            background: "#e0f2fe",
            padding: 16,
            borderRadius: 6,
            marginTop: 10
          }}>
            <b>Engineering Change #:</b> {data.engineeringChangeId}<br />
            <b>Change Date:</b> {data.changeDate}<br />
            <b>User:</b> {data.changedBy}<br />
            <b>Change Type:</b> {data.changeType}
          </div>

          {/* BOM TABLE */}
          <h3 style={{ marginTop: 24 }}>BOM Record Changes</h3>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th style={th}>Field</th>
                <th style={th}>Original Value</th>
                <th style={th}>Updated Value</th>
              </tr>
            </thead>

            <tbody>
              {data.bomRecordChanges?.map((row, i) => (
                <tr key={i} style={row.changed ? changedRow : normalRow}>
                  <td style={td}>{row.field}</td>
                  <td style={td}>{row.originalValue}</td>
                  <td style={{
                    ...td,
                    color: row.changed ? "#2563eb" : "#111"
                  }}>
                    {row.updatedValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: 12,
  fontSize: 13
};

const td = {
  padding: 12,
  borderTop: "1px solid #ddd"
};

const changedRow = {
  background: "#fef3c7"
};

const normalRow = {
  background: "white"
};