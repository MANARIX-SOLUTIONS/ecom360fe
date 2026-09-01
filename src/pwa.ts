/**
 * Registers the generated service worker in production builds only.
 * Dev (`vite`) keeps the SW disabled so HMR is not intercepted.
 */
export function registerPwa(): void {
  if (import.meta.env.DEV) return;
  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // SW optional: preview without plugin or unsupported browsers.
    });
}
