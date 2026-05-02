'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'
import { Cloud, Phone, Shield } from 'lucide-react'

export function LoginForm() {
  const { login, verifyOTP } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneCodeHash, setPhoneCodeHash] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) return

    setIsLoading(true)
    try {
      const response = await login(phoneNumber)
      setPhoneCodeHash(response.phone_code_hash)
      setShowVerification(true)
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) return

    setIsLoading(true)
    try {
      await verifyOTP(phoneNumber, verificationCode, phoneCodeHash)
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setShowVerification(false)
    setVerificationCode('')
    setIsVerifying(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-8 fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Cloud className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">DriveGram</h1>
          <p className="text-muted-foreground">Telegram Cloud Storage</p>
        </div>

        {!showVerification ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="+1234567890"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
                Verification Code
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="12345"
                  maxLength={5}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Demo: Use "12345" as verification code
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/80 transition duration-200"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
