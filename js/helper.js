export class FetchError extends Error {
    constructor(filename, status) {
        super(`Laden von "${filename}" fehlgeschlagen (HTTP ${status})`);
        this.name = "FetchError";
    }
}

// Lädt eine Datei mit ETag-basiertem Caching (If-None-Match / 304).
// - 200: Body wird dekodiert und ETag + Inhalt in localStorage gespeichert.
// - 304: Der zuletzt gespeicherte Inhalt wird wiederverwendet (kein Download).
// - sonst: wirft FetchError (wird von der App abgefangen).
//
// Hinweis: Die Datei kann in einer anderen Encoding vorliegen (z. B.
// windows-1252 für die Stationsliste), daher wird über arrayBuffer +
// TextDecoder dekodiert statt response.text() (immer UTF-8).
export async function fetchWithETag(filename, url, encoding = "utf-8") {
    const storedETag = localStorage.getItem(filename + "_etag");
    const headers = storedETag ? { "If-None-Match": storedETag } : {};

    const response = await fetch(url, { headers });

    if (response.status === 200) {
        return await storeAndReturn(response, filename, encoding);
    }

    if (response.status === 304) {
        const cached = localStorage.getItem(filename + "_data");
        if (cached !== null) return cached;
        // ETag gespeichert, aber kein Inhalt (z. B. Daten wurden gelöscht) → einmal neu laden
        return await fetchPlain(filename, url, encoding);
    }

    throw new FetchError(filename, response.status);
}

async function fetchPlain(filename, url, encoding) {
    const response = await fetch(url);
    if (response.status !== 200) {
        throw new FetchError(filename, response.status);
    }
    return await storeAndReturn(response, filename, encoding);
}

async function storeAndReturn(response, filename, encoding) {
    const etag = response.headers.get("ETag");
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder(encoding).decode(buffer);

    if (etag) localStorage.setItem(filename + "_etag", etag);
    localStorage.setItem(filename + "_data", text);
    return text;
}

// Liefert null statt NaN, behält aber gültige Werte wie 0.
export function toNumber(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
}

// Parst eine semikolon-getrennte CSV in ein Array von Objekten;
// die erste Zeile liefert die Feldnamen.
export function parseCSV(text) {
    const rows = text.split("\n").filter(r => r.trim().length);
    const headers = rows[0].split(";");

    return rows.slice(1).map(row => {
        const cols = row.split(";");
        const obj = {};
        headers.forEach((h, i) => obj[h] = cols[i]);
        return obj;
    });
}
