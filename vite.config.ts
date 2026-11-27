import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

/**
 * Opens the connection to the API (DNS, TCP, TLS) while the app's JavaScript is still downloading, which takes
 * that round trip off the launch path. Added only when the build knows where the API lives.
 */
function preconnectApi(origin: string): Plugin {
  return {
    name: "pos-preconnect-api",
    transformIndexHtml() {
      if (!origin) return [];
      return [{ tag: "link", attrs: { rel: "preconnect", href: origin, crossorigin: "" }, injectTo: "head-prepend" }];
    },
  };
}

/**
 * WhatsApp, Telegram and Slack need an absolute URL for the link-preview image. The page is static, so the address is
 * filled in at build time from APP_URL (a build environment variable, e.g. https://pos.example.com). Without it the
 * relative path stays, which works for some crawlers but not WhatsApp.
 */
function absoluteShareImage(appUrl: string): Plugin {
  let origin = "";
  try {
    if (appUrl) origin = new URL(appUrl).origin;
  } catch {
    /* an unusable APP_URL leaves the relative path */
  }
  return {
    name: "pos-absolute-share-image",
    transformIndexHtml(html) {
      return origin ? html.replace(/(property="og:image"\s+content=")(\/[^"]*)"/, `$1${origin}$2"`) : html;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  let apiOrigin = "";
  try {
    const base = (env.VITE_API_URL || "").trim();
    if (base) apiOrigin = new URL(base).origin;
  } catch {
    /* an unusable URL just means no preconnect hint */
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "icons/icon.svg", "icons/favicon.svg", "icons/apple-touch-icon.png"],
        manifest: {
          name: "pOS",
          short_name: "pOS",
          description: "Rent, tenants, UPI payments and maintenance for owners in India.",
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#f2f2f7",
          theme_color: "#4b2c8f",
          lang: "en-IN",
          categories: ["finance", "productivity", "business"],
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            { src: "/icons/monochrome-512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
            { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
          ],
        },
        workbox: {
          // The share image (img/og.jpg) is only for link previews, so it is left out of the offline cache.
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "/index.html",
          // /api/* is served by the Worker; never let the service worker answer those paths with the app shell.
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          // Web Push (show a notification, open the right screen on tap) lives in public/push-sw.js.
          importScripts: ["/push-sw.js"],
        },
      }),
      preconnectApi(apiOrigin),
      absoluteShareImage((process.env.APP_URL || "").trim()),
    ],
    // One version string for the whole app (shown in More and Settings), taken from package.json.
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: { target: "es2022", cssCodeSplit: true },
    // `npm run dev` serves the app with hot reload and sends /api to `npm run dev:api` (wrangler dev on :8787), so
    // the browser still sees one origin and the session cookie works as in production. POS_API overrides the target.
    server: {
      proxy: {
        "/api": { target: process.env.POS_API || "http://localhost:8787", changeOrigin: false, ws: false },
      },
    },
  };
});
