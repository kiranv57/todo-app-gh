const { registerSchema, loginSchema } = require('@repo/shared');
const { ValidationError, NotFoundError } = require('../errors');

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}

/**
 * AuthController Container Blueprint
 * Orchestrates HTTP parsing, schema validation, and delegates to AuthService.
 * Receives AuthService via constructor Dependency Injection.
 */
class AuthController {
  #authService;

  constructor(authService) {
    if (!authService) throw new Error('AuthController requires AuthService instance');
    this.#authService = authService;
  }

  register = (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', formatZodIssues(result.error));
    }

    const data = this.#authService.registerUser(result.data);
    return res.status(201).json({
      success: true,
      data
    });
  };

  login = (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', formatZodIssues(result.error));
    }

    const data = this.#authService.loginUser(result.data);
    return res.status(200).json({
      success: true,
      data
    });
  };

  me = (req, res) => {
    const user = this.#authService.getUserById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  };
}

module.exports = {
  AuthController
};
