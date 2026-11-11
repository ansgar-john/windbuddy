// Smoke-Test für windbuddy: Führt die echten Module (wind.js, stations.js,
// data.js, helper.js) in Node aus – mit echtem Netzwerkzugriff auf
// MeteoSchweiz (nur wind.js wird offline getestet).
// localStorage und das DOM (nur für stations.js) werden minimal ersetzt.
//
// Aufruf:  node test/smoke.mjs   (oder: npm test)
// Hinweis: Erfordert Internetzugang zu data.geo.admin.ch (außer wind.js).

const STATION = "STK";
const base = new URL("../js/", import.meta.url);

const { beaufortIndex, zurichOffsetMs, toZurichDisplayTime, BEAUFORT_LIMITS, BEAUFORT_COLORS, TEN_KNOTS_KMH } = await import(base + "wind.js");
const { loadStations } = await import(base + "stations.js");
const { loadData } = await import(base + "data.js");

// --- Test-Helfer --------------------------------------------------------------
let passed = 0;
let failed = 0;
function check(name, cond, detail = "") {
    if (cond) { passed++; console.log(`  ✓ ${name}`); }
    else { failed++; console.log(`  ✗ ${name} ${detail}`); }
}

// --- Polyfills: Browser-APIs, die Node nicht hat ------------------------------
const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
};

// fetch umwickeln, um Requests/Statuscodes zu protokollieren
const fetchLog = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
    const res = await realFetch(url, opts);
    fetchLog.push({ url: String(url), status: res.status });
    return res;
};

// Minimal-DOM, ausreichend für stations.js
class FakeOption {
    constructor() { this.value = ""; this.textContent = ""; this.selected = false; }
}
class FakeSelect {
    constructor() { this.options = []; }
    appendChild(o) { this.options.push(o); }
    set value(v) { for (const o of this.options) o.selected = (o.value === v); }
}
const fakeSelect = new FakeSelect();
globalThis.document = {
    getElementById: id => (id === "stationSelect" ? fakeSelect : null),
    createElement: () => new FakeOption(),
};

// --- Test 1: stations.js ------------------------------------------------------
async function testStations() {
    await loadStations(STATION);

    const opts = fakeSelect.options;
    check("Stationsliste nicht leer", opts.length > 100, `(nur ${opts.length})`);

    const labels = opts.map(o => o.textContent);
    const sorted = labels.every((l, i) => i === 0 || l.localeCompare(labels[i - 1]) >= 0);
    check("Alphabetisch sortiert", sorted, `(erste: "${labels[0]}", zweite: "${labels[1]}")`);

    const stk = opts.find(o => o.value === STATION);
    check(`Default-Station ${STATION} existiert`, !!stk);
    check(`${STATION} ist ausgewählt`, stk?.selected === true);
    check("Nur genau eine Auswahl", opts.filter(o => o.selected).length === 1);
    // new RegExp: In Template-Strings würde der Backslash vor der Klammer verloren gehen.
    const labelRe = new RegExp(`^.+ [A-Z]{2,3} \\(${STATION}\\)$`);
    check("Label-Format 'Name Kanton (ABBR)'", labelRe.test(stk?.textContent ?? ""), `("${stk?.textContent}")`);

    console.log(`  → ${opts.length} Stationen, Beispiel: "${opts[0].textContent}", "${stk?.textContent}"`);
}

// --- Test 2: data.js ----------------------------------------------------------
async function testData() {
    fetchLog.length = 0;
    const data = await loadData(STATION);

    check("Zwei Fetches (Stationsdatei + VQHA80)", fetchLog.length === 2, `(war ${fetchLog.length})`);
    check("Alle Fetches erfolgreich (200)", fetchLog.every(r => r.status === 200), JSON.stringify(fetchLog.map(r => r.status)));
    check("Daten nicht leer", data.length > 100, `(nur ${data.length})`);

    const sortedAsc = data.every((d, i) => i === 0 || d.timestamp >= data[i - 1].timestamp);
    check("Aufsteigend nach Zeitstempel", sortedAsc);
    check("Alle Zeitstempel gültig", data.every(d => !isNaN(d.timestamp)));
    check("Alle Werte Zahl oder null", data.every(d =>
        ["windavg10m", "windmax1s", "windrichtung"].every(k => d[k] === null || typeof d[k] === "number")));

    const last = data[data.length - 1];
    const ageH = (Date.now() - last.timestamp.getTime()) / 36e5;
    check("Neuester Wert aktuell (< 24h alt)", ageH < 24, `(Alter: ${ageH.toFixed(1)}h)`);

    console.log(`  → ${data.length} Messwerte, neuester: ${new Date(last.timestamp).toISOString()}`);
}

// --- Test 3: helper.js --------------------------------------------------------
async function testCaching() {
    fetchLog.length = 0;
    await loadData(STATION);
    const statuses = fetchLog.map(r => r.status).join(", ");
    console.log(`  → Statuscodes beim zweiten Laden: ${statuses}`);

    check("Zweites Laden funktioniert (200 oder 304)", fetchLog.every(r => r.status === 200 || r.status === 304), statuses);
    if (fetchLog.some(r => r.status === 304)) {
        check("304-Cache-Path aktiv (ETag vom Server)", true);
    } else {
        console.log("  ℹ Server sendet kein ETag (oder 200 erneut) – 304-Pfad nicht ausgeführt, 200-Pfad ist geprüft.");
    }
    check("localStorage enthält Daten", [...store.keys()].some(k => k.endsWith("_data")));
}

// --- Test: wind.js (reine Logik, offline) ---------------------------------------
function testWind() {
    // Beaufortskala: obere Grenze gehört zur nächsten Stufe
    check("B0: 0.5 km/h", beaufortIndex(0.5) === 0, `(${beaufortIndex(0.5)})`);
    check("B1: 1 km/h (Grenze)", beaufortIndex(1) === 1, `(${beaufortIndex(1)})`);
    check("B2: 6 km/h (Grenze)", beaufortIndex(6) === 2, `(${beaufortIndex(6)})`);
    check("B3: 18.52 km/h (10 kts)", beaufortIndex(18.52) === 3, `(${beaufortIndex(18.52)})`);
    check("B11: 117.9 km/h", beaufortIndex(117.9) === 11);
    check("B12: 118 km/h (Grenze)", beaufortIndex(118) === 12, `(${beaufortIndex(118)})`);
    check("B12: 200 km/h", beaufortIndex(200) === 12);
    check("fehlender Wert → null", beaufortIndex(null) === null);
    check("Farbenzahl = Stufenanzahl", BEAUFORT_COLORS.length === BEAUFORT_LIMITS.length - 1);
    check("10 kts ≈ 18.52 km/h", Math.abs(TEN_KNOTS_KMH - 18.52) < 0.01, `(${TEN_KNOTS_KMH})`);

    // Zürich-Offset: Sommer (CEST) = +2h, Winter (CET) = +1h
    const summer = new Date(Date.UTC(2026, 6, 15, 12, 0, 0)); // 15.07.2026 12:00 UTC
    const winter = new Date(Date.UTC(2026, 0, 15, 12, 0, 0)); // 15.01.2026 12:00 UTC
    check("Zürich-Offset (Sommer) = +2h", zurichOffsetMs(summer) === 2 * 36e5, `(${zurichOffsetMs(summer)} ms)`);
    check("Zürich-Offset (Winter) = +1h", zurichOffsetMs(winter) === 36e5, `(${zurichOffsetMs(winter)} ms)`);

    // Roundtrip: Ein Renderer in Geräte-Ortszeit muss Zürich-Ortszeit zeigen.
    // Simuliert mit festem Geräte-Offset (ohne DST). Der entscheidende Fall:
    // ein Sommerpunkt, der NACH der Umstellung gerendert wird, muss trotzdem
    // +2h ergeben (pro-Punkt-Shift statt fixem Shift für „now").
    const renderedIn = (d, deviceOffsetMs) => d.getTime() + deviceOffsetMs;
    check("Gerät +9h: Sommerpunkt → Zürich +2h",
        renderedIn(toZurichDisplayTime(summer, 9 * 36e5), 9 * 36e5) === summer.getTime() + 2 * 36e5);
    check("Gerät +9h: Winterpunkt → Zürich +1h",
        renderedIn(toZurichDisplayTime(winter, 9 * 36e5), 9 * 36e5) === winter.getTime() + 36e5);
    check("Gerät Zürich (Winter, +1h): Sommerpunkt → Zürich +2h",
        renderedIn(toZurichDisplayTime(summer, 36e5), 36e5) === summer.getTime() + 2 * 36e5);
    check("Gerät Zürich (Sommer, +2h): Winterpunkt → Zürich +1h",
        renderedIn(toZurichDisplayTime(winter, 2 * 36e5), 2 * 36e5) === winter.getTime() + 36e5);
}

// --- Test-Runner ----------------------------------------------------------------
const tests = [
    ["wind.js – Beaufort + Zürich-Zeit (offline)", testWind],
    ["stations.js – Stationsliste laden + Select füllen", testStations],
    ["data.js – Messdaten laden (beide Quellen)", testData],
    ["helper.js – ETag-Caching", testCaching],
];

for (const [title, fn] of tests) {
    console.log(`\n${title}`);
    try {
        await fn();
    } catch (error) {
        failed++;
        console.error(`  ✗ abgebrochen:`, error);
        if (error instanceof TypeError && /fetch failed/.test(error.message)) {
            console.error("  → data.geo.admin.ch nicht erreichbar? (Netzwerk/Internet geprüft)");
        }
        break; // weitere Tests wären ohne (Netzwerk-)Grundlage ohnehin aussagekräftig
    }
}

// --- Ergebnis -------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed === 0 ? 0 : 1);
