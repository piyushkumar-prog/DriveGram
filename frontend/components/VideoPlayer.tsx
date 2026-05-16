'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Loader2, Settings, X, ChevronRight, Check, Subtitles, Upload
} from 'lucide-react'

interface VideoPlayerProps {
  src: string
  className?: string
}

type SettingsPanel = 'main' | 'subtitles' | 'audio' | 'quality'

export function VideoPlayer({ src, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const subtitleInputRef = useRef<HTMLInputElement>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isBuffering, setIsBuffering] = useState(true)

  // Tracks
  const [textTracks, setTextTracks] = useState<TextTrack[]>([])
  const [audioTracks, setAudioTracks] = useState<{ label: string; language: string; index: number; enabled: boolean }[]>([])
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null)
  const [activeAudio, setActiveAudio] = useState<number | null>(null)

  // Settings panel
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>('main')

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ── Auto-hide controls ────────────────────────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (isPlaying && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [isPlaying, showSettings])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('mousemove', resetControlsTimeout)
    container.addEventListener('mouseleave', () => {
      if (isPlaying && !showSettings) setShowControls(false)
    })
    return () => {
      container.removeEventListener('mousemove', resetControlsTimeout)
      container.removeEventListener('mouseleave', () => { })
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [resetControlsTimeout, isPlaying, showSettings])

  // ── Fullscreen listener ───────────────────────────────────────────────
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  // ── Detect tracks after metadata loads ───────────────────────────────
  const detectTracks = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // Text tracks (subtitles / captions)
    const tt: TextTrack[] = []
    for (let i = 0; i < video.textTracks.length; i++) {
      tt.push(video.textTracks[i])
      video.textTracks[i].mode = 'hidden' // hide all by default
    }
    setTextTracks(tt)

    // Audio tracks — API exists in Safari/Firefox, Chrome partial
    const at: { label: string; language: string; index: number; enabled: boolean }[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioTrackList = (video as any).audioTracks
    if (audioTrackList) {
      for (let i = 0; i < audioTrackList.length; i++) {
        const t = audioTrackList[i]
        at.push({ label: t.label || `Track ${i + 1}`, language: t.language || 'und', index: i, enabled: t.enabled })
        if (t.enabled) setActiveAudio(i)
      }
    }
    setAudioTracks(at)
  }, [])

  // ── Playback controls ─────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (isPlaying) { v.pause(); setIsPlaying(false) }
    else { v.play(); setIsPlaying(true) }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v || isNaN(v.duration)) return
    setCurrentTime(v.currentTime)
    setProgress((v.currentTime / v.duration) * 100)
    // Update buffered
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const val = parseFloat(e.target.value)
    v.currentTime = (val / 100) * duration
    setProgress(val)
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const val = parseFloat(e.target.value)
    v.volume = val
    setVolume(val)
    const muted = val === 0
    v.muted = muted
    setIsMuted(muted)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // ── Subtitle control ──────────────────────────────────────────────────
  const selectSubtitle = (index: number | null) => {
    const v = videoRef.current
    if (!v) return
    for (let i = 0; i < v.textTracks.length; i++) {
      v.textTracks[i].mode = i === index ? 'showing' : 'hidden'
    }
    setActiveSubtitle(index)
    setShowSettings(false)
  }

  const loadExternalSubtitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const v = videoRef.current
    if (!file || !v) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      let vttContent = content

      // Convert SRT to VTT if needed
      if (file.name.endsWith('.srt')) {
        vttContent = 'WEBVTT\n\n' + content
          .replace(/(\d+)\r?\n(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/g,
            '$1\n$2.$3 --> $4.$5')
      }

      const blob = new Blob([vttContent], { type: 'text/vtt' })
      const url = URL.createObjectURL(blob)

      // Remove existing external track
      const existing = v.querySelector('track[data-external]')
      if (existing) existing.remove()

      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = file.name
      track.src = url
      track.setAttribute('data-external', 'true')
      track.default = true
      v.appendChild(track)

      // Re-detect tracks after adding
      setTimeout(() => {
        detectTracks()
        const newIndex = v.textTracks.length - 1
        selectSubtitle(newIndex)
      }, 100)
    }
    reader.readAsText(file)
    e.target.value = ''
    setShowSettings(false)
  }

  // ── Audio track control ───────────────────────────────────────────────
  const selectAudioTrack = (index: number) => {
    const v = videoRef.current
    if (!v) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioTrackList = (v as any).audioTracks
    if (audioTrackList) {
      for (let i = 0; i < audioTrackList.length; i++) {
        audioTrackList[i].enabled = i === index
      }
      setActiveAudio(index)
    }
    setShowSettings(false)
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    if (isNaN(s) || !isFinite(s)) return '0:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  const hasSubtitleSupport = textTracks.length > 0
  const hasAudioTrackSupport = audioTracks.length > 1

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black select-none overflow-hidden ${className || ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.controls-area')) return
        togglePlay()
      }}
    >
      {/* ── VIDEO ELEMENT ── */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration)
          detectTracks()
        }}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* ── BUFFERING SPINNER ── */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
        </div>
      )}

      {/* ── CONTROLS ── */}
      <div
        className={`controls-area absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="relative z-10 px-4 pb-4 pt-8">
          {/* ── PROGRESS BAR ── */}
          <div className="flex items-center gap-3 mb-4 group/prog">
            <span className="text-xs font-mono font-medium text-white/90 w-10 shrink-0 text-right">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 h-1 group-hover/prog:h-1.5 transition-all duration-150 flex items-center cursor-pointer">
              {/* Track */}
              <div className="absolute inset-0 bg-white/20 rounded-full overflow-visible" />
              {/* Buffered */}
              <div
                className="absolute left-0 top-0 h-full bg-white/30 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Progress */}
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity -translate-y-0 pointer-events-none"
                style={{ left: `calc(${progress}% - 7px)` }}
              />
              {/* Input overlay */}
              <input
                type="range" min="0" max="100" step="0.1"
                value={progress || 0}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <span className="text-xs font-mono font-medium text-white/60 w-10 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* ── BOTTOM ROW ── */}
          <div className="flex items-center justify-between">
            {/* Left: play, volume */}
            <div className="flex items-center gap-5">
              {/* Play/Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay() }}
                className="text-white hover:text-primary transition-colors focus:outline-none"
              >
                {isPlaying
                  ? <Pause className="w-6 h-6 fill-white hover:fill-primary transition-colors" />
                  : <Play className="w-6 h-6 fill-white hover:fill-primary transition-colors" />
                }
              </button>

              {/* Volume */}
              <div
                className="flex items-center gap-2 group/vol"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary transition-colors focus:outline-none"
                >
                  {isMuted || volume === 0
                    ? <VolumeX className="w-5 h-5" />
                    : <Volume2 className="w-5 h-5" />
                  }
                </button>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300 ease-out flex items-center">
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right: settings, fullscreen */}
            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
              {/* ── SETTINGS BUTTON ── */}
              <div className="relative">
                <button
                  onClick={() => { setShowSettings(s => !s); setSettingsPanel('main') }}
                  className={`text-white hover:text-primary transition-colors focus:outline-none ${showSettings ? 'text-primary' : ''}`}
                  title="Settings"
                >
                  <Settings className={`w-5 h-5 transition-transform duration-300 ${showSettings ? 'rotate-45' : ''}`} />
                </button>

                {/* ── SETTINGS PANEL ── */}
                {showSettings && (
                  <div
                    className="absolute bottom-10 right-0 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Main menu */}
                    {settingsPanel === 'main' && (
                      <div className="p-1">
                        <div className="px-3 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                          Video Settings
                        </div>

                        {/* Quality */}
                        <button
                          onClick={() => setSettingsPanel('quality')}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <span className="font-medium">Quality</span>
                          <div className="flex items-center gap-2 text-white/50">
                            <span className="text-xs">Auto</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        {/* Subtitles */}
                        <button
                          onClick={() => setSettingsPanel('subtitles')}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <span className="font-medium">Subtitles</span>
                          <div className="flex items-center gap-2 text-white/50">
                            <span className="text-xs">
                              {activeSubtitle !== null
                                ? (textTracks[activeSubtitle]?.label || `Track ${activeSubtitle + 1}`)
                                : 'Off'
                              }
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        {/* Audio */}
                        <button
                          onClick={() => setSettingsPanel('audio')}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <span className="font-medium">Audio Language</span>
                          <div className="flex items-center gap-2 text-white/50">
                            <span className="text-xs">
                              {activeAudio !== null && audioTracks[activeAudio]
                                ? (audioTracks[activeAudio].label || audioTracks[activeAudio].language)
                                : 'Default'
                              }
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Quality panel */}
                    {settingsPanel === 'quality' && (
                      <div className="p-1">
                        <button
                          onClick={() => setSettingsPanel('main')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors mb-1"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          <span className="font-semibold">Quality</span>
                        </button>
                        <div className="px-3 py-2.5 rounded-xl flex items-center justify-between bg-white/5">
                          <span className="text-white/80">Auto (Native)</span>
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[11px] text-white/30 px-3 py-3 leading-relaxed">
                          Adaptive quality switching requires HLS/DASH. This file streams at its native resolution.
                        </p>
                      </div>
                    )}

                    {/* Subtitles panel */}
                    {settingsPanel === 'subtitles' && (
                      <div className="p-1">
                        <button
                          onClick={() => setSettingsPanel('main')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors mb-1"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          <span className="font-semibold">Subtitles</span>
                        </button>

                        {/* Off option */}
                        <button
                          onClick={() => selectSubtitle(null)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <span>Off</span>
                          {activeSubtitle === null && <Check className="w-4 h-4 text-primary" />}
                        </button>

                        {/* Detected tracks */}
                        {textTracks.map((track, i) => (
                          <button
                            key={i}
                            onClick={() => selectSubtitle(i)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <span>{track.label || track.language || `Track ${i + 1}`}</span>
                            {activeSubtitle === i && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        ))}

                        {!hasSubtitleSupport && (
                          <p className="text-[11px] text-white/30 px-3 py-2 leading-relaxed">
                            No embedded subtitles found.
                          </p>
                        )}

                        {/* Upload external subtitle */}
                        <div className="border-t border-white/10 mt-1 pt-1">
                          <button
                            onClick={() => subtitleInputRef.current?.click()}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Load subtitle file (.srt / .vtt)</span>
                          </button>
                          <input
                            ref={subtitleInputRef}
                            type="file"
                            accept=".vtt,.srt"
                            className="hidden"
                            onChange={loadExternalSubtitle}
                          />
                        </div>
                      </div>
                    )}

                    {/* Audio track panel */}
                    {settingsPanel === 'audio' && (
                      <div className="p-1">
                        <button
                          onClick={() => setSettingsPanel('main')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors mb-1"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          <span className="font-semibold">Audio Language</span>
                        </button>

                        {hasAudioTrackSupport ? (
                          audioTracks.map((track) => (
                            <button
                              key={track.index}
                              onClick={() => selectAudioTrack(track.index)}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                            >
                              <div className="text-left">
                                <div>{track.label || `Track ${track.index + 1}`}</div>
                                {track.language && track.language !== 'und' && (
                                  <div className="text-[11px] text-white/40">{track.language}</div>
                                )}
                              </div>
                              {activeAudio === track.index && <Check className="w-4 h-4 text-primary" />}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3">
                            <p className="text-[11px] text-white/30 leading-relaxed">
                              Only one audio track detected, or your browser does not support audio track switching (Chrome limitation).
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-primary transition-colors focus:outline-none"
              >
                {isFullscreen
                  ? <Minimize className="w-5 h-5" />
                  : <Maximize className="w-5 h-5" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
