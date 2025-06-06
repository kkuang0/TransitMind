import { GOOGLE_MAPS_API_KEY } from '../config/secrets';

const MAPS_API_BASE = 'https://maps.googleapis.com/maps/api';

export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `${MAPS_API_BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.log(`Google geocoding: ${data.status}`);
      return [];
    }
    
    return data.results.slice(0, 3).map(result => ({
      address: result.formatted_address,
      location: result.geometry.location,
      placeId: result.place_id,
      types: result.types,
      source: 'google'
    }));
  } catch (error) {
    console.error('❌ Google geocoding error:', error);
    return [];
  }
};

export const getTransitDirections = async (origin, destination, departureTime = null) => {
  try {
    const originStr = typeof origin === 'string' ? origin : `${origin.latitude || origin.lat},${origin.longitude || origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.latitude || destination.lat},${destination.longitude || destination.lng}`;
    
    let url = `${MAPS_API_BASE}/directions/json?origin=${originStr}&destination=${destStr}&mode=transit&alternatives=true&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (departureTime) {
      const timestamp = Math.floor(new Date(departureTime).getTime() / 1000);
      url += `&departure_time=${timestamp}`;
    } else {
      url += `&departure_time=now`;
    }
    
    console.log('🗺️ Getting Google transit directions...');
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Directions: ${data.status}`);
    }
    
    return data.routes.map((route, index) => {
      const leg = route.legs[0];
      const transitSteps = leg.steps.filter(step => step.travel_mode === 'TRANSIT');
      
      return {
        routeIndex: index,
        duration: leg.duration,
        distance: leg.distance,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        summary: route.summary,
        transitSteps: transitSteps.map(step => ({
          mode: step.transit_details.line.vehicle.type,
          lineName: step.transit_details.line.short_name || step.transit_details.line.name,
          lineColor: step.transit_details.line.color,
          departureStop: step.transit_details.departure_stop.name,
          arrivalStop: step.transit_details.arrival_stop.name,
          departureTime: step.transit_details.departure_time.text,
          arrivalTime: step.transit_details.arrival_time.text,
          headsign: step.transit_details.headsign,
          numStops: step.transit_details.num_stops,
          instructions: step.html_instructions
        })),
        walkingTime: leg.steps
          .filter(step => step.travel_mode === 'WALKING')
          .reduce((total, step) => total + step.duration.value, 0),
        source: 'google_transit'
      };
    });
  } catch (error) {
    console.error('❌ Google transit directions error:', error);
    return [];
  }
};

export const getWalkingDrivingRoutes = async (origin, destination) => {
  try {
    const originStr = typeof origin === 'string' ? origin : `${origin.latitude || origin.lat},${origin.longitude || origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.latitude || destination.lat},${destination.longitude || destination.lng}`;
    
    // Get walking and driving times for comparison
    const modes = ['walking', 'driving'];
    const routePromises = modes.map(async (mode) => {
      try {
        const response = await fetch(
          `${MAPS_API_BASE}/directions/json?origin=${originStr}&destination=${destStr}&mode=${mode}&departure_time=now&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        
        if (data.status === 'OK') {
          const route = data.routes[0];
          const leg = route.legs[0];
          return {
            mode,
            duration: leg.duration,
            durationInTraffic: leg.duration_in_traffic,
            distance: leg.distance,
            source: 'google'
          };
        }
        return null;
      } catch (error) {
        console.error(`❌ Error getting ${mode} route:`, error);
        return null;
      }
    });
    
    const routes = await Promise.all(routePromises);
    return routes.filter(route => route !== null);
  } catch (error) {
    console.error('❌ Error getting walking/driving routes:', error);
    return [];
  }
};