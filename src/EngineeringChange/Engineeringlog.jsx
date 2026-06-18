import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:3000";

/* ----------------------------- Helper Functions ----------------------------- */

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const toDisplayString = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          return (
            v.name ||
            v.value ||
            v.id ||
            v.location ||
            v.bom_id ||
            v.resource ||
            JSON.stringify(v)
          );
        }
        return String(v);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatDateForInput = () => "";

const formatDateForUI = (date) => {
  if (date == null) return "";
  return String(date) + ' CST';
};
const getCollapsedMultiValueDisplay = (values) => {
  const cleaned = safeArray(values)
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  if (cleaned.length > 3) {
    return `${cleaned.slice(0, 2).join(", ")}, ...`;
  }

  return cleaned.join(", ");
};

const fileDateStamp = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const normalizeDetailList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return [value];
  return [{ value: String(value) }];
};

const normalizeModifiedComparison = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null) {
        return {
          section:
            item.section ||
            item.entity ||
            item.level ||
            item.category ||
            "",
          field: item.field || item.column || item.name || "",
          old_value:
            item.old_value ??
            item.oldValue ??
            item.previous_value ??
            item.previousValue ??
            "",
          new_value:
            item.new_value ??
            item.newValue ??
            item.updated_value ??
            item.updatedValue ??
            "",
        };
      }

      return {
        section: "",
        field: "",
        old_value: "",
        new_value: String(item),
      };
    });
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).map(([field, diff]) => {
      if (typeof diff === "object" && diff !== null) {
        return {
          section:
            diff.section ||
            diff.entity ||
            diff.level ||
            diff.category ||
            "",
          field,
          old_value:
            diff.old_value ??
            diff.oldValue ??
            diff.previous_value ??
            diff.previousValue ??
            "",
          new_value:
            diff.new_value ??
            diff.newValue ??
            diff.updated_value ??
            diff.updatedValue ??
            "",
        };
      }
      return {
        section: "",
        field,
        old_value: "",
        new_value: String(diff),
      };
    });
  }

  return [
    {
      section: "",
      field: "",
      old_value: "",
      new_value: String(value),
    },
  ];
};

const splitCsvish = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).map((v) => v.trim()).filter(Boolean);
  }

  const str = String(value).trim();
  if (!str) return [];

  if (
    (str.startsWith("[") && str.endsWith("]")) ||
    (str.startsWith("{") && str.endsWith("}"))
  ) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((v) => v.trim()).filter(Boolean);
      }
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed)
          .map(String)
          .map((v) => v.trim())
          .filter(Boolean);
      }
    } catch {
      // fall back
    }
  }

  return str
    .split(",")
    .map((v) => v.replace(/^\[|\]$/g, "").replace(/^"|"$/g, "").trim())
    .filter(Boolean);
};

const uniqueSorted = (arr) =>
  [...new Set(arr.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );

const getCurrentUser = () => {
  try {
    const possibleKeys = [
      "username",
      "user",
      "userName",
      "loginUser",
      "loggedInUser",
      "currentUser",
      "mail",
      "email",
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") return parsed;
        if (parsed?.username) return parsed.username;
        if (parsed?.userName) return parsed.userName;
        if (parsed?.name) return parsed.name;
        if (parsed?.email) return parsed.email;
        if (parsed?.mail) return parsed.mail;
      } catch {
        return raw;
      }
    }
  } catch {
    // ignore localStorage errors
  }
  return "";
};

const normalizeLogRecord = (item, index) => {
  const engineeringChangeNumber =
    item.engineering_change_id ||
    item.engineering_change_number ||
    item.engineeringChangeId ||
    item.engineeringChangeNumber ||
    item.ec_number ||
    item.ecNumber ||
    item.change_number ||
    item.changeNumber ||
    item.id ||
    `EC-${index + 1}`;

const changeDate =
  item.change_date ??
  item.changeDate ??
  "";

  const changeType =
    item.change_type ||
    item.changeType ||
    item.action ||
    item.operation ||
    item.status ||
    "";

  const locationsRaw =
    item.locations ??
    item.location ??
    item.location_list ??
    item.locationList ??
    item.location_name ??
    "";

  const resourcesRaw =
    item.resources ??
    item.resource ??
    item.resource_list ??
    item.resourceList ??
    "";

  const bomIdsRaw =
    item.bom_ids ||
    item.bom_id ||
    item.bomIds ||
    item.bomId ||
    "";

  const changedBy =
    item.user_name ||
    item.user ||
    item.changed_by ||
    item.changedBy ||
    item.created_by ||
    item.createdBy ||
    item.modified_by ||
    item.modifiedBy ||
    "";

  const changeSummary =
    item.change_summary ||
    item.summarynotes ||
    item.notes ||
    item.changeSummary ||
    item.summary ||
    item.description ||
    "";

  const mainBomDetails =
    item.main_bom_details ||
    item.mainBomDetails ||
    item.main_bom ||
    item.mainBom ||
    item.bom_details ||
    item.bomDetails ||
    [];

  const componentDetails =
    item.component_details ||
    item.componentDetails ||
    item.components ||
    [];

  const coProductDetails =
    item.co_product_details ||
    item.coProductDetails ||
    item.coproduct_details ||
    item.coProducts ||
    [];

  const modifiedFieldComparison =
    item.modified_field_comparison ||
    item.modifiedFieldComparison ||
    item.modified_fields ||
    item.modifiedFields ||
    item.changed_fields ||
    item.changedFields ||
    [];

  const producedItem =
    item.produced_item ||
    item.producedItem ||
    item.item ||
    item.parent_item ||
    item.parentItem ||
    "";

  const normalizedComponentDetails = normalizeDetailList(componentDetails);
  const normalizedCoProductDetails = normalizeDetailList(coProductDetails);

  const componentItems = normalizedComponentDetails
    .map(
      (detail) =>
        detail.component_item ||
        detail.componentItem ||
        detail.item ||
        detail.component ||
        ""
    )
    .filter(Boolean);

  const coProductItems = normalizedCoProductDetails
    .map(
      (detail) =>
        detail.co_product_item ||
        detail.coProductItem ||
        detail.item ||
        detail.co_product ||
        ""
    )
    .filter(Boolean);

  const locations = splitCsvish(locationsRaw);
  const bomIds = splitCsvish(bomIdsRaw);
  const resources = splitCsvish(resourcesRaw);

  return {
    raw: item,
    engineeringChangeNumber: toDisplayString(engineeringChangeNumber),
    changeDate,
    changeDateDisplay: formatDateForUI(changeDate),
    changeDateInput: formatDateForInput(changeDate),
    changeType: toDisplayString(changeType),

    locations,
    locationsDisplay: locations.join(", "),
    locationsTableDisplay: getCollapsedMultiValueDisplay(locations),

    bomIds,
    bomIdsDisplay: bomIds.join(", "),
    bomIdsTableDisplay: getCollapsedMultiValueDisplay(bomIds),

    resources,
    resourcesDisplay: resources.join(", "),
    resourcesTableDisplay: getCollapsedMultiValueDisplay(resources),

    user: toDisplayString(changedBy),
    changeSummary: toDisplayString(changeSummary),

    producedItem: toDisplayString(producedItem),

    componentItems,
    componentItemsDisplay: componentItems.join(", "),

    coProductItems,
    coProductItemsDisplay: coProductItems.join(", "),

    mainBomDetails: normalizeDetailList(mainBomDetails),
    componentDetails: normalizedComponentDetails,
    coProductDetails: normalizedCoProductDetails,
    modifiedFieldComparison: normalizeModifiedComparison(modifiedFieldComparison),
  };
};

const getTagStyle = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("added")) {
    return {
      backgroundColor: "#2f8f3a",
      color: "#ffffff",
    };
  }
  if (normalized.includes("deleted")) {
    return {
      backgroundColor: "#d93025",
      color: "#ffffff",
    };
  }
  if (normalized.includes("modified")) {
    return {
      backgroundColor: "#f29900",
      color: "#ffffff",
    };
  }
  return {
    backgroundColor: "#6b7280",
    color: "#ffffff",
  };
};

const autoFitColumns = (worksheet, rows) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  worksheet["!cols"] = keys.map((key) => {
    const maxLength = Math.max(
      key.length,
      ...rows.map((row) => String(row[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 14), 40) };
  });
};

const createRowIfEmpty = (rows, placeholder) => {
  return rows.length ? rows : [placeholder];
};

const buildExportSheets = (rows) => {
  const highLevelSummary = createRowIfEmpty(
    rows.map((row) => ({
      "Engineering Change #": row.engineeringChangeNumber,
      "Change Date": row.changeDateDisplay,
      "Change Type": row.changeType,
      "Location(s)": row.locationsDisplay,
      "BOM ID(s)": row.bomIdsDisplay,
      "Resource(s)": row.resourcesDisplay,
      User: row.user,
      "Change Summary": row.changeSummary,
    })),
    {
      "Engineering Change #": "",
      "Change Date": "",
      "Change Type": "",
      "Location(s)": "",
      "BOM ID(s)": "",
      "Resource(s)": "",
      User: "",
      "Change Summary": "No filtered data available",
    }
  );

  const mainBomDetails = createRowIfEmpty(
    rows.flatMap((row) => {
      if (!row.mainBomDetails.length) {
        return [
          {
            "Engineering Change #": row.engineeringChangeNumber,
            "Change Type": row.changeType,
            "Change Date": row.changeDateDisplay,
            "BOM ID": row.bomIdsDisplay,
            Location: row.locationsDisplay,
            Resource: row.resourcesDisplay,
            User: row.user,
            Detail: "",
          },
        ];
      }

      return row.mainBomDetails.map((detail) => ({
        "Engineering Change #": row.engineeringChangeNumber,
        "Change Type": row.changeType,
        "Change Date": row.changeDateDisplay,
        "BOM ID":
          detail.bom_id ||
          detail.bomId ||
          detail.main_bom_id ||
          detail.mainBomId ||
          row.bomIdsDisplay,
        Location:
          detail.location ||
          detail.location_name ||
          row.locationsDisplay,
        Resource:
          detail.resource ||
          detail.resource_name ||
          row.resourcesDisplay,
        User: row.user,
        Detail: typeof detail === "object" ? JSON.stringify(detail) : String(detail),
      }));
    }),
    {
      "Engineering Change #": "",
      "Change Type": "",
      "Change Date": "",
      "BOM ID": "",
      Location: "",
      Resource: "",
      User: "",
      Detail: "No filtered data available",
    }
  );

  const componentDetails = createRowIfEmpty(
    rows.flatMap((row) => {
      if (!row.componentDetails.length) {
        return [
          {
            "Engineering Change #": row.engineeringChangeNumber,
            "Parent BOM ID": row.bomIdsDisplay,
            Location: row.locationsDisplay,
            "Component Item": "",
            Resource: row.resourcesDisplay,
            User: row.user,
            Detail: "",
          },
        ];
      }

      return row.componentDetails.map((detail) => ({
        "Engineering Change #": row.engineeringChangeNumber,
        "Parent BOM ID":
          detail.parent_bom_id ||
          detail.parentBomId ||
          detail.bom_id ||
          detail.bomId ||
          row.bomIdsDisplay,
        Location:
          detail.location ||
          detail.location_name ||
          row.locationsDisplay,
        "Component Item":
          detail.component_item ||
          detail.componentItem ||
          detail.item ||
          detail.component ||
          "",
        Resource:
          detail.resource ||
          detail.resource_name ||
          row.resourcesDisplay,
        User: row.user,
        Detail: typeof detail === "object" ? JSON.stringify(detail) : String(detail),
      }));
    }),
    {
      "Engineering Change #": "",
      "Parent BOM ID": "",
      Location: "",
      "Component Item": "",
      Resource: "",
      User: "",
      Detail: "No filtered data available",
    }
  );

  const coProductDetails = createRowIfEmpty(
    rows.flatMap((row) => {
      if (!row.coProductDetails.length) {
        return [
          {
            "Engineering Change #": row.engineeringChangeNumber,
            "Parent BOM ID": row.bomIdsDisplay,
            Location: row.locationsDisplay,
            "Co-Product Item": "",
            Resource: row.resourcesDisplay,
            User: row.user,
            Detail: "",
          },
        ];
      }

      return row.coProductDetails.map((detail) => ({
        "Engineering Change #": row.engineeringChangeNumber,
        "Parent BOM ID":
          detail.parent_bom_id ||
          detail.parentBomId ||
          detail.bom_id ||
          detail.bomId ||
          row.bomIdsDisplay,
        Location:
          detail.location ||
          detail.location_name ||
          row.locationsDisplay,
        "Co-Product Item":
          detail.co_product_item ||
          detail.coProductItem ||
          detail.item ||
          detail.co_product ||
          "",
        Resource:
          detail.resource ||
          detail.resource_name ||
          row.resourcesDisplay,
        User: row.user,
        Detail: typeof detail === "object" ? JSON.stringify(detail) : String(detail),
      }));
    }),
    {
      "Engineering Change #": "",
      "Parent BOM ID": "",
      Location: "",
      "Co-Product Item": "",
      Resource: "",
      User: "",
      Detail: "No filtered data available",
    }
  );

  const modifiedFieldComparison = createRowIfEmpty(
    rows.flatMap((row) => {
      if (!row.modifiedFieldComparison.length) {
        return [
          {
            "Engineering Change #": row.engineeringChangeNumber,
            Section: "",
            Field: "",
            "Old Value": "",
            "New Value": "",
            User: row.user,
            "Change Date": row.changeDateDisplay,
          },
        ];
      }

      return row.modifiedFieldComparison.map((detail) => ({
        "Engineering Change #": row.engineeringChangeNumber,
        Section: detail.section || "",
        Field: detail.field || "",
        "Old Value": detail.old_value ?? "",
        "New Value": detail.new_value ?? "",
        User: row.user,
        "Change Date": row.changeDateDisplay,
      }));
    }),
    {
      "Engineering Change #": "",
      Section: "",
      Field: "",
      "Old Value": "",
      "New Value": "",
      User: "",
      "Change Date": "",
    }
  );

  return {
    highLevelSummary,
    mainBomDetails,
    componentDetails,
    coProductDetails,
    modifiedFieldComparison,
  };
};

/* ----------------------- Dynamic Criteria Filter ----------------------- */

const CRITERIA_DROPDOWN_OPTIONS = [
  { value: "", label: "None" },
  { value: "location", label: "Location" },
  { value: "bomId", label: "BOM ID" },
  { value: "resource", label: "Resource" },
  { value: "producedItem", label: "Produced Item" },
  { value: "componentItem", label: "Component Item" },
  { value: "coProductItem", label: "Co-Product Item" },
];

const getSearchPlaceholder = (field) => {
  switch (field) {
    case "location":
      return "Search Location";
    case "bomId":
      return "Search BOM ID";
    case "resource":
      return "Search Resource";
    case "producedItem":
      return "Search Produced Item";
    case "componentItem":
      return "Search Component Item";
    case "coProductItem":
      return "Search Co-Product Item";
    default:
      return "Search";
  }
};

const recordMatchesTextCriterion = (row, field, inputValue) => {
  if (!field || !inputValue.trim()) return true;

  const searchValue = inputValue.trim().toLowerCase();

  switch (field) {
    case "location":
      return row.locations.some((v) => String(v).toLowerCase().includes(searchValue));

    case "bomId":
      return row.bomIds.some((v) => String(v).toLowerCase().includes(searchValue));

    case "resource":
      return row.resources.some((v) => String(v).toLowerCase().includes(searchValue));

    case "producedItem":
      return String(row.producedItem || "").toLowerCase().includes(searchValue);

    case "componentItem":
      return row.componentItems.some((v) =>
        String(v).toLowerCase().includes(searchValue)
      );

    case "coProductItem":
      return row.coProductItems.some((v) =>
        String(v).toLowerCase().includes(searchValue)
      );

    default:
      return true;
  }
};

/* -------------------------------- Component -------------------------------- */

export default function Engineeringlog() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(formatDateForInput(new Date()));
  const [selectedUser, setSelectedUser] = useState("");
  const [showMyChangesOnly, setShowMyChangesOnly] = useState(false);

  // NEW CRITERIA STATE
  const [criteriaField1, setCriteriaField1] = useState("");
  const [criteriaValue1, setCriteriaValue1] = useState("");
  const [criteriaField2, setCriteriaField2] = useState("");
  const [criteriaValue2, setCriteriaValue2] = useState("");

  const currentUser = useMemo(() => getCurrentUser(), []);

  const handleRowNavigation = (row) => {
    const changeType = String(row.changeType || "").trim().toLowerCase();

    const statePayload = {
      engineeringChangeId: row.engineeringChangeNumber,
      engineeringChangeNumber: row.engineeringChangeNumber,
      changeDateDisplay: row.changeDateDisplay,
      changeDate: row.changeDate,
      user: row.user,
      changeType: row.changeType,

      bomId: row.bomIds?.[0] || "",
      location: row.locations?.[0] || "",
      producedItem: row.producedItem || "",
      resource: row.resources?.[0] || "",

      bomIds: row.bomIds || [],
      locations: row.locations || [],
      resources: row.resources || [],

      componentItems: row.componentItems || [],
      coProductItems: row.coProductItems || [],
      changeSummary: row.changeSummary || "",
      raw: row.raw || {},
    };

    if (changeType.includes("add")) {
      navigate("/change-log/engineering-change-detail-add", {
        state: {
          engineeringChangeId: row.engineeringChangeNumber || "",
          bomId: row.bomIds?.[0] || "",
          resource: row.resources?.[0] || "",
          producedItem: row.producedItem || "",
          location: row.locations?.[0] || "",
        },
      });
      return;
    }

    if (changeType.includes("modified")) {
      navigate("/change-log/engineering-change-detail-modify", {
        state: statePayload,
      });
      return;
    }

    if (changeType.includes("delete")) {
      navigate("/change-log/engineering-change-detail-delete-bom", {
        state: statePayload,
      });
      return;
    }
  };

  useEffect(() => {
    const fetchEngineeringLog = async () => {
      setLoading(true);
      setApiError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tables/engineering-change-log`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            errText || `Failed to fetch engineering change log (${response.status})`
          );
        }

        const data = await response.json();

        const rawList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.rows)
              ? data.rows
              : Array.isArray(data?.result)
                ? data.result
                : [];

        const normalized = rawList.map(normalizeLogRecord);
        setRows(normalized);
      } catch (error) {
        console.error("Engineering change log fetch error:", error);
        setApiError(error.message || "Failed to fetch engineering change log");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEngineeringLog();
  }, []);

  const userOptions = useMemo(() => uniqueSorted(rows.map((r) => r.user)), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowDate = row.changeDateInput;

      if (fromDate && rowDate && rowDate < fromDate) return false;
      if (toDate && rowDate && rowDate > toDate) return false;

      if (selectedUser && row.user !== selectedUser) return false;

      if (showMyChangesOnly && currentUser) {
        const rowUser = String(row.user || "").trim().toLowerCase();
        const me = String(currentUser || "").trim().toLowerCase();
        if (rowUser !== me) return false;
      }

      if (!recordMatchesTextCriterion(row, criteriaField1, criteriaValue1)) return false;
      if (!recordMatchesTextCriterion(row, criteriaField2, criteriaValue2)) return false;

      return true;
    });
  }, [
    rows,
    fromDate,
    toDate,
    selectedUser,
    showMyChangesOnly,
    currentUser,
    criteriaField1,
    criteriaValue1,
    criteriaField2,
    criteriaValue2,
  ]);

  const handleExport = () => {
    const sheets = buildExportSheets(filteredRows);

    const workbook = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(sheets.highLevelSummary);
    const ws2 = XLSX.utils.json_to_sheet(sheets.mainBomDetails);
    const ws3 = XLSX.utils.json_to_sheet(sheets.componentDetails);
    const ws4 = XLSX.utils.json_to_sheet(sheets.coProductDetails);
    const ws5 = XLSX.utils.json_to_sheet(sheets.modifiedFieldComparison);

    autoFitColumns(ws1, sheets.highLevelSummary);
    autoFitColumns(ws2, sheets.mainBomDetails);
    autoFitColumns(ws3, sheets.componentDetails);
    autoFitColumns(ws4, sheets.coProductDetails);
    autoFitColumns(ws5, sheets.modifiedFieldComparison);

    XLSX.utils.book_append_sheet(workbook, ws1, "High-Level Summary");
    XLSX.utils.book_append_sheet(workbook, ws2, "Main BOM Details");
    XLSX.utils.book_append_sheet(workbook, ws3, "Component Details");
    XLSX.utils.book_append_sheet(workbook, ws4, "Co-Product Details");
    XLSX.utils.book_append_sheet(workbook, ws5, "Modified Field Comparison");

    XLSX.writeFile(workbook, `EngineeringChangeLogFile${fileDateStamp()}.xlsx`);
  };

  const styles = {
    page: {
      background: "#f5f5f7",
      minHeight: "100vh",
      padding: "24px 36px 40px 36px",
      fontFamily: "Segoe UI, Arial, sans-serif",
      color: "#1f2937",
    },
    link: {
      color: "#2563eb",
      textDecoration: "underline",
      fontWeight: 600,
      cursor: "pointer",
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
      marginBottom: "20px",
    },
    card: {
      background: "#f7f7f8",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      padding: "18px 18px 16px 18px",
      marginBottom: "16px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 700,
      marginBottom: "14px",
      color: "#111827",
    },
    filtersRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr auto",
      gap: "12px",
      alignItems: "end",
      marginBottom: "14px",
    },
    secondRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
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
      appearance: "auto",
    },
    checkboxWrap: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      height: "42px",
      whiteSpace: "nowrap",
      marginTop: "18px",
    },
    exportInfoRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
      marginBottom: "14px",
      flexWrap: "wrap",
    },
    exportButton: {
      backgroundColor: "#1f78d1",
      color: "#ffffff",
      border: "none",
      borderRadius: "3px",
      height: "38px",
      padding: "0 18px",
      fontSize: "13px",
      fontWeight: 700,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
    },
    tableWrap: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      overflow: "hidden",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    theadTh: {
      background: "#f3f4f6",
      color: "#111827",
      fontSize: "13px",
      fontWeight: 700,
      textAlign: "left",
      padding: "14px 12px",
      borderBottom: "1px solid #d1d5db",
      verticalAlign: "top",
    },
    tbodyTd: {
      fontSize: "13px",
      color: "#111827",
      padding: "12px",
      borderBottom: "1px solid #e5e7eb",
      verticalAlign: "top",
      wordBreak: "break-word",
      lineHeight: 1.45,
    },
    pill: {
      display: "inline-block",
      fontSize: "11px",
      fontWeight: 700,
      borderRadius: "999px",
      padding: "4px 8px",
      lineHeight: 1,
    },
    statusText: {
      fontSize: "14px",
      marginTop: "16px",
      color: "#374151",
    },
    errorText: {
      fontSize: "14px",
      color: "#d93025",
      marginTop: "10px",
    },
  };

  return (
    <div style={styles.page}>
      {/* MAIN MENU BUTTON */}
      <button
        type="button"
        style={styles.backButton}
        onClick={() => navigate("/")}
      >
        <span style={{ fontSize: "16px" }}>←</span>
        <span>BACK TO MAIN MENU</span>
      </button>

      <div style={styles.title}>Engineering Change Summary</div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Filters & Search</div>

        {/* Top row */}
        <div style={styles.filtersRow}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>User Filter</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={styles.select}
            >
              <option value="">All Users</option>
              {userOptions.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          <label style={styles.checkboxWrap}>
            <input
              type="checkbox"
              checked={showMyChangesOnly}
              onChange={(e) => setShowMyChangesOnly(e.target.checked)}
            />
            <span>Show My Changes Only</span>
          </label>
        </div>

        {/* Criteria row 1 */}
        <div style={styles.criteriaGrid}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Search By (Criteria 1)</label>
            <select
              value={criteriaField1}
              onChange={(e) => {
                setCriteriaField1(e.target.value);
                setCriteriaValue1("");
              }}
              style={styles.select}
            >
              {CRITERIA_DROPDOWN_OPTIONS.map((option) => (
                <option key={`criteria1-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>
              {criteriaField1 ? getSearchPlaceholder(criteriaField1) : "Search"}
            </label>
            <input
              type="text"
              value={criteriaValue1}
              onChange={(e) => setCriteriaValue1(e.target.value)}
              placeholder={
                criteriaField1 ? getSearchPlaceholder(criteriaField1) : "Select Criteria 1 first"
              }
              disabled={!criteriaField1}
              style={styles.input}
            />
          </div>
        </div>

        {/* Criteria row 2 */}
        <div style={styles.criteriaGrid}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Search By (Criteria 2)</label>
            <select
              value={criteriaField2}
              onChange={(e) => {
                setCriteriaField2(e.target.value);
                setCriteriaValue2("");
              }}
              style={styles.select}
            >
              {CRITERIA_DROPDOWN_OPTIONS.map((option) => (
                <option key={`criteria2-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>
              {criteriaField2 ? getSearchPlaceholder(criteriaField2) : "Search"}
            </label>
            <input
              type="text"
              value={criteriaValue2}
              onChange={(e) => setCriteriaValue2(e.target.value)}
              placeholder={
                criteriaField2 ? getSearchPlaceholder(criteriaField2) : "Select Criteria 2 first"
              }
              disabled={!criteriaField2}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.exportInfoRow}>
        <button
          type="button"
          style={styles.exportButton}
          onClick={handleExport}
          disabled={loading}
        >
          <span style={{ fontSize: "14px" }}>⬇</span>
          <span>EXPORT FILTERED CHANGE LOG</span>
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.theadTh, width: "12%" }}>Engineering Change #</th>
              <th style={{ ...styles.theadTh, width: "9%" }}>Change Date</th>
              <th style={{ ...styles.theadTh, width: "9%" }}>Change Type</th>
              <th style={{ ...styles.theadTh, width: "12%" }}>Location(s)</th>
              <th style={{ ...styles.theadTh, width: "18%" }}>BOM ID(s)</th>
              <th style={{ ...styles.theadTh, width: "12%" }}>Resource(s)</th>
              <th style={{ ...styles.theadTh, width: "8%" }}>User</th>
              <th style={{ ...styles.theadTh, width: "20%" }}>Change Summary</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={styles.tbodyTd}>
                  Loading engineering change log...
                </td>
              </tr>
            ) : apiError ? (
              <tr>
                <td colSpan={8} style={{ ...styles.tbodyTd, color: "#d93025" }}>
                  {apiError}
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.tbodyTd}>
                  No records found for the selected filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr
                  key={`${row.engineeringChangeNumber}-${index}`}
                  onClick={() => handleRowNavigation(row)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={styles.tbodyTd}>
                    <span
                      role="link"
                      tabIndex={0}
                      style={styles.link}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowNavigation(row);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRowNavigation(row);
                        }
                      }}
                    >
                      {row.engineeringChangeNumber}
                    </span>
                  </td>

                  <td style={styles.tbodyTd}>{row.changeDateDisplay}</td>
                  <td style={styles.tbodyTd}>
                    <span style={{ ...styles.pill, ...getTagStyle(row.changeType) }}>
                      {row.changeType || "-"}
                    </span>
                  </td>
                  <td style={styles.tbodyTd}>{row.locationsTableDisplay || "-"}</td>
                  <td style={styles.tbodyTd}>{row.bomIdsTableDisplay || "-"}</td>
                  <td style={styles.tbodyTd}>{row.resourcesTableDisplay || "-"}</td>
                  <td style={styles.tbodyTd}>{row.user || "-"}</td>
                  <td style={styles.tbodyTd}>{row.changeSummary || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && !apiError && (
        <div style={styles.statusText}>
          Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> log record(s)
          {showMyChangesOnly && currentUser ? (
            <>
              {" "}
              for <strong>{currentUser}</strong>
            </>
          ) : null}
          .
        </div>
      )}

      {apiError ? (
        <div style={styles.errorText}>
          Please check backend API response and route mapping.
        </div>
      ) : null}
    </div>
  );
}