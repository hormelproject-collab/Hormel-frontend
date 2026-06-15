import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DownloadBOM() {
  const navigate = useNavigate();
  const [selectedTables, setSelectedTables] = useState([
    "BOM Parameters",
  ]);

  const tableOptions = [
    "BOM Parameters",
    "BOM Produced",
    "BOM Consumed",
    "Item BOM Routing",
  ];

  const handleCheckboxChange = (table) => {
    setSelectedTables((prev) =>
      prev.includes(table)
        ? prev.filter((t) => t !== table)
        : [...prev, table]
    );
  };

  const tableLabelToDbName = {
    "BOM Parameters": "bom_parameters",
    "BOM Produced": "bom_produced",
    "BOM Consumed": "bom_consumed",
    "Item BOM Routing": "item_bom_routing",
  };

  async function downloadSelectedTablesCsv(selectedTablesLabels) {
    const tables = selectedTablesLabels
      .map((label) => tableLabelToDbName[label])
      .filter(Boolean);

    const response = await fetch("/api/bom/download-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Download failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bom_tables.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.container}>
      {/* Back */}
      <div style={styles.back} onClick={() => navigate(-1)}>
        ← BACK
      </div>

      {/* Header */}
      <h1 style={styles.title}>Download BOM Data</h1>
      <p style={styles.subtitle}>
        Select the tables you would like to download
      </p>

      {/* Select Tables Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Select Tables</h2>

        {tableOptions.map((table) => (
          <label key={table} style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedTables.includes(table)}
              onChange={() => handleCheckboxChange(table)}
              style={styles.checkbox}
            />
            {table}
          </label>
        ))}
      </div>

      {/* Note Section */}
      <div style={styles.noteBox}>
        <strong>Note:</strong> All selected tables will be downloaded into a
        single file. Each table will appear in a separate tab within the file.
      </div>

      {/* Selected Tables Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          Selected Tables ({selectedTables.length})
        </h2>

        <ul style={styles.list}>
          {selectedTables.map((table) => (
            <li key={table}>{table}</li>
          ))}
        </ul>
      </div>

      {/* Button */}
      <div style={styles.buttonContainer}>
        <button
          style={styles.button}
          onClick={() => downloadSelectedTablesCsv(selectedTables)}>
          ⬇ DOWNLOAD SELECTED TABLES
        </button>
      </div>
    </div>
  );
}

/* ================== STYLES ================== */
const styles = {
  container: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f3f4f6",
    minHeight: "100vh",
  },

  title: {
    fontSize: "36px",
    marginBottom: "10px",
  },

  subtitle: {
    fontSize: "18px",
    color: "#555",
    marginBottom: "25px",
  },

  card: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },

  cardTitle: {
    fontSize: "22px",
    marginBottom: "15px",
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    fontSize: "16px",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },

  noteBox: {
    backgroundColor: "#eef2f7",
    padding: "15px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px",
    color: "#444",
  },

  list: {
    paddingLeft: "20px",
  },

  buttonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
  },

  button: {
    backgroundColor: "#2f80ed",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  back: {
    color: "#2563eb",
    cursor: "pointer",
    marginBottom: "12px",
    fontSize: "14px",
  },

};