# EMA Frontend

React 19 app for EMA, built with Vite. It signs users in against the [EMA Backend](https://github.com/cmpocmkp/EMA_Backend) API.

## Setup

Requires Node.js 24. Start the backend first (it listens on port 3000), then:

```bash
npm install
npm run dev            # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | oxlint |

## Environment variables

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | Origin of the backend, without a trailing slash. `.env.development` points at `http://localhost:3000`; on Railway use `https://${{EMA_Backend.RAILWAY_PUBLIC_DOMAIN}}`. |

Vite inlines `VITE_*` values when it builds, so redeploy after changing them. They end up in the public JavaScript bundle, so never put secrets in them.

## Sign-in

The login page posts to `POST /api/auth/login` and keeps the returned token and user in `localStorage`. On load the app re-checks the token with `GET /api/auth/me` and returns to the login page when it has expired (after 12 hours) or the user was removed.

## Deployment

Deployed as the `EMA_Frontend` Railway service. Railpack builds the app and serves `dist/` with Caddy.
