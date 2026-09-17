import { formatNumber, formatPercent } from '../../format'
import { ColumnChart } from './charts'
import { add, type Cell, CLASSES, ratio } from './data'
import { Note, Panel } from './parts'

const shortLabel = (label: string) => (label === 'Nursery' ? 'N' : label === 'Prep' ? 'P' : label.replace('Class ', ''))

export default function EnrollmentSection({ cells, scopeLabel }: { cells: Cell[]; scopeLabel: string }) {
  const { enrollment } = add(cells)
  const [class1, class10, class12] = [enrollment[2], enrollment[11], enrollment[13]]

  return (
    <section className="summary-section" aria-labelledby="enrollment-heading">
      <h2 id="enrollment-heading">Enrollment</h2>
      <div className="panel-grid">
        <Panel wide title="Students by class" description={`Nursery to Class 12, ${scopeLabel}`}>
          <ColumnChart
            unit="students"
            items={CLASSES.map((label, index) => ({
              key: label,
              label,
              shortLabel: shortLabel(label),
              value: enrollment[index],
            }))}
          />
          {class1 > 0 && (
            <Note>
              Class 10 has {formatNumber(class10)} students, {formatPercent(ratio(class10, class1))} of Class 1's{' '}
              {formatNumber(class1)}; Class 12 has {formatNumber(class12)}.
            </Note>
          )}
        </Panel>
      </div>
    </section>
  )
}
