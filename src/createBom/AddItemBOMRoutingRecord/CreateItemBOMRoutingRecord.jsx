import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosArrowBack, IoIosArrowDown, IoMdClose } from "react-icons/io";

const CreateItemBOMRoutingRecord = () => {
    const navigate = useNavigate();
    const [coProductItem, setCoProductItem] = useState("");

    const coProductOptions = [
  "Item123",
  "Item234",
  "Item345",
  "Item456",
  "Item567"
];


    // Mock dropdown data for UI demo
    const bomOptions = [
        {
            bomId: "BOM001",
            producedItem: "FG001",
            itemReleaseFlag: "MRP",
            location: "Bangalore",
        },
        {
            bomId: "BOM002",
            producedItem: "FG002",
            itemReleaseFlag: "MPS",
            location: "Delhi",
        },
        {
            bomId: "BOM003",
            producedItem: "FG003",
            itemReleaseFlag: "Finite Planning",
            location: "Mumbai",
        },
    ];

    const resourceOptions = [
        { resource: "Oven_01", relevancy: "MPS" },
        { resource: "Mixer_02", relevancy: "Finite Planning" },
        { resource: "PackLine_03", relevancy: "RCCP" },
    ];

    const [selectedBomId, setSelectedBomId] = useState("");
    const [selectedResource, setSelectedResource] = useState("");
    const [addConnectedCoProduct, setAddConnectedCoProduct] = useState(false);

    const selectedBom = useMemo(
        () => bomOptions.find((x) => x.bomId === selectedBomId) || null,
        [selectedBomId]
    );

    const selectedResourceObj = useMemo(
        () => resourceOptions.find((x) => x.resource === selectedResource) || null,
        [selectedResource]
    );

    const producedItem = selectedBom?.producedItem || "";
    const itemReleaseFlag = selectedBom?.itemReleaseFlag || "";
    const location = selectedBom?.location || "";
    const resourceRelevancy = selectedResourceObj?.relevancy || "";

    const routingId =
        producedItem && location && selectedResource
            ? `ROUTING_${producedItem}_${location}_${selectedResource}`
            : "";

    // const canProceed = !!selectedBomId && !!selectedResource;
    
const canProceed =
  !!selectedBomId &&
  !!selectedResource &&
  (!addConnectedCoProduct || coProductItem);


    return (
        <div style={styles.page}>


            <div style={styles.contentWrapper}>

                            {/* Back */}
            <div style={styles.backRow} onClick={() => navigate(-1)}>
                <IoIosArrowBack size={18} />
                <span style={styles.backText}>BACK</span>
            </div>

            {/* Header */}
                <h1 style={styles.title}>Step 1: Create Item BOM Routing Record</h1>
                <p style={styles.subtitle}>Enter routing record details</p>

                {/* Main card */}
                <div style={styles.card}>
                    {/* BOM ID */}
                    <div style={styles.fieldBlock}>
                        <label style={styles.label}>BOM ID *</label>
                        <div style={styles.selectWrap}>
                            <select
                                value={selectedBomId}
                                onChange={(e) => setSelectedBomId(e.target.value)}
                                style={styles.select}
                            >
                                <option value="" disabled>
                                    Select BOM ID
                                </option>
                                {bomOptions.map((opt) => (
                                    <option key={opt.bomId} value={opt.bomId}>
                                        {opt.bomId}
                                    </option>
                                ))}
                            </select>
                            <IoIosArrowDown style={styles.selectIcon} />
                        </div>
                    </div>

                    {/* Produced Item */}

<div style={styles.fieldBlock}>
  <label style={styles.label}>Produced Item</label>

  <input
    value={producedItem}
    readOnly
    placeholder="Produced Item"
    style={styles.inputDisabled}
  />

  <div style={styles.helperText}>
    Auto-populated from BOM ID
  </div>
</div>


                    {/* Item Release Flag */}
<div style={styles.fieldBlock}>
  <label style={styles.label}>Item Release Flag</label>

  <input
    value={itemReleaseFlag}
    readOnly
    placeholder="Item Release Flag"
    style={styles.inputDisabled}
  />

  <div style={styles.helperText}>
    Auto-populated from Produced Item
  </div>
</div>

                    {/* Resource */}
                    <div style={styles.fieldBlock}>
                        <label style={styles.label}>Resource *</label>
                        <div style={styles.resourceWrap}>
                            <select
                                value={selectedResource}
                                onChange={(e) => setSelectedResource(e.target.value)}
                                style={styles.resourceSelect}
                            >
                                <option value="" disabled>
                                    Select Resource
                                </option>
                                {resourceOptions.map((opt) => (
                                    <option key={opt.resource} value={opt.resource}>
                                        {opt.resource}
                                    </option>
                                ))}
                            </select>

                            <div style={styles.resourceRightIcons}>
                                {selectedResource ? (
                                    <IoMdClose
                                        size={18}
                                        style={styles.clearIcon}
                                        onClick={() => setSelectedResource("")}
                                    />
                                ) : null}
                                <IoIosArrowDown style={styles.selectIconStatic} />
                            </div>
                        </div>
                        <div style={styles.helperText}>
                            If desired resource is not found, please check Oracle work definitions
                        </div>
                    </div>

                    {/* Resource Relevancy */}
<div style={styles.fieldBlock}>
  <label style={styles.label}>Resource Relevancy</label>

  <input
    value={resourceRelevancy}
    readOnly
    placeholder="Resource Relevancy"
    style={styles.inputDisabled}
  />

  <div style={styles.helperText}>Auto-populated</div>
</div>

                    {/* Routing ID */}
<div style={styles.fieldBlock}>
  <label style={styles.label}>Routing ID</label>

  <input
    value={routingId}
    readOnly
    placeholder="Routing ID"
    style={styles.inputDisabled}
  />

  <div style={styles.helperText}>
    Auto-generated: ROUTING_ProducedItem_Location_Resource
  </div>
</div>

                    {/* Checkbox */}
<label style={styles.checkboxRow}>
  <input
    type="checkbox"
    checked={addConnectedCoProduct}
    onChange={(e) => setAddConnectedCoProduct(e.target.checked)}
    style={styles.checkbox}
  />
  <span style={styles.checkboxLabel}>Add Connected Co-Product</span>
</label>

{addConnectedCoProduct && (
  <div style={styles.fieldBlock}>
    <label style={styles.label}>Co-Product Item Number *</label>

    <div style={styles.resourceWrap}>
      <select
        value={coProductItem}
        onChange={(e) => setCoProductItem(e.target.value)}
        style={styles.resourceSelect}
      >
        <option value="">Select Co-Product Item</option>
        {coProductOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <div style={styles.resourceRightIcons}>
        {coProductItem && (
          <IoMdClose
            size={18}
            style={styles.clearIcon}
            onClick={() => setCoProductItem("")}
          />
        )}
        <IoIosArrowDown style={styles.selectIconStatic} />
      </div>
    </div>
  </div>
)}
                </div>

                {/* Footer action */}
                <div style={styles.footer}>
                    <button
                        style={{
                            ...styles.nextButton,
                            opacity: canProceed ? 1 : 0.65,
                            cursor: canProceed ? "pointer" : "not-allowed",
                        }}
                        disabled={!canProceed}
                        onClick={() => navigate("/review-summary")}
                    >
                        <span>NEXT: REVIEW SUMMARY</span>
                        <span style={styles.arrow}>→</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateItemBOMRoutingRecord;

const styles = {

    page: {
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "24px 0 36px",

        display: "flex",
        flexDirection: "column",
        alignItems: "center",   // ✅ centers everything horizontally
    },

    
contentWrapper: {
  width: "100%",
  maxWidth: "860px",   // ✅ same as card
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
        margin: "0",
        fontSize: "32px",
        fontWeight: 700,
        color: "#111827",
    },

    subtitle: {
        margin: "8px 0 24px",
        fontSize: "16px",
        color: "#6b7280",
    },

    card: {
        maxWidth: "860px",
        backgroundColor: "#f7f7f7",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "24px",
        boxSizing: "border-box",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },

    fieldBlock: {
        marginBottom: "14px",
    },

    label: {
        display: "block",
        fontSize: "14px",
        marginBottom: "8px",
        fontWeight: 500,
    },

    selectWrap: {
        position: "relative",
    },

    select: {
        width: "100%",
        height: "56px",
        borderRadius: "4px",
        border: "1px solid #c7c7c7",
        backgroundColor: "#fff",
        padding: "0 44px 0 14px",
        fontSize: "16px",
        appearance: "none",
        outline: "none",
        boxSizing: "border-box",
    },

    selectIcon: {
        position: "absolute",
        right: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#7a7a7a",
        pointerEvents: "none",
    },

    inputDisabled: {
        width: "100%",
        height: "56px",
        borderRadius: "4px",
        border: "1px solid #cfcfcf",
        backgroundColor: "#fff",
        padding: "0 14px",
        fontSize: "16px",
        color: "#9ca3af",
        boxSizing: "border-box",
        outline: "none",
    },

    helperText: {
        marginTop: "6px",
        marginLeft: "14px",
        fontSize: "13px",
        color: "#9ca3af",
    },

    resourceWrap: {
        display: "flex",
        alignItems: "center",
        border: "1px solid #111827",
        borderRadius: "4px",
        backgroundColor: "#fff",
        height: "56px",
        boxSizing: "border-box",
        overflow: "hidden",
    },

    resourceSelect: {
        flex: 1,
        height: "100%",
        border: "none",
        backgroundColor: "transparent",
        padding: "0 14px",
        fontSize: "16px",
        appearance: "none",
        outline: "none",
    },

    resourceRightIcons: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        paddingRight: "14px",
        color: "#6b7280",
    },

    clearIcon: {
        cursor: "pointer",
    },

    selectIconStatic: {
        color: "#6b7280",
    },

    checkboxRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "8px",
        cursor: "pointer",
        userSelect: "none",
        marginBottom: "8px"
    },

    checkbox: {
        width: "18px",
        height: "18px",
        margin: 0,
        accentColor: "#2563eb",
    },

    checkboxLabel: {
        fontSize: "15px",
        color: "#111827",
    },

    footer: {
        width: "100%",
        maxWidth: "860px",
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "24px",
    },

    nextButton: {
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "#1976d2",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        padding: "12px 18px",
        fontSize: "15px",
        fontWeight: 500,
    },

    arrow: {
        fontSize: "18px",
        lineHeight: 1,
    },
};