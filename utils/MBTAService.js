import { MBTA_API_KEY } from '../config/secrets';

const MBTA_API_BASE = 'https://api-v3.mbta.com';
const API_KEY = MBTA_API_KEY;
  

export const findNearbyStops = async (latitude, longitude, radius = 0.2) => {
    try {
      const response = await fetch(
        `${MBTA_API_BASE}/stops?filter[latitude]=${latitude}&filter[longitude]=${longitude}&filter[radius]=${radius}&sort=distance&api_key=${API_KEY}`
      );
      const data = await response.json();
      
      // Filter to only major transit types and limit results
      const filteredStops = data.data
        .filter(stop => {
          // Only include subway, light rail, and major bus stops
          const hasRelevantRoutes = stop.relationships?.route?.data?.some(route => {
            // This is a simplified filter - we'll get route details separately
            return true; // For now, include all stops but limit by distance
          });
          return stop.attributes.latitude && stop.attributes.longitude;
        })
        .slice(0, 8) // Limit to closest 8 stops
        .map(stop => ({
          id: stop.id,
          name: stop.attributes.name,
          latitude: stop.attributes.latitude,
          longitude: stop.attributes.longitude,
          distance: calculateDistance(latitude, longitude, stop.attributes.latitude, stop.attributes.longitude),
          routes: stop.relationships?.route?.data || [],
          wheelchairAccessible: stop.attributes.wheelchair_boarding === 1
        }))
        .sort((a, b) => a.distance - b.distance); // Sort by distance
      
      console.log(`🚇 Found ${filteredStops.length} nearby stops (filtered from ${data.data.length})`);
      
      return filteredStops;
    } catch (error) {
      console.error('❌ Error finding nearby stops:', error);
      return [];
    }
  };
  
  // Add this helper function
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in miles
  };

export const getNextDepartures = async (stopId, limit = 5) => {
  try {
    const response = await fetch(
      `${MBTA_API_BASE}/predictions?filter[stop]=${stopId}&sort=departure_time&include=trip,route&api_key=${API_KEY}`
    );
    const data = await response.json();
    
    const departures = data.data
      .filter(prediction => prediction.attributes.departure_time)
      .slice(0, limit)
      .map(prediction => {
        const route = data.included?.find(item => 
          item.type === 'route' && item.id === prediction.relationships.route.data.id
        );
        
        const trip = data.included?.find(item => 
          item.type === 'trip' && item.id === prediction.relationships.trip.data.id
        );

        return {
          departureTime: prediction.attributes.departure_time,
          direction: prediction.attributes.direction_id,
          routeId: route?.id,
          routeName: route?.attributes.short_name || route?.attributes.long_name,
          routeType: route?.attributes.type, // 0=light rail, 1=subway, 3=bus
          headsign: trip?.attributes.headsign,
          delay: prediction.attributes.delay || 0,
          minutesUntilDeparture: calculateMinutesUntil(prediction.attributes.departure_time)
        };
      });

    console.log(`🚌 Found ${departures.length} upcoming departures from stop ${stopId}`);
    return departures;
  } catch (error) {
    console.error('❌ Error getting departures:', error);
    return [];
  }
};

export const getRouteInfo = async (routeId) => {
  try {
    const response = await fetch(
      `${MBTA_API_BASE}/routes/${routeId}?api_key=${API_KEY}`
    );
    const data = await response.json();
    
    return {
      id: data.data.id,
      name: data.data.attributes.short_name || data.data.attributes.long_name,
      type: data.data.attributes.type,
      color: data.data.attributes.color,
      textColor: data.data.attributes.text_color,
      description: data.data.attributes.description
    };
  } catch (error) {
    console.error('❌ Error getting route info:', error);
    return null;
  }
};

export const planTransitTrip = async (fromLat, fromLng, toLat, toLng, arriveBy = null) => {
  try {
    // Note: MBTA doesn't have a direct trip planning endpoint
    // We'll find stops near origin and destination, then check routes
    const originStops = await findNearbyStops(fromLat, fromLng, 0.3);
    const destStops = await findNearbyStops(toLat, toLng, 0.3);
    
    if (originStops.length === 0 || destStops.length === 0) {
      return { error: 'No transit stops found nearby' };
    }

    // Get departures from origin stops
    const allDepartures = [];
    for (const stop of originStops.slice(0, 3)) { // Check top 3 closest stops
      const departures = await getNextDepartures(stop.id, 3);
      departures.forEach(dep => {
        dep.originStop = stop;
      });
      allDepartures.push(...departures);
    }

    // Sort by departure time
    allDepartures.sort((a, b) => 
      new Date(a.departureTime) - new Date(b.departureTime)
    );

    return {
      originStops,
      destStops,
      nextDepartures: allDepartures.slice(0, 5),
      tripPlanningNote: 'Full trip planning requires route matching - showing nearby departures'
    };
  } catch (error) {
    console.error('❌ Error planning transit trip:', error);
    return { error: 'Failed to plan transit trip' };
  }
};

const calculateMinutesUntil = (departureTime) => {
  const now = new Date();
  const departure = new Date(departureTime);
  const diffMs = departure - now;
  return Math.max(0, Math.round(diffMs / (1000 * 60)));
};

export const getTransitTypeIcon = (routeType) => {
  switch (routeType) {
    case 0: return '🚋'; // Light Rail (Green Line)
    case 1: return '🚇'; // Subway (Red, Blue, Orange)
    case 2: return '🚂'; // Commuter Rail
    case 3: return '🚌'; // Bus
    case 4: return '⛴️'; // Ferry
    default: return '🚇';
  }
};

export const getLineColor = (routeId) => {
  const colors = {
    'Red': '#DA291C',
    'Blue': '#003DA5',
    'Orange': '#ED8B00',
    'Green-B': '#00843D',
    'Green-C': '#00843D',
    'Green-D': '#00843D',
    'Green-E': '#00843D'
  };
  return colors[routeId] || '#666';
};