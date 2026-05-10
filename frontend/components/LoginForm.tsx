'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'
import { Phone, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '@/hooks/useTheme'

const countryCodes = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+82', country: 'KR', flag: '🇰🇷' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+64', country: 'NZ', flag: '🇳🇿' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+966', country: 'SA', flag: '🇸🇦' },
]

export function LoginForm() {
  const { login, verifyOTP } = useAuth()
  const { isDarkMode } = useTheme()
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[2]) // Default to India
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneCodeHash, setPhoneCodeHash] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) return

    const fullPhoneNumber = selectedCountry.code + phoneNumber.replace(/\s/g, '')
    setIsLoading(true)
    try {
      const response = await login(fullPhoneNumber)
      setPhoneCodeHash(response.phone_code_hash)
      
      if (response.message) {
        toast.success(response.message)
      }
      
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

    const fullPhoneNumber = selectedCountry.code + phoneNumber.replace(/\s/g, '')
    setIsLoading(true)
    try {
      await verifyOTP(fullPhoneNumber, verificationCode, phoneCodeHash)
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-8 fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"} 
              alt="DriveGram" 
              className="h-20 w-auto object-contain" 
            />
          </div>
          <p className="text-muted-foreground">Securely access your personal cloud drive</p>
        </div>

        {!showVerification ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <div className="flex space-x-2">
                <div className="relative">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const country = countryCodes.find(c => c.code === e.target.value)
                      if (country) setSelectedCountry(country)
                    }}
                    className="appearance-none bg-background border border-input rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {selectedCountry.flag}
                  </span>
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter your phone number without country code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-lg hover:bg-primary/90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                  placeholder="Enter verification code"
                  maxLength={5}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-lg hover:bg-primary/90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                className="w-full bg-secondary text-secondary-foreground py-2.5 px-4 rounded-lg hover:bg-secondary/80 transition duration-200"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to the terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
