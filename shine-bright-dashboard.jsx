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
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i + 1] === '"') { field += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      row.push(field.trim()); field = "";
    } else if (c === '\n' && !inQ) {
      row.push(field.trim());
      if (row.some(v => v !== "")) rows.push(row);
      row = []; field = "";
    } else if (c === '\r' && !inQ) {
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
      if (lotNumRaw.length === 8 && lotNumRaw.startsWith("001"))
        qboCustomer = `${seg3.toUpperCase()} LOT ${lotNumRaw.substring(3).replace(/^0+/, "") || "0"}`;
      else qboCustomer = `${seg3.toUpperCase()} LOT ${lotNumRaw.replace(/^0+/, "") || lotNumRaw}`;
    } else if (/lennar/i.test(seg1)) {
      const stripped = (lotNumRaw.split(/\s+/)[0] || "").replace(/^0+/, "") || "0";
      qboCustomer = `${seg3.toUpperCase()} LOT ${stripped}`;
    } else qboCustomer = `${seg3.toUpperCase()} LOT ${lotNumRaw}`;
  } else if (numSegs >= 2) {
    if (/LOT/i.test(seg2)) {
      const m = seg2.match(/LOT\s+(\S+)\s+(.*)/i);
      if (m) qboCustomer = m[2].trim() ? `${m[2].trim().replace(/\s+/g, " ").toUpperCase()} LOT ${m[1]}` : "";
    }
    if (!qboCustomer) qboCustomer = `MANUAL: ${seg2}`;
  } else {
    const m = seg1.match(/LOT\s+(\d+)\s+([\w\s]+)$/i);
    qboCustomer = m ? `${m[2].trim().toUpperCase()} LOT ${m[1]}` : `MANUAL: ${title}`;
  }
  return { qboCustomer, serviceType, orderNumber, status: qboCustomer.startsWith("MANUAL") ? "manual" : "ready" };
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #F8FAFC; --surface: #FFFFFF; --surface-hover: #F1F5F9;
    --border: #E2E8F0; --border-light: #F1F5F9;
    --text: #0F172A; --text-2: #475569; --text-3: #94A3B8;
    --gold: #F59E0B; --gold-light: #FEF3C7;
    --blue: #3B82F6; --blue-light: #EFF6FF;
    --green: #10B981; --green-light: #ECFDF5; --green-dark: #065F46;
    --red: #EF4444; --red-light: #FEF2F2;
    --amber: #F59E0B; --amber-light: #FFFBEB;
    --radius: 16px; --radius-sm: 10px; --radius-xs: 6px;
    --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
    --shadow-lg: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
    --shadow-glow: 0 0 40px rgba(245,158,11,0.15);
  }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes checkDraw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
  @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dropGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.2); } 50% { box-shadow: 0 0 24px 4px rgba(245,158,11,0.3); } }
  @keyframes sendPlane { 0% { transform: translateX(0) translateY(0); opacity: 1; } 100% { transform: translateX(60px) translateY(-30px); opacity: 0; } }

  .sb-app {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg); min-height: 100vh; min-height: 100dvh;
    color: var(--text); -webkit-font-smoothing: antialiased;
  }

  .sb-header {
    background: linear-gradient(135deg, #0B1D26 0%, #163040 50%, #1A3A4A 100%);
    padding: 20px 24px; display: flex; align-items: center; gap: 14px;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 2px 20px rgba(0,0,0,0.15);
  }

  .sb-logo {
    width: 42px; height: 42px; border-radius: 12px;
    background: linear-gradient(135deg, #FFD700 0%, #F59E0B 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 800; color: #0B1D26; flex-shrink: 0;
    box-shadow: 0 2px 12px rgba(255,215,0,0.3);
  }

  .sb-header h1 { font-size: 17px; font-weight: 700; color: #FFF; letter-spacing: -0.02em; }
  .sb-header p { font-size: 12px; color: #7BA0B0; margin-top: 2px; }

  .sb-layout { display: flex; min-height: calc(100vh - 82px); min-height: calc(100dvh - 82px); }

  .sb-sidebar {
    width: 250px; padding: 24px 16px; background: var(--surface);
    border-right: 1px solid var(--border-light); flex-shrink: 0;
    display: flex; flex-direction: column; gap: 4px;
  }

  .sb-step-btn {
    display: flex; align-items: center; gap: 12px; padding: 12px 14px;
    border-radius: var(--radius-sm); cursor: pointer; border: none;
    background: transparent; width: 100%; text-align: left;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1); position: relative;
  }
  .sb-step-btn:hover { background: var(--surface-hover); }
  .sb-step-btn.active { background: var(--surface-hover); box-shadow: var(--shadow); }
  .sb-step-btn.disabled { opacity: 0.35; cursor: default; pointer-events: none; }

  .sb-step-num {
    width: 34px; height: 34px; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; font-size: 13px;
    font-weight: 700; flex-shrink: 0; transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
    background: var(--surface-hover); color: var(--text-3);
  }
  .sb-step-num.active { background: #0B1D26; color: #FFF; transform: scale(1.05); }
  .sb-step-num.done { background: var(--green); color: #FFF; }

  .sb-step-label { font-size: 13px; font-weight: 600; color: var(--text); }
  .sb-step-sub { font-size: 11px; color: var(--text-3); margin-top: 1px; }

  .sb-connector { width: 2px; height: 16px; background: var(--border); margin-left: 31px; border-radius: 1px; }
  .sb-connector.done { background: var(--green); }

  .sb-main {
    flex: 1; padding: 32px; overflow-y: auto; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
  }

  .sb-content { width: 100%; max-width: 720px; animation: fadeUp 0.4s cubic-bezier(0.4,0,0.2,1); }

  .sb-card {
    background: var(--surface); border-radius: var(--radius);
    border: 1px solid var(--border-light); box-shadow: var(--shadow);
    padding: 40px; text-align: center;
  }

  .sb-icon-wrap {
    width: 72px; height: 72px; border-radius: 20px; margin: 0 auto 20px;
    display: flex; align-items: center; justify-content: center;
    animation: scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }

  .sb-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; color: var(--text); }
  .sb-desc { font-size: 14px; color: var(--text-2); line-height: 1.7; max-width: 380px; margin: 0 auto; }

  .sb-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; border-radius: var(--radius-sm);
    font-size: 14px; font-weight: 700; border: none; cursor: pointer;
    font-family: inherit; transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    text-decoration: none; position: relative; overflow: hidden;
  }
  .sb-btn:active { transform: scale(0.97); }

  .sb-btn-primary {
    background: linear-gradient(135deg, #FFD700 0%, #F59E0B 100%);
    color: #0B1D26; box-shadow: 0 2px 12px rgba(245,158,11,0.25);
  }
  .sb-btn-primary:hover { box-shadow: 0 4px 20px rgba(245,158,11,0.35); transform: translateY(-1px); }

  .sb-btn-blue {
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    color: #FFF; box-shadow: 0 2px 12px rgba(59,130,246,0.25);
  }
  .sb-btn-blue:hover { box-shadow: 0 4px 20px rgba(59,130,246,0.35); transform: translateY(-1px); }

  .sb-btn-ghost {
    background: none; color: var(--text-3); padding: 8px 16px;
    font-weight: 500; font-size: 13px;
  }
  .sb-btn-ghost:hover { color: var(--text-2); background: var(--surface-hover); }

  .sb-btn-outline {
    background: var(--surface); color: var(--text);
    border: 1px solid var(--border); box-shadow: var(--shadow);
  }
  .sb-btn-outline:hover { background: var(--surface-hover); }

  .sb-btn[disabled] { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  .sb-tip {
    background: var(--surface-hover); border-radius: var(--radius-sm);
    padding: 14px 18px; text-align: left; font-size: 13px;
    color: var(--text-2); line-height: 1.7; margin-top: 20px;
  }
  .sb-tip strong { color: var(--text); }

  .sb-drop {
    border: 2px dashed var(--border); border-radius: var(--radius);
    padding: 56px 40px; text-align: center; cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1); width: 100%;
    background: var(--surface);
  }
  .sb-drop:hover { border-color: var(--gold); background: rgba(245,158,11,0.02); }
  .sb-drop.over { border-color: var(--gold); background: var(--gold-light); animation: dropGlow 1.5s infinite; }

  .sb-drop-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 12px 0 4px; }
  .sb-drop-sub { font-size: 13px; color: var(--text-3); }

  .sb-toolbar {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
  }

  .sb-stats { display: flex; gap: 16px; flex-wrap: wrap; }

  .sb-stat {
    font-size: 12px; color: var(--text-2); display: flex; align-items: center; gap: 4px;
  }
  .sb-stat strong { font-weight: 700; font-family: 'JetBrains Mono', monospace; }

  .sb-filename {
    font-size: 12px; color: var(--text-3); font-family: 'JetBrains Mono', monospace;
    background: var(--surface-hover); padding: 4px 10px; border-radius: var(--radius-xs);
  }

  .sb-table-wrap {
    background: var(--surface); border-radius: var(--radius);
    border: 1px solid var(--border-light); box-shadow: var(--shadow);
    overflow: hidden;
  }

  .sb-table-scroll { max-height: 400px; overflow-y: auto; }

  .sb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sb-table th {
    padding: 10px 14px; text-align: left; font-weight: 600;
    color: var(--text-3); font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.08em; background: var(--surface-hover);
    border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 1;
  }
  .sb-table td {
    padding: 10px 14px; border-bottom: 1px solid var(--border-light);
    transition: background 0.2s;
  }
  .sb-table tr { transition: background 0.2s; }
  .sb-table tbody tr:hover { background: var(--surface-hover); }
  .sb-table tr.row-sent { background: var(--blue-light); }
  .sb-table tr.row-processing { background: var(--blue-light); animation: pulse 1.5s infinite; }
  .sb-table tr.row-error { background: var(--red-light); }

  .sb-td-num { color: var(--text-3); font-family: 'JetBrains Mono', monospace; font-size: 11px; }
  .sb-td-customer { font-weight: 600; color: var(--text); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sb-td-service { color: var(--text-2); font-size: 12px; }
  .sb-td-order { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-3); }
  .sb-td-amount { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 12px; }
  .sb-td-assigned { color: var(--text-3); font-size: 12px; }

  .sb-badge {
    padding: 3px 10px; border-radius: 20px; font-size: 11px;
    font-weight: 600; display: inline-block; letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .sb-badge-ready { background: var(--green-light); color: var(--green-dark); }
  .sb-badge-manual { background: var(--amber-light); color: #92400E; }
  .sb-badge-processing { background: var(--blue-light); color: var(--blue); animation: pulse 1s infinite; }
  .sb-badge-sent { background: var(--blue-light); color: #1E40AF; }
  .sb-badge-error { background: var(--red-light); color: #991B1B; }
  .sb-badge-skipped { background: var(--surface-hover); color: var(--text-3); }

  .sb-result { text-align: center; animation: fadeUp 0.5s cubic-bezier(0.4,0,0.2,1); }

  .sb-result-icon {
    width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 24px;
    display: flex; align-items: center; justify-content: center;
    animation: scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1);
  }
  .sb-result-icon svg { animation: checkDraw 0.5s 0.3s both; }

  .sb-result-title { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
  .sb-result-desc { font-size: 14px; color: var(--text-2); line-height: 1.7; max-width: 380px; margin: 0 auto 28px; }

  .sb-result-grid {
    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
  }

  .sb-result-card {
    background: var(--surface); border: 1px solid var(--border-light);
    border-radius: var(--radius-sm); padding: 16px 24px; min-width: 110px;
    box-shadow: var(--shadow); animation: countUp 0.5s cubic-bezier(0.4,0,0.2,1) both;
  }
  .sb-result-card:nth-child(1) { animation-delay: 0.1s; }
  .sb-result-card:nth-child(2) { animation-delay: 0.2s; }
  .sb-result-card:nth-child(3) { animation-delay: 0.3s; }
  .sb-result-card:nth-child(4) { animation-delay: 0.4s; }

  .sb-result-val {
    font-size: 32px; font-weight: 800; font-family: 'JetBrains Mono', monospace;
    letter-spacing: -0.03em;
  }
  .sb-result-label { font-size: 11px; color: var(--text-3); margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }

  .sb-spinner {
    width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #FFF; border-radius: 50%; animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  /* ---- Mobile / Tablet ---- */
  @media (max-width: 768px) {
    .sb-header { padding: 16px 18px; }
    .sb-header h1 { font-size: 15px; }
    .sb-layout { flex-direction: column; }

    .sb-sidebar {
      width: 100%; flex-direction: row; padding: 12px 16px;
      border-right: none; border-bottom: 1px solid var(--border-light);
      overflow-x: auto; gap: 8px; -webkit-overflow-scrolling: touch;
      justify-content: center;
    }
    .sb-connector { display: none; }
    .sb-step-btn { padding: 8px 12px; min-width: auto; flex-shrink: 0; }
    .sb-step-label { font-size: 11px; }
    .sb-step-sub { display: none; }
    .sb-step-num { width: 28px; height: 28px; font-size: 11px; }

    .sb-main { padding: 20px 16px; min-height: auto; }
    .sb-card { padding: 28px 20px; }
    .sb-title { font-size: 18px; }
    .sb-desc { font-size: 13px; }

    .sb-toolbar { flex-direction: column; align-items: stretch; }
    .sb-stats { justify-content: center; }

    .sb-table th, .sb-table td { padding: 8px 10px; }
    .sb-table .hide-mobile { display: none; }
    .sb-td-customer { max-width: 140px; font-size: 12px; }

    .sb-result-grid { gap: 6px; }
    .sb-result-card { padding: 12px 16px; min-width: 80px; }
    .sb-result-val { font-size: 24px; }

    .sb-drop { padding: 36px 20px; }
  }

  @media (max-width: 480px) {
    .sb-header { gap: 10px; }
    .sb-logo { width: 36px; height: 36px; font-size: 17px; border-radius: 10px; }
    .sb-step-label { display: none; }
    .sb-step-btn { padding: 6px 8px; }
    .sb-btn { padding: 12px 20px; font-size: 13px; }
    .sb-result-title { font-size: 20px; }
  }
`;

const BADGE_MAP = {
  ready: "sb-badge-ready", manual: "sb-badge-manual", processing: "sb-badge-processing",
  sent: "sb-badge-sent", error: "sb-badge-error", skipped: "sb-badge-skipped",
};
const BADGE_LABEL = {
  ready: "Listo", manual: "Manual", processing: "...", sent: "Enviado", error: "Error", skipped: "EPO",
};

function Badge({ status }) {
  return <span className={`sb-badge ${BADGE_MAP[status] || "sb-badge-skipped"}`}>{BADGE_LABEL[status] || "?"}</span>;
}

function CheckIcon({ size = 16, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" strokeDasharray="24" />
    </svg>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const fileRef = useRef();

  const goStep = (n) => { setStep(n); setAnimKey(k => k + 1); };

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
      goStep(3);
    };
    reader.readAsText(f);
  }, []);

  const updateInvoices = async () => {
    setProcessing(true);
    const readyIndices = [];
    rows.forEach((r, i) => { if (r.updateStatus === "ready") readyIndices.push(i); });

    setRows(prev => {
      const n = [...prev];
      readyIndices.forEach(i => { n[i] = { ...n[i], updateStatus: "processing" }; });
      return n;
    });

    const items = readyIndices.map(i => {
      const row = rows[i];
      return {
        qboCustomer: row.qboCustomer, serviceType: row.serviceType,
        serviceId: row.serviceId, orderNumber: row.orderNumber,
        amount: row.amount, assignedTo: row.assignedTo,
        date: row.date, visitTitle: row["Visit title"],
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
    goStep(4);
  };

  const ready = rows.filter(r => r.updateStatus === "ready").length;
  const sent = rows.filter(r => r.updateStatus === "sent").length;
  const total = rows.length;
  const manual = rows.filter(r => r.updateStatus === "manual").length;
  const skipped = rows.filter(r => r.updateStatus === "skipped").length;
  const errors = rows.filter(r => r.updateStatus === "error").length;

  const steps = [
    { n: 1, label: "Extraer", sub: "SupplyPro" },
    { n: 2, label: "Jobber", sub: "Subir CSV" },
    { n: 3, label: "QuickBooks", sub: "Actualizar" },
    { n: 4, label: "Resumen", sub: "Resultados" },
  ];

  return (
    <div className="sb-app">
      <style>{CSS}</style>

      <header className="sb-header">
        <div className="sb-logo">S</div>
        <div>
          <h1>Shine & Bright</h1>
          <p>SupplyPro &rarr; Jobber &rarr; QuickBooks</p>
        </div>
      </header>

      <div className="sb-layout">
        <nav className="sb-sidebar">
          {steps.map((s, i) => (
            <div key={s.n}>
              {i > 0 && <div className={`sb-connector${step > s.n - 1 ? " done" : ""}`} />}
              <button
                className={`sb-step-btn${step === s.n ? " active" : ""}${step < s.n ? " disabled" : ""}`}
                onClick={() => step >= s.n && goStep(s.n)}
              >
                <div className={`sb-step-num${step === s.n ? " active" : ""}${step > s.n ? " done" : ""}`}>
                  {step > s.n ? <CheckIcon size={14} /> : s.n}
                </div>
                <div>
                  <div className="sb-step-label">{s.label}</div>
                  <div className="sb-step-sub">{s.sub}</div>
                </div>
              </button>
            </div>
          ))}
        </nav>

        <main className="sb-main">
          <div className="sb-content" key={animKey}>

            {/* ---- STEP 1: SupplyPro ---- */}
            {step === 1 && (
              <div className="sb-card">
                <div className="sb-icon-wrap" style={{ background: "var(--blue-light)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5">
                    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <h2 className="sb-title">Extraer ordenes de SupplyPro</h2>
                <p className="sb-desc">
                  Se abrira WorkSync Extractor en una nueva ventana. Descarga el CSV de ordenes y luego volve aca.
                </p>
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <a href={SUPPLYPRO_URL} target="_blank" rel="noopener noreferrer" className="sb-btn sb-btn-blue">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                    Abrir SupplyPro Extractor
                  </a>
                  <button className="sb-btn sb-btn-ghost" onClick={() => goStep(2)}>
                    Ya tengo el CSV, continuar &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 2: Jobber ---- */}
            {step === 2 && (
              <div className="sb-card">
                <div className="sb-icon-wrap" style={{ background: "var(--gold-light)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h2 className="sb-title">Subir CSV a Jobber</h2>
                <p className="sb-desc">
                  Importa el CSV de SupplyPro en Jobber. Despues de completar los trabajos, descarga el reporte de Visits.
                </p>
                <div className="sb-tip">
                  <strong>En Jobber:</strong> Reports &rarr; Visits &rarr; Export CSV
                </div>
                <div style={{ marginTop: 24 }}>
                  <button className="sb-btn sb-btn-primary" onClick={() => goStep(3)}>
                    Ya tengo el reporte de Jobber &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 3: Upload CSV ---- */}
            {step === 3 && rows.length === 0 && (
              <div
                className={`sb-drop${dragOver ? " over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={dragOver ? "var(--gold)" : "var(--text-3)"} strokeWidth="1.5" style={{ transition: "stroke 0.3s" }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div className="sb-drop-title">Arrastra el CSV de Jobber aqui</div>
                <div className="sb-drop-sub">Visits Report (.csv) &mdash; o haz click para seleccionar</div>
              </div>
            )}

            {/* ---- STEP 3: Table ---- */}
            {step === 3 && rows.length > 0 && (
              <div style={{ width: "100%", maxWidth: 900 }}>
                <div className="sb-toolbar">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span className="sb-filename">{file?.name}</span>
                    <div className="sb-stats">
                      <span className="sb-stat"><strong>{total}</strong> Total</span>
                      <span className="sb-stat" style={{ color: "var(--green-dark)" }}><strong>{ready + sent}</strong> Listos</span>
                      <span className="sb-stat" style={{ color: "#92400E" }}><strong>{manual}</strong> Manual</span>
                      <span className="sb-stat" style={{ color: "var(--text-3)" }}><strong>{skipped}</strong> EPO</span>
                    </div>
                  </div>
                  <button
                    className={`sb-btn ${processing ? "" : "sb-btn-primary"}`}
                    disabled={processing || ready === 0}
                    onClick={updateInvoices}
                    style={processing ? { background: "var(--text-3)", color: "#FFF" } : {}}
                  >
                    {processing ? <><span className="sb-spinner" /> Enviando...</>
                      : ready === 0 && sent > 0 ? "Enviado"
                      : `Actualizar ${ready} invoices`}
                  </button>
                </div>

                <div className="sb-table-wrap">
                  <div className="sb-table-scroll">
                    <table className="sb-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>QBO Customer</th>
                          <th>Servicio</th>
                          <th className="hide-mobile">Order #</th>
                          <th>$</th>
                          <th className="hide-mobile">Asignado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className={
                            row.updateStatus === "processing" ? "row-processing" :
                            row.updateStatus === "sent" ? "row-sent" :
                            row.updateStatus === "error" ? "row-error" : ""
                          } style={{ animationDelay: `${i * 20}ms` }}>
                            <td className="sb-td-num">{i + 1}</td>
                            <td className="sb-td-customer">{row.qboCustomer}</td>
                            <td className="sb-td-service">{row.serviceType}</td>
                            <td className="sb-td-order hide-mobile">{row.orderNumber}</td>
                            <td className="sb-td-amount">
                              {row.amount ? `$${Math.round(parseFloat(row.amount) * 100) / 100}` : ""}
                            </td>
                            <td className="sb-td-assigned hide-mobile">{row.assignedTo}</td>
                            <td><Badge status={row.updateStatus} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ---- STEP 4: Results ---- */}
            {step === 4 && (
              <div className="sb-result">
                <div className="sb-result-icon" style={{
                  background: sent > 0 ? "var(--blue-light)" : "var(--red-light)"
                }}>
                  {sent > 0 ? (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/>
                    </svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  )}
                </div>
                <h2 className="sb-result-title">
                  {sent > 0 ? "Enviado a Make" : "Error al enviar"}
                </h2>
                {sent > 0 && (
                  <p className="sb-result-desc">
                    Make va a procesar <strong>{sent} invoices</strong> en QuickBooks.
                    Revisa el escenario en Make para confirmar que se completo.
                  </p>
                )}
                <div className="sb-result-grid">
                  {[
                    { label: "Enviados", val: sent, color: "var(--blue)" },
                    { label: "Manuales", val: manual, color: "#D97706" },
                    { label: "EPO", val: skipped, color: "var(--text-3)" },
                    { label: "Errores", val: errors, color: "var(--red)" },
                  ].map((s, i) => (
                    <div className="sb-result-card" key={i}>
                      <div className="sb-result-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="sb-result-label">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 28 }}>
                  <button className="sb-btn sb-btn-outline" onClick={() => { goStep(1); setRows([]); setFile(null); }}>
                    Nuevo reporte
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
