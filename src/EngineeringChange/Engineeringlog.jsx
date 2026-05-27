import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EngineeringChangeLog() {
  const navigate = useNavigate();

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [userFilter, setUserFilter] = useState("ALL");
  const [showMineOnly, setShowMineOnly] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [criteria1, setCriteria1] = useState("None");
  const [criteria2, setCriteria2] = useState("None");

  const [searchValues, setSearchValues] = useState({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const payload = {
          fromDate,
          toDate,
          userFilter,
          showMineOnly,
          criteria1,
          criteria2,
          search: {
            criteria1Value: searchValues[criteria1] || "",
            criteria2Value: searchValues[criteria2] || ""
          }
        };

        const res = await fetch("http://localhost:3000/api/engineering-change-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error("Failed to fetch engineering change log");
        }

        const data = await res.json();
        setRawData(data.items || []);
      } catch (e) {
        console.error("Engineering change log load error:", e);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [fromDate, toDate, userFilter, showMineOnly, criteria1, criteria2, searchValues]);

  const users = useMemo(() => {
    return ["ALL", ...new Set(rawData.map((r) => r.changedBy).filter(Boolean))];
  }, [rawData]);

  const criteriaOptions = [
    "None",
    "Location",
    "BOM ID",
    "Resource",
    "Produced Item",
    "Component Item",
    "Co-Product Item"
  ];

  const getPlaceholder = (criteria) => {
    if (criteria === "None") return "";
    return `Search ${criteria}`;
  };

  const handleRowClick = (engineeringChangeId) => {
    navigate("/change-log-details", {
      state: { engineeringChangeId }
    });
  };

  const changeTypePill = (type) => {
    const base = {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: "#fff",
      lineHeight: 1.2
    };

    if (type === "Added") return { ...base, background: "#2e7d32" };
    if (type === "Modified") return { ...base, background: "#f97316" };
    if (type === "Deleted") return { ...base, background: "#dc2626" };

    return { ...base, background: "#6b7280" };
  };

  const renderMultiLineValue = (value) => {
    if (!value) return "-";

    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => (
        <div key={index} style={{ lineHeight: 1.35 }}>
          {item}
        </div>
      ));
  };

  const renderDate = (dateValue) => {
    if (!dateValue) return "-";

    const parts = String(dateValue).split("-");
    if (parts.length !== 3) return dateValue;

    return (
      <>
        {parts[0]}-{parts[1]}-
        <br />
        {parts[2]}
      </>
    );
  };

  return (
    <div style={page}>
      {/* BACK */}
      <div onClick={() => navigate(-1)} style={backLink}>
        ← BACK TO MAIN MENU
      </div>

      {/* TITLE */}
      <h1 style={title}>Engineering Change Summary</h1>

      {/* FILTER CARD */}
      <div style={filterCard}>
        <div style={filterHeading}>Filters & Search</div>

        {/* TOP FILTER ROW */}
        <div style={topGrid}>
          {/* FROM DATE */}
          <div>
            <div style={label}>From Date</div>
            <input
              type="date"
              style={input}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* TO DATE */}
          <div>
            <div style={label}>To Date</div>
            <input
              type="date"
              style={input}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* USER FILTER */}
          <div>
            <div style={label}>User Filter</div>
            <select
              style={input}
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="ALL">User Filter</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* CHECKBOX */}
          <div style={checkboxWrap}>
            <input
              type="checkbox"
              checked={showMineOnly}
              onChange={(e) => setShowMineOnly(e.target.checked)}
            />
            <span style={checkboxText}>Show My Changes Only</span>
          </div>
        </div>

        {/* CRITERIA 1 */}
        <div style={criteriaGrid}>
          <div>
            <div style={label}>Search By (Criteria 1)</div>
            <select
              style={input}
              value={criteria1}
              onChange={(e) => setCriteria1(e.target.value)}
            >
              {criteriaOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>&nbsp;</div>
            {criteria1 !== "None" ? (
              <input
                style={input}
                placeholder={getPlaceholder(criteria1)}
                value={searchValues[criteria1] || ""}
                onChange={(e) =>
                  setSearchValues((prev) => ({
                    ...prev,
                    [criteria1]: e.target.value
                  }))
                }
              />
            ) : (
              <div style={emptyCriteriaSpace} />
            )}
          </div>
        </div>

        {/* CRITERIA 2 */}
        <div style={criteriaGridSecond}>
          <div>
            <div style={label}>Search By (Criteria 2)</div>
            <select
              style={input}
              value={criteria2}
              onChange={(e) => setCriteria2(e.target.value)}
            >
              {criteriaOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>&nbsp;</div>
            {criteria2 !== "None" ? (
              <input
                style={input}
                placeholder={getPlaceholder(criteria2)}
                value={searchValues[criteria2] || ""}
                onChange={(e) =>
                  setSearchValues((prev) => ({
                    ...prev,
                    [criteria2]: e.target.value
                  }))
                }
              />
            ) : (
              <div style={emptyCriteriaSpace} />
            )}
          </div>
        </div>
      </div>

      {/* EXPORT ROW */}
      <div style={exportRow}>
        <div style={exportText}>
          Export generates a detailed Excel file with 5 tabs: High-Level Summary,
          Main BOM Details, Component Details, Co-Product Details, and Modified Field Comparison
        </div>

        <button style={exportButton}>
          ⬇ EXPORT FILTERED CHANGE LOG
        </button>
      </div>

      {/* TABLE */}
      {loading && <p style={{ marginTop: 16 }}>Loading...</p>}
      {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}

      <div style={tableWrapper}>
        <table style={table}>
          <thead style={thead}>
            <tr>
              <th style={th}>Engineering Change #</th>
              <th style={th}>Change Date</th>
              <th style={th}>Change Type</th>
              <th style={th}>Location(s)</th>
              <th style={th}>BOM ID(s)</th>
              <th style={th}>Resource(s)</th>
              <th style={th}>User</th>
              <th style={th}>Change Summary</th>
            </tr>
          </thead>

          <tbody>
            {rawData.map((r) => (
              <tr
                key={r.engineeringChangeId}
                onClick={() => handleRowClick(r.engineeringChangeId)}
                style={row}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <td style={td}>{r.engineeringChangeId}</td>
                <td style={td}>{renderDate(r.changeDate)}</td>
                <td style={td}>
                  <span style={changeTypePill(r.changeType)}>
                    {r.changeType}
                  </span>
                </td>
                <td style={td}>{renderMultiLineValue(r.locationId)}</td>
                <td style={td}>{renderMultiLineValue(r.bomId)}</td>
                <td style={td}>{renderMultiLineValue(r.resource)}</td>
                <td style={td}>{r.changedBy || "-"}</td>
                <td style={td}>{r.changeSummary || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* STYLES */
const page = {
  padding: 24,
  background: "#ffffff",
  minHeight: "100vh"
};

const backLink = {
  color: "#2563eb",
  cursor: "pointer",
  marginBottom: 12,
  fontWeight: 500,
  fontSize: 14
};

const title = {
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 18,
  color: "#111827"
};

const filterCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 20,
  marginBottom: 18,
  background: "#fff"
};

const filterHeading = {
  fontWeight: 700,
  fontSize: 16,
  marginBottom: 14
};

const topGrid = {
  display: "grid",
  gridTemplateColumns: "220px 220px 260px auto",
  gap: 20,
  alignItems: "end",
  marginBottom: 18
};

const criteriaGrid = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 16,
  alignItems: "end",
  marginBottom: 14
};

const criteriaGridSecond = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 16,
  alignItems: "end"
};

const input = {
  width: "100%",
  height: 42,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box"
};

const label = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
  fontWeight: 500
};

const checkboxWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 42,
  paddingBottom: 2
};

const checkboxText = {
  fontSize: 14,
  color: "#111827",
  whiteSpace: "nowrap"
};

const emptyCriteriaSpace = {
  height: 42
};

const exportRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
  gap: 16
};

const exportText = {
  fontSize: 12,
  color: "#6b7280",
  lineHeight: 1.4
};

const exportButton = {
  background: "#2563eb",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const tableWrapper = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  overflow: "hidden"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const thead = {
  background: "#f3f4f6"
};

const th = {
  textAlign: "left",
  padding: "14px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top"
};

const td = {
  padding: "12px",
  fontSize: 13,
  color: "#111827",
  verticalAlign: "top"
};

const row = {
  borderTop: "1px solid #e5e7eb",
  cursor: "pointer",
  background: "#ffffff"
};