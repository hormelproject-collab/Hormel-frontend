import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  clearItemBomRoutingCreateState,
  selectItemBomRoutingCreateState,
} from "../../redux/bomSlice";
import { IoIosArrowBack } from "react-icons/io";
import { MdCheck } from "react-icons/md";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const toText = (value) => (value == null ? "" : String(value));

const buildRoutingId = (item, resource) => {
  const cleanItem = toText(item).trim();
  const cleanResource = toText(resource).trim();

  if (!cleanItem || !cleanResource) return "";

  return `ROUTING_${cleanItem}_${cleanResource}`;
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

      if (messages.length === 0) {
        pushEntry(row, rowIndex);
      } else {
        messages.forEach((msg, msgIndex) => {
          pushEntry(msg, `${rowIndex}-${msgIndex}`, row);
        });
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

  if (
    fallbackArray &&
    !Array.isArray(fallbackArray) &&
    typeof fallbackArray === "object"
  ) {
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

const getSuccessEcNumber = (validationResult) => {
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
    ""
  );
};

const ReviewSummary = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const savedCreateState = useSelector(selectItemBomRoutingCreateState);
  const locationHook = useLocation();

  const state =
    locationHook.state && Object.keys(locationHook.state).length
      ? locationHook.state
      : savedCreateState || {};

  const {
    bomId = "",
    producedItem = "",
    itemReleaseFlag = "",
    location = "",
    resource = "",
    resourceRelevancy = "",
    routingPriority = "",
    routingId = "",
    addConnectedCoProduct = false,
    coProductItem = "",
    coProducts: passedCoProducts = [],
  } = state;

  const coProducts = safeArray(passedCoProducts).filter(
    (row) =>
      String(row?.coProductItem || "").trim() ||
      String(row?.itemDescription || "").trim() ||
      String(row?.qtyProduced || "").trim()
  );

  const fallbackSingleCoProductRows =
    addConnectedCoProduct && !coProducts.length && coProductItem
      ? [
          {
            coProductItem,
            itemDescription: "",
            qtyProduced: "",
          },
        ]
      : [];

  const displayCoProducts = coProducts.length ? coProducts : fallbackSingleCoProductRows;

  const resolvedRoutingId =
    toText(routingId).trim() || buildRoutingId(producedItem, resource);

  const displayCoProductsWithRouting = displayCoProducts.map((row) => {
    const rowResource = toText(row?.resource).trim() || resource;

    return {
      ...row,
      resource: rowResource,
      routingId: buildRoutingId(producedItem, rowResource),
      erp_co_product_association: 1,
    };
  });

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const currentUser = useMemo(() => {
    return {
      userId:
        localStorage.getItem("userId") ||
        localStorage.getItem("employeeId") ||
        "M_MEENAKSHI_M",
      userName:
        localStorage.getItem("userName") ||
        localStorage.getItem("displayName") ||
        "Meenakshi M",
    };
  }, []);

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
      validationResult?.details ||
      "Validation was successful but the records are not yet pushed to PostgreSQL table."
    : !validationFailed
      ? validationResult?.error ??
        validationResult?.details ??
        validationResult?.data?.error ??
        ""
      : "";
  const isSuccess =
    !!validationResult &&
    !validationFailed &&
    !recordsNotPushed &&
    !topLevelError &&
    (responseSuccessFlag || responseStatus === "success" || responseStatus === "");
  const successEcNumber = useMemo(() => {
    return getSuccessEcNumber(validationResult);
  }, [validationResult]);

  const canSubmit =
    !!bomId &&
    !!producedItem &&
    !!location &&
    !!resource &&
    !!routingPriority &&
    !!resolvedRoutingId &&
    !submitting;

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
      result?.details ??
      result?.messageForUser ??
      (explicitFailure ? result?.message : "") ??
      result?.data?.error ??
      "";

    return (
      explicitSuccess &&
      !explicitFailure &&
      !responseTopLevelError &&
      responseValidationEntries.length === 0
    );
  };

  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setValidationResult(null);

      const payload = {
        bomId,
        producedItem,
        itemReleaseFlag,
        location,
        resource,
        resourceRelevancy,
        routingPriority,
        routingId: resolvedRoutingId,
        addConnectedCoProduct,
        mainItem: {
          item: producedItem,
          routingId: resolvedRoutingId,
          resource,
          erp_co_product_association: "",
        },
        coProductItem: addConnectedCoProduct
          ? (displayCoProducts[0]?.coProductItem ?? coProductItem ?? "")
          : "",
        coProducts: addConnectedCoProduct
          ? displayCoProductsWithRouting.map((row) => ({
              coProductItem: row.coProductItem ?? "",
              itemDescription: row.itemDescription ?? "",
              qtyProduced: row.qtyProduced ?? "",
              resource: row.resource ?? resource ?? "",
              routingId: row.routingId ?? "",
              erp_co_product_association: 1,
            }))
          : [],
        notes,
        changeType: "Added",
        user: {
          userId: currentUser.userId,
          userName: currentUser.userName,
        },
      };

      const res = await fetch(`/api/tables/item-bom-routing/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let json = null;
      try {
        json = await res.json();
      } catch {
        json = {
          success: false,
          status: "failure",
          error: "Failed to parse server response",
        };
      }

      setValidationResult(json);

      if (!res.ok) {
        return;
      }

      if (isSubmitResponseSuccessful(json)) {
        dispatch(clearItemBomRoutingCreateState());
      }
    } catch (err) {
      setValidationResult({
        success: false,
        status: "failure",
        error: err.message || "Failed to submit",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.contentWrapper}>
        <div style={styles.backRow} onClick={() => navigate(-1)}>
          <IoIosArrowBack />
          <span style={styles.backText}>BACK</span>
        </div>

        <h2 style={styles.title}>Step 2: New Item BOM Routing Record Summary</h2>

        <div style={styles.card}>
          <div style={styles.summaryRow}>
            <strong>Item:</strong> <span>{producedItem || "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <strong>Item Release Flag:</strong> <span>{itemReleaseFlag || "-"}</span>
          </div>

          <div style={styles.summaryRow}>
            <strong>Item BOM Routing Priority:</strong> <span>{routingPriority || "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <strong>Resource Relevancy:</strong> <span>{resourceRelevancy || "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <strong>Routing ID:</strong> <span>{resolvedRoutingId || "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <strong>BOM ID:</strong> <span>{bomId || "-"}</span>
          </div>

          {addConnectedCoProduct ? (
            <div style={styles.coProductSection}>
              <div style={styles.coProductNote}>
                Note: An additional record will be added to BOM Produced and Item BOM Routing for these Co-Products
              </div>

              <div style={styles.coProductSectionTitle}>Co-Product Information</div>

              {displayCoProducts.length ? (
                <table style={styles.coProductTable}>
                  <thead>
                    <tr>
                      <th style={styles.coProductTh}>Co-Product Item</th>
                      <th style={styles.coProductTh}>Item Description</th>
                      <th style={styles.coProductTh}>Qty Produced</th>
                      <th style={styles.coProductTh}>Routing ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCoProductsWithRouting.map((row, index) => (
                      <tr key={`${row.coProductItem || "coprod"}_${index}`}>
                        <td style={styles.coProductTd}>
                          {toText(row.coProductItem).trim() || "-"}
                        </td>
                        <td style={styles.coProductTd}>
                          {toText(row.itemDescription).trim() || "-"}
                        </td>
                        <td style={styles.coProductTd}>
                          {toText(row.qtyProduced).trim() || "-"}
                        </td>
                        <td style={styles.coProductTd}>
                          {toText(row.routingId).trim() || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={styles.noCoProductText}>No co-product details selected.</div>
              )}
            </div>
          ) : (
            <div style={styles.summaryRow}>
              <strong>Connected Co-Product:</strong> <span>No</span>
            </div>
          )}
        </div>

        <div style={styles.noteBox}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (Optional)"
            style={styles.textArea}
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

        <div style={styles.footer}>
          <button
            type="button"
            onClick={handleReturnToMainMenu}
            style={styles.mainMenuButton}
          >
            <span style={{ fontSize: "13px" }}>⌂</span>
            <span>RETURN TO MAIN MENU</span>
          </button>
          <button
              style={{
              ...styles.submitButton,
              ...(canSubmit || isSuccess? styles.submitBtnDisabled : {}),
            }}
            disabled={!canSubmit || isSuccess}
            onClick={handleSubmit}
          >
            <MdCheck size={18} />
            {submitting
              ? "SUBMITTING..."
              : "SUBMIT & CREATE ITEM BOM ROUTING RECORD"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewSummary;

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    padding: "24px 0 36px",
    display: "flex",
    justifyContent: "center",
  },
  contentWrapper: {
    width: "100%",
    maxWidth: "860px",
  },
  backRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "12px",
    userSelect: "none",
    fontSize: "15px",
    fontWeight: 500,
  },
  backText: {
    letterSpacing: "0.2px",
  },
  title: {
    margin: "0 0 20px",
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827",
  },
  card: {
    backgroundColor: "#f6f6f6",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    padding: "20px 24px",
    minHeight: "220px",
  },
  coProductNote: {
    marginBottom: "12px",
    padding: "10px 12px",
    borderRadius: "4px",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontSize: "14px",
    fontWeight: 500,
  },
  summaryRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    fontSize: "16px",
    color: "#111827",
  },
  coProductSection: {
    marginTop: "20px",
  },
  coProductSectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "10px",
  },
  coProductTable: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
  },
  coProductTh: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    backgroundColor: "#e5e7eb",
    borderBottom: "1px solid #d1d5db",
  },
  coProductTd: {
    padding: "10px 12px",
    fontSize: "14px",
    color: "#111827",
    borderTop: "1px solid #e5e7eb",
    verticalAlign: "top",
  },
  noCoProductText: {
    fontSize: "14px",
    color: "#6b7280",
  },
  noteBox: {
    marginTop: "0",
    border: "1px solid #d1d5db",
    borderTop: "none",
    borderRadius: "0 0 4px 4px",
    backgroundColor: "#f6f6f6",
  },
  textArea: {
    width: "100%",
    minHeight: "110px",
    border: "none",
    resize: "none",
    outline: "none",
    padding: "14px",
    boxSizing: "border-box",
    fontSize: "15px",
    backgroundColor: "transparent",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    marginTop: "18px",
  },
  mainMenuButton: {
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
  },
  submitButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "14px 20px",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.2px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
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
    marginTop: "16px",
    marginBottom: "16px",
  },
  successCard: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "6px",
    padding: "16px",
    marginTop: "16px",
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
