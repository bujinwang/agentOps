import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';

import { AuthProvider } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import OfflineIndicator from './src/components/OfflineIndicator';
import { initializeOfflineStorage } from './src/services/offlineStorage';

const App: React.FC = () => {
  React.useEffect(() => {
    initializeOfflineStorage();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Connection type', state.type);
      console.log('Is connected?', state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
          <SettingsProvider>
            <AuthProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor="#2196F3"
                translucent={Platform.OS === 'android'}
              />
              <OfflineIndicator />
              <AppNavigator />
            </AuthProvider>
          </SettingsProvider>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;