import { ChevronRight } from 'lucide-react'
import type { Ratio } from '../../api'
import { formatDecimal, formatNumber, formatPercent } from '../../format'
import type { Column } from './charts'
import { type Cell, type Counts, displayName, type Metrics, share, summarize } from './data'

/** One district, tehsil or division with its counts and figures. */
export interface PlaceRow {
  key: string
  name: string
  division?: string
  /** Divisions only. */
  districtCount?: number
  counts: Counts
  metrics: Metrics
}

/** Adds cells up per place, in the order places first appear. */
export function placeRows(cells: Cell[], divisionOf?: (place: string) => string): PlaceRow[] {
  const byPlace = new Map<string, Cell[]>()
  for (const cell of cells) byPlace.set(cell.place, [...(byPlace.get(cell.place) ?? []), cell])
  return [...byPlace].map(([key, group]) => ({
    key,
    name: displayName(key),
    division: divisionOf?.(key),
    ...summarize(group),
  }))
}

const count = (key: string, label: string, pick: (row: PlaceRow) => number): Column<PlaceRow> => ({
  key,
  label,
  numeric: true,
  sortValue: pick,
  render: (row) => formatNumber(pick(row)),
})

const percent = (key: string, label: string, pick: (row: PlaceRow) => Ratio): Column<PlaceRow> => ({
  key,
  label,
  numeric: true,
  sortValue: (row) => share(pick(row)),
  render: (row) => {
    const ratio = pick(row)
    return <span title={`${formatNumber(ratio.value)} of ${formatNumber(ratio.total)}`}>{formatPercent(ratio)}</span>
  },
})

const decimal = (key: string, label: string, pick: (row: PlaceRow) => number | null): Column<PlaceRow> => ({
  key,
  label,
  numeric: true,
  sortValue: pick,
  render: (row) => {
    const value = pick(row)
    return value === null ? '–' : formatDecimal(value, 0)
  },
})

/** The table's column sets. Percentages are out of all schools unless the label names another base. */
export const TABLE_VIEWS: { key: string; label: string; columns: Column<PlaceRow>[] }[] = [
  {
    key: 'overview',
    label: 'Overview',
    columns: [
      count('schools', 'Schools', (row) => row.counts.schools),
      count('students', 'Students', (row) => row.metrics.students),
      percent('labs', 'With IT lab', (row) => row.metrics.labCoverage),
      percent('computer', 'With working computer', (row) => row.metrics.schoolsWithWorkingComputer),
      percent('internet', 'With internet', (row) => row.metrics.schoolsWithInternet),
      percent('teacher', 'With IT teacher', (row) => row.metrics.schoolsWithTeacher),
      percent('reached', 'Students in lab schools', (row) => row.metrics.studentsReached),
    ],
  },
  {
    key: 'labs',
    label: 'IT labs',
    columns: [
      count('labCount', 'IT labs', (row) => row.counts.labs),
      percent('secondary', 'Secondary schools with lab', (row) => row.metrics.secondaryLabCoverage),
      count('computers', 'Computers', (row) => row.counts.computers),
      percent('working', 'Computers working', (row) => row.metrics.workingComputers),
      percent('labWorking', 'Labs with working computer', (row) => row.metrics.labsWithWorkingComputer),
      percent('labAllWorking', 'Labs with all working', (row) => row.metrics.labsAllComputersWorking),
      percent('labInternet', 'Labs with internet', (row) => row.metrics.labsWithInternet),
      decimal('perComputer', 'Class 6–12 per working computer', (row) => row.metrics.studentsPerWorkingLabComputer),
    ],
  },
  {
    key: 'teachers',
    label: 'IT teachers',
    columns: [
      count('teachers', 'IT teachers', (row) => row.counts.teachers),
      count('schoolsWithTeacher', 'Schools with teacher', (row) => row.counts.schoolsWithTeacher),
      percent('labTeacher', 'Labs with teacher', (row) => row.metrics.labsWithTeacher),
      percent('posted', 'Posted to lab schools', (row) => row.metrics.teachersInLabSchools),
      count('labsWithout', 'Labs without teacher', (row) => row.counts.labs - row.counts.labsWithTeacher),
      count('noLab', 'Teacher but no lab', (row) => row.counts.schoolsWithTeacherButNoLab),
      count('ct', 'CT (IT)', (row) => row.counts.teachersCt),
      count('sst', 'SST (IT)', (row) => row.counts.teachersSst),
      count('specialist', 'Subject Specialist', (row) => row.counts.teachersSubjectSpecialist),
    ],
  },
  {
    key: 'enrollment',
    label: 'Enrollment',
    columns: [
      count('studentsAll', 'Students', (row) => row.metrics.students),
      count('class1', 'Class 1', (row) => row.counts.enrollment[2]),
      count('class10', 'Class 10', (row) => row.counts.enrollment[11]),
      count('class12', 'Class 12', (row) => row.counts.enrollment[13]),
      percent('retention', 'Class 10 of Class 1', (row) => row.metrics.classTenRetention),
      count('empty', 'Schools with no students', (row) => row.counts.emptySchools),
      count('small', 'Schools with 1–49', (row) => row.counts.smallSchools),
    ],
  },
  {
    key: 'quality',
    label: 'Data quality',
    columns: [
      count('schoolsAll', 'Schools', (row) => row.counts.schools),
      percent('enrollmentReported', 'Enrollment reported', (row) => row.metrics.enrollmentReported),
      percent('locationKnown', 'Location known', (row) => row.metrics.locationKnown),
      percent('labStatus', 'IT lab status reported', (row) => row.metrics.labStatusReported),
    ],
  },
]

/** The first column: the place's name, as a button when the place can be opened. */
export function nameColumn(label: string, onOpen?: (row: PlaceRow) => void): Column<PlaceRow> {
  return {
    key: 'name',
    label,
    sortValue: (row) => row.name,
    render: (row) =>
      onOpen ? (
        <button className="link-button" type="button" onClick={() => onOpen(row)}>
          {row.name}
          <ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : (
        <span className="place-name">{row.name}</span>
      ),
  }
}

export const divisionColumn: Column<PlaceRow> = {
  key: 'division',
  label: 'Division',
  sortValue: (row) => row.division ?? '',
  render: (row) => row.division,
}
