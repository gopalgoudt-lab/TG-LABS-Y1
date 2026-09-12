import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogDetail from '@/components/catalog/CatalogDetail';
import { findPublicPackage } from '@/lib/catalog-data';
import { packageDetailsDto } from '@/lib/catalog-public-dto';

export const dynamic = 'force-dynamic';
const baseUrl = 'https://www.tglabs.in';
type Params = Promise<{ slug: string }>;

function seoDescription(name: string, description?: string | null) {
  const fallback = `Explore the ${name} health package, included tests, preparation guidance, and eligible diagnostic lab partner options on TG Labs.`;
  const text = description?.trim() || fallback;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const value = await findPublicPackage(slug, 'PACKAGE');
  if (!value) return { title: 'Package not found', robots: { index: false, follow: false } };
  const description = seoDescription(value.name, value.description);
  const canonical = `${baseUrl}/packages/${value.slug}`;
  return {
    title: `${value.name}: Tests, Preparation & Lab Options`,
    description,
    alternates: { canonical },
    openGraph: { title: `${value.name} | TG Labs`, description, url: canonical, type: 'website' },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const value = await findPublicPackage(slug, 'PACKAGE');
  if (!value) notFound();
  const product = packageDetailsDto(value);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    category: 'Diagnostic health package',
    url: `${baseUrl}/packages/${product.slug}`,
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <CatalogDetail product={product} />
  </>;
}
