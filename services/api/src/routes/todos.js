const express = require('express');
const {
  create,
  list,
  getById,
  update,
  remove,
  getDashboardStats
} = require('../controllers/todoController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All todo operations require authentication
router.use(requireAuth);

router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
