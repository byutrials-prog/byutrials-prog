// metro.config.js
// Exclude web-only PDF libraries (jspdf, jspdf-autotable, html-to-image)
// from Android/iOS bundles to prevent Hermes compiler crashes caused by
// eval() and browser-only APIs inside those packages.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Path to a no-op stub that returns an empty object
const STUB_PATH = path.resolve(__dirname, 'src/stubs/webOnlyStub.js');

const WEB_ONLY_PACKAGES = [
  'jspdf',
  'jspdf-autotable',
  'html-to-image',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && WEB_ONLY_PACKAGES.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { type: 'sourceFile', filePath: STUB_PATH };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
