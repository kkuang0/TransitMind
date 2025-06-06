import Constants from 'expo-constants';

export const isRunningInExpoGo = () => {
  return Constants.appOwnership === 'expo';
};

export const showExpoGoMessage = (feature) => {
  if (isRunningInExpoGo()) {
    console.log(`📱 Running in Expo Go - ${feature} may have limitations`);
    return true;
  }
  return false;
};

export const getExpoGoLimitations = () => {
  if (!isRunningInExpoGo()) return [];
  
  return [
    'Background location tracking limited',
    'Some notification features may not work',
    'App runs inside Expo Go container',
    'Push notifications require special setup'
  ];
};