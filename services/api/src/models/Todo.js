const crypto = require('node:crypto');

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

// In-memory collection modeling MongoDB with index scanning and compound filtering
const todos = new Map();

class TodoModel {
  static create({ title, description = '', ownerId }) {
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

    todos.set(_id, doc);
    return doc;
  }

  static findById(id) {
    return todos.get(id) || null;
  }

  static findByOwner({ ownerId, completed, page = 1, limit = 10 }) {
    if (!ownerId) return { data: [], total: 0, totalPages: 0, page, limit };

    // Compound index emulation: { owner: 1, completed: 1, createdAt: -1 }
    let list = [];
    for (const doc of todos.values()) {
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

  static update({ id, ownerId, updates }) {
    const doc = todos.get(id);
    if (!doc) {
      const err = new Error('Todo not found');
      err.status = 404;
      throw err;
    }

    // Multi-tenant security guard: IDOR prevention
    if (doc.owner !== ownerId) {
      const err = new Error('Access denied: You do not own this todo item');
      err.status = 403;
      throw err;
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
    todos.set(id, doc);
    return doc;
  }

  static delete({ id, ownerId }) {
    const doc = todos.get(id);
    if (!doc) {
      const err = new Error('Todo not found');
      err.status = 404;
      throw err;
    }

    if (doc.owner !== ownerId) {
      const err = new Error('Access denied: You do not own this todo item');
      err.status = 403;
      throw err;
    }

    todos.delete(id);
    return { success: true, message: 'Todo deleted successfully' };
  }

  static getStats(ownerId) {
    let total = 0;
    let completed = 0;

    for (const doc of todos.values()) {
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

  static clear() {
    todos.clear();
  }
}

module.exports = {
  TodoModel,
  generateObjectId
};
