import { addMessages, init, getLocaleFromNavigator } from 'svelte-i18n';

// Import translations
import enCommon from '$lib/i18n/en-US/common.json';
import enAuth from '$lib/i18n/en-US/auth.json';
import enDashboard from '$lib/i18n/en-US/dashboard.json';
import enTrain from '$lib/i18n/en-US/train.json';
import enSummary from '$lib/i18n/en-US/summary.json';
import enErrors from '$lib/i18n/en-US/errors.json';

import ptCommon from '$lib/i18n/pt-BR/common.json';
import ptAuth from '$lib/i18n/pt-BR/auth.json';
import ptDashboard from '$lib/i18n/pt-BR/dashboard.json';
import ptTrain from '$lib/i18n/pt-BR/train.json';
import ptSummary from '$lib/i18n/pt-BR/summary.json';
import ptErrors from '$lib/i18n/pt-BR/errors.json';

// Register translations
addMessages('en-US', { common: enCommon, auth: enAuth, dashboard: enDashboard, train: enTrain, summary: enSummary, errors: enErrors });
addMessages('pt-BR', { common: ptCommon, auth: ptAuth, dashboard: ptDashboard, train: ptTrain, summary: ptSummary, errors: ptErrors });

export const supportedLocales = ['en-US', 'pt-BR'] as const;
export type Locale = typeof supportedLocales[number];

export function initI18n() {
  init({
    fallbackLocale: 'en-US',
    initialLocale: getStoredLocale() || getLocaleFromNavigator() || 'en-US'
  });
}

export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('locale');
  return supportedLocales.includes(stored as Locale) ? (stored as Locale) : null;
}

export function setStoredLocale(locale: Locale) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('locale', locale);
}

