const crypto = require('node:crypto');
const { NotFoundError, ForbiddenError } = require('../errors');

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * TodoRepository Container Blueprint
 * Encapsulates todo document persistence, sorting, compound query indexes, and tenant IDOR checks.
 * Storage is injected into constructor to eliminate the module-level singleton trap.
 */
class TodoRepository {
  #store;

  constructor(store = new Map()) {
    this.#store = store;
  }

  create({ title, description = '', ownerId }) {
    if (!ownerId) {
      throw new Error('Todo owner is required');
    }

    const _id = generateObjectId();
    const now = new Date().toISOString();

    const doc = {
      _id,
      id: _id,
      title: title.trim(),
      description: (description || '').trim(),
      completed: false,
      owner: ownerId,
      createdAt: now,
      updatedAt: now
    };

    this.#store.set(_id, doc);
    return doc;
  }

  findById(id) {
    return this.#store.get(id) || null;
  }

  findByOwner({ ownerId, completed, page = 1, limit = 10 }) {
    if (!ownerId) return { data: [], total: 0, totalPages: 0, page, limit };

    // Compound index emulation: { owner: 1, completed: 1, createdAt: -1 }
    let list = [];
    for (const doc of this.#store.values()) {
      if (doc.owner !== ownerId) continue;
      if (completed !== undefined && doc.completed !== completed) continue;
      list.push(doc);
    }

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const startIndex = (page - 1) * limit;
    const paginatedData = list.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      total,
      totalPages,
      page,
      limit
    };
  }

  update({ id, ownerId, updates }) {
    const doc = this.#store.get(id);
    if (!doc) {
      throw new NotFoundError('Todo not found');
    }

    // Multi-tenant security guard: IDOR prevention
    if (doc.owner !== ownerId) {
      throw new ForbiddenError('Access denied: You do not own this todo item');
    }

    if (updates.title !== undefined) {
      doc.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      doc.description = updates.description.trim();
    }
    if (updates.completed !== undefined) {
      doc.completed = Boolean(updates.completed);
    }

    doc.updatedAt = new Date().toISOString();
    this.#store.set(id, doc);
    return doc;
  }

  delete({ id, ownerId }) {
    const doc = this.#store.get(id);
    if (!doc) {
      throw new NotFoundError('Todo not found');
    }

    if (doc.owner !== ownerId) {
      throw new ForbiddenError('Access denied: You do not own this todo item');
    }

    this.#store.delete(id);
    return { success: true, message: 'Todo deleted successfully' };
  }

  getStats(ownerId) {
    let total = 0;
    let completed = 0;

    for (const doc of this.#store.values()) {
      if (doc.owner === ownerId) {
        total++;
        if (doc.completed) {
          completed++;
        }
      }
    }

    const incomplete = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      incomplete,
      completionRate
    };
  }

  clear() {
    this.#store.clear();
  }
}

const defaultTodoStore = new Map();
const TodoModel = new TodoRepository(defaultTodoStore);

module.exports = {
  TodoRepository,
  TodoModel,
  defaultTodoStore,
  generateObjectId
};
