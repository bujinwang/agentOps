import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import OfflineIndicator from './src/components/OfflineIndicator';
import { initializeOfflineStorage } from './src/services/offlineStorage';
import LoadingScreen from './src/screens/LoadingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const App: React.FC = () => {
  const [fontsLoaded, fontError] = useFonts({
    // Material Icons font - required for @expo/vector-icons/MaterialIcons
    'MaterialIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
    // Initialize with empty object to ensure font system is ready
    // Add custom fonts here if needed:
    // 'CustomFont-Regular': require('./assets/fonts/CustomFont-Regular.ttf'),
  });

  const [fontLoadTimeout, setFontLoadTimeout] = React.useState(false);

  React.useEffect(() => {
    initializeOfflineStorage();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network connection established (Type: ' + state.type + ', Status: ' + (state.isConnected ? 'connected' : 'disconnected') + ')');
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    console.log('App: Font effect triggered', { fontsLoaded, fontError });
    if (fontsLoaded || fontError) {
      console.log('App: Fonts loaded or error occurred, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Add timeout for font loading to prevent infinite loading
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded && !fontError) {
        console.log('App: Font loading timeout reached, proceeding without fonts');
        setFontLoadTimeout(true);
        SplashScreen.hideAsync();
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Show loading screen while fonts are loading (with timeout fallback)
  if (!fontsLoaded && !fontError && !fontLoadTimeout) {
    console.log('App: Fonts still loading, showing LoadingScreen');
    return <LoadingScreen />;
  }

  console.log('App: Main component rendering - fonts loaded, error occurred, or timeout reached');
  
  // Restore the original app structure with proper navigation
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