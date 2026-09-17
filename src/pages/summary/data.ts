import type { Ratio, SummaryCells, SummaryResponse } from '../../api'

export const LEVELS = ['Primary', 'Middle', 'High', 'Higher Secondary', 'Mosque']
const SECONDARY_LEVELS = new Set(['High', 'Higher Secondary'])
export const GENDERS = ['Girls', 'Boys']
export const CLASSES = ['Nursery', 'Prep', ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`)]
const CLASS_1 = 2
const CLASS_6 = 7
const CLASS_10 = 11

const COUNT_FIELDS = [
  'schools',
  'labs',
  'computers',
  'workingComputers',
  'labComputers',
  'labWorkingComputers',
  'schoolsWithWorkingComputer',
  'labsWithWorkingComputer',
  'labsAllComputersWorking',
  'schoolsWithInternet',
  'labsWithInternet',
  'labsReportingInternet',
  'teachers',
  'teachersInLabSchools',
  'schoolsWithTeacher',
  'labsWithTeacher',
  'schoolsWithTeacherButNoLab',
  'teachersCt',
  'teachersSst',
  'teachersSubjectSpecialist',
  'studentsInLabSchools',
  'classSixToTwelveInLabSchools',
  'emptySchools',
  'smallSchools',
  'enrollmentReported',
  'locationKnown',
  'labStatusReported',
] as const

export type Counts = Record<(typeof COUNT_FIELDS)[number], number> & {
  /** Students per class, in CLASSES order. */
  enrollment: number[]
}

/** Counts for one place (district or tehsil), level and gender. */
export type Cell = Counts & { place: string; level: string; gender: string }

export type Division = SummaryResponse['divisions'][number]

/** Turns the API's compact rows back into objects. */
export function toCells({ fields, rows }: SummaryCells): Cell[] {
  return rows.map((row) => Object.fromEntries(fields.map((field, index) => [field, row[index]])) as Cell)
}

/** Adds cells up. */
export function add(cells: Cell[]): Counts {
  const counts = { enrollment: CLASSES.map(() => 0) } as Counts
  for (const field of COUNT_FIELDS) counts[field] = 0
  for (const cell of cells) {
    for (const field of COUNT_FIELDS) counts[field] += cell[field]
    cell.enrollment.forEach((students, index) => {
      counts.enrollment[index] += students
    })
  }
  return counts
}

/** Adds cells up per key, keeping the order in which keys are listed or first seen. */
export function addBy(cells: Cell[], keyOf: (cell: Cell) => string, order: string[] = []) {
  const groups = new Map<string, Cell[]>(order.map((key) => [key, []]))
  for (const cell of cells) {
    const key = keyOf(cell)
    groups.set(key, [...(groups.get(key) ?? []), cell])
  }
  return [...groups]
    .filter(([, group]) => group.length > 0)
    .map(([key, group]) => ({ key, counts: add(group) }))
}

export const isSecondary = (cell: Cell) => SECONDARY_LEVELS.has(cell.level)

const sum = (numbers: number[]) => numbers.reduce((total, value) => total + value, 0)

export const ratio = (value: number, total: number): Ratio => ({ value, total })

export const share = ({ value, total }: Ratio) => (total ? value / total : null)

/** The figures the page shows for a set of cells, beyond the raw counts. */
export function metrics(counts: Counts, secondary: Counts) {
  const students = sum(counts.enrollment)
  const classSixToTwelve = sum(counts.enrollment.slice(CLASS_6))
  return {
    students,
    secondaryLabCoverage: ratio(secondary.labs, secondary.schools),
    labCoverage: ratio(counts.labs, counts.schools),
    schoolsWithWorkingComputer: ratio(counts.schoolsWithWorkingComputer, counts.schools),
    workingComputers: ratio(counts.workingComputers, counts.computers),
    labsWithWorkingComputer: ratio(counts.labsWithWorkingComputer, counts.labs),
    labsAllComputersWorking: ratio(counts.labsAllComputersWorking, counts.labs),
    schoolsWithInternet: ratio(counts.schoolsWithInternet, counts.schools),
    labsWithInternet: ratio(counts.labsWithInternet, counts.labsReportingInternet),
    schoolsWithTeacher: ratio(counts.schoolsWithTeacher, counts.schools),
    labsWithTeacher: ratio(counts.labsWithTeacher, counts.labs),
    teachersInLabSchools: ratio(counts.teachersInLabSchools, counts.teachers),
    classSixToTwelveReached: ratio(counts.classSixToTwelveInLabSchools, classSixToTwelve),
    studentsReached: ratio(counts.studentsInLabSchools, students),
    studentsPerWorkingLabComputer: counts.labWorkingComputers
      ? counts.classSixToTwelveInLabSchools / counts.labWorkingComputers
      : null,
    computersPerLab: counts.labs ? counts.labComputers / counts.labs : null,
    workingComputersPerLab: counts.labs ? counts.labWorkingComputers / counts.labs : null,
    classTenRetention: ratio(counts.enrollment[CLASS_10], counts.enrollment[CLASS_1]),
    emptySchools: ratio(counts.emptySchools, counts.enrollmentReported),
    smallSchools: ratio(counts.smallSchools, counts.enrollmentReported),
    enrollmentReported: ratio(counts.enrollmentReported, counts.schools),
    locationKnown: ratio(counts.locationKnown, counts.schools),
    labStatusReported: ratio(counts.labStatusReported, counts.schools),
  }
}

export type Metrics = ReturnType<typeof metrics>

/** Counts and figures for a place, from its cells. */
export function summarize(cells: Cell[]) {
  const counts = add(cells)
  return { counts, metrics: metrics(counts, add(cells.filter(isSecondary))) }
}

/** District and tehsil names arrive in capitals ("D.I.KHAN", "TOWN III"). */
export function displayName(name: string) {
  return name
    .toLowerCase()
    .replace(/(^|[\s.(])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase())
    .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix)\b/g, (numeral) => numeral.toUpperCase())
}
