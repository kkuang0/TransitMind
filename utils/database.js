import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('transit.db');

export const initDatabase = () => {
  console.log('🛠 initDatabase() called');

  try {
    db.execSync(
      `CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destination TEXT,
        leave_time TEXT,
        arrival_time TEXT,
        distance REAL,
        day_of_week INTEGER,
        hour_of_day INTEGER,
        is_weekend INTEGER,
        weather_condition TEXT,
        travel_time_minutes REAL,
        expected_time_minutes REAL,
        was_delayed INTEGER,
        start_lat REAL,
        start_lng REAL,
        end_lat REAL,
        end_lng REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );
    console.log('✅ Enhanced trips table created');
  } catch (error) {
    console.error('❌ Error creating table', error);
  }
};

export const insertTrip = (tripData) => {
  if (!db) {
    console.warn('insertTrip called before DB was initialized');
    return;
  }

  try {
    const statement = db.prepareSync(
      `INSERT INTO trips (
        destination, leave_time, arrival_time, distance,
        day_of_week, hour_of_day, is_weekend, weather_condition,
        travel_time_minutes, expected_time_minutes, was_delayed,
        start_lat, start_lng, end_lat, end_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
    );
    
    const result = statement.executeSync([
      tripData.destination,
      tripData.leaveTime,
      tripData.arrivalTime,
      tripData.distance,
      tripData.dayOfWeek,
      tripData.hourOfDay,
      tripData.isWeekend,
      tripData.weatherCondition,
      tripData.travelTimeMinutes,
      tripData.expectedTimeMinutes,
      tripData.wasDelayed,
      tripData.startLat,
      tripData.startLng,
      tripData.endLat,
      tripData.endLng
    ]);
    
    console.log('📌 Enhanced trip inserted');
    statement.finalizeSync();
    return result;
  } catch (error) {
    console.error('❌ Error inserting trip', error);
  }
};

export const fetchTrips = () => {
  if (!db) {
    console.warn('fetchTrips called before DB was initialized');
    return [];
  }

  try {
    const statement = db.prepareSync('SELECT * FROM trips;');
    const result = statement.executeSync();
    const trips = result.getAllSync();
    console.log('📄 Fetched trips:', trips);
    statement.finalizeSync();
    return trips;
  } catch (error) {
    console.error('❌ Error fetching trips', error);
    return [];
  }
};

export const resetDatabase = () => {
  if (!db) {
    console.warn('resetDatabase called before DB was initialized');
    return;
  }

  try {
    // Force close and recreate database
    db.execSync('DROP TABLE IF EXISTS trips;');
    console.log('🗑️ Database table dropped');
    
    // Explicitly create the new table with ML schema
    db.execSync(
      `CREATE TABLE trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destination TEXT,
        leave_time TEXT,
        arrival_time TEXT,
        distance REAL,
        day_of_week INTEGER,
        hour_of_day INTEGER,
        is_weekend INTEGER,
        weather_condition TEXT,
        travel_time_minutes REAL,
        expected_time_minutes REAL,
        was_delayed INTEGER,
        start_lat REAL,
        start_lng REAL,
        end_lat REAL,
        end_lng REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );
    console.log('✅ New ML schema table created');
  } catch (error) {
    console.error('❌ Error resetting database', error);
  }
};