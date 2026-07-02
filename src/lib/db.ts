import mongoose from 'mongoose';
import Seat from '../models/Seat';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library_crm';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      // Seeding validation: ensure exactly 150 seats exist
      try {
        const count = await Seat.countDocuments({});
        if (count !== 150) {
          console.log(`[DB Seed] Seat count is ${count}. Re-initializing 150 seats...`);
          // Clear any existing seats to avoid conflict
          await Seat.deleteMany({});
          
          const seats = [];
          for (let i = 1; i <= 150; i++) {
            seats.push({
              seatNumber: i,
              status: 'Available',
              currentStudentId: null,
            });
          }
          await Seat.insertMany(seats);
          console.log('[DB Seed] Successfully initialized exactly 150 seats.');
        }
      } catch (err) {
        console.error('[DB Seed] Error initializing seats:', err);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
