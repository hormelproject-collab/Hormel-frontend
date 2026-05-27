import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ResponseModal from "./ResponseModal";
import { useScreen } from "../styles/useDevice";
import { layout } from "../styles/layout";
import axios from "axios";

export default function SummaryPage() {
  const screen = useScreen();
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [response, setResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const producedItems = routerLocation?.state?.producedItems || null;

  const summaryRows = useMemo(() => {
    if (producedItems?.length) {
      return producedItems.map((p, idx) => ({
        producedItem: p.id || "-",
        description: p.description || "Item Desc",
        location: p.location || "-",
        bomId: p.bomId || `BOM_${idx + 1}`,
        routingId: p.routingId || `ROUTING_${idx + 1}`,
      }));
    }

    return [
      {
        producedItem: "Item123",
        description: "Item Desc 1",
        location: "Location 1",
        bomId: "BOM1_Item123_Location1",
        routingId: "ROUTING_Item123_Location1_Resource1",
      },
    ];
  }, [producedItems]);

  // ✅ UNCHANGED (as you asked)
  const postbomtable = async () => {
    const mockRequest = [
      {
        bomId: "BOM1_Item001_Location 8",
        engineeringChange: {
          ecNumber: "EC747159",
          creationDate: "2026-05-15",
        },
        producedItem: {
          item: "Item001",
          description: "",
          status: "Active",
          releaseFlag: "",
        },
        locations: [
          {
            locationId: "",
            locationName: "Location 8",
            locationStatus: "Active",
            resourceInfo: {
              resource: "Resource1",
              resourceRelevancy: "MPS",
              bomVersion: "PRIMARY",
              routingId: "ROUTING_Item001_Location 8_Resource1",
              priority: 10,
              coProductAssociation: 1,
            },
            componentItems: [
              {
                componentItem: "Item1289",
                description: "",
                standardUsage: 1.1378,
              },
            ],
            coProducts: [
              {
                coProductItem: "Item2000",
                description: "",
                qtyProducedPer: 0.25,
              },
            ],
            flags: {
              isCoProduct: true,
              noComponentItems: false,
              replicateForAllLocations: false,
            },
          },
        ],
      },
    ];

    const response = await axios.post(
      "http://localhost:3000/bom-explosion",
      mockRequest
    );

    return response.data;
  };

  const submitBOMs = async () => {
    setSubmitting(true);
    try {
      const data = await postbomtable();
      setResponse(data);
      setShowModal(true);
    } catch (err) {
      setResponse({ error: String(err) });
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ ...layout.page, background: "#f5f6f8" }}>
        <div style={{ maxWidth: 1200, margin: "auto", padding: 24 }}>
          
          {/* BACK */}
          <div
            onClick={() => navigate(-1)}
            style={{
              color: "#2563eb",
              cursor: "pointer",
              fontWeight: 500,
              marginBottom: 20,
            }}
          >
            ← BACK
          </div>

          {/* TITLE */}
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
            Step 4: New BOM Summary & Routing Priority
          </h1>

          <div style={{ color: "#6b7280", marginBottom: 28 }}>
            Review the BOM records to be created
          </div>

          {/* SECTION TITLE */}
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 14 }}>
            Main Summary Table
          </h2>

          {/* TABLE CARD */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
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
                  </tr>
                </thead>

                <tbody>
                  {summaryRows.map((row, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={td}>{row.producedItem}</td>
                      <td style={td}>{row.description}</td>
                      <td style={td}>{row.location}</td>
                      <td style={td}>{row.bomId}</td>
                      <td style={td}>{row.routingId}</td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>

          {/* NOTES */}
          <div style={{ marginTop: 28 }}>
            <textarea
              placeholder="Notes (Optional)"
              style={{
                width: "100%",
                height: 120,
                borderRadius: 6,
                border: "1px solid #d1d5db",
                padding: 16,
                fontSize: 14,
              }}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 20,
            }}
          >
            <button
              onClick={submitBOMs}
              disabled={submitting}
              style={{
                background: "#2e7d32",
                color: "#fff",
                padding: "14px 26px",
                borderRadius: 6,
                border: "none",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting..." : "✅ SUBMIT & CREATE BOM(S)"}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <ResponseModal
          response={response}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/* TABLE STYLES */
const th = {
  textAlign: "left",
  padding: "16px",
  fontSize: 14,
  fontWeight: 600,
  color: "#374151",
};

const td = {
  padding: "16px",
  fontSize: 14,
  color: "#111827",
};