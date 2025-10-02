import adapter from '@sveltejs/adapter-auto';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
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
