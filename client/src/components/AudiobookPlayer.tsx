import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, BookOpen } from 'lucide-react'
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

  const coverUrl = book.cover_filename ? `/api/books/${book.id}/cover?t=${book.date_modified ?? ''}` : null
  const [imgError, setImgError] = useState(false)

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
    <div className="flex-1 flex flex-col h-full bg-surface">
      {/* Main Content Area (Cover Art) */}
      <div className="flex-1 flex items-center justify-center p-8 min-h-0">
        <div className="w-full max-w-md aspect-square max-h-full rounded-2xl overflow-hidden bg-surface-raised border border-line flex items-center justify-center shadow-2xl">
          {coverUrl && !imgError ? (
            <img
              src={coverUrl}
              alt={metadata?.title || book.title || book.filename}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <BookOpen size={80} className="text-ink-faint" />
          )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="shrink-0 p-6 bg-surface-raised border-t border-line flex flex-col gap-6">
        
        {/* Title and Author */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink truncate">
            {metadata?.title || book.title || book.filename}
          </h2>
          {(metadata?.author || metadata?.narrator) && (
            <div className="text-sm text-ink-muted mt-1">
              {metadata?.author && <span>{metadata.author}</span>}
              {metadata?.author && metadata?.narrator && <span> • </span>}
              {metadata?.narrator && <span>Narrated by {metadata.narrator}</span>}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="max-w-3xl w-full mx-auto flex flex-col gap-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleTimeChange}
            className="w-full h-2 bg-surface-high rounded-lg appearance-none cursor-pointer accent-accent"
            disabled={isLoading}
            aria-label="Playback progress"
          />
          <div className="flex justify-between text-xs text-ink-muted font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(duration - currentTime)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => handleSkip(-15)}
            className="p-3 hover:bg-surface-high rounded-full transition-colors text-ink"
            aria-label="Skip back 15 seconds"
          >
            <SkipBack size={24} />
          </button>

          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="p-4 bg-accent hover:bg-accent-hover disabled:bg-surface-high text-white rounded-full transition-colors shadow-lg"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current ml-1" />}
          </button>

          <button
            onClick={() => handleSkip(15)}
            className="p-3 hover:bg-surface-high rounded-full transition-colors text-ink"
            aria-label="Skip forward 15 seconds"
          >
            <SkipForward size={24} />
          </button>
        </div>
        
        {/* Volume & Extras Area */}
        <div className="flex items-center justify-between max-w-3xl w-full mx-auto pt-2">
          <div className="flex items-center gap-2 w-32">
            <button
              onClick={handleMuteToggle}
              className="p-2 hover:bg-surface-high rounded-full transition-colors text-ink-muted hover:text-ink"
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
              className="flex-1 h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-ink"
              aria-label="Volume"
            />
          </div>

          <div className="text-xs text-ink-faint hidden sm:block">
            {metadata?.format?.toUpperCase()}
          </div>
          
          <div className="w-32 flex justify-end">
            {/* Placeholder for future buttons */}
          </div>
        </div>

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
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
      />
    </div>
  )
}
