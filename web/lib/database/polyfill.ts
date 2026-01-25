/**
 * Polyfills for RxDB in Next.js/Webpack environment
 * Fixes global and process compatibility issues
 */

if (typeof window !== 'undefined') {
  // Polyfill global for RxDB
  (window as any).global = window;
  
  // Polyfill process.env for RxDB
  if (!(window as any).process) {
    (window as any).process = {
      env: { DEBUG: undefined },
    };
  }
}
