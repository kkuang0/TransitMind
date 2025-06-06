import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { scheduleNotification } from '../utils/NotificationService';

export default function ReminderSetter() {
  const [destination, setDestination] = useState('');
  const [minutesFromNow, setMinutesFromNow] = useState('');

  const setReminder = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    const minutes = parseInt(minutesFromNow);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert('Error', 'Please enter a valid number of minutes');
      return;
    }

    const seconds = minutes * 60;
    const title = "🚆 Time to Leave!";
    const body = `Don't forget to head to ${destination}`;

    try {
      await scheduleNotification(title, body, seconds);
      Alert.alert(
        'Reminder Set!', 
        `You'll get a notification in ${minutes} minute(s) to leave for ${destination}`
      );
      
      // Clear the form
      setDestination('');
      setMinutesFromNow('');
    } catch (error) {
      Alert.alert('Error', 'Failed to set reminder');
      console.error('Error setting reminder:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Set Departure Reminder</Text>
      
      <Text style={styles.label}>Where are you going?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter destination (e.g., Work, Airport)"
        value={destination}
        onChangeText={setDestination}
      />
      
      <Text style={styles.label}>Remind me in how many minutes?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 15"
        value={minutesFromNow}
        onChangeText={setMinutesFromNow}
        keyboardType="numeric"
      />
      
      <Button title="Set Reminder" onPress={setReminder} />
      
      <Text style={styles.note}>
        💡 This is a simple test reminder. Later we'll make it smart based on your trip history!
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
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
  },
  note: {
    marginTop: 30,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});