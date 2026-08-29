export default function PlaceholderPage({ title, pageId }: { title: string; pageId: string }) {
  return (
    <div className="page">
      <header className="page-header">
        <h1>{title}</h1>
        <p className="page-desc">{pageId} — 功能开发中</p>
      </header>
      <section className="card stub-card">
        <p>此页面为占位页，后续将对接相应管理接口。</p>
      </section>
    </div>
  )
}
