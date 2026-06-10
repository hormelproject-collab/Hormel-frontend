import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";

const BomUpload = () => {
  const [producedFile, setProducedFile] = useState(null);
  const [consumedFile, setConsumedFile] = useState(null);
  const [routingFile, setRoutingFile] = useState(null);
  const [parametersFile, setParametersFile] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * CSV → JSON rows + add ERR_ID as row number
   * - Header row = 1
   * - First data row = 2
   */
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = Array.isArray(result.data) ? result.data : [];

          // Add ERR_ID to each row (do not override if already exists)
          const withErrId = rows.map((row, idx) => {
            // idx=0 => csv row 2 (because row 1 is header)
            const rowNumber = idx + 2;

            // Preserve any existing ERR_ID column if present
            if (row && (row.ERR_ID !== undefined && row.ERR_ID !== null && String(row.ERR_ID).trim() !== "")) {
              return row;
            }

            return {
              ...row,
              ERR_ID: rowNumber,
            };
          });

          resolve(withErrId);
        },
        error: (err) => reject(err),
      });
    });
  };

  const handleSubmit = async () => {
    if (!producedFile || !consumedFile || !routingFile || !parametersFile) {
      alert(
        "Please upload all 4 files: bom_produced, bom_consumed, item_bom_routing, bom_parameters"
      );
      return;
    }

    try {
      setLoading(true);

      // Parse all CSVs into arrays (each row now includes ERR_ID)
      const producedData = await parseCSV(producedFile);
      const consumedData = await parseCSV(consumedFile);
      const routingData = await parseCSV(routingFile);
      const parametersData = await parseCSV(parametersFile);

      // (Optional) quick sanity log
      console.log("Sample consumed row:", consumedData?.[0]);

      // Send raw table arrays to backend
      const payload = {
        bom_produced: producedData,
        bom_consumed: consumedData,
        item_bom_routing: routingData,
        bom_parameters: parametersData,
      };

      const response = await axios.post("http://localhost:3000/api/bom-upload/validate-and-load", payload);
      const result = response.data;

      if (result.status === "success") {
        alert("✅ Validation SUCCESS. Report generated on backend.");
      } else {
        alert("❌ Validation FAILED. Report generated on backend.");
      }
    } catch (error) {
      console.error(error);
      alert("❌ Failed to validate. Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "700px",
        margin: "auto",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ textAlign: "center" }}>BOM Upload (4 CSVs)</h2>

      <div style={{ marginBottom: "15px" }}>
        <label>Upload bom_produced CSV:</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setProducedFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Upload bom_consumed CSV:</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setConsumedFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Upload item_bom_routing CSV:</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setRoutingFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Upload bom_parameters CSV:</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setParametersFile(e.target.files[0])}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: loading ? "#6c757d" : "#007bff",
          color: "#fff",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          borderRadius: "5px",
        }}
      >
        {loading ? "Validating..." : "Submit"}
      </button>

      <p style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
        Note: Backend generates report under <b>/reports</b>. UI receives only
        Success/Failure message.
      </p>
    </div>
  );
};

export default BomUpload;