# Windvisualisierung (Browser only)

Diese App zeigt aktuelle Winddaten aus Steckborn (CH) als interaktive Plotly-Grafik.

## Features
- Holt Live-Daten von `data.geo.admin.ch`
- Verwendet ETag + localStorage für Caching
- Visualisiert Windgeschwindigkeit + Beaufortskala
- Komplett im Browser – kein Server notwendig

## Nutzung
1. Als statische Webseite hosten (z. B. GitHub Pages, Netlify)
2. Öffne `index.html` im Browser

## Datenquellen
- [ogd-smn_stk_t_now.csv](https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/stk/ogd-smn_stk_t_now.csv)
- [VQHA80.csv](https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv)
