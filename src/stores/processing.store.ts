import { create } from 'zustand'

import type { ProcessingTask } from '@/types/pipeline'

export interface ProcessingStoreState {
  tasks: ProcessingTask[]
  activeTaskId: string | null
  addTask: (task: ProcessingTask) => void
  removeTask: (id: string) => void
  updateTask: (id: string, partial: Partial<ProcessingTask>) => void
  clearCompleted: () => void
}

export const useProcessingStore = create<ProcessingStoreState>((set) => ({
  tasks: [],
  activeTaskId: null,
  addTask: (task) => {
    set((state) => ({
      tasks: [task, ...state.tasks],
      activeTaskId: task.id,
    }))
  },
  removeTask: (id) => {
    set((state) => {
      const tasks = state.tasks.filter((task) => task.id !== id)
      return {
        tasks,
        activeTaskId: state.activeTaskId === id ? tasks[0]?.id ?? null : state.activeTaskId,
      }
    })
  },
  updateTask: (id, partial) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? ({
              ...task,
              ...partial,
            } as ProcessingTask)
          : task,
      ),
    }))
  },
  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'completed'),
      activeTaskId:
        state.activeTaskId &&
        state.tasks.some((task) => task.id === state.activeTaskId && task.status !== 'completed')
          ? state.activeTaskId
          : null,
    }))
  },
}))
