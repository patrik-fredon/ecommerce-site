import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const MONGODB_URI: string = process.env.MONGODB_URI;

interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: ConnectionCache;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = {
    conn: null,
    promise: null
  };
}

// MongoDB connection options
const connectionOpts: mongoose.ConnectOptions = {
  bufferCommands: true,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  writeConcern: {
    w: 'majority',
    j: true
  },
  readPreference: 'primaryPreferred'
};

export async function dbConnect() {
  try {
    if (cached.conn) {
      console.log('Using cached database connection');
      return cached.conn;
    }

    if (!cached.promise) {
      console.log('Creating new database connection');
      cached.promise = mongoose.connect(MONGODB_URI, connectionOpts);
    }

    cached.conn = await cached.promise;

    // Enhanced connection event handling
    mongoose.connection
      .on('connected', () => {
        console.log('MongoDB connected successfully');
        // Enable command monitoring in development
        if (process.env.NODE_ENV === 'development') {
          mongoose.set('debug', true);
        }
      })
      .on('error', (err) => {
        console.error('MongoDB connection error:', err);
        // Implement exponential backoff for reconnection
        setTimeout(() => {
          console.log('Attempting to reconnect to MongoDB...');
          mongoose.connect(MONGODB_URI, connectionOpts);
        }, 5000);
      })
      .on('disconnected', () => {
        console.log('MongoDB disconnected');
        cached.conn = null;
        cached.promise = null;
      })
      .on('reconnected', () => {
        console.log('MongoDB reconnected');
      })
      .on('reconnectFailed', () => {
        console.error('MongoDB reconnection failed');
      });

    // Log connection state with more detail
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    console.log(`MongoDB connection state: ${states[state as keyof typeof states]}`);
    
    // Log connection details in development
    if (process.env.NODE_ENV === 'development') {
      const { host, port, name } = mongoose.connection;
      console.log(`Connected to MongoDB at ${host}:${port}/${name}`);
    }

    // Handle process termination gracefully
    const gracefulShutdown = async (signal: string) => {
      try {
        console.log(`Received ${signal}, closing MongoDB connection...`);
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return cached.conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Export the mongoose instance for direct access when needed
export const getMongoose = () => cached.conn;

// Export connection status checker
export const isConnected = () => mongoose.connection.readyState === 1;

export default dbConnect;
