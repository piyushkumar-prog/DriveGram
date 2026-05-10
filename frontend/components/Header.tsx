'use client'

import { useState } from 'react'
import { Search, Moon, Sun, LogOut, UserCircle } from 'lucide-react'

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
}

interface HeaderProps {
  user: User | null
  onLogout: () => void
  onSearchToggle: () => void
  onDarkModeToggle: () => void
  isDarkMode: boolean
}

export function Header({ user, onLogout, onSearchToggle, onDarkModeToggle, isDarkMode }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <img 
                src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"} 
                alt="DriveGram" 
                className="h-10 w-auto object-contain" 
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onSearchToggle}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={onDarkModeToggle}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {user?.username || user?.first_name || 'User'}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{user?.username}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLogout()
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Close user menu when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  )
}
