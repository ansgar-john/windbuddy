import { loadStations } from "./stations.js";
import { loadData } from "./data.js";
import { createPlot } from "./plot.js";


async function main() {
    const params = new URLSearchParams(window.location.search);
    const station = params.get("station") || "STK";

    await loadStations(station);

    document.getElementById("stationSelect").addEventListener("change", async (event) => {
        const station = event.target.value;
        const combined = await loadData(station);
        createPlot(combined);
    });

    const combined = await loadData(station);
    createPlot(combined);
}

main();