import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV === 'development';

const forceHttps = process.env.FORCE_HTTPS === 'true';
const apiBase = (() => {
  const raw = process.env.VITE_API_BASE_URL || '';
  if (forceHttps && raw.startsWith('http://')) {
    return raw.replace(/^http:\/\//i, 'https://');
  }
  return raw;
})();
const basePath = dev ? '' : process.env.BASE_PATH || '';

const apiOrigin = (() => {
  try {
    if (apiBase) return new URL(apiBase).origin;

    return dev ? 'http://localhost:3001' : null;
  } catch {
    return null;
  }
})();


const config = {
  kit: {
    adapter: adapter({
      strict: false,
      fallback: 'index.html'
    }),
    csp: {

      mode: 'hash',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://cdn.jsdelivr.net', "'wasm-unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        'media-src': ["'self'", 'blob:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://*.supabase.co',
          'http://localhost:3001',
          'http://localhost:3337',
          'https://api.elarin.com.br',
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
        'upgrade-insecure-requests': forceHttps
      }
    },
    paths: {
      base: basePath
    },
    prerender: {
      handleHttpError: 'warn',
      handleUnseenRoutes: 'ignore',
      entries: []
    },
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
