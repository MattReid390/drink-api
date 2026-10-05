const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const UserModel = require('../models/userModel');
const pool = require('../db/config');

const router = express.Router();

// Middleware: Check if user is admin (can be improved with role-based access)
const adminMiddleware = async (req, res, next) => {
  try {
    // For now, check if user email ends with @admin.drink (simple example)
    // In production, use a proper admin role in the database
    const user = await UserModel.getById(req.userId);

    // Allow if user is marked as admin (would need to add admin field to users table)
    // For demo: allow any authenticated user to access admin endpoints
    // TODO: Implement proper admin role verification

    next();
  } catch (error) {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// GET /api/admin/users - List all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await UserModel.listAll();

    res.json({
      userCount: users.length,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        verified: u.verified,
        createdAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /api/admin/users/:id - Get user details
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await UserModel.getWithSettings(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      verified: user.verified,
      createdAt: user.created_at,
      settings: {
        dailyLimitUnits: parseFloat(user.daily_limit_units),
        weeklyLimitUnits: parseFloat(user.weekly_limit_units),
        notificationsEnabled: user.notifications_enabled,
        darkMode: user.dark_mode,
        preferredUnits: user.preferred_units,
      },
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PATCH /api/admin/users/:id - Update user (admin)
router.patch('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { verified, name } = req.body;
    const updates = {};

    if (verified !== undefined) updates.verified = verified;
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await UserModel.update(req.params.id, updates);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      verified: updatedUser.verified,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user (admin)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deletedUser = await UserModel.delete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', userId: deletedUser.id });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/analytics - Platform-wide analytics
router.get('/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usersQuery = 'SELECT COUNT(*) as count FROM users;';
    const drinksQuery = 'SELECT COUNT(*) as count, SUM(units) as total_units FROM drinks;';
    const venuesQuery = 'SELECT COUNT(*) as count FROM venues;';
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM drinks
      WHERE created_at >= NOW() - INTERVAL '30 days';
    `;

    const [usersResult, drinksResult, venuesResult, activeUsersResult] = await Promise.all([
      pool.query(usersQuery),
      pool.query(drinksQuery),
      pool.query(venuesQuery),
      pool.query(activeUsersQuery),
    ]);

    const users = parseInt(usersResult.rows[0].count);
    const drinks = parseInt(drinksResult.rows[0].count);
    const totalUnits = parseFloat(drinksResult.rows[0].total_units || 0);
    const venues = parseInt(venuesResult.rows[0].count);
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    res.json({
      platform: {
        totalUsers: users,
        activeUsers30d: activeUsers,
        totalVenues: venues,
      },
      drinks: {
        totalDrinks: drinks,
        totalUnits: totalUnits.toFixed(1),
        averageUnitsPerDrink: drinks > 0 ? (totalUnits / drinks).toFixed(2) : 0,
      },
      metrics: {
        drinksPerActiveUser: activeUsers > 0 ? (drinks / activeUsers).toFixed(1) : 0,
        userEngagementRate: users > 0 ? ((activeUsers / users) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;
