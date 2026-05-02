'use client'

import { ArrowLeft, Home, Folder } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface Folder {
  id: number
  name: string
  path: string
  parent_id?: number
}

interface SidebarProps {
  folders: Folder[]
  currentFolder: number | null
  onFolderClick: (folderId: number) => void
  onBackClick?: () => void
}

export function Sidebar({ folders, currentFolder, onFolderClick, onBackClick }: SidebarProps) {
  const rootFolders = folders.filter(folder => !folder.parent_id)

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen">
      <div className="p-4">
        <nav className="space-y-2">
          <button
            onClick={() => onFolderClick && onFolderClick(0)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
              !currentFolder
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Home</span>
          </button>

          {onBackClick && (
            <button
              onClick={onBackClick}
              className="w-full flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}

          <div className="pt-4 border-t border-border">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Folders
            </h3>
            <div className="space-y-1">
              {rootFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => onFolderClick(folder.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    currentFolder === folder.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span className="text-sm font-medium truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-2">Storage Info</h3>
          <p className="text-xs text-muted-foreground">
            Using Telegram's Saved Messages as cloud storage
          </p>
          <div className="mt-2">
            <div className="w-full bg-background rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">25% used</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
