import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DATE_RANGES = { 1: 1, 7: 7, 30: 30 };

function daysAgo(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
}

function changeTypePill(type) {
  const base = {
    padding: "6px 14px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
    display: "inline-block"
  };

  if (type === "Added") return { ...base, background: "#DCFCE7", color: "#166534" };
  if (type === "Modified") return { ...base, background: "#FEF3C7", color: "#92400E" };
  if (type === "Deleted") return { ...base, background: "#FEE2E2", color: "#991B1B" };

  return base;
}

export default function EngineeringChangeLog() {
  const navigate = useNavigate();

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // NEW: show small loader for the clicked row
  const [rowLoadingId, setRowLoadingId] = useState("");

  const [timeRange, setTimeRange] = useState(30);
  const [userFilter, setUserFilter] = useState("ALL");
  const [showMineOnly, setShowMineOnly] = useState(false);

  const [searchBomId, setSearchBomId] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchProducedItem, setSearchProducedItem] = useState("");

  const currentUser = localStorage.getItem("userName") || "John Smith";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        // keep your existing call
        const res = await fetch("http://localhost:8080/api/engineering-changes");
        const data = await res.json();
        setRawData(data.items || []);
      } catch (e) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const users = useMemo(
    () => ["ALL", ...new Set(rawData.map(r => r.changedBy))],
    [rawData]
  );

  const filteredData = useMemo(() => {
    return rawData.filter(r => {
      if (daysAgo(r.changeDate) > DATE_RANGES[timeRange]) return false;
      if (userFilter !== "ALL" && r.changedBy !== userFilter) return false;
      if (showMineOnly && r.changedBy !== currentUser) return false;
      if (searchBomId && !r.bomId.toLowerCase().includes(searchBomId.toLowerCase())) return false;
      if (searchLocation && !String(r.locationId).includes(searchLocation)) return false;
      if (searchProducedItem && !r.producedItem.toLowerCase().includes(searchProducedItem.toLowerCase())) return false;
      return true;
    });
  }, [
    rawData,
    timeRange,
    userFilter,
    showMineOnly,
    searchBomId,
    searchLocation,
    searchProducedItem,
    currentUser
  ]);

  // ✅ NEW: click handler -> call detail API -> navigate to details screen
  async function onRowClick(engineeringChangeId) {
    navigate("/engineering-changes-Detail", { state: { engineeringChangeId: engineeringChangeId } });
  }

  return (
    <div style={{ padding: 32, background: "#fff" }}>
      <h1 style={{ fontSize: 40, marginBottom: 4 }}>Engineering Change Log</h1>
      <p style={{ color: "#6B7280", fontSize: 18 }}>
        View and track all BOM changes made by users
      </p>
      <hr style={{ margin: "24px 0", borderColor: "#E5E7EB" }} />

      {/* Filters Card */}
      <div style={{
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
      }}>
        {/* Row 1 */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
          <div>
            <label>Time Range</label>
            <select
              value={timeRange}
              onChange={e => setTimeRange(+e.target.value)}
              style={{ display: "block", width: 240 }}
            >
              <option value={30}>Last 30 Days</option>
              <option value={7}>Last 7 Days</option>
              <option value={1}>Last 1 Day</option>
            </select>
          </div>

          <div>
            <label>User</label>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              style={{ display: "block", width: 240 }}
            >
              {users.map(u => (
                <option key={u}>{u === "ALL" ? "All Users" : u}</option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={showMineOnly}
              onChange={e => setShowMineOnly(e.target.checked)}
            />
            Show My Changes Only
          </label>

          <button
            style={{
              marginLeft: "auto",
              padding: "12px 20px",
              borderRadius: 12,
              background: "#F3F4F6",
              border: "none",
              fontWeight: 600
            }}
          >
            ⬇ Export Changes
          </button>
        </div>

        {/* Row 2 */}
        <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
          <input
            placeholder="Search BOM ID"
            value={searchBomId}
            onChange={e => setSearchBomId(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            placeholder="Search Location"
            value={searchLocation}
            onChange={e => setSearchLocation(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            placeholder="Search Produced Item"
            value={searchProducedItem}
            onChange={e => setSearchProducedItem(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Table */}
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <table width="100%" style={{ marginTop: 24, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            {[
              "ENGINEERING CHANGE #",
              "CHANGE DATE",
              "CHANGE TYPE",
              "LOCATION",
              "BOM ID",
              "USER",
              "CHANGE SUMMARY"
            ].map(h => (
              <th
                key={h}
                style={{ textAlign: "left", padding: 16, fontSize: 13, letterSpacing: 1 }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredData.map(r => {
            const isRowLoading = rowLoadingId === r.engineeringChangeId;

            return (
              <tr
                key={r.engineeringChangeId}
                onClick={() => onRowClick(r.engineeringChangeId)}
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  cursor: "pointer",
                  background: isRowLoading ? "#F9FAFB" : "transparent"
                }}
                onMouseEnter={e => { if (!isRowLoading) e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={e => { if (!isRowLoading) e.currentTarget.style.background = "transparent"; }}
                title="Click to view details"
              >
                <td style={{ padding: 16, fontWeight: 600, color: "#111" }}>
                  {r.engineeringChangeId}
                  {isRowLoading && <span style={{ marginLeft: 10, color: "#6B7280" }}>Loading…</span>}
                </td>
                <td>{r.changeDate}</td>
                <td><span style={changeTypePill(r.changeType)}>{r.changeType}</span></td>
                <td>{r.locationId}</td>
                <td>{r.bomId}</td>
                <td>{r.changedBy}</td>
                <td>{r.changeSummary}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}