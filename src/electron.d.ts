// Type definitions for Electron API exposed via preload script
declare global {
  interface Window {
    electronAPI: {
      openPdf: () => Promise<string | null>;
    };
  }
}

export {}; // This file needs to be a module
