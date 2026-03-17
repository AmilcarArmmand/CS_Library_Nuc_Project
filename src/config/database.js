import mongoose from 'mongoose';
import { config } from './env.js';

// MongoDB connection options
const options = {
    // Connection pool settings
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6

    // Database name
    dbName: config.database.name
};

// Connection status tracking
let isConnected = false;

export const connectDatabase = async () => {
    if (isConnected) {
        console.log('📁 Database already connected');
        return;
    }

    try {
        const db = await mongoose.connect(config.database.uri, options);

        isConnected = true;
        console.log(`📁 MongoDB Connected: ${db.connection.host}`);
        console.log(`📊 Database: ${db.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('📁 MongoDB disconnected');
            isConnected = false;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('📁 MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

export const getConnectionStatus = () => isConnected;

export default mongoose;
