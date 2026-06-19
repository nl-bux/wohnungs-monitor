/**
 * Wohnungs-Scraper v2 – Frankfurt & Mainz
 * Kriterien: 3–4 Zimmer · ≥80 m² · ≤2.400 €
 * 
 * NEU: playwright-extra + stealth-plugin gegen Bot-Erkennung
 */

const { chromium } = require("playwright");
const fs   = require("fs");
const path = require("path");

// Stealth-Plugin laden (optional, graceful fallback)
let stealthChromium = null;
try {
  const { chromium: stealthBase } = require("playwright-extra");
  const stealth = require("puppeteer-extra-plugin-stealth");
  stealthBase.use(stealth());
  stealthChromium = stealthBase;
  console.log("✓ Stealth-Modus aktiv");
} catch(_) {
  console.log("⚠ Stealth nicht verfügbar, nutze Standard-Chromium");
}

const CONFIG = {
  minRooms: 3, maxRooms: 4, minSize: 80, maxPrice: 2400,
  timeout: 35000, outputDir: "./results", headless: true,
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ── Hilfsfunktionen ────────────────────────────────────────────────────────
function parsePrice(str) {
  if (!str) return null;
  const m = str.match(/[\d.,]+/);
  if (!m) return null;
  return parseFloat(m[0].replace(/\./g,"").replace(",","."));
}
function parseRooms(str) {
  if (!str) return null;
  const m = str.match(/(\d[,.]?\d?)/);
  return m ? parseFloat(m[1].replace(",",".")) : null;
}
function parseSize(str) {
  if (!str) return null;
  const m = str.match(/(\d+[,.]?\d*)/);
  return m ? parseFloat(m[1].replace(",",".")) : null;
}
function guessStadtteil(text, url="") {
  const stadtteile = [
    "Westend","Nordend","Sachsenhausen","Bockenheim","Bornheim","Ostend",
    "Gallus","Westhafen","Rebstockviertel","Altstadt","Innenstadt","Niederrad",
    "Griesheim","Eschersheim","Dornbusch","Riedberg","Bergen-Enkheim",
    "Bahnhofsviertel","Gutleutviertel","Ginnheim","Hausen","Kalbach",
  ];
  const s = (text + " " + url).toLowerCase();
  for (const st of stadtteile) {
    if (s.includes(st.toLowerCase())) return st;
  }
  return null;
}

// ── Scroll helper ──────────────────────────────────────────────────────────
async function scrollAndWait(page, ms=2000) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const step = () => {
        window.scrollBy(0, 300);
        total += 300;
        if (total < document.body.scrollHeight) setTimeout(step, 100);
        else resolve();
      };
      step();
    });
  });
  await page.waitForTimeout(ms);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

// ── SCRAPER 1: Ballwanz ────────────────────────────────────────────────────
async function scrapeBallwanz(page) {
  const src = "Ballwanz Immobilien";
  await page.goto("https://www.ballwanz.de/wohnen/mietangebote/", { waitUntil:"domcontentloaded", timeout:CONFIG.timeout });
  await page.waitForTimeout(2000);

  return (await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("a[href*='/objekt/']").forEach(a => {
      const txt = a.innerText || "";
      const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
      const pr = txt.match(/([\d\.]+)\s*EUR/);
      const zi = txt.match(/(\d[,.]?\d?)[- ]?Zimmer/i);
      if (!qm || !pr) return;
      const href = a.href;
      const titleLine = txt.split("\n")[0].trim();
      results.push({
        titel: titleLine.slice(0,80),
        url: href,
        groesse: parseFloat(qm[1].replace(",",".")),
        zimmer: zi ? parseFloat(zi[1].replace(",",".")) : null,
        kaltmiete: parseFloat(pr[1].replace(/\./g,"")),
        nebenkosten: null, heizkosten: null,
        gesamtpreis: parseFloat(pr[1].replace(/\./g,"")),
        stadtteil: null, stadt: "Frankfurt",
      });
    });
    return [...new Map(results.map(r=>[r.url,r])).values()];
  })).map(i => ({...i,
    quelle: src,
    stadtteil: guessStadtteil(i.titel, i.url),
  }));
}

// ── SCRAPER 2: Vonovia Frankfurt ───────────────────────────────────────────
async function scrapeVonovia(page) {
  const src = "Vonovia";
  // Vonovia hat eine REST-API – direkt abfragen
  try {
    await page.goto(
      "https://www.vonovia.de/api/estate/search?city=Frankfurt+am+Main&rooms_min=3&rooms_max=4&size_min=80&size_max=200&rent_max=2400&page=1&pageSize=50",
      { waitUntil:"domcontentloaded", timeout:CONFIG.timeout }
    );
    const body = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(body);
    const items = data?.items || data?.results || data?.estates || [];
    return items.map((item,i) => ({
      quelle: src,
      titel: item.title || item.headline || `Vonovia Wohnung ${i+1}`,
      url: item.url || item.link || "https://www.vonovia.de/zuhause-finden",
      groesse: item.livingArea || item.size || null,
      zimmer: item.rooms || item.numberOfRooms || null,
      kaltmiete: item.baseRent || item.netRent || item.price || null,
      nebenkosten: item.additionalCosts || null,
      heizkosten: item.heatingCosts || null,
      gesamtpreis: item.totalRent || item.warmRent || null,
      stadtteil: item.district || item.neighborhood || null,
      stadt: "Frankfurt",
    }));
  } catch(_) {}

  // Fallback: normale Seite
  await page.goto("https://www.vonovia.de/meine-stadt/wohnungen-in-frankfurt", { waitUntil:"networkidle", timeout:CONFIG.timeout });
  await scrollAndWait(page);

  return (await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('[class*="card"],[class*="estate"],[class*="listing"],[class*="result-item"]').forEach(card => {
      const txt = card.innerText || "";
      const link = card.querySelector("a");
      const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
      const pr = txt.match(/([\d\.]+[,]\d{2})\s*€/) || txt.match(/([\d\.]+)\s*€/);
      const zi = txt.match(/(\d[,.]?\d?)\s*Zimmer/i);
      if (!qm || !pr) return;
      results.push({
        titel: (card.querySelector("h2,h3,[class*='title']")?.innerText || "Vonovia Wohnung").slice(0,80),
        url: link?.href || "https://www.vonovia.de",
        groesse: parseFloat(qm[1].replace(",",".")),
        zimmer: zi ? parseFloat(zi[1].replace(",",".")) : null,
        kaltmiete: parseFloat(pr[1].replace(/\./g,"").replace(",",".")),
        nebenkosten: null, heizkosten: null,
        gesamtpreis: parseFloat(pr[1].replace(/\./g,"").replace(",",".")),
        stadtteil: null, stadt: "Frankfurt",
      });
    });
    return results;
  })).map(i => ({...i, quelle: src}));
}

// ── SCRAPER 3: Von Poll ────────────────────────────────────────────────────
async function scrapeVonPoll(page) {
  const src = "Von Poll Immobilien";
  await page.goto("https://www.von-poll.com/de/wohnung-mieten/frankfurt", { waitUntil:"networkidle", timeout:CONFIG.timeout });

  // Cookie banner
  try { await page.click('button:has-text("Alle akzeptieren"), button:has-text("Akzeptieren")', {timeout:4000}); await page.waitForTimeout(1000); } catch(_) {}
  await scrollAndWait(page, 3000);

  return (await page.evaluate(() => {
    const results = [];
    const selectors = ['[class*="expose"]','[class*="property"]','[class*="estate-item"]','[class*="listing"]','article'];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(card => {
        const txt = card.innerText || "";
        if (txt.length < 30) return;
        const link = card.querySelector("a");
        const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
        const pr = txt.match(/([\d\.]+[,]\d{2})\s*€/) || txt.match(/([\d\.]+)\s*€/);
        const zi = txt.match(/(\d[,.]?\d?)\s*Zi/i);
        if (!qm || !pr) return;
        const price = parseFloat(pr[1].replace(/\./g,"").replace(",","."));
        if (price > 5000) return; // filter out ridiculous prices
        results.push({
          titel: (card.querySelector("h2,h3,[class*='title'],[class*='head']")?.innerText||"Von Poll").slice(0,80),
          url: link?.href || "https://www.von-poll.com",
          groesse: parseFloat(qm[1].replace(",",".")),
          zimmer: zi ? parseFloat(zi[1].replace(",",".")) : null,
          kaltmiete: price,
          nebenkosten:null, heizkosten:null, gesamtpreis:price,
          stadtteil:null, stadt:"Frankfurt",
        });
      });
    });
    return [...new Map(results.map(r=>[r.url,r])).values()];
  })).map(i => ({...i, quelle: src, stadtteil: guessStadtteil(i.titel, i.url)}));
}

// ── SCRAPER 4: Engel & Völkers ─────────────────────────────────────────────
async function scrapeEngelVoelkers(page) {
  const src = "Engel & Völkers";
  await page.goto(
    "https://www.engelvoelkers.com/de/de/immobilien/res/mieten/wohnung/hessen/frankfurt-am-main",
    { waitUntil:"networkidle", timeout:CONFIG.timeout }
  );
  try { await page.click('[id*="consent"] button, [class*="accept"]', {timeout:4000}); await page.waitForTimeout(1000); } catch(_) {}
  await scrollAndWait(page, 3000);

  return (await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('[data-testid*="property"],[class*="property-card"],[class*="search-result"],[class*="estate"]').forEach(card => {
      const txt = card.innerText || "";
      const link = card.querySelector("a");
      const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
      const pr = txt.match(/([\d\.]+[,]\d{2})\s*€/) || txt.match(/([\d\.]+)\s*€/);
      const zi = txt.match(/(\d[,.]?\d?)\s*(?:Zi|Zimmer)/i);
      if (!qm || !pr) return;
      const price = parseFloat(pr[1].replace(/\./g,"").replace(",","."));
      results.push({
        titel: (card.querySelector("h2,h3,[class*='title']")?.innerText||"E&V").slice(0,80),
        url: link?.href || "https://www.engelvoelkers.com",
        groesse: parseFloat(qm[1].replace(",",".")),
        zimmer: zi ? parseFloat(zi[1].replace(",",".")) : null,
        kaltmiete: price, nebenkosten:null, heizkosten:null, gesamtpreis:price,
        stadtteil:null, stadt:"Frankfurt",
      });
    });
    return [...new Map(results.map(r=>[r.url,r])).values()];
  })).map(i => ({...i, quelle: src}));
}

// ── SCRAPER 5: NHW ────────────────────────────────────────────────────────
async function scrapeNHW(page) {
  const src = "NHW / Schönhofviertel";
  await page.goto("https://www.nhw.de/wohnungsangebot", { waitUntil:"networkidle", timeout:CONFIG.timeout });
  await scrollAndWait(page, 2000);

  const items = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("article,[class*='expose'],[class*='angebot'],[class*='wohnung']").forEach(card => {
      const txt = card.innerText || "";
      const link = card.querySelector("a");
      const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
      const pr = txt.match(/([\d\.]+[,]\d{2})\s*€/) || txt.match(/([\d\.]+)\s*€/);
      const zi = txt.match(/(\d[,.]?\d?)\s*Zimmer/i);
      if (!qm || !pr) return;
      results.push({
        titel:(card.querySelector("h2,h3")?.innerText||"NHW").slice(0,80),
        url:link?.href||"https://www.nhw.de",
        groesse:parseFloat(qm[1].replace(",",".")),
        zimmer:zi?parseFloat(zi[1].replace(",",".")):null,
        kaltmiete:parseFloat(pr[1].replace(/\./g,"").replace(",",".")),
        nebenkosten:null,heizkosten:null,
        gesamtpreis:parseFloat(pr[1].replace(/\./g,"").replace(",",".")),
        stadtteil:null,stadt:"Frankfurt",
      });
    });
    return results;
  });
  return items.map(i => ({...i, quelle: src, stadtteil: i.stadtteil || "Bockenheim"}));
}

// ── SCRAPER 6: ohne-makler.net ─────────────────────────────────────────────
async function scrapeOhneMakler(page) {
  const src = "ohne-makler.net";
  const results = [];
  for (const [stadt, url] of [
    ["Frankfurt","https://www.ohne-makler.net/immobilien/wohnung-mieten/hessen/frankfurt-main/"],
    ["Mainz",    "https://www.ohne-makler.net/immobilien/wohnung-mieten/rheinland-pfalz/mainz/"],
  ]) {
    try {
      await page.goto(url, { waitUntil:"networkidle", timeout:CONFIG.timeout });
      await scrollAndWait(page, 2500);
      await scrollAndWait(page, 2000);

      const items = await page.evaluate((stadtName) => {
        const res = [];
        document.querySelectorAll("a[href*='/immobilie/']").forEach(a => {
          const card = a.closest("article,li,div[class*='item'],div[class*='listing']") || a;
          const txt = card.innerText || a.innerText || "";
          const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
          const pr = txt.match(/([\d\.]+)\s*€/);
          const zi = txt.match(/(\d[,.]?\d?)\s*(?:Zi|Zimmer)/i);
          if (!qm || !pr) return;
          const groesse = parseFloat(qm[1].replace(",","."));
          const preis   = parseFloat(pr[1].replace(/\./g,""));
          if (groesse < 80 || preis > 2400) return;
          const zimmer = zi ? parseFloat(zi[1].replace(",",".")) : null;
          if (zimmer && (zimmer < 3 || zimmer > 4)) return;
          const lines = txt.split("\n").filter(Boolean);
          res.push({
            titel: lines[0]?.trim().slice(0,80) || "Wohnung",
            url: a.href,
            groesse, zimmer,
            kaltmiete: preis, nebenkosten:null, heizkosten:null, gesamtpreis:preis,
            stadtteil: (txt.match(/\(([A-ZÄÖÜ][a-zäöü\-]+)\)/) || [])[1] || null,
            stadt: stadtName,
          });
        });
        return [...new Map(res.map(r=>[r.url,r])).values()];
      }, stadt);

      results.push(...items.map(i => ({...i, quelle: src})));
    } catch(e) {
      console.log(`  ohne-makler ${stadt}: ${e.message}`);
    }
  }
  return results;
}

// ── SCRAPER 7: Molitor Mainz ───────────────────────────────────────────────
async function scrapeMolitor(page) {
  const src = "J. Molitor Immobilien";
  await page.goto("https://www.molitor-immobilien.de/wohnen/wohnimmobilien-mieten/", { waitUntil:"networkidle", timeout:CONFIG.timeout });
  await scrollAndWait(page, 2000);

  return (await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("article,[class*='property'],[class*='projekt'],[class*='expose'],div[class*='item']").forEach(card => {
      const txt = card.innerText || "";
      if (txt.length < 20) return;
      const link = card.querySelector("a");
      const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
      const pr = txt.match(/ab\s+([\d\.]+[,]\d{2})\s*€/i) || txt.match(/([\d\.]+[,]\d{2})\s*€/) || txt.match(/([\d\.]+)\s*€/);
      const zi = txt.match(/(\d[–-]?\d?)\s*(?:-?Zimmer|-?Zi\.?)/i);
      if (!qm) return;
      results.push({
        titel:(card.querySelector("h2,h3,[class*='title'],[class*='head']")?.innerText||txt.split("\n")[0]||"Molitor").slice(0,80),
        url:link?.href||"https://www.molitor-immobilien.de",
        groesse:parseFloat(qm[1].replace(",",".")),
        zimmer:zi?parseFloat(zi[1].replace(",",".")):null,
        kaltmiete:pr?parseFloat(pr[1].replace(/\./g,"").replace(",",".")):null,
        nebenkosten:null,heizkosten:null,
        gesamtpreis:pr?parseFloat(pr[1].replace(/\./g,"").replace(",",".")):null,
        stadtteil:null,stadt:"Mainz",
      });
    });
    return [...new Map(results.map(r=>[r.url,r])).values()];
  })).map(i => ({...i, quelle: src}));
}

// ── SCRAPER 8: Wohnbau Mainz ───────────────────────────────────────────────
async function scrapeWohnbauMainz(page) {
  const src = "Wohnbau Mainz";
  await page.goto("https://www.wohnbau-mainz.de/wohnungsangebote", { waitUntil:"networkidle", timeout:CONFIG.timeout });
  await scrollAndWait(page, 2000);

  return (await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("article,[class*='expose'],[class*='wohnung'],[class*='angebot']").forEach(card => {
      const txt = card.innerText || "";
      const link = card.querySelector("a");
      const qm = txt.match(/(\d+[\.,]?\d*)\s*m²/);
      const pr = txt.match(/([\d\.]+[,]\d{2})\s*€/) || txt.match(/([\d\.]+)\s*€/);
      const zi = txt.match(/(\d[,.]?\d?)\s*Zimmer/i);
      if (!qm || !pr) return;
      results.push({
        titel:(card.querySelector("h2,h3")?.innerText||"Wohnbau Mainz").slice(0,80),
        url:link?.href||"https://www.wohnbau-mainz.de",
        groesse:parseFloat(qm[1].replace(",",".")),
        zimmer:zi?parseFloat(zi[1].replace(",",".")):null,
        kaltmiete:parseFloat(pr[1].replace(/\./g,"").replace(",",".")),
        nebenkosten:null,heizkosten:null,
        gesamtpreis:parseFloat(pr[1].replace(/\./g,"").replace(",",".")),
        stadtteil:null,stadt:"Mainz",
      });
    });
    return results;
  })).map(i=>({...i,quelle:src}));
}

// ── Filter & Ampel ────────────────────────────────────────────────────────
function matches(l) {
  const p = l.gesamtpreis || l.kaltmiete;
  return l.groesse >= CONFIG.minSize &&
    (p == null || p <= CONFIG.maxPrice) &&
    (l.zimmer == null || (l.zimmer >= CONFIG.minRooms && l.zimmer <= CONFIG.maxRooms));
}

const MS_REF = {
  "Westend":20,"Innenstadt":19,"Altstadt":18.5,"Sachsenhausen":17,"Nordend":17.2,
  "Bornheim":16.5,"Ostend":16,"Bockenheim":15.8,"Gallus":14.5,"Westhafen":15.5,
  "Rebstockviertel":14.5,"Niederrad":13.5,"Frankfurt":15.59,
  "Neustadt":14.8,"Bretzenheim":13.5,"Mainz":15.37,
};
function ampel(l) {
  if (!l.kaltmiete||!l.groesse) return {...l,ampel:null,preisProQm:null};
  const ppm = l.kaltmiete/l.groesse;
  const ref = (() => {
    const s=[l.stadtteil,l.stadt].filter(Boolean).join(" ").toLowerCase();
    for(const[k,v]of Object.entries(MS_REF)) if(s.includes(k.toLowerCase())) return v;
    return s.includes("mainz")?15.37:15.59;
  })();
  const d=((ppm-ref)/ref)*100;
  const label=d<=0?"Günstig":d<=10?"Marktüblich":d<=20?"Leicht erhöht":"Überteuert";
  return {...l,preisProQm:+ppm.toFixed(2),mietspiegelRef:ref,preisAbweichungPct:+d.toFixed(1),ampel:label};
}

// ── Main ───────────────────────────────────────────────────────────────────
const SCRAPERS = [
  scrapeBallwanz, scrapeVonovia, scrapeVonPoll, scrapeEngelVoelkers,
  scrapeNHW, scrapeOhneMakler, scrapeMolitor, scrapeWohnbauMainz,
];

async function main() {
  const t0 = Date.now();
  const browserLib = stealthChromium || chromium;
  const browser = await browserLib.launch({
    headless: CONFIG.headless,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage",
           "--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: {width:1440,height:900},
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    extraHTTPHeaders: {"Accept-Language":"de-DE,de;q=0.9"},
  });

  // Hide automation fingerprint
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator,"webdriver",{get:()=>undefined});
    window.chrome = {runtime:{}};
  });

  const all = [], errors = [];
  for (const fn of SCRAPERS) {
    const name = fn.name.replace("scrape","");
    const page = await ctx.newPage();
    page.setDefaultTimeout(CONFIG.timeout);
    console.log(`\n── ${name} ──`);
    try {
      const raw = await fn(page);
      const filtered = raw.filter(matches).map(ampel).map((l,i)=>({
        ...l, _id:`${name.slice(0,4).toLowerCase()}-${i}`
      }));
      console.log(`   Roh: ${raw.length}  |  Nach Filter: ${filtered.length}`);
      all.push(...filtered);
    } catch(e) {
      console.error(`   FEHLER: ${e.message}`);
      errors.push({scraper:name, error:e.message});
    } finally { await page.close(); }
  }

  await browser.close();

  // Deduplizieren
  const seen = new Set();
  const deduped = all.filter(l => {
    const key = l.url||`${l.quelle}-${l.groesse}-${l.kaltmiete}`;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b)=>(a.gesamtpreis||9999)-(b.gesamtpreis||9999));

  if(!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir,{recursive:true});
  const result = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now()-t0,
    totalFound: deduped.length,
    criteria: {minRooms:CONFIG.minRooms,maxRooms:CONFIG.maxRooms,minSize:CONFIG.minSize,maxPrice:CONFIG.maxPrice},
    errors,
    listings: deduped,
  };
  const date = result.timestamp.slice(0,10);
  fs.writeFileSync(`${CONFIG.outputDir}/listings_${date}.json`, JSON.stringify(result,null,2));
  fs.writeFileSync(`${CONFIG.outputDir}/listings_latest.json`, JSON.stringify(result,null,2));

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✓ Fertig: ${deduped.length} Angebote | ${((Date.now()-t0)/1000).toFixed(1)}s`);
  if(errors.length) console.log(`  ${errors.length} Scraper-Fehler`);
}

main().catch(e=>{ console.error("Fatal:",e); process.exit(1); });
