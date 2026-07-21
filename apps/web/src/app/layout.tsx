import type { Metadata } from "next";
import { Be_Vietnam_Pro, Space_Grotesk, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AuthHydrator } from "@/components/auth/auth-hydrator";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display-heading",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio.wavise.com';
const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';

async function fetchSeo() {
  try {
    const res = await fetch(`${LARAVEL_URL}/api/seo`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export const viewport = {
  themeColor: '#050508',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchSeo();
  const title = seo?.title ?? 'Wavise Studio | Tạo Video AI Cho TikTok, Reels & Shorts';
  // Meta description kept ≤ 160 chars for full display in SERP snippets.
  const description = seo?.description ?? 'Wavise Studio là nền tảng tạo video ngắn bằng AI: biến ý tưởng, kịch bản và ảnh thành video kèm lồng tiếng AI cho TikTok, Reels, YouTube Shorts trong vài phút.';
  const keywords = seo?.keywords?.split(',').map((s: string) => s.trim()) ?? [
    'tạo video ai', 'video ai', 'làm video bằng ai', 'text to video',
    'ai video generator', 'tạo video ngắn ai', 'lồng tiếng ai',
    'tạo video tiktok ai', 'tạo video reels ai', 'youtube shorts ai',
    'tạo video từ ảnh', 'storyboard ai', 'wavise studio', 'wavise'
  ];
  // Prefer a CMS-provided OG image; otherwise fall back to the generated
  // 1200×630 PNG produced by app/opengraph-image.tsx (file-based convention).
  const ogImage = seo?.og_image ?? null;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: title,
      template: `%s | ${seo?.site_name ?? 'Wavise Studio'}`,
    },
    description,
    keywords,
    authors: [{ name: seo?.site_name ?? 'Wavise Studio' }],
    creator: seo?.site_name ?? 'Wavise Studio',
    publisher: seo?.site_name ?? 'Wavise Studio',
    category: 'technology',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url: BASE_URL,
      siteName: seo?.site_name ?? 'Wavise Studio',
      title,
      description,
      // When ogImage is null, Next merges the generated opengraph-image.tsx.
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // When empty, Twitter falls back to the generated twitter-image.tsx.
      ...(ogImage ? { images: [ogImage] } : {}),
      creator: "@wavise",
    },
    // NOTE: no root-level `alternates.canonical` here — a hardcoded canonical in
    // the root layout is inherited by every child route that doesn't set its own,
    // making login/register/legal all emit canonical=`/`. Each route that needs a
    // canonical (e.g. the legal pages) sets its own in its `metadata`. The home
    // route `/` self-references by default, which is correct.
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      ],
      apple: '/favicon-96x96.png',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Site-wide structured data (schema.org @graph). Organization + WebSite are
  // safe on every page; the FAQPage schema lives only on the landing route.
  // No sameAs / aggregateRating here — we do not have verified social profiles
  // or review data, so we do not fabricate them.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        "name": "Wavise Studio",
        "alternateName": "Wavise",
        "url": BASE_URL,
        "logo": {
          "@type": "ImageObject",
          "url": `${BASE_URL}/logo-transparent.png`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        "name": "Wavise Studio",
        "url": BASE_URL,
        "inLanguage": "vi-VN",
        "publisher": { "@id": `${BASE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${BASE_URL}/#software`,
        "name": "Wavise Studio",
        "alternateName": "Wavise",
        "url": BASE_URL,
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "inLanguage": "vi-VN",
        "publisher": { "@id": `${BASE_URL}/#organization` },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "VND",
          "description": "Dùng thử miễn phí, thanh toán theo lượng credit sử dụng.",
        },
        "description": "Wavise Studio là nền tảng tạo video ngắn bằng AI: biến ý tưởng, kịch bản và ảnh thành video kèm lồng tiếng AI cho TikTok, Reels và YouTube Shorts.",
        "featureList": [
          "Tạo video từ văn bản (text-to-video)",
          "Tạo video từ ảnh (image-to-video)",
          "Storyboard One-Shot & Multi-Panel",
          "Lồng tiếng AI (voiceover)",
          "Nhiều phong cách: Cinematic, Anime, Cyberpunk, Fantasy, Minimalist, Realistic",
          "Xuất định dạng dọc 9:16 và ngang 16:9",
        ],
      },
    ],
  };

  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${spaceGrotesk.variable} ${inter.variable} ${playfair.variable}`}>
      <body className={beVietnamPro.className}>
        {/* Structured JSON-LD Data for Google Rich Snippets SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthHydrator>
          {children}
        </AuthHydrator>
        <ToastProvider />
      </body>
    </html>
  );
}
