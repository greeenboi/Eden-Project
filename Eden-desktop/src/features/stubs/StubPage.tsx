interface StubPageProps {
  title: string;
}

export function StubPage({ title }: StubPageProps) {
  return (
    <section className="eden-section">
      <div className="eden-section-title">
        <span className="eden-section-eyebrow">Coming soon</span>
        <h2>{title}</h2>
      </div>
      <p className="eden-empty">
        Listener experience ships first — this surface is stubbed for the upcoming artist & admin
        flow.
      </p>
    </section>
  );
}
