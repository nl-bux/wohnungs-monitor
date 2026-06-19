import { useState, useEffect, useRef } from "react";

const MS={
  "Westend-Süd":21,"Westend-Nord":19.5,"Westend":20,"Innenstadt":19,"Altstadt":18.5,
  "Sachsenhausen":17,"Nordend-Ost":17.5,"Nordend-West":17,"Nordend":17.2,"Bornheim":16.5,
  "Ostend":16,"Bockenheim":15.8,"Gallus":14.5,"Westhafen":15.5,"Rebstockviertel":14.5,
  "Bahnhofsviertel":16,"Niederrad":13.5,"Eschersheim":13.8,"Dornbusch":14.2,"Griesheim":13,
  "Riedberg":14,"Bergen-Enkheim":13.5,"Seckbach":13,"Frankfurt":15.59,
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

const SEED_TS="2026-06-17T12:00:00.000Z";
const SEED=[
  {_id:"b1",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Rebstockviertel",zimmer:3,groesse:90,kaltmiete:1925,nebenkosten:null,heizkosten:null,gesamtpreis:1925,titel:"3-Zi. mit Balkon – Rebstockviertel",url:"https://www.ballwanz.de/objekt/viel-raum-zum-wohlfuehlen-3-zimmer-wohnung-mit-balkon-im-rebstockviertel/"},
  {_id:"b2",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:101,kaltmiete:1950,nebenkosten:null,heizkosten:null,gesamtpreis:1950,titel:"3-Zi. Westhafen (beliebte Lage)",url:"https://www.ballwanz.de/objekt/grosszuegige-3-zimmer-wohnung-in-beliebter-lage-am-westhafen/"},
  {_id:"b3",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:1975,nebenkosten:null,heizkosten:null,gesamtpreis:1975,titel:"3-Zi. Mainnähe – Balkon, Loggia & EBK",url:"https://www.ballwanz.de/objekt/wohnen-in-mainnaehe-charmante-3-zimmer-wohnung-mit-balkon-loggia-ebk/"},
  {_id:"b4",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:115,kaltmiete:1980,nebenkosten:null,heizkosten:null,gesamtpreis:1980,titel:"3-Zi. Westhafen – West-Terrasse",url:"https://www.ballwanz.de/objekt/westhafen-grosszuegige-3-zimmer-wohnung-mit-ruhig-gelegener-west-terrasse/"},
  {_id:"b5",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:101,kaltmiete:1985,nebenkosten:null,heizkosten:null,gesamtpreis:1985,titel:"3-Zi. Westhafen – EBK, Balkon & Loggia",url:"https://www.ballwanz.de/objekt/grosszuegige-3-zimmer-wohnung-in-begehrter-lage-am-westhafen-mit-ebk-balkon-sonniger-loggia/"},
  {_id:"b6",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:101,kaltmiete:1999,nebenkosten:null,heizkosten:null,gesamtpreis:1999,titel:"3-Zi. Westhafen – Balkon & Loggia",url:"https://www.ballwanz.de/objekt/wohnen-am-westhafen-helle-3-zimmer-wohnung-mit-balkon-loggia/"},
  {_id:"b7",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:2094,nebenkosten:null,heizkosten:null,gesamtpreis:2094,titel:"3-Zi. Speicherquartier – Balkon & Loggia",url:"https://www.ballwanz.de/objekt/speicherquartier-grosszuegige-3-zi-wohnung-mit-balkon-und-loggia/"},
  {_id:"b8",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Bockenheim",zimmer:3,groesse:91,kaltmiete:2100,nebenkosten:null,heizkosten:null,gesamtpreis:2100,titel:"3-Zi. Neubau im PARKTRIO",url:"https://www.ballwanz.de/objekt/neubaucharme-stilvolle-3-zimmer-wohnung-im-parktrio/"},
  {_id:"b9",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:99,kaltmiete:2140,nebenkosten:null,heizkosten:null,gesamtpreis:2140,titel:"3-Zi. mit großer Loggia",url:"https://www.ballwanz.de/objekt/moderne-3-zimmer-wohnung-mit-grosser-loggia-und-viel-licht/"},
  {_id:"b10",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:2148,nebenkosten:null,heizkosten:null,gesamtpreis:2148,titel:"3-Zi. Speicher Quartier Westhafen",url:"https://www.ballwanz.de/objekt/speicher-quartier-wohnen-mit-stil-und-flair-im-beliebten-westhafen/"},
  {_id:"b11",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Altstadt",zimmer:3,groesse:91,kaltmiete:2150,nebenkosten:null,heizkosten:null,gesamtpreis:2150,titel:"3-Zi. Altstadt mit Loggia",url:"https://www.ballwanz.de/objekt/leben-in-der-altstadt-moderne-3-zimmerwohnung-mit-loggia/"},
  {_id:"b12",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:96,kaltmiete:2150,nebenkosten:null,heizkosten:null,gesamtpreis:2150,titel:"3-Zi. mit Loggia und viel Platz",url:"https://www.ballwanz.de/objekt/3-zimmer-wohnung-mit-loggia-und-viel-platz-zum-wohlfuehlen/"},
  {_id:"b13",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:91,kaltmiete:2180,nebenkosten:null,heizkosten:null,gesamtpreis:2180,titel:"3-Zi. mit Home-Office und Balkon",url:"https://www.ballwanz.de/objekt/3-zimmer-wohnung-mit-home-office-und-balkon/"},
  {_id:"b14",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:95,kaltmiete:2190,nebenkosten:null,heizkosten:null,gesamtpreis:2190,titel:"3-Zi. Loggia und viel Licht",url:"https://www.ballwanz.de/objekt/drei-zimmer-eine-loggia-und-viel-licht/"},
  {_id:"b15",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:4,groesse:98,kaltmiete:2220,nebenkosten:null,heizkosten:null,gesamtpreis:2220,titel:"4-Zi. Neubau mit sonnigem Balkon",url:"https://www.ballwanz.de/objekt/neue-raeume-neues-glueck-geraeumige-4-zimmer-wohnung-mit-sonnigem-balkon/"},
  {_id:"b16",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:105,kaltmiete:2245,nebenkosten:null,heizkosten:null,gesamtpreis:2245,titel:"3-Zi. Erstbezug, stilvoll",url:"https://www.ballwanz.de/objekt/erstbezug-stilvolle-3-zimmer-wohnung/"},
  {_id:"b17",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Westhafen",zimmer:3,groesse:102,kaltmiete:2258,nebenkosten:null,heizkosten:null,gesamtpreis:2258,titel:"3-Zi. Westhafen – Balkon & Loggia",url:"https://www.ballwanz.de/objekt/grosszuegige-3-zimmer-wohnung-am-westhafen-mit-balkon-und-loggia/"},
  {_id:"b18",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:3,groesse:101,kaltmiete:2300,nebenkosten:null,heizkosten:null,gesamtpreis:2300,titel:"3-Zi. Sonnenterrasse – direkte Mainlage",url:"https://www.ballwanz.de/objekt/moderne-3-zimmer-wohnung-mit-sonnenterasse-in-direkter-mainlage/"},
  {_id:"b19",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Rebstockviertel",zimmer:3,groesse:102,kaltmiete:2345,nebenkosten:null,heizkosten:null,gesamtpreis:2345,titel:"3-Zi. am Rebstockpark",url:"https://www.ballwanz.de/objekt/ruhe-und-erholung-3-zimmer-wohnung-am-rebstockpark/"},
  {_id:"b20",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Frankfurt",zimmer:4,groesse:104,kaltmiete:2345,nebenkosten:null,heizkosten:null,gesamtpreis:2345,titel:"4-Zi. Neubau mit Balkon",url:"https://www.ballwanz.de/objekt/neubaucharme-pur-helle-4-zimmer-wohnung-mit-balkon/"},
  {_id:"b21",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Altstadt",zimmer:3,groesse:91,kaltmiete:2350,nebenkosten:null,heizkosten:null,gesamtpreis:2350,titel:"3-Zi. Altstadtwohnung mit Licht",url:"https://www.ballwanz.de/objekt/charmante-3-zimmer-altstadtwohnung-mit-viel-licht-und-moderner-ausstattung/"},
  {_id:"b22",quelle:"Ballwanz Immobilien",stadt:"Frankfurt",stadtteil:"Bockenheim",zimmer:4,groesse:111,kaltmiete:2390,nebenkosten:null,heizkosten:null,gesamtpreis:2390,titel:"4-Zi. Bockenheim – ideal für Familien",url:"https://www.ballwanz.de/objekt/4-zimmer-wohnung-in-frankfurt-bockenheim-ideal-fuer-familien/"},
];

function extractJSON(text){
  if(!text) return null;
  let t=text.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
  try{const p=JSON.parse(t);if(Array.isArray(p))return p;}catch(_){}
  const s=t.indexOf("["),e=t.lastIndexOf("]");
  if(s!==-1&&e>s){try{const p=JSON.parse(t.slice(s,e+1));if(Array.isArray(p))return p;}catch(_){}}
  const m=t.match(/\[[\s\S]*?\]/s);
  if(m){try{const p=JSON.parse(m[0]);if(Array.isArray(p))return p;}catch(_){}}
  return null;
}

async function fetchWithSearch(prompt,onLog){
  const msgs=[{role:"user",content:prompt}];
  for(let turn=0;turn<8;turn++){
    onLog(`  Turn ${turn+1}…`);
    let res;
    try{res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,
        tools:[{type:"web_search_20250305",name:"web_search"}],messages:msgs}),
    });}catch(e){onLog(`  Netzwerkfehler: ${e.message}`);return null;}
    if(!res.ok){const t=await res.text().catch(()=>"");onLog(`  HTTP ${res.status}: ${t.slice(0,120)}`);return null;}
    let data;try{data=await res.json();}catch(e){onLog(`  JSON-Fehler: ${e.message}`);return null;}
    if(data.error){onLog(`  API-Fehler: ${data.error.message}`);return null;}
    const content=data.content||[],reason=data.stop_reason;
    onLog(`  stop_reason=${reason} [${content.map(b=>b.type).join(",")}]`);
    msgs.push({role:"assistant",content});
    if(reason==="end_turn") return content.filter(b=>b.type==="text").map(b=>b.text).join("");
    if(reason==="tool_use"){
      const uses=content.filter(b=>b.type==="tool_use");
      if(!uses.length){onLog("  Keine tool_use blocks");break;}
      msgs.push({role:"user",content:uses.map(b=>({type:"tool_result",tool_use_id:b.id,content:"Search done."}))});
    }else break;
  }
  return null;
}

const REFRESH_PROMPT=`Besuche die Seite https://www.ballwanz.de/wohnen/mietangebote/ und extrahiere ALLE Mietwohnungen mit:
- 3 oder 4 Zimmer, mindestens 80 m², maximal 2.400 EUR Kaltmiete

Antworte NUR mit JSON-Array (keine anderen Texte, keine Backticks):
[{"_id":"n1","quelle":"Ballwanz Immobilien","stadt":"Frankfurt","stadtteil":"STADTTEIL_ODER_Frankfurt","zimmer":ZAHL,"groesse":ZAHL,"kaltmiete":ZAHL,"nebenkosten":null,"heizkosten":null,"gesamtpreis":ZAHL,"titel":"TITEL","url":"https://www.ballwanz.de/objekt/SLUG/"}]`;

const euro=v=>(!v&&v!==0)?"–":v.toLocaleString("de-DE")+" €";

const OTHER=[
  {name:"Engel & Völkers",note:"3-Zi ab 2.910 €",url:"https://www.engelvoelkers.com/de/de/immobilien/res/mieten/wohnung/hessen/frankfurt-am-main"},
  {name:"Von Poll Frankfurt",note:"Online-Listings",url:"https://www.von-poll.com/de/wohnung-mieten/frankfurt"},
  {name:"NHW Schönhofviertel",note:"Bockenheim Neubau",url:"https://www.nhw.de/schoenhof-viertel"},
  {name:"Vonovia Frankfurt",note:"Online buchbar",url:"https://www.vonovia.de/meine-stadt/wohnungen-in-frankfurt"},
  {name:"ABG Frankfurt",note:"Warteliste",url:"https://www.abg.de/mieten/"},
  {name:"Wohnbau Mainz",note:"11.000 Whg.",url:"https://www.wohnbau-mainz.de"},
  {name:"J. Molitor Mainz",note:"Projekte online",url:"https://www.molitor-immobilien.de/wohnen/wohnimmobilien-mieten/"},
  {name:"ohne-makler.net FFM",note:"196 Angebote",url:"https://www.ohne-makler.net/immobilien/wohnung-mieten/hessen/frankfurt-main/"},
  {name:"ohne-makler.net MZ",note:"87 Angebote",url:"https://www.ohne-makler.net/immobilien/wohnung-mieten/rheinland-pfalz/mainz/"},
];

export default function App(){
  const[listings,setListings]=useState(SEED);
  const[refreshing,setRefreshing]=useState(false);
  const[logs,setLogs]=useState([]);
  const[showLogs,setShowLogs]=useState(false);
  const[lastUpdated,setLastUpdated]=useState(SEED_TS);
  const[fCity,setFCity]=useState("all");
  const[fPrice,setFPrice]=useState(2400);
  const[fSize,setFSize]=useState(80);
  const[sort,setSort]=useState({col:"gesamtpreis",dir:"asc"});
  const[tab,setTab]=useState("list");
  const logRef=useRef([]);

  const addLog=msg=>{logRef.current=[...logRef.current,`[${new Date().toLocaleTimeString("de-DE")}] ${msg}`];setLogs([...logRef.current]);};

  useEffect(()=>{(async()=>{try{const r=await window.storage.get("wm_v5");if(r){const d=JSON.parse(r.value);setListings(d.l||SEED);setLastUpdated(d.ts||SEED_TS);}}catch(_){}})();},[]);

  const runRefresh=async()=>{
    setRefreshing(true);logRef.current=[];setLogs([]);
    addLog("Starte Aktualisierung von ballwanz.de…");
    const text=await fetchWithSearch(REFRESH_PROMPT,addLog);
    if(text){
      const parsed=extractJSON(text);
      if(parsed&&parsed.length>0){
        const tagged=parsed.map((r,i)=>({...r,_id:`r${i}-${Date.now()}`}));
        const ts=new Date().toISOString();
        setListings(tagged);setLastUpdated(ts);
        addLog(`✓ ${tagged.length} Angebote geladen.`);
        try{await window.storage.set("wm_v5",JSON.stringify({l:tagged,ts}));}catch(_){}
      }else{addLog("Konnte keine Daten extrahieren – Seed-Daten bleiben.");setShowLogs(true);}
    }else{addLog("Kein Text erhalten – Seed-Daten bleiben.");setShowLogs(true);}
    setRefreshing(false);
  };

  const filtered=listings
    .filter(l=>{
      if(fCity!=="all"&&l.stadt!==fCity) return false;
      const p=l.gesamtpreis||l.kaltmiete;
      if(p&&p>fPrice) return false;
      if(l.groesse&&l.groesse<fSize) return false;
      return true;
    })
    .sort((a,b)=>{
      const va=a[sort.col]??(sort.dir==="asc"?1e9:-1e9),vb=b[sort.col]??(sort.dir==="asc"?1e9:-1e9);
      if(typeof va==="string") return sort.dir==="asc"?va.localeCompare(vb):vb.localeCompare(va);
      return sort.dir==="asc"?va-vb:vb-va;
    });

  const prices=filtered.map(l=>l.gesamtpreis||l.kaltmiete).filter(Boolean);
  const avg=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):null;
  const hs=col=>setSort(s=>s.col===col?{col,dir:s.dir==="asc"?"desc":"asc"}:{col,dir:"asc"});
  const isSeed=lastUpdated===SEED_TS;

  const Th=({col,r,children})=>(
    <th onClick={()=>hs(col)} style={{padding:"9px 13px",textAlign:r?"right":"left",cursor:"pointer",fontWeight:700,fontSize:10,letterSpacing:.8,textTransform:"uppercase",whiteSpace:"nowrap",userSelect:"none",color:sort.col===col?"#1e40af":"#64748b",borderBottom:sort.col===col?"2px solid #3b82f6":"2px solid transparent",background:sort.col===col?"#eff6ff":"transparent"}}>
      {children}<span style={{marginLeft:3,opacity:sort.col===col?1:.3}}>{sort.col===col?(sort.dir==="asc"?"↑":"↓"):"↕"}</span>
    </th>
  );

  const AC=({l})=>{
    const a=calcAmpel(l.kaltmiete,l.groesse,l.stadtteil,l.stadt);
    if(!a) return<td style={{padding:"8px 13px",textAlign:"center",color:"#cbd5e1",fontSize:10}}>k.A.</td>;
    const s=AS[a.key];
    return(
      <td style={{padding:"6px 13px",textAlign:"center"}}>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{width:11,height:11,borderRadius:"50%",background:s.c,boxShadow:`0 0 0 3px ${s.b}`}}/>
          <span style={{fontSize:10,fontWeight:700,color:s.c,background:s.bg,border:`1px solid ${s.b}`,borderRadius:4,padding:"1px 5px"}}>{s.t}</span>
          <span style={{fontSize:9,color:"#94a3b8",lineHeight:1.3,textAlign:"center"}}>
            {a.ppm}€/m² vs {a.ref}€<br/><span style={{color:s.c,fontWeight:700}}>{a.d>0?"+":""}{a.d}%</span>
          </span>
        </div>
      </td>
    );
  };

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#f1f5f9",minHeight:"100vh",color:"#0f172a"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)",padding:"20px 24px 16px",boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>
        <div style={{maxWidth:1500,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <h1 style={{margin:0,fontSize:20,fontWeight:800,color:"white",letterSpacing:-.5}}>🏠 Wohnungs-Monitor Frankfurt & Mainz</h1>
              <p style={{margin:"4px 0 0",fontSize:12,color:"#93c5fd"}}>3–4 Zi · ≥80 m² · ≤2.400 € · Mietspiegel-Ampel 2024/25</p>
              <p style={{margin:"5px 0 0",fontSize:11,color:isSeed?"#fbbf24":"#64748b",display:"flex",alignItems:"center",gap:5}}>
                {isSeed&&<span style={{background:"rgba(251,191,36,.2)",border:"1px solid rgba(251,191,36,.4)",borderRadius:4,padding:"1px 6px",fontSize:10}}>📌 Daten vom 17.06.2026</span>}
                Stand: {new Date(lastUpdated).toLocaleString("de-DE")} · {listings.length} Einträge
              </p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={runRefresh} disabled={refreshing} style={{background:refreshing?"#475569":"#3b82f6",color:"white",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:refreshing?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:7}}>
                {refreshing?<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>Aktualisiere…</>:"⟳ Daten aktualisieren"}
              </button>
              <button onClick={()=>setShowLogs(x=>!x)} style={{background:"rgba(255,255,255,.1)",color:"white",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {showLogs?"▲":"▼"} Log
              </button>
            </div>
          </div>
          {refreshing&&<div style={{marginTop:10,background:"rgba(59,130,246,.15)",borderRadius:8,padding:"8px 12px"}}>
            <div style={{fontSize:11,color:"#93c5fd",marginBottom:5}}>⏳ Rufe ballwanz.de ab…</div>
            <div style={{background:"rgba(255,255,255,.1)",borderRadius:6,height:4,overflow:"hidden"}}>
              <div style={{background:"#60a5fa",height:"100%",width:"100%",animation:"pulse 1.5s ease-in-out infinite"}}/>
            </div>
          </div>}
          {showLogs&&<div style={{marginTop:10,background:"rgba(0,0,0,.45)",borderRadius:8,padding:"10px 14px",maxHeight:180,overflowY:"auto",fontFamily:"monospace",fontSize:10,lineHeight:1.7}}>
            {logs.length===0
              ?<span style={{color:"#475569"}}>Noch kein Log. Starte "Daten aktualisieren".</span>
              :logs.map((l,i)=><div key={i} style={{color:l.toLowerCase().includes("fehler")||l.toLowerCase().includes("error")?"#f87171":l.includes("✓")?"#86efac":"#94a3b8"}}>{l}</div>)
            }
          </div>}
        </div>
      </div>

      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"10px 24px"}}>
        <div style={{maxWidth:1500,margin:"0 auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase"}}>Filter</span>
          {[{l:"Alle",v:"all"},{l:"Frankfurt",v:"Frankfurt"},{l:"Mainz",v:"Mainz"}].map(o=>(
            <button key={o.v} onClick={()=>setFCity(o.v)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid",fontSize:12,fontWeight:600,cursor:"pointer",background:fCity===o.v?"#1e40af":"white",color:fCity===o.v?"white":"#64748b",borderColor:fCity===o.v?"#1e40af":"#e2e8f0"}}>{o.l}</button>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12,color:"#64748b"}}>Max.</span>
            <input type="number" value={fPrice} onChange={e=>setFPrice(+e.target.value)} style={{padding:"5px 8px",borderRadius:7,border:"1px solid #cbd5e1",fontSize:12,width:90}} step={100}/>
            <span style={{fontSize:12,color:"#64748b"}}>€</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12,color:"#64748b"}}>Min.</span>
            <input type="number" value={fSize} onChange={e=>setFSize(+e.target.value)} style={{padding:"5px 8px",borderRadius:7,border:"1px solid #cbd5e1",fontSize:12,width:70}}/>
            <span style={{fontSize:12,color:"#64748b"}}>m²</span>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"1px solid #e2e8f0"}}>
            {["list","stats"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:tab===t?"#1e40af":"white",color:tab===t?"white":"#64748b"}}>{t==="list"?"📋 Tabelle":"📊 Statistik"}</button>)}
          </div>
          <span style={{fontSize:12,color:"#64748b",borderLeft:"1px solid #e2e8f0",paddingLeft:10}}><strong style={{color:"#1e293b"}}>{filtered.length}</strong> Angebote</span>
        </div>
      </div>

      <div style={{maxWidth:1500,margin:"0 auto",padding:"16px 24px 32px"}}>
        {isSeed&&<div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:13,color:"#92400e",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:18}}>📌</span>
          <span><strong>Seed-Daten vom 17.06.2026</strong> — Live von ballwanz.de abgerufen und eingebettet. Klicke <strong>„Daten aktualisieren"</strong> für den aktuellen Stand.</span>
        </div>}

        {tab==="stats"&&filtered.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
            {[{l:"Angebote",v:filtered.length,i:"📋",c:"#3b82f6"},{l:"Ø Preis",v:avg?`${avg.toLocaleString("de-DE")} €`:"–",i:"💶",c:"#8b5cf6"},{l:"Günstigstes",v:prices.length?`${Math.min(...prices).toLocaleString("de-DE")} €`:"–",i:"🟢",c:"#16a34a"},{l:"Teuerstes",v:prices.length?`${Math.max(...prices).toLocaleString("de-DE")} €`:"–",i:"🔴",c:"#dc2626"}].map(s=>(
              <div key={s.l} style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:20}}>{s.i}</div>
                <div style={{fontSize:22,fontWeight:800,color:s.c,marginTop:4}}>{s.v}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{s.l}</div>
              </div>
            ))}
            <div style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0",gridColumn:"span 2"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Ampel-Verteilung</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                {Object.entries(AS).map(([k,s])=>{const n=filtered.filter(l=>{const a=calcAmpel(l.kaltmiete,l.groesse,l.stadtteil,l.stadt);return a?.key===k;}).length;return(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:11,height:11,borderRadius:"50%",background:s.c}}/>
                    <div><div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{n}</div><div style={{fontSize:10,color:"#94a3b8"}}>{s.t}</div></div>
                  </div>
                );})}
              </div>
            </div>
            <div style={{background:"white",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0",gridColumn:"span 2"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Nach Stadtteil</div>
              {Object.entries(filtered.reduce((acc,l)=>{const k=l.stadtteil||"–";acc[k]=(acc[k]||0)+1;return acc;},{})).sort(([,a],[,b])=>b-a).map(([q,n])=>(
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

        {tab==="list"&&filtered.length>0&&(
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
                    <th style={{padding:"9px 13px",fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"#64748b",textAlign:"center",whiteSpace:"nowrap"}}>Mietspiegel 🚦</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l,i)=>{
                    const a=calcAmpel(l.kaltmiete,l.groesse,l.stadtteil,l.stadt);
                    const bg=a?AS[a.key].bg:i%2===0?"white":"#fafafa";
                    return(
                      <tr key={l._id||i} style={{background:bg,borderBottom:"1px solid #f1f5f9"}}>
                        <td style={{padding:"9px 13px",fontWeight:600,color:"#334155",fontSize:12,whiteSpace:"nowrap"}}>{l.quelle||"–"}</td>
                        <td style={{padding:"9px 13px",maxWidth:260}}>
                          {l.url?<a href={l.url} target="_blank" rel="noopener noreferrer" style={{color:"#2563eb",textDecoration:"none",fontSize:12,fontWeight:500}}>{(l.titel||"→ Angebot").slice(0,55)}{(l.titel||"").length>55?"…":""}</a>:<span style={{color:"#94a3b8",fontSize:12}}>{l.titel||"–"}</span>}
                        </td>
                        <td style={{padding:"9px 13px",color:"#475569",fontSize:12}}>{l.stadtteil||"–"}</td>
                        <td style={{padding:"9px 13px"}}>{l.stadt&&<span style={{background:l.stadt==="Frankfurt"?"#dbeafe":"#fce7f3",color:l.stadt==="Frankfurt"?"#1d4ed8":"#be185d",borderRadius:5,padding:"2px 7px",fontSize:11,fontWeight:700}}>{l.stadt}</span>}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",fontWeight:700}}>{l.zimmer||"–"}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",fontWeight:700}}>{l.groesse?`${l.groesse} m²`:"–"}</td>
                        <td style={{padding:"9px 13px",textAlign:"right"}}>{euro(l.kaltmiete)}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",color:"#64748b"}}>{euro(l.nebenkosten)}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",color:"#64748b"}}>{euro(l.heizkosten)}</td>
                        <td style={{padding:"9px 13px",textAlign:"right",fontWeight:800,fontSize:14,color:(l.gesamtpreis||l.kaltmiete)>2200?"#dc2626":"#1e293b"}}>{euro(l.gesamtpreis||l.kaltmiete)}</td>
                        <AC l={l}/>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{padding:"9px 14px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#94a3b8",flexWrap:"wrap",gap:8}}>
              <span>{filtered.length} Angebote · ballwanz.de · {new Date(lastUpdated).toLocaleDateString("de-DE")}</span>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                {Object.entries(AS).map(([k,s])=><div key={k} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:s.c}}/><span style={{color:s.c}}>{s.t}</span></div>)}
                <span>· Ref: Frankfurter Mietspiegel 2024/25</span>
              </div>
            </div>
          </div>
        )}

        {filtered.length===0&&<div style={{textAlign:"center",padding:48,background:"white",borderRadius:14,border:"1px solid #e2e8f0",color:"#64748b"}}>Keine Angebote für diese Filter.</div>}

        <div style={{marginTop:16,background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#334155",marginBottom:10}}>🔗 Weitere Anbieter – direkt besuchen</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {OTHER.map(a=>(
              <a key={a.name} href={a.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",flexDirection:"column",gap:1,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"7px 12px",textDecoration:"none"}}>
                <span style={{fontSize:12,fontWeight:600,color:"#1e40af"}}>{a.name}</span>
                <span style={{fontSize:10,color:"#94a3b8"}}>{a.note}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
    </div>
  );
}
