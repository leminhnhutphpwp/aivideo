import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio.wavise.com';

/**
 * Public, indexable routes only. Authenticated app routes (dashboard, studio,
 * billing, credits, projects, jobs, assets, settings) are intentionally
 * excluded — they sit behind auth and must not appear in the sitemap.
 * (Blog lives on a separate site and is linked externally, not listed here.)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/forgot-password`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/dieu-khoan-dich-vu`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/chinh-sach-bao-mat`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/chinh-sach-hoan-tien`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
