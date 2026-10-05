const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserModel = require('../models/userModel');
const verificationCodes = new Map();
const resetCodes = new Map();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// Generate 6-digit verification/reset code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique ID
function generateId() {
  return crypto.randomUUID();
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup - User registration
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await UserModel.getByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = generateId();
    const user = await UserModel.create(userId, email, hashedPassword, name || '');

    // Create default user settings
    await UserModel.createSettings(userId);

    // Generate and store verification code
    const verificationCode = generateCode();
    verificationCodes.set(email, {
      code: verificationCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // Log verification code (in production, send via email)
    console.log(`✉️  Verification code for ${email}: ${verificationCode}`);

    res.status(201).json({
      message: 'User registered. Verification code sent to email.',
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/verify-email - Verify email with code
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    const stored = verificationCodes.get(email);

    if (!stored) {
      return res.status(400).json({ error: 'No verification code found' });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'Verification code expired' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Mark user as verified
    const user = await UserModel.getByEmail(email);
    if (user) {
      await UserModel.update(user.id, { verified: true });
      verificationCodes.delete(email);

      res.json({
        message: 'Email verified successfully',
        userId: user.id,
        email: user.email,
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await UserModel.getByEmailWithPassword(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
      const user = await UserModel.getById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const newToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '15m',
      });

      res.json({ token: newToken });
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/request-password-reset - Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await UserModel.getByEmail(email);

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({ message: 'If email exists, reset code will be sent' });
    }

    // Generate and store reset code
    const resetCode = generateCode();
    resetCodes.set(email, {
      code: resetCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    // Log reset code (in production, send via email)
    console.log(`🔐 Password reset code for ${email}: ${resetCode}`);

    res.json({ message: 'If email exists, reset code will be sent' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// POST /api/auth/reset-password - Reset password with code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const stored = resetCodes.get(email);

    if (!stored) {
      return res.status(400).json({ error: 'No reset code found' });
    }

    if (Date.now() > stored.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ error: 'Reset code expired' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const user = await UserModel.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await UserModel.updatePassword(user.id, hashedPassword);
    resetCodes.delete(email);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// GET /api/auth/me - Get current user
const authMiddleware = require('../middleware/authMiddleware');
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.getById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      verified: user.verified,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /api/auth/logout - Logout (just acknowledgement, token cleanup on client)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
