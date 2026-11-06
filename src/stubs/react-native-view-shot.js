export const captureRef = async (ref, options = {}) => {
  console.warn('[react-native-view-shot] captureRef tidak tersedia di web. Gunakan html-to-image.');
  return null;
};

export const captureScreen = async (options = {}) => {
  console.warn('[react-native-view-shot] captureScreen tidak tersedia di web.');
  return null;
};

export const releaseCapture = (uri) => {};

const ViewShot = ({ children }) => children;
ViewShot.captureRef = captureRef;
ViewShot.captureScreen = captureScreen;
ViewShot.releaseCapture = releaseCapture;

export default ViewShot;
