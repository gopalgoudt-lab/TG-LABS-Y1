import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogDetail from '@/components/catalog/CatalogDetail';
import { findPublicTest } from '@/lib/catalog-data';
import { testDetailsDto } from '@/lib/catalog-public-dto';
import '../test-details.css';

export const dynamic = 'force-dynamic';
const baseUrl = 'https://www.tglabs.in';

type Params = Promise<{ slug: string }>;

function seoDescription(name: string, description?: string | null) {
  const fallback = `Learn about the ${name} test, sample and preparation requirements, and compare eligible diagnostic lab partners on TG Labs.`;
  const text = description?.trim() || fallback;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const value = await findPublicTest(slug);
  if (!value) return { title: 'Test not found | TG Labs', robots: { index: false, follow: false } };
  const description = seoDescription(value.name, value.description);
  const canonical = `${baseUrl}/tests/${value.slug}`;
  return {
    title: `${value.name} Test: Price, Preparation & Lab Options | TG Labs`,
    description,
    alternates: { canonical },
    openGraph: { title: `${value.name} Test | TG Labs`, description, url: canonical, type: 'website' },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const value = await findPublicTest(slug);
  if (!value) notFound();
  const product = testDetailsDto(value);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MedicalTest',
    name: product.name,
    description: product.description || undefined,
    url: `${baseUrl}/tests/${product.slug}`,
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <CatalogDetail product={product} />
  </>;
}
