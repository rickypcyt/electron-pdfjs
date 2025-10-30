import { useState, useEffect } from 'react';
import './App.css';

// Declare the electronAPI type
declare global {
  interface Window {
    electronAPI: {
      openPdf: () => Promise<string | null>;
    };
  }
}

function App() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);

  const loadPdf = async (filePath: string) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url
      ).toString();

      const loadingTask = pdfjsLib.getDocument(filePath);
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);
      setPdfUrl(filePath);
      setError(null);
    } catch (err) {
      setError('Failed to load PDF. Please try another file.');
      console.error('Error loading PDF:', err);
    }
  };

  const handleOpenPdf = async () => {
    try {
      const filePath = await window.electronAPI.openPdf();
      if (filePath) {
        loadPdf(filePath);
      }
    } catch (err) {
      setError('Failed to open file dialog');
      console.error('Error opening file dialog:', err);
    }
  };

  return (
    <div className="app">
      <header className="toolbar">
        <button onClick={handleOpenPdf} className="toolbar-button">
          Open PDF
        </button>
        <div className="toolbar-title">
          {pdfUrl ? pdfUrl.split('/').pop() : 'PDF.js Electron Viewer'}
        </div>
        {pdfUrl && (
          <div className="page-controls">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {numPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
            >
              Next
            </button>
          </div>
        )}
      </header>

      <main className="viewer-container">
        {error ? (
          <div className="error-message">{error}</div>
        ) : pdfUrl ? (
          <PdfViewer 
            file={pdfUrl} 
            pageNumber={currentPage}
            scale={scale}
          />
        ) : (
          <div className="welcome-message">
            <h1>PDF.js Electron Viewer</h1>
            <p>Click "Open PDF" to view a PDF document</p>
          </div>
        )}
      </main>
    </div>
  );
}

function PdfViewer({ file, pageNumber, scale }: { file: string; pageNumber: number; scale: number }) {
  const [pdfPage, setPdfPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        const pdfjsLib = await import('pdfjs-dist');
        const loadingTask = pdfjsLib.getDocument(file);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNumber);
        setPdfPage(page);
      } catch (err) {
        console.error('Error loading PDF page:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [file, pageNumber]);

  useEffect(() => {
    if (!pdfPage) return;

    const canvas = document.createElement('canvas');
    const container = document.getElementById('pdf-canvas-container');
    if (!container) return;

    container.innerHTML = '';
    container.appendChild(canvas);

    const viewport = pdfPage.getViewport({ scale });
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    pdfPage.render(renderContext);
  }, [pdfPage, scale]);

  if (loading) {
    return <div className="loading">Loading page {pageNumber}...</div>;
  }

  return <div id="pdf-canvas-container" className="pdf-canvas" />;
}

export default App;
