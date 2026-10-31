const { z } = require('zod');

const createTodoSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, { message: 'Title cannot be empty' })
    .max(140, { message: 'Title cannot exceed 140 characters' }),
  description: z
    .string()
    .trim()
    .max(1000, { message: 'Description cannot exceed 1000 characters' })
    .optional()
    .default('')
});

const updateTodoSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title cannot be empty' })
      .max(140, { message: 'Title cannot exceed 140 characters' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, { message: 'Description cannot exceed 1000 characters' })
      .optional(),
    completed: z
      .boolean({ invalid_type_error: 'Completed must be a boolean' })
      .optional()
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.completed !== undefined,
    {
      message: 'At least one field must be provided for update'
    }
  );

const todoFilterSchema = z.object({
  completed: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return val;
    }, z.boolean({ invalid_type_error: 'Completed filter must be true or false' }).optional())
    .optional(),
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number' })
    .int({ message: 'Page must be an integer' })
    .min(1, { message: 'Page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number' })
    .int({ message: 'Limit must be an integer' })
    .min(1, { message: 'Limit must be at least 1' })
    .max(100, { message: 'Limit cannot exceed 100' })
    .default(10)
});

module.exports = {
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema
};
