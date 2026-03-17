import { User, ProjectData } from '../db/mongo/models/index.js';

// User management utilities
export const userUtils = {
    // Find user by email
    findByEmail: async (email) => {
        return await User.findByEmail(email);
    },

    // Get user statistics
    getStats: async () => {
        const total = await User.countDocuments();
        const active = await User.countDocuments({ isActive: true });
        const byRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        return { total, active, byRole };
    },

    // Update user role
    updateRole: async (userId, role) => {
        return await User.findByIdAndUpdate(
            userId,
            { role: role },
            { new: true }
        );
    }
};

// Project data management utilities
export const projectDataUtils = {
    // Create new project data entry
    create: async (userId, data) => {
        const projectData = new ProjectData({
            user: userId,
            ...data
        });

        return await projectData.save();
    },

    // Get user's project data
    getByUser: async (userId) => {
        return await ProjectData.findByUser(userId);
    },

    // Get project data statistics
    getStats: async () => {
        const total = await ProjectData.countDocuments();
        const byCategory = await ProjectData.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const byStatus = await ProjectData.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        return { total, byCategory, byStatus };
    }
};

// Database maintenance utilities
export const maintenanceUtils = {
    // Clean up old data (customize based on your needs)
    cleanupOldData: async () => {
        // Example: Remove draft items older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await ProjectData.deleteMany({
            status: 'draft',
            createdAt: { $lt: thirtyDaysAgo }
        });

        console.log(`🧹 Cleaned up ${result.deletedCount} old draft items`);
        return result.deletedCount;
    },

    // Update user statistics
    updateUserStats: async () => {
        const users = await User.find();
        let updated = 0;

        for (const user of users) {
            const totalActions = await ProjectData.countDocuments({
                user: user._id
            });

            const completedTasks = await ProjectData.countDocuments({
                user: user._id,
                status: 'completed'
            });

            user.projectData.stats.totalActions = totalActions;
            user.projectData.stats.completedTasks = completedTasks;

            await user.save();
            updated++;
        }

        console.log(`📊 Updated statistics for ${updated} users`);
        return updated;
    }
};
