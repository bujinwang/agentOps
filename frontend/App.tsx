// Main App component

import React from 'react';
import { StatusBar } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <>
      <StatusBar barStyle=\"light-content\" backgroundColor=\"#2196F3\" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </>
  );
};

export default App;