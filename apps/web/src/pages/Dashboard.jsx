// Dashboard Page
import { useState, useEffect } from 'react'
import { useTodoStore } from '../store/useTodos'
import { SortOptions, SortableTodoList } from '../components/SortableTodoList'

export default function Dashboard() {
  const {
    todos,
    sort,
    setSort,
    filter,
    setFilter,
    loading,
    error,
  } = useTodoStore()

  // Fetch todos on mount
  useEffect(() => {
    // useTodoStore already fetches on subscribe in some implementations
    // But let's ensure it's loaded
    if (todos.length === 0) {
      // The store's fetchTodos should be called automatically or via useEffect
    }
  }, [todos, sort, filter])

  return (
    <div className="dashboard-page">
      <h1 className="page-title">My Todos</h1>

      {/* Filter + Sort Controls */}
      <div className="controls-bar">
        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        {/* Sort Selector */}
        <div className="sort-selector">
          <select onChange={(e) => setSort(e.target.value)} className="sort-select">
            {SortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sortable Todo List */}
      <SortableTodoList />

      {/* Pagination (simplified) */}
      {/* TODO: Add pagination controls */}

      {/* Error State */}
      {error && <div className="error-banner">{error}</error-banner>}
    </div>
  )
}

// Export SortOptions for use in other components
export { SortOptions }