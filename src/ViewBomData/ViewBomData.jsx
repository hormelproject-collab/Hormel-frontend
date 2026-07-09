import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommonProgressIndicator from "../components/CommonProgressIndicator";

const CRITERIA_OPTIONS = [
  { value: "", label: "None" },
  { value: "location", label: "Location" },
  { value: "bomId", label: "BOM ID" },
  { value: "producedItem", label: "Produced Item" },
  { value: "resource", label: "Resource" },
  { value: "componentItem", label: "Component Item" },
  { value: "coProductItem", label: "Co-Product Item" },
];

const TABLE_META = [
  { key: "bomParameters", label: "BOM Parameters" },
  { key: "bomProduced", label: "BOM Produced" },
  { key: "bomConsumed", label: "BOM Consumed" },
  { key: "itemBomRouting", label: "Item BOM Routing" },
];

const EMPTY_DATA = {
  bomParameters: [],
  bomProduced: [],
  bomConsumed: [],
  itemBomRouting: [],
};

const PAGE_SIZE = 50;

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

const toTitle = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateOnly = (value) => {
  if (!value) return "-";

  if (typeof value === "string") {
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
  }

  return String(value);
};

const isDateColumn = (column) =>
  /date|created_at|created_on|load_datetime|start|end/i.test(String(column || ""));

const formatCellValue = (column, value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (isDateColumn(column)) return formatDateOnly(value);
  return String(value);
};

const getTableColumns = (rows) => {
  const seen = new Set();
  const columns = [];

  (rows || []).forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    });
  });

  return columns;
};

const getInitialPageMap = () => ({
  bomParameters: 1,
  bomProduced: 1,
  bomConsumed: 1,
  itemBomRouting: 1,
});

export default function ViewBomData() {
  const navigate = useNavigate();

  const [criterion1, setCriterion1] = useState("");
  const [criterionValue1, setCriterionValue1] = useState("");
  const [criterion2, setCriterion2] = useState("");
  const [criterionValue2, setCriterionValue2] = useState("");
  const [activeTab, setActiveTab] = useState("bomParameters");
  const [pageByTable, setPageByTable] = useState(getInitialPageMap);
  const [enabledTables, setEnabledTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchedData, setFetchedData] = useState(EMPTY_DATA);

  const selectedCriteria = useMemo(
    () => [criterion1, criterion2].filter(Boolean),
    [criterion1, criterion2]
  );

  const invalidCombo = useMemo(() => {
    const fields = selectedCriteria;

    if (fields.includes("resource") && fields.includes("componentItem")) {
      return "Users cannot select Resource and Component Item at the same time.";
    }

    if (fields.includes("componentItem") && fields.includes("coProductItem")) {
      return "Users cannot select Component Item and Co-Product Item at the same time.";
    }

    return "";
  }, [selectedCriteria]);

  useEffect(() => {
    const fetchData = async () => {
      if (!criterion1 && !criterion2) {
        setFetchedData(EMPTY_DATA);
        setEnabledTables([]);
        setError("");
        setPageByTable(getInitialPageMap());
        return;
      }

      if (invalidCombo) {
        setFetchedData(EMPTY_DATA);
        setEnabledTables([]);
        setError(invalidCombo);
        setPageByTable(getInitialPageMap());
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/tables/view-bom-data/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            criterion1: { field: criterion1, value: criterionValue1 },
            criterion2: { field: criterion2, value: criterionValue2 },
          }),
        });

        const json = await response.json();

        if (!response.ok || json?.success === false) {
          throw new Error(json?.details || json?.error || "Failed to fetch BOM data");
        }

        const nextData = json?.data || EMPTY_DATA;
        const nextEnabledTables = Array.isArray(json?.enabledTables)
          ? json.enabledTables
          : TABLE_META.filter((table) => (nextData?.[table.key] || []).length > 0).map(
              (table) => table.key
            );

        setFetchedData(nextData);
        setEnabledTables(nextEnabledTables);
        setPageByTable(getInitialPageMap());

        if (!nextEnabledTables.includes(activeTab)) {
          setActiveTab(nextEnabledTables[0] || "bomParameters");
        }
      } catch (err) {
        setError(err.message || "Failed to fetch BOM data");
        setFetchedData(EMPTY_DATA);
        setEnabledTables([]);
        setPageByTable(getInitialPageMap());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [criterion1, criterionValue1, criterion2, criterionValue2, invalidCombo]);

  const matchesCriterion = (row, field, value) => {
    if (!field || !value.trim()) return true;

    const search = value.trim().toLowerCase();

    switch (field) {
      case "location":
        return includesText(row.location, search);
      case "bomId":
        return includesText(row.bom_id, search);
      case "producedItem":
      case "componentItem":
      case "coProductItem":
        return includesText(row.item, search);
      case "resource":
        return includesText(row.resource, search);
      default:
        return true;
    }
  };

  const filteredData = useMemo(() => {
    const filterRows = (rows) =>
      (rows || []).filter(
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
  }, [fetchedData, criterion1, criterionValue1, criterion2, criterionValue2]);

  const activeRows = filteredData[activeTab] || [];
  const activeColumns = getTableColumns(activeRows);
  const activeMeta = TABLE_META.find((table) => table.key === activeTab);
  const currentPage = pageByTable[activeTab] || 1;
  const totalRecords = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = totalRecords === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, totalRecords);
  const paginatedRows = activeRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasAnyCriteria = Boolean(criterion1 || criterion2);

  useEffect(() => {
    const totalForActive = (filteredData[activeTab] || []).length;
    const computedTotalPages = Math.max(1, Math.ceil(totalForActive / PAGE_SIZE));
    const page = pageByTable[activeTab] || 1;

    if (page > computedTotalPages) {
      setPageByTable((prev) => ({
        ...prev,
        [activeTab]: computedTotalPages,
      }));
    }
  }, [activeTab, filteredData, pageByTable]);

  const changePage = (direction) => {
    setPageByTable((prev) => {
      const current = prev[activeTab] || 1;
      const nextPage = direction === "prev" ? current - 1 : current + 1;

      return {
        ...prev,
        [activeTab]: Math.min(Math.max(nextPage, 1), totalPages),
      };
    });
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f3f4f6",
      padding: "24px 36px 40px 36px",
      fontFamily: "Segoe UI, Arial, sans-serif",
      color: "#111827",
      position: "relative",
    },
    progressOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(255,255,255,0.55)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
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
    tabRow: {
      display: "flex",
      gap: "8px",
      marginBottom: "14px",
      flexWrap: "wrap",
    },
    tabButton: {
      border: "1px solid #2563eb",
      borderRadius: "4px",
      padding: "9px 14px",
      background: "#ffffff",
      color: "#2563eb",
      fontSize: "13px",
      fontWeight: 700,
      cursor: "pointer",
    },
    activeTabButton: {
      background: "#2563eb",
      color: "#ffffff",
    },
    disabledTabButton: {
      border: "1px solid #d1d5db",
      background: "#e5e7eb",
      color: "#9ca3af",
      cursor: "not-allowed",
    },
    tableTopBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      marginBottom: "10px",
      flexWrap: "wrap",
    },
    tableSectionTitle: {
      fontSize: "15px",
      fontWeight: 700,
      color: "#111827",
    },
    showingText: {
      fontSize: "13px",
      color: "#374151",
      fontWeight: 600,
    },
    tableWrap: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      overflow: "auto",
      marginBottom: "12px",
      maxWidth: "100%",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "980px",
    },
    th: {
      background: "#f3f4f6",
      color: "#111827",
      fontSize: "13px",
      fontWeight: 700,
      textAlign: "left",
      padding: "14px 12px",
      borderBottom: "1px solid #d1d5db",
      whiteSpace: "nowrap",
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
    paginationRow: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      margin: "8px 0 18px",
    },
    pageButton: {
      border: "1px solid #2563eb",
      borderRadius: "4px",
      background: "#ffffff",
      color: "#2563eb",
      padding: "8px 12px",
      fontSize: "13px",
      fontWeight: 700,
      cursor: "pointer",
      minWidth: "80px",
    },
    pageButtonDisabled: {
      border: "1px solid #d1d5db",
      background: "#f3f4f6",
      color: "#9ca3af",
      cursor: "not-allowed",
    },
    pageNumber: {
      fontSize: "13px",
      color: "#111827",
      fontWeight: 700,
      minWidth: "90px",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.page}>
      {loading ? (
        <div style={styles.progressOverlay}>
          <CommonProgressIndicator />
        </div>
      ) : null}

      <button type="button" style={styles.backButton} onClick={() => navigate("/")}>
        <span style={{ fontSize: "16px" }}>←</span>
        <span>BACK TO MAIN MENU</span>
      </button>

      <div style={styles.title}>View BOM Data</div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Step 1: Select Search Criteria</div>
        <div style={styles.subText}>
          Select one or two criteria. Tables populate as soon as the first criterion is selected.
          If two criteria are selected, AND logic is applied.
        </div>

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
            <label style={styles.label}>{criterion1 ? getPlaceholder(criterion1) : "Value"}</label>
            <input
              type="text"
              value={criterionValue1}
              onChange={(e) => setCriterionValue1(e.target.value)}
              placeholder={criterion1 ? getPlaceholder(criterion1) : "Select Criteria 1 first"}
              disabled={!criterion1}
              style={styles.input}
            />
          </div>
        </div>

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
            <label style={styles.label}>{criterion2 ? getPlaceholder(criterion2) : "Value"}</label>
            <input
              type="text"
              value={criterionValue2}
              onChange={(e) => setCriterionValue2(e.target.value)}
              placeholder={criterion2 ? getPlaceholder(criterion2) : "Select Criteria 2 first"}
              disabled={!criterion2}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.tabRow}>
        {TABLE_META.map((table) => {
          const enabled = enabledTables.includes(table.key);
          const active = activeTab === table.key;

          return (
            <button
              key={table.key}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && setActiveTab(table.key)}
              style={{
                ...styles.tabButton,
                ...(active && enabled ? styles.activeTabButton : {}),
                ...(!enabled ? styles.disabledTabButton : {}),
              }}
            >
              {table.label}
            </button>
          );
        })}
      </div>

      {!hasAnyCriteria ? (
        <div style={styles.tableWrap}>
          <div style={styles.emptyRow}>Select at least one search criterion to view BOM data.</div>
        </div>
      ) : activeRows.length === 0 ? (
        <div style={styles.tableWrap}>
          <div style={styles.emptyRow}>
            {enabledTables.includes(activeTab)
              ? `No ${activeMeta?.label || "BOM"} data found for the selected criteria.`
              : "This table is not applicable for the selected criteria."}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.tableTopBar}>
            <div style={styles.tableSectionTitle}>{activeMeta?.label || "BOM Data"}</div>
            <div style={styles.showingText}>
              Showing {startIndex}-{endIndex} of {totalRecords} record(s)
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {activeColumns.map((column) => (
                    <th key={column} style={styles.th}>
                      {toTitle(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rowIndex) => (
                  <tr key={`${activeTab}-${safePage}-${rowIndex}`}>
                    {activeColumns.map((column) => (
                      <td key={`${activeTab}-${safePage}-${rowIndex}-${column}`} style={styles.td}>
                        {formatCellValue(column, row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.paginationRow}>
            <button
              type="button"
              onClick={() => changePage("prev")}
              disabled={safePage <= 1}
              style={{
                ...styles.pageButton,
                ...(safePage <= 1 ? styles.pageButtonDisabled : {}),
              }}
            >
              ← Prev
            </button>

            <div style={styles.pageNumber}>
              Page {safePage} of {totalPages}
            </div>

            <button
              type="button"
              onClick={() => changePage("next")}
              disabled={safePage >= totalPages}
              style={{
                ...styles.pageButton,
                ...(safePage >= totalPages ? styles.pageButtonDisabled : {}),
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
