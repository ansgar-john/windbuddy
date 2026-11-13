# Windvisualisierung (Browser only)

Diese App zeigt aktuelle Winddaten aus Steckborn (CH) als interaktive Plotly-Grafik.

## Features
- Holt Live-Daten von `data.geo.admin.ch`
- ETag-Caching (`If-None-Match`/`304`) + localStorage (wiederverwendet bei 304, Fallback bei Fehlern)
- Visualisiert Windgeschwindigkeit + Beaufortskala
- Komplett im Browser – kein Server notwendig

## Nutzung
1. Als statische Webseite hosten (z. B. GitHub Pages, Netlify)
2. Öffne `index.html` im Browser

## Lokaler Testserver
Für die Entwicklung die Projektmappe mit einem einfachen statischen Server
ausliefern:

```
python3 -m http.server 8720
```

Danach `http://localhost:8720` im Browser öffnen (in VS Code:
`Ctrl+Shift+P` → „Simple Browser: Show").

Optional: Station per URL-Parameter setzen, z. B.
`http://localhost:8720/?station=TAE` (Aadorf / Tänikon).

## Tests
Smoke-Test für Datenpfad, Stationsliste und ETag-Caching (läuft die echten
Module in Node, benötigt Internetzugang zu `data.geo.admin.ch`):

```
npm test        # oder: node test/smoke.mjs
```

## Produktion
https://ansgar-john.github.io/windbuddy/

## Datenquellen
- [ogd-smn_stk_t_now.csv](https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/stk/ogd-smn_stk_t_now.csv)
- [VQHA80.csv](https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv)


## Architektur
Vier Schichten als ES-Module in `js/`; Abhängigkeiten zeigen nur nach unten:

    app.js      Orchestrierung & UI: Start, Events, Status
                (#latest, #retryBtn)
    ├── stations.js   Domain - Stationsliste: fetch + parse + Select befüllen
    ├── data.js       Domain - Messdaten: fetch + parse + Validierung
    ├── plot.js       Rendering: nur die Plotly-Grafik (#plot)
    └── wind.js       Domain - Wind-Darstellung: Beaufortskala, Zürich-Zeit
    helper.js   Generische Utilities: fetch + ETag-Cache, parseCSV, toNumber

Regeln:
- `stations.js` und `data.js` importieren nur von `helper.js` – keine
  Querverbindungen zwischen den beiden.
- Jeder DOM-Knoten hat genau einen Owner: `#stationSelect` → `stations.js`,
  `#plot` → `plot.js`, `#latest` + `#retryBtn` → `app.js`.
- Bewusste Ausnahme: `stations.js` arbeitet selbst am DOM (Select), damit der
  Smoke-Test die Logik in Node testen kann; `data.js` und `plot.js` sind
  DOM-frei.
- `wind.js` hat keine Abhängigkeiten (reine Funktionen, kein DOM/Plotly),
  damit der Smoke-Test die Beaufort-/Zürich-Zeit-Logik in Node prüfen kann –
  `plot.js` importiert sie nur.
