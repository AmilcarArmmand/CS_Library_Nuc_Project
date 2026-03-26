import { User, ProjectData } from '../models/index.js';

// Test database operations
export const testDatabaseOperations = async () => {
    try {
        console.log('🧪 Testing database operations...');

        // Test 1: Count users
        const userCount = await User.countDocuments();
        console.log(`Total users in database: ${userCount}`);

        // Test 2: Find recent users
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('email name createdAt');
        console.log('Recent users:', recentUsers);

        // Test 3: Count project data
        const dataCount = await ProjectData.countDocuments();
        console.log(`Total project records: ${dataCount}`);

        // Test 4: User statistics
        const userStats = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        console.log('User role distribution:', userStats);

        console.log('Database tests completed successfully');

    } catch (error) {
        console.error('Database test failed:', error);
    }
};

// Seed sample data for development
export const seedSampleData = async () => {
    try {
        console.log('Seeding sample data...');

        // Only seed if no data exists
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('Data already exists, skipping seed');
            return;
        }

        // Sample data seeding TODO
        console.log('Sample data seeding');

    } catch (error) {
        console.error('Seeding failed:', error);
    }
};
