import { Book } from '../types'
import EpubReader from './EpubReader'
import PdfReader from './PdfReader'

interface EbookReaderProps {
  book: Book
  onClose?: () => void
}

export default function EbookReader({ book, onClose }: EbookReaderProps) {
  const format = book.file_format?.toLowerCase()

  // EPUB reader
  if (format === 'epub') {
    return <EpubReader book={book} onClose={onClose} />
  }

  // PDF reader
  if (format === 'pdf') {
    return <PdfReader book={book} onClose={onClose} />
  }

  // Unsupported format
  return (
    <div className="flex items-center justify-center h-96 bg-surface-card border border-line rounded-lg">
      <div className="text-center">
        <p className="text-sm font-medium text-ink mb-2">
          Unsupported format: {format?.toUpperCase() || 'Unknown'}
        </p>
        <p className="text-xs text-ink-muted">
          Supported formats: EPUB, PDF
        </p>
      </div>
    </div>
  )
}
