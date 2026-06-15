import { useState, useEffect, useRef } from 'react'
import { Settings, X } from 'lucide-react'
import { ReactReader, ReactReaderStyle } from 'react-reader'
import { Book } from '../types'
import { saveBookProgress } from '../api/client'

interface EpubReaderProps {
  book: Book
  onClose?: () => void
}

export default function EpubReader({ book, onClose }: EpubReaderProps) {
  const [location, setLocation] = useState<string | number>(book.progress_location || 0)
  const [url, setUrl] = useState<ArrayBuffer | string | null>(null)
  const renditionRef = useRef<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [isLight, setIsLight] = useState(document.documentElement.dataset.theme === 'light')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.dataset.theme === 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchBook = async () => {
      try {
        const res = await fetch(`/api/books/${book.id}/download`)
        if (!res.ok) throw new Error('Failed to fetch EPUB')
        const blob = await res.blob()
        const arrayBuffer = await blob.arrayBuffer()
        if (isMounted) {
          setUrl(arrayBuffer)
        }
      } catch (e: any) {
        console.error(e)
        if (isMounted) setError(e.message)
      }
    }
    fetchBook()
    return () => { isMounted = false }
  }, [book.id])

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value)
    setFontSize(newSize)
    if (renditionRef.current && renditionRef.current.themes) {
      renditionRef.current.themes.fontSize(`${newSize}%`)
    }
  }

  // Update rendition themes whenever theme changes
  useEffect(() => {
    if (renditionRef.current && renditionRef.current.themes) {
      const textColor = isLight ? '#1a1a2e' : '#eeeef8'
      renditionRef.current.themes.override('color', textColor, true)
      // Make sure EPUB background is transparent so readerArea color shows through
      renditionRef.current.themes.override('background', 'transparent', true)
    }
  }, [isLight])

  // Custom styles for ReactReader to match our app theme
  const readerStyles = {
    ...ReactReaderStyle,
    readerArea: {
      ...ReactReaderStyle.readerArea,
      backgroundColor: isLight ? '#ffffff' : '#1e1e2e', // solid surface-card background covers TOC
    },
    tocArea: {
      ...ReactReaderStyle.tocArea,
      backgroundColor: isLight ? '#ffffff' : '#1e1e2e', // surface
      color: isLight ? '#1a1a2e' : '#eeeef8', // ink
    },
    tocButtonExpanded: {
      ...ReactReaderStyle.tocButtonExpanded,
      backgroundColor: isLight ? '#f4f4f5' : '#2a2a3c', // surface-raised
    },
    tocButtonBar: {
      ...ReactReaderStyle.tocButtonBar,
      background: isLight ? '#1a1a2e' : '#eeeef8', // ink
    },
    titleArea: {
      ...ReactReaderStyle.titleArea,
      color: isLight ? '#1a1a2e' : '#eeeef8',
    },
    arrow: {
      ...ReactReaderStyle.arrow,
      color: isLight ? '#1a1a2e' : '#eeeef8',
    }
  }

  const handleLocationChanged = (epubcfi: string) => {
    setLocation(epubcfi)
    if (renditionRef.current && renditionRef.current.book) {
      const bookObj = renditionRef.current.book
      let progress = 0
      
      if (bookObj.locations && bookObj.locations.length > 0 && typeof bookObj.locations.percentageFromCfi === 'function') {
        const percentage = bookObj.locations.percentageFromCfi(epubcfi)
        progress = isNaN(percentage) || percentage < 0 ? 0 : parseFloat(percentage.toFixed(4))
      } else if (bookObj.spine && bookObj.spine.length > 0) {
        const currentLocation = renditionRef.current.currentLocation()
        if (currentLocation && currentLocation.start) {
          const index = currentLocation.start.index
          progress = parseFloat((index / bookObj.spine.length).toFixed(4))
        }
      }

      saveBookProgress(book.id, {
        progress,
        progress_location: epubcfi,
        read_status: progress >= 0.99 ? 'finished' : 'reading'
      }).catch(err => console.error('Failed to save EPUB progress:', err))
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-card rounded-lg overflow-hidden border border-line relative">
      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-line bg-surface space-y-3 z-30 absolute top-12 right-0 left-0 shadow-md">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-ink whitespace-nowrap">
              Font Size:
            </label>
            <input
              type="range"
              min="75"
              max="150"
              step="5"
              value={fontSize}
              onChange={handleFontSizeChange}
              className="flex-1 h-2 bg-line rounded accent-accent"
            />
            <span className="text-xs text-ink-muted w-8 text-right">{fontSize}%</span>
          </div>
        </div>
      )}

      {/* Custom Header Overlay for Settings and Close button */}
      <div className="flex items-center justify-end gap-2 p-3 z-20 absolute top-0 right-0 pointer-events-none h-12 w-1/3">
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto bg-surface-card/80 backdrop-blur rounded p-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded transition-colors ${showSettings ? 'bg-accent text-white' : 'hover:bg-surface-high text-ink-muted hover:text-ink'}`}
            title="Reading settings"
          >
            <Settings size={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-high rounded transition-colors text-ink-muted hover:text-ink"
              title="Close reader"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative pt-0">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 z-10">
            Error: {error}
          </div>
        ) : url ? (
          <ReactReader
            url={url}
            title={book.title || book.filename}
            location={location}
            locationChanged={handleLocationChanged}
            readerStyles={readerStyles}
            getRendition={(rendition) => {
              renditionRef.current = rendition
              const textColor = isLight ? '#1a1a2e' : '#eeeef8';
              rendition.themes.override('color', textColor, true);
              rendition.themes.override('background', 'transparent', true);
              rendition.themes.fontSize(`${fontSize}%`);
              
              rendition.book.ready.then(() => {
                rendition.book.locations.generate(1600).catch((e: any) => console.error('Failed to generate locations:', e))
              })
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-card/50 z-10">
            <div className="animate-spin">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
