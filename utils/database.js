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
        distance REAL
      );`
    );
    console.log('✅ trips table created');
  } catch (error) {
    console.error('❌ Error creating table', error);
  }
};

export const insertTrip = (destination, leaveTime, arrivalTime, distance) => {
  if (!db) {
    console.warn('insertTrip called before DB was initialized');
    return;
  }

  try {
    const statement = db.prepareSync(
      `INSERT INTO trips (destination, leave_time, arrival_time, distance) VALUES (?, ?, ?, ?);`
    );
    
    const result = statement.executeSync([destination, leaveTime, arrivalTime, distance]);
    console.log('📌 Trip inserted');
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
    db.execSync('DROP TABLE IF EXISTS trips;');
    console.log('🗑️ Database table dropped');
    
    // Recreate the table with new schema
    db.execSync(
      `CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destination TEXT,
        leave_time TEXT,
        arrival_time TEXT,
        distance REAL
      );`
    );
    console.log('✅ Database reset complete');
  } catch (error) {
    console.error('❌ Error resetting database', error);
  }
};