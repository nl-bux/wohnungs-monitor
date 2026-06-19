/**
 * Wohnungs-Scraper – Frankfurt & Mainz
 * ------------------------------------
 * Crawlt täglich die wichtigsten Immobilien-Websites und extrahiert
 * Mietwohnungen nach definierten Kriterien.
 *
 * Kriterien: 3–4 Zimmer · ≥ 80 m² · ≤ 2.400 € Gesamtmiete
 * Städte:    Frankfurt am Main · Mainz
 *
 * SETUP:
 *   npm install
 *   npm run install-browser
 *   npm run scrape
 *
 * OUTPUT: ./results/listings_YYYY-MM-DD.json
 *
 * FÜR TÄGLICHEN BETRIEB: Als GitHub Actions Workflow (→ .github/workflows/scrape.yml)
 * oder als Cron-Job einrichten.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// ── Konfiguration ──────────────────────────────────────────────────────────
const CONFIG = {
  minRooms: 3,
  maxRooms: 4,
  minSize: 80,     // m²
  maxPrice: 2400,  // € Gesamtmiete
  timeout: 30000,  // ms pro Seite
  outputDir: "./results",
  headless: true,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

// ── Scraper-Definitionen ───────────────────────────────────────────────────
// Jede Funktion bekommt eine Playwright-Page und gibt ein Array von Listings zurück.
// Schema: { quelle, url, titel, groesse, zimmer, kaltmiete, nebenkosten, heizkosten, gesamtpreis, stadtteil, stadt }

const SCRAPERS = [

  // ── 1. Ballwanz Immobilien ────────────────────────────────────────────────
  async function scrapeBallwanz(page) {
    const source = "Ballwanz Immobilien";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto("https://www.ballwanz.de/wohnen/mietangebote/", {
      waitUntil: "networkidle",
    });

    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll("a[href*='/objekt/']").forEach((a) => {
        const text = a.innerText || "";
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*)\s*EUR/);
        const zimmerMatch = text.match(/(\d[,.]?\d?)-?Zimmer/i);
        if (!qmMatch || !priceMatch) return;
        const groesse = parseFloat(qmMatch[1].replace(",", "."));
        const preis = parseFloat(priceMatch[1].replace(/\./g, ""));
        const zimmer = zimmerMatch
          ? parseFloat(zimmerMatch[1].replace(",", "."))
          : null;
        results.push({
          titel: text.split("\n")[0].trim().slice(0, 80),
          url: a.href,
          groesse,
          zimmer,
          kaltmiete: preis,
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: preis,
          stadtteil: extractStadtteil(a.href),
          stadt: "Frankfurt",
        });
      });
      function extractStadtteil(url) {
        const map = {
          rebstock: "Rebstockviertel",
          westhafen: "Westhafen",
          speicher: "Westhafen",
          bockenheim: "Bockenheim",
          altstadt: "Altstadt",
          sachsenhausen: "Sachsenhausen",
          nordend: "Nordend",
          westend: "Westend",
          bornheim: "Bornheim",
        };
        const u = url.toLowerCase();
        for (const [k, v] of Object.entries(map)) {
          if (u.includes(k)) return v;
        }
        return "Frankfurt";
      }
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },

  // ── 2. Vonovia Frankfurt ──────────────────────────────────────────────────
  async function scrapeVonovia(page) {
    const source = "Vonovia";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto("https://www.vonovia.de/zuhause-finden", {
      waitUntil: "networkidle",
      timeout: CONFIG.timeout,
    });

    // Suche konfigurieren
    try {
      // Stadtfeld setzen
      await page.fill('input[placeholder*="Stadt"], input[placeholder*="Ort"]', "Frankfurt am Main");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);

      // Zimmerfilter 3+ (falls verfügbar)
      const roomFilter = await page.$('[data-filter="rooms"], select[name*="room"]');
      if (roomFilter) await roomFilter.selectOption("3");
      await page.waitForTimeout(1500);
    } catch (_) {}

    await page.waitForTimeout(3000);

    const items = await page.evaluate(() => {
      const results = [];
      // Vonovia uses React, listings are in article/div elements
      const cards = document.querySelectorAll(
        '[class*="estate-card"], [class*="listing-item"], article[class*="offer"]'
      );
      cards.forEach((card) => {
        const text = card.innerText || "";
        const linkEl = card.querySelector("a[href]");
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*[,]\d{2})\s*€/) ||
          text.match(/(\d[\d\.]*)\s*€/);
        const zimmerMatch = text.match(/(\d[,.]?\d?)\s*Zimmer/i);
        if (!qmMatch || !priceMatch) return;
        results.push({
          titel: (card.querySelector("h2, h3, [class*='title']")?.innerText || "Vonovia Wohnung").slice(0, 80),
          url: linkEl ? "https://www.vonovia.de" + linkEl.getAttribute("href") : "https://www.vonovia.de/zuhause-finden",
          groesse: parseFloat(qmMatch[1].replace(",", ".")),
          zimmer: zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null,
          kaltmiete: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          stadtteil: null,
          stadt: "Frankfurt",
        });
      });
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },

  // ── 3. Von Poll Frankfurt ─────────────────────────────────────────────────
  async function scrapeVonPoll(page) {
    const source = "Von Poll Immobilien";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto(
      "https://www.von-poll.com/de/wohnung-mieten/frankfurt",
      { waitUntil: "networkidle", timeout: CONFIG.timeout }
    );
    await page.waitForTimeout(3000);

    // Cookie-Banner wegklicken wenn vorhanden
    try {
      await page.click('[id*="accept"], [class*="accept"], button:has-text("Akzeptieren")', { timeout: 3000 });
    } catch (_) {}
    await page.waitForTimeout(1500);

    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll(
        '[class*="estate-item"], [class*="property-item"], [class*="listing-card"]'
      ).forEach((card) => {
        const text = card.innerText || "";
        const linkEl = card.querySelector("a");
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*[,]\d{2})\s*€/) ||
          text.match(/(\d[\d\.]*)\s*€/);
        const zimmerMatch = text.match(/(\d[,.]?\d?)\s*Zi/i);
        if (!qmMatch || !priceMatch) return;
        results.push({
          titel: (card.querySelector("[class*='title'], h2, h3")?.innerText || "Von Poll Wohnung").slice(0, 80),
          url: linkEl ? linkEl.href : "https://www.von-poll.com/de/wohnung-mieten/frankfurt",
          groesse: parseFloat(qmMatch[1].replace(",", ".")),
          zimmer: zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null,
          kaltmiete: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          stadtteil: null,
          stadt: "Frankfurt",
        });
      });
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },

  // ── 4. Engel & Völkers Frankfurt ─────────────────────────────────────────
  async function scrapeEngelVoelkers(page) {
    const source = "Engel & Völkers";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto(
      "https://www.engelvoelkers.com/de/de/immobilien/res/mieten/wohnung/hessen/frankfurt-am-main",
      { waitUntil: "networkidle", timeout: CONFIG.timeout }
    );
    await page.waitForTimeout(3000);

    try {
      await page.click('[class*="consent"] button, [id*="accept"]', { timeout: 3000 });
    } catch (_) {}

    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll(
        '[class*="property-card"], [data-testid="property-card"], article[class*="property"]'
      ).forEach((card) => {
        const text = card.innerText || "";
        const linkEl = card.querySelector("a");
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*[,]\d{2})\s*€/) ||
          text.match(/(\d[\d\.]*)\s*€\s*(?:KM|Kaltmiete|\/M)/i);
        const zimmerMatch = text.match(/(\d[,.]?\d?)\s*(?:Zi|Zimmer)/i);
        if (!qmMatch || !priceMatch) return;
        results.push({
          titel: (card.querySelector("[class*='title'], h2, h3")?.innerText || "E&V Wohnung").slice(0, 80),
          url: linkEl ? linkEl.href : "https://www.engelvoelkers.com",
          groesse: parseFloat(qmMatch[1].replace(",", ".")),
          zimmer: zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null,
          kaltmiete: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          stadtteil: null,
          stadt: "Frankfurt",
        });
      });
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },

  // ── 5. Nassauische Heimstätte (NHW) Frankfurt ────────────────────────────
  async function scrapeNHW(page) {
    const source = "NHW Nassauische Heimstätte";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto(
      "https://www.nhw.de/wohnungsangebot?city=frankfurt&rooms_from=3&size_from=80",
      { waitUntil: "networkidle", timeout: CONFIG.timeout }
    );
    await page.waitForTimeout(3000);

    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll(
        '[class*="expose"], [class*="listing"], [class*="apartment-item"], article'
      ).forEach((card) => {
        const text = card.innerText || "";
        const linkEl = card.querySelector("a");
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*[,]\d{2})\s*€/) ||
          text.match(/(\d[\d\.]*)\s*€/);
        const zimmerMatch = text.match(/(\d[,.]?\d?)\s*Zimmer/i);
        if (!qmMatch || !priceMatch) return;
        const groesse = parseFloat(qmMatch[1].replace(",", "."));
        const preis = parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."));
        if (groesse < 80 || preis > 2400) return;
        results.push({
          titel: (card.querySelector("h2, h3, [class*='title']")?.innerText || "NHW Wohnung").slice(0, 80),
          url: linkEl ? linkEl.href : "https://www.nhw.de/wohnungsangebot",
          groesse,
          zimmer: zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null,
          kaltmiete: preis,
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: preis,
          stadtteil: "Bockenheim",
          stadt: "Frankfurt",
        });
      });
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },

  // ── 6. Molitor Immobilien Mainz ───────────────────────────────────────────
  async function scrapeMolitor(page) {
    const source = "J. Molitor Immobilien";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto(
      "https://www.molitor-immobilien.de/wohnen/wohnimmobilien-mieten/",
      { waitUntil: "networkidle", timeout: CONFIG.timeout }
    );
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll("article, [class*='property'], [class*='listing'], .expose").forEach((card) => {
        const text = card.innerText || "";
        const linkEl = card.querySelector("a");
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*[,]\d{2})\s*€/) ||
          text.match(/ab\s+(\d[\d\.]*)\s*€/i);
        const zimmerMatch = text.match(/(\d[,.]?\d?)-?(?:Zimmer|Zi\.)/i);
        if (!qmMatch) return;
        const groesse = parseFloat(qmMatch[1].replace(",", "."));
        const preis = priceMatch
          ? parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."))
          : null;
        results.push({
          titel: (card.querySelector("h2, h3, [class*='title']")?.innerText || "Molitor Wohnung").slice(0, 80),
          url: linkEl ? linkEl.href : "https://www.molitor-immobilien.de",
          groesse,
          zimmer: zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null,
          kaltmiete: preis,
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: preis,
          stadtteil: null,
          stadt: "Mainz",
        });
      });
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },

  // ── 7. ohne-makler.net Frankfurt + Mainz ─────────────────────────────────
  async function scrapeOhneMakler(page) {
    const source = "ohne-makler.net";
    const results = [];

    for (const [stadt, url] of [
      ["Frankfurt", "https://www.ohne-makler.net/immobilien/wohnung-mieten/hessen/frankfurt-main/"],
      ["Mainz",     "https://www.ohne-makler.net/immobilien/wohnung-mieten/rheinland-pfalz/mainz/"],
    ]) {
      console.log(`[${source}] Scraping ${stadt}…`);
      await page.goto(url, { waitUntil: "networkidle", timeout: CONFIG.timeout });
      await page.waitForTimeout(2000);

      // Scroll to load lazy-loaded listings
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      const items = await page.evaluate((stadtName) => {
        const res = [];
        document.querySelectorAll("a[href*='/immobilie/']").forEach((a) => {
          const card = a.closest("div, article, li") || a;
          const text = card.innerText || a.innerText || "";
          const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
          const priceMatch = text.match(/(\d[\d\.]*)\s*€/);
          const zimmerMatch = text.match(/(\d[,.]?\d?)\s*(?:Zi|Zimmer)/i);
          if (!qmMatch || !priceMatch) return;
          const groesse = parseFloat(qmMatch[1].replace(",", "."));
          const preis = parseFloat(priceMatch[1].replace(/\./g, ""));
          // Only qualified apartments
          if (groesse < 80 || preis > 2400) return;
          const zimmer = zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null;
          if (zimmer && (zimmer < 3 || zimmer > 4)) return;
          res.push({
            titel: text.split("\n").filter(Boolean)[0]?.trim().slice(0, 80) || "Wohnung",
            url: a.href,
            groesse,
            zimmer,
            kaltmiete: preis,
            nebenkosten: null,
            heizkosten: null,
            gesamtpreis: preis,
            stadtteil: extractStadtteil(text),
            stadt: stadtName,
          });
        });
        function extractStadtteil(text) {
          const match = text.match(/\(([A-ZÄÖÜ][a-zäöü\-]+)\)/);
          return match ? match[1] : null;
        }
        // Deduplicate by URL
        return [...new Map(res.map(r => [r.url, r])).values()];
      }, stadt);

      results.push(...items.map((i) => ({ ...i, quelle: source })));
    }
    return results;
  },

  // ── 8. Wohnbau Mainz ──────────────────────────────────────────────────────
  async function scrapeWohnbauMainz(page) {
    const source = "Wohnbau Mainz";
    console.log(`[${source}] Starte Scraping…`);
    await page.goto("https://www.wohnbau-mainz.de/wohnungsangebote", {
      waitUntil: "networkidle",
      timeout: CONFIG.timeout,
    });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll("[class*='expose'], [class*='listing'], article, .wohnung").forEach((card) => {
        const text = card.innerText || "";
        const linkEl = card.querySelector("a");
        const qmMatch = text.match(/(\d+[\.,]?\d*)\s*m²/);
        const priceMatch = text.match(/(\d[\d\.]*[,]\d{2})\s*€/) ||
          text.match(/(\d[\d\.]*)\s*€/);
        const zimmerMatch = text.match(/(\d[,.]?\d?)\s*Zimmer/i);
        if (!qmMatch || !priceMatch) return;
        results.push({
          titel: (card.querySelector("h2, h3")?.innerText || "Wohnbau Mainz").slice(0, 80),
          url: linkEl ? linkEl.href : "https://www.wohnbau-mainz.de",
          groesse: parseFloat(qmMatch[1].replace(",", ".")),
          zimmer: zimmerMatch ? parseFloat(zimmerMatch[1].replace(",", ".")) : null,
          kaltmiete: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          nebenkosten: null,
          heizkosten: null,
          gesamtpreis: parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")),
          stadtteil: null,
          stadt: "Mainz",
        });
      });
      return results;
    });
    return items.map((i) => ({ ...i, quelle: source }));
  },
];

// ── Filter ─────────────────────────────────────────────────────────────────
function matchesCriteria(listing) {
  const price = listing.gesamtpreis || listing.kaltmiete;
  return (
    listing.groesse >= CONFIG.minSize &&
    (price == null || price <= CONFIG.maxPrice) &&
    (listing.zimmer == null ||
      (listing.zimmer >= CONFIG.minRooms && listing.zimmer <= CONFIG.maxRooms))
  );
}

// ── Mietspiegel-Referenzwerte ──────────────────────────────────────────────
const MS_REF = {
  "Westend": 20, "Innenstadt": 19, "Altstadt": 18.5, "Sachsenhausen": 17,
  "Nordend": 17.2, "Bornheim": 16.5, "Ostend": 16, "Bockenheim": 15.8,
  "Gallus": 14.5, "Westhafen": 15.5, "Rebstockviertel": 14.5,
  "Niederrad": 13.5, "Griesheim": 13, "Riedberg": 14, "Frankfurt": 15.59,
  "Neustadt": 14.8, "Bretzenheim": 13.5, "Weisenau": 13.2, "Mainz": 15.37,
};
function getMietspiegelRef(stadtteil, stadt) {
  const s = [stadtteil, stadt].filter(Boolean).join(" ");
  for (const [k, v] of Object.entries(MS_REF)) {
    if (s.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return s.toLowerCase().includes("mainz") ? 15.37 : 15.59;
}
function addAmpel(listing) {
  if (!listing.kaltmiete || !listing.groesse) return { ...listing, ampel: null, preisProQm: null };
  const ppm = listing.kaltmiete / listing.groesse;
  const ref = getMietspiegelRef(listing.stadtteil, listing.stadt);
  const diff = ((ppm - ref) / ref) * 100;
  const ampel = diff <= 0 ? "🟢 Günstig" : diff <= 10 ? "🟡 Marktüblich" : diff <= 20 ? "🟠 Leicht erhöht" : "🔴 Überteuert";
  return { ...listing, preisProQm: +ppm.toFixed(2), mietspiegelRef: ref, preisAbweichungPct: +diff.toFixed(1), ampel };
}

// ── Hauptfunktion ──────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("Wohnungs-Scraper startet");
  console.log(`Kriterien: ${CONFIG.minRooms}–${CONFIG.maxRooms} Zi | ≥${CONFIG.minSize}m² | ≤${CONFIG.maxPrice}€`);
  console.log("=".repeat(60));

  // Output-Ordner anlegen
  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
    viewport: { width: 1440, height: 900 },
    locale: "de-DE",
    extraHTTPHeaders: {
      "Accept-Language": "de-DE,de;q=0.9",
    },
  });

  const allListings = [];
  const errors = [];

  for (const scraper of SCRAPERS) {
    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    try {
      const raw = await scraper(page);
      const filtered = raw
        .filter(matchesCriteria)
        .map(addAmpel)
        .map((l, i) => ({ ...l, _id: `${l.quelle?.slice(0, 4).replace(/\s/g, "")}-${i}` }));

      console.log(`  → ${raw.length} roh, ${filtered.length} nach Filter`);
      allListings.push(...filtered);
    } catch (err) {
      const name = scraper.name.replace("scrape", "");
      console.error(`  ✗ Fehler bei ${name}: ${err.message}`);
      errors.push({ scraper: name, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Deduplizieren nach URL
  const seen = new Set();
  const deduped = allListings.filter((l) => {
    if (!l.url || seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });

  // Sortieren nach Gesamtpreis
  deduped.sort((a, b) => (a.gesamtpreis || 9999) - (b.gesamtpreis || 9999));

  // Ergebnis-Objekt
  const result = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    totalFound: deduped.length,
    criteria: { minRooms: CONFIG.minRooms, maxRooms: CONFIG.maxRooms, minSize: CONFIG.minSize, maxPrice: CONFIG.maxPrice },
    errors,
    listings: deduped,
  };

  // Datei speichern
  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(CONFIG.outputDir, `listings_${date}.json`);
  const latestPath = path.join(CONFIG.outputDir, "listings_latest.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  fs.writeFileSync(latestPath, JSON.stringify(result, null, 2), "utf8");

  console.log("=".repeat(60));
  console.log(`✓ Fertig! ${deduped.length} Angebote gefunden`);
  console.log(`  Dauer: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`  Gespeichert: ${outPath}`);
  if (errors.length) console.log(`  Fehler bei ${errors.length} Scrapern`);
  console.log("=".repeat(60));

  return result;
}

main().catch((err) => {
  console.error("Fataler Fehler:", err);
  process.exit(1);
});
