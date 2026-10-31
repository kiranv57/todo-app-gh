const { UserModel } = require('../models/User');
const { hashPassword, comparePassword } = require('../lib/hash');
const { signToken } = require('../lib/jwt');
const { getEnv } = require('../config/env');

function sanitizeUser(user) {
  const { passwordHash, ...clean } = user;
  return clean;
}

function registerUser({ username, email, password }) {
  const env = getEnv();
  const passwordHash = hashPassword(password);

  const doc = UserModel.create({
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
    env.JWT_SECRET,
    900 // 15 mins
  );

  return {
    user,
    token
  };
}

function loginUser({ email, password }) {
  const env = getEnv();
  const doc = UserModel.findByEmail(email);

  if (!doc) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const isValid = comparePassword(password, doc.passwordHash);
  if (!isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const user = sanitizeUser(doc);
  const token = signToken(
    {
      sub: user._id,
      email: user.email,
      username: user.username
    },
    env.JWT_SECRET,
    900
  );

  return {
    user,
    token
  };
}

function getUserById(id) {
  const doc = UserModel.findById(id);
  if (!doc) return null;
  return sanitizeUser(doc);
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  sanitizeUser
};
