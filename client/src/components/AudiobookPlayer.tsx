import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { Book } from '../types'

interface AudiobookPlayerProps {
  book: Book
  onClose?: () => void
}

interface AudiobookMetadata {
  title: string
  author?: string
  narrator?: string
  duration?: number
  format?: string
  chapters?: Chapter[]
}

interface Chapter {
  title: string
  start_time?: number
}

export default function AudiobookPlayer({ book, onClose }: AudiobookPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [metadata, setMetadata] = useState<AudiobookMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch audiobook metadata
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/api/audiobooks/${book.id}/metadata`)
        if (response.ok) {
          const data = await response.json()
          setMetadata(data)
        }
      } catch (error) {
        console.error('Failed to fetch audiobook metadata:', error)
      }
    }

    fetchMetadata()
  }, [book.id])

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  const handleMuteToggle = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-surface-card border border-line rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-on-surface truncate">
            {metadata?.title || book.title}
          </h2>
          {(metadata?.author || metadata?.narrator) && (
            <div className="text-sm text-on-surface-variant mt-1">
              {metadata?.author && <p>By {metadata.author}</p>}
              {metadata?.narrator && <p>Narrated by {metadata.narrator}</p>}
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close player"
          >
            ✕
          </button>
        )}
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={`/api/audiobooks/${book.id}/stream`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          setIsLoading(false)
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        crossOrigin="anonymous"
      />

      {/* Progress Bar */}
      <div className="flex flex-col gap-2">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleTimeChange}
          className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-accent"
          disabled={isLoading}
          aria-label="Playback progress"
        />
        <div className="flex justify-between text-xs text-on-surface-variant">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Skip back */}
        <button
          onClick={() => handleSkip(-15)}
          className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface"
          aria-label="Skip back 15 seconds"
        >
          <SkipBack size={20} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="p-3 bg-accent hover:bg-accent/90 disabled:bg-surface-variant text-on-accent rounded-full transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => handleSkip(15)}
          className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface"
          aria-label="Skip forward 15 seconds"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleMuteToggle}
          className="p-1 hover:bg-surface-variant rounded transition-colors text-on-surface"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-accent"
          aria-label="Volume"
        />
        <span className="text-xs text-on-surface-variant w-8 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Chapters List (if available) */}
      {metadata?.chapters && metadata.chapters.length > 0 && (
        <div className="border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-on-surface mb-2">Chapters</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {metadata.chapters.map((chapter, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (chapter.start_time !== undefined && audioRef.current) {
                    audioRef.current.currentTime = chapter.start_time
                    setCurrentTime(chapter.start_time)
                    audioRef.current.play()
                    setIsPlaying(true)
                  }
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-surface-variant transition-colors text-sm text-on-surface-variant hover:text-on-surface truncate"
                title={chapter.title}
              >
                {chapter.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio Format Info */}
      {metadata?.format && (
        <div className="text-xs text-on-surface-variant text-center">
          {metadata.format.toUpperCase()} • {metadata.duration ? formatTime(metadata.duration) : 'Duration unknown'}
        </div>
      )}
    </div>
  )
}
