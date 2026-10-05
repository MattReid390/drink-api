const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const UserModel = require('../models/userModel');

const router = express.Router();

// GET /api/users/me - Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.getWithSettings(req.userId);
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
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PATCH /api/users/me - Update current user profile
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};

    if (name !== undefined) {
      updates.name = name;
    }
    if (email !== undefined) {
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await UserModel.update(req.userId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      verified: updatedUser.verified,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/settings - Get user settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await UserModel.getSettings(req.userId);
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({
      dailyLimitUnits: parseFloat(settings.daily_limit_units),
      weeklyLimitUnits: parseFloat(settings.weekly_limit_units),
      notificationsEnabled: settings.notifications_enabled,
      darkMode: settings.dark_mode,
      preferredUnits: settings.preferred_units,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PATCH /api/users/settings - Update user settings
router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const { dailyLimitUnits, weeklyLimitUnits, notificationsEnabled, darkMode, preferredUnits } = req.body;
    const updates = {};

    if (dailyLimitUnits !== undefined) {
      updates.daily_limit_units = Math.max(0, parseFloat(dailyLimitUnits));
    }
    if (weeklyLimitUnits !== undefined) {
      updates.weekly_limit_units = Math.max(0, parseFloat(weeklyLimitUnits));
    }
    if (notificationsEnabled !== undefined) {
      updates.notifications_enabled = Boolean(notificationsEnabled);
    }
    if (darkMode !== undefined) {
      updates.dark_mode = Boolean(darkMode);
    }
    if (preferredUnits !== undefined) {
      updates.preferred_units = preferredUnits;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedSettings = await UserModel.updateSettings(req.userId, updates);
    if (!updatedSettings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({
      dailyLimitUnits: parseFloat(updatedSettings.daily_limit_units),
      weeklyLimitUnits: parseFloat(updatedSettings.weekly_limit_units),
      notificationsEnabled: updatedSettings.notifications_enabled,
      darkMode: updatedSettings.dark_mode,
      preferredUnits: updatedSettings.preferred_units,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
