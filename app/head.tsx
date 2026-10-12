export default function Head() {
  return (
    <>
      {/* Favicons / Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Primary SEO */}
      <title>Rakai Community School of Nursing (RCSN) — Health Care Training in Uganda</title>
      <link rel="canonical" href="https://www.rcsn.ac.ug" />
      <meta
        name="description"
        content="Accredited Certificate and Diploma programs in Nursing and Midwifery in Rakai Town, Uganda. Authorized UHPAB Center U151."
      />
      <meta name="application-name" content="RCSN" />
      <meta name="theme-color" content="#ffffff" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.rcsn.ac.ug" />
      <meta property="og:title" content="Rakai Community School of Nursing (RCSN) — Health Care Training in Uganda" />
      <meta
        property="og:description"
        content="Accredited Certificate and Diploma programs in Nursing and Midwifery in Rakai Town, Uganda. Authorized UHPAB Center U151."
      />
      <meta property="og:image" content="https://www.rcsn.ac.ug/opengraph-image.png" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Rakai Community School of Nursing (RCSN) — Health Care Training in Uganda" />
      <meta
        name="twitter:description"
        content="Accredited Certificate and Diploma programs in Nursing and Midwifery in Rakai Town, Uganda. Authorized UHPAB Center U151."
      />
      <meta name="twitter:image" content="https://www.rcsn.ac.ug/opengraph-image.png" />

      {/* Structured Data: WebSite with Sitelinks Search Box */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Rakai Community School of Nursing',
            url: 'https://www.rcsn.ac.ug',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://www.rcsn.ac.ug/search?q={search_term_string}',
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


