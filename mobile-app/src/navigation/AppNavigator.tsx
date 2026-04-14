import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import IncidentsScreen from '../screens/IncidentsScreen';
import TripsScreen from '../screens/TripsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuthStore } from '../store';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
  </Stack.Navigator>
);

const IncidentsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="IncidentsHome" component={IncidentsScreen} />
  </Stack.Navigator>
);

const TripsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="TripsHome" component={TripsScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
  </Stack.Navigator>
);

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#c4581e',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          lazy: true,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardStack}
          options={{
            tabBarLabel: 'Accueil',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Trips"
          component={TripsStack}
          options={{
            tabBarLabel: 'Trajets',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="map-marker-multiple" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Incidents"
          component={IncidentsStack}
          options={{
            tabBarLabel: 'Incidents',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="alert-circle" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    height: 64,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
