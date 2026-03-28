import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function Sparkline({ values, color, width = 120, height = 32 }) {
    if (values.length < 2)
        return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(" ");
    return (_jsx("svg", { width: width, height: height, viewBox: `0 0 ${width} ${height}`, children: _jsx("polyline", { points: points, fill: "none", stroke: color, strokeWidth: "1.5" }) }));
}
export default function VitalsChart(props) {
    return (_jsxs("div", { style: { fontFamily: "system-ui, sans-serif", maxWidth: "480px", padding: "16px" }, children: [_jsx("div", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "12px" }, children: "Vitals Overview" }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }, children: props.series.map((s) => (_jsxs("div", { style: {
                        padding: "12px", borderRadius: "8px",
                        background: "rgba(255,255,255,0.05)",
                    }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }, children: [_jsx("span", { style: { fontSize: "12px", opacity: 0.6 }, children: s.label }), _jsxs("span", { style: { fontSize: "11px", opacity: 0.4 }, children: ["avg ", s.average.toFixed(1)] })] }), _jsxs("div", { style: { fontSize: "22px", fontWeight: 700, color: s.color }, children: [s.latest.toFixed(s.unit === "hrs" ? 1 : 0), _jsxs("span", { style: { fontSize: "12px", opacity: 0.5 }, children: [" ", s.unit] })] }), _jsx(Sparkline, { values: s.values.map((v) => v.value), color: s.color })] }, s.label))) })] }));
}
