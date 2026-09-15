import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { AppProvider } from './state';

const container = document.getElementById('root');
if (!container) throw new Error('Story Tarot: #root container is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
