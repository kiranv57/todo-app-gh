const { TodoModel } = require('../models/Todo');

function createTodo({ title, description, ownerId }) {
  return TodoModel.create({ title, description, ownerId });
}

function listTodos({ ownerId, completed, page = 1, limit = 10 }) {
  return TodoModel.findByOwner({ ownerId, completed, page, limit });
}

function getTodoById({ id, ownerId }) {
  const todo = TodoModel.findById(id);
  if (!todo) {
    const err = new Error('Todo not found');
    err.status = 404;
    throw err;
  }

  if (todo.owner !== ownerId) {
    const err = new Error('Access denied: You do not own this todo item');
    err.status = 403;
    throw err;
  }

  return todo;
}

function updateTodo({ id, ownerId, updates }) {
  return TodoModel.update({ id, ownerId, updates });
}

function deleteTodo({ id, ownerId }) {
  return TodoModel.delete({ id, ownerId });
}

function getDashboardStats(ownerId) {
  return TodoModel.getStats(ownerId);
}

module.exports = {
  createTodo,
  listTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
  getDashboardStats
};
