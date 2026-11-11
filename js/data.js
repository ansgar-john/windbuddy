import { fetchWithETag } from "./helper.js";

export async function loadData(station) {
    const code = station.toLowerCase();
    // Cache-Key pro Station, damit die ETags/Inhalte verschiedener Stationen
    // sich nicht überschreiben.
    const stationFile = `ogd-smn_${code}_t_now.csv`;

    const FILES = {
        [stationFile]: `https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/${code}/${stationFile}`,
        "VQHA80.csv": "https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv"
    };

    const raw1 = await fetchWithETag(stationFile, FILES[stationFile]);
    const raw2 = await fetchWithETag("VQHA80.csv", FILES["VQHA80.csv"]);

    const data1 = parseCSV(raw1, stationFile, station);
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
    const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(ts);
    if (!m) return new Date(NaN);
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
}

// parse e.g. "07.08.2026 04:50"
function parseEuropeanDateTime(ts) {
    const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(ts);
    if (!m) return new Date(NaN);
    return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]));
}

function prepareData(data1, data2) {
    const all = data1.concat(data2);
    const combined = all.filter(d => !isNaN(d.timestamp));
    const dropped = all.length - combined.length;

    // Kein einziger gültiger Zeitpunkt → Systemfehler (z. B. geändertes
    // Datenformat) → Fehler anwerfen, damit die App ihn anzeigt.
    if (combined.length === 0) {
        throw new Error("Keine gültigen Messdaten erhalten – unerwartetes Datenformat?");
    }
    if (dropped > 0) {
        console.warn(`Windbuddy: ${dropped} Zeile(n) mit ungültigem Zeitstempel verworfen.`);
    }

    combined.sort((a, b) => a.timestamp - b.timestamp);
    return combined;
}
