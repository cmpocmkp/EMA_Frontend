import { ChevronRight } from 'lucide-react'
import type { Ratio } from '../../api'
import { formatDecimal, formatNumber, formatPlaceName } from '../../format'
import type { Column } from './charts'
import { type Cell, type Counts, type Metrics, ratio, summarize } from './data'
import { Figure } from './parts'

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
    name: formatPlaceName(key),
    division: divisionOf?.(key),
    ...summarize(group),
  }))
}

export const count = (key: string, label: string, pick: (row: PlaceRow) => number): Column<PlaceRow> => ({
  key,
  label,
  numeric: true,
  sortValue: pick,
  render: (row) => formatNumber(pick(row)),
})

/** A count with its share in brackets, e.g. 134 (9.9%); sorts by the count, as that is the figure in front. */
export const figure = (key: string, label: string, pick: (row: PlaceRow) => Ratio): Column<PlaceRow> => ({
  key,
  label,
  numeric: true,
  sortValue: (row) => {
    const { value, total } = pick(row)
    return total ? value : null
  },
  render: (row) => <Figure ratio={pick(row)} />,
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

/** The table's column sets. Shares are out of all schools, or out of the students, labs, computers or IT teachers a column counts. */
export const TABLE_VIEWS: { key: string; label: string; columns: Column<PlaceRow>[] }[] = [
  {
    key: 'overview',
    label: 'Overview',
    columns: [
      count('schools', 'Schools', (row) => row.counts.schools),
      count('students', 'Students', (row) => row.metrics.students),
      figure('labs', 'With IT lab', (row) => row.metrics.labCoverage),
      count('computers', 'Computers', (row) => row.counts.computers),
      figure('working', 'Computers working', (row) => row.metrics.workingComputers),
      figure('computer', 'With working computer', (row) => row.metrics.schoolsWithWorkingComputer),
      figure('internet', 'With internet', (row) => row.metrics.schoolsWithInternet),
      figure('teacher', 'With IT teacher', (row) => row.metrics.schoolsWithTeacher),
      figure('reached', 'Students in lab schools', (row) => row.metrics.studentsReached),
    ],
  },
  {
    key: 'labs',
    label: 'IT labs',
    columns: [
      figure('labCount', 'IT labs', (row) => row.metrics.labCoverage),
      figure('secondary', 'Secondary schools with lab', (row) => row.metrics.secondaryLabCoverage),
      count('computers', 'Computers', (row) => row.counts.computers),
      figure('working', 'Computers working', (row) => row.metrics.workingComputers),
      figure('labWorking', 'Labs with working computer', (row) => row.metrics.labsWithWorkingComputer),
      figure('labAllWorking', 'Labs with all working', (row) => row.metrics.labsAllComputersWorking),
      figure('labInternet', 'Labs with internet', (row) => row.metrics.labsWithInternet),
      decimal('perComputer', 'Class 6–12 per working computer', (row) => row.metrics.studentsPerWorkingLabComputer),
    ],
  },
  {
    key: 'teachers',
    label: 'IT teachers',
    columns: [
      count('teachers', 'IT teachers', (row) => row.counts.teachers),
      figure('schoolsWithTeacher', 'Schools with teacher', (row) => row.metrics.schoolsWithTeacher),
      figure('labTeacher', 'Labs with teacher', (row) => row.metrics.labsWithTeacher),
      figure('posted', 'Posted to lab schools', (row) => row.metrics.teachersInLabSchools),
      figure('labsWithout', 'Labs without teacher', (row) => ratio(row.counts.labs - row.counts.labsWithTeacher, row.counts.labs)),
      figure('noLab', 'Teacher but no lab', (row) => ratio(row.counts.schoolsWithTeacherButNoLab, row.counts.schools)),
      figure('ct', 'CT (IT)', (row) => ratio(row.counts.teachersCt, row.counts.teachers)),
      figure('sst', 'SST (IT)', (row) => ratio(row.counts.teachersSst, row.counts.teachers)),
      figure('specialist', 'Subject Specialist', (row) => ratio(row.counts.teachersSubjectSpecialist, row.counts.teachers)),
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
      figure('retention', 'Class 10 of Class 1', (row) => row.metrics.classTenRetention),
      // Out of the schools that reported enrollment, as on the summary cards.
      figure('empty', 'Schools with no students', (row) => row.metrics.emptySchools),
      figure('small', 'Schools with 1–49', (row) => row.metrics.smallSchools),
    ],
  },
  {
    key: 'quality',
    label: 'Data quality',
    columns: [
      count('schoolsAll', 'Schools', (row) => row.counts.schools),
      figure('enrollmentReported', 'Enrollment reported', (row) => row.metrics.enrollmentReported),
      figure('locationKnown', 'Location known', (row) => row.metrics.locationKnown),
      figure('labStatus', 'IT lab status reported', (row) => row.metrics.labStatusReported),
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
