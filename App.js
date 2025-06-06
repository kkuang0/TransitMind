import React, { useState, useEffect } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { initDatabase, fetchTrips } from './utils/database';
import TripLogger from './components/TripLogger';
import TripHistory from './components/TripHistory';

export default function App() {
  const [tripCount, setTripCount] = useState(0); 
  const [trips, setTrips] = useState([]);
  useEffect(() => {
    (async () => {
      console.log('🚀 useEffect started');
  
      try {
        await initDatabase();
        const data = await fetchTrips();
        console.log('📦 Trip count:', data.length);
        setTripCount(data.length);
      } catch (err) {
        console.error('❌ DB error:', err);
      }
    })();
  }, []);
  

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: '#ffffff' }}>
      <Text style={{ textAlign: 'center', fontSize: 24, marginBottom: 20 }}>
        🚆 TransitMind
      </Text>
      <TripLogger />
    </SafeAreaView>
  );
}
