import { ORS_API_KEY } from '../config/secrets';

const ORS_API_BASE = 'https://api.openrouteservice.org';
const API_KEY = ORS_API_KEY; 

export const calculateRoute = async (start, end, profile = 'driving-car') => {
  try {
    const coordinates = [
      [start.longitude, start.latitude],
      [end.longitude, end.latitude]
    ];

    const response = await fetch(`${ORS_API_BASE}/v2/directions/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: coordinates,
        format: 'json',
        instructions: true,
        language: 'en'
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const route = data.routes[0];
    return {
      duration: route.summary.duration, // seconds
      distance: route.summary.distance, // meters
      geometry: route.geometry,
      instructions: route.segments[0].steps.map(step => ({
        instruction: step.instruction,
        distance: step.distance,
        duration: step.duration,
        way_points: step.way_points
      }))
    };
  } catch (error) {
    console.error('❌ OpenRouteService error:', error);
    throw error;
  }
};

export const getMultipleRouteOptions = async (start, end) => {
  try {
    // Get different route profiles
    const profiles = ['driving-car', 'cycling-regular', 'foot-walking'];
    
    const routePromises = profiles.map(profile => 
      calculateRoute(start, end, profile).catch(err => null)
    );

    const routes = await Promise.all(routePromises);
    
    return routes
      .filter(route => route !== null)
      .map((route, index) => ({
        profile: profiles[index],
        duration: route.duration,
        distance: route.distance,
        durationMinutes: Math.round(route.duration / 60),
        distanceKm: (route.distance / 1000).toFixed(1),
        instructions: route.instructions,
        profileName: getProfileName(profiles[index])
      }));
  } catch (error) {
    console.error('❌ Error getting route options:', error);
    return [];
  }
};

export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `${ORS_API_BASE}/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}&size=5`
    );
    
    const data = await response.json();
    
    return data.features.map(feature => ({
      name: feature.properties.label,
      coordinates: {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1]
      },
      confidence: feature.properties.confidence,
      country: feature.properties.country,
      region: feature.properties.region
    }));
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return [];
  }
};

// Enhanced prediction combining OpenRouteService + your ML model + MBTA
export const enhancedSmartPrediction = async (start, destination, departureTime, historicalData = []) => {
  try {
    // First, geocode destination if it's a string
    let endCoords = destination;
    if (typeof destination === 'string') {
      const geocoded = await geocodeAddress(destination);
      if (geocoded.length === 0) {
        throw new Error('Could not find destination');
      }
      endCoords = geocoded[0].coordinates;
    }

    // Get multiple route options from OpenRouteService
    const routes = await getMultipleRouteOptions(start, endCoords);
    
    if (routes.length === 0) {
      throw new Error('No routes found');
    }

    // Find best route (shortest time)
    const bestRoute = routes.reduce((best, current) => 
      current.duration < best.duration ? current : best
    );

    // Blend with historical data if available
    if (historicalData.length > 0) {
      const avgHistorical = historicalData.reduce((sum, trip) => sum + trip.travel_time_minutes, 0) / historicalData.length;
      const routeMinutes = bestRoute.durationMinutes;
      
      // Weight historical data based on how much we have
      const historicalWeight = Math.min(historicalData.length / 10, 0.6);
      const routeWeight = 1 - historicalWeight;
      
      const blendedPrediction = (avgHistorical * historicalWeight) + (routeMinutes * routeWeight);
      
      return {
        predictedMinutes: blendedPrediction,
        routeMinutes: routeMinutes,
        historicalMinutes: avgHistorical,
        confidence: Math.min(historicalData.length / 10, 0.8),
        routes: routes,
        bestRoute: bestRoute,
        destinationCoords: endCoords,
        dataSource: 'historical_route_blend'
      };
    } else {
      // Use pure route calculation for new destinations
      return {
        predictedMinutes: bestRoute.durationMinutes,
        routeMinutes: bestRoute.durationMinutes,
        confidence: 0.7,
        routes: routes,
        bestRoute: bestRoute,
        destinationCoords: endCoords,
        dataSource: 'route_only'
      };
    }
  } catch (error) {
    console.error('❌ Error in enhanced smart prediction:', error);
    throw error;
  }
};

const getProfileName = (profile) => {
  const names = {
    'driving-car': '🚗 Driving',
    'cycling-regular': '🚴 Cycling',
    'foot-walking': '🚶 Walking'
  };
  return names[profile] || profile;
};

export const calculateSmartDepartureTime = async (start, destination, arrivalTime, historicalData = []) => {
  try {
    const prediction = await enhancedSmartPrediction(start, destination, arrivalTime, historicalData);
    
    // Add buffer based on confidence and route type
    const bufferMinutes = prediction.confidence > 0.7 ? 5 : 10;
    const totalTimeNeeded = prediction.predictedMinutes + bufferMinutes;
    
    const arrivalDate = new Date(arrivalTime);
    const departureTime = new Date(arrivalDate.getTime() - (totalTimeNeeded * 60 * 1000));
    
    return {
      departureTime,
      predictedTravelTime: prediction.predictedMinutes,
      bufferTime: bufferMinutes,
      confidence: prediction.confidence,
      totalTimeNeeded,
      routes: prediction.routes,
      bestRoute: prediction.bestRoute,
      destinationCoords: prediction.destinationCoords
    };
  } catch (error) {
    console.error('❌ Error calculating smart departure:', error);
    throw error;
  }
};