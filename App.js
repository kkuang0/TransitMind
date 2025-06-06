import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initDatabase } from './utils/database';
import { registerForPushNotificationsAsync } from './utils/NotificationService';
import TripLogger from './components/TripLogger';
import TripHistory from './components/TripHistory';
import EnhancedSmartPlanner from './components/EnhancedSmartPlanner';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    (async () => {
      console.log('🚀 TransitMind starting...');
      
      try {
        // Initialize database
        await initDatabase();
        console.log('✅ Database initialized');
        
        // Setup notifications
        await registerForPushNotificationsAsync();
        console.log('✅ Notifications registered');
        
        console.log('🎯 App ready for data collection');
      } catch (err) {
        console.error('❌ Initialization error:', err);
      }
    })();
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tab.Screen 
          name="Logger" 
          component={TripLogger}
          options={{
            title: '🚆 Log Trip',
            tabBarLabel: 'Log Trip'
          }}
        />
        <Tab.Screen 
          name="History" 
          component={TripHistory}
          options={{
            title: '📋 History',
            tabBarLabel: 'History'
          }}
        />
        <Tab.Screen 
          name="HybridPlanner" 
          component={EnhancedSmartPlanner}
          options={{
            title: '🎯 Smart AI',
            tabBarLabel: 'Smart AI'
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}