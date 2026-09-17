# EMA Frontend

React 19 app for EMA, built with Vite. It talks to the [EMA Backend](https://github.com/cmpocmkp/EMA_Backend) API.

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
| `VITE_MAPBOX_TOKEN` | Mapbox public token (`pk.…`), restricted to the site's URLs in the Mapbox account. Locally put it in `.env.local`, which git ignores. |

Vite inlines `VITE_*` values when it builds, so redeploy after changing them. They end up in the public JavaScript bundle, so never put secrets in them.

## Pages

Routing uses React Router 8. Every page except `/login` needs a signed-in user; others are sent to the login page and brought back afterwards.

| Route | Page |
| --- | --- |
| `/login` | Sign-in |
| `/map` | Khyber Pakhtunkhwa map: schools with an IT lab in green, without one in red, not reported in grey. Clicking a dot opens the school's name, district, tehsil, level, gender, IT lab status and computers (total and working) |
| `/summary` | Filterable by division, district and tehsil (kept in the URL). Four cards whose headlines are out of all schools or all students, a division scorecard and charts, district rankings, a gender comparison, IT teachers by designation and computers working and not working per division and district, a sortable district table with tehsil drill-down, and students by class. Tables and charts show each count with its share in brackets, e.g. `134 (9.9%)`; hover a figure for its base. Everything is added up in the browser from one `GET /api/summary` response, plus `GET /api/summary/tehsils` for the chosen district |
| `/users` | List of users and an Add user dialog |

The layout adapts to the screen: a glass sidebar from 1200px, an icon rail from 768px, and a floating tab bar at the bottom on phones.

The map page loads Mapbox GL only when it is first opened. School points come from `GET /api/map/schools` once per page load; the browser revalidates them with the API's ETag, so repeat visits transfer nothing until the next data sync. The map instance is reused between visits, since each new one counts as a Mapbox map load. A school's details are fetched from `GET /api/map/schools/:emisCode` only when its dot is clicked, once per page load.

## Sign-in

The login page posts to `POST /api/auth/login` and keeps the returned token and user in `localStorage`. On load the app re-checks the token with `GET /api/auth/me` and returns to the login page when it has expired (after 12 hours) or the user was removed.

## Deployment

Deployed as the `EMA_Frontend` Railway service. Railpack builds the app and serves `dist/` with Caddy, falling back to `index.html` so routes like `/map` load on refresh.
