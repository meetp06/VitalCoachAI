# hackathon-api

Standalone Nexla → Gemini API. No frontend, no database, no auth.

## Setup

```bash
cd hackathon-api
npm install
cp .env.example .env
# edit .env — set GEMINI_API_KEY
```

## Run locally

```bash
npm run dev
```

## Build + run compiled

```bash
npm run build
npm start
```

## Deploy to DigitalOcean (new App)

1. Push this repo to GitHub
2. DigitalOcean → Create App → select repo → set **Source Directory** to `hackathon-api`
3. DO will detect the Dockerfile automatically
4. Add environment variable: `GEMINI_API_KEY=your_key`
5. Deploy

## Nexla destination URL

```
https://<your-do-app>.ondigitalocean.app/api/health/ingest
```

Method: POST, Content-Type: application/json

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /api/health/ingest | Receive Nexla payload |
| POST | /api/health/ask | Ask Gemini about health data |
