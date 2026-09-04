import './globals.css';
import './brand-logo.css';
import './premium-polish.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const siteUrl = 'https://www.tglabs.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TG Labs — One booking. Trusted NABL labs. Quality reports.',
    template: '%s | TG Labs',
  },
  description:
    'Book diagnostic tests and health packages from trusted NABL-accredited partner labs, arrange home sample collection, and access secure digital reports with TG Labs.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'TG Labs',
    title: 'TG Labs — One booking. Trusted NABL labs. Quality reports.',
    description:
      'Compare diagnostic tests and health packages from trusted NABL-accredited partner labs, book home sample collection, and access secure digital reports.',
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
