import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import DashboardScreen from '../screens/worker/DashboardScreen';
import PolicyScreen from '../screens/worker/PolicyScreen';
import ClaimsScreen from '../screens/worker/ClaimsScreen';
import AlertsScreen from '../screens/worker/AlertsScreen';
import ProfileScreen from '../screens/worker/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function WorkerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.cardBg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: Colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: Colors.paytmBlue,
        tabBarInactiveTintColor: Colors.textDisabled,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.1,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['home', 'home-outline'],
            Policy: ['shield-checkmark', 'shield-checkmark-outline'],
            Claims: ['document-text', 'document-text-outline'],
            Alerts: ['notifications', 'notifications-outline'],
            Profile: ['person', 'person-outline'],
          };
          const [active, inactive] = icons[route.name] || ['radio-button-on', 'radio-button-off'];
          return (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={(focused ? active : inactive) as any} size={focused ? 22 : 22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Policy" component={PolicyScreen} />
      <Tab.Screen name="Claims" component={ClaimsScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: Colors.iconBgBlue,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
});
