import React, { useEffect } from 'react';

export interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, any>;
}

const BASE_URL = 'https://rcsn.vercel.app';
const DEFAULT_IMAGE = `${BASE_URL}/images/rcsn/rcsn-campus-panoramic.webp`;

function setMetaTag(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export default function SeoHead({
  title,
  description,
  canonicalPath = '',
  image = DEFAULT_IMAGE,
  imageAlt = 'Rakai Community School of Nursing',
  type = 'website',
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    // 1. Page Title
    const fullTitle = title.includes('RCSN') || title.includes('Rakai') 
      ? title 
      : `${title} | Rakai Community School of Nursing (RCSN)`;
    document.title = fullTitle;

    // 2. Canonical URL
    const fullCanonicalUrl = `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = fullCanonicalUrl;

    // 3. Primary Meta Description
    setMetaTag('description', description);

    // 4. OpenGraph Tags
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:url', fullCanonicalUrl, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:image:alt', imageAlt, true);
    setMetaTag('og:site_name', 'Rakai Community School of Nursing', true);

    // 5. Twitter Card Tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);
    setMetaTag('twitter:image:alt', imageAlt);

    // 6. Optional Page-Specific JSON-LD
    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      const scriptId = 'page-specific-jsonld';
      scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      // Optional cleanup of page-specific script if needed
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
  }, [title, description, canonicalPath, image, imageAlt, type, jsonLd]);

  return null;
}
