// Sortable Todo List Component
import { useTodoStore } from '../store/useTodos'
import { useEffect } from 'react'

interface SortOption {
  value: string
  label: string
}

const SortOptions: SortOption[] = [
  { value: 'title-asc', label: 'A-Z' },
  { value: 'title-desc', label: 'Z-A' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
]

export const SortableTodoList = () => {
  const {
    todos,
    sort,
    setSort,
    filter,
    loading,
    error,
  } = useTodoStore()

  // Compute sorted/filtered todos
  const sortedTodos = () => {
    let result = [...todos]

    switch (sort) {
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title))
        break
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'none':
      default:
        // Already sorted if needed
        break
    }

    // Apply filter
    if (filter === 'active') {
      result = result.filter((t) => !t.completed)
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed)
    }

    return result
  }

  // Pagination
  const startIndex = (page - 1) * 20
  const endIndex = startIndex + 20
  const pagedTodos = sortedTodos().slice(startIndex, endIndex)

  return (
    <div className="sortable-todo-list">
      {/* Sort Selector */}
      <div className="sort-selector">
        <select onChange={(e) => setSort(e.target.value)} className="sort-input">
          {SortOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              selected={sort === option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Todo List */}
      {loading ? (
        <div className="loading-state">
          <span>Loading todos...</span>
        </div>
      ) : (
        <div className="todo-list">
          {error && <div className="error-state">{error}</div>}

          {pagedTodos.length === 0 ? (
            <div className="empty-state">
              <p>No todos found.</p>
              {filter !== 'all' && <p>Try adjusting the filter.</p>}
            </div>
          ) : (
            <ul>
              {pagedTodos.map((todo) => (
                <li key={todo.id} className="todo-item">
                  <div className="todo-info">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => /* TODO: toggle completed */}
                      className="todo-checkbox"
                    />
                    <span className="todo-title">{todo.title}</span>
                    <small className="todo-meta">
                      {new Date(todo.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="todo-actions">
                    {/* TODO: edit/delete buttons */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Export for use in Dashboard
export { SortOptions }