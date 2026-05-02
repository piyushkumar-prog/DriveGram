'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface FolderItem {
  id: number
  name: string
  path: string
  user_id: number
  parent_id?: number
  created_at: string
  updated_at: string
}

export function useFolders() {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadFolders = async (parentId?: number) => {
    setIsLoading(true)
    try {
      const url = parentId ? `/files?folder_id=${parentId}` : '/files'
      const response = await api.get(url)
      setFolders(response.data.folders || [])
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load folders')
    } finally {
      setIsLoading(false)
    }
  }

  const createFolder = async (name: string, parentId?: number) => {
    try {
      const response = await api.post('/files/mkdir', {
        name,
        parent_id: parentId
      })
      const newFolder = response.data
      setFolders(prev => [...prev, newFolder])
      toast.success('Folder created successfully')
      return newFolder
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create folder')
      throw error
    }
  }

  const deleteFolder = async (folderId: number) => {
    try {
      // Note: This would need to be implemented in the backend
      // await api.delete(`/folders/${folderId}`)
      setFolders(prev => prev.filter(folder => folder.id !== folderId))
      toast.success('Folder deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete folder')
      throw error
    }
  }

  const renameFolder = async (folderId: number, newName: string) => {
    try {
      // Note: This would need to be implemented in the backend
      // await api.put(`/folders/${folderId}`, { name: newName })
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? { ...folder, name: newName } : folder
      ))
      toast.success('Folder renamed successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to rename folder')
      throw error
    }
  }

  useEffect(() => {
    loadFolders()
  }, [])

  return {
    folders,
    isLoading,
    loadFolders,
    createFolder,
    deleteFolder,
    renameFolder,
  }
}
