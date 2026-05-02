import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('drivegram_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('drivegram_token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// File upload API (multipart/form-data)
export const uploadFile = async (file: File, folderId?: number) => {
  const formData = new FormData()
  formData.append('file', file)
  if (folderId) {
    formData.append('folder_id', folderId.toString())
  }

  const token = localStorage.getItem('drivegram_token')
  const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`,
    },
  })

  return response.data
}

// Download file
export const downloadFile = async (fileId: number) => {
  const token = localStorage.getItem('drivegram_token')
  const response = await axios.get(`${API_BASE_URL}/files/${fileId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    responseType: 'blob',
  })

  return response
}

// Stream file (for video/audio)
export const streamFile = async (fileId: number, range?: string) => {
  const token = localStorage.getItem('drivegram_token')
  const headers: any = {
    'Authorization': `Bearer ${token}`,
  }
  
  if (range) {
    headers['Range'] = range
  }

  const response = await axios.get(`${API_BASE_URL}/files/${fileId}/stream`, {
    headers,
    responseType: 'blob',
  })

  return response
}
