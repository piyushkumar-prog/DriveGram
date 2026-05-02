'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/LoginForm'
import { Dashboard } from '@/components/Dashboard'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function Home() {
  const { user, isLoading, checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <Dashboard />
}
