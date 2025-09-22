export default function Head() {
  return (
    <>
      {/* Favicons / Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Primary SEO */}
      <title>PwezaCore — Modern School Management</title>
      <link rel="canonical" href="https://pwezacore.com" />
      <meta
        name="description"
        content="Multi-tenant school management SaaS for admins, teachers, parents, and students. Reports, attendance, payments—simple and secure."
      />
      <meta name="application-name" content="PwezaCore" />
      <meta name="theme-color" content="#0a66c2" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://pwezacore.com" />
      <meta property="og:title" content="PwezaCore — Modern School Management" />
      <meta
        property="og:description"
        content="Multi-tenant school management SaaS for admins, teachers, parents, and students. Reports, attendance, payments—simple and secure."
      />
      <meta property="og:image" content="https://pwezacore.com/opengraph-image.png" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="PwezaCore — Modern School Management" />
      <meta
        name="twitter:description"
        content="Multi-tenant school management SaaS for admins, teachers, parents, and students. Reports, attendance, payments—simple and secure."
      />
      <meta name="twitter:image" content="https://pwezacore.com/opengraph-image.png" />

      {/* Structured Data: WebSite with Sitelinks Search Box */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'PwezaCore',
            url: 'https://pwezacore.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://pwezacore.com/search?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />

      {/* AdSense Verification */}
      <meta name="google-adsense-account" content="ca-pub-3223074412064973" />
    </>
  );
}


