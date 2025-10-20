import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Elarin - AI Fitness Trainer',
        short_name: 'Elarin',
        description: 'Personal AI-powered fitness trainer with real-time exercise detection',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: [
      'sharron-pokable-kaylee.ngrok-free.dev',
      '.ngrok-free.dev'
    ],
    fs: {
      // Allow serving files from static folder
      allow: ['..']
    }
  }
});

