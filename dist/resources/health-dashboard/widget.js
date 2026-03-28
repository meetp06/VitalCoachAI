import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function scoreColor(score) {
    if (score >= 80)
        return "#22c55e";
    if (score >= 60)
        return "#eab308";
    if (score >= 40)
        return "#f97316";
    return "#ef4444";
}
function VitalCard({ label, value, unit }) {
    return (_jsxs("div", { style: { padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", textAlign: "center" }, children: [_jsx("div", { style: { fontSize: "12px", opacity: 0.6, marginBottom: "4px" }, children: label }), _jsxs("div", { style: { fontSize: "20px", fontWeight: 700 }, children: [value != null ? value : "—", unit && _jsxs("span", { style: { fontSize: "12px", opacity: 0.6 }, children: [" ", unit] })] })] }));
}
export default function HealthDashboard(props) {
    const color = scoreColor(props.healthScore);
    return (_jsxs("div", { style: { fontFamily: "system-ui, sans-serif", maxWidth: "480px", padding: "16px" }, children: [_jsx("div", { style: { textAlign: "center", marginBottom: "20px" }, children: _jsxs("div", { style: {
                        width: "120px", height: "120px", borderRadius: "50%",
                        border: `6px solid ${color}`, margin: "0 auto",
                        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                    }, children: [_jsx("div", { style: { fontSize: "36px", fontWeight: 700, color }, children: props.healthScore }), _jsx("div", { style: { fontSize: "11px", opacity: 0.6 }, children: props.healthLabel })] }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }, children: [_jsx(VitalCard, { label: "Glucose", value: props.glucose != null ? Math.round(props.glucose) : null, unit: "mg/dL" }), _jsx(VitalCard, { label: "HRV", value: props.hrv != null ? Math.round(props.hrv) : null, unit: "ms" }), _jsx(VitalCard, { label: "Heart Rate", value: props.heartRate != null ? Math.round(props.heartRate) : null, unit: "bpm" }), _jsx(VitalCard, { label: "Sleep", value: props.sleepHours != null ? props.sleepHours.toFixed(1) : null, unit: "hrs" }), _jsx(VitalCard, { label: "Steps", value: props.steps != null ? props.steps.toLocaleString() : null }), _jsx(VitalCard, { label: "Skin", value: props.skinScore, unit: "/100" })] }), props.dopamineDebt != null && (_jsxs("div", { style: { marginBottom: "16px" }, children: [_jsx("div", { style: { fontSize: "12px", opacity: 0.6, marginBottom: "4px" }, children: "Dopamine Debt" }), _jsx("div", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", height: "8px" }, children: _jsx("div", { style: {
                                width: `${props.dopamineDebt}%`, height: "100%", borderRadius: "4px",
                                background: props.dopamineDebt > 60 ? "#ef4444" : props.dopamineDebt > 30 ? "#eab308" : "#22c55e",
                            } }) })] })), props.topPatterns.length > 0 && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "8px" }, children: "Active Patterns" }), props.topPatterns.map((p, i) => (_jsxs("div", { style: { fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }, children: [p.pattern, _jsxs("span", { style: { float: "right", opacity: 0.6 }, children: [(p.strength * 100).toFixed(0), "%"] })] }, i)))] }))] }));
}
