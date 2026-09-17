/** A page whose content has not been decided yet. */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page-body">
      <header className="page-header">
        <h1>{title}</h1>
      </header>
      <section className="glass empty-state">
        <p>Nothing here yet.</p>
      </section>
    </div>
  )
}
