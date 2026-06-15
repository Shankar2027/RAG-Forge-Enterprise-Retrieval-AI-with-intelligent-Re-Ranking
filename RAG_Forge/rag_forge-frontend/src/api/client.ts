import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

/**
 * PRODUCTION NOTE: 
 * If VITE_API_URL is set, use it. 
 * Otherwise, default to an empty string.
 * This makes axios use the relative path (e.g., /api/...), 
 * which is exactly what we need for the single-port HF deployment.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const getAuthData = () => {
  const raw = localStorage.getItem('ragforge-auth')
  if (!raw) return null
  try {
    return JSON.parse(raw).state
  } catch {
    return null
  }
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = getAuthData()
  const token = auth?.accessToken || auth?.access_token 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const auth = getAuthData()
      const refreshToken = auth?.refreshToken || auth?.refresh_token
      
      if (refreshToken) {
        try {
          // Use the base axios to avoid circular interceptors
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
            params: { token: refreshToken },
          })
          
          const raw = JSON.parse(localStorage.getItem('ragforge-auth') || '{}')
          const newAuthData = { ...raw.state, ...data }
          raw.state = newAuthData
          localStorage.setItem('ragforge-auth', JSON.stringify(raw))
          
          const newToken = data.access_token || data.accessToken
          original.headers.Authorization = `Bearer ${newToken}`
          
          return apiClient(original)
        } catch {
          localStorage.removeItem('ragforge-auth')
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient