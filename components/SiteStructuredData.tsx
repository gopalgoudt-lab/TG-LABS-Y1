const siteUrl = 'https://www.tglabs.in';

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'TG Labs',
  url: siteUrl,
  logo: `${siteUrl}/brand/tg-labs-logo.png`,
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: siteUrl,
  name: 'TG Labs',
  publisher: { '@id': `${siteUrl}/#organization` },
};

export default function SiteStructuredData() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}
