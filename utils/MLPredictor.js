import { fetchTrips } from './database';
import { extractTimeFeatures } from './MLDataProcessor';
import { enhancedSmartPrediction } from './OpenRouteService';

// Enhanced ML model that combines multiple data sources
class EnhancedMLModel {
  constructor() {
    this.featureWeights = {
      day_of_week: 0.15,
      hour_of_day: 0.25,
      is_weekend: 0.20,
      distance: 0.25,
      route_data: 0.15
    };
  }

  predict(features, routeData = null) {
    // Base prediction from distance
    const baseTime = features.distance / 1000 * 2; // 2 min per km baseline
    
    // Time-of-day effects
    const rushHourMultiplier = this.getRushHourMultiplier(features.hour_of_day);
    const weekendMultiplier = features.is_weekend ? 0.8 : 1.0;
    
    // Route data influence
    const routeMultiplier = routeData ? (routeData.durationMinutes / baseTime) : 1.0;
    
    const predictedTime = baseTime * rushHourMultiplier * weekendMultiplier * routeMultiplier;
    
    return Math.max(predictedTime, 1);
  }

  getRushHourMultiplier(hour) {
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.5; // 50% longer during rush hour
    } else if (hour >= 10 && hour <= 16) {
      return 0.9; // 10% faster during off-peak
    }
    return 1.0;
  }
}

const model = new EnhancedMLModel();

export const predictTravelTimeEnhanced = async (destination, plannedDepartureTime, distance, startCoords, endCoords) => {
  try {
    // Get historical data for this destination
    const allTrips = await fetchTrips();
    const destinationTrips = allTrips.filter(trip => 
      trip.destination.toLowerCase() === destination.toLowerCase()
    );

    console.log(`🧠 Found ${destinationTrips.length} historical trips to ${destination}`);

    // Get real-time route data from OpenRouteService
    const routePrediction = await enhancedSmartPrediction(
      startCoords,
      destination,
      plannedDepartureTime,
      destinationTrips
    );

    // Extract features for ML prediction
    const timeFeatures = extractTimeFeatures(plannedDepartureTime);
    const features = {
      day_of_week: timeFeatures.dayOfWeek,
      hour_of_day: timeFeatures.hourOfDay,
      is_weekend: timeFeatures.isWeekend,
      distance: distance
    };

    // Use the enhanced route prediction as our primary source
    if (destinationTrips.length >= 3) {
      console.log(`📊 Using blended prediction: ${routePrediction.predictedMinutes.toFixed(1)}min`);
      
      return {
        predictedTimeMinutes: routePrediction.predictedMinutes,
        confidence: routePrediction.confidence,
        dataSource: 'enhanced_ml_route_historical',
        routes: routePrediction.routes,
        bestRoute: routePrediction.bestRoute,
        historicalTrips: destinationTrips.length
      };
    } else {
      // For new destinations, use route + basic ML
      const mlPrediction = model.predict(features, routePrediction.bestRoute);
      const finalPrediction = (routePrediction.predictedMinutes * 0.8) + (mlPrediction * 0.2);
      
      console.log(`🤖 Route + ML prediction: ${finalPrediction.toFixed(1)}min`);
      
      return {
        predictedTimeMinutes: finalPrediction,
        confidence: 0.6,
        dataSource: 'route_ml_blend',
        routes: routePrediction.routes,
        bestRoute: routePrediction.bestRoute,
        historicalTrips: destinationTrips.length
      };
    }
  } catch (error) {
    console.error('❌ Error in enhanced prediction:', error);
    
    // Fallback to simple prediction
    const fallbackTime = distance / 1000 * 2;
    return {
      predictedTimeMinutes: Math.max(fallbackTime, 5),
      confidence: 0.2,
      dataSource: 'fallback',
      routes: [],
      historicalTrips: 0
    };
  }
};

export const calculateOptimalDepartureTimeEnhanced = async (destination, arrivalTime, startCoords) => {
  try {
    // Get historical data
    const allTrips = await fetchTrips();
    const destinationTrips = allTrips.filter(trip => 
      trip.destination.toLowerCase() === destination.toLowerCase()
    );

    // Use OpenRouteService for smart calculation
    const smartPrediction = await enhancedSmartPrediction(
      startCoords,
      destination,
      arrivalTime,
      destinationTrips
    );

    // Calculate departure time with smart buffer
    const bufferMinutes = smartPrediction.confidence > 0.7 ? 5 : 8;
    const totalTimeNeeded = smartPrediction.predictedMinutes + bufferMinutes;

    const arrivalDate = new Date(arrivalTime);
    const departureTime = new Date(arrivalDate.getTime() - (totalTimeNeeded * 60 * 1000));

    console.log(`🎯 Smart departure: Leave by ${departureTime.toLocaleTimeString()} for ${arrivalDate.toLocaleTimeString()}`);

    return {
      departureTime,
      predictedTravelTime: smartPrediction.predictedMinutes,
      bufferTime: bufferMinutes,
      confidence: smartPrediction.confidence,
      totalTimeNeeded,
      routes: smartPrediction.routes,
      bestRoute: smartPrediction.bestRoute,
      destinationCoords: smartPrediction.destinationCoords
    };
  } catch (error) {
    console.error('❌ Error calculating enhanced departure time:', error);
    throw error;
  }
};