import Plotly from "https://cdn.jsdelivr.net/npm/plotly.js-dist-min/+esm";
import {
    BEAUFORT_LIMITS,
    BEAUFORT_COLORS,
    beaufortIndex,
    toZurichDisplayTime,
    TEN_KNOTS_KMH
} from "./wind.js";

// 5 % Headroom über der Maximalgeschwindigkeit, damit die oberste Linie nicht
// an den Rand der Grafik stößt.
const YMAX_HEADROOM = 1.05;
// Y-Position der Richtungspfeile: 4 % des Bereichs über der Unterkante.
const ARROW_Y_FRACTION = 0.04;

export function createPlot(data, target = "plot") {
    // X-Achse in Zürich-Ortszeit: Plotly rendert Datumswerte in der
    // Geräte-Ortszeit, daher werden die UTC-Zeitpunkte pro Punkt verschoben
    // (umstellungssicher – siehe wind.js).
    const deviceOffsetNowMs = -new Date().getTimezoneOffset() * 60000;
    const timestamps = data.map(d => toZurichDisplayTime(d.timestamp, deviceOffsetNowMs));
    const windavg = data.map(d => d.windavg10m);
    const windmax = data.map(d => d.windmax1s);

    // Defensive: nur gültige Zahlen betrachten; ohne Werte → ymax=1 (kein
    // -Infinity bei leerem Array).
    const windSpeeds = [...windmax, ...windavg].filter(n => n !== null && !isNaN(n));
    const maxSpeed = windSpeeds.reduce((a, b) => Math.max(a, b), 0);
    const ymax = Math.max(1, maxSpeed * YMAX_HEADROOM);
    const ymin = 0;

    const shapes = [];

    // colored background for beaufort
    for (let i = 0; i < BEAUFORT_LIMITS.length - 1; i++) {
        if (BEAUFORT_LIMITS[i] > ymax) break;
        shapes.push({
            type: "rect",
            xref: "paper",
            yref: "y",
            x0: 0,
            x1: 1,
            y0: BEAUFORT_LIMITS[i],
            y1: Math.min(BEAUFORT_LIMITS[i + 1], ymax),
            fillcolor: BEAUFORT_COLORS[i],
            opacity: 0.25,
            line: { width: 0 },
            layer: "below"
        });
    }

    // Horizontal line at 10 Knoten
    shapes.push({
        type: "line",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: TEN_KNOTS_KMH,
        y1: TEN_KNOTS_KMH,
        line: {
            color: "lightgray",
            dash: "dash",
            width: 1
        }
    });

    const trace_avg = {
        x: timestamps,
        y: windavg,
        mode: "lines",
        name: "Ø 10 min",
        customdata: windavg.map(v => beaufortIndex(v)),
        hovertemplate: "Ø %{y} km/h · %{customdata} Bft<extra></extra>",
        line: { dash: "solid", color: "#1565c0", width: 2 }
    };

    const trace_max = {
        x: timestamps,
        y: windmax,
        mode: "lines",
        name: "Max 1 s",
        customdata: windmax.map(v => beaufortIndex(v)),
        hovertemplate: "Max %{y} km/h · %{customdata} Bft<extra></extra>",
        line: { dash: "dot", color: "#ef6c00", width: 1.5 }
    };

    // Nur Punkte mit tatsächlich gemessener Richtung; ein null würde sonst zu
    // 180° werden (falscher Südpfeil).
    const dirIdx = data.map((d, i) => (d.windrichtung != null ? i : null)).filter(i => i !== null);
    const arrowY = ymin + ARROW_Y_FRACTION * (ymax - ymin);

    const trace_dir = {
        x: dirIdx.map(i => timestamps[i]),
        y: dirIdx.map(() => arrowY),
        mode: "markers",
        name: "Richtung",
        hoverinfo: "skip",
        marker: {
            symbol: "arrow",
            size: 10,
            color: "black",
            angle: dirIdx.map(i => (data[i].windrichtung + 180) % 360)
        }
    };

    // invisible trace only to make secondary y-axis visible
    const trace_beaufort = {
        x: [timestamps[0]],
        y: [0],
        yaxis: "y2",
        mode: "markers",
        marker: { opacity: 0 },
        showlegend: false,
        hoverinfo: "skip"
    };

    const layout = {
        height: 500,
        margin: { l: 40, r: 60, t: 60, b: 55 },
        template: "plotly_white",
        shapes,
        xaxis: {
            title: { text: "Zeit (Ortszeit)" },
            hoverformat: "%d.%m.%Y %H:%M",
            automargin: true
        },
        yaxis: {
            title: {
                text: "Windgeschwindigkeit [km/h]",
                font: {
                    size: 12
                }
            },
            automargin: true,
            range: [ymin, ymax]
        },
        yaxis2: {
            title: {
                text: "Beaufort",
                font: {
                    size: 12
                }
            },
            overlaying: "y",
            side: "right",
            tickmode: "array",
            tickvals: BEAUFORT_LIMITS.slice(0, -1),
            ticktext: BEAUFORT_LIMITS.slice(0, -1).map((_, i) => i.toString()),
            automargin: true,
            range: [ymin, ymax],
            showgrid: false
        },
        legend: {
            orientation: "h",
            x: 0, y: 1
        },
        annotations: [{
            xref: "paper",
            yref: "y",
            x: 1.01,
            y: TEN_KNOTS_KMH,
            text: "10 kts",
            showarrow: false,
            xanchor: "left",
            font: {
                color: "gray",
                size: 11
            }
        }]
    };

    Plotly.react(
        target,
        [trace_avg, trace_max, trace_dir, trace_beaufort],
        layout,
        { responsive: true }
    );
}
