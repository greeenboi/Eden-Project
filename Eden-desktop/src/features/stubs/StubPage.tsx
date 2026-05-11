interface StubPageProps {
  title: string;
}

export function StubPage({ title }: StubPageProps) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="eden-muted">
        Listener experience ships first. This page is intentionally stubbed for the upcoming artist/admin flow.
      </p>
    </section>
  );
}
