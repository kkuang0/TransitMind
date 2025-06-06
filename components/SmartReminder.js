import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { calculateOptimalDepartureTime } from '../utils/MLPredictor';
import { scheduleNotification } from '../utils/NotificationService';

export default function SmartReminder() {
  const [destination, setDestination] = useState('');
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [autoNotify, setAutoNotify] = useState(true);

  const calculateSmartDeparture = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission needed for smart predictions');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Calculate optimal departure time
      const result = await calculateOptimalDepartureTime(
        destination,
        arrivalTime.toISOString(),
        location.coords
      );

      setPrediction(result);

      // Auto-schedule notification if enabled
      if (autoNotify) {
        const now = new Date();
        const timeUntilDeparture = (result.departureTime - now) / 1000; // seconds

        if (timeUntilDeparture > 60) { // Only if more than 1 minute away
          await scheduleNotification(
            `🚆 Time to leave for ${destination}!`,
            `Leave now to arrive on time (${result.totalTimeNeeded.toFixed(0)} min journey)`,
            timeUntilDeparture
          );

          Alert.alert(
            'Smart Reminder Set! 🧠',
            `I'll remind you to leave at ${result.departureTime.toLocaleTimeString()}\n\n` +
            `Journey: ${result.predictedTravelTime.toFixed(0)}min + ${result.bufferTime}min buffer\n` +
            `Confidence: ${(result.confidence * 100).toFixed(0)}%`
          );
        } else {
          Alert.alert(
            'Leave Now!',
            `You should leave immediately to arrive on time!`
          );
        }
      }
    } catch (error) {
      console.error('Error calculating smart departure:', error);
      Alert.alert('Error', 'Failed to calculate smart departure time');
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🧠 Smart Departure Planner</Text>
      
      <Text style={styles.label}>Where do you need to go?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter destination (e.g., Work, Airport)"
        value={destination}
        onChangeText={setDestination}
      />
      
      <Text style={styles.label}>When do you need to arrive?</Text>
      <Button
        title={`Arrival Time: ${formatTime(arrivalTime)}`}
        onPress={() => setShowTimePicker(true)}
      />

      {showTimePicker && (
        <DateTimePicker
          value={arrivalTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setArrivalTime(selectedTime);
            }
          }}
        />
      )}

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Auto-set notification</Text>
        <Switch
          value={autoNotify}
          onValueChange={setAutoNotify}
        />
      </View>

      <Button
        title="Calculate Smart Departure 🎯"
        onPress={calculateSmartDeparture}
      />

      {prediction && (
        <View style={styles.predictionContainer}>
          <Text style={styles.predictionHeader}>📊 Smart Prediction</Text>
          <Text style={styles.predictionText}>
            🕐 Leave by: {formatTime(prediction.departureTime)}
          </Text>
          <Text style={styles.predictionText}>
            🚆 Travel time: {prediction.predictedTravelTime.toFixed(0)} minutes
          </Text>
          <Text style={styles.predictionText}>
            ⏰ Buffer: {prediction.bufferTime} minutes
          </Text>
          <Text style={styles.predictionText}>
            📈 Confidence: {(prediction.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      )}

      <Text style={styles.note}>
        💡 The more you log trips to the same destination, the smarter the predictions become!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
  },
  switchLabel: {
    fontSize: 16,
  },
  predictionContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  predictionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  predictionText: {
    fontSize: 16,
    marginBottom: 5,
  },
  note: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});