const mongoose = require('mongoose');

const readyStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let mongodInstance = null;

/**
 * Connect to MongoDB instance using MONGODB_URI or auto-fallback to in-memory server
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  // 1. If explicit MONGODB_URI is provided, attempt connection
  if (mongoURI) {
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
      
      const User = require('../models/User');
      const { Department } = require('../models/Department');
      await User.seedAdminIfEmpty().catch(() => {});
      await Department.seedDefaultsIfEmpty().catch(() => {});

      return conn;
    } catch (error) {
      console.warn(`[MongoDB] Could not connect to configured MONGODB_URI (${error.message}). Attempting development fallback...`);
    }
  } else {
    // Attempt local MongoDB on default port 27017 first with 1500ms timeout
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/college_complaint_db', {
        serverSelectionTimeoutMS: 1500,
      });
      console.log(`[MongoDB] Connected successfully to local MongoDB host: ${conn.connection.host}, database: ${conn.connection.name}`);
      
      const User = require('../models/User');
      const { Department } = require('../models/Department');
      await User.seedAdminIfEmpty().catch(() => {});
      await Department.seedDefaultsIfEmpty().catch(() => {});

      return conn;
    } catch (err) {
      console.log('[MongoDB] Local MongoDB service is not running on port 27017.');
    }
  }

  // 2. In Non-Production mode: Automatically start an in-memory Mongo server as seamless fallback
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('[MongoDB] Initializing seamless In-Memory MongoDB engine for development & testing...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[MongoDB] In-Memory MongoDB connected successfully (${memoryUri}). Ready for student & admin workflows.`);
      
      // Auto-seed default admin and departments
      const User = require('../models/User');
      const { Department } = require('../models/Department');
      await User.seedAdminIfEmpty().catch(() => {});
      await Department.seedDefaultsIfEmpty().catch(() => {});
      
      return conn;
    } catch (memError) {
      console.error('[MongoDB] Failed to start In-Memory MongoDB server:', memError);
    }
  }

  return null;
};

// Setup connection lifecycle event handlers
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection event: Connected to database');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Connection error event: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection event: Disconnected from database');
});

/**
 * Returns current database connectivity status metrics
 */
const getDBStatus = () => {
  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;

  return {
    isConnected,
    state: readyStates[stateCode] || 'unknown',
    stateCode,
    host: isConnected ? mongoose.connection.host : null,
    port: isConnected ? mongoose.connection.port : null,
    databaseName: isConnected ? mongoose.connection.name : null,
  };
};

module.exports = {
  connectDB,
  getDBStatus,
};
