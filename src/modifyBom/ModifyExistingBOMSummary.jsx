import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearModifyExistingBomState,
  clearModifyExistingBomFlowState,
} from "../redux/bomSlice";

const toText = (value) => String(value ?? "").trim();

const toNumberOrEmpty = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  return Number.isFinite(num) ? num : "";
};

const toNumberOrZero = (value) => {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
};

const getResourceFromRoutingId = (routingId) => {
  const parts = String(routingId || "")
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 3 ? parts.slice(2).join("_") : "";
};

const buildRoutingId = (producedItem, resource) => {
  const cleanProducedItem = toText(producedItem);
  const cleanResource = toText(resource);

  if (!cleanProducedItem || !cleanResource) return "";

  return `ROUTING_${cleanProducedItem}_${cleanResource}`;
};

const getComponentItem = (item) =>
  toText(item?.component_item || item?.componentItem || item?.item || "");

const getComponentDescription = (item) =>
  toText(
    item?.component_desc ||
      item?.componentDesc ||
      item?.item_desc ||
      item?.item_description ||
      item?.description ||
      item?.desc ||
      ""
  );

const getComponentStandardUsage = (item) =>
  item?.standard_usage ??
  item?.standardUsage ??
  item?.erp_bom_quantity_consumed_per ??
  item?.qtyConsumedPer ??
  "";

const getCoProductItem = (item) =>
  toText(item?.item || item?.coProductItem || item?.co_product_item || "");

const getCoProductDescription = (item) =>
  toText(
    item?.desc ||
      item?.description ||
      item?.item_desc ||
      item?.item_description ||
      item?.component_desc ||
      ""
  );

const getCoProductQty = (item) =>
  item?.qty ??
  item?.qtyProduced ??
  item?.standardUsage ??
  item?.standard_usage ??
  item?.qty_produced_per ??
  item?.erp_bom_qty_produced_per ??
  "";

const getCoProductPriority = (item) =>
  item?.itemBomRoutingPriority ??
  item?.item_bom_routing_priority ??
  item?.erp_item_bom_routing_priority ??
  "";

const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(6).replace(/\.?0+$/, "");
};

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
    output.push({ code, desc, error, rm });
  };

  const manualErrorList = Array.isArray(validationResult?.errorList)
    ? validationResult.errorList
    : Array.isArray(validationResult?.data?.errorList)
      ? validationResult.data.errorList
      : [];

  if (manualErrorList.length > 0) {
    manualErrorList.forEach((row, rowIndex) => {
      const messages = Array.isArray(row?.messages) ? row.messages : [];
      if (messages.length) {
        messages.forEach((msg, msgIndex) => pushEntry(msg, `${rowIndex}-${msgIndex}`, row));
      } else {
        pushEntry(row, rowIndex);
      }
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
  if (fallbackArray && !Array.isArray(fallbackArray) && typeof fallbackArray === "object") {
    Object.entries(fallbackArray).forEach(([code, entry], index) => {
      pushEntry({ code, ...entry }, index);
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

const ModifyExistingBOMSummary = () => {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [notes, setNotes] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  const record = routerLocation?.state?.record ?? {};
  const componentItems = routerLocation?.state?.componentItems ?? [];
  const coProducts = routerLocation?.state?.coProducts ?? [];
  const removedComponentItems = routerLocation?.state?.removedComponentItems ?? [];
  const removedCoProducts = routerLocation?.state?.removedCoProducts ?? [];
  const initialComponentItemsFromState = routerLocation?.state?.initialComponentItems ?? [];
  const initialCoProductsFromState = routerLocation?.state?.initialCoProducts ?? [];

  const producedItem = toText(record?.produced_item || record?.producedItem || record?.item || "");
  const selectedLocation = toText(record?.location || record?.Location || "");
  const selectedResource =
    toText(record?.resource || record?.Resource || "") ||
    getResourceFromRoutingId(record?.routing_id || record?.routingId);

  const resolvedRoutingId = useMemo(() => {
    const directRoutingId =
      toText(record?.routing_id || record?.routingId || record?.resourceInfo?.routingId || record?.resourceInfo?.routing_id);

    if (directRoutingId) return directRoutingId;

    return buildRoutingId(producedItem, selectedResource);
  }, [record, producedItem, selectedResource]);

  const resolvedCreationDate = useMemo(() => {
    return (
      record?.creation_date ||
      record?.creationDate ||
      record?.load_datetime ||
      record?.change_date ||
      ""
    );
  }, [record]);

  const aggregateStandardUsage = useMemo(() => {
    return (componentItems || []).reduce((sum, item) => {
      return sum + toNumberOrZero(getComponentStandardUsage(item));
    }, 0);
  }, [componentItems]);

  const existingComponentItems = componentItems
    .filter((item) => !item.isNew && (item.original_component_item || getComponentItem(item)))
    .map((item) => {
      const originalUsage = String(
        item.original_standard_usage ?? getComponentStandardUsage(item) ?? ""
      );
      const updatedUsage = String(getComponentStandardUsage(item) ?? "");
      const hasStandardUsageChanged = originalUsage.trim() !== updatedUsage.trim();

      return {
        ...item,
        component_item: getComponentItem(item),
        component_desc: getComponentDescription(item),
        original_standard_usage: originalUsage,
        updated_standard_usage: hasStandardUsageChanged ? updatedUsage : "No Changes",
        hasStandardUsageChanged,
      };
    });

  const removedMappedComponentItems = removedComponentItems.map((item) => {
    const key = toText(item.original_component_item || item.component_item || item.componentItem || "");
    const fallback =
      initialComponentItemsFromState.find(
        (it) => toText(it.original_component_item || it.component_item || it.componentItem || "") === key
      ) || {};

    return {
      ...item,
      component_item: getComponentItem(item) || key,
      component_desc: getComponentDescription(item) || getComponentDescription(fallback),
      original_standard_usage: String(
        item.original_standard_usage ?? getComponentStandardUsage(item) ?? ""
      ),
      updated_standard_usage: "Item Removed",
      hasStandardUsageChanged: true,
    };
  });

  const finalExistingComponentItems = [
    ...existingComponentItems,
    ...removedMappedComponentItems,
  ];

  const addedComponentItems = componentItems.filter(
    (item) => item.isNew || !item.original_component_item
  );

  const existingCoProducts = coProducts
    .filter((cp) => !cp.isNew && (cp.original_item || getCoProductItem(cp)))
    .map((cp) => {
      const originalQty = String(cp.original_qty ?? getCoProductQty(cp) ?? "");
      const updatedQty = String(getCoProductQty(cp) ?? "");
      const hasQtyChanged = originalQty.trim() !== updatedQty.trim();
      const originalResource = String(cp.original_resource ?? cp.resource ?? selectedResource ?? "");
      const updatedResource = String(cp.resource ?? selectedResource ?? "");
      const hasResourceChanged = originalResource.trim() !== updatedResource.trim();
      const originalPriority = String(cp.original_itemBomRoutingPriority ?? cp.original_item_bom_routing_priority ?? getCoProductPriority(cp) ?? "");
      const updatedPriority = String(getCoProductPriority(cp) ?? "");
      const hasPriorityChanged = originalPriority.trim() !== updatedPriority.trim();

      return {
        ...cp,
        item: getCoProductItem(cp),
        desc: getCoProductDescription(cp),
        original_qty: originalQty,
        updated_qty: hasQtyChanged ? updatedQty : "No Changes",
        original_resource: originalResource,
        updated_resource: hasResourceChanged ? updatedResource : "No Changes",
        original_priority: originalPriority,
        updated_priority: hasPriorityChanged ? updatedPriority : "No Changes",
        hasQtyChanged,
        hasResourceChanged,
        hasPriorityChanged,
      };
    });

  const removedMappedCoProducts = removedCoProducts.map((cp) => {
    const key = toText(cp.original_item || cp.item || cp.coProductItem || "");
    const fallback =
      initialCoProductsFromState.find(
        (it) => toText(it.original_item || it.item || it.coProductItem || "") === key
      ) || {};

    return {
      ...cp,
      item: getCoProductItem(cp) || key,
      desc: getCoProductDescription(cp) || getCoProductDescription(fallback),
      original_qty: String(cp.original_qty ?? getCoProductQty(cp) ?? ""),
      original_resource: String(cp.original_resource ?? cp.resource ?? fallback.original_resource ?? fallback.resource ?? ""),
      original_priority: String(getCoProductPriority(cp) || getCoProductPriority(fallback) || ""),
      updated_resource: "Item Removed",
      updated_qty: "Item Removed",
      updated_priority: "Item Removed",
      hasQtyChanged: true,
      hasResourceChanged: true,
      hasPriorityChanged: true,
    };
  });

  const finalExistingCoProducts = [
    ...existingCoProducts,
    ...removedMappedCoProducts,
  ];

  const addedCoProducts = coProducts.filter(
    (cp) => cp.isNew || !cp.original_item
  );

  const validationEntries = useMemo(() => {
    return normalizeValidationEntries(validationResult).filter((entry) => {
      return String(entry?.desc || "").trim() ||
        String(entry?.error || "").trim() ||
        String(entry?.rm || "").trim();
    });
  }, [validationResult]);
  const responseStatus = String(validationResult?.status || "").toLowerCase();
  const responseSuccessFlag = validationResult?.success === true;
  const responseFailureFlag =
    validationResult?.success === false ||
    responseStatus === "failure" ||
    responseStatus === "failed" ||
    responseStatus === "error";
  const validationFailed = validationEntries.length > 0;
  const validationPassedButNotPushed =
    !!validationResult &&
    !validationFailed &&
    responseFailureFlag &&
    (validationResult?.validationPassed === true ||
      validationResult?.validated === true ||
      validationResult?.savedToDb === false ||
      validationResult?.pushedToDb === false ||
      responseStatus === "failure" ||
      responseStatus === "failed");
  const topLevelError = validationPassedButNotPushed
    ? "Validation is successful but the records are not pushed to DB. Please try again."
    : !validationFailed && responseFailureFlag
      ? validationResult?.messageForUser ||
        validationResult?.message ||
        validationResult?.error ||
        "Failed to submit BOM changes."
      : !validationFailed
        ? validationResult?.error || validationResult?.data?.error || ""
        : "";
  const isSuccess =
    !!validationResult &&
    !validationFailed &&
    !validationPassedButNotPushed &&
    !topLevelError &&
    !responseFailureFlag &&
    (responseSuccessFlag || responseStatus === "success");
  const successEcNumber =
    validationResult?.engineeringChangeId ||
    validationResult?.engineering_change_id ||
    validationResult?.data?.engineeringChangeId ||
    validationResult?.data?.engineering_change_id ||
    "";

  const clearModifyReduxState = () => {
    dispatch(clearModifyExistingBomState());
    dispatch(clearModifyExistingBomFlowState());
  };

  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setValidationResult(null);

      const payload = {
        bomId: record?.bom_id || record?.bomId || "",
        aggregateStandardUsage,
        engineeringChange: {
          ecNumber: record?.ec_number || record?.ecNumber || "",
          creationDate: resolvedCreationDate,
        },
        producedItem: {
          item: producedItem,
          status: record?.item_release_flag || record?.itemReleaseFlag || "",
        },
        locations: [
          {
            locationName: selectedLocation,
            resourceInfo: {
              routingId: resolvedRoutingId,
              resource: selectedResource,
              priority:
                record?.priority === "" || record?.priority == null
                  ? ""
                  : Number(record.priority),
              coProductAssociation: coProducts.length > 0 ? 1 : 0,
            },
            componentItems: componentItems.map((item) => {
              const parsedStandardUsage = Number(getComponentStandardUsage(item));
              return {
                componentItem: getComponentItem(item),
                standardUsage: Number.isFinite(parsedStandardUsage)
                  ? parsedStandardUsage
                  : "",
              };
            }),
            coProductItems: coProducts.map((cp) => {
              const coProductItem = getCoProductItem(cp);
              const cpResource = toText(cp.resource || cp.original_resource || selectedResource);
              const parsedQty = Number(getCoProductQty(cp));
              const priorityValue = getCoProductPriority(cp);

              return {
                coProductItem,
                resource: cpResource,
                routingId: buildRoutingId(producedItem, cpResource),
                standardUsage: Number.isFinite(parsedQty) ? parsedQty : "",
                itemBomRoutingPriority:
                  priorityValue === "" || priorityValue === null || priorityValue === undefined
                    ? ""
                    : Number(priorityValue),
                isNew: !!cp?.isNew,
              };
            }),
          },
        ],
        notes: notes || "",
      };

      const response = await fetch("/api/tables/modify-bom", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      setValidationResult(result);

      if (!response.ok || result?.success === false) {
        return;
      }

      clearModifyReduxState();
    } catch (error) {
      console.error("Error submitting BOM changes:", error);
      setValidationResult({
        success: false,
        status: "error",
        message: error?.message || "Failed to submit BOM changes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={styles.wrapper}>
        <div style={styles.back} onClick={() => navigate(-1)}>
          ← BACK
        </div>

        <h1 style={styles.title}>Step 3: Modified BOM Summary</h1>
        <p style={styles.subtitle}>Review the changes to the BOM record</p>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>BOM Record Details</h2>
          <table style={styles.summaryTable}>
            <tbody>
              <tr style={styles.summaryHeaderRow}>
                <th style={styles.summaryHeader}>Field</th>
                <th style={styles.summaryHeader}>Value</th>
              </tr>
              <tr style={styles.summaryRow}>
                <td style={styles.summaryCell}>Location</td>
                <td style={styles.summaryCell}>{selectedLocation || "-"}</td>
              </tr>
              <tr style={styles.summaryRow}>
                <td style={styles.summaryCell}>BOM ID</td>
                <td style={styles.summaryCell}>{record.bom_id || "-"}</td>
              </tr>
              <tr style={styles.summaryRow}>
                <td style={styles.summaryCell}>Produced Item</td>
                <td style={styles.summaryCell}>{producedItem || "-"}</td>
              </tr>
              <tr style={styles.summaryRow}>
                <td style={styles.summaryCell}>Produced Item Description</td>
                <td style={styles.summaryCell}>
                  {record.produced_item_desc || record.component_desc || "-"}
                </td>
              </tr>
              <tr style={styles.summaryRow}>
                <td style={styles.summaryCell}>Item Release Flag</td>
                <td style={styles.summaryCell}>{record.item_release_flag || "-"}</td>
              </tr>
              <tr style={styles.summaryRow}>
                <td style={styles.summaryCell}>Aggregate Standard Usage</td>
                <td style={styles.summaryCell}>{formatNumber(aggregateStandardUsage)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Existing Component Item Values</h2>
          {finalExistingComponentItems.length === 0 ? (
            <div style={styles.emptyBox}>No existing component item values were changed.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead>
                <tr>
                  <th style={styles.changesHeader}>Component Item</th>
                  <th style={styles.changesHeader}>Description</th>
                  <th style={styles.changesHeader}>Original Standard Usage</th>
                  <th style={styles.changesHeader}>Updated Standard Usage</th>
                </tr>
              </thead>
              <tbody>
                {finalExistingComponentItems.map((item, index) => (
                  <tr
                    key={`existing-component-${index}`}
                    style={item.hasStandardUsageChanged ? styles.changesAltRow : styles.changesRow}
                  >
                    <td style={styles.changesCell}>{item.component_item || "-"}</td>
                    <td style={styles.changesCell}>{item.component_desc || "-"}</td>
                    <td style={styles.changesCell}>{item.original_standard_usage || "-"}</td>
                    <td style={styles.changesCell}>{item.updated_standard_usage || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Added Component Values</h2>
          {addedComponentItems.length === 0 ? (
            <div style={styles.emptyBox}>No new component items were added.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead>
                <tr>
                  <th style={styles.changesHeader}>Component Item</th>
                  <th style={styles.changesHeader}>Description</th>
                  <th style={styles.changesHeader}>Standard Usage</th>
                </tr>
              </thead>
              <tbody>
                {addedComponentItems.map((item, index) => (
                  <tr key={`added-component-${index}`} style={styles.changesAltRow}>
                    <td style={styles.changesCell}>{getComponentItem(item) || "-"}</td>
                    <td style={styles.changesCell}>{getComponentDescription(item) || "-"}</td>
                    <td style={styles.changesCell}>{getComponentStandardUsage(item) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Existing Co-Product Values</h2>
          {finalExistingCoProducts.length === 0 ? (
            <div style={styles.emptyBox}>No existing co-product values were changed.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead>
                <tr>
                  <th style={styles.changesHeader}>Co-Product Item</th>
                  <th style={styles.changesHeader}>Description</th>
                  <th style={styles.changesHeader}>Original Resource</th>
                  <th style={styles.changesHeader}>Updated Resource</th>
                  <th style={styles.changesHeader}>Original Priority</th>
                  <th style={styles.changesHeader}>Updated Priority</th>
                  <th style={styles.changesHeader}>Original Qty Produced</th>
                  <th style={styles.changesHeader}>Updated Qty Produced</th>
                </tr>
              </thead>
              <tbody>
                {finalExistingCoProducts.map((item, index) => (
                  <tr
                    key={`existing-coproduct-${index}`}
                    style={
                      item.hasQtyChanged || item.hasResourceChanged || item.hasPriorityChanged
                        ? styles.changesAltRow
                        : styles.changesRow
                    }
                  >
                    <td style={styles.changesCell}>{item.item || "-"}</td>
                    <td style={styles.changesCell}>{item.desc || "-"}</td>
                    <td style={styles.changesCell}>{item.original_resource || "-"}</td>
                    <td style={styles.changesCell}>{item.updated_resource || "-"}</td>
                    <td style={styles.changesCell}>{item.original_priority || "-"}</td>
                    <td style={styles.changesCell}>{item.updated_priority || "-"}</td>
                    <td style={styles.changesCell}>{item.original_qty || "-"}</td>
                    <td style={styles.changesCell}>{item.updated_qty || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Added Co-Product Values</h2>
          {addedCoProducts.length === 0 ? (
            <div style={styles.emptyBox}>No new co-product values were added.</div>
          ) : (
            <table style={styles.changesTable}>
              <thead>
                <tr>
                  <th style={styles.changesHeader}>Co-Product Item</th>
                  <th style={styles.changesHeader}>Description</th>
                  <th style={styles.changesHeader}>Resource</th>
                  <th style={styles.changesHeader}>Item BOM Routing Priority</th>
                  <th style={styles.changesHeader}>Qty Produced</th>
                </tr>
              </thead>
              <tbody>
                {addedCoProducts.map((item, index) => (
                  <tr key={`added-coproduct-${index}`} style={styles.changesAltRow}>
                    <td style={styles.changesCell}>{getCoProductItem(item) || "-"}</td>
                    <td style={styles.changesCell}>{getCoProductDescription(item) || "-"}</td>
                    <td style={styles.changesCell}>{item.resource || selectedResource || "-"}</td>
                    <td style={styles.changesCell}>{getCoProductPriority(item) || "-"}</td>
                    <td style={styles.changesCell}>{getCoProductQty(item) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <label style={styles.noteLabel}>Notes (Optional)</label>
          <textarea
            style={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about the BOM changes"
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
                    <tr key={`${entry.code}-${index}`} style={styles.validationBodyRow}>
                      <td style={styles.validationTd}>{entry.code}</td>
                      <td style={styles.validationTd}>{entry.desc || "-"}</td>
                      <td style={styles.validationTd}>{entry.error || "-"}</td>
                      <td style={styles.validationTd}>{entry.rm || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : validationPassedButNotPushed ? (
          <div style={styles.warningCard}>
            <div style={styles.resultTitle}>Validation Success - Records Not Pushed</div>
            <div style={styles.warningText}>
              Validation is successful but the records are not pushed to DB. Please try again.
            </div>
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

        <div style={styles.footer}>
          <button
            type="button"
            onClick={handleReturnToMainMenu}
            style={styles.secondaryBtn}
            disabled={isSubmitting}
          >
            <span style={{ fontSize: "13px" }}>⌂</span>
            <span>RETURN TO MAIN MENU</span>
          </button>
          <button
            type="button"
            style={{
              ...styles.confirmBtn,
              ...(isSubmitting || isSuccess ? styles.disabledBtn : {}),
            }}
            onClick={handleSubmit}
            disabled={isSubmitting || isSuccess}
          >
            {isSubmitting ? "SUBMITTING..." : "✓ CONFIRM AND SUBMIT BOM CHANGES"}
          </button>
        </div>

      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    justifyContent: "center",
    padding: "24px 0",
  },
  wrapper: {
    width: "100%",
    maxWidth: "1180px",
    padding: "0 16px",
    boxSizing: "border-box",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "16px",
    fontSize: "14px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: "18px",
    color: "#6b7280",
    fontSize: "15px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
    overflowX: "auto",
  },
  sectionTitle: {
    margin: 0,
    marginBottom: "16px",
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
  },
  summaryTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  summaryHeaderRow: {
    background: "#f3f4f6",
  },
  summaryHeader: {
    textAlign: "left",
    color: "#374151",
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
  },
  summaryRow: {
    background: "#fff",
  },
  summaryCell: {
    padding: "14px 16px",
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: "14px",
  },
  changesTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
  },
  changesHeader: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },
  changesRow: {
    background: "#fff",
  },
  changesAltRow: {
    background: "lightyellow",
  },
  changesCell: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: "14px",
    verticalAlign: "top",
    wordBreak: "break-word",
  },
  emptyBox: {
    padding: "18px",
    border: "1px dashed #d1d5db",
    borderRadius: "6px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "14px",
  },
  noteLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 500,
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    padding: "12px",
    fontSize: "14px",
    color: "#111827",
    boxSizing: "border-box",
    resize: "vertical",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    marginTop: "20px",
  },
  secondaryBtn: {
    height: "44px",
    minWidth: "190px",
    border: "1px solid #6da0e1",
    borderRadius: "6px",
    padding: "0 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#1e63b5",
    background: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxSizing: "border-box",
  },
  confirmBtn: {
    height: "44px",
    minWidth: "300px",
    background: "#166534",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "0 20px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  disabledBtn: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  resultTitle: {
    fontSize: "15px",
    fontWeight: 700,
    marginBottom: "10px",
  },
  errorCard: {
    background: "#fff5f5",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "16px",
  },
  successCard: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "16px",
  },
  warningCard: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: "6px",
    padding: "16px",
    marginBottom: "16px",
  },
  errorText: {
    fontSize: "14px",
    color: "#991b1b",
    whiteSpace: "pre-wrap",
  },
  successText: {
    fontSize: "14px",
    color: "#166534",
    whiteSpace: "pre-wrap",
  },
  warningText: {
    fontSize: "14px",
    color: "#9a3412",
    whiteSpace: "pre-wrap",
  },
  validationTableWrap: {
    overflowX: "auto",
    border: "1px solid #f3d0d0",
    borderRadius: "4px",
    background: "#ffffff",
    marginTop: "12px",
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
    fontSize: "12px",
    fontWeight: 700,
    color: "#7f1d1d",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  validationTd: {
    padding: "12px 14px",
    fontSize: "14px",
    color: "#111827",
    verticalAlign: "top",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
};

export default ModifyExistingBOMSummary;
