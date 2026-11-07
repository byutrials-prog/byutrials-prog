import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin khusus: transform file dari React Native / Expo packages menggunakan esbuild tsx loader
// Diperlukan karena banyak paket RN/Expo pakai TypeScript atau Flow syntax di .js/.ts files
const nodeModulesTypescriptPlugin = {
  name: 'treat-node-modules-rn-as-tsx',
  enforce: 'pre',
  async transform(code, id) {
    // Paket-paket yang diketahui menggunakan TypeScript/Flow di dalam source-nya
    const rnPackages = [
      'expo',
      'react-native',
      '@react-native',
      '@react-native-community',
      'expo-status-bar',
      'expo-font',
      'expo-asset',
      'expo-file-system',
      'expo-print',
      'expo-sharing',
      'expo-updates',
      '@expo',
    ];
    const isRnPackage = rnPackages.some(pkg => id.includes(`node_modules/${pkg}`));
    if (isRnPackage && /\.(js|jsx|ts|tsx)$/.test(id)) {
      return transformWithEsbuild(code, id, {
        loader: 'tsx',
        target: 'esnext',
        jsx: 'automatic',
      });
    }
  },
};

export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    'process.env.EXPO_OS': JSON.stringify('web'),
  },
  plugins: [
    nodeModulesTypescriptPlugin,
    // Izinkan .js files diparse sebagai JSX (karena App.js mengandung JSX)
    react({
      include: /\.(jsx?|tsx?)$/,
    }),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/offline\.html$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*firestore.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tailwind-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        offlineGoogleAnalytics: false,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: [
        'favicon.png',
        'offline.html',
        'icons/*.png',
        'splash/*.png',
        'assets/*.png',
      ],
      manifest: {
        name: 'Tipsy Point - Kasir POS',
        short_name: 'Tipsy Point',
        description: 'Sistem Kasir & Manajemen Stok modern untuk bisnis Anda',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#1e293b',
        lang: 'id',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Buka Kasir',
            short_name: 'Kasir',
            description: 'Langsung ke halaman kasir',
            url: '/?shortcut=kasir',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  // Vite v5: gunakan loader 'tsx' (superset TypeScript+JSX) agar bisa handle
  // 'import type' dan TypeScript syntax di .js files dari packages expo/RN
  esbuild: {
    loader: 'tsx',
    include: /.*\.(jsx?|tsx?)$/,
    exclude: [],
  },
  optimizeDeps: {
    // Exclude paket yang bermasalah saat pre-bundling esbuild
    exclude: [
      '@expo/vector-icons',
      'react-native-view-shot',
      '@react-native-community/datetimepicker',
      'expo-sharing',
      'expo-print',
      'expo-file-system',
      'html-to-image',
    ],
    esbuildOptions: {
      // .js loader harus jsx agar App.js (yang berisi JSX) bisa di-scan
      // Paket dengan TypeScript syntax sudah di-exclude di atas
      loader: {
        '.js': 'jsx',
      },
    },
  },
  // Alias react-native → react-native-web (seperti yang Expo lakukan untuk web build)
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      // Stub Node.js built-ins yang tidak ada di browser
      'node:async_hooks': path.resolve(__dirname, 'src/stubs/async_hooks.js'),
      'async_hooks': path.resolve(__dirname, 'src/stubs/async_hooks.js'),
      // Stub paket native-only dengan implementasi web-compatible
      'expo-print': path.resolve(__dirname, 'src/stubs/expo-print.js'),
      '@react-native-community/datetimepicker': path.resolve(__dirname, 'src/stubs/datetimepicker.js'),
      'expo-sharing': path.resolve(__dirname, 'src/stubs/expo-sharing.js'),
      'react-native-view-shot': path.resolve(__dirname, 'src/stubs/react-native-view-shot.js'),
    },
    extensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx'],
  },
  server: {
    port: 3000,
    host: true,
  },
});
