import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { calculateHybridDepartureTime } from '../utils/HybridPredictionEngine';
import { fetchTrips } from '../utils/database';
import { scheduleNotification } from '../utils/NotificationService';
import TransitWidget from './TransitWidget';

export default function EnhancedSmartPlanner() {
  const [destination, setDestination] = useState('');
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateHybridRoute = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    setLoading(true);
    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission needed');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Get historical data for this destination
      const allTrips = await fetchTrips();
      const historicalTrips = allTrips.filter(trip => 
        trip.destination.toLowerCase().includes(destination.toLowerCase())
      );

      console.log(`📊 Found ${historicalTrips.length} historical trips for ML enhancement`);
      
      // Get hybrid prediction
      const hybridPrediction = await calculateHybridDepartureTime(
        location.coords,
        destination,
        arrivalTime.toISOString(),
        historicalTrips
      );

      setPrediction(hybridPrediction);

      console.log('🎯 Hybrid prediction complete:', hybridPrediction);

    } catch (error) {
      console.error('Error calculating hybrid route:', error);
      Alert.alert('Error', `Failed to calculate route: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const scheduleHybridReminder = async () => {
    if (!prediction) return;

    try {
      const now = new Date();
      const secondsUntilDeparture = (prediction.departureTime - now) / 1000;

      if (secondsUntilDeparture > 60) {
        await scheduleNotification(
          `🎯 Hybrid Smart Alert: Leave for ${destination}!`,
          `${prediction.primaryRoute.description} - ${Math.round(prediction.totalTimeNeeded)}min total`,
          secondsUntilDeparture
        );

        Alert.alert(
          'Hybrid Smart Reminder Set! 🎯',
          `Leave at ${prediction.departureTime.toLocaleTimeString()}\n` +
          `Route: ${prediction.primaryRoute.description}\n` +
          `Confidence: ${Math.round(prediction.confidence * 100)}%\n` +
          `Data Sources: ${prediction.dataQuality.googleTransit ? '🗺️ Google' : ''} ${prediction.dataQuality.historicalData > 0 ? '🧠 ML' : ''} 🚇 MBTA`
        );
      } else {
        Alert.alert('Leave Now!', 'You should leave immediately to arrive on time!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set hybrid reminder');
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRouteTypeIcon = (type) => {
    const icons = {
      'transit': '🚇',
      'walking': '🚶',
      'cycling': '🚴',
      'driving': '🚗'
    };
    return icons[type] || '🚇';
  };

  const getDataQualityIndicator = (dataQuality) => {
    const indicators = [];
    if (dataQuality.googleTransit) indicators.push('🗺️ Google');
    if (dataQuality.historicalData > 0) indicators.push(`🧠 ML(${dataQuality.historicalData})`);
    indicators.push('🚇 MBTA');
    return indicators.join(' + ');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🎯 Hybrid Smart Planner</Text>
      <Text style={styles.subtitle}>Google Maps + OpenRouteService + MBTA + AI</Text>
      
      {/* MBTA Transit Widget */}
      <TransitWidget destination={destination} />
      
      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter destination (address, place name, etc.)"
        value={destination}
        onChangeText={setDestination}
      />
      
      <Text style={styles.label}>Arrival Time</Text>
      <Text style={styles.label}>Arrival Time</Text>
<TouchableOpacity 
  style={styles.timeButton}
  onPress={() => setShowTimePicker(true)}
>
  <Text style={styles.timeButtonText}>
    Arrive by: {formatTime(arrivalTime)}
  </Text>
</TouchableOpacity>

{showTimePicker && (
  <View style={styles.timePickerContainer}>
    <DateTimePicker
      value={arrivalTime}
      mode="time"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={(event, selectedTime) => {
        if (Platform.OS === 'android') {
          setShowTimePicker(false);
        }
        if (selectedTime) {
          setArrivalTime(selectedTime);
        }
      }}
    />
    {Platform.OS === 'ios' && (
      <TouchableOpacity 
        style={styles.dismissButton}
        onPress={() => setShowTimePicker(false)}
      >
        <Text style={styles.dismissButtonText}>Done</Text>
      </TouchableOpacity>
    )}
  </View>
)}
      <Button
        title={loading ? "🎯 Calculating Hybrid Route..." : "🚀 Get Hybrid Prediction"}
        onPress={calculateHybridRoute}
        disabled={loading}
      />

      {prediction && (
        <View style={styles.predictionContainer}>
          <Text style={styles.predictionHeader}>🎯 Hybrid Smart Prediction</Text>
          
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>🕐 Leave by:</Text>
            <Text style={styles.predictionValue}>{formatTime(prediction.departureTime)}</Text>
          </View>
          
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>⏱️ Travel time:</Text>
            <Text style={styles.predictionValue}>{Math.round(prediction.predictedTravelTime)}min</Text>
          </View>
          
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>🛡️ Smart buffer:</Text>
            <Text style={styles.predictionValue}>{prediction.bufferTime}min</Text>
          </View>
          
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>📈 Confidence:</Text>
            <Text style={styles.predictionValue}>{Math.round(prediction.confidence * 100)}%</Text>
          </View>
          
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>🔬 Data sources:</Text>
            <Text style={styles.predictionSourceText}>
              {getDataQualityIndicator(prediction.dataQuality)}
            </Text>
          </View>

          {prediction.primaryRoute && (
            <View style={styles.routeInfo}>
              <Text style={styles.routeHeader}>
                {getRouteTypeIcon(prediction.primaryRoute.type)} Primary Recommendation
              </Text>
              <Text style={styles.routeText}>
                {prediction.primaryRoute.description}
              </Text>
              {prediction.primaryRoute.walkingTime && (
                <Text style={styles.routeSubtext}>
                  🚶 Walking time: {prediction.primaryRoute.walkingTime}min
                </Text>
              )}
            </View>
          )}

          <Button
            title="🔔 Set Hybrid Smart Reminder"
            onPress={scheduleHybridReminder}
          />
        </View>
      )}

      {prediction && prediction.allOptions && prediction.allOptions.length > 1 && (
        <View style={styles.alternativeRoutes}>
          <Text style={styles.alternativeHeader}>🛣️ Alternative Options</Text>
          {prediction.allOptions.slice(1).map((option, index) => (
            <View key={index} style={styles.routeOption}>
              <Text style={styles.routeOptionText}>
                {getRouteTypeIcon(option.type)} {option.description}
              </Text>
              <Text style={styles.routeOptionSubtext}>
                Confidence: {Math.round(option.confidence * 100)}% • {option.source}
              </Text>
            </View>
          ))}
        </View>
      )}

<View style={styles.noteContainer}>
  <Text style={styles.noteHeader}>💡 This hybrid system combines:</Text>
  <Text style={styles.noteItem}>• 🗺️ Google Maps transit & geocoding</Text>
  <Text style={styles.noteItem}>• 🚇 Live MBTA Boston data</Text>
  <Text style={styles.noteItem}>• 🏃 OpenRouteService walking/cycling</Text>
  <Text style={styles.noteItem}>• 🧠 Your personal ML model</Text>
</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 15,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  timeButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 300,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  timePickerButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  doneButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  predictionContainer: {
    backgroundColor: '#e8f4fd',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
  },
  predictionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  predictionLabel: {
    fontSize: 16,
    flex: 1,
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  predictionSourceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#28a745',
    flex: 1,
    textAlign: 'right',
  },
  routeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  routeHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  routeText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  routeSubtext: {
    fontSize: 12,
    color: '#666',
  },
  alternativeRoutes: {
    marginTop: 15,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  alternativeHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  routeOption: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  routeOptionSubtext: {
    fontSize: 12,
    color: '#666',
  },
  note: {
    marginTop: 20,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  noteContainer: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  noteHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noteItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 5,
  },
  noteFooter: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
 });