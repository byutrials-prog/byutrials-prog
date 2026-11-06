// Stub untuk node:async_hooks di browser
// expo-font/build/serverContext.web.js mengimport AsyncLocalStorage dari node:async_hooks
// yang tidak tersedia di browser - ini stub browser-safe-nya

export class AsyncLocalStorage {
  constructor() {
    this._store = undefined;
  }
  run(store, callback, ...args) {
    const prev = this._store;
    this._store = store;
    try {
      return callback(...args);
    } finally {
      this._store = prev;
    }
  }
  getStore() {
    return this._store;
  }
  enterWith(store) {
    this._store = store;
  }
  disable() {
    this._store = undefined;
  }
}

export class AsyncResource {
  constructor(type) { this.type = type; }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.apply(thisArg, args);
  }
  bind(fn) { return fn; }
  static bind(fn) { return fn; }
}

export function createHook() { return { enable() {}, disable() {} }; }
export function executionAsyncId() { return 1; }
export function triggerAsyncId() { return 0; }

export default {
  AsyncLocalStorage,
  AsyncResource,
  createHook,
  executionAsyncId,
  triggerAsyncId,
};
