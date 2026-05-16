'use client'

import { X, Download } from 'lucide-react'
import { getAuthenticatedFileUrl } from '@/lib/api'
import { VideoPlayer } from './VideoPlayer'

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

  // Detect file type by MIME and extension (synced files may have generic MIME)
  const ext = (file.original_name || file.name).split('.').pop()?.toLowerCase() || ''
  
  // HTML5 <video> only universally supports mp4, webm, and ogg containers.
  const videoExtensions = ['mp4', 'webm', 'ogg']
  
  // HTML5 <audio> only universally supports mp3, wav, ogg, and sometimes m4a/aac.
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']

  const isImage = file.mime_type.startsWith('image/')
  const isSupportedVideoMime = ['video/mp4', 'video/webm', 'video/ogg'].includes(file.mime_type.toLowerCase())
  const isVideo = isSupportedVideoMime || videoExtensions.includes(ext)
  
  const isSupportedAudioMime = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'].includes(file.mime_type.toLowerCase())
  const isAudio = !isVideo && (isSupportedAudioMime || audioExtensions.includes(ext))
  
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
              <div className="relative w-full flex flex-col items-center justify-center fade-in">
                {/* Cinematic Glow Behind Video */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-purple-500/10 to-transparent blur-3xl opacity-60 pointer-events-none -z-10" />
                
                <div className="relative w-full max-w-5xl rounded-[2rem] overflow-hidden ring-1 ring-border/50 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] bg-black/95">
                  <VideoPlayer 
                    src={streamUrl} 
                    className="w-full h-full max-h-[75vh]" 
                  />
                </div>
              </div>
            )}

            {isAudio && (
              <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-border/50 fade-in">
                {/* Premium Glassmorphic Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card to-card/90 backdrop-blur-3xl z-0" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none z-0" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none z-0" />
                
                <div className="relative z-10 p-10 flex flex-col items-center">
                  <div className="w-32 h-32 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-8 ring-1 ring-primary/20 shadow-inner group">
                    <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 text-center max-w-full truncate px-4">{file.original_name}</h3>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-10">{file.mime_type}</p>
                  
                  <div className="w-full bg-black/5 dark:bg-black/40 rounded-2xl p-2 ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-md">
                    <audio src={streamUrl} controls className="w-full h-12" preload="metadata" />
                  </div>
                </div>
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
