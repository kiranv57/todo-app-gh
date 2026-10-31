const {
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema
} = require('@repo/shared');
const todoService = require('../services/todoService');

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}

function create(req, res) {
  const result = createTodoSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: formatZodIssues(result.error)
    });
  }

  try {
    const todo = todoService.createTodo({
      ...result.data,
      ownerId: req.user.id
    });
    return res.status(201).json({
      success: true,
      data: { todo }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

function list(req, res) {
  const queryResult = todoFilterSchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid filter or pagination parameters',
      code: 'VALIDATION_ERROR',
      issues: formatZodIssues(queryResult.error)
    });
  }

  const { completed, page, limit } = queryResult.data;
  const result = todoService.listTodos({
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
}

function getById(req, res) {
  try {
    const todo = todoService.getTodoById({
      id: req.params.id,
      ownerId: req.user.id
    });
    return res.status(200).json({
      success: true,
      data: { todo }
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      code: err.status === 403 ? 'FORBIDDEN' : err.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'
    });
  }
}

function update(req, res) {
  const parseResult = updateTodoSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: formatZodIssues(parseResult.error)
    });
  }

  try {
    const updated = todoService.updateTodo({
      id: req.params.id,
      ownerId: req.user.id,
      updates: parseResult.data
    });
    return res.status(200).json({
      success: true,
      data: { todo: updated }
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      code: err.status === 403 ? 'FORBIDDEN' : err.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'
    });
  }
}

function remove(req, res) {
  try {
    const result = todoService.deleteTodo({
      id: req.params.id,
      ownerId: req.user.id
    });
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      code: err.status === 403 ? 'FORBIDDEN' : err.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'
    });
  }
}

function getDashboardStats(req, res) {
  try {
    const stats = todoService.getDashboardStats(req.user.id);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  getDashboardStats
};
