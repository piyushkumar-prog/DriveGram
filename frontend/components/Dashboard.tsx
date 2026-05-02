'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { FileGrid } from './FileGrid'
import { SearchBar } from './SearchBar'
import { UploadModal } from './UploadModal'
import { FolderModal } from './FolderModal'
import { useFiles } from '@/hooks/useFiles'
import { useFolders } from '@/hooks/useFolders'
import { LoadingSpinner } from './LoadingSpinner'
import { FolderOpen, Upload } from 'lucide-react'

export function Dashboard() {
  const { user, logout } = useAuth()
  const { files, isLoading: filesLoading, uploadFile, deleteFile, searchFiles } = useFiles()
  const { folders, isLoading: foldersLoading, createFolder } = useFolders()
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showFolder, setShowFolder] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true'
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    document.documentElement.classList.toggle('dark')
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchFiles(query)
    }
  }

  const handleFolderClick = (folderId: number) => {
    setCurrentFolder(folderId)
  }

  const handleBackClick = () => {
    setCurrentFolder(null)
    setSearchQuery('')
  }

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadFile(file, currentFolder || undefined)
    }
  }

  const handleCreateFolder = async (name: string) => {
    await createFolder(name, currentFolder || undefined)
  }

  const isLoading = filesLoading || foldersLoading

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onLogout={logout}
        onSearchToggle={() => setShowSearch(!showSearch)}
        onDarkModeToggle={toggleDarkMode}
        isDarkMode={isDarkMode}
      />

      <div className="flex">
        <Sidebar
          folders={folders}
          currentFolder={currentFolder}
          onFolderClick={handleFolderClick}
          onBackClick={currentFolder !== null ? handleBackClick : undefined}
        />

        <main className="flex-1 p-6">
          {showSearch && (
            <SearchBar
              onSearch={handleSearch}
              onClose={() => {
                setShowSearch(false)
                setSearchQuery('')
              }}
            />
          )}

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                {searchQuery ? 'Search Results' : currentFolder ? 'Folder' : 'My Files'}
              </h1>
              {searchQuery && (
                <span className="text-sm text-muted-foreground">
                  for "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUpload(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition duration-200 flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </button>
              <button
                onClick={() => setShowFolder(true)}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition duration-200 flex items-center"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                New Folder
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <FileGrid
              files={files}
              folders={folders}
              onFileDelete={deleteFile}
              onFolderClick={handleFolderClick}
              searchQuery={searchQuery}
            />
          )}
        </main>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}

      {showFolder && (
        <FolderModal
          onClose={() => setShowFolder(false)}
          onCreateFolder={handleCreateFolder}
        />
      )}
    </div>
  )
}
