import { fetchWithETag, parseCSV, toNumber } from "./helper.js";

const BASE_URL = "https://data.geo.admin.ch";
const VQHA80_FILE = "VQHA80.csv";

export async function loadData(station) {
    const code = station.toLowerCase();
    // Cache-Key pro Station, damit die ETags/Inhalte verschiedener Stationen
    // sich nicht überschreiben.
    const stationFile = `ogd-smn_${code}_t_now.csv`;

    // Beide Dateien sind unabhängig → parallel laden.
    const [rawStation, rawVq] = await Promise.all([
        fetchWithETag(stationFile, `${BASE_URL}/ch.meteoschweiz.ogd-smn/${code}/${stationFile}`),
        fetchWithETag(VQHA80_FILE, `${BASE_URL}/ch.meteoschweiz.messwerte-aktuell/${VQHA80_FILE}`)
    ]);

    const data = parseStationFile(rawStation).concat(parseVqha80(rawVq, station));
    return prepareData(data);
}

// Parst die Stationsdatei (ogd-smn_<station>_t_now.csv).
function parseStationFile(text) {
    return parseCSV(text).map(d => ({
        timestamp: parseEuropeanDateTime(d["reference_timestamp"]),
        ...measurements(d)
    }));
}

// Parst die VQHA80-Datei und behält nur die Zeilen der gewünschten Station.
function parseVqha80(text, station) {
    return parseCSV(text)
        .filter(d => d["Station/Location"].toUpperCase() === station)
        .map(d => ({
            timestamp: parseDateYYYYMMDDHHmm(d["Date"]),
            ...measurements(d)
        }));
}

// Die drei Messwerte, die beide Dateien gemeinsam haben.
function measurements(d) {
    return {
        windavg10m: toNumber(d["fu3010z0"]),
        windmax1s: toNumber(d["fu3010z1"]),
        windrichtung: toNumber(d["dkl010z0"])
    };
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

function prepareData(data) {
    const combined = data.filter(d => !isNaN(d.timestamp));
    const dropped = data.length - combined.length;

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
