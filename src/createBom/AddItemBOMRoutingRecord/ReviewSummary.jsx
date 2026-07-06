
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoIosArrowBack } from "react-icons/io";
import { MdCheck } from "react-icons/md";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const toText = (value) => (value == null ? "" : String(value));

const ReviewSummary = () => {
  const navigate = useNavigate();
  const locationHook = useLocation();
  const state = locationHook.state || {};

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

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

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

  const canSubmit =
    !!bomId &&
    !!producedItem &&
    !!location &&
    !!resource &&
    !!routingPriority &&
    !!routingId &&
    !submitting;

  const handleReturnToMainMenu = () => {
    navigate("/");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccessData(null);

      const payload = {
        bomId,
        producedItem,
        itemReleaseFlag,
        location,
        resource,
        resourceRelevancy,
        routingPriority,
        routingId,
        addConnectedCoProduct,

        // main item explicitly sent
        mainItem: {
          item: producedItem,
          erp_co_product_association: 0,
        },

        // backward compatibility
        coProductItem: addConnectedCoProduct
          ? (displayCoProducts[0]?.coProductItem ?? coProductItem ?? "")
          : "",

        // all co-products explicitly marked
        coProducts: addConnectedCoProduct
          ? displayCoProducts.map((row) => ({
            coProductItem: row.coProductItem ?? "",
            itemDescription: row.itemDescription ?? "",
            qtyProduced: row.qtyProduced ?? "",
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

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.details ||
          json?.error ||
          json?.message ||
          "Failed to create item BOM routing record"
        );
      }

      setSuccessData(json?.data || null);
    } catch (err) {
      setError(err.message || "Failed to submit");
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

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {successData ? (
          <div style={styles.successBox}>
            <div style={styles.successTitle}>Record created successfully</div>
            <div>
              <strong>Engineering Change ID:</strong> {successData.engineeringChangeId}
            </div>
          </div>
        ) : null}

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
            <strong>Routing ID:</strong> <span>{routingId || "-"}</span>
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
                    </tr>
                  </thead>
                  <tbody>
                    {displayCoProducts.map((row, index) => (
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
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
            disabled={!canSubmit}
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
  errorBox: {
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "6px",
    backgroundColor: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "14px",
  },
  successBox: {
    marginBottom: "16px",
    padding: "14px",
    borderRadius: "6px",
    backgroundColor: "#dcfce7",
    border: "1px solid #86efac",
    color: "#166534",
    fontSize: "14px",
    display: "grid",
    gap: "6px",
  },
  successTitle: {
    fontWeight: 700,
    marginBottom: "4px",
  },
};
