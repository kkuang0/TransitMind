import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { isRunningInExpoGo, getExpoGoLimitations } from '../utils/ExpoGoHelper';

export default function ExpoGoWelcome({ onContinue }) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isRunningInExpoGo()) {
    // Not in Expo Go, skip this screen
    onContinue();
    return null;
  }

  const handleAcknowledge = () => {
    setAcknowledged(true);
    Alert.alert(
      'Welcome to TransitMind Research! 🚆',
      'You\'re running the research version in Expo Go. All core features work great for data collection!',
      [{ text: 'Start Collecting Data!', onPress: onContinue }]
    );
  };

  const limitations = getExpoGoLimitations();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🚆 TransitMind Research</Text>
      <Text style={styles.subtitle}>Running in Expo Go</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>✅ What Works Great:</Text>
        <Text style={styles.infoItem}>• Trip logging with GPS</Text>
        <Text style={styles.infoItem}>• Smart route predictions</Text>
        <Text style={styles.infoItem}>• MBTA real-time data</Text>
        <Text style={styles.infoItem}>• Data export for research</Text>
        <Text style={styles.infoItem}>• All ML features</Text>
      </View>

      {limitations.length > 0 && (
        <View style={styles.limitationsBox}>
          <Text style={styles.limitationsTitle}>⚠️ Expo Go Limitations:</Text>
          {limitations.map((limitation, index) => (
            <Text key={index} style={styles.limitationItem}>• {limitation}</Text>
          ))}
        </View>
      )}

      <View style={styles.researchBox}>
        <Text style={styles.researchTitle}>🧠 Research Purpose:</Text>
        <Text style={styles.researchText}>
          This version collects anonymous travel data to train machine learning models. 
          Your trips help build smarter transit predictions for everyone!
        </Text>
      </View>

      <Button
        title="🚀 Start Research App"
        onPress={handleAcknowledge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2d5a2d',
  },
  infoItem: {
    fontSize: 14,
    marginBottom: 3,
    color: '#2d5a2d',
  },
  limitationsBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  limitationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  limitationItem: {
    fontSize: 14,
    marginBottom: 3,
    color: '#856404',
  },
  researchBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  researchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1565c0',
  },
  researchText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1565c0',
  },
});