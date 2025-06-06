import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { findNearbyStops, getNextDepartures, getTransitTypeIcon } from '../utils/MBTAService';

export default function TransitWidget({ destination = null }) {
  const [nearbyStops, setNearbyStops] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    loadNearbyTransit();
  }, []);

  const loadNearbyTransit = async () => {
    setLoading(true);
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);

      // Find nearby stops
      const stops = await findNearbyStops(
        location.coords.latitude,
        location.coords.longitude,
        0.2 // 0.2 mile radius
      );
      
      setNearbyStops(stops);

      // Load departures for closest stop
      if (stops.length > 0) {
        loadDepartures(stops[0]);
      }
    } catch (error) {
      console.error('Error loading transit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartures = async (stop) => {
    try {
      setSelectedStop(stop);
      const deps = await getNextDepartures(stop.id, 8);
      setDepartures(deps);
    } catch (error) {
      console.error('Error loading departures:', error);
    }
  };

  const formatDepartureTime = (departure) => {
    if (departure.minutesUntilDeparture <= 1) {
      return 'Now';
    } else if (departure.minutesUntilDeparture < 60) {
      return `${departure.minutesUntilDeparture}m`;
    } else {
      const time = new Date(departure.departureTime);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getDelayText = (delay) => {
    if (!delay || delay === 0) return '';
    const minutes = Math.round(delay / 60);
    return minutes > 0 ? ` +${minutes}m` : ` ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🚇 Nearby Transit</Text>
      
      {/* Stop Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stopsContainer}>
        {nearbyStops.map((stop) => (
          <TouchableOpacity
          key={stop.id}
          style={[
            styles.stopButton,
            selectedStop?.id === stop.id && styles.selectedStop
          ]}
          onPress={() => loadDepartures(stop)}
        >
          <Text style={styles.stopName}>
            {stop.name}
          </Text>
          <Text style={styles.stopDistance}>
            {(stop.distance * 5280 / 3.28084).toFixed(0)}m
          </Text>
        </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Departures List */}
      <ScrollView 
        style={styles.departuresContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNearbyTransit} />
        }
      >
        {departures.length > 0 ? (
          departures.map((departure, index) => (
            <View key={index} style={styles.departureItem}>
              <View style={styles.departureLeft}>
                <Text style={styles.transitIcon}>
                  {getTransitTypeIcon(departure.routeType)}
                </Text>
                <View>
                  <Text style={styles.routeName}>
                    {departure.routeName} {departure.headsign}
                  </Text>
                  <Text style={styles.delayText}>
                    {getDelayText(departure.delay)}
                  </Text>
                </View>
              </View>
              <Text style={[
                styles.departureTime,
                departure.minutesUntilDeparture <= 5 && styles.urgentTime
              ]}>
                {formatDepartureTime(departure)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>
            {loading ? 'Loading transit data...' : 'No upcoming departures'}
          </Text>
        )}
      </ScrollView>

      {destination && (
        <Text style={styles.destinationNote}>
          💡 Planning route to {destination}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    margin: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  stopsContainer: {
    marginBottom: 15,
  },
  stopButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedStop: {
    backgroundColor: '#007AFF',
  },
  stopName: {
    fontSize: 14,
    color: '#333',
  },
  stopDistance: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  departuresContainer: {
    maxHeight: 200,
  },
  departureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  departureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transitIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '500',
  },
  delayText: {
    fontSize: 12,
    color: '#dc3545',
  },
  departureTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  urgentTime: {
    color: '#dc3545',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingVertical: 20,
  },
  destinationNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});