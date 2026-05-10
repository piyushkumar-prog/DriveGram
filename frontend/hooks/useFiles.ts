'use client'

import { useState, useEffect } from 'react'
import { api, uploadFile as uploadFileAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface FileItem {
  id: number
  name: string
  original_name: string
  size: number
  mime_type: string
  telegram_file_id: string
  telegram_msg_id: number
  user_id: number
  folder_id?: number
  file_path: string
  thumbnail_path?: string
  created_at: string
  updated_at: string
}

export function useFiles() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem('starredFiles')
    if (saved) {
      setStarredIds(new Set(JSON.parse(saved)))
    }
  }, [])

  const toggleStar = (fileId: number) => {
    const newStarred = new Set(starredIds)
    if (newStarred.has(fileId)) {
      newStarred.delete(fileId)
    } else {
      newStarred.add(fileId)
    }
    setStarredIds(newStarred)
    localStorage.setItem('starredFiles', JSON.stringify(Array.from(newStarred)))
  }

  const loadFiles = async (folderId?: number) => {
    setIsLoading(true)
    try {
      const url = folderId ? `/files?folder_id=${folderId}` : '/files'
      const response = await api.get(url)
      setFiles(response.data.files || [])
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFile = async (file: File, folderId?: number) => {
    try {
      const uploadedFile = await uploadFileAPI(file, folderId)
      setFiles(prev => [uploadedFile, ...prev])
      toast.success(`${file.name} uploaded successfully`)
      return uploadedFile
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to upload ${file.name}`)
      throw error
    }
  }

  const deleteFile = async (fileId: number) => {
    try {
      await api.delete(`/files/${fileId}`)
      setFiles(prev => prev.filter(file => file.id !== fileId))
      toast.success('File deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete file')
      throw error
    }
  }

  const searchFiles = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`)
      setFiles(response.data.files || [])
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }

  const renameFile = async (fileId: number, newName: string) => {
    try {
      await api.put(`/files/${fileId}`, { name: newName })
      setFiles(prev => prev.map(file => 
        file.id === fileId ? { ...file, name: newName } : file
      ))
      toast.success('File renamed successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to rename file')
      throw error
    }
  }

  const syncFiles = async (currentFolderId?: number) => {
    setIsLoading(true)
    try {
      await api.post('/files/sync')
      toast.success('Synced with Telegram successfully')
      await loadFiles(currentFolderId)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Sync failed')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  return {
    files,
    isLoading,
    starredIds,
    loadFiles,
    uploadFile,
    deleteFile,
    searchFiles,
    renameFile,
    toggleStar,
    syncFiles,
  }
}
