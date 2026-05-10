'use client'

import { X, Download } from 'lucide-react'
import { getAuthenticatedFileUrl } from '@/lib/api'

interface FileItem {
  id: number
  name: string
  original_name: string
  size: number
  mime_type: string
}

interface FilePreviewModalProps {
  file: FileItem
  onClose: () => void
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const streamUrl = getAuthenticatedFileUrl(file.id, 'stream')
  const inlineDownloadUrl = getAuthenticatedFileUrl(file.id, 'download', true)
  const downloadUrl = getAuthenticatedFileUrl(file.id, 'download')

  const isImage = file.mime_type.startsWith('image/')
  const isVideo = file.mime_type.startsWith('video/')
  const isAudio = file.mime_type.startsWith('audio/')
  const isPdf = file.mime_type === 'application/pdf'
  const isText = file.mime_type.startsWith('text/')
  const isPreviewableDoc = isPdf || isText

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden slide-in">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-foreground truncate pr-4">
              {file.original_name}
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {file.mime_type}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 inline-flex items-center text-sm font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto flex-1 bg-muted/20">
          <div className="flex items-center justify-center min-h-[50vh]">
            {isImage && (
              <img
                src={streamUrl}
                alt={file.original_name}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
              />
            )}

            {isVideo && (
              <video
                src={streamUrl}
                controls
                className="w-full max-h-[70vh] rounded-2xl bg-black shadow-2xl"
                preload="metadata"
              />
            )}

            {isAudio && (
              <div className="w-full max-w-2xl bg-card border border-border p-8 rounded-3xl shadow-xl">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Download className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{file.original_name}</h3>
                  <p className="text-sm text-muted-foreground">Audio file</p>
                </div>
                <audio src={streamUrl} controls className="w-full" preload="metadata" />
              </div>
            )}

            {isPreviewableDoc && (
              <iframe
                src={inlineDownloadUrl}
                className="w-full h-[70vh] rounded-2xl border border-border bg-white shadow-lg"
                title={file.original_name}
              />
            )}

            {!isImage && !isVideo && !isAudio && !isPreviewableDoc && (
              <div className="flex flex-col items-center justify-center text-center p-12 bg-card border border-border rounded-3xl shadow-xl">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <X className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Preview not available</h3>
                <p className="text-muted-foreground max-w-xs mb-8">
                  We don't support previewing {file.mime_type} files yet. 
                  Download the file to view it on your device.
                </p>
                <a
                  href={downloadUrl}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 inline-flex items-center font-bold"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Now
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
