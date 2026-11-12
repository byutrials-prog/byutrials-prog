export const pick = (object, ...keys) => Object.fromEntries(
  keys.flat().filter((key) => Object.prototype.hasOwnProperty.call(object, key))
    .map((key) => [key, object[key]]),
);

export const omit = (object, ...keysToOmit) => {
  const excludedKeys = new Set(keysToOmit.flat());
  return Object.fromEntries(
    Object.getOwnPropertyNames(object)
      .filter((key) => !excludedKeys.has(key))
      .map((key) => [key, object[key]]),
  );
};
