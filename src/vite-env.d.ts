/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /**
   * Optional. The app always calls the API on its own origin (`/api`, served by the Worker). Set this only to add a
   * `<link rel="preconnect">` hint when the API is on another origin.
   */
  readonly VITE_API_URL?: string;
}
