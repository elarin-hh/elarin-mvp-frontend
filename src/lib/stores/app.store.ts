import { writable, derived } from 'svelte/store';
import type { Locale } from '$lib/config/i18n';

export type Theme = 'light' | 'dark' | 'system';

export interface AppState {
  locale: Locale;
  theme: Theme;
  isOnline: boolean;
}

// Initial state
const initialState: AppState = {
  locale: 'en-US',
  theme: 'system',
  isOnline: true
};

// Create the store
export const appStore = writable<AppState>(initialState);

// Derived stores for easier access
export const locale = derived(appStore, ($state) => $state.locale);
export const theme = derived(appStore, ($state) => $state.theme);
export const isOnline = derived(appStore, ($state) => $state.isOnline);

// Actions
export const appActions = {
  setLocale: (newLocale: Locale) => {
    appStore.update((state) => ({ ...state, locale: newLocale }));
  },

  setTheme: (newTheme: Theme) => {
    appStore.update((state) => ({ ...state, theme: newTheme }));
  },

  setOnlineStatus: (online: boolean) => {
    appStore.update((state) => ({ ...state, isOnline: online }));
  }
};

