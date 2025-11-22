import adapter from '@sveltejs/adapter-auto';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    csp: {
      mode: 'nonce',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://cdn.jsdelivr.net', "'wasm-unsafe-eval'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
        'connect-src': [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
          'http://localhost:3001',
          'http://localhost:3337',
          'https://*.ngrok-free.dev',
          'ws:',
          'wss:'
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
      base: dev ? '' : process.env.BASE_PATH
    },
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
