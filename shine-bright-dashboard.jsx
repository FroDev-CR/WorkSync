import { useState, useCallback, useRef } from "react";

const WEBHOOK_URL = "/api/webhook";
const SUPPLYPRO_URL = "https://worksyncextractor.streamlit.app/";

const KNOWN_SERVICES = [
  "EXTRA RECLEAN","ROUGH RECLEAN","TLC RECLEAN","PSD RECLEAN",
  "CELEBRATION WALK CLEAN","ROUGH CLEAN","FINAL CLEAN","FIRST WASH",
  "QA CLEAN","NHO CLEAN","PSD CLEAN","SITE CLEAN","BRICK CLEAN",
  "TOUCH UP","EXTRA LABOR","CARPET STAINS","RECLEAN","REWASH","BARRER"
];

const SERVICE_IDS = {
  "FIRST WASH": "1010000182", "EXTRA RECLEAN": "1010000201",
  "FINAL CLEAN": "1010000063", "QA CLEAN": "1010000064",
  "NHO CLEAN": "1010000062", "RECLEAN": "1010000251",
  "REWASH": "1010000092", "ROUGH RECLEAN": "1010000003",
  "TOUCH UP": "1010000031", "PSD RECLEAN": "1010000101",
  "SITE CLEAN": "1010000141",
};

function parseCSV(text) {
  // Single-pass parser that handles quoted fields with commas and newlines
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i + 1] === '"') { field += '"'; i++; } // escaped ""
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      row.push(field.trim()); field = "";
    } else if (c === '\n' && !inQ) {
      row.push(field.trim());
      if (row.some(v => v !== "")) rows.push(row);
      row = []; field = "";
    } else if (c === '\r' && !inQ) {
      // skip
    } else {
      field += c;
    }
  }
  row.push(field.trim());
  if (row.some(v => v !== "")) rows.push(row);

  const headers = rows[0];
  return rows.slice(1).map(vals => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
    return obj;
  });
}

function extractServiceType(seg1) {
  const raw = (seg1.match(/.+\s-\s(.+)$/) || [])[1] || seg1;
  const clean = raw.toUpperCase().replace(/RE-CLEAN/g, "RECLEAN").replace(/RE CLEAN/g, "RECLEAN");
  for (const svc of KNOWN_SERVICES) { if (clean.includes(svc)) return svc; }
  return clean;
}

function parseVisitTitle(title) {
  if (!title) return { qboCustomer: "", serviceType: "", orderNumber: "", status: "empty" };
  const segments = title.split("/").map(s => s.trim());
  const seg1 = segments[0] || "", seg2 = segments[1] || "", seg3 = segments[2] || "", seg4 = segments[3] || "";
  const numSegs = [seg1, seg2, seg3, seg4].filter(Boolean).length;
  const serviceType = extractServiceType(seg1);
  let qboCustomer = "", orderNumber = "";

  if (numSegs >= 4) {
    const lotNumRaw = seg2.replace(/^LOT\s+/i, "");
    orderNumber = seg4;
    if (/DRB/i.test(seg1)) {
      const stripped = lotNumRaw.replace(/\./g, "").substring(2).replace(/^0+/, "") || "0";
      const subdiv = seg3.replace(/^\d+\s+/, "").replace(/\s+(TH|SF|MF)$/i, "").toUpperCase();
      qboCustomer = `${subdiv} LOT ${stripped}`;
    } else if (/LGI/i.test(seg1)) {
      if (lotNumRaw.length === 8 && lotNumRaw.startsWith("001")) {
        qboCustomer = `${seg3.toUpperCase()} LOT ${lotNumRaw.substring(3).replace(/^0+/, "") || "0"}`;
      } else {
        qboCustomer = `${seg3.toUpperCase()} LOT ${lotNumRaw.replace(/^0+/, "") || lotNumRaw}`;
      }
    } else if (/lennar/i.test(seg1)) {
      const stripped = (lotNumRaw.split(/\s+/)[0] || "").replace(/^0+/, "") || "0";
      qboCustomer = `${seg3.toUpperCase()} LOT ${stripped}`;
    } else {
      qboCustomer = `${seg3.toUpperCase()} LOT ${lotNumRaw}`;
    }
  } else if (numSegs >= 2) {
    if (/LOT/i.test(seg2)) {
      const m = seg2.match(/LOT\s+(\S+)\s+(.*)/i);
      if (m) { qboCustomer = m[2].trim() ? `${m[2].trim().replace(/\s+/g, " ").toUpperCase()} LOT ${m[1]}` : ""; }
    }
    if (!qboCustomer) qboCustomer = `MANUAL: ${seg2}`;
  } else {
    const m = seg1.match(/LOT\s+(\d+)\s+([\w\s]+)$/i);
    qboCustomer = m ? `${m[2].trim().toUpperCase()} LOT ${m[1]}` : `MANUAL: ${title}`;
  }

  return { qboCustomer, serviceType, orderNumber, status: qboCustomer.startsWith("MANUAL") ? "manual" : "ready" };
}

function Badge({ status }) {
  const s = {
    ready: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0", label: "Listo" },
    manual: { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A", label: "Manual" },
    processing: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", label: "..." },
    sent: { bg: "#EFF6FF", color: "#1E40AF", border: "#93C5FD", label: "Enviado" },
    error: { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA", label: "Error" },
    skipped: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB", label: "EPO" },
  }[status] || { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB", label: "?" };
  return (
    <span style={{
      padding: "2px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: "0.03em", display: "inline-block"
    }}>{s.label}</span>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const processFile = useCallback((f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvRows = parseCSV(e.target.result);
      const processed = csvRows.map((row) => {
        const parsed = parseVisitTitle(row["Visit title"] || "");
        const orderNum = parsed.orderNumber || row["ORDER NUMBER"] || "";
        const isEPO = orderNum.includes("EPO") || (row["ORDER NUMBER"] || "").includes("EPO");
        return {
          ...row, ...parsed, orderNumber: orderNum,
          amount: row["One-off job ($)"] || "",
          assignedTo: row["Assigned to"] || "",
          date: row["Date"] || "",
          updateStatus: isEPO ? "skipped" : parsed.status === "manual" ? "manual" : "ready",
          serviceId: SERVICE_IDS[parsed.serviceType] || "",
        };
      });
      setRows(processed);
      setStep(3);
    };
    reader.readAsText(f);
  }, []);

  const updateInvoices = async () => {
    setProcessing(true);
    // Save indices of ready rows before any state changes
    const readyIndices = [];
    rows.forEach((r, i) => { if (r.updateStatus === "ready") readyIndices.push(i); });

    // Mark all ready rows as processing
    setRows(prev => {
      const n = [...prev];
      readyIndices.forEach(i => { n[i] = { ...n[i], updateStatus: "processing" }; });
      return n;
    });

    // Send all rows in a single batch to the webhook
    const items = readyIndices.map(i => {
      const row = rows[i];
      return {
        qboCustomer: row.qboCustomer,
        serviceType: row.serviceType,
        serviceId: row.serviceId,
        orderNumber: row.orderNumber,
        amount: row.amount,
        assignedTo: row.assignedTo,
        date: row.date,
        visitTitle: row["Visit title"],
        qboQuery: `select * from customer where DisplayName like '%${row.qboCustomer}%'`,
      };
    });

    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const newStatus = resp.ok ? "sent" : "error";
      setRows(prev => {
        const n = [...prev];
        readyIndices.forEach(i => { n[i] = { ...n[i], updateStatus: newStatus }; });
        return n;
      });
    } catch {
      setRows(prev => {
        const n = [...prev];
        readyIndices.forEach(i => { n[i] = { ...n[i], updateStatus: "error" }; });
        return n;
      });
    }

    setProcessing(false);
    setCurrentIdx(-1);
    setStep(4);
  };

  const ready = rows.filter(r => r.updateStatus === "ready").length;
  const sent = rows.filter(r => r.updateStatus === "sent").length;
  const total = rows.length;
  const manual = rows.filter(r => r.updateStatus === "manual").length;
  const skipped = rows.filter(r => r.updateStatus === "skipped").length;

  const stepStyle = (n) => ({
    display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px",
    borderRadius: "12px", cursor: "pointer",
    background: step === n ? "var(--color-background-primary, #FFFFFF)" : "transparent",
    border: step === n ? "1px solid var(--color-border-secondary, #CBD5E1)" : "1px solid transparent",
    opacity: step >= n ? 1 : 0.4, transition: "all 0.2s",
  });

  const stepNum = (n, done) => ({
    width: "32px", height: "32px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px", fontWeight: 700, flexShrink: 0,
    background: done ? "#065F46" : step === n ? "#0B1D26" : "var(--color-background-secondary, #F1F5F9)",
    color: done || step === n ? "#FFFFFF" : "var(--color-text-secondary, #6B7280)",
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{
        background: "linear-gradient(135deg, #0B1D26 0%, #1A3A4A 100%)",
        padding: "24px 28px", borderRadius: "14px 14px 0 0",
        display: "flex", alignItems: "center", gap: "14px"
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "11px",
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "20px", fontWeight: 800, color: "#0B1D26", flexShrink: 0
        }}>S</div>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#FFF", letterSpacing: "-0.02em" }}>
            Shine & Bright — Centro de control
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: "#8BAAB8" }}>
            SupplyPro → Jobber → QuickBooks
          </p>
        </div>
      </div>

      <div style={{
        background: "var(--color-background-primary, #FFF)",
        border: "0.5px solid var(--color-border-tertiary, #E5E7EB)",
        borderTop: "none", borderRadius: "0 0 14px 14px",
        display: "flex", minHeight: "420px"
      }}>
        <div style={{
          width: "260px", padding: "20px 16px",
          borderRight: "0.5px solid var(--color-border-tertiary, #E5E7EB)",
          display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0
        }}>
          <div style={stepStyle(1)} onClick={() => setStep(1)}>
            <div style={stepNum(1, step > 1)}>
              {step > 1 ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg> : "1"}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary, #1F2937)" }}>Extraer órdenes</div>
              <div style={{ fontSize: "11px", color: "var(--color-text-tertiary, #9CA3AF)" }}>SupplyPro</div>
            </div>
          </div>

          <div style={{ width: "1px", height: "12px", background: "var(--color-border-tertiary, #D1D5DB)", marginLeft: "32px" }} />

          <div style={stepStyle(2)} onClick={() => step >= 2 && setStep(2)}>
            <div style={stepNum(2, step > 2)}>
              {step > 2 ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg> : "2"}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary, #1F2937)" }}>Subir a Jobber</div>
              <div style={{ fontSize: "11px", color: "var(--color-text-tertiary, #9CA3AF)" }}>Importar CSV</div>
            </div>
          </div>

          <div style={{ width: "1px", height: "12px", background: "var(--color-border-tertiary, #D1D5DB)", marginLeft: "32px" }} />

          <div style={stepStyle(3)} onClick={() => step >= 3 && setStep(3)}>
            <div style={stepNum(3, step > 3)}>
              {step > 3 ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg> : "3"}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary, #1F2937)" }}>Actualizar QBO</div>
              <div style={{ fontSize: "11px", color: "var(--color-text-tertiary, #9CA3AF)" }}>CSV de Jobber</div>
            </div>
          </div>

          <div style={{ width: "1px", height: "12px", background: "var(--color-border-tertiary, #D1D5DB)", marginLeft: "32px" }} />

          <div style={stepStyle(4)}>
            <div style={stepNum(4, step >= 4)}>
              {step >= 4 ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg> : "4"}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary, #1F2937)" }}>Resumen</div>
              <div style={{ fontSize: "11px", color: "var(--color-text-tertiary, #9CA3AF)" }}>Resultados</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
          
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "20px" }}>
              <div style={{ textAlign: "center", maxWidth: "380px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary, #9CA3AF)" strokeWidth="1.5">
                    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary, #1F2937)" }}>
                  Extraer órdenes de SupplyPro
                </h2>
                <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--color-text-secondary, #6B7280)", lineHeight: 1.6 }}>
                  Se abrirá WorkSync Extractor en una nueva pestaña. Descargá el CSV de órdenes y luego volvé acá.
                </p>
                <a href={SUPPLYPRO_URL} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                  color: "#FFF", border: "none", borderRadius: "10px",
                  padding: "12px 28px", fontSize: "14px", fontWeight: 700,
                  textDecoration: "none", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                  Abrir SupplyPro Extractor
                </a>
              </div>
              <button onClick={() => setStep(2)} style={{
                background: "none", border: "none", color: "var(--color-text-secondary, #6B7280)",
                cursor: "pointer", fontSize: "13px", marginTop: "12px",
                textDecoration: "underline", fontFamily: "'DM Sans', sans-serif"
              }}>
                Ya tengo el CSV, continuar →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "20px" }}>
              <div style={{ textAlign: "center", maxWidth: "400px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary, #9CA3AF)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary, #1F2937)" }}>
                  Subir CSV de órdenes a Jobber
                </h2>
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--color-text-secondary, #6B7280)", lineHeight: 1.6 }}>
                  Importá el CSV de SupplyPro en Jobber. Después de que se completen los trabajos, descargá el reporte de Visits desde Jobber.
                </p>
                <div style={{
                  background: "var(--color-background-secondary, #F8FAFC)", borderRadius: "8px",
                  padding: "12px 16px", margin: "16px 0", textAlign: "left",
                  fontSize: "12px", color: "var(--color-text-secondary, #6B7280)", lineHeight: 1.7
                }}>
                  <strong style={{ color: "var(--color-text-primary, #374151)" }}>En Jobber:</strong> Reports → Visits → Export CSV
                </div>
              </div>
              <button onClick={() => setStep(3)} style={{
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                color: "#0B1D26", border: "none", borderRadius: "10px",
                padding: "12px 28px", fontSize: "14px", fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
              }}>
                Ya tengo el reporte de Jobber →
              </button>
            </div>
          )}

          {step === 3 && rows.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#FFD700" : "var(--color-border-secondary, #CBD5E1)"}`,
                  borderRadius: "12px", padding: "48px 40px", textAlign: "center", cursor: "pointer",
                  background: dragOver ? "rgba(255,215,0,0.05)" : "transparent",
                  transition: "all 0.2s", width: "100%", maxWidth: "440px"
                }}
              >
                <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary, #9CA3AF)" strokeWidth="1.5" style={{ marginBottom: "12px" }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary, #1F2937)", margin: "0 0 4px" }}>
                  Arrastrá el CSV de Jobber aquí
                </p>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary, #9CA3AF)", margin: 0 }}>
                  Visits Report (.csv)
                </p>
              </div>
            </div>
          )}

          {step === 3 && rows.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary, #6B7280)", fontFamily: "'DM Mono', monospace" }}>
                    {file?.name}
                  </span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {[
                      { label: "Total", val: total, color: "var(--color-text-primary, #1F2937)" },
                      { label: "Listos", val: ready + sent, color: "#065F46" },
                      { label: "Manual", val: manual, color: "#92400E" },
                      { label: "EPO", val: skipped, color: "#6B7280" },
                    ].map((s, i) => (
                      <span key={i} style={{ fontSize: "12px", color: s.color }}>
                        <strong>{s.val}</strong> {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={updateInvoices}
                  disabled={processing || ready === 0}
                  style={{
                    background: processing ? "#64748B" : "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: processing ? "#FFF" : "#0B1D26",
                    border: "none", borderRadius: "10px",
                    padding: "10px 22px", fontSize: "13px", fontWeight: 700,
                    cursor: processing || ready === 0 ? "not-allowed" : "pointer",
                    opacity: processing || ready === 0 ? 0.7 : 1,
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap"
                  }}
                >
                  {processing ? "Enviando a Make..." :
                   ready === 0 && sent > 0 ? "Enviado" :
                   `Actualizar ${ready} invoices`}
                </button>
              </div>

              <div style={{
                borderRadius: "10px", overflow: "hidden",
                border: "0.5px solid var(--color-border-tertiary, #E5E7EB)"
              }}>
                <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr style={{ background: "var(--color-background-secondary, #F9FAFB)" }}>
                        {["#", "QBO Customer", "Servicio", "Order #", "$", "Asignado", ""].map((h, i) => (
                          <th key={i} style={{
                            padding: "8px 10px", textAlign: "left", fontWeight: 600,
                            color: "var(--color-text-secondary, #6B7280)", fontSize: "10px",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            borderBottom: "0.5px solid var(--color-border-tertiary, #E5E7EB)"
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{
                          borderBottom: "0.5px solid var(--color-border-tertiary, #F1F5F9)",
                          background: row.updateStatus === "processing" ? "rgba(59,130,246,0.04)" :
                                      row.updateStatus === "sent" ? "rgba(59,130,246,0.04)" :
                                      row.updateStatus === "error" ? "rgba(239,68,68,0.04)" : "transparent",
                          transition: "background 0.3s"
                        }}>
                          <td style={{ padding: "7px 10px", color: "var(--color-text-tertiary, #9CA3AF)", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{i + 1}</td>
                          <td style={{ padding: "7px 10px", fontWeight: 500, color: "var(--color-text-primary, #1F2937)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.qboCustomer}
                          </td>
                          <td style={{ padding: "7px 10px", color: "var(--color-text-secondary, #4B5563)", fontSize: "11px" }}>{row.serviceType}</td>
                          <td style={{ padding: "7px 10px", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--color-text-secondary, #6B7280)" }}>{row.orderNumber}</td>
                          <td style={{ padding: "7px 10px", fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: "11px" }}>
                            {row.amount ? `$${Math.round(parseFloat(row.amount) * 100) / 100}` : ""}
                          </td>
                          <td style={{ padding: "7px 10px", color: "var(--color-text-secondary, #6B7280)", fontSize: "11px" }}>{row.assignedTo}</td>
                          <td style={{ padding: "7px 10px" }}><Badge status={row.updateStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={sent > 0 ? "#1E40AF" : "#991B1B"} strokeWidth="2">
                {sent > 0
                  ? <><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/></>
                  : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
              </svg>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--color-text-primary, #1F2937)" }}>
                {sent > 0 ? "Enviado a Make" : "Error al enviar"}
              </h2>
              {sent > 0 && (
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary, #6B7280)", textAlign: "center", maxWidth: "360px", lineHeight: 1.6 }}>
                  Make va a procesar {sent} invoices en QuickBooks. Revisá el escenario en Make para confirmar que se completó.
                </p>
              )}
              <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                {[
                  { label: "Enviados", val: sent, color: "#1E40AF" },
                  { label: "Manuales", val: manual, color: "#92400E" },
                  { label: "Omitidos (EPO)", val: skipped, color: "#6B7280" },
                  { label: "Errores", val: rows.filter(r => r.updateStatus === "error").length, color: "#991B1B" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary, #6B7280)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setStep(1); setRows([]); setFile(null); }} style={{
                background: "var(--color-background-secondary, #F1F5F9)",
                color: "var(--color-text-primary, #374151)",
                border: "0.5px solid var(--color-border-secondary, #CBD5E1)",
                borderRadius: "10px", padding: "10px 24px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", marginTop: "16px", fontFamily: "'DM Sans', sans-serif"
              }}>
                Nuevo reporte
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
