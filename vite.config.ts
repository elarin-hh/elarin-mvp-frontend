import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import obfuscatorConfig from './obfuscator.config.js';

export default defineConfig(({ mode }) => ({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Elarin',
        short_name: 'Elarin',
        description: 'Personal AI-powered fitness trainer with real-time exercise detection',
        theme_color: '#000000',
        background_color: '#74c611',
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
        navigateFallback: '/offline.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    }),

    mode === 'production' && obfuscatorPlugin({
      include: ['**/*.js', '**/*.ts', '**/*.svelte'],
      exclude: [
        '**/node_modules/**',
        '**/service-worker.js',
        '**/sw.js',
        '**/workbox-*.js',
        '**/*.d.ts'
      ],
      apply: 'build',
      options: obfuscatorConfig
    })
  ].filter(Boolean),
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 5173
    },
    allowedHosts: [
      'sharron-pokable-kaylee.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok-free.app'
    ],
    fs: {

      allow: ['..']
    }
  },
  build: {

    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
}));

