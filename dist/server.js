import { existsSync, readFileSync, createReadStream } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { askGemini } from './services/gemini.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { register as registerHealthSummary } from './tools/health-summary.js';
import { register as registerGlucose } from './tools/glucose.js';
import { register as registerMeals } from './tools/meals.js';
import { register as registerVitals } from './tools/vitals.js';
import { register as registerBehavior } from './tools/behavior.js';
import { register as registerEnvironment } from './tools/environment.js';
import { register as registerSkin } from './tools/skin.js';
import { register as registerCausalPatterns } from './tools/causal-patterns.js';
import { register as registerCausalGraph } from './tools/causal-graph.js';
import { register as registerRenderHealthInsights } from './tools/render-health-insights.js';
const CF_WORKER_URL = process.env.VITA_CLOUD_URL ?? 'https://vita-cloud.hrishikesha40.workers.dev';
const PORT = parseInt(process.env.PORT ?? '3000');
const WIDGET_URI = 'ui://widget/vita-dashboard.html';
// widget.html lives at project root; __dirname is either root (tsx dev) or dist/ (compiled)
const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetPath = resolve(__dirname, existsSync(resolve(__dirname, 'widget.html')) ? 'widget.html' : '../widget.html');
const widgetHtml = readFileSync(widgetPath, 'utf-8');
export async function fetchFromWorker(workerUrl, path, params) {
    const url = new URL(path, workerUrl);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v)
                url.searchParams.set(k, v);
        }
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
    }
    return res.json();
}
// --- Factory: creates a fresh McpServer with all tools registered ---
function createVitaMcpServer() {
    const server = new McpServer({
        name: 'vita-health',
        version: '1.0.0',
    });
    const ctx = { workerUrl: CF_WORKER_URL };
    // Register the widget as an MCP App resource
    registerAppResource(server, 'Vita Health Dashboard', WIDGET_URI, {
        description: 'Interactive health insights dashboard with charts, metrics, and recommendations. Displays health score gauge, vital metric cards with sparklines, sleep breakdown, contributing factors, and actionable recommendations.',
        _meta: {
            ui: {
                prefersBorder: true,
                csp: {
                    connectDomains: [CF_WORKER_URL],
                    resourceDomains: [CF_WORKER_URL],
                },
            },
        },
    }, async () => ({
        contents: [
            {
                uri: WIDGET_URI,
                mimeType: RESOURCE_MIME_TYPE,
                text: widgetHtml,
            },
        ],
    }));
    // Data tools (return structuredContent, no widget)
    registerHealthSummary(server, ctx);
    registerGlucose(server, ctx);
    registerMeals(server, ctx);
    registerVitals(server, ctx);
    registerBehavior(server, ctx);
    registerEnvironment(server, ctx);
    registerSkin(server, ctx);
    registerCausalPatterns(server, ctx);
    registerCausalGraph(server, ctx);
    // Render tool (returns structuredContent + widget resourceUri)
    registerRenderHealthInsights(server);
    return server;
}
// --- Nexla health data store (in-memory) ---
let latestHealthSummary = null;
function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(raw || 'null'));
            }
            catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}
// --- HTTP server: new McpServer + transport per session ---
const sessions = new Map();
const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    // Health check
    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'vita-mcp' }));
        return;
    }
    // Nexla ingest endpoint
    if (url.pathname === '/api/health/ingest' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            latestHealthSummary = body;
            console.log('[ingest] received health summary:', JSON.stringify(body, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Data received' }));
        }
        catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
        return;
    }
    // Gemini Q&A endpoint
    if (url.pathname === '/api/health/ask' && req.method === 'POST') {
        try {
            if (!latestHealthSummary) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ answer: 'No health data has been ingested yet. Please send data to /api/health/ingest first.', healthData: null }));
                return;
            }
            const body = await readBody(req);
            const question = body?.question?.trim();
            if (!question) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing "question" field' }));
                return;
            }
            const answer = await askGemini(question, latestHealthSummary);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ answer, healthData: latestHealthSummary }));
        }
        catch (err) {
            console.error('[ask] error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(err) }));
        }
        return;
    }
    // MCP endpoint
    if (url.pathname === '/mcp') {
        try {
            const sessionId = req.headers['mcp-session-id'];
            if (sessionId && sessions.has(sessionId)) {
                const session = sessions.get(sessionId);
                await session.transport.handleRequest(req, res);
            }
            else {
                const server = createVitaMcpServer();
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => crypto.randomUUID(),
                });
                await server.connect(transport);
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid)
                        sessions.delete(sid);
                };
                await transport.handleRequest(req, res);
                const sid = transport.sessionId;
                if (sid) {
                    sessions.set(sid, { server, transport });
                }
            }
        }
        catch (err) {
            console.error('MCP error:', err);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        }
        return;
    }
    // Serve static frontend files — SPA fallback to index.html for non-API routes
    const STATIC_DIR = existsSync(resolve(__dirname, 'public'))
        ? resolve(__dirname, 'public') // dev: project root/public
        : resolve(__dirname, '../public'); // prod: dist/../public = /app/public
    const MIME_TYPES = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.map': 'application/json',
    };
    const reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = resolve(STATIC_DIR, '.' + reqPath);
    // Security: block path traversal
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    const serveFile = (fPath) => {
        const mime = MIME_TYPES[extname(fPath)] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        createReadStream(fPath).pipe(res);
    };
    if (existsSync(filePath)) {
        serveFile(filePath);
    }
    else {
        // SPA fallback
        const indexPath = resolve(STATIC_DIR, 'index.html');
        if (existsSync(indexPath)) {
            serveFile(indexPath);
        }
        else {
            res.writeHead(404);
            res.end('Not found');
        }
    }
});
httpServer.listen(PORT, () => {
    console.log(`VITA MCP server listening on port ${PORT}`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`CF Worker: ${CF_WORKER_URL}`);
});
