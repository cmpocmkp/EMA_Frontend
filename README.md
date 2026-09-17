# EMA Frontend

React 19 dashboard for EMA, built with Vite. It talks to the [EMA Backend](https://github.com/cmpocmkp/EMA_Backend) API.

## Setup

Requires Node.js 24.

```bash
npm install
npm run dev            # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | oxlint |

## Deployment

Deployed as a Railway service (defined in the backend's `.railway/railway.ts`). Railpack builds the app and serves `dist/` with Caddy. `VITE_*` variables are inlined at build time, so redeploy after changing them.
