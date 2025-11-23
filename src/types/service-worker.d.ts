// Minimal service worker event type for Workbox TS compat
interface ExtendableEvent extends Event {
  waitUntil(fn: Promise<unknown> | void): void;
}
