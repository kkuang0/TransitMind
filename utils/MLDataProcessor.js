export const calculateTravelTime = (leaveTime, arrivalTime) => {
    const start = new Date(leaveTime);
    const end = new Date(arrivalTime);
    return (end - start) / (1000 * 60); // minutes
  };
  
  export const extractTimeFeatures = (dateString) => {
    const date = new Date(dateString);
    return {
      dayOfWeek: date.getDay(), // 0-6 (Sunday = 0)
      hourOfDay: date.getHours(), // 0-23
      isWeekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0
    };
  };
  
  export const estimateExpectedTime = (distance) => {
    // Simple baseline: assume 30 km/h average speed for transit
    const avgSpeedKmh = 30;
    const distanceKm = distance / 1000;
    return (distanceKm / avgSpeedKmh) * 60; // minutes
  };
  
  export const determineWeatherCondition = () => {
    // For now, return 'unknown' - later we can integrate weather API
    return 'unknown';
  };
  
  export const checkIfDelayed = (actualTime, expectedTime) => {
    const delayThresholdMinutes = 5;
    return actualTime > (expectedTime + delayThresholdMinutes) ? 1 : 0;
  };
  
  export const buildMLFeatures = (leaveTime, arrivalTime, distance, startCoords, endCoords, destination) => {
    const timeFeatures = extractTimeFeatures(leaveTime);
    const travelTime = calculateTravelTime(leaveTime, arrivalTime);
    const expectedTime = estimateExpectedTime(distance);
    
    return {
      destination,
      leaveTime,
      arrivalTime,
      distance,
      dayOfWeek: timeFeatures.dayOfWeek,
      hourOfDay: timeFeatures.hourOfDay,
      isWeekend: timeFeatures.isWeekend,
      weatherCondition: determineWeatherCondition(),
      travelTimeMinutes: travelTime,
      expectedTimeMinutes: expectedTime,
      wasDelayed: checkIfDelayed(travelTime, expectedTime),
      startLat: startCoords.latitude,
      startLng: startCoords.longitude,
      endLat: endCoords.latitude,
      endLng: endCoords.longitude
    };
  };
  
  export const exportMLDataset = (trips) => {
    // Convert trips to ML-ready format
    return trips.map(trip => ({
      // Features for training
      day_of_week: trip.day_of_week,
      hour_of_day: trip.hour_of_day,
      is_weekend: trip.is_weekend,
      distance: trip.distance,
      start_lat: trip.start_lat,
      start_lng: trip.start_lng,
      destination_encoded: hashDestination(trip.destination),
      
      // Target variable
      travel_time_minutes: trip.travel_time_minutes,
      
      // Additional context
      was_delayed: trip.was_delayed,
      weather: trip.weather_condition
    }));
  };
  
  const hashDestination = (destination) => {
    // Simple hash for destination encoding
    let hash = 0;
    for (let i = 0; i < destination.length; i++) {
      const char = destination.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };