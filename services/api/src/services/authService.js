const { hashPassword, comparePassword } = require('../lib/hash');
const { signToken } = require('../lib/jwt');
const { UnauthorizedError } = require('../errors');

function sanitizeUser(user) {
  const { passwordHash, ...clean } = user;
  return clean;
}

/**
 * AuthService Container Blueprint
 * Encapsulates identity verification, key derivation, and token issuance.
 * Receives UserRepository and JWT secret via constructor Dependency Injection.
 */
class AuthService {
  #userRepo;
  #jwtSecret;

  constructor(userRepo, jwtSecret) {
    if (!userRepo) throw new Error('AuthService requires UserRepository instance');
    if (!jwtSecret) throw new Error('AuthService requires JWT secret');
    this.#userRepo = userRepo;
    this.#jwtSecret = jwtSecret;
  }

  registerUser({ username, email, password }) {
    const passwordHash = hashPassword(password);
    const doc = this.#userRepo.create({
      username,
      email,
      passwordHash
    });

    const user = sanitizeUser(doc);
    const token = signToken(
      {
        sub: user._id,
        email: user.email,
        username: user.username
      },
      this.#jwtSecret,
      900 // 15 mins
    );

    return { user, token };
  }

  loginUser({ email, password }) {
    const doc = this.#userRepo.findByEmail(email);

    if (!doc) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = comparePassword(password, doc.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = sanitizeUser(doc);
    const token = signToken(
      {
        sub: user._id,
        email: user.email,
        username: user.username
      },
      this.#jwtSecret,
      900
    );

    return { user, token };
  }

  getUserById(id) {
    const doc = this.#userRepo.findById(id);
    if (!doc) return null;
    return sanitizeUser(doc);
  }
}

module.exports = {
  AuthService,
  sanitizeUser
};
