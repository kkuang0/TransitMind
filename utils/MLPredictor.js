import { fetchTrips } from './database';
import { extractTimeFeatures } from './MLDataProcessor';

// Mock LightGBM model - replace with real model later
class MockLightGBMModel {
  constructor() {
    this.isTraned = false;
    this.featureWeights = {
      day_of_week: 0.15,
      hour_of_day: 0.25,
      is_weekend: 0.20,
      distance: 0.30,
      destination_pattern: 0.10
    };
  }

  predict(features) {
    // Simple prediction based on historical patterns + distance
    const baseTime = features.distance / 1000 * 2; // 2 min per km baseline
    
    // Add time-of-day effects
    const rushHourMultiplier = this.getRushHourMultiplier(features.hour_of_day);
    const weekendMultiplier = features.is_weekend ? 0.8 : 1.0;
    
    const predictedTime = baseTime * rushHourMultiplier * weekendMultiplier;
    
    return Math.max(predictedTime, 1); // Minimum 1 minute
  }

  getRushHourMultiplier(hour) {
    // Rush hour effects: 7-9 AM and 5-7 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.5; // 50% longer during rush hour
    } else if (hour >= 10 && hour <= 16) {
      return 0.9; // 10% faster during off-peak
    }
    return 1.0;
  }
}

const model = new MockLightGBMModel();

export const predictTravelTime = async (destination, plannedDepartureTime, distance, startCoords, endCoords) => {
  try {
    // Get historical data for this destination
    const allTrips = await fetchTrips();
    const destinationTrips = allTrips.filter(trip => 
      trip.destination.toLowerCase() === destination.toLowerCase()
    );

    console.log(`🧠 Found ${destinationTrips.length} historical trips to ${destination}`);

    // Extract features for prediction
    const timeFeatures = extractTimeFeatures(plannedDepartureTime);
    const features = {
      day_of_week: timeFeatures.dayOfWeek,
      hour_of_day: timeFeatures.hourOfDay,
      is_weekend: timeFeatures.isWeekend,
      distance: distance,
      start_lat: startCoords.latitude,
      start_lng: startCoords.longitude,
      destination_encoded: hashDestination(destination)
    };

    // Use historical average if we have enough data
    if (destinationTrips.length >= 3) {
      const historicalAverage = calculateHistoricalAverage(destinationTrips, timeFeatures);
      const mlPrediction = model.predict(features);
      
      // Blend historical data with ML prediction
      const blendedPrediction = (historicalAverage * 0.7) + (mlPrediction * 0.3);
      
      console.log(`📊 Historical avg: ${historicalAverage.toFixed(1)}min, ML: ${mlPrediction.toFixed(1)}min, Blended: ${blendedPrediction.toFixed(1)}min`);
      
      return {
        predictedTimeMinutes: blendedPrediction,
        confidence: Math.min(destinationTrips.length / 10, 1.0), // Max confidence at 10+ trips
        dataSource: 'historical_ml_blend'
      };
    } else {
      // Use pure ML prediction for new destinations
      const prediction = model.predict(features);
      
      console.log(`🤖 Pure ML prediction: ${prediction.toFixed(1)}min (insufficient historical data)`);
      
      return {
        predictedTimeMinutes: prediction,
        confidence: 0.3, // Lower confidence for new destinations
        dataSource: 'ml_only'
      };
    }
  } catch (error) {
    console.error('❌ Error predicting travel time:', error);
    
    // Fallback prediction
    const fallbackTime = distance / 1000 * 2; // 2 min per km
    return {
      predictedTimeMinutes: Math.max(fallbackTime, 5),
      confidence: 0.1,
      dataSource: 'fallback'
    };
  }
};

const calculateHistoricalAverage = (trips, timeFeatures) => {
  // Weight recent trips more heavily
  const now = new Date();
  const weightedTimes = trips.map(trip => {
    const tripDate = new Date(trip.leave_time);
    const daysDiff = (now - tripDate) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-daysDiff / 30); // Exponential decay over 30 days
    
    // Similar time of day bonus
    const hourDiff = Math.abs(trip.hour_of_day - timeFeatures.hourOfDay);
    const timeWeight = hourDiff <= 2 ? 1.5 : 1.0;
    
    // Same day of week bonus
    const dayWeight = trip.day_of_week === timeFeatures.dayOfWeek ? 1.3 : 1.0;
    
    return {
      time: trip.travel_time_minutes,
      weight: recencyWeight * timeWeight * dayWeight
    };
  });

  const totalWeight = weightedTimes.reduce((sum, item) => sum + item.weight, 0);
  const weightedAverage = weightedTimes.reduce((sum, item) => sum + (item.time * item.weight), 0) / totalWeight;
  
  return weightedAverage;
};

const hashDestination = (destination) => {
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    const char = destination.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const calculateOptimalDepartureTime = async (destination, arrivalTime, startCoords) => {
  try {
    const arrivalDate = new Date(arrivalTime);
    
    // Estimate distance (use average from historical trips or default)
    const allTrips = await fetchTrips();
    const destinationTrips = allTrips.filter(trip => 
      trip.destination.toLowerCase() === destination.toLowerCase()
    );
    
    const averageDistance = destinationTrips.length > 0 
      ? destinationTrips.reduce((sum, trip) => sum + trip.distance, 0) / destinationTrips.length
      : 5000; // Default 5km if no history

    // Predict travel time for arrival time
    const prediction = await predictTravelTime(
      destination, 
      arrivalTime, 
      averageDistance, 
      startCoords, 
      { latitude: 0, longitude: 0 } // End coords unknown for future trip
    );

    // Add buffer time based on confidence
    const bufferMinutes = prediction.confidence > 0.7 ? 5 : 10;
    const totalTimeNeeded = prediction.predictedTimeMinutes + bufferMinutes;

    // Calculate departure time
    const departureTime = new Date(arrivalDate.getTime() - (totalTimeNeeded * 60 * 1000));

    console.log(`🎯 For arrival at ${arrivalDate.toLocaleTimeString()}, leave by ${departureTime.toLocaleTimeString()}`);

    return {
      departureTime,
      predictedTravelTime: prediction.predictedTimeMinutes,
      bufferTime: bufferMinutes,
      confidence: prediction.confidence,
      totalTimeNeeded
    };
  } catch (error) {
    console.error('❌ Error calculating departure time:', error);
    throw error;
  }
};