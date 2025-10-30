declare module 'pdfjs-dist/build/pdf.worker.mjs?worker' {
  import { Worker as PdfWorker } from 'pdfjs-dist';
  const PdfWorkerModule: new () => Worker;
  export default PdfWorkerModule;
}
