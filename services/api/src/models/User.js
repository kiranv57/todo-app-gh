const crypto = require('node:crypto');

// Simulated Mongoose / MongoDB collection state for isolated, deterministic execution
const users = new Map();

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

class UserModel {
  static create({ username, email, passwordHash }) {
    // Unique email index constraint
    for (const user of users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        const error = new Error('Email already registered');
        error.code = 11000;
        error.field = 'email';
        throw error;
      }
      if (user.username.toLowerCase() === username.toLowerCase()) {
        const error = new Error('Username already taken');
        error.code = 11000;
        error.field = 'username';
        throw error;
      }
    }

    const _id = generateObjectId();
    const doc = {
      _id,
      id: _id,
      username,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.set(_id, doc);
    return doc;
  }

  static findByEmail(email) {
    if (!email) return null;
    const lower = email.toLowerCase();
    for (const user of users.values()) {
      if (user.email.toLowerCase() === lower) {
        return user;
      }
    }
    return null;
  }

  static findById(id) {
    return users.get(id) || null;
  }

  static clear() {
    users.clear();
  }
}

module.exports = {
  UserModel,
  generateObjectId
};
