const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { SubscriptionModel, CoachingModel, HealthIntegrationModel } = require('../models/subscriptionModel');

const router = express.Router();

// ===== SUBSCRIPTION ENDPOINTS =====

// GET /api/premium/subscription - Get user subscription
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const subscription = await SubscriptionModel.getByUserId(req.userId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      id: subscription.id,
      userId: subscription.user_id,
      plan: subscription.plan,
      status: subscription.status,
      stripeCustomerId: subscription.stripe_customer_id,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAt: subscription.cancel_at,
      isPremium: subscription.plan !== 'free' && subscription.status === 'active',
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// POST /api/premium/subscription/upgrade - Upgrade to premium
router.post('/subscription/upgrade', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !['premium', 'premium_plus'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const subscription = await SubscriptionModel.getByUserId(req.userId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updated = await SubscriptionModel.update(req.userId, { plan, status: 'active' });

    res.json({
      message: `Upgraded to ${plan}`,
      plan: updated.plan,
      status: updated.status,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// POST /api/premium/subscription/cancel - Cancel subscription
router.post('/subscription/cancel', authMiddleware, async (req, res) => {
  try {
    const cancelAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const updated = await SubscriptionModel.update(req.userId, {
      cancel_at: cancelAt,
      status: 'canceled',
    });

    res.json({
      message: 'Subscription canceled',
      cancelAt: updated.cancel_at,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ===== COACHING ENDPOINTS =====

// GET /api/premium/coaching - Get active coaching recommendations
router.get('/coaching', authMiddleware, async (req, res) => {
  try {
    const isPremium = await SubscriptionModel.isPremium(req.userId);
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium feature' });
    }

    const sessions = await CoachingModel.getActive(req.userId);

    res.json({
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        topic: s.topic,
        recommendation: s.recommendation,
        severity: s.severity,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error('Get coaching error:', error);
    res.status(500).json({ error: 'Failed to fetch coaching' });
  }
});

// POST /api/premium/coaching/:id/dismiss - Dismiss coaching
router.post('/coaching/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    const dismissed = await CoachingModel.dismiss(req.params.id);
    if (!dismissed) {
      return res.status(404).json({ error: 'Coaching session not found' });
    }

    res.json({ message: 'Coaching dismissed', id: dismissed.id });
  } catch (error) {
    console.error('Dismiss coaching error:', error);
    res.status(500).json({ error: 'Failed to dismiss coaching' });
  }
});

// POST /api/premium/coaching/refresh - Generate new coaching
router.post('/coaching/refresh', authMiddleware, async (req, res) => {
  try {
    const isPremium = await SubscriptionModel.isPremium(req.userId);
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium feature' });
    }

    // In production, integrate with Claude API for AI coaching
    const coachingTopics = [
      {
        topic: 'moderation',
        recommendation: 'Try to have at least 3 alcohol-free days this week to give your body time to recover.',
        severity: 'info',
      },
      {
        topic: 'hydration',
        recommendation: 'Drink water between alcoholic drinks to stay hydrated and reduce hangovers.',
        severity: 'info',
      },
      {
        topic: 'pacing',
        recommendation: 'Pace your drinks throughout the evening rather than consuming quickly.',
        severity: 'info',
      },
    ];

    const randomCoaching = coachingTopics[Math.floor(Math.random() * coachingTopics.length)];
    const session = await CoachingModel.create(
      req.userId,
      randomCoaching.topic,
      randomCoaching.recommendation,
      randomCoaching.severity
    );

    res.json({
      id: session.id,
      topic: session.topic,
      recommendation: session.recommendation,
      severity: session.severity,
      message: 'New coaching recommendation generated',
    });
  } catch (error) {
    console.error('Refresh coaching error:', error);
    res.status(500).json({ error: 'Failed to generate coaching' });
  }
});

// ===== HEALTH INTEGRATION ENDPOINTS =====

// GET /api/premium/health - Get health integration status
router.get('/health', authMiddleware, async (req, res) => {
  try {
    const isPremium = await SubscriptionModel.isPremium(req.userId);
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium feature' });
    }

    const integration = await HealthIntegrationModel.getByUserId(req.userId);

    if (!integration) {
      return res.json({
        connected: false,
        message: 'No health integration connected',
      });
    }

    res.json({
      connected: true,
      provider: integration.provider,
      syncedAt: integration.synced_at,
      lastTokenRefresh: integration.updated_at,
    });
  } catch (error) {
    console.error('Get health status error:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// POST /api/premium/health/connect - Connect health provider
router.post('/health/connect', authMiddleware, async (req, res) => {
  try {
    const isPremium = await SubscriptionModel.isPremium(req.userId);
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium feature' });
    }

    const { provider, accessToken, refreshToken, expiresIn } = req.body;

    if (!provider || !accessToken) {
      return res.status(400).json({ error: 'Provider and access token required' });
    }

    const expiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000);

    const integration = await HealthIntegrationModel.upsert(
      req.userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt
    );

    res.json({
      message: `Connected to ${provider}`,
      provider: integration.provider,
      connectedAt: integration.created_at,
    });
  } catch (error) {
    console.error('Connect health error:', error);
    res.status(500).json({ error: 'Failed to connect health provider' });
  }
});

// POST /api/premium/health/sync - Sync health data
router.post('/health/sync', authMiddleware, async (req, res) => {
  try {
    const isPremium = await SubscriptionModel.isPremium(req.userId);
    if (!isPremium) {
      return res.status(403).json({ error: 'Premium feature' });
    }

    const integration = await HealthIntegrationModel.getByUserId(req.userId);
    if (!integration) {
      return res.status(404).json({ error: 'No health integration connected' });
    }

    // In production, fetch data from health provider API
    // For now, just update the sync time
    const updated = await HealthIntegrationModel.updateSyncTime(req.userId);

    res.json({
      message: 'Health data synced',
      provider: updated.provider,
      syncedAt: updated.synced_at,
      dataPoints: {
        stepsToday: Math.floor(Math.random() * 20000),
        sleepHours: (Math.random() * 4 + 4).toFixed(1),
        heartRate: Math.floor(Math.random() * 40 + 60),
      },
    });
  } catch (error) {
    console.error('Sync health error:', error);
    res.status(500).json({ error: 'Failed to sync health data' });
  }
});

// DELETE /api/premium/health/disconnect - Disconnect health provider
router.delete('/health/disconnect', authMiddleware, async (req, res) => {
  try {
    const deleted = await HealthIntegrationModel.disconnect(req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'No integration to disconnect' });
    }

    res.json({ message: 'Health integration disconnected' });
  } catch (error) {
    console.error('Disconnect health error:', error);
    res.status(500).json({ error: 'Failed to disconnect health provider' });
  }
});

module.exports = router;
