import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV === 'development';
const basePath = dev ? '' : process.env.BASE_PATH || '';
const apiBase = process.env.VITE_API_BASE_URL || '';

const apiOrigin = (() => {
  try {
    if (apiBase) return new URL(apiBase).origin;
    // Defaults for local dev if env is missing
    return dev ? 'http://localhost:3001' : null;
  } catch {
    return null;
  }
})();

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      strict: false
    }),
    csp: {
      mode: 'nonce',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        'font-src': ["'self'", 'data:'],
        'connect-src': [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://*.supabase.co',
          'http://localhost:3001',
          'http://localhost:3337',
          'ws:',
          'wss:',
          ...(apiOrigin ? [apiOrigin] : [])
        ],
        'worker-src': ["'self'", 'blob:'],
        'frame-ancestors': ["'self'"],
        'manifest-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': true
      }
    },
    paths: {
      base: basePath
    },
    prerender: {
      handleHttpError: 'warn',
      handleUnseenRoutes: 'ignore',
      entries: ['/', '/privacy', '/terms']
    },
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
