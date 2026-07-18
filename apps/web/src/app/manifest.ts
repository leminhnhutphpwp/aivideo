import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wavise Studio - Tạo Video AI Chuyên Nghiệp',
    short_name: 'Wavise Studio',
    description: 'Nền tảng tạo video AI chuyên nghiệp.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#FF5A1F',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
