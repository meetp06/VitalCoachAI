# VitalCoach — Your Multimodal Health Copilot

> **VitalCoach** sees what you eat, hears how you feel, and connects it with your wearable data to coach you in real time.

[![Built with](https://img.shields.io/badge/Built_with-TypeScript-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Powered by](https://img.shields.io/badge/Powered_by-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-47_passing-34D399?style=flat-square)]()

---

## What It Does

VitalCoach is a multimodal health copilot that combines three input modalities — **wearable data**, **meal images**, and **voice check-ins** — to deliver personalized, actionable wellness coaching.

### Key Features

| Feature | Description |
|---------|-------------|
| 📊 **Health Dashboard** | Real-time cards for Sleep, HRV, Glucose, Heart Rate, Steps, and Stress with sparkline trends |
| 📸 **Meal Vision** | Upload a meal photo → AI detects foods, estimates macros, assesses glycemic impact, correlates with glucose state |
| 🎤 **Voice Check-in** | Speak how you feel → AI interprets mood, symptoms, energy level and correlates with physiological data |
| 🔗 **Correlation Engine** | Finds compound patterns: e.g. "poor sleep + low HRV + glucose dip = your fatigue" |
| 📋 **Action Plan** | Timed recommendations: Right Now → Next Meal → Tonight |
| 💬 **Chat Copilot** | Natural language Q&A about your health patterns with structured response cards |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  VitalCoach Web App (Vite, port 5173)            │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard    │  │  Chat Copilot Panel      │  │
│  │  Health cards │  │  Text / Voice / Camera   │  │
│  │  SVG Charts   │  │  Structured AI Responses │  │
│  │  Sleep, Steps │  │  Action Plan Cards       │  │
│  └──────────────┘  └──────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐   │
│  │  Services Layer                            │   │
│  │  InsightEngine │ MealAnalysis │ VoiceAPI   │   │
│  │  HealthData    │ NexlaPipeline│ DeepMind   │   │
│  └────────────────────────────────────────────┘   │
└───────────────────┬───────────────────────────────┘
                    │
     ┌──────────────┴─────────────┐
     │  Cloudflare Worker API      │
     │  vita-cloud.workers.dev     │
     │  + Demo fixture fallback    │
     └────────────────────────────┘
```

---

## Sponsor Integration

### 🧠 Google DeepMind
- **Gemini API** for multimodal reasoning
- Meal image analysis via Gemini Vision
- Voice check-in interpretation
- Correlation generation with safety-framed prompts
- Clean abstraction: [`lib/deepmind.ts`](app/src/lib/deepmind.ts)

### 🔄 Nexla
- Data normalization pipeline: **Ingest → Validate → Normalize → Enrich**
- Unifies heterogeneous wearable data into a single `HealthContext` schema
- Handles missing fields, unit conversion (mmol/L → mg/dL), time alignment
- Implementation: [`lib/nexla.ts`](app/src/lib/nexla.ts)

### 💬 Assistant UI
- Split-panel layout: Dashboard + Chat Copilot
- Structured response cards (Meal Analysis, Voice Check-in, Action Plan, Correlations)
- Quick action buttons, typing indicators, mic/camera input
- Implementation: [`components/chat.ts`](app/src/components/chat.ts)

### ☁️ DigitalOcean
- Dockerfile for containerized deployment
- `docker-compose.yml` for local development
- Production-ready build pipeline via Vite

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repo
git clone <repo-url>
cd mar28

# Install app dependencies
cd app
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Environment Variables (Optional)

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for live AI | _(mock mode)_ |
| `VITE_API_URL` | Health data API base URL | `/api` (proxied) |

> **Demo Mode**: The app works fully offline with realistic mock data. No API keys required for the demo.

### Run Tests

```bash
npm test
```

---

## Demo Flow Script

For hackathon judges — a 3-minute guided demo:

1. **Open the app** → Dashboard loads with health cards showing concerning metrics
2. **Read the AI Insight banner** → "Why do I feel so fatigued and stressed today?"
3. **Scroll dashboard** → Show sparkline trends, Contributing Factors (Sleep debt HIGH, Low HRV HIGH), Sleep breakdown
4. **Click "Analyze my data"** in chat → AI generates observations, correlations, and a timed Action Plan
5. **Click "Meal photo"** → Upload any food image → AI returns detected foods, macros, glycemic impact with contextual note
6. **Click "Check-in"** → Voice transcript captured → AI detects mood/symptoms, correlates with wearables, generates updated Action Plan
7. **Type a question** → "Why was my workout harder today?" → Contextual AI response using health data
8. **Highlight sponsor bar** → Google DeepMind (reasoning), Nexla (data pipeline), Assistant UI (chat UX), DigitalOcean (deployment)

---

## Project Structure

```
app/
├── index.html                  # Entry HTML with SEO meta
├── package.json                # Dependencies
├── vite.config.ts              # Vite config with API proxy
├── tsconfig.json               # TypeScript config
├── src/
│   ├── main.ts                 # App entry: shell, data loading, boot
│   ├── style.css               # Full design system (dark glassmorphism)
│   ├── components/
│   │   ├── dashboard.ts        # Health dashboard panel
│   │   ├── chat.ts             # Chat copilot panel
│   │   └── health-charts.ts    # SVG chart utilities
│   ├── services/
│   │   ├── health-data.ts      # API fetcher with demo fallback
│   │   └── insight-engine.ts   # Rule-based correlation engine
│   ├── lib/
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── demo-data.ts        # Demo fixtures
│   │   ├── safety.ts           # Input sanitization, output safety
│   │   ├── nexla.ts            # Data normalization pipeline
│   │   └── deepmind.ts         # Gemini API abstraction
│   └── tests/
│       ├── insight-engine.test.ts
│       ├── nexla.test.ts
│       └── safety.test.ts
```

---

## Safety & Security

- **No hardcoded secrets** — all API keys via environment variables
- **Input sanitization** — HTML stripping, length limits, file type validation
- **Output safety** — banned diagnostic phrase detection, automatic replacement with wellness language
- **Non-diagnostic framing** — all outputs are "wellness coaching", never "medical advice"
- **Disclaimer on every insight** — "These insights are based on your wellness data patterns and are not medical advice"

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla TypeScript, Vite |
| Styling | Custom CSS (dark glassmorphism, CSS variables) |
| Charts | Hand-crafted SVG (sparklines, bar charts, line charts, gauges) |
| AI | Google Gemini API (with mock fallback) |
| Data | Cloudflare Worker API + demo fixtures |
| Testing | Vitest (47 tests) |
| Deployment | Docker + DigitalOcean |

---

## Known Limitations

- Voice check-in requires Web Speech API (Chrome/Edge). Falls back to demo transcript in other browsers.
- Meal analysis uses mock responses without a Gemini API key.
- Health data API returns limited live data — demo fixtures provide a rich experience.

---

## License

MIT
