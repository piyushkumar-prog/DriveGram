'use client'

import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  id: number | null
  name: string
}

interface BreadcrumbsProps {
  path: BreadcrumbItem[]
  onNavigate: (id: number | null) => void
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
      >
        <Home className="w-4 h-4" />
      </button>

      {path.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
          <button
            onClick={() => onNavigate(item.id)}
            className={`hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted ${
              index === path.length - 1 ? 'font-semibold text-foreground' : ''
            }`}
          >
            {item.name}
          </button>
        </div>
      ))}
    </nav>
  )
}
