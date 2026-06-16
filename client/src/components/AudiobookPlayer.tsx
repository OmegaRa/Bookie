import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, BookOpen } from 'lucide-react'
import { Book } from '../types'
import { saveBookProgress } from '../api/client'

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
  const [showChapters, setShowChapters] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5]

  const lastSavedTimeRef = useRef<number>(0)
  const stateRef = useRef({ currentTime, duration, id: book.id, isPlaying })

  useEffect(() => {
    stateRef.current = { currentTime, duration, id: book.id, isPlaying }
  }, [currentTime, duration, book.id, isPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Periodic progress saving effect
  useEffect(() => {
    if (isLoading || !duration) return

    const saveProgress = (time: number) => {
      const { duration: dur, id } = stateRef.current
      if (!dur) return
      const progress = parseFloat((time / dur).toFixed(4))
      lastSavedTimeRef.current = time
      saveBookProgress(id, {
        progress: Math.min(1, Math.max(0, progress)),
        progress_location: String(time),
        read_status: progress >= 0.99 ? 'finished' : 'reading'
      }).catch(err => console.error('Failed to save audio progress:', err))
    }

    if (!isPlaying) {
      if (Math.abs(currentTime - lastSavedTimeRef.current) > 1) {
        saveProgress(currentTime)
      }
      return
    }

    const interval = setInterval(() => {
      const { currentTime: currTime } = stateRef.current
      if (Math.abs(currTime - lastSavedTimeRef.current) >= 5) {
        saveProgress(currTime)
      }
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [isPlaying, duration, isLoading])

  // Save progress on unmount
  useEffect(() => {
    return () => {
      const { currentTime: currTime, duration: dur, id } = stateRef.current
      if (dur && currTime > 0) {
        const progress = parseFloat((currTime / dur).toFixed(4))
        saveBookProgress(id, {
          progress: Math.min(1, Math.max(0, progress)),
          progress_location: String(currTime),
          read_status: progress >= 0.99 ? 'finished' : 'reading'
        }).catch(err => console.error('Failed to save audio progress on unmount:', err))
      }
    }
  }, [])

  // Find current chapter index
  const currentChapterIndex = metadata?.chapters
    ? metadata.chapters.findIndex((ch, idx) => {
        const nextCh = metadata.chapters?.[idx + 1]
        const start = ch.start_time ?? 0
        const end = nextCh ? (nextCh.start_time ?? Infinity) : Infinity
        return currentTime >= start && currentTime < end
      })
    : -1

  const handleSkipToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

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

  const toggleSpeedMenu = () => {
    setShowSpeedMenu(prev => !prev)
    setShowChapters(false)
  }

  const toggleChapters = () => {
    setShowChapters(prev => !prev)
    setShowSpeedMenu(false)
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
          <div className="text-xs font-semibold mt-2 flex items-center justify-center gap-1.5">
            {metadata?.chapters && metadata.chapters.length > 0 && currentChapterIndex !== -1 ? (
              <span className="text-accent flex items-center gap-1.5">
                <BookOpen size={12} />
                <span>{metadata.chapters[currentChapterIndex].title}</span>
              </span>
            ) : (
              <span className="text-ink-faint flex items-center gap-1.5">
                <BookOpen size={12} />
                <span>No chapters available</span>
              </span>
            )}
          </div>
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

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={toggleSpeedMenu}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-line bg-surface-high text-ink hover:border-line-strong transition-colors"
                aria-label="Select playback speed"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-24 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface-raised shadow-xl p-1 flex flex-col gap-0.5">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(speed)
                        setShowSpeedMenu(false)
                      }}
                      className={['text-center text-xs py-1 rounded transition-colors', playbackSpeed === speed ? 'bg-accent/15 text-accent font-semibold' : 'text-ink hover:bg-surface-high'].join(' ')}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-ink-faint hidden sm:block uppercase">
              {metadata?.format}
            </div>
          </div>
          
          <div className="w-32 flex justify-end relative">
            {metadata?.chapters && metadata.chapters.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={toggleChapters}
                  className={['p-2 rounded-full transition-colors', showChapters ? 'bg-surface-high text-accent' : 'text-ink-muted hover:text-ink hover:bg-surface-high'].join(' ')}
                  aria-label="Toggle chapter list"
                >
                  <BookOpen size={18} />
                </button>
                {showChapters && (
                  <div className="absolute bottom-10 right-0 z-20 w-64 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface-raised shadow-xl p-2 flex flex-col gap-1">
                    <div className="text-xs font-semibold px-2 py-1 border-b border-line text-ink-muted mb-1">Chapters</div>
                    {metadata.chapters.map((ch, idx) => {
                      const isActive = currentChapterIndex === idx
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (ch.start_time != null) handleSkipToTime(ch.start_time)
                            setShowChapters(false)
                          }}
                          className={['flex items-center justify-between text-left text-xs px-2 py-1.5 rounded transition-colors', isActive ? 'bg-accent/15 text-accent font-medium' : 'text-ink hover:bg-surface-high'].join(' ')}
                        >
                          <span className="truncate flex-1 pr-2">{ch.title}</span>
                          <span className="text-ink-faint font-mono shrink-0">{formatTime(ch.start_time ?? 0)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled
                className="p-2 rounded-full text-ink-faint cursor-not-allowed opacity-40"
                aria-label="No chapters available"
                title="No chapters available"
              >
                <BookOpen size={18} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={`/api/audiobooks/${book.id}/stream`}
        onPlay={() => {
          setIsPlaying(true)
          if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed
          }
        }}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration
          setDuration(dur)
          setIsLoading(false)
          e.currentTarget.playbackRate = playbackSpeed
          
          if (book.progress_location) {
            const startSecs = parseFloat(book.progress_location)
            if (!isNaN(startSecs) && startSecs > 0 && startSecs < dur) {
              e.currentTarget.currentTime = startSecs
              setCurrentTime(startSecs)
              lastSavedTimeRef.current = startSecs
            }
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
      />
    </div>
  )
}
