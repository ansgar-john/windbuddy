// Wind-Darstellungsdomain: Beaufortskala und Zürich-Zeitanzeige.
// Reine Funktionen ohne DOM-/Plotly-Abhängigkeit – daher auch in Node testbar.

// Einheitenumrechnung: 1 Knoten = 1.852 km/h.
const KNOTS_TO_KMH = 1.852;
// 10 Knoten in km/h – Referenzlinie in der Grafik.
export const TEN_KNOTS_KMH = 10 * KNOTS_TO_KMH; // ≈ 18.52 km/h

// Beaufortskala: obere km/h-Grenze jeder Stufe (Array-Index = Beaufort-Zahl).
// Die letzte Grenze ist Infinity (Stufe 12 = alles ab 118 km/h).
export const BEAUFORT_LIMITS = [0, 1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118, Infinity];

// Eine Hintergrundfarbe pro Beaufort-Stufe (Index = Beaufort-Zahl).
export const BEAUFORT_COLORS = [
    "#e0e0e0", "#e0e0e0", "#e0e0e0", "#2196f3", "#4caf50", "#ffeb3b",
    "#ff9800", "#ff5722", "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5"
];

// Beaufort-Stufe (0–12) für eine Geschwindigkeit in km/h; null bei fehlendem Wert.
export function beaufortIndex(kmh) {
    if (kmh == null || isNaN(kmh)) return null;
    for (let i = 0; i < BEAUFORT_LIMITS.length - 1; i++) {
        if (kmh < BEAUFORT_LIMITS[i + 1]) return i;
    }
    return null;
}

// Einmalig angelegter Formatter, um Zürichs Offset zu jedem Zeitpunkt effizient
// zu bestimmen (wird pro Datenpunkt wiederverwendet).
const zurichFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
});

// Wie weit Zürich zum Zeitpunkt `instant` von UTC abweicht (in ms,
// positiv = östlich von UTC).
export function zurichOffsetMs(instant) {
    const p = {};
    for (const part of zurichFormatter.formatToParts(instant)) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
    return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

// Verschiebt den UTC-Zeitpunkt `instant` so, dass ein Renderer, der in der
// Geräte-Ortszeit mit Offset `deviceOffsetNowMs` (in ms) rendert,
// Zürich-Ortszeit anzeigt. Der Shift wird PRO PUNKT berechnet, weil sich
// Zürichs Offset bei der Sommer-/Winterzeit unterscheiden kann vom aktuellen
// (ein fester Shift für „now" würde ältere Punkte eine Stunde verschieben).
export function toZurichDisplayTime(instant, deviceOffsetNowMs) {
    return new Date(instant.getTime() + zurichOffsetMs(instant) - deviceOffsetNowMs);
}
