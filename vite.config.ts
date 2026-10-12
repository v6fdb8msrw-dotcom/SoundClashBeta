/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Für GitHub Pages läuft die App unter /SoundClashBeta/. Der Workflow setzt VITE_BASE entsprechend.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: base,
        name: 'Sound Clash',
        short_name: 'Sound Clash',
        description: 'Blind ranken · Song für Song',
        lang: 'de',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#07060c',
        theme_color: '#07060c',
        categories: ['games', 'music', 'entertainment'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Künstlerbilder und Cover von Deezer für unterwegs zwischenspeichern (nur Bilder, keine API)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(cdn-images|e-cdns-images)\.dzcdn\.net\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'soundclash-deezer-bilder',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // Port 5173 gehört Tims eigenem Dev-Server (Muscle Studio) – Sound Clash nimmt 5175/4175.
  server: { host: '127.0.0.1', port: 5175 },
  preview: { host: '127.0.0.1', port: 4175 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
