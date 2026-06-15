import apiClient from './client'
import type { TokenResponse, User } from '@/types'

export const authApi = {
  register: async (email: string, full_name: string, password: string) => {
    const { data } = await apiClient.post<User>('/auth/register', { email, full_name, password })
    return data
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const { data } = await apiClient.post<TokenResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },

  // Method to update user profile information
  updateProfile: async (payload: { full_name: string }) => {
    const { data } = await apiClient.patch<User>('/auth/profile', payload)
    return data
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post('/auth/forgot-password', { email })
    return data
  },

  /**
   * REPLACED: Updated to resetPassword to match the new token-based flow.
   * Matches the call site in ResetPasswordPage.tsx.
   */
  resetPassword: async (payload: { email: string; token: string; new_password: string }) => {
    const { data } = await apiClient.post('/auth/reset-password', payload)
    return data
  },

  /**
   * Accepts a payload object to match form state structures in Settings/Profile pages.
   */
  changePassword: async (payload: { 
    current_password: string; 
    new_password: string; 
    confirm_password: string 
  }) => {
    const { data } = await apiClient.post('/auth/change-password', payload)
    return data
  },
}

export default authApi