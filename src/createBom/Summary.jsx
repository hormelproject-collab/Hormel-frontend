import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCreateBomFlowState } from "../redux/bomSlice";
import axios from "axios";
import { layout } from "../styles/layout";

const VALIDATE_URL = "/api/bom-explosion";

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
  producedItem?.description ??
  producedItem?.desc ??
  producedItem?.item_description ??
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

  const fallbackArray =
    validationResult?.validationErrors ??
    validationResult?.errors ??
    validationResult?.data?.validationErrors ??
    validationResult?.data?.errors;

  if (Array.isArray(fallbackArray)) {
    fallbackArray.forEach((entry, index) => pushEntry(entry, index));
  }

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

const normalizeNonEmptyComponentItems = (rows) =>
  (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row?.componentItem ?? "").trim() !== ""
  );

const normalizeNonEmptyCoProducts = (rows) =>
  (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row?.coProductItem ?? "").trim() !== ""
  );

const calculateAggregateStandardUsage = (rows) => {
  const total = (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    const value = Number(row?.standardUsage);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return total.toFixed(4);
};

const getSuccessEcNumber = (validationResult, previousState) => {
  return (
    validationResult?.engineeringChangeId ??
    validationResult?.engineering_change_id ??
    validationResult?.ecNumber ??
    validationResult?.ec_number ??
    validationResult?.data?.engineeringChangeId ??
    validationResult?.data?.engineering_change_id ??
    validationResult?.data?.ecNumber ??
    validationResult?.data?.ec_number ??
    validationResult?.result?.engineeringChangeId ??
    validationResult?.result?.ecNumber ??
    previousState?.engineeringChange?.ecNumber ??
    previousState?.ecNumber ??
    previousState?.engChangeId ??
    ""
  );
};

const buildDuplicatePriorityValidationEntries = (summaryGroups, priorityMap) => {
  const errors = [];

  summaryGroups.forEach((group) => {
    const routingRows = Array.isArray(group.routingRows) ? group.routingRows : [];

    const normalized = routingRows
      .filter((row) => row.routingId && row.routingId !== "-")
      .map((row) => {
        const rawPriority = String(priorityMap[row.routingId] ?? "").trim();

        return {
          routingId: row.routingId,
          resource: row.resource ?? "",
          priorityText: rawPriority,
          priority: Number(rawPriority),
        };
      })
      .filter(
        (row) =>
          row.priorityText !== "" &&
          Number.isFinite(row.priority)
      );

    const byPriority = new Map();

    normalized.forEach((row) => {
      if (!byPriority.has(row.priority)) {
        byPriority.set(row.priority, []);
      }
      byPriority.get(row.priority).push(row);
    });

    for (const [priority, rows] of byPriority.entries()) {
      if (rows.length > 1) {
        errors.push({
          code: "1020",
          desc: "Check duplicate priority",
          error: `Duplicate priority ${priority} found for BOM ID "${group.bomId}" / Item "${group.producedItem}" at Location "${group.location}".`,
          rm: "Assign different routing priorities for each resource within the same BOM ID.",
        });
      }
    }
  });

  return errors;
};

export default function SummaryPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [notes, setNotes] = useState("");
  const [priorityMap, setPriorityMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [expandedMap, setExpandedMap] = useState({});

  const flow = routerLocation?.state?.flow ?? "";
  const producedItems = routerLocation?.state?.producedItems ?? [];
  const locations = routerLocation?.state?.locations ?? [];
  const resourceComponentConfigs =
    routerLocation?.state?.resourceComponentConfigs ?? {};
  const resourceOptionsByKey = routerLocation?.state?.resourceOptionsByKey ?? {};
  const summaryConfigSnapshot = routerLocation?.state?.summaryConfigSnapshot ?? [];
  const previousState = routerLocation?.state?.previousState ?? {};
  const selectedBom = routerLocation?.state?.selectedBom ?? null;
  const modifiedBomData = routerLocation?.state?.modifiedBomData ?? null;

  const summaryGroups = useMemo(() => {
    if (flow === "modify-existing-bom" && modifiedBomData) {
      const generatedRoutingRows = Array.isArray(modifiedBomData.generatedRoutingRows)
        ? modifiedBomData.generatedRoutingRows
        : [];

      const components = Array.isArray(modifiedBomData.componentItems)
        ? modifiedBomData.componentItems
        : [];

      const coproducts = Array.isArray(modifiedBomData.coProducts)
        ? modifiedBomData.coProducts
        : [];

      const routingRows = generatedRoutingRows.map((row, index) => ({
        key: `${modifiedBomData.newBomId ?? modifiedBomData.originalBomId ?? "bom"
          }__${row.routingId ?? index}`,
        resource: row.resource ?? "",
        resourceRelevancy: row.resourceRelevancy ?? "",
        routingId:
          row.routingId ??
          buildRoutingId(
            modifiedBomData.producedItem ?? "",
            modifiedBomData.location ?? "",
            row.resource ?? ""
          ),
        defaultPriority: index + 1,
      }));

      return [
        {
          key:
            modifiedBomData.newBomId ??
            modifiedBomData.originalBomId ??
            `${modifiedBomData.producedItem ?? ""}__${modifiedBomData.location ?? ""
            }`,
          producedItem:
            modifiedBomData.producedItem ?? selectedBom?.produced_item ?? "-",
          description:
            modifiedBomData.producedItemDescription ??
            selectedBom?.produced_item_desc ??
            "",
          location: modifiedBomData.location ?? selectedBom?.location ?? "-",
          locationId: modifiedBomData.location ?? selectedBom?.location ?? "",
          locationStatus:
            selectedBom?.raw?.location_status ?? selectedBom?.raw?.status ?? "",
          bomVersion: modifiedBomData.bomVersion ?? "PRIMARY",
          bomId:
            modifiedBomData.newBomId ??
            buildBomId(
              modifiedBomData.bomVersion ?? "PRIMARY",
              modifiedBomData.producedItem ?? selectedBom?.produced_item ?? "",
              modifiedBomData.location ?? selectedBom?.location ?? ""
            ),
          originalBomId: modifiedBomData.originalBomId ?? selectedBom?.bom_id ?? "",
          producedItemData: {
            item: modifiedBomData.producedItem ?? selectedBom?.produced_item ?? "",
            description:
              modifiedBomData.producedItemDescription ??
              selectedBom?.produced_item_desc ??
              "",
            releaseFlag:
              modifiedBomData.itemReleaseFlag ??
              selectedBom?.item_release_flag ??
              "",
            status: selectedBom?.raw?.item_status ?? selectedBom?.raw?.status ?? "",
          },
          locationData: {
            location: modifiedBomData.location ?? selectedBom?.location ?? "",
            name: modifiedBomData.location ?? selectedBom?.location ?? "",
            status:
              selectedBom?.raw?.location_status ?? selectedBom?.raw?.status ?? "",
          },
          config: {
            resources: Array.isArray(modifiedBomData.selectedResources)
              ? modifiedBomData.selectedResources
              : [],
            components,
            coproducts,
            producedCoProduct: !!modifiedBomData.producedCoProduct,
            noComponentItems:
              normalizeNonEmptyComponentItems(components).length === 0,
            replicateToAll: false,
          },
          routingRows,
          isModifyFlow: true,
        },
      ];
    }

    if (Array.isArray(summaryConfigSnapshot) && summaryConfigSnapshot.length > 0) {
      return summaryConfigSnapshot.map((entry) => ({
        key: entry.key,
        producedItem: entry.producedItem ?? "-",
        description: entry.producedItemDescription ?? "",
        location: entry.locationName ?? entry.location ?? "-",
        locationId: entry.location ?? "",
        locationStatus: "",
        bomVersion: entry.bomVersion ?? "PRIMARY",
        bomId: entry.bomId ?? "",
        originalBomId: "",
        producedItemData: {
          item: entry.producedItem ?? "",
          description: entry.producedItemDescription ?? "",
          releaseFlag: "",
          status: "",
        },
        locationData: {
          location: entry.location ?? "",
          name: entry.locationName ?? entry.location ?? "",
          status: "",
        },
        config: {
          resources: Array.isArray(entry.selectedResources)
            ? entry.selectedResources
            : [],
          components: Array.isArray(entry.components) ? entry.components : [],
          coproducts: Array.isArray(entry.coproducts) ? entry.coproducts : [],
          producedCoProduct: !!entry.producedCoProduct,
          noComponentItems: !!entry.noComponentItems,
          replicateToAll: !!entry.replicateToAll,
        },
        routingRows: Array.isArray(entry.generatedRoutingRows)
          ? entry.generatedRoutingRows.map((row, index) => ({
            key: `${entry.key}__${row.routingId ?? index}`,
            resource: row.resource ?? "",
            resourceRelevancy: row.resourceRelevancy ?? "",
            routingId:
              row.routingId ??
              buildRoutingId(
                entry.producedItem ?? "",
                entry.location ?? "",
                row.resource ?? ""
              ),
            defaultPriority: index + 1,
          }))
          : [],
        isModifyFlow: false,
      }));
    }

    const groups = [];

    producedItems.forEach((item) => {
      locations.forEach((loc) => {
        const key = buildConfigKey(item.item, loc.location);
        const config = resourceComponentConfigs[key];
        if (!config) return;

        const selectedResources = Array.isArray(config.resources)
          ? config.resources
          : [];
        const resourceOptions = resourceOptionsByKey[key] ?? [];
        const resourceMap = new Map(
          resourceOptions.map((row) => [String(row.resource), row])
        );

        const bomVersion = config.bomVersion ?? "PRIMARY";
        const bomId = buildBomId(bomVersion, item.item, loc.location);

        const routingRows = selectedResources.map((resource, index) => {
          const option = resourceMap.get(String(resource)) ?? {};
          return {
            key: `${key}__${resource}`,
            resource,
            resourceRelevancy:
              option.resourceRelevancy ?? option.resource_relevancy ?? "",
            routingId: buildRoutingId(item.item, loc.location, resource),
            defaultPriority: index + 1,
          };
        });

        groups.push({
          key,
          producedItem: item.item ?? item.id ?? "-",
          description: getProducedDescription(item),
          location: loc.name ?? loc.location_description ?? loc.location ?? "-",
          locationId: loc.location ?? "",
          locationStatus: loc.status ?? loc.location_status ?? "",
          bomVersion,
          bomId,
          originalBomId: "",
          producedItemData: item,
          locationData: loc,
          config,
          routingRows,
          isModifyFlow: false,
        });
      });
    });

    return groups;
  }, [
    flow,
    modifiedBomData,
    selectedBom,
    producedItems,
    locations,
    resourceComponentConfigs,
    resourceOptionsByKey,
    summaryConfigSnapshot,
  ]);

  useEffect(() => {
    setPriorityMap((prev) => {
      const nextPriorityMap = {};

      summaryGroups.forEach((group) => {
        group.routingRows.forEach((row) => {
          if (!row.routingId || row.routingId === "-") return;

          nextPriorityMap[row.routingId] =
            prev[row.routingId] !== undefined
              ? prev[row.routingId]
              : String(row.defaultPriority ?? 1);
        });
      });

      if (shallowEqualObject(prev, nextPriorityMap)) {
        return prev;
      }

      return nextPriorityMap;
    });
  }, [summaryGroups]);

  useEffect(() => {
    setExpandedMap((prev) => {
      const next = { ...prev };

      summaryGroups.forEach((group) => {
        if (typeof next[group.key] === "undefined") {
          next[group.key] = true;
        }
      });

      Object.keys(next).forEach((key) => {
        if (!summaryGroups.some((group) => group.key === key)) {
          delete next[key];
        }
      });

      if (shallowEqualObject(prev, next)) {
        return prev;
      }

      return next;
    });
  }, [summaryGroups]);

  const actualPayload = useMemo(() => {
    return summaryGroups.map((group) => {
      const config = group.config ?? {};
      const components = Array.isArray(config.components) ? config.components : [];
      const coproducts = Array.isArray(config.coproducts) ? config.coproducts : [];

      return {
        bomId: group.bomId,
        engineeringChange: {
          ecNumber:
            previousState?.engineeringChange?.ecNumber ??
            previousState?.ecNumber ??
            previousState?.engChangeId ??
            "",
          creationDate:
            previousState?.engineeringChange?.creationDate ??
            previousState?.creationDate ??
            new Date().toISOString().slice(0, 10),
        },
        producedItem: {
          item:
            group.producedItemData?.item ??
            group.producedItemData?.id ??
            group.producedItem,
          description:
            group.producedItemData?.description ??
            getProducedDescription(group.producedItemData),
          status:
            group.producedItemData?.status ??
            group.producedItemData?.item_status ??
            "",
          releaseFlag:
            group.producedItemData?.releaseFlag ??
            group.producedItemData?.item_releaseflag ??
            group.producedItemData?.item_release_flag ??
            "",
        },
        locations: [
          {
            locationId: group.locationId,
            locationName:
              group.locationData?.name ??
              group.locationData?.location_description ??
              group.location,
            locationStatus:
              group.locationData?.status ??
              group.locationData?.location_status ??
              "",
            resourceInfo: group.routingRows.map((row) => ({
              resource: row.resource,
              resourceRelevancy: row.resourceRelevancy ?? "",
              bomVersion: group.bomVersion,
              routingId: row.routingId,
              priority: Number(
                priorityMap[row.routingId] ?? row.defaultPriority ?? 1
              ),
              // Original produced item should remain blank in item_bom_routing.
              // Co-product routing rows will be inserted separately in backend with association = 1.
              coProductAssociation: null,
            })),
            componentItems: config.noComponentItems
              ? []
              : normalizeNonEmptyComponentItems(components).map((row) => ({
                componentItem: row.componentItem,
                description: row.description ?? "",
                standardUsage: toNumberOrNull(row.standardUsage),
              })),
            coProducts: normalizeNonEmptyCoProducts(coproducts).map((row) => ({
              coProductItem: row.coProductItem,
              description: row.description ?? "",
              qtyProducedPer: toNumberOrNull(
                row.qtyProduced ?? row.qtyProducedPer
              ),
            })),
            flags: {
              isCoProduct: !!config.producedCoProduct,
              noComponentItems: !!config.noComponentItems,
              replicateForAllLocations: !!config.replicateToAll,
            },
          },
        ],
        notes: notes ?? "",
      };
    });
  }, [summaryGroups, priorityMap, previousState, notes]);

  const validationEntries = useMemo(() => {
    return normalizeValidationEntries(validationResult);
  }, [validationResult]);

  const responseStatus = String(validationResult?.status || "").toLowerCase();
  const responseSuccessFlag = validationResult?.success === true;
  const responseFailureFlag =
    validationResult?.success === false ||
    responseStatus === "failure" ||
    responseStatus === "failed" ||
    responseStatus === "error";

  const validationFailed = validationEntries.length > 0;

  const recordsNotPushed =
    !!validationResult &&
    !validationFailed &&
    responseFailureFlag &&
    (responseStatus === "failure" ||
      responseStatus === "failed" ||
      responseStatus === "error");

  const topLevelError = recordsNotPushed
    ? validationResult?.messageForUser ||
      validationResult?.message ||
      validationResult?.error ||
      "Validation was successful but the records are not yet pushed to PostgreSQL table."
    : !validationFailed
      ? validationResult?.error ?? validationResult?.data?.error ?? ""
      : "";

  const isSuccess =
    !!validationResult &&
    !validationFailed &&
    !recordsNotPushed &&
    !topLevelError &&
    (responseSuccessFlag || responseStatus === "success");

  const successEcNumber = useMemo(() => {
    return getSuccessEcNumber(validationResult, previousState);
  }, [validationResult, previousState]);
  const shallowEqualObject = (obj1, obj2) => {
    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});

    if (keys1.length !== keys2.length) return false;

    return keys1.every((key) => obj1[key] === obj2[key]);
  };
  const handlePriorityChange = (routingId, value) => {
    setPriorityMap((prev) => ({
      ...prev,
      [routingId]: value,
    }));
  };

  const isSubmitResponseSuccessful = (result) => {
    const status = String(result?.status || "").toLowerCase();
    const explicitSuccess = result?.success === true || status === "success";
    const explicitFailure =
      result?.success === false ||
      status === "failure" ||
      status === "failed" ||
      status === "error";
    const responseValidationEntries = normalizeValidationEntries(result);
    const responseTopLevelError =
      result?.error ??
      result?.messageForUser ??
      (explicitFailure ? result?.message : "") ??
      result?.data?.error ??
      "";

    return explicitSuccess && !explicitFailure && !responseTopLevelError && responseValidationEntries.length === 0;
  };

  const toggleExpanded = (groupKey) => {
    setExpandedMap((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };
  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const submitBOMs = async () => {
    if (actualPayload.length === 0) {
      setValidationResult({
        error: "No summary rows available to validate.",
      });
      return;
    }

    const duplicatePriorityErrors = buildDuplicatePriorityValidationEntries(
      summaryGroups,
      priorityMap
    );

    if (duplicatePriorityErrors.length > 0) {
      setValidationResult({
        validationErrors: duplicatePriorityErrors,
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
      const result = response.data;
      setValidationResult(result);

      if (isSubmitResponseSuccessful(result)) {
        dispatch(clearCreateBomFlowState());
      }
    } catch (err) {
      const serverData = err?.response?.data;
      setValidationResult(
        serverData ?? {
          error: err?.message ?? "Failed to validate BOM payload.",
        }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.page}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.h1}>Step 4: New BOM Summary & Routing Priority</h1>
        <p style={styles.sub}>Review the BOM records to be created</p>

        <div style={styles.card}>
          <div style={styles.sectionHeading}>Main Summary Table</div>

          {summaryGroups.length === 0 ? (
            <div style={styles.emptyState}>
              No summary data found. Please complete previous steps first.
            </div>
          ) : (
            <>
              <div style={styles.mainTableHeader}>
                <div />
                <div style={styles.tableHeaderCell}>Produced Item</div>
                <div style={styles.tableHeaderCell}>Item Description</div>
                <div style={styles.tableHeaderCell}>Location</div>
                <div style={styles.tableHeaderCell}>BOM ID</div>
                <div style={styles.tableHeaderCell}>Routing ID</div>
                <div style={styles.tableHeaderCell}>Item BOM Routing Priority</div>
              </div>

              {summaryGroups.map((group) => {
                const componentRows = normalizeNonEmptyComponentItems(
                  group.config?.components
                );
                const coProductRows = normalizeNonEmptyCoProducts(
                  group.config?.coproducts
                );
                const aggregateStandardUsage =
                  calculateAggregateStandardUsage(componentRows);
                const isExpanded = !!expandedMap[group.key];
                const routingRows =
                  group.routingRows.length > 0
                    ? group.routingRows
                    : [
                      {
                        key: `${group.key}__NOROUTING`,
                        routingId: "-",
                        defaultPriority: 1,
                        resource: "",
                        resourceRelevancy: "",
                      },
                    ];

                return (
                  <div key={group.key} style={styles.summaryCard}>
                    <div style={styles.summaryHeaderRow}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.key)}
                        style={styles.chevronBtn}
                        aria-label={
                          isExpanded ? "Collapse details" : "Expand details"
                        }
                      >
                        <span
                          style={{
                            ...styles.chevron,
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                        >
                          ▾
                        </span>
                      </button>

                      <div style={styles.headerCellProduced}>
                        <div style={styles.headerValue}>
                          {group.producedItem || "-"}
                        </div>
                      </div>

                      <div style={styles.headerCellDescription}>
                        <div style={styles.headerValue}>
                          {group.description || "-"}
                        </div>
                      </div>

                      <div style={styles.headerCellLocation}>
                        <div style={styles.headerValue}>{group.location || "-"}</div>
                      </div>

                      <div style={styles.headerCellBom}>
                        <div style={styles.headerValue}>{group.bomId || "-"}</div>
                      </div>

                      <div style={styles.headerCellRouting}>
                        <div style={styles.routingListWrap}>
                          {routingRows.map((row) => (
                            <div key={row.key} style={styles.routingLine}>
                              <div style={styles.headerValue}>
                                {row.routingId || "-"}
                              </div>

                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={styles.headerCellPriority}>
                        <div style={styles.priorityListWrap}>
                          {routingRows.map((row) =>
                            row.routingId === "-" ? (
                              <div key={row.key} style={styles.priorityLine}>
                                <span style={styles.mutedText}>-</span>
                              </div>
                            ) : (
                              <div key={row.key} style={styles.priorityLine}>

                                <input
                                  type="text"
                                  value={priorityMap[row.routingId] ?? ""}
                                  onChange={(e) =>
                                    handlePriorityChange(row.routingId, e.target.value)
                                  }
                                  style={styles.priorityInput}
                                />

                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div style={styles.expandArea}>
                        <div style={styles.detailSection}>
                          <div style={styles.detailLabel}>Component Items:</div>
                          <div style={styles.innerTableWrap}>
                            <table style={styles.innerTable}>
                              <thead>
                                <tr style={styles.componentHeaderRow}>
                                  <th style={styles.innerTh}>Component Item</th>
                                  <th style={styles.innerTh}>Item Description</th>
                                  <th style={styles.innerTh}>Standard Usage</th>
                                </tr>
                              </thead>
                              <tbody>
                                {componentRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={3} style={styles.innerEmptyTd}>
                                      No component items added.
                                    </td>
                                  </tr>
                                ) : (
                                  componentRows.map((componentRow) => (
                                    <tr
                                      key={
                                        componentRow.id ??
                                        `${group.key}-${componentRow.componentItem}`
                                      }
                                      style={styles.innerBodyRow}
                                    >
                                      <td style={styles.innerTd}>
                                        {componentRow.componentItem || "-"}
                                      </td>
                                      <td style={styles.innerTd}>
                                        {componentRow.description || "-"}
                                      </td>
                                      <td style={styles.innerTd}>
                                        {componentRow.standardUsage === "" ||
                                          componentRow.standardUsage === null ||
                                          componentRow.standardUsage === undefined
                                          ? "-"
                                          : componentRow.standardUsage}
                                      </td>
                                    </tr>
                                  ))
                                )}
                                <tr style={styles.aggregateRow}>
                                  <td
                                    style={{
                                      ...styles.innerTd,
                                      ...styles.aggregateLabelCell,
                                    }}
                                    colSpan={2}
                                  >
                                    Aggregate Standard Usage
                                  </td>
                                  <td
                                    style={{
                                      ...styles.innerTd,
                                      ...styles.aggregateValueCell,
                                    }}
                                  >
                                    {aggregateStandardUsage}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={styles.detailSection}>
                          <div style={styles.detailLabel}>Co-Products:</div>
                          <div style={styles.innerTableWrap}>
                            <table style={styles.innerTable}>
                              <thead>
                                <tr style={styles.coProductHeaderRow}>
                                  <th style={styles.innerTh}>Co-Product Item</th>
                                  <th style={styles.innerTh}>Item Description</th>
                                  <th style={styles.innerTh}>
                                    Co-Product Quantity Produced Per
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {coProductRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={3} style={styles.innerEmptyTd}>
                                      No co-product items added.
                                    </td>
                                  </tr>
                                ) : (
                                  coProductRows.map((coProductRow) => (
                                    <tr
                                      key={
                                        coProductRow.id ??
                                        `${group.key}-${coProductRow.coProductItem}`
                                      }
                                      style={styles.innerBodyRow}
                                    >
                                      <td style={styles.innerTd}>
                                        {coProductRow.coProductItem || "-"}
                                      </td>
                                      <td style={styles.innerTd}>
                                        {coProductRow.description || "-"}
                                      </td>
                                      <td style={styles.innerTd}>
                                        {coProductRow.qtyProduced === "" ||
                                          coProductRow.qtyProduced === null ||
                                          coProductRow.qtyProduced === undefined
                                          ? coProductRow.qtyProducedPer === "" ||
                                            coProductRow.qtyProducedPer === null ||
                                            coProductRow.qtyProducedPer ===
                                            undefined
                                            ? "-"
                                            : coProductRow.qtyProducedPer
                                          : coProductRow.qtyProduced}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionHeading}>Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (Optional)"
            style={styles.notes}
          />
        </div>

        {validationFailed ? (
          <div style={styles.errorCard}>
            <div style={styles.resultTitle}>Validation Errors</div>
            <div style={styles.validationTableWrap}>
              <table style={styles.validationTable}>
                <thead>
                  <tr style={styles.validationHeaderRow}>
                    <th style={styles.validationTh}>Validation Sequence</th>
                    <th style={styles.validationTh}>Validation Description</th>
                    <th style={styles.validationTh}>Error Details</th>
                    <th style={styles.validationTh}>Remediation Message</th>
                  </tr>
                </thead>
                <tbody>
                  {validationEntries.map((entry, index) => (
                    <tr
                      key={`${entry.code}-${index}`}
                      style={styles.validationBodyRow}
                    >
                      <td style={styles.validationTd}>{entry.code}</td>
                      <td style={styles.validationTd}>{entry.desc ?? "-"}</td>
                      <td style={styles.validationTd}>{entry.error ?? "-"}</td>
                      <td style={styles.validationTd}>{entry.rm ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : recordsNotPushed ? (
          <div style={styles.errorCard}>
            <div style={styles.resultTitle}>Validation Success - Records Not Pushed</div>
            <div style={styles.errorText}>{topLevelError}</div>
          </div>
        ) : isSuccess ? (
          <div style={styles.successCard}>
            <div style={styles.resultTitle}>Validation Success</div>
            <div style={styles.successText}>
              {`Validation was successful and the records are saved successfully${successEcNumber ? ` with ${successEcNumber}.` : "."}`}
            </div>
          </div>
        ) : topLevelError ? (
          <div style={styles.errorCard}>
            <div style={styles.resultTitle}>Validation Error</div>
            <div style={styles.errorText}>{topLevelError}</div>
          </div>
        ) : null}

        <div style={styles.bottomBar}>
          <button
            type="button"
            onClick={handleReturnToMainMenu}
            style={styles.mainMenuButton}
          >
            <span style={{ fontSize: "13px" }}>⌂</span>
            <span>RETURN TO MAIN MENU</span>
          </button>

          <button
            onClick={submitBOMs}
            disabled={submitting || summaryGroups.length === 0}
            style={{
              ...styles.submitBtn,
              ...(submitting || summaryGroups.length === 0
                ? styles.submitBtnDisabled
                : {}),
            }}
          >
            {submitting ? "Submitting..." : "✓ SUBMIT & CREATE BOM(S)"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageBg: {
    ...layout.page,
    background: "#f5f6f8",
    minHeight: "100vh",
  },
  page: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: 24,
    boxSizing: "border-box",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: 12,
    width: "fit-content",
    fontSize: 14,
    fontWeight: 500,
  },
  h1: {
    margin: "0 0 6px 0",
    fontSize: 32,
    lineHeight: "40px",
    fontWeight: 700,
    color: "#111827",
  },
  sub: {
    margin: "0 0 20px 0",
    color: "#6b7280",
    fontSize: 14,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d7dbe2",
    borderRadius: 4,
    padding: 0,
    marginBottom: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    padding: "18px 18px 12px 18px",
  },
  emptyState: {
    padding: "18px",
    fontSize: 14,
    color: "#6b7280",
  },
  mainTableHeader: {
    display: "grid",
    gridTemplateColumns: "34px 1.1fr 1.1fr 0.9fr 1.35fr 1.9fr 170px",
    alignItems: "center",
    columnGap: 12,
    padding: "12px 16px",
    minHeight: 44,
    background: "#f3f4f6",
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e5e7eb",
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    lineHeight: 1.4,
  },
  summaryCard: {
    borderTop: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  summaryHeaderRow: {
    display: "grid",
    gridTemplateColumns: "34px 1.1fr 1.1fr 0.9fr 1.35fr 1.9fr 170px",
    alignItems: "stretch",
    columnGap: 12,
    padding: "14px 16px",
    minHeight: 58,
  },
  chevronBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    marginTop: 6,
  },
  chevron: {
    fontSize: 15,
    color: "#6b7280",
    transition: "transform 0.2s ease",
    display: "inline-block",
    lineHeight: 1,
  },
  headerCellProduced: {
    minWidth: 0,
    display: "flex",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  headerCellDescription: {
    minWidth: 0,
    display: "flex",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  headerCellLocation: {
    minWidth: 0,
    display: "flex",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  headerCellBom: {
    minWidth: 0,
    display: "flex",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  headerCellRouting: {
    minWidth: 0,
  },
  headerCellPriority: {
    minWidth: 0,
  },
  headerValue: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  routingListWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  routingLine: {
    padding: "2px 0",
  },
  routingMetaText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  priorityListWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  priorityLine: {
    minHeight: 36,
    display: "flex",
    alignItems: "center",
  },
  expandArea: {
    padding: "0 16px 16px 52px",
    background: "#fafafa",
    borderTop: "1px solid #eceff3",
  },
  detailSection: {
    marginTop: 14,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 8,
  },
  innerTableWrap: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 2,
    background: "#ffffff",
  },
  innerTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  componentHeaderRow: {
    background: "#dbeafe",
  },
  coProductHeaderRow: {
    background: "#d1fae5",
  },
  innerBodyRow: {
    borderTop: "1px solid #e5e7eb",
  },
  innerTh: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
  },
  innerTd: {
    padding: "10px 12px",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "top",
  },
  innerEmptyTd: {
    padding: 14,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  aggregateRow: {
    borderTop: "1px solid #d8dee8",
    background: "#eff6ff",
  },
  aggregateLabelCell: {
    fontWeight: 700,
  },
  aggregateValueCell: {
    fontWeight: 700,
  },
  priorityInput: {
    width: 132,
    height: 32,
    border: "1px solid #cfd4dc",
    borderRadius: 3,
    padding: "0 10px",
    fontSize: 14,
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  mutedText: {
    color: "#6b7280",
  },
  notes: {
    width: "calc(100% - 36px)",
    minHeight: 110,
    borderRadius: 4,
    border: "1px solid #cfd4dc",
    padding: 14,
    fontSize: 14,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
    margin: "0 18px 18px 18px",
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
  },
  errorCard: {
    background: "#fff5f5",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  successCard: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#991b1b",
    whiteSpace: "pre-wrap",
  },
  successText: {
    fontSize: 14,
    color: "#166534",
    whiteSpace: "pre-wrap",
  },
  validationTableWrap: {
    overflowX: "auto",
    border: "1px solid #f3d0d0",
    borderRadius: 4,
    background: "#ffffff",
    marginTop: 12,
  },
  validationTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  validationHeaderRow: {
    background: "#fee2e2",
  },
  validationBodyRow: {
    borderTop: "1px solid #f3d0d0",
  },
  validationTh: {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "#7f1d1d",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  validationTd: {
    padding: "12px 14px",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "top",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  }, mainMenuButton: {
    height: "46px",
    border: "1px solid #6da0e1",
    borderRadius: "4px",
    background: "#ffffff",
    color: "#1e63b5",
    fontSize: "13px",
    fontWeight: 600,
    padding: "0 16px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  }, secondaryBtn: {
    border: "1px solid #6da0e1",
    borderRadius: "3px",
    height: "28px",
    padding: "0 12px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#1e63b5",
    background: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  bottomBar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  submitBtn: {
    background: "#2e7d32",
    color: "#ffffff",
    padding: "14px 26px",
    borderRadius: 4,
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
};