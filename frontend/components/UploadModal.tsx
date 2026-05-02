'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, File, Image, Video, Music, FileText } from 'lucide-react'
import { formatFileSize, getFileIcon, getFileIconColor } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'

interface UploadModalProps {
  onClose: () => void
  onUpload: (files: File[]) => Promise<void>
}

interface FilePreview {
  file: File
  preview?: string
}

export function UploadModal({ onClose, onUpload }: UploadModalProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      return { file, preview }
    })
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    try {
      await onUpload(files.map(f => f.file))
      onClose()
    } finally {
      setIsUploading(false)
    }
  }

  const getFileIconComponent = (file: File) => {
    if (file.type.startsWith('image/')) return Image
    if (file.type.startsWith('video/')) return Video
    if (file.type.startsWith('audio/')) return Music
    if (file.type.includes('document') || file.type.includes('pdf')) return FileText
    return File
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden fade-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Upload Files</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`drop-zone cursor-pointer ${
              isDragActive ? 'dragover' : ''
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <button
                type="button"
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition duration-200"
              >
                Choose Files
              </button>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-foreground mb-3">
                Files to upload ({files.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((filePreview, index) => {
                  const IconComponent = getFileIconComponent(filePreview.file)
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
                    >
                      {filePreview.preview ? (
                        <img
                          src={filePreview.preview}
                          alt={filePreview.file.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="p-2 bg-background rounded">
                          <IconComponent 
                            className={`w-6 h-6 ${getFileIconColor(filePreview.file.type)}`}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {filePreview.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(filePreview.file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
