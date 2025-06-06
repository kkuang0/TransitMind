import React, { useState } from 'react';
import { View, Button, Text, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { insertTrip } from '../utils/database';

export default function TripLogger() {
  const [destination, setDestination] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [tripSaved, setTripSaved] = useState(false);

  const startTrip = async () => {
    if (!destination.trim()) {
      alert('Please enter a destination');
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Location permission denied');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setStartTime(new Date().toISOString());
    setStartLocation(location.coords);
    setTripSaved(false);
  };

  const endTrip = async () => {
    const location = await Location.getCurrentPositionAsync({});
    const endTime = new Date().toISOString();

    const distance = getDistance(
      startLocation.latitude,
      startLocation.longitude,
      location.coords.latitude,
      location.coords.longitude
    );

    insertTrip(destination, startTime, endTime, distance);
    setTripSaved(true);
    setDestination(''); // Clear destination for next trip
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * (Math.PI / 180);
    const φ2 = lat2 * (Math.PI / 180);
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(Δφ / 2) ** 2 +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#ffffff', flex: 1 }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>Where are you going?</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginBottom: 20,
          borderRadius: 5
        }}
        placeholder="Enter destination (e.g., Work, Gym, Downtown)"
        value={destination}
        onChangeText={setDestination}
      />
      
      <Button title="Start Trip" onPress={startTrip} />
      <View style={{ height: 10 }} />
      <Button title="End Trip" onPress={endTrip} disabled={!startLocation} />
      <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 16 }}>
        {tripSaved ? '✅ Trip saved!' : ''}
      </Text>
    </View>
  );
}