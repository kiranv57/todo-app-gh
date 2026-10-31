const { NotFoundError, ForbiddenError } = require('../errors');

/**
 * TodoService Container Blueprint
 * Encapsulates domain logic for todos, pagination policies, and dashboard metrics.
 * Receives TodoRepository via constructor Dependency Injection.
 */
class TodoService {
  #todoRepo;

  constructor(todoRepo) {
    if (!todoRepo) throw new Error('TodoService requires TodoRepository instance');
    this.#todoRepo = todoRepo;
  }

  createTodo({ title, description, ownerId }) {
    return this.#todoRepo.create({ title, description, ownerId });
  }

  listTodos({ ownerId, completed, page = 1, limit = 10 }) {
    return this.#todoRepo.findByOwner({ ownerId, completed, page, limit });
  }

  getTodoById({ id, ownerId }) {
    const todo = this.#todoRepo.findById(id);
    if (!todo) {
      throw new NotFoundError('Todo not found');
    }

    if (todo.owner !== ownerId) {
      throw new ForbiddenError('Access denied: You do not own this todo item');
    }

    return todo;
  }

  updateTodo({ id, ownerId, updates }) {
    return this.#todoRepo.update({ id, ownerId, updates });
  }

  deleteTodo({ id, ownerId }) {
    return this.#todoRepo.delete({ id, ownerId });
  }

  getDashboardStats(ownerId) {
    return this.#todoRepo.getStats(ownerId);
  }
}

module.exports = {
  TodoService
};
