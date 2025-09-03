import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    taskReminders: boolean;
    leadUpdates: boolean;
    followUpReminders: boolean;
    marketingUpdates: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  display: {
    compactMode: boolean;
    showAvatars: boolean;
    showRelativeDates: boolean;
    currency: 'CAD' | 'USD';
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
  privacy: {
    crashReporting: boolean;
    analyticsEnabled: boolean;
    dataSharing: boolean;
  };
  sync: {
    autoSync: boolean;
    syncFrequency: 'real-time' | '5min' | '15min' | '30min' | 'manual';
    wifiOnly: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    includePhotos: boolean;
  };
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  timezone: string;
  language: string;
}

interface SettingsContextType {
  settings: AppSettings;
  profile: UserProfile | null;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SETTINGS_KEY = '@RealEstateCRM:settings';
const PROFILE_KEY = '@RealEstateCRM:profile';

const defaultSettings: AppSettings = {
  theme: 'system',
  notifications: {
    enabled: true,
    taskReminders: true,
    leadUpdates: true,
    followUpReminders: true,
    marketingUpdates: false,
    soundEnabled: true,
    vibrationEnabled: true,
  },
  display: {
    compactMode: false,
    showAvatars: true,
    showRelativeDates: true,
    currency: 'CAD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  privacy: {
    crashReporting: true,
    analyticsEnabled: true,
    dataSharing: false,
  },
  sync: {
    autoSync: true,
    syncFrequency: 'real-time',
    wifiOnly: false,
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'weekly',
    includePhotos: true,
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load settings from local storage
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }

      // Load profile from local storage
      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Deep merge nested objects
      if (newSettings.notifications) {
        updatedSettings.notifications = { ...settings.notifications, ...newSettings.notifications };
      }
      if (newSettings.display) {
        updatedSettings.display = { ...settings.display, ...newSettings.display };
      }
      if (newSettings.privacy) {
        updatedSettings.privacy = { ...settings.privacy, ...newSettings.privacy };
      }
      if (newSettings.sync) {
        updatedSettings.sync = { ...settings.sync, ...newSettings.sync };
      }
      if (newSettings.backup) {
        updatedSettings.backup = { ...settings.backup, ...newSettings.backup };
      }

      setSettings(updatedSettings);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    try {
      const updatedProfile = { ...profile, ...newProfile } as UserProfile;
      
      // Update on server
      await apiService.updateProfile(newProfile);
      
      setProfile(updatedProfile);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  };

  const exportData = async () => {
    try {
      // This would trigger a data export from the server
      const exportData = {
        settings,
        profile,
        exportDate: new Date().toISOString(),
      };
      
      // In a real app, this would be handled by the native layer
      console.log('Exporting user data:', exportData);
      
      // For now, just log the export request
      alert('Data export requested. You will receive an email with your data within 24 hours.');
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      // This would call the server to delete the account
      // await apiService.deleteAccount();
      
      // Clear local data
      await AsyncStorage.multiRemove([SETTINGS_KEY, PROFILE_KEY, '@RealEstateCRM:token']);
      
      // Reset state
      setSettings(defaultSettings);
      setProfile(null);
      
      console.log('Account deletion requested');
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const value: SettingsContextType = {
    settings,
    profile,
    isLoading,
    updateSettings,
    updateProfile,
    resetSettings,
    exportData,
    deleteAccount,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};