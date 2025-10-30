import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import MainPage from './MainPage';

// Initialize Tailwind CSS
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <MainPage />
  </React.StrictMode>
);;
