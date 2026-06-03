import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Settings, X } from 'lucide-react'
import EPub from 'epubjs'
import { Book } from '../types'

interface EpubReaderProps {
  book: Book
  onClose?: () => void
}

export default function EpubReader({ book, onClose }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookObjRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const [totalPages, setTotalPages] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [fontSize, setFontSize] = useState(100)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const loadEpub = async () => {
      if (!viewerRef.current) {
        console.warn('Viewer ref not available')
        return
      }

      try {
        console.log('Starting EPUB load for book:', book.id, book.filename)
        const url = `/api/books/${book.id}/download`
        console.log('EPUB URL:', url)
        
        console.log('Fetching EPUB file as blob...')
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch EPUB: ${response.status} ${response.statusText}`)
        }
        const blob = await response.blob()
        console.log('EPUB blob received, size:', blob.size)
        
        // Convert blob to ArrayBuffer for EPub.js
        console.log('Converting blob to ArrayBuffer...')
        const arrayBuffer = await blob.arrayBuffer()
        console.log('ArrayBuffer ready, length:', arrayBuffer.byteLength)
        
        const newBook = EPub(arrayBuffer)
        bookObjRef.current = newBook

        console.log('Waiting for book.ready...')
        const readyPromise = newBook.ready
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('EPUB ready timeout (10s)')), 10000)
        )
        
        await Promise.race([readyPromise, timeoutPromise])
        console.log('Book ready!')

        // Get the actual dimensions from the container
        const rect = viewerRef.current.getBoundingClientRect()
        const width = Math.max(rect.width, 400)
        const height = Math.max(rect.height, 600)
        console.log(`Rendering to dimensions: ${width}x${height}`)

        const newRendition = newBook.renderTo(viewerRef.current, {
          width: width,
          height: height,
          flow: 'paginated',
          spread: 'reflect'
        })

        console.log('Calling rendition.display()...')
        await newRendition.display()
        console.log('Rendition displayed!')
        
        renditionRef.current = newRendition

        // Handle location changes
        const onRelocated = (location: any) => {
          if (newBook.locations && typeof newBook.locations.percentageFromCfi === 'function') {
            const percentage = Math.round(
              (newBook.locations.percentageFromCfi(location.start.cfi) || 0) * 100
            )
            setTotalPages(`${percentage}%`)
          }
        }
        newRendition.on('relocated', onRelocated)

        setIsLoading(false)
        console.log('EPUB loaded successfully')
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('Failed to load EPUB:', errorMsg, error)
        console.error('Book ID:', book.id)
        console.error('Book filename:', book.filename)
        console.error('Full error object:', error)
        setIsLoading(false)
      }
    }

    loadEpub()

    return () => {
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy?.()
        } catch (e) {
          console.debug('Error destroying rendition:', e)
        }
      }
      if (bookObjRef.current) {
        try {
          bookObjRef.current.destroy?.()
        } catch (e) {
          console.debug('Error destroying book:', e)
        }
      }
    }
  }, [book.id])

  const handlePrevious = () => {
    if (renditionRef.current) {
      renditionRef.current.prev()
    }
  }

  const handleNext = () => {
    if (renditionRef.current) {
      renditionRef.current.next()
    }
  }

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value)
    setFontSize(newSize)
    if (renditionRef.current && renditionRef.current.themes) {
      renditionRef.current.themes.fontSize(`${newSize}%`)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-card rounded-lg overflow-hidden border border-line">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-3 border-b border-line bg-surface-raised">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">
            {book.title || book.filename}
          </h3>
          <p className="text-xs text-ink-muted">{totalPages}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-surface-high rounded transition-colors text-ink-muted hover:text-ink"
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

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-line bg-surface space-y-3">
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

      {/* Reader Container */}
      <div className="flex-1 overflow-hidden relative bg-surface-card min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-card/50 z-10">
            <div className="animate-spin">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          </div>
        )}
        <div
          ref={viewerRef}
          className="w-full h-full"
        />
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-center gap-2 p-3 border-t border-line bg-surface-raised">
        <button
          onClick={handlePrevious}
          disabled={isLoading}
          className="p-2 hover:bg-surface-high disabled:text-ink-faint transition-colors text-ink rounded"
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-xs text-ink-muted min-w-16 text-center">
          {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="p-2 hover:bg-surface-high disabled:text-ink-faint transition-colors text-ink rounded"
          title="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
