import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MAUVE — Deep Music & Liquor',
    short_name: 'MAUVE',
    description: 'Deep Music & Liquor — 深夜、ひとりの音と酒。',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0b0d',
    theme_color: '#0d0b0d',
    lang: 'ja',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
