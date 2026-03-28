import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const LABELS = {
    acne: "Acne",
    dark_circle_v2: "Dark Circles",
    redness: "Redness",
    oiliness: "Oiliness",
    pore: "Pores",
    wrinkle: "Wrinkles",
    eye_bag: "Eye Bags",
};
function severityColor(severity) {
    if (severity >= 0.7)
        return "#ef4444";
    if (severity >= 0.4)
        return "#eab308";
    return "#22c55e";
}
export default function SkinReport(props) {
    const { overallScore, conditions, timestamp } = props;
    // Radar chart
    const CX = 140;
    const CY = 140;
    const R = 100;
    const n = conditions.length || 1;
    function polarToCart(i, value) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (value / 100) * R;
        return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
    }
    const radarPoints = conditions.map((c, i) => polarToCart(i, c.uiScore));
    const radarPath = radarPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
    return (_jsxs("div", { style: { fontFamily: "system-ui, sans-serif", maxWidth: "480px", padding: "16px" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: "14px", fontWeight: 600 }, children: "Skin Analysis" }), _jsx("div", { style: { fontSize: "11px", opacity: 0.5 }, children: new Date(timestamp).toLocaleDateString() })] }), _jsx("div", { style: {
                            width: "56px", height: "56px", borderRadius: "50%",
                            border: `4px solid ${overallScore >= 70 ? "#22c55e" : overallScore >= 40 ? "#eab308" : "#ef4444"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "20px", fontWeight: 700,
                        }, children: overallScore })] }), conditions.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("svg", { width: 280, height: 280, viewBox: "0 0 280 280", style: { display: "block", margin: "0 auto 12px" }, children: [[25, 50, 75, 100].map((v) => (_jsx("circle", { cx: CX, cy: CY, r: (v / 100) * R, fill: "none", stroke: "rgba(255,255,255,0.1)" }, v))), conditions.map((c, i) => {
                                const end = polarToCart(i, 100);
                                const labelPos = polarToCart(i, 115);
                                return (_jsxs("g", { children: [_jsx("line", { x1: CX, y1: CY, x2: end.x, y2: end.y, stroke: "rgba(255,255,255,0.1)" }), _jsx("text", { x: labelPos.x, y: labelPos.y, textAnchor: "middle", fontSize: "9", fill: "rgba(255,255,255,0.5)", children: LABELS[c.type] || c.type })] }, i));
                            }), _jsx("path", { d: radarPath, fill: "rgba(168,85,247,0.2)", stroke: "#a855f7", strokeWidth: "2" }), radarPoints.map((p, i) => (_jsx("circle", { cx: p.x, cy: p.y, r: "4", fill: severityColor(conditions[i].severity) }, i)))] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }, children: conditions.map((c) => (_jsxs("div", { style: {
                                padding: "8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                            }, children: [_jsx("span", { style: { fontSize: "12px" }, children: LABELS[c.type] || c.type }), _jsx("span", { style: { fontSize: "14px", fontWeight: 600, color: severityColor(c.severity) }, children: c.uiScore })] }, c.type))) })] }))] }));
}
