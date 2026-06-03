import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { Book } from '../types'

interface PdfReaderProps {
  book: Book
  onClose?: () => void
}

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function PdfReader({ book, onClose }: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [scale, setScale] = useState(1.5)

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdfDoc = await pdfjsLib.getDocument(`/api/books/${book.id}/download`).promise
        setPdf(pdfDoc)
        setTotalPages(pdfDoc.numPages)
        setCurrentPage(1)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load PDF:', error)
        setIsLoading(false)
      }
    }

    loadPdf()
  }, [book.id])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage)
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current!
        const context = canvas.getContext('2d')!

        canvas.width = viewport.width
        canvas.height = viewport.height

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
      } catch (error) {
        console.error('Failed to render page:', error)
      }
    }

    renderPage()
  }, [pdf, currentPage, scale])

  const handlePrevious = () => {
    setCurrentPage(Math.max(1, currentPage - 1))
  }

  const handleNext = () => {
    setCurrentPage(Math.min(totalPages, currentPage + 1))
  }

  const handleZoomIn = () => {
    setScale(s => Math.min(s + 0.2, 3))
  }

  const handleZoomOut = () => {
    setScale(s => Math.max(s - 0.2, 0.5))
  }

  return (
    <div className="flex flex-col h-full bg-surface-card rounded-lg overflow-hidden border border-line">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-3 border-b border-line bg-surface-raised">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">
            {book.title || book.filename}
          </h3>
          <p className="text-xs text-ink-muted">
            Page {currentPage} of {totalPages}
          </p>
        </div>
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

      {/* Reader Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-surface">
        {isLoading && (
          <div className="flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          </div>
        )}
        {!isLoading && (
          <canvas
            ref={canvasRef}
            className="shadow-lg rounded border border-line/30"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-center gap-2 p-3 border-t border-line bg-surface-raised">
        <button
          onClick={handleZoomOut}
          disabled={isLoading || scale <= 0.5}
          className="p-2 hover:bg-surface-high disabled:text-ink-muted disabled:opacity-50 transition-colors text-ink rounded"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>

        <button
          onClick={handlePrevious}
          disabled={isLoading || currentPage <= 1}
          className="p-2 hover:bg-surface-high disabled:text-ink-muted disabled:opacity-50 transition-colors text-ink rounded"
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={e => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
            className="w-12 px-2 py-1 text-xs rounded bg-surface-high border border-line text-ink text-center"
          />
          <span className="text-xs text-ink-muted">/ {totalPages}</span>
        </div>

        <button
          onClick={handleNext}
          disabled={isLoading || currentPage >= totalPages}
          className="p-2 hover:bg-surface-high disabled:text-ink-muted disabled:opacity-50 transition-colors text-ink rounded"
          title="Next page"
        >
          <ChevronRight size={20} />
        </button>

        <button
          onClick={handleZoomIn}
          disabled={isLoading || scale >= 3}
          className="p-2 hover:bg-surface-high disabled:text-ink-muted disabled:opacity-50 transition-colors text-ink rounded"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
      </div>
    </div>
  )
}
