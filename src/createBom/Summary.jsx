import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import StepHeader from "../components/progresscircle";
import ResponseModal from "./ResponseModal";
import { postbomtable } from "../Services/Apirequest";
import { useScreen } from "../customhooks/useDevice";
import { layout, typography, cards, tables, buttons, tokens } from "../styles/layout";

export default function SummaryPage() {
  const screen = useScreen();
  const routerLocation = useLocation();

  const [response, setResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const producedItems = routerLocation?.state?.producedItems || null;

  const summaryRows = useMemo(() => {
    if (producedItems?.length) {
      return producedItems.map((p, idx) => ({
        location: p.location || "-",
        producedItem: p.id || "-",
        bomId: p.bomId || `AUTO_BOM_${idx + 1}`,
        routingId: p.routingId || `AUTO_ROUTING_${idx + 1}`,
      }));
    }

    return [
      {
        location: "1",
        producedItem: "Item123",
        bomId: "PRIMARY_Item123_1",
        routingId: "ROUTING_Item123_1_Resource1",
      },
      {
        location: "1",
        producedItem: "Item456",
        bomId: "BOM1_Item456_1",
        routingId: "ROUTING_Item456_2_Resource2",
      },
    ];
  }, [producedItems]);

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
      <div style={layout.page}>
        <div style={layout.container(screen)}>
          <h1 style={typography.pageTitle(screen)}>Create New BOM - Start from Scratch</h1>
          <div style={typography.subtitle(screen)}>Multi-location BOM creation wizard</div>

          <div style={{ marginTop: 14 }}>
            <StepHeader activeStep={4}/>
          </div>

          <div style={{ ...cards.container, marginTop: 16 }}>
            <div style={cards.header(screen)}>
              <div style={typography.sectionTitle}>Step 4: Summary</div>
              <div style={{ ...typography.helperText, marginTop: 6 }}>
                Review and submit your BOM data
              </div>
              <div style={{ height: 1, background: tokens.colors.border, marginTop: 16 }} />
            </div>

            <div style={cards.padding(screen)}>
              <div
                style={{
                  display: "flex",
                  gap: screen.isMobile ? 24 : 80,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ fontSize: 18 }}>📄</div>
                  <div>
                    <div style={{ fontSize: 12, color: tokens.colors.textMuted }}>
                      Engineering Change #
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>EC-721362</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ fontSize: 18 }}>📅</div>
                  <div>
                    <div style={{ fontSize: 12, color: tokens.colors.textMuted }}>
                      Creation Date
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>04/16/2026</div>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={tables.table}>
                  <thead>
                    <tr>
                      <th style={tables.th}>LOCATION</th>
                      <th style={tables.th}>PRODUCED ITEM</th>
                      <th style={tables.th}>BOM ID</th>
                      <th style={tables.th}>ROUTING ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={tables.td}>{row.location}</td>
                        <td style={tables.td}>{row.producedItem}</td>
                        <td style={tables.td}>{row.bomId}</td>
                        <td style={tables.td}>{row.routingId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  onClick={submitBOMs}
                  disabled={submitting}
                  style={{
                    ...buttons.base,
                    ...(submitting ? buttons.disabled : buttons.success),
                  }}
                >
                  {submitting ? "Submitting..." : "Submit & Create BOMs"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && <ResponseModal response={response} onClose={() => setShowModal(false)} />}
    </>
  );
}