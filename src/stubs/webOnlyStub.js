const unavailableOnNative = () => {
  throw new Error('Web-only modules are not available on native platforms.');
};

export const jsPDF = unavailableOnNative;
export const toPng = unavailableOnNative;
export default unavailableOnNative;
