import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

interface NotificationPermissionState {
  hasPermission: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<void>;
}

export const useNotificationPermissions = (): NotificationPermissionState => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPermission = async () => {
    try {
      setIsLoading(true);
      
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          setHasPermission(granted);
        } else {
          setHasPermission(true);
        }
      } else {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs permission to send you notifications about important updates, reminders, and lead activities.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          
          const hasPermissionNow = granted === PermissionsAndroid.RESULTS.GRANTED;
          setHasPermission(hasPermissionNow);
          
          if (!hasPermissionNow) {
            Alert.alert(
              'Notifications Disabled',
              'You can enable notifications later in your device settings if you change your mind.',
              [{ text: 'OK' }]
            );
          }
          
          return hasPermissionNow;
        } else {
          setHasPermission(true);
          return true;
        }
      } else {
        setHasPermission(true);
        return true;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setHasPermission(false);
      return false;
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return {
    hasPermission,
    isLoading,
    requestPermission,
    checkPermission,
  };
};