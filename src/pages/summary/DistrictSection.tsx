import { Search, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, type Ratio } from '../../api'
import { formatDecimal } from '../../format'
import { type BarItem, BarList, DataTable, Dumbbell } from './charts'
import { add, type Cell, type Division, GENDERS, type Metrics, ratio, share, summarize, toCells } from './data'
import { Figure, Panel, Segmented } from './parts'
import { divisionColumn, nameColumn, type PlaceRow, placeRows, TABLE_VIEWS } from './places'
import { loadTehsils } from './tehsils'

interface Ranking {
  key: string
  label: string
  /** Share metrics show as percentages; others as whole numbers. */
  ratio?: (metrics: Metrics) => Ratio
  value?: (metrics: Metrics) => number | null
}

const RANKINGS: Ranking[] = [
  { key: 'labs', label: 'Schools with an IT lab', ratio: (m) => m.labCoverage },
  { key: 'computer', label: 'Schools with a working computer', ratio: (m) => m.schoolsWithWorkingComputer },
  { key: 'internet', label: 'Schools with internet', ratio: (m) => m.schoolsWithInternet },
  { key: 'teacher', label: 'Schools with an IT teacher', ratio: (m) => m.schoolsWithTeacher },
  { key: 'reached', label: 'Students in schools with an IT lab', ratio: (m) => m.studentsReached },
  { key: 'secondary', label: 'Secondary schools with an IT lab', ratio: (m) => m.secondaryLabCoverage },
  { key: 'working', label: 'Computers that work', ratio: (m) => m.workingComputers },
  { key: 'retention', label: 'Class 10 students as a share of Class 1', ratio: (m) => m.classTenRetention },
  { key: 'small', label: 'Schools with 1 to 49 students', ratio: (m) => m.smallSchools },
  { key: 'perComputer', label: 'Class 6–12 students per working lab computer', value: (m) => m.studentsPerWorkingLabComputer },
]

function rankingValue(ranking: Ranking, metrics: Metrics) {
  return ranking.ratio ? share(ranking.ratio(metrics)) : (ranking.value?.(metrics) ?? null)
}

/** Share rankings show the count with its share in brackets; the bars themselves are the shares. */
function rankingDisplay(ranking: Ranking, metrics: Metrics): ReactNode {
  if (ranking.ratio) return <Figure ratio={ranking.ratio(metrics)} />
  const value = ranking.value?.(metrics) ?? null
  return value === null ? '–' : formatDecimal(value, 0)
}

interface DistrictSectionProps {
  cells: Cell[]
  divisions: Division[]
  division: string | null
  district: string | null
  scopeLabel: string
  accessToken: string
  onUnauthorized: () => void
}

export default function DistrictSection(props: DistrictSectionProps) {
  const { cells, divisions, division, district, scopeLabel, accessToken, onUnauthorized } = props
  const [rankingKey, setRankingKey] = useState(RANKINGS[0].key)
  const [viewKey, setViewKey] = useState(TABLE_VIEWS[0].key)
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<PlaceRow | null>(null)

  const divisionOf = useMemo(
    () => new Map(divisions.flatMap((group) => group.districts.map((name) => [name, group.division] as const))),
    [divisions],
  )
  const scoped = useMemo(
    () => (division ? cells.filter((cell) => divisionOf.get(cell.place) === division) : cells),
    [cells, division, divisionOf],
  )
  const rows = useMemo(() => placeRows(scoped, (place) => divisionOf.get(place) ?? 'Unassigned'), [scoped, divisionOf])
  const reference = useMemo(() => summarize(scoped).metrics, [scoped])

  const ranking = RANKINGS.find((entry) => entry.key === rankingKey) ?? RANKINGS[0]
  const ranked = rows
    .map((row) => ({ row, value: rankingValue(ranking, row.metrics) }))
    .filter((entry): entry is { row: PlaceRow; value: number } => entry.value !== null)
    .sort((a, b) => b.value - a.value)
  const referenceValue = rankingValue(ranking, reference)
  const max = Math.max(referenceValue ?? 0, ...ranked.map((entry) => entry.value))
  const toBar = ({ row, value }: { row: PlaceRow; value: number }): BarItem => ({
    key: row.key,
    label: row.name,
    value,
    display: rankingDisplay(ranking, row.metrics),
    emphasized: row.key === district,
  })
  const barReference =
    referenceValue === null
      ? undefined
      : {
          value: referenceValue,
          label: (
            <>
              {scopeLabel}: {rankingDisplay(ranking, reference)}
            </>
          ),
        }
  // Up to 12 districts fit one list; more are shown as the highest and lowest 10.
  const split = ranked.length > 12

  const genderGap = rows
    .map((row) => {
      const placeCells = scoped.filter((cell) => cell.place === row.key)
      const [girls, boys] = GENDERS.map((gender) => add(placeCells.filter((cell) => cell.gender === gender)))
      const first = ratio(girls.labs, girls.schools)
      const second = ratio(boys.labs, boys.schools)
      return { row, first, second, gap: (share(first) ?? 0) - (share(second) ?? 0) }
    })
    .sort((a, b) => a.gap - b.gap)

  const view = TABLE_VIEWS.find((entry) => entry.key === viewKey) ?? TABLE_VIEWS[0]
  const needle = query.trim().toLowerCase()
  const tableRows = needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows

  return (
    <section className="summary-section" aria-labelledby="districts-heading">
      <h2 id="districts-heading">Districts{division ? ` of ${division} division` : ''}</h2>
      <div className="panel-grid">
        <Panel
          wide
          title="District rankings"
          description={ranking.ratio ? `${ranking.label}, out of all in each district` : ranking.label}
          actions={
            <label className="select-field">
              <span className="visually-hidden">Rank districts by</span>
              <select value={rankingKey} onChange={(event) => setRankingKey(event.target.value)}>
                {RANKINGS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          {split ? (
            <div className="rankings">
              <div>
                <h4 className="rankings__title">Highest 10</h4>
                <BarList items={ranked.slice(0, 10).map(toBar)} max={max} reference={barReference} />
              </div>
              <div>
                <h4 className="rankings__title">Lowest 10</h4>
                <BarList items={ranked.slice(-10).reverse().map(toBar)} max={max} reference={barReference} />
              </div>
            </div>
          ) : (
            <BarList items={ranked.map(toBar)} max={max} reference={barReference} />
          )}
        </Panel>

        <Panel
          wide
          title="Girls' and boys' schools with an IT lab, by district"
          description="Out of all girls' schools and all boys' schools in each district; largest shortfall for girls first"
        >
          <Dumbbell
            labels={["Girls' schools", "Boys' schools"]}
            items={genderGap.map(({ row, first, second }) => ({
              key: row.key,
              label: row.name,
              first,
              second,
              emphasized: row.key === district,
            }))}
          />
        </Panel>

        <Panel
          wide
          title="All districts"
          description="Each figure has its share in brackets, out of all schools or out of the students, labs, computers or IT teachers the column counts; hover a figure for its base. Open a district for its tehsils."
          actions={
            <div className="table-tools">
              <label className="search-field">
                <Search size={16} strokeWidth={2} aria-hidden="true" />
                <span className="visually-hidden">Find a district</span>
                <input
                  type="search"
                  placeholder="Find a district"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <Segmented label="Columns" options={TABLE_VIEWS} value={viewKey} onChange={setViewKey} />
            </div>
          }
        >
          <DataTable
            key={view.key}
            caption={`Districts: ${view.label}`}
            rows={tableRows}
            columns={[nameColumn('District', setOpened), divisionColumn, ...view.columns]}
            rowKey={(row) => row.key}
            initialSort={{ key: view.columns[0].key, descending: true }}
            emphasizedKey={district}
          />
          {tableRows.length === 0 && <p className="panel__empty">No district matches “{query}”.</p>}
        </Panel>
      </div>

      <TehsilDialog
        district={opened}
        accessToken={accessToken}
        onClose={() => setOpened(null)}
        onUnauthorized={onUnauthorized}
      />
    </section>
  )
}

/* Tehsils -------------------------------------------------------------------------------------- */

interface TehsilDialogProps {
  district: PlaceRow | null
  accessToken: string
  onClose: () => void
  onUnauthorized: () => void
}

function TehsilDialog({ district, accessToken, onClose, onUnauthorized }: TehsilDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (district && !dialog.open) dialog.showModal()
    if (!district && dialog.open) dialog.close()
  }, [district])

  return (
    <dialog ref={ref} className="glass dialog dialog--wide" aria-labelledby="tehsils-title" onClose={onClose}>
      {district && (
        <>
          <header className="dialog__header">
            <h2 id="tehsils-title">{district.name}: tehsils</h2>
            <button className="icon-button" type="button" aria-label="Close" onClick={() => ref.current?.close()}>
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>
          <TehsilTable
            key={district.key}
            district={district.key}
            accessToken={accessToken}
            onUnauthorized={onUnauthorized}
          />
        </>
      )}
    </dialog>
  )
}

type TehsilState = { status: 'loading' } | { status: 'ready'; rows: PlaceRow[] } | { status: 'error' }

function TehsilTable({ district, accessToken, onUnauthorized }: { district: string; accessToken: string; onUnauthorized: () => void }) {
  const [state, setState] = useState<TehsilState>({ status: 'loading' })
  const [viewKey, setViewKey] = useState(TABLE_VIEWS[0].key)

  useEffect(() => {
    let active = true
    loadTehsils(accessToken, district)
      .then((data) => {
        if (active) setState({ status: 'ready', rows: placeRows(toCells(data)) })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) onUnauthorized()
        else setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [accessToken, district, onUnauthorized])

  const view = TABLE_VIEWS.find((entry) => entry.key === viewKey) ?? TABLE_VIEWS[0]

  if (state.status === 'loading') return <p className="panel__empty">Loading tehsils…</p>
  if (state.status === 'error') return <p className="panel__empty">Couldn't load the tehsils. Close and try again.</p>

  return (
    <div className="dialog__body">
      <Segmented label="Columns" options={TABLE_VIEWS} value={viewKey} onChange={setViewKey} />
      <DataTable
        key={view.key}
        caption={`Tehsils: ${view.label}`}
        rows={state.rows}
        columns={[nameColumn('Tehsil'), ...view.columns]}
        rowKey={(row) => row.key}
        initialSort={{ key: view.columns[0].key, descending: true }}
      />
    </div>
  )
}
