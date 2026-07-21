import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio.wavise.com';

/**
 * Public, indexable routes only. Authenticated app routes (dashboard, studio,
 * billing, credits, projects, jobs, assets, settings) are intentionally
 * excluded — they sit behind auth and must not appear in the sitemap.
 * (Blog lives on a separate site and is linked externally, not listed here.)
 *
 * NOTE: the legal routes (/dieu-khoan-dich-vu, /chinh-sach-bao-mat,
 * /chinh-sach-hoan-tien) are intentionally NOT listed while they remain
 * unfinished drafts with placeholder company/contact data — they are also set
 * to `robots: { index: false }`. TODO(owner): once the real legal data is
 * filled in and the pages are re-enabled for indexing, re-add them here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/forgot-password`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
