'use client'

import { ArrowLeft, Home, Folder, Clock, Star, Trash2, HardDrive } from 'lucide-react'

interface Folder {
  id: number
  name: string
  path: string
  parent_id?: number
}

export type SidebarCategory = 'all' | 'recent' | 'starred' | 'trash'

interface SidebarProps {
  folders: Folder[]
  currentFolder: number | null
  currentCategory: SidebarCategory
  onFolderClick: (folderId: number) => void
  onHomeClick: () => void
  onCategoryClick: (category: SidebarCategory) => void
  onBackClick?: () => void
}

export function Sidebar({ 
  folders, 
  currentFolder, 
  currentCategory,
  onFolderClick, 
  onHomeClick, 
  onCategoryClick,
  onBackClick 
}: SidebarProps) {
  const rootFolders = folders.filter(folder => !folder.parent_id)

  return (
    <aside className="w-64 bg-card border-r border-border hidden md:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide">
      <div className="p-4 flex flex-col min-h-full">
        <nav className="space-y-1 flex-1">
          <button
            onClick={() => {
              onHomeClick()
              onCategoryClick('all')
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentCategory === 'all' && !currentFolder
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-semibold">All Files</span>
          </button>

          <button
            onClick={() => onCategoryClick('recent')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentCategory === 'recent'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Recent</span>
          </button>

          <button
            onClick={() => onCategoryClick('starred')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentCategory === 'starred'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Star className="w-4 h-4" />
            <span className="text-sm font-semibold">Starred</span>
          </button>

          <button
            onClick={() => onCategoryClick('trash')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentCategory === 'trash'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Trash</span>
          </button>

          <div className="pt-6 mt-4">
            <h3 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              My Folders
            </h3>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
              {rootFolders.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground italic">No folders yet</p>
              )}
              {rootFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => onFolderClick(folder.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-colors group ${
                    currentFolder === folder.id
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Folder className={`w-4 h-4 ${currentFolder === folder.id ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-auto pt-6">
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <HardDrive className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground">Storage</span>
            </div>
            

            
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
              <span className="text-muted-foreground">Unlimited Data</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
