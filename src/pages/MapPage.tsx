import 'mapbox-gl/dist/mapbox-gl.css'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Map, {
  type LayerProps,
  type MapMouseEvent,
  NavigationControl,
  Popup,
  type PopupInstance,
  Source,
  Layer,
} from 'react-map-gl/mapbox'
import { ApiError, getSchool, getSchoolPoints, type SchoolDetails, type SchoolPoint } from '../api'
import { formatNumber, formatPercent, formatPlaceName } from '../format'
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

const LAB_LABELS: Record<LabStatus, string> = {
  yes: 'Has an IT lab',
  no: 'No IT lab',
  unknown: 'Not reported',
}

const labStatus = (hasItLab: boolean | null): LabStatus => (hasItLab === null ? 'unknown' : hasItLab ? 'yes' : 'no')

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

// Details are fetched only for schools someone clicks, once per page load.
const schoolRequests = new globalThis.Map<string, Promise<SchoolDetails>>()

function loadSchool(token: string, emisCode: string) {
  let request = schoolRequests.get(emisCode)
  if (!request) {
    request = getSchool(token, emisCode)
    request.catch(() => schoolRequests.delete(emisCode))
    schoolRequests.set(emisCode, request)
  }
  return request
}

/** Room around KP for whatever floats over the map: sidebar, rail or bottom tab bar, and the legend. */
function fitPadding() {
  if (window.matchMedia('(min-width: 1200px)').matches) return { top: 48, right: 48, bottom: 48, left: 312 }
  if (window.matchMedia('(min-width: 768px)').matches) return { top: 48, right: 48, bottom: 48, left: 144 }
  return { top: 112, right: 24, bottom: 120, left: 24 }
}

// Dots are only a few pixels wide, so a click or hover counts within this distance of one.
const HIT_RADIUS = 12

interface SchoolFeature {
  geometry: { coordinates: [number, number] }
  properties: { lab: LabStatus; code: string }
}

/** The school dot nearest the pointer, if one is within reach. */
function schoolAt(event: MapMouseEvent) {
  const { x, y } = event.point
  const nearby = event.target.queryRenderedFeatures(
    [
      [x - HIT_RADIUS, y - HIT_RADIUS],
      [x + HIT_RADIUS, y + HIT_RADIUS],
    ],
    { layers: ['schools'] },
  )
  let nearest: { emisCode: string; longitude: number; latitude: number } | null = null
  let nearestDistance = Infinity
  for (const feature of nearby) {
    // Every feature on the schools layer is a point built in this file.
    const { geometry, properties } = feature as unknown as SchoolFeature
    const [longitude, latitude] = geometry.coordinates
    const point = event.target.project([longitude, latitude])
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = { emisCode: properties.code, longitude, latitude }
    }
  }
  return nearest
}

type Points = { status: 'loading' } | { status: 'ready'; points: SchoolPoint[] } | { status: 'error' }

interface Selection {
  emisCode: string
  longitude: number
  latitude: number
}

export default function MapPage() {
  const { session, signOut } = useSession()
  const accessToken = session?.accessToken
  const [points, setPoints] = useState<Points>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [cursor, setCursor] = useState('')

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

  useEffect(() => {
    if (!selected) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selected])

  const { schools, counts } = useMemo(() => {
    const counts: Record<LabStatus, number> = { yes: 0, no: 0, unknown: 0 }
    const features = (points.status === 'ready' ? points.points : []).map(([emisCode, longitude, latitude, lab]) => {
      const status: LabStatus = lab === 1 ? 'yes' : lab === 0 ? 'no' : 'unknown'
      counts[status] += 1
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [longitude, latitude] },
        properties: { lab: status, code: emisCode },
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
        cursor={cursor}
        onMouseMove={(event) => setCursor(schoolAt(event) ? 'pointer' : '')}
        onClick={(event) => setSelected(schoolAt(event))}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="schools" type="geojson" data={schools}>
          <Layer {...schoolsLayer} />
        </Source>
        <NavigationControl position="top-right" showCompass={false} />
        {selected && accessToken && (
          <SchoolPopup
            key={selected.emisCode}
            selection={selected}
            accessToken={accessToken}
            onClose={() => setSelected(null)}
            onUnauthorized={signOut}
          />
        )}
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

type Details = { status: 'loading' } | { status: 'ready'; school: SchoolDetails } | { status: 'error' }

interface SchoolPopupProps {
  selection: Selection
  accessToken: string
  onClose: () => void
  onUnauthorized: () => void
}

function SchoolPopup({ selection, accessToken, onClose, onUnauthorized }: SchoolPopupProps) {
  const [details, setDetails] = useState<Details>({ status: 'loading' })
  const popupRef = useRef<PopupInstance>(null)
  const { longitude, latitude } = selection

  // Mapbox chooses the popup's side as it opens, before the popup is styled and the details are in,
  // so a tall popup could run off the top of the map. Setting the position again makes it choose afresh.
  useEffect(() => {
    popupRef.current?.setLngLat([longitude, latitude])
  }, [details.status, longitude, latitude])

  useEffect(() => {
    let active = true
    loadSchool(accessToken, selection.emisCode)
      .then((school) => {
        if (active) setDetails({ status: 'ready', school })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) onUnauthorized()
        else setDetails({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [accessToken, selection.emisCode, onUnauthorized])

  return (
    <Popup
      ref={popupRef}
      longitude={longitude}
      latitude={latitude}
      // No fixed anchor: Mapbox opens the popup on whichever side of the dot keeps it on screen.
      offset={12}
      maxWidth="300px"
      closeButton={false}
      // The map's own click handler decides what the next click selects.
      closeOnClick={false}
      className="school-popup"
      onClose={onClose}
    >
      <div className="school-popup__header">
        <h3>{details.status === 'ready' ? details.school.name : 'School'}</h3>
        <button className="school-popup__close" type="button" aria-label="Close" onClick={onClose}>
          <X size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      {details.status === 'loading' && <p className="school-popup__message">Loading…</p>}
      {details.status === 'error' && <p className="school-popup__message">Couldn't load this school.</p>}
      {details.status === 'ready' && (
        <dl className="school-popup__facts">
          <div>
            <dt>District</dt>
            <dd>{formatPlaceName(details.school.district)}</dd>
          </div>
          <div>
            <dt>Tehsil</dt>
            <dd>{details.school.tehsil ? formatPlaceName(details.school.tehsil) : 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{details.school.level}</dd>
          </div>
          <div>
            <dt>Gender</dt>
            <dd>{details.school.gender}</dd>
          </div>
          <div>
            <dt>IT lab</dt>
            <dd>
              <span
                className="school-popup__dot"
                style={{ background: LAB_COLORS[labStatus(details.school.hasItLab)] }}
                aria-hidden="true"
              />
              {LAB_LABELS[labStatus(details.school.hasItLab)]}
            </dd>
          </div>
          <ComputerFacts computers={details.school.computers} working={details.school.functionalComputers} />
          <div>
            <dt>EMIS code</dt>
            <dd>{details.school.emisCode}</dd>
          </div>
        </dl>
      )}
    </Popup>
  )
}

/** The school's computers, and how many of them work with their share in brackets. */
function ComputerFacts({ computers, working }: { computers: number | null; working: number | null }) {
  if (computers === null) {
    return (
      <div>
        <dt>Computers</dt>
        <dd>Not reported</dd>
      </div>
    )
  }
  return (
    <>
      <div>
        <dt>Computers</dt>
        <dd>{formatNumber(computers)}</dd>
      </div>
      <div>
        <dt>Working</dt>
        <dd>
          {working === null ? (
            'Not reported'
          ) : (
            <span>
              {formatNumber(working)}
              {computers > 0 && (
                <small className="school-popup__share"> ({formatPercent({ value: working, total: computers })})</small>
              )}
            </span>
          )}
        </dd>
      </div>
    </>
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
