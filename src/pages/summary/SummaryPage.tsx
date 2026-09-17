import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError, getSummary, type SummaryResponse } from '../../api'
import { formatDateTime } from '../../format'
import { useSession } from '../../session/session-context'
import Cards from './Cards'
import { displayName, toCells } from './data'
import DistrictSection from './DistrictSection'
import DivisionSection from './DivisionSection'
import EnrollmentSection from './EnrollmentSection'
import './SummaryPage.css'

// One download per page load; the page remounts on every visit.
let summaryRequest: Promise<SummaryResponse> | undefined

function loadSummary(token: string) {
  summaryRequest ??= getSummary(token).then(
    (summary) => summary,
    (error: unknown) => {
      summaryRequest = undefined
      throw error
    },
  )
  return summaryRequest
}

type SummaryState = { status: 'loading' } | { status: 'ready'; summary: SummaryResponse } | { status: 'error' }

export default function SummaryPage() {
  const { session, signOut } = useSession()
  const accessToken = session?.accessToken
  const [state, setState] = useState<SummaryState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    loadSummary(accessToken)
      .then((summary) => {
        if (active) setState({ status: 'ready', summary })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) signOut()
        else setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [accessToken, signOut, attempt])

  return (
    <div className="page-body page-body--wide">
      <header className="page-header">
        <h1>Summary</h1>
        {state.status === 'ready' && state.summary.syncedAt && (
          <p className="page-header__meta">EMA data as of {formatDateTime(state.summary.syncedAt)}</p>
        )}
      </header>

      {state.status === 'loading' && (
        <section className="glass empty-state" role="status">
          <p>Loading summary…</p>
        </section>
      )}
      {state.status === 'error' && (
        <section className="glass empty-state" role="alert">
          <p>Couldn't load the summary.</p>
          <button
            className="button button--quiet summary-retry"
            type="button"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((count) => count + 1)
            }}
          >
            Retry
          </button>
        </section>
      )}
      {state.status === 'ready' && accessToken && (
        <SummaryContent summary={state.summary} accessToken={accessToken} onUnauthorized={signOut} />
      )}
    </div>
  )
}

interface SummaryContentProps {
  summary: SummaryResponse
  accessToken: string
  onUnauthorized: () => void
}

function SummaryContent({ summary, accessToken, onUnauthorized }: SummaryContentProps) {
  const cells = useMemo(() => toCells(summary), [summary])
  const divisionOf = useMemo(
    () => new Map(summary.divisions.flatMap((group) => group.districts.map((name) => [name, group.division] as const))),
    [summary.divisions],
  )

  // The filters live in the URL, so a filtered view can be bookmarked or shared.
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedDistrict = searchParams.get('district')
  const district = requestedDistrict && divisionOf.has(requestedDistrict) ? requestedDistrict : null
  const requestedDivision = district ? (divisionOf.get(district) ?? null) : searchParams.get('division')
  const division = summary.divisions.some((group) => group.division === requestedDivision) ? requestedDivision : null

  const scoped = useMemo(() => {
    if (district) return cells.filter((cell) => cell.place === district)
    if (division) return cells.filter((cell) => divisionOf.get(cell.place) === division)
    return cells
  }, [cells, district, division, divisionOf])

  const scopeLabel = district
    ? `${displayName(district)} district`
    : division
      ? `${division} division`
      : 'Khyber Pakhtunkhwa'

  function setScope(next: { division?: string | null; district?: string | null }) {
    const params = new URLSearchParams()
    if (next.district) params.set('district', next.district)
    else if (next.division) params.set('division', next.division)
    setSearchParams(params, { replace: true })
  }

  const districtOptions = division
    ? (summary.divisions.find((group) => group.division === division)?.districts ?? [])
    : summary.divisions.flatMap((group) => group.districts)

  return (
    <>
      <div className="glass filters">
        <label className="select-field">
          <span>Division</span>
          <select value={division ?? ''} onChange={(event) => setScope({ division: event.target.value || null })}>
            <option value="">All divisions</option>
            {summary.divisions.map((group) => (
              <option key={group.division} value={group.division}>
                {group.division}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>District</span>
          <select
            value={district ?? ''}
            onChange={(event) => setScope({ division, district: event.target.value || null })}
          >
            <option value="">{division ? `All of ${division}` : 'All districts'}</option>
            {[...districtOptions]
              .sort((a, b) => displayName(a).localeCompare(displayName(b)))
              .map((name) => (
                <option key={name} value={name}>
                  {displayName(name)}
                </option>
              ))}
          </select>
        </label>
        {(division || district) && (
          <button className="button button--quiet button--compact" type="button" onClick={() => setScope({})}>
            Clear
          </button>
        )}
      </div>

      <section className="summary-section" aria-labelledby="overview-heading">
        <h2 id="overview-heading">{scopeLabel}</h2>
        <div className="summary">
          <Cards cells={scoped} />
        </div>
      </section>

      <DivisionSection cells={cells} divisions={summary.divisions} selected={division} />

      <DistrictSection
        cells={cells}
        divisions={summary.divisions}
        division={division}
        district={district}
        scopeLabel={division ? `${division} division` : 'Khyber Pakhtunkhwa'}
        accessToken={accessToken}
        onUnauthorized={onUnauthorized}
      />

      <EnrollmentSection cells={scoped} scopeLabel={scopeLabel} />
    </>
  )
}
