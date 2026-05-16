'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'
import { FileGrid } from './FileGrid'
import { SearchBar } from './SearchBar'
import { UploadModal } from './UploadModal'
import { FolderModal } from './FolderModal'
import { FilePreviewModal } from './FilePreviewModal'
import { useFiles } from '@/hooks/useFiles'
import { useFolders } from '@/hooks/useFolders'
import { Breadcrumbs } from './Breadcrumbs'
import { LoadingSpinner } from './LoadingSpinner'
import { Sidebar, SidebarCategory } from './Sidebar'
import { FolderOpen, Upload, LayoutGrid, List, RefreshCw, Trash2 } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface PreviewFileItem {
  id: number
  name: string
  original_name: string
  size: number
  mime_type: string
}

interface BreadcrumbItem {
  id: number | null
  name: string
}

export function Dashboard() {
  const { user, logout } = useAuth()
  const { 
    files, trashedFiles, isLoading: filesLoading, 
    loadFiles, loadTrashedFiles, uploadFile, deleteFile, restoreFile, permanentDeleteFile, emptyTrash,
    searchFiles, starredIds, toggleStar, renameFile, syncFiles 
  } = useFiles()
  const { folders, isLoading: foldersLoading, loadFolders, createFolder } = useFolders()
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [currentCategory, setCurrentCategory] = useState<SidebarCategory>('all')
  const [path, setPath] = useState<BreadcrumbItem[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSearch, setShowSearch] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showFolder, setShowFolder] = useState(false)
  const [previewFile, setPreviewFile] = useState<PreviewFileItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { isDarkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    // Check for view mode preference
    const savedViewMode = localStorage.getItem('viewMode') as 'grid' | 'list'
    if (savedViewMode) setViewMode(savedViewMode)
  }, [])

  useEffect(() => {
    if (!searchQuery) {
      if (currentCategory === 'all') {
        loadFiles(currentFolder || undefined)
        loadFolders(currentFolder || undefined)
      } else if (currentCategory === 'recent' || currentCategory === 'starred') {
        loadFiles() 
      } else if (currentCategory === 'trash') {
        loadTrashedFiles()
      }
    }
  }, [currentFolder, currentCategory, searchQuery])


  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid'
    setViewMode(newMode)
    localStorage.setItem('viewMode', newMode)
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchFiles(query)
    }
  }

  const handleFolderClick = (folderId: number) => {
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      setPath(prev => [...prev, { id: folder.id, name: folder.name }])
      setCurrentFolder(folderId)
      setCurrentCategory('all')
    }
  }

  const handleBreadcrumbNavigate = (id: number | null) => {
    if (id === null) {
      setPath([])
      setCurrentFolder(null)
    } else {
      const index = path.findIndex(item => item.id === id)
      if (index !== -1) {
        setPath(path.slice(0, index + 1))
        setCurrentFolder(id)
      }
    }
    setCurrentCategory('all')
    setSearchQuery('')
  }

  const handleBackClick = () => {
    if (path.length > 0) {
      const newPath = path.slice(0, -1)
      setPath(newPath)
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : null)
    } else {
      setCurrentFolder(null)
    }
    setSearchQuery('')
  }

  const handleCategoryClick = (category: SidebarCategory) => {
    setCurrentCategory(category)
    setCurrentFolder(null)
    setPath([])
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

  // Filtering logic
  const getFilteredFiles = () => {
    if (searchQuery) return files
    if (currentCategory === 'trash') return trashedFiles
    if (currentCategory === 'all') return files
    if (currentCategory === 'recent') {
      return [...files].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 20)
    }
    if (currentCategory === 'starred') {
      return files.filter(f => starredIds.has(f.id))
    }
    return files
  }

  const getFilteredFolders = () => {
    if (searchQuery || currentCategory !== 'all') return []
    return folders
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        user={user}
        onLogout={logout}
        onSearchToggle={() => setShowSearch(!showSearch)}
        onDarkModeToggle={toggleDarkMode}
        isDarkMode={isDarkMode}
      />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <Sidebar
          folders={folders}
          currentFolder={currentFolder}
          currentCategory={currentCategory}
          onFolderClick={handleFolderClick}
          onHomeClick={() => handleBreadcrumbNavigate(null)}
          onCategoryClick={handleCategoryClick}
          onBackClick={currentFolder !== null ? handleBackClick : undefined}
        />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto h-[calc(100vh-64px)]">
          {showSearch && (
            <SearchBar
              onSearch={handleSearch}
              onClose={() => {
                setShowSearch(false)
                setSearchQuery('')
              }}
            />
          )}

          {!searchQuery && currentCategory === 'all' && (
            <Breadcrumbs 
              path={path} 
              onNavigate={handleBreadcrumbNavigate} 
            />
          )}

          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground tracking-tight capitalize">
                {searchQuery ? 'Search Results' : 
                 currentFolder ? path[path.length - 1]?.name : 
                 currentCategory === 'all' ? 'My Files' : currentCategory}
              </h1>
              {searchQuery && (
                <span className="text-sm text-muted-foreground">
                  for "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-muted rounded-xl p-1 mr-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-card text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-card text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {currentCategory === 'all' && (
                <>
                  <button
                    onClick={() => syncFiles(currentFolder || undefined)}
                    disabled={filesLoading}
                    className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl hover:bg-secondary/80 transition-all flex items-center font-semibold text-sm disabled:opacity-50"
                    title="Sync with Telegram Saved Messages"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${filesLoading ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center font-semibold text-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </button>
                  <button
                    onClick={() => setShowFolder(true)}
                    className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl hover:bg-secondary/80 transition-all flex items-center font-semibold text-sm"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    New Folder
                  </button>
                </>
              )}

              {currentCategory === 'trash' && trashedFiles.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to permanently empty the trash? This action cannot be undone.')) {
                      emptyTrash()
                    }
                  }}
                  className="bg-destructive text-destructive-foreground px-4 py-2 rounded-xl hover:bg-destructive/90 transition-all flex items-center font-semibold text-sm shadow-lg shadow-destructive/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Empty Trash
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <FileGrid
              files={getFilteredFiles()}
              folders={getFilteredFolders()}
              onFileDelete={currentCategory === 'trash' ? permanentDeleteFile : deleteFile}
              onFileRestore={restoreFile}
              onFileRename={renameFile}
              onFolderClick={handleFolderClick}
              onFileOpen={(file) => setPreviewFile(file)}
              onToggleStar={toggleStar}
              starredIds={starredIds}
              searchQuery={searchQuery}
              viewMode={viewMode}
              isTrashView={currentCategory === 'trash'}
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

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
