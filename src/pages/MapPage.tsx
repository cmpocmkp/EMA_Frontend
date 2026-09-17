import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useMemo, useState } from 'react'
import Map, { type LayerProps, NavigationControl, Source, Layer } from 'react-map-gl/mapbox'
import { ApiError, getSchoolPoints, type SchoolPoint } from '../api'
import { useSession } from '../session/session-context'
import './MapPage.css'

// Khyber Pakhtunkhwa, [west, south] to [east, north]; covers all but a handful of mis-geocoded schools.
const KP_BOUNDS: [[number, number], [number, number]] = [
  [69.2, 31.2],
  [73.8, 36.8],
]

type LabStatus = 'yes' | 'no' | 'unknown'

const LAB_COLORS: Record<LabStatus, string> = {
  yes: '#22a45d',
  no: '#e0443a',
  unknown: '#8e8e93',
}

const schoolsLayer: LayerProps = {
  id: 'schools',
  type: 'circle',
  layout: {
    // Draw schools with a lab above the far more numerous ones without.
    'circle-sort-key': ['match', ['get', 'lab'], 'yes', 2, 'no', 1, 0],
  },
  paint: {
    'circle-color': ['match', ['get', 'lab'], 'yes', LAB_COLORS.yes, 'no', LAB_COLORS.no, LAB_COLORS.unknown],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 8, 2.8, 11, 4.5, 14, 7],
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 7, 0, 10, 0.8],
    'circle-opacity': 0.9,
  },
}

// One download per page load; the map page remounts on every visit.
let schoolPointsRequest: Promise<SchoolPoint[]> | undefined

function loadSchoolPoints(token: string) {
  schoolPointsRequest ??= getSchoolPoints(token).then(
    ({ schools }) => schools,
    (error: unknown) => {
      schoolPointsRequest = undefined
      throw error
    },
  )
  return schoolPointsRequest
}

/** Room around KP for whatever floats over the map: sidebar, rail or bottom tab bar, and the legend. */
function fitPadding() {
  if (window.matchMedia('(min-width: 1200px)').matches) return { top: 48, right: 48, bottom: 48, left: 312 }
  if (window.matchMedia('(min-width: 768px)').matches) return { top: 48, right: 48, bottom: 48, left: 144 }
  return { top: 112, right: 24, bottom: 120, left: 24 }
}

type Points = { status: 'loading' } | { status: 'ready'; points: SchoolPoint[] } | { status: 'error' }

export default function MapPage() {
  const { session, signOut } = useSession()
  const accessToken = session?.accessToken
  const [points, setPoints] = useState<Points>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    loadSchoolPoints(accessToken)
      .then((loaded) => {
        if (active) setPoints({ status: 'ready', points: loaded })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) signOut()
        else setPoints({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [accessToken, signOut, attempt])

  const { schools, counts } = useMemo(() => {
    const counts: Record<LabStatus, number> = { yes: 0, no: 0, unknown: 0 }
    const features = (points.status === 'ready' ? points.points : []).map(([, longitude, latitude, lab]) => {
      const status: LabStatus = lab === 1 ? 'yes' : lab === 0 ? 'no' : 'unknown'
      counts[status] += 1
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [longitude, latitude] },
        properties: { lab: status },
      }
    })
    return { schools: { type: 'FeatureCollection' as const, features }, counts }
  }, [points])

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
  if (!mapboxToken) {
    return (
      <div className="page-body">
        <section className="glass empty-state">
          <p>The map needs a Mapbox token in VITE_MAPBOX_TOKEN.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="map-page">
      <Map
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={{ bounds: KP_BOUNDS, fitBoundsOptions: { padding: fitPadding() } }}
        // Keeps the map instance between visits; every new instance counts as a billed map load.
        reuseMaps
        // A flat data map: no tilting, and pinching on phones zooms without rotating.
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        onLoad={(event) => event.target.touchZoomRotate.disableRotation()}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="schools" type="geojson" data={schools}>
          <Layer {...schoolsLayer} />
        </Source>
        <NavigationControl position="top-right" showCompass={false} />
      </Map>

      {points.status === 'ready' ? (
        <aside className="map-legend glass" aria-label="Legend">
          <h2>IT labs</h2>
          <ul>
            <LegendItem color={LAB_COLORS.yes} label="IT lab" count={counts.yes} />
            <LegendItem color={LAB_COLORS.no} label="No IT lab" count={counts.no} />
            <LegendItem color={LAB_COLORS.unknown} label="Not reported" count={counts.unknown} />
          </ul>
        </aside>
      ) : points.status === 'loading' ? (
        <p className="map-status glass" role="status">
          Loading schools…
        </p>
      ) : (
        <p className="map-status glass" role="alert">
          Couldn't load schools.
          <button
            className="map-status__retry"
            type="button"
            onClick={() => {
              setPoints({ status: 'loading' })
              setAttempt((count) => count + 1)
            }}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  )
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <li>
      <span className="map-legend__dot" style={{ background: color }} aria-hidden="true" />
      <span>{label}</span>
      <strong>{count.toLocaleString()}</strong>
    </li>
  )
}
