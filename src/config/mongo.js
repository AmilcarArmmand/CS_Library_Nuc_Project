
import mongoose from 'mongoose';
import { config } from './env.js';

/* Connection status tracking  */
let isMongoConnected = false;

export const connectMongoDB = async () => {
    if (isMongoConnected) {
        console.log('MongoDB already connected');
        return;
    }

    try {
        /* MongoDB connection options */
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            dbName: config.mongodb.name,
        };

        const conn = await mongoose.connect(config.mongodb.uri, options);
        
        isMongoConnected = true;
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`MongoDB Database: ${conn.connection.name}`);

        /* Handle connection events */
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            isMongoConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            isMongoConnected = false;
        });

        /* Graceful shutdown */
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
        });

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
};

export const getMongoStatus = () => isMongoConnected;
export const getMongoConnection = () => mongoose.connection;

export default mongoose;
