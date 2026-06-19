# Wohnungs-Scraper Frankfurt & Mainz

Automatisierter Playwright-Scraper für Mietwohnungsangebote in Frankfurt am Main und Mainz.

**Kriterien:** 3–4 Zimmer · ≥ 80 m² · ≤ 2.400 € Gesamtmiete

## Gescrapte Websites

| Anbieter | Stadt | Typ |
|---|---|---|
| Ballwanz Immobilien | Frankfurt | Makler |
| Vonovia | Frankfurt | Wohnungsgesellschaft |
| Von Poll Immobilien | Frankfurt | Makler |
| Engel & Völkers | Frankfurt | Makler |
| NHW Nassauische Heimstätte | Frankfurt | Wohnungsgesellschaft |
| J. Molitor Immobilien | Mainz | Entwickler |
| ohne-makler.net | Frankfurt + Mainz | Privat-Plattform |
| Wohnbau Mainz | Mainz | Wohnungsgesellschaft |

## Lokale Ausführung

```bash
# 1. Voraussetzungen: Node.js 18+ und npm

# 2. Abhängigkeiten installieren
npm install

# 3. Chromium-Browser herunterladen (einmalig)
npm run install-browser

# 4. Scraper ausführen
npm run scrape
```

Ergebnisse werden gespeichert unter:
- `./results/listings_YYYY-MM-DD.json` (datiert)
- `./results/listings_latest.json` (immer aktuellste Version)

## Tägliche Ausführung via GitHub Actions

```
1. Repository auf GitHub anlegen
2. Datei scrape.yml in .github/workflows/ kopieren
3. Scraper läuft täglich automatisch um 07:00 Uhr
4. Ergebnisse werden als Artefakt gespeichert
```

## Ergebnis-Format (JSON)

```json
{
  "timestamp": "2026-06-17T06:00:00.000Z",
  "totalFound": 25,
  "listings": [
    {
      "quelle": "Ballwanz Immobilien",
      "titel": "3-Zi. Westhafen mit Balkon",
      "url": "https://www.ballwanz.de/objekt/...",
      "groesse": 101,
      "zimmer": 3,
      "kaltmiete": 1950,
      "nebenkosten": null,
      "heizkosten": null,
      "gesamtpreis": 1950,
      "stadtteil": "Westhafen",
      "stadt": "Frankfurt",
      "preisProQm": 19.31,
      "mietspiegelRef": 15.5,
      "preisAbweichungPct": 24.6,
      "ampel": "🔴 Überteuert"
    }
  ]
}
```

## Integration mit dem Wohnungs-Monitor (React App)

Die `listings_latest.json` kann direkt vom React-Artifact geladen werden,  
wenn sie auf einem öffentlichen Server oder GitHub Pages liegt:

```js
// Im React-Artifact (wohnungs-monitor.jsx):
const response = await fetch("https://dein-repo.github.io/listings_latest.json");
const data = await response.json();
setListings(data.listings);
```

## Warum Playwright?

| Methode | Problem |
|---|---|
| `fetch()` (HTTP) | Alle Sites → 403 (Bot-Erkennung) |
| Claude API + web_search | Findet keine strukturierten Listings |
| **Playwright** ✅ | Echter Browser → umgeht Bot-Schutz, rendert JS |

Vonovia, Von Poll und Engel & Völkers sind React/Next.js-SPAs – ihre Listings  
existieren im DOM erst nach JavaScript-Ausführung. Playwright wartet auf das  
vollständige Rendering bevor er Daten extrahiert.

## Hinweis: Anti-Scraping-Maßnahmen

Einige Sites (ohne-makler.net) haben Robots.txt-Einträge gegen Bots.  
Der Scraper verwendet browser-ähnliche Headers und Wartezeiten um  
möglichst human-like zu wirken. Bei wiederholten Problemen:
- Wartezeiten erhöhen (`CONFIG.timeout`)
- IP-Rotation (z.B. via Proxy) einsetzen
- Scraping-Frequenz reduzieren (1×/Tag ist fair use)
