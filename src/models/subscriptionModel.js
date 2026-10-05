const pool = require('../db/config');

class SubscriptionModel {
  // Get user subscription
  static async getByUserId(userId) {
    const query = 'SELECT * FROM subscriptions WHERE user_id = $1;';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Create subscription
  static async create(userId, stripeCustomerId, stripePlan = 'free') {
    const query = `
      INSERT INTO subscriptions (user_id, stripe_customer_id, plan, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, stripeCustomerId, stripePlan]);
    return result.rows[0];
  }

  // Update subscription
  static async update(userId, updates) {
    const allowedFields = ['plan', 'status', 'stripe_subscription_id', 'current_period_start', 'current_period_end', 'cancel_at'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return null;

    values.push(userId);
    const query = `
      UPDATE subscriptions
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramIndex}
      RETURNING *;
    `;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Check if user is premium
  static async isPremium(userId) {
    const query = `
      SELECT 1 FROM subscriptions
      WHERE user_id = $1 AND status = 'active' AND plan != 'free';
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0;
  }

  // Get by Stripe customer ID
  static async getByStripeCustomerId(stripeCustomerId) {
    const query = 'SELECT * FROM subscriptions WHERE stripe_customer_id = $1;';
    const result = await pool.query(query, [stripeCustomerId]);
    return result.rows[0] || null;
  }
}

class CoachingModel {
  // Create coaching session
  static async create(userId, topic, recommendation, severity = 'info') {
    const query = `
      INSERT INTO coaching_sessions (user_id, topic, recommendation, severity)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, topic, recommendation, severity]);
    return result.rows[0];
  }

  // Get active coaching sessions
  static async getActive(userId) {
    const query = `
      SELECT * FROM coaching_sessions
      WHERE user_id = $1 AND dismissed_at IS NULL
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Dismiss coaching session
  static async dismiss(id) {
    const query = `
      UPDATE coaching_sessions
      SET dismissed_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Get all coaching for user
  static async getByUserId(userId, limit = 10) {
    const query = `
      SELECT * FROM coaching_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }
}

class HealthIntegrationModel {
  // Create or update health integration
  static async upsert(userId, provider, accessToken, refreshToken, expiresAt) {
    const query = `
      INSERT INTO health_integrations (user_id, provider, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        provider = $2,
        access_token = $3,
        refresh_token = $4,
        token_expires_at = $5,
        updated_at = NOW()
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, provider, accessToken, refreshToken, expiresAt]);
    return result.rows[0];
  }

  // Get integration
  static async getByUserId(userId) {
    const query = 'SELECT * FROM health_integrations WHERE user_id = $1;';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Update sync time
  static async updateSyncTime(userId) {
    const query = `
      UPDATE health_integrations
      SET synced_at = NOW()
      WHERE user_id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Disconnect integration
  static async disconnect(userId) {
    const query = 'DELETE FROM health_integrations WHERE user_id = $1 RETURNING id;';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }
}

module.exports = { SubscriptionModel, CoachingModel, HealthIntegrationModel };
