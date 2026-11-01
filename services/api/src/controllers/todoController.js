const {
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema
} = require('@repo/shared');
const { ValidationError } = require('../errors');

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}

/**
 * TodoController
 * Orchestrates HTTP input parsing, validation, and response formatting.
 * Thin layer delegating all domain logic and throwing errors to centralized middleware.
 */
class TodoController {
  #todoService;

  constructor(todoService) {
    if (!todoService) throw new Error('TodoController requires TodoService instance');
    this.#todoService = todoService;
  }

  create = (req, res) => {
    const result = createTodoSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', formatZodIssues(result.error));
    }

    const todo = this.#todoService.createTodo({
      ...result.data,
      ownerId: req.user.id
    });

    return res.status(201).json({
      success: true,
      data: { todo }
    });
  };

  list = (req, res) => {
    const queryResult = todoFilterSchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid filter or pagination parameters', formatZodIssues(queryResult.error));
    }

    const { completed, page, limit } = queryResult.data;
    const result = this.#todoService.listTodos({
      ownerId: req.user.id,
      completed,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  };

  getById = (req, res) => {
    const todo = this.#todoService.getTodoById({
      id: req.params.id,
      ownerId: req.user.id
    });

    return res.status(200).json({
      success: true,
      data: { todo }
    });
  };

  update = (req, res) => {
    const parseResult = updateTodoSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', formatZodIssues(parseResult.error));
    }

    const updated = this.#todoService.updateTodo({
      id: req.params.id,
      ownerId: req.user.id,
      updates: parseResult.data
    });

    return res.status(200).json({
      success: true,
      data: { todo: updated }
    });
  };

  remove = (req, res) => {
    const result = this.#todoService.deleteTodo({
      id: req.params.id,
      ownerId: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  };

  getDashboardStats = (req, res) => {
    const stats = this.#todoService.getDashboardStats(req.user.id);
    return res.status(200).json({
      success: true,
      data: stats
    });
  };
}

module.exports = {
  TodoController
};
