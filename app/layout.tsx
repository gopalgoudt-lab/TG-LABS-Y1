import './globals.css';
import './brand-logo.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const siteUrl = 'https://tglabs.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TG Labs — Diagnostics that move at the speed of care.',
    template: '%s | TG Labs',
  },
  description:
    'Book diagnostic tests and health packages, arrange home sample collection, and access digital reports with TG Labs.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'TG Labs',
    title: 'TG Labs — Diagnostics that move at the speed of care.',
    description:
      'Diagnostic tests, health packages, home sample collection and digital reports.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#087f78',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
