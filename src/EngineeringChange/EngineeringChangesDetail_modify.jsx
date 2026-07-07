import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = "";

const toText = (value) => {
  if (value == null) return "";
  return String(value);
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeSpace = (value) => toText(value).trim().replace(/\s+/g, " ");

const isBlank = (value) => normalizeSpace(value) === "";

const dashIfBlank = (value, fallback = "-") => {
  const text = toText(value).trim();
  return text ? text : fallback;
};

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return toText(value) || "-";
  }

  const yyyy = parsed.getFullYear();
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  let hours = parsed.getHours();
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const CST = "CST";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${minutes}:${seconds} ${ampm} ${CST}`;
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px 32px 40px 32px",
    fontFamily: "Segoe UI, Arial, sans-serif",
    color: "#111827",
  },
  backLink: {
    border: "none",
    background: "none",
    color: "#2563eb",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
    marginBottom: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    margin: "0 0 8px 0",
    color: "#111827",
  },
  subtitle: {
    fontSize: "14px",
    color: "#4b5563",
    margin: "0 0 18px 0",
  },
  infoCard: {
    background: "#dcedf8",
    border: "1px solid #cbdde9",
    borderRadius: "4px",
    padding: "14px 18px",
    marginBottom: "24px",
  },
  infoLine: {
    fontSize: "14px",
    lineHeight: "1.9",
    color: "#003b5c",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  infoLabel: {
    fontWeight: 700,
  },
  sectionCard: {
    background: "#ffffff",
    border: "1px solid #d9d9d9",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    padding: "22px 26px",
    marginBottom: "22px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 700,
    margin: "0 0 16px 0",
    color: "#111827",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#ffffff",
  },
  th: {
    background: "#f3f4f6",
    color: "#1f2937",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: 700,
    padding: "14px 18px",
    borderBottom: "1px solid #d1d5db",
  },
  td: {
    fontSize: "14px",
    color: "#111827",
    padding: "16px 18px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    wordBreak: "break-word",
  },
  updatedValueChanged: {
    color: "#111827",
    fontWeight: 600,
  },
  removedValue: {
    color: "#b42318",
    fontWeight: 700,
  },
  emptyBox: {
    border: "1px dashed #d1d5db",
    borderRadius: "4px",
    padding: "18px 20px",
    color: "#475467",
    background: "#fafafa",
    fontSize: "14px",
  },
  loadingBox: {
    background: "#fff",
    border: "1px solid #d9d9d9",
    padding: "20px",
    fontSize: "15px",
  },
  errorBox: {
    background: "#fff",
    border: "1px solid #d9d9d9",
    padding: "20px",
    fontSize: "15px",
    color: "#c62828",
  },
};

const EmptySection = ({ message }) => <div style={styles.emptyBox}>{message}</div>;

const DetailsTable = ({ title, rows }) => {
  return (
    <div style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Field</th>
              <th style={styles.th}>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, index) => (
                <tr key={`${row.field}-${index}`}>
                  <td style={styles.td}>{dashIfBlank(row.field)}</td>
                  <td style={styles.td}>{dashIfBlank(row.value)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={styles.td} colSpan={2}>
                  <EmptySection message="No data available" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ExistingValuesTable = ({
  title,
  rows,
  itemLabel,
  quantityLabel,
  emptyMessage,
}) => {
  return (
    <div style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {rows?.length ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{itemLabel}</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>{`Original ${quantityLabel}`}</th>
                <th style={styles.th}>{`Updated ${quantityLabel}`}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isRemoved = /item removed/i.test(toText(row.updatedValue));
                const updatedCellStyle = isRemoved
                  ? { ...styles.td, ...styles.removedValue }
                  : row.changed
                    ? { ...styles.td, ...styles.updatedValueChanged }
                    : styles.td;

                return (
                  <tr key={`${row.item}-${index}`}>
                    <td style={styles.td}>{dashIfBlank(row.item)}</td>
                    <td style={styles.td}>{dashIfBlank(row.description)}</td>
                    <td style={styles.td}>{dashIfBlank(row.originalValue)}</td>
                    <td style={updatedCellStyle}>{dashIfBlank(row.updatedValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptySection message={emptyMessage} />
      )}
    </div>
  );
};

const AddedValuesTable = ({
  title,
  rows,
  itemLabel,
  quantityLabel,
  emptyMessage,
}) => {
  return (
    <div style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {rows?.length ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{itemLabel}</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>{quantityLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.item}-${index}`}>
                  <td style={styles.td}>{dashIfBlank(row.item)}</td>
                  <td style={styles.td}>{dashIfBlank(row.description)}</td>
                  <td style={{ ...styles.td, ...styles.updatedValueChanged }}>
                    {dashIfBlank(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptySection message={emptyMessage} />
      )}
    </div>
  );
};

const findNextValueRow = (rows, startIndex, targetFields) => {
  for (let i = startIndex; i < rows.length; i += 1) {
    const field = normalizeSpace(rows[i]?.field).toLowerCase();
    if (targetFields.includes(field)) return rows[i];
  }
  return null;
};

const buildExistingAddedFromChangeRows = ({ rows, itemFieldNames, valueFieldNames }) => {
  const normalizedRows = safeArray(rows);
  const existingRows = [];
  const addedRows = [];

  for (let index = 0; index < normalizedRows.length; index += 1) {
    const currentRow = normalizedRows[index] || {};
    const currentField = normalizeSpace(currentRow.field).toLowerCase();

    if (!itemFieldNames.includes(currentField)) {
      continue;
    }

    const itemOriginal = toText(currentRow.originalValue).trim();
    const itemUpdated = toText(currentRow.updatedValue).trim();
    const valueRow = findNextValueRow(normalizedRows, index + 1, valueFieldNames) || {};
    const originalValue = toText(valueRow.originalValue).trim();
    const updatedValueRaw = toText(valueRow.updatedValue).trim();

    const existsInOg = itemOriginal !== "";
    const existsInMain = itemUpdated !== "";

    if (existsInOg && existsInMain) {
      existingRows.push({
        item: itemOriginal || itemUpdated,
        description: "",
        originalValue: originalValue || "",
        updatedValue: updatedValueRaw || "",
        changed: normalizeSpace(originalValue) !== normalizeSpace(updatedValueRaw),
      });
      continue;
    }

    if (!existsInOg && existsInMain) {
      addedRows.push({
        item: itemUpdated,
        description: "",
        value: updatedValueRaw || originalValue || "",
      });
      continue;
    }

    if (existsInOg && !existsInMain) {
      existingRows.push({
        item: itemOriginal,
        description: "",
        originalValue: originalValue || "",
        updatedValue: "Item removed",
        changed: true,
      });
    }
  }

  return { existingRows, addedRows };
};

const EngineeringChangeDetailModify = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const passedState = routerLocation.state || {};

  const engineeringChangeId =
    passedState.engineeringChangeNumber ||
    passedState.engineering_change_id ||
    passedState.engineeringChangeId ||
    "";

  const changeDate =
    passedState.changeDateDisplay ||
    passedState.change_date ||
    passedState.changeDate ||
    "";

  const changedBy =
    passedState.user ||
    passedState.changed_by ||
    passedState.changedBy ||
    "";

  const producedItem =
    passedState.producedItem ||
    passedState.produced_item ||
    passedState.item ||
    "";

  const resource =
    passedState.resource ||
    (Array.isArray(passedState.resources) ? passedState.resources[0] : "") ||
    "";

  const bomId =
    passedState.bomId ||
    (Array.isArray(passedState.bomIds) ? passedState.bomIds[0] : "") ||
    "";

  const locationName =
    passedState.location ||
    (Array.isArray(passedState.locations) ? passedState.locations[0] : "") ||
    "";

  const componentItem =
    (Array.isArray(passedState.componentItems)
      ? passedState.componentItems[0]
      : passedState.componentItems) || "";

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [detail, setDetail] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (engineeringChangeId) params.append("engineeringChangeId", engineeringChangeId);
    if (bomId) params.append("bomId", bomId);
    if (locationName) params.append("location", locationName);
    if (resource) params.append("resource", resource);
    if (producedItem) params.append("producedItem", producedItem);
    if (componentItem) params.append("componentItem", componentItem);
    return params.toString();
  }, [engineeringChangeId, bomId, locationName, resource, producedItem, componentItem]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setApiError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tables/engineering-changes-detail-modify?${queryString}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message ||
              result?.details ||
              `Failed to fetch engineering modify detail (${response.status})`
          );
        }

        setDetail(result.data || null);
      } catch (error) {
        console.error("Engineering modify detail fetch error:", error);
        setApiError(error.message || "Failed to fetch engineering modify detail");
      } finally {
        setLoading(false);
      }
    };

    if (queryString) {
      fetchDetail();
    } else {
      setApiError("Missing detail identifiers for Modify change type.");
    }
  }, [queryString]);

  const header = useMemo(() => detail?.header || {}, [detail]);
  const rawBomRecordDetails = useMemo(() => detail?.bomRecordDetails || [], [detail]);
  const componentItemChanges = useMemo(() => safeArray(detail?.componentItemChanges), [detail]);
  const coProductChanges = useMemo(() => safeArray(detail?.coProductChanges), [detail]);

  const bomRecordDetails = useMemo(() => {
    const valueMap = {};

    rawBomRecordDetails.forEach((row) => {
      const key = String(row?.field || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      valueMap[key] = row?.value ?? "";
    });

    return [
      {
        field: "Location",
        value: valueMap["location"] || locationName || header.location || "-",
      },
      {
        field: "BOM ID",
        value:
          valueMap["bom id"] || valueMap["bom_id"] || bomId || header.bomId || "-",
      },
      {
        field: "Produced Item",
        value:
          valueMap["produced item"] ||
          valueMap["produced_item"] ||
          valueMap["item"] ||
          producedItem ||
          header.producedItem ||
          "-",
      },
      {
        field: "Routing ID",
        value: valueMap["routing id"] || valueMap["routing_id"] || header.routingId || "-",
      },
      {
        field: "Item BOM Routing Priority",
        value:
          valueMap["item bom routing priority"] ||
          valueMap["item_bom_routing_priority"] ||
          valueMap["priority"] ||
          header.itemBomRoutingPriority ||
          "-",
      },
    ];
  }, [rawBomRecordDetails, locationName, bomId, producedItem, header]);

  const { existingRows: existingComponentRows, addedRows: addedComponentRows } = useMemo(
    () =>
      buildExistingAddedFromChangeRows({
        rows: componentItemChanges,
        itemFieldNames: ["component item"],
        valueFieldNames: ["standard usage"],
      }),
    [componentItemChanges]
  );

  const { existingRows: existingCoProductRows, addedRows: addedCoProductRows } = useMemo(
    () =>
      buildExistingAddedFromChangeRows({
        rows: coProductChanges,
        itemFieldNames: ["co-product item", "coproduct item"],
        valueFieldNames: ["standard usage", "qty produced", "quantity produced"],
      }),
    [coProductChanges]
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingBox}>Loading engineering change detail...</div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div style={styles.page}>
        <button style={styles.backLink} onClick={() => navigate("/change-log")}>
          ← BACK TO ENGINEERING CHANGE SUMMARY
        </button>
        <div style={styles.errorBox}>{apiError}</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button style={styles.backLink} onClick={() => navigate("/change-log")}>
        ← BACK TO ENGINEERING CHANGE SUMMARY
      </button>

      <h1 style={styles.title}>Engineering Change Detail: Modified BOM Record</h1>
      <p style={styles.subtitle}>Read-only view of change details</p>

      <div style={styles.infoCard}>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>ⓘ Engineering Change #:</span>
          <span>{toText(header.engineeringChangeId || engineeringChangeId) || "-"}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>Change Date:</span>
          <span>{formatDisplayDate(header.changeDate || changeDate)}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>User:</span>
          <span>{toText(header.userName || changedBy) || "-"}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>Change Type:</span>
          <span>{toText(header.changeType) || "Modified"}</span>
        </div>
        <div style={styles.infoLine}>
          <span style={styles.infoLabel}>Notes:</span>
          <span>{dashIfBlank(header.summaryNotes)}</span>
        </div>
      </div>

      <DetailsTable title="Existing BOM Values" rows={bomRecordDetails} />

      <ExistingValuesTable
        title="Existing Component Item Values"
        rows={existingComponentRows}
        itemLabel="Component Item"
        quantityLabel="Standard Usage"
        emptyMessage="No existing component item values were changed."
      />

      <AddedValuesTable
        title="Added Component Values"
        rows={addedComponentRows}
        itemLabel="Component Item"
        quantityLabel="Standard Usage"
        emptyMessage="No new component items were added."
      />

      <ExistingValuesTable
        title="Existing Co-Product Values"
        rows={existingCoProductRows}
        itemLabel="Co-Product Item"
        quantityLabel="Qty Produced"
        emptyMessage="No existing co-product values were changed."
      />

      <AddedValuesTable
        title="Added Co-Product Values"
        rows={addedCoProductRows}
        itemLabel="Co-Product Item"
        quantityLabel="Qty Produced"
        emptyMessage="No new co-product items were added."
      />
    </div>
  );
};

export default EngineeringChangeDetailModify;
