import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure how notifications should be handled when app is running
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
  
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      
      // For local notifications, we don't need the Expo push token
      // Just check if we have permission
      console.log('✅ Notification permissions granted');
    } else {
      // For simulator/emulator, still allow local notifications
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Failed to get notification permissions!');
        return;
      }
      console.log('✅ Notification permissions granted (simulator)');
    }
  
    return 'local-notifications-enabled';
};

export const scheduleNotification = async (title, body, seconds) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: { type: 'departure_reminder' },
      },
      trigger: {
        seconds: seconds,
      },
    });
    console.log('📱 Notification scheduled:', id);
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
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