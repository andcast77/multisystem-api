// API Client for Workify Frontend
// Points to unified API with module prefixes

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Unified API Client
const apiClient = new ApiClient(API_URL)

// Workify API Client (uses /api/workify prefix)
export const workifyApi = {
  get: <T>(endpoint: string) => apiClient.get<T>(`/api/workify${endpoint}`),
  post: <T>(endpoint: string, data?: unknown) => apiClient.post<T>(`/api/workify${endpoint}`, data),
  put: <T>(endpoint: string, data?: unknown) => apiClient.put<T>(`/api/workify${endpoint}`, data),
  delete: <T>(endpoint: string) => apiClient.delete<T>(`/api/workify${endpoint}`),
}

// Auth API Client (uses /api/auth prefix)
export const authApi = {
  get: <T>(endpoint: string) => apiClient.get<T>(`/api/auth${endpoint}`),
  post: <T>(endpoint: string, data?: unknown) => apiClient.post<T>(`/api/auth${endpoint}`, data),
  put: <T>(endpoint: string, data?: unknown) => apiClient.put<T>(`/api/auth${endpoint}`, data),
  delete: <T>(endpoint: string) => apiClient.delete<T>(`/api/auth${endpoint}`),
}

// Generic API response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
