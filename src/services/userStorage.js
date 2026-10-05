// In-memory user storage (mock database)
const users = new Map();
const verificationCodes = new Map();
const resetCodes = new Map();

module.exports = {
  users,
  verificationCodes,
  resetCodes,

  // User operations
  getUserByEmail(email) {
    for (const user of users.values()) {
      if (user.email === email) return user;
    }
    return null;
  },

  getUserById(id) {
    return users.get(id);
  },

  createUser(id, email, hashedPassword, name) {
    const user = {
      id,
      email,
      password: hashedPassword,
      name,
      verified: false,
      createdAt: new Date().toISOString(),
    };
    users.set(id, user);
    return user;
  },

  updateUser(id, updates) {
    const user = users.get(id);
    if (user) {
      Object.assign(user, updates);
      users.set(id, user);
    }
    return user;
  },

  // Verification code operations
  storeVerificationCode(email, code) {
    verificationCodes.set(email, {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
  },

  getVerificationCode(email) {
    return verificationCodes.get(email);
  },

  deleteVerificationCode(email) {
    verificationCodes.delete(email);
  },

  // Password reset code operations
  storeResetCode(email, code) {
    resetCodes.set(email, {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });
  },

  getResetCode(email) {
    return resetCodes.get(email);
  },

  deleteResetCode(email) {
    resetCodes.delete(email);
  },
};
