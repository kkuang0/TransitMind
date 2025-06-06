import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from './ExpoGoHelper';
import { Platform } from 'react-native';

// Configure notifications for Expo Go
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token;

  if (isRunningInExpoGo()) {
    console.log('📱 Running in Expo Go - notifications will work for local scheduling');
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return;
    }

    // For Expo Go, we don't need push tokens for local notifications
    if (!isRunningInExpoGo()) {
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig.extra?.eas?.projectId,
        })).data;
      } catch (error) {
        console.log('Push token error (this is normal in Expo Go):', error.message);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token || 'expo-go-local-notifications';
};

export const scheduleNotification = async (title, body, seconds) => {
    try {
      console.log('📅 scheduleNotification called:');
      console.log('Running in Expo Go:', isRunningInExpoGo());
      console.log('Platform:', Platform.OS);
      console.log('Seconds to wait:', seconds);
      
      if (seconds <= 0) {
        throw new Error('Cannot schedule notification in the past');
      }
  
      // Calculate target date
      const targetDate = new Date();
      targetDate.setSeconds(targetDate.getSeconds() + Math.round(seconds));
      
      console.log('📅 Current time:', new Date().toLocaleString());
      console.log('📅 Target time:', targetDate.toLocaleString());
  
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: { 
            type: 'departure_reminder',
            scheduledTime: targetDate.toISOString()
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE, // ADD THIS LINE
          date: targetDate,
        },
      });
      
      console.log('📱 Notification scheduled with explicit DATE type');
      console.log('📱 Notification ID:', id);
      
      return id;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      throw error;
    }
  };

export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('🚫 Notification cancelled:', notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

export const getAllScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Scheduled notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};