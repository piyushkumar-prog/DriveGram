'use client'

import { useEffect, useRef } from 'react'
import { Download, Trash2, Edit2, Share2, Info } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onDownload?: () => void
  onDelete?: () => void
  onRename?: () => void
  onShare?: () => void
  onInfo?: () => void
  type: 'file' | 'folder'
}

export function ContextMenu({ 
  x, 
  y, 
  onClose, 
  onDownload, 
  onDelete, 
  onRename, 
  onShare, 
  onInfo,
  type 
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Adjust position if menu goes off screen
  const adjustedX = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 200 : x)
  const adjustedY = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 250 : y)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-card border border-border rounded-xl shadow-xl py-1 fade-in"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {type === 'file' && onDownload && (
        <button
          onClick={() => { onDownload(); onClose(); }}
          className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4 mr-2 text-muted-foreground" />
          Download
        </button>
      )}
      
      {onRename && (
        <button
          onClick={() => { onRename(); onClose(); }}
          className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" />
          Rename
        </button>
      )}

      {onShare && (
        <button
          onClick={() => { onShare(); onClose(); }}
          className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          <Share2 className="w-4 h-4 mr-2 text-muted-foreground" />
          Share
        </button>
      )}

      {onInfo && (
        <button
          onClick={() => { onInfo(); onClose(); }}
          className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          <Info className="w-4 h-4 mr-2 text-muted-foreground" />
          Details
        </button>
      )}

      <div className="my-1 border-t border-border" />

      {onDelete && (
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      )}
    </div>
  )
}
