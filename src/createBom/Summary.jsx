import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { layout } from "../styles/layout";

const VALIDATE_URL = "http://localhost:3000/bom-explosion";

const buildConfigKey = (item, location) => `${item}__${location}`;
const buildBomId = (bomVersion, item, location) =>
  `${bomVersion}_${item}_${location}`;
const buildRoutingId = (item, location, resource) =>
  `ROUTING_${item}_${location}_${resource}`;

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getProducedDescription = (producedItem) =>
  producedItem?.description ||
  producedItem?.desc ||
  producedItem?.item_description ||
  "";

const normalizeValidationEntries = (validationResult) => {
  if (!validationResult) return [];

  const output = [];

  const pushEntry = (entry, index = 0, parent = {}) => {
    if (!entry) return;

    const code = String(
      entry.validationSequence ??
        entry.validation_sequence ??
        entry.seq ??
        entry.sequence ??
        entry.code ??
        parent.validationSequence ??
        parent.validation_sequence ??
        parent.seq ??
        parent.sequence ??
        parent.code ??
        index + 1
    );

    const desc =
      entry.validation ??
      entry.desc ??
      entry.description ??
      entry.validation_description ??
      entry.validationDescription ??
      parent.validation ??
      parent.desc ??
      parent.description ??
      parent.validation_description ??
      parent.validationDescription ??
      "";

    const error =
      entry.errorDetails ??
      entry.error ??
      entry.validation_error_detail ??
      entry.validationErrorDetail ??
      entry.message ??
      entry.detail ??
      parent.errorDetails ??
      parent.error ??
      parent.validation_error_detail ??
      parent.validationErrorDetail ??
      "";

    const rm =
      entry.remediationMessage ??
      entry.rm ??
      entry.remediation_message ??
      entry.remediation ??
      parent.remediationMessage ??
      parent.rm ??
      parent.remediation_message ??
      parent.remediation ??
      "";

    output.push({
      code,
      desc,
      error,
      rm,
    });
  };

  // 1) Preferred manual response shape:
  // {
  //   errorList: [
  //     {
  //       messages: [
  //         {
  //           validationSequence,
  //           validation,
  //           errorDetails,
  //           remediationMessage
  //         }
  //       ]
  //     }
  //   ]
  // }
  const manualErrorList = Array.isArray(validationResult?.errorList)
    ? validationResult.errorList
    : Array.isArray(validationResult?.data?.errorList)
    ? validationResult.data.errorList
    : [];

  if (manualErrorList.length > 0) {
    manualErrorList.forEach((row, rowIndex) => {
      const messages = Array.isArray(row?.messages) ? row.messages : [];
      messages.forEach((msg, msgIndex) => {
        pushEntry(msg, `${rowIndex}-${msgIndex}`, row);
      });
    });
  }

  // 2) Fallback: validationErrors / errors array
  const fallbackArray =
    validationResult?.validationErrors ||
    validationResult?.errors ||
    validationResult?.data?.validationErrors ||
    validationResult?.data?.errors;

  if (Array.isArray(fallbackArray)) {
    fallbackArray.forEach((entry, index) => pushEntry(entry, index));
  }

  // 3) Fallback: validationErrors / errors object
  if (
    fallbackArray &&
    !Array.isArray(fallbackArray) &&
    typeof fallbackArray === "object"
  ) {
    Object.entries(fallbackArray).forEach(([code, entry], index) => {
      pushEntry(
        {
          code,
          ...entry,
        },
        index
      );
    });
  }

  const seen = new Set();
  return output.filter((entry) => {
    const sig = JSON.stringify(entry);
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
};

export default function SummaryPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [priorityMap, setPriorityMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const producedItems = routerLocation?.state?.producedItems || [];
  const locations = routerLocation?.state?.locations || [];
  const resourceComponentConfigs =
    routerLocation?.state?.resourceComponentConfigs || {};
  const resourceOptionsByKey = routerLocation?.state?.resourceOptionsByKey || {};
  const previousState = routerLocation?.state?.previousState || {};

  const summaryGroups = useMemo(() => {
    const groups = [];

    producedItems.forEach((item) => {
      locations.forEach((loc) => {
        const key = buildConfigKey(item.item, loc.location);
        const config = resourceComponentConfigs[key];

        if (!config) return;

        const selectedResources = Array.isArray(config.resources)
          ? config.resources
          : [];

        const resourceOptions = resourceOptionsByKey[key] || [];
        const resourceMap = new Map(
          resourceOptions.map((row) => [String(row.resource), row])
        );

        const bomVersion = config.bomVersion || "PRIMARY";
        const bomId = buildBomId(bomVersion, item.item, loc.location);

        const routingRows = selectedResources.map((resource, index) => {
          const option = resourceMap.get(String(resource)) || {};
          return {
            key: `${key}__${resource}`,
            resource,
            resourceRelevancy:
              option.resourceRelevancy ||
              option.resource_relevancy ||
              "",
            routingId: buildRoutingId(item.item, loc.location, resource),
            defaultPriority: index + 1,
          };
        });

        if (routingRows.length === 0) return;

        groups.push({
          key,
          producedItem: item.item || item.id || "-",
          description: getProducedDescription(item),
          location: loc.name || loc.location_description || loc.location || "-",
          locationId: loc.location || "",
          locationStatus: loc.status || loc.location_status || "",
          bomVersion,
          bomId,
          producedItemData: item,
          locationData: loc,
          config,
          routingRows,
        });
      });
    });

    return groups;
  }, [producedItems, locations, resourceComponentConfigs, resourceOptionsByKey]);

  useEffect(() => {
    const nextPriorityMap = {};
    summaryGroups.forEach((group) => {
      group.routingRows.forEach((row) => {
        nextPriorityMap[row.routingId] = row.defaultPriority;
      });
    });
    setPriorityMap(nextPriorityMap);
  }, [summaryGroups]);

  const actualPayload = useMemo(() => {
    return summaryGroups.map((group) => {
      const config = group.config || {};
      const components = Array.isArray(config.components) ? config.components : [];
      const coproducts = Array.isArray(config.coproducts) ? config.coproducts : [];

      return {
        bomId: group.bomId,
        engineeringChange: {
          ecNumber:
            previousState?.engineeringChange?.ecNumber ||
            previousState?.ecNumber ||
            previousState?.engChangeId ||
            "",
          creationDate:
            previousState?.engineeringChange?.creationDate ||
            previousState?.creationDate ||
            new Date().toISOString().slice(0, 10),
        },
        producedItem: {
          item:
            group.producedItemData?.item ||
            group.producedItemData?.id ||
            group.producedItem,
          description: getProducedDescription(group.producedItemData),
          status:
            group.producedItemData?.status ||
            group.producedItemData?.item_status ||
            "",
          releaseFlag:
            group.producedItemData?.releaseFlag ||
            group.producedItemData?.item_releaseflag ||
            "",
        },
        locations: [
          {
            locationId: group.locationId,
            locationName:
              group.locationData?.name ||
              group.locationData?.location_description ||
              group.location,
            locationStatus:
              group.locationData?.status ||
              group.locationData?.location_status ||
              "",
            resourceInfo: group.routingRows.map((row) => ({
              resource: row.resource,
              resourceRelevancy: row.resourceRelevancy || "",
              bomVersion: group.bomVersion,
              routingId: row.routingId,
              priority: Number(
                priorityMap[row.routingId] || row.defaultPriority || 1
              ),
              coProductAssociation:
                config.producedCoProduct === false ? 0 : 1,
            })),
            componentItems: config.noComponentItems
              ? []
              : components
                  .filter((row) => String(row.componentItem || "").trim() !== "")
                  .map((row) => ({
                    componentItem: row.componentItem,
                    description: row.description || "",
                    standardUsage: toNumberOrNull(row.standardUsage),
                  })),
            coProducts: coproducts
              .filter((row) => String(row.coProductItem || "").trim() !== "")
              .map((row) => ({
                coProductItem: row.coProductItem,
                description: row.description || "",
                qtyProducedPer: toNumberOrNull(row.qtyProduced),
              })),
            flags: {
              isCoProduct: !!config.producedCoProduct,
              noComponentItems: !!config.noComponentItems,
              replicateForAllLocations: !!config.replicateToAll,
            },
          },
        ],
        notes: notes || "",
      };
    });
  }, [summaryGroups, priorityMap, previousState, notes]);

  const validationEntries = useMemo(() => {
    return normalizeValidationEntries(validationResult);
  }, [validationResult]);

  const topLevelError =
    validationResult?.error || validationResult?.data?.error || "";

  const isSuccess =
    !!validationResult && !topLevelError && validationEntries.length === 0;

  const handlePriorityChange = (routingId, value) => {
    const safeValue = value === "" ? "" : Math.max(1, Number(value) || 1);

    setPriorityMap((prev) => ({
      ...prev,
      [routingId]: safeValue,
    }));
  };

  const submitBOMs = async () => {
    if (actualPayload.length === 0) {
      setValidationResult({
        error: "No summary rows available to validate.",
      });
      return;
    }

    setSubmitting(true);
    setValidationResult(null);

    try {
      const response = await axios.post(VALIDATE_URL, {
        entryMode: "manual",
        records: actualPayload,
      });
      setValidationResult(response.data);
    } catch (err) {
      const serverData = err?.response?.data;
      setValidationResult(
        serverData || {
          error: err?.message || "Failed to validate BOM payload.",
        }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...layout.page, background: "#f5f6f8" }}>
      <div style={{ maxWidth: 1200, margin: "auto", padding: 24 }}>
        <div
          onClick={() => navigate(-1)}
          style={{
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: 500,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          ← BACK
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
          Step 4: New BOM Summary & Routing Priority
        </h1>

        <div style={{ color: "#6b7280", marginBottom: 28 }}>
          Review the BOM records to be created
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 14 }}>
          Main Summary Table
        </h2>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f3f4f6" }}>
                <tr>
                  <th style={th}>Produced Item</th>
                  <th style={th}>Item Description</th>
                  <th style={th}>Location</th>
                  <th style={th}>BOM ID</th>
                  <th style={th}>Routing ID</th>
                  <th style={th}>Item BOM Routing Priority</th>
                </tr>
              </thead>

              <tbody>
                {summaryGroups.length === 0 ? (
                  <tr>
                    <td style={emptyTd} colSpan={6}>
                      No summary data found. Please complete previous steps first.
                    </td>
                  </tr>
                ) : (
                  summaryGroups.map((group) =>
                    group.routingRows.map((row, index) => (
                      <tr
                        key={row.key}
                        style={{ borderTop: "1px solid #e5e7eb" }}
                      >
                        {index === 0 ? (
                          <>
                            <td style={td}>{group.producedItem}</td>
                            <td style={td}>{group.description}</td>
                            <td style={td}>{group.location}</td>
                            <td style={td}>{group.bomId}</td>
                          </>
                        ) : (
                          <>
                            <td style={td}></td>
                            <td style={td}></td>
                            <td style={td}></td>
                            <td style={td}></td>
                          </>
                        )}

                        <td style={td}>{row.routingId}</td>

                        <td style={td}>
                          <input
                            type="number"
                            min="1"
                            value={
                              priorityMap[row.routingId] ?? row.defaultPriority
                            }
                            onChange={(e) =>
                              handlePriorityChange(
                                row.routingId,
                                e.target.value
                              )
                            }
                            style={priorityInput}
                          />
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (Optional)"
            style={{
              width: "100%",
              minHeight: 110,
              borderRadius: 4,
              border: "1px solid #cfd4dc",
              padding: 14,
              fontSize: 14,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              background: "#ffffff",
            }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          {topLevelError ? (
            <div style={errorCard}>
              <div style={resultTitle}>Validation Error</div>
              <div style={errorText}>{topLevelError}</div>
            </div>
          ) : null}

          {validationEntries.length > 0 ? (
            <div style={errorCard}>
              <div style={resultTitle}>Validation Errors</div>

              <div
                style={{
                  overflowX: "auto",
                  background: "#ffffff",
                  border: "1px solid #f3d0d0",
                  borderRadius: 6,
                  marginTop: 12,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#fee2e2" }}>
                    <tr>
                      <th style={errorTh}>Validation Sequence</th>
                      <th style={errorTh}>Validation Description</th>
                      <th style={errorTh}>Error Details</th>
                      <th style={errorTh}>Remediation Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationEntries.map((entry, index) => (
                      <tr
                        key={`${entry.code}-${index}`}
                        style={{ borderTop: "1px solid #f3d0d0" }}
                      >
                        <td style={errorTd}>{entry.code}</td>
                        <td style={errorTd}>{entry.desc || "-"}</td>
                        <td style={errorTd}>{entry.error || "-"}</td>
                        <td style={errorTd}>{entry.rm || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {isSuccess ? (
            <div style={successCard}>
              <div style={resultTitle}>Validation Success</div>
              <div style={successText}>
                Validation completed successfully. No validation errors found.
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            onClick={submitBOMs}
            disabled={submitting || summaryGroups.length === 0}
            style={{
              background: "#2e7d32",
              color: "#fff",
              padding: "14px 26px",
              borderRadius: 4,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor:
                submitting || summaryGroups.length === 0
                  ? "not-allowed"
                  : "pointer",
              opacity: submitting || summaryGroups.length === 0 ? 0.7 : 1,
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          >
            {submitting ? "Submitting..." : "✓ SUBMIT & CREATE BOM(S)"}
          </button>
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 13,
  fontWeight: 500,
  color: "#111827",
  whiteSpace: "nowrap",
};

const td = {
  padding: "14px 16px",
  fontSize: 14,
  color: "#111827",
  verticalAlign: "middle",
};

const emptyTd = {
  padding: "18px 16px",
  fontSize: 14,
  color: "#6b7280",
  textAlign: "center",
};

const priorityInput = {
  width: 160,
  height: 30,
  border: "1px solid #cfd4dc",
  borderRadius: 3,
  padding: "0 10px",
  fontSize: 14,
  outline: "none",
  background: "#ffffff",
  boxSizing: "border-box",
};

const resultTitle = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 10,
};

const errorCard = {
  background: "#fff5f5",
  border: "1px solid #fecaca",
  borderRadius: 6,
  padding: 16,
};

const successCard = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: 6,
  padding: 16,
};

const errorText = {
  fontSize: 14,
  color: "#991b1b",
  whiteSpace: "pre-wrap",
};

const successText = {
  fontSize: 14,
  color: "#166534",
  whiteSpace: "pre-wrap",
};

const errorTh = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: 700,
  color: "#7f1d1d",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const errorTd = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#111827",
  verticalAlign: "top",
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
};
