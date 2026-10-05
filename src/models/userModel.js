const pool = require('../db/config');

// User model for PostgreSQL database
class UserModel {
  // Create a new user
  static async create(id, email, hashedPassword, name) {
    const query = `
      INSERT INTO users (id, email, password, name, verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, verified, created_at;
    `;
    const values = [id, email, hashedPassword, name || '', false];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get user by email
  static async getByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1;';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  // Get user by ID
  static async getById(id) {
    const query = 'SELECT id, email, name, verified, created_at FROM users WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Update user
  static async update(id, updates) {
    const allowedFields = ['name', 'email', 'verified'];
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

    values.push(id);
    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, email, name, verified, created_at, updated_at;
    `;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Get user with settings
  static async getWithSettings(id) {
    const query = `
      SELECT
        u.id, u.email, u.name, u.verified, u.created_at,
        s.daily_limit_units, s.weekly_limit_units, s.notifications_enabled,
        s.dark_mode, s.preferred_units
      FROM users u
      LEFT JOIN user_settings s ON u.id = s.user_id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Get user settings
  static async getSettings(userId) {
    const query = 'SELECT * FROM user_settings WHERE user_id = $1;';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Create default settings for new user
  static async createSettings(userId) {
    const query = `
      INSERT INTO user_settings (user_id, daily_limit_units, weekly_limit_units)
      VALUES ($1, 14, 98)
      RETURNING *;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Update user settings
  static async updateSettings(userId, updates) {
    const allowedFields = ['daily_limit_units', 'weekly_limit_units', 'notifications_enabled', 'dark_mode', 'preferred_units'];
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
      UPDATE user_settings
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramIndex}
      RETURNING *;
    `;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Get user by email with password (for authentication)
  static async getByEmailWithPassword(email) {
    const query = 'SELECT * FROM users WHERE email = $1;';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  // Update user password
  static async updatePassword(id, hashedPassword) {
    const query = `
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, name, verified, created_at, updated_at;
    `;
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0] || null;
  }

  // List all users (admin only)
  static async listAll() {
    const query = 'SELECT id, email, name, verified, created_at FROM users ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  }

  // Delete user (admin only)
  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = UserModel;
