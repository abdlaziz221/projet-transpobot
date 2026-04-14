import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from './src/store';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const { token, setToken } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load saved token
        const savedToken = await AsyncStorage.getItem('auth_token');
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return token ? <AppNavigator /> : <LoginScreen />;
}
