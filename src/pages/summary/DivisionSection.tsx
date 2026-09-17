import { formatNumber } from '../../format'
import { ratioRow } from './chart-tooltip'
import { BarList, type Column, DataTable, Dumbbell, Heatmap, StackedBars } from './charts'
import {
  add,
  type Cell,
  COMPUTER_STATES,
  computerStateCounts,
  DESIGNATIONS,
  designationCounts,
  type Division,
  GENDERS,
  LEVELS,
  ratio,
  share,
  summarize,
} from './data'
import { Figure, Panel } from './parts'
import { figure, nameColumn, type PlaceRow } from './places'

const scorecardColumns: Column<PlaceRow>[] = [
  nameColumn('Division'),
  {
    key: 'districts',
    label: 'Districts',
    numeric: true,
    sortValue: (row) => row.districtCount ?? 0,
    render: (row) => row.districtCount,
  },
  {
    key: 'schools',
    label: 'Schools',
    numeric: true,
    sortValue: (row) => row.counts.schools,
    render: (row) => formatNumber(row.counts.schools),
  },
  {
    key: 'students',
    label: 'Students',
    numeric: true,
    sortValue: (row) => row.metrics.students,
    render: (row) => formatNumber(row.metrics.students),
  },
  figure('labs', 'With IT lab', (row) => row.metrics.labCoverage),
  {
    key: 'computers',
    label: 'Computers',
    numeric: true,
    sortValue: (row) => row.counts.computers,
    render: (row) => formatNumber(row.counts.computers),
  },
  figure('working', 'Computers working', (row) => row.metrics.workingComputers),
  figure('computer', 'With working computer', (row) => row.metrics.schoolsWithWorkingComputer),
  figure('internet', 'With internet', (row) => row.metrics.schoolsWithInternet),
  figure('teacher', 'With IT teacher', (row) => row.metrics.schoolsWithTeacher),
  figure('reached', 'Students in lab schools', (row) => row.metrics.studentsReached),
]

interface DivisionSectionProps {
  cells: Cell[]
  divisions: Division[]
  selected: string | null
}

export default function DivisionSection({ cells, divisions, selected }: DivisionSectionProps) {
  const groups = divisions
    .map(({ division, districts }) => {
      const places = new Set(districts)
      return { division, districts, cells: cells.filter((cell) => places.has(cell.place)) }
    })
    .filter((group) => group.cells.length > 0)

  const rows: PlaceRow[] = groups.map((group) => ({
    key: group.division,
    name: group.division,
    districtCount: group.districts.length,
    ...summarize(group.cells),
  }))
  const province: PlaceRow = {
    key: 'province',
    name: 'Khyber Pakhtunkhwa',
    districtCount: divisions.reduce((total, group) => total + group.districts.length, 0),
    ...summarize(cells),
  }

  const coverage = rows
    .map((row) => ({ row, value: share(row.metrics.labCoverage) ?? 0 }))
    .sort((a, b) => b.value - a.value)
  const provinceCoverage = share(province.metrics.labCoverage) ?? 0

  const byDivisionLevel = new Map(
    groups.flatMap((group) =>
      LEVELS.map((level) => [`${group.division}|${level}`, add(group.cells.filter((cell) => cell.level === level))] as const),
    ),
  )

  return (
    <section className="summary-section" aria-labelledby="divisions-heading">
      <h2 id="divisions-heading">Divisions</h2>
      <div className="panel-grid">
        <Panel
          wide
          title="Division scorecard"
          description="Each figure has its share in brackets, out of all schools in each division; for computers working, out of all computers; for students in lab schools, out of all students."
        >
          <DataTable
            caption="Division scorecard"
            rows={rows}
            columns={scorecardColumns}
            rowKey={(row) => row.key}
            initialSort={{ key: 'schools', descending: true }}
            footerRow={province}
            emphasizedKey={selected}
          />
        </Panel>

        <Panel title="Schools with an IT lab" description="Out of all schools in each division">
          <BarList
            items={coverage.map(({ row, value }) => ({
              key: row.key,
              label: row.name,
              value,
              display: <Figure ratio={row.metrics.labCoverage} baseOnHover={false} />,
              tip: {
                title: row.name,
                rows: [ratioRow('labs', row.metrics.labCoverage, (total) => `of ${total} schools have an IT lab`)],
              },
              emphasized: row.key === selected,
            }))}
            max={Math.max(provinceCoverage, ...coverage.map(({ value }) => value))}
            reference={{
              value: provinceCoverage,
              label: (
                <>
                  Khyber Pakhtunkhwa: <Figure ratio={province.metrics.labCoverage} />
                </>
              ),
            }}
          />
        </Panel>

        <Panel title="IT lab coverage by school level" description="Schools with an IT lab, out of all schools of that level">
          <Heatmap
            rowHeader="Division"
            rows={groups.map((group) => ({ key: group.division, label: group.division, emphasized: group.division === selected }))}
            columns={LEVELS.map((level) => ({ key: level, label: level }))}
            cell={(division, level) => {
              const counts = byDivisionLevel.get(`${division}|${level}`)
              return counts && counts.schools ? ratio(counts.labs, counts.schools) : null
            }}
            describe={(total) => `of ${total} schools have an IT lab`}
            emptyNote="No schools of this level"
          />
        </Panel>

        <Panel
          wide
          title="Girls' and boys' schools with an IT lab"
          description="Out of all girls' schools and all boys' schools in each division"
        >
          <Dumbbell
            labels={["Girls' schools", "Boys' schools"]}
            measure="have an IT lab"
            items={groups.map((group) => {
              const [girls, boys] = GENDERS.map((gender) => add(group.cells.filter((cell) => cell.gender === gender)))
              return {
                key: group.division,
                label: group.division,
                first: ratio(girls.labs, girls.schools),
                second: ratio(boys.labs, boys.schools),
                emphasized: group.division === selected,
              }
            })}
          />
        </Panel>

        <Panel
          title="IT teachers by designation"
          description="IT teachers in each division, with their share of all IT teachers in brackets. Hover or tap a bar for each designation."
        >
          <StackedBars
            unit="IT teachers"
            scope="Khyber Pakhtunkhwa"
            series={DESIGNATIONS}
            items={rows.map((row) => ({
              key: row.key,
              label: row.name,
              values: designationCounts(row.counts),
              emphasized: row.key === selected,
            }))}
          />
        </Panel>

        <Panel
          title="Computers, working and not working"
          description="Computers in each division, with their share of all computers in brackets. Hover or tap a bar for working and not working."
        >
          <StackedBars
            unit="computers"
            scope="Khyber Pakhtunkhwa"
            series={COMPUTER_STATES}
            items={rows.map((row) => ({
              key: row.key,
              label: row.name,
              values: computerStateCounts(row.counts),
              emphasized: row.key === selected,
            }))}
          />
        </Panel>
      </div>
    </section>
  )
}
