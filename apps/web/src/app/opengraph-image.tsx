import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

export const alt = 'Wavise Studio — Nền tảng tạo video AI chuyên nghiệp';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Load Be Vietnam Pro (weight 800) so Vietnamese diacritics render correctly
 * in the generated OG image. Falls back gracefully to the default font if the
 * Google Fonts request fails at runtime.
 */
async function loadVietnameseFont(): Promise<ArrayBuffer | null> {
  try {
    const cssUrl =
      'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@800&display=swap';
    // Abort quickly if the font host is unreachable so the route never hangs;
    // ImageResponse then falls back to its built-in font.
    const css = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    }).then((res) => res.text());
    const fontUrl = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!fontUrl) return null;
    return await fetch(fontUrl, { signal: AbortSignal.timeout(2500) }).then(
      (res) => res.arrayBuffer(),
    );
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await loadVietnameseFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 90px',
          backgroundColor: '#050508',
          backgroundImage:
            'radial-gradient(circle at 25% 15%, rgba(255,90,31,0.22), transparent 55%)',
          fontFamily: font ? 'Be Vietnam Pro' : 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
            color: '#FF5A1F',
            fontSize: 26,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#FF5A1F',
            }}
          />
          Nền tảng tạo video AI
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 116,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          WAVISE&nbsp;
          <span style={{ color: '#FF5A1F' }}>STUDIO</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 34,
            fontSize: 40,
            color: 'rgba(255,255,255,0.72)',
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          Biến ý tưởng thành video ngắn chất lượng cao cho TikTok, Reels &amp;
          YouTube Shorts.
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            paddingTop: 40,
            fontSize: 26,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 2,
          }}
        >
          studio.wavise.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: 'Be Vietnam Pro', data: font, style: 'normal', weight: 800 }]
        : [],
    },
  );
}
