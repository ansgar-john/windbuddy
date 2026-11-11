import { loadStations } from "./stations.js";
import { loadData } from "./data.js";
import { createPlot } from "./plot.js";

const DEFAULT_STATION = "STK";

const statusEl = document.getElementById("latest");
const retryEl = document.getElementById("retryBtn");
const stationSelect = document.getElementById("stationSelect");

let currentStation = DEFAULT_STATION;

// Zentrale Statusaktualisierung: Text, Fehler-Style und Retry-Button
// gehören zusammen. (HTML-String, z. B. mit <strong>; #latest ist allein
// hier in app.js – keine andere Datei darf in das Element schreiben.)
function setStatus(html, isError = false) {
    statusEl.innerHTML = html;
    statusEl.classList.toggle("error", isError);
    retryEl.hidden = !isError;
}

// Zeigt den letzten gültigen Messwert (Zürich-Ortszeit) als Status an.
function showLatest(data) {
    const latest = [...data].reverse().find(d => d.windavg10m !== null);
    if (!latest) return;

    const timeStr = new Intl.DateTimeFormat("de-CH", {
        timeZone: "Europe/Zurich",
        hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
    }).format(latest.timestamp);

    setStatus(`Letzter Messwert: <strong>${latest.windavg10m.toFixed(1)} km/h</strong> um <strong>${timeStr}</strong>`);
}

// Lädt die Messdaten für die übergebene Station und rendert die Grafik.
// Fehler (Netz, CORS, HTTP-Status, …) werden abgefangen und angezeigt.
async function refresh(station) {
    currentStation = station;
    setStatus("Lade Daten …");
    try {
        const data = await loadData(station);
        createPlot(data);
        showLatest(data);
    } catch (error) {
        console.error(error);
        setStatus("Daten konnten nicht geladen werden. Bitte versuche es erneut.", true);
    }
}

// Das Platzhalter-Option hat einen leeren Wert → ignorieren, damit keine
// nicht vorhandene Station geladen wird.
stationSelect.addEventListener("change", (event) => {
    if (event.target.value) refresh(event.target.value);
});

retryEl.addEventListener("click", () => refresh(currentStation));

// Initial: Stationsliste (best-effort) und Messdaten parallel laden.
const params = new URLSearchParams(window.location.search);
const station = params.get("station") || DEFAULT_STATION;

await Promise.all([
    loadStations(station).catch(error => console.error("Stationen konnten nicht geladen werden:", error)),
    refresh(station)
]);
