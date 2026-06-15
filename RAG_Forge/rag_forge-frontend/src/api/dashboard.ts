import apiClient from './client'
import type { DashboardStats, ActivityPoint } from '@/types'

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/dashboard/stats')
    return data
  },

  getActivity: async (days = 7): Promise<ActivityPoint[]> => {
    const { data } = await apiClient.get<ActivityPoint[]>('/dashboard/activity', {
      params: { days },
    })
    return data
  },
}
