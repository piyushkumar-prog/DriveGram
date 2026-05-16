'use client'

import { useState } from 'react'
import { 
  File, 
  Download, 
  Trash2, 
  AlertTriangle,
  Image, 
  Video, 
  Music, 
  FileText, 
  Archive,
  FileSpreadsheet,
  Presentation,
  FolderOpen,
  Star
} from 'lucide-react'
import { formatFileSize, getFileIcon, getFileIconColor, truncateText } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'
import { downloadFile, getAuthenticatedFileUrl } from '@/lib/api'
import { ContextMenu } from './ContextMenu'

interface FileItem {
  id: number
  name: string
  original_name: string
  size: number
  mime_type: string
  created_at: string
  folder_id?: number
  telegram_file_id?: string
  telegram_msg_id?: number
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
  onFileRename?: (fileId: number, newName: string) => Promise<void>
  onFolderClick: (folderId: number) => void
  onFileOpen: (file: FileItem) => void
  onToggleStar?: (fileId: number) => void
  starredIds?: Set<number>
  searchQuery: string
  viewMode?: 'grid' | 'list'
  isTrashView?: boolean
  onFileRestore?: (fileId: number) => Promise<void>
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

export function FileGrid({ 
  files, 
  folders, 
  onFileDelete, 
  onFileRename,
  onFolderClick, 
  onFileOpen, 
  onToggleStar,
  starredIds = new Set(),
  searchQuery,
  viewMode = 'grid',
  isTrashView = false,
  onFileRestore
}: FileGridProps) {
  const [deletingFile, setDeletingFile] = useState<number | null>(null)
  const [downloadingFile, setDownloadingFile] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'file' | 'folder'
    id: number
    item: any
  } | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean
    mode: 'single' | 'bulk'
    fileId?: number
    count: number
  }>({
    open: false,
    mode: 'single',
    count: 0,
  })

  const toggleSelection = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent, type: 'file' | 'folder', id: number) => {
    e.stopPropagation()
    const key = `${type}-${id}`
    const newSelection = new Set(selectedItems)
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    setSelectedItems(newSelection)
  }

  const openBulkDeleteConfirm = () => {
    if (selectedItems.size === 0) return
    setConfirmDelete({
      open: true,
      mode: 'bulk',
      count: selectedItems.size,
    })
  }

  const closeDeleteConfirm = () => {
    setConfirmDelete({
      open: false,
      mode: 'single',
      count: 0,
    })
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleBulkDelete = async () => {
    for (const itemKey of Array.from(selectedItems)) {
      const [type, id] = itemKey.split('-')
      if (type === 'file') {
        await onFileDelete(parseInt(id, 10))
      }
    }
    setSelectedItems(new Set())
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'file' | 'folder', item: any) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id: item.id,
      item
    })
  }

  const handleDownload = async (file: FileItem) => {
    setDownloadingFile(file.id)
    try {
      const response = await downloadFile(file.id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.original_name || file.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloadingFile(null)
    }
  }

  const handleDelete = async (fileId: number) => {
    setDeletingFile(fileId)
    try {
      await onFileDelete(fileId)
    } finally {
      setDeletingFile(null)
    }
  }

  const openSingleDeleteConfirm = (fileId: number) => {
    setConfirmDelete({
      open: true,
      mode: 'single',
      fileId,
      count: 1,
    })
  }

  const confirmDeleteAction = async () => {
    try {
      if (confirmDelete.mode === 'single' && confirmDelete.fileId) {
        await handleDelete(confirmDelete.fileId)
      } else if (confirmDelete.mode === 'bulk') {
        await handleBulkDelete()
      }
    } finally {
      closeDeleteConfirm()
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
    : folders

  if (files.length === 0 && filteredFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card/50 border border-border border-dashed rounded-2xl fade-in">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
          <div className="relative p-6 bg-muted rounded-full">
            <File className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {searchQuery ? 'No results found' : 'Your drive is empty'}
        </h3>
        <p className="text-muted-foreground max-w-xs text-center">
          {searchQuery 
            ? `We couldn't find anything matching "${searchQuery}"`
            : 'Get started by uploading your first file or creating a new folder.'
          }
        </p>
      </div>
    )
  }

  const SelectionToolbar = () => (
    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 slide-in mb-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-bold text-primary">
          {selectedItems.size} items selected
        </span>
        <button
          onClick={() => setSelectedItems(new Set())}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear selection
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={openBulkDeleteConfirm}
          className="flex items-center space-x-2 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-all text-sm font-bold"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      {selectedItems.size > 0 && <SelectionToolbar />}

      {viewMode === 'list' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-border"
                    checked={selectedItems.size > 0 && selectedItems.size === (files.length + filteredFolders.length)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const all = new Set<string>()
                        filteredFolders.forEach(f => all.add(`folder-${f.id}`))
                        files.forEach(f => all.add(`file-${f.id}`))
                        setSelectedItems(all)
                      } else {
                        setSelectedItems(new Set())
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground hidden md:table-cell">Size</th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFolders.map(folder => (
                <tr 
                  key={`folder-${folder.id}`}
                  onClick={() => onFolderClick(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
                  className={`group hover:bg-muted/50 cursor-pointer transition-colors border-b border-border last:border-0 ${
                    selectedItems.has(`folder-${folder.id}`) ? 'bg-primary/5 hover:bg-primary/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-border"
                      checked={selectedItems.has(`folder-${folder.id}`)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => toggleSelection(e as any, 'folder', folder.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded mr-3">
                        <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-xs">
                        {folder.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">--</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">--</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    </div>
                  </td>
                </tr>
              ))}
              {files.map(file => {
                const IconComponent = getFileIconComponent(file.mime_type)
                const isDeleting = deletingFile === file.id
                const isDownloading = downloadingFile === file.id

                return (
                  <tr 
                    key={`file-${file.id}`}
                    onClick={() => onFileOpen(file)}
                    onContextMenu={(e) => handleContextMenu(e, 'file', file)}
                    className={`group hover:bg-muted/50 cursor-pointer transition-colors border-b border-border last:border-0 ${
                      selectedItems.has(`file-${file.id}`) ? 'bg-primary/5 hover:bg-primary/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-border"
                        checked={selectedItems.has(`file-${file.id}`)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => toggleSelection(e, 'file', file.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleStar?.(file.id)
                        }}
                        className={`p-1 mr-2 rounded-md transition-colors ${
                          starredIds?.has(file.id) 
                            ? 'text-yellow-500 hover:text-yellow-600' 
                            : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${starredIds?.has(file.id) ? 'fill-current' : ''}`} />
                      </button>
                      <div className="p-2 bg-muted rounded mr-3 w-10 h-10 flex items-center justify-center overflow-hidden">
                        {file.mime_type.startsWith('image/') ? (
                          <img 
                            src={getAuthenticatedFileUrl(file.id, 'stream')} 
                            alt={file.name}
                            className="w-full h-full object-cover rounded-sm"
                            loading="lazy"
                          />
                        ) : (
                          <IconComponent className={`w-5 h-5 ${getFileIconColor(file.mime_type)}`} />
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-xs">
                        {file.original_name || file.name}
                      </span>
                    </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div 
                        className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(file)
                          }}
                          disabled={isDownloading}
                          className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                          title="Download"
                        >
                          {isDownloading ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openSingleDeleteConfirm(file.id)
                          }}
                          disabled={isDeleting}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {isDeleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="file-grid">
        {filteredFolders.map(folder => (
          <div
            key={`folder-${folder.id}`}
            onClick={() => onFolderClick(folder.id)}
            onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
            className={`file-item group cursor-pointer border-dashed relative ${
              selectedItems.has(`folder-${folder.id}`) ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
          >
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <input 
                type="checkbox" 
                className="rounded border-border"
                checked={selectedItems.has(`folder-${folder.id}`)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => toggleSelection(e as any, 'folder', folder.id)}
              />
            </div>
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

        {files.map(file => {
          const IconComponent = getFileIconComponent(file.mime_type)
          const isDeleting = deletingFile === file.id
          const isDownloading = downloadingFile === file.id

          return (
            <div
              key={`file-${file.id}`}
              className={`file-item group cursor-pointer relative pb-10 ${
                selectedItems.has(`file-${file.id}`) ? 'ring-2 ring-primary/60 bg-primary/5' : ''
              }`}
              onClick={() => onFileOpen(file)}
              onContextMenu={(e) => handleContextMenu(e, 'file', file)}
            >
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <input 
                  type="checkbox" 
                  className="rounded border-border"
                  checked={selectedItems.has(`file-${file.id}`)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => toggleSelection(e as any, 'file', file.id)}
                />
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStar?.(file.id)
                  }}
                  className={`p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/70 shadow-sm transition-colors ${
                    starredIds?.has(file.id) ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Star className={`w-4 h-4 ${starredIds?.has(file.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-muted/80 rounded-xl w-16 h-16 flex items-center justify-center overflow-hidden border border-border/60">
                    {file.mime_type.startsWith('image/') ? (
                      <img 
                        src={getAuthenticatedFileUrl(file.id, 'stream')} 
                        alt={file.name}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      <IconComponent className={`w-8 h-8 ${getFileIconColor(file.mime_type)}`} />
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                  {truncateText(file.name, 20)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(file)
                  }}
                  disabled={isDownloading}
                  className="p-1.5 text-blue-600 hover:text-blue-700 bg-card/90 border border-border/70 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  title="Download"
                >
                  {isDownloading ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openSingleDeleteConfirm(file.id)
                  }}
                  disabled={isDeleting}
                  className="p-1.5 text-red-600 hover:text-red-700 bg-card/90 border border-border/70 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  title="Delete"
                >
                  {isDeleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )}

    {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl fade-in">
            <div className="p-5 border-b border-border flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Confirm Delete</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                {confirmDelete.mode === 'single'
                  ? (isTrashView ? 'Are you sure you want to permanently delete this file? This action cannot be undone.' : 'Are you sure you want to move this file to the trash?')
                  : (isTrashView ? `Are you sure you want to permanently delete ${confirmDelete.count} selected items? This action cannot be undone.` : `Are you sure you want to move ${confirmDelete.count} selected items to the trash?`)}
              </p>
              <div className="mt-5 flex justify-end space-x-2">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAction}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onClose={closeContextMenu}
          onDownload={contextMenu.type === 'file' ? () => handleDownload(contextMenu.item) : undefined}
          onDelete={contextMenu.type === 'file' ? () => openSingleDeleteConfirm(contextMenu.id) : undefined}
          onRestore={contextMenu.type === 'file' && isTrashView ? () => onFileRestore?.(contextMenu.id) : undefined}
          isStarred={contextMenu.type === 'file' ? starredIds.has(contextMenu.id) : undefined}
          onToggleStar={contextMenu.type === 'file' && !isTrashView ? () => onToggleStar?.(contextMenu.id) : undefined}
          isTrashView={isTrashView}
          onRename={() => {
            const newName = prompt('Enter new name:', contextMenu.item.original_name || contextMenu.item.name)
            if (newName && newName !== (contextMenu.item.original_name || contextMenu.item.name)) {
              if (contextMenu.type === 'file') {
                onFileRename?.(contextMenu.id, newName)
              }
            }
          }}
        />
      )}
    </div>
  )
}
