import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const CRITERIA_OPTIONS = [
  { value: "", label: "None" },
  { value: "location", label: "Location" },
  { value: "bomId", label: "BOM ID" },
  { value: "producedItem", label: "Produced Item" },
  { value: "resource", label: "Resource" },
  { value: "componentItem", label: "Component Item" },
  { value: "coProductItem", label: "Co-Product Item" },
];

const getPlaceholder = (field) => {
  switch (field) {
    case "location":
      return "Search Location";
    case "bomId":
      return "Search BOM ID";
    case "producedItem":
      return "Search Produced Item";
    case "resource":
      return "Search Resource";
    case "componentItem":
      return "Search Component Item";
    case "coProductItem":
      return "Search Co-Product Item";
    default:
      return "Enter value";
  }
};

const includesText = (value, search) =>
  String(value || "").toLowerCase().includes(String(search || "").toLowerCase());

export default function ViewBomData() {
  const navigate = useNavigate();

  const [criterion1, setCriterion1] = useState("");
  const [criterionValue1, setCriterionValue1] = useState("");
  const [criterion2, setCriterion2] = useState("");
  const [criterionValue2, setCriterionValue2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchedData, setFetchedData] = useState({
    bomParameters: [],
    bomProduced: [],
    bomConsumed: [],
    itemBomRouting: [],
  });

  const invalidCombo = useMemo(() => {
    const fields = [criterion1, criterion2].filter(Boolean);

    if (fields.includes("resource") && fields.includes("componentItem")) {
      return "Users cannot select Resource and Component Item at the same time.";
    }

    if (fields.includes("componentItem") && fields.includes("coProductItem")) {
      return "Users cannot select Component Item and Co-Product Item at the same time.";
    }

    return "";
  }, [criterion1, criterion2]);

  useEffect(() => {
    const fetchData = async () => {
      // clear until both dropdowns are selected
      if (!criterion1 || !criterion2) {
        setFetchedData({
          bomParameters: [],
          bomProduced: [],
          bomConsumed: [],
          itemBomRouting: [],
        });
        setError("");
        return;
      }

      if (invalidCombo) {
        setFetchedData({
          bomParameters: [],
          bomProduced: [],
          bomConsumed: [],
          itemBomRouting: [],
        });
        setError(invalidCombo);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/tables/view-bom-data/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            criterion1: { field: criterion1 },
            criterion2: { field: criterion2 },
          }),
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.details || json?.error || "Failed to fetch BOM data");
        }

        setFetchedData(
          json?.data || {
            bomParameters: [],
            bomProduced: [],
            bomConsumed: [],
            itemBomRouting: [],
          }
        );
      } catch (err) {
        setError(err.message || "Failed to fetch BOM data");
        setFetchedData({
          bomParameters: [],
          bomProduced: [],
          bomConsumed: [],
          itemBomRouting: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [criterion1, criterion2, invalidCombo]);

  const matchesCriterion = (row, field, value) => {
    if (!field || !value.trim()) return true;

    const search = value.trim().toLowerCase();

    switch (field) {
      case "location":
        return includesText(row.location, search);

      case "bomId":
        return includesText(row.bom_id, search);

      case "producedItem":
        return includesText(row.item, search);

      case "resource":
        return includesText(row.resource, search);

      case "componentItem":
        return includesText(row.item, search);

      case "coProductItem":
        return includesText(row.item, search);

      default:
        return true;
    }
  };

  const filteredData = useMemo(() => {
    const filterRows = (rows) =>
      rows.filter(
        (row) =>
          matchesCriterion(row, criterion1, criterionValue1) &&
          matchesCriterion(row, criterion2, criterionValue2)
      );

    return {
      bomParameters: filterRows(fetchedData.bomParameters),
      bomProduced: filterRows(fetchedData.bomProduced),
      bomConsumed: filterRows(fetchedData.bomConsumed),
      itemBomRouting: filterRows(fetchedData.itemBomRouting),
    };
  }, [
    fetchedData,
    criterion1,
    criterionValue1,
    criterion2,
    criterionValue2,
  ]);

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f3f4f6",
      padding: "24px 36px 40px 36px",
      fontFamily: "Segoe UI, Arial, sans-serif",
      color: "#111827",
    },
    backButton: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "transparent",
      border: "none",
      color: "#2563eb",
      fontSize: "14px",
      cursor: "pointer",
      padding: 0,
      marginBottom: "8px",
    },
    title: {
      fontSize: "22px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "18px",
    },
    card: {
      background: "#f7f7f8",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      padding: "18px",
      marginBottom: "18px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 700,
      marginBottom: "8px",
      color: "#111827",
    },
    subText: {
      fontSize: "13px",
      color: "#4b5563",
      marginBottom: "14px",
    },
    criteriaGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "12px",
    },
    fieldWrap: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "12px",
      color: "#4b5563",
      fontWeight: 500,
    },
    select: {
      border: "1px solid #cfd4dc",
      borderRadius: "3px",
      background: "#fff",
      height: "42px",
      padding: "0 12px",
      fontSize: "14px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    input: {
      border: "1px solid #cfd4dc",
      borderRadius: "3px",
      background: "#fff",
      height: "42px",
      padding: "0 12px",
      fontSize: "14px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    errorBox: {
      marginBottom: "14px",
      padding: "12px 14px",
      borderRadius: "6px",
      backgroundColor: "#fee2e2",
      border: "1px solid #fecaca",
      color: "#b91c1c",
      fontSize: "14px",
    },
    loadingText: {
      fontSize: "14px",
      color: "#374151",
      marginBottom: "14px",
    },
    tableSectionTitle: {
      fontSize: "15px",
      fontWeight: 700,
      margin: "18px 0 10px",
      color: "#111827",
    },
    tableWrap: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      overflow: "hidden",
      marginBottom: "18px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    th: {
      background: "#f3f4f6",
      color: "#111827",
      fontSize: "13px",
      fontWeight: 700,
      textAlign: "left",
      padding: "14px 12px",
      borderBottom: "1px solid #d1d5db",
    },
    td: {
      fontSize: "13px",
      color: "#111827",
      padding: "12px",
      borderBottom: "1px solid #e5e7eb",
      verticalAlign: "top",
      wordBreak: "break-word",
    },
    emptyRow: {
      textAlign: "center",
      color: "#6b7280",
      padding: "18px 12px",
      fontSize: "13px",
    },
  };

  return (
    <div style={styles.page}>
      <button
        type="button"
        style={styles.backButton}
        onClick={() => navigate("/")}
      >
        <span style={{ fontSize: "16px" }}>←</span>
        <span>BACK TO MAIN MENU</span>
      </button>

      <div style={styles.title}>View BOM Data</div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}
      {loading ? <div style={styles.loadingText}>Loading BOM data...</div> : null}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Step 1: Select Search Criteria</div>
        <div style={styles.subText}>
          Select up to two search criteria to filter BOM data
        </div>

        {/* Criteria 1 */}
        <div style={styles.criteriaGrid}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Search Criteria 1</label>
            <select
              value={criterion1}
              onChange={(e) => {
                setCriterion1(e.target.value);
                setCriterionValue1("");
              }}
              style={styles.select}
            >
              {CRITERIA_OPTIONS.map((option) => (
                <option key={`c1-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>
              {criterion1 ? getPlaceholder(criterion1) : "Value"}
            </label>
            <input
              type="text"
              value={criterionValue1}
              onChange={(e) => setCriterionValue1(e.target.value)}
              placeholder={
                criterion1 ? getPlaceholder(criterion1) : "Select Criteria 1 first"
              }
              disabled={!criterion1}
              style={styles.input}
            />
          </div>
        </div>

        {/* Criteria 2 */}
        <div style={styles.criteriaGrid}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Search Criteria 2</label>
            <select
              value={criterion2}
              onChange={(e) => {
                setCriterion2(e.target.value);
                setCriterionValue2("");
              }}
              style={styles.select}
            >
              {CRITERIA_OPTIONS.map((option) => (
                <option key={`c2-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>
              {criterion2 ? getPlaceholder(criterion2) : "Value"}
            </label>
            <input
              type="text"
              value={criterionValue2}
              onChange={(e) => setCriterionValue2(e.target.value)}
              placeholder={
                criterion2 ? getPlaceholder(criterion2) : "Select Criteria 2 first"
              }
              disabled={!criterion2}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      {/* BOM Parameters */}
      {filteredData.bomParameters.length > 0 && (
        <>
          <div style={styles.tableSectionTitle}>BOM Parameters</div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>BOM ID</th>
                  <th style={styles.th}>ERP BOM Start Date</th>
                  <th style={styles.th}>ERP BOM End Date</th>
                  <th style={styles.th}>Snapshot Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.bomParameters.map((row, index) => (
                  <tr key={`bp-${row.bom_id || index}`}>

                    <td style={styles.td}>{row.bom_id || "-"}</td>
                    <td style={styles.td}>{row.erp_bom_start_date || "-"}</td>
                    <td style={styles.td}>{row.erp_bom_end_date || "-"}</td>
                    <td style={styles.td}>{row.load_datetime || "-"}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* BOM Produced */}
      {filteredData.bomProduced.length > 0 && (
        <>
          <div style={styles.tableSectionTitle}>BOM Produced</div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>BOM ID</th>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>BOM Status</th>
                  <th style={styles.th}>BOM Version</th>
                  <th style={styles.th}>Prefix</th>
                  <th style={styles.th}>BOM Plan Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.bomProduced.map((row, index) => (
                  <tr key={`bprod-${row.bom_id}-${row.item}-${row.location}-${index}`}>

                    <td style={styles.td}>{row.bom_id || "-"}</td>
                    <td style={styles.td}>{row.item || "-"}</td>
                    <td style={styles.td}>{row.location || "-"}</td>
                    <td style={styles.td}>{row.bom_status || "-"}</td>
                    <td style={styles.td}>{row.bom_version || "-"}</td>
                    <td style={styles.td}>{row.prefix || "-"}</td>
                    <td style={styles.td}>{row.bom_plan_type || "-"}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* BOM Consumed */}
      {filteredData.bomConsumed.length > 0 && (
        <>
          <div style={styles.tableSectionTitle}>BOM Consumed</div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>BOM ID</th>
                  <th style={styles.th}>Quantity Consumed Per</th>
                  <th style={styles.th}>Component Start Date</th>
                  <th style={styles.th}>Component End Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.bomConsumed.map((row, index) => (
                  <tr key={`bcons-${row.bom_id}-${row.item}-${row.location}-${index}`}>

                    <td style={styles.td}>{row.item || "-"}</td>
                    <td style={styles.td}>{row.location || "-"}</td>
                    <td style={styles.td}>{row.bom_id || "-"}</td>
                    <td style={styles.td}>{row.erp_bom_quantity_consumed_per || "-"}</td>
                    <td style={styles.td}>{row.erp_bom_component_start_date || "-"}</td>
                    <td style={styles.td}>{row.erp_bom_component_end_date || "-"}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Item BOM Routing */}
      {filteredData.itemBomRouting.length > 0 && (
        <>
          <div style={styles.tableSectionTitle}>Item BOM Routing</div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Routing ID</th>
                  <th style={styles.th}>BOM ID</th>
                  <th style={styles.th}>Resource</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Min Lot Size</th>
                  <th style={styles.th}>Lot Size Increment</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.itemBomRouting.map((row, index) => (
                  <tr key={`ibr-${row.bom_id}-${row.routing_id}-${index}`}>

                    <td style={styles.td}>{row.item || "-"}</td>
                    <td style={styles.td}>{row.routing_id || "-"}</td>
                    <td style={styles.td}>{row.bom_id || "-"}</td>
                    <td style={styles.td}>{row.resource || "-"}</td>
                    <td style={styles.td}>{row.erp_item_bom_routing_priority || "-"}</td>
                    <td style={styles.td}>{row.erp_item_bom_routing_min_lot_size || "-"}</td>
                    <td style={styles.td}>{row.erp_item_bom_routing_lot_size_increment || "-"}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading &&
        !error &&
        criterion1 &&
        criterion2 &&
        filteredData.bomParameters.length === 0 &&
        filteredData.bomProduced.length === 0 &&
        filteredData.bomConsumed.length === 0 &&
        filteredData.itemBomRouting.length === 0 && (
          <div style={styles.tableWrap}>
            <div style={styles.emptyRow}>
              No BOM data found for the selected criteria.
            </div>
          </div>
        )}
    </div>
  );
}