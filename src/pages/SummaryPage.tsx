import { GraduationCap, type LucideIcon, Monitor, School, Users } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { ApiError, getSummary, type Ratio, type Summary } from '../api'
import { formatDateTime, formatNumber, formatPercent } from '../format'
import { useSession } from '../session/session-context'
import './SummaryPage.css'

// One download per page load; the page remounts on every visit.
let summaryRequest: Promise<Summary> | undefined

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

type SummaryState = { status: 'loading' } | { status: 'ready'; summary: Summary } | { status: 'error' }

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
      {state.status === 'ready' && <SummaryCards summary={state.summary} />}
    </div>
  )
}

function SummaryCards({ summary }: { summary: Summary }) {
  const { labCoverage, labEquipment, itTeachers, studentReach, dataQuality } = summary
  const brokenComputers = labEquipment.workingComputers.total - labEquipment.workingComputers.value
  const labsWithoutTeacher = itTeachers.labsWithTeacher.total - itTeachers.labsWithTeacher.value

  return (
    <div className="summary">
      <div className="summary-grid">
        <SummaryCard
          icon={School}
          title="IT lab coverage"
          headline={labCoverage.secondarySchools}
          caption="secondary schools have an IT lab"
        >
          <Section title="By level">
            {labCoverage.byLevel.map((row) => (
              <RatioRow key={row.level} label={row.level} ratio={row} />
            ))}
          </Section>
          <Section title="Secondary schools by gender">
            {labCoverage.byGender.map((row) => (
              <RatioRow key={row.gender} label={`${row.gender}' schools`} ratio={row} />
            ))}
          </Section>
          <Note>
            {formatNumber(labCoverage.allSchools.value)} IT labs across all {formatNumber(labCoverage.allSchools.total)}{' '}
            schools ({formatPercent(labCoverage.allSchools)}).
          </Note>
        </SummaryCard>

        <SummaryCard
          icon={Monitor}
          title="Computers and internet"
          headline={labEquipment.workingComputers}
          caption="computers are working"
        >
          <Section title="IT labs">
            <RatioRow label="With a working computer" ratio={labEquipment.labsWithWorkingComputer} />
            <RatioRow label="With internet" ratio={labEquipment.labsWithInternet} />
          </Section>
          <Note>
            {formatNumber(brokenComputers)} computers are not working. Internet is out of the{' '}
            {formatNumber(labEquipment.labsWithInternet.total)} labs that reported it.
          </Note>
        </SummaryCard>

        <SummaryCard
          icon={GraduationCap}
          title="IT teachers"
          headline={itTeachers.labsWithTeacher}
          caption="IT labs have an IT teacher"
        >
          <Section title="Postings">
            <RatioRow label="IT teachers in schools with a lab" ratio={itTeachers.teachersInLabSchools} />
          </Section>
          <Section title="Gaps">
            <StatRow label="IT labs without an IT teacher" value={labsWithoutTeacher} />
            <StatRow label="Schools with an IT teacher but no lab" value={itTeachers.schoolsWithTeacherButNoLab} />
          </Section>
        </SummaryCard>

        <SummaryCard
          icon={Users}
          title="Students and data"
          headline={studentReach.classSixToTwelve}
          caption="Class 6–12 students study in a school with an IT lab"
        >
          <Section title="Students">
            <RatioRow label="All students, Nursery to Class 12" ratio={studentReach.allStudents} />
            {studentReach.classSixToTwelvePerWorkingLabComputer !== null && (
              <StatRow
                label="Class 6–12 students per working lab computer"
                value={studentReach.classSixToTwelvePerWorkingLabComputer}
              />
            )}
          </Section>
          <Section title="Data completeness">
            <RatioRow label="Enrollment reported" ratio={dataQuality.enrollmentReported} />
            <RatioRow label="Location known" ratio={dataQuality.locationKnown} />
            <RatioRow label="IT lab status reported" ratio={dataQuality.labStatusReported} />
          </Section>
        </SummaryCard>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  icon: LucideIcon
  title: string
  headline: Ratio
  caption: string
  children: ReactNode
}

function SummaryCard({ icon: Icon, title, headline, caption, children }: SummaryCardProps) {
  return (
    <article className="glass summary-card">
      <header className="summary-card__header">
        <span className="summary-card__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <h2>{title}</h2>
      </header>

      <div className="summary-card__headline">
        <p className="summary-card__value-line">
          <span className="summary-card__value">{formatNumber(headline.value)}</span>
          <span className="summary-card__percent">{formatPercent(headline)}</span>
        </p>
        <p className="summary-card__caption">
          of {formatNumber(headline.total)} {caption}
        </p>
        <Meter ratio={headline} />
      </div>

      {children}
    </article>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="summary-card__section">
      <h3>{title}</h3>
      <ul className="ratio-list">{children}</ul>
    </section>
  )
}

function RatioRow({ label, ratio }: { label: string; ratio: Ratio }) {
  return (
    <li className="ratio-row">
      <span>{label}</span>
      <span className="ratio-row__numbers">
        {formatNumber(ratio.value)}
        <span className="ratio-row__total"> / {formatNumber(ratio.total)}</span>
      </span>
      <span className="ratio-row__percent">{formatPercent(ratio)}</span>
      <Meter ratio={ratio} small />
    </li>
  )
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="stat-row">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </li>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="summary-card__note">{children}</p>
}

/** A share as a bar; the numbers beside it carry the value, so it is hidden from screen readers. */
function Meter({ ratio, small = false }: { ratio: Ratio; small?: boolean }) {
  const percent = ratio.total ? Math.min(100, (ratio.value / ratio.total) * 100) : 0
  return (
    <span className={small ? 'meter meter--small' : 'meter'} aria-hidden="true">
      {/* A sliver keeps small but non-zero shares visible. */}
      <span className="meter__fill" style={{ width: percent > 0 ? `max(3px, ${percent}%)` : 0 }} />
    </span>
  )
}
