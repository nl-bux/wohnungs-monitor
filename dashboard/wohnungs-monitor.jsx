import { useState, useEffect, useRef, useCallback } from "react";

// ── Konfig ─────────────────────────────────────────────────────────────────
const REPO   = "nl-bux/wohnungs-monitor";
const BRANCH = "main";

// ── Mietspiegel ────────────────────────────────────────────────────────────
const MS={
  "Westend-Süd":21,"Westend-Nord":19.5,"Westend":20,"Innenstadt":19,"Altstadt":18.5,
  "Sachsenhausen":17,"Nordend-Ost":17.5,"Nordend-West":17,"Nordend":17.2,"Bornheim":16.5,
  "Ostend":16,"Bockenheim":15.8,"Gallus":14.5,"Westhafen":15.5,"Rebstockviertel":14.5,
  "Bahnhofsviertel":16,"Niederrad":13.5,"Eschersheim":13.8,"Dornbusch":14.2,"Griesheim":13,
  "Riedberg":14,"Bergen-Enkheim":13.5,"Frankfurt":15.59,
  "Neustadt":14.8,"Bretzenheim":13.5,"Weisenau":13.2,"Finthen":12.5,
  "Gonsenheim":13,"Hechtsheim":13,"Kastel":14,"Oberstadt":15.5,"Mainz":15.37,
};
function msRef(st,ci){
  const s=[st,ci].filter(Boolean).join(" ").toLowerCase();
  for(const[k,v]of Object.entries(MS)) if(s.includes(k.toLowerCase())) return v;
  return s.includes("mainz")?15.37:15.59;
}
function calcAmpel(kalt,qm,st,ci){
  if(!kalt||!qm) return null;
  const ppm=kalt/qm,ref=msRef(st,ci),d=((ppm-ref)/ref)*100;
  return{ppm:ppm.toFixed(2),ref:ref.toFixed(2),d:d.toFixed(1),key:d<=0?"g":d<=10?"y":d<=20?"o":"r"};
}
const AS={
  g:{c:"#16a34a",bg:"#f0fdf4",b:"#86efac",t:"Günstig"},
  y:{c:"#d97706",bg:"#fffbeb",b:"#fcd34d",t:"Marktüblich"},
  o:{c:"#ea580c",bg:"#fff7ed",b:"#fdba74",t:"Leicht erhöht"},
  r:{c:"#dc2626",bg:"#fef2f2",b:"#fca5a5",t:"Überteuert"},
};

// ── Seed-Daten (Ballwanz, live 17.06.2026) ─────────────────────────────────
const SEED_TS="2026-06-17T12:00:00.000Z";
const SEED=[
  {_id:"b1",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Rebstockviertel",zimmer:3,groesse:90,kaltmiete:1925,gesamtpreis:1925,titel:"3-Zi. mit Balkon – Rebstockviertel",url:"https://www.ballwanz.de/objekt/viel-raum-zum-wohlfuehlen-3-zimmer-wohnung-mit-balkon-im-rebstockviertel/"},
  {_id:"b2",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:101,kaltmiete:1950,gesamtpreis:1950,titel:"3-Zi. Westhafen – beliebte Lage",url:"https://www.ballwanz.de/objekt/grosszuegige-3-zimmer-wohnung-in-beliebter-lage-am-westhafen/"},
  {_id:"b3",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:1975,gesamtpreis:1975,titel:"3-Zi. Mainnähe – Balkon, Loggia & EBK",url:"https://www.ballwanz.de/objekt/wohnen-in-mainnaehe-charmante-3-zimmer-wohnung-mit-balkon-loggia-ebk/"},
  {_id:"b4",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:115,kaltmiete:1980,gesamtpreis:1980,titel:"3-Zi. Westhafen – West-Terrasse",url:"https://www.ballwanz.de/objekt/westhafen-grosszuegige-3-zimmer-wohnung-mit-ruhig-gelegener-west-terrasse/"},
  {_id:"b5",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:101,kaltmiete:1985,gesamtpreis:1985,titel:"3-Zi. Westhafen – EBK, Balkon & Loggia",url:"https://www.ballwanz.de/objekt/grosszuegige-3-zimmer-wohnung-in-begehrter-lage-am-westhafen-mit-ebk-balkon-sonniger-loggia/"},
  {_id:"b6",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:101,kaltmiete:1999,gesamtpreis:1999,titel:"3-Zi. Westhafen – Balkon & Loggia",url:"https://www.ballwanz.de/objekt/wohnen-am-westhafen-helle-3-zimmer-wohnung-mit-balkon-loggia/"},
  {_id:"b7",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:2094,gesamtpreis:2094,titel:"3-Zi. Speicherquartier – Balkon & Loggia",url:"https://www.ballwanz.de/objekt/speicherquartier-grosszuegige-3-zi-wohnung-mit-balkon-und-loggia/"},
  {_id:"b8",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Bockenheim",zimmer:3,groesse:91,kaltmiete:2100,gesamtpreis:2100,titel:"3-Zi. Neubau im PARKTRIO",url:"https://www.ballwanz.de/objekt/neubaucharme-stilvolle-3-zimmer-wohnung-im-parktrio/"},
  {_id:"b9",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:99,kaltmiete:2140,gesamtpreis:2140,titel:"3-Zi. mit großer Loggia",url:"https://www.ballwanz.de/objekt/moderne-3-zimmer-wohnung-mit-grosser-loggia-und-viel-licht/"},
  {_id:"b10",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:2148,gesamtpreis:2148,titel:"3-Zi. Speicher Quartier Westhafen",url:"https://www.ballwanz.de/objekt/speicher-quartier-wohnen-mit-stil-und-flair-im-beliebten-westhafen/"},
  {_id:"b11",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Altstadt",zimmer:3,groesse:91,kaltmiete:2150,gesamtpreis:2150,titel:"3-Zi. Altstadt mit Loggia",url:"https://www.ballwanz.de/objekt/leben-in-der-altstadt-moderne-3-zimmerwohnung-mit-loggia/"},
  {_id:"b12",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:96,kaltmiete:2150,gesamtpreis:2150,titel:"3-Zi. mit Loggia und viel Platz",url:"https://www.ballwanz.de/objekt/3-zimmer-wohnung-mit-loggia-und-viel-platz-zum-wohlfuehlen/"},
  {_id:"b13",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:91,kaltmiete:2180,gesamtpreis:2180,titel:"3-Zi. mit Home-Office und Balkon",url:"https://www.ballwanz.de/objekt/3-zimmer-wohnung-mit-home-office-und-balkon/"},
  {_id:"b14",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:95,kaltmiete:2190,gesamtpreis:2190,titel:"3-Zi. Loggia und viel Licht",url:"https://www.ballwanz.de/objekt/drei-zimmer-eine-loggia-und-viel-licht/"},
  {_id:"b15",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:4,groesse:98,kaltmiete:2220,gesamtpreis:2220,titel:"4-Zi. Neubau mit Balkon",url:"https://www.ballwanz.de/objekt/neue-raeume-neues-glueck-geraeumige-4-zimmer-wohnung-mit-sonnigem-balkon/"},
  {_id:"b16",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:105,kaltmiete:2245,gesamtpreis:2245,titel:"3-Zi. Erstbezug, stilvoll",url:"https://www.ballwanz.de/objekt/erstbezug-stilvolle-3-zimmer-wohnung/"},
  {_id:"b17",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:2258,gesamtpreis:2258,titel:"3-Zi. Westhafen – Balkon & Loggia",url:"https://www.ballwanz.de/objekt/grosszuegige-3-zimmer-wohnung-am-westhafen-mit-balkon-und-loggia/"},
  {_id:"b18",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:101,kaltmiete:2300,gesamtpreis:2300,titel:"3-Zi. Sonnenterrasse – Mainlage",url:"https://www.ballwanz.de/objekt/moderne-3-zimmer-wohnung-mit-sonnenterasse-in-direkter-mainlage/"},
  {_id:"b19",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Rebstockviertel",zimmer:3,groesse:102,kaltmiete:2345,gesamtpreis:2345,titel:"3-Zi. am Rebstockpark",url:"https://www.ballwanz.de/objekt/ruhe-und-erholung-3-zimmer-wohnung-am-rebstockpark/"},
  {_id:"b20",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:4,groesse:104,kaltmiete:2345,gesamtpreis:2345,titel:"4-Zi. Neubau mit Balkon",url:"https://www.ballwanz.de/objekt/neubaucharme-pur-helle-4-zimmer-wohnung-mit-balkon/"},
  {_id:"b21",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Altstadt",zimmer:3,groesse:91,kaltmiete:2350,gesamtpreis:2350,titel:"3-Zi. Altstadtwohnung",url:"https://www.ballwanz.de/objekt/charmante-3-zimmer-altstadtwohnung-mit-viel-licht-und-moderner-ausstattung/"},
  {_id:"b22",quelle:"Ballwanz",stadt:"Frankfurt",stadtteil:"Bockenheim",zimmer:4,groesse:111,kaltmiete:2390,gesamtpreis:2390,titel:"4-Zi. Bockenheim – für Familien",url:"https://www.ballwanz.de/objekt/4-zimmer-wohnung-in-frankfurt-bockenheim-ideal-fuer-familien/"},
];

const euro=v=>(!v&&v!==0)?"–":v.toLocaleString("de-DE")+" €";

// ── GitHub API helpers ──────────────────────────────────────────────────────
async function ghFetch(path, token, opts={}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json",
      ...(opts.headers||{})
    }
  });
  if (res.status === 204) return null;
  return res.json();
}

async function triggerWorkflow(token) {
  return ghFetch(`/repos/${REPO}/actions/workflows/scrape.yml/dispatches`, token, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ref: BRANCH})
  });
}

async function getLatestRun(token) {
  const data = await ghFetch(`/repos/${REPO}/actions/runs?per_page=1`, token);
  return data?.workflow_runs?.[0] || null;
}

async function getRunArtifacts(token, runId) {
  const data = await ghFetch(`/repos/${REPO}/actions/runs/${runId}/artifacts`, token);
  return data?.artifacts || [];
}

async function getFileFromRepo(token) {
  try {
    const data = await ghFetch(
      `/repos/${REPO}/contents/scraper/results/listings_latest.json?ref=${BRANCH}`,
      token
    );
    if (!data?.content) return null;
    const json = JSON.parse(atob(data.content.replace(/\n/g, "")));
    return json;
  } catch { return null; }
}

// ── Haupt-App ──────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken]       = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [listings, setListings] = useState(SEED);
  const [lastUpdated, setLastUpdated] = useState(SEED_TS);
  const [isSeed, setIsSeed]     = useState(true);

  // Workflow status
  const [runStatus, setRunStatus]   = useState(null); // null | queued | in_progress | completed | failed
  const [runUrl, setRunUrl]         = useState("");
  const [runLog, setRunLog]         = useState([]);
  const [polling, setPolling]       = useState(false);
  const pollRef = useRef(null);

  // Table state
  const [fCity, setFCity]   = useState("all");
  const [fPrice, setFPrice] = useState(2400);
  const [fSize, setFSize]   = useState(80);
  const [sort, setSort]     = useState({col:"gesamtpreis",dir:"asc"});
  const [tab, setTab]       = useState("list");

  const addLog = (msg) => setRunLog(l => [...l.slice(-30), `[${new Date().toLocaleTimeString("de-DE")}] ${msg}`]);

  // Load token + data from storage
  useEffect(() => {
    (async () => {
      try {
        const t = await window.storage.get("gh_token");
        if (t) { setToken(t.value); setTokenSaved(true); }
        const d = await window.storage.get("wm_listings");
        if (d) {
          const parsed = JSON.parse(d.value);
          setListings(parsed.listings || SEED);
          setLastUpdated(parsed.ts || SEED_TS);
          setIsSeed(false);
        }
      } catch (_) {}
    })();
  }, []);

  const saveToken = async () => {
    if (!token.trim()) return;
    await window.storage.set("gh_token", token.trim());
    setTokenSaved(true);
  };

  // Poll workflow status
  const startPolling = useCallback((tok) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const run = await getLatestRun(tok);
        if (!run) return;
        const status = run.conclusion || run.status;
        setRunStatus(status);
        setRunUrl(run.html_url);
        addLog(`Status: ${status}`);

        if (run.status === "completed") {
          clearInterval(pollRef.current);
          setPolling(false);
          if (run.conclusion === "success") {
            addLog("✓ Scraping abgeschlossen! Lade Ergebnisse…");
            await new Promise(r => setTimeout(r, 3000)); // wait for file commit
            const result = await getFileFromRepo(tok);
            if (result?.listings?.length) {
              const ts = result.timestamp || new Date().toISOString();
              setListings(result.listings);
              setLastUpdated(ts);
              setIsSeed(false);
              addLog(`✓ ${result.listings.length} Angebote geladen.`);
              await window.storage.set("wm_listings", JSON.stringify({listings: result.listings, ts}));
            } else {
              addLog("⚠ Keine Daten in listings_latest.json gefunden.");
            }
          } else {
            addLog(`✗ Workflow fehlgeschlagen: ${run.conclusion}`);
          }
        }
      } catch(e) {
        addLog(`Polling-Fehler: ${e.message}`);
      }
    }, 12000);
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleStart = async () => {
    if (!token) return;
    setRunLog([]);
    setRunStatus("starting");
    addLog("Starte GitHub Actions Workflow…");
    try {
      await triggerWorkflow(token);
      addLog("✓ Workflow ausgelöst. Warte auf Start…");
      await new Promise(r => setTimeout(r, 6000));
      const run = await getLatestRun(token);
      if (run) {
        setRunStatus(run.status);
        setRunUrl(run.html_url);
        addLog(`Run #${run.run_number} gestartet → ${run.status}`);
      }
      startPolling(token);
    } catch(e) {
      addLog(`Fehler: ${e.message}`);
      setRunStatus("failed");
    }
  };

  const loadManually = async () => {
    if (!token) return;
    addLog("Lade Daten aus Repository…");
    const result = await getFileFromRepo(token);
    if (result?.listings?.length) {
      const ts = result.timestamp || new Date().toISOString();
      setListings(result.listings);
      setLastUpdated(ts);
      setIsSeed(false);
      addLog(`✓ ${result.listings.length} Angebote geladen (${ts.slice(0,10)})`);
      await window.storage.set("wm_listings", JSON.stringify({listings: result.listings, ts}));
    } else {
      addLog("Keine listings_latest.json im Repo gefunden. Bitte erst Scraper starten.");
    }
  };

  // Status badge
  const STATUS_STYLE = {
    starting:    {bg:"#dbeafe",c:"#1d4ed8",icon:"⟳",label:"Startet…"},
    queued:      {bg:"#fef9c3",c:"#854d0e",icon:"⏳",label:"In Warteschlange"},
    in_progress: {bg:"#dcfce7",c:"#15803d",icon:"⚙",label:"Läuft…"},
    completed:   {bg:"#dcfce7",c:"#15803d",icon:"✓",label:"Abgeschlossen"},
    success:     {bg:"#dcfce7",c:"#15803d",icon:"✓",label:"Erfolgreich"},
    failure:     {bg:"#fee2e2",c:"#991b1b",icon:"✗",label:"Fehlgeschlagen"},
    failed:      {bg:"#fee2e2",c:"#991b1b",icon:"✗",label:"Fehler"},
  };
  const ss = runStatus ? (STATUS_STYLE[runStatus] || STATUS_STYLE.queued) : null;
  const isRunning = ["starting","queued","in_progress"].includes(runStatus);

  // Filter & sort
  const filtered = listings.filter(l => {
    if (fCity !== "all" && l.stadt !== fCity) return false;
    const p = l.gesamtpreis || l.kaltmiete;
    if (p && p > fPrice) return false;
    if (l.groesse && l.groesse < fSize) return false;
    return true;
  }).sort((a,b) => {
    const va=a[sort.col]??(sort.dir==="asc"?1e9:-1e9);
    const vb=b[sort.col]??(sort.dir==="asc"?1e9:-1e9);
    return sort.dir==="asc"?va-vb:vb-va;
  });

  const prices = filtered.map(l=>l.gesamtpreis||l.kaltmiete).filter(Boolean);
  const hs = col => setSort(s => s.col===col?{col,dir:s.dir==="asc"?"desc":"asc"}:{col,dir:"asc"});

  const Th = ({col,r,children}) => (
    <th onClick={() => hs(col)} style={{padding:"9px 13px",textAlign:r?"right":"left",cursor:"pointer",
      fontWeight:700,fontSize:10,letterSpacing:.8,textTransform:"uppercase",whiteSpace:"nowrap",userSelect:"none",
      color:sort.col===col?"#1e40af":"#64748b",
      borderBottom:sort.col===col?"2px solid #3b82f6":"2px solid transparent",
      background:sort.col===col?"#eff6ff":"transparent"}}>
      {children}<span style={{marginLeft:3,opacity:sort.col===col?1:.3}}>
        {sort.col===col?(sort.dir==="asc"?"↑":"↓"):"↕"}</span>
    </th>
  );

  const AC = ({l}) => {
    const a = calcAmpel(l.kaltmiete,l.groesse,l.stadtteil,l.stadt);
    if (!a) return <td style={{padding:"8px 13px",textAlign:"center",color:"#cbd5e1",fontSize:10}}>k.A.</td>;
    const s = AS[a.key];
    return (
      <td style={{padding:"6px 13px",textAlign:"center"}}>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{width:11,height:11,borderRadius:"50%",background:s.c,boxShadow:`0 0 0 3px ${s.b}`}}/>
          <span style={{fontSize:10,fontWeight:700,color:s.c,background:s.bg,border:`1px solid ${s.b}`,borderRadius:4,padding:"1px 5px"}}>{s.t}</span>
          <span style={{fontSize:9,color:"#94a3b8",lineHeight:1.3,textAlign:"center"}}>
            {a.ppm}€/m² vs {a.ref}€<br/>
            <span style={{color:s.c,fontWeight:700}}>{a.d>0?"+":""}{a.d}%</span>
          </span>
        </div>
      </td>
    );
  };

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#f1f5f9",minHeight:"100vh",color:"#0f172a"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)",padding:"20px 24px",boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>
        <div style={{maxWidth:1500,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <h1 style={{margin:0,fontSize:20,fontWeight:800,color:"white",letterSpacing:-.5}}>
                🏠 Wohnungs-Monitor Frankfurt & Mainz
              </h1>
              <p style={{margin:"4px 0 0",fontSize:12,color:"#93c5fd"}}>3–4 Zi · ≥80 m² · ≤2.400 € · Mietspiegel-Ampel · Playwright via GitHub Actions</p>
              <p style={{margin:"5px 0 0",fontSize:11,color:isSeed?"#fbbf24":"#64748b"}}>
                {isSeed && <span style={{background:"rgba(251,191,36,.2)",border:"1px solid rgba(251,191,36,.4)",borderRadius:4,padding:"1px 6px",fontSize:10,marginRight:6}}>📌 Seed-Daten</span>}
                Stand: {new Date(lastUpdated).toLocaleString("de-DE")} · {listings.length} Einträge
              </p>
            </div>

            {/* Scraper Controls */}
            <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
              {/* Token Input */}
              {!tokenSaved ? (
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    type="password"
                    value={token}
                    onChange={e=>setToken(e.target.value)}
                    placeholder="GitHub Token (ghp_…)"
                    style={{padding:"7px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.1)",color:"white",fontSize:12,width:220}}
                    onKeyDown={e=>e.key==="Enter"&&saveToken()}
                  />
                  <button onClick={saveToken} style={{background:"#3b82f6",color:"white",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    Speichern
                  </button>
                </div>
              ) : (
                <div style={{display:"flex",gap:6}}>
                  <button onClick={handleStart} disabled={isRunning} style={{
                    background:isRunning?"#475569":"#22c55e",color:"white",border:"none",borderRadius:8,
                    padding:"9px 18px",fontSize:13,fontWeight:700,cursor:isRunning?"not-allowed":"pointer",
                    display:"flex",alignItems:"center",gap:7,
                    boxShadow:isRunning?"none":"0 2px 8px rgba(34,197,94,.4)",
                  }}>
                    {isRunning
                      ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Läuft…</>
                      : "▶ Scraper starten"}
                  </button>
                  <button onClick={loadManually} style={{background:"rgba(255,255,255,.1)",color:"white",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}} title="Ergebnisse aus Repo laden (ohne neu zu scrapen)">
                    ↓ Ergebnisse laden
                  </button>
                  <button onClick={()=>setTokenSaved(false)} style={{background:"rgba(255,255,255,.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"9px 10px",fontSize:11,cursor:"pointer"}} title="Token ändern">
                    🔑
                  </button>
                </div>
              )}

              {/* Status Badge */}
              {ss && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{background:ss.bg,color:ss.c,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{animation:isRunning?"spin 1s linear infinite":""}}>{ss.icon}</span>
                    {ss.label}
                  </div>
                  {runUrl && <a href={runUrl} target="_blank" rel="noopener noreferrer" style={{color:"#93c5fd",fontSize:11}}>→ GitHub</a>}
                </div>
              )}
            </div>
          </div>

          {/* Log */}
          {runLog.length > 0 && (
            <div style={{marginTop:12,background:"rgba(0,0,0,.4)",borderRadius:8,padding:"8px 14px",maxHeight:120,overflowY:"auto",fontFamily:"monospace",fontSize:10,lineHeight:1.8}}>
              {runLog.map((l,i) => (
                <div key={i} style={{color:l.includes("✗")||l.includes("Fehler")?"#f87171":l.includes("✓")?"#86efac":"#94a3b8"}}>{l}</div>
              ))}
            </div>
          )}

          {/* How it works - nur wenn kein token */}
          {!tokenSaved && (
            <div style={{marginTop:12,background:"rgba(255,255,255,.07)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#93c5fd",lineHeight:1.7}}>
              <strong style={{color:"white"}}>So funktioniert es:</strong>{" "}
              Gib deinen GitHub Token ein → Klicke <strong>„Scraper starten"</strong> → 
              Playwright läuft auf GitHub Actions und crawlt 8 Websites → 
              Ergebnisse erscheinen automatisch in der Tabelle (~5–10 Min).
            </div>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"10px 24px"}}>
        <div style={{maxWidth:1500,margin:"0 auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase"}}>Filter</span>
          {[{l:"Alle Städte",v:"all"},{l:"Frankfurt",v:"Frankfurt"},{l:"Mainz",v:"Mainz"}].map(o=>(
            <button key={o.v} onClick={()=>setFCity(o.v)} style={{
              padding:"5px 12px",borderRadius:20,border:"1px solid",fontSize:12,fontWeight:600,cursor:"pointer",
              background:fCity===o.v?"#1e40af":"white",color:fCity===o.v?"white":"#64748b",
              borderColor:fCity===o.v?"#1e40af":"#e2e8f0"}}>
              {o.l}
            </button>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12,color:"#64748b"}}>Max.</span>
            <input type="number" value={fPrice} onChange={e=>setFPrice(+e.target.value)}
              style={{padding:"5px 8px",borderRadius:7,border:"1px solid #cbd5e1",fontSize:12,width:90}} step={100}/>
            <span style={{fontSize:12,color:"#64748b"}}>€</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12,color:"#64748b"}}>Min.</span>
            <input type="number" value={fSize} onChange={e=>setFSize(+e.target.value)}
              style={{padding:"5px 8px",borderRadius:7,border:"1px solid #cbd5e1",fontSize:12,width:70}}/>
            <span style={{fontSize:12,color:"#64748b"}}>m²</span>
          </div>
          <div style={{marginLeft:"auto",display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e2e8f0"}}>
            {["list","stats"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"6px 14px",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",
                background:tab===t?"#1e40af":"white",color:tab===t?"white":"#64748b"}}>
                {t==="list"?"📋 Tabelle":"📊 Statistik"}
              </button>
            ))}
          </div>
          <span style={{fontSize:12,color:"#64748b",borderLeft:"1px solid #e2e8f0",paddingLeft:10}}>
            <strong style={{color:"#1e293b"}}>{filtered.length}</strong> Angebote
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:1500,margin:"0 auto",padding:"16px 24px 32px"}}>

        {isSeed && (
          <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:13,color:"#92400e",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>📌</span>
            <span><strong>Seed-Daten vom 17.06.2026</strong> (Ballwanz). Starte den Scraper für aktuelle Daten aus allen 8 Quellen.</span>
          </div>
        )}

        {/* STATISTIK */}
        {tab==="stats" && filtered.length>0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
            {[
              {l:"Angebote",v:filtered.length,i:"📋",c:"#3b82f6"},
              {l:"Ø Gesamtpreis",v:prices.length?`${Math.round(prices.reduce((a,b)=>a+b,0)/prices.length).toLocaleString("de-DE")} €`:"–",i:"💶",c:"#8b5cf6"},
              {l:"Günstigstes",v:prices.length?`${Math.min(...prices).toLocaleString("de-DE")} €`:"–",i:"🟢",c:"#16a34a"},
              {l:"Teuerstes",v:prices.length?`${Math.max(...prices).toLocaleString("de-DE")} €`:"–",i:"🔴",c:"#dc2626"},
            ].map(s=>(
              <div key={s.l} style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:20}}>{s.i}</div>
                <div style={{fontSize:22,fontWeight:800,color:s.c,marginTop:4}}>{s.v}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{s.l}</div>
              </div>
            ))}
            <div style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0",gridColumn:"span 2"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Ampel</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                {Object.entries(AS).map(([k,s])=>{
                  const n=filtered.filter(l=>{const a=calcAmpel(l.kaltmiete,l.groesse,l.stadtteil,l.stadt);return a?.key===k;}).length;
                  return <div key={k} style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:11,height:11,borderRadius:"50%",background:s.c}}/>
                    <div><div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{n}</div><div style={{fontSize:10,color:"#94a3b8"}}>{s.t}</div></div>
                  </div>;
                })}
              </div>
            </div>
            <div style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0",gridColumn:"span 2"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Quellen</div>
              {Object.entries(filtered.reduce((acc,l)=>{const k=l.quelle||"–";acc[k]=(acc[k]||0)+1;return acc;},{})).sort(([,a],[,b])=>b-a).map(([q,n])=>(
                <div key={q} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <div style={{flex:2,fontSize:12,color:"#374151"}}>{q}</div>
                  <span style={{background:"#dbeafe",color:"#1d4ed8",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700,flexShrink:0}}>{n}</span>
                  <div style={{background:"#e2e8f0",borderRadius:4,height:5,flex:3,overflow:"hidden"}}>
                    <div style={{background:"#3b82f6",height:"100%",width:`${(n/filtered.length)*100}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABELLE */}
        {tab==="list" && filtered.length>0 && (
          <div style={{background:"white",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                    <Th col="quelle">Quelle</Th>
                    <th style={{padding:"9px 13px",fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"#64748b",whiteSpace:"nowrap"}}>Angebot</th>
                    <Th col="stadtteil">Stadtteil</Th>
                    <Th col="stadt">Stadt</Th>
                    <Th col="zimmer" r>Zi.</Th>
                    <Th col="groesse" r>m²</Th>
                    <Th col="kaltmiete" r>Kaltmiete</Th>
                    <Th col="nebenkosten" r>NK</Th>
                    <Th col="heizkosten" r>Heizkosten</Th>
                    <Th col="gesamtpreis" r>Gesamt</Th>
                    <th style={{padding:"9px 13px",fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"#64748b",textAlign:"center"}}>Mietspiegel 🚦</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l,i)=>{
                    const a=calcAmpel(l.kaltmiete,l.groesse,l.stadtteil,l.stadt);
                    const bg=a?AS[a.key].bg:i%2===0?"white":"#fafafa";
                    return (
                      <tr key={l._id||i} style={{background:bg,borderBottom:"1px solid #f1f5f9"}}>
                        <td style={{padding:"9px 13px",fontWeight:600,color:"#334155",fontSize:11,whiteSpace:"nowrap"}}>{l.quelle||"–"}</td>
                        <td style={{padding:"9px 13px",maxWidth:240}}>
                          {l.url
                            ?<a href={l.url} target="_blank" rel="noopener noreferrer" style={{color:"#2563eb",textDecoration:"none",fontSize:12,fontWeight:500}}>
                                {(l.titel||"→ Angebot").slice(0,52)}{(l.titel||"").length>52?"…":""}
                              </a>
                            :<span style={{color:"#94a3b8",fontSize:12}}>{l.titel||"–"}</span>
                          }
                        </td>
                        <td style={{padding:"9px 13px",color:"#475569",fontSize:12}}>{l.stadtteil||"–"}</td>
                        <td style={{padding:"9px 13px"}}>
                          {l.stadt&&<span style={{background:l.stadt==="Frankfurt"?"#dbeafe":"#fce7f3",color:l.stadt==="Frankfurt"?"#1d4ed8":"#be185d",borderRadius:5,padding:"2px 7px",fontSize:11,fontWeight:700}}>{l.stadt}</span>}
                        </td>
                        <td style={{padding:"9px 13px",textAlign:"right",fontWeight:700}}>{l.zimmer||"–"}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",fontWeight:700}}>{l.groesse?`${l.groesse} m²`:"–"}</td>
                        <td style={{padding:"9px 13px",textAlign:"right"}}>{euro(l.kaltmiete)}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",color:"#64748b"}}>{euro(l.nebenkosten)}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",color:"#64748b"}}>{euro(l.heizkosten)}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",fontWeight:800,fontSize:14,color:(l.gesamtpreis||l.kaltmiete)>2200?"#dc2626":"#1e293b"}}>
                          {euro(l.gesamtpreis||l.kaltmiete)}
                        </td>
                        <AC l={l}/>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{padding:"9px 14px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#94a3b8",flexWrap:"wrap",gap:8}}>
              <span>{filtered.length} Angebote · Stand {new Date(lastUpdated).toLocaleDateString("de-DE")}</span>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                {Object.entries(AS).map(([k,s])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:s.c}}/><span style={{color:s.c}}>{s.t}</span>
                  </div>
                ))}
                <span>· Ref: Mietspiegel Frankfurt/Mainz 2024/25</span>
              </div>
            </div>
          </div>
        )}

        {filtered.length===0&&<div style={{textAlign:"center",padding:48,background:"white",borderRadius:14,border:"1px solid #e2e8f0",color:"#64748b"}}>Keine Angebote für diese Filter.</div>}

        {/* Repo Link */}
        <div style={{marginTop:14,display:"flex",gap:8,alignItems:"center",fontSize:12,color:"#64748b"}}>
          <span>🔗</span>
          <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>
            github.com/{REPO}
          </a>
          <span>·</span>
          <a href={`https://github.com/${REPO}/actions`} target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>
            Actions (Workflow-Status)
          </a>
          <span>·</span>
          <span style={{color:"#94a3b8"}}>Playwright crawlt täglich 07:00 Uhr: Ballwanz · Vonovia · Von Poll · E&V · NHW · Molitor · ohne-makler · Wohnbau Mainz</span>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
