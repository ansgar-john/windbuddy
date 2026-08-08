import { fetchWithETag } from "./helper.js";

export async function loadStations(defaultStation) {
    const raw = await fetchWithETag(
        "stations.csv",
        "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/ogd-smn_meta_stations.csv",
        "windows-1252"
    );
    const stations = parseStations(raw);
    const select = document.getElementById("stationSelect");

    stations
        .sort((a, b) => a.station_name.localeCompare(b.station_name))
        .forEach(station => {
            const option = document.createElement("option");

            option.value = station.station_abbr;
            option.textContent = `${station.station_name} ${station.station_canton} (${station.station_abbr})`;

            if (station.station_abbr === defaultStation) {
                option.selected = true;
            }

            select.appendChild(option);
        });
}

function parseStations(text) {
    const rows = text.split("\n").filter(r => r.trim().length);
    const headers = rows[0].split(";");

    const data = rows.slice(1).map(row => {
        const cols = row.split(";");
        const obj = {};

        headers.forEach((h, i) => {
            obj[h] = cols[i];
        });

        return obj;
    });

    return data.map(d => ({
        station_abbr: d["station_abbr"],
        station_name: d["station_name"] || null,
        station_canton: d["station_canton"] || null
    }));
}