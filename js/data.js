import { fetchWithETag } from "./helper.js";

export async function loadData(station) {

    const FILES = {
        "ogd-smn_STATION_t_now.csv": `https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/${station.toLowerCase()}/ogd-smn_${station.toLowerCase()}_t_now.csv`,
        "VQHA80.csv": "https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv",
        "stations.csv": "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/ogd-smn_meta_stations.csv"
    };

    const raw1 = await fetchWithETag("ogd-smn_STATION_t_now.csv", FILES["ogd-smn_STATION_t_now.csv"]);
    const raw2 = await fetchWithETag("VQHA80.csv", FILES["VQHA80.csv"]);

    const data1 = parseCSV(raw1, "ogd-smn_STATION_t_now.csv", station);
    const data2 = parseCSV(raw2, "VQHA80.csv", station);

    const combined = prepareData(data1, data2);
    return combined;
}

function parseCSV(text, filename, station) {
    const rows = text.split("\n").filter(r => r.trim().length);
    const headers = rows[0].split(";");
    const data = rows.slice(1).map(row => {
        const cols = row.split(";");
        const obj = {};
        headers.forEach((h, i) => obj[h] = cols[i]);
        return obj;
    });

    return data.map(d => {
        let ts = filename === "VQHA80.csv" ? parseDateYYYYMMDDHHmm(d["Date"]) : parseEuropeanDateTime(d["reference_timestamp"]);
        if (filename === "VQHA80.csv" && d["Station/Location"].toUpperCase() !== station) return null;
        return {
            timestamp: ts,
            windavg10m: parseFloat(d["fu3010z0"]) || null,
            windmax1s: parseFloat(d["fu3010z1"]) || null,
            windrichtung: parseFloat(d["dkl010z0"]) || null
        };
    }).filter(x => x);
}

// parse e.g. "202608071310"
function parseDateYYYYMMDDHHmm(ts) {
    return new Date(
        Date.UTC(
            parseInt(ts.substring(0, 4)),
            parseInt(ts.substring(4, 6)) - 1,
            parseInt(ts.substring(6, 8)),
            parseInt(ts.substring(8, 10)),
            parseInt(ts.substring(10, 12))
        )
    );
}

// parse e.g. "07.08.2026 04:50"
function parseEuropeanDateTime(ts) {
    const [date, time] = ts.split(" ");
    const [day, month, year] = date.split(".");
    const [hour, minute] = time.split(":");

    return new Date(Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute
    ));
}

function prepareData(data1, data2) {
    const combined = data1.concat(data2).filter(d => !isNaN(d.timestamp));
    combined.sort((a, b) => a.timestamp - b.timestamp);
    return combined;
}
