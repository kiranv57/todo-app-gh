const { registerSchema, loginSchema } = require('./schemas/auth');
const {
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema
} = require('./schemas/todo');
const {
  paginationMetaSchema,
  createListResponseSchema,
  listResponseSchema,
  errorIssueSchema,
  errorResponseSchema,
  successResponseSchema
} = require('./schemas/common');

module.exports = {
  // Auth
  registerSchema,
  loginSchema,

  // Todo
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema,

  // Envelopes & Common
  paginationMetaSchema,
  createListResponseSchema,
  listResponseSchema,
  errorIssueSchema,
  errorResponseSchema,
  successResponseSchema
};
