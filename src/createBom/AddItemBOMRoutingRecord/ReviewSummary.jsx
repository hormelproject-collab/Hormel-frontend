import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoIosArrowBack } from "react-icons/io";
import { MdCheck } from "react-icons/md";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
    routingId = "",
    addConnectedCoProduct = false,
    coProductItem = "",
  } = state;

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // TODO: replace with your actual logged-in user source if available
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
    !!routingId &&
    !submitting;

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
        routingId,
        addConnectedCoProduct,
        coProductItem: addConnectedCoProduct ? coProductItem : "",
        notes,
        changeType: "Add",
        user: {
          userId: currentUser.userId,
          userName: currentUser.userName,
        },
      };

      const res = await fetch(`${API_BASE_URL}/api/tables/item-bom-routing/create`, {
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
            <div><strong>Engineering Change ID:</strong> {successData.engineeringChangeId}</div>
            <div><strong>Change Log ID:</strong> {successData.changeLogId}</div>
            <div><strong>Transaction Set ID:</strong> {successData.trxnSetId}</div>
            <div><strong>PostgreSQL Record ID:</strong> {successData.postgresqlRecId}</div>
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
            <strong>Location:</strong> <span>{location || "-"}</span>
          </div>
          <div style={styles.summaryRow}>
            <strong>Resource:</strong> <span>{resource || "-"}</span>
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
          <div style={styles.summaryRow}>
            <strong>Connected Co-Product:</strong>{" "}
            <span>{addConnectedCoProduct ? "Yes" : "No"}</span>
          </div>
          {addConnectedCoProduct ? (
            <div style={styles.summaryRow}>
              <strong>Co-Product Item:</strong> <span>{coProductItem || "-"}</span>
            </div>
          ) : null}
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
  summaryRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    fontSize: "16px",
    color: "#111827",
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
    marginTop: "18px",
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