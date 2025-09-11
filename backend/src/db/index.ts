import mongoose from 'mongoose';

/**
 * MongoDB Connection
 * This file establishes and manages the connection to MongoDB
 */

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

// MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

/**
 * Connect to MongoDB
 * @returns {Promise<typeof mongoose>} Mongoose connection
 */
export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`
 MONGO DB Connected !! DB HOST:
            ${conn.connection.host}
    `);
  
    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    return mongoose;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1); // Exit with failure
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error}`);
  }
};

export default { connectDB, disconnectDB };
