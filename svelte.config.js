import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    prerender: {
      handleMissingId: 'warn',
      handleHttpError: 'warn',
      handleUnseenRoutes: 'ignore',
      entries: ['*']
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
