import BrandLogo from '@/components/BrandLogo';

export default function NotFound() {
  return (
    <main className="dashboard" style={{ maxWidth: 760, margin: '0 auto', padding: '72px 20px' }}>
      <a href="/" className="standaloneBrand" aria-label="TG Labs home"><BrandLogo className="brandLogoStandalone" priority /></a>
      <section className="card" style={{ marginTop: 36, padding: 32 }}>
        <span className="ey">PAGE NOT FOUND</span>
        <h1>We couldn&apos;t find that page.</h1>
        <p className="muted">
          The link may be outdated, or the page may have moved. Return to TG Labs to search tests,
          book home collection, or access your account.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <a className="btn primary" href="/">Go to TG Labs</a>
          <a className="btn" href="/auth">Sign in</a>
        </div>
      </section>
    </main>
  );
}
