import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const CRITERIA_OPTIONS = [
  "None",
  "Location",
  "BOM ID",
  "Resource",
  "Produced Item",
  "Component Item",
  "Co-Product Item"
];

export default function ViewBOMData() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [allData, setAllData] = useState({
    bomParameters: [],
    bomProduced: [],
    bomConsumed: [],
    itemBomRouting: []
  });

  const [criteria1, setCriteria1] = useState("");
  const [criteria2, setCriteria2] = useState("");

  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");

  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:3000/api/view-bom-data");
        const body = await res.json();

        if (!res.ok) {
          throw new Error(body?.message || "Failed to fetch BOM data");
        }

        setAllData({
          bomParameters: body?.data?.bomParameters || [],
          bomProduced: body?.data?.bomProduced || [],
          bomConsumed: body?.data?.bomConsumed || [],
          itemBomRouting: body?.data?.itemBomRouting || []
        });
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to fetch BOM data");
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  const getResourceValue = (row) => {
    if (row?.resource) return row.resource;
    if (row?.routing_id) {
      const parts = String(row.routing_id).split("_");
      return parts[parts.length - 1] || "";
    }
    return "";
  };

  const getCoProductValue = (row) => {
    return (
      row?.co_product_item ||
      row?.coproduct_item ||
      row?.co_product ||
      row?.co_product_name ||
      ""
    );
  };

  const getBomIdsForSelection = (criterion, value) => {
    if (!criterion || criterion === "None" || !value) return [];

    switch (criterion) {
      case "BOM ID":
        return [value];

      case "Location": {
        const produced = allData.bomProduced
          .filter((r) => r.location === value)
          .map((r) => r.bom_id);

        const consumed = allData.bomConsumed
          .filter((r) => r.location === value)
          .map((r) => r.bom_id);

        return [...new Set([...produced, ...consumed])];
      }

      case "Produced Item":
        return [
          ...new Set(
            allData.bomProduced
              .filter((r) => r.item === value)
              .map((r) => r.bom_id)
          )
        ];

      case "Component Item":
        return [
          ...new Set(
            allData.bomConsumed
              .filter((r) => r.item === value)
              .map((r) => r.bom_id)
          )
        ];

      case "Resource":
        return [
          ...new Set(
            allData.itemBomRouting
              .filter((r) => getResourceValue(r) === value)
              .map((r) => r.bom_id)
          )
        ];

      case "Co-Product Item":
        return [
          ...new Set(
            allData.bomProduced
              .filter((r) => getCoProductValue(r) === value)
              .map((r) => r.bom_id)
          )
        ];

      default:
        return [];
    }
  };

  const getFilteredDataByBomIds = (bomIds) => {
    if (!bomIds?.length) {
      return {
        bomParameters: [],
        bomProduced: [],
        bomConsumed: [],
        itemBomRouting: []
      };
    }

    return {
      bomParameters: allData.bomParameters.filter((r) => bomIds.includes(r.bom_id)),
      bomProduced: allData.bomProduced.filter((r) => bomIds.includes(r.bom_id)),
      bomConsumed: allData.bomConsumed.filter((r) => bomIds.includes(r.bom_id)),
      itemBomRouting: allData.itemBomRouting.filter((r) => bomIds.includes(r.bom_id))
    };
  };

  const getAvailableOptions = (criterion, sourceData) => {
    if (!criterion || criterion === "None") return [];

    let values = [];

    switch (criterion) {
      case "BOM ID":
        values = sourceData.bomParameters.map((r) => r.bom_id);
        break;

      case "Location":
        values = [
          ...sourceData.bomProduced.map((r) => r.location),
          ...sourceData.bomConsumed.map((r) => r.location)
        ];
        break;

      case "Produced Item":
        values = sourceData.bomProduced.map((r) => r.item);
        break;

      case "Component Item":
        values = sourceData.bomConsumed.map((r) => r.item);
        break;

      case "Resource":
        values = sourceData.itemBomRouting.map((r) => getResourceValue(r));
        break;

      case "Co-Product Item":
        values = sourceData.bomProduced.map((r) => getCoProductValue(r));
        break;

      default:
        values = [];
    }

    return [...new Set(values.filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  };

  const filteredByCriteria2ForOptions1 = useMemo(() => {
    if (!criteria2 || criteria2 === "None" || !value2) return allData;
    const bomIds = getBomIdsForSelection(criteria2, value2);
    return getFilteredDataByBomIds(bomIds);
  }, [allData, criteria2, value2]);

  const filteredByCriteria1ForOptions2 = useMemo(() => {
    if (!criteria1 || criteria1 === "None" || !value1) return allData;
    const bomIds = getBomIdsForSelection(criteria1, value1);
    return getFilteredDataByBomIds(bomIds);
  }, [allData, criteria1, value1]);

  const options1 = useMemo(() => {
    return getAvailableOptions(criteria1, filteredByCriteria2ForOptions1);
  }, [criteria1, filteredByCriteria2ForOptions1]);

  const options2 = useMemo(() => {
    return getAvailableOptions(criteria2, filteredByCriteria1ForOptions2);
  }, [criteria2, filteredByCriteria1ForOptions2]);

  const filteredData = useMemo(() => {
    const ids1 =
      criteria1 && criteria1 !== "None" && value1
        ? getBomIdsForSelection(criteria1, value1)
        : [];

    const ids2 =
      criteria2 && criteria2 !== "None" && value2
        ? getBomIdsForSelection(criteria2, value2)
        : [];

    let finalBomIds = [];

    if (ids1.length && ids2.length) {
      finalBomIds = ids1.filter((id) => ids2.includes(id));
    } else if (ids1.length) {
      finalBomIds = ids1;
    } else if (ids2.length) {
      finalBomIds = ids2;
    } else {
      return {
        bomParameters: [],
        bomProduced: [],
        bomConsumed: [],
        itemBomRouting: []
      };
    }

    return getFilteredDataByBomIds(finalBomIds);
  }, [allData, criteria1, criteria2, value1, value2]);

  const hasSelection = Boolean(
    (criteria1 && criteria1 !== "None" && value1) ||
      (criteria2 && criteria2 !== "None" && value2)
  );

  return (
    <div style={page}>
      <div onClick={() => navigate(-1)} style={backLink}>
        ← BACK TO MAIN MENU
      </div>

      <h1 style={title}>View BOM Data</h1>

      <div style={card}>
        <div style={stepTitle}>Step 1: Select Search Criteria</div>
        <div style={stepSubtitle}>
          Select up to two search criteria to filter BOM data
        </div>

        {/* Criteria 1 */}
        <div style={topRow}>
          <div style={topLeft}>
            <div style={miniLabel}>Search Criteria 1</div>
            <select
              style={select}
              value={criteria1}
              onChange={(e) => {
                setCriteria1(e.target.value);
                setValue1("");
              }}
            >
              <option value="">Select Criteria 1</option>
              {CRITERIA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {criteria1 && criteria1 !== "None" && (
            <div style={topRight}>
              <div style={miniLabel}>&nbsp;</div>
              <select
                style={select}
                value={value1}
                onChange={(e) => setValue1(e.target.value)}
              >
                <option value="">Select {criteria1}</option>
                {options1.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Criteria 2 */}
        <div style={bottomRow}>
          <div style={secondCriteriaWrap}>
            <select
              style={select}
              value={criteria2}
              onChange={(e) => {
                setCriteria2(e.target.value);
                setValue2("");
              }}
            >
              <option value="">Search Criteria 2</option>
              {CRITERIA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {criteria2 && criteria2 !== "None" && (
            <div style={secondValueWrap}>
              <select
                style={select}
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
              >
                <option value="">Select {criteria2}</option>
                {options2.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading && <div style={loadingText}>Loading BOM data...</div>}
      {error && <div style={errorText}>{error}</div>}

      {!loading && !error && !hasSelection && (
        <div style={emptyState}>
          Select search criteria above to view BOM data
        </div>
      )}

      {!loading && !error && hasSelection && (
        <>
          <DataSection
            title="BOM Parameters"
            rows={filteredData.bomParameters}
            columns={[
              { key: "bom_id", label: "BOM ID" },
              { key: "erp_bom_start_date", label: "ERP BOM Start Date" },
              { key: "erp_bom_end_date", label: "ERP BOM End Date" },
              { key: "record_id", label: "Record ID" },
              { key: "snapshot_date", label: "Snapshot Date" }
            ]}
          />

          <DataSection
            title="BOM Produced"
            rows={filteredData.bomProduced}
            columns={[
              { key: "bom_id", label: "BOM ID" },
              { key: "item", label: "Item" },
              { key: "location", label: "Location" },
              { key: "bom_status", label: "BOM Status" },
              { key: "bom_version", label: "BOM Version" },
              { key: "prefix", label: "Prefix" },
              { key: "bom_plan_type", label: "BOM Plan Type" }
            ]}
          />

          <DataSection
            title="BOM Consumed"
            rows={filteredData.bomConsumed}
            columns={[
              { key: "item", label: "Item" },
              { key: "location", label: "Location" },
              { key: "bom_id", label: "BOM ID" },
              { key: "quantity_consumed_per", label: "Quantity Consumed Per" },
              { key: "component_start_date", label: "Component Start Date" },
              { key: "component_end_date", label: "Component End Date" }
            ]}
          />

          <DataSection
            title="Item BOM Routing"
            rows={filteredData.itemBomRouting}
            columns={[
              { key: "item", label: "Item" },
              { key: "routing_id", label: "Routing ID" },
              { key: "bom_id", label: "BOM ID" },
              { key: "priority", label: "Priority" },
              { key: "min_lot_size", label: "Min Lot Size" },
              { key: "lot_size_increment", label: "Lot Size Increment" }
            ]}
          />
        </>
      )}
    </div>
  );
}

function DataSection({ title, rows, columns }) {
  return (
    <div style={sectionWrap}>
      <h3 style={sectionTitle}>{title}</h3>
      <div style={tableCard}>
        <table style={table}>
          <thead style={thead}>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={th}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col.key} style={td}>
                      {row?.[col.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={emptyTableCell}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const page = {
  padding: "26px 30px",
  background: "#f7f7f8",
  minHeight: "100vh",
  fontFamily: "Segoe UI, Arial, sans-serif"
};

const backLink = {
  color: "#2563eb",
  cursor: "pointer",
  marginBottom: 10,
  fontSize: 14,
  fontWeight: 500
};

const title = {
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 18,
  color: "#111827"
};

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: 18,
  marginBottom: 18
};

const stepTitle = {
  fontWeight: 700,
  fontSize: 16,
  marginBottom: 10,
  color: "#111827"
};

const stepSubtitle = {
  fontSize: 13,
  color: "#4b5563",
  marginBottom: 12
};

const topRow = {
  display: "flex",
  gap: 14,
  marginBottom: 12
};

const topLeft = {
  flex: 1
};

const topRight = {
  flex: 1
};

const bottomRow = {
  display: "flex",
  gap: 14
};

const secondCriteriaWrap = {
  flex: 1
};

const secondValueWrap = {
  flex: 1
};

const miniLabel = {
  fontSize: 11,
  color: "#2563eb",
  marginBottom: 4
};

const select = {
  width: "100%",
  height: 42,
  border: "1px solid #c7cdd4",
  borderRadius: 4,
  padding: "0 12px",
  fontSize: 14,
  background: "#fff",
  color: "#111827",
  boxSizing: "border-box"
};

const loadingText = {
  marginBottom: 12,
  color: "#374151",
  fontSize: 14
};

const errorText = {
  marginBottom: 12,
  color: "#b91c1c",
  fontSize: 14,
  fontWeight: 600
};

const emptyState = {
  textAlign: "center",
  color: "#6b7280",
  padding: "34px 0 10px",
  fontSize: 15
};

const sectionWrap = {
  marginTop: 18
};

const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 10
};

const tableCard = {
  border: "1px solid #d1d5db",
  borderRadius: 4,
  overflow: "hidden",
  background: "#fff"
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
  padding: "9px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "#111827",
  borderBottom: "1px solid #d1d5db"
};

const td = {
  padding: "8px 12px",
  fontSize: 13,
  color: "#111827",
  borderTop: "1px solid #e5e7eb"
};

const emptyTableCell = {
  padding: "14px 12px",
  fontSize: 13,
  color: "#6b7280",
  textAlign: "center"
};