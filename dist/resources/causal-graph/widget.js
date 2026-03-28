import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const NODE_COLORS = {
    glucose: "#3b82f6",
    meal: "#eab308",
    sleep: "#8b5cf6",
    behavior: "#f97316",
    environment: "#22c55e",
    skin: "#ec4899",
    hrv: "#06b6d4",
    energy: "#f43f5e",
    default: "#94a3b8",
};
function getNodeColor(type) {
    return NODE_COLORS[type] || NODE_COLORS.default;
}
export default function CausalGraph(props) {
    const { nodes, edges } = props;
    if (nodes.length === 0) {
        return _jsx("div", { style: { padding: "16px", fontFamily: "system-ui" }, children: "No causal graph data available." });
    }
    // Simple circular layout (force-directed would need animation/JS runtime)
    const CX = 220;
    const CY = 200;
    const R = 140;
    const W = 440;
    const H = 400;
    const nodePositions = {};
    nodes.forEach((node, i) => {
        const angle = (Math.PI * 2 * i) / nodes.length - Math.PI / 2;
        nodePositions[node.id] = {
            x: CX + R * Math.cos(angle),
            y: CY + R * Math.sin(angle),
        };
    });
    return (_jsxs("div", { style: { fontFamily: "system-ui, sans-serif", maxWidth: "480px", padding: "16px" }, children: [_jsxs("div", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "12px" }, children: ["Causal Health Graph", _jsxs("span", { style: { fontSize: "11px", opacity: 0.5, marginLeft: "8px" }, children: [nodes.length, " nodes, ", edges.length, " edges"] })] }), _jsxs("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, children: [edges.map((e, i) => {
                        const from = nodePositions[e.source];
                        const to = nodePositions[e.target];
                        if (!from || !to)
                            return null;
                        const opacity = Math.max(0.2, e.strength);
                        const strokeWidth = 1 + e.strength * 3;
                        const isStrong = e.strength >= 0.7 && e.confidence >= 0.6;
                        // Arrow
                        const dx = to.x - from.x;
                        const dy = to.y - from.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const nx = dx / len;
                        const ny = dy / len;
                        const arrowX = to.x - nx * 18;
                        const arrowY = to.y - ny * 18;
                        return (_jsxs("g", { children: [_jsx("line", { x1: from.x, y1: from.y, x2: arrowX, y2: arrowY, stroke: isStrong ? "#f97316" : "rgba(255,255,255,0.3)", strokeWidth: strokeWidth, opacity: opacity, markerEnd: "url(#arrow)" }), e.offsetMin > 0 && (_jsxs("text", { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 6, textAnchor: "middle", fontSize: "8", fill: "rgba(255,255,255,0.3)", children: [e.offsetMin, "min"] }))] }, `edge-${i}`));
                    }), _jsx("defs", { children: _jsx("marker", { id: "arrow", markerWidth: "8", markerHeight: "6", refX: "8", refY: "3", orient: "auto", children: _jsx("path", { d: "M0,0 L8,3 L0,6 Z", fill: "rgba(255,255,255,0.4)" }) }) }), nodes.map((node) => {
                        const pos = nodePositions[node.id];
                        const color = getNodeColor(node.type);
                        return (_jsxs("g", { children: [_jsx("circle", { cx: pos.x, cy: pos.y, r: "16", fill: color, opacity: 0.9 }), _jsx("text", { x: pos.x, y: pos.y + 28, textAnchor: "middle", fontSize: "10", fill: "rgba(255,255,255,0.7)", children: node.id.length > 12 ? node.id.slice(0, 12) + "…" : node.id })] }, node.id));
                    })] }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px", fontSize: "11px" }, children: Object.entries(NODE_COLORS).filter(([k]) => k !== "default").map(([type, color]) => (_jsxs("span", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [_jsx("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: color, display: "inline-block" } }), type] }, type))) })] }));
}
