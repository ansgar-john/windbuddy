import { loadStations } from "./stations.js";
import { loadData } from "./data.js";
import { createPlot } from "./plot.js";

let currentStation = "STK";

const statusEl = () => document.getElementById("latest");
const retryEl = () => document.getElementById("retryBtn");

function showLoading() {
    statusEl().classList.remove("error");
    statusEl().textContent = "Lade Daten …";
    retryEl().hidden = true;
}

function showError(error) {
    console.error(error);
    statusEl().classList.add("error");
    statusEl().textContent = "Daten konnten nicht geladen werden. Bitte versuche es erneut.";
    retryEl().hidden = false;
}

// Lädt die Messdaten für die übergebene Station und rendert die Grafik.
// Fehler (Netz, CORS, HTTP-Status, …) werden abgefangen und angezeigt.
async function refresh(station) {
    currentStation = station;
    showLoading();
    try {
        const combined = await loadData(station);
        createPlot(combined);
    } catch (error) {
        showError(error);
    }
}

async function main() {
    const params = new URLSearchParams(window.location.search);
    const station = params.get("station") || "STK";

    // Stationsliste: Best-Effort. Scheitert sie, wird trotzdem mit den
    // Messdaten der gewählten Station weitergemacht.
    try {
        await loadStations(station);
    } catch (error) {
        console.error("Stationen konnten nicht geladen werden:", error);
    }

    document.getElementById("stationSelect").addEventListener("change", (event) => {
        if (event.target.value) refresh(event.target.value);
    });

    retryEl().addEventListener("click", () => refresh(currentStation));

    await refresh(station);
}

main();
