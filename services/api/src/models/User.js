const crypto = require('node:crypto');
const { ConflictError, NotFoundError } = require('../errors');

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * UserRepository Container Blueprint
 * Encapsulates user collection storage and query constraints.
 * Avoids the module-level singleton trap by accepting a storage instance in its constructor.
 */
class UserRepository {
  #store;

  constructor(store = new Map()) {
    this.#store = store;
  }

  create({ username, email, passwordHash }) {
    const lowerEmail = email.toLowerCase();
    const lowerUsername = username.toLowerCase();

    for (const user of this.#store.values()) {
      if (user.email.toLowerCase() === lowerEmail) {
        throw new ConflictError('Email already registered');
      }
      if (user.username.toLowerCase() === lowerUsername) {
        throw new ConflictError('Username already taken');
      }
    }

    const _id = generateObjectId();
    const doc = {
      _id,
      id: _id,
      username,
      email: lowerEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    this.#store.set(_id, doc);
    return doc;
  }

  findByEmail(email) {
    if (!email) return null;
    const lower = email.toLowerCase();
    for (const user of this.#store.values()) {
      if (user.email.toLowerCase() === lower) {
        return user;
      }
    }
    return null;
  }

  findById(id) {
    return this.#store.get(id) || null;
  }

  clear() {
    this.#store.clear();
  }
}

const defaultUserStore = new Map();
const UserModel = new UserRepository(defaultUserStore);

module.exports = {
  UserRepository,
  UserModel,
  defaultUserStore,
  generateObjectId
};
