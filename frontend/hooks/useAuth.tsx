'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface User {
  id: number
  telegram_id: number
  username: string
  first_name: string
  last_name: string
  phone: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (phoneNumber: string) => Promise<{ phone_code_hash: string; timeout: number; message?: string }>
  verifyOTP: (phoneNumber: string, code: string, phoneCodeHash: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('drivegram_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await api.get('/auth/me')
      if (response.data) {
        setUser(response.data)
      }
    } catch (error: any) {
      // Keep token on transient/network failures; clear only when token is truly invalid.
      if (error?.response?.status === 401) {
        localStorage.removeItem('drivegram_token')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (phoneNumber: string): Promise<{ phone_code_hash: string; timeout: number; message?: string }> => {
    try {
      const response = await api.post('/auth/login', { phone_number: phoneNumber })
      toast.success('Verification code sent! Check the alert popup for your code')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send verification code'
      toast.error(message)
      throw error
    }
  }

  const verifyOTP = async (phoneNumber: string, code: string, phoneCodeHash: string) => {
    try {
      const response = await api.post('/auth/verify', {
        phone_number: phoneNumber,
        code,
        phone_code_hash: phoneCodeHash
      })

      const { token, user } = response.data
      localStorage.setItem('drivegram_token', token)
      setUser(user)
      toast.success('Login successful!')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Invalid verification code'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('drivegram_token')
    setUser(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      verifyOTP,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
