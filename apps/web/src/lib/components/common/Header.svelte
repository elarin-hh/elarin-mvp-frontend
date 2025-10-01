<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { appActions } from '$lib/stores/app.store';
  import type { Locale } from '$lib/config/i18n';
  import { setStoredLocale } from '$lib/config/i18n';

  let currentLocale = $derived($locale as Locale);

  function toggleLocale() {
    const newLocale: Locale = currentLocale === 'en-US' ? 'pt-BR' : 'en-US';
    locale.set(newLocale);
    appActions.setLocale(newLocale);
    setStoredLocale(newLocale);
  }
</script>

<header class="bg-white shadow">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center py-4">
      <div class="flex items-center">
        <a href="/" class="text-2xl font-bold text-primary-600">
          {$_('common.appName')}
        </a>
      </div>

      <div class="flex items-center gap-4">
        <!-- Language switcher -->
        <button
          type="button"
          onclick={toggleLocale}
          class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors rounded-md hover:bg-gray-100"
          aria-label="Toggle language"
        >
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>{currentLocale === 'en-US' ? 'EN' : 'PT'}</span>
          </span>
        </button>

        <!-- TODO: Add user menu when auth is implemented -->
      </div>
    </div>
  </div>
</header>

