const { z } = require('zod');

const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0)
});

const createListResponseSchema = (itemSchema = z.any()) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: paginationMetaSchema
  });

const listResponseSchema = createListResponseSchema(z.any());

const errorIssueSchema = z.object({
  field: z.string(),
  message: z.string()
});

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string({ required_error: 'Error message is required' }),
  code: z.string().optional(),
  issues: z.array(errorIssueSchema).optional()
});

const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  message: z.string().optional()
});

module.exports = {
  paginationMetaSchema,
  createListResponseSchema,
  listResponseSchema,
  errorIssueSchema,
  errorResponseSchema,
  successResponseSchema
};
