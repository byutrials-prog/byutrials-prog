if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = {};
}

if (!globalThis.expo.NativeModule) {
  globalThis.expo.NativeModule = class NativeModule {};
}

if (!globalThis.expo.modules) {
  globalThis.expo.modules = {};
}
