const User = require('../models/User');
const { 
  NotFoundError, 
  ConflictError, 
  ValidationError 
} = require('../middleware/errorHandler');

/**
 * User Service - Handles all user-related business logic
 */
class UserService {
  /**
   * Normalize phone number to E.164 format
   * @param {string} phoneNumber - Phone number to normalize
   * @returns {string|null} Normalized phone number
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber || !phoneNumber.trim()) return null;
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {object} User object
   */
  async getUserById(userId) {
    const user = await User.findById(userId)
      .select('-password -passwordResetToken -passwordResetExpires')
      .populate('deactivatedBy', 'username firstName lastName')
      .populate('reactivatedBy', 'username firstName lastName');

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  /**
   * Get all users with filtering and pagination
   * @param {object} options - Query options
   * @returns {object} Users and pagination info
   */
  async getAllUsers(options = {}) {
    const { page = 1, limit = 10, search, role, isActive } = options;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {object} updateData - Data to update
   * @returns {object} Updated user
   */
  async updateProfile(userId, updateData) {
    const { firstName, lastName, email, username, phoneNumber } = updateData;

    // Normalize phone number if provided
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Check if email, username, or phone number is already taken by another user
    if (email || username || normalizedPhone) {
      const orConditions = [];
      if (email) orConditions.push({ email });
      if (username) orConditions.push({ username });
      if (normalizedPhone) orConditions.push({ phoneNumber: normalizedPhone });

      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: userId } },
          { $or: orConditions }
        ]
      });

      if (existingUser) {
        let message = 'Field already taken';
        if (existingUser.email === email) {
          message = 'Email already taken';
        } else if (existingUser.username === username) {
          message = 'Username already taken';
        } else if (existingUser.phoneNumber === normalizedPhone) {
          message = 'Phone number already taken';
        }
        throw new ConflictError(message);
      }
    }

    // Build update data
    const finalUpdateData = {};
    if (firstName !== undefined) finalUpdateData.firstName = firstName;
    if (lastName !== undefined) finalUpdateData.lastName = lastName;
    if (email !== undefined) finalUpdateData.email = email;
    if (username !== undefined) finalUpdateData.username = username;
    if (normalizedPhone !== undefined) finalUpdateData.phoneNumber = normalizedPhone;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      finalUpdateData,
      {
        new: true,
        runValidators: true
      }
    );

    return updatedUser;
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {object} Updated user
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password
    const user = await User.findById(userId).select('+password');

    // Check current password
    if (!(await user.correctPassword(currentPassword, user.password))) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return user;
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID to deactivate
   * @returns {object} Deactivated user info
   */
  async deactivateAccount(userId) {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if user is already deactivated
    if (!user.isActive) {
      throw new ValidationError('User account is already deactivated');
    }

    // Deactivate account
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    return {
      userId: user._id,
      username: user.username,
      email: user.email,
      deactivatedAt: user.deactivatedAt
    };
  }

  /**
   * Reactivate user account (Admin only)
   * @param {string} userId - User ID to reactivate
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Reactivation reason
   * @returns {object} Reactivated user info
   */
  async reactivateAccount(userId, adminId, reason = 'Account reactivated by administrator') {
    // Check if user exists
    const userToReactivate = await User.findById(userId);
    if (!userToReactivate) {
      throw new NotFoundError('User');
    }

    // Check if user is already active
    if (userToReactivate.isActive) {
      throw new ValidationError('User account is already active');
    }

    // Get admin user info
    const adminUser = await User.findById(adminId);

    // Reactivate user account
    userToReactivate.isActive = true;
    userToReactivate.reactivatedBy = adminId;
    userToReactivate.reactivatedAt = new Date();
    userToReactivate.reactivationReason = reason;
    
    // Clear deactivation fields
    userToReactivate.deactivatedBy = undefined;
    userToReactivate.deactivatedAt = undefined;
    userToReactivate.deactivationReason = undefined;
    
    await userToReactivate.save();

    return {
      userId: userToReactivate._id,
      username: userToReactivate.username,
      email: userToReactivate.email,
      reactivatedAt: userToReactivate.reactivatedAt,
      reactivatedBy: adminUser?.username,
      reason: userToReactivate.reactivationReason
    };
  }

  /**
   * Get user statistics
   * @returns {object} User statistics
   */
  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      regularUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' })
    ]);
    
    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [recentRegistrations, recentDeactivations] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ deactivatedAt: { $gte: thirtyDaysAgo } })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      regularUsers,
      recentRegistrations,
      recentDeactivations,
      lastUpdated: new Date()
    };
  }
}

module.exports = new UserService();
