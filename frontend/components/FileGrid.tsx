'use client'

import { useState } from 'react'
import { 
  File, 
  Download, 
  Trash2, 
  Image, 
  Video, 
  Music, 
  FileText, 
  Archive,
  FileSpreadsheet,
  Presentation,
  FolderOpen
} from 'lucide-react'
import { formatFileSize, getFileIcon, getFileIconColor, truncateText } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'

interface FileItem {
  id: number
  name: string
  original_name: string
  size: number
  mime_type: string
  created_at: string
  folder_id?: number
}

interface FolderItem {
  id: number
  name: string
  path: string
  parent_id?: number
}

interface FileGridProps {
  files: FileItem[]
  folders: FolderItem[]
  onFileDelete: (fileId: number) => Promise<void>
  onFolderClick: (folderId: number) => void
  searchQuery: string
}

const iconMap = {
  image: Image,
  video: Video,
  music: Music,
  'file-text': FileText,
  archive: Archive,
  'file-spreadsheet': FileSpreadsheet,
  presentation: Presentation,
  file: File,
}

export function FileGrid({ files, folders, onFileDelete, onFolderClick, searchQuery }: FileGridProps) {
  const [deletingFile, setDeletingFile] = useState<number | null>(null)
  const [downloadingFile, setDownloadingFile] = useState<number | null>(null)

  const handleDownload = async (file: FileItem) => {
    setDownloadingFile(file.id)
    try {
      const response = await fetch(`/api/v1/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('drivegram_token')}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.original_name
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloadingFile(null)
    }
  }

  const handleDelete = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    setDeletingFile(fileId)
    try {
      await onFileDelete(fileId)
    } finally {
      setDeletingFile(null)
    }
  }

  const getFileIconComponent = (mimeType: string) => {
    const iconType = getFileIcon(mimeType)
    const IconComponent = iconMap[iconType as keyof typeof iconMap] || File
    return IconComponent
  }

  const filteredFolders = searchQuery 
    ? folders.filter(folder => 
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folders.filter(folder => folder.parent_id === null)

  if (files.length === 0 && filteredFolders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-muted rounded-full">
            <File className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {searchQuery ? 'No files found' : 'No files yet'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery 
            ? 'Try a different search term'
            : 'Upload your first file to get started'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="file-grid">
      {/* Render folders */}
      {filteredFolders.map(folder => (
        <div
          key={folder.id}
          onClick={() => onFolderClick(folder.id)}
          className="file-item group cursor-pointer"
        >
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FolderOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground truncate" title={folder.name}>
              {truncateText(folder.name, 20)}
            </p>
            <p className="text-xs text-muted-foreground">Folder</p>
          </div>
        </div>
      ))}

      {/* Render files */}
      {files.map(file => {
        const IconComponent = getFileIconComponent(file.mime_type)
        const isDeleting = deletingFile === file.id
        const isDownloading = downloadingFile === file.id

        return (
          <div
            key={file.id}
            className="file-item group"
          >
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-muted rounded-lg">
                  <IconComponent 
                    className={`w-8 h-8 ${getFileIconColor(file.mime_type)}`} 
                  />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                {truncateText(file.name, 20)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-3 flex justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(file)
                }}
                disabled={isDownloading}
                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                title="Download"
              >
                {isDownloading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(file.id)
                }}
                disabled={isDeleting}
                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                title="Delete"
              >
                {isDeleting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
