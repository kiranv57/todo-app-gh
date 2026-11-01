// Todo Store with Sorting Support

import { create } from 'zustand'
import { persist, persistStorage } from 'zustand/middleware persist'
import { useEffect, useRef } from 'react'

// Types
export type Todo = {
  id: string
  title: string
  description?: string
  completed: boolean
  createdAt: string
  owner: string
}

export type SortType = 'title-asc' | 'title-desc' | 'newest' | 'oldest' | 'none'

export type TodoState = {
  // State
  todos: Todo[]
  loading: boolean
  error: string | null
  sort: SortType
  filter: 'all' | 'active' | 'completed'
  page: number
  limit: number
  total: number

  // Actions
  // State mutations
  setTodos: (todos: Todo[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilter: (filter: 'all' | 'active' | 'completed') => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void

  // Sorting actions
  setSort: (sort: SortType) => void
  resetSort: () => void

  // Async actions
  fetchTodos: () => Promise<void>
  createTodo: (title: string, description?: string) => Promise<void>
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
}

export const useTodoStore = create(
  persist<TodoState>(
    (set, get) => ({
      // Initial state
      todos: [],
      loading: false,
      error: null,
      sort: 'none',
      filter: 'all',
      page: 1,
      limit: 20,
      total: 0,

      // State mutations
      setTodos: (todos) => set({ todos }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilter: (filter) => set({ filter }),
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit }),

      // Sorting actions
      setSort: (sort: SortType) => set({ sort }),
      resetSort: () => set({ sort: 'none' }),

      // Async: Fetch todos from API
      fetchTodos: async () => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`/api/todos?sort=${get().sort}&filter=${get().filter}&page=${get().page}&limit=${get().limit}`)
          if (!response.ok) throw new Error('Failed to fetch todos')
          const data = await response.json()
          set({ todos: data.todos, loading: false, total: data.total })
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // Async: Create a new todo
      createTodo: async (title: string, description?: string) => {
        set({ loading: true })
        try {
          const response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description }),
          })
          if (!response.ok) throw new Error('Failed to create todo')
          const data = await response.json()
          set({ todos: [...get().todos, data], loading: false })
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // Async: Update a todo
      updateTodo: async (id: string, updates: Partial<Todo>) => {
        set({ loading: true })
        try {
          const response = await fetch(`/api/todos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
          if (!response.ok) throw new Error('Failed to update todo')
          const index = get().todos.findIndex((t) => t.id === id)
          if (index > -1) {
            set({ todos: get().todos.map((t) => (t.id === id ? { ...t, ...updates } : t)) })
          }
          set({ loading: false })
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // Async: Delete a todo
      deleteTodo: async (id: string) => {
        set({ loading: true })
        try {
          const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' })
          if (!response.ok) throw new Error('Failed to delete todo')
          set({ todos: get().todos.filter((t) => t.id !== id), loading: false })
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },
    }),
    {
      name: 'todo-storage',
      // Skip hydration on client for faster initial render
      // Skip storage if no window.localStorage
      storage: {
        getItem: (name) => {
          const match = window.localStorage.getItem(name)
          return match ? JSON.parse(match) : null
        },
        setItem: (name, value) => {
          window.localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          window.localStorage.removeItem(name)
        },
      },
    }
  )
)