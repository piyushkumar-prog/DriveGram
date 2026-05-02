import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'music'
  if (mimeType.includes('pdf')) return 'file-text'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'file-text'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'file-spreadsheet'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation'
  return 'file'
}

export function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'text-green-500'
  if (mimeType.startsWith('video/')) return 'text-purple-500'
  if (mimeType.startsWith('audio/')) return 'text-pink-500'
  if (mimeType.includes('pdf')) return 'text-red-500'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'text-blue-500'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'text-green-600'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'text-yellow-500'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'text-orange-500'
  return 'text-gray-500'
}

export function sanitizeFilename(filename: string): string {
  const invalid = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
  let sanitized = filename
  for (const char of invalid) {
    sanitized = sanitized.replace(new RegExp('\\' + char, 'g'), '_')
  }
  return sanitized
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
