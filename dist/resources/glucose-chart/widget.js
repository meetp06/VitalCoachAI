import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function timeLabel(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
export default function GlucoseChart(props) {
    const { readings, meals, average, min, max } = props;
    if (readings.length === 0) {
        return _jsx("div", { style: { padding: "16px", fontFamily: "system-ui" }, children: "No glucose data available." });
    }
    // SVG chart dimensions
    const W = 440;
    const H = 200;
    const PAD = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    // Scale
    const values = readings.map((r) => r.glucoseMgDL);
    const yMin = Math.min(60, ...values);
    const yMax = Math.max(180, ...values);
    const times = readings.map((r) => new Date(r.timestamp).getTime());
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const tRange = tMax - tMin || 1;
    const xScale = (t) => PAD.left + ((t - tMin) / tRange) * chartW;
    const yScale = (v) => PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
    // Path
    const sorted = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const pathD = sorted
        .map((r, i) => {
        const x = xScale(new Date(r.timestamp).getTime());
        const y = yScale(r.glucoseMgDL);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
        .join(" ");
    // Zone bands
    const normalLow = yScale(70);
    const normalHigh = yScale(140);
    return (_jsxs("div", { style: { fontFamily: "system-ui, sans-serif", maxWidth: "480px", padding: "16px" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px" }, children: [_jsx("span", { style: { fontSize: "14px", fontWeight: 600 }, children: "Glucose" }), _jsxs("span", { style: { fontSize: "12px", opacity: 0.6 }, children: ["Avg: ", average.toFixed(0), " | Range: ", min, "\u2013", max, " mg/dL"] })] }), _jsxs("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, children: [_jsx("rect", { x: PAD.left, y: normalHigh, width: chartW, height: normalLow - normalHigh, fill: "rgba(34,197,94,0.1)" }), [70, 100, 140, 180].map((v) => (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, y1: yScale(v), x2: W - PAD.right, y2: yScale(v), stroke: "rgba(255,255,255,0.1)", strokeDasharray: "3,3" }), _jsx("text", { x: PAD.left - 5, y: yScale(v) + 4, textAnchor: "end", fill: "rgba(255,255,255,0.4)", fontSize: "10", children: v })] }, v))), _jsx("path", { d: pathD, fill: "none", stroke: "#3b82f6", strokeWidth: "2" }), sorted.map((r, i) => {
                        const x = xScale(new Date(r.timestamp).getTime());
                        const y = yScale(r.glucoseMgDL);
                        const color = r.energyState === "crashing" ? "#ef4444"
                            : r.energyState === "rising" ? "#f97316"
                                : r.energyState === "reactiveLow" ? "#a855f7"
                                    : "#3b82f6";
                        return _jsx("circle", { cx: x, cy: y, r: "3", fill: color }, i);
                    }), meals.map((m, i) => {
                        const x = xScale(new Date(m.timestamp).getTime());
                        return (_jsxs("g", { children: [_jsx("line", { x1: x, y1: PAD.top, x2: x, y2: H - PAD.bottom, stroke: "#eab308", strokeDasharray: "4,4", strokeWidth: "1" }), _jsx("text", { x: x, y: H - PAD.bottom + 14, textAnchor: "middle", fill: "#eab308", fontSize: "9", children: m.label })] }, `meal-${i}`));
                    })] }), _jsxs("div", { style: { display: "flex", gap: "12px", fontSize: "11px", opacity: 0.6, marginTop: "4px" }, children: [_jsx("span", { children: "\u25CF Stable" }), _jsx("span", { style: { color: "#f97316" }, children: "\u25CF Rising" }), _jsx("span", { style: { color: "#ef4444" }, children: "\u25CF Crashing" }), _jsx("span", { style: { color: "#a855f7" }, children: "\u25CF Reactive Low" }), _jsx("span", { style: { color: "#eab308" }, children: "\u2506 Meal" })] })] }));
}
