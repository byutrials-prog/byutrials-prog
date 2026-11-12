// metro.config.js
// Exclude the web-only image helper from native bundles.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Path to a no-op stub that returns an empty object
const STUB_PATH = path.resolve(__dirname, 'src/stubs/webOnlyStub.js');

const WEB_ONLY_PACKAGES = ['html-to-image'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && WEB_ONLY_PACKAGES.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { type: 'sourceFile', filePath: STUB_PATH };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
