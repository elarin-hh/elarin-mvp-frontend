import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { appStore, appActions } from './app.store';

describe('App Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    appStore.set({
      locale: 'en-US',
      theme: 'system',
      isOnline: true
    });
  });

  it('should initialize with default state', () => {
    const state = get(appStore);
    expect(state.locale).toBe('en-US');
    expect(state.theme).toBe('system');
    expect(state.isOnline).toBe(true);
  });

  it('should update locale', () => {
    appActions.setLocale('pt-BR');
    const state = get(appStore);
    expect(state.locale).toBe('pt-BR');
  });

  it('should update theme', () => {
    appActions.setTheme('dark');
    const state = get(appStore);
    expect(state.theme).toBe('dark');
  });

  it('should update online status', () => {
    appActions.setOnlineStatus(false);
    const state = get(appStore);
    expect(state.isOnline).toBe(false);
  });
});

