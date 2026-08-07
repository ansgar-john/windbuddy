import Plotly from 'https://cdn.jsdelivr.net/npm/plotly.js-dist-min/+esm'

export function createPlot(data) {
    const beaufort_limits = [0, 1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118, Infinity];
    const beaufort_colors = [
        "#e0e0e0", "#e0e0e0", "#e0e0e0", "#2196f3", "#4caf50", "#ffeb3b",
        "#ff9800", "#ff5722", "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5"
    ];

    const timestamps = data.map(d => d.timestamp);
    const windavg = data.map(d => d.windavg10m);
    const windmax = data.map(d => d.windmax1s);

    const ymax = Math.max(...windmax.filter(n => n !== null)) + 1;
    const ymin = 0;

    const shapes = [];

    // colored background for beaufort
    for (let i = 0; i < beaufort_limits.length - 1; i++) {
        if (beaufort_limits[i] > ymax) break;
        shapes.push({
            type: "rect",
            xref: "paper",
            yref: "y",
            x0: 0,
            x1: 1,
            y0: beaufort_limits[i],
            y1: Math.min(beaufort_limits[i + 1], ymax),
            fillcolor: beaufort_colors[i],
            opacity: 0.2,
            line: { width: 0 },
            layer: "below"
        });
    }

    // Horizontal line at y=18.51 (10 Knots)
    shapes.push({
        type: "line",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: 18.51,
        y1: 18.51,
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
        name: "avg 10m",
        line: { dash: "solid" }
    };

    const trace_max = {
        x: timestamps,
        y: windmax,
        mode: "lines",
        name: "max 1s",
        line: { dash: "dot" }
    };

    const winddir = data.map(d => d.windrichtung);
    const arrowY = ymin + 0.04 * (ymax - ymin);

    const trace_dir = {
        x: timestamps,
        y: Array(timestamps.length).fill(arrowY),
        mode: "markers",
        name: "",
        showlegend: false,
        hoverinfo: "skip",
        marker: {
            symbol: "arrow",
            size: 10,
            color: "black",
            angle: winddir.map(dir => (dir + 180) % 360)
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
        margin: { l: 40, r: 60, t: 60, b: 40 },
        template: "plotly_white",
        shapes,
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
            tickvals: beaufort_limits.slice(0, -1),
            ticktext: beaufort_limits.slice(0, -1).map((_, i) => i.toString()),
            automargin: true,
            range: [ymin, ymax],
            showgrid: false
        },
        legend: {
            orientation: "h",
            x: 0, y: 1
        }
    };

    layout.annotations = [{
        xref: "paper",
        yref: "y",
        x: 1.01,
        y: 18.51,
        text: "10 kts",
        showarrow: false,
        xanchor: "left",
        font: {
            color: "gray",
            size: 11
        }
    }];

    Plotly.newPlot(
        "plot", 
        [trace_avg, trace_max, trace_dir, trace_beaufort], 
        layout, 
        { responsive: true }
    );

    const latest = [...data].reverse().find(d => d.windavg10m !== null);
    if (latest) {
        const timeStr = new Intl.DateTimeFormat("de-CH", {
            timeZone: "Europe/Zurich",
            hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
        }).format(latest.timestamp);
        document.getElementById("latest").innerHTML = 
            `Letzter Messwert: <strong>${latest.windavg10m.toFixed(1)} km/h</strong> um <strong>${timeStr}</strong>`;
    }
}
