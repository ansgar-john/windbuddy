import { fetchWithETag, parseCSV } from "./helper.js";

// Lädt die Stationsliste und füllt das Auswahlfeld (sortiert nach Name).
export async function loadStations(defaultStation) {
    const raw = await fetchWithETag(
        "stations.csv",
        "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/ogd-smn_meta_stations.csv",
        "windows-1252"
    );

    const stations = parseStations(raw);
    fillStationSelect(stations, defaultStation);
}

function parseStations(text) {
    return parseCSV(text)
        .map(d => ({
            abbr: d["station_abbr"],
            name: d["station_name"] || null,
            canton: d["station_canton"] || null
        }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function fillStationSelect(stations, defaultStation) {
    const select = document.getElementById("stationSelect");

    for (const { abbr, name, canton } of stations) {
        const option = document.createElement("option");
        option.value = abbr;
        option.textContent = [name, canton, `(${abbr})`].filter(Boolean).join(" ");
        select.appendChild(option);
    }

    select.value = defaultStation;
}
