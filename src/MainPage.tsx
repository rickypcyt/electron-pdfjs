import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

declare global {
  interface Window {
    electronAPI: {
      openPdf: () => Promise<string | null>;
    };
  }
}

const MainPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Elegant PDF Viewer');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const pdfInstance = useRef<any>(null);

  // Initialize PDF.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const renderPage = async (pageNum: number, container: HTMLElement) => {
    if (!pdfInstance.current) return;
    
    try {
      const page = await pdfInstance.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Create page container
      const pageContainer = document.createElement('div');
      pageContainer.className = 'pdf-page';
      
      // Create canvas for the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Set canvas dimensions
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = viewport.width * devicePixelRatio;
      canvas.height = viewport.height * devicePixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      
      // Add canvas to page container
      pageContainer.appendChild(canvas);
      container.innerHTML = '';
      container.appendChild(pageContainer);
      
      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport,
        transform: [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0]
      }).promise;
      
    } catch (err) {
      console.error('Error rendering page:', err);
      throw err;
    }
  };

  const loadPdf = async (filePathOrUrl: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if the input is a URL (starts with 'blob:' or 'http')
      const isUrl = filePathOrUrl.startsWith('blob:') || 
                   filePathOrUrl.startsWith('http') || 
                   filePathOrUrl.startsWith('file:');
      
      let loadingTask;
      
      if (isUrl) {
        // For URLs (including blob URLs)
        loadingTask = pdfjsLib.getDocument({
          url: filePathOrUrl,
          cMapUrl: 'node_modules/pdfjs-dist/cmaps/',
          cMapPacked: true,
        });
      } else {
        // For file paths (Electron)
        loadingTask = pdfjsLib.getDocument(filePathOrUrl);
      }
      
      pdfInstance.current = await loadingTask.promise;
      setTotalPages(pdfInstance.current.numPages);
      
      // Update title
      const fileName = filePathOrUrl.split(/[\\/]/).pop() || 'PDF Document';
      setTitle(fileName);
      
      // Render first page
      if (viewerContainerRef.current) {
        await renderPage(1, viewerContainerRef.current);
      }
      
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(`Error loading PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isElectron = () => {
    return window && (window as any).process && (window as any).process.type;
  };

  const handleOpenPdf = async () => {
    try {
      // Handle non-Electron environment (browser)
      if (!isElectron() || !window.electronAPI?.openPdf) {
        // Create file input for browser environment
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        
        return new Promise<void>((resolve) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const fileUrl = URL.createObjectURL(file);
              setCurrentPage(1);
              await loadPdf(fileUrl);
            }
            resolve();
          };
          input.click();
        });
      }
      
      // Handle Electron environment
      const filePath = await window.electronAPI.openPdf();
      if (filePath) {
        setCurrentPage(1);
        await loadPdf(filePath);
      }
    } catch (err) {
      console.error('Error opening PDF:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Failed to open PDF'}`);
    }
  };

  const goToPage = async (pageNum: number) => {
    if (!pdfInstance.current || pageNum < 1 || pageNum > totalPages) return;
    
    try {
      setIsLoading(true);
      setCurrentPage(pageNum);
      if (viewerContainerRef.current) {
        await renderPage(pageNum, viewerContainerRef.current);
      }
    } catch (err) {
      console.error('Error navigating to page:', err);
      setError(`Error navigating to page: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value, 10);
    if (!isNaN(pageNum)) {
      goToPage(pageNum);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setCurrentPage(1);
        await loadPdf(file.path);
      } else {
        setError('Please drop a valid PDF file');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              Elegant PDF Viewer
            </h1>
            <p className="text-gray-400 mt-2">View and navigate your PDF documents with ease</p>
          </div>
          
          {/* Main Controls */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <button 
              onClick={handleOpenPdf}
              className={`flex items-center justify-center w-full md:w-auto px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105
                ${isLoading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg'}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Open PDF
                </>
              )}
            </button>
            
            {totalPages > 0 && (
              <div className="flex items-center justify-center space-x-2 bg-gray-700/50 p-2 rounded-lg">
                <button 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={currentPage <= 1 || isLoading}
                  className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center bg-gray-800 rounded-lg px-3 py-1">
                  <input
                    type="text"
                    value={currentPage}
                    onChange={handlePageInput}
                    onKeyDown={handleKeyDown}
                    className="w-10 text-center bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none py-1"
                    disabled={isLoading}
                  />
                  <span className="mx-1 text-gray-400">/</span>
                  <span className="text-gray-300">{totalPages}</span>
                </div>
                
                <button 
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 rounded-r-lg mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* PDF Viewer */}
        <div 
          ref={viewerContainerRef}
          className={`min-h-[60vh] rounded-xl border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700/50 bg-gray-800/30'} transition-colors duration-200 flex items-center justify-center`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!pdfInstance.current && !isLoading && (
            <div className="text-center p-8 max-w-md">
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/20 mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No PDF Loaded</h2>
                <p className="text-gray-400 mb-6">Drag and drop a PDF file here or click the button above to get started</p>
                <button 
                  onClick={handleOpenPdf}
                  className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Select PDF File
                </button>
              </div>
            </div>
          )}
          {isLoading && !pdfInstance.current && (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="animate-pulse flex space-x-4 items-center">
                <div className="rounded-full bg-blue-500 h-8 w-8"></div>
                <div className="text-xl text-gray-400">Loading your document...</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MainPage;
