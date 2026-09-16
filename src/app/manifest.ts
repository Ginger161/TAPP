import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TAPP - Tycoon App',
    short_name: 'TAPP',
    description: 'Fuel Station Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a202c', // Matches tycoon-charcoal roughly
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
