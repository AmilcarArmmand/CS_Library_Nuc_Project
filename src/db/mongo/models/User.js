import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    // Google OAuth Information
    googleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Profile Information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(email) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email address'
        }
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    firstName: {
        type: String,
        required: false,  // Optional - Google may not always provide this
        trim: true
    },

    lastName: {
        type: String,
        required: false,  // Optional - Google may not always provide this
        trim: true
    },

    picture: {
        type: String,
        default: null
    },

    // Account Settings
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // Library-specific data (stored in MongoDB)
    projectData: {
        // Add fields specific to your project needs
        // Examples:
        preferences: {
            theme: { type: String, default: 'light' },
            notifications: { type: Boolean, default: true }
        },
        stats: {
            totalActions: { type: Number, default: 0 },
            completedTasks: { type: Number, default: 0 }
        }
    },

    // Metadata
    lastLogin: {
        type: Date,
        default: Date.now
    },

    loginCount: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1, googleId: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Instance methods
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    this.loginCount += 1;
    return this.save();
};

userSchema.methods.updateProjectStats = function(statUpdates) {
    Object.keys(statUpdates).forEach(stat => {
        if (this.projectData.stats[stat] !== undefined) {
            this.projectData.stats[stat] = statUpdates[stat];
        }
    });
    return this.save();
};

// Static methods
userSchema.statics.findByGoogleId = function(googleId) {
    return this.findOne({ googleId });
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getActiveUsers = function() {
    return this.find({ isActive: true }).sort({ lastLogin: -1 });
};

// Pre-save middleware
userSchema.pre('save', function() {
    // Ensure email is lowercase
    if (this.email) {
        this.email = this.email.toLowerCase();
    }

});

const User = mongoose.model('User', userSchema);

export default User;
