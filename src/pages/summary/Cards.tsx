import { GraduationCap, Monitor, School, Users } from 'lucide-react'
import { formatDecimal, formatNumber } from '../../format'
import { addBy, type Cell, GENDERS, LEVELS, ratio, summarize } from './data'
import { Note, RatioRow, Section, StatRow, SummaryCard } from './parts'

const genderLabel = (gender: string) => `${gender}' schools`

/** The four headline cards. Every headline is out of all schools (or all students) in scope. */
export default function Cards({ cells }: { cells: Cell[] }) {
  const { counts, metrics } = summarize(cells)
  const byLevel = addBy(cells, (cell) => cell.level, LEVELS)
  const byGender = addBy(cells, (cell) => cell.gender, GENDERS).map(({ key, counts: group }) => ({
    key,
    counts: group,
    metrics: summarize(cells.filter((cell) => cell.gender === key)).metrics,
  }))
  const labsWithoutTeacher = counts.labs - counts.labsWithTeacher
  const perLab = (value: number | null) => (value === null ? '–' : formatDecimal(value))

  return (
    <div className="summary-grid">
      <SummaryCard
        icon={School}
        title="IT lab coverage"
        headline={metrics.labCoverage}
        caption="schools have an IT lab"
      >
        <Section title="By level">
          {byLevel.map(({ key, counts: level }) => (
            <RatioRow key={key} label={key} ratio={ratio(level.labs, level.schools)} />
          ))}
        </Section>
        <Section title="By gender">
          {byGender.map(({ key, counts: gender }) => (
            <RatioRow key={key} label={genderLabel(key)} ratio={ratio(gender.labs, gender.schools)} />
          ))}
        </Section>
        <Section title="Secondary schools">
          <RatioRow label="High and Higher Secondary schools" ratio={metrics.secondaryLabCoverage} />
        </Section>
      </SummaryCard>

      <SummaryCard
        icon={Monitor}
        title="Computers and internet"
        headline={metrics.schoolsWithWorkingComputer}
        caption="schools have a working computer"
      >
        <Section title="Computers">
          <StatRow label="Computers" value={formatNumber(counts.computers)} />
          <RatioRow label="Computers that work" ratio={metrics.workingComputers} />
          <StatRow label="Computers per IT lab" value={perLab(metrics.computersPerLab)} />
          <StatRow label="Working computers per IT lab" value={perLab(metrics.workingComputersPerLab)} />
        </Section>
        <Section title="Internet">
          <RatioRow label="Schools with internet" ratio={metrics.schoolsWithInternet} />
          <RatioRow label="IT labs with internet, of labs that reported" ratio={metrics.labsWithInternet} />
        </Section>
        <Section title="IT labs">
          <RatioRow label="With a working computer" ratio={metrics.labsWithWorkingComputer} />
          <RatioRow label="With every computer working" ratio={metrics.labsAllComputersWorking} />
        </Section>
        <Section title="Working computers by level">
          {byLevel
            .filter(({ counts: level }) => level.computers > 0)
            .map(({ key, counts: level }) => (
              <RatioRow key={key} label={key} ratio={ratio(level.workingComputers, level.computers)} />
            ))}
        </Section>
      </SummaryCard>

      <SummaryCard
        icon={GraduationCap}
        title="IT teachers"
        headline={metrics.schoolsWithTeacher}
        caption="schools have an IT teacher"
      >
        <Section title="IT labs and postings">
          <RatioRow label="IT labs with an IT teacher" ratio={metrics.labsWithTeacher} />
          <RatioRow label="IT teachers posted to schools with a lab" ratio={metrics.teachersInLabSchools} />
        </Section>
        <Section title="By designation">
          <RatioRow label="CT (IT)" ratio={ratio(counts.teachersCt, counts.teachers)} />
          <RatioRow label="SST (IT)" ratio={ratio(counts.teachersSst, counts.teachers)} />
          <RatioRow label="Subject Specialist (IT)" ratio={ratio(counts.teachersSubjectSpecialist, counts.teachers)} />
        </Section>
        <Section title="Schools with an IT teacher, by level">
          {byLevel.map(({ key, counts: level }) => (
            <RatioRow key={key} label={key} ratio={ratio(level.schoolsWithTeacher, level.schools)} />
          ))}
        </Section>
        <Section title="Gaps">
          <StatRow label="IT labs without an IT teacher" value={labsWithoutTeacher.toLocaleString('en-US')} />
          <StatRow
            label="Schools with an IT teacher but no IT lab"
            value={counts.schoolsWithTeacherButNoLab.toLocaleString('en-US')}
          />
        </Section>
      </SummaryCard>

      <SummaryCard
        icon={Users}
        title="Students and data"
        headline={metrics.studentsReached}
        caption="students study in a school with an IT lab"
      >
        <Section title="Students">
          <RatioRow label="Class 6–12 students in schools with an IT lab" ratio={metrics.classSixToTwelveReached} />
          {byGender.map(({ key, metrics: gender }) => (
            <RatioRow key={key} label={`Students of ${genderLabel(key).toLowerCase()}`} ratio={gender.studentsReached} />
          ))}
          <StatRow
            label="Class 6–12 students per working lab computer"
            value={metrics.studentsPerWorkingLabComputer === null ? '–' : formatDecimal(metrics.studentsPerWorkingLabComputer, 0)}
          />
        </Section>
        <Section title="School size, of schools that reported enrollment">
          <RatioRow label="No students" ratio={metrics.emptySchools} />
          <RatioRow label="1 to 49 students" ratio={metrics.smallSchools} />
        </Section>
        <Section title="Data completeness">
          <RatioRow label="Enrollment reported" ratio={metrics.enrollmentReported} />
          <RatioRow label="Location known" ratio={metrics.locationKnown} />
          <RatioRow label="IT lab status reported" ratio={metrics.labStatusReported} />
        </Section>
        <Note>Students in a school with an IT lab are counted whether or not the lab is working.</Note>
      </SummaryCard>
    </div>
  )
}
