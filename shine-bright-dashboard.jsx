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

/* ═══════════════════ CSV & TITLE PARSING (unchanged) ═══════════════════ */

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
    } else { field += c; }
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

/* ═══════════════════ DESIGN SYSTEM ═══════════════════ */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: 100%; }
  body { height: 100%; margin: 0; }
  #root { height: 100%; }

  :root {
    --bg: #F4F4F5;
    --surface: #FFFFFF;
    --surface-2: #FAFAFA;
    --border: #E4E4E7;
    --border-light: #F4F4F5;

    --text: #18181B;
    --text-2: #52525B;
    --text-3: #A1A1AA;
    --text-inv: #FAFAFA;

    --sidebar: #18181B;
    --sidebar-hover: #27272A;
    --sidebar-active: #3F3F46;
    --sidebar-text: #A1A1AA;
    --sidebar-text-active: #FAFAFA;

    --accent: #6366F1;
    --accent-light: #EEF2FF;
    --accent-dark: #4F46E5;

    --emerald: #10B981;
    --emerald-light: #ECFDF5;
    --emerald-dark: #065F46;

    --amber: #F59E0B;
    --amber-light: #FFFBEB;

    --red: #EF4444;
    --red-light: #FEF2F2;

    --radius: 12px;
    --radius-sm: 8px;
    --radius-xs: 5px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  }

  @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes countUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes glow { 0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,.15) } 50% { box-shadow:0 0 20px 4px rgba(99,102,241,.2) } }
  @keyframes gradientMove { 0% { background-position:0% 50% } 50% { background-position:100% 50% } 100% { background-position:0% 50% } }

  /* ---- App Shell ---- */
  .ws { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; display:flex; height:100vh; height:100dvh; color:var(--text); -webkit-font-smoothing:antialiased; background:var(--bg); }

  /* ---- Sidebar ---- */
  .ws-side {
    width:240px; background:var(--sidebar); display:flex; flex-direction:column;
    padding:0; flex-shrink:0; overflow:hidden;
  }

  .ws-brand {
    padding:24px 20px 28px; display:flex; align-items:center; gap:12px;
    border-bottom:1px solid rgba(255,255,255,.06);
  }

  .ws-logo {
    width:36px; height:36px; border-radius:10px; flex-shrink:0;
    background:linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 8px rgba(99,102,241,.35);
  }

  .ws-brand-name { font-size:16px; font-weight:800; color:var(--text-inv); letter-spacing:-.03em; }
  .ws-brand-sub { font-size:11px; color:var(--sidebar-text); margin-top:1px; letter-spacing:.01em; }

  .ws-nav { padding:16px 12px; display:flex; flex-direction:column; gap:2px; flex:1; }

  .ws-nav-item {
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    border-radius:var(--radius-sm); cursor:pointer; border:none;
    background:transparent; width:100%; text-align:left; color:var(--sidebar-text);
    transition:all .15s ease; font-family:inherit; font-size:13px; font-weight:500;
  }
  .ws-nav-item:hover { background:var(--sidebar-hover); color:var(--sidebar-text-active); }
  .ws-nav-item.active { background:var(--sidebar-active); color:var(--sidebar-text-active); }
  .ws-nav-item.disabled { opacity:.25; pointer-events:none; }

  .ws-nav-num {
    width:26px; height:26px; border-radius:7px; display:flex;
    align-items:center; justify-content:center; font-size:11px;
    font-weight:700; flex-shrink:0; transition:all .2s ease;
    background:var(--sidebar-hover); color:var(--sidebar-text);
  }
  .ws-nav-item.active .ws-nav-num { background:var(--accent); color:#FFF; }
  .ws-nav-item.done .ws-nav-num { background:var(--emerald); color:#FFF; }

  .ws-nav-label { line-height:1.2; }
  .ws-nav-sub { font-size:10px; color:var(--sidebar-text); opacity:.6; margin-top:1px; font-weight:400; }

  .ws-side-footer {
    padding:16px 20px; border-top:1px solid rgba(255,255,255,.06);
    font-size:10px; color:rgba(255,255,255,.2); letter-spacing:.02em;
  }

  /* ---- Main ---- */
  .ws-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

  .ws-topbar {
    height:56px; background:var(--surface); border-bottom:1px solid var(--border);
    display:flex; align-items:center; padding:0 28px; flex-shrink:0;
  }
  .ws-topbar-title { font-size:14px; font-weight:600; color:var(--text); }
  .ws-topbar-sub { font-size:12px; color:var(--text-3); margin-left:8px; }

  .ws-body {
    flex:1; overflow-y:auto; padding:32px;
    display:flex; align-items:center; justify-content:center;
  }

  .ws-content { width:100%; max-width:680px; animation:fadeUp .35s ease; }

  /* ---- Card ---- */
  .ws-card {
    background:var(--surface); border-radius:var(--radius); border:1px solid var(--border);
    padding:48px 40px; text-align:center; box-shadow:var(--shadow-sm);
  }

  .ws-icon-box {
    width:64px; height:64px; border-radius:16px; margin:0 auto 20px;
    display:flex; align-items:center; justify-content:center;
    animation:scaleIn .4s cubic-bezier(.34,1.56,.64,1);
  }

  .ws-card h2 { font-size:20px; font-weight:700; letter-spacing:-.02em; margin-bottom:8px; }
  .ws-card p { font-size:14px; color:var(--text-2); line-height:1.65; max-width:360px; margin:0 auto; }

  /* ---- Buttons ---- */
  .ws-btn {
    display:inline-flex; align-items:center; gap:8px; padding:10px 22px;
    border-radius:var(--radius-sm); font-size:13px; font-weight:600;
    border:none; cursor:pointer; font-family:inherit;
    transition:all .15s ease; text-decoration:none;
  }
  .ws-btn:active { transform:scale(.97); }
  .ws-btn[disabled] { opacity:.4; cursor:not-allowed; transform:none!important; }

  .ws-btn-accent {
    background:var(--accent); color:#FFF;
    box-shadow:0 1px 3px rgba(99,102,241,.25), 0 0 0 1px rgba(99,102,241,.1);
  }
  .ws-btn-accent:hover { background:var(--accent-dark); box-shadow:0 2px 8px rgba(99,102,241,.3); }

  .ws-btn-ghost { background:transparent; color:var(--text-3); }
  .ws-btn-ghost:hover { color:var(--text-2); background:var(--surface-2); }

  .ws-btn-outline { background:var(--surface); color:var(--text); border:1px solid var(--border); }
  .ws-btn-outline:hover { background:var(--surface-2); border-color:var(--text-3); }

  .ws-hint {
    background:var(--surface-2); border:1px solid var(--border-light); border-radius:var(--radius-sm);
    padding:12px 16px; text-align:left; font-size:13px; color:var(--text-2); line-height:1.6; margin-top:20px;
  }
  .ws-hint strong { color:var(--text); font-weight:600; }

  /* ---- Drop Zone ---- */
  .ws-drop {
    border:2px dashed var(--border); border-radius:var(--radius); padding:52px 40px;
    text-align:center; cursor:pointer; transition:all .2s ease;
    width:100%; background:var(--surface);
  }
  .ws-drop:hover { border-color:var(--accent); background:var(--accent-light); }
  .ws-drop.over { border-color:var(--accent); background:var(--accent-light); animation:glow 1.5s infinite; }
  .ws-drop h3 { font-size:15px; font-weight:700; margin:14px 0 4px; }
  .ws-drop span { font-size:13px; color:var(--text-3); }

  /* ---- Table ---- */
  .ws-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
  .ws-stats { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
  .ws-stat { font-size:12px; color:var(--text-2); }
  .ws-stat b { font-family:'JetBrains Mono',monospace; font-weight:600; }
  .ws-file { font-size:11px; color:var(--text-3); font-family:'JetBrains Mono',monospace; background:var(--surface-2); padding:3px 8px; border-radius:var(--radius-xs); border:1px solid var(--border-light); }

  .ws-tbl-wrap { background:var(--surface); border-radius:var(--radius); border:1px solid var(--border); overflow:hidden; box-shadow:var(--shadow-sm); }
  .ws-tbl-scroll { max-height:420px; overflow-y:auto; }

  .ws-tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .ws-tbl th { padding:10px 14px; text-align:left; font-weight:600; color:var(--text-3); font-size:10px; text-transform:uppercase; letter-spacing:.07em; background:var(--surface-2); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:1; }
  .ws-tbl td { padding:9px 14px; border-bottom:1px solid var(--border-light); }
  .ws-tbl tbody tr { transition:background .15s; }
  .ws-tbl tbody tr:hover { background:var(--surface-2); }
  .ws-tbl tr.r-sent { background:var(--accent-light); }
  .ws-tbl tr.r-proc { background:var(--accent-light); animation:pulse 1.2s infinite; }
  .ws-tbl tr.r-err { background:var(--red-light); }
  .ws-tbl .mono { font-family:'JetBrains Mono',monospace; font-size:11px; }
  .ws-tbl .dim { color:var(--text-3); }
  .ws-tbl .cust { font-weight:600; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  /* ---- Badges ---- */
  .ws-badge { padding:2px 9px; border-radius:20px; font-size:10px; font-weight:600; display:inline-block; letter-spacing:.03em; text-transform:uppercase; }
  .ws-b-ready { background:var(--emerald-light); color:var(--emerald-dark); }
  .ws-b-manual { background:var(--amber-light); color:#92400E; }
  .ws-b-proc { background:var(--accent-light); color:var(--accent); animation:pulse 1s infinite; }
  .ws-b-sent { background:var(--accent-light); color:var(--accent-dark); }
  .ws-b-err { background:var(--red-light); color:#991B1B; }
  .ws-b-skip { background:var(--surface-2); color:var(--text-3); }

  /* ---- Result ---- */
  .ws-result { text-align:center; animation:fadeUp .4s ease; }
  .ws-result-icon { width:72px; height:72px; border-radius:50%; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; animation:scaleIn .5s cubic-bezier(.34,1.56,.64,1); }
  .ws-result h2 { font-size:22px; font-weight:800; letter-spacing:-.03em; margin-bottom:6px; }
  .ws-result p { font-size:14px; color:var(--text-2); line-height:1.6; max-width:360px; margin:0 auto 24px; }
  .ws-result-grid { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
  .ws-result-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px 22px; min-width:100px; animation:countUp .4s ease both; }
  .ws-result-card:nth-child(1) { animation-delay:.1s } .ws-result-card:nth-child(2) { animation-delay:.18s } .ws-result-card:nth-child(3) { animation-delay:.26s } .ws-result-card:nth-child(4) { animation-delay:.34s }
  .ws-result-num { font-size:28px; font-weight:800; font-family:'JetBrains Mono',monospace; letter-spacing:-.03em; }
  .ws-result-lbl { font-size:10px; color:var(--text-3); margin-top:2px; font-weight:500; text-transform:uppercase; letter-spacing:.05em; }

  .ws-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-top-color:#FFF; border-radius:50%; animation:spin .5s linear infinite; display:inline-block; }

  /* ---- Mobile ---- */
  @media (max-width:768px) {
    .ws { flex-direction:column; }
    .ws-side {
      width:100%; flex-direction:row; align-items:center;
      padding:0; overflow-x:auto;
    }
    .ws-brand { padding:12px 16px; border-bottom:none; border-right:1px solid rgba(255,255,255,.06); flex-shrink:0; }
    .ws-brand-sub { display:none; }
    .ws-nav { flex-direction:row; padding:8px; gap:4px; flex:1; }
    .ws-nav-sub { display:none; }
    .ws-nav-item { padding:6px 10px; font-size:12px; flex-shrink:0; }
    .ws-nav-num { width:22px; height:22px; font-size:10px; border-radius:6px; }
    .ws-side-footer { display:none; }

    .ws-topbar { display:none; }
    .ws-body { padding:20px 16px; }
    .ws-card { padding:32px 20px; }
    .ws-card h2 { font-size:18px; }
    .ws-toolbar { flex-direction:column; align-items:stretch; }
    .ws-stats { justify-content:center; }
    .ws-tbl .hm { display:none; }
    .ws-tbl .cust { max-width:130px; font-size:12px; }
    .ws-result-card { padding:12px 14px; min-width:75px; }
    .ws-result-num { font-size:22px; }
    .ws-drop { padding:36px 20px; }
  }

  @media (max-width:480px) {
    .ws-brand-name { font-size:14px; }
    .ws-logo { width:30px; height:30px; border-radius:8px; }
    .ws-logo svg { width:16px; height:16px; }
    .ws-nav-label { display:none; }
    .ws-btn { padding:10px 18px; font-size:12px; }
  }
`;

/* ═══════════════════ COMPONENTS ═══════════════════ */

const BADGE_CLS = { ready:"ws-b-ready", manual:"ws-b-manual", processing:"ws-b-proc", sent:"ws-b-sent", error:"ws-b-err", skipped:"ws-b-skip" };
const BADGE_TXT = { ready:"Listo", manual:"Manual", processing:"...", sent:"Enviado", error:"Error", skipped:"EPO" };

function Badge({ status }) {
  return <span className={`ws-badge ${BADGE_CLS[status]||"ws-b-skip"}`}>{BADGE_TXT[status]||"?"}</span>;
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" stroke="rgba(255,255,255,.85)"/>
      <path d="M3 11V9a4 4 0 014-4h14" stroke="rgba(255,255,255,.85)"/>
      <path d="M7 23l-4-4 4-4" stroke="rgba(255,255,255,.5)"/>
      <path d="M21 13v2a4 4 0 01-4 4H3" stroke="rgba(255,255,255,.5)"/>
    </svg>
  );
}

function Chk({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
}

/* ═══════════════════ APP ═══════════════════ */

export default function App() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const fileRef = useRef();

  const go = (n) => { setStep(n); setAnimKey(k => k + 1); };

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
      go(3);
    };
    reader.readAsText(f);
  }, []);

  const updateInvoices = async () => {
    setProcessing(true);
    const readyIdx = [];
    rows.forEach((r, i) => { if (r.updateStatus === "ready") readyIdx.push(i); });

    setRows(prev => {
      const n = [...prev];
      readyIdx.forEach(i => { n[i] = { ...n[i], updateStatus: "processing" }; });
      return n;
    });

    const items = readyIdx.map(i => {
      const r = rows[i];
      return {
        qboCustomer: r.qboCustomer, serviceType: r.serviceType,
        serviceId: r.serviceId, orderNumber: r.orderNumber,
        amount: r.amount, assignedTo: r.assignedTo,
        date: r.date, visitTitle: r["Visit title"],
        qboQuery: `select * from customer where DisplayName like '%${r.qboCustomer}%'`,
      };
    });

    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const st = resp.ok ? "sent" : "error";
      setRows(prev => { const n=[...prev]; readyIdx.forEach(i=>{n[i]={...n[i],updateStatus:st}}); return n; });
    } catch {
      setRows(prev => { const n=[...prev]; readyIdx.forEach(i=>{n[i]={...n[i],updateStatus:"error"}}); return n; });
    }
    setProcessing(false);
    go(4);
  };

  const ready = rows.filter(r => r.updateStatus === "ready").length;
  const sent = rows.filter(r => r.updateStatus === "sent").length;
  const total = rows.length;
  const manual = rows.filter(r => r.updateStatus === "manual").length;
  const skipped = rows.filter(r => r.updateStatus === "skipped").length;
  const errors = rows.filter(r => r.updateStatus === "error").length;

  const NAV = [
    { n:1, label:"Extraer", sub:"SupplyPro" },
    { n:2, label:"Jobber", sub:"Importar CSV" },
    { n:3, label:"QuickBooks", sub:"Invoices" },
    { n:4, label:"Resumen", sub:"Resultados" },
  ];

  const topTitles = ["Extraer ordenes", "Subir a Jobber", "Actualizar QuickBooks", "Resumen"];

  return (
    <div className="ws">
      <style>{CSS}</style>

      {/* ── Sidebar ── */}
      <aside className="ws-side">
        <div className="ws-brand">
          <div className="ws-logo"><Logo /></div>
          <div>
            <div className="ws-brand-name">WorkSync</div>
            <div className="ws-brand-sub">Invoice Automation</div>
          </div>
        </div>

        <nav className="ws-nav">
          {NAV.map(s => (
            <button key={s.n}
              className={`ws-nav-item${step===s.n?" active":""}${step>s.n?" done":""}${step<s.n?" disabled":""}`}
              onClick={() => step >= s.n && go(s.n)}
            >
              <div className="ws-nav-num">
                {step > s.n ? <Chk /> : s.n}
              </div>
              <div className="ws-nav-label">
                {s.label}
                <div className="ws-nav-sub">{s.sub}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="ws-side-footer">WorkSync v0.1</div>
      </aside>

      {/* ── Main ── */}
      <div className="ws-main">
        <div className="ws-topbar">
          <span className="ws-topbar-title">{topTitles[step-1]}</span>
          <span className="ws-topbar-sub">Paso {step} de 4</span>
        </div>

        <div className="ws-body">
          <div className="ws-content" key={animKey}>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div className="ws-card">
                <div className="ws-icon-box" style={{ background: "var(--accent-light)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <h2>Extraer ordenes de SupplyPro</h2>
                <p>Se abrira WorkSync Extractor en otra ventana. Descarga el CSV y volve aca.</p>
                <div style={{ marginTop:28, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                  <a href={SUPPLYPRO_URL} target="_blank" rel="noopener noreferrer" className="ws-btn ws-btn-accent">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                    Abrir Extractor
                  </a>
                  <button className="ws-btn ws-btn-ghost" onClick={() => go(2)}>Ya tengo el CSV &rarr;</button>
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="ws-card">
                <div className="ws-icon-box" style={{ background: "var(--amber-light)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h2>Subir ordenes a Jobber</h2>
                <p>Importa el CSV en Jobber. Cuando los trabajos esten completos, exporta el Visits Report.</p>
                <div className="ws-hint">
                  <strong>En Jobber:</strong> Reports &rarr; Visits &rarr; Export CSV
                </div>
                <div style={{ marginTop:24 }}>
                  <button className="ws-btn ws-btn-accent" onClick={() => go(3)}>
                    Ya tengo el reporte &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Drop ── */}
            {step === 3 && rows.length === 0 && (
              <div
                className={`ws-drop${dragOver ? " over" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if(f) processFile(f); }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }}
                  onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragOver?"var(--accent)":"var(--text-3)"} strokeWidth="1.5" style={{ transition:"stroke .2s" }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <h3>Arrastra el CSV de Jobber aqui</h3>
                <span>Visits Report (.csv) — o click para seleccionar</span>
              </div>
            )}

            {/* ── Step 3: Table ── */}
            {step === 3 && rows.length > 0 && (
              <div style={{ width:"100%", maxWidth:880 }}>
                <div className="ws-toolbar">
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span className="ws-file">{file?.name}</span>
                    <div className="ws-stats">
                      <span className="ws-stat"><b>{total}</b> total</span>
                      <span className="ws-stat" style={{ color:"var(--emerald-dark)" }}><b>{ready+sent}</b> listos</span>
                      <span className="ws-stat" style={{ color:"#92400E" }}><b>{manual}</b> manual</span>
                      <span className="ws-stat" style={{ color:"var(--text-3)" }}><b>{skipped}</b> epo</span>
                    </div>
                  </div>
                  <button
                    className={`ws-btn ${processing?"":"ws-btn-accent"}`}
                    disabled={processing || ready===0}
                    onClick={updateInvoices}
                    style={processing?{background:"var(--text-3)",color:"#FFF"}:{}}
                  >
                    {processing ? <><span className="ws-spinner"/> Enviando...</>
                      : ready===0 && sent>0 ? "Enviado"
                      : `Actualizar ${ready} invoices`}
                  </button>
                </div>

                <div className="ws-tbl-wrap">
                  <div className="ws-tbl-scroll">
                    <table className="ws-tbl">
                      <thead><tr>
                        <th>#</th><th>QBO Customer</th><th>Servicio</th>
                        <th className="hm">Order #</th><th>$</th>
                        <th className="hm">Asignado</th><th></th>
                      </tr></thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className={r.updateStatus==="processing"?"r-proc":r.updateStatus==="sent"?"r-sent":r.updateStatus==="error"?"r-err":""}>
                            <td className="mono dim">{i+1}</td>
                            <td className="cust">{r.qboCustomer}</td>
                            <td style={{color:"var(--text-2)",fontSize:12}}>{r.serviceType}</td>
                            <td className="mono dim hm">{r.orderNumber}</td>
                            <td className="mono" style={{fontWeight:600,fontSize:12}}>{r.amount ? `$${Math.round(parseFloat(r.amount)*100)/100}` : ""}</td>
                            <td className="dim hm" style={{fontSize:12}}>{r.assignedTo}</td>
                            <td><Badge status={r.updateStatus}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4 ── */}
            {step === 4 && (
              <div className="ws-result">
                <div className="ws-result-icon" style={{ background: sent>0 ? "var(--accent-light)" : "var(--red-light)" }}>
                  {sent > 0 ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/></svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  )}
                </div>
                <h2>{sent > 0 ? "Enviado a Make" : "Error al enviar"}</h2>
                {sent > 0 && (
                  <p>Make va a procesar <strong>{sent} invoices</strong> en QuickBooks. Revisa el escenario en Make para confirmar.</p>
                )}
                <div className="ws-result-grid">
                  {[
                    { l:"Enviados", v:sent, c:"var(--accent)" },
                    { l:"Manuales", v:manual, c:"var(--amber)" },
                    { l:"EPO", v:skipped, c:"var(--text-3)" },
                    { l:"Errores", v:errors, c:"var(--red)" },
                  ].map((s,i) => (
                    <div className="ws-result-card" key={i}>
                      <div className="ws-result-num" style={{color:s.c}}>{s.v}</div>
                      <div className="ws-result-lbl">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:24 }}>
                  <button className="ws-btn ws-btn-outline" onClick={() => { go(1); setRows([]); setFile(null); }}>
                    Nuevo reporte
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
