const { NotFoundError, ForbiddenError } = require('../errors');

/**
 * TodoService
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

  listTodos({ ownerId, completed, page = 1, limit = 10, role }) {
    return this.#todoRepo.findByOwner({ ownerId, completed, page, limit, role });
  }

  getTodoById({ id, ownerId, role }) {
    const todo = this.#todoRepo.findById(id);
    if (!todo) {
      throw new NotFoundError('Todo not found');
    }

    // Governor sees all todos; doer ownership check enforced
    if (todo.owner !== ownerId && role !== 'governor') {
      throw new ForbiddenError('Access denied: You do not own this todo item');
    }

    return todo;
  }

  updateTodo({ id, ownerId, updates, role }) {
    return this.#todoRepo.update({ id, ownerId, updates, role });
  }

  deleteTodo({ id, ownerId, role }) {
    return this.#todoRepo.delete({ id, ownerId, role });
  }

  getDashboardStats(ownerId) {
    return this.#todoRepo.getStats(ownerId);
  }
}

module.exports = {
  TodoService
};
