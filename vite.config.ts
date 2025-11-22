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
        name: 'Elarin - AI Fitness Trainer',
        short_name: 'Elarin',
        description: 'Personal AI-powered fitness trainer with real-time exercise detection',
        theme_color: '#000000',
        background_color: '#000000',
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
    }),
    // Aplicar obfuscation apenas em produção
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
      '.ngrok-free.dev'
    ],
    fs: {
      // Allow serving files from static folder
      allow: ['..']
    }
  },
  build: {
    // Otimizações de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true
      }
    }
  }
}));

