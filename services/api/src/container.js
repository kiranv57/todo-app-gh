const { UserRepository, defaultUserStore } = require('./models/User');
const { TodoRepository, defaultTodoStore } = require('./models/Todo');
const { AuthService } = require('./services/authService');
const { TodoService } = require('./services/todoService');
const { AuthController } = require('./controllers/authController');
const { TodoController } = require('./controllers/todoController');
const { getEnv } = require('./config/env');

/**
 * Composition Root Factory
 * Instantiates the full dependency graph bottom-up with explicit Dependency Injection.
 * Supports isolated container creation for deterministic testing and clean production singletons.
 */
function createContainer(options = {}) {
  const jwtSecret = options.jwtSecret || (process.env.JWT_SECRET ? getEnv().JWT_SECRET : undefined);

  // Storage adapters & repositories
  const userStore = options.userStore || (options.isolated ? new Map() : defaultUserStore);
  const todoStore = options.todoStore || (options.isolated ? new Map() : defaultTodoStore);

  const userRepository = new UserRepository(userStore);
  const todoRepository = new TodoRepository(todoStore);

  // Domain services
  const authService = new AuthService(userRepository, jwtSecret);
  const todoService = new TodoService(todoRepository);

  // HTTP controllers
  const authController = new AuthController(authService);
  const todoController = new TodoController(todoService);

  return {
    userStore,
    todoStore,
    userRepository,
    todoRepository,
    authService,
    todoService,
    authController,
    todoController
  };
}

module.exports = {
  createContainer
};
