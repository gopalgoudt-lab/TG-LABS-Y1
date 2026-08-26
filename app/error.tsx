'use client';

import { useEffect } from 'react';
import BrandLogo from '@/components/BrandLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('TG Labs application error', error);
  }, [error]);

  return (
    <main className="dashboard" style={{ maxWidth: 760, margin: '0 auto', padding: '72px 20px' }}>
      <a href="/" className="standaloneBrand" aria-label="TG Labs home"><BrandLogo className="brandLogoStandalone" priority /></a>
      <section className="card" style={{ marginTop: 36, padding: 32 }}>
        <span className="ey">TEMPORARY ISSUE</span>
        <h1>Something didn&apos;t load correctly.</h1>
        <p className="muted">
          Your information has not been intentionally changed. Try loading this screen again. If the
          problem continues, return to the TG Labs home page and retry the action.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <button className="btn primary" type="button" onClick={() => reset()}>
            Try again
          </button>
          <a className="btn" href="/">Return home</a>
        </div>
      </section>
    </main>
  );
}
