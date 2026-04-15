import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './src/components/Toast';

import { useAuthStore } from './src/store/authStore';
import { Colors } from './src/constants/Colors';

// Auth screens
import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';

// Worker tab navigator
import WorkerTabNavigator from './src/navigation/WorkerTabNavigator';

// Admin dashboard
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

function AppNavigator() {
  const { isAuthenticated, isLoading, worker, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primaryNavy,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={Colors.primaryBlue} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!isAuthenticated ? (
        // Auth stack
        <Stack.Group>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        </Stack.Group>
      ) : worker?.role === 'admin' ? (
        // Admin app
        <Stack.Group>
          <Stack.Screen name="AdminApp" component={AdminDashboardScreen} />
        </Stack.Group>
      ) : (
        // Worker app
        <Stack.Group>
          <Stack.Screen name="WorkerApp" component={WorkerTabNavigator} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

// Inject web-only CSS for the mobile phone frame background
function useWebStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const style = document.createElement('style');
    style.textContent = `
      /* Dark background behind phone frame */
      html, body, #root {
        margin: 0;
        padding: 0;
        min-height: 100%;
        height: 100%;
        background: linear-gradient(135deg, #EBF4FF 0%, #F0F7FF 50%, #E8F4FD 100%);
      }
      #root {
        display: flex;
        flex-direction: column;
      }

      /* Subtle grid pattern */
      body::before {
        content: '';
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: 
          radial-gradient(circle at 20% 30%, rgba(0, 46, 126, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(0, 186, 242, 0.05) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
      }

      /* Branding text on the left */
      body::after {
        content: 'GigShield — AI Parametric Insurance';
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(0,46,126,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 2px;
        pointer-events: none;
        z-index: 0;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
}

export default function App() {
  useWebStyles();

  const appContent = (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );

  // On web: wrap in phone frame container (minHeight avoids 0-height collapse with % heights)
  if (Platform.OS === 'web') {
    const winH = Dimensions.get('window').height;
    const frameHeight = Math.min(852, Math.max(560, winH * 0.92));
    return (
      <View style={[webStyles.outerContainer, { minHeight: winH, width: '100%' }]}>
        {/* Phone frame */}
        <View style={[webStyles.phoneFrame, { height: frameHeight }]}>
          {/* Notch / dynamic island */}
          <View style={webStyles.notchBar}>
            <View style={webStyles.notch} />
          </View>
          {/* App content */}
          <View style={webStyles.phoneContent}>
            {appContent}
          </View>
          {/* Home indicator */}
          <View style={webStyles.homeIndicatorBar}>
            <View style={webStyles.homeIndicator} />
          </View>
        </View>
      </View>
    );
  }

  // On native: render directly
  return appContent;
}

const webStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 20,
  },
  phoneFrame: {
    width: 393,
    maxHeight: 852,
    backgroundColor: '#F0F4F8',
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#CBD5E0',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 46, 126, 0.25)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
    position: 'relative',
  },
  notchBar: {
    width: '100%',
    height: 50,
    backgroundColor: '#002E7E',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    zIndex: 100,
  },
  notch: {
    width: 126,
    height: 34,
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  phoneContent: {
    flex: 1,
    overflow: 'hidden',
  },
  homeIndicatorBar: {
    width: '100%',
    height: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#CBD5E0',
    borderRadius: 3,
  },
});
