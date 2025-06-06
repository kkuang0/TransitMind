import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const USER_ID_KEY = 'transitMind_userId';
const USER_PROFILE_KEY = 'transitMind_userProfile';

export const generateUserId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `user_${timestamp}_${random}`;
};

export const getUserId = async () => {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = generateUserId();
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      console.log('🆔 Generated new user ID:', userId);
    }
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return generateUserId();
  }
};

export const getUserProfile = async () => {
  try {
    const profile = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const setUserProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    console.log('👤 User profile saved');
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
};

export const getDeviceInfo = () => {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    deviceName: Constants.deviceName,
    appVersion: Constants.expoConfig?.version || '1.0.0'
  };
};