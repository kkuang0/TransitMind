import { fetchTrips } from './database';
import { extractTimeFeatures } from './MLDataProcessor';
import { findNearbyStops, getNextDepartures } from './MBTAService';
import { geocodeAddress, getTransitDirections, getWalkingDrivingRoutes } from './GoogleMapsService';
import { geocodeAddress as orsGeocode, getMultipleRouteOptions } from './OpenRouteService';

export const getHybridRoutePrediction = async (origin, destination, departureTime, historicalData = []) => {
  try {
    console.log('🧠 Starting hybrid prediction engine...');
    
    // Step 1: Geocode destination using multiple sources
    const destinationCoords = await smartGeocode(destination);
    if (!destinationCoords) {
      throw new Error('Could not find destination');
    }
    
    // Step 2: Get multiple route predictions in parallel
    const [
      googleTransitRoutes,
      googleWalkingDriving,
      openRouteServiceRoutes,
      nearbyMBTAStops
    ] = await Promise.allSettled([
      getTransitDirections(origin, destinationCoords, departureTime),
      getWalkingDrivingRoutes(origin, destinationCoords),
      getMultipleRouteOptions(origin, destinationCoords),
      findNearbyStops(origin.latitude, origin.longitude, 0.3)
    ]);
    
    // Step 3: Process results
    const results = {
      googleTransit: googleTransitRoutes.status === 'fulfilled' ? googleTransitRoutes.value : [],
      googleWalkingDriving: googleWalkingDriving.status === 'fulfilled' ? googleWalkingDriving.value : [],
      openRouteService: openRouteServiceRoutes.status === 'fulfilled' ? openRouteServiceRoutes.value : [],
      nearbyStops: nearbyMBTAStops.status === 'fulfilled' ? nearbyMBTAStops.value : []
    };
    
    console.log('📊 Hybrid results:', {
      googleTransitRoutes: results.googleTransit.length,
      walkingDrivingRoutes: results.googleWalkingDriving.length,
      openRouteServiceRoutes: results.openRouteService.length,
      nearbyStops: results.nearbyStops.length
    });
    
    // Step 4: Generate smart recommendation
    const recommendation = generateSmartRecommendation(results, historicalData, destinationCoords);
    
    return recommendation;
    
  } catch (error) {
    console.error('❌ Hybrid prediction error:', error);
    throw error;
  }
};

const smartGeocode = async (destination) => {
  try {
    // Try Google Maps first (more accurate)
    const googleResults = await geocodeAddress(destination);
    if (googleResults.length > 0) {
      const result = googleResults[0];
      return {
        latitude: result.location.lat,
        longitude: result.location.lng,
        address: result.address,
        source: 'google'
      };
    }
    
    // Fallback to OpenRouteService
    const orsResults = await orsGeocode(destination);
    if (orsResults.length > 0) {
      const result = orsResults[0];
      return {
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
        address: result.name,
        source: 'openrouteservice'
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Smart geocoding error:', error);
    return null;
  }
};

const generateSmartRecommendation = (results, historicalData, destinationCoords) => {
  const recommendations = [];
  
  // Analyze Google Transit options
  if (results.googleTransit.length > 0) {
    const bestTransit = results.googleTransit[0]; // Google sorts by best route
    recommendations.push({
      type: 'transit',
      source: 'google_maps',
      duration: bestTransit.duration.value / 60, // Convert to minutes
      confidence: 0.85,
      details: bestTransit,
      description: `${Math.round(bestTransit.duration.value / 60)}min via ${bestTransit.transitSteps.map(s => s.lineName).join(' → ')}`,
      walkingTime: Math.round(bestTransit.walkingTime / 60),
      priority: 1
    });
  }
  
  // Analyze walking option
  const walkingRoute = results.googleWalkingDriving.find(r => r.mode === 'walking') || 
                      results.openRouteService.find(r => r.profile === 'foot-walking');
  
  if (walkingRoute) {
    const walkingMinutes = walkingRoute.duration ? 
      (walkingRoute.duration.value ? walkingRoute.duration.value / 60 : walkingRoute.durationMinutes) :
      walkingRoute.durationMinutes;
    
    recommendations.push({
      type: 'walking',
      source: walkingRoute.source || 'openrouteservice',
      duration: walkingMinutes,
      confidence: 0.8,
      details: walkingRoute,
      description: `${Math.round(walkingMinutes)}min walk`,
      priority: walkingMinutes <= 15 ? 1 : 3 // High priority if short walk
    });
  }
  
  // Analyze cycling option
  const cyclingRoute = results.openRouteService.find(r => r.profile === 'cycling-regular');
  if (cyclingRoute) {
    recommendations.push({
      type: 'cycling',
      source: 'openrouteservice',
      duration: cyclingRoute.durationMinutes,
      confidence: 0.75,
      details: cyclingRoute,
      description: `${cyclingRoute.durationMinutes}min bike ride`,
      priority: 2
    });
  }
  
  // Analyze driving (backup only)
  const drivingRoute = results.googleWalkingDriving.find(r => r.mode === 'driving');
  if (drivingRoute) {
    const drivingMinutes = drivingRoute.durationInTraffic ? 
      drivingRoute.durationInTraffic.value / 60 : 
      drivingRoute.duration.value / 60;
    
    recommendations.push({
      type: 'driving',
      source: 'google_maps',
      duration: drivingMinutes,
      confidence: 0.9,
      details: drivingRoute,
      description: `${Math.round(drivingMinutes)}min drive`,
      priority: 4 // Lowest priority for transit app
    });
  }
  
  // Sort by priority and select best options
  recommendations.sort((a, b) => a.priority - b.priority);
  
  // Blend with historical data if available
  const primaryRecommendation = recommendations[0];
  if (historicalData.length >= 3 && primaryRecommendation) {
    const avgHistorical = historicalData.reduce((sum, trip) => sum + trip.travel_time_minutes, 0) / historicalData.length;
    const blendedDuration = (avgHistorical * 0.4) + (primaryRecommendation.duration * 0.6);
    
    primaryRecommendation.duration = blendedDuration;
    primaryRecommendation.confidence = Math.min(primaryRecommendation.confidence + 0.1, 0.95);
    primaryRecommendation.description += ` (personalized)`;
  }
  
  return {
    primaryRecommendation,
    allOptions: recommendations.slice(0, 4), // Top 4 options
    destinationCoords,
    nearbyStops: results.nearbyStops.slice(0, 3), // Top 3 nearest stops
    dataQuality: {
      googleTransit: results.googleTransit.length > 0,
      walkingRoutes: walkingRoute !== undefined,
      historicalData: historicalData.length,
      confidence: primaryRecommendation ? primaryRecommendation.confidence : 0.3
    }
  };
};

export const calculateHybridDepartureTime = async (origin, destination, arrivalTime, historicalData = []) => {
  try {
    const prediction = await getHybridRoutePrediction(origin, destination, arrivalTime, historicalData);
    
    if (!prediction.primaryRecommendation) {
      throw new Error('No route recommendations found');
    }
    
    const primaryRoute = prediction.primaryRecommendation;
    
    // Smart buffer calculation based on route type and confidence
    let bufferMinutes;
    switch (primaryRoute.type) {
      case 'transit':
        bufferMinutes = primaryRoute.confidence > 0.8 ? 8 : 12; // More buffer for transit
        break;
      case 'walking':
        bufferMinutes = 3; // Less buffer for walking
        break;
      case 'cycling':
        bufferMinutes = 5;
        break;
      default:
        bufferMinutes = 10;
    }
    
    const totalTimeNeeded = primaryRoute.duration + bufferMinutes;
    const arrivalDate = new Date(arrivalTime);
    const departureTime = new Date(arrivalDate.getTime() - (totalTimeNeeded * 60 * 1000));
    
    console.log(`🎯 Hybrid recommendation: ${primaryRoute.description}, leave by ${departureTime.toLocaleTimeString()}`);
    
    return {
      departureTime,
      predictedTravelTime: primaryRoute.duration,
      bufferTime: bufferMinutes,
      confidence: primaryRoute.confidence,
      totalTimeNeeded,
      primaryRoute,
      allOptions: prediction.allOptions,
      nearbyStops: prediction.nearbyStops,
      destinationCoords: prediction.destinationCoords,
      dataQuality: prediction.dataQuality
    };
  } catch (error) {
    console.error('❌ Error calculating hybrid departure time:', error);
    throw error;
  }
};